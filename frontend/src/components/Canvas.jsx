import { useEffect, useMemo, useState, useCallback, memo } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import Note from './Note.jsx'
import OptimizedNote from './OptimizedNote.jsx'
import AIAssistant from './AIAssistant.jsx'
import Toolbar from './Toolbar.jsx'
import LoadingSpinner from './LoadingSpinner.jsx'
import { useNotesContext } from '../context/NotesContext'
import { useNotifications } from './Notifications.jsx'
import { useVirtualization, useLevelOfDetail, usePerformanceMonitor } from '../hooks/useVirtualization.js'
import { useMultiSelectDrag } from '../hooks/useMultiSelectDrag.js'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js'
import Minimap from './Minimap.jsx'
import ShortcutsHelp from './ShortcutsHelp.jsx'
import './Canvas.css'

const Canvas = ({ filteredNotes }) => {
  const {
    notes,
    connections,
    stageRef,
    layerRef,
    stageScale,
    stagePosition,
    selectedNote,
    selectedNotes,
    isConnecting,
    connectingFrom,
    draggingNotes,
    handleWheel,
    handleStageDrag,
    resetView,
    handleNoteDragChange,
    handleNoteSelect,
    clearSelection,
    startConnection,
    addConnection,
    updateNote,
    deleteNote: deleteNoteWithCleanup,
    createNote,
    loading,
    error,
    clearError
  } = useNotesContext()

  const { success, error: showError, NotificationsContainer } = useNotifications()

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 600
  })

  const [minimapVisible, setMinimapVisible] = useState(true)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  // Show notifications for errors
  useEffect(() => {
    if (error) {
      showError(error.message || 'An error occurred')
      clearError()
    }
  }, [error, showError, clearError])

  // Calculate dimensions and handle resize - OPTIMIZED
  useEffect(() => {
    const calculateDimensions = () => {
      const container = document.querySelector('.canvas-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: rect.height
        })
      }
    }

    // Throttled resize handler for better performance
    let resizeTimeout
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(calculateDimensions, 16) // ~60fps
    }

    calculateDimensions()
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, [])

  // Memoize displayed notes with stability optimization
  const displayedNotes = useMemo(() => {
    const notesToDisplay = filteredNotes || notes
    // Ensure stable reference for notes that haven't changed
    return notesToDisplay.map(note => ({
      ...note,
      // Use stable ID for React keys to prevent unnecessary re-mounts
      _stableKey: note._stableId || note.id
    }))
  }, [filteredNotes, notes])

  // Virtualization and performance optimizations
  const visibleNotes = useVirtualization(displayedNotes, stagePosition, stageScale, dimensions)
  const levelOfDetail = useLevelOfDetail(stageScale)

  // Multi-select drag coordination
  const {
    initBulkDrag,
    updateFollowerPositions,
    applyBulkMomentum,
    completeBulkDrag,
    getBulkDragStyle,
    isBulkDragging
  } = useMultiSelectDrag()

  // Helper to get current note positions as a map
  const getNotePositions = useCallback(() => {
    const positions = {}
    notes.forEach(note => {
      positions[note.id] = note.position
    })
    return positions
  }, [notes])

  // Bulk update handler for multiple notes
  const handleBulkNotesUpdate = useCallback((noteUpdates) => {
    // noteUpdates is an array of { id, position, updatedAt }
    noteUpdates.forEach(update => {
      const note = notes.find(n => n.id === update.id)
      if (note) {
        updateNote({
          ...note,
          position: update.position,
          updatedAt: update.updatedAt
        })
      }
    })
  }, [notes, updateNote])

  // Keyboard shortcuts system
  const handleCreateNoteShortcut = useCallback(() => {
    // Create note at center of current viewport
    const stage = stageRef?.current
    if (stage) {
      const center = {
        x: (-stagePosition.x + stage.width() / 2) / stageScale,
        y: (-stagePosition.y + stage.height() / 2) / stageScale
      }
      createNote({
        position: center,
        title: '',
        content: 'New note'
      })
    }
  }, [stageRef, stagePosition, stageScale, createNote])

  const handleFocusSearch = useCallback(() => {
    // Focus on search input in sidebar
    const searchInput = document.querySelector('input[placeholder*="Search"]')
    if (searchInput) {
      searchInput.focus()
    }
  }, [])

  const { setEditingMode, getShortcutHelp } = useKeyboardShortcuts({
    onCreateNote: handleCreateNoteShortcut,
    onToggleMinimap: () => setMinimapVisible(!minimapVisible),
    onToggleAI: () => setShowAIAssistant(!showAIAssistant),
    onShowCommandPalette: () => {
      // TODO: Implement command palette
      console.log('Command palette not yet implemented')
    },
    onFocusSearch: handleFocusSearch,
    onToggleHelp: () => setShowShortcutsHelp(!showShortcutsHelp)
  })

  const { measureRenderTime, throttle } = usePerformanceMonitor()

  // Performance-based rendering optimization with hysteresis
  const shouldUseOptimizedRendering = useMemo(() => {
    const noteCount = displayedNotes.length
    const isZoomedOut = stageScale < 0.5
    const hasComplexContent = displayedNotes.some(note =>
      note.content && note.content.length > 1000
    )

    return noteCount > 50 || isZoomedOut || hasComplexContent
  }, [displayedNotes, stageScale])

  // Throttled handlers for better performance
  const throttledHandleWheel = useCallback(
    throttle(handleWheel, 16), // ~60fps
    [handleWheel]
  )

  const throttledHandleStageDrag = useCallback(
    throttle(handleStageDrag, 16),
    [handleStageDrag]
  )

  // AI note creation is now handled by the context
  const createNoteFromAI = async (aiNoteData) => {
    try {
      await createNote(aiNoteData, {
        nearConnected: selectedNotes.length > 0,
        connectToSelected: selectedNotes.length > 0,
        dimensions
      })
    } catch (error) {
      console.error('Error creating AI note:', error)
    }
  }

  // Note creation is now handled by the context
  const addNote = async () => {
    try {
      await createNote({}, { dimensions })
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }





  // REMOVED: Duplicate useEffect for dimensions - handled above with optimization

  // Handle note selection with connection logic
  const handleNoteClick = (noteId, ctrlKey = false) => {
    const result = handleNoteSelect(noteId, ctrlKey)

    if (result?.type === 'connect') {
      addConnection(result.from, result.to)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <NotificationsContainer />
      <Toolbar
        minimapVisible={minimapVisible}
        onToggleMinimap={() => setMinimapVisible(!minimapVisible)}
      />
      {loading && <LoadingSpinner overlay />}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={throttledHandleWheel}
        draggable={false}
        onDragEnd={throttledHandleStageDrag}
      >
        <Layer ref={layerRef}>
          <Rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill="#fafafa"
            onClick={clearSelection}
          />
          {connections.map(conn => {
            const fromNote = notes.find(n => n.id === conn.from)
            const toNote = notes.find(n => n.id === conn.to)
            if (!fromNote || !toNote) return null
            return (
              <Line
                key={conn.id}
                points={[
                  fromNote.position.x + fromNote.dimensions.width / 2,
                  fromNote.position.y + fromNote.dimensions.height / 2,
                  toNote.position.x + toNote.dimensions.width / 2,
                  toNote.position.y + toNote.dimensions.height / 2
                ]}
                stroke="rgba(0, 0, 0, 0.2)"
                strokeWidth={1.5}
                className="note-connection"
                dash={[5, 5]}
              />
            )
          })}
          {(shouldUseOptimizedRendering ? visibleNotes : displayedNotes).map((note, index) => {
            if (!note || !note.id) return null

            // Use stable component reference to prevent re-mounting
            const NoteComponent = shouldUseOptimizedRendering ? OptimizedNote : Note

            // Enhanced stable key with fallback
            const stableKey = note._stableKey || note._stableId || note.id

            // Create props without useMemo to avoid hooks rule violation
            const isNoteSelected = selectedNotes.includes(note.id)
            const isMultiSelect = selectedNotes.length > 1
            const isDragLeader = isNoteSelected && isMultiSelect && selectedNotes[0] === note.id

            const noteProps = {
              note,
              onUpdate: updateNote,
              onDelete: deleteNoteWithCleanup,
              onConnect: addConnection,
              isSelected: selectedNote === note.id,
              isMultiSelected: isNoteSelected,
              isDragLeader,
              bulkDragStyle: isNoteSelected ? getBulkDragStyle(note.id, isDragLeader, isNoteSelected) : {},
              onSelect: (ctrlKey) => handleNoteClick(note.id, ctrlKey),
              zIndex: draggingNotes.has(note.id) || selectedNote === note.id || selectedNotes.includes(note.id)
                ? displayedNotes.length + 2
                : index,
              onDragChange: (isDragging) => handleNoteDragChange(note.id, isDragging),
              levelOfDetail,
              // Bulk drag coordination props
              selectedNoteIds: selectedNotes,
              getNotePositions,
              getStageRef: () => stageRef,
              onBulkDragInit: initBulkDrag,
              onBulkPositionUpdate: updateFollowerPositions,
              onBulkMomentum: applyBulkMomentum,
              onBulkDragComplete: completeBulkDrag,
              onBulkNotesUpdate: handleBulkNotesUpdate,
              isBulkDragging: isBulkDragging(),
              // Keyboard shortcuts integration
              onEditingModeChange: setEditingMode
            }

            return (
               <NoteComponent
                 key={stableKey}
                 {...noteProps}
               />
            )
          })}
        </Layer>
      </Stage>
      <AIAssistant
        notes={notes}
        onCreateNote={createNoteFromAI}
        selectedNotes={selectedNotes}
        connections={connections}
      />

      {/* Minimap for canvas navigation */}
      <Minimap
        isVisible={minimapVisible}
        onToggleVisibility={() => setMinimapVisible(!minimapVisible)}
        position="bottom-right"
        width={200}
        height={150}
      />

      {/* Keyboard shortcuts help modal */}
      <ShortcutsHelp
        isVisible={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={getShortcutHelp()}
      />

      {/* Status bar with zoom and selection info */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        {selectedNotes.length > 0 && (
          <div
            style={{
              padding: '6px 10px',
              background: 'rgba(33, 150, 243, 0.1)',
              color: '#1976d2',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            {selectedNotes.length} selected
          </div>
        )}
        <div
          style={{
            padding: '6px 10px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '8px'
          }}
        >
          <span>{Math.round(stageScale * 100)}%</span>
          {shouldUseOptimizedRendering && (
            <span style={{ color: '#4CAF50' }}>⚡ Optimized</span>
          )}
          <span style={{ opacity: 0.7 }}>
            {shouldUseOptimizedRendering ? visibleNotes.length : displayedNotes.length}/{displayedNotes.length}
          </span>
        </div>
      </div>
    </div>
  )
}

// Memoize Canvas component to prevent unnecessary re-renders
export default memo(Canvas, (prevProps, nextProps) => {
  // Custom comparison for filtered notes
  const prevNotes = prevProps.filteredNotes
  const nextNotes = nextProps.filteredNotes

  if (prevNotes === nextNotes) return true
  if (!prevNotes || !nextNotes) return false
  if (prevNotes.length !== nextNotes.length) return false

  // Deep compare notes (check IDs and update timestamps)
  return prevNotes.every((note, index) => {
    const nextNote = nextNotes[index]
    return note.id === nextNote.id && note.updatedAt === nextNote.updatedAt
  })
})