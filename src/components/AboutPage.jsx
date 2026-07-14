/**
 * AboutPage.jsx — «О нас»
 *
 * Порядок: Hero → Миссия/Принципы → История → Команда (карусель) →
 *          Продукт (плитки) → Дорожная карта → CTA (набор) → Контакты → Футер
 *
 * Все блоки появляются ПОЭЛЕМЕНТНО при скролле — как на главной.
 *
 * Команда — карусель с автопрокруткой (пауза при наведении), стрелками и точками.
 * Данные команды и их навыки с цветными иконками — в data/teamContent.js.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { TEAM } from '../data/teamContent.js'
import {
    Target, Sparkles, Users, MonitorSmartphone, Map as MapIcon,
    Send, MessageCircle, Globe, Rocket, Zap,
    CheckCircle2, Circle, Loader, ChevronLeft, ChevronRight,
    UserPlus, ArrowDown,
    // иконки навыков команды (резолвятся по имени из teamContent.js)
    LayoutDashboard, Binary, Palette, Server, Database, Activity,
    // иконки продуктов и дорожной карты
    TrendingUp, Percent, Flame, GraduationCap, Bot, Shuffle,
    Cpu, FlaskConical, Wrench, Network, Coins,
} from 'lucide-react'
import Footer from './Footer.jsx'

// Иконки навыков команды: имя из teamContent.js → компонент
const SKILL_ICONS = {
    LayoutDashboard, Binary, Palette, Rocket, Users, MessageCircle,
    Server, Database, Activity,
}

// ─── Принципы ────────────────────────────────────────────────────────────────
// У каждого СВОЙ цвет — раньше все иконки были одного оттенка и сливались с фоном.
const PRINCIPLES = [
    {
        icon: Sparkles, color: '#3d87c0',
        title: 'Удобство и простота',
        desc: 'Крипта кажется сложной. Мы строим платформу, которая доказывает обратное — интуитивно понятную с первого взгляда.',
    },
    {
        icon: Zap, color: '#f0a500',
        title: 'Автоматизация',
        desc: 'Ведём продукты к полной автоматизации заработка на арбитраже и открываем к ним доступ.',
    },
    {
        icon: MessageCircle, color: '#f472b6',
        title: 'Мы рядом',
        desc: 'Разработчики ближе, чем ты думаешь. Мы читаем каждое сообщение и с радостью выслушаем твою идею, замечание или проблему — проект растёт из того, что нам говорят люди.',
    },
]

// ─── Продукт: плитки ─────────────────────────────────────────────────────────
const PRODUCTS = [
    {
        icon: TrendingUp, color: '#3d87c0',
        title: 'Фьючерсный арбитраж',
        desc: 'Спред с учётом комиссий, рассчитанный под объём твоей сделки. Стратегии FF и SF.',
    },
    {
        icon: Percent, color: '#00c97a',
        title: 'Арбитраж фандинга',
        desc: 'Из всех бирж находит возможности по ставке финансирования — тоже FF и SF.',
    },
    {
        icon: Flame, color: '#f0a500',
        title: 'Топ роста и падения',
        desc: 'Монеты с самым сильным движением за 24 часа на всех биржах сразу.',
    },
    {
        icon: GraduationCap, color: '#a78bfa',
        title: 'Академия',
        desc: 'Обучение арбитражу с нуля: теория, симуляторы, схемы и квизы.',
    },
]

// Домены нужны для загрузки фавиконов — тот же приём, что на главной
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

// ─── Дорожная карта ──────────────────────────────────────────────────────────
//
// Реальная хронология проекта, сгруппированная по фазам.
// Даты у прошлых этапов, у будущих — без дат (мы их честно не знаем).
//
// ⚠️ Годы я проставил, опираясь на «стартовали 20 мая 2025». Если где-то
// ошибся — правится здесь, в одном месте.
const ROADMAP_PHASES = [
    {
        id: 'bots',
        label: 'Эпоха ботов',
        color: '#00c97a',
        items: [
            {
                status: 'done', date: '20 мая 2025', icon: Rocket,
                title: 'Сели за разработку',
                desc: 'Двое бывших P2P-арбитражников начали делать телеграм-ботов для арбитража — потому что все чужие сканеры оказались неудобными.',
            },
            {
                status: 'done', date: 'Июль 2025', icon: Bot,
                title: 'Первые боты готовы',
                desc: 'Работали — но логика была слабой и медленной. Стало ясно: нужен человек, который вытянет всю внутреннюю часть.',
            },
            {
                status: 'done', date: 'Осень 2025', icon: Users,
                title: 'В команде появился Слава',
                desc: 'Вышли на него — и он с радостью взялся за проект. Сразу начал переписывать логику ботов с нуля.',
            },
            {
                status: 'done', date: 'Ноябрь 2025', icon: Cpu,
                title: 'Новая логика и тестирование',
                desc: 'Боты заработали на новом движке — быстро и стабильно. Начали тестировать на живом рынке.',
            },
        ],
    },
    {
        id: 'site',
        label: 'Переход на сайт',
        color: '#3d87c0',
        items: [
            {
                status: 'done', date: 'Февраль 2026', icon: Globe,
                title: 'Началась работа над сайтом',
                desc: 'Телеграм упирался в блокировки и в потолок возможностей. Решили строить полноценную веб-платформу.',
            },
            {
                status: 'done', date: 'Май 2026', icon: TrendingUp,
                title: 'Первая версия сайта',
                desc: 'Запустили сканер фьючерсного арбитража — 8 бирж, стратегии FF и SF по схеме CEX-CEX.',
            },
            {
                status: 'done', date: 'Июнь 2026', icon: Percent,
                title: 'Сканер арбитража фандинга',
                desc: 'Добавили второй сканер — по ставке финансирования, тоже FF и SF.',
            },
            {
                status: 'done', date: 'Июнь 2026', icon: FlaskConical,
                title: 'Тестирование и первые люди',
                desc: 'Начали обкатывать сканеры на реальных сделках и искать первых трейдеров, которые будут работать с нами.',
            },
        ],
    },
    {
        id: 'now',
        label: 'Сейчас',
        color: '#f0a500',
        items: [
            {
                status: 'active', date: 'Сейчас', icon: Sparkles,
                title: 'Большое обновление сайта',
                desc: 'Топ роста и падения, новая главная, футер, Академия, мобильная версия, обновлённый дизайн — сайт становится тем, каким мы его задумывали.',
            },
        ],
    },
    {
        id: 'future',
        label: 'Впереди',
        color: '#a78bfa',
        items: [
            {
                status: 'future', date: null, icon: Wrench,
                title: 'Доработка и стабильность',
                desc: 'Исправление ошибок, устранение неполадок, шлифовка того, что уже работает. Скучно, но без этого никуда.',
            },
            {
                status: 'future', date: null, icon: Shuffle,
                title: 'DEX-CEX арбитраж',
                desc: 'Новые сканеры: фьючерсы и фандинг между децентрализованными и централизованными биржами.',
            },
            {
                status: 'future', date: null, icon: Network,
                title: 'Другие виды арбитража',
                desc: 'Постепенно добавляем: межбиржевой, листинги, межмостовой, внутрибиржевые треугольники и всё, что найдём.',
            },
            {
                status: 'future', date: null, icon: Zap,
                title: 'Автоматизация',
                desc: 'Автоматизированные продукты для арбитража. То, что почти никто не даёт из-за конкуренции — а мы хотим дать каждому.',
            },
            {
                status: 'future', date: null, icon: Coins,
                title: 'Не только арбитраж',
                desc: 'Другие способы заработка на криптовалюте. Мы хотим быть проводником в этот мир, а не только сканером.',
            },
        ],
    },
]

const ROAD_ICON = { done: CheckCircle2, active: Loader, future: Circle }

// ─── Контакты ────────────────────────────────────────────────────────────────
const CONTACTS = [
    {
        icon: Send, color: '#3d87c0',
        title: 'Telegram-канал',
        desc: 'Новости, апдейты и то, над чем работаем прямо сейчас.',
        href: 'https://t.me/Axioma_Scan',
    },
    {
        icon: MessageCircle, color: '#00c97a',
        title: 'Бот-менеджер',
        desc: 'Доступ, вопросы, набор в команду. Отвечаем быстро.',
        href: 'https://t.me/Axioma_Scan',
    },
    {
        icon: Users, color: '#a78bfa',
        title: '@Eeighth',
        desc: 'Прямая связь с командой — без посредников.',
        href: 'https://t.me/Eeighth',
    },
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

  /* ─── Появление при скролле (та же система, что на главной) ─── */
  .ab-reveal {
    opacity: 0; transform: translateY(40px);
    transition: opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1);
    will-change: opacity, transform;
  }
  .ab-reveal.in { opacity: 1; transform: translateY(0); }
  @media (prefers-reduced-motion: reduce) {
    .ab-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  }

  /* ─── Hero ─── */
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

  /* ─── Панели ─── */
  .ab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; align-items: stretch; }
  .ab-grid > .ab-reveal { height: 100%; }
  .ab-panel {
    background: var(--glass-fill); backdrop-filter: blur(16px); border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-glass); padding: 28px;
    height: 100%;
  }
  .ab-panel.wide { grid-column: 1 / -1; }
  .ab-panel-label { display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); text-transform:uppercase; margin-bottom:16px; }
  .ab-panel-h { font-size:21px; font-weight:800; margin-bottom:14px; letter-spacing:-0.4px; }
  .ab-p { font-size:14px; color:var(--text-secondary); line-height:1.75; }
  .ab-p + .ab-p { margin-top: 12px; }
  .ab-p b { color: var(--text-primary); }

  /* ─── Принципы: у каждого свой цвет ─── */
  .ab-principles { display:flex; flex-direction:column; gap:16px; }
  .ab-principle { display:flex; gap:13px; }
  .ab-principle-ic {
    width:40px; height:40px; flex-shrink:0; border-radius:var(--radius-md);
    display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--pc) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--pc) 38%, transparent);
    color: var(--pc);
    box-shadow: 0 0 16px color-mix(in srgb, var(--pc) 14%, transparent);
    transition: transform 0.25s, box-shadow 0.25s;
  }
  .ab-principle:hover .ab-principle-ic {
    transform: scale(1.08) rotate(-5deg);
    box-shadow: 0 0 22px color-mix(in srgb, var(--pc) 28%, transparent);
  }
  .ab-principle-t { font-size:14.5px; font-weight:700; margin-bottom:4px; }
  .ab-principle-d { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }

  /* ═════ КОМАНДА — КАРУСЕЛЬ ═════ */
  /* Отступы по бокам + отрицательный margin: контейнер шире панели на 14px
     с каждой стороны, но визуально выровнен по её краям.
     Зачем: у активной карточки есть scale(1.015) и тень — без этого запаса
     overflow:hidden срезал бы ей левый край (что и происходило). */
  .ab-carousel-vp {
    overflow: hidden;
    padding: 10px 14px;
    margin: 0 -14px;
  }
  .ab-carousel-track {
    display: flex; gap: 16px;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ab-mcard {
    flex: 0 0 480px;
    padding: 28px;
    border-radius: var(--radius-lg);
    background: var(--glass-fill); backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass);
    transition: opacity 0.5s ease, border-color 0.4s ease, background 0.4s ease, transform 0.5s ease;
  }
  .ab-mcard.active {
    border-color: var(--glass-border-hover);
    background: var(--glass-fill-hover);
    transform: scale(1.015);
  }
  .ab-mcard:not(.active) { opacity: 0.45; }

  .ab-m-head { display:flex; align-items:center; gap:16px; margin-bottom:18px; }
  .ab-m-av {
    width:72px; height:72px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:27px; font-weight:800; color:#08131c;
    box-shadow:0 8px 24px rgba(0,0,0,0.4); overflow:hidden;
  }
  .ab-m-av img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
  .ab-m-name { font-size:23px; font-weight:800; }
  .ab-m-meta { display:flex; align-items:center; gap:8px; margin-top:5px; flex-wrap:wrap; }
  .ab-m-role { font-family:var(--font-mono); font-size:11px; letter-spacing:0.5px; }
  .ab-m-age { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); padding:2px 8px; border-radius:10px; border:1px solid var(--glass-border); }
  .ab-m-about { font-size:13.5px; color:var(--text-secondary); line-height:1.75; margin-bottom:18px; }

  .ab-m-skills { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
  .ab-m-skill {
    display:flex; align-items:center; gap:7px;
    padding:7px 13px; border-radius:20px; font-size:11.5px;
    background: color-mix(in srgb, var(--sc) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--sc) 32%, transparent);
    color: var(--text-secondary);
    transition: transform 0.18s, background 0.18s;
  }
  .ab-m-skill:hover { transform: translateY(-2px); background: color-mix(in srgb, var(--sc) 16%, transparent); }
  .ab-m-skill svg { color: var(--sc); flex-shrink:0; }

  .ab-m-foot { display:flex; align-items:center; gap:8px; padding-top:16px; border-top:1px solid var(--glass-border); }
  .ab-m-social {
    display:flex; align-items:center; gap:7px;
    padding:8px 14px; border-radius:var(--radius-sm);
    background:rgba(255,255,255,0.03); border:1px solid var(--glass-border);
    color:var(--text-secondary); font-size:12px; text-decoration:none; transition:all 0.15s;
  }
  .ab-m-social:hover { border-color:var(--glass-border-hover); color:var(--accent-bright); transform:translateY(-2px); }

  /* ─── Четвёртая карточка: приглашение в команду ─── */
  .ab-mcard.join {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, rgba(47,105,151,0.22), rgba(0,201,122,0.09));
    border-color: var(--glass-border-hover);
    position: relative; overflow: hidden;
  }
  .ab-mcard.join::before {
    content:''; position:absolute; top:-40%; right:-10%;
    width:320px; height:320px;
    background:radial-gradient(circle, rgba(0,201,122,0.16), transparent 70%);
    pointer-events:none;
  }
  .ab-join-ic {
    width:72px; height:72px; border-radius:50%; margin-bottom:18px; position:relative;
    display:flex; align-items:center; justify-content:center;
    background: rgba(61,135,192,0.16);
    border: 1px dashed rgba(93,163,214,0.55);
    color: var(--accent-bright);
    animation: ab-join-pulse 2.6s ease-in-out infinite;
  }
  @keyframes ab-join-pulse {
    0%,100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(61,135,192,0.3); }
    50%     { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(61,135,192,0); }
  }
  .ab-join-t { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-bottom:10px; position:relative; }
  .ab-join-d { font-size:13.5px; color:var(--text-secondary); line-height:1.7; margin-bottom:20px; max-width:340px; position:relative; }
  .ab-join-roles { display:flex; flex-wrap:wrap; gap:7px; justify-content:center; margin-bottom:22px; position:relative; }
  .ab-join-role {
    font-size:11px; padding:6px 12px; border-radius:20px;
    background:rgba(255,255,255,0.04); border:1px solid var(--glass-border);
    color:var(--text-secondary);
  }
  .ab-join-btn {
    display:inline-flex; align-items:center; gap:9px; padding:13px 26px;
    border-radius:var(--radius-md); position:relative;
    background:linear-gradient(135deg, var(--accent), var(--accent-bright)); color:#fff;
    font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:1px;
    cursor:pointer; border:1px solid rgba(255,255,255,0.14);
    box-shadow:0 4px 20px rgba(47,105,151,0.35);
    transition:transform 0.15s, box-shadow 0.15s;
  }
  .ab-join-btn:hover { transform:translateY(-2px); box-shadow:0 8px 26px rgba(47,105,151,0.5); }

  .ab-carousel-bar { display:flex; align-items:center; justify-content:space-between; margin-top:18px; gap:14px; flex-wrap:wrap; }
  .ab-carousel-count { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
  .ab-carousel-count b { color:var(--accent-bright); }
  .ab-carousel-nav { display:flex; align-items:center; gap:10px; }
  .ab-arrow {
    width:38px; height:38px; border-radius:50%;
    background:rgba(255,255,255,0.03); border:1px solid var(--glass-border);
    color:var(--text-secondary); cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all 0.18s;
  }
  .ab-arrow:hover { border-color:var(--accent-bright); color:var(--accent-bright); background:rgba(61,135,192,0.1); }
  .ab-dots { display:flex; gap:7px; }
  .ab-dot { width:8px; height:8px; border-radius:50%; background:var(--border); cursor:pointer; border:none; padding:0; transition:all 0.3s; }
  .ab-dot.on { width:26px; border-radius:5px; background:var(--accent-bright); }

  /* ═════ ПРОДУКТ — ПЛИТКИ ═════ */
  .ab-prod-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .ab-prod-tile {
    padding:22px 16px; border-radius:var(--radius-md); text-align:center;
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
    transition:all 0.22s;
  }
  .ab-prod-tile:hover {
    transform:translateY(-5px);
    border-color: color-mix(in srgb, var(--pc) 50%, transparent);
    background: color-mix(in srgb, var(--pc) 6%, transparent);
  }
  .ab-prod-ic {
    width:44px; height:44px; border-radius:var(--radius-md); margin:0 auto 13px;
    display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--pc) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--pc) 34%, transparent);
    color: var(--pc);
    transition: transform 0.25s;
  }
  .ab-prod-tile:hover .ab-prod-ic { transform: scale(1.1) rotate(-6deg); }
  .ab-prod-t { font-size:13.5px; font-weight:800; margin-bottom:6px; }
  .ab-prod-d { font-size:11.5px; color:var(--text-secondary); line-height:1.55; }

  .ab-exchanges { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .ab-ex-label { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); margin-right:4px; }
  .ab-ex {
    display:flex; align-items:center; gap:7px; padding:6px 12px;
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
    border-radius:20px; font-size:12px; font-weight:600; transition:all 0.15s;
  }
  .ab-ex:hover { border-color:var(--glass-border-hover); transform:translateY(-2px); }
  .ab-ex-ic { width:16px; height:16px; border-radius:4px; flex-shrink:0; display:block; }

  /* ═════ ДОРОЖНАЯ КАРТА — ВЕРТИКАЛЬНАЯ ЛЕНТА С ФАЗАМИ ═════ */
  .ab-road { position:relative; padding-left:34px; }
  .ab-road-line {
    position:absolute; left:11px; top:12px; bottom:12px; width:2px;
    /* зелёный (сделано) → янтарный (сейчас) → серый (впереди) */
    background:linear-gradient(180deg,
      var(--success) 0%,
      var(--success) 56%,
      #f0a500 62%,
      #f0a500 68%,
      var(--border) 78%,
      var(--border) 100%);
  }

  /* Заголовок фазы — разбивает длинный путь на понятные эпохи */
  .ab-road-phase { margin-bottom: 6px; }
  .ab-road-phase:last-child { margin-bottom: 0; }
  .ab-road-phase-label {
    display:flex; align-items:center; gap:9px;
    font-family:var(--font-mono); font-size:10px; letter-spacing:2px;
    text-transform:uppercase; color: var(--rc);
    margin: 20px 0 12px; position: relative;
  }
  .ab-road-phase:first-child .ab-road-phase-label { margin-top: 4px; }
  .ab-road-phase-dot {
    position:absolute; left:-30px;
    width:16px; height:16px; border-radius:50%;
    background: color-mix(in srgb, var(--rc) 22%, #0b1926);
    border: 2px solid var(--rc);
    box-shadow: 0 0 12px color-mix(in srgb, var(--rc) 40%, transparent);
  }

  .ab-road-item { position:relative; padding-bottom:12px; }
  .ab-road-item:last-child { padding-bottom:0; }
  .ab-road-dot {
    position:absolute; left:-34px; top:16px;
    width:24px; height:24px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background:#0b1926; border:2px solid var(--border); color:var(--text-muted);
    transition:all 0.25s;
  }
  .ab-road-item.done .ab-road-dot { border-color:var(--success); background:rgba(0,201,122,0.14); color:var(--success); }
  .ab-road-item.active .ab-road-dot { border-color:#f0a500; background:rgba(240,165,0,0.18); color:#f0a500; animation:ab-pulse 2s infinite; }
  .ab-road-item.future .ab-road-dot { border-color:rgba(167,139,250,0.5); color:#a78bfa; }
  @keyframes ab-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(240,165,0,0.4)} 50%{box-shadow:0 0 0 8px rgba(240,165,0,0)} }

  .ab-road-card {
    padding:16px 18px; border-radius:var(--radius-md);
    background:var(--glass-fill); border:1px solid var(--glass-border);
    transition:all 0.2s;
  }
  .ab-road-item:hover .ab-road-card {
    transform:translateX(5px);
    border-color: color-mix(in srgb, var(--rc) 45%, transparent);
    background:var(--glass-fill-hover);
  }
  .ab-road-h { display:flex; align-items:center; gap:9px; margin-bottom:6px; flex-wrap:wrap; }
  .ab-road-ic {
    width:28px; height:28px; border-radius:var(--radius-sm); flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--rc) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--rc) 34%, transparent);
    color: var(--rc);
  }
  .ab-road-date {
    font-family:var(--font-mono); font-size:9px; letter-spacing:0.5px;
    padding:3px 9px; border-radius:10px;
    color: var(--rc);
    background: color-mix(in srgb, var(--rc) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--rc) 36%, transparent);
  }
  .ab-road-t { font-size:15px; font-weight:800; }
  .ab-road-d { font-size:12.5px; color:var(--text-secondary); line-height:1.6; }

  /* ═════ CTA — набор в команду ═════ */
  .ab-cta {
    background:linear-gradient(135deg, rgba(47,105,151,0.22), rgba(0,201,122,0.09));
    border:1px solid var(--glass-border-hover); border-radius:var(--radius-xl);
    box-shadow:var(--shadow-glass); padding:40px 44px; position:relative; overflow:hidden;
    margin-bottom:16px;
  }
  .ab-cta::before { content:''; position:absolute; top:-60%; right:-4%; width:380px; height:380px; background:radial-gradient(circle, rgba(0,201,122,0.14), transparent 70%); pointer-events:none; }
  .ab-cta-h { font-size:27px; font-weight:900; letter-spacing:-0.7px; margin-bottom:12px; position:relative; }
  .ab-cta-sub { font-size:14px; color:var(--text-secondary); line-height:1.7; max-width:600px; margin-bottom:22px; position:relative; }
  .ab-cta-roles { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:26px; position:relative; }
  .ab-cta-role { font-size:12px; padding:7px 14px; border-radius:20px; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border); color:var(--text-secondary); }
  .ab-cta-btn {
    display:inline-flex; align-items:center; gap:9px; padding:15px 32px; border-radius:var(--radius-md);
    background:linear-gradient(135deg, var(--accent), var(--accent-bright)); color:#fff;
    font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:1px;
    cursor:pointer; border:1px solid rgba(255,255,255,0.14);
    box-shadow:0 4px 22px rgba(47,105,151,0.38);
    transition:transform 0.15s, box-shadow 0.15s; position:relative; text-decoration:none;
  }
  .ab-cta-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(47,105,151,0.5); }

  /* ═════ КОНТАКТЫ — РАЗДВИГАЮЩАЯСЯ ЛЕНТА ═════ */
  .ab-contacts { display:flex; gap:12px; }
  .ab-contact {
    flex:1; position:relative; overflow:hidden;
    padding:26px 22px; border-radius:var(--radius-lg);
    background:rgba(255,255,255,0.02);
    border:1px solid var(--glass-border);
    text-decoration:none;
    transition: flex 0.45s cubic-bezier(0.4,0,0.2,1), border-color 0.3s;
  }
  .ab-contact:hover {
    flex:1.6;
    border-color: color-mix(in srgb, var(--cc) 55%, transparent);
  }
  .ab-contact::before {
    content:''; position:absolute; inset:0;
    background:radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--cc) 16%, transparent), transparent 65%);
    opacity:0; transition:opacity 0.35s;
  }
  .ab-contact:hover::before { opacity:1; }
  .ab-contact-ic {
    width:46px; height:46px; border-radius:50%; position:relative;
    display:flex; align-items:center; justify-content:center; margin-bottom:14px;
    background: color-mix(in srgb, var(--cc) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--cc) 42%, transparent);
    color: var(--cc);
    transition: transform 0.3s;
  }
  .ab-contact:hover .ab-contact-ic { transform: scale(1.12); }
  .ab-contact-t { font-size:15px; font-weight:800; color:var(--text-primary); position:relative; margin-bottom:5px; white-space:nowrap; }
  .ab-contact-d { font-size:12px; color:var(--text-secondary); position:relative; line-height:1.5; }

  @media (max-width: 900px) {
    .ab-grid, .ab-prod-grid { grid-template-columns: 1fr; }
    .ab-contacts { flex-direction: column; }
    .ab-contact:hover { flex: 1; }
    .ab-mcard { flex: 0 0 88vw; }
  }
