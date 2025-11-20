// ==UserScript==
// @name         [GWars] Outland Departure Link
// @namespace    gwars-tools
// @version      0.1
// @description  Добавляет ссылку для быстрого отплытия на Outland на основе текущего сектора
// @match        https://www.gwars.io/map.php*
// @grant        none
// @author       KOMBAT
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-OutlandDepartureLink.user.js
// @updateURL    https://raw.githubusercontent.com/KOMB4t.github.io/scripts/GWars-OutlandDepartureLink.user.js
// ==/UserScript==

(function () {
  'use strict';

  // Маппинг названий секторов на sectorout значения
  const SECTOR_MAPPING = {
    // Ganja Island
    'Green Parks': 0,
    'Failure of perl': 1,
    'Seaside walleys': 2,
    'Sheever place': 3,
    'Red point': 4,
    'Black Brooklyn': 5,
    // Тюремный остров
    'Dolphin Port': 6,
    // Z-Lands Island
    'Power Lost': 7,
    'Cygnus Base': 8,
    'Freedom End': 9,
    'Energy One': 10,
    'Grand Port': 11,
    // Palm Island
    'Palm Airport': 14,
  };

  const SECTOR_IN = 13; // Сектор назначения всегда 13

  /**
   * Извлекает название текущего сектора из DOM
   * @returns {string|null} Название сектора или null
   */
  const getCurrentSectorName = () => {
    try {
      // Ищем div с классом greenlightbg, содержащий текст "Вы находитесь в секторе"
      const sectorDiv = Array.from(document.querySelectorAll('div.greenlightbg')).find(div => {
        const text = div.textContent || '';
        return text.includes('Вы находитесь в секторе');
      });

      if (!sectorDiv) {
        return null;
      }

      // Ищем ссылку внутри этого div
      const sectorLink = sectorDiv.querySelector('a[href*="/map.php"]');
      if (!sectorLink) {
        return null;
      }

      // Извлекаем текст ссылки, убираем префикс [G] или [Z] и лишние пробелы
      let sectorName = sectorLink.textContent?.trim() || '';
      // Убираем префикс [G] или [Z] если есть
      sectorName = sectorName.replace(/^\[[GZ]\]\s*/i, '').trim();
      
      return sectorName || null;
    } catch (err) {
      console.error('[GWars MapSector13Link] Ошибка при извлечении названия сектора:', err);
      return null;
    }
  };

  /**
   * Определяет sectorout на основе названия сектора
   * @param {string} sectorName - Название сектора
   * @returns {number|null} Значение sectorout или null
   */
  const getSectorOut = (sectorName) => {
    if (!sectorName) {
      return null;
    }

    // Прямое совпадение
    if (SECTOR_MAPPING.hasOwnProperty(sectorName)) {
      return SECTOR_MAPPING[sectorName];
    }

    // Поиск по частичному совпадению (без учета регистра)
    const sectorNameLower = sectorName.toLowerCase();
    for (const [key, value] of Object.entries(SECTOR_MAPPING)) {
      if (key.toLowerCase() === sectorNameLower) {
        return value;
      }
    }

    return null;
  };

  /**
   * Создает ссылку для перехода в сектор 13
   * @param {number} sectorOut - Значение sectorout
   * @returns {HTMLElement} Элемент ссылки
   */
  const createSector13Link = (sectorOut) => {
    const link = document.createElement('a');
    link.href = `/map.move.php?seaway=1&sectorin=${SECTOR_IN}&sectorout=${sectorOut}&confirm=1`;
    link.style.color = '#398b1c';
    link.style.marginLeft = '10px';
    link.innerHTML = '<b>» OP</b>';
    link.title = 'Отплыть в Overlord Point';
    return link;
  };

  /**
   * Вставляет ссылку справа от элемента "Выйти в прибрежную зону"
   */
  const insertSector13Link = () => {
    try {
      // Ищем div с классом greenlightbg, содержащий ссылку "Выйти в прибрежную зону"
      const walkDiv = Array.from(document.querySelectorAll('div.greenlightbg')).find(div => {
        const walkLink = div.querySelector('a[href="/walk.php"]');
        return walkLink && walkLink.textContent?.includes('Выйти в прибрежную зону');
      });

      if (!walkDiv) {
        return;
      }

      // Проверяем, не добавлена ли уже ссылка
      if (walkDiv.querySelector('a[href*="map.move.php?seaway=1&sectorin=13"]')) {
        return;
      }

      // Получаем название текущего сектора
      const sectorName = getCurrentSectorName();
      if (!sectorName) {
        console.warn('[GWars MapSector13Link] Не удалось определить текущий сектор');
        return;
      }

      // Определяем sectorout
      const sectorOut = getSectorOut(sectorName);
      if (sectorOut === null) {
        console.warn(`[GWars MapSector13Link] Неизвестный сектор: "${sectorName}"`);
        return;
      }

      // Создаем и вставляем ссылку
      const link = createSector13Link(sectorOut);
      walkDiv.appendChild(link);
    } catch (err) {
      console.error('[GWars MapSector13Link] Ошибка при вставке ссылки:', err);
    }
  };

  // Инициализация
  const init = () => {
    insertSector13Link();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

