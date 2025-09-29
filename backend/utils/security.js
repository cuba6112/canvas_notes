/**
 * Enterprise-grade backend security utilities
 * Comprehensive input validation, sanitization, and attack prevention
 */

const validator = require('validator')

/**
 * Security configuration constants
 */
const SECURITY_CONFIG = {
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 50000,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_COUNT: 10,
  MAX_COLOR_LENGTH: 20,
  // Development-friendly rate limits for enhanced drag system
  RATE_LIMIT_WINDOW: process.env.NODE_ENV === 'test' ? 1 * 60 * 1000 : process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min test/dev, 15 min prod
  RATE_LIMIT_MAX: process.env.NODE_ENV === 'test' ? 10000 : process.env.NODE_ENV === 'development' ? 1000 : 100, // 10000 test, 1000 dev, 100 prod
  AI_RATE_LIMIT_WINDOW: 10 * 60 * 1000, // 10 minutes
  AI_RATE_LIMIT_MAX: process.env.NODE_ENV === 'test' ? 1000 : 10 // 1000 test, 10 prod/dev
}

/**
 * HTML entity encoding to prevent XSS
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * Escape HTML entities
 */
const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char])
}

/**
 * Comprehensive input sanitization
 */
const sanitizeInput = (input, options = {}) => {
  const {
    maxLength = 10000,
    allowHtml = false,
    stripScripts = true,
    normalizeWhitespace = true
  } = options

  if (!input || typeof input !== 'string') return ''

  let sanitized = input

  // Length validation
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  // Script removal (critical security)
  if (stripScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/javascript:/gi, '')
    sanitized = sanitized.replace(/data:/gi, '')
    sanitized = sanitized.replace(/vbscript:/gi, '')
    sanitized = sanitized.replace(/on\w+\s*=/gi, '') // Remove event handlers
  }

  // HTML sanitization
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized)
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
  }

  return sanitized
}

/**
 * Validate note data with comprehensive security checks
 */
const validateNoteData = (data) => {
  const errors = []
  const sanitized = {}

  // Title validation
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push('Title must be a string')
    } else {
      if (data.title.length > SECURITY_CONFIG.MAX_TITLE_LENGTH) {
        errors.push(`Title must be ${SECURITY_CONFIG.MAX_TITLE_LENGTH} characters or less`)
      }
      sanitized.title = sanitizeInput(data.title, {
        maxLength: SECURITY_CONFIG.MAX_TITLE_LENGTH,
        normalizeWhitespace: true
      })
    }
  }

  // Content validation
  if (data.content !== undefined) {
    if (typeof data.content !== 'string') {
      errors.push('Content must be a string')
    } else {
      // Allow markdown but sanitize dangerous content
      sanitized.content = sanitizeInput(data.content, {
        maxLength: SECURITY_CONFIG.MAX_CONTENT_LENGTH,
        allowHtml: false, // Markdown will be rendered safely on frontend
        normalizeWhitespace: false // Preserve formatting
      })

      if (data.content.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
        errors.push(`Content must be ${SECURITY_CONFIG.MAX_CONTENT_LENGTH} characters or less`)
      }
    }
  }

  // Position validation
  if (data.position !== undefined) {
    if (!data.position || typeof data.position !== 'object') {
      errors.push('Position must be an object')
    } else {
      const { x, y } = data.position
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        errors.push('Position must contain valid x and y coordinates')
      } else if (Math.abs(x) > 1000000 || Math.abs(y) > 1000000) {
        errors.push('Position coordinates are out of reasonable range')
      } else {
        sanitized.position = { x: Number(x), y: Number(y) }
      }
    }
  }

  // Dimensions validation
  if (data.dimensions !== undefined) {
    if (!data.dimensions || typeof data.dimensions !== 'object') {
      errors.push('Dimensions must be an object')
    } else {
      const { width, height } = data.dimensions
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        errors.push('Dimensions must contain valid width and height')
      } else if (width < 100 || height < 100 || width > 2000 || height > 2000) {
        errors.push('Dimensions must be between 100 and 2000 pixels')
      } else {
        sanitized.dimensions = { width: Number(width), height: Number(height) }
      }
    }
  }

  // Color validation
  if (data.color !== undefined) {
    if (typeof data.color !== 'string') {
      errors.push('Color must be a string')
    } else {
      const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      const sanitizedColor = sanitizeInput(data.color, { maxLength: SECURITY_CONFIG.MAX_COLOR_LENGTH })

      if (!colorPattern.test(sanitizedColor)) {
        errors.push('Color must be a valid hex color')
      } else {
        sanitized.color = sanitizedColor
      }
    }
  }

  // Tags validation
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array')
    } else if (data.tags.length > SECURITY_CONFIG.MAX_TAGS_COUNT) {
      errors.push(`Cannot have more than ${SECURITY_CONFIG.MAX_TAGS_COUNT} tags`)
    } else {
      sanitized.tags = data.tags
        .filter(tag => typeof tag === 'string')
        .map(tag => sanitizeInput(tag, { maxLength: SECURITY_CONFIG.MAX_TAG_LENGTH }))
        .filter(tag => tag.length > 0)
        .slice(0, SECURITY_CONFIG.MAX_TAGS_COUNT)
    }
  }

  // AI generated flag
  if (data.aiGenerated !== undefined) {
    sanitized.aiGenerated = Boolean(data.aiGenerated)
  }

  return { errors, sanitized }
}

