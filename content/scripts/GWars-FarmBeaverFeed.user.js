// ==UserScript==
// @name         [GWars] Farm Beaver Feed
// @namespace    gwars-tools
// @version      0.2
// @description  Делает ссылки "Собрать урожай" неактивными и добавляет ссылку "Пора кормить бобра" при наличии голодного бобра на ферме
// @author       KOMBAT
// @match        https://www.gwars.io/ferma.php*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/komb4t.github.io/scripts/GWars-FarmBeaverFeed.user.js
// @downloadURL  https://raw.githubusercontent.com/komb4t.github.io/scripts/GWars-FarmBeaverFeed.user.js
// ==/UserScript==

(function () {
    'use strict';
  
    const FEED_LINK_MARKER = 'data-gwars-beaver-feed-link';
    const DISABLED_COLLECT_MARKER = 'data-gwars-collect-disabled';
    const HIGHLIGHT_CLASS = 'gwars-beaver-feed-highlight';
    let processing = false;
  
    // Добавляем стили для неактивных ссылок и подсветки
    const injectStyles = () => {
      if (document.getElementById('gwars-beaver-feed-styles')) {
        return;
      }
      const style = document.createElement('style');
      style.id = 'gwars-beaver-feed-styles';
      style.textContent = `
        a[${DISABLED_COLLECT_MARKER}] {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          text-decoration: line-through !important;
          color: #999 !important;
        }
        a[${FEED_LINK_MARKER}] {
          display: block;
          margin-top: 8px !important;
        }
        a[${FEED_LINK_MARKER}].${HIGHLIGHT_CLASS} {
          background-color: #ffeb3b !important;
          color: #000 !important;
          padding: 0px 0px !important;
          border-radius: 2px !important;
        }
        @keyframes gwars-beaver-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    };
  
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };
  
    const init = () => {
      if (processing) {
        return; // Предотвращаем параллельные вызовы
      }
  
      // Найти ссылку с картинкой bober1.png
      const beaverLink = document.querySelector('a[href*="/ferma.php"] img[src*="bober1.png"]')?.closest('a');
  
      if (!beaverLink) {
        return; // Бобр не найден, ничего не делаем
      }
  
      const beaverHref = beaverLink.getAttribute('href');
      if (!beaverHref) {
        return;
      }
  
      // Найти все ссылки со словом "Собрать" (кроме уже обработанных)
      const collectLinks = Array.from(document.querySelectorAll('a[href*="/ferma.php"]')).filter(link => {
        const text = link.textContent || '';
        return text.includes('Собрать') && !link.hasAttribute(DISABLED_COLLECT_MARKER);
      });
  
      if (collectLinks.length === 0) {
        return; // Ссылки "Собрать" не найдены, ничего не делаем
      }
  
      processing = true;
  
      // Найти родительский элемент первой ссылки "Собрать" для вставки новой ссылки
      const firstCollectLink = collectLinks[0];
      const parentElement = firstCollectLink.parentElement;
  
      if (!parentElement) {
        processing = false;
        return;
      }
  
      // Проверить, не создана ли уже ссылка "Пора кормить бобра"
      let feedLink = parentElement.querySelector(`a[${FEED_LINK_MARKER}]`);
  
      if (!feedLink) {
        // Создать новую ссылку "Пора кормить бобра"
        feedLink = document.createElement('a');
        feedLink.href = beaverHref;
        feedLink.onclick = function() { return gotourl(this); };
        feedLink.setAttribute('data-gwars-farm-timer-bound', '1');
        feedLink.setAttribute(FEED_LINK_MARKER, '1');
  
        const boldText = document.createElement('b');
        boldText.textContent = 'Пора кормить бобра';
        feedLink.appendChild(boldText);
  
        // Вставить новую ссылку на следующей строке после последней ссылки "Собрать"
        const lastCollectLink = collectLinks[collectLinks.length - 1];
        const br = document.createElement('br');
  
        if (lastCollectLink.nextSibling) {
          parentElement.insertBefore(br, lastCollectLink.nextSibling);
          parentElement.insertBefore(feedLink, br.nextSibling);
        } else {
          parentElement.appendChild(br);
          parentElement.appendChild(feedLink);
        }
      } else {
        // Ссылка уже существует, проверяем есть ли перед ней <br>
        const prevSibling = feedLink.previousSibling;
        if (!prevSibling || prevSibling.nodeName !== 'BR') {
          // Добавляем <br> перед ссылкой
          const br = document.createElement('br');
          parentElement.insertBefore(br, feedLink);
        }
      }
  
      // Сделать ссылки "Собрать" неактивными и добавить обработчик клика
      collectLinks.forEach(link => {
        if (link.hasAttribute(DISABLED_COLLECT_MARKER)) {
          return; // Уже обработана
        }
  
        link.setAttribute(DISABLED_COLLECT_MARKER, '1');
  
        // Сохраняем оригинальный onclick для возможного восстановления
        const originalOnclick = link.getAttribute('onclick');
  
        // Переопределяем onclick для блокировки inline обработчика
        link.setAttribute('onclick', 'return false;');
  
        // Перехватываем клик
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
  
          // Подсветить ссылку "Пора кормить бобра"
          if (feedLink) {
            feedLink.classList.add(HIGHLIGHT_CLASS);
            setTimeout(() => {
              feedLink.classList.remove(HIGHLIGHT_CLASS);
            }, 1000);
          }
  
          return false;
        }, true); // Используем capture phase для перехвата до других обработчиков
      });
  
      processing = false;
    };
  
    const debouncedInit = debounce(init, 50);
  
    const startObserver = () => {
      const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
  
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Проверяем, добавлены ли новые элементы, связанные с фермой
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const hasBeaver = node.querySelector && (
                  node.querySelector('img[src*="bober1.png"]') ||
                  node.matches && node.matches('img[src*="bober1.png"]')
                );
                const hasCollectLink = node.querySelector && (
                  node.querySelector('a[href*="/ferma.php"]') ||
                  node.matches && node.matches('a[href*="/ferma.php"]')
                );
  
                if (hasBeaver || hasCollectLink) {
                  shouldUpdate = true;
                  break;
                }
              }
            }
          }
  
          if (shouldUpdate) break;
        }
  
        if (shouldUpdate) {
          debouncedInit();
        }
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    };
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        init();
        startObserver();
      }, { once: true });
    } else {
      injectStyles();
      init();
      startObserver();
    }
  })();
  
  