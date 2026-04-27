import 'dotenv/config'
import { createAivok } from '../dist/index.js'

const ai = createAivok({
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
})

const answer = await ai.ask('What is the difference between null and undefined in JavaScript?')
console.log(answer)