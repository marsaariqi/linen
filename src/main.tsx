import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.tsx'

// Force prevent app-wide scrolling caused by browser "jump-to-anchor" behavior
window.addEventListener('scroll', (e) => {
  if (e.target === window || e.target === document || e.target === document.documentElement || e.target === document.body) {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }
}, { passive: false, capture: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
