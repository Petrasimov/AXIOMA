/**
 * LegalPage.jsx — страница юридических документов
 *
 * Слева — список документов, справа — текст выбранного.
 * Пока правовая форма не оформлена (LEGAL_READY === false), показывается
 * заметное предупреждение о том, что документы — черновик.
 *
 * Проп initialDoc — какой документ открыть сразу (из ссылки в футере).
 */

import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, ChevronRight } from 'lucide-react'
import { LEGAL_DOCS, LEGAL_LIST, LEGAL_READY, LEGAL_ENTITY } from '../data/legalContent.js'
import Footer from './Footer.jsx'

const style = `
  .lg-wrap { flex: 1; overflow-y: auto; position: relative; }
  .lg-wrap::-webkit-scrollbar { width: 5px; }
  .lg-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .lg-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .lg-bg::before { content:''; position:absolute; width:600px; height:600px; top:-200px; left:10%; background: radial-gradient(circle, rgba(47,105,151,0.1), transparent 70%); }

  .lg-inner { position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; padding: 44px 40px 60px; }

  .lg-head { margin-bottom: 24px; }
  .lg-eyebrow { display:inline-flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); text-transform:uppercase; margin-bottom:14px; padding:6px 13px; border-radius:20px; background:rgba(61,135,192,0.08); border:1px solid rgba(61,135,192,0.22); }
  .lg-h1 { font-size:32px; font-weight:900; letter-spacing:-1px; margin-bottom:8px; }
  .lg-sub { font-size:14px; color:var(--text-secondary); }

  /* предупреждение о черновике */
  .lg-draft {
    display:flex; gap:12px; padding:18px 20px; margin-bottom:24px;
    background:rgba(240,165,0,0.07); border:1px solid rgba(240,165,0,0.3);
    border-radius:var(--radius-md);
  }
  .lg-draft-ic { color:var(--warning); flex-shrink:0; margin-top:2px; }
  .lg-draft-t { font-size:13.5px; font-weight:700; color:var(--warning); margin-bottom:6px; }
  .lg-draft-d { font-size:12.5px; color:var(--text-secondary); line-height:1.65; }

  .lg-layout { display:grid; grid-template-columns: 260px 1fr; gap:20px; align-items:start; }

  /* список документов */
  .lg-nav {
    background: var(--glass-fill); backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass); padding: 14px; position: sticky; top: 20px;
  }
  .lg-nav-item {
    display:flex; align-items:center; gap:10px; width:100%;
    padding:12px 14px; border-radius:var(--radius-sm);
    background:none; border:1px solid transparent;
    color:var(--text-secondary); font-size:13px; font-family:var(--font-sans);
    cursor:pointer; text-align:left; transition:all 0.15s; margin-bottom:4px;
  }
  .lg-nav-item:hover { background:rgba(93,163,214,0.07); color:var(--text-primary); }
  .lg-nav-item.active { background:var(--glass-fill-hover); border-color:var(--glass-border-hover); color:var(--text-primary); font-weight:600; }
  .lg-nav-item.active .lg-nav-arrow { opacity:1; }
  .lg-nav-arrow { margin-left:auto; opacity:0; transition:opacity 0.15s; color:var(--accent-bright); flex-shrink:0; }

  /* тело документа */
  .lg-doc {
    background: var(--glass-fill); backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass); padding: 36px 40px;
  }
  .lg-doc-title { font-size:26px; font-weight:800; letter-spacing:-0.6px; margin-bottom:6px; }
  .lg-doc-sub { font-size:13px; color:var(--text-muted); margin-bottom:8px; }
  .lg-doc-date { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); padding-bottom:24px; border-bottom:1px solid var(--glass-border); margin-bottom:28px; }

  .lg-section { margin-bottom:28px; }
  .lg-section:last-child { margin-bottom:0; }
  .lg-section-h { font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:12px; letter-spacing:-0.2px; }
  .lg-block { font-size:14px; color:var(--text-secondary); line-height:1.8; margin-bottom:10px; }
  .lg-block:last-child { margin-bottom:0; }
  .lg-block.todo {
    padding:12px 14px; border-radius:var(--radius-sm);
    background:rgba(240,165,0,0.06); border:1px solid rgba(240,165,0,0.22);
    color:var(--warning); font-size:12.5px; font-family:var(--font-mono); line-height:1.6;
  }
  .lg-block.placeholder { color:var(--warning); }

  @media (max-width: 860px) {
    .lg-layout { grid-template-columns: 1fr; }
    .lg-nav { position: static; }
  }
`

// подсветка незаполненных плейсхолдеров [___]
function renderBlock(text, i) {
    const isTodo = text.includes('ТРЕБУЕТ ДОРАБОТКИ')
    if (isTodo) {
        return <div key={i} className="lg-block todo">⚠ {text}</div>
    }
    // подсветить [ПЛЕЙСХОЛДЕРЫ] внутри текста
    const parts = text.split(/(\[[^\]]+\])/g)
    return (
        <div key={i} className="lg-block">
            {parts.map((p, j) =>
                p.startsWith('[') && p.endsWith(']')
                    ? <span key={j} className="lg-block placeholder">{p}</span>
                    : p
            )}
        </div>
    )
}

function LegalPage({ initialDoc, onNavigate }) {
    const [active, setActive] = useState(initialDoc && LEGAL_DOCS[initialDoc] ? initialDoc : 'offer')

    useEffect(() => {
        if (initialDoc && LEGAL_DOCS[initialDoc]) setActive(initialDoc)
    }, [initialDoc])

    const doc = LEGAL_DOCS[active] ?? LEGAL_DOCS.offer

    return (
        <>
            <style>{style}</style>
            <div className="lg-wrap">
                <div className="lg-bg" />
                <div className="lg-inner">

                    <div className="lg-head">
                        <div className="lg-eyebrow"><FileText size={13} /> ДОКУМЕНТЫ</div>
                        <div className="lg-h1">Правовая информация</div>
                        <div className="lg-sub">Условия использования сервиса AXIOMA и обработки данных</div>
                    </div>

                    {!LEGAL_READY && (
                        <div className="lg-draft">
                            <div className="lg-draft-ic"><AlertTriangle size={20} /></div>
                            <div>
                                <div className="lg-draft-t">Документы в стадии подготовки</div>
                                <div className="lg-draft-d">
                                    Приведённые ниже тексты являются предварительными и находятся в процессе юридического
                                    оформления. Реквизиты и отдельные разделы будут дополнены. Документы не вступили в силу
                                    и пока не имеют юридической силы. Сервис работает в режиме открытого тестирования (MVP).
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="lg-layout">
                        <div className="lg-nav">
                            {LEGAL_LIST.map(item => (
                                <button
                                    key={item.id}
                                    className={`lg-nav-item ${active === item.id ? 'active' : ''}`}
                                    onClick={() => setActive(item.id)}
                                >
                                    {item.title}
                                    <ChevronRight size={14} className="lg-nav-arrow" />
                                </button>
                            ))}
                        </div>

                        <div className="lg-doc">
                            <div className="lg-doc-title">{doc.title}</div>
                            <div className="lg-doc-sub">{doc.subtitle}</div>
                            <div className="lg-doc-date">
                                Редакция от {LEGAL_ENTITY.effectiveDate} · {LEGAL_READY ? 'действует' : 'проект документа'}
                            </div>

                            {doc.sections.map((sec, i) => (
                                <div key={i} className="lg-section">
                                    <div className="lg-section-h">{sec.heading}</div>
                                    {sec.blocks.map(renderBlock)}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        </>
    )
}

export default LegalPage