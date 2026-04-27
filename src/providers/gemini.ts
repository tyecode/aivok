import { AivokError } from '../error.js'
import { ERROR_CODES } from '../types.js'
import type { Provider, ProviderMessage, ProviderResponse, CallOptions } from '../types.js'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

interface GeminiConfig {
  model?: string
  apiKey: string
}

interface GeminiFunctionCall {
  name: string
  args: Record<string, unknown>
}

interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: { name: string; response: { result: string } }
}

interface GeminiContent {
  role: string
  parts: GeminiPart[]
}

export function createGeminiProvider(config: GeminiConfig): Provider {
  const { model = 'gemini-2.0-flash', apiKey } = config

  if (!apiKey) {
    throw new AivokError('Gemini API key is required', ERROR_CODES.AUTH_ERROR)
  }

  return {
    name: 'gemini',
    model,
    apiKey,

    async complete(messages: ProviderMessage[], options: CallOptions = {}): Promise<ProviderResponse> {
      const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`
      const body = buildGeminiBody(messages, options)

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseGeminiError(res)
        throw err
      }

      const data = await res.json() as Record<string, unknown>
      return parseGeminiResponse(data)
    },

    async completeStream(messages: ProviderMessage[], options: CallOptions = {}, onChunk?: (chunk: string) => void): Promise<string> {
      const url = `${GEMINI_BASE_URL}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
      const body = buildGeminiBody(messages, options)

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const err = await parseGeminiError(res)
        throw err
      }

      return parseGeminiStream(res, onChunk)
    },
  }
}

function buildGeminiBody(messages: ProviderMessage[], options: CallOptions): Record<string, unknown> {
  const contents: GeminiContent[] = []
  const systemParts: Array<{ text: string }> = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push({ text: msg.content || '' })
      continue
    }

    const role = msg.role === 'assistant' ? 'model' : msg.role === 'tool' ? 'user' : msg.role
    const parts = messageToGeminiParts(msg)
    contents.push({ role, parts })
  }

  const body: Record<string, unknown> = { contents }

  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts }
  }

  if (options.tools && Object.keys(options.tools).length > 0) {
    body.tools = convertToolsToGemini(options.tools)
  }

  const generationConfig: Record<string, unknown> = {}
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature
  if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig
  }

  return body
}

function messageToGeminiParts(msg: ProviderMessage): GeminiPart[] {
  if (msg.role === 'assistant' && msg.tool_calls) {
    const parts: GeminiPart[] = []
    if (msg.content) parts.push({ text: msg.content })
    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown> = {}
      try {
        args = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments
      } catch {
        // keep empty args on parse failure
      }
      parts.push({
        functionCall: { name: tc.function.name, args },
      })
    }
    return parts
  }

  if (msg.role === 'tool') {
    return [{
      functionResponse: {
        name: msg.name || msg.tool_call_id || '',
        response: { result: msg.content || '' },
      },
    }]
  }

  return [{ text: msg.content || '' }]
}

function convertToolsToGemini(tools: Record<string, unknown>): Array<{ functionDeclarations: Array<Record<string, unknown>> }> {
  const declarations: Array<Record<string, unknown>> = []
  for (const [name, tool] of Object.entries(tools)) {
    const t = tool as { description: string; params: Record<string, string>; required?: string[] }
    const properties: Record<string, unknown> = {}
    const required: string[] = t.required || Object.keys(t.params || {})

    for (const [paramName, paramType] of Object.entries(t.params || {})) {
      properties[paramName] = { type: paramType }
    }
    declarations.push({
      name,
      description: t.description,
      parameters: { type: 'object', properties, required },
    })
  }
  return [{ functionDeclarations: declarations }]
}

interface GeminiCandidate {
  content?: { parts: GeminiPart[] }
  finishReason?: string
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

function parseGeminiResponse(data: GeminiResponse): ProviderResponse {
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new AivokError('No response from Gemini', ERROR_CODES.PROVIDER_ERROR)
  }

  const parts = candidate.content?.parts || []
  let content: string | null = null
  const tool_calls: ProviderResponse['tool_calls'] = []

  for (const part of parts) {
    if (part.text !== undefined) {
      content = (content || '') + part.text
    }
    if (part.functionCall) {
      tool_calls.push({
        id: `call_${tool_calls.length}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        },
      })
    }
  }

  const finishReason = candidate.finishReason
  let finish_reason: string = 'stop'
  if (finishReason === 'STOP') finish_reason = 'stop'
  else if (tool_calls.length > 0) finish_reason = 'tool_calls'

  return {
    content,
    tool_calls: tool_calls.length > 0 ? tool_calls : null,
    finish_reason,
    usage: data.usageMetadata
      ? { inputTokens: data.usageMetadata.promptTokenCount || 0, outputTokens: data.usageMetadata.candidatesTokenCount || 0 }
      : undefined,
  }
}

async function parseGeminiStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
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

      const jsonStr = trimmed.slice(6)
      try {
        const data = JSON.parse(jsonStr) as GeminiResponse
        const parts = data.candidates?.[0]?.content?.parts || []
        for (const part of parts) {
          if (part.text) {
            fullText += part.text
            if (onChunk) onChunk(part.text)
          }
        }
      } catch {
        // skip malformed SSE data
      }
    }
  }

  return fullText
}

async function parseGeminiError(res: Response): Promise<AivokError> {
  let message = `Gemini API error: HTTP ${res.status}`
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