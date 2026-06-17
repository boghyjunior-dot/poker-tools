/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/mdf/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        home: path.resolve(__dirname, 'home.html'),
        mdf: path.resolve(__dirname, 'mdf.html'),
        randomizer: path.resolve(__dirname, 'randomizer.html'),
      },
    },
  },
  test: {
    globals: true,
  },
})
