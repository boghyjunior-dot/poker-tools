import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './session.css'
import { DemoPage } from '../src/components/demo/DemoPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoPage />
  </StrictMode>,
)
