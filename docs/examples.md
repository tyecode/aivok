# Examples

Copy-paste ready examples for common use cases.

---

## 1. Basic Question

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const answer = await ai.ask('What is the difference between null and undefined?')
console.log(answer)
```

---

## 2. Multi-Turn Chat

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const session = ai.chat({ system: 'You are a helpful JavaScript tutor.' })

console.log(await session.send('What is a closure?'))
console.log(await session.send('Can you show me an example?'))
console.log(await session.send('When would I use this in real code?'))
console.log(session.history())
```

---

## 3. Streaming Response

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

process.stdout.write('Answer: ')
await ai.stream('Explain React reconciliation in detail', (chunk) => process.stdout.write(chunk))
console.log()
```

---

## 4. Structured JSON

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const frameworks = await ai.json(`
  Return JSON array of top 5 JS frameworks in 2026.
  Each: name, githubStars, primaryUseCase, learningCurve (easy/medium/hard)
`)

frameworks.forEach(f => console.log(`${f.name} — ${f.primaryUseCase} (${f.learningCurve})`))
```

---

## 5. Custom Persona

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona: {
    name: 'Nova',
    role: 'assistant for Sengphachanh\'s portfolio',
    tone: 'friendly, concise',
    rules: ['only discuss portfolio and projects', 'keep answers short'],
    context: 'Full-stack dev from Laos. Works with React, Next.js, Node.js.',
  },
})

const chat = ai.chat()
console.log(await chat.send('Who are you?'))
console.log(await chat.send('What projects has he built?'))
```

---

## 6. Multi-Provider Fallback

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({
  providers: [
    { name: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY, primary: true },
    { name: 'groq',  model: 'llama-3.3-70b-versatile', apiKey: process.env.GROQ_API_KEY },
  ],
})

const reply = await ai.ask('Explain the CAP theorem')
console.log(reply)
```

---

## 7. Agent — File Organizer

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'
import path from 'path'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const result = await ai.agent({
  goal: 'Organise ./sample-downloads by type: images→./images, docs→./docs, code→./code',
  tools: {
    listDir: { description: 'List files in directory', params: { path: 'string' }, run: async ({ path }) => fs.readdirSync(path).join('\n') },
    moveFile: { description: 'Move file to new location', params: { from: 'string', to: 'string' }, run: async ({ from, to }) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); return `Moved` } },
    createFolder: { description: 'Create folder', params: { path: 'string' }, run: async ({ path }) => { fs.mkdirSync(path, { recursive: true }); return 'Created' } },
  },
  maxSteps: 50,
  onStep: ({ type, tool, input }) => type === 'tool_call' && console.log(`→ ${tool}(${JSON.stringify(input)})`),
})

console.log(result.answer)
console.log(`${result.toolCalls} calls, ${result.elapsed}ms`)
```

---

## 8. Agent — Web Research

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const result = await ai.agent({
  goal: 'Research aivok and write a summary to summary.txt',
  tools: {
    fetchURL: { description: 'Fetch web page', params: { url: 'string' }, run: async ({ url }) => (await fetch(url)).text().slice(0, 3000) },
    writeFile: { description: 'Write file', params: { path: 'string', content: 'string' }, run: async ({ path, content }) => { fs.writeFileSync(path, content); return 'Written' } },
  },
  maxSteps: 10,
})

console.log(result.answer)
```

---

## 9. Agent — Bump Version

```js
import 'dotenv/config'
import { createAivok } from 'aivok'
import fs from 'fs'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const result = await ai.agent({
  goal: 'Read package.json, bump patch version, write back',
  tools: {
    readFile:  { description: 'Read file', params: { path: 'string' }, run: async ({ path }) => fs.readFileSync(path, 'utf8') },
    writeFile: { description: 'Write file', params: { path: 'string', content: 'string' }, run: async ({ path, content }) => { fs.writeFileSync(path, content); return 'Written' } },
  },
  maxSteps: 5,
})

console.log(result.answer)
```

---

## 10. Built-in Persona Presets

```js
import 'dotenv/config'
import { createAivok, personas } from 'aivok'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
  persona:  personas.coder,
})

const review = await ai.ask(`
  Review this:
  function getUser(id) { return db.query('SELECT *').find(u => u.id === id) }
`)
console.log(review)
```

---

## 11. Switch Models Per-Call

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

const summary = await ai.ask('Summarise: ' + longText)                    // cheap default
const analysis = await ai.ask('Find bugs in:\n' + code, { model: 'gemini-2.5-pro' })  // smarter model
```

---

## 12. Error Handling

```js
import 'dotenv/config'
import { createAivok } from 'aivok'

const ai = createAivok({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY })

try {
  const result = await ai.agent({ goal: 'Complex task', tools: {...}, maxSteps: 10 })
  console.log(result.answer)
} catch (err) {
  switch (err.code) {
    case 'RATE_LIMIT':   console.log('Rate limited — wait and retry'); break
    case 'MAX_STEPS':    console.log('Step limit', err.steps); break
    case 'AUTH_ERROR':   console.log('Check API key'); break
    default:             console.error(err.message)
  }
}
```