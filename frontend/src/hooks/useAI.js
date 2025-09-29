import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export const useAI = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const clearError = useCallback(() => setError(null), [])

  const generateNote = useCallback(async (prompt, options = {}) => {
    if (!prompt?.trim()) {
      throw new Error('Prompt is required')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: options.context || '',
          connectedNotes: options.connectedNotes || []
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        title: data.title || 'AI Generated Note',
        content: data.content || '',
        fullResponse: data.fullResponse || '',
        tags: ['ai-generated', ...(options.tags || [])],
        color: options.color || '#e3f2fd'
      }
    } catch (error) {
      console.error('AI generation error:', error)
      setError(error.message)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const summarizeNotes = useCallback(async (notes) => {
    if (!notes?.length) {
      throw new Error('Notes are required for summarization')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        title: `Summary of ${notes.length} notes`,
        content: data.summary || '',
        tags: ['ai-summary'],
        color: '#fff3e0'
      }
    } catch (error) {
      console.error('AI summarization error:', error)
      setError(error.message)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const generateQuestions = useCallback(async (noteContent, noteTitle = '') => {
    if (!noteContent?.trim()) {
      throw new Error('Note content is required')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteContent: noteContent.trim(),
          noteTitle: noteTitle.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        questions: data.questions || [],
        fullResponse: data.fullResponse || ''
      }
    } catch (error) {
      console.error('AI questions generation error:', error)
      setError(error.message)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const expandNote = useCallback(async (topic, connectedNotes = []) => {
    return generateNote(topic, {
      context: 'Expand on this topic with additional details and examples.',
      connectedNotes,
      tags: ['ai-expanded'],
      color: '#f3e5f5'
    })
  }, [generateNote])

  return {
    isGenerating,
    error,
    generateNote,
    summarizeNotes,
    generateQuestions,
    expandNote,
    clearError
  }
}