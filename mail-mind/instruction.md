Yes. Since you bought **OpenRouter credits**, the clean plan is:

```txt
OpenRouter API key
→ OpenAI SDK in your Next.js server
→ Gemini 2.5 Flash-Lite model on OpenRouter
→ Corsair MCP tools generated in src/server/agent.ts
→ Gmail / Calendar through Corsair
```

OpenRouter is OpenAI-compatible, so your existing `openai` package can stay. OpenRouter’s docs say you can point the OpenAI SDK at `https://openrouter.ai/api/v1`, and its tool-calling docs say the model suggests tool calls while your code executes them locally. Sources: [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart), [OpenRouter Tool Calling](https://openrouter.ai/docs/guides/features/tool-calling). The model slug is:

```txt
google/gemini-2.5-flash-lite
```

OpenRouter lists it at `$0.10 / $0.40 per 1M` input/output tokens. Source: [OpenRouter Gemini 2.5 Flash Lite](https://openrouter.ai/google/gemini-2.5-flash-lite).

Paste this into Antigravity:

```md
We need to update MailMind to use Gemini 2.5 Flash-Lite through OpenRouter, while keeping Corsair as the Gmail/Google Calendar integration layer.

Important:
- Do not use the direct Google Gemini API.
- Use OpenRouter because I bought OpenRouter credits.
- Use the existing OpenAI SDK package.
- OpenRouter is OpenAI-compatible, so set baseURL to https://openrouter.ai/api/v1.
- Model slug must be: google/gemini-2.5-flash-lite
- Corsair remains responsible for Gmail and Google Calendar actions.
- Gemini/OpenRouter only decides which Corsair MCP tool to call.

Main files to update:
- src/lib/ai.ts
- src/server/agent.ts
- src/server/better-auth/config.ts
- src/env.js
- .env.example
- src/app/_components/ModelPicker.tsx
- src/app/_components/AgentChat.tsx if needed
```

Then tell Antigravity this exact implementation plan:

```md
Step 1: Update environment variables.

In .env, add:

OPENROUTER_API_KEY="my_openrouter_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

Keep:
CORSAIR_KEK
DATABASE_URL
BETTER_AUTH_GOOGLE_CLIENT_ID
BETTER_AUTH_GOOGLE_CLIENT_SECRET

Do not require GEMINI_API_KEY anymore for the agent if we are using OpenRouter.
```

```md
Step 2: Update src/env.js.

Add OPENROUTER_API_KEY as a required server env var because OpenRouter is now the agent provider.

Use:

OPENROUTER_API_KEY: z.string(),

Keep GEMINI_API_KEY optional or remove it if unused.
```

```md
Step 3: Update src/lib/ai.ts.

Create an OpenRouter client using the OpenAI SDK:

import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-OpenRouter-Title': 'MailMind',
  },
})

export type AgentModel = 'geminiLite'

export const AGENT_MODELS = {
  geminiLite: {
    client: openrouter,
    model: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Cheap and fast agent model via OpenRouter',
    badge: 'AI',
    color: 'text-blue-400',
  },
} satisfies Record<AgentModel, {
  client: OpenAI
  model: string
  label: string
  description: string
  badge: string
  color: string
}>
```

```md
Step 4: Fix src/server/agent.ts tool schema conversion.

Remove zod-to-json-schema because it creates empty schemas with current Zod.

Replace:

import { zodToJsonSchema } from 'zod-to-json-schema'

with:

import { z } from 'zod'

Then in toOpenAITools, use:

parameters: z.toJSONSchema(z.object(def.shape), {
  target: 'draft-7',
  io: 'input',
}) as Record<string, unknown>,

This is mandatory. Without this, OpenRouter/Gemini will not know the correct arguments for Corsair MCP tools like run_script.
```

```md
Step 5: Fix wrong Corsair examples in src/server/agent.ts.

Gmail send must use:

await corsair.withTenant("${tenantId}").gmail.api.messages.send({
  userId: "me",
  message: { raw: encoded }
})

Calendar create must use:

await corsair.withTenant("${tenantId}").googlecalendar.api.events.create({
  calendarId: "primary",
  sendUpdates: "all",
  event: {
    summary: "Meeting",
    start: { dateTime: "2026-06-18T18:00:00Z" },
    end: { dateTime: "2026-06-18T19:00:00Z" },
    attendees: [{ email: "user@example.com" }]
  }
})

Calendar list must use:

await corsair.withTenant("${tenantId}").googlecalendar.api.events.getMany({
  calendarId: "primary",
  timeMin: new Date().toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: "startTime"
})
```

```md
Step 6: Add retry/backoff in src/server/agent.ts.

Wrap client.chat.completions.create with retry for 429 and transient OpenRouter/provider errors.

Use 3 attempts max.
Backoff: 1s, 2s, 4s.
Reduce agent loop from 5 turns to 3 turns.

Reason:
OpenRouter can still return rate/provider errors. The demo should not fail immediately.
```

```md
Step 7: Fix model enum in src/server/api/routers/agent.ts.

Change model enum to:

model: z.enum(['geminiLite']).default('geminiLite')

Or if keeping old options, include:

z.enum(['geminiLite', 'gemini', 'llama'])

But default must be geminiLite.
```

```md
Step 8: Update ModelPicker UI.

In src/app/_components/ModelPicker.tsx, replace old model options with:

geminiLite: {
  label: 'Gemini 2.5 Flash-Lite',
  description: 'Fast, cheap, via OpenRouter',
  badge: 'AI',
  color: 'text-blue-400',
}

Make selected default geminiLite in AgentChat.tsx.
```

```md
Step 9: Fix Google OAuth scopes.

In src/server/better-auth/config.ts, use writable scopes:

scope: [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar",
]

After this change, users must reconnect Google.
Without this, sending email and creating calendar events can fail.
```

```md
Step 10: Keep Corsair architecture clear.

Do not make Gemini call Gmail or Calendar directly.

Correct architecture:
- Gemini/OpenRouter receives the prompt.
- Gemini/OpenRouter returns tool_calls.
- src/server/agent.ts executes the Corsair MCP tool handler.
- Corsair talks to Gmail/Google Calendar using tenant credentials.
- Tool result is sent back to Gemini/OpenRouter.
- Gemini/OpenRouter writes the final user-facing response.
```

```md
Step 11: Add confirmation before write actions.

For actions like:
- send email
- create calendar event
- delete/trash/archive email

The agent should first summarize the planned action and ask for confirmation.

Example:
"I can create a calendar invite for Thursday 6 PM and email ak688487@gmail.com. Please confirm."

Only execute after the user confirms.
```

```md
Step 12: Run checks.

Run:

pnpm typecheck
pnpm build

Fix all TypeScript errors.

Then test:
1. "Summarize my unread emails"
2. "What meetings do I have this week?"
3. "Schedule a meeting with test@example.com tomorrow at 6pm and email them"

Expected:
- read-only tasks run directly
- write tasks ask confirmation
- confirmed write tasks call Corsair tools successfully
```

Also tell Antigravity this:

```md
Important bug to avoid:
Do not add webhookBus.emit inside src/server/corsair.ts if src/app/api/webhooks/route.ts already emits after processWebhook. That can duplicate events and initialize Redis in places that only need Corsair.

Keep SSE emit in the webhook route.
```

And this is your explanation for judges:

```txt
MailMind uses Corsair for Gmail and Google Calendar integrations.
The agent is model-agnostic. In this demo, the reasoning model is Gemini 2.5 Flash-Lite via OpenRouter for low cost. The model never directly accesses Gmail or Calendar; it only requests Corsair MCP tool calls, and the server executes those calls securely for the current tenant.
```

Do you need to buy anything else? For the LLM, **no**, your OpenRouter credits are enough. You still need normal Google OAuth credentials for Gmail/Calendar, but that is not the same as buying Gemini credits.