/**
 * AuthGate.jsx — Заглушка «Требуется авторизация» для областей сканеров.
 *
 * Рендерится в рабочей области futures/funding, когда пользователь НЕ авторизован
 * (auth.status === 'unknown'). Раньше на это состояние сразу выбрасывалась модалка
 * TelegramAuthModal поверх экрана — теперь модалка открывается только по явному
 * действию пользователя, а на её месте показывается этот блок.
 *
 * Sidebar и Header остаются доступными: как и AccessDenied, компонент позиционируется
 * absolute внутри relative-контейнера страницы, а не поверх всего приложения.
 *
 * Компонент полностью статичен: ни запросов, ни таймеров, ни подписок. Гость не
 * инициирует обращений к биржам и бэкенду — за это же отвечает canScan в App.jsx
 * и то, что FundingPage не монтируется без доступа.
 *
 * props:
 *   page       — 'futures' | 'funding'; определяет только тексты
 *   onLogin()  — открыть модалку авторизации на вкладке «Вход»
 *   onRegister()— открыть модалку авторизации на вкладке «Регистрация»
 *
 * Классы в namespace .ag-* — модалки и оверлеи проекта инжектят стили глобально,
 * поэтому общие имена (.modal, .overlay) уже приводили к коллизиям.
 */

import { Lock, LogIn, UserPlus } from 'lucide-react'

// Тексты под конкретный сканер. Держим здесь, а не в родителе: это единственное,
// чем страницы отличаются друг от друга в этом компоненте.
const COPY = {
    futures: {
        title: 'Войдите, чтобы открыть сканер',
        text: 'Арбитражный CEX-CEX сканер показывает связки, где одна биржа торгует монету дороже другой, и считает спред с учётом стакана и комиссий. Данные обновляются в реальном времени.',
    },
    funding: {
        title: 'Войдите, чтобы открыть фандинг',
        text: 'Фандинговый сканер собирает ставки финансирования по фьючерсам всех подключённых бирж и показывает, где выгодно держать позицию под начисление. Данные обновляются в реальном времени.',
    },
}

const style = `
    .ag-wrap {
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
        animation: ag-fade 0.3s ease;
    }

    @keyframes ag-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    .ag-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100%;
        max-width: 460px;
        margin: auto;
        padding: 34px 30px;
        background: rgba(13,32,51,0.76);
        backdrop-filter: blur(28px) saturate(150%);
        -webkit-backdrop-filter: blur(28px) saturate(150%);
        border: 1px solid var(--glass-border-hover);
        border-radius: var(--radius-lg);
        box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        animation: ag-up 0.3s ease;
    }

    @keyframes ag-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .ag-icon {
        width: 58px;
        height: 58px;
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

    .ag-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
        line-height: 1.3;
        margin-bottom: 10px;
    }

    .ag-text {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        line-height: 1.6;
        margin-bottom: 24px;
        max-width: 370px;
    }

    .ag-cta {
        display: flex;
        gap: 10px;
        width: 100%;
    }

    .ag-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1;
        height: 46px;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 13.5px;
        font-weight: 600;
        font-family: var(--font-sans);
        letter-spacing: 0.2px;
        transition: all 0.15s ease;
    }

    .ag-btn-primary {
        background: var(--accent);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 4px 20px rgba(47,105,151,0.28);
    }

    .ag-btn-primary:hover {
        background: var(--accent-bright);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(61,135,192,0.32);
    }

    .ag-btn-secondary {
        background: rgba(255,255,255,0.02);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
    }

    .ag-btn-secondary:hover {
        color: var(--text-primary);
        border-color: var(--glass-border-hover);
        background: rgba(93,163,214,0.08);
    }

    .ag-btn:focus-visible {
        outline: 2px solid var(--accent-bright);
        outline-offset: 2px;
    }

    .ag-note {
        margin-top: 18px;
        font-size: 11.5px;
        color: var(--text-muted);
        font-family: var(--font-sans);
        line-height: 1.5;
    }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛЬНАЯ АДАПТАЦИЯ
       ══════════════════════════════════════════════════════════════
       Карточка сжимается сама (max-width + width:100%). На узких экранах
       кнопки встают в колонку — в строке они становятся слишком тесными
       для комфортного тапа.
    */
    @media (max-width: 480px) {
        .ag-card { padding: 26px 18px; }
        .ag-title { font-size: 18px; }
        .ag-text { font-size: 12.5px; }
        .ag-cta { flex-direction: column; }
    }

    @media (prefers-reduced-motion: reduce) {
        .ag-wrap,
        .ag-card { animation: none; }
    }
`

function AuthGate({ page = 'futures', onLogin, onRegister }) {
    const copy = COPY[page] || COPY.futures

    return (
        <>
            <style>{style}</style>
            <div className="ag-wrap">
                <div className="ag-card">
                    <div className="ag-icon">
                        <Lock size={25} color="var(--accent)" strokeWidth={1.6} />
                    </div>

                    <div className="ag-title">{copy.title}</div>
                    <div className="ag-text">{copy.text}</div>

                    <div className="ag-cta">
                        <button
                            type="button"
                            className="ag-btn ag-btn-primary"
                            onClick={() => onLogin?.()}
                        >
                            <LogIn size={17} />
                            Войти
                        </button>
                        <button
                            type="button"
                            className="ag-btn ag-btn-secondary"
                            onClick={() => onRegister?.()}
                        >
                            <UserPlus size={17} />
                            Регистрация
                        </button>
                    </div>

                    <div className="ag-note">
                        Уже есть Telegram? Вход займёт один тап.
                    </div>
                </div>
            </div>
        </>
    )
}

export default AuthGate