/**
 * UserProfile.jsx — компактный чип профиля в футере десктопного сайдбара.
 *
 * ВАЖНО: это НЕ модалка. Раньше сюда по ошибке попала полная копия ProfileModal
 * (всегда-открытая модалка внутри сайдбара — её position:fixed ловился стеклом
 * сайдбара и окно «залипало» в колонке). Здесь — только чип-триггер: клик
 * вызывает onOpenProfile, а саму модалку рендерит App в корне (<ProfileModal>),
 * где у неё верные пропы и портал в document.body.
 *
 * Поведение в свёрнутом рельсе (68px) / раскрытом по hover (240px) повторяет
 * .sidebar-tab: аватар виден всегда, имя и бейдж появляются при раскрытии.
 *
 * props:
 *   user           — авторизованный пользователь (login, username, photoUrl, флаги)
 *   onOpenProfile  — открыть модалку профиля (App: () => setProfileOpen(true))
 */

const style = `
  .sbup-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-top: auto;              /* прижать к низу сайдбара */
    padding: 12px 0;
    justify-content: center;       /* свёрнуто: аватар по центру рельса */
    background: transparent;
    border: none;
    border-top: 1px solid var(--glass-border);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s ease, padding 0.25s ease;
  }
  .sbup-chip:hover { background: rgba(255,255,255,0.03); }
  .sbup-chip:focus-visible { outline: 2px solid var(--accent-bright); outline-offset: -2px; }

  /* при раскрытии сайдбара — выравниваем влево и даём отступы (как .sidebar-tab) */
  .sidebar:hover .sbup-chip {
    justify-content: flex-start;
    padding: 12px 16px;
  }

  .sbup-av {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-bright));
    color: #08131c;
    font-weight: 800;
    font-size: 14px;
    font-family: var(--font-sans);
  }
  .sbup-av img { width: 100%; height: 100%; object-fit: cover; }

  /* текст скрыт в свёрнутом рельсе, появляется при hover сайдбара */
  .sbup-info {
    display: none;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    text-align: left;
  }
  .sidebar:hover .sbup-info { display: flex; }

  .sbup-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-sans);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .sbup-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-family: var(--font-mono);
    letter-spacing: 0.3px;
    white-space: nowrap;
  }
  .sbup-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .sbup-badge.access    { color: var(--success); }
  .sbup-badge.access .sbup-dot { background: var(--success); }
  .sbup-badge.no-access { color: var(--error); }
  .sbup-badge.no-access .sbup-dot { background: var(--error); }
  .sbup-badge.admin     { color: #a78bfa; }
  .sbup-badge.admin .sbup-dot { background: #a78bfa; }
`

function UserProfile({ user, onOpenProfile }) {
    // Имя: @username из Telegram, иначе логин.
    const displayName = user?.username ? `@${user.username}` : (user?.login || 'Профиль')
    const initial = (displayName.replace('@', '')[0] || 'U').toUpperCase()

    // Бейдж доступа: админ → фиолетовый, есть подписка → зелёный, иначе красный.
    const isAdmin = user?.isAdmin === true
    const hasAccess = user?.isCexCexPaid === true
    const badgeClass = isAdmin ? 'admin' : hasAccess ? 'access' : 'no-access'
    const badgeText = isAdmin ? 'Админ' : hasAccess ? 'Доступ активен' : 'Нет доступа'

    return (
        <>
            <style>{style}</style>
            <button
                className="sbup-chip"
                onClick={() => onOpenProfile?.()}
                title="Профиль"
                aria-label="Открыть профиль"
            >
                <span className="sbup-av">
                    {user?.photoUrl
                        ? <img src={user.photoUrl} alt={displayName} onError={e => { e.target.style.display = 'none' }} />
                        : initial}
                </span>
                <span className="sbup-info">
                    <span className="sbup-name">{displayName}</span>
                    <span className={`sbup-badge ${badgeClass}`}>
                        <span className="sbup-dot" />
                        {badgeText}
                    </span>
                </span>
            </button>
        </>
    )
}

export default UserProfile