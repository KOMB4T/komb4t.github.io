// ==UserScript==
// @name            [Gwars]BrokenItemsSort
// @description     Улучшенная сортировка предметов: приоритет для сломанных/истекших, группировка дубликатов по item_tag с возможностью показать/скрыть, сортировка в панели NPC. Автоматически обновляется при изменениях на странице.
// @author          KOMBAT
// @match           https://*.gwars.io/items.php*
// @grant           none
// @version         0.2
// @downloadURL     https://raw.githubusercontent.com/KOMB4t.github.io/scripts/Gwars-BrokenItemsSort.user.js
// @updateURL       https://raw.githubusercontent.com/KOMB4t.github.io/scripts/Gwars-BrokenItemsSort.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DEBUG = false;
  const ENABLE_NPC_LOGS = false;
  const ENABLE_ITEM_SORT = true;
  const ENABLE_NPC_SORT = true;
  const ENABLE_DUPLICATE_HIDING = true;
  const PRIORITY_OPACITY = 0.6;
  const ROW_SELECTOR = 'tr[id^="item_tr"]';
  const IMG_SELECTOR = 'td[id^="itemimg_"] img';
  const PANEL_NPC_ID = 'panelsend_to_npc_select';
  const NPC_TABLE_BODY_SELECTOR = '#tablesend_to_npc_select tbody';
  const RED_FONT_SELECTOR = 'font.redfont';
  const MUTATION_OPTIONS = { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] };
  const NPC_ATTRIBUTE_IDS = new Set([PANEL_NPC_ID, 'listsend_to_npc_select', 'tablesend_to_npc_select']);
  const NPC_MUTATION_LOG_LIMIT = 20;

  const NPC_SORT_ALLOWED_REASONS = new Set(['panel-child-added', 'panel-added']);
  const NPC_SORT_THROTTLE_MS = 200;
  const ITEM_LIST_CONTAINER_ID = 'itemsbody';
  const ITEM_MUTATION_OPTIONS = { childList: true, subtree: true };
  const ITEM_SORT_THROTTLE_MS = 200;
  const DUPLICATE_COUNT_ATTR = 'data-duplicate-count';
  const DUPLICATE_HIDDEN_ATTR = 'data-duplicate-hidden';
  const DUPLICATE_EXPANDED_ATTR = 'data-duplicates-expanded';

  const npcMutationLog = [];

  const dbg = (...args) => {
    if (DEBUG) {
      console.log('[BrokenItemsSort]', ...args);
    }
  };
  const npcLog = (...args) => {
    if (ENABLE_NPC_LOGS) {
      dbg(...args);
    }
  };

  let npcPanelSortScheduled = false;
  let npcPanelObserver = null;
  let npcPanelSortCounter = 0;
  let npcPanelIgnoreMutations = false;
  let npcPanelLastSortTs = 0;
  let itemListObserver = null;
  let itemSortScheduled = false;
  let itemLastSortTs = 0;
  let itemIgnoreMutations = false;

  runWhenDomReady(() => {
    if (ENABLE_ITEM_SORT) {
      sortItemsByOpacity();
    } else {
      dbg('Item sort disabled');
    }
    if (ENABLE_DUPLICATE_HIDING) {
      hideDuplicateItems();
    }
    if (ENABLE_NPC_SORT) {
      prioritizeNpcPanelRows();
    } else {
      npcLog('NPC sort disabled');
    }
    setupNpcPanelObserver();
    setupItemListObserver();
  });

  function runWhenDomReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  }

  function sortItemsByOpacity() {
    const rows = Array.from(document.querySelectorAll(ROW_SELECTOR));
    if (!rows.length) {
      dbg('rows not found');
      return;
    }

    itemIgnoreMutations = true;
    try {
      const parentsMap = new Map();
      rows.forEach((row) => {
        const parent = row.parentElement;
        if (!parent) {
          return;
        }
        if (!parentsMap.has(parent)) {
          parentsMap.set(parent, []);
        }
        parentsMap.get(parent).push(row);
      });

      parentsMap.forEach((groupRows, parent) => {
        // Группируем строки по ID предмета
        const itemGroups = groupItemsByItemId(groupRows);
        
        const broken = [];
        const expired = [];
        const regular = [];

        itemGroups.forEach((itemRows) => {
          let isBroken = false;
          let isExpired = false;

          // Проверяем на сломанность (opacity)
          for (const row of itemRows) {
            const img = row.querySelector(IMG_SELECTOR);
            const opacity = img ? getImgOpacity(img) : null;
            if (opacity !== null && floatsEqual(opacity, PRIORITY_OPACITY)) {
              isBroken = true;
              break;
            }
          }

          // Проверяем на истекший срок действия
          if (!isBroken) {
            const expiredInfo = checkItemExpired(itemRows);
            isExpired = expiredInfo.isExpired;
            if (isExpired) {
              // Устанавливаем opacity для изображения истекшего предмета
              for (const row of itemRows) {
                const img = row.querySelector(IMG_SELECTOR);
                if (img) {
                  setImgOpacity(img, PRIORITY_OPACITY);
                }
              }
              if (expiredInfo.expiryTextNode) {
                highlightExpiryText(expiredInfo.expiryTextNode);
              }
            }
          }

          // Добавляем все строки предмета в соответствующую категорию
          if (isBroken) {
            broken.push(...itemRows);
          } else if (isExpired) {
            expired.push(...itemRows);
          } else {
            regular.push(...itemRows);
          }
        });

        const totalPrioritized = broken.length + expired.length;
        if (!totalPrioritized) {
          dbg('nothing to prioritize in parent', parent);
          return;
        }

        const ordered = broken.concat(expired).concat(regular);
        const fragment = document.createDocumentFragment();
        ordered.forEach((row) => fragment.appendChild(row));
        parent.appendChild(fragment);
        dbg(`reordered ${ordered.length} rows, broken=${broken.length}, expired=${expired.length}, regular=${regular.length}`);
      });

      // Обновляем скрытие дубликатов после сортировки
      if (ENABLE_DUPLICATE_HIDING) {
        hideDuplicateItems();
      }
    } finally {
      requestAnimationFrame(() => {
        itemIgnoreMutations = false;
      });
    }
  }

  function getImgOpacity(img) {
    const inline = img.getAttribute('style') || '';
    const inlineMatch = inline.match(/opacity\s*:\s*([0-9.]+)/i);
    if (inlineMatch) {
      const val = parseFloat(inlineMatch[1]);
      if (!Number.isNaN(val)) {
        return val;
      }
    }
    const computedVal = parseFloat(window.getComputedStyle(img).opacity);
    return Number.isNaN(computedVal) ? null : computedVal;
  }

  function setImgOpacity(img, opacity) {
    if (!img) {
      return;
    }
    const currentStyle = img.getAttribute('style') || '';
    // Удаляем существующее значение opacity, если есть
    const styleWithoutOpacity = currentStyle.replace(/opacity\s*:\s*[0-9.]+;?/gi, '').trim();
    // Добавляем новое значение opacity
    const newStyle = styleWithoutOpacity 
      ? `${styleWithoutOpacity}; opacity: ${opacity}`
      : `opacity: ${opacity}`;
    img.setAttribute('style', newStyle);
  }

  function floatsEqual(a, b, eps = 0.001) {
    return Math.abs(a - b) < eps;
  }

  function groupItemsByItemId(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const id = row.id;
      if (!id) {
        return;
      }
      // Извлекаем ID предмета из item_tr1_X или item_tr2_X
      const match = id.match(/^item_tr\d+_(\d+)$/);
      if (match) {
        const itemId = match[1];
        if (!groups.has(itemId)) {
          groups.set(itemId, []);
        }
        groups.get(itemId).push(row);
      }
    });
    return Array.from(groups.values());
  }

  function checkItemExpired(itemRows) {
    // Ищем строку с текстом "Действителен до:"
    for (const row of itemRows) {
      const text = row.textContent || '';
      const expiryMatch = text.match(/Действителен до:\s*(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
      if (expiryMatch) {
        const [, day, month, year, hour, minute] = expiryMatch;
        const expiryDate = parseExpiryDate(day, month, year, hour, minute);
        if (expiryDate && expiryDate < new Date()) {
          // Проверяем, не покрашен ли уже текст
          const alreadyHighlighted = row.querySelector('font[color="#ff0000"], font[color="red"]');
          if (!alreadyHighlighted || !alreadyHighlighted.textContent.match(/\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}/)) {
            // Находим текстовый узел для покраски
            const expiryTextNode = findExpiryTextNode(row);
            return { isExpired: true, expiryTextNode };
          } else {
            return { isExpired: true, expiryTextNode: null };
          }
        }
      }
    }
    return { isExpired: false, expiryTextNode: null };
  }

  function parseExpiryDate(day, month, year, hour, minute) {
    try {
      // Преобразуем YY в полный год (предполагаем 2000-2099)
      const fullYear = 2000 + parseInt(year, 10);
      const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(minute, 10));
      // Проверяем валидность даты
      if (date.getFullYear() === fullYear && 
          date.getMonth() === parseInt(month, 10) - 1 && 
          date.getDate() === parseInt(day, 10)) {
        return date;
      }
    } catch (e) {
      dbg('Error parsing expiry date:', e);
    }
    return null;
  }

  function findExpiryTextNode(row) {
    // Ищем узел с текстом "Действителен до:"
    const walker = document.createTreeWalker(
      row,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.includes('Действителен до:')) {
        return node;
      }
    }
    return null;
  }

  function highlightExpiryText(textNode) {
    if (!textNode || !textNode.parentElement) {
      return;
    }
    
    const parent = textNode.parentElement;
    const text = textNode.textContent;
    const match = text.match(/(.*?Действителен до:\s*)(\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2})(.*)/);
    
    if (match) {
      const [, before, datePart, after] = match;
      
      // Создаем фрагмент с разделенным текстом
      const fragment = document.createDocumentFragment();
      
      // Добавляем текст до даты
      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }
      
      // Добавляем дату в красном цвете
      const redFont = document.createElement('font');
      redFont.setAttribute('color', '#ff0000');
      redFont.textContent = datePart;
      fragment.appendChild(redFont);
      
      // Добавляем текст после даты
      if (after) {
        fragment.appendChild(document.createTextNode(after));
      }
      
      // Заменяем текстовый узел на фрагмент
      parent.replaceChild(fragment, textNode);
    } else {
      // Если не удалось распарсить, ищем родительский элемент и красим весь текст
      let element = parent;
      while (element && element !== document.body) {
        if (element.textContent && element.textContent.includes('Действителен до:')) {
          // Пытаемся найти и покрасить только дату в родительском элементе
          const innerHTML = element.innerHTML;
          const htmlMatch = innerHTML.match(/(.*?Действителен до:\s*)(\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2})(.*)/);
          if (htmlMatch) {
            const [, before, datePart, after] = htmlMatch;
            element.innerHTML = before + '<font color="#ff0000">' + datePart + '</font>' + after;
            return;
          }
        }
        element = element.parentElement;
      }
    }
  }

  function prioritizeNpcPanelRows() {
    const panel = document.getElementById(PANEL_NPC_ID);
    if (!panel) {
      npcLog('npc panel not found');
      return;
    }

    const tbody = panel.querySelector(NPC_TABLE_BODY_SELECTOR);
    if (!tbody) {
      npcLog('npc panel tbody not found');
      return;
    }

    const rows = Array.from(tbody.children).filter((el) => el.tagName === 'TR');
    if (!rows.length) {
      npcLog('npc panel rows not found');
      return;
    }

    const prioritized = [];
    const regular = [];

    rows.forEach((row) => {
      if (row.querySelector(RED_FONT_SELECTOR)) {
        prioritized.push(row);
      } else {
        regular.push(row);
      }
    });

    npcLog(`npc panel analysis: rows=${rows.length}, prioritized=${prioritized.length}`);
    if (!ENABLE_NPC_SORT || !prioritized.length) {
      return;
    }

    const fragment = document.createDocumentFragment();
    prioritized.concat(regular).forEach((row) => fragment.appendChild(row));

    npcPanelIgnoreMutations = true;
    try {
      tbody.appendChild(fragment);
    } finally {
      requestAnimationFrame(() => {
        npcPanelIgnoreMutations = false;
      });
    }
    npcLog(`npc panel reordered ${rows.length} rows, prioritized ${prioritized.length}`);
  }

  function setupNpcPanelObserver() {
    if (npcPanelObserver || !document.body) {
      return;
    }

    npcPanelObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const reason = getNpcPanelChangeReason(mutation);
        if (!reason) {
          return;
        }
        logNpcMutation(reason, mutation);
        npcLog('[NPC observer] detected change:', reason);
        if (shouldTriggerNpcSort(reason)) {
          scheduleNpcPanelSort(reason);
        }
      });
    });

    npcPanelObserver.observe(document.body, MUTATION_OPTIONS);
  }

  function getNpcPanelChangeReason(mutation) {
    if (mutation.type === 'attributes') {
      const target = mutation.target;
      const targetId = target instanceof Element ? target.id : '';
      if (targetId && NPC_ATTRIBUTE_IDS.has(targetId)) {
        return `attr:${targetId}`;
      }
      const panel = document.getElementById(PANEL_NPC_ID);
      if (panel && target instanceof Element && panel.contains(target)) {
        return `attr:panel-desc:${target.tagName.toLowerCase()}`;
      }
      return null;
    }
    const panel = document.getElementById(PANEL_NPC_ID);
    if (!panel) {
      const addedPanel = Array.from(mutation.addedNodes).some(node => nodeContainsPanel(node));
      return addedPanel ? 'panel-added' : null;
    }
    if (Array.from(mutation.addedNodes).some(node => panel.contains(node) || nodeContainsPanel(node))) {
      return 'panel-child-added';
    }
    if (mutation.removedNodes && mutation.removedNodes.length) {
      const removedPanel = Array.from(mutation.removedNodes).some(node => isNodeRelatedToPanel(node, panel));
      if (removedPanel) {
        return panel.isConnected ? 'panel-child-removed' : 'panel-removed';
      }
    }
    return null;
  }

  function nodeContainsPanel(node) {
    return node instanceof Element && (node.id === PANEL_NPC_ID || Boolean(node.querySelector && node.querySelector(`#${PANEL_NPC_ID}`)));
  }

  function isNodeRelatedToPanel(node, panel) {
    if (!(node instanceof Element)) {
      return false;
    }
    return node === panel || panel.contains(node) || node.contains(panel);
  }

  function logNpcMutation(reason, mutation) {
    const entry = {
      reason,
      attrName: mutation.type === 'attributes' ? (mutation.attributeName || null) : null,
      target: describeNode(mutation.target),
      timestamp: new Date().toISOString()
    };
    npcMutationLog.push(entry);
    if (npcMutationLog.length > NPC_MUTATION_LOG_LIMIT) {
      npcMutationLog.shift();
    }
    npcLog('[NPC observer] log entry:', entry);
  }

  function describeNode(node) {
    if (!(node instanceof Element)) {
      return String(node);
    }
    const parts = [node.tagName.toLowerCase()];
    if (node.id) {
      parts.push(`#${node.id}`);
    }
    if (node.className) {
      const cls = String(node.className).trim().replace(/\s+/g, '.');
      if (cls) {
        parts.push(`.${cls}`);
      }
    }
    return parts.join('');
  }

  function scheduleNpcPanelSort(reason = 'unknown') {
    if (!ENABLE_NPC_SORT) {
      npcLog('[NPC sort] disabled, reason:', reason);
      return;
    }
    if (!shouldTriggerNpcSort(reason)) {
      npcLog('[NPC sort] reason not allowed, skipping:', reason);
      return;
    }
    const now = Date.now();
    if (now - npcPanelLastSortTs < NPC_SORT_THROTTLE_MS) {
      npcLog('[NPC sort] throttled, reason:', reason);
      return;
    }
    if (npcPanelSortScheduled) {
      npcLog('[NPC sort] already scheduled, skip reason:', reason);
      return;
    }
    npcPanelSortScheduled = true;
    npcLog('[NPC sort] schedule requested, reason:', reason);
    requestAnimationFrame(() => {
      npcPanelSortScheduled = false;
      npcPanelSortCounter += 1;
      npcLog('[NPC sort] running (count:', npcPanelSortCounter, ') reason:', reason);
      npcPanelLastSortTs = Date.now();
      npcPanelIgnoreMutations = true;
      prioritizeNpcPanelRows();
      npcPanelIgnoreMutations = false;
    });
  }

  function shouldTriggerNpcSort(reason) {
    return NPC_SORT_ALLOWED_REASONS.has(reason);
  }

  function setupItemListObserver() {
    if (itemListObserver || !document.body || !ENABLE_ITEM_SORT) {
      return;
    }
    const container = document.getElementById(ITEM_LIST_CONTAINER_ID);
    if (!container) {
      dbg('item list container not found for observer');
      return;
    }
    itemListObserver = new MutationObserver((mutations) => {
      if (itemIgnoreMutations) {
        return;
      }
      if (mutations.some(isItemMutationRelevant)) {
        scheduleItemSort('items-mutation');
      }
    });
    itemListObserver.observe(container, ITEM_MUTATION_OPTIONS);
  }

  function isItemMutationRelevant(mutation) {
    if (mutation.type !== 'childList') {
      return false;
    }
    const added = Array.from(mutation.addedNodes || []);
    const removed = Array.from(mutation.removedNodes || []);
    return added.some(isItemNodeRelevant) || removed.some(isItemNodeRelevant);
  }

  function isItemNodeRelevant(node) {
    if (!(node instanceof Element)) {
      return false;
    }
    if (node.matches && node.matches(ROW_SELECTOR)) {
      return true;
    }
    return Boolean(node.querySelector && node.querySelector(ROW_SELECTOR));
  }

  function scheduleItemSort(reason = 'mutation') {
    if (!ENABLE_ITEM_SORT) {
      return;
    }
    const now = Date.now();
    if (now - itemLastSortTs < ITEM_SORT_THROTTLE_MS) {
      return;
    }
    if (itemSortScheduled) {
      return;
    }
    itemSortScheduled = true;
    requestAnimationFrame(() => {
      itemSortScheduled = false;
      itemLastSortTs = Date.now();
      sortItemsByOpacity();
    });
  }

  // ========== Дубликаты предметов ==========

  function getItemTag(row) {
    // Ищем item_tag в ссылках
    const links = row.querySelectorAll('a[href*="item_tag="], a[href*="item_id="]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      // Пробуем найти item_tag в параметрах URL
      const tagMatch = href.match(/[?&]item_tag=([^&]+)/);
      if (tagMatch) {
        return decodeURIComponent(tagMatch[1]);
      }
      // Пробуем найти item_id в параметрах URL
      const idMatch = href.match(/[?&]item_id=([^&]+)/);
      if (idMatch) {
        return decodeURIComponent(idMatch[1]);
      }
    }
    // Если не нашли в ссылках, пробуем найти по названию предмета
    const nameLink = row.querySelector('a[itemtype="simpleitem"], a[itemtype="art"]');
    if (nameLink) {
      const href = nameLink.getAttribute('href') || '';
      const match = href.match(/item_id=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }

  function getItemTagFromRows(itemRows) {
    // Для группы строк предмета пытаемся получить tag из первой строки
    // обычно item_tr1_X содержит основную информацию
    for (const row of itemRows) {
      const tag = getItemTag(row);
      if (tag) {
        return tag;
      }
    }
    return null;
  }

  function groupItemsByTag(rows) {
    // Сначала группируем строки по ID предмета (item_tr1_X и item_tr2_X - один предмет)
    const itemIdGroups = groupItemsByItemId(rows);
    
    // Теперь группируем группы строк предметов по item_tag
    const tagGroups = new Map();
    itemIdGroups.forEach((itemRows) => {
      const tag = getItemTagFromRows(itemRows);
      if (!tag) {
        return;
      }
      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, []);
      }
      // Добавляем все строки предмета как одну группу
      tagGroups.get(tag).push(itemRows);
    });
    return tagGroups;
  }

  function hideDuplicateItems() {
    const rows = Array.from(document.querySelectorAll(ROW_SELECTOR));
    if (!rows.length) {
      dbg('rows not found for duplicate hiding');
      return;
    }

    itemIgnoreMutations = true;
    try {
      const parentsMap = new Map();
      rows.forEach((row) => {
        const parent = row.parentElement;
        if (!parent) {
          return;
        }
        if (!parentsMap.has(parent)) {
          parentsMap.set(parent, []);
        }
        parentsMap.get(parent).push(row);
      });

      parentsMap.forEach((groupRows, parent) => {
        // Группируем по item_tag (группы строк предметов)
        const tagGroups = groupItemsByTag(groupRows);
        
        tagGroups.forEach((itemGroups, tag) => {
          // itemGroups - это массив групп строк предметов
          // каждая группа содержит строки одного предмета (item_tr1_X и item_tr2_X)
          if (itemGroups.length <= 1) {
            // Нет дубликатов - удаляем старые постфиксы, если есть
            itemGroups.forEach(itemRows => {
              itemRows.forEach(row => {
                removeDuplicateCountPostfix(row);
                row.removeAttribute(DUPLICATE_HIDDEN_ATTR);
                row.removeAttribute(DUPLICATE_EXPANDED_ATTR);
                if (row.style.display === 'none') {
                  row.style.display = '';
                }
              });
            });
            return;
          }

          // Сортируем группы предметов по порядку в DOM (по первой строке каждой группы)
          itemGroups.sort((groupA, groupB) => {
            if (groupA.length === 0 || groupB.length === 0) {
              return 0;
            }
            const firstRowA = groupA[0];
            const firstRowB = groupB[0];
            const posA = Array.from(parent.children).indexOf(firstRowA);
            const posB = Array.from(parent.children).indexOf(firstRowB);
            return posA - posB;
          });

          // Находим все строки первой группы предметов (для постфикса)
          const firstItemGroup = itemGroups[0];
          if (!firstItemGroup || firstItemGroup.length === 0) {
            return;
          }

          // Находим первую видимую строку первой группы (обычно item_tr1_X)
          let firstVisibleRow = null;
          for (const row of firstItemGroup) {
            if (row.isConnected && 
                (!row.style.display || row.style.display !== 'none') &&
                row.offsetParent !== null) {
              firstVisibleRow = row;
              break;
            }
          }

          // Если не нашли видимую строку, берем первую строку первой группы
          if (!firstVisibleRow && firstItemGroup.length > 0) {
            firstVisibleRow = firstItemGroup[0];
          }

          if (!firstVisibleRow) {
            return;
          }

          // Проверяем, есть ли уже постфикс на какой-либо строке первой группы (для определения expanded)
          let expanded = false;
          for (const row of firstItemGroup) {
            const countSpan = row.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
            if (countSpan) {
              expanded = row.getAttribute(DUPLICATE_EXPANDED_ATTR) === 'true';
              break;
            }
          }

          // Удаляем старые постфиксы со всех строк первой группы, кроме найденной
          firstItemGroup.forEach(row => {
            if (row !== firstVisibleRow) {
              removeDuplicateCountPostfix(row);
              row.removeAttribute(DUPLICATE_EXPANDED_ATTR);
            }
          });

          // Собираем все строки дубликатов (все группы кроме первой)
          const duplicateGroups = itemGroups.slice(1);
          const allDuplicateRows = [];
          duplicateGroups.forEach(itemRows => {
            allDuplicateRows.push(...itemRows);
          });

          const totalCount = itemGroups.length; // Количество одинаковых предметов

          // Если дубликаты развернуты или их нет - показываем все
          if (expanded || duplicateGroups.length === 0) {
            // Показываем все строки всех групп
            itemGroups.forEach(itemRows => {
              itemRows.forEach(row => {
                row.style.display = '';
                row.removeAttribute(DUPLICATE_HIDDEN_ATTR);
              });
            });
            // Сортируем строки: титульный предмет первым, затем дубликаты подряд
            if (duplicateGroups.length > 0 && firstItemGroup.length > 0) {
              sortDuplicateItems(itemGroups, parent, firstItemGroup);
            }
            if (duplicateGroups.length > 0) {
              addDuplicateCountPostfix(firstVisibleRow, totalCount, tag);
              firstVisibleRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'true');
            } else {
              removeDuplicateCountPostfix(firstVisibleRow);
              firstVisibleRow.removeAttribute(DUPLICATE_EXPANDED_ATTR);
            }
          } else {
            // Скрываем все строки дубликатов (все группы кроме первой)
            allDuplicateRows.forEach(row => {
              row.style.display = 'none';
              row.setAttribute(DUPLICATE_HIDDEN_ATTR, 'true');
            });
            // Добавляем или обновляем постфикс
            addDuplicateCountPostfix(firstVisibleRow, totalCount, tag);
            firstVisibleRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'false');
          }
        });
      });
    } finally {
      requestAnimationFrame(() => {
        itemIgnoreMutations = false;
      });
    }
  }

  function addDuplicateCountPostfix(row, count, tag) {
    // Проверяем, нет ли уже постфикса
    let countSpan = row.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
    if (countSpan) {
      countSpan.textContent = ` (×${count})`;
      return;
    }

    // Ищем ссылку с названием предмета (может быть simpleitem или art)
    const nameLink = row.querySelector('a[itemtype="simpleitem"], a[itemtype="art"]');
    if (!nameLink) {
      dbg('name link not found for postfix');
      return;
    }

    countSpan = document.createElement('span');
    countSpan.setAttribute(DUPLICATE_COUNT_ATTR, tag);
    countSpan.textContent = ` (×${count})`;
    countSpan.style.cursor = 'pointer';
    countSpan.style.color = '#0066cc';
    countSpan.style.textDecoration = 'underline';
    countSpan.style.marginLeft = '3px';
    countSpan.title = 'Нажмите, чтобы показать/скрыть все дубликаты';
    
    countSpan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDuplicatesVisibility(tag);
    });

    // Добавляем после названия
    if (nameLink.nextSibling) {
      nameLink.parentNode.insertBefore(countSpan, nameLink.nextSibling);
    } else {
      nameLink.parentNode.appendChild(countSpan);
    }
  }

  function removeDuplicateCountPostfix(row) {
    const countSpan = row.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
    if (countSpan) {
      countSpan.remove();
    }
  }

  function sortDuplicateItems(itemGroups, parent, firstGroup) {
    // Собираем все строки в правильном порядке:
    // 1. Все строки титульного предмета (первой группы)
    // 2. Затем все строки дубликатов (остальных групп) по порядку
    
    if (!firstGroup || firstGroup.length === 0 || !parent) {
      return;
    }

    // Проверяем, что первая группа находится в родителе
    if (!parent.contains(firstGroup[0])) {
      return;
    }

    // Собираем все строки в нужном порядке
    const orderedRows = [];
    
    // Сначала все строки титульного предмета (сортируем по порядку в DOM)
    const sortedFirstGroup = [...firstGroup].sort((a, b) => {
      const posA = Array.from(parent.children).indexOf(a);
      const posB = Array.from(parent.children).indexOf(b);
      return posA - posB;
    });
    orderedRows.push(...sortedFirstGroup);
    
    // Затем строки всех дубликатов (сохраняя порядок групп)
    const duplicateGroups = itemGroups.slice(1);
    duplicateGroups.forEach(itemRows => {
      // Сортируем строки внутри каждой группы по их порядку в DOM
      const sortedItemRows = [...itemRows].sort((a, b) => {
        const posA = Array.from(parent.children).indexOf(a);
        const posB = Array.from(parent.children).indexOf(b);
        return posA - posB;
      });
      orderedRows.push(...sortedItemRows);
    });

    // Находим позицию последней строки титульного предмета
    const lastTitleRow = sortedFirstGroup[sortedFirstGroup.length - 1];
    const lastTitleRowPosition = Array.from(parent.children).indexOf(lastTitleRow);
    if (lastTitleRowPosition === -1) {
      return;
    }

    // Собираем все строки дубликатов
    const duplicateRows = orderedRows.slice(sortedFirstGroup.length);
    
    // Проверяем, нужно ли переставлять элементы
    // Если все дубликаты уже идут сразу после титульного предмета - ничего не делаем
    let needsReorder = false;
    const expectedNextRow = duplicateRows.length > 0 ? duplicateRows[0] : null;
    const actualNextRow = lastTitleRow.nextElementSibling;
    
    if (expectedNextRow !== actualNextRow || duplicateRows.length === 0) {
      needsReorder = true;
    } else {
      // Проверяем порядок всех строк дубликатов
      let currentRow = lastTitleRow.nextElementSibling;
      for (let i = 0; i < duplicateRows.length; i++) {
        if (currentRow !== duplicateRows[i]) {
          needsReorder = true;
          break;
        }
        currentRow = currentRow.nextElementSibling;
      }
    }

    if (!needsReorder) {
      return;
    }

    // Сохраняем узел, после которого нужно вставлять (до удаления элементов)
    const insertAfterNode = lastTitleRow;
    const insertBeforeNode = insertAfterNode.nextSibling;

    // Создаем фрагмент для быстрой вставки
    const fragment = document.createDocumentFragment();
    
    // Перемещаем строки дубликатов в фрагмент
    // appendChild автоматически удаляет элемент из старого места
    duplicateRows.forEach(row => {
      if (row.parentNode === parent) {
        fragment.appendChild(row);
      }
    });

    // Вставляем все строки дубликатов сразу после последней строки титульного предмета
    if (insertBeforeNode && parent.contains(insertBeforeNode)) {
      parent.insertBefore(fragment, insertBeforeNode);
    } else {
      parent.appendChild(fragment);
    }
  }

  function toggleDuplicatesVisibility(tag) {
    const rows = Array.from(document.querySelectorAll(ROW_SELECTOR));
    
    // Группируем строки по ID предмета
    const allItemGroups = groupItemsByItemId(rows);
    
    // Находим все группы предметов с нужным tag
    const tagItemGroups = [];
    allItemGroups.forEach((itemRows) => {
      const itemTag = getItemTagFromRows(itemRows);
      if (itemTag === tag) {
        // Проверяем, что хотя бы одна строка видима в DOM
        const hasVisibleRow = itemRows.some(row => row.isConnected);
        if (hasVisibleRow) {
          tagItemGroups.push(itemRows);
        }
      }
    });

    if (tagItemGroups.length <= 1) {
      return;
    }

    // Находим строку с постфиксом (обычно в первой группе)
    let postfixRow = null;
    let isExpanded = false;
    for (const itemRows of tagItemGroups) {
      for (const row of itemRows) {
        const countSpan = row.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
        if (countSpan && countSpan.getAttribute(DUPLICATE_COUNT_ATTR) === tag) {
          postfixRow = row;
          isExpanded = row.getAttribute(DUPLICATE_EXPANDED_ATTR) === 'true';
          break;
        }
      }
      if (postfixRow) {
        break;
      }
    }

    // Если не нашли постфикс, ищем первую видимую строку первой группы
    if (!postfixRow && tagItemGroups.length > 0) {
      const firstGroup = tagItemGroups[0];
      for (const row of firstGroup) {
        if (row.isConnected && 
            (!row.style.display || row.style.display !== 'none') &&
            row.offsetParent !== null) {
          postfixRow = row;
          break;
        }
      }
      if (!postfixRow && firstGroup.length > 0) {
        postfixRow = firstGroup[0];
      }
    }

    if (!postfixRow) {
      return;
    }

    itemIgnoreMutations = true;
    try {
      // Собираем все строки дубликатов (все группы кроме первой)
      const firstGroup = tagItemGroups[0];
      const duplicateGroups = tagItemGroups.slice(1);
      const allDuplicateRows = [];
      duplicateGroups.forEach(itemRows => {
        allDuplicateRows.push(...itemRows);
      });

      if (isExpanded) {
        // Скрываем дубликаты (все группы кроме первой)
        duplicateGroups.forEach(itemRows => {
          itemRows.forEach(row => {
            row.style.display = 'none';
            row.setAttribute(DUPLICATE_HIDDEN_ATTR, 'true');
          });
        });
        postfixRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'false');
        // Обновляем постфикс
        const countSpan = postfixRow.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
        if (countSpan) {
          countSpan.textContent = ` (×${tagItemGroups.length})`;
        } else {
          addDuplicateCountPostfix(postfixRow, tagItemGroups.length, tag);
          postfixRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'false');
        }
      } else {
        // Показываем дубликаты (все группы)
        tagItemGroups.forEach(itemRows => {
          itemRows.forEach(row => {
            row.style.display = '';
            row.removeAttribute(DUPLICATE_HIDDEN_ATTR);
          });
        });
        
        // Сортируем строки: титульный предмет первым, затем дубликаты подряд
        if (tagItemGroups.length > 1 && firstGroup.length > 0) {
          const parent = postfixRow.parentElement;
          if (parent) {
            sortDuplicateItems(tagItemGroups, parent, firstGroup);
          }
        }
        
        postfixRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'true');
        // Обновляем постфикс
        const countSpan = postfixRow.querySelector(`span[${DUPLICATE_COUNT_ATTR}]`);
        if (countSpan) {
          countSpan.textContent = ` (×${tagItemGroups.length})`;
        } else {
          addDuplicateCountPostfix(postfixRow, tagItemGroups.length, tag);
          postfixRow.setAttribute(DUPLICATE_EXPANDED_ATTR, 'true');
        }
      }
    } finally {
      requestAnimationFrame(() => {
        itemIgnoreMutations = false;
      });
    }
  }
})();

