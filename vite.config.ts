/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        home: path.resolve(__dirname, 'home.html'),
        mdf: path.resolve(__dirname, 'mdf.html'),
        equity: path.resolve(__dirname, 'equity.html'),
        practice: path.resolve(__dirname, 'practice.html'),
        leakfinder: path.resolve(__dirname, 'leakfinder.html'),
        quiz: path.resolve(__dirname, 'quiz.html'),
        variance: path.resolve(__dirname, 'variance.html'),
        bounty: path.resolve(__dirname, 'bounty.html'),
        bankroll: path.resolve(__dirname, 'bankroll.html'),
        roadmap: path.resolve(__dirname, 'roadmap.html'),
        charts: path.resolve(__dirname, 'charts.html'),
        randomizer: path.resolve(__dirname, 'randomizer.html'),
      },
    },
  },
  test: {
    globals: true,
  },
})
