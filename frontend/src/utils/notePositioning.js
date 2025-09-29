/**
 * Utility functions for positioning notes on the canvas
 */

export const GRID_SIZE = 350
export const MIN_SPACING = 50
export const DEFAULT_NOTE_SIZE = { width: 300, height: 200 }

/**
 * Calculate a good position for a new note - PERFORMANCE OPTIMIZED
 */
export const calculateNotePosition = (existingNotes, dimensions = {}) => {
  // Use explicit defaults to ensure consistent behavior in tests
  const defaultWidth = 800
  const defaultHeight = 600
  const { width = defaultWidth, height = defaultHeight } = dimensions

  const centerX = Math.round(width / 2 - 150)
  const centerY = Math.round(height / 2 - 100)

  if (!existingNotes?.length) {
    return { x: centerX, y: centerY }
  }

  // Use cached position lookup for better performance
  const positionCache = createPositionCache(existingNotes)

  // Try smart positioning first - near last created note
  const lastNote = existingNotes[existingNotes.length - 1]
  if (lastNote?.position) {
    const smartPosition = findNearbyPosition(lastNote.position, positionCache)
    if (smartPosition) return smartPosition
  }

  // Try random positioning with cache lookup
  const offsetRange = 400
  let attempts = 0
  const maxAttempts = 10 // Reduced attempts for better performance

  while (attempts < maxAttempts) {
    const offsetX = (Math.random() - 0.5) * offsetRange
    const offsetY = (Math.random() - 0.5) * offsetRange
    const position = { x: centerX + offsetX, y: centerY + offsetY }

    if (isPositionAvailableInCache(position, positionCache)) {
      return position
    }
    attempts++
  }

  // Fall back to optimized grid-based positioning
  return findGridPosition(existingNotes, centerX, centerY)
}

/**
 * Check if a position is available (not overlapping with existing notes)
 */
// eslint-disable-next-line no-unused-vars
export const isPositionAvailable = (position, existingNotes, noteSize = DEFAULT_NOTE_SIZE) => {
  return !existingNotes.some(note => {
    const noteWidth = note.dimensions?.width || DEFAULT_NOTE_SIZE.width
    const noteHeight = note.dimensions?.height || DEFAULT_NOTE_SIZE.height

    return (
      Math.abs(position.x - note.position.x) < noteWidth + MIN_SPACING &&
      Math.abs(position.y - note.position.y) < noteHeight + MIN_SPACING
    )
  })
}

/**
 * Create a spatial cache for faster position lookups - PERFORMANCE OPTIMIZATION
 */
export const createPositionCache = (existingNotes) => {
  const cache = new Map()

  existingNotes.forEach(note => {
    if (!note.position) return

    const gridX = Math.floor(note.position.x / GRID_SIZE)
    const gridY = Math.floor(note.position.y / GRID_SIZE)
    const key = `${gridX},${gridY}`

    if (!cache.has(key)) {
      cache.set(key, [])
    }
    cache.get(key).push(note)
  })

  return cache
}

/**
 * Fast position availability check using spatial cache
 */
