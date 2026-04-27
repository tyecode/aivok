import type { Provider, AskOptions, ChatOptions, ChatSession, CallOptions } from './types.js'
import { buildSystemPrompt } from './persona.js'

const DEFAULT_MAX_MESSAGES = 20

export function createChatSession(provider: Provider, options: ChatOptions = {}): ChatSession {
  const history: Array<{ role: string; content: string }> = []
  let summary: string | null = null

  if (options.history) {
    history.push(...options.history)
  }

  const maxMessages = typeof options.smartMemory === 'number'
    ? options.smartMemory
    : DEFAULT_MAX_MESSAGES
  const smartMemoryEnabled = options.smartMemory === true || typeof options.smartMemory === 'number'

  async function summarizeHistory(): Promise<string> {
    const messages = history.map(h => `${h.role}: ${h.content}`).join('\n')
    const prompt = `Summarize the following conversation concisely, preserving all important facts, decisions, and context. Do not add commentary:\n\n${messages}`

    try {
      const result = await provider.complete(
        [{ role: 'user', content: prompt }],
        { model: options.model, temperature: 0.3 },
      )
      return result.content || 'Previous conversation was summarized.'
    } catch {
      return 'Previous conversation was summarized.'
    }
  }

  return {
    async send(message: string, callOptions: AskOptions = {}): Promise<string> {
      const systemPrompt = buildSystemPrompt(
        callOptions.persona || options.persona || null,
        callOptions.system || options.system,
      )

      const messages = []

      if (systemPrompt) {
        messages.push({ role: 'system' as const, content: systemPrompt })
      }

      if (summary) {
        messages.push({ role: 'assistant' as const, content: `Summary of earlier conversation: ${summary}` })
      }

      for (const h of history) {
        messages.push({ role: h.role as 'system' | 'user' | 'assistant', content: h.content })
      }
      messages.push({ role: 'user' as const, content: message })

      const callOpts: CallOptions = {
        model: callOptions.model || options.model,
        temperature: callOptions.temperature ?? options.temperature,
        maxTokens: callOptions.maxTokens,
        signal: callOptions.signal,
      }

      const result = await provider.complete(messages, callOpts)

      const reply = result.content || ''
      history.push({ role: 'user', content: message })
      history.push({ role: 'assistant', content: reply })

      if (smartMemoryEnabled && history.length > maxMessages) {
        const pairsToRemove = Math.floor((history.length - maxMessages) / 2)
        if (pairsToRemove > 0) {
          const removedMessages = history.splice(0, pairsToRemove * 2)
          const previousContext = summary ? `${summary}\n\n` : ''
          summary = previousContext + removedMessages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n')

          if (smartMemoryEnabled) {
            summary = await summarizeHistory()
          }
        }
      }

      return reply
    },

    history() {
      return [...history]
    },

    clear() {
      history.length = 0
      summary = null
    },

    undo() {
      if (history.length >= 2) {
        history.pop()
        history.pop()
      }
    },
  }
}