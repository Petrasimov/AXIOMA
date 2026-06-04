// ─── WebSocket Order Book Manager ────────────────────────────────────────────
// connectOrderBook(exchange, symbol, marketType, onUpdate) → { close() }
// onUpdate получает: { bids: [[price, qty], ...], asks: [[price, qty], ...] }
// bids отсортированы по убыванию цены (лучшая цена — первая)
// asks отсортированы по возрастанию цены (лучшая цена — первая)

import { aLog } from './api.js'

// ─── Утилита WS-логирования ───────────────────────────────────────────────────
// Throttle для emit-логов: первый emit + не чаще 1 раза в 5 секунд
function makeWsLogger(exchange, symbol, marketType) {
    const tag = `[WS ${exchange.toUpperCase()} ${symbol} ${marketType}]`
    let lastEmitLog = 0
    let firstEmitDone = false
    return {
        info:    (...a) => aLog('info',    `${tag}`, ...a),
        success: (...a) => aLog('success', `${tag}`, ...a),
        warn:    (...a) => aLog('warn',    `${tag}`, ...a),
        error:   (...a) => aLog('error',   `${tag}`, ...a),
        log:     (...a) => aLog('log',     `${tag}`, ...a),
        // Первый emit логируется всегда, далее не чаще раза в 5с
        emit(bids, asks) {
            const now = Date.now()
            const bestBid = bids[0]?.[0]?.toFixed(6) ?? 'n/a'
            const bestAsk = asks[0]?.[0]?.toFixed(6) ?? 'n/a'
            if (!firstEmitDone) {
                firstEmitDone = true
                lastEmitLog = now
                // tag и msg — раздельные аргументы, консистентно с info/success/warn/log
                aLog('success', tag, `✅ первые данные: bids=${bids.length} asks=${asks.length} | bid=${bestBid} ask=${bestAsk}`)
                return
            }
            if (now - lastEmitLog < 5000) return
            lastEmitLog = now
            aLog('log', tag, `обновление: bids=${bids.length} asks=${asks.length} | bid=${bestBid} ask=${bestAsk}`)
        },
    }
}

