/**
 * TrainingDiagram.jsx — библиотека обучающих SVG-схем
 *
 * Каждая схема — чистый inline SVG на CSS-переменных темы (без внешних ресурсов).
 * Рендерятся по kind из блока { type:'diagram', kind, caption }.
 * Все размеры адаптивны (viewBox + width:100%), высота фиксирована в разумных пределах.
 */

const wrapStyle = `
  .td-wrap {
    margin: 4px 0;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(8px);
    padding: 20px;
    overflow: hidden;
  }
  .td-svg { width: 100%; height: auto; display: block; overflow: visible; }
  .td-caption {
    margin-top: 12px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.5;
    font-style: italic;
  }
  .td-lbl { font: 700 12px var(--font-mono, monospace); fill: var(--text-secondary); }
  .td-lbl-sm { font: 600 10px var(--font-mono, monospace); fill: var(--text-muted); }
  .td-val { font: 800 15px var(--font-mono, monospace); }
`

// ─── Отдельные схемы ────────────────────────────────────────────────────────

function PriceGap() {
    return (
        <svg className="td-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tdSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(224,62,62,0.25)"/>
                    <stop offset="100%" stopColor="rgba(224,62,62,0.05)"/>
                </linearGradient>
                <linearGradient id="tdBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0,201,122,0.25)"/>
                    <stop offset="100%" stopColor="rgba(0,201,122,0.05)"/>
                </linearGradient>
            </defs>
            {/* Дорогая биржа */}
            <rect x="40" y="40" width="200" height="120" rx="12" fill="url(#tdSell)" stroke="rgba(224,62,62,0.4)"/>
            <text x="140" y="72" textAnchor="middle" className="td-lbl">MEXC</text>
            <text x="140" y="118" textAnchor="middle" className="td-val" fill="#e03e3e">$0.00001842</text>
            <text x="140" y="140" textAnchor="middle" className="td-lbl-sm">дороже</text>
            {/* Дешёвая биржа */}
            <rect x="400" y="40" width="200" height="120" rx="12" fill="url(#tdBuy)" stroke="rgba(0,201,122,0.4)"/>
            <text x="500" y="72" textAnchor="middle" className="td-lbl">Bitget</text>
            <text x="500" y="118" textAnchor="middle" className="td-val" fill="#00c97a">$0.00001757</text>
            <text x="500" y="140" textAnchor="middle" className="td-lbl-sm">дешевле</text>
            {/* Спред: линия прерывается под бейджем */}
            <line x1="240" y1="100" x2="288" y2="100" stroke="var(--accent-bright)" strokeWidth="2" strokeDasharray="5 4"/>
            <line x1="352" y1="100" x2="400" y2="100" stroke="var(--accent-bright)" strokeWidth="2" strokeDasharray="5 4"/>
            <rect x="288" y="82" width="64" height="36" rx="18" fill="rgba(10,22,35,0.95)" stroke="var(--accent-bright)"/>
            <text x="320" y="105" textAnchor="middle" className="td-val" fill="#3d87c0">4.82%</text>
            <text x="320" y="195" textAnchor="middle" className="td-lbl-sm">← это и есть СПРЕД →</text>
        </svg>
    )
}

