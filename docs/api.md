# API Reference

Complete reference for every function, type, and option exported by aivok.

---

## Quick Reference

| Method | Description | Returns |
|---|---|---|
| `ai.ask(prompt, options?)` | Single-shot question | `Promise<string>` |
| `ai.chat(options?)` | Multi-turn chat session | `ChatSession` |
| `ai.stream(prompt, onChunk, options?)` | Streaming response | `Promise<string>` |
| `ai.json(prompt, options?)` | Force JSON output | `Promise<object>` |
| `ai.agent(options)` | Agentic tool loop | `Promise<AgentResult>` |
| `ai.getUsage()` | Get token usage stats | `UsageStats` |
| `ai.ping()` | Health check | `Promise<HealthResult>` |
| `ai.getStatus()` | All providers status | `Promise<ProviderStatus[]>` |
| `ai.getSystemPrompt()` | Generated system prompt | `string` |
| `ai.setPersona(persona)` | Update active persona | `void` |
| `ai.setModel(model)` | Change active model | `void` |

---

## `createAivok(config?)`

The main factory function. Creates a configured AI client.

### Zero-config (auto-detects from `.env`)

```js
import { createAivok } from 'aivok'

const ai = createAivok()
// Auto-detects GEMINI_API_KEY or GROQ_API_KEY
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

### Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `provider` | `string` | auto | `'gemini'`, `'groq'`, `'anthropic'`, `'mistral'`, `'cohere'`, `'openai-compatible'` |
| `model` | `string` | auto | Model string for the provider |
| `apiKey` | `string` | auto | API key for the provider |
| `baseURL` | `string` | provider default | Override API endpoint |
| `providers` | `array` | — | Multi-provider config with fallback |
| `system` | `string` | — | Global system prompt |
| `persona` | `object` | — | Persona config (auto-generates system prompt) |
| `temperature` | `number` | `0.7` | Default temperature (0.0–2.0) |
| `maxTokens` | `number` | `1024` | Default max output tokens |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `retries` | `number` | `3` | Max retry attempts |
| `retryDelay` | `number` | `1000` | Base delay (ms) for exponential backoff |

### Multi-provider config

```js
const ai = createAivok({
  providers: [
    {
      name:    'gemini',
      model:   'gemini-2.0-flash',
      apiKey:  process.env.GEMINI_API_KEY,
      primary: true,
    },
    {
      name:   'groq',
      model:  'llama-3.3-70b-versatile',
      apiKey: process.env.GROQ_API_KEY,
    },
  ],
})
```

When `providers` is set, aivok tries the `primary: true` provider first and falls back to the next on rate limit errors (HTTP 429).

---

## `ai.ask(prompt, options?)`

Single-shot question. Sends one message, returns one response.

```js
const reply = await ai.ask('Explain async/await in JavaScript')
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | The user message |
| `options.system` | `string` | Override system prompt for this call |
| `options.model` | `string` | Override model for this call |
| `options.temperature` | `number` | Override temperature |
| `options.maxTokens` | `number` | Override max tokens |
| `options.persona` | `object` | Override persona for this call |
| `options.signal` | `AbortSignal` | Abort signal to cancel request |
| `options.stream` | `boolean \| function` | Enable streaming |

### Returns

`Promise<string>` — the AI's text response.

### Streaming shorthand

```js
// Stream with callback
const reply = await ai.ask('Tell me a story', {
  stream: (chunk) => process.stdout.write(chunk),
})

// Stream without callback — returns full response
const reply = await ai.ask('Tell me a story', { stream: true })
```

### Examples

```js
// Simple question
const answer = await ai.ask('What is the capital of France?')

// With overrides
const review = await ai.ask('Review this code:\n' + code, {
  model:       'gemini-2.5-pro',
  temperature: 0.1,
  system:      'You are a strict code reviewer.',
})
```

---

## `ai.chat(options?)`

Creates a multi-turn chat session with conversation history.

```js
const session = ai.chat()
const reply1 = await session.send('Hello, who are you?')
const reply2 = await session.send('What did I just ask?')
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `system` | `string` | — | System prompt for this session |
| `persona` | `object` | — | Persona for this session |
| `model` | `string` | — | Model override |
| `temperature` | `number` | — | Temperature override |
| `history` | `array` | — | Pre-load conversation history |
| `smartMemory` | `boolean \| number` | `false` | Auto-summarize when history exceeds threshold |

### Session methods

#### `session.send(message, options?)`

Send a message, returns `Promise<string>`. History is maintained automatically.

#### `session.history()`

Returns full conversation history as `[{ role, content }]`.

#### `session.clear()`

Clears conversation history, starts fresh.

#### `session.undo()`

Removes the last exchange (user message + AI reply).

### Examples

```js
const session = ai.chat({
  persona: { name: 'Nova', role: 'portfolio assistant' },
})

await session.send('What projects have you worked on?')
await session.send('Tell me more about the second one')

console.log(session.history())
```

### Smart memory

When enabled, automatically summarizes older messages when conversation exceeds threshold.

```js
const session = ai.chat({ smartMemory: true })   // default threshold: 20 messages
const session = ai.chat({ smartMemory: 10 })     // custom threshold
```

---

## `ai.stream(prompt, onChunk, options?)`

Streaming response — calls `onChunk` with each text chunk.

```js
await ai.stream('Write a story', (chunk) => {
  process.stdout.write(chunk)
})
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | The user message |
| `onChunk` | `function` | Callback for each chunk |
| `options` | `object` | Same as `ask()` |

### Returns

`Promise<string>` — full concatenated response after streaming completes.

---

## `ai.json(prompt, options?)`

Forces structured JSON output. Automatically parses response.

