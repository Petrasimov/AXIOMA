/**
 * payments.js — клиентские вызовы платёжного API (NOWPayments через наш бэкенд).
 *
 * Ключ NOWPayments и IPN-секрет живут ТОЛЬКО на бэкенде. Фронт умеет ровно две
 * вещи: инициировать инвойс и опрашивать статус — оба вызова по cookie
 * AxionScan.Auth. Факт оплаты — источник правды на сервере (вебхук finished),
 * фронт лишь спрашивает «выдан ли доступ».
 */

import { aLog } from './api.js'

// Base URL: в проде Nginx проксирует /api на C#, в dev — Vite proxy /backend.
const API_BASE = import.meta.env.PROD ? '' : '/backend'

// ── Создание инвойса на подписку ──────────────────────────────────────────────
// Тариф ($5/мес), сети и параметры (is_fixed_rate / is_fee_paid_by_user) задаёт
// бэкенд. Фронт НИЧЕГО про цену не передаёт — защита от подмены суммы.
//   выход: { ok: true,  invoiceUrl }              — редиректим на invoice_url NOWPayments
//          { ok: false, reason: 'unauthorized' }  — 401: нет сессии
//          { ok: false, reason: 'error' }         — 5xx / ответ без invoiceUrl
//          { ok: false, reason: 'network_error' } — сеть недоступна
export async function createInvoice() {
    aLog('log', '[PAY] createInvoice → POST /api/pay/invoice')
    try {
        const res = await fetch(`${API_BASE}/api/pay/invoice`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })

        if (res.status === 401) return { ok: false, reason: 'unauthorized' }
        if (!res.ok)            return { ok: false, reason: 'error' }

        const data = await res.json()
        // Бэк может отдать camelCase или snake_case — принимаем оба.
        const invoiceUrl = data?.invoiceUrl ?? data?.invoice_url ?? null
        if (!invoiceUrl) {
            aLog('error', '[PAY] createInvoice → ответ без invoiceUrl')
            return { ok: false, reason: 'error' }
        }

        aLog('success', '[PAY] createInvoice ✅ invoiceUrl получен')
        return { ok: true, invoiceUrl }
    } catch (err) {
        aLog('error', `[PAY] createInvoice ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'network_error' }
    }
}

// ── Текущий платёжный статус пользователя ─────────────────────────────────────
// Cookie-auth, без id платежа — сервер знает пользователя. Доступ выдаётся
// вебхуком finished; страница успеха опрашивает этот эндпоинт, пока не увидит
// isCexCexPaid === true.
//   выход: { ok: true,  isCexCexPaid, paidUntil, status }
//          { ok: false, reason: 'unauthorized' | 'error' | 'network_error' }
export async function getPaymentStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/pay/status`, {
            credentials: 'include',
        })

        if (res.status === 401) return { ok: false, reason: 'unauthorized' }
        if (!res.ok)            return { ok: false, reason: 'error' }

        const data = await res.json()
        return {
            ok: true,
            isCexCexPaid: data?.isCexCexPaid ?? false,
            paidUntil:    data?.paidUntil ?? null,
            status:       data?.paymentStatus ?? data?.status ?? null,
        }
    } catch (err) {
        aLog('error', `[PAY] getPaymentStatus ❌ сетевая ошибка: ${err.message}`)
        return { ok: false, reason: 'network_error' }
    }
}