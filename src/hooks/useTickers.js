/**
 * useTickers.js — загрузка данных «Топ роста и падения»
 *
 * - Автообновление раз в 1 минуту (согласовано)
 * - Ручное обновление кнопкой
 * - Пауза опроса, когда вкладка браузера неактивна (не жжём лимиты бирж впустую),
 *   с догрузкой при возвращении, если данные устарели
 * - Смена рынка (futures/spot) перезагружает данные
 *
 * Состояния: loading (первая загрузка), refreshing (фоновое обновление),
 *            error (все биржи упали), failed[] (какие биржи не ответили)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { fetchAllTickers, aggregateByCoin } from '../tickers.js'
import { aLog } from '../api.js'

const REFRESH_MS = 1 * 60 * 1000   // 1 минута
const STALE_MS = 1 * 60 * 1000     // данные старше 1 мин считаем устаревшими

export function useTickers(market = 'futures', { minVolume = 0 } = {}) {
    const [raw, setRaw] = useState([])          // сырые тикеры со всех бирж
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [failed, setFailed] = useState([])
    const [updatedAt, setUpdatedAt] = useState(null)

    const timerRef = useRef(null)
    const mountedRef = useRef(true)
    // защита от гонки: если пользователь переключил рынок, пока грузился прошлый
    const reqIdRef = useRef(0)

    // Кэш по рынку: { futures: { tickers, failed, at }, spot: {...} }.
    // Переключение spot↔futures раньше всегда било по 8 биржам заново;
    // теперь свежие данные подхватываются мгновенно из кэша.
    const cacheRef = useRef({})

    const load = useCallback(async (isBackground = false) => {
        const myReq = ++reqIdRef.current

        if (isBackground) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const { tickers, failed: failedEx, ok } = await fetchAllTickers(market)

            // ответ устарел — пользователь успел переключить рынок
            if (myReq !== reqIdRef.current || !mountedRef.current) {
                aLog('warn', `[TICKERS] Ответ отброшен (устаревший запрос #${myReq})`)
                return
            }

            if (ok.length === 0) {
                setError('Не удалось получить данные ни с одной биржи. Проверь соединение.')
                setRaw([])
            } else {
                setRaw(tickers)
                setUpdatedAt(new Date())
                cacheRef.current[market] = { tickers, failed: failedEx, at: Date.now() }
            }
            setFailed(failedEx)
        } catch (e) {
            if (myReq !== reqIdRef.current || !mountedRef.current) return
            aLog('error', '[TICKERS] Критическая ошибка загрузки:', e?.message ?? e)
            setError(e?.message ?? 'Неизвестная ошибка при загрузке данных')
        } finally {
            if (myReq === reqIdRef.current && mountedRef.current) {
                setLoading(false)
                setRefreshing(false)
            }
        }
    }, [market])

    // Первичная загрузка + смена рынка.
    // Если по рынку есть свежий кэш — показываем его сразу, без спиннера
    // и без похода в сеть. Устаревший кэш показываем тоже, но фоном обновляем.
    useEffect(() => {
        mountedRef.current = true

        const cached = cacheRef.current[market]
        if (cached) {
            setRaw(cached.tickers)
            setFailed(cached.failed)
            setUpdatedAt(new Date(cached.at))
            setLoading(false)

            const age = Date.now() - cached.at
            if (age > STALE_MS) {
                aLog('log', `[TICKERS] Кэш ${market} устарел (${Math.round(age / 1000)}с) — обновляем фоном`)
                load(true)
            } else {
                aLog('log', `[TICKERS] Кэш ${market} свежий (${Math.round(age / 1000)}с) — запрос не нужен`)
            }
        } else {
            load(false)
        }

        return () => { mountedRef.current = false }
    }, [load, market])

    // Агрегация и отсечка по объёму — чистое вычисление над уже загруженными
    // тикерами. Раньше minVolume сидел в зависимостях load и его изменение
    // дёргало полную перезагрузку с 8 бирж; теперь это локальный пересчёт.
    const coins = useMemo(
        () => aggregateByCoin(raw, { minVolume }),
        [raw, minVolume],
    )

    // автообновление раз в 1 минуту, только когда вкладка активна
    useEffect(() => {
        function tick() {
            if (document.hidden) {
                aLog('log', '[TICKERS] Вкладка неактивна — пропускаем автообновление')
                return
            }
            load(true)
        }
        timerRef.current = setInterval(tick, REFRESH_MS)
        return () => clearInterval(timerRef.current)
    }, [load])

    // при возвращении на вкладку — догружаем, если данные устарели
    useEffect(() => {
        function onVisible() {
            if (document.hidden) return
            const age = updatedAt ? Date.now() - updatedAt.getTime() : Infinity
            if (age > STALE_MS) {
                aLog('log', '[TICKERS] Вкладка снова активна, данные устарели — обновляем')
                load(true)
            }
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [load, updatedAt])

    // Ручное обновление — всегда идёт в сеть, минуя кэш.
    // Кэш проверяется только при монтировании и смене рынка.
    const refresh = useCallback(() => load(true), [load])

    return { raw, coins, loading, refreshing, error, failed, updatedAt, refresh }
}