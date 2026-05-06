/**
 * TelegramAuthModal.jsx
 *
 * После успешной авторизации через Telegram Widget:
 * 1. Получаем tgUser.id
 * 2. Вызываем Telegram Bot API → sendMessage → пользователь получает приветствие
 * 3. Проверяем доступ в нашей системе
 */

import { useState, useEffect, useRef } from 'react'
import { checkAccess, registerUser, saveSession } from '../auth.js'

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN

const WELCOME_MESSAGE = `👋 Привет! Я официальный бот-менеджер AXIOMA SCAN.

🚀 Проект сейчас находится на стадии закрытого тестирования.

Возможны два варианта:

🔹 Если вы являетесь тестировщиком — ваш аккаунт уже в нашей системе. Пожалуйста, немного подождите — администраторы в ближайшее время откроют вам доступ к скринеру.

🔹 Если вы ещё не тестировщик — следите за обновлениями! Мы обязательно уведомим вас, когда AXIOMA SCAN выйдет в открытый доступ. Это произойдёт совсем скоро 🎯

Спасибо за интерес к AXIOMA и за ваше терпение! 🙏`

// Отправляем приветствие через Bot API напрямую с фронта
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

const style = `
    .tg-overlay {
        position: fixed;
        inset: 0;
        background: rgba(6, 6, 6, 0.85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: tg-fade-in 0.2s ease;
    }

    @keyframes tg-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @keyframes tg-slide-up {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .tg-modal {
        width: 420px;
        max-width: calc(100vw - 32px);
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 36px 32px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        animation: tg-slide-up 0.25s ease;
        box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }

    .tg-logo-wrap {
        width: 56px;
        height: 56px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        font-size: 13px;
        font-weight: 800;
        color: var(--accent-bright);
        letter-spacing: 1px;
        font-family: var(--font-sans);
    }

    .tg-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--text-primary);
        text-align: center;
        margin-bottom: 10px;
        font-family: var(--font-sans);
    }

    .tg-desc {
        font-size: 13px;
        color: var(--text-secondary);
        text-align: center;
        line-height: 1.6;
        margin-bottom: 28px;
        font-family: var(--font-sans);
        max-width: 320px;
    }

    .tg-desc strong {
        color: var(--text-primary);
    }

    .tg-widget-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 48px;
        width: 100%;
        margin-bottom: 4px;
    }

    .tg-widget-hint {
        font-size: 11px;
        color: var(--text-muted);
        text-align: center;
        font-family: var(--font-sans);
        margin-top: 8px;
        line-height: 1.5;
    }

    .tg-divider {
        width: 100%;
        height: 1px;
        background: var(--border);
        margin: 20px 0;
    }

    .tg-hint {
        font-size: 11px;
        color: var(--text-muted);
        text-align: center;
        font-family: var(--font-sans);
        line-height: 1.5;
    }

    .tg-spinner-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 8px 0 4px;
        width: 100%;
    }

    .tg-spinner {
        width: 28px;
        height: 28px;
        border: 2px solid var(--border);
        border-top-color: #2AABEE;
        border-radius: 50%;
        animation: tg-spin 0.7s linear infinite;
    }

    @keyframes tg-spin {
        to { transform: rotate(360deg); }
    }

    .tg-spinner-text {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
    }

    .tg-btn {
        width: 100%;
        height: 48px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        font-family: var(--font-sans);
        transition: all 0.15s ease;
        margin-top: 4px;
    }

    .tg-btn-primary {
        background: #2AABEE;
        color: #fff;
    }

    .tg-btn-primary:hover {
        background: #39baf5;
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(42,171,238,0.3);
    }

    .tg-btn-secondary {
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border);
        margin-top: 10px;
    }

    .tg-btn-secondary:hover {
        color: var(--text-primary);
        border-color: var(--accent);
        background: var(--bg-hover);
    }

    .tg-status-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        font-size: 22px;
    }

    .tg-status-icon.warning {
        background: rgba(240,165,0,0.12);
        border: 1px solid rgba(240,165,0,0.25);
    }

    .tg-status-icon.error {
        background: rgba(224,62,62,0.12);
        border: 1px solid rgba(224,62,62,0.25);
    }
`

function TgIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.15)"/>
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="white"/>
        </svg>
    )
}

function TelegramAuthModal({ onSuccess }) {
    const [step, setStep] = useState('idle')
    const widgetRef = useRef(null)

    useEffect(() => {
        if (step !== 'idle') return
        if (!widgetRef.current) return

        widgetRef.current.innerHTML = ''

        window.onTelegramAuth = async (tgUser) => {
            setStep('checking')

            try {
                const access = await checkAccess(tgUser.id)

                if (access === null) {
                    setStep('idle')
                    return
                }

                // Приветствие отправляем только если доступа нет
                if (!access.found || !access.isCexCexPaid) {
                    sendWelcomeMessage(tgUser.id)
                }

                if (!access.found) {
                    const newUser = await registerUser(
                        tgUser.id,
                        tgUser.username || tgUser.first_name || `user_${tgUser.id}`,
                        tgUser.photo_url || null
                    )
                    const session = { ...newUser, photoUrl: tgUser.photo_url || null }
                    saveSession(session)
                    onSuccess(session)
                    return
                }

                if (!access.isActive) {
                    setStep('no_access')
                    return
                }

                const session = { ...access, photoUrl: tgUser.photo_url || null }
                saveSession(session)
                onSuccess(session)

            } catch (err) {
                console.error('[TelegramAuthModal] error:', err)
                setStep('idle')
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

        widgetRef.current.appendChild(script)

        return () => {
            delete window.onTelegramAuth
            if (widgetRef.current) widgetRef.current.innerHTML = ''
        }
    }, [step])

    function renderIdle() {
        return (
            <>
                <div className="tg-logo-wrap">AX</div>
                <div className="tg-title">Авторизация</div>
                <div className="tg-desc">
                    Для доступа к скринеру необходимо войти через Telegram.
                    Это позволяет нам <strong>проверить наличие подписки</strong>.
                </div>
                <div className="tg-widget-container" ref={widgetRef} />
                <div className="tg-widget-hint">
                    Нажмите кнопку выше для входа через Telegram
                </div>
                <div className="tg-divider" />
                <div className="tg-hint">
                    Мы получаем только ваш Telegram ID — пароли не нужны.
                </div>
            </>
        )
    }

    function renderChecking() {
        return (
            <>
                <div className="tg-logo-wrap">AX</div>
                <div className="tg-title">Проверяем доступ...</div>
                <div className="tg-desc">
                    Авторизация прошла успешно.<br />
                    Проверяем вашу подписку.
                </div>
                <div className="tg-spinner-wrap">
                    <div className="tg-spinner" />
                    <div className="tg-spinner-text">Подождите...</div>
                </div>
            </>
        )
    }

    function renderNoAccess() {
        return (
            <>
                <div className="tg-status-icon warning">🔒</div>
                <div className="tg-title">Доступ не активирован</div>
                <div className="tg-desc">
                    Ваш аккаунт найден, но доступ к сервису ещё не активирован.<br />
                    Обратитесь к менеджеру для активации.
                </div>
                <a
                    href="https://t.me/axioma_manager_bot?start=hello"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tg-btn tg-btn-primary"
                    style={{ textDecoration: 'none' }}
                >
                    <TgIcon />
                    Написать менеджеру
                </a>
                <button className="tg-btn tg-btn-secondary" onClick={() => setStep('idle')}>
                    Назад
                </button>
            </>
        )
    }

    function renderWidgetError() {
        return (
            <>
                <div className="tg-status-icon error">⚠️</div>
                <div className="tg-title">Не удалось загрузить виджет</div>
                <div className="tg-desc">
                    Проверьте подключение к интернету и попробуйте снова.
                </div>
                <button className="tg-btn tg-btn-primary" onClick={() => setStep('idle')}>
                    Попробовать снова
                </button>
            </>
        )
    }

    const steps = {
        idle: renderIdle,
        checking: renderChecking,
        no_access: renderNoAccess,
        widget_error: renderWidgetError,
    }

    return (
        <>
            <style>{style}</style>
            <div className="tg-overlay">
                <div className="tg-modal">
                    {(steps[step] || renderIdle)()}
                </div>
            </div>
        </>
    )
}

export default TelegramAuthModal