# Providers

How to get free API keys and configure each provider in aivok.

---

## Overview

aivok supports six provider types:

| Provider | Type | Free tier | Credit card | Best for |
|---|---|---|---|---|
| `gemini` | Native | Forever free | No | Primary provider, large context |
| `groq` | Native | Forever free | No | Speed, fallback |
| `anthropic` | Native | Limited free | No | Claude models, careful reasoning |
| `mistral` | Native | Limited free | No | Multilingual, efficient |
| `cohere` | Native | Trial free | No | RAG, search, enterprise |
| `openai-compatible` | Generic | Varies | Varies | Ollama, OpenRouter, DeepSeek, xAI, custom |

---

## Gemini (recommended primary)

**Get a free API key:** https://aistudio.google.com/

1. Sign in with your Google account
2. Click "Get API key" in the left sidebar
3. Click "Create API key"
4. Copy the key — you won't see it again

**Free tier limits:**
- 15 requests per minute
- 1,000,000 tokens per minute
- 1,500 requests per day
- No credit card required
- No expiry

**Configuration:**

```js
const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})
```

**Available models:**

| Model | Context | Speed | Best for |
|---|---|---|---|
| `gemini-2.0-flash` | 1M tokens | Fast | Default — best all-rounder |
| `gemini-2.5-flash` | 1M tokens | Fast | Improved reasoning |
| `gemini-2.5-pro` | 2M tokens | Slower | Hard tasks, long documents |
| `gemini-1.5-flash` | 1M tokens | Fast | Fallback for compatibility |

**Environment variable:**

```bash
# .env
GEMINI_API_KEY=your_key_here
```

**Rate limit handling:**

Gemini's free tier allows 15 RPM. aivok automatically adds exponential backoff when it receives a 429. If you're making rapid calls, consider adding `retryDelay: 4000` to your config.

---

## Groq (recommended fallback)

**Get a free API key:** https://console.groq.com/

1. Sign up with email — no credit card
2. Go to API Keys in the sidebar
3. Click "Create API Key"
4. Copy the key

**Free tier limits:**
- 30 requests per minute
- 6,000 tokens per minute
- 500,000 tokens per day
- Per-model limits (see Groq's rate limit page)
- No credit card required

**Configuration:**

```js
const ai = createAivok({
  provider: 'groq',
  model:    'llama-3.3-70b-versatile',
  apiKey:   process.env.GROQ_API_KEY,
})
```

**Available free models:**

| Model | Context | Speed | Best for |
|---|---|---|---|
| `llama-3.3-70b-versatile` | 128K | Very fast | Best quality on Groq free tier |
| `llama-3.1-8b-instant` | 128K | Fastest | Low-latency tasks |
| `llama4-scout-17b-16e-instruct` | 128K | Fast | Efficient reasoning |
| `gemma2-9b-it` | 8K | Fast | Lightweight tasks |
| `mixtral-8x7b-32768` | 32K | Fast | Good quality, wide context |

**Environment variable:**

```bash
# .env
GROQ_API_KEY=your_key_here
```

---

## Anthropic

**Get a free API key:** https://console.anthropic.com/

1. Sign up — no credit card required
2. Go to API Keys in the dashboard
3. Click "Create Key" and copy it

**Free tier limits:**
- Limited free credits on signup
- No credit card required for initial use
- Rate limits apply on free tier

**Configuration:**

```js
const ai = createAivok({
  provider: 'anthropic',
  model:    'claude-3-5-haiku-20241022',
  apiKey:   process.env.ANTHROPIC_API_KEY,
})
```

**Default model:** `claude-3-5-haiku-20241022`

**Available models:**

| Model | Context | Speed | Best for |
|---|---|---|---|
| `claude-3-5-haiku-20241022` | 200K | Fast | Fast, affordable tasks |
| `claude-3-5-sonnet-20241022` | 200K | Moderate | Balanced quality and speed |
| `claude-3-opus-20240229` | 200K | Slower | Complex reasoning, deep analysis |

**Environment variable:**

```bash
# .env
ANTHROPIC_API_KEY=your_key_here
```

---

## Mistral

**Get a free API key:** https://console.mistral.ai/

1. Sign up with email — no credit card
2. Go to API Keys in the workspace settings
3. Create a new key and copy it

**Free tier limits:**
- Free models available
- No credit card required
- Rate limits apply on free tier

**Configuration:**

```js
const ai = createAivok({
  provider: 'mistral',
  model:    'mistral-small-latest',
  apiKey:   process.env.MISTRAL_API_KEY,
})
```

**Default model:** `mistral-small-latest`

**Available free models:**

| Model | Context | Speed | Best for |
|---|---|---|---|
| `mistral-small-latest` | 128K | Fast | General purpose, efficient |
| `open-mistral-nemo` | 128K | Fast | Lightweight, multilingual |
| `codestral-latest` | 32K | Moderate | Code generation and completion |

**Environment variable:**

```bash
# .env
MISTRAL_API_KEY=your_key_here
```

---

## Cohere

**Get a free API key:** https://dashboard.cohere.com/

1. Sign up — no credit card required
2. Go to API Keys in the dashboard
3. Copy your trial key

**Free tier limits:**
- Free trial credits on signup
- No credit card required
- Rate limits apply on trial tier

**Configuration:**

```js
const ai = createAivok({
  provider: 'cohere',
  model:    'command-r-plus',
  apiKey:   process.env.COHERE_API_KEY,
})
```

**Default model:** `command-r-plus`

**Available models:**

| Model | Context | Speed | Best for |
|---|---|---|---|
| `command-r-plus` | 128K | Moderate | RAG, search, enterprise tasks |
| `command-r` | 128K | Fast | Efficient retrieval and generation |
| `embed-v3` | — | Fast | Embeddings (not for chat) |

**Environment variable:**

```bash
# .env
COHERE_API_KEY=your_key_here
```

---

## Multi-provider setup (recommended for production)

Use both Gemini and Groq together. aivok automatically falls back to Groq when Gemini hits rate limits.

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

This effectively gives you:
- 15 + 30 = 45 requests/minute
- Automatic failover with no code changes
- Both entirely free

---

## OpenAI-compatible (generic adapter)

Any API that follows the OpenAI `/v1/chat/completions` format works with the `openai-compatible` provider.

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'your-model-name',
  apiKey:   'your-key',
  baseURL:  'https://your-endpoint.com/v1',
})
```

### Ollama (local models — completely free)

Run open-source models on your own machine.

1. Install Ollama: https://ollama.com/
2. Pull a model: `ollama pull llama3`
3. Ollama runs on `http://localhost:11434` by default

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'llama3',
  apiKey:   'ollama',            // any string works — Ollama doesn't check
  baseURL:  'http://localhost:11434/v1',
})
```

Recommended models for Ollama:
- `llama3` — best general purpose
- `qwen2.5:7b` — fast and capable
- `phi3` — very small, great for simple tasks
- `codellama` — good for code tasks
- `mistral` — solid alternative to llama

### OpenRouter (200+ models, one key)

Access many models including paid ones (Claude, GPT-4, etc.) through a single API key. Has some free models.

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'meta-llama/llama-3.3-70b-instruct:free',
  apiKey:   process.env.OPENROUTER_API_KEY,
  baseURL:  'https://openrouter.ai/api/v1',
})
```

