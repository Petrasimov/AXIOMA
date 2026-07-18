/**
 * TrainingPage.jsx — «Академия AXIOMA»
 *
 * Дашборд обучения: hero + панель статуса пользователя (ранг/прогресс) +
 * сетка модулей, сгруппированная по секциям. Клик по модулю открывает первый
 * незавершённый (или первый) урок в LessonModal.
 *
 * Прогресс/статусы приходят из useTrainingProgress (localStorage, готово под бэк).
 * Доступ ко вкладке — всем (воронка), без проверки подписки.
 */

import { useState } from 'react'
import {
    BookOpen, Settings, Shuffle, Percent, MonitorSmartphone, ShieldCheck,
    GraduationCap, Play, Check, ChevronRight, Trophy,
    SlidersHorizontal, BarChart3, HelpCircle, Gamepad2,
} from 'lucide-react'
import { TRAINING_SECTIONS, TRAINING_MODULES } from '../data/trainingContent.js'
import { useTrainingProgress } from '../hooks/useTrainingProgress.js'
import LessonModal from './LessonModal.jsx'
import Footer from './Footer.jsx'

const ICONS = { BookOpen, Settings, Shuffle, Percent, MonitorSmartphone, ShieldCheck }

// ─── Подсчёт интерактивного контента ────────────────────────────────────────
// Считаем автоматически из реального контента уроков (по полю type у каждого
// блока), а НЕ хардкодим цифры. Так плашки на hero и карточках модулей никогда
// не разойдутся с содержимым — добавишь в урок новый квиз, счётчик обновится сам.
function countBlockTypes(lessons) {
    const counts = { quiz: 0, game: 0, simulator: 0, diagram: 0 }
    for (const lesson of lessons ?? []) {
        for (const block of lesson.blocks ?? []) {
            if (block?.type in counts) counts[block.type]++
        }
    }
    return counts
}

// Считается один раз при загрузке модуля — TRAINING_MODULES статичные данные,
// не меняются в рантайме, пересчитывать на каждый рендер незачем.
const COURSE_STATS = (() => {
    const totals = { quiz: 0, game: 0, simulator: 0, diagram: 0, lessons: 0 }
    for (const mod of TRAINING_MODULES) {
        const c = countBlockTypes(mod.lessons)
        totals.quiz += c.quiz
        totals.game += c.game
        totals.simulator += c.simulator
        totals.diagram += c.diagram
        totals.lessons += mod.lessons?.length ?? 0
    }
    return totals
})()

