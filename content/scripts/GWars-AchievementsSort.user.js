// ==UserScript==
// @name         GWars-AchievementsSort
// @namespace    gwars-tools
// @version      1.0
// @description  Упорядочивает блоки достижений, скрывает/приглушает выполненные 100% пункты
// @author       KOMBAT
// @match        https://www.gwars.io/info.ach.php?id=*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const COUNTER_REGEX = /\[(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\]/;
  const PERCENT_REGEX = /(\d+)\s*%/;
  const DONE_TEXT_REGEX = /100\s*%[\s\S]*выполнено/i;
  const PROCESSED_ATTR = 'data-gwars-ach-opacity';
  const COMPLETED_OPACITY = '0.30';

  function parseCounter(text) {
    const match = text.match(COUNTER_REGEX);
    if (!match) return null;

    return {
      total: Number(match[1]),
      middle: Number(match[2]),
      done: Number(match[3]),
    };
  }

  function getDirectRows(blockTable) {
    const tbody = blockTable.tBodies && blockTable.tBodies[0] ? blockTable.tBodies[0] : null;
    if (tbody) return Array.from(tbody.children).filter((el) => el.tagName === 'TR');
    return Array.from(blockTable.children).filter((el) => el.tagName === 'TR');
  }

  function getPercentFromText(text) {
    const match = text.match(PERCENT_REGEX);
    if (!match) return null;
    return Number(match[1]);
  }

  function isRepBlock(blockTable) {
    const headerCell = blockTable.querySelector('td.greenbg[align="center"]');
    if (!headerCell) return false;
    const headerText = (headerCell.textContent || '').replace(/\s+/g, ' ').trim();
    return /^\[REP\]/i.test(headerText);
  }

  function reorderEntriesInBlock(blockTable, isRep) {
    const directRows = getDirectRows(blockTable);
    if (directRows.length <= 1) return;

    const dataRows = directRows.slice(1);
    const classified = dataRows.map((row, idx) => {
      const text = (row.textContent || '').replace(/\s+/g, ' ');
      const percent = getPercentFromText(text);
      const isCompleted = percent === 100;
      return { row, isCompleted, idx };
    });

    // Для [REP] сохраняем текущую логику: невыполненные вверх, 100% вниз.
    if (isRep) {
      classified.sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return a.idx - b.idx;
        return a.isCompleted ? 1 : -1;
      });
    }

    const parent = directRows[0].parentNode;
    classified.forEach((item) => {
      // Сбрасываем следы прошлых запусков/версий.
      item.row.removeAttribute(PROCESSED_ATTR);
      const rowCell = item.row.querySelector('td.simplewhitebg');
      if (rowCell) {
        rowCell.removeAttribute(PROCESSED_ATTR);
        rowCell.style.opacity = '';
      }

      if (isRep) {
        item.row.style.opacity = item.isCompleted ? COMPLETED_OPACITY : '';
        item.row.style.display = '';
        if (item.isCompleted) item.row.setAttribute(PROCESSED_ATTR, 'row');
      } else {
        item.row.style.opacity = '';
        item.row.style.display = item.isCompleted ? 'none' : '';
      }
      parent.appendChild(item.row);
    });
  }

  function getColumnContainer(table) {
    const column = table.closest('td[valign="top"]');
    if (column) return column;
    return table.parentNode;
  }

  function moveCompletedGroupsToColumnEnd(blockTables) {
    const grouped = new Map();

    blockTables.forEach((table) => {
      const headerCell = table.querySelector('td.greenbg[align="center"]');
      if (!headerCell) return;

      const counter = parseCounter(headerCell.textContent || '');
      if (!counter) return;

      const container = getColumnContainer(table);
      if (!container) return;

      if (!grouped.has(container)) grouped.set(container, []);
      grouped.get(container).push({ table, counter });
    });

    grouped.forEach((items) => {
      const moveToBottom = items.filter((item) => item.counter.total === item.counter.done);
      moveToBottom.forEach((item) => {
        // appendChild переместит таблицу в конец текущей колонки
        item.table.parentNode.appendChild(item.table);
      });
    });
  }

  // Фолбэк для "смешанной" верстки: когда пункт лежит прямо в td.simplewhitebg и не является отдельным tr.
  function applyOpacityFallback(blockTable, isRep) {
    const cells = Array.from(blockTable.querySelectorAll('td.simplewhitebg'));
    cells.forEach((cell) => {
      const parentRow = cell.closest('tr');
      if (parentRow && parentRow.getAttribute(PROCESSED_ATTR) === 'row') return;

      const text = (cell.textContent || '').replace(/\s+/g, ' ');
      if (DONE_TEXT_REGEX.test(text)) {
        if (isRep) {
          cell.style.display = '';
          cell.style.opacity = COMPLETED_OPACITY;
          cell.setAttribute(PROCESSED_ATTR, 'cell');
        } else {
          cell.style.opacity = '';
          cell.style.display = 'none';
          cell.removeAttribute(PROCESSED_ATTR);
        }
      } else if (cell.getAttribute(PROCESSED_ATTR) === 'cell') {
        // На случай повторного прогона после изменения DOM.
        cell.style.display = '';
        cell.style.opacity = '';
        cell.removeAttribute(PROCESSED_ATTR);
      } else if (!isRep) {
        cell.style.display = '';
      }
    });
  }

  function processAchievementBlocks() {
    const blockTables = Array.from(document.querySelectorAll('table'))
      .filter((table) => table.querySelector('td.greenbg[align="center"]'));

    moveCompletedGroupsToColumnEnd(blockTables);

    blockTables.forEach((blockTable) => {
      const repBlock = isRepBlock(blockTable);
      reorderEntriesInBlock(blockTable, repBlock);
      applyOpacityFallback(blockTable, repBlock);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAchievementBlocks);
  } else {
    processAchievementBlocks();
  }
})();
