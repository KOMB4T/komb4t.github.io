---
title: GWars Public Scripts от KOMBAT
description: "Публичные версии моих userscript-ов для gwars.io"
draft: false
---

<style>
  body[data-slug="index"] nav.breadcrumbs,
  body[data-slug="index"] .page-header .content-meta {
    display: none !important;
  }

  body[data-slug="index"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3.5rem;
  }

  .catalog-layout {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .script-catalog {
    display: grid;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .tag-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 1.4rem 0 0.6rem;
  }

  .tag-filter button {
    border: 1px solid var(--lightgray);
    background: transparent;
    color: inherit;
    border-radius: 999px;
    padding: 0.35rem 0.8rem;
    font-size: 0.88rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .tag-filter button:hover {
    border-color: var(--secondary);
    color: var(--secondary);
  }

  .tag-filter button.is-active {
    background: var(--secondary);
    border-color: var(--secondary);
    color: var(--light);
  }

  :root[saved-theme="dark"] body[data-slug="index"] .tag-filter button {
    border-color: var(--darkgray);
  }

  body[data-slug="index"] .script-card {
    border: 1px solid var(--lightgray);
    border-radius: 12px;
    padding: 1.3rem 1.5rem;
    background: var(--light);
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  :root[saved-theme="dark"] body[data-slug="index"] .script-card {
    border-color: var(--darkgray);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: none;
  }

  body[data-slug="index"] .script-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }

  :root[saved-theme="dark"] body[data-slug="index"] .script-card:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }

  .catalog-hero p {
    margin: 0 0 0.8rem;
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--darkgray);
  }

  :root[saved-theme="dark"] .catalog-hero p {
    color: var(--gray);
  }

  .catalog-list h2,
  .catalog-install h2 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
  }

  .catalog-note {
    margin: 0;
    font-size: 0.92rem;
    color: var(--darkgray);
  }

  :root[saved-theme="dark"] .catalog-note {
    color: var(--gray);
  }

  .script-card h2 {
    margin: 0 0 0.35rem;
    font-size: 1.25rem;
  }

  .script-card p {
    margin: 0 0 0.75rem;
    color: var(--darkgray);
    font-size: 0.95rem;
  }

  .script-card .tag-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0 0 0.9rem;
    padding: 0;
    list-style: none;
  }

  .script-card .tag-list li {
    background: rgba(40, 75, 99, 0.12);
    color: inherit;
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    font-size: 0.82rem;
  }

  :root[saved-theme="dark"] .script-card .tag-list li {
    background: rgba(132, 165, 157, 0.22);
  }

  body[data-slug="index"] .script-card .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  body[data-slug="index"] .script-card .install-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.95rem;
    background: var(--secondary);
    color: var(--light);
    border-radius: 999px;
    font-size: 0.9rem;
    text-decoration: none;
    transition: opacity 0.15s ease-in-out;
  }

  :root[saved-theme="dark"] body[data-slug="index"] .script-card .install-link {
    color: var(--light);
  }

  body[data-slug="index"] .script-card .install-link:hover {
    opacity: 0.85;
  }

  body[data-slug="index"] .script-card .more-link {
    font-size: 0.9rem;
  }

  .install-steps {
    counter-reset: step;
    display: grid;
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .install-steps li {
    position: relative;
    padding-left: 2.2rem;
    line-height: 1.55;
  }

  .install-steps li::before {
    counter-increment: step;
    content: counter(step);
    position: absolute;
    left: 0;
    top: 0.1rem;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: var(--secondary);
    color: var(--light);
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .support-card {
    font-size: 0.95rem;
    color: var(--darkgray);
  }

  :root[saved-theme="dark"] .support-card {
    color: var(--gray);
  }
</style>

<div class="catalog-layout">
  <section class="script-card catalog-hero">
    <p>Стабильные версии скриптов для <strong>GanjaWars</strong>. Делают интерфейс удобнее, но не играют за вас — никаких запрещенных автоматизаций.</p>
    <p>Я формулирую задачу, а код пишет нейронка. Основной сценарий — десктоп, однако часть функций работает и в мобильных браузерах.</p>
  </section>

  <section class="script-card catalog-list">
    <h2>Опубликованные скрипты</h2>
    <p class="catalog-note">Выберите тег, чтобы показать только подходящие скрипты.</p>
    <div class="tag-filter" id="tag-filter">
      <button type="button" class="filter-reset" aria-label="Сбросить фильтры">Сбросить фильтр</button>
      <button type="button" data-tag="Ресурсы"># Ресурсы</button>
      <button type="button" data-tag="Сортировка"># Сортировка</button>
      <button type="button" data-tag="EUN"># EUN</button>      
    </div>
    <div class="script-catalog">
      <article class="script-card" data-tags="Ресурсы,Экономика">
        <h2><a href="eun-market-price">[GWars] EUN Market Price</a></h2>
        <p>Показывает реальный курс ГБ за 1 EUN, помечает выгодные лоты и помогает быстро сравнить предложения на бирже.</p>
        <ul class="tag-list">
          <li># EUN</li>
        </ul>
        <div class="actions">
          <a class="install-link" href="scripts/Gwars-EUNMarketPrice.user.js">Установить</a>
          <a class="more-link" href="eun-market-price">Подробнее →</a>
        </div>
      </article>
      <article class="script-card" data-tags="Ресурсы,Сортировка">
        <h2><a href="hide-enemy-realty">[GWars] Hide Enemy Realty on Market</a></h2>
        <p>На рынке ресурсов двигает зачеркнутые объекты в конец и добавляет удобную сортировку активных позиций.</p>
        <ul class="tag-list">
          <li># Ресурсы</li>
          <li># Сортировка</li>
        </ul>
        <div class="actions">
          <a class="install-link" href="scripts/%5BGWars%5DHideEnemyRealtyOnMarket.user.js">Установить</a>
          <a class="more-link" href="hide-enemy-realty">Подробнее →</a>
        </div>
      </article>
    </div>
  </section>

  <section class="script-card catalog-install">
    <h2>Как установить userscript</h2>
    <ol class="install-steps">
      <li>Поставьте менеджер — <a href="https://violentmonkey.github.io/get-it/" target="_blank" rel="noreferrer noopener">Violentmonkey</a> или <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer noopener">Tampermonkey</a> (Firefox, Chrome, Edge, Vivaldi, Safari и другие Chromium-браузеры).</li>
      <li>Нажмите «Установить» у выбранного скрипта на этой странице и подтвердите установку в расширении.</li>
      <li>Обновите вкладку с <code>gwars.io</code> — скрипт активируется сразу, а обновления прилетают автоматически через <code>@updateURL</code>.</li>
    </ol>
  </section>

  <section class="script-card support-card">
    <p>Нужен другой скрипт или нашли баг? <a href="https://www.gwars.io/sms-chat.php?id=339736" target="_blank" rel="noreferrer noopener">Напишите мне</a>, придумаем решение.</p>
  </section>
</div>
