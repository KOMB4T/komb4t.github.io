// ==UserScript==
// @name         Gwars-MarketFavorites
// @namespace    https://gwars.io/
// @version      0.3
// @description  Избранные лоты на странице Доски объявлений: выбор предмета с модификатором, ручной запуск поиска объявлений.
// @author       KOMB4T
// @match        https://www.gwars.io/market.php*
// @updateURL    https://raw.githubusercontent.com/komb4t.github.io/scripts/Gwars-MarketFavorites.user.js
// @downloadURL  https://raw.githubusercontent.com/komb4t.github.io/scripts/Gwars-MarketFavorites.user.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'gwars:favLots';
  const MODS_CACHE_KEY = 'gwars:favLots:modsMap';

  // Связка предмета и модификатора в base64
  const INLINE_MODS_B64_CHUNKS = [
    `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`
  ];
  const INLINE_MODS_IS_GZIP = true;
  const PRICE_FILTER_KEY = 'gwars:favLots:priceFilter';
  const DIRECT_FILTER_KEY = 'gwars:favLots:directOnly';

  // Оставлено как запасной вариант; можно очистить, если внешний URL не нужен.
  const MODS_MAP_URL = '';

  const state = {
    favorites: [],
    categories: [],
    modsMap: {},
  };
  let priceFilters = loadPriceFilters();
  let directOnlyCache = loadDirectFilter();

  runWhenReady(async () => {
    const isBaseMarket =
      location.pathname === '/market.php' && (!location.search || location.search === '');
    if (!isBaseMarket) return;

    state.categories = collectCategories();
    state.favorites = loadFavorites();
    state.modsMap = await loadModsMap();

    injectStyles();
    const favTable = createFavoritesTable();
    insertAfterEunTable(favTable);
    renderFavorites(favTable);
  });

  function runWhenReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function loadPriceFilters() {
    try {
      const raw = localStorage.getItem(PRICE_FILTER_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function loadDirectFilter() {
    try {
      return localStorage.getItem(DIRECT_FILTER_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function saveDirectFilter(val) {
    try {
      localStorage.setItem(DIRECT_FILTER_KEY, val ? '1' : '');
    } catch (_) {
      /* ignore */
    }
  }
  function savePriceFilters() {
    try {
      localStorage.setItem(PRICE_FILTER_KEY, JSON.stringify(priceFilters));
    } catch (_) {
      /* ignore */
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites));
    } catch (_) {
      /* игнорируем */
    }
  }

  async function loadModsMap() {
    // 0. инлайн
    const inline = await loadInlineMods();
    if (inline) return inline;

    // 1. кеш
    const cached = loadCachedMods();
    if (cached) return cached;

    // 2. resource (если указана в метаданных)
    if (typeof GM_getResourceText === 'function') {
      try {
        const raw = GM_getResourceText('modsMap');
        if (raw) {
          const parsed = JSON.parse(raw);
          saveModsCache(parsed);
          return parsed;
        }
      } catch (_) {
        /* игнорируем и пробуем дальше */
      }
    }

    // 3. загрузка по URL (если указан)
    if (MODS_MAP_URL) {
      try {
        const res = await fetch(MODS_MAP_URL, { cache: 'no-store' });
        if (res.ok) {
          const parsed = await res.json();
          saveModsCache(parsed);
          return parsed;
        }
      } catch (_) {
        /* игнорируем */
      }
    }

    console.warn('[Gwars-MarketFavorites] Не удалось загрузить карту модов');
    return {};
  }

  async function loadInlineMods() {
    if (!INLINE_MODS_B64_CHUNKS.length) return null;
    const b64 = INLINE_MODS_B64_CHUNKS.join('').replace(/\s+/g, '');
    const text = await decodeBase64ToText(b64, INLINE_MODS_IS_GZIP);
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      saveModsCache(parsed);
      return parsed;
    } catch (err) {
      console.error('[Gwars-MarketFavorites] Ошибка парсинга inline карты модов', err);
      return null;
    }
  }

  function loadCachedMods() {
    try {
      const raw = localStorage.getItem(MODS_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveModsCache(map) {
    try {
      localStorage.setItem(MODS_CACHE_KEY, JSON.stringify(map));
    } catch (_) {
      /* ignore */
    }
  }

  function collectCategories() {
    const tables = Array.from(document.querySelectorAll('table.cat_items'));
    return tables.map((table) => {
      const nameCell = table.querySelector('tr td.greenbg_red');
      const name = nameCell ? nameCell.textContent.trim() : 'Без категории';
      const links = Array.from(table.querySelectorAll('a[href*="item_id"]'));
      const items = links.map((a) => {
        const href = a.getAttribute('href') || '';
        const params = new URLSearchParams(href.split('?')[1] || '');
        const itemId = params.get('item_id') || '';
        const rawText = (a.textContent || '').trim();
        const itemName = rawText.replace(/\s*\([^)]*\)\s*$/, '').trim();
        return {
          id: itemId,
          name: itemName,
          href: href,
        };
      });
      return { name, items };
    });
  }

  function createFavoritesTable() {
    const table = document.createElement('table');
    table.setAttribute('cellspacing', '1');
    table.setAttribute('cellpadding', '5');
    table.setAttribute('border', '0');
    table.style.minWidth = '300px';

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    const headerRow = document.createElement('tr');
    const headerCell = document.createElement('td');
    headerCell.className = 'greenbg_red';
    headerCell.align = 'center';
    headerCell.textContent = 'Интересные лоты';
    headerRow.appendChild(headerCell);
    tbody.appendChild(headerRow);

    const contentRow = document.createElement('tr');
    const contentCell = document.createElement('td');
    contentCell.className = 'greenlightbg';
    contentCell.align = 'center';
    contentRow.appendChild(contentCell);
    tbody.appendChild(contentRow);

    const buttonsWrap = document.createElement('div');
    buttonsWrap.className = 'gw-fav-actions';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Выбрать предметы';
    openBtn.className = 'gw-fav-btn';
    openBtn.addEventListener('click', () => openModal(table));

    const searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.textContent = 'Поиск';
    searchBtn.className = 'gw-fav-search-btn';
    searchBtn.addEventListener('click', () => openSearchModal(table));

    buttonsWrap.appendChild(openBtn);
    buttonsWrap.appendChild(searchBtn);

    const listContainer = document.createElement('div');
    listContainer.className = 'gw-fav-list';

    contentCell.appendChild(buttonsWrap);
    contentCell.appendChild(listContainer);

    return table;
  }

  function insertAfterEunTable(favTable) {
    const targetHeader = Array.from(document.querySelectorAll('td.greenbg_red')).find(
      (td) => /Поиск\s+EUN/i.test(td.textContent || '')
    );
    const targetTable = targetHeader ? targetHeader.closest('table') : null;
    if (targetTable && targetTable.parentElement) {
      targetTable.parentElement.insertBefore(favTable, targetTable.nextSibling);
    } else {
      document.body.appendChild(favTable);
    }
  }

  function renderFavorites(favTable) {
    const listContainer = favTable.querySelector('.gw-fav-list');
    listContainer.innerHTML = '';

    if (!state.favorites.length) {
      const empty = document.createElement('div');
      empty.className = 'gw-fav-empty';
      empty.textContent = 'Пока ничего не выбрано';
      listContainer.appendChild(empty);
      return;
    }

    state.favorites.forEach((fav, idx) => {
      const row = document.createElement('div');
      row.className = 'gw-fav-item';

      const title = document.createElement('span');
      title.textContent = fav.modCode ? `${fav.name} ${fav.modCode}` : fav.name;

      const link = document.createElement('a');
      link.href = fav.href || `/market.php?stage=2&item_id=${fav.itemId}&action_id=1&island=0`;
      link.textContent = 'на рынок';
      link.className = 'clr';

      const modLink =
        fav.modId && fav.itemId
          ? (() => {
              const a = document.createElement('a');
              a.href = `/item.php?item_id=${fav.itemId}&m=${fav.modId}`;
              a.textContent = 'мод';
              a.className = 'clr';
              return a;
            })()
          : null;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'gw-fav-del';
      delBtn.textContent = '×';
      delBtn.title = 'Удалить';
      delBtn.addEventListener('click', () => {
        state.favorites.splice(idx, 1);
        saveFavorites();
        renderFavorites(favTable);
      });

      row.appendChild(title);
      row.appendChild(link);
      if (modLink) {
        row.appendChild(modLink);
      }
      row.appendChild(delBtn);

      listContainer.appendChild(row);
    });
  }

  function openModal(favTable) {
    let modal = document.querySelector('.gw-fav-add-modal');
    if (!modal) {
      modal = buildModal(favTable);
      document.body.appendChild(modal);
    }
    modal.classList.add('gw-open');
  }

  function openSearchModal(favTable) {
    let modal = document.querySelector('.gw-fav-search-modal');
    if (!modal) {
      modal = buildSearchModal(favTable);
      document.body.appendChild(modal);
    }
    modal.classList.add('gw-open');
    runSearch(modal, favTable);

    const refreshBtn = modal.querySelector('.gw-fav-add');
    addSearchHotkeys(modal, refreshBtn);
  }

  function buildSearchModal(favTable) {
    const overlay = document.createElement('div');
    overlay.className = 'gw-fav-modal gw-fav-search-modal';

    const box = document.createElement('div');
    box.className = 'gw-fav-box';
    overlay.appendChild(box);

    const title = document.createElement('div');
    title.className = 'gw-fav-box__title';
    title.textContent = 'Поиск интересных лотов';

    const ts = document.createElement('span');
    ts.className = 'gw-fav-ts';
    ts.textContent = '';

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.textContent = 'Обновить';
    refreshBtn.className = 'gw-fav-add';
    refreshBtn.title = 'Можно просто нажимать пробел!';
    refreshBtn.addEventListener('click', () => runSearch(overlay, favTable));
    title.appendChild(refreshBtn);
    title.appendChild(ts);

    const statusWrap = document.createElement('div');
    statusWrap.className = 'gw-fav-status';
    const spinner = document.createElement('div');
    spinner.className = 'gw-fav-spinner';
    const spinnerRing = document.createElement('div');
    spinnerRing.className = 'gw-fav-spinner-ring';
    const spinnerCounter = document.createElement('div');
    spinnerCounter.className = 'gw-fav-spinner-counter';
    spinnerCounter.textContent = '0';
    spinner.appendChild(spinnerRing);
    spinner.appendChild(spinnerCounter);
    statusWrap.appendChild(spinner);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gw-fav-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      removeSearchHotkeys(overlay);
      overlay.classList.remove('gw-open');
    });
    title.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'gw-fav-results';
    content.textContent = 'Загрузка...';

    box.appendChild(title);
    box.appendChild(statusWrap);
    box.appendChild(content);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        removeSearchHotkeys(overlay);
        overlay.classList.remove('gw-open');
      }
    });

    return overlay;
  }

  async function runSearch(modal, favTable) {
    const content = modal.querySelector('.gw-fav-results');
    const ts = modal.querySelector('.gw-fav-ts');
    if (!content) return;

    const statusWrap = modal.querySelector('.gw-fav-status');
    const spinnerCounter = modal.querySelector('.gw-fav-spinner-counter');
    if (spinnerCounter) spinnerCounter.textContent = '0';
    const refreshBtn = modal.querySelector('.gw-fav-add');
    if (refreshBtn) refreshBtn.disabled = true;
    if (statusWrap) statusWrap.classList.add('gw-loading');

    console.log('[GW-Fav] Запуск поиска по избранному', state.favorites);

    let globalSteps = 0;
    const perItemCache = new Map();
    const results = [];
    for (const fav of state.favorites) {
      console.log('[GW-Fav] Поиск лота', fav);
      const allOffers = await fetchOffersForItem(fav.itemId, () => {
        globalSteps += 1;
        if (spinnerCounter) spinnerCounter.textContent = String(globalSteps);
      }, perItemCache);
      const offers = filterOffersForFav(allOffers, fav);
      console.log('[GW-Fav] Найдено предложений', offers.length, 'для', fav);
      results.push({ fav, offers });
    }

    renderSearchResults(content, results, favTable);
    if (ts) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      ts.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    }
    if (statusWrap) statusWrap.classList.remove('gw-loading');
    if (refreshBtn) refreshBtn.disabled = false;
  }

  function renderSearchResults(container, results, favTable) {
    const prevFilter = container.dataset.islFilter || '';
    const previousRows =
      container.dataset.hasPrevious === '1'
        ? Array.from(container.querySelectorAll('tr[data-offer-key]:not(.gw-fav-removed)')).map(
            (tr) => {
              const tds = tr.querySelectorAll('td');
              const actionA = tds[5]?.querySelector('a');
              return {
                key: tr.dataset.offerKey || '',
                hash: tr.dataset.offerHash || '',
                groupKey: tr.dataset.groupKey || '',
                isl: tr.dataset.isl || '',
                price: tds[0]?.textContent.trim() || '',
                durability: tds[1]?.textContent.trim() || '',
                mod: tds[2]?.textContent.trim() || '',
                owner: tds[4]?.textContent.trim() || '',
                actionHref: actionA ? actionA.getAttribute('href') : '#',
                actionLabel: actionA ? actionA.textContent.trim() : '',
              };
            }
          )
        : [];
    const previousMap =
      previousRows.length > 0
        ? new Map(previousRows.map((row) => [row.key, row.hash || '']))
        : null;
    container.innerHTML = '';
    if (!results.length) {
      container.textContent = 'Список избранных пуст.';
      return;
    }

    const allRows = [];
    const currentKeys = new Set();
    const groupTbodyMap = new Map();

    const filterBar = document.createElement('div');
    filterBar.className = 'gw-fav-filterbar';

    const globalFilter = document.createElement('div');
    globalFilter.className = 'gw-fav-isl-filter';
    const btnAll = makeIslFilterButton('All', '', () => applyFilters(currentIsl, directOnly));
    const btnG = makeIslFilterButton('[G]', 'G', () => applyFilters('G', directOnly));
    const btnZ = makeIslFilterButton('[Z]', 'Z', () => applyFilters('Z', directOnly));
    globalFilter.appendChild(btnG);
    globalFilter.appendChild(btnZ);
    globalFilter.appendChild(btnAll);

    const directWrap = document.createElement('label');
    directWrap.className = 'gw-fav-direct';
    const directChk = document.createElement('input');
    directChk.type = 'checkbox';
    directChk.checked =
      container.dataset.directOnly === '1' || directOnlyCache || container.dataset.directOnly === '';
    const directText = document.createElement('span');
    directText.textContent = 'Прямая покупка';
    directWrap.appendChild(directChk);
    directWrap.appendChild(directText);

    filterBar.appendChild(globalFilter);
    filterBar.appendChild(directWrap);
    container.appendChild(filterBar);

    let currentIsl = prevFilter;
    let directOnly = directChk.checked;
    directChk.addEventListener('change', () => {
      directOnly = directChk.checked;
      container.dataset.directOnly = directOnly ? '1' : '';
      saveDirectFilter(directOnly);
      applyFilters(currentIsl, directOnly);
    });

    results.forEach(({ fav, offers }) => {
      const wrap = document.createElement('div');
      wrap.className = 'gw-fav-result-block';

      const header = document.createElement('div');
      header.className = 'gw-fav-result-title';
      const titleText = document.createElement('span');
      titleText.textContent = fav.modCode ? `${fav.name} ${fav.modCode}` : fav.name;

      const groupKey = `${fav.itemId}|${fav.modCode || ''}`;
      const priceInputWrap = document.createElement('label');
      priceInputWrap.className = 'gw-fav-price-filter';
      const priceLabel = document.createElement('span');
      priceLabel.textContent = 'Цена до:';
      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.min = '0';
      priceInput.step = '1000';
      priceInput.value = priceFilters[groupKey] || '';
      priceInput.addEventListener('input', () => {
        const val = priceInput.value.trim();
        if (val) {
          priceFilters[groupKey] = val;
        } else {
          delete priceFilters[groupKey];
        }
        savePriceFilters();
        applyPriceFilter(val ? Number(val) : null);
      });
      priceInputWrap.appendChild(priceLabel);
      priceInputWrap.appendChild(priceInput);

      header.appendChild(titleText);
      header.appendChild(priceInputWrap);
      wrap.appendChild(header);

      if (!offers.length) {
        const empty = document.createElement('div');
        empty.className = 'gw-fav-empty';
        empty.textContent = 'Нет предложений';
        wrap.appendChild(empty);
        container.appendChild(wrap);
        return;
      }

      const table = document.createElement('table');
      table.className = 'gw-fav-result-table';
      const thead = document.createElement('thead');
      thead.innerHTML =
        '<tr><th>Цена</th><th>Прочность</th><th>Mod</th><th>Isl</th><th>Владелец</th><th>Действие</th></tr>';
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const rows = offers.map((offer) => {
        const tr = document.createElement('tr');
        const key = extractOfferKey(offer);
        const hash = hashOffer(offer);
        tr.dataset.offerHash = hash;
        tr.dataset.offerKey = key;
        tr.dataset.groupKey = groupKey;
        tr.dataset.isl = offer.isl || '';
        tr.dataset.islVisible = '1';
        tr.dataset.priceVisible = '1';
        tr.dataset.priceValue = parsePriceToNumber(offer.price);
        currentKeys.add(key);
        if (/^написать$/i.test(offer.actionLabel || '')) {
          tr.classList.add('gw-fav-row-write');
        }
        if (previousMap) {
          if (!previousMap.has(key)) {
            tr.classList.add('gw-fav-new');
          } else if (previousMap.get(key) !== hash) {
            tr.classList.add('gw-fav-updated');
          }
        }
        tr.innerHTML = `
          <td>${offer.price}</td>
          <td>${offer.durability}</td>
          <td>${offer.mod || '-'}</td>
          <td>${offer.isl}</td>
          <td>${offer.owner}</td>
          <td><a class="clr" href="${offer.actionHref}" target="_blank">${offer.actionLabel}</a></td>
        `;
        tbody.appendChild(tr);
        return tr;
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      container.appendChild(wrap);
      allRows.push(...rows);
      groupTbodyMap.set(groupKey, { tbody, rows });

      applyPriceFilter(priceInput.value ? Number(priceInput.value) : null);

      function applyPriceFilter(limit) {
        rows.forEach((tr, idx) => {
          const priceVal = tr.dataset.priceValue ? Number(tr.dataset.priceValue) : NaN;
          const okPrice = !limit || (!Number.isNaN(priceVal) && priceVal <= limit);
          tr.dataset.priceVisible = okPrice ? '1' : '0';
          updateRowDisplay(tr);
        });
      }
    });

    // добавляем удалённые строки (один цикл после первой загрузки)
    if (previousRows.length) {
      previousRows.forEach((row) => {
        if (currentKeys.has(row.key)) return;
        const group = groupTbodyMap.get(row.groupKey);
        if (!group) return;
        const tr = document.createElement('tr');
        tr.dataset.offerKey = row.key;
        tr.dataset.offerHash = row.hash || '';
        tr.dataset.groupKey = row.groupKey || '';
        tr.dataset.isl = row.isl || '';
        tr.dataset.islVisible = '1';
        tr.dataset.priceVisible = '1';
        tr.classList.add('gw-fav-removed');
        tr.innerHTML = `
          <td>${row.price}</td>
          <td>${row.durability}</td>
          <td>${row.mod}</td>
          <td>${row.isl}</td>
          <td>${row.owner}</td>
          <td><a class="clr" href="${row.actionHref}" target="_blank">${row.actionLabel || '—'}</a></td>
        `;
        group.tbody.appendChild(tr);
        group.rows.push(tr);
        allRows.push(tr);
      });
    }

    applyFilters(currentIsl, directOnly);
    container.dataset.hasPrevious = '1';

    function applyFilters(filter, direct) {
      currentIsl = filter;
      directOnly = direct;
      allRows.forEach((tr) => {
        const isl = (tr.dataset.isl || '').toUpperCase();
        const matchIsl = !filter || isl === `[${filter}]` || isl === filter;
        const isWrite = tr.classList.contains('gw-fav-row-write');
        const matchDirect = !direct || !isWrite;
        tr.dataset.islVisible = matchIsl && matchDirect ? '1' : '0';
        updateRowDisplay(tr);
      });
      [btnG, btnZ, btnAll].forEach((btn) => btn.classList.remove('gw-fav-isl-active'));
      if (filter === 'G') btnG.classList.add('gw-fav-isl-active');
      else if (filter === 'Z') btnZ.classList.add('gw-fav-isl-active');
      else btnAll.classList.add('gw-fav-isl-active');
      container.dataset.islFilter = filter;
    }
  }

  function updateRowDisplay(tr) {
    const islOk = tr.dataset.islVisible !== '0';
    const priceOk = tr.dataset.priceVisible !== '0';
    tr.style.display = islOk && priceOk ? '' : 'none';
  }

  function hashOffer(offer) {
    return [
      offer.price,
      offer.durability,
      offer.mod || '',
      offer.isl || '',
      offer.owner || '',
      offer.actionHref || '',
      offer.actionLabel || '',
    ]
      .join('|')
      .toLowerCase();
  }

  function extractOfferKey(offer) {
    const href = offer.actionHref || '';
    const sellMatch = href.match(/sell_id=([0-9]+)/i);
    if (sellMatch) return `sell:${sellMatch[1]}`;
    const smsMatch = href.match(/sms-chat\.php\?id=([0-9]+)/i);
    if (smsMatch) return `sms:${smsMatch[1]}`;
    return `own:${(offer.owner || '').toLowerCase()}|${(offer.mod || '').toLowerCase()}|${(
      offer.isl || ''
    ).toLowerCase()}`;
  }

  function parsePriceToNumber(text) {
    if (!text) return NaN;
    const digits = text.replace(/[^\d]/g, '');
    return digits ? Number(digits) : NaN;
  }

  function addSearchHotkeys(modal, refreshBtn) {
    removeSearchHotkeys(modal);
    const handler = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (isFormField(e.target)) return;
        e.preventDefault();
        refreshBtn?.click();
      }
    };
    modal._refreshHandler = handler;
    document.addEventListener('keydown', handler);
  }

  function removeSearchHotkeys(modal) {
    if (modal && modal._refreshHandler) {
      document.removeEventListener('keydown', modal._refreshHandler);
      modal._refreshHandler = null;
    }
  }

  function isFormField(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (['input', 'textarea', 'select', 'option', 'button'].includes(tag)) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function makeIslFilterButton(text, value, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.className = 'gw-fav-isl-btn';
    btn.addEventListener('click', onClick);
    return btn;
  }

  async function fetchOffersForFavorite(fav, onPage) {
    return fetchOffersForItem(fav.itemId, onPage).then((all) => filterOffersForFav(all, fav));
  }

  async function fetchOffersForItem(itemId, onPage, cache) {
    if (cache && cache.has(itemId)) {
      return cache.get(itemId);
    }
    const res = [];
    let page = 0;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    while (true) {
      const url = `/market.php?stage=2&item_id=${encodeURIComponent(
        itemId
      )}&action_id=1&island=-1&page_id=${page}`;
      console.log('[GW-Fav] Fetch page', page, 'url', url);
      const html = await fetchText(url);
      if (!html) break;

      const snippet = html.slice(0, 400);
      console.debug('[GW-Fav] HTML snippet', { page, url, snippet });

      const parsed = parseMarketPage(html);
      if (!parsed) {
        console.warn('[GW-Fav] parseMarketPage вернул null/undefined, прерываем');
        break;
      }
      const { offers, hasRows } = parsed;
      console.log('[GW-Fav] Page', page, 'offers', offers.length, 'hasRows', hasRows);
      res.push(...offers);
      if (!hasRows) break;
      if (onPage) onPage();

      page += 1;
      await delay(1000); // экологично: пауза между страницами
    }

    if (cache) cache.set(itemId, res);
    return res;
  }

  function parseMarketPage(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const lotTable = findMarketTable(doc);
    if (!lotTable) {
      console.log('[GW-Fav] Таблица с ценой не найдена');
      return { offers: [], hasRows: false };
    }

    const rows = Array.from(lotTable.querySelectorAll('tr')).slice(1); // skip header
    console.log('[GW-Fav] Строк в таблице', rows.length);
    const offers = [];
    let priceRows = 0;
    rows.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 5) return;
      const price = (tds[0].textContent || '').trim();
      if (!price.includes('$')) return;
      priceRows += 1;

      const durability = (tds[1].textContent || '').trim();
      const modCell = tds[2];
      const modLink = modCell.querySelector('a');
      const modRaw = modLink ? (modLink.textContent || '').trim() : (modCell.textContent || '').trim() || '-';
      const mod = modRaw;

      const isl = (tds[3].textContent || '').trim();
      const ownerLink = tds[4].querySelector('a[href*="/info.php"]');
      const ownerRaw = ownerLink ? ownerLink.textContent : tds[4].textContent || '';
      const owner = ownerRaw.trim();

      const actionLink =
        tds[4].querySelector('a[href*="market-i.php"]') ||
        tds[4].querySelector('a.greenbutton') ||
        tds[4].querySelector('a.greenlightbutton') ||
        tds[4].querySelector('a.graybutton') ||
        tds[4].querySelector('a[href*="sms-chat.php"]');
      const actionHref = actionLink ? actionLink.getAttribute('href') : '#';
      const actionLabel = (actionLink ? actionLink.textContent : 'Купить').trim() || 'Купить';

      offers.push({
        price,
        durability,
        mod,
        isl,
        owner,
        actionHref,
        actionLabel,
      });
    });

    console.log('[GW-Fav] Подходящих строк', offers.length);
    return { offers, hasRows: priceRows > 0 };
  }

  function filterOffersForFav(allOffers, fav) {
    const favModNorm = normalizeMod(fav.modCode || '');
    return allOffers.filter((offer) => {
      const modNorm = normalizeMod(offer.mod || '');
      if (favModNorm) {
        return modNorm === favModNorm;
      }
      return !modNorm;
    });
  }

  function normalizeMod(text) {
    const t = (text || '').trim();
    if (!t || t === '-' || /^-+$/.test(t)) return '';
    return t.replace(/[\[\]\s]/g, '').toUpperCase();
  }

  function findMarketTable(doc) {
    const tables = Array.from(doc.querySelectorAll('table'));
    // 1) по заголовку "Цена"
    const byHeader =
      tables.find((t) => {
        const head = t.querySelector('tr td.greenbg');
        return head && /Цена/i.test(head.textContent || '');
      }) || null;
    if (byHeader) return byHeader;

    // 2) по строкам, где первая ячейка содержит $
    const byData =
      tables.find((t) =>
        Array.from(t.querySelectorAll('tr')).some((tr) => {
          const tds = tr.querySelectorAll('td');
          return tds.length >= 4 && /\$/.test(tds[0].textContent || '');
        })
      ) || null;
    return byData;
  }

  async function fetchText(url) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) return null;

      const buf = await res.arrayBuffer();
      const utf8 = decodeBuffer(buf, 'utf-8');
      const cp1251 = decodeBuffer(buf, 'windows-1251');

      const pick = chooseBestEncoding(utf8, cp1251);
      return pick;
    } catch (_) {
      return null;
    }
  }

  function decodeBuffer(buf, encoding) {
    try {
      return new TextDecoder(encoding).decode(buf);
    } catch (_) {
      return '';
    }
  }

  function chooseBestEncoding(utf8, cp1251) {
    const score = (text) => {
      const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
      const mojibake = (text.match(/[ÃÐÑ�]{2,}/g) || []).length;
      return cyr - mojibake * 2;
    };
    const sUtf = score(utf8);
    const sCp = score(cp1251);
    return sCp > sUtf ? cp1251 : utf8;
  }

  function buildModal(favTable) {
    const overlay = document.createElement('div');
    overlay.className = 'gw-fav-modal gw-fav-add-modal';

    const box = document.createElement('div');
    box.className = 'gw-fav-box';
    overlay.appendChild(box);

    const title = document.createElement('div');
    title.className = 'gw-fav-box__title';
    title.textContent = 'Интересные лоты';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gw-fav-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => overlay.classList.remove('gw-open'));
    title.appendChild(closeBtn);

    const form = document.createElement('div');
    form.className = 'gw-fav-form';

    const categorySelect = document.createElement('select');
    const itemSelect = document.createElement('select');
    const modSelect = document.createElement('select');
    modSelect.disabled = true;

    populateCategories(categorySelect, state.categories);
    populateItems(itemSelect, state.categories[0]?.items || []);
    updateMods(modSelect, itemSelect.value);

    categorySelect.addEventListener('change', () => {
      const cat = state.categories.find((c) => c.name === categorySelect.value);
      populateItems(itemSelect, cat ? cat.items : []);
      updateMods(modSelect, itemSelect.value);
    });

    itemSelect.addEventListener('change', () => {
      updateMods(modSelect, itemSelect.value);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Добавить';
    addBtn.className = 'gw-fav-add';
    addBtn.addEventListener('click', () => {
      const itemId = itemSelect.value;
      if (!itemId) return;
      const cat = state.categories.find((c) => c.name === categorySelect.value);
      const item = cat?.items.find((i) => i.id === itemId);
      if (!item) return;

      const modValue = modSelect.value || '';
      const modId = modSelect.selectedOptions[0]?.dataset.modId || null;

      const exists = state.favorites.some(
        (x) => x.itemId === itemId && (x.modId || '') === (modId || '')
      );
      if (exists) {
        alert('Уже в списке');
        return;
      }

      state.favorites.push({
        itemId,
        name: item.name,
        modCode: modValue || '',
        modId: modId || null,
        href: item.href,
      });
      saveFavorites();
      renderFavorites(favTable);
    });

    const controls = [
      { label: 'Категория', el: categorySelect },
      { label: 'Предмет', el: itemSelect },
      { label: 'Модификатор', el: modSelect },
    ];

    controls.forEach(({ label, el }) => {
      const wrap = document.createElement('label');
      wrap.className = 'gw-fav-field';
      const span = document.createElement('span');
      span.textContent = label;
      wrap.appendChild(span);
      wrap.appendChild(el);
      form.appendChild(wrap);
    });

    form.appendChild(addBtn);

    const current = document.createElement('div');
    current.className = 'gw-fav-current';
    const currentTitle = document.createElement('div');
    currentTitle.textContent = 'Текущий список';
    current.appendChild(currentTitle);
    const currentList = document.createElement('div');
    currentList.className = 'gw-fav-current__list';
    current.appendChild(currentList);

    box.appendChild(title);
    box.appendChild(form);
    box.appendChild(current);

    const redrawCurrent = () => {
      currentList.innerHTML = '';
      if (!state.favorites.length) {
        currentList.textContent = 'Пусто';
        return;
      }
      state.favorites.forEach((fav, idx) => {
        const row = document.createElement('div');
        row.className = 'gw-fav-item';
        const txt = document.createElement('span');
        txt.textContent = fav.modCode ? `${fav.name} ${fav.modCode}` : fav.name;
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = '×';
        del.className = 'gw-fav-del';
        del.addEventListener('click', () => {
          state.favorites.splice(idx, 1);
          saveFavorites();
          redrawCurrent();
          renderFavorites(favTable);
        });
        row.appendChild(txt);
        row.appendChild(del);
        currentList.appendChild(row);
      });
    };

    redrawCurrent();
    addBtn.addEventListener('click', redrawCurrent);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('gw-open');
    });

    return overlay;
  }

  function populateCategories(select, categories) {
    select.innerHTML = '';
    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }

  function populateItems(select, items) {
    select.innerHTML = '';
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });
  }

  function updateMods(select, itemId) {
    select.innerHTML = '';
    const itemName = findItemNameById(itemId);
    const mods = itemName ? state.modsMap[itemName] || [] : [];

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Без модификатора';
    select.appendChild(empty);

    if (!mods.length) {
      select.disabled = false;
      return;
    }

    mods.forEach((mod) => {
      const opt = document.createElement('option');
      opt.value = mod.code;
      opt.dataset.modId = mod.id;
      opt.textContent = mod.code;
      select.appendChild(opt);
    });
    select.disabled = false;
  }

  function normalizeItemName(name) {
    return (name || '').replace(/^\[\d+\]\s*/, '').trim();
  }

  function findItemNameById(itemId) {
    for (const cat of state.categories) {
      const item = cat.items.find((i) => i.id === itemId);
      if (item) return normalizeItemName(item.name);
    }
    return null;
  }

  async function decodeBase64ToText(b64, isGzip) {
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (!isGzip) {
        return new TextDecoder().decode(bytes);
      }
      if (typeof DecompressionStream !== 'function') {
        console.warn('[Gwars-MarketFavorites] Нет DecompressionStream для gzip');
        return null;
      }
      const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
      const decompressed = await new Response(stream).arrayBuffer();
      return new TextDecoder().decode(decompressed);
    } catch (err) {
      console.error('[Gwars-MarketFavorites] Ошибка декодирования карты модов', err);
      return null;
    }
  }

  function injectStyles() {
    const css = `
      .gw-fav-btn,
      .gw-fav-add,
      .gw-fav-del {
        cursor: pointer;
      }
      .gw-fav-btn {
        margin-bottom: 6px;
      }
      .gw-fav-search-btn {
        margin-bottom: 6px;
        margin-left: 6px;
        cursor: pointer;
      }
      .gw-fav-actions {
        display: flex;
        gap: 6px;
        justify-content: center;
        margin-bottom: 6px;
      }
      .gw-fav-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
        align-items: flex-start;
      }
      .gw-fav-item {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        background: #f3fff3;
        border: 1px solid #c6e3c6;
        border-radius: 4px;
        padding: 4px 6px;
        font-size: 12px;
      }
      .gw-fav-item a {
        text-decoration: underline;
      }
      .gw-fav-del {
        border: 0;
        background: transparent;
        color: #900;
        font-weight: bold;
        padding: 0 4px;
      }
      .gw-fav-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .gw-fav-modal.gw-open {
        display: flex;
      }
      .gw-fav-box {
        background: #fdfdfd;
        border-radius: 8px;
        padding: 12px;
        min-width: 360px;
        max-width: 520px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        border: 1px solid #c6e3c6;
        max-height: 80vh;
        overflow-y: auto;
      }
      .gw-fav-box__title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .gw-fav-close {
        border: 0;
        background: transparent;
        font-size: 16px;
        cursor: pointer;
      }
      .gw-fav-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .gw-fav-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
      }
      .gw-fav-field select {
        padding: 4px;
      }
      .gw-fav-add {
        align-self: flex-start;
        padding: 6px 10px;
      }
      .gw-fav-current {
        margin-top: 12px;
        border-top: 1px solid #e4e4e4;
        padding-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .gw-fav-current__list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .gw-fav-empty {
        font-size: 12px;
        color: #555;
      }
      .gw-fav-result-block {
        margin: 10px 0;
        padding: 8px;
        border: 1px solid #c6e3c6;
        border-radius: 6px;
        background: #fdfdfd;
      }
      .gw-fav-result-title {
        font-weight: bold;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .gw-fav-ts {
        font-size: 11px;
        color: #555;
        margin-left: 8px;
      }
      .gw-fav-result-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .gw-fav-result-table th,
      .gw-fav-result-table td {
        border: 1px solid #e4e4e4;
        padding: 4px 6px;
        text-align: left;
      }
      .gw-fav-result-table th {
        background: #f3fff3;
      }
      .gw-fav-row-write {
        background: #e0e0e0;
      }
      .gw-fav-new td {
        color: #a80000;
      }
      .gw-fav-updated td {
        color: #d2691e;
      }
      .gw-fav-removed td {
        color: #777;
        text-decoration: line-through;
      }
      .gw-fav-isl-filter {
        display: flex;
        gap: 6px;
        margin-bottom: 6px;
      }
      .gw-fav-isl-btn {
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        border: 1px solid #c6e3c6;
        border-radius: 4px;
        background: #f3fff3;
      }
      .gw-fav-isl-active {
        background: #d9f0d9;
        font-weight: bold;
      }
      .gw-fav-filterbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .gw-fav-direct {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }
      .gw-fav-price-filter {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: normal;
        font-size: 12px;
      }
      .gw-fav-price-filter input {
        width: 90px;
        padding: 2px 4px;
        font-size: 12px;
      }
      .gw-fav-status {
        display: flex;
        justify-content: center;
        margin-top: 6px;
        min-height: 16px;
      }
      .gw-fav-spinner {
        position: relative;
        width: 18px;
        height: 18px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .gw-fav-spinner-ring {
        position: absolute;
        inset: 0;
        border: 2px solid #c6e3c6;
        border-top-color: #669966;
        border-radius: 50%;
        animation: gw-fav-spin 0.8s linear infinite;
      }
      .gw-fav-spinner-counter {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #555;
      }
      .gw-loading .gw-fav-spinner {
        opacity: 1;
      }
      @keyframes gw-fav-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
    } else {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
})();

