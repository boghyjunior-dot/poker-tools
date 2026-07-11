import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LeakFinderPage } from './components/leakfinder/LeakFinderPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LeakFinderPage />
  </StrictMode>,
)
