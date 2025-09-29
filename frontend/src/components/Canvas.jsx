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
    draggingNotes,
    handleWheel,
    handleStageDrag,
    handleNoteDragChange,
    handleNoteSelect,
    clearSelection,
    addConnection,
    removeConnection,
    getConnectedNotes,
    getConnectedSubgraph,
    updateNote,
    deleteNote: deleteNoteWithCleanup,
    createNote,
    loading,
    error,
    clearError
  } = useNotesContext()

  const { error: showError, NotificationsContainer } = useNotifications()

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 600
  })

  const [minimapVisible, setMinimapVisible] = useState(true)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [connectionMode, setConnectionMode] = useState(null) // { fromNoteId, fromPort, startPos }
  const [tempConnectionLine, setTempConnectionLine] = useState(null) // { fromPos, toPos }

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

  const { throttle } = usePerformanceMonitor()

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

  // Note: addNote function removed - use createNote directly from context





  // REMOVED: Duplicate useEffect for dimensions - handled above with optimization

  // Handle note selection with connection logic
  const handleNoteClick = (noteId, ctrlKey = false) => {
    const result = handleNoteSelect(noteId, ctrlKey)

    if (result?.type === 'connect') {
      addConnection(result.from, result.to)
    }
  }

  // Connection node handlers
  const handleStartConnection = useCallback((noteId, port) => {
    console.log('[Canvas] Starting connection from', noteId, port)

    // Find the note and calculate the port position
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    const getPortPosition = (note, port) => {
      const baseX = note.position.x
      const baseY = note.position.y
      const width = note.dimensions.width
      const height = note.dimensions.height

      switch (port) {
        case 'top':
          return { x: baseX + width / 2, y: baseY }
        case 'right':
          return { x: baseX + width, y: baseY + height / 2 }
        case 'bottom':
          return { x: baseX + width / 2, y: baseY + height }
        case 'left':
          return { x: baseX, y: baseY + height / 2 }
        default:
          return { x: baseX + width / 2, y: baseY + height / 2 }
      }
    }

    const startPos = getPortPosition(note, port)
    setConnectionMode({ fromNoteId: noteId, fromPort: port, startPos })
    setTempConnectionLine({ fromPos: startPos, toPos: startPos })
    document.body.style.cursor = 'crosshair'
    console.log('[Canvas] Connection mode set:', { fromNoteId: noteId, fromPort: port, startPos })
  }, [notes])

  const handleCompleteConnection = useCallback((toNoteId, toPort) => {
    console.log('[Canvas] Completing connection to', toNoteId, toPort)
    console.log('[Canvas] Current connection mode:', connectionMode)
    if (connectionMode && connectionMode.fromNoteId !== toNoteId) {
      console.log('[Canvas] Creating connection:', {
        from: connectionMode.fromNoteId,
        to: toNoteId,
        fromPort: connectionMode.fromPort,
        toPort
      })
      addConnection(
        connectionMode.fromNoteId,
        toNoteId,
        connectionMode.fromPort,
        toPort
      )
    } else if (!connectionMode) {
      console.log('[Canvas] ERROR: connectionMode is null')
    } else if (connectionMode.fromNoteId === toNoteId) {
      console.log('[Canvas] Cannot connect note to itself')
    }
    setConnectionMode(null)
    setTempConnectionLine(null)
    document.body.style.cursor = 'default'
  }, [connectionMode, addConnection])

  const handleConnectionDragMove = useCallback((cursorPos) => {
    if (connectionMode && connectionMode.startPos) {
      setTempConnectionLine({
        fromPos: connectionMode.startPos,
        toPos: cursorPos
      })
    }
  }, [connectionMode])

  const handleCancelConnection = useCallback(() => {
    setConnectionMode(null)
    setTempConnectionLine(null)
    document.body.style.cursor = 'default'
  }, [])

  // Handle ESC key to cancel connection mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && connectionMode) {
        handleCancelConnection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [connectionMode, handleCancelConnection])

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

            // Calculate connection points based on port positions
            const getPortPosition = (note, port) => {
              const baseX = note.position.x
              const baseY = note.position.y
              const width = note.dimensions.width
              const height = note.dimensions.height

              switch (port) {
                case 'top':
                  return { x: baseX + width / 2, y: baseY }
                case 'right':
                  return { x: baseX + width, y: baseY + height / 2 }
                case 'bottom':
                  return { x: baseX + width / 2, y: baseY + height }
                case 'left':
                  return { x: baseX, y: baseY + height / 2 }
                default: // 'center'
                  return { x: baseX + width / 2, y: baseY + height / 2 }
              }
            }

            const fromPos = getPortPosition(fromNote, conn.fromPort)
            const toPos = getPortPosition(toNote, conn.toPort)

            // Calculate control points for smooth curve
            const dx = toPos.x - fromPos.x
            const dy = toPos.y - fromPos.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const curvature = Math.min(distance * 0.3, 100)

            // Create smooth cubic bezier curve
            const points = [
              fromPos.x, fromPos.y,
              fromPos.x + dx * 0.3, fromPos.y - curvature,
              toPos.x - dx * 0.3, toPos.y - curvature,
              toPos.x, toPos.y
            ]

            return (
              <Line
                key={conn.id}
                points={points}
                stroke="#6366f1"
                strokeWidth={2}
                className="note-connection"
                opacity={0.6}
                bezier={true}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                shadowColor="rgba(99, 102, 241, 0.3)"
                shadowBlur={4}
                shadowOffsetX={0}
                shadowOffsetY={2}
                onClick={() => {
                  // Allow clicking connection to delete it
                  if (confirm('Remove this connection?')) {
                    removeConnection(conn.id)
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.strokeWidth(3)
                  e.target.opacity(0.9)
                  stageRef.current.container().style.cursor = 'pointer'
                }}
                onMouseLeave={(e) => {
                  e.target.strokeWidth(2)
                  e.target.opacity(0.6)
                  stageRef.current.container().style.cursor = 'default'
                }}
              />
            )
          })}

          {/* Temporary connection line preview while dragging */}
          {tempConnectionLine && (
            <Line
              points={[
                tempConnectionLine.fromPos.x,
                tempConnectionLine.fromPos.y,
                tempConnectionLine.toPos.x,
                tempConnectionLine.toPos.y
              ]}
              stroke="#10b981"
              strokeWidth={2}
              dash={[10, 5]}
              opacity={0.7}
              lineCap="round"
              listening={false}
            />
          )}

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
              onEditingModeChange: setEditingMode,
              // Connection node props
              connectionMode,
              onStartConnection: handleStartConnection,
              onCompleteConnection: handleCompleteConnection,
              onConnectionDragMove: handleConnectionDragMove
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