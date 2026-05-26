# AXIOMA SCAN — Руководство по тестированию

> Полная документация тестовой инфраструктуры.  
> Не изменяет основной код — только новые файлы.

---

## Быстрый старт

```bash
# 1. Установить зависимости (один раз)
npm install

# 2. Установить браузеры для Playwright (один раз)
npx playwright install chromium

# 3. Запустить все unit-тесты
npm test

# 4. Запустить unit-тесты с визуальным интерфейсом
npm run test:ui

# 5. Запустить E2E тесты (нужен npm run dev в отдельном терминале)
npm run test:e2e
```

---

## Структура файлов

```
tests/
  unit/
    utils.test.js        — 28 тестов: parseExchange, calcVwap, calcProfit, formatters
    sign.test.js         — 8 тестов: hmacHex, hmacBase64
    rateLimiter.test.js  — 8 тестов: очередь + ArrayBuffer dedup
    coinStatus.test.js   — 12 тестов: TTL кэш, batch MEXC/OKX/Bitget, ошибки
    api.test.js          — 14 тестов: enrichOpportunities, Gate prefetch, кэш, TTL
    auth.test.js         — 14 тестов: session, authenticateWithTelegram, checkAccess
    appLogic.test.js     — 20 тестов: canScan, 9 шагов фильтрации, промоут variants
  integration/
    fetchers.test.js     — 16 тестов: реальные HTTP к биржам (ETH), Vite proxy
  e2e/
    auth.spec.js         — 6 сценариев: авторизация, session, 401
    scanner.spec.js      — 8 сценариев: UI, фильтры, canScan, localStorage

vitest.config.js              — конфиг unit-тестов (jsdom)
vitest.config.integration.js  — конфиг integration-тестов (node, реальный fetch)
playwright.config.js          — конфиг E2E тестов
tests/setup.js                — глобальный setup: полифилы, crypto, env-переменные
TESTING.md                    — эта документация
```

---

## Команды запуска

### Unit-тесты (без сети, быстро ~5-10с)

```bash
# Все unit-тесты
npm test

# Только один файл
npx vitest run tests/unit/utils.test.js

# С подробным выводом
npx vitest run --reporter=verbose

# Watch-режим при разработке
npm run test:watch

# С покрытием кода
npm run test:coverage
# Отчёт откроется в: coverage/index.html
```

### Интеграционные тесты (реальные запросы к биржам)

⚠️ **Требования:**
- Запущен `npm run dev` на `localhost:5173`
- Биржи доступны из вашей сети (нет VPN блокировок)

```bash
# Запуск интеграционных тестов
npm run test:integration

# Или напрямую
npx vitest run --config vitest.config.integration.js

# Один конкретный describe
npx vitest run tests/integration/fetchers.test.js --reporter=verbose
```

**Что тестируется:**
- Binance futures ticker + funding rate (ETH)
- Bybit futures ticker (ETH)
- OKX futures ticker + funding (ETH)
- Gate.io futures tickers + contracts + quanto_multiplier (ETH)
- KuCoin futures (ETH)
- MEXC futures ticker (ETH)
- BingX futures ticker (ETH)
- Bitget futures ticker (ETH)

### E2E тесты (Playwright)

⚠️ **Требования:**
- Запущен `npm run dev` (автоматически стартует если не запущен)
- `npx playwright install chromium` выполнен

```bash
# Все E2E тесты
npm run test:e2e

# С визуальным интерфейсом (рекомендуется при разработке)
npm run test:e2e:ui

# С открытым браузером
npm run test:e2e:headed

# Конкретный файл
npx playwright test tests/e2e/auth.spec.js

# Просмотр отчёта после запуска
npm run test:e2e:report
```

### Все тесты вместе

```bash
npm run test:all
```

---

## Переменные окружения

Создайте `.env.local` в корне проекта (он уже в `.gitignore`):

```env
# Требуются для coinStatus (статусы депозит/вывод)
# Без них coinStatus тесты используют FALLBACK {deposit:true, withdraw:true}
VITE_BINANCE_API_KEY=your_key
VITE_BINANCE_API_SECRET=your_secret

VITE_BYBIT_API_KEY=your_key
VITE_BYBIT_API_SECRET=your_secret

VITE_OKX_API_KEY=your_key
VITE_OKX_API_SECRET=your_secret
VITE_OKX_PASSPHRASE=your_passphrase

VITE_MEXC_API_KEY=your_key
VITE_MEXC_API_SECRET=your_secret

VITE_BINGX_API_KEY=your_key
VITE_BINGX_API_SECRET=your_secret

VITE_BITGET_API_KEY=your_key
VITE_BITGET_API_SECRET=your_secret
VITE_BITGET_PASSPHRASE=your_passphrase
```

> Unit-тесты работают БЕЗ реальных ключей — используются заглушки `test_*_key`.

---

## Важные технические детали

### Изоляция модульного кэша

`coinStatus.js` и `api.js` хранят кэш в модульном scope. Тесты используют `vi.resetModules()` + динамический `import()` для получения свежего кэша перед каждым тестом.

### Web Crypto API

`sign.js` использует `crypto.subtle` (браузерный API). В тестах он подключается из Node.js через `node:crypto` → `webcrypto` в `tests/setup.js`.

### ArrayBuffer dedup

`rateLimiter.js` хранит ответ как `ArrayBuffer` и отдаёт `buffer.slice(0)` каждому подписчику — это позволяет читать тело ответа многократно. Тест `rateLimiter.test.js` проверяет что оба промиса получают читаемый `Response`.

### import.meta.env

Vite env-переменные недоступны в Node.js. В `tests/setup.js` они инжектируются через `vi.stubGlobal('import', { meta: { env: {...} } })`.

### E2E и бэкенд

E2E тесты мокают все запросы к `**/backend/api/**` через `page.route()`. Реальный бэкенд на `localhost:5000` НЕ нужен для E2E тестов.

---

## Структура тест-кейса при падении

Каждый тест написан так, что при падении видно:

```
❌ utils.test.js > calcProfit > КРИТИЧНО: возвращает строку (typeof === "string"), НЕ число

AssertionError: expected "number" to be "string"
  Input:  calcProfit(2, 1000)
  Actual: typeof result === "number"  ← функция вернула число
  Expected: typeof result === "string" ← должна возвращать строку!
```

Имена тестов следуют паттерну `"функция > что проверяем"` чтобы из названия было понятно причина и место ошибки.

---

## CI/CD — рекомендации

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Рекомендации

- Unit-тесты запускать при каждом push
- Integration-тесты запускать ночью (расход rate limit бирж)
- E2E тесты запускать перед деплоем
- Кэшировать `node_modules` и `~/.cache/ms-playwright`

---

## Допущения и заглушки

| Модуль | Допущение |
|--------|-----------|
| `coinStatus.test.js` | `rlFetch` и `sign.js` полностью замоканы |
| `api.test.js` | `coinStatus.js` возвращает `{deposit:true, withdraw:true}` |
| `auth.test.js` | `sessionStorage` замокан через `vi.stubGlobal` |
| `appLogic.test.js` | Логика useMemo вынесена в чистую функцию |
| E2E тесты | Бэкенд (`/backend/api/**`) замокан через `page.route()` |
| Интеграционные | Реальные HTTP, нет мока coinStatus (API ключи нужны) |
| `sign.test.js` | Эталонные значения HMAC совпадают с Node.js `crypto` |