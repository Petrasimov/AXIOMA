/**
 * AboutPage.jsx — «О нас»
 *
 * Дашборд-раскладка (единый язык карточек с остальным сайтом).
 * Порядок: Hero → Миссия/Принципы → История → Команда → Продукт →
 *          Дорожная карта → CTA (набор) → Контакты.
 *
 * Контент честный: MVP-стадия, реальная история P2P→арбитраж→свой сканер,
 * без обещаний прибыли. Анимации: появление панелей при скролле (IntersectionObserver),
 * hover-эффекты, движущийся фон, пульс текущего этапа дорожной карты.
 */

import { useEffect, useRef, useState } from 'react'
import {
    Target, Sparkles, Users, MonitorSmartphone, Map as MapIcon,
    Send, MessageCircle, Globe, Rocket, Zap, ShieldCheck,
    CheckCircle2, Circle, Loader
} from 'lucide-react'

// ─── Данные команды ──────────────────────────────────────────────────────────
const TEAM = [
    {
        initial: 'А', name: 'Артём', color: 'linear-gradient(135deg,#3d87c0,#5aa9e0)',
        contribution: 'Frontend, архитектура и бизнес-логика проекта. Строит то, что ты видишь на экране, и то, как это работает под капотом.',
    },
    {
        initial: 'Е', name: 'Евгений', color: 'linear-gradient(135deg,#00c97a,#3ddb9a)',
        contribution: 'Коммуникация, развитие проекта и связь с сообществом. Отвечает за то, чтобы AXIOMA рос и находил своих людей.',
    },
    {
        initial: 'С', name: 'Слава', color: 'linear-gradient(135deg,#f0a500,#ffc333)',
        contribution: 'Backend и управление базой данных. Отвечает за движок сканера, сбор данных с бирж и надёжность инфраструктуры.',
    },
]

// ─── Дорожная карта (честная: сделано / в работе / будущее) ──────────────────
const ROADMAP = [
    {
        status: 'done', date: 'Май 2025', title: 'Старт проекта',
        desc: 'Двое бывших P2P-арбитражников начали строить свой сканер — удобный там, где другие неудобны.',
    },
    {
        status: 'done', date: 'MVP', title: 'Сканеры фьючерсного арбитража',
        desc: 'CEX-CEX арбитраж по фьючерсам и фандингу, 8 бирж, стратегии FF и SF, Telegram-авторизация.',
    },
    {
        status: 'done', date: 'Сейчас', title: 'Академия и обучение',
        desc: 'Обучающая платформа по арбитражу с нуля: теория, симуляторы, квизы и разбор работы сканера.',
    },
    {
        status: 'active', date: 'В работе', title: 'DEX-CEX сканер',
        desc: 'Расширяем арбитраж на DEX-биржи — фьючерсы и фандинг между децентрализованными и централизованными площадками.',
    },
    {
        status: 'future', date: 'Впереди', title: 'Автоторговля',
        desc: 'Главная цель — довести арбитраж до полной автоматизации и открыть автоматический заработок для всех.',
    },
]

// ─── Принципы ────────────────────────────────────────────────────────────────
const PRINCIPLES = [
    { icon: Sparkles, title: 'Удобство и простота', desc: 'Крипта кажется сложной. Мы строим платформу, которая доказывает обратное — интуитивно понятную с первого взгляда.' },
    { icon: Zap, title: 'Автоматизация', desc: 'Ведём продукты к полной автоматизации заработка на арбитраже и открываем к ним доступ.' },
    { icon: ShieldCheck, title: 'Честность', desc: 'Не обещаем гарантированную прибыль и не называем цифры дохода. Крипта рискованна — и мы говорим об этом прямо.' },
]

// ─── Контакты ────────────────────────────────────────────────────────────────
const CONTACTS = [
    { icon: Send, title: 'Telegram-канал', sub: 'Новости и апдейты проекта', href: 'https://t.me/Axioma_Scan' },
    { icon: MessageCircle, title: 'Бот-менеджер', sub: 'Доступ, вопросы, набор в команду', href: 'https://t.me/Axioma_Scan' },
    { icon: Users, title: '@Eeighth', sub: 'Прямая связь с командой', href: 'https://t.me/Eeighth' },
]

