import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { MysteryBountyPage } from './components/bounty/MysteryBountyPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MysteryBountyPage />
  </StrictMode>,
)
