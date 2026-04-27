export interface Persona {
  name?: string
  role?: string
  tone?: string
  language?: string
  rules?: string[]
  topics?: string[]
  greeting?: string
  context?: string
}

export interface ToolDefinition {
  description: string
  params: Record<string, string>
  required?: string[]
  run: (input: Record<string, unknown>) => Promise<string>
}

export interface AgentStep {
  type: 'tool_call' | 'tool_result' | 'thinking' | 'done'
  tool?: string
  input?: Record<string, unknown>
  result?: string | null
  elapsed: number
}

export interface AgentResult {
  answer: string
  steps: AgentStep[]
  toolCalls: number
  elapsed: number
}

export interface ProviderConfig {
  name: string
  model: string
  apiKey: string
  baseURL?: string
  primary?: boolean
}

export interface UsageStats {
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface ProviderStatus {
  name: string
  model: string
  primary: boolean
  healthy: boolean
  lastCheck?: number
  error?: string
}

export interface AivokConfig {
  provider?: string
  model?: string
  apiKey?: string
  baseURL?: string
  providers?: ProviderConfig[]
  system?: string
  persona?: Persona
  temperature?: number
  maxTokens?: number
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface AskOptions {
  system?: string
  model?: string
  temperature?: number
  maxTokens?: number
  persona?: Persona
  signal?: AbortSignal
  schema?: Record<string, unknown>
  stream?: boolean | ((chunk: string) => void)
}

export interface ChatOptions {
  system?: string
  persona?: Persona
  model?: string
  temperature?: number
  history?: Array<{ role: string; content: string }>
  smartMemory?: boolean | number
}

export interface AgentOptions {
  goal: string
  tools: Record<string, ToolDefinition>
  maxSteps?: number
  system?: string
  persona?: Persona
  onStep?: (step: AgentStep) => void
  model?: string
  temperature?: number
}

export interface ChatSession {
  send: (message: string, options?: AskOptions) => Promise<string>
  history: () => Array<{ role: string; content: string }>
  clear: () => void
  undo: () => void
}

export interface AivokClient {
  ask: (prompt: string, options?: AskOptions) => Promise<string>
  chat: (options?: ChatOptions) => ChatSession
  stream: (prompt: string, onChunk: (chunk: string) => void, options?: AskOptions) => Promise<string>
  json: (prompt: string, options?: AskOptions) => Promise<unknown>
  agent: (options: AgentOptions) => Promise<AgentResult>
  setPersona: (persona: Persona) => void
  setModel: (model: string) => void
  getSystemPrompt: () => string
  getUsage: () => UsageStats
  resetUsage: () => void
  ping: () => Promise<{ ok: boolean; provider: string; latency: number; error?: string }>
  getStatus: () => Promise<ProviderStatus[]>
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
  toolName?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ProviderResponse {
  content: string | null
  tool_calls: ToolCall[] | null
  finish_reason: string
  usage?: { inputTokens: number; outputTokens: number }
}

export interface Provider {
  name: string
  model: string
  apiKey: string
  baseURL?: string
  primary?: boolean
  complete: (messages: ProviderMessage[], options?: CallOptions) => Promise<ProviderResponse>
  completeStream: (messages: ProviderMessage[], options?: CallOptions, onChunk?: (chunk: string) => void) => Promise<string>
}

export interface CallOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  tools?: Record<string, ToolDefinition>
}

export const ERROR_CODES = {
  RATE_LIMIT: 'RATE_LIMIT',
  AUTH_ERROR: 'AUTH_ERROR',
  TIMEOUT: 'TIMEOUT',
  MAX_STEPS: 'MAX_STEPS',
  PARSE_ERROR: 'PARSE_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]