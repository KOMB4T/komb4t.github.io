// ==UserScript==
// @name         [GWars] Ops UI
// @namespace    gwars-tools
// @version      1.2
// @description  Улучшения ops.php: сворачивание карточек с важностью ниже порога и текста описания (клик разворачивает), факты в одну строку, ссылка «К покупке» для рекомендаций «(нет в инвентаре)», сортировка карточек по важности, скрытие неразведанных фактов, подсветка шанса налёта.
// @match        https://www.gwars.io/ops.php*
// @grant        none
// @author       KOMB4T
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Настройки ----------
  // Порог важности по умолчанию: X/8 ниже порога => карточка сворачивается.
  // Переопределяется на странице (селектор рядом с «Объекты в разработке»).
  const DEFAULT_COLLAPSE_THRESHOLD = 7;
  const STORAGE_KEY_THRESHOLD = 'gwars-ops-ui-collapse-threshold';
  const SHOP_URL = 'https://www.gwars.io/shop.php?shop=shop_grenades';

  const STYLE_ID = 'gwars-ops-collapse-style';
  const CARD_COLLAPSED_CLASS = 'gwars-ops__card-collapsed';
  const STORY_COLLAPSED_CLASS = 'gwars-ops__story-collapsed';
  const HEAD_CLASS = 'gwars-ops__head-clickable';
  const BUY_LINK_CLASS = 'gwars-ops-buy';

  const IMPORTANCE_PATTERN = /(\d+)\s*\/\s*8/;
  // «РГО-1 (нет в инвентаре)», «РГД-2М (нет в инвентаре)» и т.п.
  // ВАЖНО: \w — только ASCII, кириллицу перечисляем явно
  const MISSING_ITEM_PATTERN = /([А-ЯЁA-Z0-9][А-ЯЁЁA-Zа-яёa-z0-9_\-]*)\s*\(нет в инвентаре\)/gi;

  // ---------- Стили ----------
  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HEAD_CLASS} { cursor: pointer; user-select: none; }
      .${HEAD_CLASS} .opcardname::before { content: '\\25B8\\00a0'; opacity: 0.6; }
      .opcard:not(.${CARD_COLLAPSED_CLASS}) .${HEAD_CLASS} .opcardname::before { content: '\\25BE\\00a0'; }
      .${CARD_COLLAPSED_CLASS} .opcardbody { display: none; }
      .${STORY_COLLAPSED_CLASS} {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }
      .${STORY_COLLAPSED_CLASS}:hover { opacity: 0.85; }
      /* Факты: метка и значение в одну строку, перенос только когда не хватает места */
      .opfact { display: flex; flex-wrap: wrap; column-gap: 0.4em; align-items: baseline; }
      .opfact .opfl, .opfact .opfv { display: inline; }
      .${BUY_LINK_CLASS} { margin-left: 6px; white-space: nowrap; font-weight: bold; }
      /* Факты: строки в один ряд, перенос только когда не хватает места */
      .opfacts { display: flex; flex-wrap: wrap; gap: 4px 1.2em; }
      /* Неразведанные факты (нет данных / неизвестно) скрыты */
      .gwars-ops__fact-empty { display: none !important; }
      /* Подсветка оценки налёта: зелёный >80%, жёлтый 40–80%, красный <40% */
      .gwars-ops__chance-good { color: #1a7f1a; font-weight: bold; }
      .gwars-ops__chance-mid { color: #b08000; font-weight: bold; }
      .gwars-ops__chance-bad { color: #b00000; font-weight: bold; }
    `;
    document.head.appendChild(style);
  };

  // ---------- Сворачивание карточек ----------
  const parseImportance = (card) => {
    const badge = card.querySelector('.opbadge');
    if (!badge) return null;
    const match = badge.textContent.match(IMPORTANCE_PATTERN);
    return match ? Number(match[1]) : null;
  };

  // Порог сворачивания: 0 = не сворачивать
  const getThreshold = () => {
    const raw = localStorage.getItem(STORAGE_KEY_THRESHOLD);
    const value = raw === null ? NaN : Number(raw);
    return Number.isNaN(value) ? DEFAULT_COLLAPSE_THRESHOLD : value;
  };

  // Применить порог к карточкам (ручные развороты в списке сбрасываются)
  const applyThreshold = (cards) => {
    const threshold = getThreshold();
    (cards || Array.from(document.querySelectorAll('.opcard'))).forEach((card) => {
      const importance = parseImportance(card);
      const collapse = importance !== null && importance < threshold;
      card.classList.toggle(CARD_COLLAPSED_CLASS, collapse);
    });
  };

  // Селектор порога рядом с заголовком «Объекты в разработке»
  const setupThresholdControl = () => {
    const header = Array.from(document.querySelectorAll('.ophead'))
      .find((el) => /Объекты в разработке/.test(el.textContent));
    if (!header || header.querySelector('.gwars-ops__threshold')) return;

    const select = document.createElement('select');
    select.className = 'gwars-ops__threshold';
    select.title = 'Объекты с важностью ниже выбранной будут свёрнуты';
    [['6', 'сворачивать < 6/8'], ['7', 'сворачивать < 7/8'], ['8', 'сворачивать < 8/8'], ['0', 'не сворачивать']]
      .forEach(([value, label]) => select.add(new Option(label, value)));
    select.value = String(getThreshold());
    select.addEventListener('change', () => {
      localStorage.setItem(STORAGE_KEY_THRESHOLD, select.value);
      applyThreshold();
    });

    const wrap = document.createElement('span');
    wrap.style.cssText = 'float:right;font-weight:normal;font-size:90%;opacity:0.85;';
    wrap.appendChild(select);
    header.appendChild(wrap);
  };

  const setupCard = (card) => {
    if (card.dataset.gwarsOpsCollapse) return;
    card.dataset.gwarsOpsCollapse = '1';

    const head = card.querySelector('.opcardhead');
    const story = card.querySelector('.opstory');

    // Карточка целиком: клик по шапке разворачивает/сворачивает
    if (head) {
      head.classList.add(HEAD_CLASS);
      head.addEventListener('click', () => {
        card.classList.toggle(CARD_COLLAPSED_CLASS);
      });
    }

    // Описание: по умолчанию одна строка, клик разворачивает/сворачивает
    if (story) {
      story.classList.add(STORY_COLLAPSED_CLASS);
      story.title = 'Клик — развернуть/свернуть описание';
      story.addEventListener('click', (event) => {
        event.stopPropagation();
        story.classList.toggle(STORY_COLLAPSED_CLASS);
      });
    }
  };

  // ---------- Ссылки «К покупке» ----------
  let shopDocPromise = null;

  // Грузим страницу магазина один раз и разбираем в DOM.
  // ВАЖНО: gwars.io отдаёт windows-1251 без charset в заголовках,
  // поэтому декодируем вручную — resp.text() ломает кириллицу.
  const loadShopDoc = () => {
    if (!shopDocPromise) {
      shopDocPromise = fetch(SHOP_URL, { credentials: 'same-origin' })
        .then((resp) => {
          if (!resp.ok) throw new Error(`shop.php: HTTP ${resp.status}`);
          return resp.arrayBuffer();
        })
        .then((buf) => new TextDecoder('windows-1251').decode(buf))
        .then((html) => new DOMParser().parseFromString(html, 'text/html'))
        .catch((err) => {
          shopDocPromise = null; // дать шанс повторить при следующем запуске
          throw err;
        });
    }
    return shopDocPromise;
  };

  // Ищем item_id предмета по его названию (например, «РГО-1» -> «rgo»)
  const findItemId = (shopDoc, itemName) => {
    const link = Array.from(shopDoc.querySelectorAll('a[itemtype="simpleitem"]'))
      .find((a) => a.textContent.trim() === itemName);
    if (!link) return null;
    const idMatch = (link.getAttribute('href') || '').match(/item_id=([\w\-]+)/);
    return idMatch ? idMatch[1] : null;
  };

  const attachBuyLinks = (factValue) => {
    const names = [];
    let match;
    MISSING_ITEM_PATTERN.lastIndex = 0;
    while ((match = MISSING_ITEM_PATTERN.exec(factValue.textContent)) !== null) {
      names.push(match[1]);
    }
    if (!names.length) return;

    loadShopDoc()
      .then((shopDoc) => {
        names.forEach((name) => {
          if (factValue.querySelector(`.${BUY_LINK_CLASS}[data-item="${name}"]`)) return;
          const itemId = findItemId(shopDoc, name);
          if (!itemId) {
            console.warn(`[GWars] Ops UI: предмет «${name}» не найден в магазине`);
            return;
          }

          const link = document.createElement('a');
          link.href = `${SHOP_URL}#${itemId}`;
          link.textContent = 'К покупке »';
          link.className = BUY_LINK_CLASS;
          link.dataset.item = name;

          factValue.appendChild(document.createTextNode(' '));
          factValue.appendChild(link);
        });
      })
      .catch((err) => console.warn('[GWars] Ops UI:', err));
  };

  // ---------- Факты ----------
  // Неразведанные значения не несут информации — прячем целиком
  const EMPTY_VALUE_PATTERN = /нет данных|неизвестно|неизвестен|неизвестна/i;

  const setupFacts = () => {
    document.querySelectorAll('.opfact').forEach((fact) => {
      const label = fact.querySelector('.opfl');
      const value = fact.querySelector('.opfv');
      if (!label || !value) return;
      if (EMPTY_VALUE_PATTERN.test(value.textContent.trim())) {
        fact.classList.add('gwars-ops__fact-empty');
        return;
      }
      if (/Рекомендации/.test(label.textContent) && /нет в инвентаре/.test(value.textContent)) {
        attachBuyLinks(value);
      }
    });
  };

  // ---------- Оценка налёта ----------
  // Проценты бывают и без <b> («с предметом 81% / 2%») — жирим и красим все
  // вхождения числа с %. Формат стабильный: проценты идут парами
  // (успех, крит. провал) — чётный по счёту => успех, нечётный => провал.
  const CHANCE_PERCENT_PATTERN = /(\d+)(\s*%)/g;

  const setupChance = () => {
    document.querySelectorAll('.opchance').forEach((chance) => {
      // Обходим текстовые узлы; пропускаем уже обработанные (наши span'ы)
      const walker = document.createTreeWalker(chance, NodeFilter.SHOW_TEXT);
      const nodesToWrap = [];
      let percentIndex = 0;
      let node;
      while ((node = walker.nextNode()) !== null) {
        if (node.parentElement.closest('.gwars-ops__chance-wrap')) continue;
        CHANCE_PERCENT_PATTERN.lastIndex = 0;
        let m;
        while ((m = CHANCE_PERCENT_PATTERN.exec(node.data)) !== null) {
          nodesToWrap.push({ node, start: m.index, end: m.index + m[0].length, isSuccess: percentIndex % 2 === 0 });
          percentIndex++;
        }
      }

      // Оборачиваем с конца, чтобы позиции в узле не съезжали
      nodesToWrap.reverse().forEach(({ node: textNode, start, end, isSuccess }) => {
        const span = document.createElement('span');
        span.className = 'gwars-ops__chance-wrap';
        const pct = Number(textNode.data.slice(start, end).match(/(\d+)/)[1]);
        if (isSuccess) {
          const cls = pct > 80 ? 'good' : pct >= 40 ? 'mid' : 'bad';
          span.classList.add(`gwars-ops__chance-${cls}`);
        } else if (pct > 10) {
          // Критический провал: красный, если больше 10%
          span.classList.add('gwars-ops__chance-bad');
        }
        span.textContent = textNode.data.slice(start, end);
        const after = textNode.splitText(end);
        textNode.deleteData(start, end - start);
        textNode.parentNode.insertBefore(span, after);
      });
    });
  };

  // Карточки сортируем по важности (по убыванию) внутри своей панели.
  // ВАЖНО: если порядок уже правильный — не трогаем DOM,
  // иначе MutationObserver зациклится на собственных перестановках.
  const sortCards = () => {
    document.querySelectorAll('.oppanel').forEach((panel) => {
      const cards = Array.from(panel.querySelectorAll('.opcard'));
      if (cards.length < 2) return;
      const sorted = [...cards].sort((a, b) => (parseImportance(b) ?? 0) - (parseImportance(a) ?? 0));
      if (sorted.every((card, i) => card === cards[i])) return;
      const marker = document.createElement('span'); // якорь: карточки встают до него
      cards[0].before(marker);
      sorted.forEach((card) => marker.before(card));
      marker.remove();
    });
  };

  // ---------- Сводка «За сегодня» ----------
  // Суммируем боевой опыт и стоимость груза из архива за текущую дату.
  // В архиве дата «ДД.ММ ЧЧ:ММ», цифры с разделителем-запятой («+102,732»).
  const DAILY_SUMMARY_CLASS = 'gwars-ops__daily';
  const parseAmount = (text) => {
    const m = text && text.match(/\+([\d,]+)/);
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  };
  const formatAmount = (n) => n.toLocaleString('ru-RU');

  const setupDailySummary = () => {
    const header = Array.from(document.querySelectorAll('.ophead'))
      .find((el) => /Объекты в разработке/.test(el.textContent));
    if (!header) return;

    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;

    let xp = 0;
    let cargo = 0;
    let questXp = 0;
    let raids = 0;
    document.querySelectorAll('.oparchline').forEach((line) => {
      const dateEl = line.querySelector('.opsm');
      if (!dateEl || !dateEl.textContent.trim().startsWith(today)) return;
      const bold = line.querySelector('b');
      const details = bold ? bold.getAttribute('jstitle') || '' : '';
      const xpMatch = details.match(/Боевой опыт:\s*\+[\d,]+/);
      const cargoMatch = details.match(/Стоимость груза:\s*\+[\d,]+/);
      const questMatch = details.match(/Квестовый опыт:\s*\+[\d,]+/);
      if (xpMatch) xp += parseAmount(xpMatch[0]);
      if (cargoMatch) cargo += parseAmount(cargoMatch[0]);
      if (questMatch) questXp += parseAmount(questMatch[0]);
      raids++;
    });

    const text = raids
      ? `За сегодня: боевой опыт <b>+${formatAmount(xp)}</b> &nbsp; груз <b>+${formatAmount(cargo)}</b>&nbsp;Гб &nbsp; квестовый опыт <b>+${formatAmount(questXp)}</b> <span class=opsm>(налётов: ${raids})</span>`
      : 'За сегодня: налётов ещё не было';

    // Идемпотентность: обновляем строку только при изменении текста,
    // иначе MutationObserver зациклится на собственной вставке.
    // Вёрстка повторяет штатную панель состояния (table.opbar > td.opst).
    let summary = document.querySelector(`.${DAILY_SUMMARY_CLASS}`);
    if (summary && summary.dataset.text === text) return;
    if (!summary) {
      summary = document.createElement('table');
      summary.className = `opbar ${DAILY_SUMMARY_CLASS}`;
      summary.setAttribute('cellpadding', '5');
      summary.setAttribute('cellspacing', '1');
      const row = summary.insertRow();
      const cell = row.insertCell();
      cell.className = 'opst';
      header.parentNode.insertBefore(summary, header);
    }
    summary.dataset.text = text;
    summary.querySelector('td').innerHTML = text;
  };

  // ---------- Запуск и слежение за DOM ----------
  // Страница обновляет блоки через AJAX — улучшаем только новые элементы,
  // чтобы не сбрасывать ручные развороты и не дублировать обработчики.
  const enhance = () => {
    const newCards = Array.from(document.querySelectorAll('.opcard'))
      .filter((card) => !card.dataset.gwarsOpsCollapse);
    newCards.forEach(setupCard);
    applyThreshold(newCards); // порог — только новым карточкам
    sortCards();
    setupThresholdControl();
    setupFacts();
    setupChance();
    setupDailySummary();
  };

  const init = () => {
    injectStyle();
    enhance();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return; // дребезг: одна обработка на пачку мутаций
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        enhance();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  init();
})();
