# API reference

Complete reference for every function exported by aivok.

---

## `createAivok(config)`

The main factory function. Call this once per project to create a configured AI client.

### Zero-config

`config` is optional — call `createAivok()` with no arguments and it auto-detects API keys from environment variables:

```js
import { createAivok } from 'aivok'
const ai = createAivok() // auto-detects GEMINI_API_KEY or GROQ_API_KEY from .env
```

If both `GEMINI_API_KEY` and `GROQ_API_KEY` are present, it sets up multi-provider with automatic fallback.

```js
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})
```

### Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `provider` | `string` | auto-detected | `'gemini'`, `'groq'`, `'anthropic'`, `'mistral'`, `'cohere'`, or `'openai-compatible'` |
| `model` | `string` | auto-detected | Model string for the chosen provider |
| `apiKey` | `string` | auto-detected | API key for the provider |
| `baseURL` | `string` | provider default | Override the API endpoint (for custom/proxy APIs) |
| `providers` | `array` | — | Multi-provider config (overrides `provider`/`model`/`apiKey`) |
| `system` | `string` | — | Global system prompt applied to all calls |
| `persona` | `object` | — | Persona config (builds system prompt automatically) |
| `temperature` | `number` | `0.7` | Default temperature (0.0–2.0) |
| `maxTokens` | `number` | `1024` | Default max output tokens |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `3` | Max retry attempts on failure |
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

Single-shot question. Sends one message, returns one response string.

```js
const reply = await ai.ask('Explain async/await in JavaScript')
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | The user message to send |
| `options.system` | `string` | Override system prompt for this call only |
| `options.model` | `string` | Override model for this call only |
| `options.temperature` | `number` | Override temperature for this call only |
| `options.maxTokens` | `number` | Override max tokens for this call only |
| `options.persona` | `object` | Override persona for this call only |
| `options.signal` | `AbortSignal` | Abort signal to cancel the request |
| `options.stream` | `boolean \| function` | Stream the response. `true` streams to stdout, or pass a callback for each chunk |

### Returns

`Promise<string>` — the AI's text response.

### Streaming shorthand

Instead of calling `ai.stream()` separately, you can stream directly from `ask()`:

```js
// Stream with a callback (same as ai.stream)
const reply = await ai.ask('Tell me a story', {
  stream: (chunk) => process.stdout.write(chunk),
})

// Stream without a callback — returns the full response after streaming completes
const reply = await ai.ask('Tell me a story', { stream: true })
```

### Example

```js
// Simple question
const answer = await ai.ask('What is the capital of France?')

// With per-call overrides
const review = await ai.ask('Review this code:\n' + code, {
  model:       'gemini-2.5-pro',
  temperature: 0.1,
  system:      'You are a strict code reviewer. Be direct.',
})

// Streaming shorthand
const story = await ai.ask('Write a short story', {
  stream: (chunk) => process.stdout.write(chunk),
})
```

---

## `ai.chat(options?)`

Creates a multi-turn chat session that maintains conversation history.

```js
const session = ai.chat()
const reply1 = await session.send('Hello, who are you?')
const reply2 = await session.send('What did I just ask you?')
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `system` | `string` | — | System prompt for this session |
| `persona` | `object` | — | Persona for this session |
| `model` | `string` | — | Model override for this session |
| `temperature` | `number` | — | Temperature override for this session |
| `history` | `array` | — | Pre-load conversation history |
| `smartMemory` | `boolean \| number` | `false` | Auto-summarize chat history when it exceeds a threshold |

### Session methods

#### `session.send(message, options?)`

Send a message and get a reply. History is maintained automatically.

Returns `Promise<string>`.

#### `session.history()`

Returns the full conversation history as an array of `{ role, content }` objects.

#### `session.clear()`

Clears the conversation history, starting a fresh session.

#### `session.undo()`

Removes the last complete exchange (one user message + one AI reply) from history. Calling it again removes the exchange before that.

### Example

```js
const session = ai.chat({
  persona: {
    name: 'Nova',
    role: 'a helpful portfolio assistant',
  },
})

const r1 = await session.send('What projects have you worked on?')
const r2 = await session.send('Tell me more about the second one')
const r3 = await session.send('What tech stack did that use?')

console.log(session.history()) // full conversation
```

### Smart memory

When enabled, the chat session automatically summarizes older messages when the conversation exceeds a threshold. This keeps context within token limits without losing important information.

```js
const session = ai.chat({ smartMemory: true })          // summarize after 20 messages (default)
const session = ai.chat({ smartMemory: 10 })            // summarize after 10 messages
```

When history exceeds the threshold, aivok calls the AI to summarize the older messages and replaces them with a single summary. The most recent messages are kept intact.

---

## `ai.stream(prompt, onChunk, options?)`

Streaming response — calls `onChunk` with each text chunk as it arrives.

```js
await ai.stream('Write a short story about robots', (chunk) => {
  process.stdout.write(chunk)
})
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | The user message |
| `onChunk` | `function` | Called with each text chunk as `string` |
| `options` | `object` | Same options as `ask()` |

### Returns

`Promise<string>` — the full concatenated response (after streaming completes).

### Example with UI update

```js
let fullText = ''

await ai.stream('Explain machine learning', (chunk) => {
  fullText += chunk
  document.getElementById('output').textContent = fullText
})
```

---

## `ai.json(prompt, options?)`

Forces structured JSON output. Automatically parses the response and throws if parsing fails.

```js
const data = await ai.json('List 3 JavaScript frameworks with name and year')
// Returns: [{ name: 'React', year: 2013 }, ...]
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `prompt` | `string` | The user message — describe the JSON structure you want |
| `options` | `object` | Same options as `ask()` |
| `options.schema` | `object` | Optional JSON schema hint to include in the prompt |

