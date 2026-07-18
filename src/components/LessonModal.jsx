/**
 * LessonModal.jsx — оверлей урока
 *
 * Рендерит блоки урока (из trainingContent) по их type.
 * Навигация: предыдущий/следующий урок внутри модуля.
 * Кнопка «Завершить урок» отмечает прогресс через markLesson.
 */

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Clock, Info, AlertTriangle, Lightbulb } from 'lucide-react'
import TrainingDiagram from './training/TrainingDiagram.jsx'
import TrainingSimulator from './training/TrainingSimulator.jsx'
import TrainingQuiz from './training/TrainingQuiz.jsx'
import TrainingGame from './training/TrainingGame.jsx'

const style = `
  .lm-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.66);
    backdrop-filter: blur(9px);
    z-index: 400;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: lm-fade 0.2s ease;
  }
  @keyframes lm-fade { from { opacity: 0; } to { opacity: 1; } }

  .lm-modal {
    width: 780px; max-width: 100%; max-height: 92vh;
    background: rgba(13,32,51,0.78);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-xl);
    box-shadow: 0 32px 96px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
    display: flex; flex-direction: column; overflow: hidden;
    animation: lm-up 0.25s ease;
  }
  @keyframes lm-up { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .lm-head {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 24px; border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
  }
  .lm-mod-color { width: 4px; height: 34px; border-radius: 3px; flex-shrink: 0; }
  .lm-head-titles { flex: 1; min-width: 0; }
  .lm-crumb { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px; }
  .lm-title { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
  .lm-minutes { display: flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
  .lm-close {
    width: 34px; height: 34px; border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
    color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .lm-close:hover { border-color: var(--error); color: var(--error); }

  .lm-body { flex: 1; overflow-y: auto; padding: 28px 32px; display: flex; flex-direction: column; gap: 18px; }
  .lm-body > * { flex-shrink: 0; }
  .lm-body::-webkit-scrollbar { width: 5px; }
  .lm-body::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  /* text block */
  .lm-text-heading { font-size: 17px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; letter-spacing: -0.2px; }
  .lm-text-content { font-size: 14.5px; line-height: 1.8; color: var(--text-secondary); }

  /* callout */
  .lm-callout { display: flex; gap: 12px; padding: 15px 18px; border-radius: var(--radius-md); font-size: 13.5px; line-height: 1.65; }
  .lm-callout-ic { flex-shrink: 0; margin-top: 1px; }
  .lm-callout.info { background: rgba(61,135,192,0.08); border: 1px solid rgba(61,135,192,0.25); color: var(--text-secondary); }
  .lm-callout.info .lm-callout-ic { color: var(--accent-bright); }
  .lm-callout.warn { background: rgba(240,165,0,0.07); border: 1px solid rgba(240,165,0,0.25); color: var(--text-secondary); }
  .lm-callout.warn .lm-callout-ic { color: var(--warning); }
  .lm-callout.tip { background: rgba(0,201,122,0.07); border: 1px solid rgba(0,201,122,0.25); color: var(--text-secondary); }
  .lm-callout.tip .lm-callout-ic { color: var(--success); }

  /* terms */
  .lm-terms { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
  .lm-term { display: grid; grid-template-columns: 130px 1fr; gap: 14px; padding: 11px 16px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); }
  .lm-term-name { font-weight: 700; color: var(--accent-bright); font-size: 13px; }
  .lm-term-def { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }

  .lm-foot {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 16px 24px; border-top: 1px solid var(--glass-border); flex-shrink: 0;
    background: rgba(255,255,255,0.015);
  }
  .lm-nav-btn {
    display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: var(--radius-md);
    font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); color: var(--text-secondary);
    cursor: pointer; transition: all 0.15s;
  }
  .lm-nav-btn:hover:not(:disabled) { border-color: var(--glass-border-hover); color: var(--text-primary); }
  .lm-nav-btn:disabled { opacity: 0.3; cursor: default; }
  .lm-done-btn {
    display: flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: var(--radius-md);
    font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 1px;
    background: linear-gradient(135deg, var(--accent), var(--accent-bright)); color: #fff; border: 1px solid rgba(255,255,255,0.14);
    cursor: pointer; box-shadow: 0 4px 18px rgba(47,105,151,0.3); transition: all 0.15s;
  }
  .lm-done-btn:hover { transform: translateY(-1px); }
  .lm-done-btn.done { background: linear-gradient(135deg, rgba(0,231,143,0.25), rgba(0,168,102,0.12)); border-color: rgba(0,201,122,0.4); color: var(--success); box-shadow: 0 0 16px rgba(0,201,122,0.15); }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 5, MOBILE_PLAN.md)
     ══════════════════════════════════════════════════════════════
     Урок — текстоёмкий контент (плюс интерактивные блоки), поэтому
     на мобиле выбран fullscreen, а не bottom-sheet как у ProfileModal:
     нужна максимальная высота под чтение, а не быстрый предпросмотр.

     Футер с тремя элементами (Назад / Завершить урок / Далее) —
     на самых узких телефонах (~360px) может не влезать в один ряд
     впритык (длинная надпись "Завершить урок" + два nav-btn).
     flex-wrap — подстраховка, чтобы при нехватке места кнопки
     переносились, а не обрезались/наезжали друг на друга.
  */
  @media (max-width: 768px) {
    .lm-overlay { padding: 0; align-items: stretch; }

    .lm-modal {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100dvh;
      border-radius: 0;
      backdrop-filter: blur(16px) saturate(160%);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
    }

    .lm-head {
      padding: 14px 16px;
      padding-top: calc(14px + env(safe-area-inset-top));
      gap: 10px;
    }
    .lm-close { width: 40px; height: 40px; }

    .lm-body {
      padding: 20px 18px;
      -webkit-overflow-scrolling: touch;
    }

    /* Фиксированная колонка термина (130px) на узком экране слишком
       тесно соседствует с определением — стек читабельнее */
    .lm-term {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .lm-foot {
      padding: 12px 14px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      flex-wrap: wrap;
      gap: 8px;
    }
    .lm-nav-btn { padding: 10px 14px; }
    .lm-done-btn { padding: 10px 18px; flex: 1; justify-content: center; }
  }
`

