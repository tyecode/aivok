# Examples

Annotated, copy-paste ready examples for common use cases.

---

## 1. Basic question and answer

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const answer = await ai.ask('What is the difference between null and undefined in JavaScript?')
console.log(answer)
```

---

## 2. Multi-turn chat

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const session = ai.chat({
  system: 'You are a helpful JavaScript tutor.',
})

// Each message remembers what was said before
console.log(await session.send('What is a closure?'))
console.log(await session.send('Can you show me an example?'))
console.log(await session.send('When would I actually use this in real code?'))

// See the full history
console.log(session.history())
```

---

## 3. Streaming response

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

// Stream prints each chunk as it arrives — great for long responses
process.stdout.write('Answer: ')
await ai.stream(
  'Explain how React\'s reconciliation algorithm works in detail',
  (chunk) => process.stdout.write(chunk)
)
console.log() // newline at end
```

---

## 4. Structured JSON output

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

// Force JSON output and auto-parse it
const frameworks = await ai.json(`
  Return a JSON array of the top 5 JavaScript frameworks in 2026.
  Each item should have: name, githubStars (approximate), primaryUseCase, learningCurve (easy/medium/hard)
`)

// frameworks is already a parsed JavaScript array
frameworks.forEach(f => {
  console.log(`${f.name} — ${f.primaryUseCase} (${f.learningCurve})`)
})
```

---

## 5. Custom persona — portfolio assistant

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,

  persona: {
    name: 'Nova',
    role: 'a helpful assistant for Sengphachanh\'s developer portfolio',
    tone: 'friendly, concise, enthusiastic about tech',
    rules: [
      'only answer questions about the portfolio and its projects',
      'keep answers under 3 sentences for simple questions',
      'if asked about hiring, mention the contact form',
    ],
    context: `
      Sengphachanh is a full-stack developer from Vientiane, Laos.
      He works with React, Next.js, and Node.js.
      Key projects: crypto payment system, Discord bot, temple finance tracker.
    `,
  },
})

const chat = ai.chat()
console.log(await chat.send('Who are you?'))
console.log(await chat.send('What projects has he built?'))
console.log(await chat.send('Is he available for hire?'))
```

---

## 6. Multi-provider with automatic fallback

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

// Uses Gemini first, falls back to Groq on rate limit
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

// Behaves exactly like a single-provider setup
// Rate limit handling is automatic and invisible
const reply = await ai.ask('Explain the CAP theorem')
console.log(reply)
```

---

## 7. Agent — file organiser

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'
import path from 'path'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const result = await ai.agent({
  goal: `
    Look at the files in ./sample-downloads directory.
    Organise them into subdirectories by file type:
    - images (jpg, png, gif, webp) → ./sample-downloads/images/
    - documents (pdf, doc, docx, txt) → ./sample-downloads/docs/
    - code files (js, ts, py, html, css) → ./sample-downloads/code/
    - everything else → ./sample-downloads/other/
  `,

  tools: {
    listDir: {
      description: 'List all files in a directory. Returns filenames separated by newlines.',
      params: { path: 'string' },
      run: async ({ path: p }) => {
        try {
          return fs.readdirSync(p).join('\n')
        } catch {
          return 'Directory not found or empty'
        }
      },
    },
    moveFile: {
      description: 'Move a file to a new location, creating destination directories if needed.',
      params: { from: 'string', to: 'string' },
      run: async ({ from, to }) => {
        try {
          fs.mkdirSync(path.dirname(to), { recursive: true })
          fs.renameSync(from, to)
          return `Moved: ${from} → ${to}`
        } catch (err) {
          return `Failed to move: ${err.message}`
        }
      },
    },
  },

  maxSteps: 50,

  onStep: ({ type, tool, input, result }) => {
    if (type === 'tool_call') {
      console.log(`  → ${tool}(${JSON.stringify(input)})`)
    }
    if (type === 'tool_result') {
      console.log(`    ✓ ${result}`)
    }
  },
})

console.log('\nDone!')
console.log(result.answer)
console.log(`\nStats: ${result.toolCalls} tool calls, ${result.elapsed}ms`)
```

---

## 8. Agent — web research + save to file

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const result = await ai.agent({
  goal: 'Research what aivok is and write a one-paragraph summary to summary.txt',

  tools: {
    fetchURL: {
      description: 'Fetch the text content of a web page. Returns up to 3000 characters.',
      params: { url: 'string' },
      run: async ({ url }) => {
        try {
          const res = await fetch(url)
          const text = await res.text()
          // Strip HTML tags roughly and cap length
          return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)
        } catch (err) {
          return `Fetch failed: ${err.message}`
        }
      },
    },
    writeFile: {
      description: 'Write text content to a file.',
      params: { path: 'string', content: 'string' },
      run: async ({ path, content }) => {
        fs.writeFileSync(path, content, 'utf8')
        return `Written to ${path}`
      },
    },
  },

  maxSteps: 10,
})

console.log(result.answer)
```

---

## 9. Agent — code bump version

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const result = await ai.agent({
  goal: 'Read package.json, increment the patch version (e.g. 1.0.0 → 1.0.1), and write it back.',
  tools: {
    readFile: {
      description: 'Read a file and return its contents.',
      params: { path: 'string' },
      run: async ({ path }) => fs.readFileSync(path, 'utf8'),
    },
    writeFile: {
      description: 'Write content to a file.',
      params: { path: 'string', content: 'string' },
      run: async ({ path, content }) => {
        fs.writeFileSync(path, content, 'utf8')
        return `Written ${content.length} chars to ${path}`
      },
    },
  },
  maxSteps: 5,
})

console.log(result.answer)
```

---

## 10. Using the presets

```js
import 'dotenv/config'
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona:  personas.coder,
})

// Byte the code reviewer is now active
const review = await ai.ask(`
  Review this function and tell me what's wrong with it:

  function getUser(id) {
    const users = db.query('SELECT * FROM users')
    return users.find(u => u.id === id)
  }
`)

console.log(review)
```

---

## 11. Switching models per call

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',  // cheap default
  apiKey:   process.env.GEMINI_API_KEY,
})

// Simple tasks use the default (fast, cheap)
const summary = await ai.ask('Summarise this in one sentence: ' + longText)

// Hard tasks use a smarter model
const analysis = await ai.ask('Find all security vulnerabilities in this code:\n' + code, {
  model: 'gemini-2.5-pro',
})
```

---

## 12. Error handling

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

try {
  const result = await ai.agent({
    goal: 'Do something complex',
    tools: { ... },
    maxSteps: 10,
  })
  console.log(result.answer)

} catch (err) {
  switch (err.code) {
    case 'RATE_LIMIT':
      console.log('Rate limited — wait a moment and try again')
      break
    case 'MAX_STEPS':
      console.log('Agent hit step limit')
      console.log('Partial steps:', err.steps)
      break
    case 'AUTH_ERROR':
      console.log('Check your API key in .env')
      break
    default:
      console.error('Unexpected error:', err.message)
  }
}
```
