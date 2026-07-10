/**
 * useTrainingProgress.js — прогресс обучения + вычисление статуса пользователя
 *
 * Хранит завершённые уроки в localStorage. Структура намеренно сделана так,
 * чтобы при переносе на бэкенд менялся ТОЛЬКО источник данных (load/save),
 * а весь UI и логика вычисления статуса остались без изменений.
 *
 * Возвращаемый объект прогресса (progress) — единый источник правды и для
 * страницы Training, и для будущей модалки профиля пользователя.
 *
 * Статусы (по числу полностью пройденных модулей):
 *   0 модулей   → Новичок  (novice)
 *   1-2 модуля  → Трейдер  (trader)
 *   3-4 модуля  → Эксперт  (expert)
 *   5-6 модулей → Мастер   (master)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'axioma_training_progress_v1'

// ─── Пороги статусов (модулей пройдено → статус) ───────────────────────────
export const STATUS_TIERS = [
    { id: 'novice', label: 'Новичок', color: '#6a8fa8', minModules: 0 },
    { id: 'trader', label: 'Трейдер', color: '#3d87c0', minModules: 1 },
    { id: 'expert', label: 'Эксперт', color: '#00c97a', minModules: 3 },
    { id: 'master', label: 'Мастер',  color: '#f0a500', minModules: 5 },
]

// ─── Чтение/запись (единственное место, зависящее от источника) ────────────
function loadCompleted() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
        return {}
    }
}

function saveCompleted(map) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {
        // storage недоступен — молча продолжаем, прогресс не критичен для работы
    }
}

// ─── Определение статуса по числу пройденных модулей ───────────────────────
export function resolveStatus(completedModulesCount) {
    let current = STATUS_TIERS[0]
    for (const tier of STATUS_TIERS) {
        if (completedModulesCount >= tier.minModules) current = tier
    }
    const idx = STATUS_TIERS.findIndex(t => t.id === current.id)
    const next = STATUS_TIERS[idx + 1] ?? null
    return { current, next, tierIndex: idx }
}

/**
 * @param {Array} modules — массив модулей из trainingContent (нужен для подсчёта
 *                          общего числа уроков и определения «модуль пройден»)
 */
export function useTrainingProgress(modules) {
    const [completed, setCompleted] = useState(loadCompleted)

    // синхронизация между вкладками браузера
    useEffect(() => {
        const onStorage = (e) => {
            if (e?.key === STORAGE_KEY) setCompleted(loadCompleted())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    const isLessonDone = useCallback(
        (lessonId) => completed?.[lessonId] === true,
        [completed]
    )

    const markLesson = useCallback((lessonId, done = true) => {
        setCompleted(prev => {
            const nextMap = { ...prev }
            if (done) nextMap[lessonId] = true
            else delete nextMap[lessonId]
            saveCompleted(nextMap)
            return nextMap
        })
    }, [])

    const resetProgress = useCallback(() => {
        saveCompleted({})
        setCompleted({})
    }, [])

    // ─── Производный объект прогресса (для UI и будущей модалки профиля) ───
    const progress = useMemo(() => {
        const list = Array.isArray(modules) ? modules : []

        let totalLessons = 0
        let doneLessons = 0
        let doneModules = 0

        const perModule = {}

        list.forEach(mod => {
            const lessons = mod?.lessons ?? []
            const modTotal = lessons.length
            const modDone = lessons.filter(l => completed?.[l?.id] === true).length

            totalLessons += modTotal
            doneLessons += modDone
            if (modTotal > 0 && modDone === modTotal) doneModules++

            perModule[mod.id] = {
                total: modTotal,
                done: modDone,
                pct: modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0,
                complete: modTotal > 0 && modDone === modTotal,
            }
        })

        const { current, next } = resolveStatus(doneModules)
        const modulesToNext = next ? Math.max(0, next.minModules - doneModules) : 0

        return {
            completedLessons: doneLessons,
            totalLessons,
            completedModules: doneModules,
            totalModules: list.length,
            progressPct: totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0,
            currentStatus: current,
            nextStatus: next,
            modulesToNext,
            perModule,
        }
    }, [modules, completed])

    return { progress, isLessonDone, markLesson, resetProgress }
}