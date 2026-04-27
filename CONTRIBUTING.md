# Contributing to aivok

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/tyecode/aivok.git
cd aivok

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns in the project
- Run `npm run lint` before committing
- Run `npm test` to ensure all tests pass

## Making Changes

1. Create a new branch for your feature/fix
2. Make your changes
3. Add tests for new functionality
4. Update documentation if needed
5. Submit a pull request

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add streaming shorthand` for new features
- `fix: resolve rate limit handling` for bug fixes
- `docs: update API reference` for documentation

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests (requires API keys)
# Set GEMINI_API_KEY or GROQ_API_KEY in .env
npm test -- --grep "Integration"
```

## Pull Request Process

1. Ensure all tests pass
2. Update relevant documentation
3. Pull request should include:
   - Clear description of changes
   - Related issue number (if applicable)
   - Screenshots for UI changes (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.