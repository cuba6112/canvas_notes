const ollama = require('ollama').default

async function testOllama() {
  try {
    console.log('Testing Ollama connection...')
    console.log('Ollama object:', ollama)

    // Test the generate function
    const response = await ollama.generate({
      model: 'gpt-oss:120b',
      prompt: 'Hello, say hi back',
      stream: false
    })

    console.log('Success! Response:', response.response)
  } catch (error) {
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
  }
}

testOllama()