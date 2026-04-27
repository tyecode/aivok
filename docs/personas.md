# Personas

Give your AI a custom identity, personality, and constraints.

---

## What a persona is

A persona is a set of instructions that shapes how the AI presents itself — its name, role, tone, language style, and behavioural rules. aivok compiles the persona object into a system prompt automatically.

Without a persona, the AI responds as a generic assistant. With a persona, it becomes a named character tuned for your specific use case.

---

## Basic persona

```js
const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,

  persona: {
    name: 'Nova',
    role: 'a friendly assistant for my portfolio website',
  },
})
```

aivok generates this system prompt automatically:

```
You are Nova, a friendly assistant for my portfolio website.
Stay in character at all times. Never claim to be a different AI.
```

---

## Full persona schema

```js
{
  name:     string,       // the AI's name (e.g. 'Nova', 'Byte', 'Atlas')
  role:     string,       // what it is (e.g. 'a senior software engineer')
  tone:     string,       // how it speaks (e.g. 'direct and technical, no fluff')
  language: string,       // style notes (e.g. 'use code examples whenever possible')
  rules:    string[],     // hard behavioural rules (always followed)
  topics:   string[],     // topic restrictions (what it will/won't talk about)
  greeting: string,       // first message when chat starts (optional)
  context:  string,       // extra background the AI should know (optional)
}
```

### Full example

```js
persona: {
  name:     'Byte',
  role:     'a senior software engineer and code reviewer',
  tone:     'direct, technical, honest — no fluff, no filler',
  language: 'use code examples whenever possible, cite specific line numbers',
  rules: [
    'never give vague answers — always be specific',
    'if code has a bug, say so clearly and explain why',
    'keep responses under 200 words unless the user asks for more',
    'never apologise unnecessarily',
  ],
  topics: [
    'only discuss programming, software architecture, and engineering topics',
    'if asked about something unrelated, politely redirect to your area of expertise',
  ],
  context: 'You are reviewing code for a startup building a fintech product in Node.js.',
}
```

---

## Built-in presets

aivok ships with four presets covering common use cases.

```js
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona:  personas.support,
})
```

### `personas.support`

A friendly, helpful customer support agent.

- Tone: warm, patient, solution-focused
- Rules: always offer a clear next step, escalate unclear issues, never make promises about features or timelines
- Topics: focused on helping users solve problems with the product

### `personas.coder`

A direct, experienced software engineer.

- Tone: technical, honest, no fluff
- Rules: always show code, cite specific issues, suggest fixes not just problems
- Topics: programming, architecture, debugging, code review

### `personas.tutor`

A patient, encouraging teacher.

- Tone: clear, encouraging, never condescending
- Rules: explain concepts before showing code, check for understanding, use analogies
- Topics: learning and education — adapts explanation depth to the student's level

### `personas.writer`

A sharp content editor and copywriter.

- Tone: clear, punchy, opinionated
- Rules: cut unnecessary words, flag passive voice, suggest stronger alternatives
- Topics: writing, editing, content strategy, copy

---

## Per-call persona override

Override the persona for a single call without changing the global config.

```js
// Global persona is 'support'
const ai = createAivok({ ..., persona: personas.support })

// Override for one call
const poem = await ai.ask('Write a short haiku about JavaScript', {
  persona: {
    name: 'Muse',
    role: 'a creative poet',
    tone: 'lyrical, minimalist, precise',
  },
})

// Next call uses the global 'support' persona again
const help = await ai.ask('How do I reset my password?')
```

---

## Dynamic persona switching

Change the active persona mid-session.

```js
const ai = createAivok({ ..., persona: personas.support })

// User switches to "coding help" mode in your UI
ai.setPersona(personas.coder)

// All subsequent calls now use the coder persona
const review = await ai.ask('Review this function')

// Switch back
ai.setPersona(personas.support)
```

---

## Persona in a chat session

Each chat session can have its own persona, independent of the global config.

```js
// Global: no persona
const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: ... })

// Session 1: support persona
const supportChat = ai.chat({
  persona: personas.support,
})

// Session 2: coder persona
const codeChat = ai.chat({
  persona: personas.coder,
})

// Both sessions maintain separate histories and personas
await supportChat.send('How do I cancel my subscription?')
await codeChat.send('What\'s wrong with this React hook?')
```

---

## Real-world persona examples

### Portfolio website assistant

```js
persona: {
  name: 'Nova',
  role: 'a helpful assistant for Sengphachanh\'s developer portfolio',
  tone: 'friendly, concise, enthusiastic about tech',
  rules: [
    'only answer questions about the portfolio, projects, and the developer',
    'if asked about hiring, direct to the contact form',
    'keep responses under 3 sentences for simple questions',
  ],
  context: `
    Sengphachanh is a full-stack developer from Vientiane, Laos.
    He specialises in React, Next.js, and Node.js.
    His notable projects include a crypto payment system and a Discord bot.
    He is currently open to freelance and full-time opportunities.
  `,
}
```

### Product chatbot

```js
persona: {
  name: 'Atlas',
  role: 'a customer support agent for AcmeApp, a project management tool',
  tone: 'professional, empathetic, solution-oriented',
  rules: [
    'never make up features that don\'t exist',
    'if you don\'t know the answer, say so and offer to escalate',
    'always confirm you\'ve understood the user\'s problem before suggesting a solution',
    'never share pricing — direct users to the pricing page',
  ],
  topics: [
    'only discuss AcmeApp features, bugs, and account management',
    'do not discuss competitors',
  ],
}
```

### Discord bot persona

```js
persona: {
  name: 'Botto',
  role: 'a fun, sarcastic bot for the qodexlab Discord server',
  tone: 'witty, slightly sarcastic, but always helpful in the end',
  language: 'use Discord markdown, short sentences, occasional jokes',
  rules: [
    'keep responses short — under 5 lines unless asked for more',
    'use code blocks for any code',
    'never be rude, just playfully sarcastic',
  ],
}
```

---

## How aivok builds the system prompt

Given this persona:

```js
{
  name:  'Byte',
  role:  'a senior software engineer',
  tone:  'direct and technical',
  rules: ['always show code', 'be specific'],
}
```

aivok generates:

```
You are Byte, a senior software engineer.

Tone: direct and technical

Rules you always follow:
- always show code
- be specific

Stay in character at all times. Never claim to be a different AI or a general assistant.
```

This is prepended to any `system` prompt you also set. If you want to see the generated prompt, use `ai.getSystemPrompt()`.
