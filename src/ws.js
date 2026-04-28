// ─── WebSocket Order Book Manager ────────────────────────────────────────────
// connectOrderBook(exchange, symbol, onUpdate) → { close() }
// onUpdate получает: { bids: [[price, qty], ...], asks: [[price, qty], ...] }
// bids отсортированы по убыванию цены (лучшая цена — первая)
// asks отсортированы по возрастанию цены (лучшая цена — первая)

function connectBinance(symbol, marketType, onUpdate) {
    const sym = symbol.toLowerCase() + 'usdt'
    const SYM = symbol.toUpperCase() + 'USDT'

    const wsUrl = marketType === 'spot'
        ? `wss://stream.binance.com/ws/${sym}@depth@100ms`
        : `wss://fstream.binance.com/ws/${sym}@depth@100ms`

    const restUrl = marketType === 'spot'
        ? `https://api.binance.com/api/v3/depth?symbol=${SYM}&limit=1000`
        : `https://fapi.binance.com/fapi/v1/depth?symbol=${SYM}&limit=1000`

    let localBids = new Map()
    let localAsks = new Map()
    let lastUpdateId = 0
    let snapshotLoaded = false
    let buffer = []

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
        onUpdate({ bids, asks })
    }

    const ws = new WebSocket(wsUrl)

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

    setTimeout(async () => {
        try {
            const res = await fetch(restUrl)
            const snapshot = await res.json()
            lastUpdateId = snapshot.lastUpdateId
            localBids = new Map(snapshot.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(snapshot.asks.map(([p, q]) => [p, parseFloat(q)]))
            for (const msg of buffer) {
                if (msg.u <= lastUpdateId) continue
                applyLevels(localBids, msg.b)
                applyLevels(localAsks, msg.a)
                lastUpdateId = msg.u
            }
            buffer = []
            snapshotLoaded = true
            emit()
        } catch (e) {
            console.warn('Binance snapshot failed:', e)
        }
    }, 500)

    ws.onerror = (e) => console.warn('Binance WS error:', e)
    return { close: () => ws.close() }
}

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
        onUpdate({ bids, asks })
    }

    const handleMessage = (text) => {
        if (text === 'Ping') {
            ws.send('Pong')
            return
        }

        const msg = JSON.parse(text)
        if (!msg.data) return

        const book = msg.data
        if (book.bids) {
            localBids = new Map(
                book.bids.map(([p, q]) => [p, parseFloat(q)])
            )
        }
        if (book.asks) {
            localAsks = new Map(
                book.asks.map(([p, q]) => [p, parseFloat(q)])
            )
        }
        emit()
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            id: crypto.randomUUID(),
            reqType: 'sub',
            dataType: `${sym}@depth`
        }))
    }

    ws.onmessage = async (event) => {
        try {
            if (event.data instanceof Blob) {
                const text = await decompressBingX(event.data)
                handleMessage(text)
            } else {
                handleMessage(event.data)
            }
        } catch (e) {
            console.warn('BingX message error:', e)
        }
    }

    ws.onerror = (e) => console.warn('BingX WS error:', e)
    return { close: () => ws.close() }
}

function connectBitget(symbol, marketType, onUpdate) {
    const instType = marketType === 'spot' ? 'SPOT' : 'USDT-FUTURES'
    const instId = `${symbol}USDT`

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
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 'subscribe',
            args: [{ instType, channel: 'books', instId }]
        }))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data[0]) return

        const book = msg.data[0]

        if (msg.action === 'snapshot') {
            localBids = new Map(book.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(book.asks.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.action === 'update') {
            applyLevels(localBids, book.bids)
            applyLevels(localAsks, book.asks)
        }

        emit()
    }

    ws.onerror = (e) => console.warn('Bitget WS error:', e)
    return { close: () => ws.close() }
}

function connectBybit(symbol, marketType, onUpdate) {
    const sym = symbol.toUpperCase() + 'USDT'
    const url = marketType === 'spot'
        ? `wss://stream.bybit.com/v5/public/spot`
        : `wss://stream.bybit.com/v5/public/linear`

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
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 'subscribe',
            args: [`orderbook.200.${sym}`]
        }))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data.b || !msg.data.a) return

        if (msg.type === 'snapshot') {
            localBids = new Map(msg.data.b.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(msg.data.a.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.type === 'delta') {
            applyLevels(localBids, msg.data.b)
            applyLevels(localAsks, msg.data.a)
        }

        emit()
    }

    ws.onerror = (e) => console.warn('Bybit WS error:', e)
    return { close: () => ws.close() }
}

function connectGate(symbol, marketType, onUpdate) {
    const sym = marketType === 'spot'
        ? `${symbol}_USDT`
        : `${symbol}_USDT`

    const url = marketType === 'spot'
        ? `wss://api.gateio.ws/ws/v4/`
        : `wss://fx-ws.gateio.ws/v4/ws/usdt`

    const channel = marketType === 'spot'
        ? 'spot.order_book_update'
        : 'futures.order_book_update'

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
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel, 
            event: 'subscribe',
            payload: [sym, '100ms']
        }))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.result || msg.event === 'subscribe') return

        const book = msg.result

        if (book.full === 1) {
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

    ws.onerror = (e) => console.warn('Gate WS error:', e)
    return { close: () => ws.close() }
}

