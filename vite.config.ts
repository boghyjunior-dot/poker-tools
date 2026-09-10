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
  'practice',
  'leakfinder',
  'quiz',
  'variance',
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
  { name: 'equity', variable: 'VITE_PUBLISH_IN_REVIEW' },
  { name: 'bounty', variable: 'VITE_PUBLISH_IN_REVIEW' },
  { name: 'schedule', variable: 'VITE_PUBLISH_SESSION' },
  { name: 'tracker', variable: 'VITE_PUBLISH_SESSION' },
]

function isOn(value: string | undefined): boolean {
  const normalised = value?.trim().toLowerCase()
  return normalised === 'true' || normalised === '1' || normalised === 'yes'
}

/**
 * Keep what the build tells the outside world in step with what it built.
 *
 * Two places name every tool: the sitemap in `public/`, which lists only the
 * pages that always ship, and the JSON-LD tool list in `index.html`, which
 * lists all of them. So a published local-only page is added to the sitemap
 * here, and a held-back one is cut out of the JSON-LD — otherwise the site
 * would be handing search engines a URL that 404s.
 */
function publishedPages(published: string[], heldBack: string[]): Plugin {
  return {
    name: 'published-pages',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir ?? 'dist'

      if (published.length > 0) {
        const sitemap = path.resolve(dir, 'sitemap.xml')
        let xml: string | null = null
        try {
          xml = readFileSync(sitemap, 'utf8')
        } catch {
          xml = null // No sitemap in this build; nothing to extend.
        }
        if (xml !== null) {
          const entries = published
            .map((page) => `  <url>\n    <loc>${SITE}${page}.html</loc>\n    <priority>0.8</priority>\n  </url>`)
            .join('\n')
          writeFileSync(sitemap, xml.replace('</urlset>', `${entries}\n</urlset>`))
        }
      }

      if (heldBack.length > 0) stripFromToolList(path.resolve(dir, 'index.html'), heldBack)
    },
  }
}

/**
 * Drop held-back tools from the JSON-LD list on the home page.
 *
 * The block is parsed rather than pattern-matched: the list carries explicit
 * `position` numbers, so removing an entry means renumbering the rest, and a
 * regex that got that wrong would publish invalid structured data silently.
 */
function stripFromToolList(file: string, heldBack: string[]): void {
  const urls = new Set(heldBack.map((page) => `${SITE}${page}.html`))
  let html: string
  try {
    html = readFileSync(file, 'utf8')
  } catch {
    return
  }

  const open = html.indexOf('<script type="application/ld+json">')
  if (open === -1) return
  const start = html.indexOf('>', open) + 1
  const end = html.indexOf('</script>', start)
  if (end === -1) return

  let data: unknown
  try {
    data = JSON.parse(html.slice(start, end))
  } catch {
    return // Not JSON we understand; leave it exactly as authored.
  }

  // The tool list is nested inside an `@graph`, so find it rather than assume
  // where it sits — the surrounding schema can be rearranged without this
  // quietly stopping working.
  const list = findToolList(data)
  if (!list) return

  const kept = list.itemListElement.filter((entry) => !urls.has(entry.item?.url ?? ''))
  if (kept.length === list.itemListElement.length) return
  list.itemListElement = kept.map((entry, index) => ({ ...entry, position: index + 1 }))

  writeFileSync(file, html.slice(0, start) + JSON.stringify(data, null, 2) + html.slice(end))
}

interface ToolList {
  itemListElement: { position?: number; item?: { url?: string } }[]
}

/** The first node anywhere in the document that carries a list of tools. */
function findToolList(node: unknown): ToolList | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findToolList(child)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object' || node === null) return null
  const record = node as Record<string, unknown>
  if (Array.isArray(record.itemListElement)) return record as unknown as ToolList
  for (const value of Object.values(record)) {
    const found = findToolList(value)
    if (found) return found
  }
  return null
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const published = LOCAL_ONLY.filter((page) => isOn(env[page.variable])).map((page) => page.name)
  const heldBack = LOCAL_ONLY.filter((page) => !isOn(env[page.variable])).map((page) => page.name)

  const input = Object.fromEntries(
    [...PAGES, ...published].map((name) => [name, path.resolve(__dirname, `${name}.html`)]),
  )
  // index.html is the root, so it keeps the rollup name the build expects.
  input.main = input.index
  delete input.index

  return {
    base: './',
    plugins: [react(), tailwindcss(), publishedPages(published, heldBack)],
    build: {
      rollupOptions: { input },
    },
    test: {
      globals: true,
    },
  }
})