function OrderbookImbalance() {
    return (
        <svg className="td-svg" viewBox="0 0 640 260" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <text x="320" y="24" textAnchor="middle" className="td-lbl">Стакан заявок на одной бирже</text>
            {/* Заявки на продажу (сверху, красные) */}
            <text x="60" y="52" className="td-lbl-sm" fill="#e03e3e">Продавцы (asks)</text>
            <rect x="180" y="42" width="180" height="14" rx="3" fill="rgba(224,62,62,0.22)" stroke="rgba(224,62,62,0.4)"/>
            <rect x="180" y="60" width="120" height="14" rx="3" fill="rgba(224,62,62,0.18)" stroke="rgba(224,62,62,0.35)"/>
            <text x="530" y="53" textAnchor="end" className="td-lbl-sm" fill="#e03e3e">мало заявок</text>
            {/* Текущая цена */}
            <line x1="60" y1="92" x2="580" y2="92" stroke="var(--accent-bright)" strokeWidth="1.5" strokeDasharray="4 3"/>
            <text x="60" y="106" className="td-lbl-sm" fill="#3d87c0">цена сейчас →</text>
            {/* Заявки на покупку (снизу, зелёные, много) */}
            <text x="60" y="132" className="td-lbl-sm" fill="#00c97a">Покупатели (bids)</text>
            <rect x="180" y="122" width="200" height="14" rx="3" fill="rgba(0,201,122,0.22)" stroke="rgba(0,201,122,0.4)"/>
            <rect x="180" y="140" width="260" height="14" rx="3" fill="rgba(0,201,122,0.2)" stroke="rgba(0,201,122,0.38)"/>
            <rect x="180" y="158" width="230" height="14" rx="3" fill="rgba(0,201,122,0.18)" stroke="rgba(0,201,122,0.35)"/>
            <text x="530" y="147" textAnchor="end" className="td-lbl-sm" fill="#00c97a">много заявок</text>
            {/* Вывод */}
            <text x="320" y="210" textAnchor="middle" className="td-lbl-sm">Покупателей больше, чем продавцов →</text>
            <text x="320" y="232" textAnchor="middle" className="td-lbl" fill="#00c97a">цена на этой бирже растёт</text>
        </svg>
    )
}

function MarketNeutral() {
    return (
        <svg className="td-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            {/* two converging lines */}
            <path d="M60,60 C200,70 360,110 580,140" fill="none" stroke="#e03e3e" strokeWidth="2.5"/>
            <path d="M60,190 C200,180 360,150 580,140" fill="none" stroke="#00c97a" strokeWidth="2.5"/>
            <circle cx="580" cy="140" r="6" fill="var(--accent-bright)"/>
            <text x="70" y="50" className="td-lbl-sm" fill="#e03e3e">SHORT (дорогая)</text>
            <text x="70" y="210" className="td-lbl-sm" fill="#00c97a">LONG (дешёвая)</text>
            <text x="470" y="130" className="td-lbl-sm" fill="#3d87c0">схождение</text>
            {/* market arrows up/down (irrelevant) */}
            <text x="320" y="30" textAnchor="middle" className="td-lbl-sm">рынок ↑ или ↓ — не важно</text>
            <text x="320" y="225" textAnchor="middle" className="td-lbl">прибыль = сближение двух цен</text>
        </svg>
    )
}

function SpotVsFutures() {
    return (
        <svg className="td-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="40" width="250" height="140" rx="12" fill="rgba(0,201,122,0.06)" stroke="rgba(0,201,122,0.3)"/>
            <text x="165" y="70" textAnchor="middle" className="td-lbl" fill="#00c97a">СПОТ</text>
            <text x="165" y="100" textAnchor="middle" className="td-lbl-sm">владеешь монетой</text>
            <text x="165" y="122" textAnchor="middle" className="td-lbl-sm">можешь вывести в кошелёк</text>
            <text x="165" y="150" textAnchor="middle" className="td-lbl-sm">заработок только на росте</text>

            <rect x="350" y="40" width="250" height="140" rx="12" fill="rgba(61,135,192,0.06)" stroke="rgba(61,135,192,0.3)"/>
            <text x="475" y="70" textAnchor="middle" className="td-lbl" fill="#3d87c0">ФЬЮЧЕРС</text>
            <text x="475" y="100" textAnchor="middle" className="td-lbl-sm">контракт на цену</text>
            <text x="475" y="122" textAnchor="middle" className="td-lbl-sm">монетой не владеешь</text>
            <text x="475" y="150" textAnchor="middle" className="td-lbl-sm">заработок на росте И падении</text>
        </svg>
    )
}

