/**
 * FaqPage.jsx — страница «Частые вопросы»
 *
 * Полный список вопросов из faqContent.js с:
 *   - фильтром по категориям
 *   - живым поиском (по тексту вопроса И ответа)
 *   - аккордеоном (раскрытие через grid-template-rows, как на главной)
 *
 * Попадание на страницу — через футер (как юрдоки) и кнопку «Все вопросы»
 * под блоком FAQ на главной.
 *
 * Доступна всем, без проверки подписки.
 */

import { useState, useMemo, useEffect } from 'react'
import { HelpCircle, Search, ChevronDown, X, MessageCircle } from 'lucide-react'
import { FAQ_ITEMS, FAQ_CATEGORIES } from '../data/faqContent.js'
import { setJsonLd, removeJsonLd } from '../seo.js'
import Footer from './Footer.jsx'

const style = `
  .fq-wrap { flex: 1; overflow-y: auto; position: relative; }
  .fq-wrap::-webkit-scrollbar { width: 5px; }
  .fq-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .fq-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .fq-bg::before { content:''; position:absolute; width:600px; height:600px; top:-220px; left:8%; background: radial-gradient(circle, rgba(47,105,151,0.11), transparent 70%); }

  .fq-inner { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 44px 40px 60px; }

  /* ─── Шапка ─── */
  .fq-head { text-align: center; margin-bottom: 28px; }
  .fq-eyebrow {
    display:inline-flex; align-items:center; gap:7px;
    font-family:var(--font-mono); font-size:10px; letter-spacing:2px;
    color:var(--accent-bright); text-transform:uppercase; margin-bottom:14px;
    padding:6px 13px; border-radius:20px;
    background:rgba(61,135,192,0.08); border:1px solid rgba(61,135,192,0.22);
  }
  .fq-h1 { font-size:34px; font-weight:900; letter-spacing:-1px; margin-bottom:10px; }
  .fq-h1 span { color:var(--accent-bright); }
  .fq-sub { font-size:14.5px; color:var(--text-secondary); line-height:1.7; max-width:560px; margin:0 auto; }

  /* ─── Поиск ─── */
  .fq-search {
    display:flex; align-items:center; gap:11px;
    padding:14px 18px; margin-bottom:16px;
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
    box-shadow:var(--shadow-glass);
    transition:border-color 0.18s;
  }
  .fq-search:focus-within { border-color:var(--glass-border-hover); }
  .fq-search input {
    flex:1; background:none; border:none; outline:none;
    color:var(--text-primary); font-size:14px; font-family:var(--font-sans); min-width:0;
  }
  .fq-search input::placeholder { color:var(--text-muted); }
  .fq-search-ic { color:var(--text-muted); flex-shrink:0; }
  .fq-search-clear {
    background:none; border:none; color:var(--text-muted);
    cursor:pointer; display:flex; padding:0; flex-shrink:0;
  }
  .fq-search-clear:hover { color:var(--error); }

  /* ─── Категории ─── */
  .fq-cats { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:22px; }
  .fq-cat {
    padding:9px 16px; border-radius:20px; cursor:pointer;
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
    color:var(--text-secondary); font-size:12.5px; font-family:var(--font-sans);
    transition:all 0.16s; display:flex; align-items:center; gap:7px;
  }
  .fq-cat:hover { border-color:var(--glass-border-hover); color:var(--text-primary); }
  .fq-cat.active {
    background:var(--glass-fill-hover); border-color:var(--accent-bright);
    color:var(--text-primary); font-weight:600;
  }
  .fq-cat-n {
    font-family:var(--font-mono); font-size:10px; color:var(--text-muted);
    padding:1px 6px; border-radius:10px; background:rgba(255,255,255,0.05);
  }
  .fq-cat.active .fq-cat-n { color:var(--accent-bright); background:rgba(61,135,192,0.15); }

  /* ─── Список вопросов ─── */
  .fq-list { display:flex; flex-direction:column; gap:10px; }

  .fq-item {
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
    box-shadow:var(--shadow-glass); overflow:hidden;
    transition:border-color 0.2s, background 0.2s;
  }
  .fq-item.open { border-color:var(--glass-border-hover); background:var(--glass-fill-hover); }

  .fq-q {
    display:flex; align-items:center; gap:14px; width:100%;
    padding:19px 22px; background:none; border:none; cursor:pointer;
    text-align:left; font-family:var(--font-sans);
    font-size:15px; font-weight:700; color:var(--text-primary);
    transition:color 0.15s;
  }
  .fq-q:hover { color:var(--accent-bright); }
  .fq-chevron {
    margin-left:auto; flex-shrink:0; color:var(--text-muted);
    transition:transform 0.25s cubic-bezier(.22,1,.36,1), color 0.15s;
  }
  .fq-item.open .fq-chevron { transform:rotate(180deg); color:var(--accent-bright); }

  /* Плавное раскрытие: grid-template-rows анимируется, в отличие от height:auto */
  .fq-a-wrap {
    display:grid; grid-template-rows:0fr;
    transition:grid-template-rows 0.3s cubic-bezier(.22,1,.36,1);
  }
  .fq-item.open .fq-a-wrap { grid-template-rows:1fr; }
  .fq-a-inner { overflow:hidden; }
  .fq-a {
    padding:0 22px 20px 22px;
    font-size:14px; color:var(--text-secondary); line-height:1.8;
  }
  .fq-a p { margin-bottom:10px; }
  .fq-a p:last-child { margin-bottom:0; }

  /* подсветка совпадений поиска */
  .fq-mark { background:rgba(240,165,0,0.22); color:var(--text-primary); border-radius:3px; padding:0 2px; }

  /* ─── Пусто ─── */
  .fq-empty {
    padding:60px 20px; text-align:center;
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
  }
  .fq-empty-t { font-size:15px; font-weight:700; margin-bottom:8px; }
  .fq-empty-d { font-size:13px; color:var(--text-muted); line-height:1.6; }

  /* ─── Не нашли ответ ─── */
  .fq-cta {
    margin-top:24px; padding:26px 28px; border-radius:var(--radius-lg);
    background:linear-gradient(135deg, rgba(47,105,151,0.18), rgba(0,201,122,0.06));
    border:1px solid var(--glass-border-hover); box-shadow:var(--shadow-glass);
    display:flex; align-items:center; gap:20px; flex-wrap:wrap;
  }
  .fq-cta-t { font-size:17px; font-weight:800; margin-bottom:5px; }
  .fq-cta-d { font-size:13px; color:var(--text-secondary); line-height:1.6; }
  .fq-cta-btn {
    display:inline-flex; align-items:center; gap:8px; margin-left:auto; flex-shrink:0;
    padding:13px 26px; border-radius:var(--radius-md);
    background:linear-gradient(135deg, var(--accent), var(--accent-bright));
    color:#fff; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:1px;
    text-decoration:none; border:1px solid rgba(255,255,255,0.14);
    box-shadow:0 4px 18px rgba(47,105,151,0.3); transition:transform 0.15s;
  }
  .fq-cta-btn:hover { transform:translateY(-2px); }

  @media (max-width: 700px) {
    .fq-cta { flex-direction:column; align-items:flex-start; }
    .fq-cta-btn { margin-left:0; }
  }
`

