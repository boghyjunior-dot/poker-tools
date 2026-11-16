import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LeaderboardPage } from './components/leaderboard/LeaderboardPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LeaderboardPage />
  </StrictMode>,
)
