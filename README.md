# aivok

<div align="center">

[![npm version](https://img.shields.io/npm/v/aivok)](https://www.npmjs.com/package/aivok)
[![npm downloads](https://img.shields.io/npm/dm/aivok)](https://www.npmjs.com/package/aivok)
[![License](https://img.shields.io/npm/l/aivok)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![CI](https://github.com/tyecode/aivok/actions/workflows/ci.yml/badge.svg)](https://github.com/tyecode/aivok/actions)

A unified JavaScript/TypeScript library for calling AI language models — with zero boilerplate, automatic provider fallback, agentic tool loops, and custom AI personas.

</div>

---

## Why aivok?

- **One import, every provider** — Gemini, Groq, Anthropic, Mistral, Cohere, OpenAI, Ollama, OpenRouter, and any OpenAI-compatible API
- **Zero boilerplate** — retries, rate limit backoff, message history, tool formatting handled automatically
- **Provider-agnostic** — swap models by changing one config line
- **TypeScript native** — full type safety, works seamlessly in JS and TS projects
- **Zero runtime dependencies** — lightweight, auditable, no bloat

---

## Install

```bash
npm install aivok
```

---

## Quick Start

### One-line setup (auto-detects API keys from `.env`)

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok()
const answer = await ai.ask('Explain async/await in JavaScript')
console.log(answer)
```

### Explicit configuration

```js
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})
```

---

## Supported Providers

| Provider | Description |
|---|---|
| **Gemini** | Google Gemini — large context window |
| **Groq** | Groq — fast inference |
| **Anthropic** | Anthropic Claude — careful reasoning |
| **Mistral** | Mistral AI — multilingual |
| **Cohere** | Cohere — enterprise, RAG |
| **OpenAI** | OpenAI GPT models |
| **OpenAI-compatible** | Ollama, OpenRouter, DeepSeek, xAI |

See [docs/providers.md](docs/providers.md) for setup guides and API key instructions.

---

## Features

### Single question

```js
const reply = await ai.ask('What is the capital of France?')
```

### Multi-turn chat

```js
const session = ai.chat()
await session.send('Explain closures in JavaScript')
await session.send('Give me a real-world example')
```

### Streaming

```js
await ai.stream('Write a story', (chunk) => process.stdout.write(chunk))
```

### Structured JSON

```js
const data = await ai.json('List 5 JS frameworks with name and year')
// Returns parsed JavaScript object
```

### Custom persona

```js
const ai = createAivok({
  provider: 'gemini',
  persona: {
    name:  'Nova',
    role:  'a helpful portfolio assistant',
    tone:  'friendly and concise',
    rules: ['keep answers short', 'only discuss my projects'],
  },
})
```

### Provider fallback

```js
const ai = createAivok({
  providers: [
    { name: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY, primary: true },
    { name: 'groq',   model: 'llama-3.3-70b-versatile', apiKey: process.env.GROQ_API_KEY },
  ],
})
// Tries Gemini first, automatically falls back to Groq on rate limit
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

console.log(result.answer)     // final response
console.log(result.steps)      // audit trail
```

### Built-in persona presets

```js
import { createAivok, personas } from 'aivok'

const ai = createAivok({ ..., persona: personas.coder })
// personas.support | personas.tutor | personas.writer | personas.coder
```

---

## Documentation

| Guide | Description |
|---|---|
| [API Reference](docs/api.md) | Every function, parameter, and return type |
| [Providers](docs/providers.md) | Setup guides, free API key instructions |
| [Agents](docs/agents.md) | Tool loop, tool definition format, examples |
| [Personas](docs/personas.md) | Custom AI identities, presets |
| [Examples](docs/examples.md) | Annotated copy-paste examples |

---

## Error Handling

All methods throw errors with a `code` property:

```js
try {
  const reply = await ai.ask('Hello')
} catch (err) {
  if (err.code === 'RATE_LIMIT')    console.log('All providers rate limited')
  if (err.code === 'AUTH_ERROR')    console.log('Invalid API key')
  if (err.code === 'MAX_STEPS')     console.log('Agent exceeded maxSteps')
  if (err.code === 'PARSE_ERROR')   console.log('Invalid JSON response')
}
```

---

## Author

Built by [@tyecode](https://github.com/tyecode)  


---

## License

[MIT](LICENSE)