import { AivokError } from './error.js'
import { ERROR_CODES } from './types.js'

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

interface RetryOptions {
  retries?: number
  retryDelay?: number
  onRetry?: (info: { attempt: number; maxRetries: number; delay: number; error: Error }) => void
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, retryDelay = 1000, onRetry } = options
  let lastError: Error = new Error('unknown')

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err as Error

      if (err instanceof AivokError && err.code === ERROR_CODES.AUTH_ERROR) {
        throw err
      }

      if (!isRetryable(err as Error) || attempt === retries) {
        throw err
      }

      const delay = retryDelay * Math.pow(2, attempt)

      if (onRetry) {
        onRetry({ attempt: attempt + 1, maxRetries: retries, delay, error: err as Error })
      }

      await sleep(delay)
    }
  }

  throw lastError
}

export function isRetryable(err: Error): boolean {
  if (err instanceof AivokError && err.code === ERROR_CODES.RATE_LIMIT) return true
  if ('status' in err && typeof (err as { status: number }).status === 'number') {
    return RETRYABLE_STATUS_CODES.has((err as { status: number }).status)
  }
  if ('code' in err && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}