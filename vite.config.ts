/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SITE = 'https://boghyjunior-dot.github.io/poker-tools/'

/** Pages that always ship. */
const PAGES = [
  'index',
  'home',
  'mdf',
  'equity',
  'practice',
  'leakfinder',
  'quiz',
  'variance',
  'bounty',
  'bankroll',
  'charts',
  'randomizer',
]

/**
 * Pages held back from the published site unless their variable is set.
 *
 * Leaving the entry out of the build is what makes "local only" mean it: the
 * dev server still serves the HTML from the project root, but the file never
 * reaches `dist`, so there is no URL to stumble onto and nothing to index.
 */
const LOCAL_ONLY: { name: string; variable: string }[] = [
  { name: 'roadmap', variable: 'VITE_PUBLISH_ROADMAP' },
  { name: 'schedule', variable: 'VITE_PUBLISH_SESSION' },
  { name: 'tracker', variable: 'VITE_PUBLISH_SESSION' },
]

function isOn(value: string | undefined): boolean {
  const normalised = value?.trim().toLowerCase()
  return normalised === 'true' || normalised === '1' || normalised === 'yes'
}

/**
 * The sitemap in `public/` lists only the pages that always ship, so a
 * local-only page is added to it at build time and only when it is published.
 */
function sitemapExtras(paths: string[]): Plugin {
  return {
    name: 'sitemap-extras',
    apply: 'build',
    writeBundle(options) {
      if (paths.length === 0) return
      const file = path.resolve(options.dir ?? 'dist', 'sitemap.xml')
      let xml: string
      try {
        xml = readFileSync(file, 'utf8')
      } catch {
        return // No sitemap in this build; nothing to extend.
      }
      const entries = paths
        .map((page) => `  <url>\n    <loc>${SITE}${page}.html</loc>\n    <priority>0.8</priority>\n  </url>`)
        .join('\n')
      writeFileSync(file, xml.replace('</urlset>', `${entries}\n</urlset>`))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const published = LOCAL_ONLY.filter((page) => isOn(env[page.variable])).map((page) => page.name)

  const input = Object.fromEntries(
    [...PAGES, ...published].map((name) => [name, path.resolve(__dirname, `${name}.html`)]),
  )
  // index.html is the root, so it keeps the rollup name the build expects.
  input.main = input.index
  delete input.index

  return {
    base: './',
    plugins: [react(), tailwindcss(), sitemapExtras(published)],
    build: {
      rollupOptions: { input },
    },
    test: {
      globals: true,
    },
  }
})