const style = `
  .ab-wrap { flex: 1; overflow-y: auto; position: relative; }
  .ab-wrap::-webkit-scrollbar { width: 5px; }
  .ab-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .ab-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .ab-bg::before { content:''; position:absolute; width:680px; height:680px; top:-240px; left:6%; background: radial-gradient(circle, rgba(47,105,151,0.14), transparent 70%); animation: ab-float 22s ease-in-out infinite; }
  .ab-bg::after { content:''; position:absolute; width:520px; height:520px; bottom:60px; right:4%; background: radial-gradient(circle, rgba(0,201,122,0.08), transparent 70%); animation: ab-float 28s ease-in-out infinite reverse; }
  @keyframes ab-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(28px)} }

  .ab-inner { position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; padding: 44px 40px 70px; }

  /* появление при скролле */
  .ab-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .ab-reveal.in { opacity: 1; transform: translateY(0); }

  /* hero */
  .ab-hero {
    background: var(--glass-fill); backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--glass-border-hover); border-radius: var(--radius-xl);
    box-shadow: var(--shadow-glass); padding: 52px 46px; margin-bottom: 18px; position: relative; overflow: hidden;
  }
  .ab-hero::before { content:''; position:absolute; top:-45%; right:-6%; width:460px; height:460px; background:radial-gradient(circle, rgba(0,201,122,0.1), transparent 70%); pointer-events:none; }
  .ab-hero-badge { display:inline-flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); text-transform:uppercase; margin-bottom:16px; padding:6px 13px; border-radius:20px; background:rgba(61,135,192,0.08); border:1px solid rgba(61,135,192,0.22); }
  .ab-h1 { font-size:42px; font-weight:900; letter-spacing:-1.5px; line-height:1.12; margin-bottom:18px; position:relative; }
  .ab-h1 span { background:linear-gradient(135deg, var(--accent-bright), var(--success)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .ab-hero-sub { font-size:15.5px; color:var(--text-secondary); line-height:1.75; max-width:600px; position:relative; }
  .ab-hero-motto { margin-top:20px; font-family:var(--font-mono); font-size:13px; color:var(--accent-bright); letter-spacing:0.5px; position:relative; }

  /* grid + панели */
  .ab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .ab-panel {
    background: var(--glass-fill); backdrop-filter: blur(16px); border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-glass); padding: 28px;
    transition: border-color 0.2s, background 0.2s;
  }
  .ab-panel.wide { grid-column: 1 / -1; }
  .ab-panel-label { display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); text-transform:uppercase; margin-bottom:16px; }
  .ab-panel-h { font-size:21px; font-weight:800; margin-bottom:14px; letter-spacing:-0.4px; }
  .ab-p { font-size:14px; color:var(--text-secondary); line-height:1.75; }
  .ab-p + .ab-p { margin-top: 12px; }
  .ab-p b { color: var(--text-primary); }

  /* принципы */
  .ab-principles { display:flex; flex-direction:column; gap:14px; }
  .ab-principle { display:flex; gap:13px; }
  .ab-principle-ic { width:38px; height:38px; flex-shrink:0; border-radius:var(--radius-md); background:rgba(61,135,192,0.12); border:1px solid rgba(61,135,192,0.28); display:flex; align-items:center; justify-content:center; color:var(--accent-bright); }
  .ab-principle-t { font-size:14px; font-weight:700; margin-bottom:4px; }
  .ab-principle-d { font-size:12.5px; color:var(--text-secondary); line-height:1.55; }

  /* команда */
  .ab-team { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .ab-member { text-align:center; padding:26px 18px; background:rgba(255,255,255,0.02); border:1px solid var(--glass-border); border-radius:var(--radius-md); transition:all 0.22s; cursor:default; }
  .ab-member:hover { transform:translateY(-5px); border-color:var(--glass-border-hover); background:var(--glass-fill-hover); box-shadow:0 14px 36px rgba(0,0,0,0.4); }
  .ab-av { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; color:#0a1622; margin:0 auto 14px; box-shadow:0 6px 18px rgba(0,0,0,0.35); transition:transform 0.22s; }
  .ab-member:hover .ab-av { transform:scale(1.08); }
  .ab-member-name { font-size:17px; font-weight:800; margin-bottom:10px; }
  .ab-member-contrib { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }

  /* продукт — фичи + биржи */
  .ab-product-feats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
  .ab-feat { padding:16px; background:rgba(255,255,255,0.02); border:1px solid var(--glass-border); border-radius:var(--radius-md); border-left:2px solid var(--accent-bright); }
  .ab-feat-t { font-size:13.5px; font-weight:700; margin-bottom:5px; }
  .ab-feat-d { font-size:12px; color:var(--text-secondary); line-height:1.5; }
  .ab-exchanges { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .ab-ex-label { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); margin-right:4px; }
  .ab-ex { display:flex; align-items:center; gap:6px; padding:6px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--glass-border); border-radius:20px; font-size:12px; font-weight:600; transition:all 0.15s; }
  .ab-ex:hover { border-color:var(--glass-border-hover); background:rgba(93,163,214,0.08); transform:translateY(-2px); }
  .ab-ex img { width:16px; height:16px; border-radius:3px; }

  /* дорожная карта — лента */
  .ab-road { position:relative; padding-left:28px; }
  .ab-road::before { content:''; position:absolute; left:7px; top:10px; bottom:10px; width:2px; background:linear-gradient(180deg, var(--success) 0%, var(--success) 45%, var(--accent-bright) 55%, var(--border) 100%); }
  .ab-road-item { position:relative; padding:0 0 22px; cursor:default; }
  .ab-road-item:last-child { padding-bottom:0; }
  .ab-road-dot { position:absolute; left:-28px; top:3px; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#0a1622; border:2px solid var(--border); transition:all 0.2s; }
  .ab-road-item.done .ab-road-dot { border-color:var(--success); background:rgba(0,201,122,0.15); color:var(--success); }
  .ab-road-item.active .ab-road-dot { border-color:var(--accent-bright); background:rgba(61,135,192,0.2); color:var(--accent-bright); animation:ab-pulse 1.8s infinite; }
  .ab-road-item.future .ab-road-dot { color:var(--text-muted); }
  @keyframes ab-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(61,135,192,0.4)} 50%{box-shadow:0 0 0 6px rgba(61,135,192,0)} }
  .ab-road-date { font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:4px; }
  .ab-road-item.done .ab-road-date { color:var(--success); }
  .ab-road-item.active .ab-road-date { color:var(--accent-bright); }
  .ab-road-item.future .ab-road-date { color:var(--text-muted); }
  .ab-road-t { font-size:15px; font-weight:700; margin-bottom:4px; transition:color 0.2s; }
  .ab-road-d { font-size:12.5px; color:var(--text-secondary); line-height:1.55; max-width:640px; }
  .ab-road-item:hover .ab-road-t { color:var(--accent-bright); }

  /* CTA набор */
  .ab-cta { grid-column:1/-1; background:linear-gradient(135deg, rgba(47,105,151,0.22), rgba(0,201,122,0.09)); border:1px solid var(--glass-border-hover); border-radius:var(--radius-xl); box-shadow:var(--shadow-glass); padding:40px 44px; position:relative; overflow:hidden; }
  .ab-cta::before { content:''; position:absolute; top:-60%; right:-4%; width:380px; height:380px; background:radial-gradient(circle, rgba(0,201,122,0.14), transparent 70%); pointer-events:none; }
  .ab-cta-h { font-size:27px; font-weight:900; letter-spacing:-0.7px; margin-bottom:12px; position:relative; }
  .ab-cta-sub { font-size:14px; color:var(--text-secondary); line-height:1.7; max-width:600px; margin-bottom:22px; position:relative; }
  .ab-cta-roles { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:26px; position:relative; }
  .ab-cta-role { font-size:12px; padding:7px 14px; border-radius:20px; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); color:var(--text-secondary); }
  .ab-cta-btn { display:inline-flex; align-items:center; gap:9px; padding:15px 32px; border-radius:var(--radius-md); background:linear-gradient(135deg, var(--accent), var(--accent-bright)); color:#fff; font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:1px; cursor:pointer; border:1px solid rgba(255,255,255,0.14); box-shadow:0 4px 22px rgba(47,105,151,0.38); transition:transform 0.15s, box-shadow 0.15s; position:relative; text-decoration:none; }
  .ab-cta-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(47,105,151,0.5); }

  /* контакты */
  .ab-contacts { display:flex; gap:12px; }
  .ab-contact { flex:1; display:flex; align-items:center; gap:12px; padding:16px 18px; background:rgba(255,255,255,0.02); border:1px solid var(--glass-border); border-radius:var(--radius-md); cursor:pointer; transition:all 0.18s; text-decoration:none; }
  .ab-contact:hover { border-color:var(--glass-border-hover); background:rgba(93,163,214,0.07); transform:translateY(-3px); }
  .ab-contact-ic { width:40px; height:40px; flex-shrink:0; border-radius:var(--radius-sm); background:rgba(61,135,192,0.12); border:1px solid rgba(61,135,192,0.25); display:flex; align-items:center; justify-content:center; color:var(--accent-bright); transition:all 0.18s; }
  .ab-contact:hover .ab-contact-ic { background:rgba(61,135,192,0.2); transform:scale(1.08); }
  .ab-contact-t { font-size:13.5px; font-weight:700; }
  .ab-contact-s { font-size:11px; color:var(--text-muted); margin-top:2px; }

  @media (max-width: 820px) {
    .ab-grid, .ab-team, .ab-product-feats, .ab-contacts { grid-template-columns: 1fr; flex-direction: column; }
  }
`

