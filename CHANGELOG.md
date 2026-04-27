# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-27

### Added
- **Zero-config constructor** - `createAivok()` auto-detects API keys from environment
- **Usage tracking** - `ai.getUsage()` and `ai.resetUsage()` for monitoring token usage
- **Smart memory** - Chat sessions auto-summarize long histories
- **Streaming shorthand** - `ai.ask(prompt, { stream: fn })` as alternative to `ai.stream()`
- **Health checks** - `ai.ping()` and `ai.getStatus()` for provider diagnostics
- **Multi-provider support** - Gemini, Groq, Anthropic, Mistral, Cohere, OpenAI-compatible
- **Provider fallback** - Automatic failover when rate limited
- **Graceful degradation** - Tries all healthy providers before failing
- **Persona system** - Custom AI identities with built-in presets (support, coder, tutor, writer)
- **Agentic tool loops** - AI can use custom tools in a loop
- **Retry with backoff** - Exponential backoff on failures
- **Streaming responses** - Real-time output with callbacks
- **JSON mode** - Structured JSON output
- **TypeScript** - Full type definitions
- **Integration tests** - Real API tests (skipped by default)
- **Husky + commitlint** - Enforced conventional commit messages