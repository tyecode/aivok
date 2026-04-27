import { AivokError } from '../error.js'
import { ERROR_CODES } from '../types.js'
import type { ProviderMessage, ProviderResponse, CallOptions, ToolCall } from '../types.js'

interface OpenAIConfig {
  model?: string
  apiKey: string
  baseURL?: string
  providerName?: string
}

export function createOpenAIProvider(config: OpenAIConfig) {
  const {
    model = 'gpt-4o-mini',
    apiKey,
    baseURL = 'https://api.openai.com/v1',
    providerName = 'openai-compatible',
  } = config

  if (!apiKey) {
    throw new AivokError(`${providerName}: API key is required`, ERROR_CODES.AUTH_ERROR)
  }

  return {
    name: providerName,
    model,
    apiKey,
    baseURL,

    async complete(messages: ProviderMessage[], options: CallOptions = {}): Promise<ProviderResponse> {
      const url = `${baseURL}/chat/completions`
      const body = buildOpenAIBody(messages, options, model)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseOpenAIError(res, providerName)
        throw err
      }

      const data = await res.json() as OpenAIResponse
      return parseOpenAIResponse(data)
    },

    async completeStream(messages: ProviderMessage[], options: CallOptions = {}, onChunk?: (chunk: string) => void): Promise<string> {
      const url = `${baseURL}/chat/completions`
      const body = buildOpenAIBody(messages, options, model, true)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseOpenAIError(res, providerName)
        throw err
      }

      return parseOpenAIStream(res, onChunk)
    },
  }
}

function buildOpenAIBody(messages: ProviderMessage[], options: CallOptions, model: string, stream = false): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => {
      const msg: Record<string, unknown> = { role: m.role, content: m.content }
      if (m.tool_calls) msg.tool_calls = m.tool_calls
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
      if (m.name) msg.name = m.name
      return msg
    }),
  }

  if (stream) body.stream = true
  if (options.temperature !== undefined) body.temperature = options.temperature
  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens

  if (options.tools && Object.keys(options.tools).length > 0) {
    body.tools = convertToolsToOpenAI(options.tools)
  }

  return body
}

function convertToolsToOpenAI(tools: Record<string, unknown>): Array<Record<string, unknown>> {
  return Object.entries(tools).map(([name, tool]) => {
    const t = tool as { description: string; params: Record<string, string>; required?: string[] }
    return {
      type: 'function',
      function: {
        name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.entries(t.params || {}).reduce<Record<string, unknown>>((acc, [key, type]) => {
            acc[key] = { type }
            return acc
          }, {}),
          required: t.required || Object.keys(t.params || {}),
        },
      },
    }
  })
}

interface OpenAIChoice {
  message?: {
    content?: string | null
    tool_calls?: ToolCall[]
  }
  finish_reason?: string
}

interface OpenAIResponse {
  choices?: OpenAIChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function parseOpenAIResponse(data: OpenAIResponse): ProviderResponse {
  const choice = data.choices?.[0]
  if (!choice) {
    throw new AivokError('No response from provider', ERROR_CODES.PROVIDER_ERROR)
  }

  const message = choice.message
  const content = message?.content || null
  const tool_calls = message?.tool_calls || null
  const finish_reason = choice.finish_reason === 'tool_calls' || (tool_calls && tool_calls.length > 0)
    ? 'tool_calls'
    : 'stop'

  return {
    content,
    tool_calls,
    finish_reason,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens || 0, outputTokens: data.usage.completion_tokens || 0 }
      : undefined,
  }
}

async function parseOpenAIStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new AivokError('No response body', ERROR_CODES.PROVIDER_ERROR)

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
        const delta = parsed.choices?.[0]?.delta
        if (delta?.content) {
          fullText += delta.content
          if (onChunk) onChunk(delta.content)
        }
      } catch {
        // skip malformed SSE data
      }
    }
  }

  return fullText
}

async function parseOpenAIError(res: Response, providerName: string): Promise<AivokError> {
  let message = `${providerName} API error: HTTP ${res.status}`
  try {
    const body = await res.json() as { error?: { message?: string } }
    message = body.error?.message || message
  } catch {
    // ignore parse errors
  }

  const err = new AivokError(message, ERROR_CODES.PROVIDER_ERROR)
  err.status = res.status

  if (res.status === 401 || res.status === 403) {
    err.code = ERROR_CODES.AUTH_ERROR
  } else if (res.status === 429) {
    err.code = ERROR_CODES.RATE_LIMIT
  }

  return err
}