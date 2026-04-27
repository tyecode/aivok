import 'dotenv/config'
import { createAivok, personas } from '../dist/index.js'

const ai = createAivok({
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
  persona: personas.coder,
})

const review = await ai.ask(`
  Review this function and tell me what's wrong with it:

  function getUser(id) {
    const users = db.query('SELECT * FROM users')
    return users.find(u => u.id === id)
  }
`)

console.log(review)