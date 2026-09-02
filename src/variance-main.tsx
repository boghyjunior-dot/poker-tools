import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { VariancePage } from './components/variance/VariancePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VariancePage />
  </StrictMode>,
)
