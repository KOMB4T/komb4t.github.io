---
title: "[GWars] Plus Queue"
aliases:
  - scripts/plus-queue
draft: false
description: "Панель очереди замен в бою: учёт плюсов (+) в логе, место в очереди, подсказка «можно входить» для вашей стороны."
tags:
  - Бой
---

<style>
  body[data-slug="plus-queue"],
  body[data-slug="scripts/plus-queue"] {
    background: inherit;
  }

  body[data-slug="plus-queue"] .left.sidebar,
  body[data-slug="scripts/plus-queue"] .left.sidebar,
  body[data-slug="plus-queue"] .right.sidebar,
  body[data-slug="scripts/plus-queue"] .right.sidebar,
  body[data-slug="plus-queue"] .page-footer,
  body[data-slug="scripts/plus-queue"] .page-footer,
  body[data-slug="plus-queue"] hr,
  body[data-slug="scripts/plus-queue"] hr {
    display: none !important;
  }

  body[data-slug="plus-queue"] #quartz-body,
  body[data-slug="scripts/plus-queue"] #quartz-body {
    display: block;
  }

  body[data-slug="plus-queue"] .center,
  body[data-slug="scripts/plus-queue"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.35rem 1.6rem 3.2rem;
  }

  body[data-slug="plus-queue"] article.popover-hint,
  body[data-slug="scripts/plus-queue"] article.popover-hint {
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
      <p>На страницах лога боя и интерфейса боя показывает компактную панель «Очередь замен»: кто из односиндовцев отметился плюсом в логе, какой у вас номер и когда можно нажимать «Войти за…».</p>
      <span class="info-chip"><strong>Версия:</strong> 0.3</span>
    </div>

  <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-PlusQueue.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/GWars-PlusQueue.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>

  <section class="script-card script-section">
    <h2>Как этим пользоваться</h2>
    <ol class="feature-list" style="list-style: decimal;">
      <li><strong>Пришли в бой как наблюдатель</strong> — в панели видно, сколько человек уже в очереди замен.</li>
      <li><strong>Напишите в лог отдельное сообщение с «+»</strong> — попадёте в список; в шапке появится, сколько человек перед вами.</li>
      <li><strong>Дождитесь своей очереди</strong> — когда отобразится «можно входить», используйте штатную кнопку «Войти за…» для своей стороны.</li>
    </ol>
    <p class="support-box" style="margin: 0.75rem 0 0;">Поведение очереди на стороне игры задаёт правилами боя; скрипт только визуализирует и считает плюсы в логе.</p>
  </section>

  <section class="script-gallery">
    <figure>
      <img src="/plus-queue/screenshot-1.png" alt="Три шага: очередь замен, плюс в логе, можно входить" loading="lazy" />
      <figcaption>1 — видно, что в очереди уже один человек; 2 — после «+» в логе вы второй («перед вами 1»); 3 — зелёная подсказка «можно входить» и актуальная строка входа за персонажа.</figcaption>
    </figure>
  </section>

  <section class="script-card script-section">
    <h2>Что делает скрипт</h2>
    <ul class="feature-list">
      <li>Строит очередь по сообщениям с символом <strong>+</strong> в тексте лога боя (для своей стороны учитываются ники из состава вашего синдиката).</li>
      <li>Показывает заголовок вида «Очередь замен (N)», при необходимости — сколько человек перед вами и подсветку <strong>можно входить</strong>, когда вы следующий.</li>
      <li>Учитывает строки вида «ник входит в бой» для актуальности очереди.</li>
      <li>Работает на <code>warlog.php?bid=…</code> и <code>b0/b.php?bid=…</code>; состояние кэшируется в <code>localStorage</code> по номеру боя.</li>
    </ul>
  </section>

  <section class="script-card">
    <div class="script-actions">
      <a class="cta-primary" href="../scripts/GWars-PlusQueue.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/GWars-PlusQueue.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>
</div>
