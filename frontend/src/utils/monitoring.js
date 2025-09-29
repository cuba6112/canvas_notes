/**
 * Enterprise-grade frontend monitoring and performance tracking
 * Real-time error tracking, performance metrics, and user analytics
 */

/**
 * Configuration for monitoring
 */
const MONITORING_CONFIG = {
  MAX_EVENTS: 1000,          // Maximum events to store in memory
  BATCH_SIZE: 50,            // Events to send in each batch
  FLUSH_INTERVAL: 30000,     // Flush events every 30 seconds
  PERFORMANCE_SAMPLE_RATE: 0.1, // Sample 10% of performance events
  ERROR_SAMPLE_RATE: 1.0,    // Sample 100% of errors
  DEBUG_MODE: process.env.NODE_ENV === 'development'
}

/**
 * Event storage and batching
 */
class EventBuffer {
  constructor() {
    this.events = []
    this.isFlushingEnabled = true
    this.lastFlush = Date.now()
    this.startPeriodicFlush()
  }

  add(event) {
    if (this.events.length >= MONITORING_CONFIG.MAX_EVENTS) {
      // Remove oldest events if buffer is full
      this.events.shift()
    }

    this.events.push({
      ...event,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: this.getViewportInfo()
    })

    // Auto-flush on critical errors
    if (event.level === 'error' && event.tags?.includes('critical')) {
      this.flush()
    }
  }

  flush() {
    if (this.events.length === 0) return

    const eventsToSend = this.events.splice(0, MONITORING_CONFIG.BATCH_SIZE)
    this.sendEvents(eventsToSend)
    this.lastFlush = Date.now()
  }

  async sendEvents(events) {
    if (!this.isFlushingEnabled) return

    try {
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: await fetch('/api/monitoring/events', { method: 'POST', body: JSON.stringify(events) })
      }

      if (MONITORING_CONFIG.DEBUG_MODE) {
        console.group('📊 Monitoring Events')
        events.forEach(event => {
          const style = event.level === 'error' ? 'color: #ef4444' :
                       event.level === 'warn' ? 'color: #f59e0b' :
                       event.level === 'performance' ? 'color: #10b981' :
                       'color: #6b7280'
          console.log(`%c${event.type}:`, style, event)
        })
        console.groupEnd()
      }
    } catch (error) {
      console.error('Failed to send monitoring events:', error)
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      if (Date.now() - this.lastFlush >= MONITORING_CONFIG.FLUSH_INTERVAL) {
        this.flush()
      }
    }, MONITORING_CONFIG.FLUSH_INTERVAL)
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('monitoring_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('monitoring_session_id', sessionId)
    }
    return sessionId
  }

  getUserId() {
    // In a real app, this would come from authentication
    return localStorage.getItem('user_id') || 'anonymous'
  }

  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    }
  }
}

// Global event buffer
const eventBuffer = new EventBuffer()

/**
 * Error tracking with detailed context
 */
export const trackError = (error, context = {}) => {
  const errorEvent = {
    type: 'error',
    level: 'error',
    message: error.message || 'Unknown error',
    stack: error.stack,
    name: error.name,
    code: error.code,
    context,
    tags: context.critical ? ['critical'] : [],
    fingerprint: generateErrorFingerprint(error)
  }

  eventBuffer.add(errorEvent)

  // Also log to console in development
  if (MONITORING_CONFIG.DEBUG_MODE) {
    console.error('🚨 Error tracked:', errorEvent)
  }
}

/**
 * Performance tracking for user interactions
 */
export const trackPerformance = (name, duration, metadata = {}) => {
  // Sample performance events to reduce noise
  if (Math.random() > MONITORING_CONFIG.PERFORMANCE_SAMPLE_RATE) return

  const performanceEvent = {
    type: 'performance',
    level: 'info',
    name,
    duration,
    metadata,
    memory: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize
    } : null
  }

  eventBuffer.add(performanceEvent)
}

/**
 * User interaction tracking
 */
export const trackUserAction = (action, target, metadata = {}) => {
  const actionEvent = {
    type: 'user_action',
    level: 'info',
    action,
    target,
    metadata
  }

  eventBuffer.add(actionEvent)
}

/**
 * Application state tracking
 */
export const trackStateChange = (stateName, newValue, previousValue) => {
  const stateEvent = {
    type: 'state_change',
    level: 'debug',
    stateName,
    newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
    previousValue: typeof previousValue === 'object' ? JSON.stringify(previousValue) : previousValue
  }

  eventBuffer.add(stateEvent)
}

/**
 * Performance measurement decorator
 */
export const measurePerformance = (name, fn) => {
  return async (...args) => {
    const startTime = performance.now()

    try {
      const result = await fn(...args)
      const duration = performance.now() - startTime

      trackPerformance(name, duration, {
        status: 'success',
        args: args.length
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      trackPerformance(name, duration, {
        status: 'error',
        error: error.message
      })

      trackError(error, { context: name, args })
      throw error
    }
  }
}

// React hooks are now in /hooks/useMonitoring.js

/**
 * Network request monitoring
 */
export const trackNetworkRequest = (url, method, duration, status, error = null) => {
  const networkEvent = {
    type: 'network_request',
    level: error ? 'error' : status >= 400 ? 'warn' : 'info',
    url,
    method,
    duration,
    status,
    error: error?.message,
    size: null // Could be populated from response headers
  }

  eventBuffer.add(networkEvent)
}

/**
 * Enhanced fetch wrapper with monitoring
 */
export const monitoredFetch = async (url, options = {}) => {
  const startTime = performance.now()
  const method = options.method || 'GET'

  try {
    const response = await fetch(url, options)
    const duration = performance.now() - startTime

    trackNetworkRequest(url, method, duration, response.status)

    return response
  } catch (error) {
    const duration = performance.now() - startTime
    trackNetworkRequest(url, method, duration, 0, error)
    throw error
  }
}

/**
 * Error boundary monitoring helper
 */
export const trackComponentError = (error, errorInfo, componentStack) => {
  trackError(error, {
    type: 'react_error_boundary',
    componentStack,
    errorBoundary: true,
    critical: true
  })
}

/**
 * Unhandled error tracking
 */
export const initializeGlobalErrorTracking = () => {
  // Track unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      critical: true
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason, {
      type: 'unhandled_promise_rejection',
      critical: true
    })
  })

  // Track performance navigation timing
  if (window.performance && window.performance.navigation) {
    const navTiming = performance.getEntriesByType('navigation')[0]
    if (navTiming) {
      trackPerformance('page_load', navTiming.loadEventEnd, {
        type: 'navigation',
        domContentLoaded: navTiming.domContentLoadedEventEnd,
        firstPaint: navTiming.responseEnd,
        transferSize: navTiming.transferSize
      })
    }
  }
}

/**
 * Generate unique fingerprint for error grouping
 */
const generateErrorFingerprint = (error) => {
  const key = `${error.name}_${error.message}_${error.stack?.split('\n')[1] || ''}`

  // Simple hash function for fingerprinting
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return `error_${Math.abs(hash).toString(36)}`
}

/**
 * Application health monitoring
 */
export const trackApplicationHealth = () => {
  const healthMetrics = {
    type: 'health_check',
    level: 'info',
    metrics: {
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null,
      timing: performance.timing ? {
        pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    }
  }

  eventBuffer.add(healthMetrics)
}

// Initialize health monitoring
setInterval(trackApplicationHealth, 60000) // Every minute

export { eventBuffer }