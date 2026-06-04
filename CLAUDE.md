# AXIOMA SCAN — Инструкция для Claude

> Читать КАЖДЫЙ раз перед любой задачей по проекту.
> Последнее обновление: июнь 2026

---

## ЧТО ТАКОЕ AXIOMA

Криптовалютный арбитражный сканер. Ищет монеты где одна биржа торгует дороже другой.  
**Стек:** React 19 + Vite 5 + чистый CSS. Только `lucide-react` для иконок.  
**Шрифты:** Inter (текст) + JetBrains Mono (числа, коды).  
**Бэкенд:** C# .NET 10, PostgreSQL, `localhost:5000`. Cookie: `AxionScan.Auth`.

---

## СТРУКТУРА ФАЙЛОВ

```
src/
  components/
    ActiveTradesBar.jsx   — панель активных позиций (до 5, localStorage + БД activeCoins)
    ApiPage.jsx           — страница тестирования API (Developers > API)
    DetailModal.jsx       — модальное окно подробной информации о паре
    FilterDrawer.jsx      — боковой drawer с фильтрами + сохранение настроек
    Header.jsx            — шапка: сортировка, вид, скрытые элементы, время
    LoadingScreen.jsx     — экран загрузки при первом fetch
    OpportunityCard.jsx   — карточка одной арбитражной возможности
    OpportunityGrid.jsx   — грид / таблица карточек
    Sidebar.jsx           — левая боковая панель навигации
    StatsRow.jsx          — строка статистики над гридом
    TelegramAuthModal.jsx — авторизация через Telegram Widget
    AccessDenied.jsx      — экран отказа в доступе

  App.jsx         — главный компонент: state, фильтрация, роутинг страниц
  api.js          — fetch к 8 биржам, enrichOpportunities(), Gate prefetch
  auth.js         — authenticateWithTelegram(), checkAccess(), saveUserSettings()
  coinStatus.js   — статусы депозит/вывод (batch MEXC/OKX/Bitget, TTL 5 мин)
  constants.js    — EXCHANGES (8 бирж), SORT_OPTIONS, TABS
  index.css       — CSS-переменные, reset, глобальные стили
  main.jsx        — entry point
  rateLimiter.js  — rate limiter + ArrayBuffer dedup
  sign.js         — hmacHex(), hmacBase64() для авторизованных API
  utils.js        — форматирование, calcVwap, calcProfit, calcDepthSpread, parseExchange
  ws.js           — WebSocket коннекторы для 8 бирж (спот + фьючерсы)

tests/
  unit/           — 229 тестов (api, ws, appLogic, auth, coinStatus, rateLimiter, sign, utils)
  integration/    — 42 теста (25 HTTP + 17 WS по всем биржам)

vite.config.js    — port 5173, proxy для 12 эндпоинтов бирж + /backend
vitest.config.integration.js — integration тесты (node, testTimeout 40000)
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ЛОГИКА BID/ASK

```
bid_ex = SELL сторона (красная панель) — биржа с ВЫСОКОЙ ценой
ask_ex = BUY  сторона (зелёная панель) — биржа с НИЗКОЙ ценой

bid_price > ask_price → спред положительный → арбитраж возможен

Стратегия sf (spot_futures):
  bid_ex = FUTURES (SELL) — всегда фьючерс
  ask_ex = SPOT   (BUY)  — всегда спот

Стратегия ff (futures_futures):
  bid_ex = FUTURES (SELL, дороже)
  ask_ex = FUTURES (BUY,  дешевле)

SPOT НИКОГДА не бывает на стороне SELL (bid_ex)!
НЕ МЕНЯТЬ местами bid↔ask в OpportunityCard!
```

Нормализация стратегии в `api.js`:
```javascript
// Поддерживает оба формата (бэкенд может отдавать любой из них)
'spot_futures'    → 'sf'
'futures_futures' → 'ff'
'sf'              → 'sf'  (уже нормализован)
'ff'              → 'ff'  (уже нормализован)
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ФОРМУЛЫ СПРЕДА

### Везде в проекте используется единая формула:
```javascript
spread = (bid_price - ask_price) / bid_price * 100
```

