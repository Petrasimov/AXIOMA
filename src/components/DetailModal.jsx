const style = `
  .dm-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.6);
    backdrop-filter: blur(9px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .dm-modal {
    background: rgba(13,32,51,0.74);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-xl);
    width: 1180px; max-width: 100%;
    box-shadow: 0 32px 96px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    max-height: 92vh;
    overflow: hidden;
    /* Раздвигается вправо, когда открыта шторка монитора позиции */
    transition: width 0.35s cubic-bezier(0.22,0.9,0.3,1);
  }
  .dm-modal.pos-open { width: 1560px; }
  @media (prefers-reduced-motion: reduce) {
    .dm-modal, .dm-panel { transition: none; }
  }

  /* HEADER */
  .dm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 20px;
    background: #071828;
    border-bottom: 1px solid #0e2a42;
    flex-shrink: 0; gap: 12px;
  }
  .dm-header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .dm-header-right { display: flex; align-items: center; gap: 6px; }
  .dm-symbol {
    font-family: var(--font-mono); font-size: 18px; font-weight: 800;
    color: #fff; letter-spacing: 1px;
  }
  .dm-strategy {
    font-size: 10px; font-weight: 600; letter-spacing: 2px;
    color: rgba(255,255,255,0.55);
    padding: 3px 11px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.05);
  }
  .dm-age-badge {
    font-family: var(--font-mono); font-size: 11px;
    color: rgba(255,255,255,0.4);
    border-left: 1px solid rgba(255,255,255,0.1);
    padding-left: 12px;
  }
  .dm-btn {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: var(--radius-sm);
    color: rgba(255,255,255,0.65);
    cursor: pointer; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .dm-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .dm-btn.fav-active { color: #f0a500; border-color: #f0a50066; background: rgba(240,165,0,0.1); }
  .dm-btn.close-btn:hover { background: rgba(224,62,62,0.2); border-color: var(--error); color: var(--error); }

  /* BODY — раскладка:
     [левая колонка: биржи + кривая] [стакан] | [панель позиции] [шторка]
     Высота фиксирована, скролла внутри нет: обе колонки растягиваются
     ровно на доступную высоту, а строки стакана «резиновые». */
  .dm-body {
    flex: 1 1 auto; min-height: 0;
    height: calc(92vh - 64px);
    display: flex; overflow: hidden;
  }

  /* Ядро: доля 50/50 считается ТОЛЬКО между колонкой бирж и стаканом.
     Шторка и панель позиции лежат вне .dm-core и в расчёт не входят. */
  .dm-core { flex: 1 1 auto; min-width: 0; display: flex; }

  .dm-left {
    flex: 0 0 50%; min-width: 0; min-height: 0;
    padding: 14px; display: flex; flex-direction: column; gap: 10px;
    border-right: 1px solid var(--glass-border);
  }
  .dm-obside {
    flex: 1 1 50%; min-width: 0; min-height: 0;
    padding: 14px; display: flex; flex-direction: column;
  }
  /* Карточки бирж и полоса спреда показываются целиком: сжимается только
     кривая, иначе у карточек срезает нижние строки (ставка/перевод). */
  .dm-left > .ex-card, .dm-left > .spread-sep { flex-shrink: 0; }

  /* Вертикальная шторка «Позиция и выход» */
  .dm-strip {
    flex: 0 0 40px; display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: 16px 0; cursor: pointer; user-select: none;
    background: var(--glass-fill); border-left: 1px solid var(--glass-border);
    transition: background 0.15s;
  }
  .dm-strip:hover { background: var(--glass-fill-hover); }
  .dm-strip-label {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 10px; font-weight: 800; letter-spacing: 2px;
    color: var(--text-secondary); display: flex; align-items: center; gap: 9px;
    text-transform: uppercase;
  }
  .dm-strip:hover .dm-strip-label { color: var(--text-primary); }
  .dm-strip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-bright); flex-shrink: 0; }
  .dm-strip-chev { color: var(--accent-bright); transition: transform 0.3s; flex-shrink: 0; }
  .dm-strip.open .dm-strip-chev { transform: rotate(180deg); }

  .dm-panel {
    flex: 0 0 0px; width: 0; overflow: hidden; opacity: 0;
    border-left: 1px solid var(--glass-border);
    transition: flex-basis 0.35s cubic-bezier(0.22,0.9,0.3,1),
                width 0.35s cubic-bezier(0.22,0.9,0.3,1), opacity 0.22s ease;
  }
  .dm-panel.open { flex: 0 0 370px; width: 370px; opacity: 1; }
  .dm-panel-inner {
    width: 370px; height: 100%; padding: 14px;
    overflow-y: auto; overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--accent-bright) rgba(255,255,255,0.05);
  }
  .dm-panel-inner::-webkit-scrollbar { width: 10px; }
  .dm-panel-inner::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
  .dm-panel-inner::-webkit-scrollbar-thumb {
    background: var(--accent-bright); border-radius: 6px;
    border: 3px solid transparent; background-clip: padding-box;
  }

  /* Универсальная карточка инструмента */
  .tool {
    background: var(--glass-fill);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
    overflow: hidden; display: flex; flex-direction: column;
  }
  .tool-h {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 14px; border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.018); flex-shrink: 0;
  }
  .tool-t { font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
  .tool-sub { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); margin-left: auto; }
  .tool-b { padding: 13px 14px; }
  .tool-empty {
    padding: 26px 14px; text-align: center;
    font-size: 11.5px; color: var(--text-muted); line-height: 1.6;
  }
  /* Карточка, забирающая остаток высоты колонки (кривая, стакан) */
  .tool.grow { flex: 1 1 auto; min-height: 0; }
  .tool.grow > .tool-b { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }

  /* EXCHANGE CARD */
  .ex-card {
    border: 1px solid; overflow: hidden;
    border-radius: var(--radius-md);
    position: relative; cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
    backdrop-filter: blur(8px);
  }
  .ex-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    border-radius: 3px 0 0 3px;
  }
  .ex-card.buy { background: linear-gradient(135deg, rgba(0,201,122,0.09), rgba(0,201,122,0.02)); border-color: rgba(0,201,122,0.22); }
  .ex-card.buy:hover { border-color: rgba(0,201,122,0.45); box-shadow: inset 0 0 60px rgba(0,201,122,0.07); }
  .ex-card.buy::before { background: var(--success); box-shadow: 0 0 8px var(--success); }
  .ex-card.sell { background: linear-gradient(135deg, rgba(224,62,62,0.09), rgba(224,62,62,0.02)); border-color: rgba(224,62,62,0.22); }
  .ex-card.sell:hover { border-color: rgba(224,62,62,0.45); box-shadow: inset 0 0 60px rgba(224,62,62,0.07); }
  .ex-card.sell::before { background: var(--error); box-shadow: 0 0 8px var(--error); }
  .ex-inner { padding: 14px 16px 15px 19px; }
  .ex-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
  .ex-name { display: flex; align-items: center; gap: 8px; }
  .ex-logo { width: 22px; height: 22px; border-radius: 50%; object-fit: contain; flex-shrink: 0; }
  .ex-logo-fallback {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; color: #000; flex-shrink: 0;
  }
  .ex-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .ex-role { font-size: 8px; letter-spacing: 1px; color: var(--text-muted); margin-top: 1px; }
  .ex-badge { font-size: 8px; letter-spacing: 1.5px; padding: 3px 8px; border: 1px solid; border-radius: 20px; font-weight: 700; }
  .ex-badge.buy { color: var(--success); border-color: rgba(0,201,122,0.35); }
  .ex-badge.sell { color: var(--error); border-color: rgba(224,62,62,0.35); }
  .ex-price {
    font-family: var(--font-mono); font-size: 24px; font-weight: 800;
    color: #ecebee; margin-bottom: 12px;
    padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); line-height: 1;
  }
  .ex-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .ex-m-label { font-size: 8.5px; letter-spacing: 1px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px; }
  .ex-m-val { font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .ex-m-rate-row { display: flex; align-items: baseline; gap: 6px; }
  .ex-m-rate { font-family: var(--font-mono); font-size: 14px; font-weight: 700; }
  .ex-m-rate.green { color: var(--success); }
  .ex-m-rate.red   { color: var(--error); }
  .ex-m-time { font-family: var(--font-mono); font-size: 10px; color: var(--warning); }
  .ex-m-transfer { font-size: 12px; color: var(--text-secondary); }

  /* SPREAD SEPARATOR */
  .spread-sep {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 15px 13px 19px;
    background: var(--glass-fill);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-md);
  }
  .ss-left { display: flex; align-items: center; gap: 9px; }
  .ss-label { font-size: 8.5px; color: var(--text-secondary); letter-spacing: 1.5px; }
  .ss-val { font-family: var(--font-mono); font-size: 23px; font-weight: 700; }
  .ss-grade { font-size: 9px; font-weight: 700; letter-spacing: 2px; padding: 3px 9px; border: 1px solid; border-radius: 20px; }

  .trade-btn {
    padding: 11px 28px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    border-radius: var(--radius-sm);
    cursor: pointer; border: 1px solid; transition: all 0.15s;
    font-family: var(--font-sans); white-space: nowrap;
  }
  .trade-btn.default { color: var(--accent-bright); border-color: rgba(61,135,192,0.4); background: rgba(61,135,192,0.07); }
  .trade-btn.default:hover { background: rgba(61,135,192,0.15); }
  .trade-btn.ready { color: #000; border-color: var(--success); background: var(--success); }
  .trade-btn.ready:hover { background: #00e88a; border-color: #00e88a; }
  .trade-btn.exit { color: #fff; border-color: var(--error); background: var(--error); }
  .trade-btn.exit:hover { background: #ff4f4f; }

  /* ══ СТАКАН: биржевой вид — продажа сверху, покупка снизу ══
     Скролла внутри нет ни при каком размере: строки «резиновые» (flex),
     они сжимаются/растягиваются под доступную высоту. */
  .ob-modes {
    display: flex; gap: 3px; margin-left: auto; padding: 3px;
    border-radius: var(--radius-sm);
    background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border);
  }
  .ob-mode {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 24px; padding: 0; cursor: pointer;
    background: none; border: none; border-radius: 5px;
    color: var(--text-muted); transition: background 0.15s, color 0.15s;
  }
  .ob-mode:hover { background: var(--glass-fill-hover); color: var(--text-secondary); }
  .ob-mode.on { background: rgba(61,135,192,0.18); color: var(--text-primary); }

  .ob-frame {
    flex: 1 1 auto; min-height: 0;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .ob-half { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
  .ob-half-h {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
    padding: 0 10px 8px; border-bottom: 1px solid var(--glass-border);
  }
  /* Стык сторон: воздух + тонкая линия с переходом красный→зелёный.
     Данные не приглушаем — у стыка стоят лучшие цены обеих сторон,
     это самое важное место стакана. */
  .ob-split {
    flex: 0 0 auto; height: 1px; margin: 10px 10px 12px; border-radius: 1px;
    background: linear-gradient(90deg,
      rgba(224,62,62,0.30), rgba(255,255,255,0.09) 50%, rgba(0,201,122,0.30));
  }
  /* Второй заголовок не должен выглядеть как новый блок — он тише первого */
  .ob-half-h.second { border-bottom-color: rgba(255,255,255,0.05); padding-top: 0; }
  .ob-col-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .ob-col-role {
    margin-left: auto; font-family: var(--font-mono); font-size: 8.5px;
    letter-spacing: 1px; padding: 3px 9px; border-radius: 20px; border: 1px solid; font-weight: 700;
  }
  .ob-col-role.sell { color: var(--error); border-color: rgba(224,62,62,0.4); background: rgba(224,62,62,0.06); }
  .ob-col-role.buy  { color: var(--success); border-color: rgba(0,201,122,0.4); background: rgba(0,201,122,0.06); }
  .ob-count { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); }

  .ob-cols {
    flex: 0 0 auto;
    display: grid; grid-template-columns: 1.15fr 1fr 1fr 1fr; gap: 8px;
    padding: 6px 10px; font-size: 8px; letter-spacing: 0.5px;
    text-transform: uppercase; color: var(--text-muted);
  }
  .ob-cols span { text-align: right; }
  .ob-cols span:first-child { text-align: left; }

  .ob-rows { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; }
  .ob-row {
    flex: 1 1 26px; min-height: 17px; max-height: 32px;
    display: grid; grid-template-columns: 1.15fr 1fr 1fr 1fr; gap: 8px;
    position: relative; align-items: center;
    padding: 0 10px; font-family: var(--font-mono); font-size: 11px;
  }
  .ob-bar {
    position: absolute; top: 2px; bottom: 2px; right: 0;
    border-radius: 3px; opacity: 0.13; pointer-events: none;
  }
  .ob-half.sell .ob-bar, .ob-solo-col.sell .ob-bar { background: var(--error); }
  .ob-half.buy  .ob-bar, .ob-solo-col.buy  .ob-bar { background: var(--success); }
  .ob-row.zone { background: rgba(240,165,0,0.08); }
  .ob-row.zone .ob-p { color: var(--warning); }
  .ob-p { position: relative; font-weight: 700; text-align: left; }
  .ob-half.sell .ob-p, .ob-solo-col.sell .ob-p { color: var(--error); }
  .ob-half.buy  .ob-p, .ob-solo-col.buy  .ob-p { color: var(--success); }
  .ob-q, .ob-cum { position: relative; text-align: right; color: var(--text-secondary); font-size: 10px; }
  .ob-t { position: relative; text-align: right; color: var(--text-primary); font-weight: 600; }


  /* Режимы «только продажа/покупка»: две колонки той же биржи,
     чтобы удвоить глубину без сжатия строк */
  .ob-solo-h {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
    padding: 0 10px 8px; border-bottom: 1px solid var(--glass-border);
  }
  .ob-solo { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }

  .ob-empty-col { padding: 20px 10px; text-align: center; font-size: 10.5px; color: var(--text-muted); }
  .ob-foot {
    flex: 0 0 auto;
    display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; padding-top: 8px;
    border-top: 1px solid var(--glass-border);
    font-family: var(--font-mono); font-size: 9.5px; color: var(--text-muted);
  }
  .ob-foot b { color: var(--text-primary); font-size: 11px; }
  /* Пояснение подсветки: жёлтым выделены уровни, дающие профит */
  .ob-legend { display: inline-flex; align-items: center; gap: 6px; }
  .ob-legend i {
    display: inline-block; width: 16px; height: 9px; border-radius: 3px;
    background: rgba(240,165,0,0.28); border: 1px solid rgba(240,165,0,0.5);
  }

  /* ── КРИВАЯ ИСПОЛНЕНИЯ ── */
  .curve-chart { flex: 1 1 auto; min-height: 110px; width: 100%; }
  .curve-legend {
    display: flex; gap: 13px; font-family: var(--font-mono); font-size: 8.5px;
    color: var(--text-muted); margin-top: 8px; flex-wrap: wrap; flex-shrink: 0;
  }
  .curve-legend i { display: inline-block; width: 13px; height: 2px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .curve-tip {
    background: rgba(7,24,40,0.96); border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-sm); padding: 7px 10px;
    font-family: var(--font-mono); font-size: 10.5px; color: var(--text-primary);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  .curve-tip-k { color: var(--text-muted); font-size: 9px; display: block; margin-bottom: 3px; }

  /* ── МОНИТОР ПОЗИЦИИ ── */
  .pos-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
  .pos-in-l { font-size: 8.5px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
  .pos-in {
    width: 100%; padding: 9px 11px; border-radius: var(--radius-sm);
    font-family: var(--font-mono); font-size: 12.5px; font-weight: 700;
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-primary); outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pos-in:focus { border-color: var(--accent-bright); box-shadow: 0 0 0 3px rgba(61,135,192,0.15); }
  .pos-in.s { border-left: 2px solid var(--error); }
  .pos-in.b { border-left: 2px solid var(--success); }
  .pos-leg {
    padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 8px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
  }
  .pos-leg.s { border-left: 2px solid var(--error); }
  .pos-leg.b { border-left: 2px solid var(--success); }
  .pos-leg-top { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .pos-leg-name { font-size: 11px; font-weight: 700; }
  .pos-leg-dir { font-family: var(--font-mono); font-size: 9px; font-weight: 800; letter-spacing: 1px; }
  .pos-leg-pnl { margin-left: auto; font-family: var(--font-mono); font-size: 12.5px; font-weight: 800; }
  .pos-leg-prices { display: flex; gap: 6px; align-items: center; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); }
  .pos-leg-prices s { color: var(--text-muted); text-decoration: none; }
  .pos-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.05); margin-top: 7px; overflow: hidden; }
  .pos-bar i { display: block; height: 100%; border-radius: 3px; }
  .pos-sum {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px;
    padding: 11px 0; border-top: 1px solid var(--glass-border); margin-top: 3px;
  }
  .pos-sum-k { font-size: 8.5px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px; }
  .pos-sum-v { font-family: var(--font-mono); font-size: 14.5px; font-weight: 800; }
  .pos-hint {
    display: flex; gap: 8px; padding: 8px 11px; border-radius: var(--radius-sm);
    font-size: 10.5px; line-height: 1.5;
    background: rgba(0,201,122,0.07); border: 1px solid rgba(0,201,122,0.25); color: var(--success);
  }
  .pos-hint.warn { background: rgba(240,165,0,0.07); border-color: rgba(240,165,0,0.25); color: var(--warning); }
  .pos-hint.neutral { background: rgba(61,135,192,0.07); border-color: rgba(61,135,192,0.25); color: var(--text-secondary); }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ
     ══════════════════════════════════════════════════════════════
     На десктопе тело — горизонтальная строка фиксированной высоты
     без скролла. На узких экранах эта раскладка не работает: колонки
     схлопываются в одну, тело начинает скроллиться целиком, а стакан
     получает фиксированную высоту (строки остаются читаемыми, свой
     скролл внутри стакана по-прежнему не появляется).
  */
  @media (max-width: 1100px) {
    .dm-body { height: auto; max-height: calc(92vh - 64px); overflow-y: auto; overscroll-behavior: contain; }
    .dm-core { flex-direction: column; }
    .dm-left { flex: 0 0 auto; border-right: none; border-bottom: 1px solid var(--glass-border); }
    .dm-obside { flex: 0 0 auto; height: 560px; }
    .dm-panel.open { flex-basis: 300px; width: 300px; }
    .dm-panel-inner { width: 300px; }
  }

  @media (max-width: 768px) {
    .dm-overlay { padding: 0; align-items: stretch; }
    .dm-modal {
      width: 100%; max-width: 100%; height: 100%; max-height: 100dvh;
      border-radius: 0;
      /* 30px blur ощутимо просаживает FPS на мобильном GPU */
      backdrop-filter: blur(16px) saturate(160%);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
    }
    .dm-header {
      padding: 12px 14px;
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    .dm-btn { width: 40px; height: 40px; }
    .dm-body {
      height: auto; max-height: calc(100dvh - 62px);
      padding-bottom: env(safe-area-inset-bottom);
      -webkit-overflow-scrolling: touch;
    }
    .dm-left, .dm-obside { padding: 12px; }
    .dm-obside { height: 500px; }
    /* Шторка на телефоне не помещается сбоку — панель раскрывается на всю ширину */
    .dm-strip { flex-basis: 34px; }
    .dm-strip-label { font-size: 9px; letter-spacing: 1.4px; }
    .dm-panel.open { flex-basis: auto; width: 100%; }
    .dm-panel-inner { width: 100%; }
    .pos-inputs { grid-template-columns: 1fr; }
    .pos-sum { grid-template-columns: 1fr 1fr; }
    .ob-row { font-size: 10.5px; }
  }

  @media (max-width: 480px) {
    .dm-symbol { font-size: 16px; }
    .dm-strategy { font-size: 9px; padding: 3px 9px; }
    /* Возраст возможности — второстепенная деталь при таком дефиците места */
    .dm-age-badge { display: none; }
    .pos-sum { grid-template-columns: 1fr; }
    .dm-obside { height: 440px; }
    /* Накопительный объём — первое, чем жертвуем при дефиците ширины */
    .ob-cols { grid-template-columns: 1.2fr 1fr 1fr; }
    .ob-row { grid-template-columns: 1.2fr 1fr 1fr; }
    .ob-cols span:nth-child(3), .ob-cum { display: none; }
  }
`

