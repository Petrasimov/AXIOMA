/**
 * Footer.jsx — подвал сайта
 *
 * Показывается в конце скроллящегося контента страниц Home / Training / About
 * (на сканерах и странице разработчика не рендерится — там рабочая область).
 *
 * Проп onNavigate(page) — переключение вкладок по ссылкам «Продукт».
 * Ссылки документов ведут на LegalPage, FAQ — на FaqPage.
 * Связь: главная кнопка (бот-менеджер) + канал и прямой контакт.
 */

import { Send, MessageCircle, User, AlertTriangle } from 'lucide-react'

const style = `
  .footer {
    border-top: 1px solid var(--glass-border);
    background: rgba(10,26,37,0.5);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
    margin-top: 40px;
    position: relative;
    flex-shrink: 0;
  }
  .footer::before {
    content:''; position:absolute; left:0; right:0; top:0; height:1px;
    background: linear-gradient(90deg, transparent, rgba(93,163,214,0.4), transparent);
  }
  .footer-inner { max-width:1080px; margin:0 auto; padding:44px 40px 0; }

  .footer-cols { display:grid; grid-template-columns: 1.6fr 1fr 1fr 1.2fr; gap:36px; padding-bottom:36px; }

  .footer-brand-logo { display:flex; align-items:center; gap:11px; margin-bottom:16px; }
  .footer-logo-icon { width:38px; height:38px; border-radius:var(--radius-sm); background:linear-gradient(135deg,#ffffff,#cfe6f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:var(--accent); letter-spacing:1px; box-shadow:0 4px 14px rgba(255,255,255,0.12); }
  .footer-logo-text { font-size:19px; font-weight:800; letter-spacing:3px; }
  .footer-brand-desc { font-size:12.5px; color:var(--text-secondary); line-height:1.65; max-width:280px; margin-bottom:16px; }
  .footer-motto { font-family:var(--font-mono); font-size:11px; color:var(--accent-bright); letter-spacing:0.5px; }

  .footer-col-title { font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--text-muted); text-transform:uppercase; margin-bottom:16px; }
  .footer-link { display:block; font-size:13px; color:var(--text-secondary); text-decoration:none; padding:6px 0; transition:color 0.15s, transform 0.15s; width:fit-content; background:none; border:none; font-family:var(--font-sans); cursor:pointer; text-align:left; }
  .footer-link:hover { color:var(--accent-bright); transform:translateX(3px); }
  .footer-link.soon { color:var(--text-muted); cursor:default; }
  .footer-link.soon:hover { transform:none; color:var(--text-muted); }
  .footer-soon-tag { font-size:8px; font-family:var(--font-mono); letter-spacing:1px; padding:2px 6px; border-radius:10px; border:1px solid var(--border); color:var(--text-muted); margin-left:6px; vertical-align:middle; }

  /* ─── Связь: главная кнопка + второстепенные (вариант B) ─── */
  .footer-main-btn {
    display:flex; align-items:center; gap:11px; width:100%;
    padding:13px 16px; border-radius:var(--radius-md); margin-bottom:10px;
    background:linear-gradient(135deg, var(--accent), var(--accent-bright));
    color:#fff; border:1px solid rgba(255,255,255,0.14);
    box-shadow:0 4px 18px rgba(47,105,151,0.3);
    text-decoration:none; transition:transform 0.15s, box-shadow 0.15s;
  }
  .footer-main-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(47,105,151,0.42); }
  .footer-main-txt { display:flex; flex-direction:column; font-size:13px; font-weight:700; line-height:1.3; }
  .footer-main-sub { font-size:10px; opacity:0.82; font-weight:400; margin-top:2px; }

  .footer-sm-row { display:flex; gap:8px; }
  .footer-sm-btn {
    flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
    padding:10px; border-radius:var(--radius-sm);
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
    color:var(--text-secondary); font-size:11px; text-decoration:none;
    transition:all 0.15s; white-space:nowrap;
  }
  .footer-sm-btn:hover {
    border-color:var(--glass-border-hover); color:var(--accent-bright);
    background:rgba(93,163,214,0.08);
  }

  .footer-disclaimer { display:flex; gap:11px; padding:16px 18px; margin-bottom:24px; background:rgba(240,165,0,0.05); border:1px solid rgba(240,165,0,0.18); border-radius:var(--radius-md); }
  .footer-disclaimer-ic { color:var(--warning); flex-shrink:0; margin-top:1px; }
  .footer-disclaimer-txt { font-size:11.5px; color:var(--text-secondary); line-height:1.6; }
  .footer-disclaimer-txt b { color:var(--warning); font-weight:700; }

  .footer-bottom { display:flex; align-items:center; justify-content:space-between; padding:18px 0 24px; border-top:1px solid var(--glass-border); gap:16px; flex-wrap:wrap; }
  .footer-copy { font-size:11.5px; color:var(--text-muted); font-family:var(--font-mono); }
  .footer-bottom-links { display:flex; gap:20px; }
  .footer-bottom-link { font-size:11.5px; color:var(--text-muted); text-decoration:none; transition:color 0.15s; background:none; border:none; cursor:pointer; font-family:var(--font-sans); }
  .footer-bottom-link:hover { color:var(--accent-bright); }

  @media (max-width: 1024px) {
    .footer-inner { padding: 36px 24px 0; }
    .footer-cols { grid-template-columns: 1fr 1fr; gap: 24px; }
    .footer-bottom { flex-direction: column; align-items: flex-start; }
  }

  /* иконки соцсетей (inline svg) */
  .footer svg { display:block; }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 1, MOBILE_PLAN.md п.2.5)
     ══════════════════════════════════════════════════════════════
     Чистое дополнение — правила выше не изменены (кроме порога
     820px→1024px у соседнего блока, для единообразия с остальными
     файлами Партии 1).
  */
  @media (max-width: 480px) {
    .footer-inner { padding: 28px 16px 0; }
    .footer-cols { grid-template-columns: 1fr; gap: 28px; }

    /* Текстовые ссылки — тач-таргет побольше (было 6px вертикальный паддинг) */
    .footer-link { padding: 10px 0; font-size: 13.5px; }
    .footer-bottom-link { padding: 6px 0; }

    .footer-brand-desc { max-width: 100%; }

    .footer-disclaimer { padding: 14px 16px; }

    .footer-bottom { padding: 16px 0 20px; }
    .footer-bottom-links { flex-wrap: wrap; gap: 14px 20px; }
  }
`

