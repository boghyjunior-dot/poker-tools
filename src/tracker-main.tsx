import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TrackerPage } from './components/tracker/TrackerPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackerPage />
  </StrictMode>,
)
