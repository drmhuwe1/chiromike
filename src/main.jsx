import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Register service worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      console.log('[ServiceWorker] Registered successfully, scope:', reg.scope);
      // Trigger update check periodically (swallow network errors silently)
      setInterval(() => reg.update().catch(() => {}), 3600000);
    }).catch((err) => {
      console.warn('[ServiceWorker] Registration failed:', err.message);
      console.error('[ServiceWorker] Error details:', err);
    });
  });
}