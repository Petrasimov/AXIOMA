/**
 * UserProfile.jsx — Профиль пользователя в нижней части Sidebar
 *
 * Статусы:
 *   isAdmin === true        → "Админ"         (фиолетовый)
 *   isCexCexPaid === true   → "Доступ есть"   (зелёный)
 *   иначе                  → "Нет доступа"    (красный)
 */

import { useState } from 'react'
import { clearSession } from '../auth.js'

const style = `
    .user-profile {
        margin-top: auto;
        padding: 10px 12px;
        border-top: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;
        white-space: nowrap;
        overflow: hidden;
    }

    .user-profile:hover {
        background: var(--bg-hover);
    }

    .user-avatar {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 50%;
        background: var(--bg-card);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: var(--accent-bright);
        font-family: var(--font-sans);
        flex-shrink: 0;
        position: relative;
        overflow: visible;
    }

    .user-avatar img {
        width: 36px;
        height: 36px;
        object-fit: cover;
        border-radius: 50%;
    }

    .user-avatar-tg {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #2AABEE;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid var(--bg-secondary);
        z-index: 1;
    }

    .user-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        flex: 1;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .sidebar:hover .user-info {
        opacity: 1;
    }

    .user-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        font-family: var(--font-sans);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 130px;
    }

    .user-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-family: var(--font-mono);
        letter-spacing: 0.3px;
        width: fit-content;
    }

    .user-badge-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    /* Зелёный — доступ есть */
    .user-badge.access {
        color: var(--success);
    }
    .user-badge.access .user-badge-dot {
        background: var(--success);
    }

    /* Красный — нет доступа */
    .user-badge.no-access {
        color: var(--error);
    }
    .user-badge.no-access .user-badge-dot {
        background: var(--error);
    }

    /* Фиолетовый — админ */
    .user-badge.admin {
        color: #a78bfa;
    }
    .user-badge.admin .user-badge-dot {
        background: #a78bfa;
    }

    /* Тултип */
    .user-tooltip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 8px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 12px;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        white-space: nowrap;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        animation: tooltip-up 0.15s ease;
        z-index: 300;
        min-width: 160px;
    }

    @keyframes tooltip-up {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .user-tooltip-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
    }

    .user-tooltip-id {
        font-size: 10px;
        color: var(--text-muted);
        font-family: var(--font-mono);
        margin-bottom: 10px;
    }

    .user-logout-btn {
        width: 100%;
        padding: 7px 10px;
        border-radius: 6px;
        border: 1px solid rgba(224, 62, 62, 0.3);
        background: transparent;
        color: var(--error);
        font-size: 11px;
        font-family: var(--font-sans);
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
        font-weight: 500;
    }

    .user-logout-btn:hover {
        background: rgba(224, 62, 62, 0.1);
        border-color: var(--error);
    }
`

function TgBadge() {
    return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 11.5L17 7L14.5 18L10.5 14.5L8 16.5L8.5 13L15 8.5L8 12.5L5.5 11.5Z" fill="white"/>
        </svg>
    )
}

function UserProfile({ user, onLogout }) {
    const [showTooltip, setShowTooltip] = useState(false)

    const isAdmin = user?.isAdmin === true
    const hasAccess = user?.isCexCexPaid === true
    const initial = (user?.login || 'U').charAt(0).toUpperCase()

    // Определяем бейдж
    let badgeClass, badgeText
    if (isAdmin) {
        badgeClass = 'admin'
        badgeText = 'Админ'
    } else if (hasAccess) {
        badgeClass = 'access'
        badgeText = 'Доступ есть'
    } else {
        badgeClass = 'no-access'
        badgeText = 'Нет доступа'
    }

    function handleLogout() {
        clearSession()
        setShowTooltip(false)
        onLogout?.()
    }

    return (
        <>
            <style>{style}</style>
            <div
                className="user-profile"
                onClick={() => setShowTooltip(v => !v)}
                title={user?.login}
            >
                {/* Аватар */}
                <div className="user-avatar">
                    {user?.photoUrl
                        ? <img src={user.photoUrl} alt={user.login} onError={e => { e.target.style.display = 'none' }} />
                        : initial
                    }
                    <div className="user-avatar-tg"><TgBadge /></div>
                </div>

                {/* Имя и статус */}
                <div className="user-info">
                    <div className="user-name">{user?.login || 'Пользователь'}</div>
                    <div className={`user-badge ${badgeClass}`}>
                        <div className="user-badge-dot" />
                        {badgeText}
                    </div>
                </div>

                {/* Тултип */}
                {showTooltip && (
                    <div className="user-tooltip" onClick={e => e.stopPropagation()}>
                        <div className="user-tooltip-name">{user?.login}</div>
                        <div className="user-tooltip-id">ID: {user?.userId}</div>
                        <button className="user-logout-btn" onClick={handleLogout}>
                            Выйти из аккаунта
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default UserProfile