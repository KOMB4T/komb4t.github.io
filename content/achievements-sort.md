---
title: "[GWars] Achievements Sort"
aliases:
  - scripts/achievements-sort
draft: false
description: "Упорядочивает блоки достижений, скрывает выполненные на 100% пункты и переносит полностью закрытые группы в конец колонки."
tags:
  - Сортировка
  - Достижения
---

<style>
  body[data-slug="achievements-sort"],
  body[data-slug="scripts/achievements-sort"] {
    background: inherit;
  }

  body[data-slug="achievements-sort"] .left.sidebar,
  body[data-slug="scripts/achievements-sort"] .left.sidebar,
  body[data-slug="achievements-sort"] .right.sidebar,
  body[data-slug="scripts/achievements-sort"] .right.sidebar,
  body[data-slug="achievements-sort"] .page-footer,
  body[data-slug="scripts/achievements-sort"] .page-footer,
  body[data-slug="achievements-sort"] hr,
  body[data-slug="scripts/achievements-sort"] hr {
    display: none !important;
  }

  body[data-slug="achievements-sort"] #quartz-body,
  body[data-slug="scripts/achievements-sort"] #quartz-body {
    display: block;
  }

  body[data-slug="achievements-sort"] .center,
  body[data-slug="scripts/achievements-sort"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.35rem 1.6rem 3.2rem;
  }

  body[data-slug="achievements-sort"] article.popover-hint,
  body[data-slug="scripts/achievements-sort"] article.popover-hint {
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
</style>

<div class="script-layout">
  <section class="script-card script-header">
    <div class="script-intro">
      <p>Приводит страницу достижений к удобному виду: завершённые блоки уводит вниз, а внутри блоков скрывает выполненные пункты, чтобы фокус оставался на том, что ещё нужно закрыть.</p>
      <span class="info-chip"><strong>Версия:</strong> 1.0</span>
    </div>

  <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-AchievementsSort.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/GWars-AchievementsSort.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>

  <section class="script-card script-section">
    <h2>Как это выглядит в работе</h2>
    <ul class="feature-list">
      <li><strong>До:</strong> выполненные и невыполненные пункты перемешаны, завершённые блоки занимают место наверху.</li>
      <li><strong>После:</strong> сначала видны только актуальные задачи, а закрытые блоки и 100% пункты не мешают просмотру.</li>
      <li><strong>Для [REP]:</strong> завершённые записи остаются доступными, но визуально приглушаются.</li>
    </ul>
  </section>

  <section class="script-gallery">
    <figure>
      <img src="/achievements-sort/screenshot-1.png" alt="Страница достижений после сортировки и скрытия выполненных пунктов" loading="lazy" />
      <figcaption>Пример работы скрипта: выполненные пункты скрыты или приглушены, а невыполненные задачи остаются в фокусе.</figcaption>
    </figure>
  </section>

  <section class="script-card script-section">
    <h2>Как работает скрипт</h2>
    <ul class="feature-list">
      <li>На странице <code>info.ach.php?id=*</code> находит таблицы блоков достижений и обрабатывает их автоматически после загрузки.</li>
      <li>Для обычных блоков скрывает строки с прогрессом <code>100%</code>, чтобы в списке оставались только невыполненные пункты.</li>
      <li>Полностью завершённые группы (по счётчику вида <code>[total / middle / done]</code>, где <code>total = done</code>) переносит в конец своей колонки.</li>
      <li>Для блоков <code>[REP]</code> не скрывает завершённые пункты, а оставляет их внизу списка и делает полупрозрачными для визуального разделения.</li>
      <li>Имеет fallback для нестандартной вёрстки: если пункт не отдельной строкой, скрипт применяет скрытие/прозрачность к ячейке <code>td.simplewhitebg</code>.</li>
    </ul>
  </section>

  <section class="script-card">
    <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-AchievementsSort.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/GWars-AchievementsSort.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>
</div>
