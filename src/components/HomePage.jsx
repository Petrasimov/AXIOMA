import { useState, useEffect, useRef, useMemo } from "react"
import {
  ArrowRight, GraduationCap, Users, HelpCircle, ChevronDown,
  Check, Trophy, BookOpen, Settings, Shuffle, Percent,
  MonitorSmartphone, ShieldCheck,
  Target, Wrench, SlidersHorizontal, BarChart3, Gamepad2,
  Send, ExternalLink,
  Sprout, Crown, TrendingUp,
} from "lucide-react"

import Footer from "./Footer.jsx"
import { TRAINING_MODULES } from "../data/trainingContent.js"
import { useTrainingProgress, resolveStatus } from "../hooks/useTrainingProgress.js"
import { TEAM } from "../data/teamContent.js"
import { FAQ_HOMEPAGE } from "../data/faqContent.js"

// Иконки модулей Академии (резолвим по имени из данных)
const MODULE_ICONS = {
  BookOpen, Settings, Shuffle, Percent, MonitorSmartphone, ShieldCheck,
}

// Иконки соцсетей команды (тип из teamContent.js → компонент).
//
// ВАЖНО: в lucide-react НЕТ брендовых иконок (Github, Instagram, Vk и т.п.) —
// их убрали из библиотеки. Поэтому для Telegram используем Send (стрелочка,
// визуально совпадает с логотипом), для всех остальных — универсальную
// ExternalLink. Если понадобятся настоящие логотипы соцсетей, их нужно будет
// добавить как inline-SVG.
const SOCIAL_ICONS = {
  telegram: Send,
  vk: ExternalLink,
  instagram: ExternalLink,
  github: ExternalLink,
}

const PANEL_LABELS = [
  'AXIOMA — SCANNER VIEW',
  'AXIOMA — FILTER DRAWER',
  'AXIOMA — TRADE ENTRY',
  'AXIOMA — PROFIT LOCKED',
]

