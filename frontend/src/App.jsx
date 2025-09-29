import { useState } from 'react'
import Canvas from './components/Canvas.jsx'
import Sidebar from './components/Sidebar.jsx'
import { NotesProvider, useNotesContext } from './context/NotesContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function App() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <ErrorBoundary>
      <NotesProvider>
        <AppContent searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </NotesProvider>
    </ErrorBoundary>
  )
}

function AppContent({ searchTerm, onSearchChange }) {
  const { searchNotes } = useNotesContext()

  const filteredNotes = searchNotes(searchTerm)

  return (
    <div className="App">
      <Sidebar
        notes={filteredNotes}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
      />
      <div className="main-content">
        <h1>Canvas Notes App</h1>
        <div className="canvas-container">
          <Canvas filteredNotes={filteredNotes} />
        </div>
      </div>
    </div>
  )
}

export default App