Free models on OpenRouter: search for `:free` suffix at https://openrouter.ai/models

### NVIDIA build.nvidia.com (1000 free API calls)

1. Create account at https://build.nvidia.com/
2. Generate an API key — 1000 calls free, no credit card

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'nvidia/llama-3.1-nemotron-70b-instruct',
  apiKey:   process.env.NVIDIA_API_KEY,
  baseURL:  'https://integrate.api.nvidia.com/v1',
})
```

### xAI Grok ($25 free credit)

1. Create account at https://console.x.ai/
2. $25 in free credits on signup, no credit card required for initial use

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'grok-3-fast',
  apiKey:   process.env.XAI_API_KEY,
  baseURL:  'https://api.x.ai/v1',
})
```

### DeepSeek (very cheap, near-free)

Not free but extremely low cost — $0.14 per million input tokens.

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'deepseek-chat',
  apiKey:   process.env.DEEPSEEK_API_KEY,
  baseURL:  'https://api.deepseek.com/v1',
})
```

### Cloudflare Workers AI (free tier)

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    '@cf/meta/llama-3.1-8b-instruct',
  apiKey:   process.env.CF_API_TOKEN,
  baseURL:  `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1`,
})
```

---

## Environment variable setup

Create a `.env` file at the root of your project:

```bash
# .env — never commit this file to git

# Primary (free forever)
GEMINI_API_KEY=your_gemini_key_here

# Fallback (free forever)
GROQ_API_KEY=your_groq_key_here

# Optional extras
OPENROUTER_API_KEY=
NVIDIA_API_KEY=
XAI_API_KEY=
DEEPSEEK_API_KEY=
CF_API_TOKEN=
CF_ACCOUNT_ID=
```

Add `.env` to your `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

Load with `dotenv` in Node.js:

```bash
npm install dotenv
```

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})
```

---

## Choosing a provider

```
Need the largest context window?     → Gemini 2.5 Pro (2M tokens)
Need the fastest responses?         → Groq (llama-3.1-8b-instant)
Need completely offline/private?    → Ollama (local)
Need the most capable model free?   → Gemini 2.0 Flash + Groq fallback
Need access to Claude/GPT-4?        → OpenRouter (some free, some paid)
Building for production?            → Gemini primary + Groq fallback
```
