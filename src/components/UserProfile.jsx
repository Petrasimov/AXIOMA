/**
 * ProfileModal.jsx — модальное окно профиля пользователя
 *
 * Дизайн «Игровой профиль»: аватар в кольце-прогрессе, крупный бейдж статуса,
 * полоса статистики, мотивирующий призыв к следующему рангу.
 *
 * КЛЮЧЕВОЕ: оформление растёт вместе со статусом обучения.
 *   Новичок → приглушённый серый
 *   Трейдер → синий
 *   Эксперт → зелёный + орбита вокруг аватара
 *   Мастер  → янтарный + орбита + усиленное свечение + корона
 *
 * Данные:
 *   user     — Telegram (login, username, photoUrl, userId, isAdmin, isCexCexPaid)
 *   progress — из useTrainingProgress (статус, прогресс, уроки, модули)
 *
 * Действия (реализуемые без бэкенда):
 *   - копировать никнейм или ID (для обращений в поддержку)
 *   - написать в поддержку (ссылка на бота)
 *   - выйти из аккаунта
 *
 * Отложено до бэкенда: история подписки, статистика сделок, продление,
 * уведомления, рефералка, ачивки.
 *
 * Мобильная адаптация (Партия 1, MOBILE_PLAN.md п.2.2):
 * - На ≤768px модалка превращается в bottom-sheet: прижата к низу экрана,
 *   на всю ширину, скругление только сверху, выезжает снизу вверх.
 * - Контент (аватар/статистика/действия) обёрнут в .pm-scroll — отдельный
 *   скролл-контейнер внутри .pm-modal. Это сделано намеренно: если бы
 *   скроллился сам .pm-modal, кнопка закрытия (position:absolute) поехала
 *   бы вместе с контентом при скролле. Так она и «ручка» сверху остаются
 *   на месте всегда.
 * - max-height: 90dvh — чтобы в альбомной ориентации/на низких экранах
 *   контент не обрезался, а скроллился внутри.
 * - env(safe-area-inset-bottom) — отступ под жест-бар/чёлку снизу.
 * - Свайп-вниз для закрытия сознательно не реализован в этом блоке —
 *   вынесен в бэклог как необязательное улучшение (см. отчёт).
 */

import { useEffect, useState, useRef } from 'react'
import {
    X, Check, LogOut, MessageCircle,
    Trophy, Sprout, TrendingUp, Crown, ShieldCheck, ShieldX, Sparkles,
    KeyRound, Eye, EyeOff, AlertTriangle
} from 'lucide-react'
import { clearSession, linkTelegram, setCredentials } from '../auth.js'
import { TRAINING_MODULES } from '../data/trainingContent.js'
import { useTrainingProgress } from '../hooks/useTrainingProgress.js'

// Иконка ранга по id статуса (совпадает с STATUS_TIERS в useTrainingProgress)
const TIER_ICON = {
    novice: Sprout,
    trader: TrendingUp,
    expert: Trophy,
    master: Crown,
}

// Мини-логотип Telegram (в lucide брендовых иконок нет)
function TgIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="rgba(93,163,214,0.25)"/>
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="var(--accent-bright)"/>
        </svg>
    )
}

