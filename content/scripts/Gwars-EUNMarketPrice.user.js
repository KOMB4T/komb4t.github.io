// ==UserScript==
// @name         Gwars-EUNMarketPrice
// @namespace    https://gwars.io/
// @version      0.2
// @description  Отображает около каждой цены в формате 14,800,000$ количество ГБ за 1 EUN в кратком формате xxx,xx ГБ/EUN. Минимальная цена красная и жирная, остальные — темно-зеленые с немного меньшим шрифтом.
// @author       KOMB4T
// @match        https://www.gwars.io/market.php?buy=1&item_id=*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/komb4t.github.io/scripts/Gwars-EUNMarketPrice.user.js
// @downloadURL  https://raw.githubusercontent.com/komb4t.github.io/scripts/Gwars-EUNMarketPrice.user.js
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_PRICE_KEY = 'EUNMarketPrice';
    const CACHE_TIME_KEY = 'EUNMarketPrice_ActualTime';
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const EUN_MARKET_URL = 'https://www.gwars.io/market.php?stage=21';
    const COMMERCIAL_MIN_KEY = 'EUNMinPrice';
    const BASE_PRICE_CELL_SELECTOR = 'td.greengreenbg';

    function parseNumber(str) {
        if (!str) return null;
        const cleaned = str.replace(/[^0-9,]/g, '').replace(/,/g, '');
        const num = parseFloat(cleaned);
        return Number.isFinite(num) ? num : null;
    }

    function parseCacheTime(value) {
        if (!value) return null;
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) ? timestamp : null;
    }

    function getCachedMarketPrice() {
        const priceStr = localStorage.getItem(CACHE_PRICE_KEY);
        const timeStr = localStorage.getItem(CACHE_TIME_KEY);
        if (!priceStr || !timeStr) return null;

        const timestamp = parseCacheTime(timeStr);
        if (timestamp === null || Date.now() - timestamp > CACHE_TTL_MS) return null;

        const price = parseFloat(priceStr);
        if (!Number.isFinite(price)) return null;

        const result = { price, timestamp };
        const minCommercialStr = localStorage.getItem(COMMERCIAL_MIN_KEY);
        if (minCommercialStr) {
            const minCommercial = parseFloat(minCommercialStr);
            if (Number.isFinite(minCommercial)) result.minCommercial = minCommercial;
        }
        return result;
    }

    function setCachedMarketPrice(price, timestamp, minCommercial) {
        localStorage.setItem(CACHE_PRICE_KEY, String(price));
        localStorage.setItem(CACHE_TIME_KEY, new Date(timestamp).toISOString());
        if (Number.isFinite(minCommercial)) {
            localStorage.setItem(COMMERCIAL_MIN_KEY, String(minCommercial));
        } else {
            localStorage.removeItem(COMMERCIAL_MIN_KEY);
        }
    }

    function findBasePriceCell() {
        const cells = document.querySelectorAll(BASE_PRICE_CELL_SELECTOR);
        return Array.from(cells).find(cell => /Базовая цена/i.test(cell.textContent));
    }

    function formatMarketPrice(price) {
        return Number.isFinite(price) ? price.toLocaleString('ru-RU') : '';
    }

    function formatTimestamp(timestamp) {
        if (!Number.isFinite(timestamp)) return null;
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function renderMarketPriceInfo(data, attempt = 0) {
        const cell = findBasePriceCell();
        if (!cell) {
            if (attempt < 10) {
                setTimeout(() => renderMarketPriceInfo(data, attempt + 1), 200);
            }
            return;
        }

        const previous = cell.querySelector('.eun-market-price-info');
        if (previous) previous.remove();

        if (!data || !Number.isFinite(data.price)) return;

        const container = document.createElement('span');
        container.className = 'eun-market-price-info';
        container.style.display = 'inline-block';
        container.style.lineHeight = '13px';

        const lineBreak = document.createElement('br');
        container.appendChild(lineBreak);

        const timestamp = formatTimestamp(data.timestamp);
        const suffix = timestamp ? ` (${timestamp})` : ' (кэш)';
        const link = document.createElement('a');
        link.href = EUN_MARKET_URL;
        link.textContent = `\u00a0•\u00a0Рыночная цена${suffix}`;
        link.style.color = '#205020';
        link.style.textDecoration = 'none';
        container.appendChild(link);

        const separator = document.createTextNode(': ');
        container.appendChild(separator);

        const priceValue = document.createElement('span');
        priceValue.style.fontWeight = 'bold';
        priceValue.style.color = '#205020';
        priceValue.textContent = `${formatMarketPrice(data.price)} ГБ/EUN`;
        container.appendChild(priceValue);

        if (Number.isFinite(data.minCommercial)) {
            const minInfo = document.createElement('span');
            minInfo.style.color = '#2f6f2f';
            minInfo.textContent = `; мин.: ${formatMarketPrice(Math.round(data.minCommercial))} ГБ/EUN`;
            container.appendChild(minInfo);
        }


        const breaks = Array.from(cell.querySelectorAll('br'));
        const lastBreak = breaks.length ? breaks[breaks.length - 1] : null;
        if (lastBreak) {
            cell.insertBefore(container, lastBreak);
        } else {
            cell.appendChild(container);
        }
    }

    function getBasePriceValue() {
        const cell = findBasePriceCell();
        if (!cell) return null;
        const boldElements = Array.from(cell.querySelectorAll('b'));
        const baseElement = boldElements.find(el => /EUN/i.test(el.textContent));
        if (!baseElement) return null;
        const value = parseNumber(baseElement.textContent);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function formatPerEunShort(value) {
        if (!Number.isFinite(value) || value <= 0) return null;
        const thousands = value / 1000;
        const rounded = Math.round(thousands * 10) / 10;
        return `${rounded.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}к`;
    }

    function renderGovernmentPriceNote(attempt = 0) {
        const cell = findBasePriceCell();
        if (!cell) {
            if (attempt < 10) {
                setTimeout(() => renderGovernmentPriceNote(attempt + 1), 200);
            }
            return;
        }

        const basePrice = getBasePriceValue();
        if (!Number.isFinite(basePrice) || basePrice <= 0) return;

        const governmentPrice = Math.floor(basePrice * 0.9);
        if (!Number.isFinite(governmentPrice) || governmentPrice <= 0) return;

        const existing = cell.querySelector('.eun-government-price');
        const noteText = ` (${governmentPrice.toLocaleString('ru-RU')} при продаже)`;

        if (existing) {
            existing.textContent = noteText;
            return;
        }

        const boldElements = Array.from(cell.querySelectorAll('b'));
        const baseElement = boldElements.find(el => /EUN/i.test(el.textContent));
        if (!baseElement) return;

        const span = document.createElement('span');
        span.className = 'eun-government-price';
        span.textContent = noteText;

        baseElement.insertAdjacentElement('afterend', span);
    }

    function enhancePriceColumns(attempt = 0) {
        const basePrice = getBasePriceValue();
        if (!Number.isFinite(basePrice) || basePrice <= 0) {
            if (attempt < 10) {
                setTimeout(() => enhancePriceColumns(attempt + 1), 200);
            }
            return;
        }

        const governmentPrice = Math.floor(basePrice * 0.9);
        if (!Number.isFinite(governmentPrice) || governmentPrice <= 0) return;

        const priceCells = Array.from(document.querySelectorAll('tr > td:first-child')).filter(cell => /\$/.test(cell.textContent));
        if (!priceCells.length) {
            if (attempt < 10) {
                setTimeout(() => enhancePriceColumns(attempt + 1), 200);
            }
            return;
        }

        const marketPriceData = getCachedMarketPrice();
        const marketPrice = marketPriceData && Number.isFinite(marketPriceData.price) ? marketPriceData.price : null;

        priceCells.forEach(cell => {
            if (cell.querySelector('.eun-price-annotation')) return;

            const priceValue = parseNumber(cell.textContent);
            if (!Number.isFinite(priceValue) || priceValue <= 0) return;

            cell.style.whiteSpace = 'nowrap';

            const dirtyPrice = priceValue / basePrice;
            const cleanPrice = priceValue / governmentPrice;

            const formattedClean = formatPerEunShort(cleanPrice);
            const formattedDirty = formatPerEunShort(dirtyPrice);
            if (!formattedClean || !formattedDirty) return;

            const annotation = document.createElement('span');
            annotation.className = 'eun-price-annotation';
            annotation.style.color = '#2f6f2f';
            annotation.style.fontSize = '9pt';
            annotation.style.marginLeft = '4px';
            annotation.appendChild(document.createTextNode(' ('));

            const cleanSpan = document.createElement('span');
            cleanSpan.textContent = formattedClean;
            cleanSpan.title = `${Math.round(cleanPrice).toLocaleString('ru-RU')} за ${governmentPrice.toLocaleString('ru-RU')} EUN`;
            if (Number.isFinite(marketPrice) && cleanPrice <= marketPrice) {
                cleanSpan.style.fontWeight = 'bold';
            }

            const dirtySpan = document.createElement('span');
            dirtySpan.textContent = formattedDirty;
            if (Number.isFinite(marketPrice) && dirtyPrice <= marketPrice) {
                dirtySpan.style.fontWeight = 'bold';
            }
            const dirtyEunValue = Math.round(dirtyPrice);
            dirtySpan.title = `${dirtyEunValue.toLocaleString('ru-RU')} за ${basePrice.toLocaleString('ru-RU')} EUN`;

            annotation.appendChild(cleanSpan);
            const separator = document.createTextNode(' ч.\\ ');
            annotation.appendChild(separator);
            annotation.appendChild(dirtySpan);
            const suffix = document.createTextNode(' гр.)');
            annotation.appendChild(suffix);

            cell.appendChild(annotation);
        });
    }

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function extractBankPrice(doc) {
        const link = Array.from(doc.querySelectorAll('a')).find(a => /Обмен\s+Гб\s+на\s+EUN/i.test(a.textContent));
        if (!link) return null;
        const match = link.textContent.match(/([\d.,]+)\s*Гб\s+за\s+1\s*EUN/i);
        return match ? parseNumber(match[1]) : null;
    }

    function extractCommercialStats(doc) {
        const rows = Array.from(doc.querySelectorAll('tr')).filter(tr => tr.cells && tr.cells.length >= 5 && /\$/.test(tr.cells[0].textContent));
        if (!rows.length) return null;

        const topRows = rows.slice(0, 3);
        const values = topRows.map(tr => parseNumber(tr.cells[0].textContent)).filter(Number.isFinite);
        if (!values.length) return null;

        const total = values.reduce((sum, value) => sum + value, 0);
        const average = total / values.length;
        const min = Math.min(...values);

        return { average, min };
    }

    async function fetchMarketPrice(force = false) {
        if (!force) {
            const cached = getCachedMarketPrice();
            if (cached) {
                console.log(
                    '[EUNMarketPrice] Рыночный курс из кэша:',
                    cached.price,
                    'ГБ/EUN',
                    'Мин. комм.:',
                    cached.minCommercial ?? 'н/д'
                );
                renderMarketPriceInfo(cached);
                return cached;
            }
        }

        try {
            const response = await fetch(EUN_MARKET_URL, { credentials: 'include' });
            if (!response.ok) throw new Error(`Не удалось получить данные ${response.status}`);

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const bankPrice = extractBankPrice(doc);
            const commercialStats = extractCommercialStats(doc);
            const commercialAverage = commercialStats ? commercialStats.average : null;
            const commercialMin = commercialStats ? commercialStats.min : null;

            const candidates = [bankPrice, commercialAverage].filter(Number.isFinite);
            if (!candidates.length) return null;

            const minPriceRaw = Math.min(...candidates);
            const minPrice = Math.round(minPriceRaw);
            const timestamp = Date.now();

            setCachedMarketPrice(minPrice, timestamp, commercialMin);
            console.log('[EUNMarketPrice] Рыночный курс обновлён:', minPrice, 'ГБ/EUN', 'Мин. комм.:', commercialMin ?? 'н/д');
            const result = { price: minPrice, timestamp, minCommercial: commercialMin };
            renderMarketPriceInfo(result);
            return result;
        } catch (error) {
            console.error('Ошибка получения рыночной цены EUN', error);
            return null;
        }
    }

    onReady(() => {
        renderGovernmentPriceNote();
        const cachedBeforeInit = getCachedMarketPrice();
        if (cachedBeforeInit) {
            renderMarketPriceInfo(cachedBeforeInit);
        }
        enhancePriceColumns();
        fetchMarketPrice();
    });
})();