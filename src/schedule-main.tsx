import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SchedulePage } from './components/schedule/SchedulePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchedulePage />
  </StrictMode>,
)
