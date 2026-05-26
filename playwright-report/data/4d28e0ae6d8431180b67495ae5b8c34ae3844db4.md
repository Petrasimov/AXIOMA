# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scanner.spec.js >> canScan логика >> polling не происходит при activePage != futures
- Location: tests\e2e\scanner.spec.js:307:3

# Error details

```
Error: на странице home не должно быть запросов к order-books

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: AX
      - generic [ref=e7]:
        - generic [ref=e8]: AXIOM
        - generic [ref=e9]: v1.0
    - img [ref=e12] [cursor=pointer]
    - img [ref=e17] [cursor=pointer]
    - img [ref=e22]
    - img [ref=e28]
    - generic "ScannerTestUser" [ref=e30] [cursor=pointer]:
      - generic [ref=e31]:
        - text: S
        - img [ref=e33]
      - generic:
        - generic: ScannerTestUser
        - generic [ref=e35]: Доступ есть
  - generic [ref=e38]:
    - generic [ref=e39]:
      - generic [ref=e40]:
        - text: Находи спреды.
        - text: Торгуй без риска.
      - generic [ref=e41]: AXIOMA мгновенно получает свежие арбитражные возможности с 8 крупнейших бирж и показывает их в реальном времени. Рыночно-нейтральная стратегия — твой заработок не зависит от направления рынка.
      - generic [ref=e42]:
        - button "ОТКРЫТЬ СКАНЕР" [ref=e43] [cursor=pointer]
        - button "КАК ЭТО РАБОТАЕТ ↓" [ref=e44] [cursor=pointer]
      - generic [ref=e45]:
        - generic "BN" [ref=e46] [cursor=pointer]:
          - img "BN" [ref=e47]
        - generic "BB" [ref=e48] [cursor=pointer]:
          - img "BB" [ref=e49]
        - generic "OK" [ref=e50] [cursor=pointer]:
          - img "OK" [ref=e51]
        - generic "GT" [ref=e52] [cursor=pointer]:
          - img "GT" [ref=e53]
        - generic "KC" [ref=e54] [cursor=pointer]:
          - img "KC" [ref=e55]
        - generic "MX" [ref=e56] [cursor=pointer]:
          - img "MX" [ref=e57]
        - generic "BG" [ref=e58] [cursor=pointer]:
          - img "BG" [ref=e59]
        - generic "BX" [ref=e60] [cursor=pointer]:
          - img "BX" [ref=e61]
    - generic [ref=e62]:
      - generic [ref=e63]:
        - generic [ref=e64]: // как это работает
        - generic [ref=e65]:
          - text: 4 шага от сигнала
          - text: до прибыли
        - generic [ref=e66]:
          - generic [ref=e67] [cursor=pointer]:
            - generic [ref=e69]: "01"
            - generic [ref=e70]:
              - generic [ref=e71]: Сканер находит сигнал
              - generic [ref=e72]: Система мгновенно получает свежие арбитражные возможности со всех 8 бирж и показывает только лучшие — отсортированные по размеру спреда.
              - generic [ref=e73]:
                - generic [ref=e74]: LIVE DATA
                - generic [ref=e75]: 8 БИРЖ
          - generic [ref=e76] [cursor=pointer]:
            - generic [ref=e78]: "02"
            - generic [ref=e79]:
              - generic [ref=e80]: Настраиваешь фильтры
              - generic [ref=e81]: Выбираешь нужные биржи, минимальный спред и стратегию. Все настройки запоминаются — при следующем входе всё уже готово.
              - generic [ref=e82]:
                - generic [ref=e83]: БИРЖИ
                - generic [ref=e84]: СТРАТЕГИИ
          - generic [ref=e85] [cursor=pointer]:
            - generic [ref=e87]: "03"
            - generic [ref=e88]:
              - generic [ref=e89]: Открываешь позиции
              - generic [ref=e90]: В детальной карточке видишь спред, цены и объём. Открываешь LONG на дешёвой бирже и SHORT на дорогой — одновременно.
              - generic [ref=e91]:
                - generic [ref=e92]: LONG
                - generic [ref=e93]: SHORT
          - generic [ref=e94] [cursor=pointer]:
            - generic [ref=e96]: "04"
            - generic [ref=e97]:
              - generic [ref=e98]: Фиксируешь прибыль
              - generic [ref=e99]: Цены сходятся, спред падает к нулю — момент выхода. Закрываешь обе позиции и забираешь разницу.
              - generic [ref=e100]:
                - generic [ref=e101]: PROFIT
                - generic [ref=e102]: P&L TRACKER
      - generic [ref=e103]:
        - generic [ref=e108]: AXIOMA — SCANNER VIEW
        - generic [ref=e111]:
          - generic [ref=e112]:
            - generic [ref=e113]: Пара
            - generic [ref=e114]: Биржи
            - generic [ref=e115]: Спред
            - generic [ref=e116]: +$100
          - generic [ref=e117]:
            - generic [ref=e118]:
              - generic [ref=e119]: BTC/USDT
              - generic [ref=e120]: Futures
            - generic [ref=e121]:
              - img "BN" [ref=e122]
              - generic [ref=e123]: →
              - img "BB" [ref=e124]
            - generic [ref=e125]: +3.42%
            - generic [ref=e127]: $3.42
          - generic [ref=e129]:
            - generic [ref=e130]:
              - generic [ref=e131]: ETH/USDT
              - generic [ref=e132]: Spot
            - generic [ref=e133]:
              - img "MX" [ref=e134]
              - generic [ref=e135]: →
              - img "BG" [ref=e136]
            - generic [ref=e137]: +2.18%
            - generic [ref=e139]: $2.18
          - generic [ref=e140]:
            - generic [ref=e141]:
              - generic [ref=e142]: SOL/USDT
              - generic [ref=e143]: Futures
            - generic [ref=e144]:
              - img "BX" [ref=e145]
              - generic [ref=e146]: →
              - img "GT" [ref=e147]
            - generic [ref=e148]: +1.55%
            - generic [ref=e150]: $1.55
          - generic [ref=e151]:
            - generic [ref=e152]:
              - generic [ref=e153]: BNB/USDT
              - generic [ref=e154]: Futures
            - generic [ref=e155]:
              - img "KC" [ref=e156]
              - generic [ref=e157]: →
              - img "OK" [ref=e158]
            - generic [ref=e159]: +1.12%
            - generic [ref=e161]: $1.12
```