const CALLOUT_ICON = { info: Info, warn: AlertTriangle, tip: Lightbulb }

function renderBlock(block, i) {
    switch (block?.type) {
        case 'text':
            return (
                <div key={i}>
                    {block.heading ? <div className="lm-text-heading">{block.heading}</div> : null}
                    <div className="lm-text-content">{block.content}</div>
                </div>
            )
        case 'callout': {
            const Ic = CALLOUT_ICON[block.variant] ?? Info
            return (
                <div key={i} className={`lm-callout ${block.variant ?? 'info'}`}>
                    <span className="lm-callout-ic"><Ic size={17} /></span>
                    <span>{block.content}</span>
                </div>
            )
        }
        case 'terms':
            return (
                <div key={i} className="lm-terms">
                    {(block.items ?? []).map((t, j) => (
                        <div key={j} className="lm-term">
                            <span className="lm-term-name">{t.term}</span>
                            <span className="lm-term-def">{t.def}</span>
                        </div>
                    ))}
                </div>
            )
        case 'diagram':
            return <TrainingDiagram key={i} kind={block.kind} caption={block.caption} />
        case 'simulator':
            return <TrainingSimulator key={i} kind={block.kind} />
        case 'quiz':
            return <TrainingQuiz key={i} question={block.question} options={block.options} explain={block.explain} />
        case 'game':
            return <TrainingGame key={i} kind={block.kind} />
        default:
            return null
    }
}

function LessonModal({ module: mod, lessonIndex, onClose, onNavigate, isLessonDone, onMarkDone }) {
    const lessons = mod?.lessons ?? []
    const lesson = lessons[lessonIndex]
    const [scrollKey, setScrollKey] = useState(0)

    // сброс скролла тела при смене урока
    useEffect(() => { setScrollKey(k => k + 1) }, [lessonIndex])

    // Esc закрывает
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    if (!lesson) return null

    const done = isLessonDone?.(lesson.id) === true
    const hasPrev = lessonIndex > 0
    const hasNext = lessonIndex < lessons.length - 1

    return (
        <>
            <style>{style}</style>
            <div className="lm-overlay" onClick={onClose}>
                <div className="lm-modal" onClick={e => e.stopPropagation()}>

                    <div className="lm-head">
                        <div className="lm-mod-color" style={{ background: mod.color }} />
                        <div className="lm-head-titles">
                            <div className="lm-crumb">{mod.title} · урок {lessonIndex + 1}/{lessons.length}</div>
                            <div className="lm-title">{lesson.title}</div>
                        </div>
                        <span className="lm-minutes"><Clock size={13} />{lesson.minutes} мин</span>
                        <button className="lm-close" onClick={onClose}><X size={16} /></button>
                    </div>

                    <div className="lm-body" key={scrollKey}>
                        {(lesson.blocks ?? []).map(renderBlock)}
                    </div>

                    <div className="lm-foot">
                        <button className="lm-nav-btn" disabled={!hasPrev} onClick={() => onNavigate(lessonIndex - 1)}>
                            <ChevronLeft size={14} /> Назад
                        </button>

                        <button
                            className={`lm-done-btn ${done ? 'done' : ''}`}
                            onClick={() => onMarkDone(lesson.id, !done)}
                        >
                            <Check size={14} /> {done ? 'Пройдено' : 'Завершить урок'}
                        </button>

                        <button className="lm-nav-btn" disabled={!hasNext} onClick={() => onNavigate(lessonIndex + 1)}>
                            Далее <ChevronRight size={14} />
                        </button>
                    </div>

                </div>
            </div>
        </>
    )
}

export default LessonModal