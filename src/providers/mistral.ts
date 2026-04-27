import { createOpenAIProvider } from './openai.js'

interface MistralConfig {
  model?: string
  apiKey: string
  baseURL?: string
}

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1'

export function createMistralProvider(config: MistralConfig) {
  const defaultModel = 'mistral-small-latest'
  return createOpenAIProvider({
    model: config.model || defaultModel,
    apiKey: config.apiKey,
    baseURL: config.baseURL || MISTRAL_BASE_URL,
    providerName: 'mistral',
  })
}