/**
 * Подсвечивает найденный текст жёлтым.
 * Возвращает массив кусков — обычный текст и <mark> с совпадением.
 */
function highlight(text, query) {
    if (!query) return text
    const q = query.trim()
    if (!q) return text

    // Экранируем спецсимволы regex, чтобы поиск по «?» или «(» не падал
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = String(text).split(new RegExp(`(${safe})`, 'gi'))

    return parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase()
            ? <mark key={i} className="fq-mark">{p}</mark>
            : p
    )
}

function FaqItem({ item, isOpen, onToggle, query }) {
    const paragraphs = Array.isArray(item.a) ? item.a : [item.a]

    return (
        <div className={`fq-item ${isOpen ? 'open' : ''}`}>
            <button className="fq-q" onClick={onToggle} aria-expanded={isOpen}>
                {highlight(item.q, query)}
                <ChevronDown size={18} className="fq-chevron" />
            </button>
            <div className="fq-a-wrap">
                <div className="fq-a-inner">
                    <div className="fq-a">
                        {paragraphs.map((p, i) => (
                            <p key={i}>{highlight(p, query)}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function FaqPage({ onNavigate }) {
    const [cat, setCat] = useState('all')
    const [query, setQuery] = useState('')
    const [openId, setOpenId] = useState(null)

    // FAQPage structured data — из faqContent.js.
    // Google FAQ-сниппеты убрал (май 2026), но разметка полезна Яндексу и AI-выдаче.
    useEffect(() => {
        setJsonLd('faq-jsonld', {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map(it => ({
                '@type': 'Question',
                name: it.q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: Array.isArray(it.a) ? it.a.join(' ') : String(it.a),
                },
            })),
        })
        return () => removeJsonLd('faq-jsonld')
    }, [])

    // Считаем, сколько вопросов в каждой категории (для бейджей)
    const catCounts = useMemo(() => {
        const counts = { all: FAQ_ITEMS.length }
        FAQ_ITEMS.forEach(i => {
            counts[i.cat] = (counts[i.cat] ?? 0) + 1
        })
        return counts
    }, [])

    // Фильтрация: категория + поиск (по вопросу И по тексту ответа)
    const filtered = useMemo(() => {
        let list = FAQ_ITEMS

        if (cat !== 'all') list = list.filter(i => i.cat === cat)

        const q = query.trim().toLowerCase()
        if (q) {
            list = list.filter(i => {
                const answerText = Array.isArray(i.a) ? i.a.join(' ') : String(i.a)
                return (
                    i.q.toLowerCase().includes(q) ||
                    answerText.toLowerCase().includes(q)
                )
            })
        }

        return list
    }, [cat, query])

    return (
        <>
            <style>{style}</style>
            <div className="fq-wrap">
                <div className="fq-bg" />
                <div className="fq-inner">

                    <div className="fq-head">
                        <div className="fq-eyebrow"><HelpCircle size={13} /> ПОМОЩЬ</div>
                        <div className="fq-h1">Частые <span>вопросы</span></div>
                        <div className="fq-sub">
                            Всё, что обычно спрашивают о проекте, арбитраже и работе со сканером.
                        </div>
                    </div>

                    {/* Поиск */}
                    <div className="fq-search">
                        <Search size={17} className="fq-search-ic" />
                        <input
                            placeholder="Найти вопрос..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button className="fq-search-clear" onClick={() => setQuery('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Категории */}
                    <div className="fq-cats">
                        {FAQ_CATEGORIES.map(c => (
                            <button
                                key={c.id}
                                className={`fq-cat ${cat === c.id ? 'active' : ''}`}
                                onClick={() => setCat(c.id)}
                            >
                                {c.title}
                                <span className="fq-cat-n">{catCounts[c.id] ?? 0}</span>
                            </button>
                        ))}
                    </div>

                    {/* Список */}
                    {filtered.length > 0 ? (
                        <div className="fq-list">
                            {filtered.map(item => (
                                <FaqItem
                                    key={item.id}
                                    item={item}
                                    query={query}
                                    isOpen={openId === item.id}
                                    onToggle={() => setOpenId(cur => (cur === item.id ? null : item.id))}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="fq-empty">
                            <div className="fq-empty-t">Ничего не нашлось</div>
                            <div className="fq-empty-d">
                                Попробуйте другой запрос или выберите категорию «Все вопросы».
                                Если ответа тут нет — напишите нам, добавим.
                            </div>
                        </div>
                    )}

                    {/* Не нашли ответ */}
                    <div className="fq-cta">
                        <div>
                            <div className="fq-cta-t">Не нашли ответ?</div>
                            <div className="fq-cta-d">
                                Напишите нашему боту-менеджеру — ответим и добавим вопрос сюда.
                            </div>
                        </div>
                        <a
                            className="fq-cta-btn"
                            href="https://t.me/Axioma_Scan"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle size={14} /> НАПИСАТЬ НАМ
                        </a>
                    </div>

                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        </>
    )
}

export default FaqPage