import { useState } from 'react'
import './ShortcutsHelp.css'

/**
 * Keyboard shortcuts help modal
 * Displays all available keyboard shortcuts organized by category
 */
const ShortcutsHelp = ({ isVisible, onClose, shortcuts }) => {
  const [searchTerm, setSearchTerm] = useState('')

  if (!isVisible) return null

  // Filter shortcuts based on search term
  const filteredShortcuts = Object.entries(shortcuts).reduce((acc, [category, shortcuts]) => {
    const filteredCategoryShortcuts = Object.entries(shortcuts).filter(([action, description]) =>
      action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (filteredCategoryShortcuts.length > 0) {
      acc[category] = Object.fromEntries(filteredCategoryShortcuts)
    }

    return acc
  }, {})

  // Format key combinations for display
  const formatKeyCombo = (keyCombo) => {
    return keyCombo
      .replace(/Ctrl\/Cmd/g, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
      .replace(/Shift/g, '⇧')
      .replace(/Alt/g, navigator.platform.includes('Mac') ? '⌥' : 'Alt')
      .replace(/Arrow Keys/g, '↑↓←→')
      .replace(/Plus/g, '+')
      .replace(/Minus/g, '−')
      .replace(/Space/g, '␣')
  }

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">
            <span className="shortcuts-icon">⌨️</span>
            Keyboard Shortcuts
          </h2>
          <button
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close shortcuts help"
          >
            ×
          </button>
        </div>

        <div className="shortcuts-search">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="shortcuts-search-input"
            autoFocus
          />
        </div>

        <div className="shortcuts-content">
          {Object.keys(filteredShortcuts).length === 0 ? (
            <div className="shortcuts-empty">
              <p>No shortcuts found matching "{searchTerm}"</p>
            </div>
          ) : (
            Object.entries(filteredShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category} className="shortcuts-category">
                <h3 className="shortcuts-category-title">{category}</h3>
                <div className="shortcuts-list">
                  {Object.entries(categoryShortcuts).map(([action, description]) => (
                    <div key={action} className="shortcuts-item">
                      <div className="shortcuts-keys">
                        {formatKeyCombo(action).split(' + ').map((key, index, array) => (
                          <span key={index}>
                            <kbd className="shortcuts-key">{key}</kbd>
                            {index < array.length - 1 && <span className="shortcuts-plus">+</span>}
                          </span>
                        ))}
                      </div>
                      <div className="shortcuts-description">{description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shortcuts-footer">
          <div className="shortcuts-tip">
            <strong>💡 Tip:</strong> Most shortcuts work when not editing text.
            Press <kbd>Escape</kbd> to stop editing and use shortcuts.
          </div>
          <div className="shortcuts-actions">
            <button
              className="shortcuts-btn shortcuts-btn-secondary"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
            <button
              className="shortcuts-btn shortcuts-btn-primary"
              onClick={onClose}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShortcutsHelp