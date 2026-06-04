# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scanner.spec.js >> canScan логика >> isCexCexPaid=false → polling не запускается
- Location: tests\e2e\scanner.spec.js:337:3

# Error details

```
Error: при isCexCexPaid=false не должно быть запросов к order-books

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
        - generic [ref=e35]: Нет доступа
  - generic [ref=e37]:
    - generic [ref=e38]:
      - generic [ref=e39]: FUTURES ARBITRAGE
      - generic [ref=e40]: 20:21:41
      - button "По спреду" [ref=e42] [cursor=pointer]:
        - img [ref=e43]
        - text: По спреду
      - generic [ref=e46]:
        - button "Сетка" [ref=e47] [cursor=pointer]:
          - img [ref=e48]
        - button "Таблица" [ref=e53] [cursor=pointer]:
          - img [ref=e54]
      - button "Фильтры" [ref=e55] [cursor=pointer]:
        - img [ref=e56]
        - text: Фильтры
    - generic [ref=e57]:
      - generic [ref=e59]:
        - img [ref=e61]
        - generic [ref=e64]: У вас пока что нет доступа
        - generic [ref=e65]:
          - text: Доступ к арбитражному скринеру предоставляется по подписке.
          - text: Обратитесь к
          - strong [ref=e66]: менеджеру в Telegram
          - text: для получения доступа или активации вашего плана.
        - link "Написать менеджеру" [ref=e67] [cursor=pointer]:
          - /url: https://t.me/axioma_manager_bot
          - img [ref=e68]
          - text: Написать менеджеру
        - generic [ref=e71]: CEX-CEX доступ не активирован
      - generic [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e75]: Возможностей
          - generic [ref=e80]: после фильтрации
        - generic [ref=e81]:
          - generic [ref=e82]: Лучший спред
          - generic [ref=e87]: максимум
        - generic [ref=e88]:
          - generic [ref=e89]: Средняя прибыль
          - generic [ref=e94]: при $100
        - generic [ref=e95]:
          - generic [ref=e96]: Топ биржа
          - generic [ref=e101]: больше всего пар
      - generic [ref=e107]: Поиск арбитражных возможностей
      - generic [ref=e108]:
        - generic [ref=e109]:
          - generic [ref=e110]: ФИЛЬТРЫ
          - button "✕" [ref=e111] [cursor=pointer]
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]: Биржи
            - generic [ref=e115]:
              - button "Binance" [ref=e116] [cursor=pointer]
              - button "BingX" [ref=e117] [cursor=pointer]
              - button "Bitget" [ref=e118] [cursor=pointer]
              - button "Bybit" [ref=e119] [cursor=pointer]
              - button "KuCoin" [ref=e120] [cursor=pointer]
              - button "Gate" [ref=e121] [cursor=pointer]
              - button "MEXC" [ref=e122] [cursor=pointer]
              - button "OKX" [ref=e123] [cursor=pointer]
          - generic [ref=e124]:
            - generic [ref=e125]: Минимальный спред %
            - generic [ref=e126]:
              - spinbutton [ref=e127]: "0"
              - generic [ref=e128]: "%"
              - slider [ref=e130] [cursor=pointer]: "0"
            - generic [ref=e131]:
              - generic [ref=e132]: 0%
              - generic [ref=e133]: 20%
          - generic [ref=e134]:
            - generic [ref=e135]: Сумма сделки $
            - spinbutton [ref=e136]: "100"
          - generic [ref=e137]:
            - generic [ref=e138]: Стратегия
            - generic [ref=e139]:
              - button "Futures-Futures" [ref=e140] [cursor=pointer]
              - button "Spot-Futures" [ref=e141] [cursor=pointer]
          - generic [ref=e142]:
            - generic [ref=e143]: Ставка финансирования
            - generic [ref=e144]:
              - button "Положительная" [ref=e145] [cursor=pointer]
              - button "Отрицательная" [ref=e146] [cursor=pointer]
            - generic [ref=e147] [cursor=pointer]:
              - checkbox "Только положительный funding spread" [ref=e148]
              - text: Только положительный funding spread
          - generic [ref=e149]:
            - generic [ref=e150]: Переводы
            - generic [ref=e151]:
              - button "Депозит" [ref=e152] [cursor=pointer]
              - button "Вывод" [ref=e153] [cursor=pointer]
        - generic [ref=e154]:
          - button "СОХРАНИТЬ НАСТРОЙКИ" [ref=e155] [cursor=pointer]
          - button "СБРОСИТЬ ФИЛЬТРЫ" [ref=e156] [cursor=pointer]
```

# Test source

```ts
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
  334 |       .toBe(0)
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
> 361 |       .toBe(0)
      |        ^ Error: при isCexCexPaid=false не должно быть запросов к order-books
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