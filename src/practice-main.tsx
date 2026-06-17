import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PracticePage } from './components/practice/PracticePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PracticePage />
  </StrictMode>,
)