const YEAR = new Date().getFullYear()

function Footer({ onNavigate }) {
    return (
        <>
            <style>{style}</style>
            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-cols">

                        {/* Бренд */}
                        <div>
                            <div className="footer-brand-logo">
                                <div className="footer-logo-icon">AX</div>
                                <div className="footer-logo-text">AXIOMA</div>
                            </div>
                            <div className="footer-brand-desc">
                                Крипто-сканер для всех видов арбитража. Строим удобный инструмент честно и открыто —
                                от фьючерсного арбитража до автоматизации заработка.
                            </div>
                            <div className="footer-motto">// крипто-сканер, который нужно знать</div>
                        </div>

                        {/* Продукт */}
                        <div>
                            <div className="footer-col-title">Продукт</div>
                            <button className="footer-link" onClick={() => onNavigate?.('futures')}>Фьючерсный арбитраж</button>
                            <button className="footer-link" onClick={() => onNavigate?.('funding')}>Арбитраж фандинга</button>
                            <button className="footer-link" onClick={() => onNavigate?.('movers')}>Топ роста и падения</button>
                            <button className="footer-link" onClick={() => onNavigate?.('training')}>Академия</button>
                            <button className="footer-link" onClick={() => onNavigate?.('about')}>О нас</button>
                        </div>

                        {/* Документы */}
                        <div>
                            <div className="footer-col-title">Документы</div>
                            <button className="footer-link" onClick={() => onNavigate?.('legal:offer')}>Оферта</button>
                            <button className="footer-link" onClick={() => onNavigate?.('legal:privacy')}>Политика конфиденциальности</button>
                            <button className="footer-link" onClick={() => onNavigate?.('legal:terms')}>Условия использования</button>
                            <button className="footer-link" onClick={() => onNavigate?.('faq')}>FAQ</button>
                        </div>

                        {/* Связь — вариант B: одно главное действие + второстепенные */}
                        <div>
                            <div className="footer-col-title">Связь</div>

                            {/* Главное действие — бот-менеджер */}
                            <a
                                className="footer-main-btn"
                                href="https://t.me/Axioma_Scan"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Send size={18} />
                                <span className="footer-main-txt">
                                    Написать нам
                                    <span className="footer-main-sub">доступ, вопросы, поддержка</span>
                                </span>
                            </a>

                            {/* Второстепенные */}
                            <div className="footer-sm-row">
                                <a
                                    className="footer-sm-btn"
                                    href="https://t.me/Axioma_Scan"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle size={13} /> Канал
                                </a>
                                <a
                                    className="footer-sm-btn"
                                    href="https://t.me/Eeighth"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <User size={13} /> @Eeighth
                                </a>
                            </div>
                        </div>

                    </div>

                    {/* Дисклеймер о рисках */}
                    <div className="footer-disclaimer">
                        <div className="footer-disclaimer-ic"><AlertTriangle size={18} /></div>
                        <div className="footer-disclaimer-txt">
                            <b>Дисклеймер о рисках.</b> Криптовалюта — высокорискованный и волатильный актив.
                            AXIOMA не является финансовым советником и не гарантирует прибыль. Ничто на этом сайте
                            не является инвестиционной рекомендацией. Все решения вы принимаете самостоятельно и на свой риск.
                            Продукт находится на ранней стадии разработки (MVP).
                        </div>
                    </div>

                    {/* Нижняя строка */}
                    <div className="footer-bottom">
                        <div className="footer-copy">© {YEAR} AXIOMA · axioma-scan.ru</div>
                        <div className="footer-bottom-links">
                            <button className="footer-bottom-link" onClick={() => onNavigate?.('legal:offer')}>Оферта</button>
                            <button className="footer-bottom-link" onClick={() => onNavigate?.('legal:privacy')}>Конфиденциальность</button>
                            <button className="footer-bottom-link" onClick={() => onNavigate?.('legal:terms')}>Условия</button>
                        </div>
                    </div>

                </div>
            </footer>
        </>
    )
}

export default Footer