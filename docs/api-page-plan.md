# План реализации — Страница API (Матрица)

Методика: учитель-ученик (Claude объясняет, пользователь пишет код).
Эталонный дизайн: `previews/api-v3-matrix.html`

---

## Шаги

| # | Файл | Что делаем | Статус |
|---|------|-----------|--------|
| 1 | `Sidebar.jsx` | Под-пункты API/Logs по наведению, props activePage/onPageChange | ✅ |
| 2 | `App.jsx` | State `activePage`, передача props в Sidebar, условный рендер ApiPage | ✅ |
| 3 | `ApiPage.jsx` | Создать файл, HTML-скелет: Header + тулбар + матрица-заглушка | ✅ |
| 4 | `ApiPage.jsx` | CSS всех элементов (матрица, бейджи, detail-панель) | ✅ |
| 5 | `ApiPage.jsx` | State матрицы `testState`, динамический рендер строк через `.map()` | ✅ |
| 6 | `ApiPage.jsx` | runCell для Funding + Volume — вызов fetchBinance/Bybit/etc из api.js | ✅ |
| 7 | `ApiPage.jsx` | runCell для Deposit/Withdraw — вызов getBinanceStatus/etc из coinStatus.js | ✅ |
| 8 | `ApiPage.jsx` | runCell для WebSocket — connectOrderBook из ws.js, таймаут 8s | ✅ |
| 9 | `ApiPage.jsx` | runAll + runRow + Detail Panel (логи ячейки + Copy) | ✅ |
| 10 | `ApiPage.jsx` | Фильтр колонок (пилюли в тулбаре скрывают/показывают колонки) | ✅ |

---

## Архитектура данных

```javascript
// testState — состояние каждой ячейки матрицы
{
  Binance: {
    funding:  { status: 'idle'|'run'|'ok'|'err', val: string, logs: string[] },
    volume:   { status: ..., val: ..., logs: [] },
    transfer: { status: ..., val: ..., logs: [] },
    ws:       { status: ..., val: ..., logs: [] },
  },
  Bybit: { ... },
  // ...8 бирж
}
```

## Реальные функции для тестов

| Тест | Функция | Файл |
|------|---------|------|
| Funding | `fetchBinance(sym)`, `fetchBybit(sym)`, ... | `api.js` |
| Volume | `fetchBinance(sym)`, `fetchBybit(sym)`, ... | `api.js` |
| Transfer | `getBinanceStatus(sym)`, `getBybitStatus(sym)`, ... | `coinStatus.js` |
| WebSocket | `connectOrderBook(ex, sym, market, cb)` | `ws.js` |

Тестовая монета: `BTC`

## Компонент

```
ApiPage
├── Header (title=API, mode=FUTURES/FUNDING)
├── Toolbar (RunAll btn, filter pills, summary counters)
├── Matrix
│   ├── MatrixHead (БИРЖА | FUNDING | VOLUME | TRANSFER | WS | ДЕЙСТВИЕ)
│   └── MatrixRow × 8 (exchange name + 4 cells + Run btn)
└── DetailPanel (slide-up, logs + Copy btn)
```
