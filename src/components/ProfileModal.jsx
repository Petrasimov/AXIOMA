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

import { useEffect } from 'react'
import {
    X, Check, LogOut, MessageCircle,
    Trophy, Sprout, TrendingUp, Crown, ShieldCheck, ShieldX, Sparkles
} from 'lucide-react'
import { clearSession } from '../auth.js'
import { TRAINING_MODULES } from '../data/trainingContent.js'
import { useTrainingProgress } from '../hooks/useTrainingProgress.js'

// Иконка ранга по id статуса (совпадает с STATUS_TIERS в useTrainingProgress)
const TIER_ICON = {
    novice: Sprout,
    trader: TrendingUp,
    expert: Trophy,
    master: Crown,
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
`

function ProfileModal({ user, onClose, onLogout }) {
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

    function handleLogout() {
        clearSession()
        onClose?.()
        onLogout?.()
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