const style = `
  .tp-wrap { flex: 1; overflow-y: auto; position: relative; }
  .tp-wrap::-webkit-scrollbar { width: 5px; }
  .tp-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .tp-bg-glow { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .tp-bg-glow::before { content:''; position:absolute; width:640px; height:640px; top:-220px; left:8%; background: radial-gradient(circle, rgba(47,105,151,0.14), transparent 70%); animation: tp-float 20s ease-in-out infinite; }
  .tp-bg-glow::after { content:''; position:absolute; width:480px; height:480px; bottom:40px; right:6%; background: radial-gradient(circle, rgba(0,201,122,0.08), transparent 70%); animation: tp-float 26s ease-in-out infinite reverse; }
  @keyframes tp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(26px)} }

  /* Декоративный бесконечный дрейф фонового свечения — уважаем
     prefers-reduced-motion (Партия 7, MOBILE_PLAN.md) */
  @media (prefers-reduced-motion: reduce) {
    .tp-bg-glow::before,
    .tp-bg-glow::after {
      animation: none;
    }
  }

  .tp-inner { position: relative; z-index: 1; }

  /* ── top grid: hero + status ── */
  .tp-top { display: grid; grid-template-columns: 1fr 320px; gap: 24px; padding: 40px 48px 8px; }
  @media (max-width: 1024px) { .tp-top { grid-template-columns: 1fr; } }

  .tp-hero {
    background: var(--glass-fill); backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    box-shadow: var(--shadow-glass); padding: 36px 40px; position: relative; overflow: hidden;
    /* Контент распределяется по всей высоте блока (flex-колонка + space-between
       на .tp-hero-text): шапка сверху, описание в середине, плашки снизу —
       пустого места внизу не остаётся. Схема справа убрана. */
    display: flex; flex-direction: column;
  }

  .tp-hero::before { content:''; position:absolute; top:-50%; right:-10%; width:400px; height:400px; background:radial-gradient(circle, rgba(0,201,122,0.1), transparent 70%); pointer-events:none; }

  /* Занимает всю высоту hero и раскидывает три группы сверху вниз. */
  .tp-hero-text { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; }

  /* Шапка: eyebrow + заголовок как единый блок сверху. */
  .tp-hero-head .tp-eyebrow { margin-bottom: 14px; }
  .tp-hero-head .tp-h1 { margin-bottom: 0; }

  /* Описание — по ширине не больше половины блока, прижато влево. */
  .tp-hero-desc { max-width: 50%; align-self: flex-start; }
  @media (max-width: 1024px) { .tp-hero-desc { max-width: 100%; } }
  .tp-eyebrow { display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); margin-bottom:14px; text-transform:uppercase; }
  .tp-h1 { font-size:34px; font-weight:900; letter-spacing:-1px; line-height:1.15; margin-bottom:14px; }
  .tp-h1 span { color:var(--accent-bright); }
  .tp-sub { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:12px; }
  .tp-sub:last-of-type { margin-bottom:0; }

  /* Плашки форматов обучения — иконки НАМЕРЕННО мелкие (11px), это лёгкий
     вспомогательный ряд, а не основной акцент блока. */
  .tp-fmts { display:flex; flex-wrap:wrap; gap:7px; position:relative; z-index:1; }
  .tp-fmt {
    display:flex; align-items:center; gap:5px; padding:6px 11px; border-radius:20px;
    font-size:11px; color:var(--text-secondary);
    background: color-mix(in srgb, var(--fc) 8%, transparent);
    border:1px solid color-mix(in srgb, var(--fc) 28%, transparent);
    transition: all 0.16s;
  }
  .tp-fmt:hover { background: color-mix(in srgb, var(--fc) 15%, transparent); color: var(--text-primary); transform: translateY(-2px); }
  .tp-fmt svg { color: var(--fc); flex-shrink:0; }
  .tp-fmt b { color: var(--fc); font-weight:800; }

  /* ── status panel ── */
  .tp-status {
    background: var(--glass-fill); backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
    box-shadow: var(--shadow-glass); padding: 26px; display: flex; flex-direction: column; gap: 18px;
  }
  .tp-rank {
    display:flex; flex-direction:column; align-items:center; gap:10px; padding:22px; border-radius:var(--radius-lg);
    background: color-mix(in srgb, var(--st) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--st) 30%, transparent);
  }
  .tp-rank-ring {
    width:74px; height:74px; border-radius:50%; border:3px solid var(--st);
    display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--st) 12%, #0a1622);
    box-shadow: 0 0 24px color-mix(in srgb, var(--st) 30%, transparent); color: var(--st);
  }
  .tp-rank-name { font-size:18px; font-weight:800; color:var(--st); }
  .tp-rank-sub { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); }
  .tp-stat-line { display:flex; justify-content:space-between; align-items:center; font-size:12px; }
  .tp-stat-line .lbl { color:var(--text-muted); }
  .tp-stat-line .val { font-family:var(--font-mono); font-weight:700; color:var(--text-primary); }
  .tp-track { height:6px; border-radius:3px; background:rgba(255,255,255,0.08); overflow:hidden; }
  .tp-track-fill { height:100%; background:linear-gradient(90deg, var(--accent-bright), var(--success)); border-radius:3px; transition:width 0.4s ease; }
  .tp-next {
    display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-secondary);
    padding:10px 12px; border-radius:var(--radius-sm); background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
  }
  .tp-next b { color:var(--st); }

  /* ── modules ── */
  .tp-modules { padding: 20px 48px 60px; }
  .tp-section-label { display:flex; align-items:center; gap:12px; font-family:var(--font-mono); font-size:11px; letter-spacing:2px; color:var(--text-muted); text-transform:uppercase; margin:24px 0 16px; }
  .tp-section-label::after { content:''; flex:1; height:1px; background:var(--border); }
  .tp-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(290px,1fr)); gap:16px; }

  .tp-card {
    background: var(--glass-fill); backdrop-filter: blur(16px); border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-glass); overflow: hidden; cursor: pointer;
    transition: all 0.2s; position: relative; display: flex; flex-direction: column;
  }
  .tp-card:hover { transform: translateY(-4px); border-color: var(--glass-border-hover); background: var(--glass-fill-hover); box-shadow: 0 16px 44px rgba(0,0,0,0.5); }
  .tp-card-top { height: 4px; background: var(--mc); }
  .tp-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
  .tp-card-head { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
  .tp-card-icon {
    width:42px; height:42px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--mc) 12%, transparent); border:1px solid color-mix(in srgb, var(--mc) 30%, transparent); color: var(--mc);
  }
  .tp-card-num { margin-left:auto; font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
  .tp-card-title { font-size:16px; font-weight:800; margin-bottom:8px; }
  .tp-card-desc { font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:12px; flex:1; }

  /* Состав интерактива модуля — мелкие цветные чипы: «3 квиза · 2 игры».
     Цифры считаются автоматически из контента (countBlockTypes), не хардкожены. */
  .tp-card-interactive { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:14px; }
  .tp-card-int-chip {
    display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:10px;
    font-size:9.5px; color:var(--text-secondary);
    background: color-mix(in srgb, var(--ic) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--ic) 28%, transparent);
  }
  .tp-card-int-chip svg { color: var(--ic); flex-shrink:0; }
  .tp-card-foot { display:flex; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid var(--glass-border); }
  .tp-card-lessons { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
  .tp-card-badge { display:flex; align-items:center; gap:5px; font-size:9px; font-weight:700; letter-spacing:1px; padding:4px 10px; border-radius:20px; color:var(--mc); border:1px solid var(--mc); background: color-mix(in srgb, var(--mc) 10%, transparent); }
  .tp-card-progress { height:4px; background:rgba(255,255,255,0.06); }
  .tp-card-progress-fill { height:100%; background:var(--mc); transition:width 0.4s ease; }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 5, MOBILE_PLAN.md)
     ══════════════════════════════════════════════════════════════
     БАГ: .tp-modules имел padding 48px с каждой стороны, а .tp-grid
     задан как minmax(290px,1fr). На экране 360px доступно всего
     360-96=264px — меньше 290px минимума карточки. Тот же класс
     ошибки, что уже встречался в OpportunityGrid.jsx (Партия 2) и
     TrainingPage здесь не исключение. Главный фикс — снизить паддинг;
     на самых узких экранах дополнительно снижаем сам минимум сетки.
  */
  @media (max-width: 1024px) {
    .tp-top { padding: 24px 20px 8px; gap: 16px; }
    .tp-hero { padding: 24px 22px; }
    .tp-h1 { font-size: 24px; }
    .tp-sub { font-size: 13px; }
    .tp-status { padding: 18px; }

    .tp-modules { padding: 16px 20px 48px; }
    .tp-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  }

  @media (max-width: 480px) {
    .tp-top { padding: 20px 14px 8px; }
    .tp-hero { padding: 20px 16px; }
    .tp-h1 { font-size: 21px; }

    .tp-modules { padding: 14px 14px 40px; }
    /* Совсем узкие экраны — минимум сетки снижаем ещё раз до полной
       уверенности, что карточка не упрётся в свою собственную колонку */
    .tp-grid { grid-template-columns: 1fr; }
  }
`

