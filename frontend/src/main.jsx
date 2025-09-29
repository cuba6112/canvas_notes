import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeGlobalErrorTracking } from './utils/monitoring'

// Initialize global error tracking and monitoring
initializeGlobalErrorTracking()

// Performance mark for application start
performance.mark('app-start')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Performance mark for application rendered
performance.mark('app-rendered')
performance.measure('app-initialization', 'app-start', 'app-rendered')