/**
 * rateLimiter.js — Rate limiter с очередью и дедупликацией запросов
 *
 * Гарантирует минимальный интервал между запросами к одной бирже,
 * чтобы не получить бан по rate limit.
 *
 * Дедупликация (in-flight dedup): если точно такой же URL уже запрашивается
 * параллельно — новый запрос не создаётся, а подписывается на результат первого.
 * Ответ хранится как ArrayBuffer для безопасного многократного чтения.
 */

import { aLog } from './api.js'

// Состояние очереди per-exchange: { last: timestamp, queue: [], busy: bool }
const _queues = {}

// Карта активных запросов: url → Promise<CachedResponse>
const _inFlight = {}

/**
 * Выполняет fetch с соблюдением rate limit для указанной биржи.
 *
 * @param {string} exchange — ключ биржи (например 'binance', 'okx')
 * @param {number} minMs    — минимальный интервал между запросами в мс
 * @param {string} url      — URL запроса
 * @param {object} opts     — опции fetch (headers и т.д.)
 * @returns {Promise<Response>}
 */
export function rlFetch(exchange, minMs, url, opts) {
    if (!_queues[exchange]) {
        _queues[exchange] = { last: 0, queue: [], busy: false }
    }
    const state = _queues[exchange]

    // Лог входа в rlFetch — биржа, интервал, URL
    aLog('log', `[RL] rlFetch → exchange=${exchange} minMs=${minMs} url=${url.length > 80 ? url.slice(0, 80) + '…' : url}`)

    // Дедупликация: подписываемся на уже выполняющийся запрос
    if (_inFlight[url]) {
        // Лог попадания в dedup — запрос уже выполняется, ждём его результата
        aLog('warn', `[RL] DEDUP HIT — подписываемся на уже выполняющийся запрос: ${url.length > 80 ? url.slice(0, 80) + '…' : url}`)
        return _inFlight[url].then(cached => _reconstruct(cached))
    }

    // Лог постановки в очередь — позиция и текущая длина очереди
    aLog('log', `[RL] В очередь → exchange=${exchange} | позиция=${state.queue.length + 1} | busy=${state.busy}`)

    // Создаём промис с сохранением ответа как ArrayBuffer
    const promise = new Promise((resolve, reject) => {
        state.queue.push({
            url, opts,
            resolve: async (res) => {
                try {
                    const buffer = await res.arrayBuffer()
                    resolve({
                        ok:      res.ok,
                        status:  res.status,
                        headers: [...res.headers.entries()],
                        buffer,
                    })
                } catch (e) {
                    reject(e)
                }
            },
            reject,
        })
        if (!state.busy) _drain(state, minMs)
    })

    // Регистрируем активный запрос, удаляем после завершения.
    // .catch() здесь обязателен — без него rejected promise вызывает unhandled rejection,
    // так как реальный обработчик ошибки находится на внешнем .then()/.catch() вызывающего кода.
    _inFlight[url] = promise
    promise.catch(() => {}).finally(() => delete _inFlight[url])

    return promise.then(cached => _reconstruct(cached))
}

/** Восстанавливает Response-объект из кэшированных данных. */
function _reconstruct({ ok, status, headers, buffer }) {
    const h = new Headers()
    for (const [k, v] of headers) h.set(k, v)
    const res = new Response(buffer.slice(0), { status, headers: h })
    // Переопределяем ok, т.к. Response.ok вычисляется из status
    Object.defineProperty(res, 'ok', { get: () => ok })
    return res
}

/** Последовательно выбирает задачи из очереди с соблюдением минимального интервала. */
async function _drain(state, minMs) {
    state.busy = true
    while (state.queue.length > 0) {
        const gap = minMs - (Date.now() - state.last)
        if (gap > 0) {
            // Лог ожидания rate limit — сколько мс ждём перед следующим запросом
            aLog('warn', `[RL] Rate limit пауза: ждём ${gap}мс (minMs=${minMs}, прошло=${minMs - gap}мс)`)
            await new Promise(r => setTimeout(r, gap))
        }
        const item = state.queue.shift()
        state.last = Date.now()
        // Лог начала выполнения запроса из очереди
        const reqStart = performance.now()
        aLog('log', `[RL] Выполняем запрос: ${item.url.length > 80 ? item.url.slice(0, 80) + '…' : item.url}`)
        try {
            const res = await fetch(item.url, item.opts)
            const reqTime = (performance.now() - reqStart).toFixed(0)
            // Лог успешного выполнения — статус и время
            aLog('log', `[RL] ✅ Ответ: HTTP ${res.status} | ⏱ ${reqTime}мс | ${item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}`)
            item.resolve(res)
        } catch (e) {
            const reqTime = (performance.now() - reqStart).toFixed(0)
            // Лог ошибки выполнения запроса
            aLog('error', `[RL] ❌ Ошибка запроса: ${e.message} | ⏱ ${reqTime}мс | ${item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}`)
            item.reject(e)
        }
    }
    state.busy = false
}