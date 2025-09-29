import { useRef, useCallback } from 'react'
import Konva from 'konva'

/**
 * Hook for momentum-based drag interactions with physics
 * Provides smooth animations and natural momentum after drag ends
 */
export const useMomentumDrag = () => {
  const dragHistory = useRef([])
  const animationRef = useRef(null)
  const isAnimatingRef = useRef(false)
  const updateTimeoutRef = useRef(null)

  // Configuration for physics
  const FRICTION = 0.92
  const MIN_VELOCITY = 0.5
  const VELOCITY_SAMPLE_COUNT = 5
  const VELOCITY_TIME_WINDOW = 50 // ms
  const UPDATE_DEBOUNCE_MS = 100 // Debounce API calls to reduce rate limiting

  /**
   * Record drag position for velocity calculation
   */
  const recordDragPosition = useCallback((x, y, timestamp = Date.now()) => {
    dragHistory.current.push({ x, y, timestamp })

    // Keep only recent samples within time window
    const cutoff = timestamp - VELOCITY_TIME_WINDOW
    dragHistory.current = dragHistory.current
      .filter(point => point.timestamp >= cutoff)
      .slice(-VELOCITY_SAMPLE_COUNT)
  }, [])

  /**
   * Calculate velocity from recent drag history
   */
  const calculateVelocity = useCallback(() => {
    if (dragHistory.current.length < 2) {
      return { x: 0, y: 0, magnitude: 0 }
    }

    const samples = dragHistory.current
    const latest = samples[samples.length - 1]
    const earliest = samples[0]

    const deltaTime = latest.timestamp - earliest.timestamp
    if (deltaTime === 0) return { x: 0, y: 0, magnitude: 0 }

    const velocityX = (latest.x - earliest.x) / deltaTime * 1000 // px/second
    const velocityY = (latest.y - earliest.y) / deltaTime * 1000
    const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY)

    return { x: velocityX, y: velocityY, magnitude }
  }, [])

  /**
   * Debounced position update to reduce API call frequency
   */
  const debouncedPositionUpdate = useCallback((position, onPositionUpdate) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      onPositionUpdate?.(position)
    }, UPDATE_DEBOUNCE_MS)
  }, [])

  /**
   * Apply momentum animation after drag ends
   */
  const applyMomentum = useCallback((target, onPositionUpdate, onComplete) => {
    const velocity = calculateVelocity()

    if (velocity.magnitude < MIN_VELOCITY) {
      onComplete?.()
      return
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    isAnimatingRef.current = true
    let currentVelocityX = velocity.x
    let currentVelocityY = velocity.y
    let currentPosition = { x: target.x(), y: target.y() }
    let frameCount = 0

    const animate = () => {
      // Apply friction
      currentVelocityX *= FRICTION
      currentVelocityY *= FRICTION

      // Update position
      currentPosition.x += currentVelocityX / 60 // 60fps
      currentPosition.y += currentVelocityY / 60

      // Boundary checking (same as original implementation)
      const boundedPosition = {
        x: Math.max(-10000, Math.min(10000, Math.round(currentPosition.x))),
        y: Math.max(-10000, Math.min(10000, Math.round(currentPosition.y)))
      }

      // Update target position immediately for smooth visual feedback
      target.position(boundedPosition)

      // Debounce API calls - only send updates every few frames
      frameCount++
      if (frameCount % 6 === 0) { // Send update every 6 frames (10fps instead of 60fps)
        debouncedPositionUpdate(boundedPosition, onPositionUpdate)
      }

      // Check if we should continue animation
      const currentMagnitude = Math.sqrt(
        currentVelocityX * currentVelocityX + currentVelocityY * currentVelocityY
      )

      if (currentMagnitude > MIN_VELOCITY) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        isAnimatingRef.current = false
        // Final position update
        onPositionUpdate?.(boundedPosition)
        onComplete?.(boundedPosition)
      }
    }

    animate()
  }, [calculateVelocity, debouncedPositionUpdate])

  /**
   * Enhanced drag start handler
   */
  const handleDragStart = useCallback((e, onDragStart) => {
    // Clear previous drag history
    dragHistory.current = []

    // Cancel any existing momentum animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      isAnimatingRef.current = false
    }

    // Record initial position
    const startPosition = e.target.position()
    recordDragPosition(startPosition.x, startPosition.y)

    // Apply visual feedback with enhanced animation
    e.target.to({
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 0.15,
      easing: Konva.Easings.BackEaseOut
    })

    onDragStart?.(e)
  }, [recordDragPosition])

  /**
   * Enhanced drag move handler with position tracking
   */
  const handleDragMove = useCallback((e) => {
    const position = e.target.position()
    recordDragPosition(position.x, position.y)
  }, [recordDragPosition])

  /**
   * Enhanced drag end handler with momentum
   */
  const handleDragEnd = useCallback((e, onPositionUpdate, onDragEnd) => {
    // Restore scale with smooth animation
    e.target.to({
      scaleX: 1,
      scaleY: 1,
      duration: 0.2,
      easing: Konva.Easings.BackEaseOut
    })

    // Apply momentum if velocity is significant
    applyMomentum(
      e.target,
      onPositionUpdate,
      (finalPosition) => {
        onDragEnd?.(e, finalPosition)
      }
    )
  }, [applyMomentum])

  /**
   * Check if momentum animation is active
   */
  const isAnimating = useCallback(() => {
    return isAnimatingRef.current
  }, [])

  /**
   * Stop any active momentum animation
   */
  const stopMomentum = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      isAnimatingRef.current = false
    }
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }
  }, [])

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isAnimating,
    stopMomentum,
    recordDragPosition,
    calculateVelocity
  }
}

export default useMomentumDrag