# AXIOMA SCAN — Полная документация проекта

> Этот файл — единственный источник истины о проекте. Читай его КАЖДЫЙ раз перед любой задачей.

---

## ЧТО ТАКОЕ AXIOMA

Криптовалютное приложение для поиска арбитражных возможностей между биржами.  
Стек: **React 18 + Vite 5 + чистый CSS**, без UI-библиотек. Только Lucide React для иконок.  
Шрифты: Inter (текст) + JetBrains Mono (цифры, коды).

**Суть продукта:**  
Пользователь видит список пар типа "BTC на Binance стоит 67 000$, а на Bybit — 69 420$".  
Разница = спред = потенциальная прибыль при одновременном входе LONG на одной бирже и SHORT на другой.

---

## СТРУКТУРА ФАЙЛОВ

```
src/
  components/
    ActiveTradesBar.jsx ← панель активных сделок (до 5, localStorage)
    ApiPage.jsx         ← страница тестирования API (Developers > API)
    DetailModal.jsx     ← модальное окно подробной информации о паре
    FilterDrawer.jsx    ← боковой drawer с фильтрами
    Header.jsx          ← шапка: сортировка, вид, фильтры, скрытые элементы
    LoadingScreen.jsx   ← экран загрузки при первом fetch
    OpportunityCard.jsx ← карточка одной арбитражной возможности
    OpportunityGrid.jsx ← грид/таблица карточек
    Sidebar.jsx         ← боковая панель навигации
    StatsRow.jsx        ← строка статистики над гридом
  App.jsx         ← главный компонент, весь state, фильтрация, роутинг страниц
  api.js          ← fetch к 8 биржам, кэширование, enrichOpportunities()
  coinStatus.js   ← статусы депозит/вывод для каждой биржи
  constants.js    ← EXCHANGES, SORT_OPTIONS, TABS
  index.css       ← CSS переменные, reset, глобальные стили
  main.jsx        ← entry point (ReactDOM.createRoot)
  mockData.js     ← 20 mock-объектов возможностей
  rateLimiter.js  ← ограничитель частоты запросов
  sign.js         ← hmacHex() и hmacBase64() для авторизованных API
  utils.js        ← вспомогательные функции форматирования
  ws.js           ← WebSocket менеджер, 8 адаптеров бирж, calcVwap

vite.config.js    ← dev-server port 5173, proxy для 7 бирж без CORS
previews/
  v1-terminal.html         ← HTML-макет DetailModal
  api-v3-matrix.html       ← HTML-макет ApiPage (эталонный дизайн)
  logs-v1-terminal.html    ← вариант страницы Logs: terminal stream
  logs-v2-dashboard.html   ← вариант страницы Logs: dashboard с health картами
  logs-v3-structured.html  ← вариант страницы Logs: 3 панели + метрики
docs/
  api-page-plan.md  ← план реализации ApiPage (все шаги выполнены ✅)
```

---

## CSS ПЕРЕМЕННЫЕ (index.css)

```css
--bg-primary:     #060606        /* основной чёрный фон */
--bg-secondary:   #0a1a25        /* фон карточек, модалей */
--bg-card:        #0d2033        /* внутренние блоки карточек */
--bg-hover:       #112840        /* ховер-состояния */
--accent:         #2F6997        /* синий акцент */
--accent-bright:  #3d87c0        /* яркий синий (badge FF, live-dot и т.д.) */
--text-primary:   #e8f4fd        /* основной текст */
--text-secondary: #6a8fa8        /* вторичный серый текст */
--text-muted:     #3d6680        /* приглушённый текст, лейблы */
--success:        #00c97a        /* зелёный (прибыль, ОК статусы) */
--error:          #e03e3e        /* красный (убыток, закрытые статусы) */
--warning:        #f0a500        /* оранжевый (предупреждения, SF strategy) */
--border:         #1a3a52        /* цвет границ блоков */
--font-sans:      'Inter'        /* основной шрифт */
--font-mono:      'JetBrains Mono' /* для чисел, кодов, спредов */
```

