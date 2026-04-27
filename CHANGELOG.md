# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-27

### Added
- **Zero-config constructor** - `createAivok()` auto-detects API keys from environment
- **Usage tracking** - `ai.getUsage()` and `ai.resetUsage()` for monitoring token usage
- **Smart memory** - Chat sessions auto-summarize long histories
- **Streaming shorthand** - `ai.ask(prompt, { stream: fn })` as alternative to `ai.stream()`
- **Health checks** - `ai.ping()` and `ai.getStatus()` for provider diagnostics
- **New providers** - Anthropic, Mistral, and Cohere support
- **Provider fallback** - Automatic failover when rate limited
- **Graceful degradation** - Tries all healthy providers before failing
- **Integration tests** - Real API tests (skipped by default)

### Changed
- Updated default OpenAI model from `gpt-3.5-turbo` to `gpt-4o-mini`
- Improved rate limit handling with per-provider cooldowns
- Enhanced error messages for better debugging

### Fixed
- Gemini tool response name handling
- Router primary provider sorting
- JSON parsing regex for better extraction
- Multiple minor bugs identified in code review

### Removed
- Unused `classifyError` function
- Duplicate error code exports

---

## [0.0.1] - 2026-04-?? (Initial release)

### Added
- Core API: `ai.ask()`, `ai.chat()`, `ai.stream()`, `ai.json()`, `ai.agent()`
- Provider support: Gemini, Groq, OpenAI-compatible
- Persona system with presets (support, coder, tutor, writer)
- Agent tool loops
- Retry with exponential backoff
- Multi-provider routing with automatic fallback

---

[1.0.0]: https://github.com/tyecode/aivok/compare/v0.0.1...v1.0.0
[0.0.1]: https://github.com/tyecode/aivok/tree/v0.0.1