// ─── Binance ──────────────────────────────────────────────────────────────────
function connectBinance(symbol, marketType, onUpdate) {
    const sym = symbol.toLowerCase() + 'usdt'
    const SYM = symbol.toUpperCase() + 'USDT'
    const log = makeWsLogger('binance', symbol, marketType)

    const wsUrl = marketType === 'spot'
        ? `wss://stream.binance.com/ws/${sym}@depth@100ms`
        : `wss://fstream.binance.com/ws/${sym}@depth@100ms`

    const restUrl = marketType === 'spot'
        ? `https://api.binance.com/api/v3/depth?symbol=${SYM}&limit=1000`
        : `https://fapi.binance.com/fapi/v1/depth?symbol=${SYM}&limit=1000`

    log.info(`подключение → ${wsUrl}`)

    let localBids = new Map()
    let localAsks = new Map()
    let lastUpdateId = 0
    let snapshotLoaded = false
    let buffer = []
    let closed = false

    const applyLevels = (map, levels) => {
        for (const [p, q] of levels) {
            if (parseFloat(q) === 0) map.delete(p)
            else map.set(p, parseFloat(q))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
        log.success(`WS открыт`)
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!snapshotLoaded) {
            buffer.push(msg)
            return
        }
        if (msg.u <= lastUpdateId) return
        applyLevels(localBids, msg.b)
        applyLevels(localAsks, msg.a)
        lastUpdateId = msg.u
        emit()
    }

    const t0 = Date.now()
    setTimeout(async () => {
        if (closed) return
        try {
            log.log(`загружаем снэпшот → ${restUrl}`)
            const res = await fetch(restUrl)
            const snapshot = await res.json()
            if (closed) return
            lastUpdateId = snapshot.lastUpdateId
            localBids = new Map(snapshot.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(snapshot.asks.map(([p, q]) => [p, parseFloat(q)]))
            log.success(`снэпшот загружен: bids=${snapshot.bids.length} asks=${snapshot.asks.length} lastUpdateId=${snapshot.lastUpdateId} ⏱ ${Date.now() - t0}мс`)
            let applied = 0
            for (const msg of buffer) {
                if (msg.u <= lastUpdateId) continue
                applyLevels(localBids, msg.b)
                applyLevels(localAsks, msg.a)
                lastUpdateId = msg.u
                applied++
            }
            if (applied > 0) log.log(`буфер применён: ${applied} сообщений`)
            buffer = []
            snapshotLoaded = true
            emit()
        } catch (e) {
            log.warn(`снэпшот не загружен: ${e.message}`)
            console.warn('Binance snapshot failed:', e)
        }
    }, 500)

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('Binance WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            closed = true
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── BingX ────────────────────────────────────────────────────────────────────
async function decompressBingX(blob) {
    const ds = new DecompressionStream('gzip')
    const stream = blob.stream().pipeThrough(ds)
    const reader = stream.getReader()
    const chunks = []
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
    }
    const total = chunks.reduce((a, c) => a + c.length, 0)
    const buf = new Uint8Array(total)
    let off = 0
    for (const c of chunks) { buf.set(c, off); off += c.length }
    return new TextDecoder().decode(buf)
}

function connectBingX(symbol, marketType, onUpdate) {
    const sym = `${symbol}-USDT`
    const log = makeWsLogger('bingx', symbol, marketType)

    log.info(`подключение → wss://open-api-ws.bingx.com/market`)

    const ws = new WebSocket('wss://open-api-ws.bingx.com/market')

    let localBids = new Map()
    let localAsks = new Map()

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    const handleMessage = (text) => {
        if (text === 'Ping') {
            log.log(`← Ping | отвечаем Pong`)
            ws.send('Pong')
            return
        }

        const msg = JSON.parse(text)
        if (!msg.data) return

        const book = msg.data
        if (book.bids) {
            localBids = new Map(book.bids.map(([p, q]) => [p, parseFloat(q)]))
        }
        if (book.asks) {
            localAsks = new Map(book.asks.map(([p, q]) => [p, parseFloat(q)]))
        }
        emit()
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        // Документация BingX: один WS endpoint для spot и futures
        // Futures: dataType = 'ETH-USDT@depth'  → /market
        // Spot:    dataType = 'ETH-USDT@depth'  → /market (тот же формат)
        // Различие только в контексте: futures подписка работает для perpetual
        // Spot depth также поддерживается через тот же endpoint и dataType
        const dataType = `${sym}@depth`
        const sub = { id: crypto.randomUUID(), reqType: 'sub', dataType }
        log.log(`подписка → ${dataType} (${marketType})`)
        ws.send(JSON.stringify(sub))
    }

    ws.onmessage = async (event) => {
        try {
            if (event.data instanceof Blob) {
                const before = event.data.size
                const text = await decompressBingX(event.data)
                log.log(`декомпрессия: ${before}B → ${text.length}B`)
                handleMessage(text)
            } else {
                handleMessage(event.data)
            }
        } catch (e) {
            log.error(`ошибка обработки сообщения: ${e.message}`)
            console.warn('BingX message error:', e)
        }
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('BingX WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── Bitget ───────────────────────────────────────────────────────────────────
function connectBitget(symbol, marketType, onUpdate) {
    const instType = marketType === 'spot' ? 'SPOT' : 'USDT-FUTURES'
    const instId = `${symbol}USDT`
    const log = makeWsLogger('bitget', symbol, marketType)

    log.info(`подключение → wss://ws.bitget.com/v2/ws/public`)

    const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public')
    let localBids = new Map()
    let localAsks = new Map()

    const applyLevels = (map, levels) => {
        for (const [p, q] of levels) {
            if (parseFloat(q) === 0) map.delete(p)
            else map.set(p, parseFloat(q))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        const sub = { op: 'subscribe', args: [{ instType, channel: 'books', instId }] }
        log.log(`подписка → instType=${instType} instId=${instId}`)
        ws.send(JSON.stringify(sub))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data[0]) return

        const book = msg.data[0]

        if (msg.action === 'snapshot') {
            log.log(`snapshot: bids=${book.bids.length} asks=${book.asks.length}`)
            localBids = new Map(book.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(book.asks.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.action === 'update') {
            log.log(`update: bids=${book.bids.length} asks=${book.asks.length}`)
            applyLevels(localBids, book.bids)
            applyLevels(localAsks, book.asks)
        }

        emit()
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('Bitget WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── Bybit ────────────────────────────────────────────────────────────────────
function connectBybit(symbol, marketType, onUpdate) {
    const sym = symbol.toUpperCase() + 'USDT'
    const url = marketType === 'spot'
        ? `wss://stream.bybit.com/v5/public/spot`
        : `wss://stream.bybit.com/v5/public/linear`
    const log = makeWsLogger('bybit', symbol, marketType)

    log.info(`подключение → ${url}`)

    const ws = new WebSocket(url)
    let localBids = new Map()
    let localAsks = new Map()

    const applyLevels = (map, levels) => {
        for (const [p, q] of levels) {
            if (parseFloat(q) === 0) map.delete(p)
            else map.set(p, parseFloat(q))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        const sub = { op: 'subscribe', args: [`orderbook.200.${sym}`] }
        log.log(`подписка → orderbook.200.${sym}`)
        ws.send(JSON.stringify(sub))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data.b || !msg.data.a) return

        if (msg.type === 'snapshot') {
            log.log(`snapshot: bids=${msg.data.b.length} asks=${msg.data.a.length}`)
            localBids = new Map(msg.data.b.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(msg.data.a.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.type === 'delta') {
            log.log(`delta: bids=${msg.data.b.length} asks=${msg.data.a.length}`)
            applyLevels(localBids, msg.data.b)
            applyLevels(localAsks, msg.data.a)
        }

        emit()
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('Bybit WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── Gate ─────────────────────────────────────────────────────────────────────
function connectGate(symbol, marketType, onUpdate) {
    const sym = `${symbol}_USDT`

    const url = marketType === 'spot'
        ? `wss://api.gateio.ws/ws/v4/`
        : `wss://fx-ws.gateio.ws/v4/ws/usdt`

    const channel = marketType === 'spot'
        ? 'spot.order_book_update'
        : 'futures.order_book_update'

    const log = makeWsLogger('gate', symbol, marketType)
    log.info(`подключение → ${url}`)

    const ws = new WebSocket(url)
    let localBids = new Map()
    let localAsks = new Map()

    const applyLevels = (map, levels) => {
        for (const { p, s } of levels) {
            if (parseFloat(s) === 0) map.delete(p)
                else map.set(p, parseFloat(s))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        const sub = {
            time: Math.floor(Date.now() / 1000),
            channel,
            event: 'subscribe',
            payload: [sym, '100ms']
        }
        log.log(`подписка → channel=${channel} sym=${sym}`)
        ws.send(JSON.stringify(sub))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.result || msg.event === 'subscribe') return

        const book = msg.result

        if (book.full === 1) {
            log.log(`full snapshot — сброс Map (bids=${book.b?.length ?? 0} asks=${book.a?.length ?? 0})`)
            localBids = new Map()
            localAsks = new Map()
        }

        const hasBids = book.b && book.b.length > 0
        const hasAsks = book.a && book.a.length > 0
        if (!hasBids && !hasAsks) return

        if (hasBids) applyLevels(localBids, book.b)
        if (hasAsks) applyLevels(localAsks, book.a)

        emit()
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('Gate WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── MEXC ─────────────────────────────────────────────────────────────────────
function connectMEXC(symbol, marketType, onUpdate) {
    const sym    = `${symbol}_USDT`    // futures формат: ETH_USDT
    const symCap = `${symbol.toUpperCase()}USDT` // spot формат: ETHUSDT

    // Futures: wss://contract.mexc.com/edge (не изменился)
    // Spot:    wss://wbs-api.mexc.com/ws   (wbs.mexc.com отключён Aug 4 2025)
    const url = marketType === 'spot'
        ? `wss://wbs-api.mexc.com/ws`
        : `wss://contract.mexc.com/edge`
    const log = makeWsLogger('mexc', symbol, marketType)

    log.info(`подключение → ${url}`)

    const ws = new WebSocket(url)
    let localBids = new Map()
    let localAsks = new Map()
    let initialized = false

    const applyLevels = (map, levels) => {
        for (const [p, q] of levels) {
            if (parseFloat(q) === 0) map.delete(String(p))
            else map.set(String(p), parseFloat(q))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    const handleMessage = (text) => {
        const msg = JSON.parse(text)

        if (marketType === 'spot') {
            // ─── MEXC Spot WS v3 (wbs-api.mexc.com) ─────────────────────────
            // Подписка: spot@public.limit.depth.v3.api@ETHUSDT@20
            // Ответ: { c: "spot@...", d: { asks: [[p,q],...], bids: [[p,q],...] } }
            const d = msg.d
            if (!d) return

            const bids = d.bids ?? []
            const asks = d.asks ?? []

            if (!initialized && (bids.length > 0 || asks.length > 0)) {
                log.log(`инициализация стакана: bids=${bids.length} asks=${asks.length}`)
                localBids = new Map(bids.map(([p, q]) => [String(p), parseFloat(q)]))
                localAsks = new Map(asks.map(([p, q]) => [String(p), parseFloat(q)]))
                initialized = true
            } else if (initialized) {
                if (bids.length || asks.length) {
                    log.log(`update: bids=${bids.length} asks=${asks.length}`)
                }
                if (bids.length) applyLevels(localBids, bids)
                if (asks.length) applyLevels(localAsks, asks)
            }
            emit()

        } else {
            // ─── MEXC Futures WS (contract.mexc.com/edge) ────────────────────
            // Подписка: sub.depth symbol=ETH_USDT
            // Ответ: { channel: "push.depth", data: { bids: [[p,q]], asks: [[p,q]] } }
            if (msg.channel === 'rs.sub.depth') {
                log.log(`подписка подтверждена (rs.sub.depth)`)
                return
            }
            if (!msg.data) return
            const book = msg.data

            if (!initialized) {
                log.log(`инициализация стакана: bids=${book.bids?.length ?? 0} asks=${book.asks?.length ?? 0}`)
                localBids = new Map(book.bids?.map(([p, q]) => [String(p), parseFloat(q)]) ?? [])
                localAsks = new Map(book.asks?.map(([p, q]) => [String(p), parseFloat(q)]) ?? [])
                initialized = true
            } else {
                if (book.bids || book.asks) {
                    log.log(`update: bids=${book.bids?.length ?? 0} asks=${book.asks?.length ?? 0}`)
                }
                if (book.bids) applyLevels(localBids, book.bids)
                if (book.asks) applyLevels(localAsks, book.asks)
            }
            emit()
        }
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        if (marketType === 'spot') {
            // Spot v3 API: JSON формат без суффикса .pb (protobuf)
            // Канал: spot@public.limit.depth.v3.api@ETHUSDT@20
            const sub = {
                method: 'SUBSCRIPTION',
                params: [`spot@public.limit.depth.v3.api@${symCap}@20`]
            }
            log.log(`подписка → spot@public.limit.depth.v3.api@${symCap}@20`)
            ws.send(JSON.stringify(sub))
        } else {
            // Futures: старый протокол sub.depth
            const sub = { method: 'sub.depth', param: { symbol: sym } }
            log.log(`подписка → sub.depth symbol=${sym}`)
            ws.send(JSON.stringify(sub))
        }
    }

    ws.onmessage = async (event) => {
        try {
            if (event.data instanceof Blob) {
                const before = event.data.size
                const text = await decompressBingX(event.data)
                log.log(`декомпрессия: ${before}B → ${text.length}B`)
                handleMessage(text)
            } else {
                handleMessage(event.data)
            }
        } catch (e) {
            log.error(`ошибка обработки сообщения: ${e.message}`)
            console.warn('MEXC message error:', e)
        }
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('MEXC WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── OKX ──────────────────────────────────────────────────────────────────────
function connectOKX(symbol, marketType, onUpdate) {
    const instId = marketType === 'spot'
        ? `${symbol}-USDT`
        : `${symbol}-USDT-SWAP`
    const log = makeWsLogger('okx', symbol, marketType)

    log.info(`подключение → wss://ws.okx.com:8443/ws/v5/public`)

    const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')

    let localBids = new Map()
    let localAsks = new Map()

    const applyLevels = (map, levels) => {
        for (const [p, q] of levels) {
            if (parseFloat(q) === 0) map.delete(p)
            else map.set(p, parseFloat(q))
        }
    }

    const emit = () => {
        const bids = [...localBids.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => b[0] - a[0])
        const asks = [...localAsks.entries()]
            .map(([p, q]) => [parseFloat(p), q])
            .sort((a, b) => a[0] - b[0])
        log.emit(bids, asks)
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        log.success(`WS открыт`)
        const sub = { op: 'subscribe', args: [{ channel: 'books', instId }] }
        log.log(`подписка → channel=books instId=${instId}`)
        ws.send(JSON.stringify(sub))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data[0]) return
        const book = msg.data[0]

        if (msg.action === 'snapshot') {
            log.log(`snapshot: bids=${book.bids.length} asks=${book.asks.length}`)
            localBids = new Map(book.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(book.asks.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.action === 'update') {
            log.log(`update: bids=${book.bids.length} asks=${book.asks.length}`)
            applyLevels(localBids, book.bids)
            applyLevels(localAsks, book.asks)
        }

        emit()
    }

    ws.onerror = (e) => {
        log.error(`ошибка WS: ${e.message ?? e.type}`)
        console.warn('OKX WS error:', e)
    }

    ws.onclose = (e) => {
        log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
    }

    return {
        close: () => {
            log.warn(`close() вызван`)
            ws.close()
        }
    }
}

// ─── KuCoin ───────────────────────────────────────────────────────────────────
function connectKuCoin(symbol, marketType, onUpdate) {
    let ws = null
    let pingInterval = null
    const log = makeWsLogger('kucoin', symbol, marketType)

    // Документация KuCoin (kucoin.com/docs-new):
    // Futures: POST /api/v1/bullet-public → api-futures.kucoin.com → wss://ws-api-futures.kucoin.com
    // Spot:    POST /api/v1/bullet-public → api.kucoin.com         → wss://ws-api-spot.kucoin.com
    // Прокси в vite.config.js:
    //   /kucoin-api      → api-futures.kucoin.com
    //   /kucoin-spot-api → api.kucoin.com
    const tokenEndpoint = marketType === 'spot'
        ? '/kucoin-spot-api/api/v1/bullet-public'
        : '/kucoin-api/api/v1/bullet-public'

    log.info(`подключение → запрашиваем токен ${tokenEndpoint}`)

    const handle = {
        closed: false,
        close: () => {
            handle.closed = true
            log.warn(`close() вызван`)
            clearInterval(pingInterval)
            if (ws) ws.close()
        }
    }

    ;(async () => {
        try {
            const t0 = Date.now()
            const res = await fetch(tokenEndpoint, { method: 'POST' })
            if (handle.closed) return
            const data = await res.json()
            const token = data.data.token
            const endpoint = data.data.instanceServers[0].endpoint
            log.success(`токен получен ⏱ ${Date.now() - t0}мс | endpoint=${endpoint}`)

            let localBids = new Map()
            let localAsks = new Map()
            let initialized = false

            // Futures: { price, qty }  — формат contractMarket/level2
            // Spot:    { price, size } — формат spotMarket/level2Depth50
            const applyLevels = (map, levels) => {
                for (const item of levels) {
                    const price = item.price
                    const qty   = item.qty ?? item.size ?? '0'
                    if (parseFloat(qty) === 0) map.delete(String(price))
                    else map.set(String(price), parseFloat(qty))
                }
            }

            const emit = () => {
                const bids = [...localBids.entries()]
                    .map(([p, q]) => [parseFloat(p), q])
                    .sort((a, b) => b[0] - a[0])
                const asks = [...localAsks.entries()]
                    .map(([p, q]) => [parseFloat(p), q])
                    .sort((a, b) => a[0] - b[0])
                log.emit(bids, asks)
                onUpdate({ bids, asks })
            }

            ws = new WebSocket(`${endpoint}?token=${token}`)

            ws.onopen = () => {
                log.success(`WS открыт`)

                // Futures: /contractMarket/level2:ETHUSDTM  — инкрементальные изменения
                // Spot:    /spotMarket/level2Depth50:ETH-USDT — топ-50 с полным снэпшотом
                const topic = marketType === 'spot'
                    ? `/spotMarket/level2Depth50:${symbol}-USDT`
                    : `/contractMarket/level2:${symbol}USDTM`

                const sub = {
                    id: Date.now().toString(),
                    type: 'subscribe',
                    topic,
                    privateChannel: false,
                    response: true
                }
                log.log(`подписка → ${topic}`)
                ws.send(JSON.stringify(sub))

                pingInterval = setInterval(() => {
                    if (handle.closed) return
                    const ping = { id: Date.now().toString(), type: 'ping' }
                    log.log(`→ ping`)
                    ws.send(JSON.stringify(ping))
                }, 20000)
            }

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data)
                if (msg.type === 'pong') {
                    log.log(`← pong`)
                    return
                }
                if (msg.type === 'ack') {
                    log.log(`← ack (подписка подтверждена)`)
                    return
                }
                if (!msg.data) return

                const book = msg.data

                if (marketType === 'spot') {
                    // Spot level2Depth50: присылает полный снэпшот при каждом обновлении
                    // { data: { bids: [[price, size]], asks: [[price, size]] } }
                    const rawBids = book.bids ?? []
                    const rawAsks = book.asks ?? []
                    if (!rawBids.length && !rawAsks.length) return
                    log.log(`spot snapshot: bids=${rawBids.length} asks=${rawAsks.length}`)
                    localBids = new Map(rawBids.map(([p, q]) => [String(p), parseFloat(q)]))
                    localAsks = new Map(rawAsks.map(([p, q]) => [String(p), parseFloat(q)]))

                } else {
                    // Futures level2: инкрементальные изменения
                    // { data: { bids: [{price, qty}], asks: [{price, qty}], change: "price,side,qty" } }
                    if (!initialized) {
                        log.log(`инициализация стакана: bids=${book.bids?.length ?? 0} asks=${book.asks?.length ?? 0}`)
                        localBids = new Map(
                            book.bids?.map(({ price, qty }) => [String(price), parseFloat(qty)]) ?? []
                        )
                        localAsks = new Map(
                            book.asks?.map(({ price, qty }) => [String(price), parseFloat(qty)]) ?? []
                        )
                        initialized = true
                    } else if (book.change) {
                        const [price, side, qty] = book.change.split(',')
                        log.log(`change: price=${price} side=${side} qty=${qty}`)
                        const map = side === 'buy' ? localBids : localAsks
                        if (parseFloat(qty) === 0) map.delete(price)
                        else map.set(price, parseFloat(qty))
                    }
                }

                emit()
            }

            ws.onerror = (e) => {
                log.error(`ошибка WS: ${e.message ?? e.type}`)
                console.warn('KuCoin WS error:', e)
            }

            ws.onclose = (e) => {
                log.warn(`WS закрыт: code=${e.code} reason=${e.reason || '—'}`)
                clearInterval(pingInterval)
            }

        } catch (e) {
            log.error(`ошибка получения токена: ${e.message}`)
            console.warn('KuCoin WS token failed:', e)
        }
    })()

    return handle
}

// ─── Router ───────────────────────────────────────────────────────────────────
const CONNECTORS = {
    binance: connectBinance,
    bingx:   connectBingX,
    bitget:  connectBitget,
    bybit:   connectBybit,
    gate:    connectGate,
    mexc:    connectMEXC,
    okx:     connectOKX,
    kucoin:  connectKuCoin,
}

export function connectOrderBook(exchange, symbol, marketType, onUpdate) {
    const connector = CONNECTORS[exchange]
    if (!connector) {
        aLog('error', `[WS] ❌ неизвестная биржа: "${exchange}" — коннектор не найден`)
        console.warn(`No WS connector for exchange: ${exchange}`)
        return { close: () => {} }
    }
    aLog('info', `[WS] connectOrderBook → exchange=${exchange} symbol=${symbol} marketType=${marketType}`)
    return connector(symbol, marketType, onUpdate)
}