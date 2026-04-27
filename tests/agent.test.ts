import { describe, it, expect } from 'vitest'
import { runAgent } from '../src/agent.js'
import { ERROR_CODES } from '../src/types.js'

function createMockProvider(responses: Array<Record<string, unknown>>) {
  let callIndex = 0
  return {
    name: 'mock',
    model: 'mock-model',
    async complete(messages: unknown[], options: unknown) {
      const response = responses[callIndex++]
      if (typeof response === 'function') return response(messages, options)
      if (response instanceof Error) throw response
      return response
    },
  }
}

describe('runAgent', () => {
  it('returns answer when AI responds with text only', async () => {
    const provider = createMockProvider([
      { content: 'The answer is 42.', tool_calls: null, finish_reason: 'stop' },
    ])

    const result = await runAgent(provider, 'What is the answer?', {}, {})
    expect(result.answer).toBe('The answer is 42.')
    expect(result.toolCalls).toBe(0)
    expect(result.steps.length).toBeGreaterThan(0)
  })

  it('calls tools and returns final answer', async () => {
    const provider = createMockProvider([
      {
        content: null,
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'readFile', arguments: '{"path":"test.txt"}' },
        }],
        finish_reason: 'tool_calls',
      },
      { content: 'The file contains hello world.', tool_calls: null, finish_reason: 'stop' },
    ])

    const tools = {
      readFile: {
        description: 'Read a file',
        params: { path: 'string' },
        run: async ({ path }: { path: string }) => `Content of ${path}: hello world`,
      },
    }

    const result = await runAgent(provider, 'Read test.txt', tools, {})
    expect(result.answer).toBe('The file contains hello world.')
    expect(result.toolCalls).toBe(1)
  })

  it('calls multiple tools in sequence', async () => {
    const provider = createMockProvider([
      {
        content: null,
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'readFile', arguments: '{"path":"a.txt"}' },
        }],
        finish_reason: 'tool_calls',
      },
      {
        content: null,
        tool_calls: [{
          id: 'call_2',
          type: 'function',
          function: { name: 'readFile', arguments: '{"path":"b.txt"}' },
        }],
        finish_reason: 'tool_calls',
      },
      { content: 'Both files read.', tool_calls: null, finish_reason: 'stop' },
    ])

    const tools = {
      readFile: {
        description: 'Read a file',
        params: { path: 'string' },
        run: async ({ path }: { path: string }) => `Content of ${path}`,
      },
    }

    const result = await runAgent(provider, 'Read both files', tools, {})
    expect(result.answer).toBe('Both files read.')
    expect(result.toolCalls).toBe(2)
  })

  it('throws MAX_STEPS when exceeding step limit', async () => {
    const infiniteToolCall = {
      content: null,
      tool_calls: [{
        id: 'call_1',
        type: 'function',
        function: { name: 'loop', arguments: '{}' },
      }],
      finish_reason: 'tool_calls',
    }

    const responses = Array(50).fill(infiniteToolCall)
    const provider = createMockProvider(responses)

    const tools = {
      loop: {
        description: 'Loop',
        params: {},
        run: async () => 'loop',
      },
    }

    await expect(
      runAgent(provider, 'Loop forever', tools, { maxSteps: 3 }),
    ).rejects.toThrow()

    try {
      await runAgent(provider, 'Loop forever', tools, { maxSteps: 3 })
    } catch (err: unknown) {
      const aivokErr = err as { code: string; steps: unknown[] }
      expect(aivokErr.code).toBe(ERROR_CODES.MAX_STEPS)
      expect(aivokErr.steps).toBeDefined()
    }
  })

  it('handles tool errors gracefully', async () => {
    const provider = createMockProvider([
      {
        content: null,
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'fail', arguments: '{}' },
        }],
        finish_reason: 'tool_calls',
      },
      { content: 'The tool failed but I can still answer.', tool_calls: null, finish_reason: 'stop' },
    ])

    const tools = {
      fail: {
        description: 'A tool that fails',
        params: {},
        run: async () => { throw new Error('Tool failed') },
      },
    }

    const result = await runAgent(provider, 'Use failing tool', tools, {})
    expect(result.answer).toBe('The tool failed but I can still answer.')
  })

  it('calls onStep callback', async () => {
    const steps: Array<Record<string, unknown>> = []
    const onStep = (step: Record<string, unknown>) => steps.push(step)

    const provider = createMockProvider([
      {
        content: null,
        tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'echo', arguments: '{"msg":"hello"}' },
        }],
        finish_reason: 'tool_calls',
      },
      { content: 'Done', tool_calls: null, finish_reason: 'stop' },
    ])

    const tools = {
      echo: {
        description: 'Echo',
        params: { msg: 'string' },
        run: async ({ msg }: { msg: string }) => msg,
      },
    }

    await runAgent(provider, 'Echo hello', tools, { onStep })
    expect(steps.length).toBeGreaterThanOrEqual(2)
    expect(steps[0].type).toBe('tool_call')
    expect(steps[0].tool).toBe('echo')
  })
})