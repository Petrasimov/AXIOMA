/**
 * auth.js — Логика авторизации
 *
 * Первый вход:  POST /backend/api/auth/telegram
 *               Telegram Widget данные конвертируются snake_case → camelCase
 *               Бэкенд проверяет hash, устанавливает HTTP-only cookie AxionScan.Auth
 *               Сессия сохраняется в sessionStorage
 *
 * Проверка сессии (каждые 60с):
 *               GET /backend/api/analysis/order-books-json с credentials:'include'
 *               200 → cookie жива → данные из sessionStorage
 *               401 → cookie истекла → clearSession → показываем TelegramAuthModal
 *               Telegram hash НЕ отправляется повторно (валиден только ~60 секунд)
 */

const SESSION_KEY = 'axioma_auth_session'

import { aLog } from './api.js'

// ─── Base URL для API запросов ────────────────────────────────────────────────
// Dev:        Vite proxy — /backend → localhost:5000
// Production: Nginx → бэкенд на том же домене, /backend уже не нужен
//             Все запросы /api/... напрямую через Nginx
const API_BASE = import.meta.env.PROD
    ? ''          // в production: /api/auth/telegram (Nginx проксирует на C#)
    : '/backend'  // в dev: /backend/api/auth/telegram (Vite proxy)

// ─── Сессия ─────────────────────────────────────────────────────────────────

export function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY)
        const session = raw ? JSON.parse(raw) : null
        // Лог результата loadSession — найдена или нет, userId и login
        if (session) {
            aLog('log', `[AUTH] loadSession → найдена: userId=${session.userId} login=${session.login} isCexCexPaid=${session.isCexCexPaid} isAdmin=${session.isAdmin}`)
        } else {
            aLog('log', `[AUTH] loadSession → сессия отсутствует в sessionStorage`)
        }
        return session
    } catch {
        aLog('error', `[AUTH] loadSession → ошибка чтения sessionStorage`)
        return null
    }
}

export function saveSession(userData) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData))
        // Лог сохранения сессии — ключевые поля
        aLog('log', `[AUTH] saveSession → userId=${userData.userId} login=${userData.login} isCexCexPaid=${userData.isCexCexPaid} isAdmin=${userData.isAdmin}`)
    } catch {
        aLog('error', `[AUTH] saveSession → ошибка записи в sessionStorage`)
    }
}

export function clearSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY)
        // Лог очистки сессии
        aLog('warn', `[AUTH] clearSession → сессия очищена из sessionStorage`)
    } catch {
        aLog('error', `[AUTH] clearSession → ошибка удаления из sessionStorage`)
    }
}

// ─── Авторизация через Telegram ──────────────────────────────────────────────
// Вызывается из TelegramAuthModal после получения данных от виджета
// Бэкенд проверяет hash, устанавливает cookie и возвращает данные пользователя

