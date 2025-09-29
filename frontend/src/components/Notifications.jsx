import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

const NotificationItem = ({ notification, onClose }) => {
  const { id, type, title, message, duration = 5000 } = notification

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const getTypeStyles = () => {
    const baseStyles = {
      padding: '16px',
      marginBottom: '12px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      minWidth: '320px',
      maxWidth: '420px',
      animation: 'slideIn 0.3s ease-out',
      position: 'relative',
      cursor: 'pointer'
    }

    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return {
          ...baseStyles,
          backgroundColor: '#f0f9ff',
          borderLeft: '4px solid #10b981',
          color: '#065f46'
        }
      case NOTIFICATION_TYPES.ERROR:
        return {
          ...baseStyles,
          backgroundColor: '#fef2f2',
          borderLeft: '4px solid #ef4444',
          color: '#991b1b'
        }
      case NOTIFICATION_TYPES.WARNING:
        return {
          ...baseStyles,
          backgroundColor: '#fffbeb',
          borderLeft: '4px solid #f59e0b',
          color: '#92400e'
        }
      default:
        return {
          ...baseStyles,
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #6366f1',
          color: '#475569'
        }
    }
  }

  const getIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return '✓'
      case NOTIFICATION_TYPES.ERROR:
        return '✕'
      case NOTIFICATION_TYPES.WARNING:
        return '⚠'
      default:
        return 'ℹ'
    }
  }

  return (
    <div
      style={getTypeStyles()}
      onClick={() => onClose(id)}
    >
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        flexShrink: 0,
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{
            fontWeight: '600',
            marginBottom: '4px',
            fontSize: '14px'
          }}>
            {title}
          </div>
        )}
        <div style={{
          fontSize: '13px',
          lineHeight: '1.4',
          opacity: 0.9
        }}>
          {message}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose(id)
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          opacity: 0.6,
          padding: '4px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  )
}

const NotificationsContainer = ({ notifications, onClose }) => {
  if (notifications.length === 0) return null

  return createPortal(
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={{ pointerEvents: 'auto' }}>
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback(({ type = NOTIFICATION_TYPES.INFO, title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random()
    const notification = { id, type, title, message, duration }

    setNotifications(prev => [...prev, notification])
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const success = useCallback((message, title = 'Success') => {
    return addNotification({ type: NOTIFICATION_TYPES.SUCCESS, title, message })
  }, [addNotification])

  const error = useCallback((message, title = 'Error') => {
    return addNotification({ type: NOTIFICATION_TYPES.ERROR, title, message, duration: 7000 })
  }, [addNotification])

  const warning = useCallback((message, title = 'Warning') => {
    return addNotification({ type: NOTIFICATION_TYPES.WARNING, title, message })
  }, [addNotification])

  const info = useCallback((message, title = 'Info') => {
    return addNotification({ type: NOTIFICATION_TYPES.INFO, title, message })
  }, [addNotification])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    NotificationsContainer: () => (
      <NotificationsContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    )
  }
}

export { NOTIFICATION_TYPES }
export default NotificationsContainer