**Важно:** `--accent-bright` (#3d87c0) используется для FF стратегии и акцентных элементов.  
`--success` (#00c97a) — зелёный для спреда HOT, LONG сторона, прибыли.  
`--warning` (#f0a500) — SF стратегия, предупреждения, funding timer.

---

## МОДЕЛЬ ДАННЫХ — Объект Opportunity

Это центральная сущность всего приложения. Каждая возможность:

```javascript
{
  id: 1,                           // уникальный ID
  symbol: 'BTCUSDT',              // торговая пара
  strategy: 'ff' | 'sf',         // ff = Futures/Futures, sf = Spot/Futures

  // BID сторона = где ПОКУПАЕМ (LONG)
  bid_ex: 'binance',              // ID биржи из EXCHANGES
  bid_price: 67240.50,            // текущая цена
  bid_funding: {
    rate: 0.0100,                 // ставка фандинга в % (может быть отриц.)
    next_time: 1234567890         // unix timestamp следующего начисления
  },
  bid_volume: 125000000,          // объём 24h в USD
  bid_transfer: {
    deposit: true,                // можно ли ввести монету на биржу
    withdraw: true                // можно ли вывести монету с биржи
  },

  // ASK сторона = где ПРОДАЁМ (SHORT)
  ask_ex: 'bybit',
  ask_price: 69420.10,
  ask_funding: { rate: -0.0050, next_time: 1234567890 },
  ask_volume: 98000000,
  ask_transfer: { deposit: true, withdraw: false },

  spread: 3.24,                   // (ask_price - bid_price) / bid_price * 100
  max_volume_entry: 50000,        // рекомендуемый объём входа в $
  first_seen: '2024-01-01T12:00:00Z'  // ISO дата первого появления
}
```

**Формула спреда:** `(ask_price - bid_price) / bid_price * 100`  
**Формула прибыли:** `spread * tradeAmount / 100`

---

## СТРАТЕГИИ

| Код | Название | Смысл |
|-----|----------|-------|
| `ff` | FUNDING / FUNDING | Оба контракта фьючерсные. Цвет: `--accent-bright` (синий/голубой) |
| `sf` | SPOT / FUTURES | bid_ex — спот, ask_ex — фьючерс. Цвет: `--warning` (оранжевый) |

---

## БИРЖИ (constants.js)

| ID | Название | Short | Цвет |
|----|---------|-------|------|
| binance | Binance | BN | #F3BA2F |
| bybit   | Bybit   | BB | #F7A600 |
| okx     | OKX     | OK | #FFFFFF |
| gate    | Gate    | GT | #2354E6 |
| kucoin  | KuCoin  | KC | #00A550 |
| mexc    | MEXC    | MX | #00B897 |
| bitget  | Bitget  | BG | #00F0FF |
| bingx   | BingX   | BX | #1DA2B4 |

Каждая биржа имеет: `futuresUrl(sym)` и `spotUrl(sym)` — функции для ссылок в терминал.  
Логотипы через Google Favicons API: `https://www.google.com/s2/favicons?domain=binance.com&sz=32`

**Важно для OKX:** цвет #FFFFFF (белый), для иконок используй `#ddd` как фон.

---

## APP.JSX — STATE MANAGEMENT

### Весь state приложения:

```javascript
activeTab: 'futures'        // активный таб ('futures' | 'developers')
activePage: 'futures'       // активная страница ('futures' | 'api') — роутинг
sortMode: 'spread'          // 'spread' | 'age' | 'volume'
viewMode: 'grid'            // 'grid' | 'table'
filterOpen: false           // открыт ли FilterDrawer
filters: {...}              // объект фильтров
selected: null              // выбранный opp (открывает DetailModal)
liveOpp: null               // живая копия selected, обновляется каждые 10s
selectedActiveTrade: null   // активная сделка выбранная в ActiveTradesBar
liveData: null              // обогащённые данные с API
isLoading: true             // показывать ли LoadingScreen
favorites: []               // localStorage: 'favorites'
hidden: []                  // localStorage: 'hidden'
activeTrades: []            // localStorage: 'activeTrades', макс 5
```

### DEFAULT_FILTERS:

```javascript
{
  strategy: { sf: true, ff: true },
  exchanges: ['binance','bingx','bitget','bybit','kucoin','gate','mexc','okx'],
  minSpread: 0,
  tradeAmount: 1000,
  funding: { positive: true, negative: true },
  transfer: { deposit: true, withdraw: true },  // оба true по умолчанию
  onlyPositiveFunding: false
}
```

### Фильтр transfer — ТОЧНОЕ совпадение:

```javascript
// Фильтр transfer работает как exact match:
// deposit: true, withdraw: true  → показывать только пары где ОБА открыты
// deposit: false, withdraw: false → показывать только пары где ОБА закрыты
const depOk = !!(o.bid_transfer?.deposit && o.ask_transfer?.deposit)
const wdOk  = !!(o.bid_transfer?.withdraw && o.ask_transfer?.withdraw)
return depOk === filters.transfer.deposit && wdOk === filters.transfer.withdraw
```

### Polling — логика пауз:

- `enrichOpportunities(mockData)` каждые **60 секунд** через `intervalRef`
- Пауза когда `selected !== null` (открыта модалка) — `useEffect([selected])`
- Пауза когда `activePage !== 'futures'` (открыта API страница) — `useEffect([activePage])`
- `enrichSingleOpportunity(selected)` каждые **10 секунд** пока модалка открыта — `liveOppIntervalRef`
- DetailModal получает `liveOpp` (не `selected`) для live-обновлений

---

## API.JS — FETCH К БИРЖАМ

### Кэширование:
- Глобальный объект `cache`
- TTL: **55 секунд** (isFresh проверяет)
- `clearCacheForOpp(opp)` — очищает кэш для конкретной пары (используется при открытии модалки)

### Прямые CORS (без proxy):
- **Binance:** `fapi.binance.com` — `/fapi/v1/ticker/24hr` + `/fapi/v1/premiumIndex`
- **Bybit:** `api.bybit.com` — `/v5/market/tickers`
- **OKX:** `okx.com/api/v5` — `/public/funding-rate` + `/market/ticker`
- **Bitget:** `api.bitget.com` — `/api/v2/mix/market/ticker`

### Через Vite proxy (нет CORS):
- **Gate.io:** `/gate-api` → `/api/v4/futures/usdt/tickers` + `/contracts` + `/spot/currencies`
- **BingX:** `/bingx-api` → `/openApi/swap/v2/quote/ticker` + `/premiumIndex`
- **MEXC:** `/mexc-api` → `/api/v1/contract/ticker` + `/funding_rate`
- **KuCoin:** `/kucoin-api` → `/api/v1/contracts/{symbol}USDTM`

### Экспортируемые функции:
```javascript
enrichOpportunities(mockData)        // обогащает все 20 opp параллельно
enrichSingleOpportunity(opp)         // обогащает одну пару (для DetailModal 10s)
clearCacheForOpp(opp)                // сбрасывает кэш для bid_ex и ask_ex
fetchBinance/Bybit/OKX/Gate/...      // прямые fetch функции (используются в ApiPage)
```

**Gate.io**: `fetchGate(sym)` возвращает `{ funding, volume, deposit, withdraw }` — deposit/withdraw доступны через публичный API без авторизации.

---

## WS.JS — WEBSOCKET МЕНЕДЖЕР

```javascript
connectOrderBook(exchange, symbol, market, onUpdate) → { close() }
```

- `exchange` — lowercase: 'binance', 'bybit', 'okx', 'gate', 'bingx', 'mexc', 'bitget', 'kucoin'
- `market` — 'futures' | 'spot'
- `onUpdate(data)` — вызывается при каждом снэпшоте: `{ bids: [[price, qty], ...], asks: [[price, qty], ...] }`
- bids отсортированы по убыванию цены (лучший bid первый)
- asks отсортированы по возрастанию цены (лучший ask первый)
- KuCoin требует REST-токен перед WS подключением (автоматически)

```javascript
calcVwap(orders, usdAmount) → number | null
```
Считает среднюю цену входа VWAP для заданной суммы в USD. Идёт по массиву `[[price, qty], ...]`.

---

## COINTSTATUS.JS — СТАТУСЫ ПЕРЕВОДОВ

Кэш TTL: **5 минут** (отдельный от api.js).  
Каждая биржа — своя функция `get{Exchange}Status(symbol)`.  
Возвращает: `{ deposit: boolean, withdraw: boolean }`.

Биржи с HMAC авторизацией: Binance, Bybit, OKX, MEXC, BingX, Bitget.  
**KuCoin** — публичный endpoint, без авторизации.  
**Gate** — данные берутся через `fetchGate()` из api.js (публичный endpoint).

> **Важно:** API ключи должны быть настроены для работы coinStatus. В dev режиме возможны ошибки авторизации.

---

## SIGN.JS — КРИПТОГРАФИЯ

```javascript
hmacHex(secret, message)    // → hex строка HMAC-SHA256
hmacBase64(secret, message) // → Base64 строка HMAC-SHA256
```

Использует **Web Crypto API** (встроенный в браузер), не npm пакеты.

---

## UTILS.JS — ВСЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

```javascript
getExchangeInfo(id)                    // → {name, short, color, logo, futuresUrl, spotUrl}
formatVolume(value)                    // 125000000 → '$125M'
formatPrice(price)                     // адаптивное форматирование цены
formatAge(isoString)                   // → '5м' или '2ч 30м' или '1д 3ч'
getSpreadColor(spread)                 // number → цвет CSS
getSpreadGrade(spread)                 // number → {label:'HOT'|'GOOD'|'OK'|'LOW', bg, color}
calcProfit(spread, amount)             // (3.24, 1000) → '32.40' (строка!)
formatTimeRemaining(unix)              // unix timestamp → 'XчYм'
getAgeIcon(isoString)                  // → '🆕' | '🕐' | '⏳'
getTransferIcon(val)                   // → {icon: '✅'|'🚫'|'❓'}
calcMaxVolume(orders, targetPrice, side) // объём книги до целевой цены
```

**calcMaxVolume(orders, targetPrice, side):**
- `side = 'long'`: идёт по asks, считает объём пока цена < targetPrice
- `side = 'short'`: идёт по bids, считает объём пока цена > targetPrice
- Возвращает `{ usd: number, count: number }` или null

**getSpreadColor пороги:**
- `>= 3%` → #00c97a (HOT), `>= 2%` → #7ecf5a (GOOD), `>= 1%` → #f0a500 (OK), `< 1%` → #6a8fa8 (LOW)

---

## SIDEBAR.JSX

Props: `activeTab, onTabChange, activePage, onPageChange`

- Ширина: 60px (свёрнута) / 220px (при наведении) — CSS transition
- Под-пункты появляются при наведении (CSS hover на `.sidebar`)
- **Futures** таб: `onPageChange('futures')` при клике
- **Developers** таб: показывает под-пункты API (активный) и Logs (disabled)
- CEX-CEX под-пункт: `onPageChange('futures')`
- API под-пункт: `onPageChange('api')`

---

## APIPAGE.JSX — СТРАНИЦА ТЕСТИРОВАНИЯ API

Доступна через: Developers → API (в Sidebar).  
Рендерится в App.jsx когда `activePage === 'api'`.

### Архитектура:
```
ApiPage
├── Header (title=API, FUTURES mode static, BTC/ETH switcher)
├── Toolbar (▶ ТЕСТ ВСЕГО / ⬛ ОСТАНОВИТЬ, filter pills, counters OK/ERR/TOTAL)
├── Matrix
│   ├── MatrixHead (БИРЖА | FUNDING | VOLUME | TRANSFER | WS | ДЕЙСТВИЕ)
│   └── MatrixRow × 8 (dot + name | 4 ячейки | кнопка ▶ ТЕСТ)
└── DetailPanel (fixed bottom, логи ячейки + Copy)
```

### State:
```javascript
filterCol: 'all'      // 'all' | 'funding' | 'volume' | 'transfer' | 'ws'
testState: {...}      // { Binance: { funding: {status, val, logs}, ... }, ... }
selected: null        // { ex: 'Binance', test: 'funding' } — открытая ячейка
copied: false         // состояние кнопки Copy в detail панели
isRunning: false      // идёт ли тестирование
testCoin: 'BTC'       // 'BTC' | 'ETH'
stopRef               // useRef(false) — флаг остановки
activeWsRef           // useRef([]) — активные WS для cleanup
```

### Символы для тестов:
```javascript
// KuCoin использует другой символ для BTC фьючерсов:
TEST_SYMBOL = { ..., KuCoin: testCoin === 'BTC' ? 'XBT' : testCoin }
// Для transfer (coinStatus) всегда используем spot символ:
SPOT_SYMBOL = { ..., KuCoin: testCoin }  // всегда 'BTC', не 'XBT'
```

### Источники данных:
| Тест | Функция | Файл |
|------|---------|------|
| Funding | `fetchBinance(sym)`, `fetchBybit(sym)`, ... | `api.js` |
| Volume | `fetchBinance(sym)`, `fetchBybit(sym)`, ... | `api.js` |
| Transfer | `getBinanceStatus(sym)`, ... / Gate через `fetchGate` | `coinStatus.js` / `api.js` |
| WebSocket | `connectOrderBook(ex, sym, 'futures', cb)` | `ws.js` |

### Поведение остановки:
- При смене монеты (BTC↔ETH) — тесты останавливаются, WS закрываются
- При уходе со страницы (unmount) — тесты останавливаются, WS закрываются
- Кнопка ОСТАНОВИТЬ — вызывает `abort()` на активных WS промисах (не ждёт 8s таймаут)

### Ширина матрицы:
- `filterCol === 'all'` → `width: 100%`, `grid: 160px repeat(N, 1fr) 110px`
- `filterCol !== 'all'` → `width: 160 + N*200 + 110 px`, `grid: 160px repeat(N, 200px) 110px`

---

## HEADER.JSX

Props: `total, sortMode, onSort, viewMode, onViewMode, onOpenFilters, hiddenItems, onRestore`

Внутренние субкомпоненты:
- **Clock** — текущее время, обновляется каждую секунду
- **SortDropdown** — выпадающий список сортировки
- **HiddenDropdown** — список скрытых элементов с восстановлением

> **Важно:** в HiddenDropdown используй `var(--text-primary)` и `var(--text-muted)` — не опечатки!

---

## DETAILMODAL.JSX — ПОЛНАЯ АРХИТЕКТУРА

Props: `opp, tradeAmount, onClose, isFavorite, onFavorite, onHide, onTrade, initialAvgLong, initialAvgShort, isActiveTrade, onRemoveTrade`

App.jsx передаёт `liveOpp` (не `selected`) — обновляется каждые 10s через `enrichSingleOpportunity`.

### State:
```javascript
chartMode: 'entry-prices'
avgLong: ''              // инициализируется из initialAvgLong
avgShort: ''             // инициализируется из initialAvgShort
fundingSecs: number
liveHistory: [{bid, ask}]
bidBook: null            // книга ордеров BID биржи (WS)
askBook: null            // книга ордеров ASK биржи (WS)
```

### WebSocket эффект:
```javascript
useEffect(() => {
  // connectOrderBook для bid_ex и ask_ex
  return () => { bidWs.close(); askWs.close() }
}, [opp.bid_ex, opp.ask_ex, opp.symbol, opp.strategy])
// Перезапускается только при смене биржи/символа, не при каждом liveOpp update
```

### ExCard (внутренний компонент):
- Сетка метрик **3×2**: Funding Rate, Макс. объём | Объём 24h, Следующий фандинг | Депозит, Вывод
- `calcMaxVolume` используется для "Макс. объём" — объём книги ордеров до текущей цены

### Графики (4 режима):

| Режим | Описание | Требует |
|-------|----------|---------|
| `entry-prices` | BID (зелёная) + ASK (красная) линии live | Ничего |
| `entry-spread` | Спред входа, зона профита, target 0.30% | Ничего |
| `exit-prices` | Как entry + пунктиры avgLong/avgShort | avgLong + avgShort |
| `exit-spread` | Обратный спред, 0% как цель | avgLong + avgShort |

---

## ACTIVETRADESBAR.JSX

Панель активных сделок над гридом. Props: `trades, liveData, onSelect, onRemove`

- Показывает до 5 активных сделок (хранятся в localStorage: 'activeTrades')
- Клик → открывает DetailModal с заполненными avgLong/avgShort
- `addActiveTrade(trade)` / `removeActiveTrade(id)` — в App.jsx

---

## VITE CONFIG — PROXY

```javascript
'/gate-api'       → 'https://api.gateio.ws'
'/bingx-api'      → 'https://open-api.bingx.com'
'/mexc-api'       → 'https://contract.mexc.com'
'/kucoin-api'     → 'https://api-futures.kucoin.com'
'/mexc-spot-api'  → 'https://api.mexc.com'
'/kucoin-spot-api'→ 'https://api.kucoin.com'
'/binance-api'    → 'https://api.binance.com'
```

> **Важно:** Не добавлять новые URL в компоненты — использовать только существующие функции из api.js и coinStatus.js.

---

## ПРАВИЛА РАБОТЫ С ПРОЕКТОМ

1. **Стиль CSS**: inline `<style>` тег в начале компонента (паттерн `const style = \`...\``)
2. **Нет CSS-модулей**, нет Tailwind — только CSS переменные из index.css
3. **Иконки** — только из `lucide-react`
4. **Данные** — всегда через `opp.bid_funding?.rate` (опциональная цепочка!)
5. **Цвета спреда** — всегда через `getSpreadColor(spread)` из utils.js
6. **Форматирование** — всегда через функции из utils.js
7. **Новые URL запросы** — ЗАПРЕЩЕНО. Только уже написанные функции из api.js / coinStatus.js
8. **Новые утилиты** — в utils.js, не inline в компоненте
9. **Пользователь пишет код вручную**, Claude объясняет и инструктирует

---

## ПРОГРЕСС РАЗРАБОТКИ

- [x] Модуль 0 — Среда (Vite, npm)
- [x] Модуль 1 — index.html + index.css
- [x] Модуль 2 — main.jsx + App.jsx
- [x] Модуль 3 — constants.js + utils.js
- [x] Модуль 4 — mockData.js
- [x] Модуль 5 — Sidebar.jsx
- [x] Модуль 6 — Header.jsx
- [x] Модуль 7 — App State (useState, useMemo, useEffect, favorites, hidden)
- [x] Модуль 8 — StatsRow.jsx
- [x] Модуль 9 — OpportunityCard.jsx
- [x] Модуль 10 — OpportunityGrid.jsx
- [x] Модуль 11 — FilterDrawer.jsx
- [x] Модуль 12 — DetailModal.jsx (Terminal вариант)
- [x] Модуль 12.5 — Client-side Exchange API (api.js, coinStatus.js, sign.js)
- [x] Модуль 13 — WebSocket + Smart Polling (ws.js, App.jsx intervals, DetailModal WS)
- [x] Модуль 14 — Developers / API Page (ApiPage.jsx, Sidebar routing, activePage)
- [x] Модуль 14.5 — ActiveTradesBar, P&L calculator в DetailModal
- [ ] Модуль 15 — Developers / Logs Page (3 варианта дизайна готовы в previews/)

---

## ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ И ОСОБЕННОСТИ

- `calcProfit()` возвращает **строку** (`.toFixed(2)`), не число — не использовать в математике
- `OpportunityCard` не мемоизирован — все карточки ре-рендерятся при обновлении liveData
- Нет Context API — все props передаются явно через цепочку (App → Grid → Card)
- `activeTrades` валидируется при чтении из localStorage (`Array.isArray`)
- Header высота: **72px** — все кастомные страницы (ApiPage и др.) должны использовать ту же высоту