function connectMEXC(symbol, marketType, onUpdate) {
    const sym = `${symbol}_USDT`
    const url = marketType === 'spot'
        ? `wss://wbs.mexc.com/ws`
        : `wss://contract.mexc.com/edge`

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
        onUpdate({ bids, asks })
    }

    const handleMessage = (text) => {
        const msg = JSON.parse(text)
        if (msg.channel === 'rs.sub.depth') return
        if (!msg.data) return

        const book = msg.data

        if (!initialized) {
            localBids = new Map(book.bids?.map(([p, q]) => [String(p), parseFloat(q)]) ?? [])
            localAsks = new Map(book.asks?.map(([p, q]) => [String(p), parseFloat(q)]) ?? [])
            initialized = true
        } else {
            if (book.bids) applyLevels(localBids, book.bids)
            if (book.asks) applyLevels(localAsks, book.asks)
        }

        emit()
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            method: 'sub.depth',
            param: { symbol: sym }
        }))
    }

    ws.onmessage = async (event) => {
        try {
            if (event.data instanceof Blob) {
                const text = await decompressBingX(event.data)
                handleMessage(text)
            } else {
                handleMessage(event.data)
            }
        } catch (e) {
            console.warn('MEXC message error:', e)
        }
    }

    ws.onerror = (e) => console.warn('MEXC WS error:', e)
    return { close: () => ws.close() }
}

function connectOKX(symbol, marketType, onUpdate) {
    const instId = marketType === 'spot'
        ? `${symbol}-USDT`
        : `${symbol}-USDT-SWAP`

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
        onUpdate({ bids, asks })
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 'subscribe',
            args: [{ channel: 'books', instId }]
        }))
    }

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (!msg.data || !msg.data[0]) return
        const book = msg.data[0]

        if (msg.action === 'snapshot') {
            localBids = new Map(book.bids.map(([p, q]) => [p, parseFloat(q)]))
            localAsks = new Map(book.asks.map(([p, q]) => [p, parseFloat(q)]))
        } else if (msg.action === 'update') {
            applyLevels(localBids, book.bids)
            applyLevels(localAsks, book.asks)
        }

        emit()
    }

    ws.onerror = (e) => console.warn('OKX WS error:', e)
    return { close: () => ws.close() }
}


function connectKuCoin(symbol, marketType, onUpdate) {
    let ws = null
    let pingInterval = null

    const handle = {
        close: () => {
            clearInterval(pingInterval)
            if (ws) ws.close()
        }
    }

    ;(async () => {
        try {
            const res = await fetch('/kucoin-api/api/v1/bullet-public', {
                method: 'POST'
            })
            const data = await res.json()
            const token = data.data.token
            const endpoint = data.data.instanceServers[0].endpoint

            let localBids = new Map()
            let localAsks = new Map()
            let initialized = false

            const applyLevels = (map, levels) => {
                for (const { price, qty } of levels) {
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
                onUpdate({ bids, asks })
            }

            ws = new WebSocket(`${endpoint}?token=${token}`)

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    id: Date.now().toString(),
                    type: 'subscribe',
                    topic: `/contractMarket/level2:${symbol}USDTM`,
                    privateChannel: false,
                    response: true
                }))

                pingInterval = setInterval(() => {
                    ws.send(JSON.stringify({
                        id: Date.now().toString(),
                        type: 'ping'
                    }))
                }, 20000)
            }

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data)
                if (msg.type === 'pong' || msg.type === 'ack') return
                if (!msg.data) return

                const book = msg.data

                if (!initialized) {
                    localBids = new Map(
                        book.bids?.map(({ price, qty }) => [String(price), parseFloat(qty)]) ?? []
                    )
                    localAsks = new Map(
                        book.asks?.map(({ price, qty }) => [String(price), parseFloat(qty)]) ?? []
                    )
                    initialized = true
                } else if (book.change) {
                    const [price, side, qty] = book.change.split(',')
                    const map = side === 'buy' ? localBids : localAsks
                    if (parseFloat(qty) === 0) map.delete(price)
                    else map.set(price, parseFloat(qty))
                }

                emit()
            }

            ws.onerror = (e) => console.warn('KuCoin WS error:', e)

        } catch (e) {
            console.warn('KuCoin WS token failed:', e)
        }
    })()

    return handle
}



const CONNECTORS = {
    binance: connectBinance,
    bingx: connectBingX,
    bitget: connectBitget,
    bybit: connectBybit,
    gate: connectGate,
    mexc: connectMEXC,
    okx: connectOKX,
    kucoin: connectKuCoin
}

export function connectOrderBook(exchange, symbol, marketType, onUpdate) {
    const connector = CONNECTORS[exchange]
    if (!connector) {
        console.warn(`No WS connector for exchange: ${exchange}`)
        return { close: () => {} }
    }
    return connector(symbol,marketType, onUpdate)
}