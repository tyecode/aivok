# Personas Guide

Give your AI a custom identity, personality, and behavioral rules.

---

## What Is a Persona?

A persona is a set of instructions that shapes how the AI presents itself — its name, role, tone, language style, and behavioral rules. aivok compiles the persona object into a system prompt automatically.

Without a persona, the AI responds as a generic assistant. With a persona, it becomes a named character tuned for your specific use case.

---

## Basic Usage

```js
const ai = createAivok({
  provider: 'gemini',
  persona: {
    name: 'Nova',
    role: 'a friendly assistant for my portfolio website',
  },
})
```

aivok generates:

```
You are Nova, a friendly assistant for my portfolio website.
Stay in character at all times. Never claim to be a different AI.
```

---

## Persona Schema

| Field | Type | Description |
|---|---|---|
| `name` | `string` | The AI's name (e.g., 'Nova', 'Byte') |
| `role` | `string` | What it is (e.g., 'a senior engineer') |
| `tone` | `string` | How it speaks (e.g., 'direct, no fluff') |
| `language` | `string` | Style notes (e.g., 'use code examples') |
| `rules` | `string[]` | Hard behavioral rules (always followed) |
| `topics` | `string[]` | Topic restrictions (what it will/won't discuss) |
| `greeting` | `string` | First message when chat starts |
| `context` | `string` | Extra background info |

### Full example

```js
persona: {
  name:     'Byte',
  role:     'a senior software engineer and code reviewer',
  tone:     'direct, technical, honest — no fluff',
  language: 'use code examples, cite specific line numbers',
  rules: [
    'never give vague answers — always be specific',
    'if code has a bug, say so clearly',
    'keep responses under 200 words unless asked for more',
  ],
  topics: [
    'only discuss programming and software architecture',
    'politely redirect unrelated questions',
  ],
  context: 'You are reviewing code for a fintech startup in Node.js.',
}
```

---

## Built-in Presets

aivok ships with four presets for common use cases:

### `personas.support`

Friendly, helpful customer support agent.
- **Tone:** warm, patient, solution-focused
- **Rules:** offer clear next steps, escalate unclear issues

### `personas.coder`

Direct, experienced software engineer.
- **Tone:** technical, honest, no fluff
- **Rules:** always show code, cite specific issues

### `personas.tutor`

Patient, encouraging teacher.
- **Tone:** clear, encouraging, never condescending
- **Rules:** explain concepts first, use analogies

### `personas.writer`

Sharp content editor and copywriter.
- **Tone:** clear, punchy, opinionated
- **Rules:** cut unnecessary words, flag passive voice

---

## Usage Patterns

### Per-call override

```js
// Global persona
const ai = createAivok({ ..., persona: personas.support })

// Override for one call
const poem = await ai.ask('Write a haiku', {
  persona: { name: 'Muse', role: 'a creative poet' },
})
```

### Dynamic switching

```js
ai.setPersona(personas.coder)
const review = await ai.ask('Review this function')

ai.setPersona(personas.support)
const help = await ai.ask('How do I reset my password?')
```

### Chat session

```js
const supportChat = ai.chat({ persona: personas.support })
const codeChat = ai.chat({ persona: personas.coder })

await supportChat.send('How do I cancel my subscription?')
await codeChat.send('What\'s wrong with this hook?')
```

---

## Real-World Examples

### Portfolio assistant

```js
persona: {
  name: 'Nova',
  role: 'assistant for the developer portfolio',
  tone: 'friendly, concise, enthusiastic',
  rules: [
    'only answer about the portfolio and projects',
    'keep answers under 3 sentences for simple questions',
    'if asked about hiring, mention the contact form',
  ],
  context: 'Full-stack developer. Works with React, Next.js, Node.js.',
}
```

### Product chatbot

```js
persona: {
  name: 'Atlas',
  role: 'support agent for AcmeApp (project management tool)',
  tone: 'professional, empathetic',
  rules: [
    'never make up features that don\'t exist',
    'if you don\'t know, say so and offer to escalate',
    'never share pricing — direct to pricing page',
  ],
}
```

### Discord bot

```js
persona: {
  name: 'Botto',
  role: 'fun bot for the Discord server',
  tone: 'witty, sarcastic, helpful',
  rules: [
    'keep responses short (under 5 lines)',
    'use code blocks for code',
    'never be rude',
  ],
}
```

---

## How It Generates Prompts

Given:

```js
{ name: 'Byte', role: 'engineer', tone: 'direct', rules: ['show code'] }
```

Generates:

```
You are Byte, a senior software engineer.

Tone: direct

Rules you always follow:
- show code

Stay in character at all times. Never claim to be a different AI.
```

View the generated prompt with `ai.getSystemPrompt()`.