function LongShort() {
    return (
        <svg className="td-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            {/* LONG */}
            <text x="160" y="34" textAnchor="middle" className="td-lbl" fill="#00c97a">LONG — ставка на рост</text>
            <path d="M50,170 L270,60" stroke="#00c97a" strokeWidth="2.5" fill="none"/>
            <polygon points="270,60 258,62 266,72" fill="#00c97a"/>
            <text x="160" y="195" textAnchor="middle" className="td-lbl-sm">цена ↑ → прибыль</text>
            {/* SHORT */}
            <text x="480" y="34" textAnchor="middle" className="td-lbl" fill="#e03e3e">SHORT — ставка на падение</text>
            <path d="M370,60 L590,170" stroke="#e03e3e" strokeWidth="2.5" fill="none"/>
            <polygon points="590,170 578,160 586,158" fill="#e03e3e"/>
            <text x="480" y="195" textAnchor="middle" className="td-lbl-sm">цена ↓ → прибыль</text>
            <line x1="320" y1="40" x2="320" y2="180" stroke="var(--glass-border)" strokeDasharray="3 3"/>
        </svg>
    )
}

function Liquidation() {
    return (
        <svg className="td-svg" viewBox="0 0 640 280" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <text x="320" y="26" textAnchor="middle" className="td-lbl">Запас хода до ликвидации при разном плече</text>
            {[
                { x: 150, lev: 'x2',   drop: 100, color: '#00c97a', txt: '~50%' },
                { x: 320, lev: 'x10',  drop: 40,  color: '#f0a500', txt: '~10%' },
                { x: 490, lev: 'x100', drop: 8,   color: '#e03e3e', txt: '~1%' },
            ].map((b, i) => {
                const top = 70
                const liqY = top + b.drop
                return (
                    <g key={i}>
                        <rect x={b.x - 45} y={top} width="90" height={b.drop} rx="4" fill={`${b.color}1e`} stroke={`${b.color}55`} />
                        <line x1={b.x - 60} y1={top} x2={b.x + 60} y2={top} stroke="var(--accent-bright)" strokeWidth="2" />
                        <circle cx={b.x} cy={top} r="4" fill="var(--accent-bright)" />
                        <line x1={b.x - 60} y1={liqY} x2={b.x + 60} y2={liqY} stroke={b.color} strokeWidth="2" strokeDasharray="4 3" />
                        <text x={b.x} y={top - 10} textAnchor="middle" className="td-lbl" fill="var(--accent-bright)">{b.lev}</text>
                        <text x={b.x} y={liqY + 18} textAnchor="middle" className="td-lbl-sm" fill={b.color}>ликвид. {b.txt}</text>
                    </g>
                )
            })}
            <text x="82" y="74" textAnchor="end" className="td-lbl-sm" fill="var(--accent-bright)">вход</text>
            <text x="320" y="245" textAnchor="middle" className="td-lbl-sm">чем выше плечо, тем тоньше зелёная зона —</text>
            <text x="320" y="264" textAnchor="middle" className="td-lbl" fill="#e03e3e">тем меньше движения нужно до ликвидации</text>
        </svg>
    )
}

function FfTrade() {
    return (
        <svg className="td-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="50" width="220" height="140" rx="12" fill="rgba(224,62,62,0.07)" stroke="rgba(224,62,62,0.35)"/>
            <text x="150" y="80" textAnchor="middle" className="td-lbl">Дорогая биржа</text>
            <rect x="90" y="100" width="120" height="34" rx="17" fill="rgba(224,62,62,0.18)" stroke="#e03e3e"/>
            <text x="150" y="122" textAnchor="middle" className="td-lbl" fill="#e03e3e">SHORT</text>
            <text x="150" y="165" textAnchor="middle" className="td-lbl-sm">ждём снижения цены</text>

            <rect x="380" y="50" width="220" height="140" rx="12" fill="rgba(0,201,122,0.07)" stroke="rgba(0,201,122,0.35)"/>
            <text x="490" y="80" textAnchor="middle" className="td-lbl">Дешёвая биржа</text>
            <rect x="430" y="100" width="120" height="34" rx="17" fill="rgba(0,201,122,0.18)" stroke="#00c97a"/>
            <text x="490" y="122" textAnchor="middle" className="td-lbl" fill="#00c97a">LONG</text>
            <text x="490" y="165" textAnchor="middle" className="td-lbl-sm">ждём роста цены</text>

            <line x1="260" y1="120" x2="380" y2="120" stroke="var(--accent-bright)" strokeWidth="2" strokeDasharray="5 4"/>
            <text x="320" y="112" textAnchor="middle" className="td-lbl-sm" fill="#3d87c0">одновременно</text>
            <text x="320" y="225" textAnchor="middle" className="td-lbl">обе ноги открываются вместе</text>
        </svg>
    )
}