const style = `
  .pm-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.68);
    backdrop-filter: blur(9px);
    z-index: 600;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: pm-fade .2s ease;
  }
  @keyframes pm-fade { from { opacity:0 } to { opacity:1 } }

  .pm-modal {
    width: 470px; max-width: 100%;
    border-radius: var(--radius-xl);
    overflow: hidden; position: relative;
    background: rgba(13,32,51,0.84);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    /* рамка и свечение окрашиваются по статусу */
    border: 1px solid color-mix(in srgb, var(--st) 42%, transparent);
    box-shadow:
      0 32px 90px rgba(0,0,0,0.62),
      0 0 44px color-mix(in srgb, var(--st) 14%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.07);
    animation: pm-up .28s cubic-bezier(.22,1,.36,1);
  }
  @keyframes pm-up { from { opacity:0; transform:translateY(18px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }

  /* аура сверху — насыщеннее у высоких статусов */
  .pm-modal::before {
    content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
    background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--st) 17%, transparent), transparent 62%);
  }

  .pm-close {
    position:absolute; top:14px; right:14px; z-index:3;
    width:32px; height:32px; border-radius:var(--radius-sm);
    background:rgba(255,255,255,0.05); border:1px solid var(--glass-border);
    color:var(--text-secondary); cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all .15s;
  }
  .pm-close:hover { border-color:var(--error); color:var(--error); }

  /* ─── Ручка bottom-sheet — видна только на мобиле ─── */
  .pm-handle {
    display: none;
  }

  /* ─── Верх: аватар + ранг ─── */
  .pm-top { position:relative; z-index:1; padding:34px 28px 22px; text-align:center; }

  .pm-av-hex { position:relative; width:108px; height:108px; margin:0 auto 18px; }
  .pm-av-ring {
    position:absolute; inset:0; border-radius:50%;
    /* кольцо-прогресс: заполняется по мере обучения */
    background: conic-gradient(var(--st) var(--pct), rgba(255,255,255,0.07) 0);
    padding:4px;
  }
  .pm-av-inner {
    width:100%; height:100%; border-radius:50%;
    background:#0b1926; display:flex; align-items:center; justify-content:center;
  }
  .pm-av {
    width:90px; height:90px; border-radius:50%;
    background: linear-gradient(135deg, var(--st), color-mix(in srgb, var(--st) 55%, #fff));
    display:flex; align-items:center; justify-content:center;
    font-size:33px; font-weight:800; color:#08131c;
    overflow:hidden;
  }
  .pm-av img { width:100%; height:100%; object-fit:cover; }

  /* орбита — только для Эксперта и Мастера */
  .pm-av-hex.orbit::after {
    content:''; position:absolute; inset:-13px; border-radius:50%;
    border:1px dashed color-mix(in srgb, var(--st) 42%, transparent);
    animation: pm-spin 16s linear infinite;
  }
  @keyframes pm-spin { to { transform: rotate(360deg) } }

  /* Декоративная бесконечная орбита — уважаем prefers-reduced-motion
     (Партия 7, MOBILE_PLAN.md) */
  @media (prefers-reduced-motion: reduce) {
    .pm-av-hex.orbit::after { animation: none; }
  }

  .pm-av-pct {
    position:absolute; bottom:-5px; left:50%; transform:translateX(-50%);
    font-family:var(--font-mono); font-size:10px; font-weight:800;
    padding:3px 11px; border-radius:20px;
    background:#0b1926; border:1px solid var(--st); color:var(--st);
    white-space:nowrap;
  }

  .pm-name { font-size:24px; font-weight:900; letter-spacing:-0.5px; margin-bottom:9px; }

  .pm-tier {
    display:inline-flex; align-items:center; gap:8px;
    font-family:var(--font-mono); font-size:12px; font-weight:800; letter-spacing:1.5px;
    padding:8px 19px; border-radius:20px; color:var(--st);
    background: color-mix(in srgb, var(--st) 12%, transparent);
    border:1px solid color-mix(in srgb, var(--st) 52%, transparent);
    box-shadow:0 0 22px color-mix(in srgb, var(--st) 26%, transparent);
    margin-bottom:9px;
  }

  /* ─── Полоса статистики ─── */
  .pm-stats {
    display:grid; grid-template-columns:repeat(3,1fr); gap:1px;
    background:var(--glass-border); position:relative; z-index:1;
  }
  .pm-stat { padding:18px 10px; text-align:center; background:rgba(11,25,38,0.78); }
  .pm-stat-v { font-family:var(--font-mono); font-size:20px; font-weight:800; color:var(--text-primary); }
  .pm-stat-l { font-size:9px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:4px; }

  /* ─── Низ ─── */
  .pm-bottom { padding:22px 28px 26px; position:relative; z-index:1; }

  .pm-next {
    padding:14px 16px; border-radius:var(--radius-md);
    background: color-mix(in srgb, var(--st) 7%, transparent);
    border:1px solid color-mix(in srgb, var(--st) 26%, transparent);
    display:flex; align-items:center; gap:12px; margin-bottom:12px;
  }
  .pm-next-ic { color:var(--st); flex-shrink:0; }
  .pm-next-t { font-size:12.5px; color:var(--text-secondary); line-height:1.55; }
  .pm-next-t b { color:var(--st); }

  .pm-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 16px; border-radius:var(--radius-md); margin-bottom:10px;
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
  }
  .pm-row-l { display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--text-secondary); }
  .pm-badge {
    display:flex; align-items:center; gap:5px;
    font-size:11px; font-weight:700; padding:5px 12px; border-radius:20px;
  }
  .pm-badge.ok { color:var(--success); background:rgba(0,201,122,0.12); border:1px solid rgba(0,201,122,0.35); }
  .pm-badge.no { color:var(--error); background:rgba(224,62,62,0.1); border:1px solid rgba(224,62,62,0.3); }
  .pm-badge.adm { color:#a78bfa; background:rgba(167,139,250,0.12); border:1px solid rgba(167,139,250,0.35); }

  /* ─── Действия ─── */
  .pm-actions { display:flex; flex-direction:column; gap:9px; margin-top:16px; }
  .pm-act {
    display:flex; align-items:center; justify-content:center; gap:8px;
    width:100%; padding:12px; border-radius:var(--radius-md);
    font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:0.6px;
    cursor:pointer; transition:all .15s; text-decoration:none;
    border:1px solid var(--glass-border); background:rgba(255,255,255,0.02);
    color:var(--text-secondary);
  }
  .pm-act:hover { border-color:var(--glass-border-hover); color:var(--text-primary); background:rgba(93,163,214,0.08); }
  .pm-act.primary {
    background:linear-gradient(135deg, var(--accent), var(--accent-bright));
    border-color:rgba(255,255,255,0.14); color:#fff;
    box-shadow:0 4px 18px rgba(47,105,151,0.3);
  }
  .pm-act.primary:hover { transform:translateY(-1px); background:linear-gradient(135deg, var(--accent-bright), var(--accent)); }
  .pm-act.danger { color:var(--error); border-color:rgba(224,62,62,0.3); }
  .pm-act.danger:hover { background:rgba(224,62,62,0.1); border-color:var(--error); color:var(--error); }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛКА (≤768px) — модалка как bottom-sheet
     ══════════════════════════════════════════════════════════════ */
  @keyframes pm-sheet-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .pm-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .pm-modal {
      width: 100%;
      max-width: 100%;
      max-height: 90dvh;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      display: flex;
      flex-direction: column;
      animation: pm-sheet-up 0.28s cubic-bezier(0.22,1,0.36,1);
      padding-bottom: env(safe-area-inset-bottom);
      /* блюр полегче — на мобильном GPU 30px ощутимо просаживает FPS */
      backdrop-filter: blur(16px) saturate(150%);
      -webkit-backdrop-filter: blur(16px) saturate(150%);
    }

    .pm-handle {
      display: block;
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.22);
      margin: 10px auto 2px;
      flex-shrink: 0;
    }

    .pm-close {
      width: 40px;
      height: 40px;
    }

    /* Скроллится только контент — .pm-close и .pm-handle остаются на месте */
    .pm-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .pm-top { padding-left: 20px; padding-right: 20px; }
    .pm-bottom { padding-left: 20px; padding-right: 20px; }
  }

  /* ─── Способы входа (Фаза 4) ─── */
  .pm-auth-sec { margin-top: 14px; }
  .pm-auth-head {
    font-size: 11px; color: var(--text-muted); text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 10px; font-family: var(--font-mono);
  }
  .pm-mini {
    display:inline-flex; align-items:center; gap:6px;
    padding:6px 14px; border-radius:20px; cursor:pointer;
    font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:0.4px;
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border:1px solid var(--glass-border-hover); color: var(--accent-bright);
    transition: all .15s;
  }
  .pm-mini:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 30%, transparent); color: var(--text-primary); }
  .pm-mini:disabled { opacity:.55; cursor:default; }
  .pm-mini.ghost { background:transparent; color:var(--text-secondary); border-color:var(--glass-border); }
  .pm-mini.ghost:hover { color:var(--text-primary); border-color:var(--glass-border-hover); }
  .pm-mini.solid { background:var(--accent); color:#fff; border-color:rgba(255,255,255,0.14); }
  .pm-mini.solid:hover:not(:disabled) { background:var(--accent-bright); }
  .pm-mini:focus-visible { outline:2px solid var(--accent-bright); outline-offset:2px; }

  .pm-linkpanel {
    display:flex; flex-direction:column; gap:10px; align-items:center;
    padding:14px; margin:2px 0 10px; border-radius:var(--radius-md);
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
  }
  .pm-linkpanel-t { font-size:12px; color:var(--text-secondary); text-align:center; line-height:1.5; }
  .pm-tgwidget { display:flex; justify-content:center; min-height:46px; width:100%; }

  .pm-inwrap { position:relative; width:100%; }
  .pm-input {
    width:100%; height:44px; padding:0 14px;
    background:rgba(255,255,255,0.03); border:1px solid var(--glass-border);
    border-radius:var(--radius-md); color:var(--text-primary);
    font-size:14px; font-family:var(--font-sans);
    transition:border-color .15s, box-shadow .15s;
  }
  .pm-input.has-toggle { padding-right:44px; }
  .pm-input::placeholder { color:var(--text-muted); }
  .pm-input:focus-visible { outline:none; border-color:var(--accent-bright); box-shadow:0 0 0 3px rgba(61,135,192,0.18); }
  .pm-pwtoggle {
    position:absolute; top:0; right:0; height:44px; width:44px;
    display:flex; align-items:center; justify-content:center;
    background:transparent; border:none; color:var(--text-muted); cursor:pointer; transition:color .15s;
  }
  .pm-pwtoggle:hover { color:var(--text-secondary); }
  .pm-linkerr { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--error); align-self:flex-start; line-height:1.4; }
  .pm-linkerr svg { flex-shrink:0; }
  .pm-linkbtns { display:flex; gap:8px; }
`

