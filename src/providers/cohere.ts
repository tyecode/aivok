import { createOpenAIProvider } from './openai.js'

interface CohereConfig {
  model?: string
  apiKey: string
  baseURL?: string
}

const COHERE_BASE_URL = 'https://api.cohere.com/v2'

export function createCohereProvider(config: CohereConfig) {
  const defaultModel = 'command-r-plus'
  return createOpenAIProvider({
    model: config.model || defaultModel,
    apiKey: config.apiKey,
    baseURL: config.baseURL || COHERE_BASE_URL,
    providerName: 'cohere',
  })
}