function ConvergenceExit() {
    return (
        <svg className="td-svg" viewBox="0 0 640 230" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,50 C200,60 360,100 590,120" fill="none" stroke="#e03e3e" strokeWidth="2.5"/>
            <path d="M50,180 C200,170 360,140 590,120" fill="none" stroke="#00c97a" strokeWidth="2.5"/>
            <rect x="40" y="40" width="70" height="26" rx="6" fill="rgba(61,135,192,0.15)" stroke="var(--accent-bright)"/>
            <text x="75" y="58" textAnchor="middle" className="td-lbl-sm" fill="#3d87c0">спред 4.8%</text>
            <circle cx="590" cy="120" r="7" fill="var(--success)"/>
            <text x="560" y="105" textAnchor="end" className="td-lbl-sm" fill="#00c97a">спред → 0</text>
            <text x="590" y="150" textAnchor="end" className="td-lbl" fill="#00c97a">ВЫХОД ✓</text>
            <text x="320" y="210" textAnchor="middle" className="td-lbl">закрываем обе ноги — забираем разницу</text>
        </svg>
    )
}

function FundingMechanism() {
    return (
        <svg className="td-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <rect x="60" y="70" width="180" height="80" rx="12" fill="rgba(0,201,122,0.07)" stroke="rgba(0,201,122,0.3)"/>
            <text x="150" y="105" textAnchor="middle" className="td-lbl" fill="#00c97a">LONG</text>
            <text x="150" y="128" textAnchor="middle" className="td-lbl-sm">платят при +ставке</text>

            <rect x="400" y="70" width="180" height="80" rx="12" fill="rgba(224,62,62,0.07)" stroke="rgba(224,62,62,0.3)"/>
            <text x="490" y="105" textAnchor="middle" className="td-lbl" fill="#e03e3e">SHORT</text>
            <text x="490" y="128" textAnchor="middle" className="td-lbl-sm">получают при +ставке</text>

            <path d="M245,100 L395,100" stroke="var(--warning)" strokeWidth="2"/>
            <polygon points="395,100 383,94 383,106" fill="var(--warning)"/>
            <text x="320" y="90" textAnchor="middle" className="td-lbl-sm" fill="#f0a500">каждые 8ч</text>
            <text x="320" y="185" textAnchor="middle" className="td-lbl">ставка удерживает фьючерс рядом со спотом</text>
        </svg>
    )
}

function FundingTimer() {
    return (
        <svg className="td-svg" viewBox="0 0 640 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <line x1="50" y1="100" x2="590" y2="100" stroke="var(--glass-border)" strokeWidth="2"/>
            {['00:00','08:00','16:00','00:00'].map((t,i) => {
                const x = 90 + i*150
                return (
                    <g key={i}>
                        <circle cx={x} cy="100" r="8" fill="rgba(240,165,0,0.2)" stroke="var(--warning)" strokeWidth="2"/>
                        <text x={x} y="80" textAnchor="middle" className="td-lbl-sm" fill="#f0a500">{t}</text>
                        <text x={x} y="128" textAnchor="middle" className="td-lbl-sm">выплата</text>
                    </g>
                )
            })}
            <text x="320" y="165" textAnchor="middle" className="td-lbl">держишь позицию на момент начисления — получаешь ставку</text>
        </svg>
    )
}

