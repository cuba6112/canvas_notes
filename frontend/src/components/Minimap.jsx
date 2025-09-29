import { useRef, useEffect, useCallback, useState } from 'react'
import { useNotesContext } from '../context/NotesContext'
import './Minimap.css'

/**
 * Minimap component for canvas navigation and overview
 * Provides a bird's-eye view of all notes and current viewport
 */
const Minimap = ({
  width = 200,
  height = 150,
  position = 'bottom-right',
  isVisible = true,
  onToggleVisibility
}) => {
  const canvasRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const {
    notes,
    stagePosition,
    stageScale,
    stageRef,
    setStagePosition,
    setStageScale
  } = useNotesContext()

  // Calculate canvas bounds and scale for minimap
  const getCanvasBounds = useCallback(() => {
    if (!notes.length) {
      return {
        minX: -500, maxX: 500,
        minY: -500, maxY: 500,
        width: 1000, height: 1000
      }
    }

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    notes.forEach(note => {
      const noteWidth = note.dimensions?.width || 250
      const noteHeight = note.dimensions?.height || 200

      minX = Math.min(minX, note.position.x)
      maxX = Math.max(maxX, note.position.x + noteWidth)
      minY = Math.min(minY, note.position.y)
      maxY = Math.max(maxY, note.position.y + noteHeight)
    })

    // Add padding around content
    const padding = 200
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }, [notes])

  // Calculate viewport bounds in canvas coordinates
  const getViewportBounds = useCallback(() => {
    const stage = stageRef?.current
    if (!stage) return null

    const stageWidth = stage.width()
    const stageHeight = stage.height()

    // Transform viewport to canvas coordinates
    const viewportX = -stagePosition.x / stageScale
    const viewportY = -stagePosition.y / stageScale
    const viewportWidth = stageWidth / stageScale
    const viewportHeight = stageHeight / stageScale

    return {
      x: viewportX,
      y: viewportY,
      width: viewportWidth,
      height: viewportHeight
    }
  }, [stagePosition, stageScale, stageRef])

  // Transform canvas coordinates to minimap coordinates
  const canvasToMinimap = useCallback((canvasX, canvasY, bounds) => {
    const scaleX = width / bounds.width
    const scaleY = height / bounds.height
    const scale = Math.min(scaleX, scaleY)

    const minimapX = (canvasX - bounds.minX) * scale
    const minimapY = (canvasY - bounds.minY) * scale

    return { x: minimapX, y: minimapY, scale }
  }, [width, height])

  // Transform minimap coordinates to canvas coordinates
  const minimapToCanvas = useCallback((minimapX, minimapY, bounds) => {
    const scaleX = width / bounds.width
    const scaleY = height / bounds.height
    const scale = Math.min(scaleX, scaleY)

    const canvasX = (minimapX / scale) + bounds.minX
    const canvasY = (minimapY / scale) + bounds.minY

    return { x: canvasX, y: canvasY }
  }, [width, height])

  // Render minimap to canvas
  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const bounds = getCanvasBounds()
    const viewport = getViewportBounds()

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set canvas background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)

    // Draw border
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, width, height)

    // Draw notes
    notes.forEach(note => {
      const noteWidth = note.dimensions?.width || 250
      const noteHeight = note.dimensions?.height || 200

      const topLeft = canvasToMinimap(note.position.x, note.position.y, bounds)
      const bottomRight = canvasToMinimap(
        note.position.x + noteWidth,
        note.position.y + noteHeight,
        bounds
      )

      const minimapWidth = Math.max(2, bottomRight.x - topLeft.x)
      const minimapHeight = Math.max(2, bottomRight.y - topLeft.y)

      // Note background
      ctx.fillStyle = note.color || '#ffffff'
      ctx.fillRect(topLeft.x, topLeft.y, minimapWidth, minimapHeight)

      // Note border
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5
      ctx.strokeRect(topLeft.x, topLeft.y, minimapWidth, minimapHeight)
    })

    // Draw viewport rectangle
    if (viewport) {
      const topLeft = canvasToMinimap(viewport.x, viewport.y, bounds)
      const bottomRight = canvasToMinimap(
        viewport.x + viewport.width,
        viewport.y + viewport.height,
        bounds
      )

      const viewportWidth = bottomRight.x - topLeft.x
      const viewportHeight = bottomRight.y - topLeft.y

      // Viewport background (semi-transparent)
      ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
      ctx.fillRect(topLeft.x, topLeft.y, viewportWidth, viewportHeight)

      // Viewport border
      ctx.strokeStyle = '#007bff'
      ctx.lineWidth = 2
      ctx.strokeRect(topLeft.x, topLeft.y, viewportWidth, viewportHeight)

      // Viewport corners for grab handles
      const cornerSize = 4
      ctx.fillStyle = '#007bff'
      ctx.fillRect(topLeft.x - cornerSize/2, topLeft.y - cornerSize/2, cornerSize, cornerSize)
      ctx.fillRect(bottomRight.x - cornerSize/2, topLeft.y - cornerSize/2, cornerSize, cornerSize)
      ctx.fillRect(topLeft.x - cornerSize/2, bottomRight.y - cornerSize/2, cornerSize, cornerSize)
      ctx.fillRect(bottomRight.x - cornerSize/2, bottomRight.y - cornerSize/2, cornerSize, cornerSize)
    }

    // Draw scale indicator
    const scaleText = `${Math.round(stageScale * 100)}%`
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.fillText(scaleText, 5, height - 5)

    // Draw note count
    const noteCountText = `${notes.length} notes`
    ctx.fillText(noteCountText, 5, 15)
  }, [notes, stagePosition, stageScale, width, height, getCanvasBounds, getViewportBounds, canvasToMinimap, stageRef])

  // Handle minimap click for navigation
  const handleMinimapClick = useCallback((event) => {
    const canvas = canvasRef.current
    const stage = stageRef?.current
    if (!canvas || !stage) return

    const rect = canvas.getBoundingClientRect()
    const minimapX = event.clientX - rect.left
    const minimapY = event.clientY - rect.top

    const bounds = getCanvasBounds()
    const canvasCoords = minimapToCanvas(minimapX, minimapY, bounds)

    const stageWidth = stage.width()
    const stageHeight = stage.height()

    // Center the clicked point in the viewport
    const newStagePos = {
      x: stageWidth / 2 - canvasCoords.x * stageScale,
      y: stageHeight / 2 - canvasCoords.y * stageScale
    }

    stage.position(newStagePos)
    setStagePosition(newStagePos)
    stage.batchDraw()
  }, [stageRef, stageScale, getCanvasBounds, minimapToCanvas, setStagePosition])

  // Handle minimap drag for panning
  const handleMinimapMouseDown = useCallback((event) => {
    setIsDragging(true)
    handleMinimapClick(event)
  }, [handleMinimapClick])

  const handleMinimapMouseMove = useCallback((event) => {
    if (!isDragging) return
    handleMinimapClick(event)
  }, [isDragging, handleMinimapClick])

  const handleMinimapMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const stage = stageRef?.current
    if (!stage) return

    const newScale = Math.min(5, stageScale * 1.2)
    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2
    }

    const newPos = {
      x: center.x - ((center.x - stagePosition.x) / stageScale) * newScale,
      y: center.y - ((center.y - stagePosition.y) / stageScale) * newScale
    }

    stage.scale({ x: newScale, y: newScale })
    stage.position(newPos)
    setStageScale(newScale)
    setStagePosition(newPos)
    stage.batchDraw()
  }, [stageRef, stageScale, stagePosition, setStageScale, setStagePosition])

  const handleZoomOut = useCallback(() => {
    const stage = stageRef?.current
    if (!stage) return

    const newScale = Math.max(0.1, stageScale * 0.8)
    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2
    }

    const newPos = {
      x: center.x - ((center.x - stagePosition.x) / stageScale) * newScale,
      y: center.y - ((center.y - stagePosition.y) / stageScale) * newScale
    }

    stage.scale({ x: newScale, y: newScale })
    stage.position(newPos)
    setStageScale(newScale)
    setStagePosition(newPos)
    stage.batchDraw()
  }, [stageRef, stageScale, stagePosition, setStageScale, setStagePosition])

  // Fit all notes in view
  const handleFitToView = useCallback(() => {
    const stage = stageRef?.current
    if (!stage || !notes.length) return

    const bounds = getCanvasBounds()
    const stageWidth = stage.width()
    const stageHeight = stage.height()

    const scaleX = stageWidth / bounds.width
    const scaleY = stageHeight / bounds.height
    const newScale = Math.min(scaleX, scaleY, 1) * 0.9 // 90% to add padding

    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    const newPos = {
      x: stageWidth / 2 - centerX * newScale,
      y: stageHeight / 2 - centerY * newScale
    }

    stage.scale({ x: newScale, y: newScale })
    stage.position(newPos)
    setStageScale(newScale)
    setStagePosition(newPos)
    stage.batchDraw()
  }, [stageRef, notes, getCanvasBounds, setStageScale, setStagePosition])

  // Re-render minimap when dependencies change
  useEffect(() => {
    renderMinimap()
  }, [renderMinimap])

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', handleMinimapMouseDown)
    window.addEventListener('mousemove', handleMinimapMouseMove)
    window.addEventListener('mouseup', handleMinimapMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMinimapMouseDown)
      window.removeEventListener('mousemove', handleMinimapMouseMove)
      window.removeEventListener('mouseup', handleMinimapMouseUp)
    }
  }, [handleMinimapMouseDown, handleMinimapMouseMove, handleMinimapMouseUp])

  if (!isVisible) return null

  return (
    <div
      className={`minimap-container ${position} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="minimap-header">
        <span className="minimap-title">Overview</span>
        <div className="minimap-controls">
          <button
            className="minimap-btn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="minimap-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            −
          </button>
          <button
            className="minimap-btn"
            onClick={handleFitToView}
            title="Fit to View"
          >
            ⌂
          </button>
          <button
            className="minimap-btn minimap-close"
            onClick={onToggleVisibility}
            title="Hide Minimap"
          >
            ×
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="minimap-canvas"
        style={{
          cursor: 'pointer', // Hand cursor for better UX
          borderRadius: '4px'
        }}
      />
      <div className="minimap-footer">
        <span className="minimap-info">
          Click to navigate • Drag to pan
        </span>
      </div>
    </div>
  )
}

export default Minimap