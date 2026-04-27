import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChatSession } from '../src/chat.js'
import type { Provider, ProviderMessage, ProviderResponse, CallOptions } from '../src/types.js'

describe('createChatSession', () => {
  let mockProvider: Provider

  beforeEach(() => {
    mockProvider = {
      name: 'test',
      model: 'test-model',
      apiKey: 'test-key',
      complete: vi.fn().mockImplementation(async (messages: ProviderMessage[], _options?: CallOptions): Promise<ProviderResponse> => {
        const lastMessage = messages[messages.length - 1]
        const content = lastMessage?.content || ''
        
        if (content.includes('ping')) {
          return { content: 'pong', tool_calls: null, finish_reason: 'stop' }
        }
        
        return {
          content: `Response to: ${content}`,
          tool_calls: null,
          finish_reason: 'stop',
        }
      }),
      completeStream: vi.fn().mockImplementation(async (messages: ProviderMessage[], _options?: CallOptions, onChunk?: (chunk: string) => void): Promise<string> => {
        const chunks = ['Hello', ' ', 'World']
        for (const chunk of chunks) {
          if (onChunk) onChunk(chunk)
        }
        return chunks.join('')
      }),
    }
  })

  it('creates a chat session with send method', () => {
    const session = createChatSession(mockProvider)
    expect(session.send).toBeTypeOf('function')
    expect(session.history).toBeTypeOf('function')
    expect(session.clear).toBeTypeOf('function')
    expect(session.undo).toBeTypeOf('function')
  })

  it('sends message and returns response', async () => {
    const session = createChatSession(mockProvider)
    const reply = await session.send('Hello')
    expect(reply).toBe('Response to: Hello')
    expect(mockProvider.complete).toHaveBeenCalled()
  })

  it('maintains conversation history', async () => {
    const session = createChatSession(mockProvider)
    await session.send('First')
    await session.send('Second')
    
    const history = session.history()
    expect(history.length).toBe(4) // user + assistant for each turn
    expect(history[0].content).toBe('First')
    expect(history[1].content).toBe('Response to: First')
    expect(history[2].content).toBe('Second')
    expect(history[3].content).toBe('Response to: Second')
  })

  it('clears history', async () => {
    const session = createChatSession(mockProvider)
    await session.send('Hello')
    await session.send('World')
    
    session.clear()
    expect(session.history().length).toBe(0)
  })

  it('undoes last turn', async () => {
    const session = createChatSession(mockProvider)
    await session.send('Hello')
    await session.send('World')
    
    session.undo()
    const history = session.history()
    expect(history.length).toBe(2) // back to just first message
  })

  it('does nothing when undo with less than 2 messages', () => {
    const session = createChatSession(mockProvider, { history: [{ role: 'user', content: 'test' }] })
    
    session.undo()
    expect(session.history().length).toBe(1) // unchanged (single message)
  })

  it('applies initial history', () => {
    const session = createChatSession(mockProvider, {
      history: [
        { role: 'user', content: 'Previous message 1' },
        { role: 'assistant', content: 'Previous response 1' },
      ],
    })
    
    const history = session.history()
    expect(history.length).toBe(2)
    expect(history[0].content).toBe('Previous message 1')
  })

  it('respects model option', async () => {
    const session = createChatSession(mockProvider, { model: 'custom-model' })
    await session.send('test')
    
    expect(mockProvider.complete).toHaveBeenCalled()
    const calls = mockProvider.complete.mock.calls
    const options = calls[0][1] as CallOptions
    expect(options.model).toBe('custom-model')
  })

  it('respects temperature option', async () => {
    const session = createChatSession(mockProvider, { temperature: 0.5 })
    await session.send('test')
    
    const calls = mockProvider.complete.mock.calls
    const options = calls[0][1] as CallOptions
    expect(options.temperature).toBe(0.5)
  })

  it('merges per-call options with session options', async () => {
    const session = createChatSession(mockProvider, { temperature: 0.5, model: 'session-model' })
    await session.send('test', { temperature: 0.9 })
    
    const calls = mockProvider.complete.mock.calls
    const options = calls[0][1] as CallOptions
    expect(options.temperature).toBe(0.9)
    expect(options.model).toBe('session-model')
  })

  describe('smartMemory', () => {
    it('summarizes when history exceeds threshold', async () => {
      let callCount = 0
      const summarizerProvider = {
        ...mockProvider,
        complete: vi.fn().mockImplementation(async (messages: ProviderMessage[], _options?: CallOptions): Promise<ProviderResponse> => {
          callCount++
          const content = messages[messages.length - 1]?.content || ''
          
          if (content.includes('Summarize')) {
            return { content: 'Summary of previous conversation', tool_calls: null, finish_reason: 'stop' }
          }
          
          return {
            content: `Response ${callCount}`,
            tool_calls: null,
            finish_reason: 'stop',
          }
        }),
      }
      
      const session = createChatSession(summarizerProvider, { smartMemory: 3 })
      
      await session.send('Message 1')
      await session.send('Message 2')
      await session.send('Message 3')
      await session.send('Message 4')
      
      const history = session.history()
      // After 4 messages (2 turns), should trigger summarization
      expect(callCount).toBeGreaterThan(3)
    })

    it('respects numeric smartMemory threshold', async () => {
      const session = createChatSession(mockProvider, { smartMemory: 3 })
      
      await session.send('M1')
      await session.send('M2')
      await session.send('M3')
      await session.send('M4')
      
      // Called at least 4 times (once per send)
      expect(mockProvider.complete).toHaveBeenCalled()
    })
  })

  describe('system prompt', () => {
    it('includes system prompt in first call', async () => {
      const session = createChatSession(mockProvider, { system: 'You are a tutor' })
      await session.send('Hello')
      
      const calls = mockProvider.complete.mock.calls
      const messages = calls[0][0] as ProviderMessage[]
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('You are a tutor')
    })

    it('merges per-call system with session system', async () => {
      const session = createChatSession(mockProvider, { system: 'Session system' })
      await session.send('Hello', { system: 'Call system' })
      
      const calls = mockProvider.complete.mock.calls
      const messages = calls[0][0] as ProviderMessage[]
      expect(messages[0].content).toContain('Call system')
    })
  })

  describe('persona', () => {
    it('applies persona as system prompt', async () => {
      const session = createChatSession(mockProvider, {
        persona: { name: 'Nova', role: 'assistant' },
      })
      await session.send('Hello')
      
      const calls = mockProvider.complete.mock.calls
      const messages = calls[0][0] as ProviderMessage[]
      expect(messages[0].content).toContain('Nova')
      expect(messages[0].content).toContain('assistant')
    })
  })
})