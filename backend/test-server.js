const express = require('express')
const cors = require('cors')
const ollama = require('ollama').default
require('dotenv').config()

const app = express()
const PORT = 5001 // Using different port for testing

app.use(cors())
app.use(express.json())

app.post('/api/ai/test', async (req, res) => {
  const { prompt } = req.body
  console.log('Received prompt:', prompt)

  try {
    console.log('Calling Ollama...')
    const response = await ollama.generate({
      model: process.env.OLLAMA_MODEL || 'gpt-oss:120b',
      prompt: prompt,
      stream: false
    })
    console.log('Got response:', response.response?.substring(0, 100))
    res.json({ success: true, response: response.response })
  } catch (error) {
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`)
})