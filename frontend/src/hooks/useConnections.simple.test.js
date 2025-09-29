import { renderHook, act } from '@testing-library/react'
import { useConnections } from './useConnections'

describe('useConnections - Core Functions', () => {
  it('should add connections correctly', () => {
    const { result } = renderHook(() => useConnections())

    act(() => {
      const connection = result.current.addConnection('note1', 'note2')
      expect(connection).toBeTruthy()
      expect(connection.from).toBe('note1')
      expect(connection.to).toBe('note2')
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

  it('should prevent self-connections', () => {
    const { result } = renderHook(() => useConnections())

    act(() => {
      const selfConnection = result.current.addConnection('note1', 'note1')
      expect(selfConnection).toBeNull()
    })

    expect(result.current.connections).toHaveLength(0)
  })

  it('should get connected notes', () => {
    const { result } = renderHook(() => useConnections())

    act(() => {
      result.current.addConnection('note1', 'note2')
      result.current.addConnection('note1', 'note3')
    })

    const connected = result.current.getConnectedNotes('note1')
    expect(connected).toHaveLength(2)
    expect(connected).toContain('note2')
    expect(connected).toContain('note3')
  })
})