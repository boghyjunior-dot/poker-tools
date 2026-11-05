import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './session.css'
import { TrackerPage } from '../src/components/tracker/TrackerPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackerPage />
  </StrictMode>,
)
