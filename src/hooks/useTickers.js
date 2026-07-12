/**
 * useTickers.js — загрузка данных «Топ роста и падения»
 *
 * - Автообновление раз в 5 минут (согласовано)
 * - Ручное обновление кнопкой
 * - Пауза опроса, когда вкладка браузера неактивна (не жжём лимиты бирж впустую),
 *   с догрузкой при возвращении, если данные устарели
 * - Смена рынка (futures/spot) перезагружает данные
 *
 * Состояния: loading (первая загрузка), refreshing (фоновое обновление),
 *            error (все биржи упали), failed[] (какие биржи не ответили)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllTickers, aggregateByCoin } from '../tickers.js'
import { aLog } from '../api.js'

const REFRESH_MS = 5 * 60 * 1000   // 5 минут
const STALE_MS = 5 * 60 * 1000     // данные старше 5 мин считаем устаревшими

export function useTickers(market = 'futures', { minVolume = 0 } = {}) {
    const [raw, setRaw] = useState([])          // сырые тикеры со всех бирж
    const [coins, setCoins] = useState([])      // агрегированные монеты (для карты)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [failed, setFailed] = useState([])
    const [updatedAt, setUpdatedAt] = useState(null)

    const timerRef = useRef(null)
    const mountedRef = useRef(true)
    // защита от гонки: если пользователь переключил рынок, пока грузился прошлый
    const reqIdRef = useRef(0)

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
                setCoins([])
            } else {
                setRaw(tickers)
                setCoins(aggregateByCoin(tickers, { minVolume }))
                setUpdatedAt(new Date())
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
    }, [market, minVolume])

    // первичная загрузка + перезагрузка при смене рынка
    useEffect(() => {
        mountedRef.current = true
        load(false)
        return () => { mountedRef.current = false }
    }, [load])

    // автообновление раз в 5 минут, только когда вкладка активна
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

    const refresh = useCallback(() => load(true), [load])

    return { raw, coins, loading, refreshing, error, failed, updatedAt, refresh }
}