| Файл | Место | Формула |
|------|-------|---------|
| `api.js` | `enrichOpportunities` шаг 4.1 | `(bid_price - ask_price) / bid_price * 100` |
| `App.jsx` | `useMemo` пересчёт VWAP | `(bid_price - ask_price) / bid_price * 100` |
| `DetailModal.jsx` | `liveSpread` | `(vwapBid - vwapAsk) / vwapBid * 100` |
| `DetailModal.jsx` | `entry-spread` график | `(p.bid - p.ask) / p.bid * 100` |
| `DetailModal.jsx` | `exit-spread` график | `(p.bidExit - p.askExit) / p.bidExit * 100` |
| `DetailModal.jsx` | `exitSpread` калькулятор | `(avgShort - avgLong) / avgShort * 100` |

> ⛔ ЗАПРЕЩЕНО: `(ask - bid) / bid` — даёт отрицательный спред!

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — VWAP В DETAILMODAL

```javascript
// ВХОД:
vwapBid     = calcVwap(bidBook.bids, tradeAmount)  // SELL → бьём по bids
vwapAsk     = calcVwap(askBook.asks, tradeAmount)  // BUY  → бьём по asks

// ВЫХОД (разворот):
vwapBidExit = calcVwap(bidBook.asks, tradeAmount)  // закрытие SHORT → asks
vwapAskExit = calcVwap(askBook.bids, tradeAmount)  // закрытие LONG  → bids
```

> ⛔ ЗАПРЕЩЕНО: `calcVwap(bidBook.asks)` для входа — неверная сторона!

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — КАЛЬКУЛЯТОР ВЫХОДА

```
avgShort = цена входа на bid-бирже (SELL/SHORT) — высокая цена
avgLong  = цена входа на ask-бирже (BUY/LONG)   — низкая цена

exitSpread = (avgShort - avgLong) / avgShort * 100
exitPnl    = exitSpread * tradeAmount / 100
```

Левый инпут  → `avgShort` (BID/SELL)
Правый инпут → `avgLong`  (ASK/BUY)

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ЦВЕТА ГРАФИКОВ DETAILMODAL

```
bid-линия (SELL) = КРАСНАЯ (#e03e3e) — сверху
ask-линия (BUY)  = ЗЕЛЁНАЯ (#00c97a) — снизу
```

| График | Описание |
|---|---|
| `entry-prices` | bid=красный, ask=зелёный, заливка красная под bid |
| `exit-prices` | заливка между линиями (индикатор схождения) |
| `entry-spread` | одна зелёная линия, без цели |
| `exit-spread` | синяя (профит) / красная (ещё рано), нулевая = уровень входа |

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ДАННЫЕ ГРАФИКОВ

```javascript
// liveHistory: 4 поля каждые 5 секунд
{ bid, ask, bidExit, askExit }

// entry-prices  → p.bid, p.ask
// exit-prices   → p.bidExit, p.askExit
// entry-spread  → (p.bid - p.ask) / p.bid
// exit-spread   → (p.bidExit - p.askExit) / p.bidExit
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ЦИКЛ СКАНИРОВАНИЯ

```
Оптимизации (api.js):
- Обогащаются только ЛУЧШИЕ монеты (1 на символ) → ~16 запросов вместо ~56
- Варианты: _raw: true (без API данных, загружаются лениво при клике)
- MEXC батч dedup: один запрос даже при параллельных вызовах
- Результат: ~41с вместо ~105с
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — КЭШ liveData

```javascript
LIVE_DATA_CACHE_KEY = 'axioma_live_data_cache'
TTL = 3 минуты

// < 3 мин → показываем кэш сразу, цикл в фоне
// > 3 мин → удаляем, LoadingScreen
// logout  → кэш очищается
// raw_bid/raw_ask обрезаны до топ-20 уровней
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — activeCoins

```
Структура: { symbol, bid_exchange, ask_exchange, strategy, priceShort, priceLong }
Лимит: 5 монет

