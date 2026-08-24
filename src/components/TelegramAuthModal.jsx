/**
 * TelegramAuthModal.jsx — модалка входа и регистрации.
 *
 * Раскладка Split/Терминал: слева витрина продукта (живой пример спреда и
 * характеристики сервиса), справа форма с вкладками «Вход» / «Регистрация».
 *
 * Три пути входа:
 *   1. Логин + пароль     → POST /api/auth/login    (auth.js: loginWithPassword)
 *   2. Регистрация        → POST /api/auth/register (auth.js: registerAccount)
 *   3. Telegram Login     → POST /api/auth/telegram (auth.js: authenticateWithTelegram)
 * Все три возвращают одинаковую форму { ok, user } — дальше обработка общая:
 * saveSession(user) + onSuccess(user).
 *
 * Модалка больше НЕ появляется сама при заходе на сканер: неавторизованный
 * пользователь видит в рабочей области AuthGate, а модалка открывается только
 * по явному действию (кнопки гейта, ссылки в сайдбаре). Поэтому она закрываемая:
 * крестик, клик по фону, Escape.
 *
 * ⚠️ Пароль никогда не логируется — ни в console, ни в aLog. Не добавлять.
 *
 * props:
 *   initialMode — 'login' | 'register'; какая вкладка открыта изначально
 *   onSuccess(user) — авторизация прошла, сессия сохранена
 *   onClose()       — закрыть модалку без авторизации
 */

import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import {
    authenticateWithTelegram,
    loginWithPassword,
    registerAccount,
    saveSession,
} from '../auth.js'

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN

const WELCOME_MESSAGE = `👋 Привет! Я официальный бот-менеджер AXIOMA SCAN.

🚀 Проект сейчас находится на стадии закрытого тестирования.

Возможны два варианта:

🔹 Если вы являетесь тестировщиком — ваш аккаунт уже в нашей системе. Пожалуйста, немного подождите — администраторы в ближайшее время откроют вам доступ к скринеру.

🔹 Если вы ещё не тестировщик — следите за обновлениями! Мы обязательно уведомим вас, когда AXIOMA SCAN выйдет в открытый доступ. Это произойдёт совсем скоро 🎯

Спасибо за интерес к AXIOMA и за ваше терпение! 🙏`

// Отправляем приветствие через Bot API напрямую с фронта.
// ⚠️ Токен бота попадает в браузерный бандл — это известная проблема,
// отправку нужно перенести на бэкенд/бота, а токен ротировать.
async function sendWelcomeMessage(userId) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: WELCOME_MESSAGE,
            })
        })
        const data = await res.json()
        if (!data.ok) {
            console.warn('[TelegramAuthModal] sendMessage error:', data.description)
        }
    } catch (err) {
        console.warn('[TelegramAuthModal] sendWelcomeMessage failed:', err)
    }
}

// Тексты ошибок бэкенда → человеческий язык. Ключи совпадают с reason из auth.js.
const LOGIN_ERRORS = {
    invalid_credentials: 'Неверный логин или пароль.',
    error:               'Сервер недоступен. Попробуйте ещё раз через минуту.',
    network_error:       'Нет связи с сервером. Проверьте интернет.',
}

const REGISTER_ERRORS = {
    bad_request:   'Укажите логин и пароль.',
    forbidden:     'Регистрация временно закрыта. Войдите через Telegram или напишите менеджеру.',
    conflict:      'Такой логин уже занят — выберите другой.',
    error:         'Сервер недоступен. Попробуйте ещё раз через минуту.',
    network_error: 'Нет связи с сервером. Проверьте интернет.',
}

