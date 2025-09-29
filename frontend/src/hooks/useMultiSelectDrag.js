import { useRef, useCallback } from 'react'

/**
 * Hook for coordinated multi-note drag operations
 * Provides leader-follower relationship for bulk movement
 */
export const useMultiSelectDrag = () => {
  const dragLeaderRef = useRef(null)
  const initialPositionsRef = useRef(new Map())
  const dragStartPositionRef = useRef(null)

  /**
   * Initialize bulk drag operation
   */
  const initBulkDrag = useCallback((leaderId, selectedNoteIds, notePositions) => {
    dragLeaderRef.current = leaderId
    initialPositionsRef.current.clear()

    // Store initial positions for all selected notes
    selectedNoteIds.forEach(noteId => {
      const position = notePositions[noteId]
      if (position) {
        initialPositionsRef.current.set(noteId, { ...position })
      }
    })

    // Store leader's starting position
    const leaderPosition = notePositions[leaderId]
    if (leaderPosition) {
      dragStartPositionRef.current = { ...leaderPosition }
    }
  }, [])

  /**
   * Calculate relative positions for follower notes
   */
  const calculateFollowerPositions = useCallback((leaderNewPosition) => {
    if (!dragLeaderRef.current || !dragStartPositionRef.current) {
      return new Map()
    }

    const deltaX = leaderNewPosition.x - dragStartPositionRef.current.x
    const deltaY = leaderNewPosition.y - dragStartPositionRef.current.y

    const newPositions = new Map()

    // Calculate new positions for all followers
    initialPositionsRef.current.forEach((initialPos, noteId) => {
      if (noteId !== dragLeaderRef.current) {
        const newPosition = {
          x: Math.round(initialPos.x + deltaX),
          y: Math.round(initialPos.y + deltaY)
        }

        // Boundary checking for each follower
        newPosition.x = Math.max(-10000, Math.min(10000, newPosition.x))
        newPosition.y = Math.max(-10000, Math.min(10000, newPosition.y))

        newPositions.set(noteId, newPosition)
      }
    })

    return newPositions
  }, [])

  /**
   * Update positions of all follower notes during drag
   */
  const updateFollowerPositions = useCallback((leaderPosition, getStageRef, selectedNoteIds) => {
    const followerPositions = calculateFollowerPositions(leaderPosition)
    const stage = getStageRef()?.current

    if (!stage) return followerPositions

    // Update visual positions of follower notes on stage
    followerPositions.forEach((position, noteId) => {
      const noteNode = stage.findOne(`#note-${noteId}`)
      if (noteNode) {
        noteNode.position(position)
      }
    })

    // Trigger stage redraw
    stage.batchDraw()
    return followerPositions
  }, [calculateFollowerPositions])

  /**
   * Apply momentum to all selected notes
   */
  const applyBulkMomentum = useCallback((velocity, selectedNoteIds, getStageRef, onBulkUpdate) => {
    const stage = getStageRef()?.current
    if (!stage || velocity.magnitude < 0.5) {
      onBulkUpdate?.(new Map())
      return
    }

    const FRICTION = 0.92
    const MIN_VELOCITY = 0.5

    let currentVelocityX = velocity.x
    let currentVelocityY = velocity.y

    const animate = () => {
      // Apply friction
      currentVelocityX *= FRICTION
      currentVelocityY *= FRICTION

      const newPositions = new Map()

      // Update all selected notes
      selectedNoteIds.forEach(noteId => {
        const noteNode = stage.findOne(`#note-${noteId}`)
        if (noteNode) {
          const currentPos = noteNode.position()
          const newPosition = {
            x: Math.round(currentPos.x + currentVelocityX / 60),
            y: Math.round(currentPos.y + currentVelocityY / 60)
          }

          // Boundary checking
          newPosition.x = Math.max(-10000, Math.min(10000, newPosition.x))
          newPosition.y = Math.max(-10000, Math.min(10000, newPosition.y))

          noteNode.position(newPosition)
          newPositions.set(noteId, newPosition)
        }
      })

      stage.batchDraw()

      // Check if we should continue animation
      const currentMagnitude = Math.sqrt(
        currentVelocityX * currentVelocityX + currentVelocityY * currentVelocityY
      )

      if (currentMagnitude > MIN_VELOCITY) {
        requestAnimationFrame(animate)
      } else {
        // Animation complete, trigger final update
        onBulkUpdate?.(newPositions)
      }
    }

    animate()
  }, [])

  /**
   * Handle bulk drag completion
   */
  const completeBulkDrag = useCallback((finalPositions, onNotesUpdate) => {
    const updates = []

    // Prepare updates for all moved notes
    finalPositions.forEach((position, noteId) => {
      updates.push({
        id: noteId,
        position,
        updatedAt: new Date().toISOString()
      })
    })

    // Batch update all notes
    if (updates.length > 0) {
      onNotesUpdate(updates)
    }

    // Clean up refs
    dragLeaderRef.current = null
    initialPositionsRef.current.clear()
    dragStartPositionRef.current = null
  }, [])

  /**
   * Visual indicators for bulk drag
   */
  const getBulkDragStyle = useCallback((noteId, isLeader, isSelected) => {
    if (!isSelected) return {}

    return {
      opacity: isLeader ? 1 : 0.8,
      scale: isLeader ? 1.05 : 1.02,
      strokeWidth: 2,
      stroke: isLeader ? '#4CAF50' : '#2196F3',
      shadowBlur: isLeader ? 12 : 8,
      shadowColor: isLeader ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)'
    }
  }, [])

  /**
   * Check if currently in bulk drag mode
   */
  const isBulkDragging = useCallback(() => {
    return dragLeaderRef.current !== null
  }, [])

  return {
    initBulkDrag,
    calculateFollowerPositions,
    updateFollowerPositions,
    applyBulkMomentum,
    completeBulkDrag,
    getBulkDragStyle,
    isBulkDragging
  }
}

export default useMultiSelectDrag