import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BankrollPage } from './components/bankroll/BankrollPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BankrollPage />
  </StrictMode>,
)
