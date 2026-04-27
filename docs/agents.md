# Agents — the agentic loop

How aivok's agent loop works, how to define tools, and real-world examples.

---

## How the loop works

The agent loop is the mechanism that lets AI do multi-step work autonomously. Instead of answering once and stopping, the AI reasons about a goal, picks a tool to call, sees the result, then decides whether to call another tool or declare the task done.

### The loop, step by step

```
1. You give the agent a goal + a set of tools
2. aivok sends the goal to the AI (with tool definitions)
3. AI reasons and either:
   a. Calls a tool → aivok runs your function, sends result back → go to step 3
   b. Says it's done → aivok returns the final answer + audit trail
```

Internally, this is what aivok manages for you:

```js
// What aivok does internally (simplified)
async function agentLoop(goal, tools, options) {
  const messages = [{ role: 'user', content: goal }]

  while (true) {
    const response = await callAI({ messages, tools: formatTools(tools) })

    if (response.stop_reason === 'end_turn') {
      return buildResult(response, steps)
    }

    if (response.stop_reason === 'tool_use') {
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        const result = await tools[block.name].run(block.input)
        steps.push({ type: 'tool_call', tool: block.name, input: block.input, result })

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user',      content: [{ type: 'tool_result', tool_use_id: block.id, content: String(result) }] })
      }
    }

    if (steps.length >= options.maxSteps) throw new Error('MAX_STEPS exceeded')
  }
}
```

You never write this. `ai.agent()` wraps it entirely.

---

## Defining tools

Every tool has three required fields:

```js
const tools = {
  toolName: {
    description: 'What this tool does and when the AI should use it',
    params: {
      paramName: 'type',   // 'string', 'number', 'boolean', 'array', 'object'
    },
    run: async (input) => {
      // your code here — receives { paramName: value }
      return 'string result'  // always return a string
    },
  },
}
```

### Full tool definition schema

```js
{
  description: string,      // required — what it does, when to use it
  params: {                 // required — what arguments the AI can pass
    [name]: 'string' | 'number' | 'boolean' | 'array' | 'object'
  },
  required: string[],       // optional — which params are required (default: all)
  run: async (input) => string,  // required — the actual function
}
```

### Writing good descriptions

The description is the most important part. The AI decides whether to call your tool based on it.

**Bad:**
```js
description: 'Read a file'
```

**Good:**
```js
description: 'Read the contents of a file from the filesystem. Use this when you need to inspect code, config files, or any text file before making changes.'
```

Rules for good tool descriptions:
- Say what it does AND when to use it
- Mention what format the result is in
- Warn about side effects (e.g. "this writes to disk", "this makes a network request")
- Keep it under 100 words

---

## The three agent phases

Based on Anthropic's own agent design (used in Claude Code):

### Phase 1: Gather context
AI reads what it needs to understand the situation before acting.

Tools for this phase: `readFile`, `listDir`, `fetchURL`, `searchCode`, `getState`

### Phase 2: Take action
AI makes changes based on what it learned.

Tools for this phase: `writeFile`, `runCommand`, `callAPI`, `sendMessage`, `updateDB`

### Phase 3: Verify results
AI checks that the action worked correctly.

Tools for this phase: `readFile` (re-read), `runTests`, `checkStatus`, `validateOutput`

The loop cycles through these phases as many times as needed.

---

## Tool examples

### File system tools

```js
import fs from 'fs'
import path from 'path'

const fileTools = {
  readFile: {
    description: 'Read the contents of a file. Use before editing to understand current content.',
    params: { path: 'string' },
    run: async ({ path: filePath }) => {
      try {
        return fs.readFileSync(filePath, 'utf8')
      } catch {
        return `Error: file not found at ${filePath}`
      }
    },
  },

  writeFile: {
    description: 'Write content to a file, creating it if it does not exist. Overwrites existing content.',
    params: { path: 'string', content: 'string' },
    run: async ({ path: filePath, content }) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, content, 'utf8')
      return `File written: ${filePath} (${content.length} characters)`
    },
  },

  listDir: {
    description: 'List all files in a directory. Use to understand what files exist before reading or writing.',
    params: { path: 'string' },
    run: async ({ path: dirPath }) => {
      try {
        const files = fs.readdirSync(dirPath)
        return files.join('\n')
      } catch {
        return `Error: directory not found at ${dirPath}`
      }
    },
  },

  deleteFile: {
    description: 'Delete a file permanently. Use only when explicitly asked to remove files.',
    params: { path: 'string' },
    run: async ({ path: filePath }) => {
      try {
        fs.unlinkSync(filePath)
        return `Deleted: ${filePath}`
      } catch {
        return `Error: could not delete ${filePath}`
      }
    },
  },
}
```

### Web tools

