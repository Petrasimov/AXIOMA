// Per-exchange request queue. Ensures minimum interval between requests
// to the same exchange so we don't trigger rate limits.
//
// In-flight dedup: если точно такой же запрос (url) уже выполняется —
// не ставим новый запрос в очередь, а ждём его результата.
// Для безопасного многократного чтения храним данные как ArrayBuffer.

const _state = {}
// url → Promise<{ ok, status, headers, buffer }>
const _inFlight = {}

export function rlFetch(exchange, minMs, url, opts) {
    if (!_state[exchange]) _state[exchange] = { last: 0, queue: [], busy: false }
    const s = _state[exchange]

    // Dedup: если такой запрос уже выполняется — подписываемся на его результат
    if (_inFlight[url]) {
        return _inFlight[url].then(cached => _reconstruct(cached))
    }

    // Создаём промис который сохраняет данные как ArrayBuffer
    const promise = new Promise((resolve, reject) => {
        s.queue.push({
            url, opts,
            resolve: async (res) => {
                try {
                    const buffer = await res.arrayBuffer()
                    const cached = {
                        ok: res.ok,
                        status: res.status,
                        headers: [...res.headers.entries()],
                        buffer
                    }
                    resolve(cached)
                } catch (e) {
                    reject(e)
                }
            },
            reject
        })
        if (!s.busy) _drain(s, minMs)
    })

    // Регистрируем в-полёте, удаляем после завершения
    _inFlight[url] = promise
    promise.then(() => delete _inFlight[url]).catch(() => delete _inFlight[url])

    // Возвращаем Response восстановленный из кэша
    return promise.then(cached => _reconstruct(cached))
}

function _reconstruct({ ok, status, headers, buffer }) {
    const h = new Headers()
    for (const [k, v] of headers) h.set(k, v)
    const res = new Response(buffer.slice(0), { status, headers: h })
    // Патчим ok т.к. Response.ok вычисляется из status
    Object.defineProperty(res, 'ok', { get: () => ok })
    return res
}

async function _drain(s, minMs) {
    s.busy = true
    while (s.queue.length > 0) {
        const gap = minMs - (Date.now() - s.last)
        if (gap > 0) await new Promise(r => setTimeout(r, gap))
        const item = s.queue.shift()
        s.last = Date.now()
        try { item.resolve(await fetch(item.url, item.opts)) }
        catch (e) { item.reject(e) }
    }
    s.busy = false
}