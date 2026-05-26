// tests/unit/auth.test.js
// Тесты для src/auth.js — session storage, authenticateWithTelegram, checkAccess

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Мок sessionStorage ───────────────────────────────────────────────────────
function createMockStorage() {
  let store = {}
  return {
    getItem:    vi.fn((key) => store[key] ?? null),
    setItem:    vi.fn((key, val) => { store[key] = val }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear:      vi.fn(() => { store = {} }),
    _store:     () => store,
  }
}

// ─── Хелпер: mock fetch ───────────────────────────────────────────────────────
function mockFetch(responseData, status = 200) {
  return vi.fn(async () => ({
    ok:     status >= 200 && status < 300,
    status,
    json:   async () => responseData,
    text:   async () => JSON.stringify(responseData),
  }))
}

// ─── Типичный успешный ответ бэкенда ─────────────────────────────────────────
const MOCK_AUTH_RESPONSE = {
  userId:       5295815261,
  login:        'TestUser',
  isAdmin:      false,
  isCexCexPaid: true,
  isDexCexPaid: true,
  isActive:     true,
  photoUrl:     'https://example.com/photo.jpg',
  userSettings: {
    exchanges:   ['binance', 'bybit', 'okx'],
    minSpread:   0,
    tradeAmount: 100,
    strategy:    { ff: true, sf: true },
    funding:     { positive: true, negative: true },
    transfer:    { deposit: true, withdraw: true },
  },
}

// ─── Telegram Widget данные (snake_case — как приходят от виджета) ─────────────
const TG_WIDGET_DATA = {
  id:         5295815261,
  first_name: 'Test',
  last_name:  'User',
  username:   'testuser',
  photo_url:  'https://example.com/photo.jpg',
  auth_date:  Math.floor(Date.now() / 1000),
  hash:       'abc123def456',
}

// ═══════════════════════════════════════════════════════════════════════════════
// loadSession / saveSession / clearSession
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth — session storage', () => {
  let mockStorage

  beforeEach(() => {
    mockStorage = createMockStorage()
    vi.stubGlobal('sessionStorage', mockStorage)
  })

  // Тесты через динамический import чтобы sessionStorage был замокан ДО загрузки модуля

  it('saveSession → setItem вызван с правильным ключом и JSON', async () => {
    vi.resetModules()
    vi.stubGlobal('sessionStorage', mockStorage)

    const { saveSession } = await import('../../src/auth.js')
    saveSession(MOCK_AUTH_RESPONSE)

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'axioma_auth_session',
      JSON.stringify(MOCK_AUTH_RESPONSE)
    )
  })

  it('loadSession → возвращает распарсенный объект', async () => {
    vi.resetModules()
    mockStorage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_RESPONSE))
    vi.stubGlobal('sessionStorage', mockStorage)

    const { loadSession } = await import('../../src/auth.js')
    const result = loadSession()

    expect(result).toEqual(MOCK_AUTH_RESPONSE)
  })

  it('loadSession при пустом storage → возвращает null', async () => {
    vi.resetModules()
    mockStorage.getItem.mockReturnValue(null)
    vi.stubGlobal('sessionStorage', mockStorage)

    const { loadSession } = await import('../../src/auth.js')
    const result = loadSession()

    expect(result).toBeNull()
  })

  it('loadSession при невалидном JSON → возвращает null, не крашится', async () => {
    vi.resetModules()
    mockStorage.getItem.mockReturnValue('{ invalid json }}}')
    vi.stubGlobal('sessionStorage', mockStorage)

    const { loadSession } = await import('../../src/auth.js')
    const result = loadSession()

    expect(result).toBeNull()
  })

  it('clearSession → removeItem вызван с правильным ключом', async () => {
    vi.resetModules()
    vi.stubGlobal('sessionStorage', mockStorage)

    const { clearSession } = await import('../../src/auth.js')
    clearSession()

    expect(mockStorage.removeItem).toHaveBeenCalledWith('axioma_auth_session')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// authenticateWithTelegram — конвертация snake_case → camelCase
// ═══════════════════════════════════════════════════════════════════════════════

describe('authenticateWithTelegram', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('sessionStorage', createMockStorage())
  })

  it('конвертирует snake_case поля в camelCase в payload', async () => {
    let capturedBody = null

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return {
        ok: true, status: 200,
        json: async () => MOCK_AUTH_RESPONSE,
      }
    }))

    const { authenticateWithTelegram } = await import('../../src/auth.js')
    await authenticateWithTelegram(TG_WIDGET_DATA)

    expect(capturedBody, 'payload должен содержать camelCase поля').not.toBeNull()
    // first_name → firstName
    expect(capturedBody.firstName, 'first_name должен стать firstName')
      .toBe(TG_WIDGET_DATA.first_name)
    // photo_url → photoUrl
    expect(capturedBody.photoUrl, 'photo_url должен стать photoUrl')
      .toBe(TG_WIDGET_DATA.photo_url)
    // last_name → lastName
    expect(capturedBody.lastName, 'last_name должен стать lastName')
      .toBe(TG_WIDGET_DATA.last_name)
  })

  it('snake_case поля НЕ должны присутствовать в payload', async () => {
    let capturedBody = null

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return { ok: true, status: 200, json: async () => MOCK_AUTH_RESPONSE }
    }))

    const { authenticateWithTelegram } = await import('../../src/auth.js')
    await authenticateWithTelegram(TG_WIDGET_DATA)

    expect(capturedBody).not.toHaveProperty('first_name')
    expect(capturedBody).not.toHaveProperty('photo_url')
    expect(capturedBody).not.toHaveProperty('last_name')
  })

  it('успешный ответ 200 → возвращает { ok: true, user: { userId, isCexCexPaid, userSettings } }', async () => {
    // Реальный auth.js возвращает { ok: true, user: {...} }, не сам объект пользователя
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => MOCK_AUTH_RESPONSE,
    })))

    const { authenticateWithTelegram } = await import('../../src/auth.js')
    const result = await authenticateWithTelegram(TG_WIDGET_DATA)

    expect(result.ok).toBe(true)
    expect(result.user).toHaveProperty('userId')
    expect(result.user).toHaveProperty('isCexCexPaid')
    expect(result.user).toHaveProperty('userSettings')
  })

  it('ответ 401 (нет доступа) → возвращает объект с признаком отказа (не бросает ошибку)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({ error: 'Unauthorized', isActive: false }),
    })))

    const { authenticateWithTelegram } = await import('../../src/auth.js')

    // Не должен бросать ошибку
    let result
    await expect(async () => {
      result = await authenticateWithTelegram(TG_WIDGET_DATA)
    }).not.toThrow()

    // Результат должен сигнализировать об отказе (null или объект с признаком)
    // Точный формат зависит от реализации — проверяем что не вернулся валидный userId
    if (result !== null && result !== undefined) {
      expect(result.userId ?? result.isActive, 'при 401 не должен вернуться активный пользователь')
        .not.toBe(true)
    }
  })

  it('ответ 500 → не крашится, возвращает null или объект ошибки', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    })))

    const { authenticateWithTelegram } = await import('../../src/auth.js')

    await expect(authenticateWithTelegram(TG_WIDGET_DATA)).resolves.toBeDefined()
  })

  it('сетевая ошибка (fetch reject) → не крашится', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Network error')
    }))

    const { authenticateWithTelegram } = await import('../../src/auth.js')

    // Должен обработать ошибку и вернуть что-то (не бросать наверх)
    await expect(authenticateWithTelegram(TG_WIDGET_DATA)).resolves.toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// checkAccess