Потоки:
  "ТОРГОВАТЬ" → addActiveTrade() + addActiveCoin() → БД
  "ВЫХОД"/X   → removeActiveTrade() → removeActiveCoin() → БД
  Корзина     → toggleHidden() → removeActiveCoin() + removeActiveTrade()
  Перезагрузка → activeCoins из БД → synthetic activeTrades (_restored: true)
  Лимит 5 монет → уведомление в DetailModal (4с)

⛔ toggleHidden: вся логика ВНЕ setState callback (React антипаттерн)!
⛔ removeActiveTrade автоматически вызывает removeActiveCoin — не дублировать!
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — WEBSOCKET КОННЕКТОРЫ

```
Каждый коннектор поддерживает spot И futures (marketType параметр).

MEXC Spot:
  endpoint:  wss://wbs-api.mexc.com/ws  (wbs.mexc.com отключён Aug 4 2025)
  подписка:  spot@public.limit.depth.v3.api@ETHUSDT@20  (БЕЗ .pb!)
  ответ:     msg.d.bids / msg.d.asks

KuCoin Spot:
  токен:  POST /kucoin-spot-api/api/v1/bullet-public → api.kucoin.com
  топик:  /spotMarket/level2Depth50:ETH-USDT
  данные: [[price, size]]

KuCoin Futures:
  токен:  POST /kucoin-api/api/v1/bullet-public → api-futures.kucoin.com
  топик:  /contractMarket/level2:ETHUSDTM
  данные: {price, qty}

BingX:
  Один URL для spot и futures: wss://open-api-ws.bingx.com/market
  Все сообщения gzip. Ping→Pong каждые 5с обязательно.
  В браузере: Blob → DecompressionStream('gzip')

Логи ws.onclose обязательны во всех коннекторах:
  ws.onclose = (e) => { log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`) }
```

---

## АВТОРИЗАЦИЯ

```
POST /backend/api/auth/telegram  → cookie AxionScan.Auth + сессия
PUT  /backend/api/user-settings  → сохранение + актуальный AuthResponse
  payload: { exchanges, minSpread, tradeAmount, strategy, funding, transfer, activeCoins }