export async function authenticateWithTelegram(tgData) {
    console.group('%c[AUTH] authenticateWithTelegram', 'color:#2AABEE;font-weight:bold')
    console.log('[AUTH] tgData от виджета (snake_case):', JSON.stringify(tgData))

    // Telegram Widget возвращает snake_case, бэкенд ожидает camelCase
    const payload = {
        id:        tgData.id,
        firstName: tgData.first_name  ?? null,
        lastName:  tgData.last_name   ?? null,
        username:  tgData.username    ?? null,
        photoUrl:  tgData.photo_url   ?? null,
        authDate:  tgData.auth_date,
        hash:      tgData.hash,
    }

    console.log('[AUTH] payload для бэкенда (camelCase):', JSON.stringify(payload))
    try {
        const res = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        console.log(`[AUTH] Ответ бэкенда: HTTP ${res.status}`)

        if (res.status === 401) {
            // Читаем тело 401 — бэкенд может объяснить причину
            let body = null
            try { body = await res.text() } catch {}
            console.warn('[AUTH] 401 Unauthorized | тело ответа:', body)
            console.groupEnd()
            return { ok: false, reason: 'unauthorized' }
        }

        if (!res.ok) {
            let body = null
            try { body = await res.text() } catch {}
            console.warn(`[AUTH] HTTP ${res.status} | тело:`, body)
            console.groupEnd()
            return { ok: false, reason: 'server_error' }
        }

        const data = await res.json()
        console.log('[AUTH] ✅ Успех | ответ:', JSON.stringify(data))
        console.groupEnd()

        return {
            ok: true,
            user: {
                userId:       data.userId,
                login:        data.login        ?? tgData.username ?? null,
                // Явное поле username — берём напрямую из Telegram-виджета.
                // Раньше ник попадал в сессию только неявно через login
                // (login = data.login ?? tgData.username), и если бэкенд
                // когда-нибудь вернёт в data.login что-то своё — ник потерялся бы.
                // Теперь он хранится отдельно и не зависит от того, что придёт с бэкенда.
                username:     tgData.username    ?? null,
                isCexCexPaid: data.isCexCexPaid ?? false,
                isDexCexPaid: data.isDexCexPaid ?? false,
                isAdmin:      data.isAdmin      ?? false,
                isActive:     data.isActive     ?? true,
                userSettings: data.userSettings ?? null,
                photoUrl:     tgData.photo_url  ?? null,
            }
        }
    } catch (err) {
        console.error('[AUTH] ❌ Сетевая ошибка:', err.message)
        console.groupEnd()
        return { ok: false, reason: 'network_error' }
    }
}

// ─── Проверка доступа (каждые 60с и при старте) ──────────────────────────────
// Проверяем cookie через защищённый эндпоинт /order-books-json
// Telegram hash НЕ отправляем повторно — он валиден только ~60 секунд
//   200 → cookie жива → берём данные из sessionStorage
//   401 → cookie истекла → разлогиниваем
//   5xx / сеть → пропускаем цикл (не разлогиниваем)

