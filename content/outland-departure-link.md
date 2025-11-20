---
title: "[GWars] Outland Departure Link"
aliases:
  - scripts/outland-departure-link
draft: false
description: "Добавляет ссылку для быстрого отплытия на Outland на основе текущего сектора"
tags:
  - Карта
---

<style>
  body[data-slug="outland-departure-link"],
  body[data-slug="scripts/outland-departure-link"] {
    background: inherit;
  }

  body[data-slug="outland-departure-link"] .left.sidebar,
  body[data-slug="scripts/outland-departure-link"] .left.sidebar,
  body[data-slug="outland-departure-link"] .right.sidebar,
  body[data-slug="scripts/outland-departure-link"] .right.sidebar,
  body[data-slug="outland-departure-link"] .page-footer,
  body[data-slug="scripts/outland-departure-link"] .page-footer,
  body[data-slug="outland-departure-link"] hr,
  body[data-slug="scripts/outland-departure-link"] hr {
    display: none !important;
  }

  body[data-slug="outland-departure-link"] #quartz-body,
  body[data-slug="scripts/outland-departure-link"] #quartz-body {
    display: block;
  }

  body[data-slug="outland-departure-link"] .center,
  body[data-slug="scripts/outland-departure-link"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.35rem 1.6rem 3.2rem;
  }

  body[data-slug="outland-departure-link"] article.popover-hint,
  body[data-slug="scripts/outland-departure-link"] article.popover-hint {
    margin: 0;
    padding: 0;
  }

  .script-layout {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .script-card {
    border: 1px solid var(--lightgray);
    border-radius: 14px;
    padding: 1.6rem 1.8rem;
    background: var(--light);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  }

  :root[saved-theme="dark"] .script-card {
    border-color: var(--darkgray);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  }

  .page-top-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .breadcrumbs-mini {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.95rem;
    color: var(--darkgray);
  }

  .breadcrumbs-mini a {
    color: inherit;
    text-decoration: none;
  }

  .breadcrumbs-mini span.separator {
    opacity: 0.6;
  }

  .tag-strip {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tag-strip a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: rgba(40, 75, 99, 0.1);
    color: inherit;
    text-decoration: none;
  }

  :root[saved-theme="dark"] .tag-strip a {
    background: rgba(132, 165, 157, 0.22);
  }

  .script-gallery {
    display: grid;
    gap: 1rem;
  }

  .script-gallery figure {
    margin: 0;
    background: var(--light);
    border: 1px solid var(--lightgray);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  }

  :root[saved-theme="dark"] .script-gallery figure {
    border-color: var(--darkgray);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
  }

  .script-gallery img {
    display: block;
    width: 100%;
    height: auto;
  }

  .script-gallery figcaption {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    color: var(--darkgray);
  }

  :root[saved-theme="dark"] .script-gallery figcaption {
    color: var(--gray);
  }

  .script-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .script-intro {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .script-intro p {
    margin: 0;
    flex: 1 1 auto;
  }

  .script-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
  }

  .script-actions a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 999px;
    font-size: 0.92rem;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.16s ease;
  }

  .script-actions a.cta-primary {
    background: var(--secondary);
    color: var(--light);
  }

  .script-actions a.cta-secondary {
    border: 1px solid var(--lightgray);
  }

  :root[saved-theme="dark"] .script-actions a.cta-secondary {
    border-color: var(--darkgray);
    color: var(--light);
  }

  .script-actions a:hover {
    opacity: 0.85;
  }

  .info-grid {
    display: grid;
    gap: 0.9rem;
  }

  @media (min-width: 640px) {
    .info-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .info-chip {
    border-radius: 10px;
    background: rgba(40, 75, 99, 0.08);
    padding: 0.65rem 0.75rem;
    font-size: 0.88rem;
  }

  :root[saved-theme="dark"] .info-chip {
    background: rgba(40, 75, 99, 0.18);
    color: var(--light);
  }

  .feature-list {
    display: grid;
    gap: 0.75rem;
    margin: 0 0 0 1.2rem;
    padding: 0;
    list-style: disc;
  }

  .feature-list li {
    line-height: 1.45;
  }

  .script-section h2 {
    margin-top: 0;
    margin-bottom: 0.8rem;
    font-size: 1.2rem;
  }

  .install-steps {
    counter-reset: step;
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
  }

  .install-steps li {
    list-style: none;
    border-left: 3px solid var(--secondary);
    padding: 0.35rem 0 0.35rem 1rem;
  }

  .support-box {
    font-size: 0.95rem;
    color: var(--darkgray);
  }

  :root[saved-theme="dark"] .support-box {
    color: var(--gray);
  }
</style>

<div class="script-layout">
  <section class="script-card script-header">
    <div class="script-intro">
      <p>Добавляет ссылку для быстрого отплытия на Outland (Overlord Point, сектор 13) на основе текущего сектора, в котором находится игрок.</p>
      <span class="info-chip"><strong>Версия:</strong> 0.1</span>
    </div>

  <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-OutlandDepartureLink.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-OutlandDepartureLink.user.js" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>

  <section class="script-card script-section">
    <h2>Что делает скрипт</h2>
    <ul class="feature-list">
      <li>Автоматически определяет текущий сектор на странице карты по тексту "Вы находитесь в секторе".</li>
      <li>На основе названия сектора определяет параметр <code>sectorout</code> для перехода в сектор 13 (Overlord Point).</li>
      <li>Добавляет зелёную ссылку <strong>"» OP"</strong> справа от ссылки "Выйти в прибрежную зону".</li>
      <li>Поддерживает все основные секторы: Ganja Island (секторы 0–5), Тюремный остров (сектор 6), Z-Lands Island (секторы 7–11) и Palm Island (сектор 14).</li>
      <li>Предотвращает дублирование ссылки при повторной загрузке страницы или обновлении контента.</li>
    </ul>
  </section>

  <section class="script-gallery">
    <figure>
      <img src="/outland-departure-link/screenshot-1.png" alt="Ссылка для отплытия на Outland" loading="lazy" />
      <figcaption>Зелёная ссылка "» OP" появляется справа от "Выйти в прибрежную зону" для быстрого перехода на Overlord Point.</figcaption>
    </figure>
  </section>

  <section class="script-card script-section">
    <h2>Как работает</h2>
    <p>Скрипт работает на странице <code>map.php</code> и выполняет следующие действия:</p>
    <ol class="feature-list" style="list-style: decimal;">
      <li><strong>Определение текущего сектора</strong> — извлекает название сектора из блока с текстом "Вы находитесь в секторе" и убирает префиксы [G] или [Z].</li>
      <li><strong>Маппинг сектора</strong> — использует встроенный словарь для преобразования названия сектора в значение <code>sectorout</code> (0–11, 14).</li>
      <li><strong>Создание ссылки</strong> — формирует URL вида <code>map.move.php?seaway=1&sectorin=13&sectorout={sectorout}&confirm=1</code>.</li>
      <li><strong>Вставка ссылки</strong> — добавляет стилизованную ссылку в тот же блок, где находится "Выйти в прибрежную зону".</li>
    </ol>
    <p>Если текущий сектор не найден в словаре или скрипт не может определить местоположение, ссылка не добавляется (в консоль выводится предупреждение для отладки).</p>
  </section>

  <section class="script-card">
    <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-OutlandDepartureLink.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-OutlandDepartureLink.user.js" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>
</div>

