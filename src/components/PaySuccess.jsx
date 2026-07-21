/**
 * PaySuccess.jsx — страница возврата после оплаты (success_url NOWPayments).
 *
 * Доступ НЕ выдаётся по факту редиректа сюда — источник правды это вебхук на
 * бэке. Здесь мы лишь опрашиваем /api/pay/status, пока не увидим isCexCexPaid,
 * затем обновляем доступ в приложении и ведём в сканер.
 *
 * props:
 *   onGoScanner()     — перейти в сканер (доступ уже активен)
 *   onGoHome()        — на главную
 *   onRefreshAccess() — пере-синхронизировать auth в App (после подтверждения)
 *
 * Маршрут /pay/success — noindex (см. seo.js), в prerender не попадает.
 */

import { useState, useEffect, useRef } from 'react'
import { Check, Clock, LogIn } from 'lucide-react'
import { getPaymentStatus } from '../payments.js'

const POLL_MS = 4000      // интервал опроса
const MAX_ATTEMPTS = 45   // ~3 минуты, потом показываем «обрабатывается»

const style = `
    .pay-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 40px 16px;
    }

    .pay-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100%;
        max-width: 440px;
        margin: auto;
        padding: 36px 30px;
        background: rgba(13,32,51,0.76);
        backdrop-filter: blur(28px) saturate(150%);
        -webkit-backdrop-filter: blur(28px) saturate(150%);
        border: 1px solid var(--glass-border-hover);
        border-radius: var(--radius-lg);
        box-shadow: 0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
        animation: pay-up 0.3s ease;
    }

    @keyframes pay-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .pay-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        backdrop-filter: blur(10px);
    }

    .pay-icon.success {
        background: rgba(0,201,122,0.12);
        border: 1px solid rgba(0,201,122,0.28);
        color: var(--success);
    }

    .pay-icon.pending {
        background: rgba(240,165,0,0.12);
        border: 1px solid rgba(240,165,0,0.25);
        color: var(--warning);
    }

    .pay-icon.neutral {
        background: var(--glass-fill);
        border: 1px solid var(--glass-border);
        color: var(--accent-bright);
    }

    .pay-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        margin-bottom: 10px;
        line-height: 1.3;
    }

    .pay-sub {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.6;
        max-width: 340px;
        margin-bottom: 26px;
    }

    .pay-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--accent-bright);
        border-radius: 50%;
        animation: pay-spin 0.8s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes pay-spin {
        to { transform: rotate(360deg); }
    }

    .pay-cta {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
    }

    .pay-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 46px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        font-family: var(--font-sans);
        transition: all 0.15s ease;
    }

    .pay-btn-primary {
        background: var(--accent);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 4px 20px rgba(47,105,151,0.28);
    }

    .pay-btn-primary:hover {
        background: var(--accent-bright);
        transform: translateY(-1px);
    }

    .pay-btn-secondary {
        background: rgba(255,255,255,0.02);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
    }

    .pay-btn-secondary:hover {
        color: var(--text-primary);
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.08);
    }

    .pay-btn:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    @media (max-width: 480px) {
        .pay-card { padding: 30px 20px; }
        .pay-title { font-size: 18px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .pay-card { animation: none; }
        .pay-spinner { animation-duration: 1.4s; }
    }
`

function PaySuccess({ onGoScanner, onGoHome, onRefreshAccess }) {
    // checking — опрашиваем статус; paid — доступ подтверждён; timeout — ещё не
    // подтвердилось за отведённое время; unauth — нет сессии для проверки.
    const [phase, setPhase] = useState('checking')
    const timerRef = useRef(null)
    const attemptsRef = useRef(0)
    const doneRef = useRef(false)   // защита от повторной обработки/гонок

    useEffect(() => {
        let cancelled = false

        // Один цикл опроса; сам себя перепланирует, пока не финализируется.
        async function poll() {
            if (cancelled || doneRef.current) return
            attemptsRef.current += 1

            const res = await getPaymentStatus()
            if (cancelled || doneRef.current) return

            if (!res.ok) {
                if (res.reason === 'unauthorized') {
                    doneRef.current = true
                    setPhase('unauth')
                    return
                }
                // сеть/сервер — просто пробуем ещё раз до лимита попыток
            } else if (res.isCexCexPaid) {
                doneRef.current = true
                setPhase('paid')
                onRefreshAccess?.()   // подтягиваем свежий статус в App
                return
            }

            if (attemptsRef.current >= MAX_ATTEMPTS) {
                doneRef.current = true
                setPhase('timeout')
                return
            }
            timerRef.current = setTimeout(poll, POLL_MS)
        }

        poll()
        return () => {
            cancelled = true
            clearTimeout(timerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function renderChecking() {
        return (
            <>
                <div className="pay-spinner" />
                <div className="pay-title">Проверяем оплату…</div>
                <div className="pay-sub">
                    Обычно это занимает несколько секунд. Не закрывай страницу —
                    доступ откроется автоматически после подтверждения платежа.
                </div>
            </>
        )
    }

    function renderPaid() {
        return (
            <>
                <div className="pay-icon success"><Check size={30} /></div>
                <div className="pay-title">Оплата получена</div>
                <div className="pay-sub">
                    Подписка активирована. Приятной работы со сканером!
                </div>
                <div className="pay-cta">
                    <button className="pay-btn pay-btn-primary" onClick={() => onGoScanner?.()}>
                        Открыть сканер
                    </button>
                </div>
            </>
        )
    }

    function renderTimeout() {
        return (
            <>
                <div className="pay-icon pending"><Clock size={28} /></div>
                <div className="pay-title">Платёж обрабатывается</div>
                <div className="pay-sub">
                    Как только платёж подтвердится в сети, доступ откроется автоматически —
                    это может занять несколько минут. Можно вернуться позже.
                </div>
                <div className="pay-cta">
                    <button className="pay-btn pay-btn-primary" onClick={() => onGoScanner?.()}>
                        Открыть сканер
                    </button>
                    <button className="pay-btn pay-btn-secondary" onClick={() => onGoHome?.()}>
                        На главную
                    </button>
                </div>
            </>
        )
    }

    function renderUnauth() {
        return (
            <>
                <div className="pay-icon neutral"><LogIn size={26} /></div>
                <div className="pay-title">Нужен вход</div>
                <div className="pay-sub">
                    Не видим твою сессию. Войди в аккаунт, чтобы проверить статус подписки.
                </div>
                <div className="pay-cta">
                    <button className="pay-btn pay-btn-primary" onClick={() => onGoScanner?.()}>
                        Войти
                    </button>
                    <button className="pay-btn pay-btn-secondary" onClick={() => onGoHome?.()}>
                        На главную
                    </button>
                </div>
            </>
        )
    }

    const phases = {
        checking: renderChecking,
        paid: renderPaid,
        timeout: renderTimeout,
        unauth: renderUnauth,
    }

    return (
        <>
            <style>{style}</style>
            <div className="pay-wrap">
                <div className="pay-card">
                    {(phases[phase] || renderChecking)()}
                </div>
            </div>
        </>
    )
}

export default PaySuccess