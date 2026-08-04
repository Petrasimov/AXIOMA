/**
 * useTrainingProgress.js — прогресс обучения + вычисление статуса пользователя
 *
 * ─── Модель прогресса ───────────────────────────────────────────────────────
 * Обучение ПОСЛЕДОВАТЕЛЬНОЕ: уроки проходятся строго по порядку, от первого
 * к последнему через все модули. Поэтому весь прогресс — это одно число:
 * сколько уроков пройдено подряд с начала (0..27).
 *
 * Из этого числа выводится всё остальное:
 *   - какие уроки пройдены      → globalIndex < doneCount
 *   - какой урок доступен       → globalIndex <= doneCount
 *   - сколько модулей завершено → накопительная сумма уроков по модулям
 *   - статус пользователя       → пороги STATUS_TIERS
 *
 * ─── Источник данных ────────────────────────────────────────────────────────
 * Основной источник — поле Training из userSettings (бэкенд, 0..27).
 * Передаётся параметром trainingCount. Пока эндпоинт не готов, хук работает
 * на localStorage — при появлении бэкенда достаточно передать число, и
 * localStorage перестанет использоваться. UI менять не нужно.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'axioma_training_progress_v1'

// ─── Пороги статусов ────────────────────────────────────────────────────────
// minModules — основной критерий (на нём построен UI страницы Training).
// minLessons — производное значение по накопительной сумме уроков: 4/8/14/17/23/27.
export const STATUS_TIERS = [
    { id: 'novice', label: 'Новичок', color: '#6a8fa8', minModules: 0, minLessons: 0 },
    { id: 'trader', label: 'Трейдер', color: '#3d87c0', minModules: 1, minLessons: 4 },
    { id: 'expert', label: 'Эксперт', color: '#00c97a', minModules: 3, minLessons: 14 },
    { id: 'master', label: 'Мастер',  color: '#f0a500', minModules: 5, minLessons: 23 },
]

// ─── Чтение/запись localStorage (fallback до появления бэкенда) ─────────────
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
 * Плоский список уроков в порядке прохождения.
 * globalIndex — сквозной номер урока через все модули (0..26).
 */
function flattenLessons(modules) {
    const flat = []
    const list = Array.isArray(modules) ? modules : []
    list.forEach((mod, moduleIndex) => {
        const lessons = mod?.lessons ?? []
        lessons.forEach((lesson, lessonIndex) => {
            flat.push({
                id: lesson?.id,
                moduleId: mod?.id,
                moduleIndex,
                lessonIndex,
                globalIndex: flat.length,
            })
        })
    })
    return flat
}

/**
 * @param {Array}  modules — модули из trainingContent
 * @param {Object} options
 * @param {number|null}   options.trainingCount     — число пройденных уроков из бэкенда
 *                                                    (userSettings.Training). null → localStorage
 * @param {Function|null} options.onLessonComplete  — вызывается при завершении урока;
 *                                                    сюда подключится запрос к бэкенду
 */
