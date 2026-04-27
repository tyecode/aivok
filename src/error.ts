import type { ErrorCode } from './types.js'

export class AivokError extends Error {
  code: ErrorCode | string
  status?: number
  steps?: unknown[]

  constructor(message: string, code: ErrorCode | string) {
    super(message)
    this.name = 'AivokError'
    this.code = code
  }
}

