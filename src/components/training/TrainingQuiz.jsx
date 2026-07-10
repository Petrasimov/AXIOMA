/**
 * TrainingQuiz.jsx — квиз-вопрос с разбором
 *
 * Принимает { question, options: [{text, correct}], explain }.
 * После выбора показывает правильный/неправильный ответ и объяснение.
 * Позволяет переответить (сброс) — обучение, а не экзамен.
 */

import { useState } from 'react'

const style = `
  .tq-wrap {
    margin: 4px 0;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    background: var(--glass-fill);
    backdrop-filter: blur(16px);
    box-shadow: var(--shadow-glass);
    padding: 22px 24px;
  }
  .tq-q { font-size: 16px; font-weight: 700; line-height: 1.5; margin-bottom: 16px; color: var(--text-primary); }
  .tq-opt {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 16px; border-radius: var(--radius-md);
    border: 1px solid var(--glass-border); background: rgba(255,255,255,0.02);
    font-size: 13.5px; color: var(--text-secondary); cursor: pointer;
    margin-bottom: 9px; transition: all 0.15s; text-align: left; width: 100%;
  }
  .tq-opt:hover:not(:disabled) { border-color: var(--glass-border-hover); background: rgba(93,163,214,0.06); color: var(--text-primary); }
  .tq-opt:disabled { cursor: default; }
  .tq-opt.correct { border-color: rgba(0,201,122,0.6); background: rgba(0,201,122,0.12); color: var(--success); }
  .tq-opt.wrong { border-color: rgba(224,62,62,0.6); background: rgba(224,62,62,0.1); color: var(--error); }
  .tq-opt.dim { opacity: 0.5; }
  .tq-mark { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
  .tq-explain {
    margin-top: 14px; padding: 14px 16px; border-radius: var(--radius-md);
    font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;
    background: rgba(0,201,122,0.06); border: 1px solid rgba(0,201,122,0.22);
    animation: tq-appear 0.2s ease;
  }
  .tq-explain.wrong { background: rgba(240,165,0,0.06); border-color: rgba(240,165,0,0.22); }
  @keyframes tq-appear { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .tq-retry {
    margin-top: 12px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
    letter-spacing: 0.5px; color: var(--accent-bright); background: none; border: none;
    cursor: pointer; padding: 4px 0;
  }
  .tq-retry:hover { text-decoration: underline; }
`

function TrainingQuiz({ question, options, explain }) {
    const [picked, setPicked] = useState(null)
    const opts = Array.isArray(options) ? options : []
    const answered = picked !== null
    const pickedCorrect = answered && opts[picked]?.correct === true

    return (
        <>
            <style>{style}</style>
            <div className="tq-wrap">
                <div className="tq-q">{question}</div>
                {opts.map((opt, i) => {
                    let cls = 'tq-opt'
                    if (answered) {
                        if (opt.correct) cls += ' correct'
                        else if (i === picked) cls += ' wrong'
                        else cls += ' dim'
                    }
                    return (
                        <button
                            key={i}
                            className={cls}
                            disabled={answered}
                            onClick={() => setPicked(i)}
                        >
                            <span className="tq-mark">
                                {answered && opt.correct ? '✓' : answered && i === picked ? '✕' : String.fromCharCode(65 + i)}
                            </span>
                            {opt.text}
                        </button>
                    )
                })}
                {answered && (
                    <div className={`tq-explain ${pickedCorrect ? '' : 'wrong'}`}>
                        {explain}
                    </div>
                )}
                {answered && !pickedCorrect && (
                    <button className="tq-retry" onClick={() => setPicked(null)}>↻ Попробовать снова</button>
                )}
            </div>
        </>
    )
}

export default TrainingQuiz