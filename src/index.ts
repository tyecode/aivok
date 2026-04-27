export { createAivok } from './client.js'
export { AivokError } from './error.js'
export { ERROR_CODES } from './types.js'
export type {
  Persona,
  ToolDefinition,
  AgentStep,
  AgentResult,
  ProviderConfig,
  AivokConfig,
  AskOptions,
  ChatOptions,
  AgentOptions,
  ChatSession,
  AivokClient,
  ErrorCode,
  UsageStats,
} from './types.js'

export { support, coder, tutor, writer } from '../presets/personas.js'

import { support, coder, tutor, writer } from '../presets/personas.js'
export const personas = { support, coder, tutor, writer }