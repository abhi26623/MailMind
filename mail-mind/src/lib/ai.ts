import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': 'MailMind',
  },
})

export type AgentModel = 'geminiLite'

export const AGENT_MODELS = {
  geminiLite: {
    client: openrouter,
    model: 'google/gemini-2.5-flash-lite',
  },
} satisfies Record<AgentModel, { client: OpenAI; model: string }>
