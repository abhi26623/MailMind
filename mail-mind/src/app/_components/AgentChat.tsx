'use client'
import { useState, useRef, useEffect } from 'react'
import { api } from '@/trpc/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { authClient } from '@/server/better-auth/client'

type ChipGroup = {
  label: string        // e.g. "Duration" or "Subject"
  key: string          // e.g. "duration" or "subject"
  options: string[]    // e.g. ["30 min", "45 min", "1 hour", "Other..."]
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
  suggestions?: string[]
  chipGroups?: ChipGroup[]
  requiresConfirmation?: boolean
  pendingScript?: string | null
}

const ACTION_LABELS: Record<string, string> = {
  list_operations: 'Exploring capabilities',
  get_schema: 'Reading API docs',
  run_script: 'Executing code',
  corsair_setup: 'Checking configuration',
}

const STARTER_SUGGESTIONS = [
  'Summarize my unread emails from today',
  'What meetings do I have this week?',
  'Schedule a meeting with xyz@gmail.com on Thursday at 6pm',
  'Draft a reply to my latest email',
  'Find my flight ticket or any other ticket',
  'What is my today working email etc'
]

/**
 * Parse [DURATION: "30 min" | "45 min" | "1 hour" | "Other..."]
 * and [SUBJECT: "Project discussion" | "Quick chat" | "Sync up" | "Other..."]
 * tags out of the agent response content.
 */
