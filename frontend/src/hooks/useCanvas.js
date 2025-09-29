import { useState, useCallback, useRef } from 'react'

export const useCanvas = () => {
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [selectedNote, setSelectedNote] = useState(null)
  const [selectedNotes, setSelectedNotes] = useState([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [draggingNotes, setDraggingNotes] = useState(new Set())

  const stageRef = useRef()
  const layerRef = useRef()

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX() || 1
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.1
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const boundedScale = Math.max(0.1, Math.min(5, newScale))

    stage.scale({ x: boundedScale, y: boundedScale })

    const newPos = {
      x: pointer.x - ((pointer.x - stage.x()) / oldScale) * boundedScale,
      y: pointer.y - ((pointer.y - stage.y()) / oldScale) * boundedScale
    }
    stage.position(newPos)
    setStageScale(boundedScale)
    setStagePosition(newPos)
  }, [])

  const handleStageDrag = useCallback((e) => {
    setStagePosition({ x: e.target.x(), y: e.target.y() })
  }, [])

  const resetView = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })
    setStageScale(1)
    setStagePosition({ x: 0, y: 0 })
  }, [])

  const centerOnNotes = useCallback((notes) => {
    if (!notes.length || !stageRef.current) return

    // Calculate bounding box of all notes
    const bounds = notes.reduce((acc, note) => {
      const left = note.position.x
      const right = note.position.x + (note.dimensions?.width || 300)
      const top = note.position.y
      const bottom = note.position.y + (note.dimensions?.height || 200)

      return {
        left: Math.min(acc.left, left),
        right: Math.max(acc.right, right),
        top: Math.min(acc.top, top),
        bottom: Math.max(acc.bottom, bottom)
      }
    }, {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity
    })

    const stage = stageRef.current
    const stageWidth = stage.width()
    const stageHeight = stage.height()

    const contentWidth = bounds.right - bounds.left
    const contentHeight = bounds.bottom - bounds.top

    const scaleX = stageWidth / (contentWidth + 200) // Add padding
    const scaleY = stageHeight / (contentHeight + 200)
    const scale = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%

    const centerX = (bounds.left + bounds.right) / 2
    const centerY = (bounds.top + bounds.bottom) / 2

    const newPos = {
      x: stageWidth / 2 - centerX * scale,
      y: stageHeight / 2 - centerY * scale
    }

    stage.scale({ x: scale, y: scale })
    stage.position(newPos)
    setStageScale(scale)
    setStagePosition(newPos)
  }, [])

  const handleNoteDragChange = useCallback((noteId, isDragging) => {
    setDraggingNotes(prev => {
      const newSet = new Set(prev)
      if (isDragging) {
        newSet.add(noteId)
      } else {
        newSet.delete(noteId)
      }
      return newSet
    })
  }, [])

  const handleNoteSelect = useCallback((noteId, ctrlKey = false) => {
    if (isConnecting && connectingFrom && connectingFrom !== noteId) {
      // Complete connection
      return { type: 'connect', from: connectingFrom, to: noteId }
    }

    if (ctrlKey) {
      // Multi-select
      setSelectedNotes(prev =>
        prev.includes(noteId)
          ? prev.filter(id => id !== noteId)
          : [...prev, noteId]
      )
    } else {
      // Single select
      setSelectedNote(noteId)
      setSelectedNotes([noteId])
    }

    return { type: 'select', noteId, isMulti: ctrlKey }
  }, [isConnecting, connectingFrom])

  const clearSelection = useCallback(() => {
    setSelectedNote(null)
    setSelectedNotes([])
    setIsConnecting(false)
    setConnectingFrom(null)
  }, [])

  const startConnection = useCallback(() => {
    if (selectedNote) {
      setIsConnecting(true)
      setConnectingFrom(selectedNote)
    }
  }, [selectedNote])

  const cancelConnection = useCallback(() => {
    setIsConnecting(false)
    setConnectingFrom(null)
  }, [])

  const forceRedraw = useCallback(() => {
    if (layerRef.current) {
      layerRef.current.batchDraw()
    }
  }, [])

  return {
    // State
    stageScale,
    stagePosition,
    selectedNote,
    selectedNotes,
    isConnecting,
    connectingFrom,
    draggingNotes,

    // Refs
    stageRef,
    layerRef,

    // Actions
    handleWheel,
    handleStageDrag,
    resetView,
    centerOnNotes,
    handleNoteDragChange,
    handleNoteSelect,
    clearSelection,
    startConnection,
    cancelConnection,
    forceRedraw,

    // Setters for external use
    setStageScale,
    setStagePosition,
    setSelectedNote,
    setSelectedNotes
  }
}