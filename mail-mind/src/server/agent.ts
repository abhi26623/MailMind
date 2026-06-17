import { buildCorsairToolDefs, type CorsairToolDef } from '@corsair-dev/mcp'
import { corsair } from './corsair'
import { AGENT_MODELS } from '@/lib/ai'
import { z } from 'zod'
import type OpenAI from 'openai'

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

/**
 * Run the MailMind AI agent with Corsair tools for Gmail + Calendar.
 * Model is hardcoded to Gemini 2.5 Flash-Lite via OpenRouter.
 */
export async function runAgent(
  tenantId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  const { client, model } = AGENT_MODELS.geminiLite

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
2. For WRITE tasks (send email, create event, delete/archive), first summarize the planned action and ask the user to confirm BEFORE calling any tool. Example: "I'll create a calendar event for Thursday 6 PM with ak688487@gmail.com and email them an invite. Shall I proceed?"
3. Only execute write tools after the user confirms.
4. If the user asks to schedule but omits duration or subject, you MUST ask for them explicitly. Present the questions cleanly on separate lines. Example:
   "What should be the duration of the meeting?
   What is the subject of the meeting?"
5. ALWAYS assume the timezone is the user's local timezone unless they specify otherwise. Do not ask them to confirm their timezone.

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

Create a calendar event:
\`\`\`javascript
return await corsair.withTenant("${tenantId}").googlecalendar.api.events.create({
  calendarId: "primary",
  sendUpdates: "all",
  event: {
    summary: "Meeting",
    start: { dateTime: "2026-06-18T18:00:00+05:30", timeZone: "Asia/Kolkata" },
    end: { dateTime: "2026-06-18T19:00:00+05:30", timeZone: "Asia/Kolkata" },
    attendees: [{ email: "user@example.com" }]
  }
});
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
].join("\\r\\n");
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
          const parsedArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
          const args = sanitizeToolArgs(toolCall.function.name, parsedArgs)
          const result = await handler(args)
          const text = extractToolText(result)
          resultContent = text || JSON.stringify(result)
          if (result.isError) {
            console.error(`[runAgent] Tool ${toolCall.function.name} failed:`, resultContent)
            return {
              content: `I could not complete that action. ${resultContent}`,
              actions: Array.from(new Set(actions)),
              suggestions: [],
            }
          }
        } catch (err) {
          console.error(`[runAgent] Tool ${toolCall.function.name} threw:`, err)
          resultContent = JSON.stringify({ error: String(err) })
          return {
            content: `I could not complete that action. ${String(err)}`,
            actions: Array.from(new Set(actions)),
            suggestions: [],
          }
        }
      } else {
        resultContent = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` })
        return {
          content: `I could not complete that action. Unknown tool: ${toolCall.function.name}`,
          actions: Array.from(new Set(actions)),
          suggestions: [],
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
  }
}