```js
const webTools = {
  fetchURL: {
    description: 'Fetch the text content of a web page or API endpoint. Returns the raw text.',
    params: { url: 'string' },
    run: async ({ url }) => {
      try {
        const res = await fetch(url)
        const text = await res.text()
        return text.slice(0, 5000) // cap at 5000 chars to save tokens
      } catch (err) {
        return `Error fetching ${url}: ${err.message}`
      }
    },
  },

  fetchJSON: {
    description: 'Fetch JSON data from an API endpoint. Returns the parsed JSON as a string.',
    params: { url: 'string' },
    run: async ({ url }) => {
      const res = await fetch(url)
      const data = await res.json()
      return JSON.stringify(data, null, 2)
    },
  },
}
```

### Shell tools

```js
import { execSync } from 'child_process'

const shellTools = {
  runCommand: {
    description: 'Run a shell command and return its output. Use for build steps, tests, git operations. Avoid destructive commands.',
    params: { command: 'string' },
    run: async ({ command }) => {
      try {
        const output = execSync(command, { encoding: 'utf8', timeout: 30000 })
        return output || '(no output)'
      } catch (err) {
        return `Error: ${err.message}`
      }
    },
  },
}
```

### Database tools (example with SQLite)

```js
import Database from 'better-sqlite3'

const db = new Database('data.db')

const dbTools = {
  query: {
    description: 'Run a read-only SQL query on the database. Use to fetch data for analysis.',
    params: { sql: 'string' },
    run: async ({ sql }) => {
      const rows = db.prepare(sql).all()
      return JSON.stringify(rows, null, 2)
    },
  },

  execute: {
    description: 'Run a write SQL statement (INSERT, UPDATE, DELETE). Use when explicitly asked to modify data.',
    params: { sql: 'string' },
    run: async ({ sql }) => {
      const info = db.prepare(sql).run()
      return `Affected rows: ${info.changes}`
    },
  },
}
```

---

## Real-world agent examples

### File organiser agent

```js
import { createAivok } from 'aivok'
import fs from 'fs'
import path from 'path'

const ai = createAivok({
  provider: 'gemini',
  model:    'gemini-2.0-flash',
  apiKey:   process.env.GEMINI_API_KEY,
})

const tools = {
  listDir: {
    description: 'List all files in a directory with their extensions.',
    params: { path: 'string' },
    run: async ({ path: p }) => fs.readdirSync(p).join('\n'),
  },
  moveFile: {
    description: 'Move a file from one path to another, creating the destination directory if needed.',
    params: { from: 'string', to: 'string' },
    run: async ({ from, to }) => {
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.renameSync(from, to)
      return `Moved: ${from} → ${to}`
    },
  },
  createFolder: {
    description: 'Create a new folder at the given path.',
    params: { path: 'string' },
    run: async ({ path: p }) => {
      fs.mkdirSync(p, { recursive: true })
      return `Created folder: ${p}`
    },
  },
}

const result = await ai.agent({
  goal: 'Organise the files in ./downloads by type. Put images in ./downloads/images, documents in ./downloads/docs, and code files in ./downloads/code.',
  tools,
  maxSteps: 50,
  onStep: ({ type, tool, input }) => {
    if (type === 'tool_call') console.log(`→ ${tool}(${JSON.stringify(input)})`)
  },
})

console.log(result.answer)
console.log(`Done in ${result.toolCalls} tool calls, ${result.elapsed}ms`)
```

### Research agent

```js
const result = await ai.agent({
  goal: 'Research the top 3 free AI APIs available in 2026 and write a markdown summary to research.md',
  tools: {
    fetchURL: webTools.fetchURL,
    writeFile: fileTools.writeFile,
  },
  maxSteps: 20,
})
```

### Code review agent

```js
const result = await ai.agent({
  goal: 'Read all .js files in ./src, find any potential bugs or improvements, and write a review to review.md',
  tools: {
    listDir: fileTools.listDir,
    readFile: fileTools.readFile,
    writeFile: fileTools.writeFile,
  },
  system: 'You are a senior JavaScript engineer. Be specific, cite line numbers, and suggest fixes.',
  maxSteps: 30,
})
```

---

## Safety guidelines

- **Always set `maxSteps`** — prevents runaway loops. Default is 20, lower it for simple tasks.
- **Handle errors in tool `run` functions** — return error strings instead of throwing; the AI can handle a graceful error and try a different approach.
- **Be careful with destructive tools** — consider adding confirmation prompts before exposing `deleteFile` or `execute` (database writes) in production.
- **Cap output from tools** — truncate large file contents or API responses to avoid blowing the context window.
- **Log with `onStep`** — in production, always log agent steps so you can audit what it did.

---

## Anthropic's design principle

From Anthropic's own research: *"agents are typically just LLMs using tools based on environmental feedback in a loop."* And: *"success in the LLM space isn't about building the most sophisticated system — it's about building the right system for your needs. Start with simple prompts, and add multi-step agentic systems only when simpler solutions fall short."*

aivok follows this: `ai.ask()` for simple tasks, `ai.agent()` only when you genuinely need multi-step autonomous work.
