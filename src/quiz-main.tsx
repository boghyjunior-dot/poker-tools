import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QuizPage } from './components/quiz/QuizPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuizPage />
  </StrictMode>,
)
