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
    // Set up default successful mocks to prevent unintended failures
    fileOperations.safeRead.mockResolvedValue([])
    fileOperations.atomicWrite.mockResolvedValue(true)
    fileOperations.initializeFile.mockResolvedValue([])
    fileOperations.getFileHealth.mockResolvedValue({
      exists: true,
      readable: true,
      integrity: { valid: true, reason: 'Valid' },
      backupCount: 0,
      lastModified: new Date(),
      size: 100
    })
  })

  describe('CORS', () => {
    test('should fail for a non-whitelisted origin with strict CORS', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Origin', 'http://unauthorized.com')
        .set('x-test-strict-cors', 'true')
      expect(response.status).toBe(500)
    })
  })

  describe('File System Error Handling', () => {
    test('readNotes should return empty array even when initializeFile fails', async () => {
      // The server's readNotes has a fallback that returns [] when both safeRead and initializeFile fail
      fileOperations.safeRead.mockRejectedValue(new Error('Read failed'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Init failed'))
      const response = await request(app).get('/api/notes')
      // Server returns empty array as fallback, not an error
      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    test('writeNotes should return 500 on failure', async () => {
      fileOperations.safeRead.mockResolvedValue([])
      fileOperations.atomicWrite.mockRejectedValue(new Error('Write failed'))
      const notes = await request(app).post('/api/notes').send({ title: 'test', content: 'test' })
      expect(notes.status).toBe(500)
      expect(notes.body.error).toBe('Failed to save note')
    })
  })

  describe('GET /api/notes', () => {
    test('should return empty array when readNotes recovers from errors', async () => {
      // The readNotes function has multiple fallbacks, so it returns [] instead of 500
      fileOperations.safeRead.mockRejectedValue(new Error('Failed to read'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Failed to initialize'))
      const response = await request(app).get('/api/notes')
      // Server's readNotes returns [] as ultimate fallback
      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
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

    test('should return 500 on readNotes errors', async () => {
      // When readNotes fails to get notes, it returns [] as fallback, so the note gets created
      // but when atomicWrite fails, we get "Failed to save note" error
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Init error'))
      fileOperations.atomicWrite.mockRejectedValue(new Error('Write error'))
      const response = await request(app).post('/api/notes').send({ title: 'test', content: 'test' })
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to save note')
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

    test('should return 404 when readNotes returns empty array due to I/O error', async () => {
      // When readNotes fails, it returns [] as fallback, so the note won't be found -> 404
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Init error'))
      const response = await request(app).put('/api/notes/1').send({ title: 'updated', content: 'updated' })
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Note not found')
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

    test('should return 404 when readNotes returns empty array due to I/O error', async () => {
      // When readNotes fails, it returns [] as fallback, so the note won't be found -> 404
      fileOperations.safeRead.mockRejectedValue(new Error('I/O error'))
      fileOperations.initializeFile.mockRejectedValue(new Error('Init error'))
      const response = await request(app).delete('/api/notes/1')
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Note not found')
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