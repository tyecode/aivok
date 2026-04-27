import { createGeminiProvider } from './providers/gemini.js'
import { createGroqProvider } from './providers/groq.js'
import { createOpenAIProvider } from './providers/openai.js'
import { createAnthropicProvider } from './providers/anthropic.js'
import { createMistralProvider } from './providers/mistral.js'
import { createCohereProvider } from './providers/cohere.js'
import { createRouter } from './router.js'
import { createChatSession } from './chat.js'
import { runAgent } from './agent.js'
import { buildSystemPrompt } from './persona.js'
import { retryWithBackoff } from './retry.js'
import { AivokError } from './error.js'
import { ERROR_CODES } from './types.js'
import type {
  AivokConfig,
  AivokClient,
  AskOptions,
  ChatOptions,
  AgentOptions,
  Persona,
  Provider,
  ProviderConfig,
  ProviderMessage,
  CallOptions,
  UsageStats,
  ProviderStatus,
} from './types.js'

const DEFAULTS = {
  temperature: 0.7,
  maxTokens: 1024,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
}

function autoDetectConfig(): AivokConfig {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (geminiKey && groqKey) {
    return {
      providers: [
        { name: 'gemini', model: 'gemini-2.0-flash', apiKey: geminiKey, primary: true },
        { name: 'groq', model: 'llama-3.3-70b-versatile', apiKey: groqKey },
      ],
    }
  }

  if (geminiKey) {
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: geminiKey }
  }

  if (groqKey) {
    return { provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: groqKey }
  }

  throw new AivokError(
    'No API key found. Set GEMINI_API_KEY, GROQ_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY, or COHERE_API_KEY in your environment, or pass config to createAivok().',
    ERROR_CODES.AUTH_ERROR,
  )
}

