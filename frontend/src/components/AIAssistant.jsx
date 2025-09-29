import { useState } from 'react'
import { useNotesContext } from '../context/NotesContext'

const AIAssistant = () => {
  const {
    notes,
    selectedNotes,
    createAINoteFromPrompt,
    generateQuestions,
    isGeneratingAI,
    getConnectedNotes
  } = useNotesContext()

  const [question, setQuestion] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [aiMode, setAiMode] = useState('question')
  const [generatedQuestions, setGeneratedQuestions] = useState([])


  // Get all notes connected to selected notes
  const getContextNotes = () => {
    if (!selectedNotes || selectedNotes.length === 0) return []

    const contextNotes = new Set()
    selectedNotes.forEach(noteId => {
      const note = notes.find(n => n.id === noteId)
      if (note) contextNotes.add(note)

      const connected = getConnectedNotes(noteId)
      connected.forEach(connectedId => {
        const connectedNote = notes.find(n => n.id === connectedId)
        if (connectedNote) contextNotes.add(connectedNote)
      })
    })

    return Array.from(contextNotes)
  }

  const handleGenerateNote = async () => {
    if (!question.trim()) return

    try {
      await createAINoteFromPrompt(question, aiMode)
      setQuestion('')
    } catch (error) {
      console.error('Error generating AI note:', error)
    }
  }

  const handleSummarize = async () => {
    try {
      await createAINoteFromPrompt('', 'summarize')
    } catch (error) {
      console.error('Error summarizing notes:', error)
    }
  }

  const handleGenerateQuestions = async () => {
    if (selectedNotes.length === 0) {
      alert('Please select a note to generate questions from')
      return
    }

    try {
      const note = notes.find(n => n.id === selectedNotes[0])
      if (!note) return

      const result = await generateQuestions(note.content, note.title)
      setGeneratedQuestions(result.questions || [])
    } catch (error) {
      console.error('Error generating questions:', error)
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        className="canvas-button"
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: '#4CAF50',
          color: 'white'
        }}
        onClick={() => setShowPanel(!showPanel)}
      >
        🤖 AI Assistant
      </button>

      {/* AI Panel */}
      {showPanel && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 20,
            width: 350,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: 20,
            zIndex: 100
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 15, fontSize: 18 }}>
            AI Note Assistant
          </h3>

          {/* Mode Selector */}
          <div style={{ marginBottom: 15 }}>
            <button
              onClick={() => setAiMode('question')}
              style={{
                padding: '6px 12px',
                marginRight: 8,
                background: aiMode === 'question' ? '#4CAF50' : '#f0f0f0',
                color: aiMode === 'question' ? 'white' : 'black',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Answer Question
            </button>
            <button
              onClick={() => setAiMode('summarize')}
              style={{
                padding: '6px 12px',
                marginRight: 8,
                background: aiMode === 'summarize' ? '#4CAF50' : '#f0f0f0',
                color: aiMode === 'summarize' ? 'white' : 'black',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Summarize
            </button>
            <button
              onClick={() => setAiMode('expand')}
              style={{
                padding: '6px 12px',
                background: aiMode === 'expand' ? '#4CAF50' : '#f0f0f0',
                color: aiMode === 'expand' ? 'white' : 'black',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Expand
            </button>
          </div>

          {/* Context Indicator */}
          {selectedNotes && selectedNotes.length > 0 && (
            <div
              style={{
                padding: 10,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 12,
                color: 'white'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: 6 }}>
                🔗 Connected Knowledge Context
              </div>
              <div style={{ opacity: 0.95, fontSize: 11 }}>
                Using {selectedNotes.length} selected note{selectedNotes.length > 1 ? 's' : ''}
                {getContextNotes().length > selectedNotes.length &&
                  ` + ${getContextNotes().length - selectedNotes.length} connected note${getContextNotes().length - selectedNotes.length > 1 ? 's' : ''}`
                }
              </div>
              <div style={{
                marginTop: 6,
                fontSize: 10,
                opacity: 0.85,
                fontStyle: 'italic'
              }}>
                AI will use content from all connected notes as context
              </div>
            </div>
          )}

          {/* Input Area */}
          {aiMode !== 'summarize' && (
            <>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  aiMode === 'question'
                    ? "Ask a question to generate a note..."
                    : "Enter a topic to expand on..."
                }
                style={{
                  width: '100%',
                  height: 80,
                  padding: 10,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: 14
                }}
              />
              <button
                onClick={handleGenerateNote}
                disabled={isGeneratingAI || !question.trim()}
                style={{
                  width: '100%',
                  padding: 10,
                  marginTop: 10,
                  background: isGeneratingAI ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isGeneratingAI ? 'Generating...' : 'Generate Note'}
              </button>
            </>
          )}

          {/* Summarize Mode */}
          {aiMode === 'summarize' && (
            <>
              <p style={{ fontSize: 14, color: '#666' }}>
                Select notes on the canvas, then click summarize to create a summary note.
              </p>
              <button
                onClick={handleSummarize}
                disabled={isGeneratingAI || getContextNotes().length === 0}
                style={{
                  width: '100%',
                  padding: 10,
                  marginTop: 10,
                  background: isGeneratingAI ? '#ccc' : '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isGeneratingAI ? 'Summarizing...' : 'Summarize Selected Notes'}
              </button>
            </>
          )}

          {/* Generate Questions */}
          <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #eee' }}>
            <button
              onClick={handleGenerateQuestions}
              disabled={isGeneratingAI || selectedNotes.length === 0}
              style={{
                width: '100%',
                padding: 8,
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isGeneratingAI ? 'not-allowed' : 'pointer'
              }}
            >
              Generate Follow-up Questions
            </button>
          </div>

          {/* Generated Questions List */}
          {generatedQuestions.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Suggested Questions:</h4>
              {generatedQuestions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    padding: 8,
                    margin: '4px 0',
                    background: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div style={{ marginTop: 15, fontSize: 11, color: '#999' }}>
            💡 Tip: Connect notes to use them as context for better AI responses
          </div>
        </div>
      )}
    </>
  )
}

export default AIAssistant