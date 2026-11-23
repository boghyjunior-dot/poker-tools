import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PasswordGate } from './components/PasswordGate.tsx'
import { EquityPage } from './components/equity/EquityPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <EquityPage />
    </PasswordGate>
  </StrictMode>,
)
