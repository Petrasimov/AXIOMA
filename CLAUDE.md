# AXIOMA SCAN — Инструкция для Claude

> Читать КАЖДЫЙ раз перед любой задачей по проекту.
> Последнее обновление: май 2026

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
    ActiveTradesBar.jsx   — панель активных сделок (до 5, localStorage)
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
  utils.js        — форматирование, calcVwap, calcProfit, parseExchange

vite.config.js    — port 5173, proxy для 12 эндпоинтов бирж + /backend
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО — ЛОГИКА BID/ASK

```
bid_ex = SELL сторона (красная панель) — биржа с ВЫСОКОЙ ценой
ask_ex = BUY  сторона (зелёная панель) — биржа с НИЗКОЙ ценой

BID > ASK → спред положительный → арбитраж возможен

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
// Бэкенд → фронт
'spot_futures'    → 'sf'
'futures_futures' → 'ff'
```

---

## АВТОРИЗАЦИЯ

**Схема:**
```
1. Telegram Widget → POST /backend/api/auth/telegram (camelCase payload)
   → cookie AxionScan.Auth + сессия в sessionStorage

2. Каждые 60с checkAccess():
   → PUT /backend/api/user-settings {} → актуальный AuthResponse (isAdmin etc.)
   → GET /backend/api/analysis/order-books-json → 200=жива / 401=разлогин

3. Сохранение настроек:
   → PUT /backend/api/user-settings {exchanges, minSpread, ...}
   → обновляем sessionStorage без перезагрузки
```

**Auth статусы:** `unknown` → `checking` → `ready`

**canScan** = `ready` + `isCexCexPaid` + страница `futures` + модалка закрыта

---

## ФИЛЬТРАЦИЯ (App.jsx useMemo)

Порядок:
1. Пересчёт VWAP по `tradeAmount`
2. Фильтр стратегии
3. Фильтр funding
4. Фильтр бирж
5. Фильтр минимального спреда
6. **Промоут вариантов**: если главная не прошла → берём лучший вариант из `.variants[]`
7. Фильтр transfer
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
9. Логи в браузер только при `isAdmin === true`
10. Props явно через цепочку, без Context API

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
| **17 Следующий этап** | ⬜ |