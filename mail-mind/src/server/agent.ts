import { buildCorsairToolDefs, type CorsairToolDef } from '@corsair-dev/mcp'
import { corsair } from './corsair'
import { AGENT_MODELS } from '@/lib/ai'
import { z } from 'zod'
import type OpenAI from 'openai'
import { db } from '@/server/db'
import { availabilityBlocks, schedulingNegotiations } from '@/server/db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'

/**
 * Convert Corsair tool definitions (Zod schemas) into OpenAI function calling format.
 * Uses z.toJSONSchema() (Zod v4 native) instead of zod-to-json-schema which
 * returns empty schemas with Zod v4.
 */
function toOpenAITools(defs: CorsairToolDef[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return defs.map(def => ({
    type: 'function' as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: z.toJSONSchema(z.object(def.shape), {
        target: 'draft-7',
        io: 'input',
      }),
    },
  }))
}

function extractToolText(result: Awaited<ReturnType<CorsairToolDef['handler']>>) {
  return result.content
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text' && 'text' in item)
    .map(item => item.text)
    .join('\n')
}

function sanitizeGeneratedScript(code: string) {
  let cleaned = code.replace(
    /calendarId\s*:\s*["']primary[?&]([^"']+)["']/g,
    (_match, query: string) => {
      const params = new URLSearchParams(String(query))
      const entries = Array.from(params.entries())
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')

      return entries ? `calendarId: "primary", ${entries}` : 'calendarId: "primary"'
    }
  )

  // Fix stubborn LLM generating numeric timestamps for Google Calendar
  cleaned = cleaned.replace(/timeMin:\s*(\d+)/g, 'timeMin: new Date($1).toISOString()')
  cleaned = cleaned.replace(/timeMax:\s*(\d+)/g, 'timeMax: new Date($1).toISOString()')

  return cleaned
}

function sanitizeToolArgs(toolName: string, args: Record<string, unknown>) {
  if (toolName !== 'run_script') return args

  for (const key of ['code', 'script', 'snippet']) {
    const value = args[key]
    if (typeof value === 'string') {
      return {
        ...args,
        [key]: sanitizeGeneratedScript(value),
      }
    }
  }

  return args
}
const ALLOWED_SCRIPT_OPERATIONS = new Set([
  'gmail.messages.list',
  'gmail.messages.get',
  'gmail.messages.send',
  'gmail.messages.modify',
  'gmail.messages.trash',
  'gmail.messages.delete',
  'gmail.messages.batchModify',
  'gmail.threads.list',
  'gmail.threads.get',
  'gmail.threads.modify',
  'gmail.threads.trash',
  'gmail.threads.delete',
  'googlecalendar.events.getMany',
  'googlecalendar.events.get',
  'googlecalendar.events.create',
  'googlecalendar.events.update',
  'googlecalendar.events.delete',
])