### Returns

`Promise<any>` — parsed JavaScript object or array.

### Throws

`Error` if the AI response cannot be parsed as valid JSON.

### Example

```js
const result = await ai.json(`
  Return a JSON object with:
  - languages: array of top 5 programming languages
  - each with: name (string), year (number), paradigm (string)
`)

console.log(result.languages[0].name) // 'JavaScript'
```

---

## `ai.agent(options)`

Runs an agentic loop — the AI reasons, calls tools, sees results, and repeats until done.

```js
const result = await ai.agent({
  goal:  'Read package.json, bump the patch version, save it back',
  tools: {
    readFile:  { description: '...', params: { path: 'string' }, run: async ({ path }) => ... },
    writeFile: { description: '...', params: { path: 'string', content: 'string' }, run: async ({ path, content }) => ... },
  },
})

console.log(result.answer) // AI's final message
console.log(result.steps)  // audit trail
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `goal` | `string` | required | The task you want the agent to accomplish |
| `tools` | `object` | required | Tool definitions (see [Agents](agents.md)) |
| `maxSteps` | `number` | `20` | Safety limit — stops loop after this many tool calls |
| `system` | `string` | — | Additional system instructions for the agent |
| `persona` | `object` | — | Persona override for the agent |
| `onStep` | `function` | — | Callback called after each tool execution |
| `model` | `string` | — | Model override for the agent |

### Returns

`Promise<AgentResult>` where `AgentResult` is:

```js
{
  answer:    string,          // AI's final text response
  steps:     AgentStep[],     // full audit trail
  toolCalls: number,          // total tool calls made
  elapsed:   number,          // total time in milliseconds
}
```

Each `AgentStep`:

```js
{
  type:    'tool_call' | 'tool_result' | 'thinking' | 'done',
  tool:    string,            // tool name (if type is tool_call/tool_result)
  input:   object,            // arguments passed to the tool
  result:  string,            // what the tool returned
  elapsed: number,            // time for this step in ms
}
```

### onStep callback

```js
const result = await ai.agent({
  goal: '...',
  tools,
  onStep: (step) => {
    if (step.type === 'tool_call') {
      console.log(`Calling: ${step.tool}(${JSON.stringify(step.input)})`)
    }
    if (step.type === 'tool_result') {
      console.log(`Result: ${step.result.slice(0, 100)}...`)
    }
  },
})
```

---

## `ai.getSystemPrompt()`

Returns the generated system prompt string that aivok will send to the AI. Useful for debugging your persona or seeing what prompt gets built.

```js
const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona: { name: 'Byte', role: 'a senior engineer', tone: 'direct' },
})

console.log(ai.getSystemPrompt())
// "You are Byte, a senior engineer.\n\nTone: direct\n\nStay in character..."
```

This is also useful if you set both `system` and `persona` — it shows the combined prompt.

---

## `ai.getUsage()`

Returns token usage statistics for the current session.

```js
const usage = ai.getUsage()
console.log(usage)
// { requests: 5, inputTokens: 1234, outputTokens: 567, totalTokens: 1801 }
```

All fields are cumulative across `ask()`, `json()`, and `agent()` calls. Streaming does not track tokens (providers don't return usage in stream mode).

## `ai.resetUsage()`

Resets all usage counters to zero.

```js
ai.resetUsage()
console.log(ai.getUsage())
// { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
```

---

## `ai.ping()`

Tests the current provider's credentials and returns a health check result.

```js
const result = await ai.ping()
console.log(result)
// { ok: true, provider: 'gemini', latency: 123 }
// or: { ok: false, provider: 'gemini', latency: 456, error: 'Quota exceeded' }
```

### Returns

`Promise<{ ok: boolean, provider: string, latency: number, error?: string }>`

- `ok` — Whether the provider responded successfully
- `provider` — The provider name being used
- `latency` — Response time in milliseconds
- `error` — Error message if `ok: false`

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

`Promise<ProviderStatus[]>`

Each provider returns:
- `name` — Provider name
- `model` — Model being used
- `primary` — Whether this is the primary provider
- `healthy` — Whether the provider is responding
- `lastCheck` — Timestamp of last check
- `error` — Error message if unhealthy

---

## `ai.setPersona(persona)`

Updates the active persona. Affects all subsequent calls until changed again.

```js
ai.setPersona({
  name: 'Byte',
  role: 'a senior software engineer',
  tone: 'direct and technical',
})
```

See [Personas](personas.md) for the full persona schema.

---

## `ai.setModel(model)`

Changes the active model without recreating the client.

```js
ai.setModel('gemini-2.5-pro')
```

---

## `personas`

Pre-built persona presets. Import as a namespace or individually.

```js
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona:  personas.support,
})
```

Or import individual presets:

```js
import { createAivok, coder, tutor } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona:  coder,
})
```

Available presets: `personas.support`, `personas.coder`, `personas.tutor`, `personas.writer` (or `support`, `coder`, `tutor`, `writer` as named imports).

---

## Error handling

All methods throw errors with a `code` property and a descriptive `message`. Wrap in try/catch:

```js
try {
  const reply = await ai.ask('Hello')
} catch (err) {
  if (err.code === 'RATE_LIMIT') {
    // Hit rate limit on all providers — wait and retry
  }
  if (err.code === 'AUTH_ERROR') {
    // Invalid API key
  }
  if (err.code === 'MAX_STEPS') {
    // Agent exceeded maxSteps without finishing
    console.log(err.steps) // partial audit trail still available
  }
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