# Test source

```ts
  234 | })
  235 | 
  236 | // ═══════════════════════════════════════════════════════════════════════════════
  237 | // Фильтры
  238 | // ═══════════════════════════════════════════════════════════════════════════════
  239 | 
  240 | test.describe('Фильтры — FilterDrawer', () => {
  241 |   test('FilterDrawer открывается при клике на кнопку фильтров', async ({ page }) => {
  242 |     await setupWithMockData(page)
  243 | 
  244 |     // Ищем кнопку открытия фильтров
  245 |     const filterButton = page.locator(
  246 |       '[data-testid="filter-button"], button:has-text("Filters"), button:has-text("Фильтры"), [aria-label*="filter"]'
  247 |     ).first()
  248 | 
  249 |     if (await filterButton.count() > 0) {
  250 |       await filterButton.click()
  251 |       await page.waitForTimeout(300)
  252 | 
  253 |       // Проверяем что drawer открылся
  254 |       const drawer = page.locator('[class*="drawer"], [class*="filter"]').first()
  255 |       const isOpen = await drawer.isVisible().catch(() => false)
  256 |       console.log(`FilterDrawer visible: ${isOpen}`)
  257 |     } else {
  258 |       console.log('Кнопка фильтров не найдена по известным селекторам')
  259 |     }
  260 |   })
  261 | 
  262 |   test('minSpread фильтр в localStorage применяется при загрузке', async ({ page }) => {
  263 |     await page.goto(BASE_URL)
  264 | 
  265 |     // Ставим фильтр minSpread=3 в localStorage
  266 |     await page.evaluate(() => {
  267 |       const filters = {
  268 |         strategy:    { sf: true, ff: true },
  269 |         exchanges:   ['binance', 'bybit', 'okx', 'gate', 'kucoin', 'mexc', 'bitget', 'bingx'],
  270 |         minSpread:   3,
  271 |         tradeAmount: 100,
  272 |         funding:     { positive: true, negative: true },
  273 |         transfer:    { deposit: true, withdraw: true },
  274 |       }
  275 |       localStorage.setItem('userFilters', JSON.stringify(filters))
  276 |       sessionStorage.setItem('axioma_auth_session', JSON.stringify({
  277 |         userId: 5295815261, login: 'Test', isAdmin: false,
  278 |         isCexCexPaid: true, isDexCexPaid: false, isActive: true,
  279 |         userSettings: filters,
  280 |       }))
  281 |     })
  282 | 
  283 |     await page.route('**/backend/api/**', async (route) => {
  284 |       await route.fulfill({
  285 |         status: 200, contentType: 'application/json',
  286 |         body: JSON.stringify({ opportunities: [] }),
  287 |       })
  288 |     })
  289 | 
  290 |     await page.reload()
  291 |     await page.waitForLoadState('networkidle')
  292 | 
  293 |     // Проверяем что localStorage сохранился
  294 |     const savedFilters = await page.evaluate(() =>
  295 |       JSON.parse(localStorage.getItem('userFilters') || '{}')
  296 |     )
  297 | 
  298 |     expect(savedFilters.minSpread, 'minSpread должен сохраниться в localStorage').toBe(3)
  299 |   })
  300 | })
  301 | 
  302 | // ═══════════════════════════════════════════════════════════════════════════════
  303 | // canScan логика
  304 | // ═══════════════════════════════════════════════════════════════════════════════
  305 | 
  306 | test.describe('canScan логика', () => {
  307 |   test('polling не происходит при activePage != futures', async ({ page }) => {
  308 |     await page.goto(BASE_URL)
  309 | 
  310 |     let orderBooksRequestCount = 0
  311 |     await page.route('**/backend/api/analysis/order-books-json', async (route) => {
  312 |       orderBooksRequestCount++
  313 |       await route.fulfill({
  314 |         status: 200,
  315 |         body: JSON.stringify({ opportunities: [] }),
  316 |       })
  317 |     })
  318 | 
  319 |     await page.evaluate((session) => {
  320 |       sessionStorage.setItem('axioma_auth_session', JSON.stringify(session))
  321 |       // Устанавливаем страницу НЕ futures
  322 |       localStorage.setItem('activePage', 'home')
  323 |     }, MOCK_SESSION)
  324 | 
  325 |     await page.route('**/backend/api/user-settings', async (route) => {
  326 |       await route.fulfill({ status: 200, body: JSON.stringify(MOCK_SESSION) })
  327 |     })
  328 | 
  329 |     await page.reload()
  330 |     await page.waitForLoadState('networkidle')
  331 |     await page.waitForTimeout(2000) // ждём 2с чтобы polling мог сработать
  332 | 
  333 |     expect(orderBooksRequestCount, 'на странице home не должно быть запросов к order-books')
> 334 |       .toBe(0)
      |        ^ Error: на странице home не должно быть запросов к order-books
  335 |   })
  336 | 
  337 |   test('isCexCexPaid=false → polling не запускается', async ({ page }) => {
  338 |     await page.goto(BASE_URL)
  339 | 
  340 |     let orderBooksRequestCount = 0
  341 |     await page.route('**/backend/api/analysis/order-books-json', async (route) => {
  342 |       orderBooksRequestCount++
  343 |       await route.fulfill({ status: 200, body: JSON.stringify({ opportunities: [] }) })
  344 |     })
  345 | 
  346 |     const unpaidSession = { ...MOCK_SESSION, isCexCexPaid: false }
  347 |     await page.evaluate((session) => {
  348 |       sessionStorage.setItem('axioma_auth_session', JSON.stringify(session))
  349 |       localStorage.setItem('activePage', 'futures')
  350 |     }, unpaidSession)
  351 | 
  352 |     await page.route('**/backend/api/user-settings', async (route) => {
  353 |       await route.fulfill({ status: 200, body: JSON.stringify(unpaidSession) })
  354 |     })
  355 | 
  356 |     await page.reload()
  357 |     await page.waitForLoadState('networkidle')
  358 |     await page.waitForTimeout(2000)
  359 | 
  360 |     expect(orderBooksRequestCount, 'при isCexCexPaid=false не должно быть запросов к order-books')
  361 |       .toBe(0)
  362 |   })
  363 | })
  364 | 
  365 | // ═══════════════════════════════════════════════════════════════════════════════
  366 | // Форматирование чисел
  367 | // ═══════════════════════════════════════════════════════════════════════════════
  368 | 
  369 | test.describe('Форматирование — нет NaN и undefined в UI', () => {
  370 |   test('страница не содержит "NaN" или "undefined" в видимом тексте', async ({ page }) => {
  371 |     await setupWithMockData(page)
  372 |     await page.waitForTimeout(1000)
  373 | 
  374 |     const bodyText = await page.locator('body').textContent()
  375 | 
  376 |     // "NaN" и "undefined" никогда не должны попасть в UI
  377 |     expect(bodyText, 'UI не должен содержать "NaN"').not.toContain('NaN')
  378 |     expect(bodyText, 'UI не должен содержать "undefined"').not.toContain('undefined')
  379 |   })
  380 | })
  381 | 
  382 | // ═══════════════════════════════════════════════════════════════════════════════
  383 | // LocalStorage — сохранение настроек
  384 | // ═══════════════════════════════════════════════════════════════════════════════
  385 | 
  386 | test.describe('Сохранение настроек', () => {
  387 |   test('sortMode сохраняется в localStorage при изменении', async ({ page }) => {
  388 |     await setupWithMockData(page)
  389 | 
  390 |     // Устанавливаем sortMode через localStorage напрямую
  391 |     await page.evaluate(() => {
  392 |       localStorage.setItem('sortMode', 'volume')
  393 |     })
  394 | 
  395 |     await page.reload()
  396 |     await page.waitForLoadState('networkidle')
  397 | 
  398 |     const sortMode = await page.evaluate(() => localStorage.getItem('sortMode'))
  399 |     expect(sortMode, 'sortMode должен сохраниться').toBe('volume')
  400 |   })
  401 | 
  402 |   test('viewMode сохраняется в localStorage', async ({ page }) => {
  403 |     await setupWithMockData(page)
  404 | 
  405 |     await page.evaluate(() => {
  406 |       localStorage.setItem('viewMode', 'table')
  407 |     })
  408 | 
  409 |     await page.reload()
  410 |     await page.waitForLoadState('networkidle')
  411 | 
  412 |     const viewMode = await page.evaluate(() => localStorage.getItem('viewMode'))
  413 |     expect(viewMode).toBe('table')
  414 |   })
  415 | })
```