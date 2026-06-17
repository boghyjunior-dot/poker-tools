import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EquityPage } from './components/equity/EquityPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EquityPage />
  </StrictMode>,
)
