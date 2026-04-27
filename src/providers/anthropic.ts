import { AivokError } from '../error.js'
import { ERROR_CODES } from '../types.js'
import type { Provider, ProviderMessage, ProviderResponse, CallOptions } from '../types.js'

interface AnthropicConfig {
  model?: string
  apiKey: string
  baseURL?: string
}

export function createAnthropicProvider(config: AnthropicConfig): Provider {
  const { model = 'claude-3-5-haiku-20241022', apiKey, baseURL = 'https://api.anthropic.com' } = config

  if (!apiKey) {
    throw new AivokError('Anthropic API key is required', ERROR_CODES.AUTH_ERROR)
  }

  return {
    name: 'anthropic',
    model,
    apiKey,
    baseURL,

    async complete(messages: ProviderMessage[], options: CallOptions = {}): Promise<ProviderResponse> {
      const url = `${baseURL}/v1/messages`
      const { systemMessages, conversationMessages } = splitSystemMessages(messages)
      const body = buildAnthropicBody(conversationMessages, options, model, systemMessages)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseAnthropicError(res)
        throw err
      }

      const data = await res.json() as AnthropicResponse
      return parseAnthropicResponse(data)
    },

    async completeStream(messages: ProviderMessage[], options: CallOptions = {}, onChunk?: (chunk: string) => void): Promise<string> {
      const url = `${baseURL}/v1/messages`
      const { systemMessages, conversationMessages } = splitSystemMessages(messages)
      const body = buildAnthropicBody(conversationMessages, options, model, systemMessages)
      body.stream = true

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseAnthropicError(res)
        throw err
      }

      return parseAnthropicStream(res, onChunk)
    },
  }
}

function splitSystemMessages(messages: ProviderMessage[]): { systemMessages: string[]; conversationMessages: ProviderMessage[] } {
  const systemMessages: string[] = []
  const conversationMessages: ProviderMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (msg.content) systemMessages.push(msg.content)
    } else {
      conversationMessages.push(msg)
    }
  }

  return { systemMessages, conversationMessages }
}

function buildAnthropicBody(
  messages: ProviderMessage[],
  options: CallOptions,
  model: string,
  systemMessages: string[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens || 4096,
    messages: messages.map(m => {
      const msg: Record<string, unknown> = { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content || '' }
      return msg
    }),
  }

  if (systemMessages.length > 0) {
    body.system = systemMessages.join('\n\n')
  }

  if (options.temperature !== undefined) body.temperature = options.temperature

  if (options.tools && Object.keys(options.tools).length > 0) {
    body.tools = Object.entries(options.tools).map(([name, tool]) => {
      const t = tool as { description: string; params: Record<string, string> }
      return {
        name,
        description: t.description,
        input_schema: {
          type: 'object' as const,
          properties: Object.entries(t.params || {}).reduce<Record<string, unknown>>((acc, [key, type]) => {
            acc[key] = { type }
            return acc
          }, {}),
        },
      }
    })
  }

  return body
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  stop_reason?: string
  usage?: { input_tokens: number; output_tokens: number }
}

function parseAnthropicResponse(data: AnthropicResponse): ProviderResponse {
  let content: string | null = null
  const tool_calls: ProviderResponse['tool_calls'] = []

  for (const block of data.content || []) {
    if (block.type === 'text' && block.text) {
      content = (content || '') + block.text
    }
    if (block.type === 'tool_use' && block.name) {
      tool_calls.push({
        id: block.id || `call_${tool_calls.length}`,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input || {}),
        },
      })
    }
  }

  const finish_reason = data.stop_reason === 'tool_use' || tool_calls.length > 0 ? 'tool_calls' : 'stop'

  return {
    content,
    tool_calls: tool_calls.length > 0 ? tool_calls : null,
    finish_reason,
    usage: data.usage
      ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
      : undefined,
  }
}

async function parseAnthropicStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
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

      try {
        const parsed = JSON.parse(data) as { type: string; delta?: { text?: string } }
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text
          if (onChunk) onChunk(parsed.delta.text)
        }
      } catch {
        // skip malformed SSE data
      }
    }
  }

  return fullText
}

async function parseAnthropicError(res: Response): Promise<AivokError> {
  let message = `Anthropic API error: HTTP ${res.status}`
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