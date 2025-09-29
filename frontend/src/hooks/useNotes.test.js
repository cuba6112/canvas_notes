import { renderHook, waitFor } from '@testing-library/react'
import { useNotes } from './useNotes'

// Mock fetch
global.fetch = vi.fn()

describe('useNotes', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  afterEach(() => {
    fetch.mockRestore()
  })

  describe('fetchNotes', () => {
    it('should fetch notes successfully', async () => {
      const mockNotes = [
        { id: '1', title: 'Test Note', content: 'Test content' },
        { id: '2', title: 'Another Note', content: 'More content' }
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotes
      })

      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        result.current.fetchNotes()
      })

      await waitFor(() => {
        expect(result.current.notes).toEqual(mockNotes)
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        result.current.fetchNotes()
      })

      await waitFor(() => {
        expect(result.current.notes).toEqual([])
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Network error')
      })
    })
  })

  describe('createNote', () => {
    it('should create a note with optimistic updates', async () => {
      const noteData = { title: 'New Note', content: 'New content' }
      const savedNote = { id: 'saved-123', ...noteData }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => savedNote
      })

      const { result } = renderHook(() => useNotes())

      // Call createNote
      let createdNote
      await waitFor(async () => {
        createdNote = await result.current.createNote(noteData)
      })

      await waitFor(() => {
        expect(result.current.notes).toContainEqual(createdNote)
        expect(createdNote.id).toBe('saved-123')
      })
    })

    it('should rollback on create error', async () => {
      const noteData = { title: 'New Note', content: 'New content' }

      fetch.mockRejectedValueOnce(new Error('Create failed'))

      const { result } = renderHook(() => useNotes())

      try {
        await result.current.createNote(noteData)
      } catch (error) {
        expect(error.message).toBe('Create failed')
      }

      await waitFor(() => {
        expect(result.current.notes).toEqual([])
        expect(result.current.error).toBe('Create failed')
      })
    })
  })

  describe('updateNote', () => {
    it('should update a note with optimistic updates', async () => {
      const initialNotes = [{ id: '1', title: 'Original', content: 'Original content' }]
      const updatedNote = { id: '1', title: 'Updated', content: 'Updated content' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedNote
      })

      const { result } = renderHook(() => useNotes())

      // Set initial notes
      result.current.setNotes(initialNotes)

      await waitFor(async () => {
        await result.current.updateNote(updatedNote)
      })

      await waitFor(() => {
        expect(result.current.notes[0]).toEqual(updatedNote)
      })
    })
  })

  describe('deleteNote', () => {
    it('should delete a note with optimistic updates', async () => {
      const initialNotes = [
        { id: '1', title: 'Note 1' },
        { id: '2', title: 'Note 2' }
      ]

      fetch.mockResolvedValueOnce({ ok: true })

      const { result } = renderHook(() => useNotes())

      // Set initial notes
      result.current.setNotes(initialNotes)

      await waitFor(async () => {
        await result.current.deleteNote('1')
      })

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(1)
        expect(result.current.notes[0].id).toBe('2')
      })
    })
  })

  describe('searchNotes', () => {
    it('should filter notes by search term', async () => {
      const notes = [
        { id: '1', title: 'JavaScript Tutorial', content: 'Learn JS', tags: ['coding'] },
        { id: '2', title: 'React Guide', content: 'Learn React', tags: ['frontend'] },
        { id: '3', title: 'Backend API', content: 'Node.js tutorial', tags: ['backend'] }
      ]

      const { result } = renderHook(() => useNotes())
      result.current.setNotes(notes)

      await waitFor(() => {
        // Search by title
        expect(result.current.searchNotes('react')).toHaveLength(1)
        expect(result.current.searchNotes('react')[0].title).toBe('React Guide')

        // Search by content
        expect(result.current.searchNotes('node')).toHaveLength(1)
        expect(result.current.searchNotes('node')[0].title).toBe('Backend API')

        // Search by tag
        expect(result.current.searchNotes('frontend')).toHaveLength(1)
        expect(result.current.searchNotes('frontend')[0].title).toBe('React Guide')

        // No search term returns all notes
        expect(result.current.searchNotes('')).toHaveLength(3)

        // No matches
        expect(result.current.searchNotes('python')).toHaveLength(0)
      })
    })
  })

  describe('findNoteById', () => {
    it('should find note by id', async () => {
      const notes = [
        { id: '1', title: 'Note 1' },
        { id: '2', title: 'Note 2' }
      ]

      const { result } = renderHook(() => useNotes())
      result.current.setNotes(notes)

      await waitFor(() => {
        expect(result.current.findNoteById('1')).toEqual(notes[0])
        expect(result.current.findNoteById('2')).toEqual(notes[1])
        expect(result.current.findNoteById('3')).toBeUndefined()
      })
    })
  })
})