function parseChipGroups(content: string): { cleaned: string; chipGroups: ChipGroup[] } {
  const chipGroups: ChipGroup[] = []
  const tagRegex = /\[(DURATION|SUBJECT):\s*(.*?)\]/gi

  const cleaned = content.replace(tagRegex, (_match, key: string, opts: string) => {
    const options = opts
      .split('|')
      .map(o => o.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
    chipGroups.push({
      label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
      key: key.toLowerCase(),
      options,
    })
    return ''
  }).trim()

  return { cleaned, chipGroups }
}

/** Parse legacy [SUGGESTIONS: "A" | "B"] */
function parseSuggestions(content: string): { cleaned: string; suggestions: string[] } {
  const match = content.match(/\[SUGGESTIONS:\s*(.*?)\]/i)
  if (!match) return { cleaned: content, suggestions: [] }
  const cleaned = content.replace(match[0], '').trim()
  const suggestions = match[1]!
    .split('|')
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  return { cleaned, suggestions }
}



// ─── Chip Group Row with "Other..." inline input ───────────────────────────
function ChipGroupRow({
  group,
  onSelect,
  disabled,
}: {
  group: ChipGroup
  onSelect: (value: string) => void
  disabled: boolean
}) {
  const [showInput, setShowInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-0.5">
        {group.label}
      </span>
      <div className="flex flex-wrap gap-2">
        {group.options.map((opt, i) => {
          const isOther = opt.toLowerCase().startsWith('other')
          return isOther ? (
            <button
              key={i}
              onClick={() => setShowInput(v => !v)}
              disabled={disabled}
              className="rounded-full border border-dashed border-wheat-500/50 bg-transparent px-4 py-2 text-xs font-semibold text-blue-500/80 shadow-sm transition-all hover:border-wheat-500 hover:bg-wheat-100 hover:-translate-y-0.5 disabled:opacity-40"
            >
              ✏️ Other...
            </button>
          ) : (
            <button
              key={i}
              onClick={() => onSelect(opt)}
              disabled={disabled}
              className="rounded-full border border-wheat-500/30 bg-wheat-100 px-4 py-2 text-xs font-semibold text-wheat-400 shadow-sm transition-all hover:bg-wheat-200 hover:border-wheat-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
            >
              {opt}
            </button>
          )
        })}
      </div>
      {showInput && (
        <div className="flex gap-2 mt-1 animate-slide-up">
          <input
            ref={inputRef}
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customValue.trim()) {
                onSelect(customValue.trim())
                setCustomValue('')
                setShowInput(false)
              }
              if (e.key === 'Escape') setShowInput(false)
            }}
            placeholder={`Custom ${group.label.toLowerCase()}…`}
            className="flex-1 rounded-xl border border-wheat-500/40 bg-forest-800/80 px-3 py-2 text-xs text-cream-100 outline-none placeholder:text-olive-600 focus:border-wheat-500/70"
          />
          <button
            onClick={() => {
              if (customValue.trim()) {
                onSelect(customValue.trim())
                setCustomValue('')
                setShowInput(false)
              }
            }}
            className="rounded-xl bg-wheat-500 px-3 py-2 text-xs font-bold text-forest-950 hover:bg-wheat-400 transition-all"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Script parser ─────────────────────────────────────────────────────────
type DraftInfo = {
  type: 'calendar' | 'email' | 'mixed' | 'unknown'
  meeting?: { summary: string; start: string; end: string; attendees: string[] }
  email?: { to: string; subject: string; body: string }
}

function parseScriptForDraft(script: string): DraftInfo {
  const isCalendar = script.includes('.googlecalendar.') && script.includes('.create(')
  const isEmail = script.includes('.gmail.') && script.includes('.send(')

  let meeting: DraftInfo['meeting'] | undefined
  let email: DraftInfo['email'] | undefined

  if (isCalendar) {
    const summary = script.match(/summary:\s*["']([^"']+)["']/)?.[1] ?? 'Meeting'
    const start = script.match(/start:\s*\{[^}]*dateTime:\s*["']([^"']+)["']/)?.[1] ?? ''
    const end = script.match(/end:\s*\{[^}]*dateTime:\s*["']([^"']+)["']/)?.[1] ?? ''
    const attendees = [...script.matchAll(/\{\s*email:\s*["']([^"']+)["']/g)].map(m => m[1] ?? '')
    meeting = { summary, start, end, attendees }
  }

  if (isEmail) {
    const to = script.match(/To:\s*([^"'\r\n\\]+)/i)?.[1]?.trim() ?? ''
    const subject = script.match(/Subject:\s*([^"'\r\n\\]+)/i)?.[1]?.trim() ?? ''
    
    let body = ''
    
    const arrayMatch = script.match(/\[([\s\S]*?)\]\.join/)
    const arrayContent = arrayMatch?.[1]
    if (arrayContent) {
      const lines = [...arrayContent.matchAll(/["'\`](.*?)["'\`]/gs)].map(m => m[1] ?? '')
      const emptyIdx = lines.findIndex(l => l.trim() === '')
      if (emptyIdx >= 0) {
         body = lines.slice(emptyIdx + 1).join('\n')
      } else if (lines.length > 2) {
         body = lines.slice(2).join('\n')
      }
    }
    
    if (!body) {
      const parts = script.split(/(?:MIME-Version:[^\n]*|Content-Type:[^\n]*|Subject:[^\n]*)(?:\r?\n){2,}/i)
      const partContent = parts[1]
      if (parts.length > 1 && partContent) {
         body = (partContent.split(/["'\`]/)[0] ?? '').trim()
      } else {
         const rawMatch = script.match(/Buffer\.from\(['"\`]?([\s\S]*?)['"\`]?\)/i)
         const rawContent = rawMatch?.[1]
         if (rawContent) {
            const lines = rawContent.split(/\\r\\n|\\n|\r\n|\n/)
            const emptyIdx = lines.findIndex(l => l.trim() === '')
            if (emptyIdx >= 0) body = lines.slice(emptyIdx + 1).join('\n')
         }
      }
    }

    body = body.replace(/\\n/g, '\n').replace(/\\r/g, '').trim()
    email = { to, subject, body }
  }

  const type = isCalendar && isEmail ? 'mixed' : isCalendar ? 'calendar' : isEmail ? 'email' : 'unknown'
  return { type, meeting, email }
}

function formatIST(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    })
  } catch { return iso }
}

// ─── Script Confirm Box (Draft Card) ───────────────────────────────────────
function ScriptConfirmBox({
  script,
  onConfirm,
  onCancel,
  disabled,
}: {
  script: string
  onConfirm: (code: string) => void
  onCancel: () => void
  disabled: boolean
}) {
  const draft = parseScriptForDraft(script)

  return (
    <div className="mt-2 w-full max-w-lg rounded-2xl border border-blue-100 bg-white overflow-hidden shadow-md shadow-blue-500/5 animate-slide-up">

      {/* ── Meeting card ── */}
      {draft.meeting && (
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base">📅</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-800 truncate">{draft.meeting.summary}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatIST(draft.meeting.start)}
                {draft.meeting.end && ` → ${new Date(draft.meeting.end).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}`}
              </p>
              {draft.meeting.attendees.filter(Boolean).map(a => (
                <p key={a} className="text-xs text-blue-500 mt-1 truncate">👤 {a}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Email card ── */}
      {draft.email && (
        <div className="px-4 pt-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base">✉️</div>
            <div className="flex-1 min-w-0 space-y-1">
              {draft.email.to && (
                <p className="text-xs text-slate-500"><span className="text-slate-400">To:</span> <span className="text-slate-700 font-medium">{draft.email.to}</span></p>
              )}
              {draft.email.subject && (
                <p className="text-xs text-slate-500"><span className="text-slate-400">Subject:</span> <span className="text-slate-700 font-medium">{draft.email.subject}</span></p>
              )}
              {draft.email.body && (
                <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{draft.email.body}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Unknown / fallback ── */}
      {draft.type === 'unknown' && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-500">⚙️ Action ready — review and confirm below.</p>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/50">
        <button
          onClick={() => onConfirm(script)}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {draft.type === 'email' || draft.type === 'mixed' ? 'Send' : 'Book it'}
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // Tracks selected chip values per message index: { messageIdx: { duration: "45 min", subject: "..." } }
  const [chipSelections, setChipSelections] = useState<Record<number, Record<string, string>>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { data: session } = authClient.useSession()

  const chat = api.agent.chat.useMutation({
    onSuccess: (data) => {
      // Parse chip groups and suggestions from the response
      let content = data.content
      const { cleaned: c1, chipGroups } = parseChipGroups(content)
      const { cleaned: c2, suggestions } = parseSuggestions(c1)
      content = c2

      // Auto-select any group that only has a single option
      const initialSelections: Record<string, string> = {}
      if (chipGroups.length > 0) {
        chipGroups.forEach(g => {
          if (g.options.length === 1) {
            initialSelections[g.key] = g.options[0]!
          }
        })
      }

      // If every chip group has exactly 1 option, auto-submit the form so the user doesn't get stuck!
      const allAutoSelected = chipGroups.length > 0 && Object.keys(initialSelections).length === chipGroups.length;
      
      setMessages(prev => {
        const newMsgIdx = prev.length
        
        // If we found any single-item groups to auto-select, save them to state
        if (!allAutoSelected && Object.keys(initialSelections).length > 0) {
          setTimeout(() => {
            setChipSelections(s => ({ ...s, [newMsgIdx]: initialSelections }))
          }, 0)
        }

        const nextMessages = [...prev, {
          role: 'assistant' as const,
          content,
          actions: data.actions,
          suggestions: data.suggestions?.length ? data.suggestions : suggestions,
          chipGroups: allAutoSelected ? undefined : (chipGroups.length ? chipGroups : undefined),
          requiresConfirmation: data.requiresConfirmation,
          pendingScript: data.pendingScript,
        }]

        if (allAutoSelected) {
          const combined = chipGroups.map(g => initialSelections[g.key]!).join(', ')
          setTimeout(() => {
            const finalMessages = [...nextMessages, { role: 'user' as const, content: combined }]
            setMessages(finalMessages)
            chat.mutate({ messages: finalMessages })
          }, 100)
        }

        return nextMessages
      })
    },
    onError: (err) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
      }])
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chat.isPending])

  const send = () => {
    if (!input.trim() || chat.isPending) return
    const newMessages: Message[] = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    chat.mutate({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
  }

  const sendSuggestion = (text: string) => {
    if (chat.isPending) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    chat.mutate({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
  }

  /**
   * Handle a chip selection from a chip group.
   * Collects all group values for that message; when all groups have a selection,
   * sends a combined message automatically.
   */
  const handleChipSelect = (msgIdx: number, msg: Message, groupKey: string, value: string) => {
    if (chat.isPending) return

    const groups = msg.chipGroups ?? []
    const prevSelections = chipSelections[msgIdx] ?? {}
    const updated = { ...prevSelections, [groupKey]: value }
    setChipSelections(prev => ({ ...prev, [msgIdx]: updated }))

    // Check if all groups now have a selection
    const allSelected = groups.every(g => updated[g.key] !== undefined)
    if (allSelected) {
      // Build combined message e.g. "45 min, Project discussion"
      const combined = groups.map(g => updated[g.key]!).join(', ')
      sendSuggestion(combined)
      // Clear selections for this message
      setChipSelections(prev => { const next = { ...prev }; delete next[msgIdx]; return next })
    }
  }

  const handleConfirmAction = (script: string) => {
    if (chat.isPending) return
    const newMessages: Message[] = [...messages, { role: 'user', content: 'Confirmed. Please execute.' }]
    setMessages(newMessages)
    chat.mutate({
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: `CONFIRMED_EXECUTE:\n${script}` },
      ],
    })
  }

  const handleCancelAction = () => {
    setMessages(prev => [...prev, { role: 'user', content: 'Action cancelled.' }])
  }

  return (
    <div className="flex h-full flex-col bg-transparent font-sans text-slate-800 relative">
      {/* Background Decor */}
      {messages.length === 0 && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-100/50 to-blue-100/50 rounded-full blur-[100px] opacity-70" />
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-3xl mx-auto animate-fade-in">
          <h1 className="text-4xl font-medium text-slate-800 mb-10 text-center tracking-tight">
            <span className="text-slate-500">Hi {session?.user?.name ? session.user.name.split(' ')[0] : 'there'},</span> let's get started
          </h1>

          {/* Big Centered Input */}
          <div className="w-full relative shadow-xl shadow-blue-900/5 rounded-full bg-white border border-slate-200 mb-12 transition-all focus-within:ring-4 focus-within:ring-cyan-100 focus-within:border-cyan-300">
            <div className="flex items-center p-2.5">
              <span className="pl-4 pr-3 text-cyan-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </span>
              <input
                id="agent-chat-input-center"
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 px-2 py-3 text-lg font-medium"
                placeholder="Ask MailMind Agent..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                disabled={chat.isPending}
                autoFocus
              />
              <div className="pr-3 flex items-center gap-2">
                <button 
                  onClick={send} 
                  disabled={chat.isPending || !input.trim()}
                  className="p-3 rounded-full bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors disabled:opacity-50 disabled:hover:bg-cyan-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="w-full mt-4">
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {STARTER_SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="block w-full rounded-2xl border border-slate-300 bg-white/60 backdrop-blur-sm px-5 py-4 text-left text-sm text-slate-600 transition-all hover:border-cyan-300 hover:bg-white hover:text-cyan-800 shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 z-20 shrink-0">
            <h2 className="text-sm font-bold text-slate-700">Agent Chat</h2>
            <button
              onClick={() => {
                setMessages([])
                setChipSelections({})
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shadow-sm"
            >
              New Chat
            </button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-6 z-10 w-full max-w-4xl mx-auto">
            {messages.map((m, i) => {
              const mySelections = chipSelections[i] ?? {}
              const pendingGroups = (m.chipGroups ?? []).filter(g => mySelections[g.key] === undefined)
              const isLastAssistant = m.role === 'assistant' && i === messages.length - 1

              return (
                <div
                  key={i}
                  className={`flex gap-2 w-full ${m.role === 'user' ? 'justify-end items-end' : 'justify-start items-end'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 mb-1">
                      M
                    </div>
                  )}
                  
                  <div className={`flex flex-col gap-1.5 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-blue-600 text-white'
                          : 'rounded-bl-sm bg-slate-100 text-slate-800'
                      } ${!m.content ? 'hidden' : ''}`}
                    >
                      {m.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-slate">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ ...props }) => <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />,
                              p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                              ul: ({ ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                              ol: ({ ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                  {/* ── Chip groups (Duration / Subject / etc.) ── */}
                  {m.chipGroups && m.chipGroups.length > 0 && isLastAssistant && (
                    <div className="flex flex-col gap-3 mt-2 w-full max-w-[85%]">
                      {m.chipGroups.map(group => {
                        const isSelected = mySelections[group.key] !== undefined
                        return isSelected ? (
                          <div key={group.key} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}:</span>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              ✓ {mySelections[group.key]}
                            </span>
                          </div>
                        ) : (
                          <ChipGroupRow
                            key={group.key}
                            group={group}
                            onSelect={(val) => handleChipSelect(i, m, group.key, val)}
                            disabled={chat.isPending}
                          />
                        )
                      })}
                      {pendingGroups.length > 0 && (
                        <p className="text-[10px] text-slate-400 italic">
                          Select {pendingGroups.map(g => g.label.toLowerCase()).join(' and ')} above...
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Legacy flat suggestions ── */}
                  {m.suggestions && m.suggestions.length > 0 && !m.chipGroups?.length && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.suggestions.map((suggestion, j) => (
                        <button
                          key={j}
                          onClick={() => sendSuggestion(suggestion)}
                          disabled={chat.isPending || m.requiresConfirmation}
                          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Confirm & Execute with script viewer / editor ── */}
                  {m.requiresConfirmation && m.pendingScript && i === messages.length - 1 && (
                    <ScriptConfirmBox
                      script={m.pendingScript}
                      onConfirm={handleConfirmAction}
                      onCancel={handleCancelAction}
                      disabled={chat.isPending}
                    />
                  )}

                  {/* ── Action badges ── */}
                  {m.actions && m.actions.length > 0 && !(m.requiresConfirmation && m.actions.includes('run_script')) && (
                    <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                      {m.actions.map((action, j) => (
                        <span
                          key={j}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm"
                        >
                          {ACTION_LABELS[action] ?? action}
                        </span>
                      ))}
                    </div>
                  )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mb-1.5">
                      <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
              )
            })}

            {chat.isPending && (
              <div className="flex items-end gap-2 w-full justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 mb-1">
                  M
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-5 py-4 text-sm text-slate-500 shadow-sm flex items-center h-[50px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white/80 border-t border-slate-200 p-4 backdrop-blur-md z-20">
            <div className="mx-auto flex max-w-4xl gap-3">
              <input
                id="agent-chat-input"
                className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm"
                placeholder="Ask MailMind Agent..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                disabled={chat.isPending}
              />
              <button
                id="agent-send-btn"
                onClick={send}
                disabled={chat.isPending || !input.trim()}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
