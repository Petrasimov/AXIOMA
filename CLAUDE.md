# AXION SCAN — План обучения и переписывания

## Цель
Переписать проект из `web/` в `Fronted AXION/` с нуля, с полным пониманием каждой строки кода.
Технологии: React 18.2 + Vite 5 + чистый CSS, Lucide React, Google Fonts (Inter + JetBrains Mono).

## Прогресс

- [x] Модуль 0 — Подготовка среды (Vite, npm, структура проекта)
- [x] Модуль 1 — Фундамент: index.html + styles.css (CSS-переменные, шрифты, reset)
- [x] Модуль 2 — React базис: main.jsx + App.jsx (JSX, компоненты, props)
- [x] Модуль 3 — Утилиты: constants.js + utils.js (ES-модули, функции)
- [x] Модуль 4 — Данные: mockData.js (модель данных)
- [ ] Модуль 5 — Sidebar.jsx (компонент, CSS, props)
- [ ] Модуль 6 — Header.jsx (dropdown, callbacks)
- [ ] Модуль 7 — App State: App.jsx (useState, useMemo, useEffect)
- [ ] Модуль 8 — StatsRow.jsx (вычисления из данных, CSS Grid)
- [ ] Модуль 9 — OpportunityCard.jsx (форматирование, цвета, hover)
- [ ] Модуль 10 — OpportunityGrid.jsx (map, key, условный рендер)
- [ ] Модуль 11 — FilterDrawer.jsx (анимации, фильтрация)
- [ ] Модуль 12 — DetailModal.jsx (модал, хуки, калькулятор P&L)
- [ ] Модуль 12.5 — Client-side Exchange API (fetch, CORS, funding rate, объём, transfer)
- [ ] Модуль 13 — Финальная интеграция и полировка

## Модуль 12.5 — детали
Получение данных напрямую из браузера пользователя (client-side):
- Funding rate с бирж (Binance, Bybit, OKX, Gate.io поддерживают CORS)
- Объём за 24ч
- Доступность deposit/withdraw
- Решение CORS проблем по ходу для бирж которые блокируют
- Кэширование чтобы не спамить запросами
- Подмена mock-данных реальными

## Правила работы
- Каждый модуль = теория + код + объяснение + результат в браузере
- Не копируем — строим с пониманием
- Пользователь пишет весь код вручную, Claude только объясняет и инструктирует
- Возможны улучшения относительно оригинала по ходу работы
