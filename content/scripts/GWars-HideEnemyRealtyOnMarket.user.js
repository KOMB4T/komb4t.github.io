// ==UserScript==
// @name         [GWars] Hide enemy realty on market
// @namespace    gwars-tools
// @version      0.5
// @description  Опускает вниз недвижимость противника на страницах statlist.php и добавляет сортировку таблицы контролируемой недвижимости на странице синдиката.
// @match        https://www.gwars.io/statlist.php*
// @match        https://www.gwars.io/syndicate.php*
// @grant        none
// @author       KOMB4T
// @downloadURL  https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-HideEnemyRealtyOnMarket.user.js
// @updateURL    https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-HideEnemyRealtyOnMarket.user.js
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const INACTIVE_ROW_CLASS = 'gwars-hide-realty__inactive';
  const CONTROLS_CLASS = 'gwars-hide-realty__controls';
  const STYLE_ID = 'gwars-hide-realty-style';
  const STORAGE_KEY_SORT_MODE = 'gwars-hide-realty-sort-mode';
  const STORAGE_KEY_SORT_MODE_PREFIX = `${STORAGE_KEY_SORT_MODE}:`;
  const TABLE_STATES = new WeakMap();

  const SORT_LABEL_TEXT = 'Сортировка:';

  const SORT_MODES_STATLIST = [
    { value: 'distance', label: 'по удалённости' },
    { value: 'volume', label: 'по объёму' },
    { value: 'price', label: 'по цене' },
  ];
  const SORT_MODES_SYNDICATE = [
    { value: 'default', label: 'по умолчанию' },
    { value: 'salary', label: 'по зарплате' },
  ];
  const DEFAULT_SORT_MODE_STATLIST = 'price';
  const DEFAULT_SORT_MODE_SYNDICATE = 'default';

  const HEADER_MARKERS = [
    'Объект',
    'Может',
    'Можем',
  ];

  const SYNDICATE_PAGE_PATTERN = /syndicate\.php/;
  const SALARY_PATTERN = /\$(\d+)/;

  const MAP_LINK_PATTERN = /^\[(G|Z)\]/i;
  const RED_COLOR_HINTS = ['color:red', '#ff', 'red'];
  const ORANGE_COLOR_HINTS = ['#ed7c02', '#f07d02', 'orange'];
  const VOLUME_COLUMN_INDEX = 1;
  const PRICE_COLUMN_INDEX = 2;

  const init = () => {
    const isSyndicatePage = SYNDICATE_PAGE_PATTERN.test(window.location.pathname);
    
    let tables;
    if (isSyndicatePage) {
      // На странице синдиката используем класс bordersupdown
      tables = Array.from(document.querySelectorAll('table.bordersupdown')).filter(isSyndicateTable);
    } else {
      tables = Array.from(document.querySelectorAll('table.withborders')).filter(isStatlistTable);
    }

    if (tables.length === 0) {
      return;
    }

    injectStyles();
    tables.forEach((table, index) => setupTable(table, index, isSyndicatePage));
  };

  const isStatlistTable = (table) => {
    if (!table || !table.tBodies.length) {
      return false;
    }
    const headerCell = table.tBodies[0]?.querySelector('tr td.greenbg b');
    const text = headerCell?.textContent?.trim() ?? '';
    return HEADER_MARKERS.some((marker) => text.includes(marker));
  };

  const isSyndicateTable = (table) => {
    if (!table || !table.tBodies.length) {
      return false;
    }
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    // Проверяем, что есть строки с недвижимостью (содержат ссылку на object.php)
    const hasRealtyRows = rows.some((row) => row.querySelector('a[href^="/object.php"]'));
    return hasRealtyRows;
  };

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      tr.${INACTIVE_ROW_CLASS} td {
        background-color: #d1d1d1 !important;
      }
      .${CONTROLS_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 12px;
      }
      .${CONTROLS_CLASS} select {
        font-size: 12px;
        padding: 2px 4px;
      }
      td.greenbg .${CONTROLS_CLASS} {
        float: left;
        margin-right: 10px;
        margin-left: 5px;
      }
      td.greenbg .${CONTROLS_CLASS} select {
        font-size: 11px;
        padding: 1px 3px;
        cursor: pointer;
      }
      td.greenbg {
        position: relative;
      }
    `;
    document.head.appendChild(style);
  };

  const repositionStrikeRows = (state) => {
    if (!state?.strikeRows?.length) {
      return;
    }
    state.strikeRows.forEach((row) => {
      row.classList.add(INACTIVE_ROW_CLASS);
      if (!row.parentElement) {
        state.tbody.appendChild(row);
      }
    });
    state.strikeRows.forEach((row) => {
      if (state.footerRow && state.footerRow.parentElement === state.tbody) {
        state.tbody.insertBefore(row, state.footerRow);
      } else {
        state.tbody.appendChild(row);
      }
    });
  };

  const getAnchorRow = (state) => {
    if (!state) {
      return null;
    }
    const activeStrikeRow = state.strikeRows.find((row) => row.parentElement === state.tbody);
    if (activeStrikeRow) {
      return activeStrikeRow;
    }
    if (state.footerRow && state.footerRow.parentElement === state.tbody) {
      return state.footerRow;
    }
    return null;
  };

  const setupTable = (table, index, isSyndicatePage) => {
    const tbody = table.tBodies[0];
    if (!tbody) {
      return;
    }

    const allRows = Array.from(tbody.rows);
    if (allRows.length === 0) {
      return;
    }

    const { headerRow, dataRows, strikeRows, footerRow } = splitRows(allRows, isSyndicatePage);
    // Для statlist нужен headerRow, для синдиката - не обязателен
    if (!isSyndicatePage && !headerRow) {
      return;
    }
    // Для синдиката: если не нашли заголовок, но есть строки с недвижимостью - продолжаем
    if (isSyndicatePage && dataRows.length === 0) {
      return;
    }

    dataRows.forEach((row, index) => {
      row.dataset.gwarsOriginalIndex = String(index);
    });

    const tableId = getTableId(headerRow, index, isSyndicatePage);
    const state = {
      tbody,
      headerRow,
      dataRows,
      strikeRows,
      footerRow,
      id: tableId,
      isSyndicatePage,
    };
    TABLE_STATES.set(table, state);

    repositionStrikeRows(state);

    const controls = ensureControls(table, state, isSyndicatePage);
    const defaultMode = isSyndicatePage ? DEFAULT_SORT_MODE_SYNDICATE : DEFAULT_SORT_MODE_STATLIST;
    const mode = getSavedSortMode(tableId, isSyndicatePage, defaultMode);
    controls.value = mode;
    applySort(table, mode);
    controls.addEventListener('change', () => {
      const sortModes = isSyndicatePage ? SORT_MODES_SYNDICATE : SORT_MODES_STATLIST;
      const isValid = sortModes.some(({ value }) => value === controls.value);
      const nextMode = isValid ? controls.value : defaultMode;
      applySort(table, nextMode);
      saveSortMode(tableId, nextMode);
    });
  };

  const splitRows = (rows, isSyndicatePage) => {
    let headerRow = null;
    let footerRow = null;
    const dataRows = [];
    const strikeRows = [];

    rows.forEach((row) => {
      if (row.querySelector('table')) {
        footerRow = row;
        return;
      }

      if (!isSyndicatePage && !headerRow && containsHeader(row)) {
        headerRow = row;
        return;
      }

      // Для синдиката: находим строку заголовка "Контролируемая недвижимость"
      // Ищем первую строку с td.greenbg, которая содержит b с числом в скобках
      if (isSyndicatePage && !headerRow) {
        const headerCell = row.querySelector('td.greenbg');
        if (headerCell && headerCell.colSpan >= 3) {
          const text = headerCell.textContent?.trim() ?? '';
          const boldText = headerCell.querySelector('b')?.textContent?.trim() ?? '';
          // Проверяем наличие текста "Контролируемая недвижимость" или числа в скобках
          if (text.includes('Контролируемая недвижимость') || 
              (boldText && text.match(/\(\d+\)/)) ||
              (headerCell.querySelector('b') && text.match(/\(\d+\)/))) {
            headerRow = row;
            return;
          }
        }
      }

      if (row.classList.contains(INACTIVE_ROW_CLASS) || row.querySelector('s')) {
        strikeRows.push(row);
        return;
      }

      // Для синдиката: все строки с недвижимостью (содержат ссылку на object.php) - это dataRows
      if (isSyndicatePage) {
        if (row.querySelector('a[href^="/object.php"]')) {
          dataRows.push(row);
        }
        return;
      }

      dataRows.push(row);
    });

    return { headerRow, dataRows, strikeRows, footerRow };
  };

  const getTableId = (headerRow, index, isSyndicatePage) => {
    if (isSyndicatePage) {
      return `syndicate-${index}`;
    }
    if (!headerRow) {
      return `table-${index}`;
    }
    const headerText = Array.from(headerRow.cells)
      .map((cell) => cell.textContent?.trim().toLowerCase() ?? '')
      .join('|');
    if (headerText.includes('может купить')) {
      return 'sell';
    }
    if (headerText.includes('может продать')) {
      return 'buy';
    }
    return `table-${index}`;
  };

  const containsHeader = (row) => {
    const boldCells = Array.from(row.querySelectorAll('b'));
    return boldCells.some((node) => {
      const text = node.textContent?.trim() ?? '';
      return HEADER_MARKERS.some((marker) => text.includes(marker));
    });
  };

  const createSortSelect = (isSyndicatePage) => {
    const select = document.createElement('select');
    const sortModes = isSyndicatePage ? SORT_MODES_SYNDICATE : SORT_MODES_STATLIST;
    sortModes.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    return select;
  };

  const ensureControls = (table, state, isSyndicatePage) => {
    // Для страницы синдиката добавляем выпадающий список в строку заголовка
    if (isSyndicatePage) {
      // Если заголовок найден, используем его, иначе ищем первую строку с td.greenbg
      let headerRow = state.headerRow;
      if (!headerRow) {
        const tbody = table.tBodies?.[0];
        if (tbody) {
          const rows = Array.from(tbody.rows);
          for (const row of rows) {
            const headerCell = row.querySelector('td.greenbg');
            if (headerCell && (headerCell.getAttribute('colspan') === '3' || headerCell.colSpan >= 3)) {
              headerRow = row;
              break;
            }
          }
        }
      }
      
      if (headerRow) {
        const headerCell = headerRow.querySelector('td.greenbg');
        if (headerCell) {
          let container = headerCell.querySelector(`.${CONTROLS_CLASS}`);
          if (!container) {
            container = document.createElement('div');
            container.className = CONTROLS_CLASS;
            container.dataset.tableId = state.id;
            const select = createSortSelect(isSyndicatePage);
            container.appendChild(select);
            // Вставляем в начало ячейки, чтобы был слева
            headerCell.insertBefore(container, headerCell.firstChild);
            return select;
          }
          let select = container.querySelector('select');
          if (!select) {
            select = createSortSelect(isSyndicatePage);
            container.appendChild(select);
          } else {
            // Обновляем опции, если они не совпадают
            const sortModes = SORT_MODES_SYNDICATE;
            const currentOptions = Array.from(select.options).map((opt) => opt.value);
            const expectedOptions = sortModes.map(({ value }) => value);
            if (JSON.stringify(currentOptions) !== JSON.stringify(expectedOptions)) {
              select.innerHTML = '';
              sortModes.forEach(({ value, label }) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                select.appendChild(option);
              });
            }
          }
          return select;
        }
      }
    }

    // Для страницы statlist оставляем прежнюю логику
    const selector = `.${CONTROLS_CLASS}[data-table-id="${state.id}"]`;
    let container = table.parentElement?.querySelector(selector) ?? null;

    if (!(container instanceof HTMLElement)) {
      container = document.createElement('div');
      container.className = CONTROLS_CLASS;
      container.dataset.tableId = state.id;
      const label = document.createElement('span');
      label.textContent = SORT_LABEL_TEXT;
      const select = createSortSelect(isSyndicatePage);
      container.appendChild(label);
      container.appendChild(select);
      table.parentElement?.insertBefore(container, table);
      return select;
    }

    if (container.nextElementSibling !== table) {
      table.parentElement?.insertBefore(container, table);
    }

    let select = container.querySelector('select');
    if (!select) {
      select = createSortSelect(isSyndicatePage);
      container.appendChild(select);
    } else {
      // Обновляем опции, если они не совпадают
      const sortModes = isSyndicatePage ? SORT_MODES_SYNDICATE : SORT_MODES_STATLIST;
      const currentOptions = Array.from(select.options).map((opt) => opt.value);
      const expectedOptions = sortModes.map(({ value }) => value);
      if (JSON.stringify(currentOptions) !== JSON.stringify(expectedOptions)) {
        select.innerHTML = '';
        sortModes.forEach(({ value, label }) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          select.appendChild(option);
        });
      }
    }
    return select;
  };

  const applySort = (table, mode) => {
    const state = TABLE_STATES.get(table);
    if (!state) {
      return;
    }

    repositionStrikeRows(state);

    let sortedRows;
    if (state.isSyndicatePage && mode === 'default') {
      // Для режима "по умолчанию" восстанавливаем исходный порядок
      sortedRows = state.dataRows.slice().sort((a, b) => {
        const indexA = Number.parseInt(a.dataset.gwarsOriginalIndex ?? '0', 10);
        const indexB = Number.parseInt(b.dataset.gwarsOriginalIndex ?? '0', 10);
        return indexA - indexB;
      });
    } else {
      sortedRows = state.dataRows.slice().sort((a, b) => compareRows(a, b, mode, state.isSyndicatePage));
    }

    const anchor = getAnchorRow(state);

    sortedRows.forEach((row) => {
      if (anchor) {
        state.tbody.insertBefore(row, anchor);
      } else {
        state.tbody.appendChild(row);
      }
    });

    repositionStrikeRows(state);
  };

  const compareRows = (a, b, mode, isSyndicatePage) => {
    if (isSyndicatePage && mode === 'salary') {
      const salaryA = getSalary(a);
      const salaryB = getSalary(b);
      const hasSalaryA = salaryA > 0;
      const hasSalaryB = salaryB > 0;

      // Строки с зарплатой идут выше строк без зарплаты
      if (hasSalaryA && !hasSalaryB) {
        return -1;
      }
      if (!hasSalaryA && hasSalaryB) {
        return 1;
      }
      // Если обе имеют зарплату, сортируем по убыванию
      if (hasSalaryA && hasSalaryB) {
        const salaryDiff = salaryB - salaryA;
        if (salaryDiff !== 0) {
          return salaryDiff;
        }
      }
      // Если обе без зарплаты, сохраняем исходный порядок
    }

    if (!isSyndicatePage) {
      if (mode === 'distance') {
        const groupDiff = getDistanceGroup(a) - getDistanceGroup(b);
        if (groupDiff !== 0) {
          return groupDiff;
        }
        const volumeDiff = getVolume(b) - getVolume(a);
        if (volumeDiff !== 0) {
          return volumeDiff;
        }
      } else if (mode === 'volume') {
        const volumeDiff = getVolume(b) - getVolume(a);
        if (volumeDiff !== 0) {
          return volumeDiff;
        }
      }

      if (mode === 'price') {
        const priceDiff = getPrice(a) - getPrice(b);
        if (priceDiff !== 0) {
          return priceDiff;
        }
      }
    }

    const indexA = Number.parseInt(a.dataset.gwarsOriginalIndex ?? '0', 10);
    const indexB = Number.parseInt(b.dataset.gwarsOriginalIndex ?? '0', 10);
    return indexA - indexB;
  };

  const getVolume = (row) => {
    const cell = row.cells?.[VOLUME_COLUMN_INDEX];
    if (!cell) {
      return 0;
    }
    const number = parseInt(cell.textContent?.replace(/\D+/g, '') ?? '', 10);
    return Number.isFinite(number) ? number : 0;
  };

  const getDistanceGroup = (row) => {
    const cell = row.cells?.[0];
    if (!cell) {
      return 2;
    }
    const mapLink = cell.querySelector('a[href^="/map.php"]');
    if (!mapLink) {
      return 2;
    }
    const text = mapLink.textContent?.trim() ?? '';
    if (!MAP_LINK_PATTERN.test(text)) {
      return 2;
    }

    const inlineColor = (mapLink.getAttribute('style') || '').toLowerCase();
    const className = mapLink.className?.toLowerCase() ?? '';

    if (isRedColor(inlineColor, className, mapLink)) {
      return 0;
    }
    if (isOrangeColor(inlineColor, className, mapLink)) {
      return 1;
    }
    return 2;
  };

  const getPrice = (row) => {
    const cell = row.cells?.[PRICE_COLUMN_INDEX];
    if (!cell) {
      return 0;
    }
    const number = parseInt(cell.textContent?.replace(/\D+/g, '') ?? '', 10);
    return Number.isFinite(number) ? number : 0;
  };

  const isRedColor = (inline, className, node) => {
    if (RED_COLOR_HINTS.some((hint) => inline.includes(hint) || className.includes(hint))) {
      return true;
    }
    const color = window.getComputedStyle(node).color.toLowerCase();
    return color.includes('255, 0, 0') || color === 'red';
  };

  const isOrangeColor = (inline, className, node) => {
    if (ORANGE_COLOR_HINTS.some((hint) => inline.includes(hint) || className.includes(hint))) {
      return true;
    }
    const color = window.getComputedStyle(node).color.toLowerCase();
    return color.includes('237, 124, 2') || color.includes('240, 125, 2');
  };

  const getSalary = (row) => {
    const firstCell = row.cells?.[0];
    if (!firstCell) {
      return 0;
    }
    // Ищем элемент с зарплатой: span.greenbg font7pt > b с текстом вида $300
    const salaryElement = firstCell.querySelector('span.greenbg.font7pt b, span.greenbg b');
    if (!salaryElement) {
      return 0;
    }
    const text = salaryElement.textContent?.trim() ?? '';
    const match = text.match(SALARY_PATTERN);
    if (!match) {
      return 0;
    }
    const salary = parseInt(match[1], 10);
    return Number.isFinite(salary) ? salary : 0;
  };

  const getStorageKey = (tableId) => `${STORAGE_KEY_SORT_MODE_PREFIX}${tableId}`;

  const getSavedSortMode = (tableId, isSyndicatePage, defaultMode) => {
    try {
      const sortModes = isSyndicatePage ? SORT_MODES_SYNDICATE : SORT_MODES_STATLIST;
      const isValidSortMode = (mode) => sortModes.some(({ value }) => value === mode);
      const value =
        localStorage.getItem(getStorageKey(tableId)) ?? localStorage.getItem(STORAGE_KEY_SORT_MODE);
      return isValidSortMode(value) ? value : defaultMode;
    } catch (err) {
      return defaultMode;
    }
  };

  const saveSortMode = (tableId, mode) => {
    try {
      localStorage.setItem(getStorageKey(tableId), mode);
      localStorage.setItem(STORAGE_KEY_SORT_MODE, mode);
    } catch (err) {
      // ignore storage issues
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
