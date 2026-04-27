# Agents Guide

How aivok's agent loop works, how to define tools, and real-world examples.

---

## How It Works

The agent loop enables AI to perform multi-step tasks autonomously. Instead of answering once and stopping, the AI:

1. Receives a **goal** + a set of **tools**
2. Reasons and either:
   - **Calls a tool** → aivok runs your function, sends result back → AI continues
   - **Declares done** → aivok returns the final answer + audit trail

### Internal flow (what aivok handles for you)

```js
// Simplified internal implementation
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
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: String(result) }] })
      }
    }

    if (steps.length >= options.maxSteps) throw new Error('MAX_STEPS')
  }
}
```

You never write this. `ai.agent()` wraps it entirely.

---

## Defining Tools

Every tool requires three fields:

```js
const tools = {
  toolName: {
    description: 'What this tool does and when the AI should use it',
    params: {
      paramName: 'type',   // 'string', 'number', 'boolean', 'array', 'object'
    },
    run: async (input) => {
      // your code — receives { paramName: value }
      return 'string result'  // always return a string
    },
  },
}
```

### Tool schema

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | Yes | What it does, when to use it |
| `params` | `object` | Yes | Arguments the AI can pass |
| `required` | `string[]` | No | Required parameters |
| `run` | `function` | Yes | The actual function |

### Writing good descriptions

The description is the most important part. The AI decides whether to call your tool based on it.

| Bad | Good |
|---|---|
| `"Read a file"` | `"Read the contents of a file. Use before editing to understand current content."` |

**Rules:**
- Say what it does AND when to use it
- Mention what format the result is in
- Warn about side effects (e.g., "writes to disk")
- Keep under 100 words

---

## Agent Phases

Based on Anthropic's agent design:

### Phase 1: Gather context
AI reads what it needs before acting.

**Tools:** `readFile`, `listDir`, `fetchURL`

### Phase 2: Take action
AI makes changes based on what it learned.

**Tools:** `writeFile`, `runCommand`, `sendMessage`

### Phase 3: Verify results
AI checks that the action worked.

**Tools:** `readFile`, `runTests`, `checkStatus`

---

## Tool Examples

### File system

```js
import fs from 'fs'
import path from 'path'

const fileTools = {
  readFile: {
    description: 'Read a file. Use before editing to understand current content.',
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
    description: 'Write to a file, creating directories if needed. Overwrites existing.',
    params: { path: 'string', content: 'string' },
    run: async ({ path: filePath, content }) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, content, 'utf8')
      return `Written: ${filePath} (${content.length} chars)`
    },
  },

  listDir: {
    description: 'List all files in a directory.',
    params: { path: 'string' },
    run: async ({ path: dirPath }) => {
      try {
        return fs.readdirSync(dirPath).join('\n')
      } catch {
        return `Error: directory not found at ${dirPath}`
      }
    },
  },
}
```

### Web

```js
const webTools = {
  fetchURL: {
    description: 'Fetch text content from a web page or API.',
    params: { url: 'string' },
    run: async ({ url }) => {
      try {
        const res = await fetch(url)
        const text = await res.text()
        return text.slice(0, 5000) // cap to save tokens
      } catch (err) {
        return `Error: ${err.message}`
      }
    },
  },
}
```

### Shell

```js
import { execSync } from 'child_process'

const shellTools = {
  runCommand: {
    description: 'Run a shell command. Use for build steps, tests, git.',
    params: { command: 'string' },
    run: async ({ command }) => {
      try {
        return execSync(command, { encoding: 'utf8', timeout: 30000 }) || '(no output)'
      } catch (err) {
        return `Error: ${err.message}`
      }
    },
  },
}
```

---

## Examples

### File organizer

```js
const result = await ai.agent({
  goal: 'Organise files in ./downloads by type: images→./images, docs→./docs, code→./code',
  tools: {
    listDir: { description: 'List files in directory', params: { path: 'string' }, run: async ({ path }) => fs.readdirSync(path).join('\n') },
    moveFile: { description: 'Move file to new location', params: { from: 'string', to: 'string' }, run: async ({ from, to }) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.renameSync(from, to); return `Moved: ${from} → ${to}` } },
    createFolder: { description: 'Create folder', params: { path: 'string' }, run: async ({ path }) => { fs.mkdirSync(path, { recursive: true }); return `Created: ${path}` } },
  },
  maxSteps: 50,
  onStep: (step) => {
    if (step.type === 'tool_call') console.log(`→ ${step.tool}(${JSON.stringify(step.input)})`)
  },
})

console.log(result.answer)
console.log(`Done in ${result.toolCalls} calls, ${result.elapsed}ms`)
```

### Research agent

```js
const result = await ai.agent({
  goal: 'Research top 3 AI APIs and write summary to research.md',
  tools: { fetchURL: webTools.fetchURL, writeFile: fileTools.writeFile },
  maxSteps: 20,
})
```

### Code review

```js
const result = await ai.agent({
  goal: 'Read ./src/*.js files, find bugs, write review to review.md',
  tools: { listDir: fileTools.listDir, readFile: fileTools.readFile, writeFile: fileTools.writeFile },
  system: 'You are a senior JS engineer. Cite line numbers.',
  maxSteps: 30,
})
```

---

## Safety Guidelines

| Guideline | Why |
|---|---|
| **Always set `maxSteps`** | Prevents runaway loops |
| **Handle errors in tools** | Return error strings, don't throw |
| **Be careful with destructive tools** | Add confirmation prompts |
| **Cap output** | Truncate large responses |
| **Log with `onStep`** | Audit trail for debugging |

---

## Design Principle

> *"Success in the LLM space isn't about building the most sophisticated system — it's about building the right system for your needs."* — Anthropic

Start with `ai.ask()` for simple tasks. Use `ai.agent()` only when you genuinely need multi-step autonomous work.