const style = `
  .hp-wrap {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 1;
    scroll-behavior: smooth;
  }

  /* ─── Система появления блоков при скролле ───
     Длительность увеличена (0.7s → 1.1s) и смещение больше (28px → 46px),
     чтобы появление было заметным, а не мелькало.
     Порог срабатывания задан в компоненте Reveal (30% блока + отступ). */
  .hp-reveal {
    opacity: 0;
    transform: translateY(46px);
    transition: opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1),
                transform 1.1s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform;
  }
  .hp-reveal.in { opacity: 1; transform: translateY(0); }

  /* появление сбоку — для таймлайна */
  .hp-reveal-x { opacity: 0; transform: translateX(-40px); transition: opacity 1s ease, transform 1s cubic-bezier(0.22,1,0.36,1); }
  .hp-reveal-x.in { opacity: 1; transform: translateX(0); }

  /* мягкое увеличение — для карточек/графика */
  .hp-reveal-scale { opacity: 0; transform: scale(0.94) translateY(30px); transition: opacity 1.1s ease, transform 1.1s cubic-bezier(0.22,1,0.36,1); }
  .hp-reveal-scale.in { opacity: 1; transform: scale(1) translateY(0); }

  /* hero — появление при загрузке, каскадом */
  @keyframes hp-hero-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hp-hero > * { animation: hp-hero-up 0.8s cubic-bezier(0.22,1,0.36,1) backwards; }
  .hp-hero > *:nth-child(1) { animation-delay: 0.05s; }
  .hp-hero > *:nth-child(2) { animation-delay: 0.15s; }
  .hp-hero > *:nth-child(3) { animation-delay: 0.25s; }
  .hp-hero > *:nth-child(4) { animation-delay: 0.35s; }
  .hp-hero > *:nth-child(5) { animation-delay: 0.45s; }

  /* подпись над логотипами бирж — неброская, как подзаголовок hero */
  .hp-ex-label {
    font-size: 13px;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
    margin-bottom: 14px;
    text-align: center;
  }

  /* индикатор прокрутки вниз — растворяется по мере скролла */
  .hp-scroll-hint {
    position: absolute;
    bottom: 28px; left: 50%;
    transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    color: var(--text-muted); font-size: 10px;
    font-family: var(--font-mono); letter-spacing: 1.5px;
    pointer-events: none;
    /* opacity задаётся инлайн из JS (зависит от позиции скролла) */
    transition: opacity 0.15s linear;
  }
  .hp-scroll-hint-inner {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    animation: hp-hint-fade 3s ease-in-out infinite;
  }
  .hp-scroll-hint-mouse {
    width: 22px; height: 34px; border-radius: 12px;
    border: 1.5px solid var(--glass-border-hover);
    display: flex; justify-content: center; padding-top: 6px;
  }
  .hp-scroll-hint-dot {
    width: 3px; height: 6px; border-radius: 2px;
    background: var(--accent-bright);
    animation: hp-hint-dot 1.8s ease-in-out infinite;
  }
  @keyframes hp-hint-dot {
    0%   { opacity: 0; transform: translateY(0); }
    40%  { opacity: 1; }
    80%  { opacity: 0; transform: translateY(9px); }
    100% { opacity: 0; }
  }
  @keyframes hp-hint-fade {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.9; }
  }

  /* уважение к настройке "меньше движения" */
  @media (prefers-reduced-motion: reduce) {
    .hp-reveal, .hp-reveal-x, .hp-reveal-scale {
      opacity: 1 !important; transform: none !important; transition: none !important;
    }
    .hp-hero > * { animation: none !important; }
    .hp-scroll-hint { animation: none; }
  }

  .hp-bg-glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }
  .hp-bg-glow::before {
    content: '';
    position: absolute;
    width: 760px; height: 760px;
    background: radial-gradient(circle, rgba(47,105,151,0.16) 0%, transparent 70%);
    top: -260px; left: 12%;
    animation: hp-float1 18s ease-in-out infinite;
  }
  .hp-bg-glow::after {
    content: '';
    position: absolute;
    width: 520px; height: 520px;
    background: radial-gradient(circle, rgba(0,201,122,0.09) 0%, transparent 70%);
    bottom: 40px; right: 6%;
    animation: hp-float2 22s ease-in-out infinite;
  }
  .hp-bg-glow-extra {
    position: absolute;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(61,135,192,0.1) 0%, transparent 70%);
    top: 38%; right: 22%;
    animation: hp-float1 26s ease-in-out infinite reverse;
  }
  @keyframes hp-float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(24px)} }
  @keyframes hp-float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }

  /* ════ BLOCK 1: HERO ════ */
  .hp-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 92vh;
    padding: 80px 48px 64px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .hp-h1 {
    font-size: 64px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -2px;
    color: var(--text-primary);
    margin-bottom: 26px;
    max-width: 820px;
  }
  .hp-h1-grad {
    background: linear-gradient(135deg, var(--accent-bright) 0%, #7dd3fc 50%, var(--success) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hp-sub {
    font-size: 17px;
    color: var(--text-secondary);
    line-height: 1.8;
    max-width: 620px;
    margin-bottom: 44px;
  }

  .hp-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 52px;
  }
  .hp-btn-primary {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 16px 36px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 100%);
    color: white;
    border: 1px solid rgba(255,255,255,0.14);
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(47,105,151,0.38), inset 0 1px 0 rgba(255,255,255,0.18);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .hp-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(47,105,151,0.5), inset 0 1px 0 rgba(255,255,255,0.22);
  }
  .hp-btn-secondary {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1px;
    padding: 15px 26px;
    border-radius: var(--radius-md);
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(8px);
    color: var(--text-secondary);
    border: 1px solid var(--glass-border);
    cursor: pointer;
    transition: all 0.15s;
  }
  .hp-btn-secondary:hover {
    color: var(--text-primary);
    border-color: var(--glass-border-hover);
    background: rgba(93,163,214,0.08);
  }

  /* Exchange favicons */
  .hp-ex-logos {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
  }
  .hp-favicon-wrap {
    width: 42px; height: 42px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    background: var(--glass-fill);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, transform 0.2s, background 0.2s, box-shadow 0.2s;
    position: relative;
    cursor: pointer;
    text-decoration: none;
  }
  .hp-favicon-wrap:hover {
    border-color: var(--glass-border-hover);
    transform: translateY(-3px);
    background: var(--glass-fill-hover);
    box-shadow: var(--shadow-glass);
  }
  .hp-favicon-wrap img {
    width: 20px; height: 20px;
    display: block;
  }
  .hp-favicon-fallback {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 800;
    position: absolute;
  }

  /* ════ BLOCK 2: HOW IT WORKS ════ */
  .hp-howto {
    background: transparent;
    border-top: 1px solid var(--glass-border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 36px;
    min-height: 520px;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }
  .hp-howto::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(circle at 12% 15%, rgba(240,165,0,0.055) 0%, transparent 50%),
      radial-gradient(circle at 88% 85%, rgba(125,211,252,0.06) 0%, transparent 50%),
      linear-gradient(180deg, rgba(4,8,13,0.55) 0%, rgba(4,8,13,0.2) 100%);
  }

  .hp-timeline-col {
    padding: 64px 60px 64px 96px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .hp-section-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--accent-bright);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 22px;
  }
  .hp-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .hp-howto-title {
    font-size: 26px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 36px;
    letter-spacing: -0.4px;
    line-height: 1.28;
  }
  .hp-howto-title span { color: var(--accent-bright); }

  .hp-timeline { display: flex; flex-direction: column; flex: 1; }
  .hp-tl-step {
    display: grid;
    grid-template-columns: 40px 1fr;
    position: relative;
    cursor: pointer;
  }

  /* ─── Соединительная линия между кружками ───
  
     БЫЛО ДВА БАГА:
     1. left: 15px — линия стояла НЕ по центру кружка. Колонка 40px, кружок 32px
        → его центр на 20px. Линия шириной 1px при left:15px имела центр на 15.5px,
        то есть уезжала влево на 4.5px.
     2. height: calc(100% - 4px) при top:38px — линия ПЕРЕЛИВАЛАСЬ за низ строки
        и налезала на следующий кружок. А так как у активного кружка фон
        полупрозрачный (rgba), линия просвечивала прямо сквозь него.
     
     ИСПРАВЛЕНО: центрирование через left:50% + translateX(-50%), и жёсткие
     границы top/bottom вместо height — линия идёт строго от низа своего кружка
     до верха следующего.
  */
  /* ─── Соединительная линия между кружками ───
  
     РЕАЛЬНЫЙ <div>, а не псевдоэлемент.
     
     Раньше линия делалась через ::before/::after с переключением классов
     line-drawn / line-drawing. Классы применялись корректно (галочки шагов
     это подтверждали), но линия всё равно не закрашивалась — значит где-то
     не срабатывала специфичность или transform на псевдоэлементе.
     
     Отлаживать вслепую то, что нельзя посмотреть в браузере, — плохая идея.
     Поэтому линия теперь обычный элемент, а её заполнение задаётся ИНЛАЙНОВЫМ
     стилем transform: scaleY(0|1) прямо из состояния React. Здесь ломаться
     нечему: нет каскада, нет специфичности, нет псевдоэлементов.
  */
  .hp-tl-line {
    position: absolute;
    left: 50%;
    margin-left: -0.5px;      /* центрируем 1px по центру кружка */
    top: 36px;                /* сразу под кружком (2px padding + 32px кружок + 2px) */
    bottom: -2px;             /* дотягиваемся до верха следующего кружка */
    width: 1px;
    background: var(--border);   /* серая направляющая — видна всегда */
    overflow: hidden;
  }
  .hp-tl-line-fill {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, var(--success), rgba(0,201,122,0.6));
    transform-origin: top;
    /* scaleY задаётся инлайн: 1 — линия протянута, 0 — сброшена */
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hp-tl-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 2px;
    position: relative;
  }
  .hp-tl-circle {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--border);
    /* Непрозрачная подложка под полупрозрачным фоном состояний —
       чтобы линия гарантированно не просвечивала сквозь кружок. */
    background: var(--bg-card);
    color: var(--text-muted);
    z-index: 2;
    flex-shrink: 0;
    position: relative;
    transition:
      border-color 0.4s ease,
      background 0.4s ease,
      color 0.4s ease,
      box-shadow 0.4s ease,
      transform 0.45s cubic-bezier(.34,1.56,.64,1);
  }
  /* подложка перекрывает линию, даже когда фон состояния полупрозрачный */
  .hp-tl-circle::before {
    content: '';
    position: absolute; inset: -1px;
    border-radius: 50%;
    background: var(--bg-primary);
    z-index: -1;
  }

  /* ─── Вступительная анимация: шаги появляются по очереди ─── */
  .hp-tl-step.intro-hidden .hp-tl-circle {
    opacity: 0;
    transform: scale(0.4);
  }
  .hp-tl-step.intro-hidden .hp-tl-right {
    opacity: 0;
    transform: translateX(-12px);
  }
  .hp-tl-right {
    padding: 2px 0 34px 20px;
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hp-tl-step:last-child .hp-tl-right { padding-bottom: 0; }

  .hp-tl-step.active .hp-tl-circle {
    border-color: var(--accent-bright);
    background: rgba(61,135,192,0.15);
    color: var(--accent-bright);
    box-shadow: 0 0 14px rgba(61,135,192,0.25);
  }
  .hp-tl-step.done .hp-tl-circle {
    border-color: var(--success);
    background: rgba(0,201,122,0.12);
    color: var(--success);
  }
  .hp-tl-title {
    font-size: 16px; font-weight: 700;
    color: var(--text-muted); margin-bottom: 7px;
    transition: color 0.2s;
  }
  .hp-tl-step.active .hp-tl-title,
  .hp-tl-step.done .hp-tl-title { color: var(--text-primary); }
  .hp-tl-desc {
    font-size: 13.5px; color: var(--text-muted);
    line-height: 1.7; max-width: 380px;
    transition: color 0.2s;
  }
  .hp-tl-step.active .hp-tl-desc,
  .hp-tl-step.done .hp-tl-desc { color: var(--text-secondary); }
  .hp-tl-tags {
    display: flex; gap: 7px; margin-top: 10px;
    flex-wrap: wrap; opacity: 0; transition: opacity 0.3s;
  }
  .hp-tl-step.active .hp-tl-tags,
  .hp-tl-step.done .hp-tl-tags { opacity: 1; }
  .hp-tl-tag {
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 1px; padding: 3px 8px;
    border-radius: 20px;
    border: 1px solid var(--border); color: var(--text-muted);
  }
  .hp-tl-tag.blue { border-color: rgba(61,135,192,0.3); color: var(--accent-bright); }
  .hp-tl-tag.green { border-color: rgba(0,201,122,0.3); color: var(--success); }
  .hp-tl-tag.red { border-color: rgba(224,62,62,0.3); color: var(--error); }

  /* Right visual panel */
  .hp-panel-col {
    background: var(--glass-fill);
    backdrop-filter: blur(22px) saturate(150%);
    -webkit-backdrop-filter: blur(22px) saturate(150%);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
    margin: 64px 60px 64px 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .hp-panel-topbar {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 16px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
  }
  .hp-panel-dot { width: 8px; height: 8px; border-radius: 50%; }
  .hp-panel-title {
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-muted); letter-spacing: 1px; margin-left: 6px;
  }
  .hp-panel-stage {
    flex: 1; display: flex;
    align-items: center; justify-content: center;
    padding: 20px 24px;
  }

  .hp-vis {
    display: none; width: 100%;
    flex-direction: column; align-items: center; gap: 14px;
    animation: hp-fadein 0.35s ease;
  }
  .hp-vis.show { display: flex; }
  @keyframes hp-fadein {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes hp-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* ── VIS 0: Scanner ── */
  .hp-scan-grid { width: 100%; display: flex; flex-direction: column; gap: 5px; }
  .hp-scan-head {
    display: grid;
    grid-template-columns: 1fr 1fr 76px 56px;
    gap: 8px; padding: 6px 10px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
  }
  .hp-scan-th {
    font-family: var(--font-mono); font-size: 8px;
    color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;
  }
  .hp-scan-row {
    display: grid;
    grid-template-columns: 1fr 1fr 76px 56px;
    gap: 8px; padding: 9px 10px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    align-items: center;
  }
  .hp-scan-row.hl { border-color: var(--accent-bright); background: rgba(47,105,151,0.1); }
  .hp-scan-sym { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .hp-scan-sub { font-size: 9px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
  .hp-scan-exes { display: flex; align-items: center; gap: 5px; }
  .hp-scan-arr { font-size: 9px; color: var(--text-muted); }
  .hp-scan-spread { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
  .hp-scan-profit { font-family: var(--font-mono); font-size: 11px; color: var(--success); }
  .hp-scan-pulse {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); animation: hp-pulse 1.2s infinite; margin-left: auto;
  }

  /* ── VIS 1: Filters ── */
  .hp-filter-mock {
    width: 100%; max-width: 420px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .hp-filter-head {
    padding: 16px 20px; border-bottom: 1px solid var(--glass-border);
    font-size: 13px; font-weight: 700; letter-spacing: 1px;
    display: flex; align-items: center; gap: 10px; color: var(--text-primary);
  }
  .hp-filter-sec { padding: 16px 20px; border-bottom: 1px solid var(--glass-border); }
  .hp-filter-sec:last-child { border-bottom: none; }
  .hp-filter-lbl {
    font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;
  }
  .hp-fex-row { display: flex; gap: 7px; flex-wrap: wrap; }
  .hp-fex {
    width: 32px; height: 32px; border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center;
  }
  .hp-fex img { width: 18px; height: 18px; }
  .hp-fex.sel { border-color: var(--accent-bright); background: rgba(61,135,192,0.12); }
  .hp-slider-row { display: flex; align-items: center; gap: 10px; }
  .hp-slider { flex: 1; height: 3px; background: var(--border); border-radius: 2px; }
  .hp-slider-fill { height: 100%; background: var(--accent-bright); border-radius: 2px; width: 30%; }
  .hp-slider-val { font-family: var(--font-mono); font-size: 12px; color: var(--accent-bright); }
  .hp-toggle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .hp-toggle-row:last-child { margin-bottom: 0; }
  .hp-toggle {
    width: 36px; height: 20px; border-radius: 10px;
    display: flex; align-items: center; padding: 3px;
    background: rgba(0,201,122,0.2); border: 1px solid rgba(0,201,122,0.3); flex-shrink: 0;
  }
  .hp-toggle .knob { width: 14px; height: 14px; border-radius: 50%; background: var(--success); margin-left: auto; }
  .hp-toggle-txt { font-size: 13px; color: var(--text-secondary); }

  /* ── VIS 2: Trade entry ── */
  .hp-trade-mock {
    width: 100%; max-width: 420px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .hp-trade-head {
    padding: 16px 20px; border-bottom: 1px solid var(--glass-border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .hp-trade-sym { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .hp-trade-badge {
    font-family: var(--font-mono); font-size: 14px; font-weight: 700;
    padding: 5px 14px; border-radius: 20px; background: rgba(0,201,122,0.12);
    border: 1px solid rgba(0,201,122,0.25); color: var(--success);
  }
  .hp-trade-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
  .hp-trade-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hp-trade-side {
    padding: 16px 14px; border: 1px solid;
    border-radius: var(--radius-sm);
    display: flex; flex-direction: column; gap: 8px;
  }
  .hp-trade-side.long { border-color: rgba(0,201,122,0.3); background: rgba(0,201,122,0.05); }
  .hp-trade-side.short { border-color: rgba(224,62,62,0.3); background: rgba(224,62,62,0.05); }
  .hp-side-lbl { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 2px; }
  .hp-side-ex { display: flex; align-items: center; gap: 7px; }
  .hp-side-ex img { width: 18px; height: 18px; }
  .hp-side-ex span { font-size: 13px; color: var(--text-secondary); }
  .hp-side-price { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .hp-trade-profit {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 14px; background: rgba(0,201,122,0.05);
    border: 1px solid rgba(0,201,122,0.15);
    border-radius: var(--radius-sm);
  }
  .hp-trade-profit-lbl { font-size: 12px; color: var(--text-secondary); }
  .hp-trade-profit-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--success); }

  /* ── VIS 3: Spread convergence chart ── */
  .hp-chart-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hp-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .hp-chart-title {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .hp-chart-svg { width: 100%; display: block; }
  .hp-chart-legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hp-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .hp-legend-line { width: 14px; height: 2px; }
  .hp-legend-dash { width: 14px; height: 0; border-top: 2px dashed; }
  .hp-chart-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    background: rgba(0,201,122,0.06);
    border: 1px solid rgba(0,201,122,0.2);
  }
  .hp-chart-result-lbl { font-size: 10px; color: var(--text-secondary); }
  .hp-chart-result-val {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    color: var(--success);
  }

  /* nav dots */
  .hp-panel-nav {
    display: flex; justify-content: center;
    gap: 8px; padding: 11px 0;
    border-top: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.02);
  }
  .hp-nav-dot {
    width: 24px; height: 3px; border-radius: 2px;
    background: var(--border); cursor: pointer;
    transition: background 0.2s, width 0.2s;
  }
  .hp-nav-dot.active { background: var(--accent-bright); width: 32px; }

  /* ════ BLOCK 3: FUNDING TUTORIAL ════ */
  .hp-funding {
    padding: 80px 48px 96px;
    border-top: 1px solid var(--glass-border);
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }
  .hp-funding::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(circle at 82% 12%, rgba(0,201,122,0.06) 0%, transparent 50%),
      radial-gradient(circle at 10% 88%, rgba(47,105,151,0.07) 0%, transparent 50%),
      linear-gradient(180deg, rgba(4,8,13,0.2) 0%, rgba(4,8,13,0.55) 100%);
  }

  .hp-funding-eyebrow {
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px;
    color: var(--accent-bright); text-transform: uppercase; margin-bottom: 14px; text-align: center;
  }
  .hp-funding-title {
    font-size: 28px; font-weight: 800; margin-bottom: 14px;
    text-align: center; letter-spacing: -0.4px; max-width: 560px;
  }
  .hp-funding-desc {
    font-size: 13.5px; color: var(--text-secondary); line-height: 1.7;
    text-align: center; max-width: 540px; margin-bottom: 40px;
  }

  .hp-funding-card {
    width: 100%; max-width: 760px;
    background: var(--glass-fill); backdrop-filter: blur(22px) saturate(150%);
    border: 1px solid var(--glass-border); border-radius: var(--radius-xl); box-shadow: var(--shadow-glass);
    padding: 36px 40px;
  }

  .fc-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .fc-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
  .fc-val { font-family: var(--font-mono); font-size: 20px; font-weight: 800; transition: color 0.2s; }
  .fc-slider {
    width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px;
    background: linear-gradient(90deg, var(--error) 0%, var(--text-muted) 50%, var(--success) 100%);
    outline: none; margin-bottom: 8px; cursor: pointer;
  }
  .fc-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 0 4px rgba(61,135,192,0.35), 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
  }
  .fc-marks { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 32px; }

  .fc-diagram { display: grid; grid-template-columns: 1fr 56px 1fr; align-items: center; margin-bottom: 28px; }
  .fc-side {
    padding: 20px 18px; border-radius: var(--radius-md); border: 1px solid; transition: all 0.25s ease;
    display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden;
  }
  .fc-side::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; transition: background 0.25s ease; }
  .fc-side-badge { font-family: var(--font-mono); font-size: 10px; font-weight: 800; letter-spacing: 2px; padding: 4px 10px; border-radius: 20px; align-self: flex-start; }
  .fc-side-ex { font-size: 14px; font-weight: 700; }
  .fc-side-market { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
  .fc-side-note { font-size: 10.5px; color: var(--text-secondary); line-height: 1.5; margin-top: 2px; }

  .fc-side.mode-short { border-color: rgba(224,62,62,0.35); background: rgba(224,62,62,0.06); }
  .fc-side.mode-short::before { background: var(--error); box-shadow: 0 0 10px var(--error); }
  .fc-side.mode-short .fc-side-badge { background: rgba(224,62,62,0.18); color: var(--error); border: 1px solid rgba(224,62,62,0.4); }

  .fc-side.mode-long { border-color: rgba(0,201,122,0.35); background: rgba(0,201,122,0.06); }
  .fc-side.mode-long::before { background: var(--success); box-shadow: 0 0 10px var(--success); }
  .fc-side.mode-long .fc-side-badge { background: rgba(0,201,122,0.18); color: var(--success); border: 1px solid rgba(0,201,122,0.4); }

  .fc-diagram-arrow { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-muted); }
  .fc-diagram-arrow span { font-family: var(--font-mono); font-size: 8px; letter-spacing: 1px; text-transform: uppercase; }

  .fc-result {
    display: flex; align-items: center; justify-content: space-between; padding: 18px 22px;
    border-radius: var(--radius-md); margin-bottom: 22px;
    background: linear-gradient(135deg, rgba(0,231,143,0.16), rgba(0,168,102,0.06));
    border: 1px solid rgba(0,201,122,0.3);
  }
  .fc-result-lbl { font-size: 12px; color: var(--text-secondary); }
  .fc-result-val { font-family: var(--font-mono); font-size: 24px; font-weight: 900; color: var(--success); }

  .fc-caption {
    font-size: 12px; color: var(--text-secondary); line-height: 1.7; text-align: center;
    padding-top: 18px; border-top: 1px solid var(--glass-border);
  }
  .fc-caption b { color: var(--text-primary); }

  /* ════ BLOCK 4: ACADEMY — «ВИТРИНА» ════ */
  .hp-academy {
    padding: 80px 48px;
    border-top: 1px solid var(--glass-border);
    position: relative;
  }
  .hp-sec-head { text-align: center; margin-bottom: 40px; }
  .hp-sec-eyebrow {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px;
    color: var(--accent-bright); text-transform: uppercase; margin-bottom: 14px;
    padding: 6px 13px; border-radius: 20px;
    background: rgba(61,135,192,0.08); border: 1px solid rgba(61,135,192,0.22);
  }
  .hp-sec-title { font-size: 34px; font-weight: 900; letter-spacing: -1px; margin-bottom: 12px; }
  .hp-sec-title span { color: var(--accent-bright); }
  .hp-sec-sub { font-size: 15px; color: var(--text-secondary); line-height: 1.7; max-width: 640px; margin: 0 auto; }

  .hp-ac-wrap {
    max-width: 1080px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start;
  }

  /* ─── Макет интерфейса Академии ─── */
  .hp-mock {
    background: rgba(8,18,28,0.72);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s;
  }
  .hp-mock:hover { transform: translateY(-4px); box-shadow: 0 28px 72px rgba(0,0,0,0.58); }

  .hp-mock-bar {
    display: flex; align-items: center; gap: 7px;
    padding: 11px 14px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid var(--glass-border);
  }
  .hp-mock-dot { width: 9px; height: 9px; border-radius: 50%; }
  .hp-mock-url { margin-left: 10px; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }

  .hp-mock-body { padding: 20px; }
  .hp-mock-hero {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px; border-radius: var(--radius-md); margin-bottom: 14px;
    background: var(--glass-fill); border: 1px solid var(--glass-border);
  }
  .hp-mock-rank {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    border: 2px solid var(--st);
    background: color-mix(in srgb, var(--st) 12%, transparent);
    color: var(--st);
    display: flex; align-items: center; justify-content: center;
    /* цвет ранга плавно переливается при переходе Новичок → … → Мастер */
    transition: border-color 0.6s ease, background 0.6s ease, color 0.6s ease, box-shadow 0.6s ease;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--st) 40%, transparent);
  }
  /* иконка ранга — пересоздаётся по key при смене статуса, анимация проигрывается заново */
  .hp-mock-rank-ic {
    display: flex;
    animation: hp-rank-pop 0.55s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes hp-rank-pop {
    0%   { opacity: 0; transform: scale(0.35) rotate(-25deg); }
    60%  { opacity: 1; transform: scale(1.15) rotate(4deg); }
    100% { opacity: 1; transform: scale(1) rotate(0); }
  }

  .hp-mock-rank-t {
    font-size: 14px; font-weight: 800; color: var(--st);
    transition: color 0.6s ease;
    /* название ранга тоже сменяется с анимацией (пересоздаётся по key) */
    animation: hp-rank-name 0.5s ease;
  }
  @keyframes hp-rank-name {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-mock-rank-ic, .hp-mock-rank-t { animation: none; }
  }

  .hp-mock-rank-s { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px; }
  .hp-mock-prog { flex: 1; }
  .hp-mock-track { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 7px; }
  .hp-mock-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-bright), var(--success));
    /* Ширина задаётся из JS (компонент AcademyMockup) — синхронно со счётчиком
       и галочками модулей. Переход короткий, чтобы движение было плавным,
       но не «догоняло» анимацию. */
    transition: width 40ms linear;
  }

  /* Счётчик уроков — бежит от 0 до 27 */
  .hp-mock-count {
    color: var(--success);
    font-weight: 700;
    font-variant-numeric: tabular-nums;   /* цифры не «прыгают» по ширине */
  }

  .hp-mock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .hp-mock-card {
    padding: 13px; border-radius: var(--radius-sm);
    background: var(--glass-fill); border: 1px solid var(--glass-border);
    transition: border-color 0.4s ease, background 0.4s ease, transform 0.4s ease;
  }
  .hp-mock:hover .hp-mock-card { border-color: rgba(93,163,214,0.32); }

  /* модуль «пройден» — загорается цветом своего модуля */
  .hp-mock-card.done {
    border-color: color-mix(in srgb, var(--mc) 42%, transparent);
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--mc) 8%, rgba(24,52,80,0.5)),
      rgba(10,22,35,0.4));
  }

  .hp-mock-card-top {
    height: 2px; border-radius: 2px; margin-bottom: 9px;
    background: var(--mc);
    opacity: 0.45;
    transition: opacity 0.4s ease, box-shadow 0.4s ease;
  }
  .hp-mock-card.done .hp-mock-card-top {
    opacity: 1;
    box-shadow: 0 0 8px color-mix(in srgb, var(--mc) 55%, transparent);
  }

  .hp-mock-card-ic {
    width: 26px; height: 26px; border-radius: 6px; margin-bottom: 8px;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--mc) 14%, transparent);
    color: var(--mc);
    transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), background 0.4s ease;
  }
  /* лёгкий «отклик» иконки в момент прохождения модуля */
  .hp-mock-card.done .hp-mock-card-ic {
    background: color-mix(in srgb, var(--mc) 24%, transparent);
    transform: scale(1.08);
  }

  .hp-mock-card-t { font-size: 11px; font-weight: 700; margin-bottom: 5px; line-height: 1.3; }
  .hp-mock-card-m {
    font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);
    display: flex; align-items: center; gap: 4px;
    transition: color 0.4s ease;
  }
  .hp-mock-card-m.done { color: var(--success); }

  /* галочка «пройдено» — плавно появляется */
  .hp-mock-check {
    display: inline-flex; align-items: center;
    opacity: 0; transform: scale(0.5);
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(.34,1.56,.64,1);
  }
  .hp-mock-card-m.done .hp-mock-check { opacity: 1; transform: scale(1); }

  .hp-mock-cap {
    text-align: center; padding: 12px;
    font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
    border-top: 1px solid var(--glass-border);
  }

  /* ─── Боковая колонка: чему учит + формат ─── */
  .hp-ac-side { display: flex; flex-direction: column; gap: 12px; }
  .hp-ac-block {
    padding: 20px 22px; border-radius: var(--radius-lg);
    background: var(--glass-fill); backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); box-shadow: var(--shadow-glass);
  }
  .hp-ac-block-t {
    display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 800; margin-bottom: 13px;
  }
  .hp-ac-block-t svg { color: var(--accent-bright); }

  .hp-ac-list { display: flex; flex-direction: column; gap: 9px; }
  .hp-ac-li {
    display: flex; align-items: flex-start; gap: 9px;
    font-size: 12.5px; color: var(--text-secondary); line-height: 1.55;
  }
  .hp-ac-li-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent-bright); flex-shrink: 0; margin-top: 6px;
  }

  .hp-ac-fmts { display: flex; flex-wrap: wrap; gap: 7px; }
  .hp-ac-fmt {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 12px; border-radius: 20px; font-size: 11.5px;
    background: rgba(255,255,255,0.02);
    border: 1px solid color-mix(in srgb, var(--fc) 22%, transparent);
    color: var(--text-secondary); transition: all 0.16s;
  }
  .hp-ac-fmt:hover {
    border-color: color-mix(in srgb, var(--fc) 55%, transparent);
    background: color-mix(in srgb, var(--fc) 9%, transparent);
    color: var(--text-primary);
    transform: translateY(-2px);
  }
  /* у каждого формата свой цвет иконки — задаётся через --fc на элементе */
  .hp-ac-fmt svg { color: var(--fc); flex-shrink: 0; }

  /* Общая кнопка-ссылка для секций */
  .hp-sec-btn {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 14px 30px; border-radius: var(--radius-md);
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 1px;
    cursor: pointer;
    transition: border-color 0.25s, color 0.25s, background 0.25s, transform 0.25s;
  }
  .hp-sec-btn:hover {
    border-color: var(--glass-border-hover); color: var(--text-primary);
    background: rgba(93,163,214,0.08); transform: translateY(-2px);
  }
  .hp-sec-btn.primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-bright));
    color: #fff; border-color: rgba(255,255,255,0.14);
    box-shadow: 0 4px 20px rgba(47,105,151,0.35);
  }
  .hp-sec-btn.primary:hover { background: linear-gradient(135deg, var(--accent-bright), var(--accent)); }

  /* Блок с кнопкой под секцией.
     Плавно следует за изменением высоты карточек команды — раньше он
     перескакивал рывком, потому что высота менялась скачком (display:none). */
  .hp-ac-cta {
    text-align: center;
    margin-top: 34px;
    transition: margin-top 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  }


  /* ════ BLOCK 5: TEAM — РАЗДВИГАЮЩИЕСЯ КАРТОЧКИ ════ */
  .hp-team {
    padding: 80px 48px;
    border-top: 1px solid var(--glass-border);
    position: relative;
  }

  /* ─── Механика раздвигания (БЕЗ сжатия соседей) ───
     
     Раньше использовался CSS Grid — и это была ошибка: в гриде расширение одной
     колонки автоматически СЖИМАЕТ остальные (они делят общую ширину).
     
     Теперь flex + ФИКСИРОВАННЫЕ ширины карточек:
       - обычная карточка: 260px (не меняется никогда)
       - активная:         460px
       - прирост (--grow): 200px
     
     Соседи сохраняют свои 260px и просто отъезжают в сторону.
     
     Куда именно отъезжают — задаётся сдвигом всего ряда (translateX):
       наведение на 1-ю (hov-0): ряд едет вправо на +grow/2
                                 → карточка 1 остаётся на месте, растёт вправо,
                                   соседей толкает вправо
       наведение на 2-ю (hov-1): ряд не двигается
                                 → растёт равномерно, толкая соседей в обе стороны
       наведение на 3-ю (hov-2): ряд едет влево на -grow/2
                                 → карточка 3 остаётся на месте, растёт влево,
                                   соседей толкает влево
  */
  .hp-team-row-outer {
    /* Внешний контейнер держит ширину, чтобы сдвиг ряда не «прыгал» по странице.
       Ширина рассчитана так, чтобы вместить раскрытый ряд ВМЕСТЕ со сдвигом:
       ряд при раскрытии = 280 + 280 + 520 + gaps(36) = 1116px
       максимальный сдвиг = grow/2 = 120px
       нужно минимум 1116 + 240 = 1356px → берём 1400px с запасом. */
    max-width: 1400px;
    margin: 0 auto;
    overflow: visible;
  }
  .hp-team-grid {
    --grow: 240px;
    display: flex;
    justify-content: center;
    /* ВАЖНО: flex-start, а НЕ stretch.
       При stretch (значение флекса по умолчанию) все карточки растягиваются
       по высоте самой высокой — поэтому при раскрытии одной соседние
       вытягивались вверх-вниз. С flex-start каждая карточка сохраняет
       свою естественную высоту и не меняется вообще. */
    align-items: flex-start;
    gap: 18px;
    /* мягкая, неторопливая кривая — движение не «выстреливает» */
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  }
  /* Сдвиг ряда задаёт направление раздвигания:
       1-я карточка → ряд едет вправо  (растёт вправо, соседей толкает вправо)
       2-я карточка → ряд не двигается (растёт равномерно в обе стороны)
       3-я карточка → ряд едет влево   (растёт влево, соседей толкает влево) */
  .hp-team-grid.hov-0 { transform: translateX(calc(var(--grow) / 2)); }
  .hp-team-grid.hov-1 { transform: translateX(0); }
  .hp-team-grid.hov-2 { transform: translateX(calc(var(--grow) / -2)); }

  /* На экранах, где сдвига не хватает места, отключаем его — карточка растёт
     симметрично от центра. Иначе ряд вылез бы за край и появился бы
     горизонтальный скролл. */
  @media (max-width: 1560px) {
    .hp-team-grid.hov-0,
    .hp-team-grid.hov-2 { transform: translateX(0); }
  }

  .hp-tm-card {
    /* ФИКСИРОВАННАЯ ширина — соседи её не меняют при наведении на другую карточку */
    flex: 0 0 auto;
    width: 280px;
    background: var(--glass-fill);
    backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
    padding: 28px 24px;
    overflow: hidden;
    cursor: default;
    /* Единая мягкая кривая для всех свойств — движение читается как одно
       целостное, а не как набор разнонаправленных рывков. */
    transition:
      width 0.55s cubic-bezier(0.4, 0, 0.2, 1),
      padding 0.55s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.45s ease,
      background 0.45s ease,
      box-shadow 0.45s ease,
      opacity 0.4s ease;
  }
  .hp-tm-card.active {
    width: calc(280px + var(--grow));   /* 520px */
    padding: 30px 30px;
    border-color: var(--glass-border-hover);
    background: var(--glass-fill-hover);
    box-shadow: 0 18px 48px rgba(0,0,0,0.5);
  }
  /* приглушаем соседей, чтобы фокус был на раскрытой */
  .hp-team-grid.has-hover .hp-tm-card:not(.active) { opacity: 0.5; }

  /* ─── Поочерёдное появление карточек при скролле ───
     Сделано через animation (а не transition), чтобы задержка появления
     НЕ влияла на transition-переходы hover-раскрытия — они независимы. */
  .hp-tm-card.tm-hidden { opacity: 0; }
  .hp-tm-card.tm-enter {
    animation: hp-tm-enter 0.75s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  }
  @keyframes hp-tm-enter {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hp-tm-card.tm-hidden { opacity: 1; }
    .hp-tm-card.tm-enter { animation: none; }
  }

  /* ─── Плавное переключение компактного и раскрытого состояния ───
  
     ПРОБЛЕМА, которую это решает: раньше было display:none → display:block.
     display НЕВОЗМОЖНО анимировать — поэтому высота карточки менялась скачком,
     и кнопка «Подробнее о проекте» под ней резко перепрыгивала.
     
     РЕШЕНИЕ: оба состояния всегда в DOM, а их высота анимируется через
     grid-template-rows (0fr → 1fr) — единственный способ плавно анимировать
     высоту контента неизвестного размера. Плюс контент плавно проявляется
     по opacity со сдвигом.
  */
  .hp-tm-state {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hp-tm-state-inner {
    overflow: hidden;
    min-height: 0;              /* обязательно, иначе grid не сожмётся */
    transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* компактное состояние: свёрнуто, когда карточка активна */
  .hp-tm-card.active .hp-tm-state.compact { grid-template-rows: 0fr; }
  .hp-tm-card.active .hp-tm-state.compact .hp-tm-state-inner {
    opacity: 0;
    transform: translateY(-8px);
  }

  /* раскрытое состояние: свёрнуто, пока карточка не активна */
  .hp-tm-state.full { grid-template-rows: 0fr; }
  .hp-tm-state.full .hp-tm-state-inner {
    opacity: 0;
    transform: translateY(10px);
    /* пока свёрнуто — не проявляем сразу, ждём начала раскрытия */
    transition-delay: 0s;
  }
  .hp-tm-card.active .hp-tm-state.full { grid-template-rows: 1fr; }
  .hp-tm-card.active .hp-tm-state.full .hp-tm-state-inner {
    opacity: 1;
    transform: translateY(0);
    /* контент проявляется чуть позже, чем начала расти карточка —
       так переход читается плавнее, а не «выстреливает» */
    transition-delay: 0.12s;
  }

  .hp-tm-compact {
    display: flex; flex-direction: column; align-items: center; text-align: center;
  }

  .hp-tm-av {
    width: 76px; height: 76px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 800; color: #0a1622;
    box-shadow: 0 6px 20px rgba(0,0,0,0.38);
    overflow: hidden; flex-shrink: 0;
    margin-bottom: 15px;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hp-tm-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .hp-tm-name { font-size: 18px; font-weight: 800; margin-bottom: 5px; }
  .hp-tm-role { font-family: var(--font-mono); font-size: 11px; color: var(--accent-bright); letter-spacing: 0.5px; }
  .hp-tm-more {
    margin-top: 12px;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 1px;
    color: var(--text-muted);
    transition: color 0.3s ease;
  }
  .hp-tm-card:hover .hp-tm-more { color: var(--accent-bright); }

  /* ─── Раскрытое содержимое ─── */
  .hp-tm-full-head { display: flex; align-items: center; gap: 15px; margin-bottom: 16px; }
  .hp-tm-full-av {
    width: 62px; height: 62px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 23px; font-weight: 800; color: #0a1622;
    box-shadow: 0 6px 18px rgba(0,0,0,0.38); overflow: hidden;
  }
  .hp-tm-full-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .hp-tm-full-name { font-size: 20px; font-weight: 800; }
  .hp-tm-full-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
  .hp-tm-full-role { font-family: var(--font-mono); font-size: 10px; color: var(--accent-bright); letter-spacing: 0.5px; }
  .hp-tm-age {
    font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);
    padding: 2px 8px; border-radius: 10px; border: 1px solid var(--glass-border);
  }

  .hp-tm-about {
    font-size: 13px; color: var(--text-secondary); line-height: 1.7;
    margin-bottom: 16px;
    min-height: 88px;     /* резервируем место, чтобы блок не «рос» при печати */
  }

  /* ─── Печатающийся текст ─── */
  .hp-typewriter { display: inline; }
  .hp-type-caret {
    display: inline-block;
    width: 2px; height: 1em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: var(--accent-bright);
    animation: hp-caret-blink 0.7s step-end infinite;
  }
  @keyframes hp-caret-blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }

  /* ─── Элементы карточки подтягиваются по очереди ─── */
  .hp-tm-focus { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .hp-tm-focus-chip {
    font-size: 11px; padding: 5px 11px; border-radius: 20px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-secondary); white-space: nowrap;
    /* появляются после того, как текст напечатался (задержка задаётся инлайн) */
    opacity: 0; transform: translateY(8px);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hp-tm-card.active .hp-tm-focus-chip { opacity: 1; transform: translateY(0); }

  .hp-tm-socials {
    display: flex; gap: 8px; flex-wrap: wrap;
    padding-top: 14px; border-top: 1px solid var(--glass-border);
    /* появляются последними */
    opacity: 0; transform: translateY(8px);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hp-tm-card.active .hp-tm-socials { opacity: 1; transform: translateY(0); }

  .hp-tm-social {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-secondary); font-size: 12px; text-decoration: none;
    transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
  }
  .hp-tm-social:hover {
    border-color: var(--glass-border-hover);
    color: var(--accent-bright);
    background: rgba(93,163,214,0.08);
    transform: translateY(-2px);
  }

  /* на узких экранах раздвигание отключаем — карточки становятся столбиком.
     Порог поднят с 900px до 1024px (Партия 1, MOBILE_PLAN.md): начиная
     с этой ширины навигация тоже переходит в мобильный режим (Sidebar.jsx),
     где :hover недоступен — карточки команды должны стать столбиком
     синхронно с переходом на мобильную навигацию, иначе на 901–1024px
     раскрытая по тапу карточка (см. onClick ниже) заезжала бы за пределы
     ряда. */
  @media (max-width: 1024px) {
    .hp-team-grid,
    .hp-team-grid.hov-0,
    .hp-team-grid.hov-1,
    .hp-team-grid.hov-2 {
      flex-direction: column;
      align-items: center;
      transform: none;
    }
    .hp-tm-card,
    .hp-tm-card.active { width: 100%; max-width: 420px; }
    .hp-team-grid.has-hover .hp-tm-card:not(.active) { opacity: 1; }
  }


  /* ════ BLOCK 6: FAQ ════ */
  .hp-faq {
    padding: 80px 48px 96px;
    border-top: 1px solid var(--glass-border);
    position: relative;
  }
  .hp-faq-list { max-width: 780px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }

  .hp-faq-item {
    background: var(--glass-fill); backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass); overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }
  .hp-faq-item.open { border-color: var(--glass-border-hover); background: var(--glass-fill-hover); }

  .hp-faq-q {
    display: flex; align-items: center; gap: 14px;
    width: 100%; padding: 20px 24px;
    background: none; border: none; cursor: pointer; text-align: left;
    font-family: var(--font-sans); font-size: 15.5px; font-weight: 700;
    color: var(--text-primary); transition: color 0.15s;
  }
  .hp-faq-q:hover { color: var(--accent-bright); }
  .hp-faq-chevron {
    margin-left: auto; flex-shrink: 0; color: var(--text-muted);
    transition: transform 0.25s cubic-bezier(.22,1,.36,1), color 0.15s;
  }
  .hp-faq-item.open .hp-faq-chevron { transform: rotate(180deg); color: var(--accent-bright); }

  /* Плавное раскрытие: grid-template-rows анимируется, в отличие от height:auto */
  .hp-faq-a-wrap {
    display: grid; grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(.22,1,.36,1);
  }
  .hp-faq-item.open .hp-faq-a-wrap { grid-template-rows: 1fr; }
  .hp-faq-a-inner { overflow: hidden; }
  .hp-faq-a {
    padding: 0 24px 22px 24px;
    font-size: 14px; color: var(--text-secondary); line-height: 1.8;
  }
  .hp-faq-a p { margin-bottom: 10px; }
  .hp-faq-a p:last-child { margin-bottom: 0; }

  /* Адаптив витрины Академии: на узких экранах колонки в столбик.
     (Правила для .hp-team-grid здесь НЕ нужны — у команды свой медиа-запрос
      выше, под flex-механику. Раньше тут был осколок от grid-версии.)
     Порог поднят с 900px до 1024px — см. комментарий у .hp-team-grid выше. */
  @media (max-width: 1024px) {
    .hp-ac-wrap { grid-template-columns: 1fr; }
    .hp-mock { order: 2; }
    .hp-ac-side { order: 1; }
  }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 1, MOBILE_PLAN.md п.2.3)
     ══════════════════════════════════════════════════════════════
     Правила ниже — чистое дополнение: ни одно существующее правило
     выше не изменено (кроме двух порогов 900px→1024px рядом, отмеченных
     отдельно). На десктопе (>1024px) страница выглядит и ведёт себя
     ровно как раньше.

     Брейкпоинты — по системе из MOBILE_PLAN.md (Часть 0.1):
       ≤1024px — общий порог мобильного режима (тот же, что у Sidebar.jsx)
       ≤768px  — телефоны и планшеты-портрет
       ≤480px  — обычные телефоны, более плотная упаковка
  */
  @media (max-width: 1024px) {
    /* ── HERO ── */
    .hp-hero {
      min-height: 100dvh;
      padding: 64px 24px 48px;
    }
    .hp-h1 { font-size: 44px; letter-spacing: -1.2px; }
    .hp-sub { font-size: 15.5px; }
    .hp-actions {
      flex-direction: column;
      width: 100%;
      max-width: 360px;
      gap: 12px;
    }
    .hp-btn-primary,
    .hp-btn-secondary {
      width: 100%;
      justify-content: center;
      text-align: center;
    }
    .hp-ex-logos { flex-wrap: wrap; }

    /* ── HOW IT WORKS: колонки в столбик, панель-визуализация под таймлайном ── */
    .hp-howto {
      grid-template-columns: 1fr;
      min-height: 0;
    }
    .hp-timeline-col { padding: 48px 24px 24px; }
    .hp-panel-col { margin: 0 24px 56px; }
    .hp-howto-title { font-size: 22px; }

    /* ── FUNDING TUTORIAL ── */
    .hp-funding { padding: 56px 24px 64px; }
    .hp-funding-card { padding: 26px 22px; }
    .hp-funding-title { font-size: 22px; }

    /* ── ACADEMY / TEAM / FAQ: общая шапка секции ── */
    .hp-academy,
    .hp-team,
    .hp-faq { padding: 56px 24px 64px; }
    .hp-sec-title { font-size: 26px; }
    .hp-sec-sub { font-size: 13.5px; }

    /* ── FAQ: сохраняем крупный тач-таргет вопроса ── */
    .hp-faq-q { padding: 18px 20px; }
    .hp-faq-a { padding: 0 20px 20px 20px; }
  }

  /* ── Более тесные экраны: обычные телефоны ── */
  @media (max-width: 480px) {
    .hp-hero { padding: 56px 18px 40px; }
    .hp-h1 { font-size: 34px; }
    .hp-sub { font-size: 14.5px; margin-bottom: 32px; }
    .hp-ex-logos { gap: 8px; }
    .hp-favicon-wrap { width: 36px; height: 36px; }

    .hp-timeline-col { padding: 40px 18px 20px; }
    .hp-panel-col { margin: 0 18px 48px; }

    .hp-funding { padding: 48px 18px 56px; }
    .hp-funding-card { padding: 22px 16px; }

    /* Диаграмма фандинга: две стороны + стрелка в ряд не помещаются —
       складываем в столбик, стрелку разворачиваем вниз. */
    .fc-diagram {
      grid-template-columns: 1fr;
      row-gap: 12px;
    }
    .fc-diagram-arrow { flex-direction: row; }
    .fc-diagram-arrow svg { transform: rotate(90deg); }

    .hp-academy,
    .hp-team,
    .hp-faq { padding: 48px 18px 56px; }
    .hp-sec-title { font-size: 22px; }

    /* Витрина Академии: 3 колонки мини-карточек модулей тесно на узком экране */
    .hp-mock-grid { grid-template-columns: repeat(2, 1fr); }

    .hp-faq-q { padding: 16px 18px; font-size: 14.5px; }
    .hp-faq-a { padding: 0 18px 18px 18px; }
  }
`

