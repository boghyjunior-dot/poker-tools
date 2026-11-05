import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './session.css'
import { StatsPage } from '../src/components/stats/StatsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StatsPage />
  </StrictMode>,
)
