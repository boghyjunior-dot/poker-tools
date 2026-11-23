import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { CalculatorPage } from './components/leaderboard/CalculatorPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CalculatorPage />
  </StrictMode>,
)
