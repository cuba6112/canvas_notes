import { useState } from 'react'
import { useNotesContext } from '../context/NotesContext'

const Toolbar = ({ minimapVisible, onToggleMinimap }) => {
  const {
    selectedNotes,
    deleteSelectedNotes,
    duplicateNote,
    focusOnSelectedNotes,
    resetView,
    startConnection,
    isConnecting,
    centerOnNotes,
    notes,
    createNote
  } = useNotesContext()

  const [showBulkActions, setShowBulkActions] = useState(false)

  const handleBulkDelete = async () => {
    if (selectedNotes.length === 0) return

    const confirmed = confirm(`Delete ${selectedNotes.length} selected notes? This cannot be undone.`)
    if (confirmed) {
      try {
        await deleteSelectedNotes()
      } catch (error) {
        console.error('Failed to delete notes:', error)
      }
    }
  }

  const handleDuplicate = async () => {
    if (selectedNotes.length !== 1) return

    try {
      await duplicateNote(selectedNotes[0])
    } catch (error) {
      console.error('Failed to duplicate note:', error)
    }
  }

  const handleFitToScreen = () => {
    if (notes.length > 0) {
      centerOnNotes(notes)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '8px 12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      zIndex: 100,
      backdropFilter: 'blur(8px)'
    }}>
      {/* Add Note Button */}
      <button
        onClick={() => createNote()}
        style={{
          padding: '8px 12px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        title="Add new note"
      >
        + Note
      </button>

      {/* View Controls */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={resetView}
          style={{
            padding: '8px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          title="Reset view (Zoom 100%, Center)"
        >
          ⟲
        </button>

        <button
          onClick={handleFitToScreen}
          style={{
            padding: '8px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          title="Fit all notes to screen"
        >
          ⛶
        </button>

        <button
          onClick={onToggleMinimap}
          style={{
            padding: '8px',
            background: minimapVisible ? '#e3f2fd' : '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            color: minimapVisible ? '#1976d2' : '#666'
          }}
          title={minimapVisible ? 'Hide minimap' : 'Show minimap'}
        >
          🗺️
        </button>
      </div>

      {/* Connection Tool */}
      <button
        onClick={() => {
          if (selectedNotes.length > 0) {
            startConnection()
          }
        }}
        disabled={selectedNotes.length === 0}
        style={{
          padding: '8px 12px',
          background: isConnecting ? '#FF9800' : selectedNotes.length > 0 ? '#2196F3' : '#e9ecef',
          color: isConnecting || selectedNotes.length > 0 ? 'white' : '#666',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: selectedNotes.length > 0 ? 'pointer' : 'not-allowed'
        }}
        title={isConnecting ? 'Click target note to connect' : 'Select a note first, then click to start connecting'}
      >
        {isConnecting ? '🔗 Connecting...' : '🔗 Connect'}
      </button>

      {/* Selection Info & Actions */}
      {selectedNotes.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: '8px',
          borderLeft: '1px solid #e9ecef'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#666',
            fontWeight: '500'
          }}>
            {selectedNotes.length} selected
          </span>

          <div style={{ display: 'flex', gap: '4px' }}>
            {selectedNotes.length === 1 && (
              <button
                onClick={handleDuplicate}
                style={{
                  padding: '6px 8px',
                  background: '#e3f2fd',
                  color: '#1976d2',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                title="Duplicate selected note"
              >
                Copy
              </button>
            )}

            <button
              onClick={focusOnSelectedNotes}
              style={{
                padding: '6px 8px',
                background: '#e8f5e9',
                color: '#2e7d32',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Focus on selected notes"
            >
              Focus
            </button>

            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              style={{
                padding: '6px 8px',
                background: '#fff3e0',
                color: '#f57c00',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="More actions"
            >
              ⋯
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Dropdown */}
      {showBulkActions && selectedNotes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '4px',
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          padding: '4px',
          minWidth: '140px',
          zIndex: 1000
        }}>
          <button
            onClick={() => {
              handleBulkDelete()
              setShowBulkActions(false)
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              fontSize: '12px',
              color: '#dc3545',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.target.style.background = '#ffeaea'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            🗑 Delete Selected
          </button>
        </div>
      )}
    </div>
  )
}

export default Toolbar