const WRITE_ACTION_PATTERN = /\.(?:send|create|modify|trash|delete|batchModify|update)\s*\(/g

function getScriptCode(args: Record<string, unknown>) {
  for (const key of ['code', 'script', 'snippet']) {
    const value = args[key]
    if (typeof value === 'string') return value
  }
  return ''
}

function stripStringLiterals(code: string) {
  return code.replace(/(["'])(?:\\.|(?!\1)[\s\S])*\1/g, '""')
}

function isWriteAction(code: string) {
  WRITE_ACTION_PATTERN.lastIndex = 0
  return WRITE_ACTION_PATTERN.test(code)
}

function validateGeneratedScript(code: string, tenantId: string): string | null {
  const codeWithoutStrings = stripStringLiterals(code)
  const blockedPatterns = [
    /\b(?:eval|Function|require|process|globalThis|window|document|fetch|XMLHttpRequest)\b/,
    /\b(?:fs|child_process|net|tls|http|https)\b/,
    /\b(?:constructor|prototype|__proto__)\b/,
    /\bimport\s*\(/,
    /`/,
  ]

  if (blockedPatterns.some((pattern) => pattern.test(codeWithoutStrings))) {
    return 'Generated script contains JavaScript that is not allowed for MailMind actions.'
  }

  const tenantMatches = Array.from(code.matchAll(/corsair\.withTenant\(\s*["']([^"']+)["']\s*\)/g))
  if (tenantMatches.length === 0) {
    return 'Generated script must use the current MailMind tenant.'
  }

  if (tenantMatches.some((match) => match[1] !== tenantId)) {
    return 'Generated script tried to use a different tenant.'
  }

  const operationMatches = Array.from(code.matchAll(/corsair\.withTenant\(\s*["'][^"']+["']\s*\)\.(gmail|googlecalendar)\.api\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/g))
  if (operationMatches.length === 0) {
    return 'Generated script must call an approved Gmail or Google Calendar API.'
  }

  for (const match of operationMatches) {
    const operation = `${match[1]}.${match[2]}.${match[3]}`
    if (!ALLOWED_SCRIPT_OPERATIONS.has(operation)) {
      return `Generated script attempted an unapproved operation: ${operation}`
    }
  }

  return null
}

/**
 * Wrap an LLM API call with retry logic for 429 and transient errors.
 * Attempts: 3 max. Backoff: 1s -> 2s -> 4s.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000]
  let lastErr: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastErr = err
      const errObj = err as Record<string, unknown> | undefined
      const status = errObj?.status ?? errObj?.statusCode
      const isRetryable = status === 429 || status === 500 || status === 503
      if (!isRetryable || attempt === delays.length) throw err
      const delay = delays[attempt]!
      console.warn(`[runAgent] Attempt ${attempt + 1} failed (${String(status)}). Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastErr
}



/** Format raw API JSON result into a friendly human-readable markdown summary. */
function formatExecutionResult(rawText: string, code: string): string {
  try {
    const data = JSON.parse(rawText) as Record<string, unknown>

    // ── Calendar event created ──
    if (data.kind === 'calendar#event') {
      const summary = (data.summary as string) ?? 'Meeting'
      const startDT = (data.start as { dateTime?: string } | undefined)?.dateTime ?? ''
      const endDT   = (data.end   as { dateTime?: string } | undefined)?.dateTime ?? ''
      const attendees = ((data.attendees as { email: string }[]) ?? [])
        .map(a => a.email).filter(Boolean)
      const link = (data.htmlLink as string) ?? ''

      const fmt = (iso: string) => {
        try {
          return new Date(iso).toLocaleString('en-IN', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
            timeZone: 'Asia/Kolkata',
          })
        } catch { return iso }
      }
      const fmtTime = (iso: string) => {
        try {
          return new Date(iso).toLocaleTimeString('en-IN', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
          })
        } catch { return '' }
      }

      const lines = [
        `✅ **Meeting booked!**`,
        ``,
        `📅 **${summary}**`,
        startDT ? `🕐 ${fmt(startDT)}${endDT ? ` – ${fmtTime(endDT)} IST` : ''}` : '',
        attendees.length ? `👤 Invite sent to: ${attendees.join(', ')}` : '',
        link ? `\n[View in Google Calendar](${link})` : '',
      ].filter(l => l !== '')
      return lines.join('\n')
    }

    // ── Gmail message sent ──
    if ((data.kind as string)?.startsWith('gmail#')) {
      const isDelete = code.includes('.trash(') || code.includes('.delete(')
      if (isDelete) return '✅ **Email moved to trash.**'
      return '✅ **Email sent!** The recipient should receive it shortly.\n\n> Check your Sent folder to confirm.'
    }

    // ── Calendar event deleted ──
    if (rawText === '' || rawText === '{}') {
      if (code.includes('.delete(') || code.includes('.trash(')) {
        return '✅ **Done.** The event was deleted and attendees were notified.'
      }
    }
  } catch {
    // Not parseable JSON — return a minimal success message
  }

  // Fallback for unrecognised results
  if (!rawText || rawText === '{}' || rawText === 'undefined') {
    return '✅ Done!'
  }
  return `✅ Done!\n\n${rawText}`
}

/**
 * Run the MailMind AI agent with Corsair tools for Gmail + Calendar.
 * Model is hardcoded to Gemini 2.5 Flash-Lite via OpenRouter.
 */
export async function runAgent(
  tenantId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  const { client, model } = AGENT_MODELS.geminiFlash

  // Build Corsair tools (Gmail + Calendar endpoints auto-discovered)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
  const toolDefs = buildCorsairToolDefs({ corsair: corsair as any, tenantId })
  const openaiTools = toOpenAITools(toolDefs)

  // Create a map for quick handler lookup
  const handlerMap = new Map<string, CorsairToolDef['handler']>()
  for (const def of toolDefs) {
    handlerMap.set(def.name, def.handler)
  }

  console.log(`[runAgent] Tools for tenant ${tenantId}: ${openaiTools.length}`)



  const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: 'system',
    content: `You are MailMind, an intelligent email and calendar assistant.

You have access to Corsair MCP tools that connect to the user's Gmail and Google Calendar.

IMPORTANT RULES:
1. For READ-ONLY tasks (read emails, check calendar), execute immediately using the tools.
2. For WRITE tasks (send email, create event, delete/archive), state your plan in ONE brief sentence (e.g. "Creating a 45-min Sync Up with ak688487@gmail.com on Saturday at 9 AM IST."), then IMMEDIATELY generate and execute the script. Do NOT ask "Shall I proceed?" — the UI will automatically show a confirmation draft card before anything is sent.
3. Never add suggestions like "Yes, proceed" or "No, cancel" before a write action — the draft card handles that.
4. If the user asks to schedule but duration or subject is missing, ask for BOTH in ONE message using this EXACT format so the UI renders chip buttons:

   "Happy to schedule that! Just need two quick things:"
   [DURATION: "30 min" | "45 min" | "1 hour" | "Other..."]
   [SUBJECT: "Project discussion" | "Quick chat" | "Sync up" | "Other..."]

   Do NOT ask for them separately. Do NOT use any other format. Use exactly these tag names.
5. ALWAYS assume the timezone is IST (Asia/Kolkata, UTC+05:30). Do not ask the user to confirm their timezone.

TECHNICAL:
- The current tenant id is already provided by the server: "${tenantId}".
- Always use exactly \`corsair.withTenant("${tenantId}")\` in run_script.
- If a tool or setup helper asks for tenantId, use "${tenantId}" internally. Do not ask the user.
- Use list_operations to discover available endpoints, get_schema for argument details, run_script to execute.
- Never put query params inside calendarId. calendarId must be exactly "primary". Pass timeMin, timeMax, singleEvents, and orderBy as separate object fields.
- For Google Calendar list/getMany calls, timeMin and timeMax must be RFC3339 strings. Use date.toISOString() or explicit strings like "2026-06-19T00:00:00+05:30". Never use Date.getTime(), numeric timestamps, or milliseconds.
- When scheduling a meeting: create the calendar event AND send a notification email.
- If a tool fails, tell the user the specific error in plain language. Do not hide it behind a generic support message.
- IMPORTANT: When you ask the user a question or present options, you MUST append a list of 2-4 suggested quick replies at the very end of your response using this exact format: \`[SUGGESTIONS: "Option 1" | "Option 2"]\`.
  Example: "I found 3 free slots. [SUGGESTIONS: "Book 2pm tomorrow" | "What about Friday?" | "Cancel"]"

CORSAIR API EXAMPLES:
Read unread emails:
\`\`\`javascript
return await corsair.withTenant("${tenantId}").gmail.api.messages.list({
  userId: "me",
  q: "is:unread",
  maxResults: 10
});
\`\`\`

Create a calendar event AND send an email invite in one script:
\`\`\`javascript
const event = await corsair.withTenant("${tenantId}").googlecalendar.api.events.create({
  calendarId: "primary",
  sendUpdates: "all",
  event: {
    summary: "Meeting",
    start: { dateTime: "2026-06-18T18:00:00+05:30", timeZone: "Asia/Kolkata" },
    end: { dateTime: "2026-06-18T19:00:00+05:30", timeZone: "Asia/Kolkata" },
    attendees: [{ email: "user@example.com" }]
  }
});

const email = [
  "To: user@example.com",
  "Subject: Meeting Scheduled: Meeting",
  "Content-Type: text/plain; charset=utf-8",
  "MIME-Version: 1.0",
  "",
  "Hi user,",
  "",
  "I have scheduled our meeting. Please check your calendar for the invite details."
].join("\\r\\n");

await corsair.withTenant("${tenantId}").gmail.api.messages.send({
  userId: "me",
  raw: Buffer.from(email).toString("base64url")
});

return event;
\`\`\`

Send an email:
\`\`\`javascript
const email = [
  "To: user@example.com",
  "Subject: Meeting scheduled",
  "Content-Type: text/plain; charset=utf-8",
  "MIME-Version: 1.0",
  "",
  "I look forward to our meeting."
].join("\\\\r\\\\n");
const raw = Buffer.from(email).toString("base64url");
return await corsair.withTenant("${tenantId}").gmail.api.messages.send({
  userId: "me",
  raw
});
\`\`\`

List upcoming calendar events:
\`\`\`javascript
return await corsair.withTenant("${tenantId}").googlecalendar.api.events.getMany({
  calendarId: "primary",
  timeMin: new Date().toISOString(),
  timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: "startTime"
});
\`\`\`

List events for one day:
\`\`\`javascript
return await corsair.withTenant("${tenantId}").googlecalendar.api.events.getMany({
  calendarId: "primary",
  timeMin: "2026-06-19T00:00:00+05:30",
  timeMax: "2026-06-19T23:59:59+05:30",
  singleEvents: true,
  orderBy: "startTime"
});
\`\`\`

Today is ${new Date().toDateString()}.
Resolve relative dates ("tomorrow", "Thursday", "next week") from today.`,
  }


  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    systemMessage,
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  ]

  const actions: string[] = []

  // Check for confirmed execution bypass
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.content.startsWith("CONFIRMED_EXECUTE:\n")) {
      const code = sanitizeGeneratedScript(lastMsg.content.replace("CONFIRMED_EXECUTE:\n", ""));
      const handler = handlerMap.get("run_script");
      if (handler) {
        const validationError = validateGeneratedScript(code, tenantId);
        if (validationError) {
          return {
            content: `I stopped this action because it did not pass safety checks: ${validationError}`,
            actions: ["run_script"],
            suggestions: [],
            requiresConfirmation: false,
            pendingScript: null,
          };
        }

        try {
          const result = await handler({ code });
          const text = extractToolText(result);
          const friendly = formatExecutionResult(text, code);
          return {
            content: friendly,
            actions: ["run_script"],
            suggestions: [],
            requiresConfirmation: false,
            pendingScript: null,
          };
        } catch (e) {
          return {
            content: `❌ Action failed: ${String(e)}`,
            actions: ["run_script"],
            suggestions: [],
            requiresConfirmation: false,
            pendingScript: null,
          };
        }
      }
    }
  }

  // Multi-turn loop (max 3 turns to conserve API calls)
  for (let i = 0; i < 3; i++) {
    const response = await withRetry(() =>
      client.chat.completions.create({
        model,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
        messages: chatMessages,
      })
    )

    const message = response.choices[0]!.message
    chatMessages.push(message)

    // If no tool calls, the agent is done and has responded with text
    if (!message.tool_calls?.length) {
      let content = message.content ?? ''
      let suggestions: string[] = []

      // Sanitize leaked tool tags from OpenRouter/Gemini
      content = content.replace(/<zc_external_tool_code>[\s\S]*?(?:<\/zc_external_tool_code>|$)/gi, '').trim()
      content = content.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '').trim()

      // Extract [SUGGESTIONS: "A" | "B"]
      const match = content.match(/\[SUGGESTIONS:\s*(.*?)\]/i)
      if (match) {
        content = content.replace(match[0], '').trim()
        suggestions = match[1]!
          .split('|')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }

      return {
        content,
        actions: Array.from(new Set(actions)),
        suggestions,
        requiresConfirmation: false,
        pendingScript: null,
      }
    }

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue

      const handler = handlerMap.get(toolCall.function.name)
      actions.push(toolCall.function.name)

      let resultContent: string
      if (handler) {
        try {
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
          const sanitizedArgs = sanitizeToolArgs(toolCall.function.name, args)

          if (toolCall.function.name === 'run_script') {
            const code = getScriptCode(sanitizedArgs)

            // Block agent from confusing native tools with Corsair APIs
            if (code.includes("create_scheduling_negotiation")) {
              chatMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: "ERROR: mailmind_create_scheduling_negotiation is a native tool call, NOT a javascript method on corsair. Do not use it inside run_script. Use the mailmind_create_scheduling_negotiation tool directly.",
              })
              continue
            }

            const validationError = validateGeneratedScript(code, tenantId)
            if (validationError) {
              return {
                content: `I stopped this action because it did not pass safety checks: ${validationError}`,
                actions: Array.from(new Set(actions)),
                suggestions: [],
                requiresConfirmation: false,
                pendingScript: null,
              }
            }

            if (isWriteAction(code)) {
              // The draft card is the single confirmation step before any write action.
              return {
                content: "",
                actions: Array.from(new Set(actions)),
                suggestions: [],
                requiresConfirmation: true,
                pendingScript: code,
              }
            }
          }
          const result = await handler(sanitizedArgs)
          const text = extractToolText(result)
          resultContent = text || JSON.stringify(result)
          if (result.isError) {
            console.error(`[runAgent] Tool ${toolCall.function.name} failed:`, resultContent)
            return {
              content: `I could not complete that action. ${resultContent}`,
              actions: Array.from(new Set(actions)),
              suggestions: [],
              requiresConfirmation: false,
              pendingScript: null,
            }
          }
        } catch (err) {
          console.error(`[runAgent] Tool ${toolCall.function.name} threw:`, err)
          resultContent = JSON.stringify({ error: String(err) })
          return {
            content: `I could not complete that action. ${String(err)}`,
            actions: Array.from(new Set(actions)),
            suggestions: [],
            requiresConfirmation: false,
            pendingScript: null,
          }
        }
      } else {
        resultContent = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` })
        return {
          content: `I could not complete that action. Unknown tool: ${toolCall.function.name}`,
          actions: Array.from(new Set(actions)),
          suggestions: [],
          requiresConfirmation: false,
          pendingScript: null,
        }
      }

      chatMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: resultContent,
      })
    }
  }

  // Fallback if we hit max turns
  return {
    content: 'I reached the maximum number of steps. Please try a more specific request.',
    actions: Array.from(new Set(actions)),
    suggestions: [],
    requiresConfirmation: false,
    pendingScript: null,
  }
}
