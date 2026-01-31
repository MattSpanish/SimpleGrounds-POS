import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'

// Minimal runtime diagnostics overlay for production
function installErrorOverlay() {
  const handler = (type: 'error' | 'unhandledrejection') => (event: any) => {
    try {
      const overlayId = 'sg-pos-error-overlay'
      let overlay = document.getElementById(overlayId)
      if (!overlay) {
        overlay = document.createElement('div')
        overlay.id = overlayId
        overlay.style.position = 'fixed'
        overlay.style.inset = '0'
        overlay.style.background = 'rgba(0,0,0,0.85)'
        overlay.style.color = '#fff'
        overlay.style.zIndex = '99999'
        overlay.style.padding = '16px'
        overlay.style.fontFamily = 'system-ui, sans-serif'
        document.body.appendChild(overlay)
      }
      const msg = type === 'error' ? event?.message : event?.reason?.message || String(event?.reason)
      overlay.innerHTML = `<h3>Runtime error</h3><p>${msg ?? 'Unknown error'}</p><p>Please hard-refresh or try another browser.</p>`
      console.error('Runtime error overlay:', event)
    } catch (e) {
      // ignore
    }
  }
  window.addEventListener('error', handler('error'))
  window.addEventListener('unhandledrejection', handler('unhandledrejection'))
}

installErrorOverlay()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
