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

// ─── Билдер объекта сессии из AuthResponse ───────────────────────────────────
// Единая точка сборки user-объекта для парольного входа и регистрации, чтобы
// форма сессии совпадала с той, что кладёт authenticateWithTelegram.
//   вход:  data — тело AuthResponse от бэкенда (может быть null при пустом теле)
//   выход: объект пользователя для saveSession / sessionStorage
//   побочных эффектов нет
function buildUserFromAuthResponse(data) {
    return {
        userId:       data?.userId,
        login:        data?.login        ?? null,
        // У парольного аккаунта нет Telegram-username — для отображения используем login.
        username:     data?.login        ?? null,
        isCexCexPaid: data?.isCexCexPaid ?? false,
        isDexCexPaid: data?.isDexCexPaid ?? false,
        isAdmin:      data?.isAdmin      ?? false,
        isActive:     data?.isActive     ?? true,
        userSettings: data?.userSettings ?? null,
        photoUrl:     null,
    }
}

// ─── Вход по логину и паролю ──────────────────────────────────────────────────
// POST /api/auth/login { login, password } → cookie AxionScan.Auth + AuthResponse.
// Возвращает ту же форму, что authenticateWithTelegram, чтобы модалка обрабатывала
// оба пути входа одинаково.
//   вход:  login, password — строки из формы
//   выход: { ok: true,  user }                        — вход выполнен, сессия готова
//          { ok: false, reason: 'invalid_credentials'}— 401: неверные данные / доступ отключён
//          { ok: false, reason: 'error' }             — 5xx / некорректный ответ
//          { ok: false, reason: 'network_error' }     — сеть недоступна
// ⚠️ Пароль НИКОГДА не логируется — ни в console, ни в aLog.
export async function loginWithPassword(login, password) {
    aLog('log', `[AUTH] loginWithPassword → login=${login}`) // пароль сознательно не логируем
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
        })

        if (res.status === 401) {
            aLog('warn', `[AUTH] loginWithPassword → 401 неверные данные / доступ отключён`)
            return { ok: false, reason: 'invalid_credentials' }
        }
        if (!res.ok) {
            aLog('error', `[AUTH] loginWithPassword → HTTP ${res.status}`)
            return { ok: false, reason: 'error' }
        }

        const data = await res.json()
        aLog('success', `[AUTH] loginWithPassword ✅ userId=${data?.userId} login=${data?.login}`)
        return { ok: true, user: buildUserFromAuthResponse(data) }
    } catch (err) {
        aLog('error', `[AUTH] loginWithPassword ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'network_error' }
    }
}

// ─── Регистрация по логину и паролю ───────────────────────────────────────────
// POST /api/auth/register { login, password } → cookie + AuthResponse (self-serve).
// ⚠️ КОНТРАКТ ФАЗЫ 2: текущий бэк ещё требует userId и whitelist и вернёт 403,
//    пока Слава не откроет регистрацию (создание аккаунта без заранее известного
//    Telegram-id) и не начнёт возвращать AuthResponse (обязательно с userId —
//    иначе фронт не построит сессию). До этого функция рабочая, но на проде даст
//    'forbidden'.
//   вход:  login, password — строки из формы
//   выход: { ok: true,  user }                      — аккаунт создан, сессия готова
//          { ok: false, reason: 'bad_request' }     — 400: не передан логин/пароль
//          { ok: false, reason: 'forbidden' }       — 403: регистрация закрыта (whitelist)
//          { ok: false, reason: 'conflict' }        — 409: логин уже занят
//          { ok: false, reason: 'error' }           — 5xx / некорректный ответ
//          { ok: false, reason: 'network_error' }   — сеть недоступна
// ⚠️ Пароль НИКОГДА не логируется.
export async function registerAccount(login, password) {
    aLog('log', `[AUTH] registerAccount → login=${login}`) // пароль сознательно не логируем
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
        })

        if (res.status === 400) return regFail('bad_request', 400)
        if (res.status === 403) return regFail('forbidden', 403)
        if (res.status === 409) return regFail('conflict', 409)
        if (!res.ok)            return regFail('error', res.status)

        // 200 — аккаунт создан, cookie установлена. Тело может содержать AuthResponse.
        let data = null
        try { data = await res.json() } catch { /* бэк может вернуть пустое тело */ }
        aLog('success', `[AUTH] registerAccount ✅ login=${login}`)
        return { ok: true, user: buildUserFromAuthResponse(data ?? { login }) }
    } catch (err) {
        aLog('error', `[AUTH] registerAccount ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'network_error' }
    }
}

// Внутренний хелпер: лог неуспеха регистрации без дублирования кода.
//   вход:  reason — код причины для UI; status — HTTP статус для лога
//   выход: { ok: false, reason }
function regFail(reason, status) {
    aLog('warn', `[AUTH] registerAccount → HTTP ${status} reason=${reason}`)
    return { ok: false, reason }
}