function TrainingPage({ onNavigate }) {
    const { progress, isLessonDone, markLesson } = useTrainingProgress(TRAINING_MODULES)
    const [openModuleId, setOpenModuleId] = useState(null)
    const [lessonIndex, setLessonIndex] = useState(0)

    const openModule = TRAINING_MODULES.find(m => m.id === openModuleId) ?? null

    const status = progress.currentStatus
    const next = progress.nextStatus

    function startModule(mod) {
        // открыть первый незавершённый урок, иначе первый
        const firstUndoneIdx = mod.lessons.findIndex(l => !isLessonDone(l.id))
        setLessonIndex(firstUndoneIdx >= 0 ? firstUndoneIdx : 0)
        setOpenModuleId(mod.id)
    }

    return (
        <>
            <style>{style}</style>
            <div className="tp-wrap">
                <div className="tp-bg-glow" />
                <div className="tp-inner">

                    {/* top: hero + status */}
                    <div className="tp-top">
                        <div className="tp-hero">
                            <div className="tp-hero-text">
                                <div className="tp-hero-head">
                                    <div className="tp-eyebrow"><GraduationCap size={13} /> ACADEMY</div>
                                    <div className="tp-h1">Академия <span>AXIOMA</span></div>
                                </div>

                                <div className="tp-hero-desc">
                                    <div className="tp-sub">
                                        Всё об арбитраже в одном месте — от базовых понятий до тонкой настройки сканера.
                                        Разбираем, как устроен спред между биржами, откуда берётся прибыль во фьючерсном
                                        и фандинговом арбитраже, как правильно хеджировать позицию и не потерять на комиссиях,
                                        сетях вывода и проскальзывании.
                                    </div>
                                    <div className="tp-sub">
                                        Каждый механизм показан наглядно — на схемах, симуляторах и разборах реальных
                                        ситуаций, а не сухими определениями. Проходишь модули по порядку, растёшь в статусе
                                        от Новичка до Мастера и учишься читать сканер так, чтобы видеть возможность раньше
                                        остальных.
                                    </div>
                                </div>

                                {/* Плашки форматов — цифры считаются автоматически из
                                    trainingContent.js (COURSE_STATS), не хардкожены */}
                                <div className="tp-fmts">
                                    <span className="tp-fmt" style={{ '--fc': '#3d87c0' }}>
                                        <BookOpen size={11} /> <b>{COURSE_STATS.lessons}</b>&nbsp;уроков
                                    </span>
                                    <span className="tp-fmt" style={{ '--fc': '#00c97a' }}>
                                        <SlidersHorizontal size={11} /> <b>{COURSE_STATS.simulator}</b>&nbsp;симулятора
                                    </span>
                                    <span className="tp-fmt" style={{ '--fc': '#5eead4' }}>
                                        <BarChart3 size={11} /> <b>{COURSE_STATS.diagram}</b>&nbsp;схем
                                    </span>
                                    <span className="tp-fmt" style={{ '--fc': '#f0a500' }}>
                                        <HelpCircle size={11} /> квизы с разбором
                                    </span>
                                    <span className="tp-fmt" style={{ '--fc': '#a78bfa' }}>
                                        <Gamepad2 size={11} /> <b>{COURSE_STATS.game}</b>&nbsp;мини-игры
                                    </span>
                                    <span className="tp-fmt" style={{ '--fc': '#f472b6' }}>
                                        <Trophy size={11} /> статусы
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="tp-status" style={{ '--st': status.color }}>
                            <div className="tp-rank">
                                <div className="tp-rank-ring">
                                    <Trophy size={30} />
                                </div>
                                <div className="tp-rank-name">{status.label}</div>
                                <div className="tp-rank-sub">
                                    {progress.completedModules}/{progress.totalModules} модулей пройдено
                                </div>
                            </div>

                            <div className="tp-stat-line">
                                <span className="lbl">Прогресс курса</span>
                                <span className="val">{progress.progressPct}%</span>
                            </div>
                            <div className="tp-track"><div className="tp-track-fill" style={{ width: `${progress.progressPct}%` }} /></div>

                            <div className="tp-stat-line">
                                <span className="lbl">Уроков завершено</span>
                                <span className="val">{progress.completedLessons} / {progress.totalLessons}</span>
                            </div>

                            {next ? (
                                <div className="tp-next" style={{ '--st': next.color }}>
                                    <ChevronRight size={13} style={{ color: next.color }} />
                                    До статуса <b>{next.label}</b> — {progress.modulesToNext}&nbsp;модуля
                                </div>
                            ) : (
                                <div className="tp-next">
                                    <Trophy size={13} style={{ color: status.color }} />
                                    Максимальный статус достигнут
                                </div>
                            )}
                        </div>
                    </div>

                    {/* modules by section */}
                    <div className="tp-modules">
                        {TRAINING_SECTIONS.map(section => {
                            const mods = TRAINING_MODULES
                                .filter(m => m.section === section.id)
                                .sort((a, b) => a.order - b.order)
                            if (!mods.length) return null

                            return (
                                <div key={section.id}>
                                    <div className="tp-section-label">{section.title}</div>
                                    <div className="tp-grid">
                                        {mods.map(mod => {
                                            const Icon = ICONS[mod.icon] ?? BookOpen
                                            const p = progress.perModule[mod.id] ?? { pct: 0, done: 0, total: mod.lessons.length, complete: false }
                                            const badge = p.complete
                                                ? { txt: 'Готово', ic: Check }
                                                : p.done > 0
                                                    ? { txt: 'В процессе', ic: Play }
                                                    : { txt: 'Открыт', ic: ChevronRight }
                                            const BadgeIc = badge.ic

                                            // Состав интерактива этого модуля — считается из реального
                                            // контента уроков (см. countBlockTypes), а не хардкожен.
                                            const modStats = countBlockTypes(mod.lessons)
                                            const modInteractive = [
                                                modStats.quiz      > 0 && { n: modStats.quiz,      lbl: modStats.quiz      === 1 ? 'квиз'      : 'квиза',      ic: HelpCircle,        c: '#f0a500' },
                                                modStats.game      > 0 && { n: modStats.game,      lbl: modStats.game      === 1 ? 'игра'      : 'игры',       ic: Gamepad2,          c: '#a78bfa' },
                                                modStats.simulator > 0 && { n: modStats.simulator, lbl: modStats.simulator === 1 ? 'симулятор' : 'симулятора', ic: SlidersHorizontal, c: '#00c97a' },
                                                modStats.diagram   > 0 && { n: modStats.diagram,   lbl: modStats.diagram   === 1 ? 'схема'     : 'схемы',      ic: BarChart3,         c: '#5eead4' },
                                            ].filter(Boolean)

                                            return (
                                                <div key={mod.id} className="tp-card" style={{ '--mc': mod.color }} onClick={() => startModule(mod)}>
                                                    <div className="tp-card-top" />
                                                    <div className="tp-card-body">
                                                        <div className="tp-card-head">
                                                            <div className="tp-card-icon"><Icon size={20} /></div>
                                                            <span className="tp-card-num">{String(mod.order).padStart(2, '0')}</span>
                                                        </div>
                                                        <div className="tp-card-title">{mod.title}</div>
                                                        <div className="tp-card-desc">{mod.desc}</div>

                                                        {modInteractive.length > 0 && (
                                                            <div className="tp-card-interactive">
                                                                {modInteractive.map((it, i) => (
                                                                    <span key={i} className="tp-card-int-chip" style={{ '--ic': it.c }}>
                                                                        <it.ic size={10} /> {it.n} {it.lbl}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="tp-card-foot">
                                                            <span className="tp-card-lessons">{mod.lessons.length} уроков</span>
                                                            <span className="tp-card-badge"><BadgeIc size={11} /> {badge.txt}</span>
                                                        </div>
                                                    </div>
                                                    <div className="tp-card-progress"><div className="tp-card-progress-fill" style={{ width: `${p.pct}%` }} /></div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                </div>
                <Footer onNavigate={onNavigate} />
            </div>

            {openModule && (
                <LessonModal
                    module={openModule}
                    lessonIndex={lessonIndex}
                    onClose={() => setOpenModuleId(null)}
                    onNavigate={setLessonIndex}
                    isLessonDone={isLessonDone}
                    onMarkDone={markLesson}
                />
            )}
        </>
    )
}

export default TrainingPage