import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RandomizerPage } from './components/RandomizerPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RandomizerPage />
  </StrictMode>,
)