const style = `
    .tg-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 8, 13, 0.68);
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: tg-fade-in 0.2s ease;
    }

    @keyframes tg-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    .tg-modal {
        position: relative;
        width: 840px;
        max-width: 100%;
        max-height: 92vh;
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        overflow: hidden;
        background: rgba(13,32,51,0.86);
        backdrop-filter: blur(30px) saturate(160%);
        -webkit-backdrop-filter: blur(30px) saturate(160%);
        border: 1px solid var(--glass-border-hover);
        border-radius: var(--radius-xl);
        box-shadow: 0 32px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
        animation: tg-up 0.26s cubic-bezier(0.2,0.9,0.25,1);
    }

    @keyframes tg-up {
        from { opacity: 0; transform: translateY(12px) scale(0.985); }
        to   { opacity: 1; transform: none; }
    }

    .tg-close {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 5;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: var(--glass-fill);
        border: 1px solid var(--glass-border);
        color: var(--text-secondary);
        transition: all 0.15s ease;
    }

    .tg-close:hover {
        background: var(--glass-fill-hover);
        color: var(--text-primary);
    }

    .tg-close:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    /* ── Левая колонка: витрина ── */
    .tg-side {
        padding: 30px 28px;
        overflow-y: auto;
        background:
            radial-gradient(500px 300px at 20% 0%, rgba(47,105,151,0.28), transparent 60%),
            linear-gradient(160deg, rgba(10,26,37,0.9), rgba(6,6,6,0.55));
        border-right: 1px solid var(--glass-border);
    }

    .tg-brand {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .tg-brand-mark {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--accent-bright), var(--accent));
        color: #fff;
        font-family: var(--font-sans);
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.5px;
        box-shadow: 0 8px 20px rgba(47,105,151,0.45);
    }

    .tg-brand-name {
        font-family: var(--font-sans);
        font-weight: 800;
        letter-spacing: 2px;
        font-size: 14px;
        color: var(--text-primary);
    }

    .tg-brand-name span { color: var(--accent-bright); }

    .tg-tagline {
        font-family: var(--font-sans);
        font-size: 21px;
        font-weight: 800;
        line-height: 1.28;
        letter-spacing: -0.3px;
        color: var(--text-primary);
        margin: 22px 0 8px;
    }

    .tg-lede {
        font-family: var(--font-sans);
        font-size: 12.5px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 22px;
    }

    .tg-demo {
        padding: 14px;
        margin-bottom: 16px;
        border: 1px solid var(--glass-border-hover);
        border-radius: var(--radius-lg);
        background: rgba(6,6,6,0.35);
    }

    .tg-demo-legs {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .tg-demo-x {
        font-family: var(--font-sans);
        font-size: 9.5px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .tg-demo-p {
        font-family: var(--font-mono);
        font-size: 15px;
        font-weight: 800;
    }

    .tg-demo-sell .tg-demo-p { color: var(--error); }
    .tg-demo-buy  .tg-demo-p { color: var(--success); }
    .tg-demo-arrow { color: var(--text-muted); font-size: 15px; }

    .tg-demo-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--glass-border);
    }

    .tg-demo-k {
        display: flex;
        align-items: center;
        gap: 7px;
        font-family: var(--font-sans);
        font-size: 10px;
        letter-spacing: 1.3px;
        text-transform: uppercase;
        color: var(--text-secondary);
    }

    .tg-demo-v {
        font-family: var(--font-mono);
        font-size: 19px;
        font-weight: 800;
        color: var(--success);
    }

    .tg-pulse {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--success);
        box-shadow: 0 0 0 0 rgba(0,201,122,0.6);
        animation: tg-pulse 1.8s infinite;
    }

    @keyframes tg-pulse {
        70%  { box-shadow: 0 0 0 8px rgba(0,201,122,0); }
        100% { box-shadow: 0 0 0 0 rgba(0,201,122,0); }
    }

    .tg-stats { display: flex; gap: 22px; }

    .tg-stat b {
        display: block;
        font-family: var(--font-mono);
        font-size: 17px;
        font-weight: 800;
        color: var(--text-primary);
    }

    .tg-stat span {
        font-family: var(--font-sans);
        font-size: 10px;
        letter-spacing: 0.4px;
        color: var(--text-muted);
    }

    /* ── Правая колонка: форма ── */
    .tg-form {
        padding: 30px 28px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .tg-tabs {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--glass-border);
        flex-shrink: 0;
    }

    .tg-tab {
        position: relative;
        padding: 0 0 12px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 700;
        color: var(--text-muted);
        transition: color 0.15s ease;
    }

    .tg-tab:hover { color: var(--text-secondary); }
    .tg-tab.active { color: var(--text-primary); }

    .tg-tab.active::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 2px;
        border-radius: 2px;
        background: var(--accent-bright);
    }

    .tg-tab:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 3px;
        border-radius: 4px;
    }

    .tg-field { margin-bottom: 12px; }

    .tg-label {
        display: block;
        font-family: var(--font-sans);
        font-size: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 6px;
    }

    .tg-inp-wrap { position: relative; }

    .tg-inp {
        width: 100%;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        font-family: var(--font-sans);
        font-size: 14px;
        color: var(--text-primary);
        background: rgba(6,6,6,0.35);
        border: 1px solid var(--border);
        outline: none;
        transition: all 0.15s ease;
    }

    .tg-inp.has-peek { padding-right: 44px; }
    .tg-inp::placeholder { color: var(--text-muted); }

    .tg-inp:focus {
        border-color: var(--accent-bright);
        box-shadow: 0 0 0 3px rgba(61,135,192,0.18);
        background: rgba(6,6,6,0.5);
    }

    .tg-inp:disabled { opacity: 0.6; cursor: not-allowed; }

    .tg-peek {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
    }

    .tg-peek:hover { color: var(--text-secondary); }

    .tg-peek:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 1px;
    }

    .tg-err {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 12px;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        background: rgba(224,62,62,0.08);
        border: 1px solid rgba(224,62,62,0.28);
        font-family: var(--font-sans);
        font-size: 12px;
        line-height: 1.5;
        color: #ff8f8f;
    }

    .tg-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        width: 100%;
        height: 46px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 13.5px;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-decoration: none;
        transition: all 0.15s ease;
    }

    .tg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .tg-btn:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    .tg-btn-primary {
        background: var(--accent);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 4px 20px rgba(47,105,151,0.28);
    }

    .tg-btn-primary:hover:not(:disabled) {
        background: var(--accent-bright);
        transform: translateY(-1px);
    }

    .tg-btn-secondary {
        background: rgba(255,255,255,0.02);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
    }

    .tg-btn-secondary:hover:not(:disabled) {
        color: var(--text-primary);
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.08);
    }

    .tg-recover {
        display: block;
        margin: 10px 0 0 auto;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        color: var(--accent-bright);
        text-decoration: none;
    }

    .tg-recover:hover { text-decoration: underline; }

    .tg-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 16px 0;
        font-family: var(--font-sans);
        font-size: 11px;
        letter-spacing: 1px;
        color: var(--text-muted);
    }

    .tg-divider::before,
    .tg-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--glass-border);
    }

    /* Контейнер, в который Telegram-виджет монтирует свою кнопку */
    .tg-widget-container {
        display: flex;
        justify-content: center;
        min-height: 48px;
    }

    .tg-widget-hint {
        margin-top: 10px;
        font-family: var(--font-sans);
        font-size: 11px;
        line-height: 1.5;
        color: var(--text-muted);
        text-align: center;
    }

    .tg-note {
        margin-top: 12px;
        font-family: var(--font-sans);
        font-size: 11.5px;
        line-height: 1.55;
        color: var(--text-secondary);
    }

    .tg-spin { animation: tg-rot 0.9s linear infinite; }

    @keyframes tg-rot {
        to { transform: rotate(360deg); }
    }

    /* ── Статусные экраны (проверка / нет доступа / ошибка виджета) ── */
    .tg-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        flex: 1;
        padding: 20px 0;
    }

    .tg-status-icon { font-size: 34px; margin-bottom: 14px; }

    .tg-status-title {
        font-family: var(--font-sans);
        font-size: 17px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 8px;
    }

    .tg-status-text {
        font-family: var(--font-sans);
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--text-secondary);
        margin-bottom: 20px;
    }

    .tg-status .tg-btn + .tg-btn { margin-top: 10px; }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛЬНАЯ АДАПТАЦИЯ
       ══════════════════════════════════════════════════════════════
       До 860px витрина и форма не помещаются рядом — раскладка становится
       вертикальной. На телефоне витрина скрывается совсем: она мотивирует,
       но занимает целый экран до формы, ради которой модалку и открыли.
    */
    @media (max-width: 860px) {
        .tg-modal { grid-template-columns: 1fr; width: 440px; }
        .tg-side { border-right: none; border-bottom: 1px solid var(--glass-border); }
        .tg-tagline { font-size: 19px; margin-top: 18px; }
    }

    @media (max-width: 560px) {
        .tg-overlay { padding: 0; }
        .tg-modal {
            width: 100%;
            height: 100%;
            max-height: 100dvh;
            border-radius: 0;
        }
        .tg-side { display: none; }
        .tg-form {
            padding: 22px 18px;
            padding-top: calc(22px + env(safe-area-inset-top));
            padding-bottom: calc(22px + env(safe-area-inset-bottom));
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tg-overlay, .tg-modal { animation: none; }
        .tg-pulse, .tg-spin { animation: none; }
    }
`

