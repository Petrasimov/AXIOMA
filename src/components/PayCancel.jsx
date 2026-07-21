/**
 * PayCancel.jsx — страница возврата при отмене оплаты (cancel_url NOWPayments).
 *
 * Пользователь не завершил платёж. Подписка не оформлена, статус не меняется.
 * Просто объясняем и предлагаем повторить.
 *
 * props:
 *   onRetry()  — заново инициировать оплату (создать инвойс, редирект)
 *   onGoHome() — на главную
 *
 * Маршрут /pay/cancel — noindex (см. seo.js), в prerender не попадает.
 * Префикс классов .pc- — свой, чтобы не пересекаться с PaySuccess (.pay-).
 */

import { XCircle, RefreshCw } from 'lucide-react'

const style = `
    .pc-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 40px 16px;
    }

    .pc-card {
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
        animation: pc-up 0.3s ease;
    }

    @keyframes pc-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .pc-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
        background: rgba(224,62,62,0.10);
        border: 1px solid rgba(224,62,62,0.24);
        color: var(--error);
        backdrop-filter: blur(10px);
    }

    .pc-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        margin-bottom: 10px;
        line-height: 1.3;
    }

    .pc-sub {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.6;
        max-width: 340px;
        margin-bottom: 26px;
    }

    .pc-cta {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
    }

    .pc-btn {
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

    .pc-btn-primary {
        background: var(--accent);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 4px 20px rgba(47,105,151,0.28);
    }

    .pc-btn-primary:hover {
        background: var(--accent-bright);
        transform: translateY(-1px);
    }

    .pc-btn-secondary {
        background: rgba(255,255,255,0.02);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
    }

    .pc-btn-secondary:hover {
        color: var(--text-primary);
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.08);
    }

    .pc-btn:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    @media (max-width: 480px) {
        .pc-card { padding: 30px 20px; }
        .pc-title { font-size: 18px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .pc-card { animation: none; }
    }
`

function PayCancel({ onRetry, onGoHome }) {
    return (
        <>
            <style>{style}</style>
            <div className="pc-wrap">
                <div className="pc-card">
                    <div className="pc-icon"><XCircle size={30} /></div>
                    <div className="pc-title">Оплата отменена</div>
                    <div className="pc-sub">
                        Платёж не был завершён — подписка не оформлена. Ничего не списано.
                        Можно попробовать ещё раз в любой момент.
                    </div>
                    <div className="pc-cta">
                        <button className="pc-btn pc-btn-primary" onClick={() => onRetry?.()}>
                            <RefreshCw size={16} />
                            Попробовать снова
                        </button>
                        <button className="pc-btn pc-btn-secondary" onClick={() => onGoHome?.()}>
                            На главную
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PayCancel