function CardAnatomy() {
    return (
        <svg className="td-svg" viewBox="0 0 640 300" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <rect x="200" y="20" width="240" height="260" rx="14" fill="rgba(24,52,80,0.4)" stroke="var(--glass-border)"/>
            {/* header */}
            <text x="230" y="52" className="td-lbl">PEPE/USDT</text>
            <rect x="360" y="38" width="52" height="20" rx="10" fill="rgba(224,62,62,0.2)" stroke="#e03e3e"/>
            <text x="386" y="52" textAnchor="middle" className="td-lbl-sm" fill="#e03e3e">HOT</text>
            {/* sell panel */}
            <rect x="216" y="72" width="208" height="60" rx="8" fill="rgba(224,62,62,0.08)" stroke="rgba(224,62,62,0.3)"/>
            <text x="228" y="92" className="td-lbl-sm" fill="#e03e3e">SELL · MEXC</text>
            <text x="228" y="116" className="td-val" fill="#e8f4fd">$0.00001842</text>
            {/* buy panel */}
            <rect x="216" y="140" width="208" height="60" rx="8" fill="rgba(0,201,122,0.08)" stroke="rgba(0,201,122,0.3)"/>
            <text x="228" y="160" className="td-lbl-sm" fill="#00c97a">BUY · Bitget</text>
            <text x="228" y="184" className="td-val" fill="#e8f4fd">$0.00001757</text>
            {/* footer */}
            <text x="228" y="230" className="td-lbl-sm">Спред 4.82% · Профит +$96</text>
            {/* callouts */}
            <line x1="180" y1="102" x2="216" y2="102" stroke="#e03e3e" strokeWidth="1.5"/>
            <text x="176" y="106" textAnchor="end" className="td-lbl-sm" fill="#e03e3e">дорогая → SHORT</text>
            <line x1="460" y1="170" x2="424" y2="170" stroke="#00c97a" strokeWidth="1.5"/>
            <text x="464" y="174" className="td-lbl-sm" fill="#00c97a">дешёвая → LONG</text>
            <line x1="460" y1="48" x2="414" y2="48" stroke="var(--text-muted)" strokeWidth="1.5"/>
            <text x="464" y="52" className="td-lbl-sm">грейд спреда</text>
        </svg>
    )
}

function FiltersOverview() {
    return (
        <svg className="td-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            {/* funnel */}
            <path d="M80,40 L560,40 L400,140 L400,210 L240,210 L240,140 Z" fill="rgba(61,135,192,0.06)" stroke="var(--glass-border)"/>
            <text x="320" y="70" textAnchor="middle" className="td-lbl">сотни возможностей</text>
            {/* dots in */}
            {[120,200,280,360,440,520].map((x,i)=>(<circle key={i} cx={x} cy="52" r="4" fill="var(--text-muted)"/>))}
            <text x="320" y="135" textAnchor="middle" className="td-lbl-sm" fill="#3d87c0">биржи · мин.спред · сумма · стратегия</text>
            <text x="320" y="180" textAnchor="middle" className="td-lbl" fill="#00c97a">только нужное</text>
            {[290,320,350].map((x,i)=>(<circle key={i} cx={x} cy="195" r="4" fill="#00c97a"/>))}
        </svg>
    )
}

function ModalAnatomy() {
    return (
        <svg className="td-svg" viewBox="0 0 640 280" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="20" width="560" height="240" rx="14" fill="rgba(24,52,80,0.35)" stroke="var(--glass-border)"/>
            {/* left col */}
            <rect x="60" y="50" width="240" height="90" rx="8" fill="rgba(224,62,62,0.06)" stroke="rgba(224,62,62,0.25)"/>
            <text x="180" y="80" textAnchor="middle" className="td-lbl-sm" fill="#e03e3e">SHORT · цена · фандинг</text>
            <rect x="60" y="150" width="240" height="90" rx="8" fill="rgba(0,201,122,0.06)" stroke="rgba(0,201,122,0.25)"/>
            <text x="180" y="180" textAnchor="middle" className="td-lbl-sm" fill="#00c97a">LONG · цена · фандинг</text>
            {/* right col */}
            <rect x="320" y="50" width="260" height="110" rx="8" fill="rgba(61,135,192,0.05)" stroke="var(--glass-border)"/>
            <text x="450" y="80" textAnchor="middle" className="td-lbl-sm">живой график спреда</text>
            <path d="M340,140 C400,120 480,130 560,90" fill="none" stroke="var(--accent-bright)" strokeWidth="2"/>
            <rect x="320" y="172" width="260" height="68" rx="8" fill="rgba(0,201,122,0.05)" stroke="rgba(0,201,122,0.2)"/>
            <text x="450" y="200" textAnchor="middle" className="td-lbl-sm">калькулятор прибыли / выхода</text>
            <text x="450" y="222" textAnchor="middle" className="td-val" fill="#00c97a">+$96.40</text>
        </svg>
    )
}

