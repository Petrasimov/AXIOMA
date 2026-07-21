/**
 * AccessDenied.jsx — Paywall-оверлей «Доступ по подписке».
 *
 * Рендерится поверх контентной области сканеров (futures и funding), когда
 * пользователь авторизован, но isCexCexPaid === false. Sidebar/Header остаются
 * видимыми — блокируется только область скринера. Никаких запросов к биржам при
 * этом не отправляется (логика в App.jsx: futures гейтится canScan, funding —
 * не монтируется, пока нет доступа).
 *
 * props:
 *   onSubscribe() — старт оплаты подписки. В P1a это заглушка из App.jsx;
 *                   живая инициация инвойса NOWPayments подключается в P2.
 *
 * Данные тарифа/сетей/преимуществ — из общего subscriptionInfo.js.
 */

import { Zap, TrendingUp, Layers, Bell, SlidersHorizontal, ShieldCheck, Lock } from 'lucide-react'
import { PLAN, NETWORKS, BENEFITS } from '../subscriptionInfo.js'

// Резолвим имя иконки из subscriptionInfo в компонент lucide через локальный map —
// так не тянем brand-иконки и не падаем на отсутствующем импорте.
const ICONS = { Zap, TrendingUp, Layers, Bell, SlidersHorizontal, ShieldCheck }

const style = `
    .access-denied-wrap {
        position: absolute;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 28px 16px;
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
        text-align: center;
        width: 100%;
        max-width: 468px;
        margin: auto;
        padding: 32px 28px;
        background: rgba(13,32,51,0.76);
        backdrop-filter: blur(28px) saturate(150%);
        -webkit-backdrop-filter: blur(28px) saturate(150%);
        border: 1px solid var(--glass-border-hover);
        border-radius: var(--radius-lg);
        box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        animation: ad-up 0.3s ease;
    }

    @keyframes ad-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .access-denied-icon {
        width: 60px;
        height: 60px;
        border-radius: var(--radius-lg);
        background: var(--glass-fill);
        backdrop-filter: blur(14px);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-glass);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
    }

    .access-denied-title {
        font-size: 21px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
        margin-bottom: 8px;
        line-height: 1.3;
    }

    .access-denied-sub {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.6;
        margin-bottom: 22px;
        max-width: 360px;
    }

    .access-denied-sub strong {
        color: var(--text-primary);
    }

    /* ── Цена ── */
    .access-price {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
        padding: 16px;
        margin-bottom: 22px;
        background: var(--glass-fill);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
    }

    .access-price-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
    }

    .access-price-num {
        font-size: 34px;
        font-weight: 800;
        color: var(--text-primary);
        font-family: var(--font-sans);
        line-height: 1;
    }

    .access-price-per {
        font-size: 15px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
    }

    .access-price-note {
        font-size: 11px;
        color: var(--text-muted);
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
    }

    /* ── Преимущества ── */
    .access-benefits {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        width: 100%;
        margin-bottom: 22px;
    }

    .access-benefit {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        text-align: left;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        transition: border-color 0.15s ease, background 0.15s ease;
    }

    .access-benefit:hover {
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.06);
    }

    .access-benefit-ico {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: var(--radius-sm);
        background: rgba(47,105,151,0.16);
        border: 1px solid var(--glass-border);
        color: var(--accent-bright);
    }

    .access-benefit-title {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        line-height: 1.3;
    }

    .access-benefit-text {
        font-size: 11.5px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.5;
    }

    /* ── Сети ── */
    .access-nets {
        width: 100%;
        margin-bottom: 24px;
    }

    .access-nets-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        margin-bottom: 10px;
    }

    .access-nets-label b {
        color: var(--text-primary);
        font-weight: 700;
    }

    .access-nets-pills {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
    }

    .access-net-pill {
        padding: 4px 10px;
        border-radius: 20px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--glass-border);
        font-size: 11px;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        letter-spacing: 0.3px;
    }

    /* ── Кнопки ── */
    .access-cta {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
    }

    .access-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 48px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
        text-decoration: none;
        transition: all 0.15s ease;
    }

    .access-btn-primary {
        background: var(--accent);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 4px 20px rgba(47,105,151,0.28);
    }

    .access-btn-primary:hover {
        background: var(--accent-bright);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(61,135,192,0.32);
    }

    .access-btn-secondary {
        background: rgba(255,255,255,0.02);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
    }

    .access-btn-secondary:hover {
        color: var(--text-primary);
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.08);
    }

    .access-btn:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    .access-note {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 16px;
        font-size: 11px;
        color: var(--text-muted);
        font-family: var(--font-mono);
        letter-spacing: 0.3px;
    }

    .access-note-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--success);
        animation: ad-pulse 2s ease-in-out infinite;
    }

    @keyframes ad-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛЬНАЯ АДАПТАЦИЯ
       ══════════════════════════════════════════════════════════════
       Карточка max-width 468px + width:100% сама сжимается. На узких
       экранах: одна колонка преимуществ, меньше внутренние отступы,
       уменьшенный заголовок.
    */
    @media (max-width: 520px) {
        .access-benefits { grid-template-columns: 1fr; }
    }

    @media (max-width: 480px) {
        .access-denied-card { padding: 26px 18px; }
        .access-denied-title { font-size: 19px; }
        .access-price-num { font-size: 30px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .access-denied-wrap,
        .access-denied-card { animation: none; }
        .access-note-dot { animation: none; }
    }
`

