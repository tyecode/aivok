# Providers Guide

How to configure each provider in aivok and get free API keys.

---

## Overview

| Provider | Type | Free Tier | Credit Card | Best For |
|---|---|---|---|---|
| **Gemini** | Native | Forever free | No | Primary provider, large context |
| **Groq** | Native | Forever free | No | Speed, fallback |
| **Anthropic** | Native | Limited | No | Claude models |
| **Mistral** | Native | Limited | No | Multilingual |
| **Cohere** | Native | Trial | No | Enterprise, RAG |
| **OpenAI-compatible** | Generic | Varies | Varies | Ollama, OpenRouter, custom |

---

## Gemini (Recommended Primary)

### Get API Key

1. Go to [ai.google.dev](https://aistudio.google.com/)
2. Sign in with Google account
3. Click **Get API key** in left sidebar
4. Click **Create API key**
5. Copy the key

### Free Tier Limits

| Limit | Value |
|---|---|
| Requests/minute | 15 |
| Tokens/minute | 1,000,000 |
| Requests/day | 1,500 |
| Credit card | Not required |

### Configuration

```js
const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})
```

### Available Models

| Model | Context | Speed | Free? |
|---|---|---|---|
| `gemini-2.0-flash` | 1M | Fast | ✅ |
| `gemini-2.5-flash` | 1M | Fast | ✅ |
| `gemini-2.5-pro` | 2M | Slower | ⚠️ Limited |

### Environment

```bash
GEMINI_API_KEY=your_key_here
```

---

## Groq (Recommended Fallback)

### Get API Key

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up (no credit card)
3. Go to **API Keys**
4. Click **Create API Key**
5. Copy the key

### Free Tier Limits

| Limit | Value |
|---|---|
| Requests/minute | 30 |
| Tokens/minute | 6,000 |
| Tokens/day | 500,000 |
| Credit card | Not required |

### Configuration

```js
const ai = createAivok({
  provider: 'groq',
  model:    'llama-3.3-70b-versatile',
  apiKey:   process.env.GROQ_API_KEY,
})
```

### Available Models

| Model | Context | Speed | Free? |
|---|---|---|---|
| `llama-3.3-70b-versatile` | 128K | Very fast | ✅ |
| `llama-3.1-8b-instant` | 128K | Fastest | ✅ |
| `llama4-scout-17b-16e-instruct` | 128K | Fast | ✅ |
| `gemma2-9b-it` | 8K | Fast | ✅ |
| `mixtral-8x7b-32768` | 32K | Fast | ✅ |

### Environment

```bash
GROQ_API_KEY=your_key_here
```

---

## Anthropic

### Get API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up (no credit card required)
3. Go to **API Keys**
4. Click **Create Key**
5. Copy the key

### Free Tier

~$5 in free credits on signup. No credit card required.

### Configuration

```js
const ai = createAivok({
  provider: 'anthropic',
  model:    'claude-3-5-haiku-20241022',
  apiKey:   process.env.ANTHROPIC_API_KEY,
})
```

### Available Models

| Model | Context | Speed | Free? |
|---|---|---|---|
| `claude-3-5-haiku-20241022` | 200K | Fast | ✅ Credits |
| `claude-3-5-sonnet-20241022` | 200K | Moderate | ❌ Paid |
| `claude-3-opus-20240229` | 200K | Slow | ❌ Paid |

### Environment

```bash
ANTHROPIC_API_KEY=your_key_here
```

---

## Mistral

### Get API Key

1. Go to [console.mistral.ai](https://console.mistral.ai/)
2. Sign up with email
3. Go to **API Keys** in workspace settings
4. Create new key
5. Copy the key

### Configuration

```js
const ai = createAivok({
  provider: 'mistral',
  model:    'mistral-small-latest',
  apiKey:   process.env.MISTRAL_API_KEY,
})
```

### Available Models

| Model | Context | Speed | Free? |
|---|---|---|---|
| `mistral-small-latest` | 128K | Fast | ✅ |
| `open-mistral-nemo` | 128K | Fast | ✅ |
| `codestral-latest` | 32K | Moderate | ⚠️ Limited |

### Environment

```bash
MISTRAL_API_KEY=your_key_here
```

---

## Cohere

### Get API Key

1. Go to [dashboard.cohere.com](https://dashboard.cohere.com/)
2. Sign up (no credit card)
3. Go to **API Keys**
4. Copy your trial key

### Configuration

```js
const ai = createAivok({
  provider: 'cohere',
  model:    'command-r-plus',
  apiKey:   process.env.COHERE_API_KEY,
})
```

### Available Models

| Model | Context | Speed | Free? |
|---|---|---|---|
| `command-r-plus` | 128K | Moderate | ⚠️ Trial |
| `command-r` | 128K | Fast | ⚠️ Trial |

### Environment

```bash
COHERE_API_KEY=your_key_here
```

---

## Multi-Provider Setup (Recommended)

## Multi-Provider Setup (Recommended)

Use both Gemini and Groq together for automatic failover:

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

**Benefits:**
- 15 + 30 = 45 requests/minute combined
- Automatic failover on rate limit
- Both free forever

---

## OpenAI-Compatible

Works with any API following OpenAI's `/v1/chat/completions` format.

### Ollama (Local - Free)

1. Install: [ollama.com](https://ollama.com/)
2. Pull a model: `ollama pull llama3`
3. Runs on `http://localhost:11434`

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'llama3',
  apiKey:   'ollama',  // any string works
  baseURL:  'http://localhost:11434/v1',
})
```

### OpenRouter (200+ Models)

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'meta-llama/llama-3.3-70b-instruct:free',
  apiKey:   process.env.OPENROUTER_API_KEY,
  baseURL:  'https://openrouter.ai/api/v1',
})
```

### NVIDIA (1000 Free Calls)

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'nvidia/llama-3.1-nemotron-70b-instruct',
  apiKey:   process.env.NVIDIA_API_KEY,
  baseURL:  'https://integrate.api.nvidia.com/v1',
})
```

### DeepSeek (Very Low Cost)

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    'deepseek-chat',
  apiKey:   process.env.DEEPSEEK_API_KEY,
  baseURL:  'https://api.deepseek.com/v1',
})
```

### Cloudflare Workers AI (Free Tier)

```js
const ai = createAivok({
  provider: 'openai-compatible',
  model:    '@cf/meta/llama-3.1-8b-instruct',
  apiKey:   process.env.CF_API_TOKEN,
  baseURL:  `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1`,
})
```

---

## Environment Setup

Create `.env` file:

```bash
# Primary (free forever)
GEMINI_API_KEY=your_gemini_key

# Fallback (free forever)
GROQ_API_KEY=your_groq_key

# Optional
OPENROUTER_API_KEY=
NVIDIA_API_KEY=
DEEPSEEK_API_KEY=
```

Add to `.gitignore`:

```bash
.env
.env.local
.env.*.local
```

Load in Node.js:

```bash
npm install dotenv
```

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok()
```

---

## Choosing a Provider

| Need | Solution |
|---|---|
| Largest context | Gemini 2.5 Pro (2M tokens) |
| Fastest responses | Groq |
| Offline/private | Ollama (local) |
| Most capable free | Gemini + Groq fallback |
| Claude/GPT-4 | OpenRouter |
| Production use | Gemini primary + Groq fallback |