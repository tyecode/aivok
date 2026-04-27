import type { Persona } from './types.js'

export function buildSystemPrompt(persona: Persona | null, systemPrompt?: string | null): string | undefined {
  const parts: string[] = []

  if (persona) {
    parts.push(buildPersonaPrompt(persona))
  }

  if (systemPrompt) {
    parts.push(systemPrompt)
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined
}

function buildPersonaPrompt(persona: Persona): string {
  const lines: string[] = []

  if (persona.name || persona.role) {
    const intro = persona.name && persona.role
      ? `You are ${persona.name}, ${persona.role}.`
      : persona.name
        ? `You are ${persona.name}.`
        : `You are ${persona.role}.`
    lines.push(intro)
  }

  if (persona.tone) {
    lines.push(`Tone: ${persona.tone}`)
  }

  if (persona.language) {
    lines.push(`Language style: ${persona.language}`)
  }

  if (persona.rules && persona.rules.length > 0) {
    lines.push('')
    lines.push('Rules you always follow:')
    for (const rule of persona.rules) {
      lines.push(`- ${rule}`)
    }
  }

  if (persona.topics && persona.topics.length > 0) {
    lines.push('')
    lines.push('Topic guidelines:')
    for (const topic of persona.topics) {
      lines.push(`- ${topic}`)
    }
  }

  if (persona.context) {
    lines.push('')
    lines.push('Context:')
    lines.push(persona.context)
  }

  lines.push('')
  lines.push('Stay in character at all times. Never claim to be a different AI or a general assistant.')

  if (persona.greeting) {
    lines.push('')
    lines.push(`Your greeting when starting a conversation: "${persona.greeting}"`)
  }

  return lines.join('\n')
}