export function createAivok(config?: AivokConfig): AivokClient {
  const cfg: AivokConfig = config ?? autoDetectConfig()
  let provider: Provider
  let activePersona: Persona | null = cfg.persona || null
  let activeModel: string | null = cfg.model || null
  const configSystem: string | null = cfg.system || null
  const usage: UsageStats = { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  const providerStatuses: Map<string, ProviderStatus> = new Map()

  const retryOpts = {
    retries: cfg.retries ?? DEFAULTS.retries,
    retryDelay: cfg.retryDelay ?? DEFAULTS.retryDelay,
  }

  let providerInstances: Provider[] = []

  if (cfg.providers) {
    providerInstances = cfg.providers.map(p => createProviderInstance(p, cfg))
    provider = createRouter(providerInstances)
  } else {
    const singleProvider = createProviderInstance({
      name: cfg.provider,
      model: cfg.model,
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
    }, cfg)
    providerInstances = [singleProvider]
    provider = singleProvider
  }

  function createProviderInstance(p: Partial<ProviderConfig> & { name?: string }, providerCfg: AivokConfig): Provider {
    const providerName = p.name || providerCfg.provider
    let instance: Provider

    switch (providerName) {
      case 'gemini':
        instance = createGeminiProvider({ model: p.model, apiKey: p.apiKey || '' })
        break
      case 'groq':
        instance = createGroqProvider({ model: p.model, apiKey: p.apiKey || '' })
        break
      case 'anthropic':
        instance = createAnthropicProvider({ model: p.model, apiKey: p.apiKey || '', baseURL: p.baseURL })
        break
      case 'mistral':
        instance = createMistralProvider({ model: p.model, apiKey: p.apiKey || '', baseURL: p.baseURL })
        break
      case 'cohere':
        instance = createCohereProvider({ model: p.model, apiKey: p.apiKey || '', baseURL: p.baseURL })
        break
      case 'openai-compatible':
        instance = createOpenAIProvider({
          model: p.model,
          apiKey: p.apiKey || '',
          baseURL: p.baseURL || providerCfg.baseURL,
        })
        break
      default:
        throw new AivokError(
          `Unknown provider: ${providerName}. Use 'gemini', 'groq', 'anthropic', 'mistral', 'cohere', or 'openai-compatible'.`,
          ERROR_CODES.PROVIDER_ERROR,
        )
    }

    const isPrimary = cfg.providers?.find(pp => pp.name === providerName)?.primary ?? (providerInstances.length === 0)
    providerStatuses.set(providerName, {
      name: providerName,
      model: instance.model,
      primary: isPrimary,
      healthy: true,
    })

    return instance
  }

  function trackUsage(u?: { inputTokens: number; outputTokens: number }) {
    usage.requests++
    if (u) {
      usage.inputTokens += u.inputTokens
      usage.outputTokens += u.outputTokens
      usage.totalTokens += u.inputTokens + u.outputTokens
    }
  }

  function buildCallOptions(options: AskOptions = {}): CallOptions {
    const model = options.model || activeModel || provider.model
    const timeout = cfg.timeout || DEFAULTS.timeout
    const timeoutSignal = AbortSignal.timeout(timeout)
    const userSignal = options.signal
    const signal = userSignal ? AbortSignal.any([userSignal, timeoutSignal]) : timeoutSignal

    return {
      model,
      temperature: options.temperature ?? cfg.temperature ?? DEFAULTS.temperature,
      maxTokens: options.maxTokens ?? cfg.maxTokens ?? DEFAULTS.maxTokens,
      signal,
    }
  }

  function buildMessages(systemPrompt: string | undefined, prompt: string): ProviderMessage[] {
    const messages: ProviderMessage[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })
    return messages
  }

  async function ask(prompt: string, options: AskOptions = {}): Promise<string> {
    const callOpts = buildCallOptions(options)
    const persona = options.persona || activePersona
    const systemPrompt = buildSystemPrompt(persona, options.system || configSystem)
    const messages = buildMessages(systemPrompt, prompt)

    if (options.stream) {
      const onChunk = typeof options.stream === 'function' ? options.stream : undefined
      return retryWithBackoff(
        () => provider.completeStream(messages, callOpts, onChunk),
        retryOpts,
      )
    }

    const result = await retryWithBackoff(
      () => provider.complete(messages, callOpts),
      retryOpts,
    )

    trackUsage(result.usage)
    return result.content || ''
  }

  async function stream(prompt: string, onChunk: (chunk: string) => void, options: AskOptions = {}): Promise<string> {
    const callOpts = buildCallOptions(options)
    const persona = options.persona || activePersona
    const systemPrompt = buildSystemPrompt(persona, options.system || configSystem)
    const messages = buildMessages(systemPrompt, prompt)

    return retryWithBackoff(
      () => provider.completeStream(messages, callOpts, onChunk),
      retryOpts,
    )
  }

  async function json(prompt: string, options: AskOptions = {}): Promise<unknown> {
    const jsonSystemAddition = 'You must respond with valid JSON only. No markdown, no code blocks, no explanation — just the raw JSON.'
    const persona = options.persona || activePersona
    const jsonSystem = options.system
      ? `${options.system}\n\n${jsonSystemAddition}`
      : persona
        ? buildSystemPrompt(persona, jsonSystemAddition)
        : jsonSystemAddition

    const callOpts = buildCallOptions(options)
    const messages: ProviderMessage[] = []

    if (jsonSystem) {
      messages.push({ role: 'system', content: jsonSystem })
    }

    if (options.schema) {
      messages.push({
        role: 'user',
        content: `${prompt}\n\nRespond using this JSON schema:\n${JSON.stringify(options.schema, null, 2)}`,
      })
    } else {
      messages.push({ role: 'user', content: prompt })
    }

    const result = await retryWithBackoff(
      () => provider.complete(messages, callOpts),
      retryOpts,
    )

    trackUsage(result.usage)
    const text = result.content || ''

    try {
      const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\][]*(?:\[[^\][]*\][^\][]*)*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(text)
    } catch {
      throw new AivokError(
        `Failed to parse JSON response: ${text.slice(0, 200)}`,
        ERROR_CODES.PARSE_ERROR,
      )
    }
  }

  function chat(options: ChatOptions = {}) {
    const chatOpts = { ...options }
    if (!chatOpts.persona && activePersona) {
      chatOpts.persona = activePersona
    }
    if (!chatOpts.system && configSystem) {
      chatOpts.system = configSystem
    }
    if (!chatOpts.model) {
      chatOpts.model = activeModel || provider.model
    }
    if (chatOpts.temperature === undefined && cfg.temperature !== undefined) {
      chatOpts.temperature = cfg.temperature
    }

    return createChatSession(provider, chatOpts)
  }

  async function agent(agentOptions: AgentOptions) {
    return runAgent(provider, agentOptions.goal, agentOptions.tools, {
      maxSteps: agentOptions.maxSteps,
      system: agentOptions.system || configSystem,
      persona: agentOptions.persona || activePersona,
      onStep: agentOptions.onStep,
      model: agentOptions.model || activeModel || undefined,
      temperature: agentOptions.temperature ?? cfg.temperature,
    })
  }

  function setPersona(persona: Persona) {
    activePersona = persona
  }

  function setModel(model: string) {
    activeModel = model
  }

  function getSystemPrompt(): string {
    return buildSystemPrompt(activePersona, configSystem) || ''
  }

  function getUsage(): UsageStats {
    return { ...usage }
  }

  function resetUsage() {
    usage.requests = 0
    usage.inputTokens = 0
    usage.outputTokens = 0
    usage.totalTokens = 0
  }

  async function ping(): Promise<{ ok: boolean; provider: string; latency: number; error?: string }> {
    const start = Date.now()
    const testMessage = [{ role: 'user' as const, content: 'ping' }]

    try {
      await provider.complete(testMessage, { maxTokens: 1 })
      const latency = Date.now() - start
      return { ok: true, provider: provider.name, latency }
    } catch (err) {
      const latency = Date.now() - start
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, provider: provider.name, latency, error }
    }
  }

  async function getStatus(): Promise<ProviderStatus[]> {
    const results: ProviderStatus[] = []

    for (const inst of providerInstances) {
      const status = providerStatuses.get(inst.name) || {
        name: inst.name,
        model: inst.model,
        primary: false,
        healthy: false,
      }

      try {
        await inst.complete([{ role: 'user', content: 'ping' }], { maxTokens: 1, signal: AbortSignal.timeout(5000) })
        status.healthy = true
        status.lastCheck = Date.now()
        delete status.error
      } catch (err) {
        status.healthy = false
        status.lastCheck = Date.now()
        status.error = err instanceof Error ? err.message : 'Connection failed'
      }

      results.push({ ...status })
    }

    return results
  }

  return {
    ask,
    chat,
    stream,
    json,
    agent,
    setPersona,
    setModel,
    getSystemPrompt,
    getUsage,
    resetUsage,
    ping,
    getStatus,
  }
}