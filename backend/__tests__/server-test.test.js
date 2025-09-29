const request = require('supertest')
const app = require('../server-test')
const fs = require('fs').promises
const path = require('path')
const { NOTES_FILE } = require('../utils/constants.js')
const fileOperations = require('../utils/fileOperations')
const ollama = require('ollama').default

// Mock fileOperations
jest.mock('../utils/fileOperations', () => ({
  ...jest.requireActual('../utils/fileOperations'),
  safeRead: jest.fn(),
  atomicWrite: jest.fn(),
  initializeFile: jest.fn(),
  getFileHealth: jest.fn()
}))

// Mock Ollama
jest.mock('ollama', () => ({
  __esModule: true,
  default: {
    generate: jest.fn()
  }
}))

describe('Server-Test API and Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CORS', () => {
    test('should fail for a non-whitelisted origin with default CORS', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Origin', 'http://unauthorized.com')
      expect(response.status).toBe(500)
    })
  })

  describe('File System Error Handling', () => {
    test('readNotes should handle critical failure when initializeFile fails', async () => {
      fileOperations.safeRead.mockRejectedValue(new Error('Read failed'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Init failed'))
      const response = await request(app).get('/api/notes')
      expect(response.status).toBe(500)
    })

    test('writeNotes should return false on failure', async () => {
      fileOperations.atomicWrite.mockRejectedValue(new Error('Write failed'))
      const notes = await request(app).post('/api/notes').send({ title: 'test', content: 'test' })
      expect(notes.status).toBe(500)
    })
  })

  describe('GET /api/notes', () => {
    test('should return 500 if readNotes fails', async () => {
      fileOperations.safeRead.mockRejectedValue(new Error('Failed to read'))
      const response = await request(app).get('/api/notes')
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to fetch notes')
    })
  })

  describe('POST /api/notes', () => {
    test('should return 500 if writeNotes fails', async () => {
      fileOperations.safeRead.mockResolvedValue([])
      fileOperations.atomicWrite.mockRejectedValue(new Error('Failed to write'))
      const response = await request(app).post('/api/notes').send({ title: 'test', content: 'test' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to save note')
    })

    test('should return 500 on other errors', async () => {
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      const response = await request(app).post('/api/notes').send({ title: 'test', content: 'test' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to create note')
    })
  })

  describe('PUT /api/notes/:id', () => {
    test('should return 404 if note not found', async () => {
      fileOperations.safeRead.mockResolvedValue([])
      const response = await request(app).put('/api/notes/1').send({ title: 'updated', content: 'updated' })
      expect(response.status).toBe(404)
    })

    test('should return 500 if writeNotes fails', async () => {
      fileOperations.safeRead.mockResolvedValue([{ id: '1', title: 'test', content: 'test' }])
      fileOperations.atomicWrite.mockRejectedValue(new Error('Failed to write'))
      const response = await request(app).put('/api/notes/1').send({ title: 'updated', content: 'updated' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to update note')
    })

    test('should return 500 on other errors', async () => {
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      const response = await request(app).put('/api/notes/1').send({ title: 'updated', content: 'updated' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to update note')
    })
  })

  describe('DELETE /api/notes/:id', () => {
    test('should return 404 if note not found', async () => {
      fileOperations.safeRead.mockResolvedValue([])
      const response = await request(app).delete('/api/notes/1')
      expect(response.status).toBe(404)
    })

    test('should return 500 if writeNotes fails', async () => {
      fileOperations.safeRead.mockResolvedValue([{ id: '1', title: 'test', content: 'test' }])
      fileOperations.atomicWrite.mockRejectedValue(new Error('Failed to write'))
      const response = await request(app).delete('/api/notes/1')
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to delete note')
    })

    test('should return 500 on other errors', async () => {
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      const response = await request(app).delete('/api/notes/1')
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to delete note')
    })
  })

  describe('POST /api/ai/summarize', () => {
    test('should return 400 if no content or notes are provided', async () => {
      const response = await request(app).post('/api/ai/summarize').send({})
      expect(response.status).toBe(400)
    })

    test('should return 400 if too many notes are provided', async () => {
      const notes = new Array(21).fill({ title: 'note', content: 'content' })
      const response = await request(app).post('/api/ai/summarize').send({ notes })
      expect(response.status).toBe(400)
    })

    test('should return 500 if AI service fails', async () => {
      ollama.generate.mockRejectedValue(new Error('AI service down'))
      const response = await request(app).post('/api/ai/summarize').send({ content: 'summarize this' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('AI summarization failed')
    })
  })

  describe('GET /api/health', () => {
    test('should return 503 if getFileHealth fails', async () => {
      fileOperations.getFileHealth.mockRejectedValue(new Error('Disk is full'))
      const response = await request(app).get('/api/health')
      expect(response.status).toBe(503)
      expect(response.body.status).toBe('unhealthy')
    })
  })
})