const EXCHANGES_LIST = [
  { domain: 'binance.com', fallback: 'BN', color: '#F3BA2F', title: 'Binance', url: 'https://www.binance.com' },
  { domain: 'bybit.com',   fallback: 'BB', color: '#F7A600', title: 'Bybit',   url: 'https://www.bybit.com' },
  { domain: 'okx.com',     fallback: 'OK', color: '#dddddd', title: 'OKX',     url: 'https://www.okx.com' },
  { domain: 'gate.io',     fallback: 'GT', color: '#2354E6', title: 'Gate',    url: 'https://www.gate.io' },
  { domain: 'kucoin.com',  fallback: 'KC', color: '#00A550', title: 'KuCoin',  url: 'https://www.kucoin.com' },
  { domain: 'mexc.com',    fallback: 'MX', color: '#00B897', title: 'MEXC',    url: 'https://www.mexc.com' },
  { domain: 'bitget.com',  fallback: 'BG', color: '#00F0FF', title: 'Bitget',  url: 'https://www.bitget.com' },
  { domain: 'bingx.com',   fallback: 'BX', color: '#1DA2B4', title: 'BingX',   url: 'https://www.bingx.com' },
]

const STEPS = [
  {
    title: 'Сканер находит сигнал',
    desc: 'Система мгновенно получает свежие арбитражные возможности со всех 8 бирж и показывает только лучшие — отсортированные по размеру спреда.',
    tags: [{ label: 'LIVE DATA', cls: 'blue' }, { label: '8 БИРЖ', cls: 'blue' }],
  },
  {
    title: 'Настраиваешь фильтры',
    desc: 'Выбираешь нужные биржи, минимальный спред и стратегию. Все настройки запоминаются — при следующем входе всё уже готово.',
    tags: [{ label: 'БИРЖИ', cls: 'blue' }, { label: 'СТРАТЕГИИ', cls: 'blue' }],
  },
  {
    title: 'Открываешь позиции',
    desc: 'В детальной карточке видишь спред, цены и объём. Открываешь LONG на дешёвой бирже и SHORT на дорогой — одновременно.',
    tags: [{ label: 'LONG', cls: 'green' }, { label: 'SHORT', cls: 'red' }],
  },
  {
    title: 'Фиксируешь прибыль',
    desc: 'Цены сходятся, спред падает к нулю — момент выхода. Закрываешь обе позиции и забираешь разницу.',
    tags: [{ label: 'PROFIT', cls: 'green' }, { label: 'P&L TRACKER', cls: 'green' }],
  },
]