// ─── Хелпер: только пришедшие поля AuthResponse ───────────────────────────────
// Для эндпоинтов линковки/установки пароля возвращаем лишь реально пришедшие поля
// (undefined App отбросит при merge), чтобы не затирать username/photoUrl/login
// существующей сессии.
function pickAuthResponse(data) {
    const out = {}
    if (!data) return out
    const keys = ['userId', 'login', 'isCexCexPaid', 'isDexCexPaid', 'isAdmin', 'isActive', 'userSettings', 'hasTelegram', 'hasPassword']
    for (const k of keys) {
        if (data[k] !== undefined) out[k] = data[k]
    }
    return out
}

// ─── Привязка Telegram к текущему аккаунту ────────────────────────────────────
// POST /api/auth/link-telegram (cookie-auth) — тело = данные Telegram-виджета.
// Цепляет TelegramUserId к залогиненному аккаунту (включает восстановление
// пароля через бота).
//   вход:  tgData — объект от Telegram Login Widget (snake_case)
//   выход: { ok: true,  user }                    — поля для обновления сессии
//          { ok: false, reason: 'conflict' }      — 409: Telegram уже привязан к другому аккаунту
//          { ok: false, reason: 'unauthorized' }  — 401: нет сессии
//          { ok: false, reason: 'error' }         — 5xx / некорректный ответ
//          { ok: false, reason: 'network_error' } — сеть недоступна
export async function linkTelegram(tgData) {
    const payload = {
        id:        tgData.id,
        firstName: tgData.first_name ?? null,
        lastName:  tgData.last_name  ?? null,
        username:  tgData.username   ?? null,
        photoUrl:  tgData.photo_url  ?? null,
        authDate:  tgData.auth_date,
        hash:      tgData.hash,
    }
    aLog('log', '[AUTH] linkTelegram → POST /api/auth/link-telegram')
    try {
        const res = await fetch(`${API_BASE}/api/auth/link-telegram`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (res.status === 401) return { ok: false, reason: 'unauthorized' }
        if (res.status === 409) return { ok: false, reason: 'conflict' }
        if (!res.ok)            return { ok: false, reason: 'error' }

        let data = null
        try { data = await res.json() } catch { /* тело может быть пустым */ }
        aLog('success', '[AUTH] linkTelegram ✅ Telegram привязан')
        // username/photoUrl в AuthResponse нет — берём из tgData, чтобы после
        // привязки показать ник и аватар.
        return {
            ok: true,
            user: {
                ...pickAuthResponse(data),
                username:    tgData.username  ?? undefined,
                photoUrl:    tgData.photo_url ?? undefined,
                hasTelegram: true,
            },
        }
    } catch (err) {
        aLog('error', `[AUTH] linkTelegram ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'network_error' }
    }
}

// ─── Установка логина и пароля текущему аккаунту ──────────────────────────────
// POST /api/auth/set-credentials (cookie-auth) — добавляет парольный вход
// (когда пароля ещё нет; смена пароля — через бота).
//   вход:  login, password — строки из формы профиля
//   выход: { ok: true,  user }                    — поля для обновления сессии
//          { ok: false, reason: 'conflict' }      — 409: логин занят
//          { ok: false, reason: 'bad_request' }   — 400: не передан логин/пароль
//          { ok: false, reason: 'unauthorized' }  — 401: нет сессии
//          { ok: false, reason: 'error' }         — 5xx / некорректный ответ
//          { ok: false, reason: 'network_error' } — сеть недоступна
// ⚠️ Пароль НИКОГДА не логируется.
export async function setCredentials(login, password) {
    aLog('log', `[AUTH] setCredentials → login=${login}`) // пароль сознательно не логируем
    try {
        const res = await fetch(`${API_BASE}/api/auth/set-credentials`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
        })

        if (res.status === 401) return { ok: false, reason: 'unauthorized' }
        if (res.status === 400) return { ok: false, reason: 'bad_request' }
        if (res.status === 409) return { ok: false, reason: 'conflict' }
        if (!res.ok)            return { ok: false, reason: 'error' }

        let data = null
        try { data = await res.json() } catch { /* тело может быть пустым */ }
        aLog('success', '[AUTH] setCredentials ✅ логин/пароль заданы')
        return {
            ok: true,
            user: {
                ...pickAuthResponse(data),
                // если бэк не вернул login — подставим введённый, чтобы UI обновился
                login: data?.login ?? login,
                hasPassword: true,
            },
        }
    } catch (err) {
        aLog('error', `[AUTH] setCredentials ❌ сетевая ошибка: ${err.message}`)
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