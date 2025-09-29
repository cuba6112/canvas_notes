import { useMemo } from 'react'

/**
 * Virtual rendering hook for canvas notes
 * Only renders notes that are visible in the current viewport
 */
export const useVirtualization = (notes, stagePosition, stageScale, dimensions) => {
  const visibleNotes = useMemo(() => {
    if (!notes || notes.length === 0) return []

    // Calculate viewport bounds
    const viewportBounds = {
      left: -stagePosition.x / stageScale,
      right: (-stagePosition.x + dimensions.width) / stageScale,
      top: -stagePosition.y / stageScale,
      bottom: (-stagePosition.y + dimensions.height) / stageScale
    }

    // Add buffer around viewport for smooth scrolling
    const buffer = 200
    const expandedBounds = {
      left: viewportBounds.left - buffer,
      right: viewportBounds.right + buffer,
      top: viewportBounds.top - buffer,
      bottom: viewportBounds.bottom + buffer
    }

    // Filter notes that intersect with the expanded viewport
    return notes.filter(note => {
      if (!note.position) return false

      const noteLeft = note.position.x
      const noteRight = note.position.x + (note.dimensions?.width || 300)
      const noteTop = note.position.y
      const noteBottom = note.position.y + (note.dimensions?.height || 200)

      // Check if note intersects with viewport
      return !(
        noteRight < expandedBounds.left ||
        noteLeft > expandedBounds.right ||
        noteBottom < expandedBounds.top ||
        noteTop > expandedBounds.bottom
      )
    })
  }, [notes, stagePosition, stageScale, dimensions])

  return visibleNotes
}

/**
 * Level of detail hook - adjusts rendering quality based on zoom level
 */
export const useLevelOfDetail = (stageScale) => {
  const lod = useMemo(() => {
    if (stageScale < 0.3) {
      return {
        level: 'low',
        renderText: false,
        renderShadows: false,
        renderDetails: false,
        quality: 0.5
      }
    } else if (stageScale < 0.7) {
      return {
        level: 'medium',
        renderText: true,
        renderShadows: false,
        renderDetails: false,
        quality: 0.75
      }
    } else {
      return {
        level: 'high',
        renderText: true,
        renderShadows: true,
        renderDetails: true,
        quality: 1
      }
    }
  }, [stageScale])

  return lod
}

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = () => {
  const measureRenderTime = (fn, label = 'render') => {
    return (...args) => {
      const start = performance.now()
      const result = fn(...args)
      const end = performance.now()

      if (end - start > 16) { // > 1 frame at 60fps
        console.warn(`Slow ${label}: ${(end - start).toFixed(2)}ms`)
      }

      return result
    }
  }

  const throttle = (fn, delay) => {
    let lastCall = 0
    return (...args) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        return fn(...args)
      }
    }
  }

  const debounce = (fn, delay) => {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  return {
    measureRenderTime,
    throttle,
    debounce
  }
}