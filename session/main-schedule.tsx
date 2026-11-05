import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './session.css'
import { SchedulePage } from '../src/components/schedule/SchedulePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchedulePage />
  </StrictMode>,
)
