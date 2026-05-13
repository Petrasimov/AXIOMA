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
    // ════════════════════════════════════════════════════
    // ШАГ 1 — Проверка доступа
    const t0 = performance.now()
    console.group('%c[ШАГ 1] Проверка доступа', 'color:#3d87c0;font-weight:bold')
    console.log(`[ШАГ 1] userId=${userId} | источник: user.json`)
    // ════════════════════════════════════════════════════
    try {
        const res = await fetch('/user.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()

        if (String(data.userId) !== String(userId)) {
            console.warn(`[ШАГ 1] ❌ userId не совпал: ожидали ${userId}, получили ${data.userId}`)
            console.groupEnd()
            return { found: false }
        }

        const result = {
            found:        true,
            userId:       data.userId,
            login:        data.login,
            isCexCexPaid: data.isCexCexPaid  ?? false,
            isDexCexPaid: data.isDexCexPaid  ?? false,
            isAdmin:      data.isAdmin       ?? false,
            isActive:     data.isActive      ?? true,
            userSettings: data.userSettings  ?? null,
        }

        const t1 = performance.now()
        console.log(`[ШАГ 1] ✅ Доступ: isCexCexPaid=${result.isCexCexPaid} | isAdmin=${result.isAdmin} | login=${result.login}`)
        console.log(`[ШАГ 1] ⏱ Время: ${(t1 - t0).toFixed(0)}мс`)
        console.groupEnd()
        return result
    } catch (err) {
        console.error('[ШАГ 1] ❌ Ошибка:', err)
        console.groupEnd()
        return null
    }
}

export async function saveUserSettings(userId, settings) {
    try {
        const res = await fetch('/user.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()

        const updated = {
            ...data,
            userSettings: {
                exchanges:   settings.exchanges,
                minSpread:   settings.minSpread,
                tradeAmount: settings.tradeAmount,
                strategy:    settings.strategy,
                funding:     settings.funding,
                transfer:    settings.transfer,
            }
        }

        // Пока бэк не готов — сохраняем в localStorage как резервную копию
        try {
            localStorage.setItem('savedUserSettings', JSON.stringify(updated.userSettings))
            console.log('[auth] saveUserSettings → localStorage (mock until backend ready)')
        } catch {}

        return true
    } catch (err) {
        console.error('[auth] saveUserSettings error:', err)
        return false
    }
}

// ─── Регистрация нового пользователя ─────────────────────────────────────────
// TODO: заменить на POST /api/users

export async function registerUser(tgData) {
    try {
        const res = await fetch('/backend/api/auth/telegram', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tgData),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        return {
            found:        true,
            userId:       data.userId,
            login:        data.login,
            isCexCexPaid: data.isCexCexPaid  ?? false,
            isDexCexPaid: data.isDexCexPaid  ?? false,
            isAdmin:      data.isAdmin       ?? false,
            isActive:     data.isActive      ?? true,
            userSettings: data.userSettings  ?? null,
            photoUrl:     tgData.photo_url   ?? null,
        }
    } catch (err) {
        console.error('[auth] registerUser error:', err)
        return null
    }
}