// eslint-disable-next-line no-unused-vars
export const isPositionAvailableInCache = (position, positionCache, noteSize = DEFAULT_NOTE_SIZE) => {
  const gridX = Math.floor(position.x / GRID_SIZE)
  const gridY = Math.floor(position.y / GRID_SIZE)

  // Check surrounding grid cells for efficiency
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gridX + dx},${gridY + dy}`
      const notesInCell = positionCache.get(key)

      if (notesInCell) {
        for (const note of notesInCell) {
          const noteWidth = note.dimensions?.width || DEFAULT_NOTE_SIZE.width
          const noteHeight = note.dimensions?.height || DEFAULT_NOTE_SIZE.height

          if (
            Math.abs(position.x - note.position.x) < noteWidth + MIN_SPACING &&
            Math.abs(position.y - note.position.y) < noteHeight + MIN_SPACING
          ) {
            return false
          }
        }
      }
    }
  }

  return true
}

/**
 * Find a position near a reference position - SMART POSITIONING
 */
export const findNearbyPosition = (referencePosition, positionCache, attempts = 8) => {
  const radius = 250
  const angleStep = (2 * Math.PI) / attempts

  for (let i = 0; i < attempts; i++) {
    const angle = i * angleStep
    const position = {
      x: referencePosition.x + Math.cos(angle) * radius,
      y: referencePosition.y + Math.sin(angle) * radius
    }

    if (isPositionAvailableInCache(position, positionCache)) {
      return position
    }
  }

  return null
}

/**
 * Find an available position using grid-based approach
 */
export const findGridPosition = (existingNotes, centerX = 0, centerY = 0) => {
  // Calculate which grid cell each note occupies
  const usedPositions = new Set(
    existingNotes.map(note =>
      `${Math.round(note.position.x / GRID_SIZE)},${Math.round(note.position.y / GRID_SIZE)}`
    )
  )

  // Calculate the grid coordinates for the center position
  const centerGridX = Math.round(centerX / GRID_SIZE)
  const centerGridY = Math.round(centerY / GRID_SIZE)

  // Spiral out from center to find first available grid position
  let ring = 0

  while (ring < 20) {
    if (ring === 0) {
      // Check center position first
      const gridPos = `${centerGridX},${centerGridY}`
      if (!usedPositions.has(gridPos)) {
        return { x: centerX, y: centerY }
      }
    } else {
      // Check ring positions - prioritize cardinal directions (no diagonals)
      // First check positions where only one coordinate changes (cardinal directions)
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // Only check positions on the current ring
          if (Math.abs(dx) === ring || Math.abs(dy) === ring) {
            // Skip if not a cardinal direction (both dx and dy are non-zero)
            const isCardinal = (dx === 0 || dy === 0)
            if (!isCardinal) continue

            const gridX = centerGridX + dx
            const gridY = centerGridY + dy
            const gridPos = `${gridX},${gridY}`
            if (!usedPositions.has(gridPos)) {
              // Return position relative to center, not absolute grid position
              return {
                x: centerX + dx * GRID_SIZE,
                y: centerY + dy * GRID_SIZE
              }
            }
          }
        }
      }

      // Then check diagonal positions if no cardinal positions available
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // Only check positions on the current ring
          if (Math.abs(dx) === ring || Math.abs(dy) === ring) {
            const isDiagonal = (dx !== 0 && dy !== 0)
            if (!isDiagonal) continue

            const gridX = centerGridX + dx
            const gridY = centerGridY + dy
            const gridPos = `${gridX},${gridY}`
            if (!usedPositions.has(gridPos)) {
              // Return position relative to center, not absolute grid position
              return {
                x: centerX + dx * GRID_SIZE,
                y: centerY + dy * GRID_SIZE
              }
            }
          }
        }
      }
    }
    ring++
  }

  // Fallback to random position if grid is full
  return {
    x: centerX + (Math.random() - 0.5) * 1000,
    y: centerY + (Math.random() - 0.5) * 1000
  }
}

/**
 * Position a note relative to connected notes - OPTIMIZED
 */
export const positionNearConnectedNotes = (connectedNotes, existingNotes, dimensions) => {
  if (!connectedNotes?.length) {
    return calculateNotePosition(existingNotes, dimensions)
  }

  // Create position cache for faster lookups
  const positionCache = createPositionCache(existingNotes)

  // Calculate center of connected notes
  const center = connectedNotes.reduce(
    (acc, note) => ({
      x: acc.x + note.position.x,
      y: acc.y + note.position.y
    }),
    { x: 0, y: 0 }
  )

  center.x /= connectedNotes.length
  center.y /= connectedNotes.length

  // Try positions around the center with optimized lookup
  // Try multiple radii to find an available position near connected notes
  const radii = [200, 250, 300, 350]
  const angleStep = (2 * Math.PI) / 8 // 8 positions around the center

  for (const radius of radii) {
    for (let i = 0; i < 8; i++) {
      const angle = i * angleStep
      const position = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      }

      if (isPositionAvailableInCache(position, positionCache)) {
        return position
      }
    }
  }

  // Fallback to normal positioning
  return calculateNotePosition(existingNotes, dimensions)
}

/**
 * Snap position to grid if close enough
 */
export const snapToGrid = (position, snapThreshold = 20) => {
  const gridX = Math.round(position.x / GRID_SIZE) * GRID_SIZE
  const gridY = Math.round(position.y / GRID_SIZE) * GRID_SIZE

  return {
    x: Math.abs(position.x - gridX) < snapThreshold ? gridX : position.x,
    y: Math.abs(position.y - gridY) < snapThreshold ? gridY : position.y
  }
}

/**
 * Get bounding box of a collection of notes
 */
export const getNotesBounds = (notes) => {
  if (!notes?.length) return null

  return notes.reduce((bounds, note) => {
    const left = note.position.x
    const right = note.position.x + (note.dimensions?.width || DEFAULT_NOTE_SIZE.width)
    const top = note.position.y
    const bottom = note.position.y + (note.dimensions?.height || DEFAULT_NOTE_SIZE.height)

    return {
      left: Math.min(bounds.left, left),
      right: Math.max(bounds.right, right),
      top: Math.min(bounds.top, top),
      bottom: Math.max(bounds.bottom, bottom)
    }
  }, {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity
  })
}