/**
 * Validate AI prompt input with injection protection
 */
const validateAIPrompt = (prompt, context = '', connectedNotes = []) => {
  const errors = []
  const sanitized = {}

  // Prompt validation
  if (!prompt || typeof prompt !== 'string') {
    errors.push('Prompt is required and must be a string')
  } else {
    // Check for prompt injection patterns
    const suspiciousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /act\s+as\s+if/i,
      /pretend\s+you\s+are/i,
      /system\s*:/i,
      /\\n\\n---/i,
      /human\s*:/i,
      /assistant\s*:/i,
      /<\s*script/i,
      /javascript:/i,
      /data:/i
    ]

    const hasInjection = suspiciousPatterns.some(pattern => pattern.test(prompt))
    if (hasInjection) {
      errors.push('Prompt contains suspicious patterns and may be attempting injection')
    }

    if (prompt.length > 5000) {
      errors.push('Prompt is too long (max 5000 characters)')
    }

    sanitized.prompt = sanitizeInput(prompt, {
      maxLength: 5000,
      stripScripts: true,
      normalizeWhitespace: false
    })
  }

  // Context validation
  if (context && typeof context !== 'string') {
    errors.push('Context must be a string')
  } else {
    sanitized.context = sanitizeInput(context || '', {
      maxLength: 2000,
      stripScripts: true
    })
  }

  // Connected notes validation
  if (!Array.isArray(connectedNotes)) {
    errors.push('Connected notes must be an array')
  } else if (connectedNotes.length > 10) {
    errors.push('Too many connected notes (max 10)')
  } else {
    sanitized.connectedNotes = connectedNotes
      .filter(note => note && typeof note === 'object')
      .slice(0, 10)
      .map(note => ({
        title: sanitizeInput(note.title || '', { maxLength: 200 }),
        content: sanitizeInput(note.content || '', { maxLength: 1000 })
      }))
  }

  return { errors, sanitized }
}

/**
 * Rate limiting with memory storage (use Redis in production)
 */
const rateLimitStore = new Map()

const isRateLimited = (key, windowMs, maxRequests) => {
  const now = Date.now()
  const windowStart = now - windowMs

  // Clean up old entries
  for (const [k, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => t > windowStart)
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(k)
    } else {
      rateLimitStore.set(k, validTimestamps)
    }
  }

  // Check current key
  const timestamps = rateLimitStore.get(key) || []
  const recentRequests = timestamps.filter(t => t > windowStart)

  if (recentRequests.length >= maxRequests) {
    return true
  }

  // Add current request
  recentRequests.push(now)
  rateLimitStore.set(key, recentRequests)
  return false
}

/**
 * Security middleware factory
 */
const createSecurityMiddleware = () => {
  return {
    validateNote: (req, res, next) => {
      const { errors, sanitized } = validateNoteData(req.body)

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        })
      }

      // Replace request body with sanitized data
      req.body = { ...req.body, ...sanitized }
      next()
    },

    validateAI: (req, res, next) => {
      const { prompt, context, connectedNotes } = req.body
      const { errors, sanitized } = validateAIPrompt(prompt, context, connectedNotes)

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'AI validation failed',
          details: errors
        })
      }

      // Replace request body with sanitized data
      req.body = sanitized
      next()
    },

    rateLimitAPI: (windowMs = SECURITY_CONFIG.RATE_LIMIT_WINDOW, maxRequests = SECURITY_CONFIG.RATE_LIMIT_MAX) => {
      return (req, res, next) => {
        const key = `api_${req.ip}`

        if (isRateLimited(key, windowMs, maxRequests)) {
          return res.status(429).json({
            error: 'Too many requests',
            details: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`
          })
        }

        next()
      }
    },

    rateLimitAI: () => {
      return (req, res, next) => {
        const key = `ai_${req.ip}`

        if (isRateLimited(key, SECURITY_CONFIG.AI_RATE_LIMIT_WINDOW, SECURITY_CONFIG.AI_RATE_LIMIT_MAX)) {
          return res.status(429).json({
            error: 'AI rate limit exceeded',
            details: `Max ${SECURITY_CONFIG.AI_RATE_LIMIT_MAX} AI requests per ${SECURITY_CONFIG.AI_RATE_LIMIT_WINDOW / 1000} seconds.`
          })
        }

        next()
      }
    }
  }
}

/**
 * Security audit logging
 */
const logSecurityEvent = (level, event, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    details,
    source: 'backend-security'
  }

  console.log(`🔒 Security ${level.toUpperCase()}:`, logEntry)

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToSecurityService(logEntry)
  }
}

module.exports = {
  sanitizeInput,
  validateNoteData,
  validateAIPrompt,
  createSecurityMiddleware,
  logSecurityEvent,
  SECURITY_CONFIG
}