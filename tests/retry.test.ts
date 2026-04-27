import { describe, it, expect } from 'vitest'
import { retryWithBackoff, isRetryable } from '../src/retry.js'
import { AivokError } from '../src/error.js'
import { ERROR_CODES } from '../src/types.js'

describe('retryWithBackoff', () => {
  it('returns result on first try if successful', async () => {
    const result = await retryWithBackoff(() => Promise.resolve('success'))
    expect(result).toBe('success')
  })

  it('retries on retryable errors', async () => {
    let attempts = 0
    const fn = () => {
      attempts++
      if (attempts < 3) {
        const err: Error & { status: number } = new Error('rate limited')
        err.status = 429
        return Promise.reject(err)
      }
      return Promise.resolve('success')
    }

    const result = await retryWithBackoff(fn, { retries: 5, retryDelay: 10 })
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('throws immediately on auth errors', async () => {
    const fn = () => {
      const err = new AivokError('Invalid API key', ERROR_CODES.AUTH_ERROR)
      return Promise.reject(err)
    }

    await expect(retryWithBackoff(fn, { retries: 3 })).rejects.toThrow('Invalid API key')
  })

  it('throws after exhausting retries', async () => {
    const err: Error & { status: number } = new Error('persistent failure')
    err.status = 429

    await expect(
      retryWithBackoff(() => Promise.reject(err), { retries: 2, retryDelay: 10 }),
    ).rejects.toThrow()
  })

  it('calls onRetry callback', async () => {
    const retries: Array<{ attempt: number; maxRetries: number; delay: number }> = []
    let attempts = 0

    const fn = () => {
      attempts++
      if (attempts < 2) {
        const err: Error & { status: number } = new Error('retry me')
        err.status = 500
        return Promise.reject(err)
      }
      return Promise.resolve('ok')
    }

    await retryWithBackoff(fn, {
      retries: 3,
      retryDelay: 10,
      onRetry: (info) => retries.push(info),
    })

    expect(retries.length).toBe(1)
    expect(retries[0].attempt).toBe(1)
  })
})

describe('isRetryable', () => {
  it('considers rate limit errors retryable', () => {
    const err = new AivokError('rate limited', ERROR_CODES.RATE_LIMIT)
    expect(isRetryable(err)).toBe(true)
  })

  it('considers auth errors non-retryable', () => {
    const err = new AivokError('auth failed', ERROR_CODES.AUTH_ERROR)
    expect(isRetryable(err)).toBe(false)
  })

  it('considers 500 errors retryable', () => {
    const err: Error & { status: number } = new Error('server error')
    err.status = 500
    expect(isRetryable(err)).toBe(true)
  })
})