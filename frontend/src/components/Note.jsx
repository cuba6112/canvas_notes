import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { Html } from 'react-konva-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import debounce from 'lodash/debounce'
import { logError, getUserErrorMessage } from '../utils/errorHandling'
import { sanitizeMarkdown, sanitizeClipboardContent, sanitizeUserInput, monitorContentSecurity } from '../utils/sanitization'
import { usePerformanceMonitor } from '../hooks/useMonitoring'
import { measurePerformance } from '../utils/monitoring'
import { useMomentumDrag } from '../hooks/useMomentumDrag'

const Note = ({
  note,
  onUpdate,
  onDelete,
  onConnect,
  isSelected,
  isMultiSelected = false,
  isDragLeader = false,
  bulkDragStyle = {},
  onSelect,
  zIndex,
  isDragging: externalDragging,
  onDragChange,
  // Bulk drag props
  selectedNoteIds = [],
  getNotePositions,
  getStageRef,
  onBulkDragInit,
  onBulkPositionUpdate,
  onBulkMomentum,
  onBulkDragComplete,
  onBulkNotesUpdate,
  isBulkDragging = false,
  // Keyboard shortcuts integration
  onEditingModeChange
}) => {
  // Helper function to safely update notes - now all updates go through useNotes.js validation
  const safeUpdate = useCallback((updatedNote) => {
    onUpdate(updatedNote)
  }, [onUpdate])
  // Performance monitoring
  const { trackComponentError, trackComponentAction } = usePerformanceMonitor(`Note_${note.id}`)

  // Momentum-based drag system
  const {
    handleDragStart: momentumDragStart,
    handleDragMove: momentumDragMove,
    handleDragEnd: momentumDragEnd,
    isAnimating: isMomentumAnimating,
    stopMomentum,
    calculateVelocity
  } = useMomentumDrag()

  // Enhanced position update handler for momentum system
  const handlePositionUpdate = useCallback((newPosition) => {
    const updatedNote = {
      ...note,
      position: newPosition,
      updatedAt: new Date().toISOString()
    }
    safeUpdate(updatedNote)
  }, [note, safeUpdate])

  // Enhanced drag completion handler
  const handleDragComplete = useCallback((e, finalPosition = null) => {
    setIsDragging(false)
    onDragChange?.(false)

    const position = finalPosition || {
      x: Math.round(e.target.x()),
      y: Math.round(e.target.y())
    }

    // Validate coordinates before proceeding
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) ||
        Math.abs(position.x) > 10000 || Math.abs(position.y) > 10000) {
      console.warn('🚫 Invalid drag coordinates detected, aborting update:', position)
      // Reset to original position
      e.target.position({ x: note.position.x, y: note.position.y })
      return
    }

    console.log('🖱️ Note.jsx: Updating position for note ID:', note.id, 'to:', position)
    handlePositionUpdate(position)
  }, [note, onDragChange, handlePositionUpdate])

  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [title, setTitle] = useState(sanitizeUserInput(note.title || '', { maxLength: 200 }))
  const [content, setContent] = useState(sanitizeUserInput(note.content || '', { maxLength: 50000, allowMarkdown: true }))
  const [noteSize, setNoteSize] = useState({
    width: note.dimensions?.width || 250,
    height: note.dimensions?.height || 200
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

  // Track editing mode for keyboard shortcuts
  useEffect(() => {
    onEditingModeChange?.(isEditing)
  }, [isEditing, onEditingModeChange])

  // Dynamic color calculation for the three-dots menu button
  const getMenuButtonColors = useCallback((noteColor) => {
    // Convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 }
    }

    // Calculate luminance (0-1, where 0 is black, 1 is white)
    const getLuminance = (r, g, b) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    }

    // Get note background color
    const bgColor = noteColor || '#ffffff'
    const rgb = hexToRgb(bgColor)
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b)

    // Determine if background is light or dark (threshold: 0.5)
    const isLightBackground = luminance > 0.5

    if (isLightBackground) {
      // For light backgrounds: use darker button colors
      return {
        normal: {
          background: 'rgba(0, 0, 0, 0.08)',
          color: 'rgba(0, 0, 0, 0.7)'
        },
        hover: {
          background: 'rgba(0, 0, 0, 0.12)',
          color: 'rgba(0, 0, 0, 0.8)'
        }
      }
    } else {
      // For dark backgrounds: use lighter button colors
      return {
        normal: {
          background: 'rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.8)'
        },
        hover: {
          background: 'rgba(255, 255, 255, 0.25)',
          color: 'rgba(255, 255, 255, 0.9)'
        }
      }
    }
  }, [])

  const menuButtonColors = getMenuButtonColors(note.color)

  const groupRef = useRef()
  const contentRef = useRef()
  const textareaRef = useRef()
  const titleRef = useRef()

  // Track selection state changes

  // Optimized auto-resize with RAF for better performance
  const autoResizeTextarea = useCallback((element) => {
    if (!element || !isEditing) return

    // Use requestAnimationFrame to avoid layout thrashing
    requestAnimationFrame(() => {
      // Reset height to calculate new height
      element.style.height = 'auto'
      const scrollHeight = element.scrollHeight

      // Set a reasonable height with padding
      const newHeight = Math.max(80, Math.min(400, scrollHeight))
      element.style.height = newHeight + 'px'

      // Only update note size if it's a significant change and user hasn't manually resized recently
      const contentHeight = newHeight + 60 // padding for title and margins
      if (Math.abs(contentHeight - noteSize.height) > 30 && !isResizing) {
        const newNoteSize = {
          ...noteSize,
          height: Math.max(150, Math.min(500, contentHeight))
        }
        setNoteSize(newNoteSize)
      }
    })
  }, [noteSize.height, isEditing, isResizing])

  const handleSave = useCallback(measurePerformance('note_save', async () => {
    setIsSaving(true)
    try {
      // Use fresh note data to avoid stale ID references
      const updatedNote = {
        ...note,
        title,
        content,
        updatedAt: new Date().toISOString()
      }
      console.log('💾 Note.jsx: Saving note with ID:', updatedNote.id)
      await onUpdate(updatedNote)
      trackComponentAction('save', { noteId: note.id, hasTitle: !!title, contentLength: content.length })
    } catch (error) {
      trackComponentError(error, { action: 'save', noteId: note.id })
      logError(error, { noteId: note.id, title, content })
      console.error('Failed to save note:', getUserErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
    setIsEditing(false)
  }), [title, content, note, onUpdate, trackComponentError, trackComponentAction])

  // Auto-resize when content or editing state changes
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Auto-resize when entering edit mode
      setTimeout(() => {
        autoResizeTextarea(textareaRef.current)
      }, 0)
    } else if (!isEditing && contentRef.current) {
      // Adjust size based on rendered content when not editing
      const height = Math.max(150, Math.min(500, contentRef.current.clientHeight + 40))
      if (Math.abs(height - noteSize.height) > 20) {
        const newDimensions = { width: noteSize.width, height }
        setNoteSize(newDimensions)

        // Allow dimension updates even for temporary IDs (position-related)
        safeUpdate({ ...note, dimensions: newDimensions })
      }
    }
  }, [content, isEditing, autoResizeTextarea, safeUpdate])

  // Optimized debounced save with better performance and error handling
  const debouncedSave = useCallback(
    debounce(async () => {
      if (title !== note.title || content !== note.content) {
        setIsSaving(true)
        try {
          // Use fresh note data to avoid stale ID references
          const updatedNote = {
            ...note,
            title,
            content,
            updatedAt: new Date().toISOString()
          }
          console.log('💾 Note.jsx: Auto-saving note with ID:', updatedNote.id)
          await safeUpdate(updatedNote)
        } catch (error) {
          logError(error, { noteId: note.id, action: 'auto_save' })
          console.error('Error auto-saving note:', getUserErrorMessage(error))
        } finally {
          setIsSaving(false)
        }
      }
    }, 1000), // Increased from 500ms to 1000ms to reduce API calls
    [title, content, note.id, note.title, note.content, safeUpdate] // More specific dependencies
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
    } else if ((e.key === 'Enter' && e.metaKey) || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }

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

  // Set initial position when component mounts or note changes
  useEffect(() => {
    if (groupRef.current && note.position) {
      groupRef.current.position({
        x: note.position.x ?? 0,
        y: note.position.y ?? 0
      })
    }
  }, [note.id]) // Only when note ID changes (new note)

  return (
    <Group
      ref={groupRef}
      x={note.position?.x ?? 0}
      y={note.position?.y ?? 0}
      draggable={!isEditing && !showContextMenu}
      // Enhanced event handling for better reliability
      onMouseEnter={(e) => {
        setIsHovered(true)
        // Ensure the cursor changes to indicate interactivity
        if (e.target && e.target.getStage()) {
          e.target.getStage().container().style.cursor = 'pointer'
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        // Reset cursor
        if (e.target && e.target.getStage()) {
          e.target.getStage().container().style.cursor = 'default'
        }
      }}
      // Additional event for better reliability
      onMouseMove={(e) => {
        // Ensure hover state is maintained during movement
        if (!isHovered) {
          setIsHovered(true)
        }
      }}
      onDragStart={(e) => {
        setIsDragging(true)
        onDragChange?.(true)
        onSelect?.()
        e.target.moveToTop()

        // Initialize bulk drag if multi-selected
        if (isMultiSelected && selectedNoteIds.length > 1) {
          const notePositions = getNotePositions()
          onBulkDragInit?.(note.id, selectedNoteIds, notePositions)
        }

        // Use enhanced momentum drag start
        momentumDragStart(e, () => {
          trackComponentAction('drag_start')
        })
      }}
      onDragMove={(e) => {
        // Track drag movement for momentum calculation
        momentumDragMove(e)

        // Update follower positions if this is the drag leader
        if (isDragLeader && selectedNoteIds.length > 1) {
          const leaderPosition = e.target.position()
          onBulkPositionUpdate?.(leaderPosition, getStageRef, selectedNoteIds)
        }
      }}
      onDragEnd={(e) => {
        if (isDragLeader && selectedNoteIds.length > 1) {
          // Handle bulk drag completion with momentum
          const velocity = calculateVelocity()

          if (velocity.magnitude > 0.5) {
            // Apply momentum to all selected notes
            onBulkMomentum?.(velocity, selectedNoteIds, getStageRef, (finalPositions) => {
              // Complete bulk drag operation
              onBulkDragComplete?.(finalPositions, onBulkNotesUpdate)
              setIsDragging(false)
              onDragChange?.(false)
              trackComponentAction('bulk_drag_end')
            })
          } else {
            // No momentum, complete immediately
            const finalPosition = {
              x: Math.round(e.target.x()),
              y: Math.round(e.target.y())
            }
            const followerPositions = new Map()
            followerPositions.set(note.id, finalPosition)

            onBulkDragComplete?.(followerPositions, onBulkNotesUpdate)
            handleDragComplete(e, finalPosition)
            trackComponentAction('bulk_drag_end')
          }
        } else {
          // Single note drag - use enhanced momentum drag end
          momentumDragEnd(
            e,
            handlePositionUpdate,
            (event, finalPosition) => {
              handleDragComplete(event, finalPosition)
              trackComponentAction('drag_end')
            }
          )
        }
      }}
    >
      {/* Background Rect - Enhanced for better event handling with bulk drag styling */}
      <Rect
        width={noteSize.width}
        height={noteSize.height}
        fill={isDragging ? (note.color || '#ffffff') : 'transparent'}
        stroke={
          isDragging
            ? isMultiSelected
              ? bulkDragStyle.stroke || (isDragLeader ? '#4CAF50' : '#2196F3')
              : isSelected
                ? "rgba(99, 102, 241, 0.4)"
                : "rgba(0, 0, 0, 0.08)"
            : isMultiSelected && !isDragging
              ? 'rgba(33, 150, 243, 0.5)'
              : 'transparent'
        }
        strokeWidth={
          isDragging
            ? isMultiSelected
              ? bulkDragStyle.strokeWidth || 2
              : 1
            : isMultiSelected
              ? 1
              : 0
        }
        shadowColor={
          isDragging
            ? isMultiSelected
              ? bulkDragStyle.shadowColor || 'rgba(33, 150, 243, 0.3)'
              : "rgba(0, 0, 0, 0.04)"
            : 'transparent'
        }
        shadowBlur={
          isDragging
            ? isMultiSelected
              ? bulkDragStyle.shadowBlur || (isDragLeader ? 12 : 8)
              : isSelected ? 8 : 4
            : 0
        }
        shadowOffsetX={0}
        shadowOffsetY={isDragging ? (isSelected ? 3 : 1) : 0}
        shadowOpacity={isDragging ? 1 : 0}
        cornerRadius={8}
        onClick={() => onSelect?.()}
        onDblClick={() => setIsEditing(true)}
        // Enhanced opacity for bulk drag operations
        opacity={
          isDragging
            ? isMultiSelected
              ? bulkDragStyle.opacity || (isDragLeader ? 1 : 0.8)
              : 0.8
            : isMultiSelected
              ? 0.9
              : 0.3
        }
        // Enhanced event handling for the background rect
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        // Ensure this rect can receive events even when mostly transparent
        listening={true}
      />


      {/* Resize handle */}
      {isSelected && !isEditing && !isDragging && (
        <Rect
          x={noteSize.width - 8}
          y={noteSize.height - 8}
          width={8}
          height={8}
          fill="rgba(99, 102, 241, 0.6)"
          cornerRadius={1}
          draggable={true}
          onDragStart={() => setIsResizing(true)}
          onDragMove={(e) => {
            const newWidth = Math.max(200, noteSize.width + e.target.x())
            const newHeight = Math.max(150, noteSize.height + e.target.y())
            setNoteSize({ width: newWidth, height: newHeight })
            e.target.position({ x: 0, y: 0 })
          }}
          onDragEnd={() => {
            setIsResizing(false)
            // Use fresh note data to avoid stale ID references
            const updatedNote = {
              ...note,
              dimensions: noteSize,
              updatedAt: new Date().toISOString()
            }
            console.log('📏 Note.jsx: Updating dimensions for note ID:', updatedNote.id)
            safeUpdate(updatedNote)
          }}
          listening={!isEditing}
        />
      )}

      {/* Main note content - Only visible when NOT dragging */}
      {!isDragging && (
        <Html>
          <div
            style={{
              width: noteSize.width + 'px',
              minHeight: noteSize.height + 'px',
              position: 'relative',
              background: note.color || '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(0, 0, 0, 0.08)'}`,
              boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: '32px', // Account for header
              // Critical fix: Allow pointer events for interaction but forward hover events
              pointerEvents: isEditing ? 'auto' : 'auto'
            }}
            onMouseEnter={(e) => {
              // Forward hover events to parent Group
              setIsHovered(true)
            }}
            onMouseLeave={(e) => {
              // Forward hover events to parent Group
              setIsHovered(false)
            }}
            onClick={(e) => {
              // Only handle clicks on the content area, not menu button
              if (!isEditing && !e.target.closest('button') && !e.target.closest('.context-menu')) {
                e.stopPropagation()
                setIsEditing(true)
              }
            }}
          >
            {/* Navigation Header */}
            <div
              className="note-header"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '32px',
                background: note.color ? `linear-gradient(180deg, ${note.color} 0%, ${note.color}aa 100%)` : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                pointerEvents: 'auto',
                userSelect: 'none'
              }}
            >
              {/* Drag handle */}
              <div
                className="drag-handle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  cursor: 'move',
                  padding: '4px 0'
                }}
                onMouseDown={(e) => {
                  // Only start drag if clicking on the drag handle area, not the input
                  if (!e.target.closest('input')) {
                    e.preventDefault()
                    const groupElement = groupRef.current
                    if (groupElement) {
                      groupElement.startDrag()
                    }
                  }
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: '2px',
                  opacity: 0.5,
                  cursor: 'move'
                }}>
                  <div style={{ width: '2px', height: '2px', backgroundColor: 'currentColor', borderRadius: '50%' }}></div>
                  <div style={{ width: '2px', height: '2px', backgroundColor: 'currentColor', borderRadius: '50%' }}></div>
                  <div style={{ width: '2px', height: '2px', backgroundColor: 'currentColor', borderRadius: '50%' }}></div>
                  <div style={{ width: '2px', height: '2px', backgroundColor: 'currentColor', borderRadius: '50%' }}></div>
                </div>
                <input
                  type="text"
                  value={title || ''}
                  onChange={(e) => {
                    const sanitizedTitle = sanitizeUserInput(e.target.value, { maxLength: 200 })
                    setTitle(sanitizedTitle)
                    debouncedSave()
                  }}
                  placeholder="Untitled"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: 'inherit',
                    flex: 1,
                    minWidth: 0,
                    padding: '2px 4px',
                    borderRadius: '3px',
                    transition: 'background 0.1s ease',
                    cursor: 'text'
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.target.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.boxShadow = 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {/* Fit to text button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (contentRef.current) {
                      const contentHeight = contentRef.current.scrollHeight + 60
                      const newSize = {
                        width: Math.max(200, Math.min(400, contentRef.current.scrollWidth + 40)),
                        height: Math.max(150, Math.min(500, contentHeight))
                      }
                      setNoteSize(newSize)
                      safeUpdate({ ...note, dimensions: newSize })
                    }
                  }}
                  style={{
                    width: '16px',
                    height: '16px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    opacity: 0.6,
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(0, 0, 0, 0.1)'
                    e.target.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.opacity = '0.6'
                  }}
                  title="Fit to text"
                >
                  ⟲
                </button>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this note?')) {
                      onDelete(note.id)
                    }
                  }}
                  style={{
                    width: '16px',
                    height: '16px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: 'rgba(239, 68, 68, 0.7)',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)'
                    e.target.style.color = 'rgba(239, 68, 68, 1)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.color = 'rgba(239, 68, 68, 0.7)'
                  }}
                  title="Close note"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Title and Content */}
            {isEditing ? (
              <>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const sanitizedTitle = sanitizeUserInput(e.target.value, { maxLength: 200 })
                    setTitle(sanitizedTitle)
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
                    const sanitizedContent = sanitizeUserInput(e.target.value, { maxLength: 50000, allowMarkdown: true })

                    // Security monitoring for suspicious content
                    monitorContentSecurity(sanitizedContent, { noteId: note.id, action: 'content_edit' })

                    setContent(sanitizedContent)
                    autoResizeTextarea(e.target)
                    debouncedSave()
                  }}
                  onKeyDown={handleKeyDown}
                  onInput={(e) => autoResizeTextarea(e.target)}
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
                  // Critical fix: Allow pointer events to pass through for hover detection
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                  // Ensure hover events bubble up
                }}
                onMouseLeave={(e) => {
                  // Ensure hover events bubble up
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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    disallowedElements={['script', 'iframe', 'object', 'embed', 'form', 'input', 'style']}
                    unwrapDisallowed={true}
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
                      ),
                      // Security: Override dangerous elements
                      script: () => null,
                      iframe: () => null,
                      object: () => null,
                      embed: () => null,
                      form: () => null,
                      input: () => null,
                      style: () => null,
                      // Secure link rendering
                      a: ({ href, children }) => {
                        // Validate URL security
                        const isSecure = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../'))
                        return isSecure ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
                            {children}
                          </a>
                        ) : (
                          <span style={{ color: '#666', textDecoration: 'line-through' }}>{children}</span>
                        )
                      }
                    }}
                  >
                    {sanitizeMarkdown(content)}
                  </ReactMarkdown>
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

            {/* Three dots menu button */}
            {(isHovered || isSelected) && !isEditing && (
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
                  background: menuButtonColors.normal.background,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: menuButtonColors.normal.color,
                  zIndex: 10,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  pointerEvents: 'auto',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = menuButtonColors.hover.background
                  e.target.style.color = menuButtonColors.hover.color
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = menuButtonColors.normal.background
                  e.target.style.color = menuButtonColors.normal.color
                  e.target.style.transform = 'scale(1)'
                }}
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
                  onClick={async () => {
                    try {
                      const safeContent = sanitizeClipboardContent(title, content)
                      await navigator.clipboard.writeText(safeContent)
                      closeContextMenu()
                    } catch (error) {
                      console.error('Failed to copy to clipboard:', error)
                      // Fallback: create temporary textarea for copy
                      const textarea = document.createElement('textarea')
                      textarea.value = sanitizeClipboardContent(title, content)
                      document.body.appendChild(textarea)
                      textarea.select()
                      document.execCommand('copy')
                      document.body.removeChild(textarea)
                      closeContextMenu()
                    }
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
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {[
                      '#ffffff', '#dbeafe', '#fef3c7', '#fce7f3',
                      '#ecfdf5', '#f3e8ff', '#fef2f2', '#f1f5f9'
                    ].map(color => (
                      <div
                        key={color}
                        onClick={() => {
                          // Use fresh note data to avoid stale ID references
                          const updatedNote = {
                            ...note,
                            color,
                            updatedAt: new Date().toISOString()
                          }
                          console.log('🎨 Note.jsx: Updating color for note ID:', updatedNote.id)
                          safeUpdate(updatedNote)
                          closeContextMenu()
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          background: color,
                          border: note.color === color ? '2px solid rgba(99, 102, 241, 0.8)' : '1px solid rgba(0, 0, 0, 0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '2px 4px' }}></div>

                {/* Delete */}
                <div
                  onClick={() => {
                    if (confirm('Delete this note?')) {
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
                    color: 'rgba(239, 68, 68, 0.9)',
                    transition: 'background 0.1s ease',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.06)'}
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
}

// Memoize Note component for better performance
export default memo(Note, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.levelOfDetail === nextProps.levelOfDetail &&
    prevProps.zIndex === nextProps.zIndex
  )
})