/**
 * AccessDenied.jsx — Оверлей "У вас нет доступа"
 *
 * Рендерится поверх грида скринера когда isCexCexPaid === false.
 * Sidebar и Header остаются видны — блокируется только контентная область.
 * Никакие запросы к биржам при этом не отправляются (логика в App.jsx).
 */

const style = `
    .access-denied-wrap {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(6, 6, 6, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: ad-fade 0.3s ease;
    }

    @keyframes ad-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    .access-denied-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        text-align: center;
        max-width: 380px;
        padding: 0 24px;
        animation: ad-up 0.3s ease;
    }

    @keyframes ad-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .access-denied-icon {
        width: 72px;
        height: 72px;
        border-radius: 18px;
        background: rgba(47, 105, 151, 0.1);
        border: 1px solid rgba(47, 105, 151, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
    }

    .access-denied-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
        margin-bottom: 12px;
        line-height: 1.3;
    }

    .access-denied-sub {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.65;
        margin-bottom: 32px;
    }

    .access-denied-sub strong {
        color: var(--text-primary);
    }

    .access-denied-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 24px;
        height: 44px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        background: #2AABEE;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        font-family: var(--font-sans);
        letter-spacing: 0.3px;
        transition: all 0.15s ease;
        text-decoration: none;
    }

    .access-denied-btn:hover {
        background: #39baf5;
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(42, 171, 238, 0.25);
    }

    .access-denied-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 20px;
        padding: 6px 12px;
        border-radius: 20px;
        background: rgba(224, 62, 62, 0.08);
        border: 1px solid rgba(224, 62, 62, 0.18);
        font-size: 11px;
        color: var(--error);
        font-family: var(--font-mono);
        letter-spacing: 0.5px;
    }

    .access-denied-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--error);
        animation: ad-pulse 2s ease-in-out infinite;
    }

    @keyframes ad-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
`

// SVG иконка замка
function LockIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    )
}

// SVG логотип Telegram (маленький)
function TelegramIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.15)"/>
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="white"/>
        </svg>
    )
}

function AccessDenied() {
    return (
        <>
            <style>{style}</style>
            <div className="access-denied-wrap">
                <div className="access-denied-card">
                    <div className="access-denied-icon">
                        <LockIcon />
                    </div>
                    <div className="access-denied-title">
                        У вас пока что нет доступа
                    </div>
                    <div className="access-denied-sub">
                        Доступ к арбитражному скринеру предоставляется по подписке.<br />
                        Обратитесь к <strong>менеджеру в Telegram</strong> для получения доступа или активации вашего плана.
                    </div>
                    <a
                        href="https://t.me/axioma_manager_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="access-denied-btn"
                    >
                        <TelegramIcon />
                        Написать менеджеру
                    </a>
                    <div className="access-denied-badge">
                        <div className="access-denied-dot" />
                        CEX-CEX доступ не активирован
                    </div>
                </div>
            </div>
        </>
    )
}

export default AccessDenied