// ─── Favicon с fallback ───────────────────────────────────────────────────────
function ExFavicon({ domain, fallback, color, url, size = 22, wrapSize = 42 }) {
  const [err, setErr] = useState(false)
  const handleClick = () => { if (url) window.open(url, '_blank') }
  return (
    <div
      className="hp-favicon-wrap"
      style={{ width: wrapSize, height: wrapSize }}
      onClick={handleClick}
      title={fallback}
    >
      {err ? (
        <span className="hp-favicon-fallback" style={{ color, fontSize: 8 }}>{fallback}</span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          width={size} height={size}
          alt={fallback}
          onError={() => setErr(true)}
        />
      )}
    </div>
  )
}

function InlineFavicon({ domain, fallback, color, size = 14 }) {
  const [err, setErr] = useState(false)
  if (err) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 800, color }}>{fallback}</span>
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      width={size} height={size}
      alt={fallback}
      onError={() => setErr(true)}
      style={{ borderRadius: 2, display: 'block' }}
    />
  )
}

// ─── SVG-график схождения спреда ──────────────────────────────────────────────
function SpreadConvergenceChart() {
  // Генерируем историю: спред начинается ~3.4%, затем плавно сходится к 0%
  const points = useMemo(() => {
    const N = 60
    const result = []
    let spread = 3.42
    for (let i = 0; i < N; i++) {
      // Экспоненциальное схождение с небольшим шумом
      const progress = i / (N - 1)
      const target = 3.42 * Math.pow(1 - progress, 1.6)
      const noise = (Math.random() - 0.5) * 0.12 * (1 - progress * 0.7)
      spread = Math.max(0, target + noise)
      result.push(spread)
    }
    // Последние несколько точек явно к нулю
    result[N - 3] = 0.18
    result[N - 2] = 0.06
    result[N - 1] = 0.0
    return result
  }, [])

  const W = 460, H = 160
  const PL = 8, PR = 52, PT = 12, PB = 22
  const cW = W - PL - PR
  const cH = H - PT - PB

  const YMAX = Math.max(...points, 0.5) * 1.1
  const YMIN = -0.05

  const ty = v => PT + (1 - (v - YMIN) / (YMAX - YMIN)) * cH
  const tx = i => PL + (i / (points.length - 1)) * cW

  // Smooth bezier path
  const pts = points.map((v, i) => [tx(i), ty(v)])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }

  // Fill под кривой (до нуля)
  const zeroY = ty(0)
  const fillPath = `${d} L ${pts[pts.length-1][0]},${zeroY} L ${PL},${zeroY} Z`

  // Y axis grid values
  const gridVals = [0, 1, 2, 3]
  const axX = W - PR

  // Точки входа и выхода
  const entryX = tx(0)
  const entryY = ty(points[0])
  const exitX = tx(points.length - 1)
  const exitY = ty(0)

  // Зона прибыли (заливка между entry-spread и exit-spread)
  // Середина: зона захваченной прибыли
  const midIdx = Math.floor(points.length * 0.55)
  const midX = tx(midIdx)
  const midY = ty(points[midIdx])

  return (
    <div className="hp-chart-wrap">
      <div className="hp-chart-header">
        <div className="hp-chart-title">Спред — история сделки</div>
      </div>

      <svg
        className="hp-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="hp-g-spread" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c97a" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#00c97a" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="hp-g-profit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3d87c0" stopOpacity="0" />
            <stop offset="50%" stopColor="#3d87c0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00c97a" stopOpacity="0.08" />
          </linearGradient>
          <filter id="hp-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + Y axis */}
        <line x1={axX} y1={PT} x2={axX} y2={H - PB} stroke="#0e2a42" strokeWidth="1" />
        {gridVals.map(v => {
          const y = ty(v)
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={axX} y2={y} stroke="#0d1e30" strokeWidth="1" />
              <line x1={axX} y1={y} x2={axX + 4} y2={y} stroke="#1a3a52" strokeWidth="1" />
              <text x={axX + 7} y={y + 3.5} fontSize="8" fill="#3d506a" fontFamily="monospace">
                {v.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {/* Entry spread value on Y axis */}
        <line
        x1={PL} y1={ty(3.42)} x2={axX} y2={ty(3.42)}
        stroke="#3d87c0" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"
        />
        <rect x={axX + 4} y={ty(3.42) - 7} width={44} height={13} fill="#0a1828" stroke="rgba(61,135,192,0.4)" strokeWidth="1" rx="1" />
        <text x={axX + 26} y={ty(3.42) + 3.5} fontSize="8" fill="#3d87c0" fontFamily="monospace" fontWeight="bold" textAnchor="middle">+3.42%</text>

        {/* Zero line highlighted */}
        <line
          x1={PL} y1={zeroY} x2={axX} y2={zeroY}
          stroke="rgba(0,201,122,0.25)" strokeWidth="1.5" strokeDasharray="4,3"
        />
        <text x={axX + 7} y={zeroY + 3.5} fontSize="8" fill="#00c97a" fontFamily="monospace" fontWeight="bold">
          0.0%
        </text>

        {/* Fill */}
        <path d={fillPath} fill="url(#hp-g-spread)" />

        {/* Profit zone background */}
        <rect
          x={PL} y={PT} width={cW} height={cH}
          fill="url(#hp-g-profit)" opacity="0.6"
        />

        {/* Glow line */}
        <path d={d} fill="none" stroke="#00c97a" strokeWidth="3" opacity="0.18" filter="url(#hp-glow)" />

        {/* Main spread line */}
        <path d={d} fill="none" stroke="#00c97a" strokeWidth="2" />

        {/* Entry marker */}
        <line x1={entryX} y1={PT} x2={entryX} y2={H - PB} stroke="#3d87c0" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
        <circle cx={entryX} cy={entryY} r="4" fill="#3d87c0" stroke="#060c18" strokeWidth="2" />
        <rect x={entryX - 1} y={PT - 2} width={44} height={13} fill="#0a1a25" stroke="#1a3a52" strokeWidth="1" rx="1" />
        <text x={entryX + 2} y={PT + 7} fontSize="8" fill="#3d87c0" fontFamily="monospace" fontWeight="bold">ВХОД</text>

        {/* Time labels */}
        {[
          { label: '−45 мин', idx: 0 },
          { label: '−30 мин', idx: Math.floor(points.length * 0.33) },
          { label: '−15 мин', idx: Math.floor(points.length * 0.66) },
          { label: 'СЕЙЧАС', idx: points.length - 1 },
        ].map(({ label, idx }) => (
          <text
            key={label}
            x={tx(idx)}
            y={H - PB + 14}
            fontSize="7.5"
            fill={idx === points.length - 1 ? '#00c97a' : '#3d506a'}
            fontFamily="monospace"
            textAnchor="middle"
            fontWeight={idx === points.length - 1 ? 'bold' : 'normal'}
          >
            {label}
          </text>
        ))}

        {/* Exit pulsing dot */}
        <circle cx={exitX} cy={exitY} r="5" fill="#00c97a" stroke="#060c18" strokeWidth="2" />
        <circle cx={exitX} cy={exitY} r="5" fill="none" stroke="#00c97a" strokeWidth="1.5">
          <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Exit label badge */}
        <rect x={exitX - 55} y={exitY - 16} width={52} height={14} fill="#0a2a18" stroke="rgba(0,201,122,0.4)" strokeWidth="1" rx="1" />
        <text x={exitX - 29} y={exitY - 6} fontSize="8" fill="#00c97a" fontFamily="monospace" fontWeight="bold" textAnchor="middle">ВЫХОД</text>

      </svg>

      <div className="hp-chart-legend">
        <div className="hp-legend-item">
          <div className="hp-legend-line" style={{ background: '#00c97a' }} />
          Спред сделки
        </div>
        <div className="hp-legend-item">
          <div className="hp-legend-dash" style={{ borderColor: 'rgba(0,201,122,0.4)' }} />
          Спред = 0%
        </div>
        <div className="hp-legend-item">
          <div className="hp-legend-line" style={{ background: '#3d87c0' }} />
          Точка входа
        </div>
      </div>

      <div className="hp-chart-result">
        <div className="hp-chart-result-lbl">Спред схлопнулся → прибыль зафиксирована</div>
        <div className="hp-chart-result-val">+$3.42 ✓</div>
      </div>
    </div>
  )
}

// Хук появления БЕЗ обёртки — вешает классы прямо на существующий элемент.
//
// Нужен там, где лишний <div> ломает раскладку. Например, .hp-howto — это
// grid из двух колонок, и панель визуализации должна быть ПРЯМЫМ grid-элементом.
// Если обернуть её в <Reveal>, grid-элементом станет обёртка, а панель внутри
// потеряет растяжение и схлопнется по высоте.
function useReveal({ threshold = 0, rootMargin = '0px 0px -25% 0px' } = {}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect() } },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, rootMargin])

  return [ref, shown]
}

