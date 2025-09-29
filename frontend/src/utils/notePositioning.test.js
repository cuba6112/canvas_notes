import {
  calculateNotePosition,
  isPositionAvailable,
  findGridPosition,
  positionNearConnectedNotes,
  snapToGrid,
  getNotesBounds,
  GRID_SIZE,
  MIN_SPACING,
  DEFAULT_NOTE_SIZE
} from './notePositioning'

describe('notePositioning', () => {
  const mockNote1 = {
    id: '1',
    position: { x: 100, y: 100 },
    dimensions: { width: 300, height: 200 }
  }

  const mockNote2 = {
    id: '2',
    position: { x: 500, y: 300 },
    dimensions: { width: 300, height: 200 }
  }

  describe('calculateNotePosition', () => {
    it('should return center position when no existing notes', () => {
      const dimensions = { width: 800, height: 600 }
      const position = calculateNotePosition([], dimensions)

      expect(position.x).toBe(250) // 800/2 - 150
      expect(position.y).toBe(200) // 600/2 - 100
    })

    it('should return center position when no dimensions provided', () => {
      const position = calculateNotePosition([])

      expect(position.x).toBe(250) // Default width/2 - 150
      expect(position.y).toBe(200) // Default height/2 - 100
    })

    it('should find available position when notes exist', () => {
      const existingNotes = [mockNote1]
      const dimensions = { width: 800, height: 600 }

      const position = calculateNotePosition(existingNotes, dimensions)

      // Should not overlap with existing note
      expect(
        Math.abs(position.x - mockNote1.position.x) >= 300 + MIN_SPACING ||
        Math.abs(position.y - mockNote1.position.y) >= 200 + MIN_SPACING
      ).toBe(true)
    })
  })

  describe('isPositionAvailable', () => {
    it('should return true for available position', () => {
      const position = { x: 1000, y: 1000 }
      const existingNotes = [mockNote1, mockNote2]

      expect(isPositionAvailable(position, existingNotes)).toBe(true)
    })

    it('should return false for overlapping position', () => {
      const position = { x: 120, y: 120 } // Close to mockNote1
      const existingNotes = [mockNote1]

      expect(isPositionAvailable(position, existingNotes)).toBe(false)
    })

    it('should consider note dimensions in overlap calculation', () => {
      const position = { x: 150, y: 150 }
      const existingNotes = [mockNote1]
      const noteSize = { width: 400, height: 300 }

      expect(isPositionAvailable(position, existingNotes, noteSize)).toBe(false)
    })
  })

  describe('findGridPosition', () => {
    it('should return center when no notes exist', () => {
      const position = findGridPosition([], 400, 300)

      expect(position.x).toBe(400)
      expect(position.y).toBe(300)
    })

    it('should find next available grid position', () => {
      // Place a note at center grid position
      const centerNote = {
        position: { x: 400, y: 300 },
        dimensions: DEFAULT_NOTE_SIZE
      }

      const position = findGridPosition([centerNote], 400, 300)

      // Should find a position in the next ring
      const expectedPositions = [
        { x: 400 - GRID_SIZE, y: 300 }, // Left
        { x: 400 + GRID_SIZE, y: 300 }, // Right
        { x: 400, y: 300 - GRID_SIZE }, // Up
        { x: 400, y: 300 + GRID_SIZE }  // Down
      ]

      const isExpectedPosition = expectedPositions.some(expected =>
        position.x === expected.x && position.y === expected.y
      )

      expect(isExpectedPosition).toBe(true)
    })
  })

  describe('positionNearConnectedNotes', () => {
    it('should position near connected notes when provided', () => {
      const connectedNotes = [mockNote1, mockNote2]
      const existingNotes = [mockNote1, mockNote2]
      const dimensions = { width: 800, height: 600 }

      const position = positionNearConnectedNotes(connectedNotes, existingNotes, dimensions)

      // Should be within reasonable distance of connected notes
      const center = {
        x: (mockNote1.position.x + mockNote2.position.x) / 2,
        y: (mockNote1.position.y + mockNote2.position.y) / 2
      }

      const distance = Math.sqrt(
        Math.pow(position.x - center.x, 2) + Math.pow(position.y - center.y, 2)
      )

      expect(distance).toBeLessThan(400) // Within radius
    })

    it('should fallback to normal positioning when no connected notes', () => {
      const position = positionNearConnectedNotes([], [], { width: 800, height: 600 })

      expect(position.x).toBe(250)
      expect(position.y).toBe(200)
    })
  })

  describe('snapToGrid', () => {
    it('should snap to grid when close enough', () => {
      const position = { x: 355, y: 345 } // Close to 350, 350
      const snapped = snapToGrid(position, 20)

      expect(snapped.x).toBe(350)
      expect(snapped.y).toBe(350)
    })

    it('should not snap when too far from grid', () => {
      const position = { x: 375, y: 375 } // Too far from 350, 350
      const snapped = snapToGrid(position, 20)

      expect(snapped.x).toBe(375)
      expect(snapped.y).toBe(375)
    })

    it('should use default snap threshold', () => {
      const position = { x: 365, y: 365 } // Within default threshold of 20
      const snapped = snapToGrid(position)

      expect(snapped.x).toBe(350)
      expect(snapped.y).toBe(350)
    })
  })

  describe('getNotesBounds', () => {
    it('should calculate bounds for multiple notes', () => {
      const notes = [mockNote1, mockNote2]
      const bounds = getNotesBounds(notes)

      expect(bounds.left).toBe(100) // mockNote1.x
      expect(bounds.right).toBe(800) // mockNote2.x + width
      expect(bounds.top).toBe(100) // mockNote1.y
      expect(bounds.bottom).toBe(500) // mockNote2.y + height
    })

    it('should return null for empty notes array', () => {
      const bounds = getNotesBounds([])
      expect(bounds).toBeNull()
    })

    it('should handle notes without dimensions', () => {
      const noteWithoutDimensions = {
        id: '3',
        position: { x: 0, y: 0 }
      }

      const bounds = getNotesBounds([noteWithoutDimensions])

      expect(bounds.left).toBe(0)
      expect(bounds.right).toBe(DEFAULT_NOTE_SIZE.width)
      expect(bounds.top).toBe(0)
      expect(bounds.bottom).toBe(DEFAULT_NOTE_SIZE.height)
    })

    it('should handle single note', () => {
      const bounds = getNotesBounds([mockNote1])

      expect(bounds.left).toBe(100)
      expect(bounds.right).toBe(400) // 100 + 300
      expect(bounds.top).toBe(100)
      expect(bounds.bottom).toBe(300) // 100 + 200
    })
  })
})