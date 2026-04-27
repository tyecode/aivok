# aivok — project context for Claude Code

aivok is an open-source JavaScript library that provides a clean, unified API for calling AI language models (Gemini, Groq, and any OpenAI-compatible endpoint). It includes support for single-shot questions, multi-turn chat, streaming, structured JSON output, agentic tool-calling loops, and customisable AI personas.

**Repository:** https://github.com/tyecode/aivok
**Author:** Sengphachanh (@tyecode), Vientiane, Laos
**Organisation:** qodexlab
**License:** MIT

---

## Project philosophy

- **Free first** — designed to work entirely on free-tier AI APIs (Gemini 2.0 Flash, Groq). No credit card required to get started.
- **One import** — every feature is accessible from a single `createAivok()` call.
- **Provider-agnostic** — swap Gemini for Groq or any OpenAI-compatible API by changing one config line.
- **Zero boilerplate** — the library handles retries, rate limit backoff, message history, tool formatting, and the agent loop internally.
- **Auditable agents** — every agent step is logged to an audit trail so you can see exactly what the AI did and why.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript (ESM) | Type safety, better DX, compiles to ESM + CJS |
| Primary provider | Gemini 2.0 Flash | Free forever, 1M token context, no credit card |
| Fallback provider | Groq (Llama 3.3 70B) | Free tier, fastest inference, same API shape |
| Additional providers | Anthropic, Mistral, Cohere | More free-tier options |
| Package manager | npm | Widest compatibility |
| Test runner | Vitest | Fast, ESM-native |
| Bundler | tsup | Zero-config dual ESM/CJS output |

---

## Directory structure

```
aivok/
├── src/
│   ├── index.ts          ← public API exports
│   ├── client.ts         ← createAivok() factory
│   ├── types.ts          ← all TypeScript type definitions
│   ├── error.ts          ← AivokError class + error codes
│   ├── providers/
│   │   ├── gemini.ts     ← Gemini adapter
│   │   ├── groq.ts       ← Groq adapter
│   │   ├── openai.ts     ← generic OpenAI-compatible adapter
│   │   ├── anthropic.ts  ← Anthropic (Claude) adapter
│   │   ├── mistral.ts    ← Mistral adapter
│   │   └── cohere.ts     ← Cohere adapter
│   ├── agent.ts          ← agentic loop implementation
│   ├── chat.ts           ← multi-turn chat session
│   ├── persona.ts        ← persona builder (system prompt generator)
│   ├── retry.ts          ← exponential backoff + rate limit handling
│   └── router.ts         ← multi-provider fallback routing
├── presets/
│   └── personas.ts       ← built-in persona presets
├── examples/
│   ├── basic.js          ← simple ask() example
│   ├── chat.js           ← multi-turn chat example
│   ├── agent-files.js    ← file organiser agent example
│   ├── agent-research.js ← web research agent example
│   └── persona.js        ← custom persona example
├── tests/
│   ├── client.test.ts
│   ├── agent.test.ts
│   ├── persona.test.ts
│   └── retry.test.ts
├── docs/
│   ├── api.md            ← full API reference
│   ├── providers.md      ← provider setup guides
│   ├── agents.md         ← agent loop deep dive
│   ├── personas.md       ← persona system guide
│   └── examples.md       ← annotated examples
├── CLAUDE.md             ← this file (read by Claude Code automatically)
├── package.json
├── README.md
└── .env.example
```

---

## Key conventions

- All source files use **TypeScript** (ESM), compiles to ESM + CJS
- All async functions return Promises — no callbacks
- Tool definitions use a `{ description, params, run }` shape (see `docs/agents.md`)
- Error objects have a `code` property for programmatic handling and a descriptive `message` string
- The `onStep` callback receives `{ type, tool, input, result, elapsed }` objects
- Environment variables: `GEMINI_API_KEY`, `GROQ_API_KEY`

---

## Commands

```bash
npm install          # install dependencies
npm run build        # build ESM + CJS with tsup
npm run test         # run Vitest test suite
npm run test:watch   # watch mode
npm run lint         # ESLint
npm run example basic        # run examples/basic.js
npm run example agent-files  # run examples/agent-files.js
```

---

## Related docs (read these for deeper context)

- `docs/api.md` — every function, parameter, and return type
- `docs/agents.md` — how the agent loop works, tool definition format
- `docs/providers.md` — how to get free API keys and configure each provider
- `docs/personas.md` — persona system, built-in presets, custom personas
- `docs/examples.md` — annotated real-world examples
