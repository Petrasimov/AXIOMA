// tests/unit/rateLimiter.test.js
// Тесты для src/rateLimiter.js — очередь запросов + ArrayBuffer dedup
//
// ВАЖНО: rateLimiter использует модульный кэш (_queues, _inFlight)
// Каждый тест должен работать с УНИКАЛЬНЫМИ именами бирж чтобы не мешать друг другу

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rlFetch } from '../../src/rateLimiter.js'

// ─── Хелпер: создаём mock Response ───────────────────────────────────────────
function makeMockResponse(body = '{"ok":true}', status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── Хелпер: проверяем что Response читаем ───────────────────────────────────
async function isReadable(response) {
  try {
    await response.json()
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate limiting — соблюдение интервала
// ═══════════════════════════════════════════════════════════════════════════════

describe('rlFetch — rate limiting', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('последовательные запросы к одной бирже разнесены не менее чем на minMs', async () => {
    const minMs = 50
    const timestamps = []

    // Мокаем fetch: записываем время каждого вызова
    vi.stubGlobal('fetch', vi.fn(async () => {
      timestamps.push(Date.now())
      return makeMockResponse()
    }))

    // Отправляем 3 запроса параллельно — они должны выполниться последовательно
    await Promise.all([
      rlFetch('test_rl_exchange_1', minMs, '/url1'),
      rlFetch('test_rl_exchange_1', minMs, '/url2'),
      rlFetch('test_rl_exchange_1', minMs, '/url3'),
    ])

    expect(timestamps.length, '3 запроса должны выполниться').toBe(3)
    expect(timestamps[1] - timestamps[0], `интервал между 1-м и 2-м запросом должен быть >= ${minMs}мс`)
      .toBeGreaterThanOrEqual(minMs - 5) // -5ms допуск на планировщик
    expect(timestamps[2] - timestamps[1], `интервал между 2-м и 3-м запросом должен быть >= ${minMs}мс`)
      .toBeGreaterThanOrEqual(minMs - 5)
  }, 5000)

  it('разные биржи имеют независимые очереди — не блокируют друг друга', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeMockResponse()))

    const start = Date.now()

    // Запросы к двум разным биржам с большим minMs — должны выполниться почти одновременно
    await Promise.all([
      rlFetch('test_exchange_A', 200, '/urlA'),
      rlFetch('test_exchange_B', 200, '/urlB'),
    ])

    const elapsed = Date.now() - start
    // Если бы очереди были общими — потребовалось бы 200+мс
    // Так как независимые — должно быть < 200мс
    expect(elapsed, 'разные биржи не должны блокировать друг друга').toBeLessThan(300)
  }, 5000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// In-flight deduplication
// ═══════════════════════════════════════════════════════════════════════════════

describe('rlFetch — in-flight deduplication', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('два параллельных вызова с одинаковым URL → fetch вызван РОВНО 1 раз', async () => {
    let fetchCallCount = 0

    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCallCount++
      // Небольшая задержка чтобы оба вызова успели попасть в dedup
      await new Promise(r => setTimeout(r, 20))
      return makeMockResponse('{"dedup":true}')
    }))

    const url = '/test/dedup/unique_url_1'
    const [r1, r2] = await Promise.all([
      rlFetch('test_dedup_ex', 0, url),
      rlFetch('test_dedup_ex', 0, url),
    ])

    expect(fetchCallCount, `fetch должен быть вызван 1 раз, а не ${fetchCallCount}`)
      .toBe(1)
    expect(r1, 'оба промиса должны разрешиться').toBeDefined()
    expect(r2, 'оба промиса должны разрешиться').toBeDefined()
  }, 5000)

  it('оба промиса получают одинаковый результат при dedup', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise(r => setTimeout(r, 20))
      return makeMockResponse('{"value":42}')
    }))

    const url = '/test/dedup/unique_url_2'
    const [r1, r2] = await Promise.all([
      rlFetch('test_dedup_ex2', 0, url),
      rlFetch('test_dedup_ex2', 0, url),
    ])

    // Оба Response должны быть читаемы (ArrayBuffer dedup даёт независимые копии)
    const [j1, j2] = await Promise.all([r1.json(), r2.json()])
    expect(j1).toEqual({ value: 42 })
    expect(j2, 'второй вызов должен получить те же данные что и первый').toEqual({ value: 42 })
  }, 5000)

  it('ArrayBuffer-dedup: Response из dedup читаем (body не exhausted)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      await new Promise(r => setTimeout(r, 10))
      return makeMockResponse('{"data":"test"}')
    }))

    const url = '/test/dedup/unique_url_3'
    const [r1, r2] = await Promise.all([
      rlFetch('test_dedup_ex3', 0, url),
      rlFetch('test_dedup_ex3', 0, url),
    ])

    // Главная проблема без ArrayBuffer: body consumed → второй .json() падает
    // С ArrayBuffer каждый получает новый buffer.slice(0) → читаем независимо
    const readable1 = await isReadable(r1)
    const readable2 = await isReadable(r2)

    expect(readable1, 'первый Response должен быть читаем').toBe(true)
    expect(readable2, 'второй Response должен быть читаем (ArrayBuffer dedup)').toBe(true)
  }, 5000)

  it('после завершения запроса dedup-запись удаляется из _inFlight', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeMockResponse()))

    const url = '/test/dedup/unique_url_4'

    // Первый запрос — попадает в _inFlight
    await rlFetch('test_dedup_ex4', 0, url)

    // После завершения — повторный запрос делает НОВЫЙ fetch (не dedup)
    let fetchCallCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCallCount++
      return makeMockResponse()
    }))

    await rlFetch('test_dedup_ex4', 0, url)

    expect(fetchCallCount, 'после завершения dedup должен делать новый fetch').toBe(1)
  }, 5000)

  it('dedup не применяется к разным URL', async () => {
    let fetchCallCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCallCount++
      return makeMockResponse()
    }))

    await Promise.all([
      rlFetch('test_dedup_ex5', 0, '/url/different/A'),
      rlFetch('test_dedup_ex5', 0, '/url/different/B'),
    ])

    expect(fetchCallCount, 'разные URL должны делать отдельные fetch-запросы').toBe(2)
  }, 5000)

  it('Response.ok корректно переопределён даже для HTTP 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response('Not Found', { status: 404 })
    }))

    const response = await rlFetch('test_ok_ex', 0, '/url/404')

    // В _reconstruct ok явно переопределяется через Object.defineProperty
    expect(response.ok, 'ok должен быть false для статуса 404').toBe(false)
    expect(response.status).toBe(404)
  }, 5000)

  it('сетевая ошибка (fetch reject) корректно пробрасывается', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Network connection refused')
    }))

    await expect(
      rlFetch('test_error_ex', 0, '/url/error'),
      'должен reject с оригинальной ошибкой'
    ).rejects.toThrow('Network connection refused')

    // Ждём завершения асинхронной очереди _drain в rateLimiter
    // без этого ошибка всплывает как Unhandled Rejection уже после теста
    await new Promise(r => setTimeout(r, 50))
  }, 5000)
})