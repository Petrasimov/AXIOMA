// routes.js — единый источник правды: URL ↔ страница.
// Мини-роутер на History API (без внешних зависимостей).
//
// Публичные маршруты индексируются; приложенческие (scanner/funding/api) — noindex.

// LEGAL_DOCS — объект вида { offer: {...}, privacy: {...} }.
// Нужен здесь только чтобы отличить существующий слаг документа от мусорного.
import { LEGAL_DOCS } from './data/legalContent.js'

// URL → внутренняя страница (activePage)
export const PATH_TO_PAGE = {
  '/':        'home',
  '/about':   'about',
  '/academy': 'training',
  '/faq':     'faq',
  '/movers':  'movers',
  '/scanner': 'futures',
  '/funding': 'funding',
  '/api':     'api',
  '/pay/success': 'pay_success',
  '/pay/cancel':  'pay_cancel',
}

// Страница → URL (обратное отображение; legal строится отдельно)
export const PAGE_TO_PATH = {
  home:     '/',
  about:    '/about',
  training: '/academy',
  faq:      '/faq',
  movers:   '/movers',
  futures:  '/scanner',
  funding:  '/funding',
  api:      '/api',
  pay_success: '/pay/success',
  pay_cancel:  '/pay/cancel',
}

// Страница → вкладка сайдбара (для подсветки). faq/legal/api — без вкладки.
export const PAGE_TO_TAB = {
  home:     'main',
  futures:  'futures',
  funding:  'funding',
  training: 'promo',
  about:    'about',
  movers:   'movers',
}

// Разбор текущего адреса → { page, legalDoc }
//
// Неизвестный путь возвращает 'notfound', а НЕ 'home'.
// Раньше любой мусорный адрес (/qwerty123) молча открывал главную —
// для пользователя это выглядело как будто страница существует,
// а для поисковиков создавало дубли главной по бесконечному числу URL.
//
// Слаги /legal/<doc> сверяются с реальным списком документов:
// /legal без слага — оферта по умолчанию, /legal/несуществующий — 404.
export function parseLocation(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'

  if (path === '/legal') {
    return { page: 'legal', legalDoc: 'offer' }
  }

  if (path.startsWith('/legal/')) {
    const doc = path.split('/')[2] || ''
    if (!doc || !LEGAL_DOCS[doc]) return { page: 'notfound', legalDoc: null }
    return { page: 'legal', legalDoc: doc }
  }

  const page = PATH_TO_PAGE[path]
  if (!page) return { page: 'notfound', legalDoc: null }

  return { page, legalDoc: null }
}

// Построение URL для страницы (legal — с документом)
export function pathForPage(page, legalDoc) {
  if (page === 'legal') return `/legal/${legalDoc || 'offer'}`
  return PAGE_TO_PATH[page] || '/'
}