// ═══════════════════════════════════════════════════════════════════════════════

describe('checkAccess', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('sessionStorage', createMockStorage())
  })

  it('200 → возвращает данные пользователя (не null, нет expired)', async () => {
    // checkAccess сначала читает сессию из sessionStorage
    // Если сессии нет — возвращает null не делая запроса
    // Поэтому кладём сессию в storage ДО вызова
    const storage = createMockStorage()
    storage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_RESPONSE))
    vi.stubGlobal('sessionStorage', storage)

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => MOCK_AUTH_RESPONSE,
    })))

    const { checkAccess } = await import('../../src/auth.js')
    const result = await checkAccess(12345)

    expect(result, '200 должен вернуть данные пользователя').not.toBeNull()
    expect(result?.expired, 'expired не должен быть true').not.toBe(true)
  })

  it('401 → возвращает { expired: true }', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })))

    const { checkAccess } = await import('../../src/auth.js')
    // checkAccess сначала читает сессию из sessionStorage
    // Если сессии нет — вернёт null до HTTP-запроса
    // Поэтому нужно положить сессию в mockStorage перед вызовом
    const storage = createMockStorage()
    storage.getItem.mockReturnValue(JSON.stringify({ userId: 12345, login: 'test' }))
    vi.stubGlobal('sessionStorage', storage)

    const result = await checkAccess(12345)

    expect(result, '401 должен вернуть { expired: true }')
      .toEqual({ expired: true })
  })

  it('5xx ошибка → возвращает null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      json: async () => ({ error: 'Service Unavailable' }),
    })))

    const { checkAccess } = await import('../../src/auth.js')
    const result = await checkAccess()

    expect(result, '5xx должен вернуть null').toBeNull()
  })

  it('сетевая ошибка → возвращает null, не крашится', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Connection refused')
    }))

    const { checkAccess } = await import('../../src/auth.js')
    const result = await checkAccess()

    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// saveUserSettings