// Обёртка появления блока при попадании во вьюпорт
function Reveal({ children, variant = '', delay = 0, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect() } },
      {
        // ВАЖНО: используем threshold 0 + rootMargin, а НЕ threshold 0.3.
        // Причина: threshold — это доля ВИДИМОЙ части элемента. Если блок выше
        // экрана (а блоки «Как это работает» и «Академия» именно такие), то
        // видимая доля физически не может достичь 30% — и анимация не сработает
        // никогда. rootMargin от высоты элемента не зависит.
        //
        // '-25%' снизу означает: нижняя четверть экрана «не считается».
        // Блок начнёт появляться, только когда войдёт в верхние 75% экрана —
        // то есть будет уже хорошо виден.
        threshold: 0,
        rootMargin: '0px 0px -25% 0px',
      }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const base = variant === 'x' ? 'hp-reveal-x' : variant === 'scale' ? 'hp-reveal-scale' : 'hp-reveal'

  return (
    <div
      ref={ref}
      className={`${base} ${shown ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ─── FAQ-аккордеон ──────────────────────────────────────────────────────────
// Раскрытие через grid-template-rows (0fr → 1fr) — единственный способ плавно
// анимировать высоту неизвестного контента без JS-замеров.
function FaqItem({ item, isOpen, onToggle }) {
  // Ответ может быть строкой или массивом абзацев
  const paragraphs = Array.isArray(item.a) ? item.a : [item.a]

  return (
    <div className={`hp-faq-item ${isOpen ? 'open' : ''}`}>
      <button className="hp-faq-q" onClick={onToggle} aria-expanded={isOpen}>
        {item.q}
        <ChevronDown size={18} className="hp-faq-chevron" />
      </button>
      <div className="hp-faq-a-wrap">
        <div className="hp-faq-a-inner">
          <div className="hp-faq-a">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Витрина Академии: живая демо-анимация ──────────────────────────────────
// Прогресс проходит от нуля до конца за ~3 секунды и начинается заново.
// Синхронно анимируются: счётчик уроков (1 → 27), полоса прогресса и галочки
// «пройдено» на карточках модулей — они загораются одна за другой.
//
// Вынесено в ОТДЕЛЬНЫЙ компонент намеренно: анимация тикает ~30 раз в секунду,
// и если бы состояние жило в HomePage, перерисовывалась бы вся страница целиком
// (включая графики и симулятор фандинга). Здесь перерисовывается только макет.
const DEMO_CYCLE_MS = 3000
const DEMO_HOLD_MS = 600        // пауза с заполненной полосой перед перезапуском
const DEMO_TICK_MS = 33         // ~30 кадров в секунду

// Иконка ранга по id статуса (те же, что в модалке профиля)
const TIER_ICON = {
  novice: Sprout,
  trader: TrendingUp,
  expert: Trophy,
  master: Crown,
}

function AcademyMockup({ modules, totalLessons, onOpen }) {
  const [t, setT] = useState(0)   // 0..1 — позиция в цикле анимации

  useEffect(() => {
    // Уважаем системную настройку «меньше движения» — показываем сразу заполненным
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) { setT(1); return }

    const started = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - started) % (DEMO_CYCLE_MS + DEMO_HOLD_MS)
      // после DEMO_CYCLE_MS держим на единице (пауза), потом цикл начинается заново
      setT(Math.min(1, elapsed / DEMO_CYCLE_MS))
    }, DEMO_TICK_MS)

    return () => clearInterval(id)
  }, [])

  // Сглаживаем движение — в начале и конце помедленнее (ease-in-out)
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

  // Сколько уроков «пройдено» на текущем кадре
  const lessonsShown = Math.round(eased * totalLessons)

  // Накопительная сумма уроков по модулям — чтобы понять, какие уже «пройдены»
  const cumulative = useMemo(() => {
    let sum = 0
    return modules.map(m => (sum += m.lessons.length))
  }, [modules])

  // Сколько модулей завершено на текущем кадре
  const modulesDone = cumulative.filter(c => lessonsShown >= c).length

  // СТАТУС вычисляется от числа пройденных модулей и меняется прямо по ходу
  // демо: Новичок → Трейдер (1 модуль) → Эксперт (3) → Мастер (5).
  // Переиспользуем ту же функцию, что и реальный прогресс пользователя —
  // пороги статусов заданы в одном месте (useTrainingProgress).
  const { current: status } = resolveStatus(modulesDone)
  const TierIcon = TIER_ICON[status.id] ?? Trophy

  return (
    <div className="hp-mock" style={{ '--st': status.color }} onClick={onOpen}>
      <div className="hp-mock-bar">
        <div className="hp-mock-dot" style={{ background: 'var(--error)' }} />
        <div className="hp-mock-dot" style={{ background: 'var(--warning)' }} />
        <div className="hp-mock-dot" style={{ background: 'var(--success)' }} />
        <div className="hp-mock-url">axioma-scan.ru / academy</div>
      </div>

      <div className="hp-mock-body">
        {/* Шапка со статусом и анимированным счётчиком */}
        <div className="hp-mock-hero">
          <div className="hp-mock-rank">
            {/* key по id статуса: при смене ранга React пересоздаёт иконку,
                и CSS-анимация появления проигрывается заново */}
            <span key={status.id} className="hp-mock-rank-ic">
              <TierIcon size={20} />
            </span>
          </div>
          <div className="hp-mock-prog">
            {/* тот же приём с key — название ранга сменяется с анимацией */}
            <div key={status.id} className="hp-mock-rank-t">{status.label}</div>
            <div className="hp-mock-rank-s">
              {/* счётчик бежит от 0 до 27 вместе с полосой */}
              <span className="hp-mock-count">{lessonsShown}</span>
              {' из '}{totalLessons}{' уроков пройдено'}
            </div>
            <div className="hp-mock-track">
              <div className="hp-mock-fill" style={{ width: `${eased * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Модули — галочки загораются одна за другой */}
        <div className="hp-mock-grid">
          {modules.map((mod, i) => {
            const Icon = MODULE_ICONS[mod.icon] ?? BookOpen
            // модуль считается пройденным, когда счётчик дошёл до его последнего урока
            const isDone = lessonsShown >= cumulative[i]

            return (
              <div
                key={mod.id}
                className={`hp-mock-card ${isDone ? 'done' : ''}`}
                style={{ '--mc': mod.color }}
              >
                <div className="hp-mock-card-top" />
                <div className="hp-mock-card-ic"><Icon size={14} /></div>
                <div className="hp-mock-card-t">{mod.title}</div>
                <div className={`hp-mock-card-m ${isDone ? 'done' : ''}`}>
                  {mod.lessons.length} уроков
                  <span className="hp-mock-check"><Check size={9} /></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="hp-mock-cap">так выглядит Академия внутри платформы</div>
    </div>
  )
}

// ─── Печатающийся текст ─────────────────────────────────────────────────────
// Используется в раскрытой карточке участника команды: текст «набирается»
// быстро, символ за символом, создавая ощущение живого печатания.
//
// active — печатать или сбросить (при уходе курсора текст сбрасывается,
//          чтобы при следующем наведении анимация проигралась снова).
function Typewriter({ text, active, speed = 12 }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!active) { setShown(0); return }

    // Уважаем настройку «меньше движения» — показываем сразу целиком
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) { setShown(text.length); return }

    // Печатаем пачками по несколько символов — так плавнее и легче для браузера,
    // чем перерисовка на каждый отдельный символ
    const CHUNK = 3
    const id = setInterval(() => {
      setShown(prev => {
        if (prev >= text.length) { clearInterval(id); return prev }
        return Math.min(text.length, prev + CHUNK)
      })
    }, speed)

    return () => clearInterval(id)
  }, [active, text, speed])

  const done = shown >= text.length

  return (
    <span className="hp-typewriter">
      {text.slice(0, shown)}
      {!done && <span className="hp-type-caret" />}
    </span>
  )
}

