// routes.js — единый источник правды: URL ↔ страница.
// Мини-роутер на History API (без внешних зависимостей).
//
// Публичные маршруты индексируются; приложенческие (scanner/funding/api) — noindex.

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
export function parseLocation(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/legal' || path.startsWith('/legal/')) {
    const doc = path.split('/')[2] || 'offer'
    return { page: 'legal', legalDoc: doc }
  }
  return { page: PATH_TO_PAGE[path] || 'home', legalDoc: null }
}

// Построение URL для страницы (legal — с документом)
export function pathForPage(page, legalDoc) {
  if (page === 'legal') return `/legal/${legalDoc || 'offer'}`
  return PAGE_TO_PATH[page] || '/'
}