import { useState, useEffect, useMemo } from 'react'
import { Star, Trash2, X, ChevronLeft } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, LabelList,
} from 'recharts'
import { connectOrderBook } from '../ws.js'
import {
  getExchangeInfo, getSpreadColor, getSpreadGrade,
  formatPrice, formatVolume, formatAge, formatTimeRemaining, calcMaxVolume, calcVwap
} from '../utils.js'

const STRATEGY_NAMES = { ff: 'FUTURES-FUTURES', sf: 'SPOT-FUTURES' }

// Taker-комиссии бирж в процентах за одну сделку (базовые публичные ставки).
// Используются только для оценки «что останется» — реальная ставка зависит
// от VIP-уровня и holdings, поэтому цифры намеренно консервативные.
const TAKER_FEES = {
  binance: 0.05,
  bybit:   0.055,
  okx:     0.05,
  gate:    0.05,
  kucoin:  0.06,
  mexc:    0.02,
  bingx:   0.05,
  bitget:  0.06,
}
const DEFAULT_FEE = 0.055

function takerFee(exId) {
  return TAKER_FEES[String(exId).toLowerCase()] ?? DEFAULT_FEE
}

// Точки объёма для кривой исполнения
const CURVE_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 20000]

// ─── Logo с fallback ──────────────────────────────────────────────────────────
function ExLogo({ info }) {
  const [err, setErr] = useState(false)
  if (!err && info.logo) {
    return (
      <img
        className="ex-logo"
        src={info.logo}
        alt={info.name}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="ex-logo-fallback" style={{ background: info.color }}>
      {info.short}
    </div>
  )
}

// ─── Exchange Card ────────────────────────────────────────────────────────────
function ExCard({ side, opp, book, livePrice, refPrice }) {
  const ex = side === 'bid' ? opp.bid_ex : opp.ask_ex
  const info = getExchangeInfo(ex)
  const price = side === 'bid' ? opp.bid_price : opp.ask_price
  const funding = side === 'bid' ? opp.bid_funding : opp.ask_funding
  const volume = side === 'bid' ? opp.bid_volume : opp.ask_volume
  const transfer = side === 'bid' ? opp.bid_transfer : opp.ask_transfer
  const isBuy = side === 'ask'

  const sym = opp.symbol.replace(/USDT$/, '')
  const url = isBuy
    ? (opp.strategy === 'sf' ? info.spotUrl?.(sym) : info.futuresUrl?.(sym))
    : info.futuresUrl?.(sym)

  const displayPrice = livePrice ?? price

  // bid-карточка (SELL): объём доступных покупателей → bids
  // ask-карточка (BUY):  объём доступных продавцов   → asks
  const maxVol = book && refPrice
    ? calcMaxVolume(isBuy ? book.asks : book.bids, refPrice, isBuy ? 'long' : 'short')
    : null

  const fundRate = funding?.rate ?? 0

  return (
    <div
      className={`ex-card ${isBuy ? 'buy' : 'sell'}`}
      onClick={() => url && window.open(url, '_blank')}
      title={`Открыть ${info.name}`}
    >
      <div className="ex-inner">
        <div className="ex-top">
          <div className="ex-name">
            <ExLogo info={info} />
            <div>
              <div className="ex-title">{info.name}</div>
              <div className="ex-role">{side === 'bid' ? 'BID EXCHANGE' : 'ASK EXCHANGE'}</div>
            </div>
          </div>
          <span className={`ex-badge ${isBuy ? 'buy' : 'sell'}`}>
            {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}
          </span>
        </div>

        <div className="ex-price">${formatPrice(displayPrice)}</div>

        <div className="ex-metrics">
          <div className="ex-m-block">
            <div className="ex-m-label">Объём 24h</div>
            <div className="ex-m-val">{formatVolume(volume)}</div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Макс. объём</div>
            <div className="ex-m-val">{maxVol ? '$' + formatVolume(maxVol.usd) : '—'}</div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Ставка финансирования</div>
            <div className="ex-m-rate-row">
              <span className={`ex-m-rate ${fundRate >= 0 ? 'green' : 'red'}`}>
                {fundRate >= 0 ? '+' : ''}{fundRate.toFixed(4)}%
              </span>
              <span className="ex-m-time">{formatTimeRemaining(funding?.next_time)}</span>
            </div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Перевод</div>
            <div className="ex-m-transfer">
              W: {transfer?.withdraw ? '✅' : '❌'} &nbsp; D: {transfer?.deposit ? '✅' : '❌'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Стакан в биржевом стиле ──────────────────────────────────────────────────
// Раскладка как в терминале: сверху сторона продажи (биржа bid_ex, её bids),
// снизу сторона покупки (ask_ex, её asks). Лучшие цены обеих сторон сходятся
// к центру — именно там происходит арбитраж, и жёлтым подсвечены те уровни,
// на которых спред ещё положительный.
//
// Три режима просмотра:
//   both — 10 уровней продажи + 10 покупки
//   sell — только продажа, единый стакан на 20 уровней (лучшая цена внизу)
//   buy  — только покупка, единый стакан на 20 уровней (лучшая цена вверху)
// Собственного скролла у стакана нет: строки резиновые (flex) и подстраиваются
// под доступную высоту.
const OB_HALF_DEPTH = 10           // уровней на сторону в режиме «оба»
const OB_SOLO_DEPTH = OB_HALF_DEPTH * 2  // уровней в режиме одной стороны

function fmtQty(q) {
  if (!isFinite(q)) return '—'
  if (q >= 1000) return formatVolume(q)
  if (q >= 1) return q.toFixed(2)
  return q.toPrecision(3)
}

// Иконки режимов — в стилистике биржевых переключателей стакана:
// обе стороны / только продажа / только покупка.
function ModeIcon({ mode }) {
  const red = 'var(--error)', green = 'var(--success)'
  const rows = mode === 'sell'
    ? [red, red, red, red]
    : mode === 'buy'
      ? [green, green, green, green]
      : [red, red, green, green]
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {rows.map((c, i) => (
        <rect key={i} x="1" y={1 + i * 3.4} width={i % 2 ? 9 : 12} height="2.2" rx="1" fill={c} />
      ))}
    </svg>
  )
}

function OrderBookRow({ r, maxUsd }) {
  return (
    <div className={`ob-row ${r.zone ? 'zone' : ''}`}>
      <span className="ob-bar" style={{ width: `${Math.max(4, Math.min(100, r.usd / maxUsd * 100))}%` }} />
      <span className="ob-p">{formatPrice(r.p)}</span>
      <span className="ob-q">{fmtQty(r.q)}</span>
      <span className="ob-cum">${formatVolume(r.cum)}</span>
      <span className="ob-t">${formatVolume(r.usd)}</span>
    </div>
  )
}

function OrderBookLadder({ bidBook, askBook, bidEx, askEx }) {
  const [mode, setMode] = useState('both')
  const bidInfo = getExchangeInfo(bidEx)
  const askInfo = getExchangeInfo(askEx)

  const data = useMemo(() => {
    const take = (src, n) => (src ?? []).slice(0, n)
      .map(([p, q]) => ({ p: parseFloat(p), q: parseFloat(q) }))
      .filter(l => l.p > 0 && l.q > 0)

    // Берём сразу максимальную глубину — режим только решает, сколько показать
    const bids = take(bidBook?.bids, OB_SOLO_DEPTH)
    const asks = take(askBook?.asks, OB_SOLO_DEPTH)
    if (!bids.length && !asks.length) return null

    const bestAsk = asks[0]?.p ?? Infinity
    const bestBid = bids[0]?.p ?? -Infinity

    // Накопительный объём считается от лучшей цены вглубь стакана
    const withCum = (rows, zoneFn) => {
      let cum = 0
      return rows.map(l => {
        const usd = l.p * l.q
        cum += usd
        return { ...l, usd, cum, zone: zoneFn(l.p) }
      })
    }
    // Продаём выше лучшего ask и покупаем ниже лучшего bid → это и есть профит
    const bidRows = withCum(bids, p => p > bestAsk)
    const askRows = withCum(asks, p => p < bestBid)

    // Общий масштаб depth-полос: обе стороны меряются одной линейкой,
    // иначе крупный уровень на одной бирже визуально не сравнить с другой
    const maxUsd = Math.max(
      ...bidRows.map(r => r.usd),
      ...askRows.map(r => r.usd),
      1,
    )

    return { bidRows, askRows, maxUsd }
  }, [bidBook, askBook])

  const modeSwitch = (
    <div className="ob-modes">
      {[
        { id: 'both', title: 'Продажа и покупка' },
        { id: 'sell', title: `Только продажа · ${bidInfo.name}` },
        { id: 'buy',  title: `Только покупка · ${askInfo.name}` },
      ].map(m => (
        <button
          key={m.id}
          className={`ob-mode ${mode === m.id ? 'on' : ''}`}
          onClick={() => setMode(m.id)}
          title={m.title}
          aria-label={m.title}
          aria-pressed={mode === m.id}
        >
          <ModeIcon mode={m.id} />
        </button>
      ))}
    </div>
  )

  if (!data) {
    return (
      <div className="tool grow">
        <div className="tool-h">
          <span className="tool-t">Стакан</span>
          {modeSwitch}
        </div>
        <div className="tool-empty">Ждём данные стакана обеих бирж…</div>
      </div>
    )
  }

  const { bidRows, askRows, maxUsd } = data

  const colHead = (
    <div className="ob-cols">
      <span>Цена</span><span>Кол-во</span><span>Накоп.</span><span>Сумма $</span>
    </div>
  )

  const sideHead = (info, kind, role, count, second) => (
    <div className={`ob-half-h ${second ? 'second' : ''}`}>
      <ExLogo info={info} />
      <span className="ob-col-name">{info.name}</span>
      <span className={`ob-col-role ${kind}`}>{role}</span>
      <span className="ob-count">{count}</span>
    </div>
  )

  // Половина стакана. reverse=true для стороны продажи: худшая цена уходит
  // наверх, лучшая оказывается у центральной полосы — как в биржевом стакане.
  const renderHalf = (rows, kind, reverse) => {
    const list = reverse ? [...rows].reverse() : rows
    return (
      <div className={`ob-half ${kind}`}>
        {colHead}
        <div className="ob-rows">
          {list.length
            ? list.map((r, i) => <OrderBookRow key={i} r={r} maxUsd={maxUsd} />)
            : <div className="ob-empty-col">нет данных</div>}
        </div>
      </div>
    )
  }

  // Режим одной стороны: единый стакан на 20 уровней в одну колонку.
  // reverse=true для продажи — лучшая цена оказывается в самом низу,
  // для покупки лучшая цена остаётся сверху.
  const renderSolo = (rows, kind, reverse) => {
    const list = reverse
      ? [...rows.slice(0, OB_SOLO_DEPTH)].reverse()
      : rows.slice(0, OB_SOLO_DEPTH)
    return (
      <div className={`ob-solo ob-solo-col ${kind}`}>
        {colHead}
        <div className="ob-rows">
          {list.length
            ? list.map((r, i) => <OrderBookRow key={i} r={r} maxUsd={maxUsd} />)
            : <div className="ob-empty-col">нет данных</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="tool grow">
      <div className="tool-h">
        <span className="tool-t">Стакан</span>
        {modeSwitch}
      </div>
      <div className="tool-b">
        <div className="ob-frame">
          {mode === 'both' && (
            <>
              {sideHead(bidInfo, 'sell', 'ПРОДАЁМ · BID', `${Math.min(bidRows.length, OB_HALF_DEPTH)} ур.`)}
              {renderHalf(bidRows.slice(0, OB_HALF_DEPTH), 'sell', true)}

              <div className="ob-split" />

              {sideHead(askInfo, 'buy', 'ПОКУПАЕМ · ASK', `${Math.min(askRows.length, OB_HALF_DEPTH)} ур.`, true)}
              {renderHalf(askRows.slice(0, OB_HALF_DEPTH), 'buy', false)}
            </>
          )}

          {mode === 'sell' && (
            <>
              {sideHead(bidInfo, 'sell', 'ПРОДАЁМ · BID', `${bidRows.length} ур.`)}
              {renderSolo(bidRows, 'sell', true)}
            </>
          )}

          {mode === 'buy' && (
            <>
              {sideHead(askInfo, 'buy', 'ПОКУПАЕМ · ASK', `${askRows.length} ур.`)}
              {renderSolo(askRows, 'buy', false)}
            </>
          )}
        </div>

        <div className="ob-foot">
          <span className="ob-legend"><i />уровни со спредом в плюс</span>
        </div>
      </div>
    </div>
  )
}

// ─── Кривая исполнения ────────────────────────────────────────────────────────
// Отвечает на вопрос «какой спред я реально получу на СВОЙ объём».
// Чем больше позиция, тем глубже приходится идти по стакану и тем хуже
// средняя цена исполнения — кривая показывает эту деградацию наглядно
// и даёт предельный объём, после которого сделка уходит в минус.
// Построена на recharts: значение подписано прямо над каждой точкой.
// Кривая начинается с нулевого объёма и обрывается на первой точке ниже
// безубытка — что происходит глубже, для входа уже не имеет значения.
function curveVolLabel(usd) {
  return usd >= 1000 ? `$${usd / 1000}K` : `$${usd}`
}

function CurveTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="curve-tip">
      <span className="curve-tip-k">объём {curveVolLabel(p.usd)}</span>
      <span style={{ color: p.net >= 0 ? 'var(--success)' : 'var(--error)' }}>
        {p.net >= 0 ? '+' : ''}{p.net.toFixed(2)}% чистыми
      </span>
    </div>
  )
}

function ExecutionCurve({ bidBook, askBook, tradeAmount, feeTotal }) {
  const data = useMemo(() => {
    if (!bidBook?.bids?.length || !askBook?.asks?.length) return null

    // Нулевая точка — спред по верхушке стакана, до всякого проскальзывания.
    // Именно с неё кривая и должна начинаться: при объёме → 0 глубина не задета.
    const topBid = parseFloat(bidBook.bids[0]?.[0] ?? 0)
    const topAsk = parseFloat(askBook.asks[0]?.[0] ?? 0)
    if (!topBid || !topAsk) return null

    const raw = [{ usd: 0, net: (topBid - topAsk) / topBid * 100 - feeTotal }]
    for (const usd of CURVE_STEPS) {
      const vb = calcVwap(bidBook.bids, usd)
      const va = calcVwap(askBook.asks, usd)
      // null означает что стакана не хватает на такой объём — дальше не идём
      if (!vb || !va) break
      const gross = (vb - va) / vb * 100
      raw.push({ usd, net: gross - feeTotal })
    }
    if (raw.length < 2) return null

    // Ниже нуля показываем ровно один пункт: важно увидеть, ГДЕ кривая
    // пересекла безубыток, а насколько глубоко она падает дальше — неинформативно.
    const points = []
    for (const p of raw) {
      points.push(p)
      if (p.net < 0) break
    }
    if (points.length < 2) points.push(raw[1])

    // Спред на объёме пользователя
    const vbUser = calcVwap(bidBook.bids, tradeAmount)
    const vaUser = calcVwap(askBook.asks, tradeAmount)
    const userNet = (vbUser && vaUser)
      ? (vbUser - vaUser) / vbUser * 100 - feeTotal
      : null

    // Предельный объём — линейная интерполяция между последней прибыльной
    // и первой убыточной точкой
    let breakEvenUsd = null
    for (let i = 1; i < points.length; i++) {
      if (points[i - 1].net > 0 && points[i].net <= 0) {
        const a = points[i - 1], b = points[i]
        const k = a.net / (a.net - b.net)
        breakEvenUsd = a.usd + (b.usd - a.usd) * k
        break
      }
    }

    return { points, userNet, breakEvenUsd, maxUsd: points[points.length - 1].usd }
  }, [bidBook, askBook, tradeAmount, feeTotal])

  if (!data) {
    return (
      <div className="tool grow">
        <div className="tool-h"><span className="tool-t">Кривая исполнения</span></div>
        <div className="tool-empty">Ждём данные стакана…</div>
      </div>
    )
  }

  const { points, userNet, breakEvenUsd } = data

  // Ось X — категориальная: шаги объёма распределены равномерно, иначе на
  // линейной шкале первые точки слипаются у левого края и график нечитаем.
  const userTick = points.some(p => p.usd === tradeAmount) ? tradeAmount : null

  return (
    <div className="tool grow">
      <div className="tool-h">
        <span className="tool-t">Кривая исполнения</span>
        <span className="tool-sub">
          {breakEvenUsd
            ? `предел ${'$'}${formatVolume(breakEvenUsd)}`
            : 'спред в плюсе на всём стакане'}
        </span>
      </div>
      <div className="tool-b">
        <div className="curve-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 20, right: 14, bottom: 4, left: -12 }}>
              <defs>
                <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="usd"
                tickFormatter={curveVolLabel}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                stroke="var(--text-muted)"
                tickLine={false}
                interval={0}
                minTickGap={4}
              />
              <YAxis
                tickFormatter={v => `${v.toFixed(1)}%`}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                stroke="var(--text-muted)"
                tickLine={false}
                width={46}
              />

              <Tooltip content={<CurveTooltip />} cursor={{ stroke: 'var(--accent-bright)', strokeDasharray: '3 3' }} />

              {/* Безубыток */}
              <ReferenceLine y={0} stroke="var(--error)" strokeDasharray="4 3" strokeWidth={1.4} />
              {/* Объём пользователя */}
              {userTick !== null && (
                <ReferenceLine x={userTick} stroke="var(--warning)" strokeDasharray="2 3" strokeWidth={1.2} />
              )}

              <Area
                type="monotone"
                dataKey="net"
                stroke="var(--accent-bright)"
                strokeWidth={2.2}
                fill="url(#ecGrad)"
                dot={{ r: 2.8, fill: 'var(--accent-bright)', strokeWidth: 0 }}
                activeDot={{ r: 4.5, fill: 'var(--accent-bright)', stroke: 'var(--chart-dot-stroke)', strokeWidth: 2 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="net"
                  position="top"
                  offset={8}
                  formatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                  style={{ fill: 'var(--text-secondary)', fontSize: 8.5, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="curve-legend">
          <span><i style={{ background: 'var(--accent-bright)' }} />чистый спред</span>
          <span><i style={{ background: 'var(--error)' }} />безубыток</span>
          {userTick !== null && <span><i style={{ background: 'var(--warning)' }} />твой объём</span>}
          {userNet !== null && (
            <span style={{ marginLeft: 'auto', color: userNet >= 0 ? 'var(--success)' : 'var(--error)' }}>
              на ${formatVolume(tradeAmount)}: {userNet >= 0 ? '+' : ''}{userNet.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Монитор позиции + калькулятор выхода ─────────────────────────────────────
// Два инструмента слиты в один: без введённых цен входа монитор показывать
// нечего, а сам по себе калькулятор без разбивки по ногам мало что объясняет.
function PositionMonitor({
  opp, tradeAmount,
  avgShort, avgLong, onAvgShort, onAvgLong,
  curBidExit, curAskExit, spreadNow,
  feeTotal,
}) {
  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)

  const nShort = parseFloat(avgShort)
  const nLong  = parseFloat(avgLong)
  const filled = !!(nShort > 0 && nLong > 0)

  const calc = useMemo(() => {
    if (!filled) return null

    const entrySpread = (nShort - nLong) / nShort * 100

    // SHORT прибылен когда цена падает, LONG — когда растёт
    const shortPct = (nShort - curBidExit) / nShort * 100
    const longPct  = (curAskExit - nLong) / nLong * 100

    // Половина капитала в каждой ноге
    const legAmount = tradeAmount / 2
    const shortPnl = shortPct * legAmount / 100
    const longPnl  = longPct  * legAmount / 100

    // Спред выхода: сколько стоит закрыть обе ноги прямо сейчас
    const exitSpread = (curBidExit - curAskExit) / curBidExit * 100
    const grossPnl = shortPnl + longPnl

    // Комиссии: feeTotal — это уже вход+выход по обеим биржам в процентах,
    // берётся с номинала одной ноги (так же, как считает кривая исполнения)
    const feeCost = feeTotal / 100 * legAmount
    const totalPnl = grossPnl - feeCost

    // Точка безубытка — это НЕ размер комиссии, а тот спред выхода, при котором
    // прибыль от схождения ровно покрывает комиссии: entry - exit - fee = 0.
    const breakEven = entrySpread - feeTotal

    // Сколько движения уже отработано — путь от спреда входа до безубытка
    const span = entrySpread - breakEven === 0 ? 1 : entrySpread - breakEven
    const progress = Math.max(0, Math.min(100, (entrySpread - exitSpread) / span * 100))

    return {
      entrySpread, shortPct, longPct, shortPnl, longPnl,
      exitSpread, totalPnl, progress, breakEven,
    }
  }, [filled, nShort, nLong, curBidExit, curAskExit, tradeAmount, feeTotal])

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Позиция и выход</span>
        <span className="tool-sub">
          {filled ? `спред сейчас ${spreadNow.toFixed(2)}%` : 'введи цены входа'}
        </span>
      </div>
      <div className="tool-b">

        <div className="pos-inputs">
          <div>
            <div className="pos-in-l">Avg Short — вход BID (SELL)</div>
            <input
              className="pos-in s"
              type="number"
              placeholder={formatPrice(opp.bid_price)}
              value={avgShort}
              onChange={e => onAvgShort(e.target.value)}
            />
          </div>
          <div>
            <div className="pos-in-l">Avg Long — вход ASK (BUY)</div>
            <input
              className="pos-in b"
              type="number"
              placeholder={formatPrice(opp.ask_price)}
              value={avgLong}
              onChange={e => onAvgLong(e.target.value)}
            />
          </div>
        </div>

        {!calc && (
          <div className="pos-hint neutral">
            Введи средние цены входа по обеим ногам — покажу P&amp;L каждой стороны,
            спред выхода и точку безубытка.
          </div>
        )}

        {calc && (
          <>
            <div className="pos-leg s">
              <div className="pos-leg-top">
                <span className="pos-leg-name">{bidInfo.name}</span>
                <span className="pos-leg-dir" style={{ color: 'var(--error)' }}>SHORT</span>
                <span className="pos-leg-pnl" style={{ color: calc.shortPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.shortPnl >= 0 ? '+' : ''}${calc.shortPnl.toFixed(2)}
                </span>
              </div>
              <div className="pos-leg-prices">
                <s>{formatPrice(nShort)}</s> → {formatPrice(curBidExit)}
                <span style={{ color: calc.shortPct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.shortPct >= 0 ? '+' : ''}{calc.shortPct.toFixed(2)}%
                </span>
              </div>
              <div className="pos-bar">
                <i style={{
                  width: `${Math.min(100, Math.abs(calc.shortPct) * 20)}%`,
                  background: calc.shortPct >= 0 ? 'var(--success)' : 'var(--error)',
                }} />
              </div>
            </div>

            <div className="pos-leg b">
              <div className="pos-leg-top">
                <span className="pos-leg-name">{askInfo.name}</span>
                <span className="pos-leg-dir" style={{ color: 'var(--success)' }}>LONG</span>
                <span className="pos-leg-pnl" style={{ color: calc.longPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.longPnl >= 0 ? '+' : ''}${calc.longPnl.toFixed(2)}
                </span>
              </div>
              <div className="pos-leg-prices">
                <s>{formatPrice(nLong)}</s> → {formatPrice(curAskExit)}
                <span style={{ color: calc.longPct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.longPct >= 0 ? '+' : ''}{calc.longPct.toFixed(2)}%
                </span>
              </div>
              <div className="pos-bar">
                <i style={{
                  width: `${Math.min(100, Math.abs(calc.longPct) * 20)}%`,
                  background: calc.longPct >= 0 ? 'var(--success)' : 'var(--error)',
                }} />
              </div>
            </div>

            <div className="pos-sum">
              <div>
                <div className="pos-sum-k">спред входа</div>
                <div className="pos-sum-v" style={{ color: 'var(--text-muted)' }}>
                  {calc.entrySpread.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="pos-sum-k">спред выхода</div>
                <div className="pos-sum-v" style={{ color: getSpreadColor(calc.exitSpread) }}>
                  {calc.exitSpread.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="pos-sum-k">чистый P&amp;L</div>
                <div className="pos-sum-v" style={{ color: calc.totalPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.totalPnl >= 0 ? '+' : ''}${calc.totalPnl.toFixed(2)}
                </div>
              </div>
            </div>

            {calc.exitSpread <= calc.breakEven ? (
              <div className="pos-hint">
                ✓ Спред сошёлся до {calc.exitSpread.toFixed(2)}% — ниже точки безубытка
                ({calc.breakEven.toFixed(2)}%). Комиссии отбиты, можно закрывать.
              </div>
            ) : (
              <div className="pos-hint warn">
                ⏳ Отработано {calc.progress.toFixed(0)}% движения. Выход в ноль — когда спред
                сойдётся до {calc.breakEven.toFixed(2)}% (сейчас {calc.exitSpread.toFixed(2)}%).
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function DetailModal({
  opp, tradeAmount, onClose,
  isFavorite, onFavorite, onHide,
  onTrade, initialAvgLong, initialAvgShort, isActiveTrade, onRemoveTrade,
  tradeError,
}) {
  const [bidBook, setBidBook] = useState(null)
  const [askBook, setAskBook] = useState(null)
  const [avgLong, setAvgLong] = useState(initialAvgLong || '')
  const [avgShort, setAvgShort] = useState(initialAvgShort || '')
  // Монитор позиции скрыт за шторкой — он нужен только когда позиция уже открыта
  const [posOpen, setPosOpen] = useState(false)

  // ВХОД — открываем позицию:
  // SELL на bid-бирже → бьём по bids (покупатели готовы купить у нас)
  // BUY  на ask-бирже → бьём по asks (продавцы готовы продать нам)
  const vwapBid = bidBook ? calcVwap(bidBook.bids, tradeAmount) : null
  const vwapAsk = askBook ? calcVwap(askBook.asks, tradeAmount) : null

  // ВЫХОД — закрываем позицию (разворот):
  // Закрытие SHORT на bid-бирже → покупаем → бьём по asks
  // Закрытие LONG  на ask-бирже → продаём  → бьём по bids
  const vwapBidExit = bidBook ? calcVwap(bidBook.asks, tradeAmount) : null
  const vwapAskExit = askBook ? calcVwap(askBook.bids, tradeAmount) : null

  const liveSpread = (vwapBid && vwapAsk)
    ? (vwapBid - vwapAsk) / vwapBid * 100
    : opp.spread

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const sym = opp.symbol.replace(/USDT$/, '')
    const bidMarket = opp.bid_market || (opp.strategy === 'sf' ? 'spot' : 'futures')
    const askMarket = opp.ask_market || 'futures'
    const bidWs = connectOrderBook(opp.bid_ex, sym, bidMarket, data => {
      setBidBook(data)
    })
    const askWs = connectOrderBook(opp.ask_ex, sym, askMarket, data => {
      setAskBook(data)
    })
    return () => { bidWs.close(); askWs.close() }
  }, [opp.bid_ex, opp.ask_ex, opp.symbol, opp.strategy])

  const curBidExit = vwapBidExit ?? opp.bid_price
  const curAskExit = vwapAskExit ?? opp.ask_price

  const spreadColor = getSpreadColor(liveSpread)
  const spreadGrade = getSpreadGrade(liveSpread)
  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)
  const sym = opp.symbol.replace(/USDT$/, '')

  // ── Разбор потерь ──
  const feeBid = takerFee(opp.bid_ex)
  const feeAsk = takerFee(opp.ask_ex)
  // Вход и выход — по сделке на каждой бирже, значит комиссия берётся дважды
  const feeTotal = (feeBid + feeAsk) * 2

  // Фандинг за одно начисление: платим по короткой ноге, получаем по длинной
  const fundingCost = useMemo(() => {
    const bidRate = opp.bid_funding?.rate ?? 0
    const askRate = opp.ask_funding?.rate ?? 0
    // SHORT платит при положительной ставке, LONG получает — и наоборот
    return Math.max(0, bidRate) + Math.max(0, -askRate)
  }, [opp.bid_funding, opp.ask_funding])

  const calcFilled = !!(avgLong && avgShort && parseFloat(avgLong) > 0 && parseFloat(avgShort) > 0)

  const handleTradeBtn = () => {
    if (isActiveTrade) {
      onRemoveTrade?.()
    } else if (calcFilled) {
      onTrade?.(opp, avgLong, avgShort)
    } else {
      const bidUrl = opp.strategy === 'sf' ? bidInfo.spotUrl?.(sym) : bidInfo.futuresUrl?.(sym)
      const askUrl = askInfo.futuresUrl?.(sym)
      if (bidUrl) window.open(bidUrl, '_blank')
      if (askUrl) window.open(askUrl, '_blank')
    }
  }

  const tradeBtnClass = isActiveTrade ? 'exit' : calcFilled ? 'ready' : 'default'
  const tradeBtnLabel = isActiveTrade ? 'ВЫХОД' : 'ТОРГОВАТЬ'

  return (
    <>
      <style>{style}</style>
      <div className="dm-overlay" onClick={onClose}>
        <div className={`dm-modal ${posOpen ? 'pos-open' : ''}`} onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="dm-header">
            <div className="dm-header-left">
              <span className="dm-symbol">{opp.symbol}</span>
              <span className="dm-strategy">{STRATEGY_NAMES[opp.strategy] ?? opp.strategy.toUpperCase()}</span>
              <span className="dm-age-badge">🕐 {formatAge(opp.first_seen)}</span>
            </div>
            <div className="dm-header-right">
              <button
                className={`dm-btn ${isFavorite ? 'fav-active' : ''}`}
                onClick={onFavorite}
                title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button className="dm-btn" onClick={onHide} title="В чёрный список">
                <Trash2 size={14} />
              </button>
              <button className="dm-btn close-btn" onClick={onClose}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="dm-body">
            <div className="dm-core">

              {/* ЛЕВО — панели бирж, спред, кнопка и кривая исполнения */}
              <div className="dm-left">
                <ExCard side="bid" opp={opp} book={bidBook} livePrice={vwapBid} refPrice={vwapAsk} />

                <div className="spread-sep">
                  <div className="ss-left">
                    <span className="ss-label">СПРЕД</span>
                    <span className="ss-val" style={{ color: spreadColor }}>{liveSpread.toFixed(2)}%</span>
                    <span className="ss-grade" style={{
                      color: spreadGrade.color,
                      borderColor: spreadGrade.color + '40',
                      background: spreadGrade.color + '10',
                    }}>
                      {spreadGrade.label}
                    </span>
                  </div>
                  <button className={`trade-btn ${tradeBtnClass}`} onClick={handleTradeBtn}>
                    {tradeBtnLabel}
                  </button>
                </div>

                {/* Уведомление при превышении лимита активных позиций */}
                {tradeError && (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--error)',
                    background: 'rgba(224,62,62,0.08)',
                    border: '1px solid rgba(224,62,62,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '5px 10px',
                    lineHeight: 1.4,
                  }}>
                    {tradeError}
                  </div>
                )}

                <ExCard side="ask" opp={opp} book={askBook} livePrice={vwapAsk} refPrice={vwapBid} />

                <ExecutionCurve
                  bidBook={bidBook}
                  askBook={askBook}
                  tradeAmount={tradeAmount}
                  feeTotal={feeTotal + fundingCost}
                />
              </div>

              {/* ПРАВО — стакан на всю высоту */}
              <div className="dm-obside">
                <OrderBookLadder
                  bidBook={bidBook}
                  askBook={askBook}
                  bidEx={opp.bid_ex}
                  askEx={opp.ask_ex}
                />
              </div>

            </div>

            {/* Выдвижная панель монитора позиции */}
            <div className={`dm-panel ${posOpen ? 'open' : ''}`}>
              <div className="dm-panel-inner">
                <PositionMonitor
                  opp={opp}
                  tradeAmount={tradeAmount}
                  avgShort={avgShort}
                  avgLong={avgLong}
                  onAvgShort={setAvgShort}
                  onAvgLong={setAvgLong}
                  curBidExit={curBidExit}
                  curAskExit={curAskExit}
                  spreadNow={liveSpread}
                  feeTotal={feeTotal}
                />
              </div>
            </div>

            {/* Шторка-ручка: раздвигает модалку вправо */}
            <div
              className={`dm-strip ${posOpen ? 'open' : ''}`}
              onClick={() => setPosOpen(v => !v)}
              role="button"
              tabIndex={0}
              aria-expanded={posOpen}
              aria-label={posOpen ? 'Скрыть позицию и выход' : 'Показать позицию и выход'}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPosOpen(v => !v) }
              }}
            >
              <span style={{ width: 14 }} />
              <span className="dm-strip-label">
                <span className="dm-strip-dot" />
                Позиция и выход
              </span>
              <ChevronLeft className="dm-strip-chev" size={14} />
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default DetailModal