import { AivokError } from './error.js'
import { ERROR_CODES } from './types.js'
import { buildSystemPrompt } from './persona.js'
import type { Provider, AgentStep, AgentResult, ToolDefinition, Persona, ProviderMessage } from './types.js'

interface AgentRunOptions {
  maxSteps?: number
  system?: string | null
  persona?: Persona | null
  onStep?: (step: AgentStep) => void
  model?: string
  temperature?: number
}

export async function runAgent(
  provider: Provider,
  goal: string,
  tools: Record<string, ToolDefinition>,
  options: AgentRunOptions = {},
): Promise<AgentResult> {
  const {
    maxSteps = 20,
    system,
    persona,
    onStep,
    model,
    temperature,
  } = options

  const systemPrompt = buildAgentSystemPrompt(tools, system, persona)
  const messages: ProviderMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: goal },
  ]

  const steps: AgentStep[] = []
  let toolCallCount = 0
  const startTime = Date.now()

  for (let step = 0; step < maxSteps; step++) {
    const result = await provider.complete(messages, {
      tools,
      temperature,
      model,
    })

    if (result.tool_calls && result.tool_calls.length > 0) {
      const assistantContent = result.content || null
      messages.push({
        role: 'assistant',
        content: assistantContent,
        tool_calls: result.tool_calls,
      })

      for (const tc of result.tool_calls) {
        toolCallCount++
        const stepStart = Date.now()

        const toolName = tc.function.name
        const toolInput = parseToolInput(tc.function.arguments)
        const toolDef = tools[toolName]

        if (!toolDef) {
          const elapsed = Date.now() - stepStart
          const errorResult = `Unknown tool: ${toolName}`
          steps.push({
            type: 'tool_call',
            tool: toolName,
            input: toolInput,
            result: null,
            elapsed,
          })
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: errorResult,
          })
          steps.push({ type: 'tool_result', tool: toolName, result: errorResult, elapsed })
          if (onStep) onStep({ type: 'tool_call', tool: toolName, input: toolInput, result: null, elapsed })
          if (onStep) onStep({ type: 'tool_result', tool: toolName, result: errorResult, elapsed })
          continue
        }

        const stepInfo: AgentStep = {
          type: 'tool_call',
          tool: toolName,
          input: toolInput,
          result: null,
          elapsed: 0,
        }

        let toolResult: string
        try {
          toolResult = await toolDef.run(toolInput)
        } catch (err: unknown) {
          toolResult = `Error: ${(err as Error).message}`
        }

        const elapsed = Date.now() - stepStart
        stepInfo.result = toolResult
        stepInfo.elapsed = elapsed

        steps.push(stepInfo)

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: toolName,
          content: String(toolResult),
        })

        const resultStep: AgentStep = { type: 'tool_result', tool: toolName, result: toolResult, elapsed }
        steps.push(resultStep)

        if (onStep) onStep(stepInfo)
        if (onStep) onStep(resultStep)
      }

      continue
    }

    const answer = result.content || ''
    steps.push({ type: 'done', elapsed: Date.now() - startTime })

    return {
      answer,
      steps,
      toolCalls: toolCallCount,
      elapsed: Date.now() - startTime,
    }
  }

  const err = new AivokError(
    `Agent exceeded max steps (${maxSteps})`,
    ERROR_CODES.MAX_STEPS,
  )
  err.steps = steps
  throw err
}

function buildAgentSystemPrompt(tools: Record<string, ToolDefinition>, systemPrompt?: string | null, persona?: Persona | null): string {
  const parts: string[] = []

  if (persona) {
    parts.push(buildSystemPrompt(persona, null)!)
  }

  parts.push('You are an AI agent. Use the provided tools to accomplish the goal. Think step by step.')
  parts.push('When you have completed the task, respond with your final answer without calling any tools.')

  if (systemPrompt) {
    parts.push(systemPrompt)
  }

  return parts.join('\n\n')
}

function parseToolInput(argumentsStr: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!argumentsStr) return {}
  if (typeof argumentsStr === 'object') return argumentsStr
  try {
    return JSON.parse(argumentsStr)
  } catch {
    return {}
  }
}