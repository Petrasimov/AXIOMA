// Per-exchange request queue. Ensures minimum interval between requests
// to the same exchange so we don't trigger rate limits.
//
// Usage: rlFetch('okx', 300, url) instead of fetch(url)

const _state = {}

export function rlFetch(exchange, minMs, url, opts) {
    if (!_state[exchange]) _state[exchange] = { last: 0, queue: [], busy: false }
    const s = _state[exchange]
    return new Promise((resolve, reject) => {
        s.queue.push({ url, opts, resolve, reject })
        if (!s.busy) _drain(s, minMs)
    })
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
