import { createContext, useContext, useEffect, useCallback } from 'react'
import { useNotes } from '../hooks/useNotes'
import { useCanvas } from '../hooks/useCanvas'
import { useConnections } from '../hooks/useConnections'
import { useAI } from '../hooks/useAI'
import { calculateNotePosition, positionNearConnectedNotes } from '../utils/notePositioning'
import { logError, validateNote } from '../utils/errorHandling'
// Removed UUID import - ID generation now handled entirely by useNotes hook

const NotesContext = createContext()

export const useNotesContext = () => {
  const context = useContext(NotesContext)
  if (!context) {
    throw new Error('useNotesContext must be used within a NotesProvider')
  }
  return context
}

export const NotesProvider = ({ children }) => {
  const notesHook = useNotes()
  const canvasHook = useCanvas()
  const connectionsHook = useConnections()
  const aiHook = useAI()

  const {
    notes,
    loading: notesLoading,
    error: notesError,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    clearError: clearNotesError
  } = notesHook

  const {
    connections,
    addConnection,
    removeConnection,
    removeConnectionsForNote,
    getConnectedNotes,
    getConnectedSubgraph
  } = connectionsHook

  const {
    selectedNotes,
    clearSelection,
    centerOnNotes,
    forceRedraw
  } = canvasHook

  const {
    isGenerating: aiLoading,
    error: aiError,
    generateNote: generateAINote,
    summarizeNotes,
    generateQuestions,
    clearError: clearAIError
  } = aiHook

  // Initialize notes on mount
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Enhanced note creation with improved positioning
  const createNoteWithPosition = useCallback(async (noteData = {}, options = {}) => {
    try {
      validateNote(noteData)

      const colors = ['#fff9c4', '#ffccbc', '#d1c4e9', '#c5e1a5', '#b3e5fc', '#ffcdd2']
      const defaultColor = colors[Math.floor(Math.random() * colors.length)]

      let position
      if (options.nearConnected && selectedNotes.length > 0) {
        const connectedNoteData = selectedNotes.map(id => notes.find(n => n.id === id)).filter(Boolean)
        position = positionNearConnectedNotes(connectedNoteData, notes, options.dimensions)
      } else {
        position = calculateNotePosition(notes, options.dimensions)
      }

      const newNote = {
        // Remove ID generation here - let useNotes handle it to avoid conflicts
        title: '',
        content: '',
        position,
        dimensions: { width: 300, height: 200 },
        color: defaultColor,
        tags: [],
        aiGenerated: false,
        connections: [],
        ...noteData
        // Don't set createdAt/updatedAt here - let useNotes handle timestamps
      }

      const savedNote = await createNote(newNote)

      // Create connections to selected notes if requested
      if (options.connectToSelected && selectedNotes.length > 0) {
        selectedNotes.forEach(selectedId => {
          addConnection(selectedId, savedNote.id)
        })
      }

      forceRedraw()
      return savedNote
    } catch (error) {
      logError(error, { noteData, options })
      throw error
    }
  }, [notes, selectedNotes, createNote, addConnection, forceRedraw])

  // Enhanced AI note creation
  const createAINoteFromPrompt = useCallback(async (prompt, mode = 'question') => {
    try {
      if (!prompt?.trim()) {
        throw new Error('Prompt is required')
      }

      const contextNotes = selectedNotes
        .map(id => notes.find(n => n.id === id))
        .filter(Boolean)

      let aiData
      switch (mode) {
        case 'summarize':
          if (contextNotes.length === 0) {
            throw new Error('Please select notes to summarize')
          }
          aiData = await summarizeNotes(contextNotes)
          break
        case 'expand':
          aiData = await generateAINote(prompt, {
            context: 'Expand on this topic with additional details and examples.',
            connectedNotes: contextNotes,
            tags: ['ai-expanded'],
            color: '#f3e5f5'
          })
          break
        default:
          aiData = await generateAINote(prompt, {
            connectedNotes: contextNotes
          })
      }

      const noteData = {
        ...aiData,
        aiGenerated: true
      }

      return await createNoteWithPosition(noteData, {
        nearConnected: contextNotes.length > 0,
        connectToSelected: contextNotes.length > 0
      })
    } catch (error) {
      logError(error, { prompt, mode, selectedNotes })
      throw error
    }
  }, [selectedNotes, notes, generateAINote, summarizeNotes, createNoteWithPosition])

  // Enhanced note deletion with connection cleanup
  const deleteNoteWithCleanup = useCallback(async (noteId) => {
    try {
      // Remove connections first
      removeConnectionsForNote(noteId)

      // Delete the note
      await deleteNote(noteId)

      // Clear selection if deleted note was selected
      if (selectedNotes.includes(noteId)) {
        clearSelection()
      }

      forceRedraw()
    } catch (error) {
      logError(error, { noteId })
      throw error
    }
  }, [deleteNote, removeConnectionsForNote, selectedNotes, clearSelection, forceRedraw])

  // Bulk operations
  const deleteSelectedNotes = useCallback(async () => {
    if (selectedNotes.length === 0) return

    try {
      await Promise.all(selectedNotes.map(id => deleteNoteWithCleanup(id)))
      clearSelection()
    } catch (error) {
      logError(error, { selectedNotes })
      throw error
    }
  }, [selectedNotes, deleteNoteWithCleanup, clearSelection])

  const duplicateNote = useCallback(async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId)
      if (!note) throw new Error('Note not found')

      const duplicateData = {
        ...note,
        title: note.title ? `${note.title} (Copy)` : '',
        position: calculateNotePosition(notes)
      }

      delete duplicateData.id
      delete duplicateData.createdAt
      delete duplicateData.updatedAt

      return await createNoteWithPosition(duplicateData)
    } catch (error) {
      logError(error, { noteId })
      throw error
    }
  }, [notes, createNoteWithPosition])

  const focusOnSelectedNotes = useCallback(() => {
    if (selectedNotes.length === 0) return

    const selectedNoteData = selectedNotes
      .map(id => notes.find(n => n.id === id))
      .filter(Boolean)

    if (selectedNoteData.length > 0) {
      centerOnNotes(selectedNoteData)
    }
  }, [selectedNotes, notes, centerOnNotes])

  // Error handling
  const globalError = notesError || aiError
  const clearGlobalError = useCallback(() => {
    clearNotesError()
    clearAIError()
  }, [clearNotesError, clearAIError])

  const value = {
    // State
    notes,
    connections,
    selectedNotes,
    loading: notesLoading || aiLoading,
    error: globalError,

    // Notes operations
    createNote: createNoteWithPosition,
    updateNote,
    deleteNote: deleteNoteWithCleanup,
    deleteSelectedNotes,
    duplicateNote,
    searchNotes,

    // AI operations
    createAINoteFromPrompt,
    generateQuestions,
    isGeneratingAI: aiLoading,

    // Canvas operations
    ...canvasHook,
    focusOnSelectedNotes,

    // Connections
    ...connectionsHook,

    // Utilities
    clearError: clearGlobalError,
    forceRedraw,

    // Direct access to hooks for advanced usage
    notesHook,
    canvasHook,
    connectionsHook,
    aiHook
  }

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  )
}