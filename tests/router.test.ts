import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter } from '../src/router.js'
import type { Provider, ProviderMessage, ProviderResponse, CallOptions } from '../src/types.js'
import { AivokError } from '../src/error.js'
import { ERROR_CODES } from '../src/types.js'

describe('createRouter', () => {
  let providers: Provider[]

  beforeEach(() => {
    providers = [
      {
        name: 'primary',
        model: 'primary-model',
        apiKey: 'primary-key',
        primary: true,
        complete: vi.fn().mockImplementation(async () => {
          return { content: 'primary response', tool_calls: null, finish_reason: 'stop' }
        }),
        completeStream: vi.fn().mockImplementation(async () => 'primary stream'),
      },
      {
        name: 'backup',
        model: 'backup-model',
        apiKey: 'backup-key',
        complete: vi.fn().mockImplementation(async () => {
          return { content: 'backup response', tool_calls: null, finish_reason: 'stop' }
        }),
        completeStream: vi.fn().mockImplementation(async () => 'backup stream'),
      },
    ]
  })

  it('creates router with primary provider first', () => {
    const router = createRouter(providers)
    expect(router.name).toBe('router')
    expect(router.model).toBe('primary-model')
    expect(router.primary).toBe(true)
  })

  it('calls primary provider first', async () => {
    const router = createRouter(providers)
    const messages: ProviderMessage[] = [{ role: 'user', content: 'test' }]
    
    await router.complete(messages)
    
    expect(providers[0].complete).toHaveBeenCalled()
    expect(providers[1].complete).not.toHaveBeenCalled()
  })

  it('falls back to backup when primary fails with rate limit', async () => {
    const primaryProvider = providers[0]
    primaryProvider.complete = vi.fn().mockRejectedValue(
      new AivokError('Rate limited', ERROR_CODES.RATE_LIMIT)
    )
    
    const router = createRouter(providers)
    const messages: ProviderMessage[] = [{ role: 'user', content: 'test' }]
    
    const result = await router.complete(messages)
    
    expect(primaryProvider.complete).toHaveBeenCalled()
    expect(providers[1].complete).toHaveBeenCalled()
    expect(result.content).toBe('backup response')
  })

  it('throws immediately on auth error', async () => {
    const primaryProvider = providers[0]
    primaryProvider.complete = vi.fn().mockRejectedValue(
      new AivokError('Auth failed', ERROR_CODES.AUTH_ERROR)
    )
    
    const router = createRouter(providers)
    const messages: ProviderMessage[] = [{ role: 'user', content: 'test' }]
    
    await expect(router.complete(messages)).rejects.toThrow('Auth failed')
    expect(providers[1].complete).not.toHaveBeenCalled()
  })

  it('throws when all providers fail', async () => {
    providers[0].complete = vi.fn().mockRejectedValue(new Error('Failed'))
    providers[1].complete = vi.fn().mockRejectedValue(new Error('Failed'))
    
    const router = createRouter(providers)
    const messages: ProviderMessage[] = [{ role: 'user', content: 'test' }]
    
    await expect(router.complete(messages)).rejects.toThrow()
  })

  it('handles streaming fallback', async () => {
    const primaryProvider = providers[0]
    primaryProvider.completeStream = vi.fn().mockRejectedValue(
      new AivokError('Rate limited', ERROR_CODES.RATE_LIMIT)
    )
    
    const router = createRouter(providers)
    const messages: ProviderMessage[] = [{ role: 'user', content: 'test' }]
    
    const result = await router.completeStream(messages)
    
    expect(result).toBe('backup stream')
  })

  it('respects primary flag for sorting', () => {
    const unorderedProviders = [
      { name: 'b', model: 'b', apiKey: 'b', primary: false, complete: vi.fn(), completeStream: vi.fn() },
      { name: 'a', model: 'a', apiKey: 'a', primary: true, complete: vi.fn(), completeStream: vi.fn() },
    ]
    
    const router = createRouter(unorderedProviders)
    expect(router.model).toBe('a')
  })
})