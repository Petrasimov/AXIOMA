// prerender.mjs — SSG-снэпшот публичных страниц после `vite build`.
//
// Как работает:
//   1. Читает собранный dist/index.html как «шелл» (держит в памяти).
//   2. Поднимает статический сервер над dist с SPA-фолбэком на этот шелл.
//   3. Headless Chromium (из @playwright/test — уже стоит для e2e) обходит
//      публичные маршруты, ждёт рендер React + отработку applySeo/JSON-LD,
//      и сохраняет готовый HTML в dist/<route>/index.html.
//
// Приложенческие страницы (/scanner, /funding, /api) НЕ пререндерятся — им
// остаётся SPA-шелл (в проде Nginx отдаёт им index.html через try_files).
//
// Требование на билд-машине: установленный Chromium — `npx playwright install chromium`.

import { chromium } from '@playwright/test'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = 5055
const ORIGIN = `http://127.0.0.1:${PORT}`

// Публичные маршруты для пререндера (совпадают с sitemap.xml)
const ROUTES = [
  '/',
  '/about',
  '/academy',
  '/movers',
  '/faq',
  '/legal/offer',
  '/legal/privacy',
  '/legal/terms',
]

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain',
  '.xml': 'application/xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html не найден — сначала `npm run build`')
    process.exit(1)
  }

  // Оригинальный шелл держим в памяти — фолбэк всегда отдаёт его,
  // даже после того как мы перезапишем dist/index.html пререндером главной.
  const SHELL = await readFile(path.join(DIST, 'index.html'))

  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const ext = path.extname(urlPath)
      if (ext) {
        const filePath = path.join(DIST, urlPath)
        if (existsSync(filePath)) {
          res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
          res.end(await readFile(filePath))
          return
        }
      }
      // SPA-фолбэк — исходный шелл
      res.setHeader('Content-Type', 'text/html')
      res.end(SHELL)
    } catch (e) {
      res.statusCode = 500
      res.end('prerender server error')
    }
  })

  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve))

  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  const failures = []

  for (const route of ROUTES) {
    try {
      await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded' })
      // Ждём, пока React заполнит #root
      await page.waitForFunction(() => {
        const r = document.getElementById('root')
        return r && r.childElementCount > 0
      }, { timeout: 15000 })
      // Даём отработать эффектам (applySeo, FAQPage JSON-LD)
      await page.waitForTimeout(500)

      const html = '<!doctype html>\n' +
        await page.evaluate(() => document.documentElement.outerHTML)

      const title = await page.title()
      const outPath = route === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route, 'index.html')
      await mkdir(path.dirname(outPath), { recursive: true })
      await writeFile(outPath, html, 'utf-8')

      console.log(`[prerender] ✓ ${route.padEnd(18)} → ${path.relative(DIST, outPath)}  (${html.length} байт, «${title}»)`)
    } catch (e) {
      failures.push(route)
      console.error(`[prerender] ✗ ${route} — ${e.message}`)
    }
  }

  await browser.close()
  await new Promise(resolve => server.close(resolve))

  if (failures.length) {
    console.error(`[prerender] не удалось: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log(`[prerender] готово: ${ROUTES.length} страниц`)
}

main().catch(err => {
  console.error('[prerender] упал:', err)
  process.exit(1)
})