```

**Auth статусы:** `unknown` → `checking` → `ready`
**canScan** = `ready` + `isCexCexPaid` + страница `futures` + модалка закрыта

---

## DEPTH SPREAD

```javascript
// utils.js — calcDepthSpread(bidBook, askBook)
// Объективная метрика, не зависит от tradeAmount
// overlap = min(Σ bid USD, Σ ask USD)
// spread  = (bid_vwap - ask_vwap) / bid_vwap * 100
// В opp: depth_spread (%), depth_overlap (USD)
// В OpportunityCard: серым рядом с userSpread в футере
```

---

## СИСТЕМА ЛОГИРОВАНИЯ (aLog)

```javascript
import { aLog } from './api.js'
// Уровни: log, info, warn, error, success, group, groupEnd
// В браузер — только isAdmin=true
// В logCollector — всегда (для скачивания .txt)
// WS логи: throttle emit 5с, только первый emit полностью
```

---

## ФИЛЬТРАЦИЯ (App.jsx useMemo)

1. Пересчёт VWAP по `tradeAmount`
2. Фильтр стратегии
3. Фильтр funding (`onlyPositiveFunding`)
4. Фильтр бирж
5. Фильтр минимального спреда
6. **Промоут вариантов** (`_raw` → автопроход transfer)
7. Фильтр transfer (`showAllTransfer` = отключает полностью)
8. Сортировка + избранные вверх
9. Скрытые карточки

---

## CSS ПЕРЕМЕННЫЕ

```css
--bg-primary: #060606  --bg-secondary: #0a1a25  --bg-card: #0d2033
--bg-hover: #112840    --accent: #2F6997         --accent-bright: #3d87c0
--text-primary: #e8f4fd  --text-secondary: #6a8fa8  --text-muted: #3d6680
--success: #00c97a  --error: #e03e3e  --warning: #f0a500  --border: #1a3a52
--font-sans: 'Inter'  --font-mono: 'JetBrains Mono'
```

---

## БИРЖИ

`binance` · `bybit` · `okx` · `gate` · `kucoin` · `mexc` · `bitget` · `bingx`

---

## ПРАВИЛА РАЗРАБОТКИ

1. **CSS** — только inline `<style>` тег в компоненте
2. Нет CSS-модулей, нет Tailwind
3. **Иконки** — только `lucide-react`
4. **Данные** — всегда `?.` опциональная цепочка
5. **Форматирование** — только через `utils.js`
6. **Новые URL** — только через `api.js` / `coinStatus.js`
7. **Высота шапки** — 72px везде
8. **calcProfit()** возвращает **строку**, не число
9. Логи в браузер только при `isAdmin === true` через `aLog`
10. Props явно через цепочку, без Context API
11. **Перед изменением файла — читать актуальную версию из репозитория**
12. **Сначала план → одобрение → только потом код**
13. `toggleHidden` — логика ВНЕ setState callback
14. `removeActiveTrade` автоматически вызывает `removeActiveCoin`

---

## ПРОГРЕСС

| Этап | Статус |
|------|--------|
| 0–14.5 UI, компоненты, WebSocket, ApiPage, ActiveTrades | ✅ |
| 15 Реальные данные с бэкенда, VWAP, фильтрация | ✅ |
| 15.5–15.8 Авторизация user.json, логирование, rateLimiter, Gate/MEXC | ✅ |
| 16 Авторизация через Telegram Widget + cookie | ✅ |
| 16.1 PUT /api/user-settings — сохранение настроек | ✅ |
| 16.2 Исправлены SELL/BUY панели (bid↔ask были перепутаны) | ✅ |
| 16.3 checkAccess получает актуальный AuthResponse с бэкенда | ✅ |
| 16.4 Промоут вариантов при фильтрации | ✅ |
| 16.5 Нормализация strategy spot_futures→sf | ✅ |
| 16.6 Формула спреда: `(bid-ask)/bid` | ✅ |
| 16.7 DetailModal: правильные стороны стакана для VWAP | ✅ |
| 16.8 DetailModal: цвета bid=красный ask=зелёный | ✅ |
| 16.9 DetailModal: калькулятор выхода avgShort=BID avgLong=ASK | ✅ |
| 16.10 DetailModal: exit-prices/exit-spread → bidExit/askExit | ✅ |
| 16.11 DetailModal: entry-spread убрана цель 0.30% | ✅ |
| 17 WS логирование (aLog) + ws.test.js (92 теста) | ✅ |
| 17.1 Оптимизация цикла: лучшие монеты + ленивые варианты | ✅ |
| 17.2 MEXC батч dedup | ✅ |
| 17.3 depthSpread в utils.js + OpportunityCard | ✅ |
| 17.4 Max Size исправлен | ✅ |
| 17.5 activeCoins — синхронизация с БД | ✅ |
| 17.6 Кэш liveData (TTL 3 мин) | ✅ |
| 17.7 FilterDrawer: чекбокс "Показать все" | ✅ |
| 17.8 ActiveTradesBar: скелетон загрузки | ✅ |
| 17.9 DetailModal: уведомление лимит 5 монет | ✅ |
| 17.10 toggleHidden: корректное удаление из activeCoins | ✅ |
| 17.11 Unit тесты: 229/229 ✅ 0 ошибок | ✅ |
| 17.12 rateLimiter: unhandled rejection fix | ✅ |
| 17.13 Strategy fix для _raw вариантов (sf/ff нормализация) | ✅ |
| 17.14 ws.js: onclose логи для всех 8 коннекторов | ✅ |
| 17.15 ws.js: delta/update/snapshot size логи | ✅ |
| 17.16 ws.js: emit — tag и msg как отдельные аргументы aLog | ✅ |
| 17.17 MEXC spot WS: новый endpoint wbs-api.mexc.com + JSON канал | ✅ |
| 17.18 KuCoin: раздельные токены spot/futures + spot топик | ✅ |
| 17.19 Integration тесты: 42 теста (25 HTTP + 17 WS) | ✅ |
| 17.20 Bitget spot WS тест добавлен | ✅ |
| 17.21 BingX spot тест добавлен (REST fallback) | ✅ |
| **18 Следующий этап** | ⬜ |