function CostBreakdown() {
    return (
        <svg className="td-svg" viewBox="0 0 640 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            {/* full bar */}
            <rect x="60" y="60" width="520" height="40" rx="6" fill="rgba(61,135,192,0.15)" stroke="var(--accent-bright)"/>
            <text x="320" y="50" textAnchor="middle" className="td-lbl-sm" fill="#3d87c0">спред 4.8%</text>
            {/* deductions */}
            <rect x="60" y="60" width="120" height="40" rx="6" fill="rgba(224,62,62,0.18)"/>
            <text x="120" y="85" textAnchor="middle" className="td-lbl-sm" fill="#e03e3e">комиссии</text>
            <rect x="180" y="60" width="70" height="40" fill="rgba(240,165,0,0.18)"/>
            <text x="215" y="85" textAnchor="middle" className="td-lbl-sm" fill="#f0a500">слипедж</text>
            <rect x="250" y="60" width="330" height="40" rx="6" fill="rgba(0,201,122,0.18)"/>
            <text x="415" y="85" textAnchor="middle" className="td-lbl" fill="#00c97a">чистая прибыль</text>
            <text x="320" y="140" textAnchor="middle" className="td-lbl">спред − комиссии − проскальзывание = прибыль</text>
        </svg>
    )
}

function RiskMap() {
    return (
        <svg className="td-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            {[
                { x: 70,  t: 'Риск исполнения', d: 'открыть обе ноги быстро', c: '#e03e3e' },
                { x: 260, t: 'Риск вывода', d: 'проверить депозит/вывод', c: '#f0a500' },
                { x: 450, t: 'Риск ликвидации', d: 'умеренное плечо', c: '#3d87c0' },
            ].map((b,i)=>(
                <g key={i}>
                    <rect x={b.x} y="60" width="150" height="120" rx="12" fill={`${b.c}14`} stroke={`${b.c}55`}/>
                    <circle cx={b.x+75} cy="95" r="16" fill={`${b.c}22`} stroke={b.c}/>
                    <text x={b.x+75} y="101" textAnchor="middle" className="td-lbl" fill={b.c}>!</text>
                    <text x={b.x+75} y="135" textAnchor="middle" className="td-lbl-sm" fill="var(--text-secondary)">{b.t}</text>
                    <text x={b.x+75} y="158" textAnchor="middle" className="td-lbl-sm">{b.d}</text>
                </g>
            ))}
            <text x="320" y="215" textAnchor="middle" className="td-lbl">каждый риск гасится конкретным действием</text>
        </svg>
    )
}

const DIAGRAMS = {
    'price-gap': PriceGap,
    'orderbook-imbalance': OrderbookImbalance,
    'market-neutral': MarketNeutral,
    'spot-vs-futures': SpotVsFutures,
    'long-short': LongShort,
    'liquidation': Liquidation,
    'ff-trade': FfTrade,
    'convergence-exit': ConvergenceExit,
    'funding-mechanism': FundingMechanism,
    'funding-timer': FundingTimer,
    'card-anatomy': CardAnatomy,
    'filters-overview': FiltersOverview,
    'modal-anatomy': ModalAnatomy,
    'cost-breakdown': CostBreakdown,
    'risk-map': RiskMap,
}

function TrainingDiagram({ kind, caption }) {
    const Diagram = DIAGRAMS[kind]
    if (!Diagram) return null
    return (
        <>
            <style>{wrapStyle}</style>
            <div className="td-wrap">
                <Diagram />
                {caption ? <div className="td-caption">{caption}</div> : null}
            </div>
        </>
    )
}

export default TrainingDiagram