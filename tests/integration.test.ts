import { describe, it, expect } from 'vitest'

describe.skip('Integration tests', () => {
  const hasKeys = (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY)

  it.skipIf(!hasKeys)('creates client with auto-detected config', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    expect(ai).toBeDefined()
  })

  it.skipIf(!hasKeys)('ping returns ok when credentials valid', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    const result = await ai.ping()
    expect(result.ok).toBe(true)
  })

  it.skipIf(!hasKeys)('getStatus returns provider status', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    const status = await ai.getStatus()
    expect(status.length).toBeGreaterThan(0)
    expect(status[0].name).toBeDefined()
    expect(status[0].healthy).toBeDefined()
  })

  it.skipIf(!hasKeys)('ask returns response', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    const reply = await ai.ask('What is 1+1?')
    expect(reply.length).toBeGreaterThan(0)
  })

  it.skipIf(!hasKeys)('streaming returns full response', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    let chunks = ''
    const reply = await ai.stream('Count to 3', (chunk) => {
      chunks += chunk
    })
    expect(chunks.length).toBeGreaterThan(0)
    expect(reply.length).toBeGreaterThan(0)
  })

  it.skipIf(!hasKeys)('json returns parsed object', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    const data = await ai.json('Return a JSON object with one field "test" set to "value"')
    expect(data).toBeDefined()
    expect(typeof data).toBe('object')
  })

  it.skipIf(!hasKeys)('tracking usage', async () => {
    const { createAivok } = await import('../src/client.js')
    const ai = createAivok()
    ai.resetUsage()
    const before = ai.getUsage()
    expect(before.requests).toBe(0)

    await ai.ask('Hello')

    const after = ai.getUsage()
    expect(after.requests).toBe(1)
  })
})