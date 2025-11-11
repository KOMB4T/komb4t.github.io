---
title: "[GWars] EUN Market Price"
aliases:
  - scripts/eun-market-price
draft: false
description: "Показывает актуальный курс ГБ за 1 EUN прямо в интерфейсе рынка и подсвечивает выгодные сделки."
tags:
  - EUN
---

<style>
  body[data-slug="eun-market-price"],
  body[data-slug="eun-market-price/index"],
  body[data-slug="scripts/eun-market-price"],
  body[data-slug="scripts/eun-market-price/index"] {
    background: inherit;
  }

  body[data-slug="eun-market-price"] .left.sidebar,
  body[data-slug="eun-market-price/index"] .left.sidebar,
  body[data-slug="scripts/eun-market-price"] .left.sidebar,
  body[data-slug="scripts/eun-market-price/index"] .left.sidebar,
  body[data-slug="scripts/eun-market-price"] .right.sidebar,
  body[data-slug="scripts/eun-market-price/index"] .right.sidebar,
  body[data-slug="scripts/eun-market-price"] .page-footer,
  body[data-slug="scripts/eun-market-price/index"] .page-footer,
  body[data-slug="scripts/eun-market-price"] hr,
  body[data-slug="scripts/eun-market-price/index"] hr {
    display: none !important;
  }

  body[data-slug="eun-market-price"] #quartz-body,
  body[data-slug="eun-market-price/index"] #quartz-body,
  body[data-slug="scripts/eun-market-price"] #quartz-body,
  body[data-slug="scripts/eun-market-price/index"] #quartz-body {
    display: block;
  }

  body[data-slug="eun-market-price"] .center,
  body[data-slug="eun-market-price/index"] .center,
  body[data-slug="scripts/eun-market-price"] .center,
  body[data-slug="scripts/eun-market-price/index"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.35rem 1.6rem 3.2rem;
  }

  body[data-slug="eun-market-price"] article.popover-hint,
  body[data-slug="eun-market-price/index"] article.popover-hint,
  body[data-slug="scripts/eun-market-price"] article.popover-hint,
  body[data-slug="scripts/eun-market-price/index"] article.popover-hint {
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
      <p>Отображает живой курс обмена EUN прямо на рынке и помогает сравнивать предложения.</p>
      <span class="info-chip"><strong>Версия:</strong> 0.1</span>
    </div>

  <div class="script-actions">
      <a class="cta-primary" href="../scripts/Gwars-EUNMarketPrice.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://komb4t.github.io/scripts/Gwars-EUNMarketPrice.user.js" target="_blank" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>

  <section class="script-card script-section">
    <h2>Что делает скрипт</h2>
    <ul class="feature-list">
<<<<<<< HEAD
      <li>Подтягивает актуальный курс с доски объявлений (анализирует топ-3 предложения <code>market.php?stage=21</code>), кэширует его на 5 минут и показывает рядом с базовой ценой .</li>
      <li>Указывает сколько вы получите при продаже в гос. (‑10 %) прямо в блоке базовой цены.</li>
      <li>Пишет время обновления и минимальную цену лотов, чтобы понимать свежесть данных.</li>
      <li>Добавляет к каждой цене подсказку: курс чистого и «грязного» EUN текущего лота.</li>
      <li>Подсвечивает выгодные лоты, если цена продажи не выше текущего рыночного курса.</li>
=======
      <li>Подтягивает актуальный курс с биржи (<code>market.php?stage=21</code>), кэширует его на 5 минут и показывает рядом с базовой ценой (анализирует топ-3 предложения).</li>
      <li>Пишет время обновления и минимальную цену коммерческих лотов, чтобы понимать свежесть данных.</li>
      <li>Добавляет к каждой цене подсказку: курс чистого и «грязного» EUN текущего лота.</li>
      <li>Подсвечивает выгодные лоты, если цена продажи не выше текущего рыночного курса.</li>
      <li>Указывает сколько вы получите при продаже государству (‑10 %) прямо в блоке базовой цены.</li>
>>>>>>> 03508c509172678d69d0399f5a711b17fed818e5
    </ul>
  </section>

  <section class="script-gallery">
    <figure>
      <img src="/eun-market-price/screenshot-1.png" alt="Отображение курса EUN на ДО" loading="lazy" />
<<<<<<< HEAD
      <figcaption>Отображается рыночный курс EUN и расчет цены за чистый и грязный EUN. Выгодный курс за грязный EUN выделен жирным.</figcaption>
=======
      <figcaption>Отображается рыночный курс EUN и расчет цены за чистый и грязный EUN. Выгодная курс за грязный EUN выделен жирным.</figcaption>
>>>>>>> 03508c509172678d69d0399f5a711b17fed818e5
    </figure>
  </section>

  <section class="script-card">
    <div class="script-actions">
      <a class="cta-primary" href="../scripts/Gwars-EUNMarketPrice.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://komb4t.github.io/scripts/Gwars-EUNMarketPrice.user.js" target="_blank" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>
<<<<<<< HEAD
=======

  <section class="script-card script-section">
    <h2>Как установить</h2>
    <ul class="feature-list">
      <li>Установите менеджер пользовательских скриптов — <a href="https://violentmonkey.github.io/get-it/" target="_blank" rel="noreferrer noopener">Violentmonkey</a> или <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer noopener">Tampermonkey</a>.</li>
      <li>Нажмите кнопку «Установить скрипт» выше и подтвердите установку в появившемся окне.</li>
      <li>Перезагрузите вкладку с <code>gwars.io</code> — улучшения подхватятся автоматически. Обновления прилетают через <code>@updateURL</code>.</li>
    </ul>
  </section>

  <section class="support-box">
    Если нашли баг — <a href="https://www.gwars.io/sms-chat.php?id=339736" target="_blank" rel="noreferrer noopener">напишите мне</a>, посмотрим что можно сделать.
  </section>
>>>>>>> 03508c509172678d69d0399f5a711b17fed818e5
</div>
