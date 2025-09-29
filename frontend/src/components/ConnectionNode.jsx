import { Circle, Group } from 'react-konva'
import { useState, useRef } from 'react'

/**
 * ConnectionNode - A connection port on a note
 * Positions: 'top', 'right', 'bottom', 'left'
 * Supports drag-to-connect: drag from one node to another to create connection
 */
const ConnectionNode = ({
  noteId,
  position,
  noteWidth,
  noteHeight,
  onStartConnection,
  onCompleteConnection,
  onDragMove,
  isConnectionMode,
  isHighlighted,
  isParentHovered = false,
  isParentSelected = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef(null)

  // Calculate node position based on note dimensions
  const getNodePosition = () => {
    switch (position) {
      case 'top':
        return { x: noteWidth / 2, y: 0 }
      case 'right':
        return { x: noteWidth, y: noteHeight / 2 }
      case 'bottom':
        return { x: noteWidth / 2, y: noteHeight }
      case 'left':
        return { x: 0, y: noteHeight / 2 }
      default:
        return { x: noteWidth / 2, y: noteHeight / 2 }
    }
  }

  const nodePos = getNodePosition()
  const isActive = isHovered || isConnectionMode || isHighlighted || isDragging || isParentHovered || isParentSelected

  const handleDragStart = (e) => {
    console.log('[ConnectionNode] Drag start', { noteId, position })
    e.cancelBubble = true

    setIsDragging(true)
    const stage = e.target.getStage()
    if (stage) {
      const pointerPos = stage.getPointerPosition()
      const transform = stage.getAbsoluteTransform().copy().invert()
      const stagePos = transform.point(pointerPos)
      dragStartPos.current = stagePos

      stage.container().style.cursor = 'crosshair'
    }

    // Start connection mode
    onStartConnection?.(noteId, position)
  }

  const handleDragMove = (e) => {
    if (!isDragging) return

    e.cancelBubble = true
    const stage = e.target.getStage()
    if (stage && onDragMove) {
      const pointerPos = stage.getPointerPosition()
      const transform = stage.getAbsoluteTransform().copy().invert()
      const stagePos = transform.point(pointerPos)

      // Send drag position to parent for line preview
      onDragMove(stagePos)
    }
  }

  const handleDragEnd = (e) => {
    console.log('[ConnectionNode] Drag end', { noteId, position })
    e.cancelBubble = true

    setIsDragging(false)
    dragStartPos.current = null

    const stage = e.target.getStage()
    if (stage) {
      stage.container().style.cursor = 'default'
    }

    // Complete connection if we're over another node
    // The parent component will handle this through onMouseUp on target nodes
  }

  const handleMouseUp = (e) => {
    console.log('[ConnectionNode] Mouse up', { noteId, position, isConnectionMode })
    if (isConnectionMode && !isDragging) {
      e.cancelBubble = true
      // Complete connection when releasing over a target node
      onCompleteConnection?.(noteId, position)
    }
  }

  return (
    <Group
      x={nodePos.x}
      y={nodePos.y}
    >
      {/* Invisible hitbox for easier clicking and dragging */}
      <Circle
        radius={15}
        fill="transparent"
        draggable={!isConnectionMode}
        onMouseEnter={() => {
          setIsHovered(true)
          const stage = document.querySelector('.konvajs-content')
          if (stage) stage.style.cursor = isConnectionMode ? 'crosshair' : 'grab'
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          if (!isDragging) {
            const stage = document.querySelector('.konvajs-content')
            if (stage) stage.style.cursor = 'default'
          }
        }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleMouseUp}
        onDragStart={(e) => {
          e.cancelBubble = true
          handleDragStart(e)
        }}
        onDragMove={(e) => {
          e.cancelBubble = true
          handleDragMove(e)
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true
          handleDragEnd(e)
        }}
      />

      {/* Outer ring - visible on hover or connection mode */}
      {isActive && (
        <Circle
          radius={10}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="#6366f1"
          strokeWidth={1}
          opacity={isConnectionMode ? 1 : 0.6}
          listening={false}
        />
      )}

      {/* Inner dot - always visible when active */}
      <Circle
        radius={isActive ? 5 : 3}
        fill={isConnectionMode ? '#10b981' : '#6366f1'}
        shadowColor={isConnectionMode ? 'rgba(16, 185, 129, 0.5)' : 'rgba(99, 102, 241, 0.5)'}
        shadowBlur={isActive ? 8 : 0}
        shadowOffsetX={0}
        shadowOffsetY={0}
        opacity={isActive ? 1 : 0.3}
        listening={false}
      />

      {/* Pulse effect during connection mode */}
      {isConnectionMode && (
        <Circle
          radius={8}
          stroke="#10b981"
          strokeWidth={2}
          opacity={0.5}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Group>
  )
}

export default ConnectionNode