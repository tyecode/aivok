import { createOpenAIProvider } from './openai.js'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

interface GroqConfig {
  model?: string
  apiKey: string
  baseURL?: string
}

export function createGroqProvider(config: GroqConfig) {
  return createOpenAIProvider({
    ...config,
    baseURL: config.baseURL || GROQ_BASE_URL,
    providerName: 'groq',
  })
}