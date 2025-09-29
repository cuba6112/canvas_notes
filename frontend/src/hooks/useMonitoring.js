/**
 * React hooks for performance monitoring and error tracking
 */

import { useRef, useEffect } from 'react'
import { trackPerformance, trackError, trackUserAction } from '../utils/monitoring'

/**
 * React hook for component performance monitoring
 */
export const usePerformanceMonitor = (componentName) => {
  const mountTime = useRef(performance.now())
  const renderCount = useRef(0)

  useEffect(() => {
    const mountDuration = performance.now() - mountTime.current
    trackPerformance(`${componentName}_mount`, mountDuration)

    return () => {
      const totalLifetime = performance.now() - mountTime.current
      trackPerformance(`${componentName}_lifetime`, totalLifetime, {
        renderCount: renderCount.current
      })
    }
  }, [componentName])

  useEffect(() => {
    renderCount.current += 1
    if (renderCount.current > 1) {
      trackPerformance(`${componentName}_render`, 0, {
        renderNumber: renderCount.current
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    trackComponentError: (error, context) => trackError(error, { component: componentName, ...context }),
    trackComponentAction: (action, metadata) => trackUserAction(action, componentName, metadata)
  }
}

/**
 * Hook for monitoring API requests
 */
export const useApiMonitoring = () => {
  const trackApiCall = (endpoint, method, duration, status, error = null) => {
    trackPerformance(`api_${method.toLowerCase()}_${endpoint}`, duration, {
      status,
      error: error?.message,
      endpoint,
      method
    })

    if (error) {
      trackError(error, {
        type: 'api_error',
        endpoint,
        method,
        status
      })
    }
  }

  return { trackApiCall }
}

/**
 * Hook for monitoring user interactions
 */
export const useUserInteractionMonitoring = () => {
  const trackClick = (elementType, elementId, metadata = {}) => {
    trackUserAction('click', elementType, { elementId, ...metadata })
  }

  const trackFormSubmit = (formName, metadata = {}) => {
    trackUserAction('form_submit', formName, metadata)
  }

  const trackNavigation = (from, to) => {
    trackUserAction('navigation', 'route_change', { from, to })
  }

  return {
    trackClick,
    trackFormSubmit,
    trackNavigation
  }
}