// SVG логотип Telegram — для кнопок «Войти через Telegram» / «Написать менеджеру».
function TgIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.15)" />
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="white" />
        </svg>
    )
}

function TelegramAuthModal({ initialMode = 'login', onSuccess, onClose }) {
    // step: form — обычная работа с формой; остальные — полноэкранные статусы
    const [step, setStep] = useState('form')
    const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [password2, setPassword2] = useState('')
    const [showPw, setShowPw] = useState(false)

    const widgetRef = useRef(null)
    // Ref для busy: обработчик Telegram-виджета живёт вне React-цикла и в момент
    // вызова видел бы устаревшее значение состояния.
    const busyRef = useRef(false)

    // Escape закрывает модалку — привычное поведение диалога
    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape' && !busyRef.current) onClose?.()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    // ── Telegram Login Widget ────────────────────────────────────────────────
    // Виджет монтируется только на экране формы: на статусных экранах контейнера
    // в DOM нет, а повторный скрипт создал бы вторую кнопку.
    useEffect(() => {
        if (step !== 'form') return
        if (!widgetRef.current) return

        const container = widgetRef.current
        container.innerHTML = ''

        window.onTelegramAuth = async (tgUser) => {
            if (busyRef.current) return
            busyRef.current = true
            setBusy(true)
            setError('')
            setStep('checking')

            try {
                const result = await authenticateWithTelegram(tgUser)

                if (!result.ok) {
                    if (result.reason === 'unauthorized') {
                        // Hash не прошёл проверку или аккаунт отключён
                        sendWelcomeMessage(tgUser.id)
                        setStep('no_access')
                    } else {
                        setStep('widget_error')
                    }
                    return
                }

                if (!result.user.isActive) {
                    sendWelcomeMessage(tgUser.id)
                    setStep('no_access')
                    return
                }

                saveSession(result.user)
                onSuccess?.(result.user)
            } catch (err) {
                console.error('[TelegramAuthModal] error:', err)
                setStep('widget_error')
            } finally {
                busyRef.current = false
                setBusy(false)
            }
        }

        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.setAttribute('data-telegram-login', 'axioma_manager_bot')
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '8')
        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
        script.setAttribute('data-request-access', 'write')
        script.async = true
        script.onerror = () => setStep('widget_error')

        container.appendChild(script)

        return () => {
            delete window.onTelegramAuth
            container.innerHTML = ''
        }
    }, [step, mode, onSuccess])

    // Смена вкладки: чистим ошибку и поля паролей, логин оставляем —
    // при «уже есть аккаунт?» его не придётся набирать заново.
    function switchMode(next) {
        if (busy || next === mode) return
        setMode(next)
        setError('')
        setPassword('')
        setPassword2('')
        setShowPw(false)
    }

    // Клиентская валидация до запроса — быстрее и не нагружает бэкенд.
    function validate() {
        const l = login.trim()
        if (l.length < 3) return 'Логин должен быть не короче 3 символов.'
        if (password.length < 6) return 'Пароль должен быть не короче 6 символов.'
        if (mode === 'register' && password !== password2) return 'Пароли не совпадают.'
        return ''
    }

    async function handleSubmit() {
        if (busy) return

        const invalid = validate()
        if (invalid) {
            setError(invalid)
            return
        }

        busyRef.current = true
        setBusy(true)
        setError('')

        try {
            const res = mode === 'login'
                ? await loginWithPassword(login.trim(), password)
                : await registerAccount(login.trim(), password)

            if (!res.ok) {
                const table = mode === 'login' ? LOGIN_ERRORS : REGISTER_ERRORS
                setError(table[res.reason] || 'Не удалось выполнить запрос. Попробуйте ещё раз.')
                return
            }

            // Без userId сессию не построить: приложение не сможет проверять доступ.
            // Лучше честно сказать об этом, чем оставить пользователя в подвешенном
            // состоянии с виду успешного входа.
            if (!res.user?.userId) {
                setError('Аккаунт создан, но сервер не вернул данные сессии. Войдите через Telegram или обновите страницу.')
                return
            }

            if (res.user.isActive === false) {
                setStep('no_access')
                return
            }

            saveSession(res.user)
            onSuccess?.(res.user)
        } finally {
            busyRef.current = false
            setBusy(false)
        }
    }

    // Enter в любом поле отправляет форму — ожидаемое поведение формы входа
    function onFieldKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
        }
    }

    const isRegister = mode === 'register'

    function renderForm() {
        return (
            <>
                <div className="tg-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isRegister}
                        className={`tg-tab ${!isRegister ? 'active' : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Вход
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isRegister}
                        className={`tg-tab ${isRegister ? 'active' : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Регистрация
                    </button>
                </div>

                {error && <div className="tg-err">{error}</div>}

                <div className="tg-field">
                    <label className="tg-label" htmlFor="tg-login">Логин</label>
                    <div className="tg-inp-wrap">
                        <input
                            id="tg-login"
                            className="tg-inp"
                            type="text"
                            value={login}
                            onChange={e => setLogin(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder={isRegister ? 'придумайте логин' : 'ваш логин'}
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck="false"
                            disabled={busy}
                        />
                    </div>
                </div>

                <div className="tg-field">
                    <label className="tg-label" htmlFor="tg-pw">Пароль</label>
                    <div className="tg-inp-wrap">
                        <input
                            id="tg-pw"
                            className="tg-inp has-peek"
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder={isRegister ? 'минимум 6 символов' : '••••••••'}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            disabled={busy}
                        />
                        <button
                            type="button"
                            className="tg-peek"
                            onClick={() => setShowPw(v => !v)}
                            aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
                            tabIndex={-1}
                        >
                            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </div>

                {isRegister && (
                    <div className="tg-field">
                        <label className="tg-label" htmlFor="tg-pw2">Повтор пароля</label>
                        <div className="tg-inp-wrap">
                            <input
                                id="tg-pw2"
                                className="tg-inp"
                                type={showPw ? 'text' : 'password'}
                                value={password2}
                                onChange={e => setPassword2(e.target.value)}
                                onKeyDown={onFieldKeyDown}
                                placeholder="ещё раз"
                                autoComplete="new-password"
                                disabled={busy}
                            />
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    className="tg-btn tg-btn-primary"
                    onClick={handleSubmit}
                    disabled={busy}
                >
                    {busy && <Loader2 size={17} className="tg-spin" />}
                    {isRegister ? 'Создать аккаунт' : 'Войти'}
                </button>

                {!isRegister && (
                    <a
                        className="tg-recover"
                        href="https://t.me/axioma_manager_bot?start=recover"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Забыли пароль?
                    </a>
                )}

                {isRegister && (
                    <div className="tg-note">
                        После регистрации привяжите Telegram в профиле — через него
                        работают уведомления и восстановление доступа. Email не собираем.
                    </div>
                )}

                <div className="tg-divider">или</div>

                <div className="tg-widget-container" ref={widgetRef} />
                <div className="tg-widget-hint">
                    Вход через Telegram — аккаунт создастся автоматически
                </div>
            </>
        )
    }

    function renderChecking() {
        return (
            <div className="tg-status">
                <Loader2 size={30} className="tg-spin" color="var(--accent-bright)" />
                <div className="tg-status-title" style={{ marginTop: 14 }}>Проверяем доступ…</div>
                <div className="tg-status-text">
                    Авторизация прошла успешно.<br />
                    Проверяем вашу подписку.
                </div>
            </div>
        )
    }

    function renderNoAccess() {
        return (
            <div className="tg-status">
                <div className="tg-status-icon">🔒</div>
                <div className="tg-status-title">Доступ не активирован</div>
                <div className="tg-status-text">
                    Ваш аккаунт найден, но доступ к сервису ещё не активирован.<br />
                    Обратитесь к менеджеру для активации.
                </div>
                <a
                    href="https://t.me/axioma_manager_bot?start=hello"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tg-btn tg-btn-primary"
                >
                    <TgIcon />
                    Написать менеджеру
                </a>
                <button
                    type="button"
                    className="tg-btn tg-btn-secondary"
                    onClick={() => { setError(''); setStep('form') }}
                >
                    Назад
                </button>
            </div>
        )
    }

    function renderWidgetError() {
        return (
            <div className="tg-status">
                <div className="tg-status-icon">⚠️</div>
                <div className="tg-status-title">Не удалось загрузить виджет</div>
                <div className="tg-status-text">
                    Проверьте подключение к интернету и попробуйте снова.
                </div>
                <button
                    type="button"
                    className="tg-btn tg-btn-primary"
                    onClick={() => { setError(''); setStep('form') }}
                >
                    Попробовать снова
                </button>
            </div>
        )
    }

    const screens = {
        form: renderForm,
        checking: renderChecking,
        no_access: renderNoAccess,
        widget_error: renderWidgetError,
    }

    return (
        <>
            <style>{style}</style>
            <div
                className="tg-overlay"
                onClick={() => { if (!busy) onClose?.() }}
                role="dialog"
                aria-modal="true"
                aria-label="Вход в AXIOMA SCAN"
            >
                <div className="tg-modal" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        className="tg-close"
                        onClick={() => onClose?.()}
                        aria-label="Закрыть"
                        disabled={busy}
                    >
                        <X size={16} />
                    </button>

                    {/* Витрина: зачем вообще входить */}
                    <div className="tg-side">
                        <div className="tg-brand">
                            <div className="tg-brand-mark">AX</div>
                            <div className="tg-brand-name">AXIOMA<span> SCAN</span></div>
                        </div>

                        <div className="tg-tagline">Разница в цене —<br />твой заработок.</div>
                        <div className="tg-lede">
                            Сканер ловит спреды между биржами в реальном времени.
                            Войди — и продолжай с того же места.
                        </div>

                        <div className="tg-demo">
                            <div className="tg-demo-legs">
                                <div className="tg-demo-sell">
                                    <div className="tg-demo-x">MEXC · SELL</div>
                                    <div className="tg-demo-p">0.028050</div>
                                </div>
                                <div className="tg-demo-arrow">↔</div>
                                <div className="tg-demo-buy" style={{ textAlign: 'right' }}>
                                    <div className="tg-demo-x">Bitget · BUY</div>
                                    <div className="tg-demo-p">0.027770</div>
                                </div>
                            </div>
                            <div className="tg-demo-foot">
                                <span className="tg-demo-k">
                                    <span className="tg-pulse" />
                                    Чистый спред
                                </span>
                                <span className="tg-demo-v">+1.83%</span>
                            </div>
                        </div>

                        <div className="tg-stats">
                            <div className="tg-stat"><b>8</b><span>бирж</span></div>
                            <div className="tg-stat"><b>24/7</b><span>сканирование</span></div>
                            <div className="tg-stat"><b>&lt;1с</b><span>обновление</span></div>
                        </div>
                    </div>

                    {/* Форма / статусный экран */}
                    <div className="tg-form">
                        {(screens[step] || renderForm)()}
                    </div>
                </div>
            </div>
        </>
    )
}

export default TelegramAuthModal