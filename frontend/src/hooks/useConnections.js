import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export const useConnections = () => {
  const [connections, setConnections] = useState([])

  const addConnection = useCallback((fromId, toId) => {
    // Prevent duplicate connections and self-connections
    if (fromId === toId) return null

    const exists = connections.some(conn =>
      (conn.from === fromId && conn.to === toId) ||
      (conn.from === toId && conn.to === fromId)
    )

    if (exists) return null

    const newConnection = {
      id: uuidv4(),
      from: fromId,
      to: toId,
      createdAt: new Date().toISOString()
    }
    setConnections(prev => [...prev, newConnection])
    return newConnection
  }, [connections])

  const removeConnection = useCallback((connectionId) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId))
  }, [])

  const removeConnectionsBetween = useCallback((noteId1, noteId2) => {
    setConnections(prev => prev.filter(conn =>
      !((conn.from === noteId1 && conn.to === noteId2) ||
        (conn.from === noteId2 && conn.to === noteId1))
    ))
  }, [])

  const removeConnectionsForNote = useCallback((noteId) => {
    setConnections(prev => prev.filter(conn =>
      conn.from !== noteId && conn.to !== noteId
    ))
  }, [])

  const getConnectedNotes = useCallback((noteId) => {
    return connections
      .filter(conn => conn.from === noteId || conn.to === noteId)
      .map(conn => conn.from === noteId ? conn.to : conn.from)
  }, [connections])

  const getConnectionsForNote = useCallback((noteId) => {
    return connections.filter(conn => conn.from === noteId || conn.to === noteId)
  }, [connections])

  const isConnected = useCallback((noteId1, noteId2) => {
    return connections.some(conn =>
      (conn.from === noteId1 && conn.to === noteId2) ||
      (conn.from === noteId2 && conn.to === noteId1)
    )
  }, [connections])

  // Get all notes that are transitively connected to a given note
  const getConnectedSubgraph = useCallback((noteId, maxDepth = 3) => {
    const visited = new Set()
    const queue = [{ id: noteId, depth: 0 }]
    const result = new Set()

    while (queue.length > 0) {
      const { id, depth } = queue.shift()

      if (visited.has(id) || depth > maxDepth) continue
      visited.add(id)
      result.add(id)

      const connected = getConnectedNotes(id)
      connected.forEach(connectedId => {
        if (!visited.has(connectedId)) {
          queue.push({ id: connectedId, depth: depth + 1 })
        }
      })
    }

    return Array.from(result)
  }, [getConnectedNotes])

  const getShortestPath = useCallback((startId, endId) => {
    if (startId === endId) return [startId]

    const visited = new Set()
    const queue = [{ id: startId, path: [startId] }]

    while (queue.length > 0) {
      const { id, path } = queue.shift()

      if (visited.has(id)) continue
      visited.add(id)

      if (id === endId) return path

      const connected = getConnectedNotes(id)
      connected.forEach(connectedId => {
        if (!visited.has(connectedId)) {
          queue.push({ id: connectedId, path: [...path, connectedId] })
        }
      })
    }

    return null // No path found
  }, [getConnectedNotes])

  return {
    connections,
    addConnection,
    removeConnection,
    removeConnectionsBetween,
    removeConnectionsForNote,
    getConnectedNotes,
    getConnectionsForNote,
    isConnected,
    getConnectedSubgraph,
    getShortestPath,
    setConnections
  }
}