// биржи для блока продукта (id → отображаемое имя + фавикон)
const PRODUCT_EXCHANGES = [
    { name: 'Binance', domain: 'binance.com' },
    { name: 'Bybit', domain: 'bybit.com' },
    { name: 'OKX', domain: 'okx.com' },
    { name: 'BingX', domain: 'bingx.com' },
    { name: 'Bitget', domain: 'bitget.com' },
    { name: 'KuCoin', domain: 'kucoin.com' },
    { name: 'Gate', domain: 'gate.io' },
    { name: 'MEXC', domain: 'mexc.com' },
]

function Reveal({ children, delay = 0 }) {
    const ref = useRef(null)
    const [shown, setShown] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect() } },
            { threshold: 0.12 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    return (
        <div ref={ref} className={`ab-reveal ${shown ? 'in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    )
}

const ROAD_ICON = { done: CheckCircle2, active: Loader, future: Circle }

function AboutPage() {
    return (
        <>
            <style>{style}</style>
            <div className="ab-wrap">
                <div className="ab-bg" />
                <div className="ab-inner">

                    {/* HERO */}
                    <Reveal>
                        <div className="ab-hero">
                            <div className="ab-hero-badge">◆ О ПРОЕКТЕ</div>
                            <div className="ab-h1">Новый проект<br />от бывших <span>арбитражников</span></div>
                            <div className="ab-hero-sub">
                                AXIOMA — сканер для всех видов криптоарбитража, который мы строим удобным в первую очередь.
                                Мы прошли путь от P2P до фьючерсного арбитража, перепробовали десятки чужих сканеров — и решили
                                сделать свой, где на первом месте удобство работы, а не запутанный интерфейс.
                            </div>
                            <div className="ab-hero-motto">// крипто-сканер, который нужно знать</div>
                        </div>
                    </Reveal>

                    {/* МИССИЯ + ПРИНЦИПЫ */}
                    <div className="ab-grid">
                        <Reveal delay={60}>
                            <div className="ab-panel" style={{ height: '100%' }}>
                                <div className="ab-panel-label"><Target size={13} /> МИССИЯ</div>
                                <div className="ab-panel-h">Зачем мы это делаем</div>
                                <div className="ab-p">
                                    Главная задача — показать, что на криптовалюте можно зарабатывать просто и легко,
                                    и чтобы эти слова были честными.
                                </div>
                                <div className="ab-p">
                                    Но мы хотим быть не только платформой для заработка. С арбитража большинство людей
                                    <b> начинают знакомство с криптой</b> — а уже потом открывают для себя другие виды торговли
                                    и возможностей. Поэтому наша миссия шире: быть удобным и полезным проводником в мир криптовалюты.
                                </div>
                            </div>
                        </Reveal>

                        <Reveal delay={120}>
                            <div className="ab-panel" style={{ height: '100%' }}>
                                <div className="ab-panel-label"><Sparkles size={13} /> ПРИНЦИПЫ</div>
                                <div className="ab-panel-h">Во что мы верим</div>
                                <div className="ab-principles">
                                    {PRINCIPLES.map((p, i) => {
                                        const Ic = p.icon
                                        return (
                                            <div key={i} className="ab-principle">
                                                <div className="ab-principle-ic"><Ic size={18} /></div>
                                                <div>
                                                    <div className="ab-principle-t">{p.title}</div>
                                                    <div className="ab-principle-d">{p.desc}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* ИСТОРИЯ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><Rocket size={13} /> КАК ВСЁ НАЧАЛОСЬ</div>
                            <div className="ab-panel-h">От P2P до собственного сканера</div>
                            <div className="ab-p">
                                Мы с Евгением — бывшие P2P-арбитражники. Когда эта тема начала постепенно угасать, мы стали искать
                                другие способы заработка на крипте и пришли к арбитражу. Начали покупать сканеры, перепробовали
                                много разных — и почти везде было неудобно ими пользоваться.
                            </div>
                            <div className="ab-p">
                                Тогда мы решили создать собственный сканер, который в первую очередь закрывает потребность в удобстве —
                                и по работе с самим инструментом, и по арбитражу в целом. Так 20 мая 2025 года началась AXIOMA.
                                Сначала это были телеграм-боты под названием Axion Scan, но из-за блокировок в России пришлось резко
                                переходить на полноценный сайт.
                            </div>
                            <div className="ab-p">
                                <b>Сейчас мы честно на ранней стадии.</b> Это MVP: у нас пока нет потока новых пользователей, не настроены
                                оплата и SEO. Мы не скрываем этого — наоборот, строим открыто и растём шаг за шагом вместе с теми, кто с нами.
                            </div>
                        </div>
                    </Reveal>

                    {/* КОМАНДА */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><Users size={13} /> КОМАНДА</div>
                            <div className="ab-panel-h">Три человека за проектом</div>
                            <div className="ab-team">
                                {TEAM.map((m, i) => (
                                    <div key={i} className="ab-member">
                                        <div className="ab-av" style={{ background: m.color }}>{m.initial}</div>
                                        <div className="ab-member-name">{m.name}</div>
                                        <div className="ab-member-contrib">{m.contribution}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* ПРОДУКТ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><MonitorSmartphone size={13} /> ПРОДУКТ СЕЙЧАС</div>
                            <div className="ab-panel-h">Что уже умеет AXIOMA</div>
                            <div className="ab-product-feats">
                                <div className="ab-feat">
                                    <div className="ab-feat-t">Сканер фьючерсного арбитража</div>
                                    <div className="ab-feat-d">Показывает спред с учётом комиссий, рассчитанный под объём твоей сделки. Стратегии FF и SF по схеме CEX-CEX.</div>
                                </div>
                                <div className="ab-feat">
                                    <div className="ab-feat-t">Сканер арбитража фандинга</div>
                                    <div className="ab-feat-d">Из всех бирж находит именно арбитражные возможности по ставке финансирования — тоже по стратегиям FF и SF.</div>
                                </div>
                            </div>
                            <div className="ab-exchanges">
                                <span className="ab-ex-label">8 бирж:</span>
                                {PRODUCT_EXCHANGES.map((ex, i) => (
                                    <span key={i} className="ab-ex">
                                        <img src={`https://www.google.com/s2/favicons?domain=${ex.domain}&sz=32`} alt="" />
                                        {ex.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* ДОРОЖНАЯ КАРТА */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><MapIcon size={13} /> ДОРОЖНАЯ КАРТА</div>
                            <div className="ab-panel-h">Куда мы движемся</div>
                            <div className="ab-road">
                                {ROADMAP.map((r, i) => {
                                    const Ic = ROAD_ICON[r.status]
                                    return (
                                        <div key={i} className={`ab-road-item ${r.status}`}>
                                            <div className="ab-road-dot"><Ic size={10} /></div>
                                            <div className="ab-road-date">{r.date}</div>
                                            <div className="ab-road-t">{r.title}</div>
                                            <div className="ab-road-d">{r.desc}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Reveal>

                    {/* CTA — набор в команду */}
                    <Reveal delay={60}>
                        <div className="ab-cta">
                            <div className="ab-cta-h">Мы ищем людей в команду</div>
                            <div className="ab-cta-sub">
                                Проект растёт, и нам нужны руки и головы на разные задачи. Если хочешь строить AXIOMA вместе с нами —
                                напиши нашему боту-менеджеру. Условия — по договорённости.
                            </div>
                            <div className="ab-cta-roles">
                                <span className="ab-cta-role">Соцсети и контент (посты, видео, Reels, TikTok)</span>
                                <span className="ab-cta-role">Разработка и поддержка кода</span>
                                <span className="ab-cta-role">Реклама и трафик (закупка, директ, аналитика)</span>
                            </div>
                            <a className="ab-cta-btn" href="https://t.me/Axioma_Scan" target="_blank" rel="noopener noreferrer">
                                <Send size={14} /> Написать боту-менеджеру
                            </a>
                        </div>
                    </Reveal>

                    {/* КОНТАКТЫ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginTop: 16 }}>
                            <div className="ab-panel-label"><Globe size={13} /> КОНТАКТЫ</div>
                            <div className="ab-contacts">
                                {CONTACTS.map((c, i) => {
                                    const Ic = c.icon
                                    return (
                                        <a key={i} className="ab-contact" href={c.href} target="_blank" rel="noopener noreferrer">
                                            <div className="ab-contact-ic"><Ic size={18} /></div>
                                            <div>
                                                <div className="ab-contact-t">{c.title}</div>
                                                <div className="ab-contact-s">{c.sub}</div>
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    </Reveal>

                </div>
            </div>
        </>
    )
}

export default AboutPage