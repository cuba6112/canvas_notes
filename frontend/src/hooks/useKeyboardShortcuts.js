import { useEffect, useCallback, useRef } from 'react'
import { useNotesContext } from '../context/NotesContext'

/**
 * Comprehensive keyboard shortcuts system for Canvas Notes
 * Provides productivity shortcuts for navigation, editing, and canvas operations
 */
export const useKeyboardShortcuts = ({
  onCreateNote,
  onToggleMinimap,
  onToggleAI,
  onShowCommandPalette,
  onFocusSearch,
  onToggleHelp
}) => {
  const {
    selectedNotes,
    selectedNote,
    deleteSelectedNotes,
    duplicateNote,
    stageRef,
    stageScale,
    stagePosition,
    setStageScale,
    setStagePosition,
    resetView,
    centerOnNotes,
    notes,
    handleNoteSelect,
    clearSelection,
    createNote
  } = useNotesContext()

  const isEditingRef = useRef(false)
  const commandHeld = useRef(false)

  // Track if user is currently editing text
  const setEditingMode = useCallback((editing) => {
    isEditingRef.current = editing
  }, [])

  // Canvas navigation shortcuts
  const handleCanvasNavigation = useCallback((key, ctrlKey, shiftKey) => {
    const stage = stageRef.current
    if (!stage) return false

    const panAmount = shiftKey ? 100 : 50
    const zoomFactor = 1.2

    switch (key) {
      case 'ArrowUp':
        const newPosUp = {
          x: stagePosition.x,
          y: stagePosition.y + panAmount
        }
        stage.position(newPosUp)
        setStagePosition(newPosUp)
        stage.batchDraw()
        return true

      case 'ArrowDown':
        const newPosDown = {
          x: stagePosition.x,
          y: stagePosition.y - panAmount
        }
        stage.position(newPosDown)
        setStagePosition(newPosDown)
        stage.batchDraw()
        return true

      case 'ArrowLeft':
        const newPosLeft = {
          x: stagePosition.x + panAmount,
          y: stagePosition.y
        }
        stage.position(newPosLeft)
        setStagePosition(newPosLeft)
        stage.batchDraw()
        return true

      case 'ArrowRight':
        const newPosRight = {
          x: stagePosition.x - panAmount,
          y: stagePosition.y
        }
        stage.position(newPosRight)
        setStagePosition(newPosRight)
        stage.batchDraw()
        return true

      case '=':
      case '+':
        if (ctrlKey) {
          const newScale = Math.min(5, stageScale * zoomFactor)
          const center = { x: stage.width() / 2, y: stage.height() / 2 }
          const newPos = {
            x: center.x - ((center.x - stagePosition.x) / stageScale) * newScale,
            y: center.y - ((center.y - stagePosition.y) / stageScale) * newScale
          }
          stage.scale({ x: newScale, y: newScale })
          stage.position(newPos)
          setStageScale(newScale)
          setStagePosition(newPos)
          stage.batchDraw()
          return true
        }
        break

      case '-':
        if (ctrlKey) {
          const newScale = Math.max(0.1, stageScale / zoomFactor)
          const center = { x: stage.width() / 2, y: stage.height() / 2 }
          const newPos = {
            x: center.x - ((center.x - stagePosition.x) / stageScale) * newScale,
            y: center.y - ((center.y - stagePosition.y) / stageScale) * newScale
          }
          stage.scale({ x: newScale, y: newScale })
          stage.position(newPos)
          setStageScale(newScale)
          setStagePosition(newPos)
          stage.batchDraw()
          return true
        }
        break

      case '0':
        if (ctrlKey) {
          resetView()
          return true
        }
        break

      default:
        return false
    }
    return false
  }, [stageRef, stagePosition, stageScale, setStagePosition, setStageScale, resetView])

  // Note selection shortcuts
  const handleNoteSelection = useCallback((key, ctrlKey, shiftKey) => {
    switch (key) {
      case 'a':
        if (ctrlKey) {
          // Select all notes
          const allNoteIds = notes.map(note => note.id)
          allNoteIds.forEach((noteId, index) => {
            handleNoteSelect(noteId, index > 0) // Multi-select for all but first
          })
          return true
        }
        break

      case 'Escape':
        clearSelection()
        return true

      case 'Tab':
        // Cycle through notes
        if (notes.length > 0) {
          const currentIndex = selectedNote
            ? notes.findIndex(note => note.id === selectedNote)
            : -1

          const nextIndex = shiftKey
            ? (currentIndex <= 0 ? notes.length - 1 : currentIndex - 1)
            : (currentIndex >= notes.length - 1 ? 0 : currentIndex + 1)

          const nextNote = notes[nextIndex]
          if (nextNote) {
            handleNoteSelect(nextNote.id, false)

            // Center on selected note
            centerOnNotes([nextNote])
          }
          return true
        }
        break

      default:
        return false
    }
    return false
  }, [notes, selectedNote, handleNoteSelect, clearSelection, centerOnNotes])

  // Note operations shortcuts
  const handleNoteOperations = useCallback((key, ctrlKey, shiftKey) => {
    switch (key) {
      case 'n':
        if (ctrlKey) {
          onCreateNote?.()
          return true
        }
        break

      case 'd':
        if (ctrlKey && !shiftKey) {
          // Duplicate selected note
          if (selectedNotes.length === 1) {
            duplicateNote(selectedNotes[0])
            return true
          }
        }
        break

      case 'Delete':
      case 'Backspace':
        if (selectedNotes.length > 0) {
          const confirmed = confirm(`Delete ${selectedNotes.length} selected note(s)? This cannot be undone.`)
          if (confirmed) {
            deleteSelectedNotes()
          }
          return true
        }
        break

      case 'Enter':
        // Start editing selected note
        if (selectedNote && selectedNotes.length === 1) {
          // Trigger edit mode on the selected note
          const selectedNoteElement = document.querySelector(`[data-note-id="${selectedNote}"]`)
          if (selectedNoteElement) {
            const event = new CustomEvent('startEditing')
            selectedNoteElement.dispatchEvent(event)
          }
          return true
        }
        break

      default:
        return false
    }
    return false
  }, [selectedNote, selectedNotes, duplicateNote, deleteSelectedNotes, onCreateNote])

  // View and UI shortcuts
  const handleViewShortcuts = useCallback((key, ctrlKey, shiftKey) => {
    switch (key) {
      case 'f':
        if (ctrlKey && !shiftKey) {
          onFocusSearch?.()
          return true
        } else if (ctrlKey && shiftKey) {
          // Fit selected notes to view
          if (selectedNotes.length > 0) {
            const selectedNoteObjects = notes.filter(note => selectedNotes.includes(note.id))
            centerOnNotes(selectedNoteObjects)
          } else {
            centerOnNotes(notes)
          }
          return true
        }
        break

      case 'm':
        if (ctrlKey) {
          onToggleMinimap?.()
          return true
        }
        break

      case ' ':
        if (ctrlKey) {
          onToggleAI?.()
          return true
        }
        break

      case 'p':
        if (ctrlKey && shiftKey) {
          onShowCommandPalette?.()
          return true
        }
        break

      case '?':
      case '/':
        if (shiftKey) { // Shift+? = ?
          onToggleHelp?.()
          return true
        }
        break

      default:
        return false
    }
    return false
  }, [selectedNotes, notes, centerOnNotes, onFocusSearch, onToggleMinimap, onToggleAI, onShowCommandPalette, onToggleHelp])

  // Main keyboard event handler
  const handleKeyDown = useCallback((event) => {
    // Skip if user is editing text
    if (isEditingRef.current) {
      return
    }

    // Skip if typing in input fields
    const activeElement = document.activeElement
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )) {
      return
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event
    const commandKey = ctrlKey || metaKey // Handle both Ctrl (Windows) and Cmd (Mac)

    // Track command key state for combination detection
    if (commandKey && !commandHeld.current) {
      commandHeld.current = true
    }

    let handled = false

    // Try different shortcut handlers in order
    if (!handled) {
      handled = handleCanvasNavigation(key, commandKey, shiftKey)
    }

    if (!handled) {
      handled = handleNoteSelection(key, commandKey, shiftKey)
    }

    if (!handled) {
      handled = handleNoteOperations(key, commandKey, shiftKey)
    }

    if (!handled) {
      handled = handleViewShortcuts(key, commandKey, shiftKey)
    }

    // Prevent default behavior if we handled the shortcut
    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [handleCanvasNavigation, handleNoteSelection, handleNoteOperations, handleViewShortcuts])

  const handleKeyUp = useCallback((event) => {
    const { ctrlKey, metaKey } = event
    if (!ctrlKey && !metaKey && commandHeld.current) {
      commandHeld.current = false
    }
  }, [])

  // Attach global keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Get shortcut help information
  const getShortcutHelp = useCallback(() => {
    return {
      'Canvas Navigation': {
        'Arrow Keys': 'Pan canvas (Shift for faster)',
        'Ctrl/Cmd + Plus': 'Zoom in',
        'Ctrl/Cmd + Minus': 'Zoom out',
        'Ctrl/Cmd + 0': 'Reset view'
      },
      'Note Selection': {
        'Ctrl/Cmd + A': 'Select all notes',
        'Escape': 'Clear selection',
        'Tab': 'Next note',
        'Shift + Tab': 'Previous note'
      },
      'Note Operations': {
        'Ctrl/Cmd + N': 'Create new note',
        'Ctrl/Cmd + D': 'Duplicate selected note',
        'Delete/Backspace': 'Delete selected notes',
        'Enter': 'Edit selected note'
      },
      'View & UI': {
        'Ctrl/Cmd + F': 'Focus search',
        'Ctrl/Cmd + Shift + F': 'Fit notes to view',
        'Ctrl/Cmd + M': 'Toggle minimap',
        'Ctrl/Cmd + Space': 'Toggle AI assistant',
        'Ctrl/Cmd + Shift + P': 'Command palette',
        'Shift + ?': 'Show this help'
      }
    }
  }, [])

  return {
    setEditingMode,
    getShortcutHelp
  }
}

export default useKeyboardShortcuts