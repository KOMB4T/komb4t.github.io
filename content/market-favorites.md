---
title: "[GWars] Market Favorites"
aliases:
  - scripts/market-favorites
draft: false
description: "Избранные лоты на Доске объявлений: выбирайте предмет с модификатором и запускайте поиск объявлений по кнопке."
tags:
  - Объявления
---

<style>
  body[data-slug="market-favorites"],
  body[data-slug="scripts/market-favorites"] {
    background: inherit;
  }

  body[data-slug="market-favorites"] .left.sidebar,
  body[data-slug="scripts/market-favorites"] .left.sidebar,
  body[data-slug="market-favorites"] .right.sidebar,
  body[data-slug="scripts/market-favorites"] .right.sidebar,
  body[data-slug="market-favorites"] .page-footer,
  body[data-slug="scripts/market-favorites"] .page-footer,
  body[data-slug="market-favorites"] hr,
  body[data-slug="scripts/market-favorites"] hr {
    display: none !important;
  }

  body[data-slug="market-favorites"] #quartz-body,
  body[data-slug="scripts/market-favorites"] #quartz-body {
    display: block;
  }

  body[data-slug="market-favorites"] .center,
  body[data-slug="scripts/market-favorites"] .center {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.35rem 1.6rem 3.2rem;
  }

  body[data-slug="market-favorites"] article.popover-hint,
  body[data-slug="scripts/market-favorites"] article.popover-hint {
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
      <p>Добавляет блок «Интересные лоты» на базовую страницу Доски объявлений, позволяет выбрать предмет (в том числе с модификатором) и вручную запускать поиск подходящих предложений.</p>
      <span class="info-chip"><strong>Версия:</strong> 0.3</span>
    </div>

  <div class="script-actions">
      <a class="cta-primary" href="../scripts/Gwars-MarketFavorites.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/Gwars-MarketFavorites.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
  </div>
  </section>

  <section class="script-card script-section">
    <h2>Что делает скрипт</h2>
    <ul class="feature-list">
      <li>На доску объявлений добавляет блок «Интересные лоты» с быстрыми ссылками и кнопками «Выбрать предметы» и «Поиск».</li>
      <li>Позволяет выбрать предмет с определенными модификаторами (карта модов встроена в скрипт), сохраняет избранное в localStorage.</li>
      <li>Отдельное модальное окно поиска неспешно загружает все страницы доски по каждому избранному предмету, фильтрует по модификатору и помечает новые, обновлённые и исчезнувшие предложения.</li>
      <li>В поиске есть фильтры G/Z/All, чекбокс «Прямая покупка» (скрывает предложения с перепиской) и индивидуальный потолок «Цена до» по каждому предмету — все настройки запоминаются.</li>
      <li>Горячая клавиша <kbd>Пробел</kbd> внутри окна поиска повторно запускает обновление; статус показывает счётчик просмотренных страниц.</li>
    </ul>
  </section>

  <section class="script-gallery">
    <figure>
      <img src="/market-favorites/screenshot-1.png" alt="Блок «Интересные лоты» и окно поиска" loading="lazy" />
      <figcaption>Список избранных предметов на базовой странице рынка и модальное окно поиска с фильтрами по острову, цене и типу покупки.</figcaption>
    </figure>
  </section>

  <section class="script-card">
    <div class="script-actions">
      <a class="cta-primary" href="../scripts/Gwars-MarketFavorites.user.js">Установить скрипт</a>
      <a class="cta-secondary" href="https://github.com/KOMB4T/komb4t.github.io/blob/refs/heads/v4/content/scripts/Gwars-MarketFavorites.user.js?plain=1" rel="noreferrer noopener">Открыть raw-версию</a>
    </div>
  </section>
</div>