export async function checkAccess(userId) {
    // ════════════════════════════════════════════════════
    // ШАГ 1 — Проверка доступа
    const t0 = performance.now()
    console.group('%c[ШАГ 1] Проверка доступа', 'color:#3d87c0;font-weight:bold')
    console.log(`[ШАГ 1] userId=${userId} | проверка cookie через /order-books-json`)
    // ════════════════════════════════════════════════════
    try {
        const session = loadSession()
        if (!session) {
            console.warn('[ШАГ 1] ❌ Сессия не найдена в sessionStorage')
            console.groupEnd()
            return null
        }

        // Проверяем что cookie AxionScan.Auth жива
        // Тело ответа не читаем — нас интересует только HTTP статус
        const res = await fetch(`${API_BASE}/api/analysis/order-books-json`, {
            credentials: 'include',
        })

        console.log(`[ШАГ 1] Статус cookie: HTTP ${res.status}`)

        if (res.status === 401) {
            console.warn('[ШАГ 1] ❌ 401 — cookie истекла, требуется повторная авторизация')
            console.groupEnd()
            return { expired: true }
        }

        if (!res.ok) {
            console.warn(`[ШАГ 1] ⚠️ HTTP ${res.status} — ошибка сервера, пропускаем цикл`)
            console.groupEnd()
            return null
        }

        // Cookie жива — запрашиваем актуальные данные пользователя с бэкенда.
        // Используем PUT /api/user-settings с текущими настройками:
        // бэкенд возвращает актуальный AuthResponse (isAdmin, isCexCexPaid и т.д.)
        // Это единственный способ подхватить изменения статуса без повторной авторизации.
        let fresh = null
        try {
            const tPut = performance.now()
            // Лог старта запроса актуальных данных пользователя
            aLog('log', `[ШАГ 1] PUT /user-settings — запрашиваем актуальный AuthResponse`)
            const meRes = await fetch(`${API_BASE}/api/user-settings`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                // Отправляем пустой объект — бэкенд оставит настройки без изменений
                // и вернёт актуальный AuthResponse
                body: JSON.stringify({}),
            })
            if (meRes.ok) {
                fresh = await meRes.json()
                // Лог успешного получения актуальных данных — источник и время
                aLog('log', `[ШАГ 1] PUT /user-settings → HTTP ${meRes.status} | данные получены от сервера | ⏱ ${(performance.now() - tPut).toFixed(0)}мс`)
                aLog('log', `[ШАГ 1] fresh данные: isCexCexPaid=${fresh?.isCexCexPaid} isDexCexPaid=${fresh?.isDexCexPaid} isAdmin=${fresh?.isAdmin} isActive=${fresh?.isActive}`)
            } else {
                // Лог неудачного ответа — будем использовать данные из сессии
                aLog('warn', `[ШАГ 1] PUT /user-settings → HTTP ${meRes.status} — используем данные из sessionStorage`)
            }
        } catch {
            aLog('warn', `[ШАГ 1] PUT /user-settings → сетевая ошибка — используем данные из sessionStorage`)
        }

        const result = {
            found:        true,
            userId:       fresh?.userId       ?? session.userId,
            login:        fresh?.login        ?? session.login        ?? null,
            // username не приходит с бэкенда (fresh) — переносим из старой сессии,
            // чтобы явно сохранить его при обновлении, а не полагаться на то,
            // что spread в App.jsx не перезатрёт отсутствующим ключом.
            username:     session.username     ?? null,
            isCexCexPaid: fresh?.isCexCexPaid ?? session.isCexCexPaid ?? false,
            isDexCexPaid: fresh?.isDexCexPaid ?? session.isDexCexPaid ?? false,
            isAdmin:      fresh?.isAdmin      ?? session.isAdmin      ?? false,
            isActive:     fresh?.isActive     ?? session.isActive     ?? true,
            userSettings: fresh?.userSettings ?? session.userSettings ?? null,
        }

        // Лог источника итоговых данных — fresh с сервера или fallback из сессии
        aLog('log', `[ШАГ 1] Источник данных: ${fresh ? 'сервер (актуальные)' : 'sessionStorage (кэш)'}`)

        const t1 = performance.now()
        console.log(`[ШАГ 1] ✅ Cookie жива | isCexCexPaid=${result.isCexCexPaid} | isAdmin=${result.isAdmin} | login=${result.login}`)
        console.log(`[ШАГ 1] ⏱ Время: ${(t1 - t0).toFixed(0)}мс`)
        console.groupEnd()
        return result
    } catch (err) {
        console.error('[ШАГ 1] ❌ Ошибка сети:', err.message)
        console.groupEnd()
        return null
    }
}

// ─── Сохранение настроек пользователя ────────────────────────────────────────
// PUT /backend/api/user-settings с credentials:'include'
// Бэкенд сохраняет настройки в БД и возвращает актуальный AuthResponse
// После успеха обновляем sessionStorage — без перезагрузки страницы
//   { ok: true,  user: updatedUser }      — настройки сохранены
//   { ok: false, reason: 'unauthorized' } — cookie истекла
//   { ok: false, reason: 'error' }        — ошибка сервера / сети

