# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scanner.spec.js >> Сохранение настроек >> viewMode сохраняется в localStorage
- Location: tests\e2e\scanner.spec.js:402:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.evaluate: Test timeout of 30000ms exceeded.
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
  - generic [ref=e37]:
    - generic [ref=e38]:
      - generic [ref=e39]: FUTURES ARBITRAGE
      - generic [ref=e40]: 20:23:24
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
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: Возможностей
          - generic [ref=e61]: "0"
          - generic [ref=e62]: после фильтрации
        - generic [ref=e63]:
          - generic [ref=e64]: Лучший спред
          - generic [ref=e65]: 0.00%
          - generic [ref=e66]: максимум
        - generic [ref=e67]:
          - generic [ref=e68]: Средняя прибыль
          - generic [ref=e69]: $0
          - generic [ref=e70]: при $100
        - generic [ref=e71]:
          - generic [ref=e72]: Топ биржа
          - generic [ref=e73]: —
          - generic [ref=e74]: больше всего пар
      - generic [ref=e76]:
        - generic [ref=e77]: Нет возможностей
        - generic [ref=e78]: Попробуйте изменить фильтры
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]: ФИЛЬТРЫ
          - button "✕" [ref=e82] [cursor=pointer]
        - generic [ref=e83]:
          - generic [ref=e84]:
            - generic [ref=e85]: Биржи
            - generic [ref=e86]:
              - button "Binance" [ref=e87] [cursor=pointer]
              - button "BingX" [ref=e88] [cursor=pointer]
              - button "Bitget" [ref=e89] [cursor=pointer]
              - button "Bybit" [ref=e90] [cursor=pointer]
              - button "KuCoin" [ref=e91] [cursor=pointer]
              - button "Gate" [ref=e92] [cursor=pointer]
              - button "MEXC" [ref=e93] [cursor=pointer]
              - button "OKX" [ref=e94] [cursor=pointer]
          - generic [ref=e95]:
            - generic [ref=e96]: Минимальный спред %
            - generic [ref=e97]:
              - spinbutton [ref=e98]: "0"
              - generic [ref=e99]: "%"
              - slider [ref=e101] [cursor=pointer]: "0"
            - generic [ref=e102]:
              - generic [ref=e103]: 0%
              - generic [ref=e104]: 20%
          - generic [ref=e105]:
            - generic [ref=e106]: Сумма сделки $
            - spinbutton [ref=e107]: "100"
          - generic [ref=e108]:
            - generic [ref=e109]: Стратегия
            - generic [ref=e110]:
              - button "Futures-Futures" [ref=e111] [cursor=pointer]
              - button "Spot-Futures" [ref=e112] [cursor=pointer]
          - generic [ref=e113]:
            - generic [ref=e114]: Ставка финансирования
            - generic [ref=e115]:
              - button "Положительная" [ref=e116] [cursor=pointer]
              - button "Отрицательная" [ref=e117] [cursor=pointer]
            - generic [ref=e118] [cursor=pointer]:
              - checkbox "Только положительный funding spread" [ref=e119]
              - text: Только положительный funding spread
          - generic [ref=e120]:
            - generic [ref=e121]: Переводы
            - generic [ref=e122]:
              - button "Депозит" [ref=e123] [cursor=pointer]
              - button "Вывод" [ref=e124] [cursor=pointer]
        - generic [ref=e125]:
          - button "СОХРАНИТЬ НАСТРОЙКИ" [ref=e126] [cursor=pointer]
          - button "СБРОСИТЬ ФИЛЬТРЫ" [ref=e127] [cursor=pointer]
```

# Test source

```ts
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
> 412 |     const viewMode = await page.evaluate(() => localStorage.getItem('viewMode'))
      |                                 ^ Error: page.evaluate: Test timeout of 30000ms exceeded.
  413 |     expect(viewMode).toBe('table')
  414 |   })
  415 | })
```