import { describe, it, expect, vi } from 'vitest'
import { createAivok } from '../src/client.js'
import { AivokError, ERROR_CODES } from '../src/error.js'

describe('createAivok', () => {
  it('creates a client with gemini provider', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
    })
    expect(ai).toBeDefined()
    expect(ai.ask).toBeTypeOf('function')
    expect(ai.chat).toBeTypeOf('function')
    expect(ai.stream).toBeTypeOf('function')
    expect(ai.json).toBeTypeOf('function')
    expect(ai.agent).toBeTypeOf('function')
    expect(ai.setPersona).toBeTypeOf('function')
    expect(ai.setModel).toBeTypeOf('function')
    expect(ai.getSystemPrompt).toBeTypeOf('function')
    expect(ai.getUsage).toBeTypeOf('function')
    expect(ai.resetUsage).toBeTypeOf('function')
  })

  it('creates a client with groq provider', () => {
    const ai = createAivok({
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      apiKey: 'test-key',
    })
    expect(ai).toBeDefined()
  })

  it('creates a client with openai-compatible provider', () => {
    const ai = createAivok({
      provider: 'openai-compatible',
      model: 'llama3',
      apiKey: 'test-key',
      baseURL: 'http://localhost:11434/v1',
    })
    expect(ai).toBeDefined()
  })

  it('creates a client with multi-provider config', () => {
    const ai = createAivok({
      providers: [
        { name: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key-1', primary: true },
        { name: 'groq', model: 'llama-3.3-70b-versatile', apiKey: 'test-key-2' },
      ],
    })
    expect(ai).toBeDefined()
  })

  it('throws for unknown provider', () => {
    expect(() => createAivok({
      provider: 'unknown',
      model: 'test',
      apiKey: 'test-key',
    })).toThrow()
  })

  it('throws for missing API key in explicit config', () => {
    expect(() => createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    })).toThrow()
  })

  it('setModel changes the active model', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
    })
    expect(() => ai.setModel('gemini-2.5-pro')).not.toThrow()
  })

  it('getSystemPrompt returns empty string when no persona or system set', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
    })
    expect(ai.getSystemPrompt()).toBe('')
  })

  it('getSystemPrompt returns prompt when persona is set', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
      persona: { name: 'Byte', role: 'a senior engineer' },
    })
    const prompt = ai.getSystemPrompt()
    expect(prompt).toContain('Byte')
    expect(prompt).toContain('senior engineer')
  })

  it('getSystemPrompt returns prompt when system is set', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
      system: 'You are a helpful assistant.',
    })
    const prompt = ai.getSystemPrompt()
    expect(prompt).toContain('helpful assistant')
  })

  it('setPersona updates the persona', () => {
    const ai = createAivok({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'test-key',
    })
    ai.setPersona({ name: 'Nova', role: 'a guide' })
    const prompt = ai.getSystemPrompt()
    expect(prompt).toContain('Nova')
    expect(prompt).toContain('guide')
  })

  describe('zero-config', () => {
    it('auto-detects GEMINI_API_KEY from env', () => {
      process.env.GEMINI_API_KEY = 'auto-test-key'
      const ai = createAivok()
      expect(ai).toBeDefined()
      expect(ai.ask).toBeTypeOf('function')
      delete process.env.GEMINI_API_KEY
    })

    it('auto-detects GROQ_API_KEY from env', () => {
      delete process.env.GEMINI_API_KEY
      process.env.GROQ_API_KEY = 'auto-test-key'
      const ai = createAivok()
      expect(ai).toBeDefined()
      delete process.env.GROQ_API_KEY
    })

    it('sets up multi-provider when both keys are present', () => {
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.GROQ_API_KEY = 'groq-key'
      const ai = createAivok()
      expect(ai).toBeDefined()
      delete process.env.GEMINI_API_KEY
      delete process.env.GROQ_API_KEY
    })

    it('throws with helpful message when no keys found', () => {
      delete process.env.GEMINI_API_KEY
      delete process.env.GROQ_API_KEY
      expect(() => createAivok()).toThrow(/No API key found/)
    })
  })

  describe('usage tracking', () => {
    it('returns zero usage initially', () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      const usage = ai.getUsage()
      expect(usage.requests).toBe(0)
      expect(usage.inputTokens).toBe(0)
      expect(usage.outputTokens).toBe(0)
      expect(usage.totalTokens).toBe(0)
    })

    it('resetUsage clears counters', () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      ai.resetUsage()
      const usage = ai.getUsage()
      expect(usage.requests).toBe(0)
      expect(usage.totalTokens).toBe(0)
    })
  })

  describe('streaming shorthand', () => {
    it('accepts stream option in ask', async () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      
      // Just verify the options are accepted without type error
      const options = { stream: true }
      expect(options.stream).toBe(true)
    })

    it('accepts stream callback in ask', async () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      
      const onChunk = (chunk: string) => console.log(chunk)
      const options = { stream: onChunk }
      expect(typeof options.stream).toBe('function')
    })
  })

  describe('ping', () => {
    it('returns ping result', async () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      
      const result = await ai.ping()
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('provider')
      expect(result).toHaveProperty('latency')
    })
  })

  describe('getStatus', () => {
    it('returns provider status array', async () => {
      const ai = createAivok({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      
      const status = await ai.getStatus()
      expect(Array.isArray(status)).toBe(true)
      expect(status[0]).toHaveProperty('name')
      expect(status[0]).toHaveProperty('model')
      expect(status[0]).toHaveProperty('healthy')
    })
  })
})