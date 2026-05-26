/**
 * ws.test.js — Полное тестирование WebSocket коннекторов
 *
 * Покрытие:
 *  [1]  connectOrderBook — роутер
 *  [2]  applyLevels — добавление / обновление / удаление уровней
 *  [3]  emit — сортировка, формат, вызов onUpdate
 *  [4]  connectBinance — буферизация, снэпшот, инкрементальные обновления
 *  [5]  connectBingX   — Ping/Pong, текст/Blob, полная замена Map
 *  [6]  connectBitget  — snapshot/update actions
 *  [7]  connectBybit   — snapshot/delta types
 *  [8]  connectGate    — full=1 сброс, { p, s } формат
 *  [9]  connectMEXC    — инициализация + инкрементал + rs.sub.depth
 *  [10] connectKuCoin  — токен, ping/pong, ack, change, close
 *
 * Стратегия моков:
 *  - WebSocket мокируется через класс MockWebSocket (без сети)
 *  - fetch мокируется через vi.stubGlobal
 *  - DecompressionStream мокируется для Blob-веток BingX/MEXC
 *  - aLog мокируется чтобы не зависеть от api.js в тестах
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Мок aLog и api.js ────────────────────────────────────────────────────────
vi.mock('../../src/api.js', () => ({
    aLog: vi.fn(),
}))

// ─── MockWebSocket ─────────────────────────────────────────────────────────────
// Полная имитация WebSocket API без реального сетевого подключения
class MockWebSocket {
    constructor(url) {
        this.url         = url
        this.readyState  = MockWebSocket.CONNECTING
        this.sent        = []           // все отправленные сообщения
        this.onopen      = null
        this.onmessage   = null
        this.onerror     = null
        this.onclose     = null
        MockWebSocket._instances.push(this)

        // Автоматически открываем соединение в следующем тике
        Promise.resolve().then(() => {
            if (this.readyState === MockWebSocket.CONNECTING) {
                this.readyState = MockWebSocket.OPEN
                this.onopen?.({ type: 'open' })
            }
        })
    }

    send(data) {
        this.sent.push(typeof data === 'string' ? JSON.parse(data) : data)
    }

    close() {
        this.readyState = MockWebSocket.CLOSED
        this.onclose?.({ type: 'close', code: 1000 })
    }

    // Имитация входящего сообщения от сервера
    receive(data) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data)
        this.onmessage?.({ data: payload, type: 'message' })
    }

    // Имитация ошибки
    triggerError(message = 'connection error') {
        this.onerror?.({ type: 'error', message })
    }

    static CONNECTING = 0
    static OPEN       = 1
    static CLOSING    = 2
    static CLOSED     = 3
    static _instances = []

    static reset() {
        MockWebSocket._instances = []
    }

    static latest() {
        return MockWebSocket._instances[MockWebSocket._instances.length - 1]
    }
}

// ─── MockDecompressionStream ──────────────────────────────────────────────────
// Мок для BingX/MEXC Blob-декомпрессии — просто читает Blob как текст
class MockDecompressionStream {
    constructor() {
        this.writable = {
            getWriter: () => ({
                write: vi.fn(),
                close: vi.fn(),
            })
        }
        this.readable = {}
    }
}

// ─── Хелпер: ждать микро-задачи ──────────────────────────────────────────────
const tick  = () => new Promise(resolve => Promise.resolve().then(resolve))
const ticks = (n = 3) => Array.from({ length: n }).reduce(p => p.then(tick), Promise.resolve())

// ─── Динамический импорт ws.js ────────────────────────────────────────────────
// Делаем после установки всех глобальных моков
let connectOrderBook
let connectBinance, connectBingX, connectBitget, connectBybit
let connectGate, connectMEXC, connectOKX, connectKuCoin

beforeEach(async () => {
    MockWebSocket.reset()
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })

    // Импортируем функции напрямую из исходника через динамический импорт
    // В тестах используем re-export хелпер чтобы получить доступ к internal функциям
    // Основной публичный API — connectOrderBook
    const mod = await import('../../src/ws.js')
    connectOrderBook = mod.connectOrderBook
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// [1] connectOrderBook — роутер
// ═══════════════════════════════════════════════════════════════════════════════
describe('[1] connectOrderBook — роутер', () => {
    const exchanges = ['binance', 'bingx', 'bitget', 'bybit', 'gate', 'mexc', 'okx']
    const onUpdate = vi.fn()

    it.each(exchanges)('возвращает { close } для биржи: %s', async (exchange) => {
        // KuCoin требует fetch — тестируется отдельно
        const handle = connectOrderBook(exchange, 'BTC', 'futures', onUpdate)
        expect(handle).toBeDefined()
        expect(typeof handle.close).toBe('function')
    })

    it('возвращает { close: () => {} } для неизвестной биржи', () => {
        const handle = connectOrderBook('unknown_exchange', 'BTC', 'futures', onUpdate)
        expect(handle).toBeDefined()
        expect(typeof handle.close).toBe('function')
        // close() не должен падать
        expect(() => handle.close()).not.toThrow()
    })

    it('вызывает aLog с ошибкой для неизвестной биржи', async () => {
        const { aLog } = await import('../../src/api.js')
        connectOrderBook('unknown_exchange', 'BTC', 'futures', onUpdate)
        expect(aLog).toHaveBeenCalledWith('error', expect.stringContaining('unknown_exchange'))
    })

    it('вызывает aLog info при успешном роутинге', async () => {
        const { aLog } = await import('../../src/api.js')
        connectOrderBook('binance', 'BTC', 'futures', onUpdate)
        expect(aLog).toHaveBeenCalledWith('info', expect.stringContaining('connectOrderBook'))
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [2] applyLevels — логика через connectBitget (snapshot + update)
// ═══════════════════════════════════════════════════════════════════════════════
describe('[2] applyLevels — добавление / обновление / удаление', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('bitget', 'ETH', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('добавляет новые уровни через snapshot', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1.0'], ['99', '2.0']], asks: [['101', '1.5']] }]
        })
        expect(updates).toHaveLength(1)
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('обновляет существующий уровень через update', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1.0']], asks: [['101', '1.0']] }]
        })
        ws.receive({
            action: 'update',
            data: [{ bids: [['100', '3.0']], asks: [] }]
        })
        // Цена 100 должна иметь qty=3.0
        expect(updates[1].bids[0][1]).toBe(3.0)
    })

    it('удаляет уровень при qty=0 через update', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1.0'], ['99', '2.0']], asks: [['101', '1.0']] }]
        })
        ws.receive({
            action: 'update',
            data: [{ bids: [['100', '0']], asks: [] }]
        })
        // Уровень 100 должен быть удалён
        const prices = updates[1].bids.map(([p]) => p)
        expect(prices).not.toContain(100)
        expect(updates[1].bids).toHaveLength(1)
    })

    it('не падает при пустых levels в update', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1.0']], asks: [['101', '1.0']] }]
        })
        expect(() => {
            ws.receive({
                action: 'update',
                data: [{ bids: [], asks: [] }]
            })
        }).not.toThrow()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [3] emit — сортировка, формат, вызов onUpdate
// ═══════════════════════════════════════════════════════════════════════════════
describe('[3] emit — сортировка и формат вывода', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('bitget', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
        // Загружаем snapshot с перемешанными ценами
        ws.receive({
            action: 'snapshot',
            data: [{
                bids: [['99', '1'], ['101', '2'], ['100', '3']],
                asks: [['103', '1'], ['102', '2'], ['104', '3']],
            }]
        })
    })

    it('bids отсортированы по убыванию цены', () => {
        const prices = updates[0].bids.map(([p]) => p)
        expect(prices).toEqual([101, 100, 99])
    })

    it('asks отсортированы по возрастанию цены', () => {
        const prices = updates[0].asks.map(([p]) => p)
        expect(prices).toEqual([102, 103, 104])
    })

    it('каждый элемент — [number, number]', () => {
        for (const [p, q] of updates[0].bids) {
            expect(typeof p).toBe('number')
            expect(typeof q).toBe('number')
        }
        for (const [p, q] of updates[0].asks) {
            expect(typeof p).toBe('number')
            expect(typeof q).toBe('number')
        }
    })

    it('onUpdate вызывается при каждом emit', () => {
        ws.receive({ action: 'update', data: [{ bids: [['100', '5']], asks: [] }] })
        expect(updates).toHaveLength(2)
    })

    it('onUpdate получает объект с полями bids и asks', () => {
        expect(updates[0]).toHaveProperty('bids')
        expect(updates[0]).toHaveProperty('asks')
        expect(Array.isArray(updates[0].bids)).toBe(true)
        expect(Array.isArray(updates[0].asks)).toBe(true)
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [4] connectBinance
// ═══════════════════════════════════════════════════════════════════════════════
describe('[4] connectBinance', () => {
    let ws, updates, mockFetch

    const snapshot = {
        lastUpdateId: 1000,
        bids: [['100', '1.0'], ['99', '2.0']],
        asks: [['101', '1.5'], ['102', '0.5']],
    }

    beforeEach(async () => {
        updates = []
        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => snapshot,
        })
        vi.stubGlobal('fetch', mockFetch)

        connectOrderBook('binance', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на правильный URL для futures', () => {
        expect(ws.url).toContain('fstream.binance.com')
        expect(ws.url).toContain('btcusdt@depth')
    })

    it('открывает WS на правильный URL для spot', async () => {
        MockWebSocket.reset()
        connectOrderBook('binance', 'ETH', 'spot', vi.fn())
        await tick()
        const spotWs = MockWebSocket.latest()
        expect(spotWs.url).toContain('stream.binance.com')
        expect(spotWs.url).not.toContain('fstream')
    })

    it('буферизует сообщения до загрузки снэпшота', async () => {
        // Сообщение до загрузки снэпшота
        ws.receive({ u: 1005, b: [['100', '2.0']], a: [] })
        expect(updates).toHaveLength(0) // ещё не эмитили
    })

    it('загружает снэпшот и применяет буфер', async () => {
        // Буферизуем сообщение
        ws.receive({ u: 1005, b: [['100', '5.0']], a: [] })
        // Даём setTimeout(500) сработать
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        // После снэпшота должны получить emit
        expect(updates.length).toBeGreaterThan(0)
    })

    it('игнорирует сообщения с u <= lastUpdateId', async () => {
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        const countBefore = updates.length
        // u=999 < lastUpdateId=1000 → должно быть проигнорировано
        ws.receive({ u: 999, b: [['100', '9.0']], a: [] })
        expect(updates.length).toBe(countBefore)
    })

    it('применяет инкрементальные обновления после снэпшота', async () => {
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        const countBefore = updates.length
        ws.receive({ u: 1001, b: [['98', '3.0']], a: [] })
        expect(updates.length).toBe(countBefore + 1)
    })

    it('обрабатывает ошибку fetch снэпшота без краша', async () => {
        MockWebSocket.reset()
        updates = []
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
        connectOrderBook('binance', 'BTC', 'futures', data => updates.push(data))
        await tick()
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        // Не должно быть необработанного исключения
        expect(updates).toHaveLength(0)
    })

    it('close() вызывает ws.close()', async () => {
        const handle = connectOrderBook('binance', 'LTC', 'futures', vi.fn())
        await tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })

    it('close() до снэпшота предотвращает fetch и emit', async () => {
        MockWebSocket.reset()
        const freshFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot })
        vi.stubGlobal('fetch', freshFetch)
        const freshUpdates = []
        const handle = connectOrderBook('binance', 'BTC', 'futures', d => freshUpdates.push(d))
        handle.close() // закрываем сразу
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        expect(freshUpdates).toHaveLength(0)
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [5] connectBingX
// ═══════════════════════════════════════════════════════════════════════════════
describe('[5] connectBingX', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('bingx', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на правильный URL', () => {
        expect(ws.url).toBe('wss://open-api-ws.bingx.com/market')
    })

    it('отправляет подписку при onopen', () => {
        expect(ws.sent).toHaveLength(1)
        const sub = ws.sent[0]
        expect(sub.reqType).toBe('sub')
        expect(sub.dataType).toContain('BTC-USDT')
        expect(sub.dataType).toContain('@depth')
    })

    it('отвечает Pong на текстовый Ping', () => {
        const sendSpy = vi.spyOn(ws, 'send')
        ws.onmessage?.({ data: 'Ping' })
        expect(sendSpy).toHaveBeenCalledWith('Pong')
    })

    it('игнорирует сообщения без data', () => {
        ws.receive({ someField: 'no data field' })
        expect(updates).toHaveLength(0)
    })

    it('обрабатывает bids и asks из data', () => {
        ws.receive({
            data: {
                bids: [['100', '1.0'], ['99', '2.0']],
                asks: [['101', '1.5']],
            }
        })
        expect(updates).toHaveLength(1)
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('полностью заменяет Map при каждом обновлении (не инкрементально)', () => {
        ws.receive({ data: { bids: [['100', '1.0'], ['99', '2.0']], asks: [] } })
        ws.receive({ data: { bids: [['50', '5.0']], asks: [] } })
        // После второго обновления должен остаться только уровень 50
        expect(updates[1].bids).toHaveLength(1)
        expect(updates[1].bids[0][0]).toBe(50)
    })

    it('обрабатывает только bids без asks', () => {
        ws.receive({ data: { bids: [['100', '1.0']] } })
        expect(updates).toHaveLength(1)
        expect(updates[0].bids).toHaveLength(1)
    })

    it('close() вызывает ws.close()', () => {
        const handle = connectOrderBook('bingx', 'ETH', 'spot', vi.fn())
        tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })

    it('не падает при ошибке WS', () => {
        expect(() => ws.triggerError('connection refused')).not.toThrow()
    })

    it('Blob-сообщения обрабатываются через decompressBingX', async () => {
        // Мокируем decompressBingX через глобальный DecompressionStream
        // Проверяем что Blob-ветка не падает (реальная декомпрессия — в интеграционном тесте)
        const blob = new Blob(['{"data":{"bids":[["100","1.0"]],"asks":[]}}'], { type: 'application/octet-stream' })
        // В jsdom Blob.stream() и DecompressionStream недоступны → ожидаем ошибку, не краш
        let thrown = false
        try {
            await ws.onmessage?.({ data: blob })
        } catch {
            thrown = true
        }
        // Главное — onmessage обёрнут в try/catch, крашей нет
        expect(thrown).toBe(false)
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [6] connectBitget
// ═══════════════════════════════════════════════════════════════════════════════
describe('[6] connectBitget', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('bitget', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на правильный URL', () => {
        expect(ws.url).toBe('wss://ws.bitget.com/v2/ws/public')
    })

    it('отправляет подписку с instType=USDT-FUTURES для futures', () => {
        expect(ws.sent).toHaveLength(1)
        const sub = ws.sent[0]
        expect(sub.op).toBe('subscribe')
        expect(sub.args[0].instType).toBe('USDT-FUTURES')
        expect(sub.args[0].channel).toBe('books')
        expect(sub.args[0].instId).toBe('BTCUSDT')
    })

    it('отправляет подписку с instType=SPOT для spot', async () => {
        MockWebSocket.reset()
        connectOrderBook('bitget', 'ETH', 'spot', vi.fn())
        await tick()
        const spotWs = MockWebSocket.latest()
        expect(spotWs.sent[0].args[0].instType).toBe('SPOT')
    })

    it('snapshot: полностью заменяет localBids и localAsks', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1'], ['99', '2']], asks: [['101', '1']] }]
        })
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('update: инкрементально обновляет стакан', () => {
        ws.receive({
            action: 'snapshot',
            data: [{ bids: [['100', '1.0']], asks: [['101', '1.0']] }]
        })
        ws.receive({
            action: 'update',
            data: [{ bids: [['100', '0']], asks: [['102', '2.0']] }]
        })
        expect(updates[1].bids).toHaveLength(0) // 100 удалён
        expect(updates[1].asks).toHaveLength(2) // 101 + 102
    })

    it('игнорирует сообщения без data', () => {
        ws.receive({ action: 'snapshot' }) // нет data
        expect(updates).toHaveLength(0)
    })

    it('close() вызывает ws.close()', () => {
        const handle = connectOrderBook('bitget', 'LTC', 'spot', vi.fn())
        tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [7] connectBybit
// ═══════════════════════════════════════════════════════════════════════════════
describe('[7] connectBybit', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('bybit', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на linear URL для futures', () => {
        expect(ws.url).toContain('v5/public/linear')
    })

    it('открывает WS на spot URL для spot', async () => {
        MockWebSocket.reset()
        connectOrderBook('bybit', 'ETH', 'spot', vi.fn())
        await tick()
        expect(MockWebSocket.latest().url).toContain('v5/public/spot')
    })

    it('отправляет подписку на orderbook.200', () => {
        expect(ws.sent[0].op).toBe('subscribe')
        expect(ws.sent[0].args[0]).toContain('orderbook.200.BTCUSDT')
    })

    it('snapshot: инициализирует стакан', () => {
        ws.receive({
            type: 'snapshot',
            data: { b: [['100', '1'], ['99', '2']], a: [['101', '1']] }
        })
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('delta: инкрементально обновляет стакан', () => {
        ws.receive({
            type: 'snapshot',
            data: { b: [['100', '1.0']], a: [['101', '1.0']] }
        })
        ws.receive({
            type: 'delta',
            data: { b: [['100', '0']], a: [['102', '3.0']] }
        })
        expect(updates[1].bids).toHaveLength(0)
        expect(updates[1].asks.map(([p]) => p)).toContain(102)
    })

    it('игнорирует сообщения без data.b или data.a', () => {
        ws.receive({ type: 'snapshot', data: {} })
        expect(updates).toHaveLength(0)
    })

    it('close() вызывает ws.close()', () => {
        const handle = connectOrderBook('bybit', 'SOL', 'futures', vi.fn())
        tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [8] connectGate
// ═══════════════════════════════════════════════════════════════════════════════
describe('[8] connectGate', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('gate', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на fx-ws URL для futures', () => {
        expect(ws.url).toContain('fx-ws.gateio.ws')
    })

    it('открывает WS на api.gateio.ws для spot', async () => {
        MockWebSocket.reset()
        connectOrderBook('gate', 'ETH', 'spot', vi.fn())
        await tick()
        expect(MockWebSocket.latest().url).toContain('api.gateio.ws')
    })

    it('отправляет подписку с channel=futures.order_book_update', () => {
        expect(ws.sent[0].channel).toBe('futures.order_book_update')
        expect(ws.sent[0].event).toBe('subscribe')
        expect(ws.sent[0].payload).toContain('BTC_USDT')
    })

    it('игнорирует subscribe-события', () => {
        ws.receive({ result: {}, event: 'subscribe' })
        expect(updates).toHaveLength(0)
    })

    it('full=1: сбрасывает Map перед применением', () => {
        // Сначала загружаем данные
        ws.receive({ result: { b: [{ p: '100', s: '1.0' }], a: [], full: 1 } })
        expect(updates[0].bids).toHaveLength(1)
        // Второй full=1 сбрасывает и перезагружает
        ws.receive({ result: { b: [{ p: '200', s: '5.0' }], a: [], full: 1 } })
        expect(updates[1].bids).toHaveLength(1)
        expect(updates[1].bids[0][0]).toBe(200)
    })

    it('инкрементально применяет обновления через { p, s } формат', () => {
        ws.receive({ result: { b: [{ p: '100', s: '1.0' }], a: [{ p: '101', s: '1.0' }], full: 1 } })
        ws.receive({ result: { b: [{ p: '99', s: '2.0' }], a: [] } })
        expect(updates[1].bids).toHaveLength(2)
        expect(updates[1].bids.map(([p]) => p)).toContain(99)
    })

    it('удаляет уровень при s=0', () => {
        ws.receive({ result: { b: [{ p: '100', s: '1.0' }], a: [], full: 1 } })
        ws.receive({ result: { b: [{ p: '100', s: '0' }], a: [] } })
        expect(updates[1].bids).toHaveLength(0)
    })

    it('игнорирует пустые b и a массивы', () => {
        ws.receive({ result: { b: [], a: [] } })
        expect(updates).toHaveLength(0)
    })

    it('close() вызывает ws.close()', () => {
        const handle = connectOrderBook('gate', 'SOL', 'spot', vi.fn())
        tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [9] connectMEXC
// ═══════════════════════════════════════════════════════════════════════════════
describe('[9] connectMEXC', () => {
    let ws, updates

    beforeEach(async () => {
        updates = []
        connectOrderBook('mexc', 'BTC', 'futures', data => updates.push(data))
        await tick()
        ws = MockWebSocket.latest()
    })

    it('открывает WS на contract URL для futures', () => {
        expect(ws.url).toContain('contract.mexc.com')
    })

    it('открывает WS на wbs URL для spot', async () => {
        MockWebSocket.reset()
        connectOrderBook('mexc', 'ETH', 'spot', vi.fn())
        await tick()
        expect(MockWebSocket.latest().url).toContain('wbs.mexc.com')
    })

    it('отправляет подписку sub.depth при onopen', () => {
        expect(ws.sent[0].method).toBe('sub.depth')
        expect(ws.sent[0].param.symbol).toBe('BTC_USDT')
    })

    it('игнорирует rs.sub.depth (подтверждение подписки)', () => {
        ws.receive({ channel: 'rs.sub.depth' })
        expect(updates).toHaveLength(0)
    })

    it('игнорирует сообщения без data', () => {
        ws.receive({ channel: 'other', noData: true })
        expect(updates).toHaveLength(0)
    })

    it('первое сообщение инициализирует Map (initialized=false)', () => {
        ws.receive({
            data: {
                bids: [['100', '1.0'], ['99', '2.0']],
                asks: [['101', '1.0']],
            }
        })
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('последующие сообщения применяются инкрементально (initialized=true)', () => {
        ws.receive({ data: { bids: [['100', '1.0']], asks: [['101', '1.0']] } })
        ws.receive({ data: { bids: [['100', '0']], asks: [['102', '2.0']] } })
        expect(updates[1].bids).toHaveLength(0)
        expect(updates[1].asks.map(([p]) => p)).toContain(102)
    })

    it('инициализация c null/undefined bids/asks не падает', () => {
        expect(() => {
            ws.receive({ data: {} }) // нет bids, нет asks
        }).not.toThrow()
    })

    it('close() вызывает ws.close()', () => {
        const handle = connectOrderBook('mexc', 'ADA', 'spot', vi.fn())
        tick()
        const newWs = MockWebSocket.latest()
        const closeSpy = vi.spyOn(newWs, 'close')
        handle.close()
        expect(closeSpy).toHaveBeenCalled()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [10] connectKuCoin
// ═══════════════════════════════════════════════════════════════════════════════
describe('[10] connectKuCoin', () => {
    const tokenResponse = {
        data: {
            token: 'test-token-xyz',
            instanceServers: [{ endpoint: 'wss://ws-api.kucoin.com' }],
        }
    }

    let updates, handle, ws

    beforeEach(async () => {
        updates = []
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => tokenResponse,
        }))

        handle = connectOrderBook('kucoin', 'BTC', 'futures', data => updates.push(data))
        await ticks(5) // ждём async IIFE + WS открытие
        ws = MockWebSocket.latest()
    })

    it('делает POST к /kucoin-api/api/v1/bullet-public', () => {
        const fetchMock = globalThis.fetch
        expect(fetchMock).toHaveBeenCalledWith(
            '/kucoin-api/api/v1/bullet-public',
            expect.objectContaining({ method: 'POST' })
        )
    })

    it('открывает WS с токеном в URL', () => {
        expect(ws.url).toContain('wss://ws-api.kucoin.com')
        expect(ws.url).toContain('token=test-token-xyz')
    })

    it('отправляет подписку на /contractMarket/level2:BTCUSDTM', () => {
        const sub = ws.sent.find(s => s.type === 'subscribe')
        expect(sub).toBeDefined()
        expect(sub.topic).toBe('/contractMarket/level2:BTCUSDTM')
        expect(sub.privateChannel).toBe(false)
    })

    it('запускает ping каждые 20 секунд', () => {
        vi.useFakeTimers()
        // Имитируем 20с
        vi.advanceTimersByTime(20000)
        const pings = ws.sent.filter(s => s.type === 'ping')
        expect(pings.length).toBeGreaterThan(0)
        vi.useRealTimers()
    })

    it('игнорирует pong-сообщения', () => {
        ws.receive({ type: 'pong' })
        expect(updates).toHaveLength(0)
    })

    it('игнорирует ack-сообщения', () => {
        ws.receive({ type: 'ack' })
        expect(updates).toHaveLength(0)
    })

    it('игнорирует сообщения без data', () => {
        ws.receive({ type: 'message' })
        expect(updates).toHaveLength(0)
    })

    it('первое сообщение с bids/asks инициализирует Map', () => {
        ws.receive({
            data: {
                bids: [{ price: '100', qty: '1.0' }, { price: '99', qty: '2.0' }],
                asks: [{ price: '101', qty: '1.5' }],
            }
        })
        expect(updates[0].bids).toHaveLength(2)
        expect(updates[0].asks).toHaveLength(1)
    })

    it('change формат buy: обновляет localBids', () => {
        // Инициализируем
        ws.receive({ data: { bids: [{ price: '100', qty: '1.0' }], asks: [] } })
        // change: добавляем уровень 99
        ws.receive({ data: { change: '99,buy,3.0' } })
        const prices = updates[1].bids.map(([p]) => p)
        expect(prices).toContain(99)
    })

    it('change формат sell: обновляет localAsks', () => {
        ws.receive({ data: { asks: [{ price: '101', qty: '1.0' }], bids: [] } })
        ws.receive({ data: { change: '102,sell,2.0' } })
        const prices = updates[1].asks.map(([p]) => p)
        expect(prices).toContain(102)
    })

    it('change qty=0: удаляет уровень', () => {
        ws.receive({ data: { bids: [{ price: '100', qty: '1.0' }], asks: [] } })
        ws.receive({ data: { change: '100,buy,0' } })
        expect(updates[1].bids).toHaveLength(0)
    })

    it('close() очищает pingInterval и закрывает WS', () => {
        vi.useFakeTimers()
        const closeSpy = vi.spyOn(ws, 'close')
        handle.close()
        vi.advanceTimersByTime(20000)
        // После close ping не должен отправляться
        const pingsBefore = ws.sent.filter(s => s.type === 'ping').length
        vi.advanceTimersByTime(20000)
        const pingsAfter = ws.sent.filter(s => s.type === 'ping').length
        expect(pingsAfter).toBe(pingsBefore)
        expect(closeSpy).toHaveBeenCalled()
        vi.useRealTimers()
    })

    it('обрабатывает ошибку fetch токена без краша', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
        expect(() => {
            connectOrderBook('kucoin', 'ETH', 'futures', vi.fn())
        }).not.toThrow()
        await ticks(5)
        // aLog должен был быть вызван с error
        const { aLog } = await import('../../src/api.js')
        expect(aLog).toHaveBeenCalledWith('error', expect.anything(), expect.stringContaining('Network error'))
    })

    it('close() до получения токена не вызывает ws.close() на null', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({
                ok: true, json: async () => tokenResponse
            }), 5000))
        ))
        const freshHandle = connectOrderBook('kucoin', 'SOL', 'futures', vi.fn())
        // Закрываем до того как fetch завершился
        expect(() => freshHandle.close()).not.toThrow()
    })
})

// ═══════════════════════════════════════════════════════════════════════════════
// [11] aLog — логирование WS событий
// ═══════════════════════════════════════════════════════════════════════════════
describe('[11] aLog — WS логирование', () => {
    let aLogMock

    beforeEach(async () => {
        const mod = await import('../../src/api.js')
        aLogMock = mod.aLog
        vi.clearAllMocks()
    })

    it('логирует info при старте connectBinance', async () => {
        connectOrderBook('binance', 'BTC', 'futures', vi.fn())
        expect(aLogMock).toHaveBeenCalledWith('info', expect.stringContaining('BINANCE'), expect.stringContaining('подключение'))
    })

    it('логирует success при WS onopen (Binance)', async () => {
        connectOrderBook('binance', 'BTC', 'futures', vi.fn())
        await tick()
        expect(aLogMock).toHaveBeenCalledWith('success', expect.stringContaining('BINANCE'), expect.stringContaining('WS открыт'))
    })

    it('логирует success при первом emit', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ lastUpdateId: 1000, bids: [['100', '1']], asks: [['101', '1']] }),
        }))
        connectOrderBook('binance', 'BTC', 'futures', vi.fn())
        await tick()
        const ws = MockWebSocket.latest()
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        expect(aLogMock).toHaveBeenCalledWith('success', expect.any(String), expect.stringContaining('первые данные'))
    })

    it('логирует warn при close()', async () => {
        const handle = connectOrderBook('bybit', 'ETH', 'futures', vi.fn())
        await tick()
        vi.clearAllMocks()
        handle.close()
        expect(aLogMock).toHaveBeenCalledWith('warn', expect.stringContaining('BYBIT'), expect.stringContaining('close()'))
    })

    it('логирует error при ws.onerror (OKX)', async () => {
        connectOrderBook('okx', 'BTC', 'futures', vi.fn())
        await tick()
        const ws = MockWebSocket.latest()
        vi.clearAllMocks()
        ws.triggerError('ssl error')
        expect(aLogMock).toHaveBeenCalledWith('error', expect.stringContaining('OKX'), expect.stringContaining('ошибка'))
    })

    it('логирует info при старте connectGate', async () => {
        connectOrderBook('gate', 'ETH', 'spot', vi.fn())
        expect(aLogMock).toHaveBeenCalledWith('info', expect.stringContaining('GATE'), expect.stringContaining('подключение'))
    })

    it('логирует info при старте connectMEXC', async () => {
        connectOrderBook('mexc', 'BTC', 'spot', vi.fn())
        expect(aLogMock).toHaveBeenCalledWith('info', expect.stringContaining('MEXC'), expect.stringContaining('подключение'))
    })

    it('не логирует emit чаще раза в 5с (throttle)', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ lastUpdateId: 1000, bids: [['100', '1']], asks: [['101', '1']] }),
        }))
        connectOrderBook('binance', 'BTC', 'futures', vi.fn())
        await tick()
        const ws = MockWebSocket.latest()
        vi.useFakeTimers()
        vi.runAllTimers()
        vi.useRealTimers()
        await ticks(5)
        vi.clearAllMocks()

        // Шлём 10 быстрых обновлений
        for (let i = 0; i < 10; i++) {
            ws.receive({ u: 1001 + i, b: [['100', String(i)]], a: [] })
        }

        // aLog с 'log' + 'обновление' должен быть вызван не более 1 раза (throttle 5с)
        const emitLogs = aLogMock.mock.calls.filter(
            ([level, , msg]) => level === 'log' && typeof msg === 'string' && msg.includes('обновление')
        )
        expect(emitLogs.length).toBeLessThanOrEqual(1)
    })
})