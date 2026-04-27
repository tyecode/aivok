# aivok

[![npm version](https://img.shields.io/npm/v/aivok)](https://www.npmjs.com/package/aivok)
[![npm downloads](https://img.shields.io/npm/dm/aivok)](https://www.npmjs.com/package/aivok)
[![License](https://img.shields.io/npm/l/aivok)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/tyecode/aivok/actions/workflows/ci.yml/badge.svg)](https://github.com/tyecode/aivok/actions)

A lightweight JavaScript library for calling AI language models — with zero boilerplate, automatic provider fallback, agentic tool loops, and custom AI personas.

Works with Gemini, Groq, Anthropic, Mistral, Cohere, OpenAI, Ollama, OpenRouter, and any OpenAI-compatible API.

---

## Install

```bash
npm install aivok
```

---

## Quick start

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,  // free at aistudio.google.com
})

const answer = await ai.ask('Explain async/await in JavaScript')
console.log(answer)
```

Zero config — auto-detects keys from .env:

```js
// Zero config — auto-detects keys from .env
import { createAivok } from 'aivok'
const ai = createAivok()
```

---

## Supported Providers

aivok supports multiple AI providers. Choose based on your needs:

| Provider | Best for |
|---|---|
| **Gemini** | Large context, free tier |
| **Groq** | Fast inference, free tier |
| **Anthropic** | Claude models |
| **Mistral** | Multilingual |
| **Cohere** | Enterprise, RAG |
| **OpenAI** | GPT models |
| **OpenAI-compatible** | Ollama, OpenRouter, DeepSeek, xAI, custom |

### Free Options

For zero-cost usage:

| Provider | Free tier |
|---|---|
| **Gemini** | 15 RPM, forever |
| **Groq** | 30 RPM, forever |

---

## Install

## Features

### Single question

```js
const reply = await ai.ask('What is the capital of France?')
```

### Multi-turn chat

```js
const session = ai.chat()
const r1 = await session.send('Explain closures in JavaScript')
const r2 = await session.send('Give me a real-world example')
```

### Streaming

```js
// Alias: stream from ask()
const reply = await ai.ask('Write a short story', {
  stream: (chunk) => process.stdout.write(chunk),
})

// Or use ai.stream() directly
await ai.stream('Write a short story', (chunk) => process.stdout.write(chunk))
```

### JSON output

```js
const data = await ai.json('List the top 5 JS frameworks with name and year created')
// data is already a parsed JavaScript object
```

### AI persona

```js
const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,

  persona: {
    name:  'Nova',
    role:  'a helpful assistant for my portfolio website',
    tone:  'friendly and concise',
    rules: ['only discuss my projects', 'keep answers short'],
  },
})
```

### Automatic provider fallback

```js
const ai = createAivok({
  providers: [
    { name: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY, primary: true },
    { name: 'groq',   model: 'llama-3.3-70b-versatile', apiKey: process.env.GROQ_API_KEY },
  ],
})
// Tries Gemini first, falls back to Groq on rate limit — automatically
// Available providers: gemini, groq, anthropic, mistral, cohere, openai-compatible
```

### Usage tracking

```js
// Usage tracking
const usage = ai.getUsage()
console.log(usage) // { requests: 5, inputTokens: 1234, outputTokens: 567, totalTokens: 1801 }
```

### Smart memory

```js
// Smart memory — auto-summarizes long chats
const session = ai.chat({ smartMemory: true })
```

### Agentic tool loop

```js
const result = await ai.agent({
  goal: 'Read package.json, bump the patch version, save it back',
  tools: {
    readFile:  { description: 'Read a file', params: { path: 'string' }, run: async ({ path }) => fs.readFileSync(path, 'utf8') },
    writeFile: { description: 'Write a file', params: { path: 'string', content: 'string' }, run: async ({ path, content }) => { fs.writeFileSync(path, content); return 'done' } },
  },
  maxSteps: 5,
})

console.log(result.answer)
console.log(result.steps)   // full audit trail
```

### Custom API endpoint

```js
// Works with Ollama, OpenRouter, DeepSeek, xAI, or any OpenAI-compatible API
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'llama3',
  apiKey:   'ollama',
  baseURL:  'http://localhost:11434/v1',
})
```

---

## Built-in persona presets

```js
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  ...config,
  persona: personas.coder,    // direct senior engineer
  // or: personas.support     // friendly customer support
  // or: personas.tutor       // patient teacher
  // or: personas.writer      // sharp content editor
})
```

---

## Documentation

- [API reference](docs/api.md) — every function and parameter
- [Providers](docs/providers.md) — provider setup, free API key guides
- [Agents](docs/agents.md) — tool loop, tool definition format, examples
- [Personas](docs/personas.md) — custom AI identities, presets
- [Examples](docs/examples.md) — annotated copy-paste examples

---

## Author

Built by [@tyecode](https://github.com/tyecode) — Vientiane, Laos.
Part of the [qodexlab](https://github.com/qodexlab) ecosystem.

---

## License

MIT