export default function HomePage({ onOpenScanner, onNavigate }) {
  const [step, setStep] = useState(0)
  const [fundingRate, setFundingRate] = useState(4) // -10..10 → -0.10%..+0.10%
  const timerRef = useRef(null)

  // ─── Прозрачность подсказки «Листай вниз» ───
  // Чем дальше пользователь прокрутил, тем прозрачнее подсказка.
  // К моменту, когда прокручено ~55% высоты экрана, она полностью исчезает.
  const scrollRef = useRef(null)
  const [hintOpacity, setHintOpacity] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let raf = null
    const onScroll = () => {
      // requestAnimationFrame — чтобы не считать на каждый пиксель скролла
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const fadeDistance = window.innerHeight * 0.55
        const next = Math.max(0, 1 - el.scrollTop / fadeDistance)
        setHintOpacity(next)
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Появление панели визуализации — через хук, БЕЗ обёртки,
  // чтобы не сломать grid-раскладку блока «Как это работает»
  const [panelRef, panelShown] = useReveal()

  // ─── Раскрытая карточка команды (индекс или null) ───
  const [hoveredMember, setHoveredMember] = useState(null)

  // ─── Поочерёдное появление карточек команды при скролле ───
  const teamRef = useRef(null)
  const [teamShown, setTeamShown] = useState(false)

  useEffect(() => {
    const el = teamRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTeamShown(true); obs.disconnect() } },
      { threshold: 0, rootMargin: '0px 0px -20% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ─── Живой прогресс обучения (для превью Академии) ───
  // Если пользователь уже начал учиться — увидит свой реальный статус
  // прямо на главной. Если нет — увидит приглашение начать.
  // Прогресс нужен только для общего числа уроков (27) — витрина Академии
  // показывает демо-анимацию, а не реальный прогресс пользователя.
  const { progress } = useTrainingProgress(TRAINING_MODULES)

  // ─── FAQ-аккордеон: id раскрытого вопроса ───
  // По умолчанию раскрыт тот, у которого defaultOpen — иначе не видно,
  // что блок вообще раскрывается.
  const [openFaq, setOpenFaq] = useState(
    () => FAQ_HOMEPAGE.find(i => i.defaultOpen)?.id ?? null
  )

  // Все 6 модулей Академии — для макета-витрины
  const allModules = useMemo(
    () => [...TRAINING_MODULES].sort((a, b) => a.order - b.order),
    []
  )

  // ─── Таймлайн «Как это работает» ───
  //
  // Две фазы:
  //   1. ВСТУПЛЕНИЕ (один раз, когда блок попадает в кадр):
  //      появляется кружок 1 → красится зелёным → протягивается линия к кружку 2
  //      → появляется шаг 2 → и так до 4-го.
  //   2. ЦИКЛ (дальше): обычная подсветка активного шага по кругу, как раньше.
  //      Кружки уже на месте, заново не появляются.
  //
  // introRevealed — сколько шагов уже «проявлено» вступлением (0..4)
  const [introRevealed, setIntroRevealed] = useState(0)
  const [introDone, setIntroDone] = useState(false)
  const timelineRef = useRef(null)

  // Запускаем вступление, когда таймлайн входит в кадр
  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) { setIntroRevealed(4); setIntroDone(true); return }

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()

      // Проявляем шаги один за другим
      const timers = []
      for (let i = 1; i <= 4; i++) {
        timers.push(setTimeout(() => setIntroRevealed(i), i * 650))
      }

      // Передаём управление обычному циклу.
      //
      // ВАЖНО: step ставим на ПОСЛЕДНИЙ шаг (3), а не оставляем 0.
      // Иначе линии схлопывались: в цикле линия под шагом i зелёная при i < step,
      // и при step=0 это ложно для всех — все линии, нарисованные вступлением,
      // мгновенно исчезали. Теперь вступление заканчивается «полным» состоянием
      // (все линии зелёные, последний шаг активен), и уже с него цикл уходит
      // на step=0, где линии сбрасываются и начинают нарастать заново.
      timers.push(setTimeout(() => {
        setStep(3)
        setIntroDone(true)
      }, 4 * 650 + 500))

      // очистка на случай размонтирования во время анимации
      el._introTimers = timers
    }, { threshold: 0, rootMargin: '0px 0px -20% 0px' })

    obs.observe(el)
    return () => {
      obs.disconnect()
      ;(el._introTimers ?? []).forEach(clearTimeout)
    }
  }, [])

  // Обычный цикл подсветки — стартует только ПОСЛЕ вступления
  useEffect(() => {
    if (!introDone) return
    timerRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % 4)
    }, 4000)
    return () => clearInterval(timerRef.current)
  }, [introDone])

  const goToStep = (n) => {
    if (!introDone) return   // во время вступления клики игнорируем
    setStep(n)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % 4)
    }, 4000)
  }

  // ── Слайд 3: фандинг — производные значения от слайдера ставки ──
  const fundingRatePct = fundingRate / 100
  const fundingIsPositive = fundingRatePct >= 0
  const fundingPayout = (1000 * Math.abs(fundingRatePct) / 100).toFixed(2)

  return (
    <>
      <style>{style}</style>
      <div className="hp-bg-glow">
        <div className="hp-bg-glow-extra" />
      </div>

      <div className="hp-wrap" ref={scrollRef}>

        {/* ══ BLOCK 1: HERO ══ */}
        <div className="hp-hero">
          <h1 className="hp-h1">
            Находи спреды.<br />
            Торгуй <span className="hp-h1-grad">без риска</span>.
          </h1>

          <div className="hp-sub">
            AXIOMA мгновенно получает свежие арбитражные возможности с 8 крупнейших бирж и показывает их в реальном времени. Рыночно-нейтральная стратегия — твой заработок не зависит от направления рынка.
          </div>

          <div className="hp-actions">
            <button className="hp-btn-primary" onClick={onOpenScanner}>
              ОТКРЫТЬ СКАНЕР
            </button>
            <button
              className="hp-btn-secondary"
              onClick={() => document.querySelector('.hp-howto')?.scrollIntoView({ behavior: 'smooth' })}
            >
              КАК ЭТО РАБОТАЕТ ↓
            </button>
          </div>

          <div className="hp-ex-label">Поддерживаемые биржи</div>
          <div className="hp-ex-logos">
            {EXCHANGES_LIST.map(ex => (
              <ExFavicon key={ex.domain} {...ex} />
            ))}
          </div>

          {/* Подсказка растворяется по мере скролла (opacity считается в useEffect).
              Когда полностью прозрачна — убираем из DOM, чтобы не мешала. */}
          {hintOpacity > 0.01 && (
            <div className="hp-scroll-hint" style={{ opacity: hintOpacity }}>
              <div className="hp-scroll-hint-inner">
                <div className="hp-scroll-hint-mouse">
                  <div className="hp-scroll-hint-dot" />
                </div>
                ЛИСТАЙ ВНИЗ
              </div>
            </div>
          )}
        </div>

        {/* ══ BLOCK 2: HOW IT WORKS ══ */}
        {/* Внешнего <Reveal> нет: элементы появляются по очереди — сначала
            заголовок, потом шаги (вступительная анимация), потом визуализация. */}
        <div className="hp-howto">

          {/* Left: timeline */}
          <div className="hp-timeline-col" ref={timelineRef}>
            <Reveal>
              <div className="hp-section-label">// как это работает</div>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="hp-howto-title">
                4 шага от сигнала<br />до <span>прибыли</span>
              </h2>
            </Reveal>

            <div className="hp-timeline">
              {STEPS.map((s, i) => {
                // Во время вступления шаги проявляются по очереди и все
                // «пройденные» горят зелёным. После вступления — обычный цикл.
                const introVisible = introRevealed > i
                const isDone = introDone ? i < step : introVisible
                const isActive = introDone ? step === i : false

                // ЛИНИЯ под шагом. Логика:
                //   во время вступления — протягивается сразу после появления кружка
                //   в цикле — рисуется, когда шаг пройден (i < step), и СБРАСЫВАЕТСЯ
                //             в начале нового цикла (step вернулся к 0)
                // Так линия живёт вместе с циклом: постепенно нарастает до конца,
                // потом исчезает и рисуется заново.
                const lineDrawn = introDone ? i < step : introRevealed > i

                return (
                  <div
                    key={i}
                    className={[
                      'hp-tl-step',
                      isActive ? 'active' : '',
                      isDone ? 'done' : '',
                      !introVisible ? 'intro-hidden' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => goToStep(i)}
                  >
                    <div className="hp-tl-left">
                      <div className="hp-tl-circle">
                        {isDone ? '✓' : `0${i + 1}`}
                      </div>

                      {/* Линия к следующему шагу (у последнего её нет).
                          scaleY приходит ИНЛАЙНОМ из состояния — никакой
                          зависимости от CSS-классов и специфичности. */}
                      {i < STEPS.length - 1 && (
                        <div className="hp-tl-line">
                          <div
                            className="hp-tl-line-fill"
                            style={{
                              transform: `scaleY(${lineDrawn ? 1 : 0})`,
                              // при протягивании — небольшая задержка, чтобы
                              // сначала покрасился кружок, потом пошла линия
                              transitionDelay: lineDrawn ? '0.2s' : '0s',
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="hp-tl-right">
                      <div className="hp-tl-title">{s.title}</div>
                      <div className="hp-tl-desc">{s.desc}</div>
                      <div className="hp-tl-tags">
                        {s.tags.map((t, j) => (
                          <div key={j} className={`hp-tl-tag ${t.cls}`}>{t.label}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: visual panel.
              БЕЗ обёртки <Reveal> — панель должна остаться ПРЯМЫМ элементом
              grid-раскладки .hp-howto, иначе теряет размер. Классы появления
              вешаются на неё саму через useReveal. */}
          <div
            ref={panelRef}
            className={`hp-panel-col hp-reveal-scale ${panelShown ? 'in' : ''}`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="hp-panel-topbar">
              <div className="hp-panel-dot" style={{ background: '#e03e3e' }} />
              <div className="hp-panel-dot" style={{ background: '#f0a500' }} />
              <div className="hp-panel-dot" style={{ background: '#00c97a' }} />
              <div className="hp-panel-title">{PANEL_LABELS[step]}</div>
            </div>

            <div className="hp-panel-stage">

              {/* VIS 0 — Scanner */}
              <div className={`hp-vis ${step === 0 ? 'show' : ''}`}>
                <div className="hp-scan-grid">
                  <div className="hp-scan-head">
                    <div className="hp-scan-th">Пара</div>
                    <div className="hp-scan-th">Биржи</div>
                    <div className="hp-scan-th">Спред</div>
                    <div className="hp-scan-th">+$100</div>
                  </div>
                  {[
                    { sym: 'BTC/USDT', type: 'Futures', d1: 'binance.com', d2: 'bybit.com', f1: 'BN', f2: 'BB', c1: '#F3BA2F', c2: '#F7A600', spread: '+3.42%', spreadColor: 'var(--success)', profit: '$3.42', hl: true },
                    { sym: 'ETH/USDT', type: 'Spot',    d1: 'mexc.com', d2: 'bitget.com', f1: 'MX', f2: 'BG', c1: '#00B897', c2: '#00F0FF', spread: '+2.18%', spreadColor: 'var(--accent-bright)', profit: '$2.18', hl: false },
                    { sym: 'SOL/USDT', type: 'Futures', d1: 'bingx.com', d2: 'gate.io', f1: 'BX', f2: 'GT', c1: '#1DA2B4', c2: '#2354E6', spread: '+1.55%', spreadColor: 'var(--warning)', profit: '$1.55', hl: false },
                    { sym: 'BNB/USDT', type: 'Futures', d1: 'kucoin.com', d2: 'okx.com', f1: 'KC', f2: 'OK', c1: '#00A550', c2: '#ddd', spread: '+1.12%', spreadColor: 'var(--warning)', profit: '$1.12', hl: false },
                  ].map((row, i) => (
                    <div key={i} className={`hp-scan-row ${row.hl ? 'hl' : ''}`}>
                      <div>
                        <div className="hp-scan-sym">{row.sym}</div>
                        <div className="hp-scan-sub">{row.type}</div>
                      </div>
                      <div className="hp-scan-exes">
                        <InlineFavicon domain={row.d1} fallback={row.f1} color={row.c1} />
                        <span className="hp-scan-arr">→</span>
                        <InlineFavicon domain={row.d2} fallback={row.f2} color={row.c2} />
                      </div>
                      <div className="hp-scan-spread" style={{ color: row.spreadColor }}>{row.spread}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className="hp-scan-profit">{row.profit}</div>
                        {row.hl && <div className="hp-scan-pulse" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VIS 1 — Filters */}
              <div className={`hp-vis ${step === 1 ? 'show' : ''}`}>
                <div className="hp-filter-mock">
                  <div className="hp-filter-head">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    ФИЛЬТРЫ
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Биржи</div>
                    <div className="hp-fex-row">
                      {EXCHANGES_LIST.map((ex, i) => (
                        <div key={i} className={`hp-fex ${i !== 4 && i !== 6 ? 'sel' : ''}`}>
                          <InlineFavicon domain={ex.domain} fallback={ex.fallback} color={ex.color} size={13} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Мин. спред</div>
                    <div className="hp-slider-row">
                      <div className="hp-slider"><div className="hp-slider-fill" /></div>
                      <div className="hp-slider-val">1.0%</div>
                    </div>
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Стратегия</div>
                    <div className="hp-toggle-row">
                      <div className="hp-toggle"><div className="knob" /></div>
                      <div className="hp-toggle-txt">Futures-Futures</div>
                    </div>
                    <div className="hp-toggle-row">
                      <div className="hp-toggle"><div className="knob" /></div>
                      <div className="hp-toggle-txt">Spot-Futures</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIS 2 — Trade entry */}
              <div className={`hp-vis ${step === 2 ? 'show' : ''}`}>
                <div className="hp-trade-mock">
                  <div className="hp-trade-head">
                    <div className="hp-trade-sym">BTC/USDT</div>
                    <div className="hp-trade-badge">+3.42%</div>
                  </div>
                  <div className="hp-trade-body">
                    <div className="hp-trade-sides">
                        <div className="hp-trade-side short">
                            <div className="hp-side-lbl">▼ SHORT</div>
                            <div className="hp-side-ex">
                            <InlineFavicon domain="bybit.com" fallback="BB" color="#F7A600" size={18} />
                            <span>Bybit</span>
                            </div>
                            <div className="hp-side-price">$69,291</div>
                        </div>
                        <div className="hp-trade-side long">
                            <div className="hp-side-lbl">▲ LONG</div>
                            <div className="hp-side-ex">
                            <InlineFavicon domain="binance.com" fallback="BN" color="#F3BA2F" size={18} />
                            <span>Binance</span>
                            </div>
                            <div className="hp-side-price">$67,000</div>
                        </div>
                    </div>
                    <div className="hp-trade-profit">
                      <div className="hp-trade-profit-lbl">Прибыль при входе $100</div>
                      <div className="hp-trade-profit-val">+$3.42</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIS 3 — Spread convergence chart */}
              <div className={`hp-vis ${step === 3 ? 'show' : ''}`}>
                <SpreadConvergenceChart />
              </div>

            </div>

            {/* Nav dots */}
            <div className="hp-panel-nav">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`hp-nav-dot ${step === i ? 'active' : ''}`}
                  onClick={() => goToStep(i)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ══ BLOCK 3: FUNDING TUTORIAL ══ */}
        {/* Элементы появляются по очереди: заголовок → описание → интерактив */}
        <div className="hp-funding">
          <Reveal>
            <div className="hp-funding-eyebrow">// funding arbitrage tutorial</div>
          </Reveal>
          <Reveal delay={110}>
            <div className="hp-funding-title">Куда LONG, куда SHORT — зависит от знака ставки</div>
          </Reveal>
          <Reveal delay={220}>
            <div className="hp-funding-desc">
              Подвигай слайдер и посмотри, как меняется расстановка позиций. Сканер делает этот выбор автоматически — здесь просто наглядно почему именно так.
            </div>
          </Reveal>

          <Reveal variant="scale" delay={340}>
          <div className="hp-funding-card">
            <div className="fc-row">
              <span className="fc-label">Ставка финансирования на Binance Futures</span>
              <span className="fc-val" style={{ color: fundingIsPositive ? 'var(--success)' : 'var(--error)' }}>
                {fundingIsPositive ? '+' : ''}{fundingRatePct.toFixed(3)}%
              </span>
            </div>

            <input
              type="range"
              className="fc-slider"
              min="-10"
              max="10"
              value={fundingRate}
              onChange={e => setFundingRate(parseInt(e.target.value, 10))}
            />
            <div className="fc-marks">
              <span>-0.10% (шорты платят лонгам)</span>
              <span>0%</span>
              <span>+0.10% (лонги платят шортам)</span>
            </div>

            <div className="fc-diagram">
              {/* Нога, которая ПОЛУЧАЕТ фандинг */}
              <div className={`fc-side ${fundingIsPositive ? 'mode-short' : 'mode-long'}`}>
                <span className="fc-side-badge">{fundingIsPositive ? 'SHORT' : 'LONG'}</span>
                <span className="fc-side-ex">Binance</span>
                <span className="fc-side-market">Futures</span>
                <span className="fc-side-note">
                  {fundingIsPositive
                    ? 'Лонги платят фандинг — открываем шорт и получаем выплату каждые 8ч.'
                    : 'Шорты платят фандинг — открываем лонг и получаем выплату каждые 8ч.'}
                </span>
              </div>

              <div className="fc-diagram-arrow">
                <ArrowRight size={28} />
                <span>хедж</span>
              </div>

              {/* ХЕДЖ-нога.
                  ВАЖНО: при отрицательной ставке хедж — на ДРУГОЙ бирже (Bybit),
                  а не на той же. Если открыть LONG и SHORT на одной бирже, фандинг,
                  который получаешь по одной ноге, тут же платишь по другой — в сумме
                  ноль, а с комиссиями минус. Прибыль возникает из РАЗНИЦЫ ставок
                  между биржами. */}
              <div className={`fc-side ${fundingIsPositive ? 'mode-long' : 'mode-short'}`}>
                <span className="fc-side-badge">{fundingIsPositive ? 'LONG' : 'SHORT'}</span>
                <span className="fc-side-ex">{fundingIsPositive ? 'Binance' : 'Bybit'}</span>
                <span className="fc-side-market">{fundingIsPositive ? 'Spot' : 'Futures'}</span>
                <span className="fc-side-note">
                  {fundingIsPositive
                    ? 'Нейтрализует движение цены — прибыль только от разницы ставок.'
                    : 'Хедж на ДРУГОЙ бирже, где ставка выше. На той же бирже фандинг бы взаимно погасился.'}
                </span>
              </div>
            </div>

            <div className="fc-result">
              <span className="fc-result-lbl">Выплата за 8ч при позиции $1000</span>
              <span className="fc-result-val">+${fundingPayout}</span>
            </div>

            <div className="fc-caption">
              Правило простое: <b>кто платит фандинг — от того уходим</b>. Ставка положительная → лонги платят → открываем <b>SHORT на фьючерсе</b> и хеджируем <b>LONG на споте</b> (спот фандинга не имеет, поэтому взаимного погашения нет). Ставка отрицательная → шорты платят → открываем <b>LONG на фьючерсе</b>, а хеджируем <b>SHORT на фьючерсе ДРУГОЙ биржи</b>, где ставка выше. <b>Ключевое:</b> обе ноги на одной бирже собрать фандинг не дадут — что получишь по одной, то заплатишь по другой. Прибыль возникает только из <b>разницы ставок между биржами</b>.
            </div>
          </div>
          </Reveal>
        </div>

        {/* ══ BLOCK 4: ACADEMY — «ВИТРИНА» ══ */}
        {/* Заголовок → макет с рейтингом → боковые блоки → кнопка */}
        <div className="hp-academy">
          <Reveal>
            <div className="hp-sec-head">
              <div className="hp-sec-eyebrow"><GraduationCap size={13} /> АКАДЕМИЯ AXIOMA</div>
              <h2 className="hp-sec-title">Собственная <span>Академия арбитража</span></h2>
              <div className="hp-sec-sub">
                Полноценная обучающая платформа встроена прямо в сканер — не статьи со стороны,
                а интерактивный курс с симуляторами, схемами и квизами. Вот как она выглядит изнутри.
              </div>
            </div>
          </Reveal>

          <div className="hp-ac-wrap">
            {/* Витрина Академии — живая демо-анимация (компонент выше).
                Показываем продукт, а не рассказываем о нём. */}
            <Reveal variant="scale" delay={140}>
              <AcademyMockup
                modules={allModules}
                totalLessons={progress.totalLessons}
                onOpen={() => onNavigate?.('training')}
              />
            </Reveal>

            {/* ─── Боковая колонка ─── */}
            <div className="hp-ac-side">
              <Reveal delay={300}>
              <div className="hp-ac-block">
                <div className="hp-ac-block-t"><Target size={16} /> Чему научишься</div>
                <div className="hp-ac-list">
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Отличать реальную возможность от ловушки с раздутым спредом</div>
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Считать прибыль с учётом комиссий и проскальзывания</div>
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Читать стакан и понимать, хватит ли объёма на твою сделку</div>
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Собирать фандинг без рыночного риска</div>
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Управлять плечом и не ловить ликвидацию</div>
                  <div className="hp-ac-li"><span className="hp-ac-li-dot" />Пользоваться сканером на полную</div>
                </div>
              </div>
              </Reveal>

              <Reveal delay={420}>
              <div className="hp-ac-block">
                <div className="hp-ac-block-t"><Wrench size={16} /> В каком формате</div>
                <div className="hp-ac-fmts">
                  {/* У каждого формата свой цвет иконки — задаётся через --fc */}
                  <span className="hp-ac-fmt" style={{ '--fc': '#3d87c0' }}>
                    <BookOpen size={13} /> Теория с нуля
                  </span>
                  <span className="hp-ac-fmt" style={{ '--fc': '#00c97a' }}>
                    <SlidersHorizontal size={13} /> Симуляторы
                  </span>
                  <span className="hp-ac-fmt" style={{ '--fc': '#5eead4' }}>
                    <BarChart3 size={13} /> Схемы
                  </span>
                  <span className="hp-ac-fmt" style={{ '--fc': '#f0a500' }}>
                    <HelpCircle size={13} /> Квизы с разбором
                  </span>
                  <span className="hp-ac-fmt" style={{ '--fc': '#a78bfa' }}>
                    <Gamepad2 size={13} /> Мини-игры
                  </span>
                  <span className="hp-ac-fmt" style={{ '--fc': '#f472b6' }}>
                    <Trophy size={13} /> Статусы
                  </span>
                </div>
              </div>
              </Reveal>
            </div>
          </div>

          <Reveal delay={540}>
            <div className="hp-ac-cta">
              <button className="hp-sec-btn primary" onClick={() => onNavigate?.('training')}>
                НАЧАТЬ ОБУЧЕНИЕ
                <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* ══ BLOCK 5: TEAM — РАЗДВИГАЮЩИЕСЯ КАРТОЧКИ ══ */}
        {/* Заголовок → карточки друг за другом → кнопка.
            Hover-анимация раскрытия карточек НЕ трогается — она отдельная. */}
        <div className="hp-team">
          <Reveal>
            <div className="hp-sec-head">
              <div className="hp-sec-eyebrow"><Users size={13} /> КОМАНДА</div>
              <h2 className="hp-sec-title">Три человека <span>за проектом</span></h2>
              <div className="hp-sec-sub">
                Мы бывшие арбитражники, которые устали от неудобных сканеров и решили
                сделать свой. Нажми на карточку, чтобы узнать больше.
              </div>
            </div>
          </Reveal>

          {/* Внешний контейнер держит ширину — ряд внутри сдвигается translateX,
              не влияя на разметку страницы. Механика раздвигания — в CSS выше.

              ВАЖНО: карточки НЕ обёрнуты в <Reveal>. Reveal добавляет свой
              transform (translateY), а у ряда уже есть свой translateX для
              раздвигания — они бы конфликтовали. Поэтому появление карточек
              сделано отдельным классом `tm-enter`, который трогает только
              opacity и собственный transform карточки. */}
          <div className="hp-team-row-outer" ref={teamRef}>
            <div
              className={`hp-team-grid ${hoveredMember !== null ? `has-hover hov-${hoveredMember}` : ''}`}
              onMouseLeave={() => setHoveredMember(null)}
            >
            {TEAM.map((m, i) => {
              const isActive = hoveredMember === i

              return (
                <div
                  key={i}
                  className={`hp-tm-card ${isActive ? 'active' : ''} ${teamShown ? 'tm-enter' : 'tm-hidden'}`}
                  /* animationDelay, а НЕ transitionDelay: transitionDelay
                     применился бы и к hover-раскрытию карточки и затормозил бы его.
                     Анимация появления и переходы hover — независимы. */
                  style={{ animationDelay: `${i * 130}ms` }}
                  onMouseEnter={() => setHoveredMember(i)}
                  /* Тап — для тач-экранов, где mouseenter не срабатывает никогда
                     (Партия 1, MOBILE_PLAN.md п.2.3): повторный тап по уже
                     раскрытой карточке сворачивает её обратно. На десктопе
                     это не мешает ховеру — событие клика на уже наведённой
                     карточке случается редко и просто закрывает её раньше. */
                  onClick={() => setHoveredMember(prev => (prev === i ? null : i))}
                >
                  {/* Компактное состояние — сворачивается при раскрытии.
                      Обёрнуто в grid-контейнер, чтобы высота анимировалась
                      плавно (display:none анимировать нельзя). */}
                  <div className="hp-tm-state compact">
                    <div className="hp-tm-state-inner">
                      <div className="hp-tm-compact">
                        <div className="hp-tm-av" style={{ background: m.color }}>
                          {m.photo
                            ? <img src={m.photo} alt={m.name} onError={e => { e.target.style.display = 'none' }} />
                            : m.initial}
                        </div>
                        <div className="hp-tm-name">{m.name}</div>
                        <div className="hp-tm-role">{m.role}</div>
                        <div className="hp-tm-more">ПОДРОБНЕЕ →</div>
                      </div>
                    </div>
                  </div>

                  {/* Раскрытое состояние — разворачивается при наведении */}
                  <div className="hp-tm-state full">
                    <div className="hp-tm-state-inner">
                      <div className="hp-tm-full-head">
                        <div className="hp-tm-full-av" style={{ background: m.color }}>
                          {m.photo
                            ? <img src={m.photo} alt={m.name} onError={e => { e.target.style.display = 'none' }} />
                            : m.initial}
                        </div>
                        <div>
                          <div className="hp-tm-full-name">{m.name}</div>
                          <div className="hp-tm-full-meta">
                            <span className="hp-tm-full-role">{m.role}</span>
                            {m.age && <span className="hp-tm-age">{m.age} лет</span>}
                          </div>
                        </div>
                      </div>

                      <div className="hp-tm-about">
                        {/* Текст «печатается» при раскрытии карточки */}
                        <Typewriter text={m.about} active={isActive} />
                      </div>

                      {m.focus?.length > 0 && (
                        <div className="hp-tm-focus">
                          {m.focus.map((f, j) => (
                            <span
                              key={j}
                              className="hp-tm-focus-chip"
                              /* плашки подтягиваются одна за другой после текста */
                              style={{ transitionDelay: isActive ? `${420 + j * 90}ms` : '0ms' }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}

                      {m.socials?.length > 0 && (
                        <div
                          className="hp-tm-socials"
                          /* соцсети — последними */
                          style={{ transitionDelay: isActive ? '760ms' : '0ms' }}
                        >
                          {m.socials.map((s, j) => {
                            const Ic = SOCIAL_ICONS[s.type] ?? Send
                            return (
                              <a
                                key={j}
                                className="hp-tm-social"
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Ic size={13} />
                                {s.label}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* кнопка появляется после последней карточки */}
          <Reveal delay={TEAM.length * 130 + 120}>
            <div className="hp-ac-cta">
              <button className="hp-sec-btn" onClick={() => onNavigate?.('about')}>
                ПОДРОБНЕЕ О ПРОЕКТЕ
                <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* ══ BLOCK 6: FAQ ══ */}
        {/* Внешнего <Reveal> здесь НЕТ намеренно: заголовок появляется отдельно,
            а вопросы — каждый со своей задержкой (см. ниже). Иначе получилась бы
            двойная анимация: блок целиком + каждый элемент внутри. */}
        <div className="hp-faq">
          <Reveal>
            <div className="hp-sec-head">
              <div className="hp-sec-eyebrow"><HelpCircle size={13} /> ВОПРОСЫ</div>
              <h2 className="hp-sec-title">Частые <span>вопросы</span></h2>
              <div className="hp-sec-sub">
                Всё, что обычно спрашивают перед началом работы со сканером.
              </div>
            </div>
          </Reveal>

          <div className="hp-faq-list">
            {/* Каждый вопрос в собственном Reveal с нарастающей задержкой —
                они проявляются один за другим, а не весь блок разом. */}
            {FAQ_HOMEPAGE.map((item, i) => (
              <Reveal key={item.id} delay={i * 110}>
                <FaqItem
                  item={item}
                  isOpen={openFaq === item.id}
                  // повторный клик по открытому — сворачивает
                  onToggle={() => setOpenFaq(cur => (cur === item.id ? null : item.id))}
                />
              </Reveal>
            ))}
          </div>

          {/* кнопка появляется после последнего вопроса */}
          <Reveal delay={FAQ_HOMEPAGE.length * 110}>
            <div className="hp-ac-cta">
              <button className="hp-sec-btn" onClick={() => onNavigate?.('faq')}>
                ВСЕ ВОПРОСЫ
                <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>

        <Footer onNavigate={onNavigate} />
      </div>
    </>
  )
}