// seo.js — управление <head> под текущий маршрут.
// Обновляет title / description / canonical / OG / twitter / robots на смену страницы.
// Работает и в живой SPA (таб браузера, шаринг после клиентской навигации),
// и запекается пререндером в статический HTML каждой страницы.

import { pathForPage } from './routes.js'

const ORIGIN = 'https://axioma-scan.ru'

// Дефолт — главная (совпадает с тем, что статически лежит в index.html)
const DEFAULT = {
  title: 'AXIOMA SCAN — крипто-арбитражный сканер по 8 биржам',
  description: 'AXIOMA SCAN ищет арбитражные возможности между Binance, Bybit, OKX, MEXC, Gate.io, KuCoin, Bitget и BingX в реальном времени. Сканер фьючерсного и фандинг-арбитража, обучение внутри платформы.',
}

// Мета под каждую страницу. noindex — для приложенческих (не для поиска).
export const PAGE_SEO = {
  home: DEFAULT,
  about: {
    title: 'О проекте — AXIOMA SCAN',
    description: 'AXIOMA SCAN — крипто-арбитражный сканер, который строит небольшая команда. Честно о продукте, подходе и людях за проектом.',
  },
  training: {
    title: 'Академия арбитража — AXIOMA SCAN',
    description: 'Материалы по крипто-арбитражу: как работают спреды, фьючерсы и фандинг, как пользоваться сканером. Обучение внутри платформы.',
  },
  movers: {
    title: 'Топ роста и падения — AXIOMA SCAN',
    description: 'Монеты с наибольшим ростом и падением за 24 часа по 8 биржам в реальном времени. Движения рынка в одном месте.',
  },
  faq: {
    title: 'Частые вопросы — AXIOMA SCAN',
    description: 'Ответы на частые вопросы о проекте AXIOMA SCAN, крипто-арбитраже и работе со сканером.',
  },
  legal: {
    title: 'Правовая информация — AXIOMA SCAN',
    description: 'Оферта, политика конфиденциальности и условия использования сервиса AXIOMA SCAN.',
  },
  // приложенческие — noindex
  futures: { title: 'Сканер арбитража — AXIOMA SCAN', description: DEFAULT.description, noindex: true },
  funding: { title: 'Арбитраж фандинга — AXIOMA SCAN', description: DEFAULT.description, noindex: true },
  api:     { title: 'API — AXIOMA SCAN',                description: DEFAULT.description, noindex: true },
}

// Человекочитаемые названия для хлебных крошек (Главная → …)
const CRUMB_LABEL = {
  about: 'О проекте',
  training: 'Академия',
  movers: 'Топ роста и падения',
  faq: 'Частые вопросы',
  legal: 'Правовая информация',
}

function upsertMeta(selector, attr, attrVal, content) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, attrVal)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setRobotsNoindex(noindex) {
  const sel = 'meta[name="robots"]'
  let el = document.head.querySelector(sel)
  if (noindex) {
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', 'robots')
      document.head.appendChild(el)
    }
    el.setAttribute('content', 'noindex, follow')
  } else if (el) {
    el.remove()
  }
}

// Применить мету под страницу. legalDoc — для маршрута /legal/:doc.
export function applySeo(page, { legalDoc } = {}) {
  if (typeof document === 'undefined') return
  const meta = PAGE_SEO[page] || DEFAULT
  const url = ORIGIN + pathForPage(page, legalDoc)

  document.title = meta.title
  upsertMeta('meta[name="description"]', 'name', 'description', meta.description)
  upsertLink('canonical', url)

  upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title)
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description)
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', url)
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title)
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description)

  setRobotsNoindex(!!meta.noindex)

  // Хлебные крошки (Главная → текущая) для публичных внутренних страниц
  const crumb = CRUMB_LABEL[page]
  if (crumb && !meta.noindex) {
    setJsonLd('breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: ORIGIN + '/' },
        { '@type': 'ListItem', position: 2, name: crumb, item: url },
      ],
    })
  } else {
    removeJsonLd('breadcrumb-jsonld')
  }
}

// ── JSON-LD helpers (для per-route разметки, напр. FAQPage) ──
export function setJsonLd(id, obj) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(obj)
}

export function removeJsonLd(id) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (el) el.remove()
}