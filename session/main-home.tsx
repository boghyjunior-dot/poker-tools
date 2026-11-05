import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './session.css'
import { SessionHome } from './SessionHome.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionHome />
  </StrictMode>,
)
