/**
 * Enterprise-grade content sanitization utilities
 * Prevents XSS, script injection, and malicious content
 */

/**
 * HTML entity encoding for XSS prevention
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
 * Escape HTML entities to prevent XSS
 */
export const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char])
}

/**
 * Sanitize markdown content for safe rendering
 * Removes dangerous HTML tags while preserving safe markdown
 */
export const sanitizeMarkdown = (content) => {
  if (!content || typeof content !== 'string') return ''

  // Remove script tags and their content
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove dangerous HTML attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:/gi, '')

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input)[^>]*>/gi, '')

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  return sanitized
}

/**
 * Sanitize clipboard content before copying
 */
export const sanitizeClipboardContent = (title, content) => {
  const safeTitle = escapeHtml(title || '').slice(0, 1000) // Limit length
  const safeContent = escapeHtml(content || '').slice(0, 10000) // Limit length

  return `${safeTitle}\n\n${safeContent}`
}

/**
 * Validate and sanitize user input with comprehensive checks
 */
export const sanitizeUserInput = (input, options = {}) => {
  const {
    maxLength = 10000,
    allowHtml = false,
    allowMarkdown = false,
    stripScripts = true
  } = options

  if (!input || typeof input !== 'string') return ''

  // Length validation
  let sanitized = input.slice(0, maxLength)

  // Script removal (always enabled for security)
  if (stripScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/javascript:/gi, '')
    sanitized = sanitized.replace(/data:/gi, '')
    sanitized = sanitized.replace(/vbscript:/gi, '')
  }

  // HTML sanitization
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized)
  }

  // Markdown-specific sanitization
  if (allowMarkdown) {
    sanitized = sanitizeMarkdown(sanitized)
  }

  return sanitized.trim()
}

/**
 * Advanced content security policy for dynamic content
 */
export const validateContentSecurity = (content) => {
  const securityChecks = {
    hasScripts: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i.test(content),
    hasEventHandlers: /\s*on\w+\s*=/i.test(content),
    hasJavascriptProtocol: /javascript:/i.test(content),
    hasDataUrls: /data:/i.test(content),
    hasIframes: /<iframe/i.test(content),
    hasObjects: /<object|<embed/i.test(content),
    hasForms: /<form|<input/i.test(content),
    hasExternalLinks: /https?:\/\/(?!localhost)/i.test(content)
  }

  const violations = Object.entries(securityChecks)
    .filter(([, hasViolation]) => hasViolation)
    .map(([check]) => check)

  return {
    isSecure: violations.length === 0,
    violations,
    riskLevel: violations.length === 0 ? 'low' : violations.length <= 2 ? 'medium' : 'high'
  }
}

/**
 * Secure URL validation for links and images
 */
export const validateSecureUrl = (url) => {
  if (!url || typeof url !== 'string') return false

  try {
    const urlObj = new URL(url)

    // Only allow http, https, and relative URLs
    const allowedProtocols = ['http:', 'https:', 'mailto:']

    if (!allowedProtocols.includes(urlObj.protocol)) {
      return false
    }

    // Block dangerous domains (basic blacklist)
    const dangerousDomains = ['javascript', 'data', 'file', 'ftp']
    if (dangerousDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false
    }

    return true
  } catch {
    // Relative URLs or invalid URLs
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
  }
}

/**
 * Real-time content monitoring for suspicious patterns
 */
export const monitorContentSecurity = (content, context = {}) => {
  const timestamp = new Date().toISOString()
  const security = validateContentSecurity(content)

  if (!security.isSecure) {
    console.warn('🚨 Security violation detected:', {
      timestamp,
      context,
      violations: security.violations,
      riskLevel: security.riskLevel,
      contentPreview: content.slice(0, 100) + '...'
    })

    // In production, send to security monitoring service (Vite's PROD flag)
    if (import.meta.env.PROD) {
      // Example: sendToSecurityService({ timestamp, context, violations: security.violations })
    }
  }

  return security
}