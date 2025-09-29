import { useState, useCallback, useRef } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export const useNotes = () => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  const clearError = useCallback(() => setError(null), [])

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`)
      }

      const data = await response.json()
      setNotes(Array.isArray(data) ? data : [])
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching notes:', error)
        setError(error.message)
        setNotes([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const createNote = useCallback(async (noteData) => {
    setError(null)

    // Generate stable identifier that won't change during the note's lifecycle
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const stableId = `stable-${timestamp}-${randomId}`
    const tempId = noteData.id || `temp-${Date.now()}`
    const isUsingTempId = !noteData.id

    // Optimistic update with stable identifier for React key
    const tempNote = {
      ...noteData,
      id: tempId,
      _stableId: stableId, // Used for React key - never changes
      _isTemporary: isUsingTempId,
      createdAt: noteData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('🔄 Creating note with temp ID:', tempId, 'stable ID:', stableId, 'isTemp:', isUsingTempId)
    setNotes(prev => [...prev, tempNote])

    try {
      // Send noteData without the temporary ID to let backend assign real ID
      const dataToSend = { ...noteData }
      if (isUsingTempId) {
        delete dataToSend.id // Let backend assign the real ID
      }

      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.status}`)
      }

      const savedNote = await response.json()
      console.log('✅ Note saved with real ID:', savedNote.id, 'replacing temp ID:', tempId)

      // Update note with real ID while preserving stable identifier
      setNotes(prev => {
        const updated = prev.map(n => {
          if (n.id === tempId) {
            return {
              ...savedNote,
              _stableId: n._stableId, // Keep the same stable ID
              _isTemporary: false
            }
          }
          return n
        })
        console.log('📝 State updated. Replaced temp ID:', tempId, 'with real ID:', savedNote.id)
        console.log('📝 Current notes:', updated.map(n => ({
          id: n.id,
          _stableId: n._stableId,
          title: n.title,
          _isTemporary: n._isTemporary
        })))
        return updated
      })

      // Return updated note with stable ID preserved
      return {
        ...savedNote,
        _stableId: stableId,
        _isTemporary: false
      }
    } catch (error) {
      console.error('❌ Error creating note:', error, 'tempId:', tempId)
      setError(error.message)

      // Rollback optimistic update
      setNotes(prev => prev.filter(n => n.id !== tempId))
      throw error
    }
  }, [])

  const updateNote = useCallback(async (updatedNote) => {
    setError(null)

    // Handle temporary ID updates more gracefully
    if (updatedNote.id && updatedNote.id.startsWith('temp-')) {
      const existingNote = notes.find(n => n.id === updatedNote.id)

      if (existingNote) {
        console.log('🔄 Updating temporary note locally:', updatedNote.id)
        // Allow local updates to temporary notes (for position, dimensions, etc.)
        // but don't send to backend until ID is synchronized
        setNotes(prev => prev.map(n =>
          n.id === updatedNote.id ? { ...n, ...updatedNote } : n
        ))
        return // Exit early, no backend update needed for temporary IDs
      } else {
        console.warn('⚠️ Temporary note not found in state:', updatedNote.id)
        return // Silently ignore updates to non-existent temporary notes
      }
    }

    // Validate coordinates to prevent extreme values
    if (updatedNote.position) {
      const { x, y } = updatedNote.position
      const MAX_COORD = 10000 // Reasonable maximum coordinate

      if (!Number.isFinite(x) || !Number.isFinite(y) ||
          Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) {
        console.warn('🚫 Invalid coordinates detected, rejecting update:', { x, y })
        setError('Invalid note position detected')
        return
      }
    }

    // Optimistic update
    const previousNotes = notes
    setNotes(prev => prev.map(n =>
      n.id === updatedNote.id
        ? { ...updatedNote, updatedAt: new Date().toISOString() }
        : n
    ))

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${updatedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNote)
      })

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.status}`)
      }

      const savedNote = await response.json()

      // Update with server response
      setNotes(prev => prev.map(n => n.id === savedNote.id ? savedNote : n))

      return savedNote
    } catch (error) {
      console.error('Error updating note:', error)
      setError(error.message)

      // Rollback optimistic update
      setNotes(previousNotes)
      throw error
    }
  }, [notes])

  const deleteNote = useCallback(async (noteId) => {
    setError(null)

    // Optimistic update
    const previousNotes = notes
    setNotes(prev => prev.filter(n => n.id !== noteId))

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting note:', error)
      setError(error.message)

      // Rollback optimistic update
      setNotes(previousNotes)
      throw error
    }
  }, [notes])

  // Use a ref to store latest notes for search/find operations
  const notesRef = useRef(notes)
  notesRef.current = notes

  const findNoteById = useCallback((id) => {
    return notesRef.current.find(note => note.id === id)
  }, [])

  const searchNotes = useCallback((searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return notesRef.current

    const term = searchTerm.toLowerCase()
    return notesRef.current.filter(note =>
      note.title?.toLowerCase().includes(term) ||
      note.content?.toLowerCase().includes(term) ||
      note.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }, [])

  return {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    findNoteById,
    searchNotes,
    clearError,
    setNotes // For direct updates like drag operations
  }
}