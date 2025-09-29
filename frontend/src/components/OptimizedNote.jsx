import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import debounce from 'lodash/debounce'
import { logError, getUserErrorMessage } from '../utils/errorHandling'

const OptimizedNote = memo(({
  note,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  onDragChange,
  levelOfDetail = { level: 'high', renderText: true, renderShadows: true, renderDetails: true }
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [title, setTitle] = useState(note.title || '')
  const [content, setContent] = useState(note.content || '')
  const [noteSize, setNoteSize] = useState({
    width: note.dimensions?.width || 250,
    height: note.dimensions?.height || 200
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

  const groupRef = useRef()
  const contentRef = useRef()
  const textareaRef = useRef()
  const titleRef = useRef()

  // Memoized position for performance
  const position = { x: note.position?.x ?? 0, y: note.position?.y ?? 0 }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onUpdate({ ...note, title, content })
    } catch (error) {
      logError(error, { noteId: note.id, title, content })
      console.error('Failed to save note:', getUserErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
    setIsEditing(false)
  }, [title, content, note, onUpdate])

  const debouncedSave = useCallback(
    debounce(async () => {
      if (title !== note.title || content !== note.content) {
        setIsSaving(true)
        try {
          await onUpdate({ ...note, title, content })
        } catch (error) {
          logError(error, { noteId: note.id, autoSave: true })
        } finally {
          setIsSaving(false)
        }
      }
    }, 500),
    [title, content, note, onUpdate]
  )

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
    } else if ((e.key === 'Enter' && e.metaKey) || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }, [handleSave])

  const closeContextMenu = () => {
    setShowContextMenu(false)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showContextMenu && !e.target.closest('.context-menu')) {
        closeContextMenu()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showContextMenu])

  // Low detail rendering for performance
  if (levelOfDetail.level === 'low') {
    return (
      <Group
        ref={groupRef}
        x={position.x}
        y={position.y}
        draggable={!isEditing}
        onDragStart={() => {
          setIsDragging(true)
          onDragChange?.(true)
          onSelect?.()
        }}
        onDragEnd={async (e) => {
          const newPosition = {
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y())
          }
          setIsDragging(false)
          onDragChange?.(false)
          try {
            await onUpdate({ ...note, position: newPosition })
          } catch (error) {
            logError(error, { noteId: note.id, newPosition })
            e.target.position({ x: note.position.x, y: note.position.y })
          }
        }}
      >
        <Rect
          width={noteSize.width}
          height={noteSize.height}
          fill={note.color || '#ffffff'}
          stroke={isSelected ? '#4CAF50' : '#e0e0e0'}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={4}
          onClick={() => onSelect?.()}
        />
        {levelOfDetail.renderText && (
          <Text
            x={8}
            y={8}
            text={note.title || 'Untitled'}
            fontSize={12}
            fill="#333"
            width={noteSize.width - 16}
            height={20}
            ellipsis
          />
        )}
      </Group>
    )
  }

  // High detail rendering with full HTML content
  return (
    <Group
      ref={groupRef}
      x={position.x}
      y={position.y}
      draggable={!isEditing && !showContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragStart={(e) => {
        setIsDragging(true)
        onDragChange?.(true)
        onSelect?.()
        e.target.moveToTop()
        if (levelOfDetail.renderDetails) {
          e.target.to({
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 0.1
          })
        }
      }}
      onDragEnd={async (e) => {
        const newPosition = {
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y())
        }
        setIsDragging(false)
        onDragChange?.(false)

        try {
          await onUpdate({ ...note, position: newPosition })
        } catch (error) {
          logError(error, { noteId: note.id, newPosition })
          e.target.position({ x: note.position.x, y: note.position.y })
        }

        if (levelOfDetail.renderDetails) {
          e.target.to({
            scaleX: 1,
            scaleY: 1,
            duration: 0.1
          })
        }
      }}
    >
      {/* Background Rect */}
      <Rect
        width={noteSize.width}
        height={noteSize.height}
        fill={isDragging ? (note.color || '#ffffff') : 'transparent'}
        stroke={isDragging ? (isSelected ? "rgba(99, 102, 241, 0.4)" : "rgba(0, 0, 0, 0.08)") : 'transparent'}
        strokeWidth={isDragging ? 1 : 0}
        shadowColor={levelOfDetail.renderShadows && isDragging ? "rgba(0, 0, 0, 0.04)" : 'transparent'}
        shadowBlur={levelOfDetail.renderShadows && isDragging ? (isSelected ? 8 : 4) : 0}
        shadowOffsetX={0}
        shadowOffsetY={levelOfDetail.renderShadows && isDragging ? (isSelected ? 3 : 1) : 0}
        shadowOpacity={levelOfDetail.renderShadows && isDragging ? 1 : 0}
        cornerRadius={8}
        onClick={() => onSelect?.()}
        onDblClick={() => setIsEditing(true)}
        opacity={isDragging ? 0.8 : 0.01}
      />

      {/* Resize handle - only show in high detail */}
      {levelOfDetail.renderDetails && isSelected && !isEditing && !isDragging && (
        <Rect
          x={noteSize.width - 8}
          y={noteSize.height - 8}
          width={8}
          height={8}
          fill="rgba(99, 102, 241, 0.6)"
          cornerRadius={1}
          draggable={true}
          onDragMove={(e) => {
            const newWidth = Math.max(200, noteSize.width + e.target.x())
            const newHeight = Math.max(150, noteSize.height + e.target.y())
            setNoteSize({ width: newWidth, height: newHeight })
            e.target.position({ x: 0, y: 0 })
          }}
          onDragEnd={async () => {
            try {
              await onUpdate({ ...note, dimensions: noteSize })
            } catch (error) {
              logError(error, { noteId: note.id, dimensions: noteSize })
              setNoteSize({ width: note.dimensions?.width || 300, height: note.dimensions?.height || 200 })
            }
          }}
          listening={!isEditing}
        />
      )}

      {/* Main note content - only render in medium/high detail */}
      {levelOfDetail.renderText && !isDragging && (
        <Html>
          <div
            style={{
              width: noteSize.width + 'px',
              minHeight: noteSize.height + 'px',
              position: 'relative',
              background: note.color || '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(0, 0, 0, 0.08)'}`,
              boxShadow: levelOfDetail.renderShadows && isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: levelOfDetail.renderDetails ? 'all 0.15s ease' : 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: isEditing ? 'auto' : 'auto'
            }}
            onClick={(e) => {
              if (!isEditing && !e.target.closest('button') && !e.target.closest('.context-menu')) {
                e.stopPropagation()
                setIsEditing(true)
              }
            }}
          >
            {/* Content rendering based on detail level */}
            {isEditing ? (
              <>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    debouncedSave()
                  }}
                  placeholder="Untitled"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'rgba(0, 0, 0, 0.9)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    padding: '16px 16px 8px 16px',
                    margin: 0,
                    letterSpacing: '-0.01em',
                    pointerEvents: 'auto'
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setIsEditing(false)}
                />
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    debouncedSave()
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setIsEditing(false)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    border: 'none',
                    background: 'transparent',
                    resize: 'none',
                    outline: 'none',
                    padding: title ? '0 16px 16px 16px' : '16px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: 'rgba(0, 0, 0, 0.8)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    flex: 1,
                    pointerEvents: 'auto'
                  }}
                  placeholder={title ? "Add content..." : "Click to add content..."}
                  autoFocus
                />
              </>
            ) : (
              <div
                ref={contentRef}
                style={{
                  padding: '16px',
                  flex: 1,
                  minHeight: '60px',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              >
                {title && (
                  <h2 style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'rgba(0, 0, 0, 0.9)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    letterSpacing: '-0.01em'
                  }}>
                    {title}
                  </h2>
                )}
                {content ? (
                  levelOfDetail.renderDetails ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p style={{
                            margin: '0 0 8px 0',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: 'rgba(0, 0, 0, 0.8)'
                          }}>
                            {children}
                          </p>
                        )
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: 'rgba(0, 0, 0, 0.8)'
                    }}>
                      {content.length > 100 ? content.substring(0, 100) + '...' : content}
                    </div>
                  )
                ) : (
                  <span style={{
                    color: 'rgba(0, 0, 0, 0.4)',
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    {title ? "Add content..." : "Click to add content..."}
                  </span>
                )}
              </div>
            )}

            {/* Three dots menu button - show in medium/high detail */}
            {(levelOfDetail.level === 'medium' || levelOfDetail.level === 'high') && (isHovered || isSelected) && !isEditing && !isDragging && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowContextMenu(!showContextMenu)
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 10,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(240, 240, 240, 0.95)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.9)'}
              >
                ⋯
              </button>
            )}

            {/* Context Menu */}
            {showContextMenu && (
              <div
                className="context-menu"
                style={{
                  position: 'absolute',
                  top: '32px',
                  right: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  padding: '4px',
                  minWidth: '180px',
                  zIndex: 1000,
                  fontSize: '13px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  pointerEvents: 'auto'
                }}
              >
                {/* Edit */}
                <div
                  onClick={() => {
                    setIsEditing(true)
                    closeContextMenu()
                  }}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.1s ease',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.04)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Edit
                </div>

                {/* Copy */}
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(`${title}\n\n${content}`)
                    closeContextMenu()
                  }}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.1s ease',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.04)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Copy
                </div>

                <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '2px 4px' }}></div>

                {/* Color picker section */}
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(0, 0, 0, 0.5)', marginBottom: '4px' }}>
                    Note Color
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['#ffffff', '#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff'].map(color => (
                      <div
                        key={color}
                        onClick={() => {
                          onUpdate({ ...note, color })
                          closeContextMenu()
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: color,
                          border: `2px solid ${note.color === color ? 'rgba(99, 102, 241, 0.6)' : 'rgba(0, 0, 0, 0.1)'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'border-color 0.1s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '2px 4px' }}></div>

                {/* Delete */}
                <div
                  onClick={() => {
                    if (window.confirm('Delete this note?')) {
                      onDelete(note.id)
                    }
                    closeContextMenu()
                  }}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.1s ease',
                    fontSize: '13px',
                    color: '#dc2626'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.04)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Delete
                </div>
              </div>
            )}

            {/* Saving indicator */}
            {isSaving && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                fontSize: '10px',
                color: 'rgba(99, 102, 241, 0.7)',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                Saving...
              </div>
            )}
          </div>
        </Html>
      )}
    </Group>
  )
})

OptimizedNote.displayName = 'OptimizedNote'

export default OptimizedNote