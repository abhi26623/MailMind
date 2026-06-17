'use client'
import { useState, useRef, useEffect } from 'react'
import { api } from '@/trpc/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
  suggestions?: string[]
}

const ACTION_LABELS: Record<string, string> = {
  list_operations: 'Exploring capabilities',
  get_schema: 'Reading API docs',
  run_script: 'Executing code',
  corsair_setup: 'Checking configuration',
}

const SUGGESTIONS = [
  'Summarize my unread emails from today',
  'What meetings do I have this week?',
  'Schedule a meeting with xyz@gmail.com on Thursday at 6pm',
  'Draft a reply to my latest email',
]

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chat = api.agent.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        actions: data.actions,
        suggestions: data.suggestions,
      }])
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

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input },
    ]

    setMessages(newMessages)
    setInput('')
    chat.mutate({
      messages: newMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })
  }

  const sendSuggestion = (suggestion: string) => {
    if (chat.isPending) return
    const visibleInput = suggestion.trim()
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: visibleInput },
    ]

    setMessages(newMessages)
    chat.mutate({
      messages: [
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: visibleInput,
        },
      ].map(m => ({
        role: m.role,
        content: m.content,
      })),
    })
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 font-sans text-white">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-8">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                M
              </div>
              <h2 className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                MailMind Agent
              </h2>
              <p className="max-w-sm text-xs text-slate-500">
                I can read your emails, schedule meetings, send replies, and manage your calendar. Just ask.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Try asking
              </p>
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="block w-full rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3 text-left text-sm text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'rounded-bl-md border border-slate-700/50 bg-slate-800/80 text-slate-100'
              }`}
            >
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ ...props }) => <a {...props} className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
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

            {m.suggestions && m.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {m.suggestions.map((suggestion, j) => (
                  <button
                    key={j}
                    onClick={() => sendSuggestion(suggestion)}
                    disabled={chat.isPending}
                    className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-sm transition-all hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {m.actions && m.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {m.actions.map((action, j) => (
                  <span
                    key={j}
                    className="rounded-full border border-slate-700/50 bg-slate-900/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400"
                  >
                    {ACTION_LABELS[action] ?? action}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {chat.isPending && (
          <div className="flex items-start gap-2">
            <div className="rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-800/80 px-4 py-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            id="agent-chat-input"
            className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500/50"
            placeholder="Schedule a meeting, summarize emails..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={chat.isPending}
          />
          <button
            id="agent-send-btn"
            onClick={send}
            disabled={chat.isPending || !input.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-all hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
