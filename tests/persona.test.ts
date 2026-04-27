import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../src/persona.js'

describe('buildSystemPrompt', () => {
  it('returns undefined when no persona or system prompt', () => {
    expect(buildSystemPrompt(null, null)).toBeUndefined()
  })

  it('builds prompt from name and role', () => {
    const prompt = buildSystemPrompt({ name: 'Nova', role: 'a guide' }, null)
    expect(prompt).toContain('You are Nova, a guide.')
    expect(prompt).toContain('Stay in character')
  })

  it('builds prompt from name only', () => {
    const prompt = buildSystemPrompt({ name: 'Nova' }, null)
    expect(prompt).toContain('You are Nova.')
  })

  it('builds prompt from role only', () => {
    const prompt = buildSystemPrompt({ role: 'a guide' }, null)
    expect(prompt).toContain('You are a guide.')
  })

  it('includes tone', () => {
    const prompt = buildSystemPrompt({ name: 'Byte', tone: 'direct and technical' }, null)
    expect(prompt).toContain('Tone: direct and technical')
  })

  it('includes language style', () => {
    const prompt = buildSystemPrompt({ name: 'Byte', language: 'use code examples' }, null)
    expect(prompt).toContain('Language style: use code examples')
  })

  it('includes rules', () => {
    const prompt = buildSystemPrompt({
      name: 'Byte',
      rules: ['always show code', 'be specific'],
    }, null)
    expect(prompt).toContain('Rules you always follow:')
    expect(prompt).toContain('- always show code')
    expect(prompt).toContain('- be specific')
  })

  it('includes topics', () => {
    const prompt = buildSystemPrompt({
      name: 'Byte',
      topics: ['only discuss programming'],
    }, null)
    expect(prompt).toContain('Topic guidelines:')
    expect(prompt).toContain('- only discuss programming')
  })

  it('includes context', () => {
    const prompt = buildSystemPrompt({
      name: 'Byte',
      context: 'You work at a startup.',
    }, null)
    expect(prompt).toContain('Context:')
    expect(prompt).toContain('You work at a startup.')
  })

  it('includes greeting', () => {
    const prompt = buildSystemPrompt({
      name: 'Botto',
      greeting: 'Hey there!',
    }, null)
    expect(prompt).toContain('Your greeting when starting a conversation: "Hey there!"')
  })

  it('combines persona with system prompt', () => {
    const prompt = buildSystemPrompt(
      { name: 'Byte', role: 'an engineer' },
      'Always respond in JSON.',
    )
    expect(prompt).toContain('You are Byte, an engineer.')
    expect(prompt).toContain('Always respond in JSON.')
  })

  it('returns system prompt when no persona', () => {
    const prompt = buildSystemPrompt(null, 'You are a helpful tutor.')
    expect(prompt).toBe('You are a helpful tutor.')
  })

  it('builds full persona correctly', () => {
    const prompt = buildSystemPrompt({
      name: 'Byte',
      role: 'a senior software engineer and code reviewer',
      tone: 'direct, technical, honest — no fluff, no filler',
      rules: ['always show code', 'be specific'],
      topics: ['only discuss programming'],
      context: 'You work at a startup.',
    }, null)
    expect(prompt).toContain('You are Byte, a senior software engineer and code reviewer.')
    expect(prompt).toContain('direct, technical, honest')
    expect(prompt).toContain('always show code')
    expect(prompt).toContain('only discuss programming')
    expect(prompt).toContain('You work at a startup.')
  })
})