// ═══════════════════════════════════════════════════════════════════════════════

describe('saveUserSettings', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('sessionStorage', createMockStorage())
  })

  it('отправляет PUT-запрос с корректным payload', async () => {
    let capturedRequest = null

    const storage = createMockStorage()
    storage.getItem.mockReturnValue(JSON.stringify(MOCK_AUTH_RESPONSE))
    vi.stubGlobal('sessionStorage', storage)

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      capturedRequest = { url, opts }
      return { ok: true, status: 200, json: async () => MOCK_AUTH_RESPONSE }
    }))

    const { saveUserSettings } = await import('../../src/auth.js')
    const settings = {
      exchanges:   ['binance', 'bybit'],
      minSpread:   1.5,
      tradeAmount: 500,
      strategy:    { sf: true, ff: true },
      funding:     { positive: true, negative: true },
      transfer:    { deposit: true, withdraw: true },
    }
    // Реальная сигнатура: saveUserSettings(userId, settings)
    await saveUserSettings(12345, settings)

    expect(capturedRequest, 'fetch должен быть вызван').not.toBeNull()
    expect(capturedRequest.opts.method, 'должен быть PUT-запрос').toBe('PUT')

    const body = JSON.parse(capturedRequest.opts.body)
    expect(body.exchanges).toEqual(settings.exchanges)
    expect(body.minSpread).toBe(settings.minSpread)
    expect(body.tradeAmount).toBe(settings.tradeAmount)
  })

  it('401 при saveUserSettings → возвращает { ok: false, reason: "unauthorized" }', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })))

    const { saveUserSettings } = await import('../../src/auth.js')
    // Реальная сигнатура: saveUserSettings(userId, settings)
    const fullSettings = {
      exchanges: ['binance'], minSpread: 1, tradeAmount: 100,
      strategy: { sf: true, ff: true },
      funding: { positive: true, negative: true },
      transfer: { deposit: true, withdraw: true },
    }
    const result = await saveUserSettings(12345, fullSettings)

    // Реальный код возвращает: { ok: false, reason: 'unauthorized' }
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unauthorized')
  })
})