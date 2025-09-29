/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', context = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.context = context
    this.timestamp = new Date().toISOString()
  }
}

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  FILE_ERROR: 'FILE_ERROR'
}

/**
 * Enhanced error logger with context
 */
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message || 'Unknown error',
    code: error.code || ERROR_CODES.UNKNOWN_ERROR,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    context
  }

  console.error('Application Error:', errorInfo)

  // In production, send to logging service (Vite's PROD flag)
  if (import.meta.env.PROD) {
    // Example: sendToLoggingService(errorInfo)
  }

  return errorInfo
}

/**
 * Convert HTTP response to appropriate error
 */
export const createErrorFromResponse = async (response) => {
  let errorData = {}

  try {
    errorData = await response.json()
  } catch {
    // Response doesn't contain JSON
  }

  const message = errorData.error || `HTTP ${response.status}: ${response.statusText}`

  let code = ERROR_CODES.SERVER_ERROR

  switch (response.status) {
    case 400:
      code = ERROR_CODES.VALIDATION_ERROR
      break
    case 401:
    case 403:
      code = ERROR_CODES.UNAUTHORIZED
      break
    case 404:
      code = ERROR_CODES.NOT_FOUND
      break
    case 503:
      code = ERROR_CODES.AI_SERVICE_ERROR
      break
  }

  return new AppError(message, code, {
    status: response.status,
    statusText: response.statusText,
    details: errorData.details,
    command: errorData.command
  })
}

/**
 * Handle network errors
 */
export const handleNetworkError = (error) => {
  if (error.name === 'AbortError') {
    return new AppError('Request was cancelled', ERROR_CODES.NETWORK_ERROR)
  }

  if (!navigator.onLine) {
    return new AppError('No internet connection', ERROR_CODES.NETWORK_ERROR)
  }

  if (error.message.includes('fetch')) {
    return new AppError('Network request failed', ERROR_CODES.NETWORK_ERROR, {
      originalError: error.message
    })
  }

  return error
}

/**
 * Get user-friendly error message
 */
export const getUserErrorMessage = (error) => {
  if (!error) {
    return 'An unexpected error occurred. Please try again.'
  }

  if (error.code === ERROR_CODES.NETWORK_ERROR) {
    return 'Connection error. Please check your internet connection and try again.'
  }

  if (error.code === ERROR_CODES.AI_SERVICE_ERROR) {
    return 'AI service is unavailable. Please make sure Ollama is running.'
  }

  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    return error.message || 'Invalid input. Please check your data and try again.'
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return 'The requested item was not found.'
  }

  if (error.code === ERROR_CODES.UNAUTHORIZED) {
    return 'You are not authorized to perform this action.'
  }

  return error.message || 'An unexpected error occurred. Please try again.'
}

/**
 * Retry wrapper for async functions
 */
export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries) {
        throw lastError
      }

      // Don't retry validation errors or client errors
      if (error.code === ERROR_CODES.VALIDATION_ERROR ||
          error.code === ERROR_CODES.NOT_FOUND ||
          error.code === ERROR_CODES.UNAUTHORIZED) {
        throw error
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
    }
  }

  throw lastError
}

/**
 * Async error boundary helper
 */
export const safeAsync = (asyncFn, fallbackValue = null) => {
  return async (...args) => {
    try {
      return await asyncFn(...args)
    } catch (error) {
      logError(error, { function: asyncFn.name, args })
      return fallbackValue
    }
  }
}

/**
 * Validation utilities
 */
export const validateNote = (note) => {
  const errors = []

  if (note.title && typeof note.title !== 'string') {
    errors.push('Title must be a string')
  }

  if (note.content && typeof note.content !== 'string') {
    errors.push('Content must be a string')
  }

  if (note.position) {
    if (!Number.isFinite(note.position.x) || !Number.isFinite(note.position.y)) {
      errors.push('Position must contain valid x and y coordinates')
    }
  }

  if (note.dimensions) {
    if (!Number.isFinite(note.dimensions.width) || !Number.isFinite(note.dimensions.height)) {
      errors.push('Dimensions must contain valid width and height')
    }
  }

  if (note.tags && !Array.isArray(note.tags)) {
    errors.push('Tags must be an array')
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(', '), ERROR_CODES.VALIDATION_ERROR, { note })
  }

  return true
}