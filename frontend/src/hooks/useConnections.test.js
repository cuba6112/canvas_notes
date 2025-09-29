import { renderHook, act } from '@testing-library/react'
import { useConnections } from './useConnections'

describe('useConnections', () => {
  describe('addConnection', () => {
    it('should add a new connection', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        const connection = result.current.addConnection('note1', 'note2')
        expect(connection).toMatchObject({
          id: expect.any(String),
          from: 'note1',
          to: 'note2',
          createdAt: expect.any(String)
        })
      })

      expect(result.current.connections).toHaveLength(1)
    })

    it('should prevent duplicate connections', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        const duplicate = result.current.addConnection('note1', 'note2')
        expect(duplicate).toBeNull()
      })

      expect(result.current.connections).toHaveLength(1)
    })

    it('should prevent reverse duplicate connections', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        const reverse = result.current.addConnection('note2', 'note1')
        expect(reverse).toBeNull()
      })

      expect(result.current.connections).toHaveLength(1)
    })

    it('should prevent self-connections', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        const selfConnection = result.current.addConnection('note1', 'note1')
        expect(selfConnection).toBeNull()
      })

      expect(result.current.connections).toHaveLength(0)
    })
  })

  describe('removeConnection', () => {
    it('should remove a connection by id', () => {
      const { result } = renderHook(() => useConnections())

      let connectionId
      act(() => {
        const connection = result.current.addConnection('note1', 'note2')
        connectionId = connection.id
      })

      expect(result.current.connections).toHaveLength(1)

      act(() => {
        result.current.removeConnection(connectionId)
      })

      expect(result.current.connections).toHaveLength(0)
    })
  })

  describe('removeConnectionsBetween', () => {
    it('should remove connections between two notes', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note2', 'note3')
      })

      expect(result.current.connections).toHaveLength(2)

      act(() => {
        result.current.removeConnectionsBetween('note1', 'note2')
      })

      expect(result.current.connections).toHaveLength(1)
      expect(result.current.connections[0].from).toBe('note2')
      expect(result.current.connections[0].to).toBe('note3')
    })
  })

  describe('removeConnectionsForNote', () => {
    it('should remove all connections for a note', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note2', 'note3')
        result.current.addConnection('note3', 'note4')
      })

      expect(result.current.connections).toHaveLength(3)

      act(() => {
        result.current.removeConnectionsForNote('note2')
      })

      expect(result.current.connections).toHaveLength(1)
      expect(result.current.connections[0].from).toBe('note3')
      expect(result.current.connections[0].to).toBe('note4')
    })
  })

  describe('getConnectedNotes', () => {
    it('should return connected note ids', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note1', 'note3')
        result.current.addConnection('note4', 'note1')
      })

      const connected = result.current.getConnectedNotes('note1')
      expect(connected).toHaveLength(3)
      expect(connected).toContain('note2')
      expect(connected).toContain('note3')
      expect(connected).toContain('note4')
    })
  })

  describe('isConnected', () => {
    it('should check if two notes are connected', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
      })

      expect(result.current.isConnected('note1', 'note2')).toBe(true)
      expect(result.current.isConnected('note2', 'note1')).toBe(true)
      expect(result.current.isConnected('note1', 'note3')).toBe(false)
    })
  })

  describe('getConnectedSubgraph', () => {
    it('should return transitively connected notes', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note2', 'note3')
        result.current.addConnection('note3', 'note4')
        result.current.addConnection('note5', 'note6') // Separate subgraph
      })

      const subgraph = result.current.getConnectedSubgraph('note1')
      expect(subgraph).toHaveLength(4)
      expect(subgraph).toContain('note1')
      expect(subgraph).toContain('note2')
      expect(subgraph).toContain('note3')
      expect(subgraph).toContain('note4')
      expect(subgraph).not.toContain('note5')
      expect(subgraph).not.toContain('note6')
    })

    it('should respect maxDepth parameter', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note2', 'note3')
        result.current.addConnection('note3', 'note4')
      })

      const subgraph = result.current.getConnectedSubgraph('note1', 1)
      expect(subgraph).toHaveLength(2)
      expect(subgraph).toContain('note1')
      expect(subgraph).toContain('note2')
      expect(subgraph).not.toContain('note3')
    })
  })

  describe('getShortestPath', () => {
    it('should find shortest path between two notes', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note2', 'note3')
        result.current.addConnection('note1', 'note4')
        result.current.addConnection('note4', 'note3') // Shorter path
      })

      const path = result.current.getShortestPath('note1', 'note3')
      expect(path).toEqual(['note1', 'note4', 'note3']) // Should take shorter path
    })

    it('should return null if no path exists', () => {
      const { result } = renderHook(() => useConnections())

      act(() => {
        result.current.addConnection('note1', 'note2')
        result.current.addConnection('note3', 'note4')
      })

      const path = result.current.getShortestPath('note1', 'note3')
      expect(path).toBeNull()
    })

    it('should return single note path for same start and end', () => {
      const { result } = renderHook(() => useConnections())

      const path = result.current.getShortestPath('note1', 'note1')
      expect(path).toEqual(['note1'])
    })
  })
})