/**
 * NotFoundPage.jsx — страница 404
 *
 * Показывается когда адрес не совпал ни с одним маршрутом из routes.js.
 *
 * Почему нужен собственный компонент, а не браузерная 404:
 * сайт — SPA, Nginx на любой неизвестный путь отдаёт index.html
 * со статусом 200. Браузер не знает что страницы нет и свою заглушку
 * не покажет. Поэтому 404 рисуем сами.
 *
 * Оформление намеренно минимальное — это тупиковый экран,
 * задача только увести пользователя обратно в рабочую часть сайта.
 */

import { Compass, ArrowLeft, Home } from 'lucide-react'

const style = `
  .nf-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    overflow-y: auto;
  }

  .nf-card {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
    padding: 44px 34px;
    background: var(--glass-fill);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-glass);
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
  }

  .nf-icon {
    width: 62px;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--accent-bright);
    background: rgba(61,135,192,0.1);
    border: 1px solid rgba(61,135,192,0.25);
  }

  .nf-code {
    font-family: var(--font-mono);
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 2px;
    color: var(--text-primary);
  }

  .nf-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.2px;
  }

  .nf-text {
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--text-secondary);
    max-width: 340px;
  }

  .nf-path {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-muted);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 7px 12px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nf-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 4px;
  }

  .nf-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 20px;
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }

  .nf-btn.primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-bright));
    border: 1px solid rgba(255,255,255,0.14);
    color: #fff;
    box-shadow: 0 4px 18px rgba(47,105,151,0.3);
  }

  .nf-btn.primary:hover { transform: translateY(-1px); }

  .nf-btn.ghost {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
  }

  .nf-btn.ghost:hover {
    border-color: var(--glass-border-hover);
    color: var(--text-primary);
  }

  @media (max-width: 480px) {
    .nf-wrap  { padding: 24px 16px; }
    .nf-card  { padding: 34px 22px; gap: 15px; }
    .nf-code  { font-size: 44px; }
    .nf-actions { width: 100%; }
    .nf-btn   { flex: 1; justify-content: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    .nf-btn.primary:hover { transform: none; }
  }
`

function NotFoundPage({ onGoHome }) {
  // Путь показываем как есть — помогает заметить опечатку в адресе
  let currentPath = ''
  try { currentPath = window.location.pathname } catch { /* пререндер */ }

  return (
    <>
      <style>{style}</style>
      <div className="nf-wrap">
        <div className="nf-card">

          <span className="nf-icon"><Compass size={28} /></span>

          <div className="nf-code">404</div>
          <div className="nf-title">Страница не найдена</div>

          <p className="nf-text">
            Такого адреса на сайте нет. Возможно, в ссылке опечатка
            или страница была перемещена.
          </p>

          {currentPath && currentPath !== '/' && (
            <div className="nf-path">{currentPath}</div>
          )}

          <div className="nf-actions">
            <button className="nf-btn primary" onClick={() => onGoHome?.()}>
              <Home size={13} /> На главную
            </button>
            <button className="nf-btn ghost" onClick={() => window.history.back()}>
              <ArrowLeft size={13} /> Назад
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

export default NotFoundPage