function ProfileModal({ user, onClose, onLogout, onUserUpdate }) {
    const { progress } = useTrainingProgress(TRAINING_MODULES)

    // Esc закрывает
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const status = progress.currentStatus
    const next = progress.nextStatus
    const TierIcon = TIER_ICON[status.id] ?? Trophy

    const isAdmin = user?.isAdmin === true
    const hasAccess = user?.isCexCexPaid === true
    const initial = (user?.login || 'U').charAt(0).toUpperCase()

    // орбита вокруг аватара — только у Эксперта и Мастера
    const hasOrbit = status.id === 'expert' || status.id === 'master'

    // Основное имя под аватаром: публичный ник Telegram с @, если он есть.
    // Не у каждого пользователя Telegram задан ник — тогда фолбэк на login
    // (в нём может лежать тот же ник или, как раньше, числовой идентификатор),
    // а если и его нет — общая заглушка.
    const displayName = user?.username ? `@${user.username}` : (user?.login || 'Пользователь')

    // Способы входа: флаги из AuthResponse (контракт Фазы 4). Пока бэк их не
    // отдаёт — провизорный фолбэк по имеющимся полям (уточнится, когда флаги
    // придут с сервера).
    const hasTelegram = user?.hasTelegram ?? !!user?.photoUrl
    const hasPassword = user?.hasPassword ?? false

    // Локальное состояние блока линковки
    const [linkView, setLinkView] = useState('none')   // 'none' | 'telegram' | 'password'
    const [linkPending, setLinkPending] = useState(false)
    const [linkError, setLinkError] = useState('')
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const linkWidgetRef = useRef(null)

    function handleLogout() {
        clearSession()
        onClose?.()
        onLogout?.()
    }

    // Открыть/закрыть подпанель линковки (сбрасываем поля и ошибку)
    function openLink(view) {
        setLinkView(view)
        setLinkError('')
        setLogin(''); setPassword(''); setConfirm(''); setShowPw(false)
    }
    function closeLink() {
        setLinkView('none')
        setLinkError('')
    }

    // Telegram Login Widget для привязки — монтируем, когда открыта его подпанель.
    // Отдельное имя колбэка (onProfileTelegramLink), чтобы не пересечься с входом.
    useEffect(() => {
        if (linkView !== 'telegram' || !linkWidgetRef.current) return
        linkWidgetRef.current.innerHTML = ''

        window.onProfileTelegramLink = async (tgUser) => {
            setLinkPending(true)
            setLinkError('')
            const res = await linkTelegram(tgUser)
            setLinkPending(false)
            if (!res.ok) {
                setLinkError(
                    res.reason === 'conflict'       ? 'Этот Telegram уже привязан к другому аккаунту'
                    : res.reason === 'unauthorized' ? 'Сессия истекла — войди заново'
                    : 'Не удалось привязать. Попробуйте ещё раз'
                )
                return
            }
            onUserUpdate?.(res.user)
            setLinkView('none')
        }

        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.setAttribute('data-telegram-login', 'axioma_manager_bot')
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '8')
        script.setAttribute('data-onauth', 'onProfileTelegramLink(user)')
        script.setAttribute('data-request-access', 'write')
        script.async = true
        linkWidgetRef.current.appendChild(script)

        return () => {
            delete window.onProfileTelegramLink
            if (linkWidgetRef.current) linkWidgetRef.current.innerHTML = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkView])

    // Задать логин и пароль текущему аккаунту (когда пароля ещё нет)
    async function handleSetCredentials(e) {
        e?.preventDefault?.()
        const l = login.trim()
        if (l.length < 3)         { setLinkError('Логин минимум 3 символа'); return }
        if (password.length < 6)  { setLinkError('Пароль минимум 6 символов'); return }
        if (password !== confirm) { setLinkError('Пароли не совпадают'); return }

        setLinkPending(true)
        setLinkError('')
        const res = await setCredentials(l, password)
        setLinkPending(false)
        if (!res.ok) {
            setLinkError(
                res.reason === 'conflict'       ? 'Такой логин уже занят'
                : res.reason === 'bad_request'  ? 'Проверьте логин и пароль'
                : res.reason === 'unauthorized' ? 'Сессия истекла — войди заново'
                : 'Не удалось сохранить. Попробуйте ещё раз'
            )
            return
        }
        onUserUpdate?.(res.user)
        setLinkView('none')
    }

    return (
        <>
            <style>{style}</style>
            <div className="pm-overlay" onClick={onClose}>
                <div
                    className="pm-modal"
                    style={{ '--st': status.color }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Ручка bottom-sheet — только на мобиле (display:none на десктопе) */}
                    <div className="pm-handle" aria-hidden="true" />

                    <button className="pm-close" onClick={onClose}><X size={16} /></button>

                    {/* На десктопе .pm-scroll — обычный блок без скролла (см. style).
                        На мобиле — единственный скролл-контейнер, чтобы ручка
                        и кнопка закрытия оставались на месте при прокрутке. */}
                    <div className="pm-scroll">

                        {/* ─── Верх: аватар в кольце-прогрессе ─── */}
                        <div className="pm-top">
                            <div className={`pm-av-hex ${hasOrbit ? 'orbit' : ''}`}>
                                <div
                                    className="pm-av-ring"
                                    style={{ '--pct': `${progress.progressPct}%` }}
                                >
                                    <div className="pm-av-inner">
                                        <div className="pm-av">
                                            {user?.photoUrl
                                                ? <img
                                                    src={user.photoUrl}
                                                    alt={user.login}
                                                    onError={e => { e.target.style.display = 'none' }}
                                                  />
                                                : initial}
                                        </div>
                                    </div>
                                </div>
                                <div className="pm-av-pct">{progress.progressPct}% ОБУЧЕНИЯ</div>
                            </div>

                            <div className="pm-name">{displayName}</div>

                            <div className="pm-tier">
                                <TierIcon size={15} />
                                {status.label.toUpperCase()}
                            </div>
                        </div>

                        {/* ─── Статистика обучения ─── */}
                        <div className="pm-stats">
                            <div className="pm-stat">
                                <div className="pm-stat-v">{progress.completedLessons}</div>
                                <div className="pm-stat-l">уроков</div>
                            </div>
                            <div className="pm-stat">
                                <div className="pm-stat-v">{progress.completedModules}</div>
                                <div className="pm-stat-l">модулей</div>
                            </div>
                            <div className="pm-stat">
                                <div className="pm-stat-v">{progress.totalLessons}</div>
                                <div className="pm-stat-l">всего уроков</div>
                            </div>
                        </div>

                        {/* ─── Низ ─── */}
                        <div className="pm-bottom">

                            {/* Мотивация к следующему рангу */}
                            <div className="pm-next">
                                <span className="pm-next-ic">
                                    {next ? <Sparkles size={18} /> : <Crown size={18} />}
                                </span>
                                <span className="pm-next-t">
                                    {next
                                        ? <>Ещё <b>{progress.modulesToNext} модуля</b> — и ты получишь статус <b>{next.label}</b>.</>
                                        : <>Ты прошёл весь курс. <b>Максимальный статус — Мастер</b>. Поздравляем!</>}
                                </span>
                            </div>

                            {/* Доступ к сканеру */}
                            <div className="pm-row">
                                <span className="pm-row-l">
                                    {hasAccess ? <ShieldCheck size={15} /> : <ShieldX size={15} />}
                                    Доступ к сканеру
                                </span>
                                {isAdmin ? (
                                    <span className="pm-badge adm">Админ</span>
                                ) : hasAccess ? (
                                    <span className="pm-badge ok"><Check size={11} /> Активен</span>
                                ) : (
                                    <span className="pm-badge no">Не активирован</span>
                                )}
                            </div>

                            {/* ─── Способы входа ─── */}
                            <div className="pm-auth-sec">
                                <div className="pm-auth-head">Способы входа</div>

                                <div className="pm-row">
                                    <span className="pm-row-l"><TgIcon /> Telegram</span>
                                    {hasTelegram ? (
                                        <span className="pm-badge ok"><Check size={11} /> Привязан</span>
                                    ) : (
                                        <button className="pm-mini" onClick={() => openLink('telegram')} disabled={linkPending}>
                                            Привязать
                                        </button>
                                    )}
                                </div>

                                <div className="pm-row">
                                    <span className="pm-row-l"><KeyRound size={15} /> Логин и пароль</span>
                                    {hasPassword ? (
                                        <span className="pm-badge ok"><Check size={11} /> Задан</span>
                                    ) : (
                                        <button className="pm-mini" onClick={() => openLink('password')} disabled={linkPending}>
                                            Задать
                                        </button>
                                    )}
                                </div>

                                {/* Подпанель: привязка Telegram */}
                                {linkView === 'telegram' && (
                                    <div className="pm-linkpanel">
                                        <div className="pm-linkpanel-t">
                                            Войди через Telegram, чтобы привязать его к этому аккаунту.
                                        </div>
                                        <div className="pm-tgwidget" ref={linkWidgetRef} />
                                        {linkError && (
                                            <div className="pm-linkerr"><AlertTriangle size={13} /> {linkError}</div>
                                        )}
                                        <button className="pm-mini ghost" onClick={closeLink}>Отмена</button>
                                    </div>
                                )}

                                {/* Подпанель: задать логин и пароль */}
                                {linkView === 'password' && (
                                    <form className="pm-linkpanel" onSubmit={handleSetCredentials}>
                                        <input
                                            className="pm-input"
                                            type="text"
                                            value={login}
                                            onChange={e => setLogin(e.target.value)}
                                            placeholder="Придумайте логин"
                                            autoComplete="username"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                        />
                                        <div className="pm-inwrap">
                                            <input
                                                className="pm-input has-toggle"
                                                type={showPw ? 'text' : 'password'}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Пароль"
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="pm-pwtoggle"
                                                onClick={() => setShowPw(v => !v)}
                                                aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
                                            >
                                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        <input
                                            className="pm-input"
                                            type={showPw ? 'text' : 'password'}
                                            value={confirm}
                                            onChange={e => setConfirm(e.target.value)}
                                            placeholder="Повторите пароль"
                                            autoComplete="new-password"
                                        />
                                        {linkError && (
                                            <div className="pm-linkerr"><AlertTriangle size={13} /> {linkError}</div>
                                        )}
                                        <div className="pm-linkbtns">
                                            <button type="submit" className="pm-mini solid" disabled={linkPending}>
                                                {linkPending ? 'Сохраняем…' : 'Сохранить'}
                                            </button>
                                            <button type="button" className="pm-mini ghost" onClick={closeLink}>
                                                Отмена
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Действия */}
                            <div className="pm-actions">
                                {!hasAccess && !isAdmin && (
                                    <a
                                        className="pm-act primary"
                                        href="https://t.me/axioma_manager_bot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <MessageCircle size={13} /> ПОЛУЧИТЬ ДОСТУП
                                    </a>
                                )}

                                <a
                                    className="pm-act"
                                    href="https://t.me/axioma_manager_bot"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle size={13} /> НАПИСАТЬ В ПОДДЕРЖКУ
                                </a>

                                <button className="pm-act danger" onClick={handleLogout}>
                                    <LogOut size={13} /> ВЫЙТИ ИЗ АККАУНТА
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ProfileModal