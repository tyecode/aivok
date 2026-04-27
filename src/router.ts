import { AivokError } from './error.js'
import { ERROR_CODES } from './types.js'
import type { Provider, ProviderMessage, ProviderResponse, CallOptions } from './types.js'

const PROVIDER_COOLDOWN_MS = 30000
const MAX_RETRIES_PER_PROVIDER = 2

export function createRouter(providers: Provider[]): Provider {
  const sorted = [...providers].sort((a, b) => {
    if (a.primary) return -1
    if (b.primary) return 1
    return 0
  })

  const providerCooldowns: Map<string, number> = new Map()
  const providerRetries: Map<string, number> = new Map()
  const routerApiKey = sorted[0]?.apiKey || ''

  function isProviderHealthy(providerName: string): boolean {
    const cooldown = providerCooldowns.get(providerName)
    if (cooldown && Date.now() < cooldown) {
      return false
    }
    providerCooldowns.delete(providerName)
    return true
  }

  function markRateLimited(providerName: string): void {
    providerCooldowns.set(providerName, Date.now() + PROVIDER_COOLDOWN_MS)
  }

  function shouldRetry(providerName: string): boolean {
    const retries = providerRetries.get(providerName) || 0
    if (retries >= MAX_RETRIES_PER_PROVIDER) {
      providerRetries.delete(providerName)
      return false
    }
    providerRetries.set(providerName, retries + 1)
    return true
  }

  function getHealthyProviders(): Provider[] {
    return sorted.filter(p => isProviderHealthy(p.name))
  }

  async function tryProvider(
    provider: Provider,
    messages: ProviderMessage[],
    callOptions: CallOptions,
  ): Promise<ProviderResponse> {
    try {
      return await provider.complete(messages, callOptions)
    } catch (err: unknown) {
      if (err instanceof AivokError) {
        if (err.code === ERROR_CODES.RATE_LIMIT) {
          markRateLimited(provider.name)
          if (shouldRetry(provider.name)) {
            throw new AivokError(`${provider.name} rate limited, will retry`, ERROR_CODES.RATE_LIMIT)
          }
        }
        if (err.code === ERROR_CODES.AUTH_ERROR) {
          throw err
        }
      }
      throw err
    }
  }

  async function tryProviderStream(
    provider: Provider,
    messages: ProviderMessage[],
    callOptions: CallOptions,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    try {
      return await provider.completeStream(messages, callOptions, onChunk)
    } catch (err: unknown) {
      if (err instanceof AivokError) {
        if (err.code === ERROR_CODES.RATE_LIMIT) {
          markRateLimited(provider.name)
          if (shouldRetry(provider.name)) {
            throw new AivokError(`${provider.name} rate limited, will retry`, ERROR_CODES.RATE_LIMIT)
          }
        }
        if (err.code === ERROR_CODES.AUTH_ERROR) {
          throw err
        }
      }
      throw err
    }
  }

  return {
    name: 'router',
    model: sorted[0]?.model || 'unknown',
    apiKey: routerApiKey,
    primary: sorted[0]?.primary,

    async complete(messages: ProviderMessage[], callOptions: CallOptions = {}): Promise<ProviderResponse> {
      const healthyProviders = getHealthyProviders()
      const providersToTry = healthyProviders.length > 0 ? healthyProviders : sorted

      let lastError: Error = new Error('No providers available')

      for (const provider of providersToTry) {
        try {
          return await tryProvider(provider, messages, callOptions)
        } catch (err: unknown) {
          lastError = err as Error

          if (err instanceof AivokError && err.code === ERROR_CODES.AUTH_ERROR) {
            throw err
          }

          if (err instanceof AivokError && err.code === ERROR_CODES.RATE_LIMIT) {
            continue
          }

          throw err
        }
      }

      throw lastError instanceof AivokError
        ? lastError
        : new AivokError('All providers failed', ERROR_CODES.PROVIDER_ERROR)
    },

    async completeStream(messages: ProviderMessage[], callOptions: CallOptions = {}, onChunk?: (chunk: string) => void): Promise<string> {
      const healthyProviders = getHealthyProviders()
      const providersToTry = healthyProviders.length > 0 ? healthyProviders : sorted

      let lastError: Error = new Error('No providers available')

      for (const provider of providersToTry) {
        try {
          return await tryProviderStream(provider, messages, callOptions, onChunk)
        } catch (err: unknown) {
          lastError = err as Error

          if (err instanceof AivokError && err.code === ERROR_CODES.AUTH_ERROR) {
            throw err
          }

          if (err instanceof AivokError && err.code === ERROR_CODES.RATE_LIMIT) {
            continue
          }

          throw err
        }
      }

      throw lastError instanceof AivokError
        ? lastError
        : new AivokError('All providers failed', ERROR_CODES.PROVIDER_ERROR)
    },
  }
}