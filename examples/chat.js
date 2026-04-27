import 'dotenv/config'
import { createAivok } from '../dist/index.js'

const ai = createAivok({
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
})

const session = ai.chat({
  system: 'You are a helpful JavaScript tutor.',
})

console.log(await session.send('What is a closure?'))
console.log(await session.send('Can you show me an example?'))
console.log(await session.send('When would I actually use this in real code?'))

console.log('\n--- Full history ---')
console.log(session.history())