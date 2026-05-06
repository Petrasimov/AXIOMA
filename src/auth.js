/**
 * auth.js — Логика авторизации
 *
 * Telegram Widget монтируется прямо в DOM через TelegramAuthModal.
 * Здесь только: сессия, checkAccess, registerUser.
 *
 * TODO при подключении бэкенда:
 *   checkAccess  → fetch(`/api/users/${userId}`)
 *   registerUser → POST /api/users
 */

const SESSION_KEY = 'axioma_auth_session'

// ─── Сессия ─────────────────────────────────────────────────────────────────

export function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function saveSession(userData) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    } catch {}
}

export function clearSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY)
    } catch {}
}

// ─── Проверка доступа ────────────────────────────────────────────────────────
// TODO: заменить на fetch(`/api/users/${userId}`)

export async function checkAccess(userId) {
    try {
        const res = await fetch('/AuthResponse.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()

        if (data.userId === userId) {
            return {
                found: true,
                userId: data.userId,
                login: data.login,
                isCexCexPaid: data.isCexCexPaid,
                isDexCexPaid: data.isDexCexPaid,
                isAdmin: data.isAdmin,
                isActive: data.isActive,
            }
        }

        return { found: false }
    } catch (err) {
        console.error('[auth] checkAccess error:', err)
        return null
    }
}

// ─── Регистрация нового пользователя ─────────────────────────────────────────
// TODO: заменить на POST /api/users

export async function registerUser(userId, username, photoUrl) {
    const newUser = {
        found: true,
        userId,
        login: username,
        photoUrl: photoUrl || null,
        isCexCexPaid: false,
        isDexCexPaid: false,
        isAdmin: false,
        isActive: true,
    }
    console.log('[auth] registerUser (mock):', newUser)
    return newUser
}