import 'dotenv/config'
import { createAivok } from '../dist/index.js'
import fs from 'fs'

const ai = createAivok({
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
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