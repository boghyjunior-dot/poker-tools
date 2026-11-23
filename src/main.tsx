import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PasswordGate } from './components/PasswordGate.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