```js
const data = await ai.json('List 3 JS frameworks with name and year')
// Returns: [{ name: 'React', year: 2013 }, ...]
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | Describe the JSON structure you want |
| `options` | `object` | Same as `ask()` |
| `options.schema` | `object` | Optional JSON schema hint |

### Returns

`Promise<any>` — parsed JavaScript object or array.

### Throws

`PARSE_ERROR` if response cannot be parsed as valid JSON.

---

## `ai.agent(options)`

Runs an agentic loop — AI reasons, calls tools, sees results, repeats until done.

```js
const result = await ai.agent({
  goal: 'Read package.json, bump version, save it',
  tools: {
    readFile:  { description: 'Read a file', params: { path: 'string' }, run: async ({ path }) => ... },
    writeFile: { description: 'Write a file', params: { path: 'string', content: 'string' }, run: async ({ path, content }) => ... },
  },
})

console.log(result.answer)
console.log(result.steps)   // audit trail
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `goal` | `string` | required | Task to accomplish |
| `tools` | `object` | required | Tool definitions |
| `maxSteps` | `number` | `20` | Safety limit for tool calls |
| `system` | `string` | — | Additional system instructions |
| `persona` | `object` | — | Persona override |
| `onStep` | `function` | — | Callback after each tool execution |
| `model` | `string` | — | Model override |

### Returns

```js
{
  answer:    string,          // AI's final text response
  steps:     AgentStep[],     // full audit trail
  toolCalls: number,          // total tool calls
  elapsed:   number,          // total time in ms
}
```

### AgentStep structure

```js
{
  type:    'tool_call' | 'tool_result' | 'thinking' | 'done',
  tool:    string,            // tool name
  input:   object,            // arguments passed
  result:  string,            // tool's return value
  elapsed: number,            // step time in ms
}
```

### onStep callback

```js
await ai.agent({
  goal: '...',
  tools,
  onStep: (step) => {
    if (step.type === 'tool_call')
      console.log(`→ ${step.tool}(${JSON.stringify(step.input)})`)
    if (step.type === 'tool_result')
      console.log(`  ← ${step.result.slice(0, 100)}...`)
  },
})
```

---

## `ai.getSystemPrompt()`

Returns the generated system prompt. Useful for debugging personas.

```js
const ai = createAivok({
  provider: 'gemini',
  persona: { name: 'Byte', role: 'senior engineer', tone: 'direct' },
})

console.log(ai.getSystemPrompt())
// "You are Byte, a senior engineer.\n\nTone: direct\n\nStay in character..."
```

---

## `ai.getUsage()`

Returns token usage statistics for the session.

```js
const usage = ai.getUsage()
console.log(usage)
// { requests: 5, inputTokens: 1234, outputTokens: 567, totalTokens: 1801 }
```

Cumulative across `ask()`, `json()`, and `agent()` calls. Streaming does not track tokens.

---

## `ai.resetUsage()`

Resets all usage counters to zero.

```js
ai.resetUsage()
console.log(ai.getUsage())
// { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
```

---

## `ai.ping()`

Tests current provider's credentials with a health check.

```js
const result = await ai.ping()
console.log(result)
// { ok: true, provider: 'gemini', latency: 123 }
// { ok: false, provider: 'gemini', latency: 456, error: 'Quota exceeded' }
```

### Returns

`Promise<{ ok: boolean, provider: string, latency: number, error?: string }>`

---

## `ai.getStatus()`

Returns health status for all configured providers.

```js
const status = await ai.getStatus()
console.log(status)
// [
//   { name: 'gemini', model: 'gemini-2.0-flash', primary: true, healthy: false, error: 'Quota exceeded' },
//   { name: 'groq', model: 'llama-3.3-70b-versatile', primary: false, healthy: true }
// ]
```

### Returns

`Promise<ProviderStatus[]>` — each provider returns:
- `name` — provider name
- `model` — model being used
- `primary` — whether primary provider
- `healthy` — whether responding
- `lastCheck` — timestamp of last check
- `error` — error message if unhealthy

---

## `ai.setPersona(persona)`

Updates the active persona. Affects all subsequent calls.

```js
ai.setPersona({
  name: 'Byte',
  role: 'senior software engineer',
  tone: 'direct and technical',
})
```

See [docs/personas.md](personas.md) for full schema.

---

## `ai.setModel(model)`

Changes the active model without recreating the client.

```js
ai.setModel('gemini-2.5-pro')
```

---

## Personas

Pre-built persona presets.

```js
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  persona:  personas.support,  // support | coder | tutor | writer
})
```

Or import individually:

```js
import { createAivok, coder, tutor } from 'aivok'

const ai = createAivok({ ..., persona: coder })
```

---

## Error Handling

All methods throw errors with a `code` property. Wrap in try/catch:

```js
try {
  const reply = await ai.ask('Hello')
} catch (err) {
  if (err.code === 'RATE_LIMIT')   console.log('All providers rate limited')
  if (err.code === 'AUTH_ERROR')    console.log('Invalid API key')
  if (err.code === 'TIMEOUT')       console.log('Request timed out')
  if (err.code === 'MAX_STEPS')     console.log('Agent exceeded maxSteps', err.steps)
  if (err.code === 'PARSE_ERROR')   console.log('Invalid JSON response')
  if (err.code === 'PROVIDER_ERROR') console.log('Provider error', err.message)
}
```

### Error codes

| Code | Meaning |
|---|---|
| `RATE_LIMIT` | All providers returned 429 after retries |
| `AUTH_ERROR` | Invalid or missing API key |
| `TIMEOUT` | Request exceeded timeout |
| `MAX_STEPS` | Agent exceeded `maxSteps` limit |
| `PARSE_ERROR` | `ai.json()` response was not valid JSON |
| `PROVIDER_ERROR` | Upstream provider returned an unexpected error |