// SVG логотип Telegram (маленький) — для вторичной кнопки «Написать менеджеру».
function TelegramIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.15)"/>
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="white"/>
        </svg>
    )
}

function AccessDenied({ onSubscribe }) {
    return (
        <>
            <style>{style}</style>
            <div className="access-denied-wrap">
                <div className="access-denied-card">
                    <div className="access-denied-icon">
                        <Lock size={26} color="var(--accent)" strokeWidth={1.6} />
                    </div>

                    <div className="access-denied-title">
                        Доступ открывается по подписке
                    </div>
                    <div className="access-denied-sub">
                        Оформи подписку, чтобы пользоваться <strong>арбитражным</strong> и{' '}
                        <strong>фандинговым</strong> сканерами AXIOMA SCAN без ограничений.
                    </div>

                    <div className="access-price">
                        <div className="access-price-row">
                            <span className="access-price-num">${PLAN.priceUsd}</span>
                            <span className="access-price-per">/ {PLAN.period}</span>
                        </div>
                        <div className="access-price-note">
                            оплата в {PLAN.currency} · комиссии сети берём на себя
                        </div>
                    </div>

                    <div className="access-benefits">
                        {BENEFITS.map((b) => {
                            const Icon = ICONS[b.icon] || Zap
                            return (
                                <div className="access-benefit" key={b.title}>
                                    <div className="access-benefit-ico">
                                        <Icon size={16} />
                                    </div>
                                    <div className="access-benefit-title">{b.title}</div>
                                    <div className="access-benefit-text">{b.text}</div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="access-nets">
                        <div className="access-nets-label">
                            Принимаем <b>USDT</b> в сетях:
                        </div>
                        <div className="access-nets-pills">
                            {NETWORKS.map((n) => (
                                <span className="access-net-pill" key={n.key} title={n.hint}>
                                    {n.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="access-cta">
                        <button
                            type="button"
                            className="access-btn access-btn-primary"
                            onClick={() => onSubscribe?.()}
                        >
                            Оплатить подписку — ${PLAN.priceUsd}
                        </button>
                        <a
                            href="https://t.me/axioma_manager_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="access-btn access-btn-secondary"
                        >
                            <TelegramIcon />
                            Написать менеджеру
                        </a>
                    </div>

                    <div className="access-note">
                        <span className="access-note-dot" />
                        Доступ активируется сразу после оплаты
                    </div>
                </div>
            </div>
        </>
    )
}

export default AccessDenied