export async function saveUserSettings(userId, settings) {
    const payload = {
        exchanges:   settings.exchanges,
        minSpread:   settings.minSpread,
        tradeAmount: settings.tradeAmount,
        strategy:    settings.strategy,
        funding:     settings.funding,
        transfer:    settings.transfer,
        // activeCoins — синхронизация activeTrades с БД (до 5 монет на пользователя)
        activeCoins: settings.activeCoins ?? [],
    }

    // Лог входа — userId и полный payload фильтров
    aLog('group', `[AUTH] saveUserSettings → userId=${userId}`)
    aLog('log', `[AUTH] payload: exchanges=[${payload.exchanges?.join(',')}] minSpread=${payload.minSpread} tradeAmount=${payload.tradeAmount}`)
    aLog('log', `[AUTH] payload: strategy=ff:${payload.strategy?.ff},sf:${payload.strategy?.sf} | funding=pos:${payload.funding?.positive},neg:${payload.funding?.negative} | transfer=dep:${payload.transfer?.deposit},wd:${payload.transfer?.withdraw}`)
    aLog('log', `[AUTH] payload: activeCoins=[${payload.activeCoins?.map(c => c.symbol).join(',') || 'пусто'}]`)

    try {
        const tSave = performance.now()
        const res = await fetch(`${API_BASE}/api/user-settings`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (res.status === 401) {
            // Лог истечения cookie при сохранении
            aLog('warn', `[AUTH] saveUserSettings → 401, cookie истекла, разлогиниваем`)
            console.warn('[auth] saveUserSettings → 401, cookie истекла')
            aLog('groupEnd')
            return { ok: false, reason: 'unauthorized' }
        }

        if (!res.ok) {
            // Лог ошибки сервера
            aLog('error', `[AUTH] saveUserSettings → HTTP ${res.status}`)
            console.warn(`[auth] saveUserSettings → HTTP ${res.status}`)
            aLog('groupEnd')
            return { ok: false, reason: 'error' }
        }

        const data = await res.json()
        const saveTime = (performance.now() - tSave).toFixed(0)
        // Лог успешного сохранения — обновлённые поля и время
        aLog('success', `[AUTH] saveUserSettings ✅ настройки сохранены | ⏱ ${saveTime}мс`)
        aLog('log', `[AUTH] обновлённые данные: isCexCexPaid=${data.isCexCexPaid} isAdmin=${data.isAdmin} login=${data.login}`)
        console.log('[auth] saveUserSettings ✅ настройки сохранены')

        // Формируем обновлённый объект пользователя из ответа бэкенда
        const session = loadSession()
        const updatedUser = {
            ...session,
            userId:       data.userId       ?? session?.userId,
            login:        data.login        ?? session?.login,
            isCexCexPaid: data.isCexCexPaid ?? session?.isCexCexPaid,
            isDexCexPaid: data.isDexCexPaid ?? session?.isDexCexPaid,
            isAdmin:      data.isAdmin      ?? session?.isAdmin,
            isActive:     data.isActive     ?? session?.isActive,
            userSettings: data.userSettings ?? session?.userSettings,
        }

        // Сохраняем обновлённую сессию
        saveSession(updatedUser)
        aLog('groupEnd')

        return { ok: true, user: updatedUser }

    } catch (err) {
        // Лог сетевой ошибки при сохранении настроек
        aLog('error', `[AUTH] saveUserSettings ❌ сетевая ошибка: ${err.message}`)
        console.error('[auth] saveUserSettings ❌ сетевая ошибка:', err.message)
        aLog('groupEnd')
        return { ok: false, reason: 'error' }
    }
}

// PUT /api/user-settings/notifications — включение/отключение Telegram уведомлений
// Меняет только поле ActiveNotifications, не трогает остальные настройки
//   { ok: true }                       — статус обновлён
//   { ok: false, reason: 'unauthorized' } — cookie истекла
//   { ok: false, reason: 'error' }        — ошибка сервера / сети
export async function toggleNotifications(active) {
    aLog('log', `[AUTH] toggleNotifications → active=${active}`)
    try {
        const res = await fetch(`${API_BASE}/api/user-settings/notifications`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active }),
        })

        if (res.status === 401) {
            aLog('warn', `[AUTH] toggleNotifications → 401, cookie истекла`)
            return { ok: false, reason: 'unauthorized' }
        }

        if (!res.ok) {
            aLog('error', `[AUTH] toggleNotifications → HTTP ${res.status}`)
            return { ok: false, reason: 'error' }
        }

        aLog('success', `[AUTH] toggleNotifications ✅ activeNotifications=${active}`)
        return { ok: true }

    } catch (err) {
        aLog('error', `[AUTH] toggleNotifications ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'error' }
    }
}