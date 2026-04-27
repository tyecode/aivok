import 'dotenv/config'
import { createAivok } from '../dist/index.js'
import fs from 'fs'
import path from 'path'

const ai = createAivok({
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
})

const result = await ai.agent({
  goal: `
    Look at the files in ./sample-downloads directory.
    Organise them into subdirectories by file type:
    - images (jpg, png, gif, webp) -> ./sample-downloads/images/
    - documents (pdf, doc, docx, txt) -> ./sample-downloads/docs/
    - code files (js, ts, py, html, css) -> ./sample-downloads/code/
    - everything else -> ./sample-downloads/other/
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