`

// ─── Появление при скролле ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
    const ref = useRef(null)
    const [shown, setShown] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect() } },
            // Порог через rootMargin, а НЕ threshold: threshold — это доля видимой
            // части элемента, и высокий блок (выше экрана) её никогда не достигнет,
            // то есть просто не появится. rootMargin от высоты не зависит.
            { threshold: 0, rootMargin: '0px 0px -20% 0px' }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={`ab-reveal ${shown ? 'in' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

// ─── Карусель команды ────────────────────────────────────────────────────────
// Автопрокрутка (пауза при наведении) + стрелки + точки.
// Последний слайд — приглашение в команду с кнопкой, которая плавно
// прокручивает к блоку набора ниже на странице.
const CARD_W = 480
const GAP = 16
const AUTOPLAY_MS = 6000

function TeamCarousel({ onJoinClick }) {
    const [idx, setIdx] = useState(0)
    const [paused, setPaused] = useState(false)

    // всего слайдов: участники + карточка приглашения
    const total = TEAM.length + 1

    const go = useCallback((d) => {
        setIdx(prev => (prev + d + total) % total)
    }, [total])

    // Автопрокрутка. Останавливается при наведении мыши, чтобы карточка
    // не уехала, пока человек её читает.
    useEffect(() => {
        if (paused) return
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
        if (reduced) return

        const id = setInterval(() => go(1), AUTOPLAY_MS)
        return () => clearInterval(id)
    }, [paused, go])

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="ab-carousel-vp">
                <div
                    className="ab-carousel-track"
                    style={{ transform: `translateX(${-idx * (CARD_W + GAP)}px)` }}
                >
                    {TEAM.map((m, i) => (
                        <div key={i} className={`ab-mcard ${i === idx ? 'active' : ''}`}>
                            <div className="ab-m-head">
                                <div className="ab-m-av" style={{ background: m.color }}>
                                    {m.photo
                                        ? <img src={m.photo} alt={m.name} onError={e => { e.target.style.display = 'none' }} />
                                        : m.initial}
                                </div>
                                <div>
                                    <div className="ab-m-name">{m.name}</div>
                                    <div className="ab-m-meta">
                                        <span className="ab-m-role" style={{ color: m.roleColor }}>{m.role}</span>
                                        {m.age && <span className="ab-m-age">{m.age} лет</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="ab-m-about">{m.about}</div>

                            {m.skills?.length > 0 && (
                                <div className="ab-m-skills">
                                    {m.skills.map((s, j) => {
                                        const Ic = SKILL_ICONS[s.icon] ?? Sparkles
                                        return (
                                            <span key={j} className="ab-m-skill" style={{ '--sc': s.color }}>
                                                <Ic size={13} />
                                                {s.label}
                                            </span>
                                        )
                                    })}
                                </div>
                            )}

                            {m.socials?.length > 0 && (
                                <div className="ab-m-foot">
                                    {m.socials.map((s, j) => (
                                        <a
                                            key={j}
                                            className="ab-m-social"
                                            href={s.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Send size={13} />
                                            {s.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Четвёртый слайд — приглашение в команду */}
                    <div className={`ab-mcard join ${idx === TEAM.length ? 'active' : ''}`}>
                        <div className="ab-join-ic"><UserPlus size={30} /></div>
                        <div className="ab-join-t">Здесь может быть ты</div>
                        <div className="ab-join-d">
                            Нас трое — и мы ищем тех, кто хочет строить AXIOMA вместе с нами.
                            Условия обсуждаем лично, задачи разные.
                        </div>
                        <div className="ab-join-roles">
                            <span className="ab-join-role">Соцсети и контент</span>
                            <span className="ab-join-role">Разработка</span>
                            <span className="ab-join-role">Реклама и трафик</span>
                        </div>
                        <button className="ab-join-btn" onClick={onJoinClick}>
                            ХОЧУ В КОМАНДУ
                            <ArrowDown size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="ab-carousel-bar">
                <span className="ab-carousel-count">
                    <b>{idx + 1}</b> / {total} · {paused ? 'пауза' : 'автопрокрутка'}
                </span>
                <div className="ab-carousel-nav">
                    <div className="ab-dots">
                        {Array.from({ length: total }).map((_, i) => (
                            <button
                                key={i}
                                className={`ab-dot ${i === idx ? 'on' : ''}`}
                                onClick={() => setIdx(i)}
                                aria-label={`Слайд ${i + 1}`}
                            />
                        ))}
                    </div>
                    <button className="ab-arrow" onClick={() => go(-1)} aria-label="Назад">
                        <ChevronLeft size={17} />
                    </button>
                    <button className="ab-arrow" onClick={() => go(1)} aria-label="Вперёд">
                        <ChevronRight size={17} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function AboutPage({ onNavigate }) {
    // Кнопка «Хочу в команду» в карусели плавно прокручивает к блоку набора ниже
    const joinRef = useRef(null)

    const scrollToJoin = () => {
        joinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return (
        <>
            <style>{style}</style>
            <div className="ab-wrap">
                <div className="ab-bg" />
                <div className="ab-inner">

                    {/* ═════ HERO ═════ */}
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

                    {/* ═════ МИССИЯ + ПРИНЦИПЫ ═════ */}
                    <div className="ab-grid">
                        <Reveal delay={80}>
                            <div className="ab-panel">
                                <div className="ab-panel-label"><Target size={13} /> МИССИЯ</div>
                                <div className="ab-panel-h">Зачем мы это делаем</div>
                                <div className="ab-p">
                                    Главная задача — показать, что на криптовалюте можно зарабатывать просто и легко,
                                    и чтобы эти слова были честными.
                                </div>
                                <div className="ab-p">
                                    Но мы хотим быть не только платформой для заработка. С арбитража большинство людей
                                    <b> начинают знакомство с криптой</b> — а уже потом открывают для себя другие виды
                                    торговли и возможностей. Поэтому наша миссия шире: быть удобным и полезным
                                    проводником в мир криптовалюты.
                                </div>
                            </div>
                        </Reveal>

                        <Reveal delay={160}>
                            <div className="ab-panel">
                                <div className="ab-panel-label"><Sparkles size={13} /> ПРИНЦИПЫ</div>
                                <div className="ab-panel-h">Во что мы верим</div>
                                <div className="ab-principles">
                                    {PRINCIPLES.map((p, i) => {
                                        const Ic = p.icon
                                        return (
                                            <div key={i} className="ab-principle" style={{ '--pc': p.color }}>
                                                <div className="ab-principle-ic"><Ic size={19} /></div>
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

                    {/* ═════ ИСТОРИЯ ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><Rocket size={13} /> КАК ВСЁ НАЧАЛОСЬ</div>
                            <div className="ab-panel-h">От P2P до собственного сканера</div>
                            <div className="ab-p">
                                Мы с Евгением — бывшие P2P-арбитражники. Когда эта тема начала постепенно угасать, мы стали
                                искать другие способы заработка на крипте и пришли к арбитражу. Начали покупать сканеры,
                                перепробовали много разных — и почти везде было неудобно ими пользоваться.
                            </div>
                            <div className="ab-p">
                                Тогда мы решили создать собственный сканер, который в первую очередь закрывает потребность
                                в удобстве — и по работе с самим инструментом, и по арбитражу в целом. Так 20 мая 2025 года
                                началась AXIOMA. Сначала это были телеграм-боты под названием Axion Scan, но из-за блокировок
                                в России пришлось резко переходить на полноценный сайт.
                            </div>
                            <div className="ab-p">
                                Тогда же появился <b>Слава</b> — и с радостью взялся за идею. Вся внутренняя составляющая
                                сканера его: движок, сбор данных с восьми бирж в реальном времени, база данных, инфраструктура.
                                Именно он превратил замысел в работающую систему, которая держит поток котировок и не падает.
                                Большую часть того, за что AXIOMA хвалят, не видно на экране — и это его вклад.
                            </div>
                            <div className="ab-p">
                                Отдельно о том, куда мы идём. <b>Автоматизированные продукты для арбитража почти никто
                                не даёт</b> — и понятно почему: чем больше людей получат такой инструмент, тем выше конкуренция
                                за одни и те же возможности. Мы хотим это изменить и открыть автоматизацию каждому,
                                а не держать её для узкого круга.
                            </div>
                            <div className="ab-p">
                                <b>Мы только запустили сайт.</b> Впереди много работы, и мы хотим слышать каждого, кто с нами:
                                что удобно, что мешает, чего не хватает. Продукт растёт не из наших догадок, а из того, что нам
                                говорят люди — и мы строим его так, чтобы он закрывал как можно больше реальных потребностей.
                            </div>
                        </div>
                    </Reveal>

                    {/* ═════ КОМАНДА — КАРУСЕЛЬ ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><Users size={13} /> КОМАНДА</div>
                            <div className="ab-panel-h">Три человека за проектом</div>
                            <TeamCarousel onJoinClick={scrollToJoin} />
                        </div>
                    </Reveal>

                    {/* ═════ ПРОДУКТ — ПЛИТКИ ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><MonitorSmartphone size={13} /> ПРОДУКТ СЕЙЧАС</div>
                            <div className="ab-panel-h">Что уже умеет AXIOMA</div>

                            <div className="ab-prod-grid">
                                {PRODUCTS.map((p, i) => {
                                    const Ic = p.icon
                                    return (
                                        <div key={i} className="ab-prod-tile" style={{ '--pc': p.color }}>
                                            <div className="ab-prod-ic"><Ic size={21} /></div>
                                            <div className="ab-prod-t">{p.title}</div>
                                            <div className="ab-prod-d">{p.desc}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="ab-exchanges">
                                <span className="ab-ex-label">8 бирж:</span>
                                {PRODUCT_EXCHANGES.map((ex, i) => (
                                    <span key={i} className="ab-ex">
                                        {/* фавикон биржи — тот же приём, что на главной */}
                                        <img
                                            className="ab-ex-ic"
                                            src={`https://www.google.com/s2/favicons?domain=${ex.domain}&sz=32`}
                                            alt=""
                                            loading="lazy"
                                        />
                                        {ex.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* ═════ ДОРОЖНАЯ КАРТА ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide" style={{ marginBottom: 16 }}>
                            <div className="ab-panel-label"><MapIcon size={13} /> ДОРОЖНАЯ КАРТА</div>
                            <div className="ab-panel-h">Путь, который мы прошли — и куда идём</div>

                            <div className="ab-road">
                                <div className="ab-road-line" />

                                {ROADMAP_PHASES.map(phase => (
                                    <div key={phase.id} className="ab-road-phase" style={{ '--rc': phase.color }}>
                                        {/* Заголовок фазы — визуально разбивает длинный путь
                                            на понятные эпохи, иначе 14 пунктов подряд читаются тяжело */}
                                        <div className="ab-road-phase-label">
                                            <span className="ab-road-phase-dot" />
                                            {phase.label}
                                        </div>

                                        {phase.items.map((r, i) => {
                                            const StatusIc = ROAD_ICON[r.status]
                                            const Ic = r.icon
                                            return (
                                                <div key={i} className={`ab-road-item ${r.status}`}>
                                                    <div className="ab-road-dot"><StatusIc size={11} /></div>
                                                    <div className="ab-road-card">
                                                        <div className="ab-road-h">
                                                            <div className="ab-road-ic"><Ic size={14} /></div>
                                                            {r.date && <span className="ab-road-date">{r.date}</span>}
                                                            <span className="ab-road-t">{r.title}</span>
                                                        </div>
                                                        <div className="ab-road-d">{r.desc}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {/* ═════ CTA — НАБОР В КОМАНДУ ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-cta" ref={joinRef}>
                            <div className="ab-cta-h">Мы ищем людей в команду</div>
                            <div className="ab-cta-sub">
                                Проект растёт, и нам нужны руки и головы на разные задачи. Если хочешь строить AXIOMA
                                вместе с нами — напиши нашему боту-менеджеру. Условия — по договорённости.
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

                    {/* ═════ КОНТАКТЫ — РАЗДВИГАЮЩАЯСЯ ЛЕНТА ═════ */}
                    <Reveal delay={60}>
                        <div className="ab-panel wide">
                            <div className="ab-panel-label"><Globe size={13} /> КОНТАКТЫ</div>
                            <div className="ab-panel-h">Разработчики ближе, чем ты думаешь</div>
                            <div className="ab-p" style={{ marginBottom: 20 }}>
                                Мы читаем каждое сообщение и с радостью выслушаем твою идею, замечание или проблему.
                            </div>

                            <div className="ab-contacts">
                                {CONTACTS.map((c, i) => {
                                    const Ic = c.icon
                                    return (
                                        <a
                                            key={i}
                                            className="ab-contact"
                                            style={{ '--cc': c.color }}
                                            href={c.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <div className="ab-contact-ic"><Ic size={20} /></div>
                                            <div className="ab-contact-t">{c.title}</div>
                                            <div className="ab-contact-d">{c.desc}</div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    </Reveal>

                </div>

                {/* Футер. Был потерян, когда я скопировал старую версию файла поверх новой —
                    возвращён на место. */}
                <Footer onNavigate={onNavigate} />
            </div>
        </>
    )
}

export default AboutPage