export function useTrainingProgress(modules, { trainingCount = null, onLessonComplete = null } = {}) {
    const [completed, setCompleted] = useState(loadCompleted)

    const usingBackend = typeof trainingCount === 'number'

    // синхронизация между вкладками браузера (только в localStorage-режиме)
    useEffect(() => {
        if (usingBackend) return
        const onStorage = (e) => {
            if (e?.key === STORAGE_KEY) setCompleted(loadCompleted())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [usingBackend])

    const flat = useMemo(() => flattenLessons(modules), [modules])

    // Индекс урока по его id — для быстрых проверок доступности
    const indexById = useMemo(() => {
        const map = {}
        flat.forEach(l => { if (l.id) map[l.id] = l.globalIndex })
        return map
    }, [flat])

    // ─── Сколько уроков пройдено ────────────────────────────────────────────
    // В режиме бэкенда — число оттуда.
    // В localStorage-режиме считаем длину непрерывной цепочки с начала:
    // если в старых данных есть «дырки» (уроки проходились вразнобой до
    // введения последовательного режима), всё что после разрыва не учитывается.
    const doneCount = useMemo(() => {
        if (usingBackend) {
            return Math.max(0, Math.min(trainingCount, flat.length))
        }
        let n = 0
        for (const l of flat) {
            if (completed?.[l.id] === true) n++
            else break
        }
        return n
    }, [usingBackend, trainingCount, completed, flat])

    // ─── Доступность ────────────────────────────────────────────────────────
    const isLessonDone = useCallback(
        (lessonId) => {
            const idx = indexById[lessonId]
            return typeof idx === 'number' && idx < doneCount
        },
        [indexById, doneCount],
    )

    // Доступны все пройденные уроки + один следующий за ними
    const isLessonUnlocked = useCallback(
        (lessonId) => {
            const idx = indexById[lessonId]
            return typeof idx === 'number' && idx <= doneCount
        },
        [indexById, doneCount],
    )

    // Урок, на котором пользователь сейчас остановился (первый непройденный)
    const currentLessonIndex = doneCount

    // ─── Отметка урока пройденным ───────────────────────────────────────────
    // Только текущий урок и только в одну сторону: снять отметку нельзя.
    const markLesson = useCallback((lessonId) => {
        const idx = indexById[lessonId]
        if (typeof idx !== 'number') return false
        // Уже пройден или ещё не дошли до него — игнорируем
        if (idx !== doneCount) return false

        // Локальное оптимистичное обновление (оно же fallback без бэкенда)
        setCompleted(prev => {
            const nextMap = { ...prev, [lessonId]: true }
            saveCompleted(nextMap)
            return nextMap
        })

        // Сюда подключится запрос к бэкенду (Training += 1)
        onLessonComplete?.(lessonId, idx + 1)
        return true
    }, [indexById, doneCount, onLessonComplete])

    const resetProgress = useCallback(() => {
        saveCompleted({})
        setCompleted({})
    }, [])

    // ─── Производный объект прогресса ───────────────────────────────────────
    const progress = useMemo(() => {
        const list = Array.isArray(modules) ? modules : []

        let acc = 0                 // накопительная сумма уроков по модулям
        let doneModules = 0
        let hasLocked = false
        const perModule = {}

        list.forEach(mod => {
            const lessons = mod?.lessons ?? []
            const modTotal = lessons.length
            const startIdx = acc
            acc += modTotal

            // Сколько уроков этого модуля попало в пройденную цепочку
            const modDone = Math.max(0, Math.min(modTotal, doneCount - startIdx))
            const complete = modTotal > 0 && modDone === modTotal
            if (complete) doneModules++

            // Модуль открыт, если доступен хотя бы его первый урок.
            // Первый модуль (startIdx === 0) открыт всегда.
            const unlocked = startIdx <= doneCount
            if (!unlocked) hasLocked = true

            perModule[mod.id] = {
                total: modTotal,
                done: modDone,
                pct: modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0,
                complete,
                unlocked,
                startIndex: startIdx,
            }
        })

        const totalLessons = acc
        const { current, next } = resolveStatus(doneModules)
        const modulesToNext = next ? Math.max(0, next.minModules - doneModules) : 0

        return {
            completedLessons: doneCount,
            totalLessons,
            completedModules: doneModules,
            totalModules: list.length,
            progressPct: totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0,
            currentStatus: current,
            nextStatus: next,
            modulesToNext,
            perModule,
            // Сквозной номер урока, на котором пользователь остановился
            currentLessonIndex,
            hasLockedModules: hasLocked,
        }
    }, [modules, doneCount, currentLessonIndex])

    // Открыт ли модуль по id — обёртка над perModule для компонентов
    const isModuleUnlocked = useCallback(
        (moduleId) => progress.perModule?.[moduleId]?.unlocked === true,
        [progress],
    )

    return {
        progress,
        isLessonDone,
        isLessonUnlocked,
        isModuleUnlocked,
        markLesson,
        resetProgress,
    }
}