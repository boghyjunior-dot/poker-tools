import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Snap Cash: the local app, holding Schedule and the Bankroll Tracker.
 *
 * Its own config rather than more entries in the published one, because the
 * difference between the two is not which pages they contain — it is that
 * this one keeps things. Everything on snapper.poker answers a question and
 * forgets it, which is what lets it be static files on a CDN. These two hold
 * a database, so they run here, on their own port, and are never built for
 * deployment: there is no `build` script pointing at this file, and the Pages
 * workflow does not know it exists.
 *
 * The screens themselves live in ../src and are shared with nothing — but the
 * model underneath them (schedule, tracker, the bridge between the two) is
 * ordinary library code that the published build also compiles, so it stays
 * in one place rather than being copied across an app boundary.
 */
export default defineConfig({
  root: 'session',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // Fail rather than wander to another port: the whole point is knowing
    // which app is on which number.
    strictPort: true,
    fs: {
      // The pages and the model live above this root.
      allow: [path.resolve(__dirname)],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
