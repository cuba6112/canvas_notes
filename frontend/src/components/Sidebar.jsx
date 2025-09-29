const Sidebar = ({ notes = [], searchTerm, onSearchChange }) => {
  const handleSearch = (e) => {
    onSearchChange(e.target.value)
  }

  return (
    <div className="sidebar">
      <div style={{ padding: '15px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
          Notes ({notes.length})
        </h3>
      <input
        type="text"
        placeholder="Search notes..."
        value={searchTerm}
        onChange={handleSearch}
        style={{
          width: '100%',
          padding: 8,
          marginBottom: 15,
          border: '1px solid #ddd',
          borderRadius: 4,
          boxSizing: 'border-box'
        }}
      />
      <div>
        {notes.length === 0 ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>No notes found</p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              style={{
                marginBottom: 10,
                padding: 10,
                background: 'white',
                borderRadius: 4,
                border: '1px solid #e0e0e0',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                {note.title || 'Untitled'}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {note.content ?
                  `${note.content.substring(0, 60)}${note.content.length > 60 ? '...' : ''}` :
                  'No content'
                }
              </p>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}

export default Sidebar