import {
  AppError,
  ERROR_CODES,
  logError,
  createErrorFromResponse,
  handleNetworkError,
  getUserErrorMessage,
  withRetry,
  validateNote
} from './errorHandling'

describe('errorHandling', () => {
  // Mock console.error
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  describe('AppError', () => {
    it('should create error with message and code', () => {
      const error = new AppError('Test error', ERROR_CODES.VALIDATION_ERROR)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(error.name).toBe('AppError')
      expect(error.timestamp).toBeDefined()
    })

    it('should include context', () => {
      const context = { userId: '123', action: 'create' }
      const error = new AppError('Test error', ERROR_CODES.SERVER_ERROR, context)

      expect(error.context).toEqual(context)
    })
  })

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error')
      const context = { component: 'TestComponent' }

      logError(error, context)

      expect(console.error).toHaveBeenCalledWith(
        'Application Error:',
        expect.objectContaining({
          message: 'Test error',
          context
        })
      )
    })
  })

  describe('createErrorFromResponse', () => {
    it('should create validation error for 400 status', async () => {
      const response = {
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid input' })
      }

      const error = await createErrorFromResponse(response)

      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(error.message).toBe('Invalid input')
    })

    it('should create unauthorized error for 401 status', async () => {
      const response = {
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({})
      }

      const error = await createErrorFromResponse(response)

      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it('should create AI service error for 503 status', async () => {
      const response = {
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Ollama not running' })
      }

      const error = await createErrorFromResponse(response)

      expect(error.code).toBe(ERROR_CODES.AI_SERVICE_ERROR)
    })

    it('should handle response without JSON', async () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('No JSON') }
      }

      const error = await createErrorFromResponse(response)

      expect(error.code).toBe(ERROR_CODES.SERVER_ERROR)
      expect(error.message).toBe('HTTP 500: Internal Server Error')
    })
  })

  describe('handleNetworkError', () => {
    it('should handle AbortError', () => {
      const error = new Error('Request aborted')
      error.name = 'AbortError'

      const result = handleNetworkError(error)

      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(result.message).toBe('Request was cancelled')
    })

    it('should handle offline status', () => {
      const originalOnline = navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const error = new Error('Fetch failed')
      const result = handleNetworkError(error)

      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(result.message).toBe('No internet connection')

      navigator.onLine = originalOnline
    })

    it('should handle fetch errors', () => {
      const error = new Error('fetch error occurred')

      const result = handleNetworkError(error)

      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(result.message).toBe('Network request failed')
    })
  })

  describe('getUserErrorMessage', () => {
    it('should return user-friendly messages for different error codes', () => {
      expect(getUserErrorMessage({ code: ERROR_CODES.NETWORK_ERROR }))
        .toBe('Connection error. Please check your internet connection and try again.')

      expect(getUserErrorMessage({ code: ERROR_CODES.AI_SERVICE_ERROR }))
        .toBe('AI service is unavailable. Please make sure Ollama is running.')

      expect(getUserErrorMessage({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid data' }))
        .toBe('Invalid data')

      expect(getUserErrorMessage({ code: ERROR_CODES.NOT_FOUND }))
        .toBe('The requested item was not found.')
    })

    it('should return default message for unknown errors', () => {
      expect(getUserErrorMessage({ message: 'Unknown error' }))
        .toBe('Unknown error')

      expect(getUserErrorMessage({}))
        .toBe('An unexpected error occurred. Please try again.')
    })
  })

  describe('withRetry', () => {
    it('should retry failed function calls', async () => {
      let attempts = 0
      const fn = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })

      const result = await withRetry(fn, 3, 10) // 10ms delay for fast test

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should not retry validation errors', async () => {
      const fn = vi.fn().mockRejectedValue(
        new AppError('Invalid input', ERROR_CODES.VALIDATION_ERROR)
      )

      await expect(withRetry(fn, 3, 10)).rejects.toThrow('Invalid input')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should throw last error after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(withRetry(fn, 2, 10)).rejects.toThrow('Persistent failure')
      expect(fn).toHaveBeenCalledTimes(3) // Initial call + 2 retries
    })
  })

  describe('validateNote', () => {
    it('should validate correct note structure', () => {
      const validNote = {
        title: 'Test Note',
        content: 'Test content',
        position: { x: 100, y: 200 },
        dimensions: { width: 300, height: 200 },
        tags: ['test', 'note']
      }

      expect(() => validateNote(validNote)).not.toThrow()
    })

    it('should reject invalid title type', () => {
      const invalidNote = { title: 123 }

      expect(() => validateNote(invalidNote)).toThrow('Title must be a string')
    })

    it('should reject invalid position', () => {
      const invalidNote = { position: { x: 'invalid', y: 200 } }

      expect(() => validateNote(invalidNote)).toThrow('Position must contain valid x and y coordinates')
    })

    it('should reject invalid dimensions', () => {
      const invalidNote = { dimensions: { width: 'invalid', height: 200 } }

      expect(() => validateNote(invalidNote)).toThrow('Dimensions must contain valid width and height')
    })

    it('should reject invalid tags type', () => {
      const invalidNote = { tags: 'not-an-array' }

      expect(() => validateNote(invalidNote)).toThrow('Tags must be an array')
    })

    it('should collect multiple validation errors', () => {
      const invalidNote = {
        title: 123,
        content: 456,
        position: { x: 'invalid', y: 'invalid' }
      }

      expect(() => validateNote(invalidNote)).toThrow(
        'Title must be a string, Content must be a string, Position must contain valid x and y coordinates'
      )
    })
  })
})