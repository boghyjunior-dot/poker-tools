import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PreflopChartsPage } from './components/charts/PreflopChartsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreflopChartsPage />
  </StrictMode>,
)
