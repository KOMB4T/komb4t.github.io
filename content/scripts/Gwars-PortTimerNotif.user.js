// ==UserScript==
// @name            [Gwars]PortTimerNotif
// @description     Отображает нотификацию о ближайшем порте, цвет нотификации зависит от времени до порта
// @author          KOMBAT
// @match           https://*.gwars.io/*
// @grant           none
// @updateURL       https://raw.githubusercontent.com/KOMB4t.github.io/scripts/Gwars-PortTimerNotif.user.js
// @downloadURL     https://raw.githubusercontent.com/KOMB4t.github.io/scripts/Gwars-PortTimerNotif.user.js
// @version         1.1
// ==/UserScript==

(function () { 'use strict';

  const DEBUG = false;
const warUrl = new URL('/war.php', location.origin).toString();
const dbg = (...a) => { if (DEBUG) console.log(...a); };
  const CACHE_KEY = 'gwars-porttimer-cache-v2';
  const WINSTAT_DAYS = 14;
  const WINSTAT_WINDOW_MS = WINSTAT_DAYS * 24 * 60 * 60 * 1000;
  const KEY_PREFIX_WARS = 'synlogwars';
  const ACTIVE_GRACE_MINUTES = 5;
  const NOTIF_FLOATING_ID = 'gwars-porttimer-notif';
  const NOTIF_INLINE_ID = 'gwars-porttimer-inline';
  const SHOW_NO_PORTS_MESSAGE = true;
  const NOTIF_BASE_STYLE = Object.freeze({
    position: 'fixed',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0px 2px',
    borderRadius: '1px',
    textAlign: 'center',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    background: 'rgba(233,255,233,0.95)',
    //boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease'
  });
  const NOTIF_VARIANT_STYLES = Object.freeze({
    normal: {
      //background: 'rgba(233,255,233,0.95)',
      color: 'rgb(51,102,51)',
      //boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
    },
    warning: {
      background: 'rgba(255,224,165,0.95)',
      color: '#2d2d2d',
      boxShadow: '0 4px 16px rgba(163,102,0,0.35)'
    },
    alert: {
      background: 'rgba(128,0,0,0.9)',
      color: '#ffffff',
      boxShadow: '0 4px 16px rgba(128,0,0,0.5)'
    }
  });
  const NOTIF_INLINE_BASE_STYLE = Object.freeze({
    display: 'inline-flex',
    alignItems: 'center',
    //justifyContent: 'center',
    //padding: '4px 8px',
    minWidth: '0',
    whiteSpace: 'nowrap',
    //verticalAlign: 'middle'
  });
  const metaKeyWars = (id) => `${KEY_PREFIX_WARS}:${id}:meta`;
  const storageKeyWars = (id, page) => `${KEY_PREFIX_WARS}:${id}:p${page}`;
  
  // Поддержка statsCache из Gwars-AttackPercentWinInfo
  const STATS_CACHE_1V1_KEY = 'statsCache1v1';
  const STATS_CACHE_2V2_KEY = 'statsCache2v2';
  const DAYS_WINDOW = WINSTAT_DAYS;
  
  const normalizeTsValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string'){
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return numeric;
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  };
  
  const resolveMetaFinishedAtMs = (meta) => {
    if (!meta || typeof meta !== 'object') return null;
    const direct = normalizeTsValue(meta.finishedAtMs);
    if (direct !== null) return direct;
    return normalizeTsValue(meta.finishedAt);
  };
  
  const getEventsCacheVersion = (syndIds) => {
    if (!Array.isArray(syndIds) || !syndIds.length) return null;
    let maxVersion = null;
    for (const id of syndIds){
      try{
        const metaKey = metaKeyWars(String(id));
        const metaRaw = localStorage.getItem(`__gwars_${metaKey}`);
        if (metaRaw){
          const meta = JSON.parse(metaRaw);
          const finishedAtMs = resolveMetaFinishedAtMs(meta);
          if (finishedAtMs !== null && (maxVersion === null || finishedAtMs > maxVersion)){
            maxVersion = finishedAtMs;
          }
        }
      }catch(e){ 
        dbg('getEventsCacheVersion ошибка для #' + id + ':', e);
      }
    }
    return maxVersion;
  };
  
  const normalizeKey = (ids) => ids.filter(Boolean).map(String).filter(s => s && s !== "0").sort((a, b) => Number(a) - Number(b)).join('+');
  
  const daysAgo = (n) => { 
    const d = new Date(); 
    d.setDate(d.getDate() - n); 
    d.setHours(0, 0, 0, 0); 
    return d; 
  };
  
  const makeStatsCacheKey = (myIds, is2v2) => {
    const myKey = normalizeKey(myIds || []);
    const cacheType = is2v2 ? STATS_CACHE_2V2_KEY : STATS_CACHE_1V1_KEY;
    return `${cacheType}:${myKey}`;
  };
  
  const getCachedStats = (myIds, pairIds, syndIds) => {
    try{
      const is2v2 = pairIds && pairIds.length === 2;
      
      // Пробуем найти по точному myIds
      let cacheKey = makeStatsCacheKey(myIds, is2v2);
      let cachedRaw = localStorage.getItem(`__gwars_${cacheKey}`);
      
      // Если не найдено и это 1v1, пробуем найти по каждому targetId из myIds
      if (!cachedRaw && !is2v2 && myIds && myIds.length > 0 && syndIds && syndIds.length > 0){
        const syndSet = new Set(syndIds.map(String));
        for (const targetId of myIds){
          const targetIdStr = String(targetId);
          if (!syndSet.has(targetIdStr)) continue;
          cacheKey = makeStatsCacheKey([targetIdStr], false);
          cachedRaw = localStorage.getItem(`__gwars_${cacheKey}`);
          if (cachedRaw) break;
        }
      }
      
      if (!cachedRaw) return null;
      
      const cached = JSON.parse(cachedRaw);
      const currentVersion = getEventsCacheVersion(syndIds);
      
      // Если версия кэша событий изменилась - кэш статистики недействителен
      if (currentVersion === null || cached.version !== currentVersion) return null;
      
      // Проверяем, покрывает ли период кэша актуальный DAYS_WINDOW
      const wndFrom = daysAgo(DAYS_WINDOW);
      const now = new Date();
      const maxTopStaleMs = 24 * 3600 * 1000;
      
      if (cached.period && cached.period.from && cached.period.to){
        const periodFrom = new Date(cached.period.from);
        const periodTo = new Date(cached.period.to);
        
        const hasLowerBound = periodFrom <= wndFrom;
        const hasUpperBound = periodTo >= wndFrom && (now - periodTo <= maxTopStaleMs);
        
        if (!hasLowerBound || !hasUpperBound) return null;
      } else {
        return null;
      }
      
      // Ищем статистику для нужной пары противников
      if (!cached.stats || !Array.isArray(cached.stats)) return null;
      
      const pairKey = normalizeKey(pairIds || []);
      for (const stat of cached.stats){
        const statPairKey = normalizeKey(stat.opponentIds || []);
        if (statPairKey === pairKey){
          return {
            attacks: stat.attacks || 0,
            attackWins: stat.attackWins || 0,
            total: stat.total || 0,
            totalWins: stat.totalWins || 0,
            pairIds: stat.opponentIds || [],
            period: cached.period || null,
            savedAt: cached.savedAt || null,
          };
        }
      }
      
      return null;
    }catch(_){
      return null;
    }
  };
  let headerObserver = null;
  let headerObserverTarget = null;
  let sectorObserver = null;
  let sectorObserverTarget = null;
  let inlineReattachObserver = null;
  let inlineReattachScheduled = false;
  let inlineReattachTimeout = null;
  let lastInlinePayload = null;
  let battleTableObserver = null;

dbg('warUrl =', warUrl);

  const todayKey = getTodayKey();
  const IS_SECTOR_PAGE = /\/walk\.(?:op|p|bp)\.php/i.test(location.pathname);
  const IS_BATTLE_PAGE = /\/b0\/b\.php/i.test(location.pathname);
  const cachedDaily = loadCache();
  if (cachedDaily && cachedDaily.date === todayKey) {
    dbg('Using cached schedule for today without fetching');
    handleEntries(cachedDaily.entries || [], cachedDaily.sid || null, null);
    return;
  }

  fetchWithEncoding(warUrl)
.then(html => {
  dbg('HTML length =', html.length);
  dbg('HTML head sample =', html.slice(0, 200).replace(/\s+/g, ' ').trim());

  const doc = new DOMParser().parseFromString(html, 'text/html');
  dbg('doc.title =', (doc.querySelector('title')?.textContent || '').trim() || '(no title)');

  // Ищем td.greenlightbg
  const tds = Array.from(doc.querySelectorAll('td.greenlightbg'));
  dbg('td.greenlightbg count =', tds.length);
  tds.slice(0, 5).forEach((td, i) => {
    const a = td.querySelector('a');
    dbg(`td[${i}] text=`, preview(td.textContent), '| a.text=', a ? preview(a.textContent) : '(no a)');
  });

  // Нормализация текста для поиска
  const norm = s => (s || '').replace(/\u00a0/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();

  // Ищем ссылку по тексту "Бой за порты" и берём ближайший td
  const anchors = Array.from(doc.querySelectorAll('a'));
  const anchorsMatched = anchors.filter(a => norm(a.textContent).includes('бой за порты'));
  dbg('anchors total =', anchors.length, 'anchors matched =', anchorsMatched.length);

  let td =
    tds.find(td => {
      const a = td.querySelector('a');
      return a && norm(a.textContent).includes('бой за порты');
    }) ||
    (anchorsMatched[0] ? anchorsMatched[0].closest('td') : null);

  if (!td) {
    dbg('td NOT FOUND. Доп. диагностика:');
    if (anchorsMatched[0]) {
      const a = anchorsMatched[0];
      dbg('anchor.outerHTML =', previewHTML(a.outerHTML));
      const parentTd = a.closest('td');
      dbg('parentTd exists =', !!parentTd, 'parentTd.text =', parentTd ? preview(parentTd.textContent) : '(no td)');
    } else {
      const idx = norm(html).indexOf('бой за порты');
      dbg('"бой за порты" in raw html =', idx >= 0, 'index =', idx);
      if (idx >= 0) dbg('raw snippet =', html.slice(Math.max(0, idx - 120), idx + 120).replace(/\s+/g, ' '));
    }
    return; // прекращаем
  }

  dbg('td FOUND. td.text =', preview(td.textContent));

    const scheduleLink = td.querySelector('a')?.getAttribute('href');
    const scheduleUrl = scheduleLink ? new URL(scheduleLink, location.origin).toString() : null;
    const targetSid = extractSid(scheduleUrl);

    ensureSchedule(scheduleUrl, targetSid).then(entries => {
      dbg('Schedule entries available =', entries.length);
      handleEntries(entries, targetSid, td);
    }).catch(err => {
      dbg('Schedule error:', err?.stack || err?.message || err);
      legacyNotificationFallback(td);
    });
})
.catch(err => {
  dbg('ERROR:', err?.stack || err?.message || err);
});



  function fetchWithEncoding(url) {
    return fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'follow' })
      .then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        dbg('[fetch]', url, 'status =', r.status, 'content-type =', ct);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        let html;
        try {
          if (ct.includes('windows-1251') || ct.includes('cp1251')) {
            const buf = await r.arrayBuffer();
            const dec = new TextDecoder('windows-1251');
            html = dec.decode(buf);
            dbg('Decoded with TextDecoder(windows-1251)');
          } else {
            html = await r.text();
            dbg('Decoded with Response.text() (utf-8)');
          }
        } catch (e) {
          dbg('Decoder failed, fallback to text():', e.message || e);
          html = await r.text();
        }
        return html;
      });
  }

  function ensureSchedule(scheduleUrl, targetSid) {
    const todayKey = getTodayKey();
    const cached = loadCache();
    if (cached?.date === todayKey && cached?.sid === (targetSid || null) && Array.isArray(cached.entries) && cached.entries.length) {
      dbg('Using cached schedule for', todayKey);
      return Promise.resolve(cached.entries);
    }
    if (!scheduleUrl) {
      dbg('No scheduleUrl provided, cannot fetch schedule');
      return Promise.resolve([]);
    }
    return fetchWithEncoding(scheduleUrl).then(html => {
      const entries = parseSchedule(html, targetSid);
      saveCache({ date: todayKey, sid: targetSid || null, entries });
      return entries;
    });
  }

  function showNoPortsNotification(legacyTd) {
    if (SHOW_NO_PORTS_MESSAGE) {
      showNotif('Портов не будет', 'normal', 'Сегодня новых портов не ожидается');
    }
    if (legacyTd && !IS_BATTLE_PAGE) legacyNotificationFallback(legacyTd);
  }

  function handleEntries(entries, targetSid, legacyTd) {
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      showNoPortsNotification(legacyTd);
      return;
    }
    const enriched = enrichEntries(list);
    if (!enriched.length) {
      showNoPortsNotification(legacyTd);
      return;
    }

    const activeFight = enriched
      .filter(e => e.diffMinutes < 0 && e.diffMinutes >= -ACTIVE_GRACE_MINUTES)
      .sort((a, b) => a.diffMinutes - b.diffMinutes)[0];
    if (activeFight) {
      const tooltip = buildTooltip(activeFight, targetSid);
      let message;
      if (IS_BATTLE_PAGE) {
        message = 'Бой за порт';
      } else {
        const enemyWithStats = formatEnemyWithStats(activeFight, targetSid);
        message = enemyWithStats ? `Бой за порт ${enemyWithStats}` : 'Бой за порт';
      }
      dbg('[handleEntries] activeFight message=', message);
      showNotif(message, 'alert', tooltip);
      dbg('notification shown for active battle');
      return;
    }

    const futureFight = enriched
      .filter(e => e.diffMinutes >= 0)
      .sort((a, b) => a.diffMinutes - b.diffMinutes)[0];
    if (futureFight) {
      const tooltip = buildTooltip(futureFight, targetSid);
      const variant = futureFight.diffMinutes <= 5 ? 'warning' : 'normal';
      let message;
      if (IS_BATTLE_PAGE) {
        message = `Порт: ${formatDiff(futureFight.diffMinutes)}`;
      } else {
        const enemyWithStats = formatEnemyWithStats(futureFight, targetSid);
        const timePart = `Порт: ${formatDiff(futureFight.diffMinutes)}`;
        message = enemyWithStats ? `${timePart} ${enemyWithStats}` : timePart;
      }
      dbg('[handleEntries] futureFight message=', message);
      showNotif(message, variant, tooltip);
      dbg('notification shown from schedule');
      return;
    }

    showNoPortsNotification(legacyTd);
  }

  function enrichEntries(entries) {
    const now = new Date();
    const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return entries
      .map(entry => {
        const dt = buildDateTime(entry.time, todayBase);
        if (!dt) return null;
        return { ...entry, diffMinutes: (dt - now) / 60000 };
      })
      .filter(Boolean);
  }

  function parseSchedule(html, targetSid) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));
    const targetTable = tables.find(tbl => /Ближайшие\s+бои/i.test(tbl.textContent || ''));
    if (!targetTable) {
      dbg('Schedule table not found');
      return [];
    }
    const rows = Array.from(targetTable.querySelectorAll('tr')).slice(1);
    const entries = rows
      .map(tr => {
        const tds = tr.querySelectorAll('td');
        if (!tds.length) return null;
        const timeText = normText(tds[0]?.textContent);
        if (!/^[0-2]?[0-9]:[0-5][0-9]$/.test(timeText)) return null;
        const sizeText = normText(tds[1]?.textContent) || null;
        const opponent = extractOpponentDetails(tds[2], targetSid);
        return {
          time: timeText,
          size: sizeText,
          enemyId: opponent?.id || null,
          enemyName: opponent?.name || null
        };
      })
      .filter(Boolean);
    dbg('Parsed schedule entries =', entries);
    return entries;
  }

  function buildDateTime(timeStr, baseDate) {
    const match = /^([0-2]?[0-9]):([0-5][0-9])$/.exec(timeStr);
    if (!match) return null;
    const [_, h, m] = match;
    const dt = new Date(baseDate);
    dt.setHours(Number(h), Number(m), 0, 0);
    return dt;
  }

  function formatDiff(diffMinutes) {
    if (diffMinutes < 1) return 'менее минуты';
    if (diffMinutes < 60) return Math.round(diffMinutes) + 'м';
    const h = Math.floor(diffMinutes / 60);
    const m = Math.round(diffMinutes % 60);
    return h + 'ч' + (m ? m + 'м' : '');
  }

  function legacyNotificationFallback(td) {
    dbg('Using legacy fallback path');
    const raw = td.textContent || '';
    const s = String(raw)
      .replace('Бой за порты через ', '')
      .replace(/\[[0-9]+:[0-9]+]/i, '')
      .trim();
    const hourMatch = s.match(/(\d+)\s*ч\./i);
    const minuteMatch = s.match(/(\d+)\s*мин\./i);
    const secondMatch = s.match(/(\d+)\s*с\./i);
    let totalMinutes = null;
    if (hourMatch || minuteMatch) {
      const hours = hourMatch ? Number(hourMatch[1]) : 0;
      const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
      totalMinutes = hours * 60 + minutes;
    } else if (secondMatch) {
      totalMinutes = 0; // Меньше минуты
    }
    const isMinutes = totalMinutes !== null && totalMinutes >= 0;
    const isLess10Minutes = totalMinutes !== null && totalMinutes < 10;
    const isSecond = totalMinutes === 0;
    const timeStr = totalMinutes !== null ? formatDiff(totalMinutes) : s;
    const tooltip = s ? `До портового боя ${s}` : null;
    if (isMinutes) {
      const variant = totalMinutes <= 5 ? 'warning' : 'normal';
      showNotif('Порт: ' + timeStr, variant, tooltip);
    }
    if (isLess10Minutes || isSecond) {
      showNotif('Порт: ' + timeStr, 'alert', tooltip);
    }
  }

  function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      dbg('Cache load failed', e?.message || e);
      return null;
    }
  }

  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      dbg('Cache save failed', e?.message || e);
    }
  }

  function normText(s) {
    return (s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function extractSid(url) {
    try {
      const sid = new URL(url, location.origin).searchParams.get('sid');
      return sid || null;
    } catch (_) {
      return null;
    }
  }

  function extractOpponentDetails(cell, targetSid) {
    if (!cell) return null;
    const { leftHTML, rightHTML } = splitCellByVs(cell);
    const leftSide = parseSideDetails(leftHTML);
    const rightSide = parseSideDetails(rightHTML);
    const target = targetSid ? String(targetSid) : null;
    let opponent = null;
    if (target && leftSide.ids.includes(target)) opponent = rightSide;
    else if (target && rightSide.ids.includes(target)) opponent = leftSide;
    else opponent = rightSide.ids.length ? rightSide : leftSide;
    if (!opponent) return null;
    const id = opponent.ids[0] || null;
    const name = opponent.name || opponent.text || null;
    if (!id && !name) return null;
    return { id, name };
  }

  function splitCellByVs(cell) {
    const leftNodes = [];
    const rightNodes = [];
    let found = false;
    cell.childNodes.forEach(node => {
      if (!found && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const idx = text.toLowerCase().indexOf('vs');
        if (idx >= 0) {
          const before = text.slice(0, idx);
          const after = text.slice(idx + 2);
          if (before) leftNodes.push(document.createTextNode(before));
          if (after) rightNodes.push(document.createTextNode(after));
          found = true;
          return;
        }
      }
      (found ? rightNodes : leftNodes).push(node.cloneNode(true));
    });
    return {
      leftHTML: nodesToHTML(leftNodes),
      rightHTML: nodesToHTML(rightNodes)
    };
  }

  function nodesToHTML(nodes) {
    const div = document.createElement('div');
    nodes.forEach(n => div.appendChild(n));
    return div.innerHTML;
  }

  function parseSideDetails(html) {
    const container = document.createElement('div');
    container.innerHTML = html || '';
    const syndLinks = Array.from(container.querySelectorAll('a[href*="syndicate.php"]'));
    const ids = syndLinks
      .map(a => {
        const href = a.getAttribute('href') || '';
        const match = href.match(/id=(\d+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    const text = normText(container.textContent);
    let name = null;
    if (ids.length) {
      const id = ids[0];
      const objLink = Array.from(container.querySelectorAll('a[href*="object.php"]')).find(a => {
        const href = a.getAttribute('href') || '';
        const sidMatch = href.match(/sid=(\d+)/);
        return sidMatch?.[1] === id;
      });
      name = normText(objLink?.textContent) || null;
      if (!name) {
        name = text?.replace(new RegExp(`#?${id}\\s*`, 'i'), '').trim() || null;
      }
    }
    return { ids, name, text };
  }

  function buildTooltip(entry, targetSid) {
    if (!entry) return null;
    const parts = [];
    if (entry.time) parts.push(entry.time);
    if (entry.size) parts.push(entry.size);
    const enemyWithStats = formatEnemyWithStats(entry, targetSid, false);
    if (enemyWithStats) {
      parts.push(enemyWithStats);
    }
    return parts.join(' ').trim() || null;
  }

  function formatWinStatLabel(enemyId, targetSid) {
    dbg('[formatWinStatLabel] enemyId=', enemyId, 'targetSid=', targetSid);
    if (!enemyId || !targetSid) {
      dbg('[formatWinStatLabel] missing params, returning null');
      return null;
    }
    const winstat = getWinStatForOpponent(enemyId, targetSid);
    dbg('[formatWinStatLabel] winstat=', winstat);
    if (!winstat) return null;
    if (typeof winstat === 'object' && winstat.totalPct !== undefined) {
      return winstat;
    }
    return null;
  }

  function formatEnemyWithStats(entry, targetSid, truncateName = true) {
    if (!entry) return '';
    const rawEnemyName = entry.enemyName ? entry.enemyName : (entry.enemyId ? `#${entry.enemyId}` : '');
    if (!rawEnemyName) return '';
    const enemyName = truncateName ? truncateSyndicateName(rawEnemyName) : rawEnemyName;
    const winstat = formatWinStatLabel(entry.enemyId, targetSid);
    let result = `(${enemyName})`;
    if (winstat && typeof winstat === 'object' && winstat.totalPct !== undefined) {
      if (winstat.total === 0) {
        result += ` [--]`;
      } else {
        result += ` [${winstat.totalPct}%]`;
        if (winstat.total !== undefined && winstat.totalWins !== undefined) {
          result += ` (${winstat.totalWins}/${winstat.total})`;
        }
      }
    }
    return result;
  }

  function truncateSyndicateName(name, maxLength = 15) {
    if (!name || typeof name !== 'string') return name;
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  function formatEnemyDisplayKey(entry) {
    if (!entry) return '';
    if (entry.enemyName) {
      const truncatedName = truncateSyndicateName(entry.enemyName);
      return ` (${truncatedName})`;
    }
    if (entry.enemyId) {
      return ` (#${entry.enemyId})`;
    }
    return '';
  }

  function getWinStatForOpponent(enemyId, targetSid) {
    dbg('[getWinStatForOpponent] enemyId=', enemyId, 'targetSid=', targetSid);
    if (!enemyId || !targetSid) {
      dbg('[getWinStatForOpponent] missing params, returning null');
      return null;
    }
    
    // Используем statsCache из Gwars-AttackPercentWinInfo
    const targetSidStr = String(targetSid);
    const enemyIdStr = String(enemyId);
    const cached = getCachedStats([targetSidStr], [enemyIdStr], [targetSidStr]);
    
    if (!cached) {
      dbg('[getWinStatForOpponent] no cached stats found');
      return null;
    }
    
    // Преобразуем формат из statsCache в формат, ожидаемый formatWinStatLabel
    const totalPct = cached.total > 0 ? Math.round((cached.totalWins * 100) / cached.total) : 0;
    const attackPct = cached.attacks > 0 ? Math.round((cached.attackWins * 100) / cached.attacks) : 0;
    
    dbg('[getWinStatForOpponent] cached stats:', { totalPct, attackPct, total: cached.total, totalWins: cached.totalWins, attacks: cached.attacks, attackWins: cached.attackWins });
    
    return {
      text: `${attackPct}% / ${totalPct}%`,
      attackPct,
      totalPct,
      attacks: cached.attacks,
      attackWins: cached.attackWins,
      total: cached.total,
      totalWins: cached.totalWins,
    };
  }

  function getWinStatDetails(enemyId, targetSid) {
    const winstat = getWinStatForOpponent(enemyId, targetSid);
    if (!winstat || typeof winstat !== 'object') return null;
    return winstat;
  }

  function findSyndicateHeaderTd() {
    if (IS_BATTLE_PAGE) {
      const greenBgTd = document.querySelector('td.greenbg');
      if (greenBgTd) {
        const table = greenBgTd.querySelector('table');
        if (table) {
          const hpTd = Array.from(table.querySelectorAll('td')).find(td => {
            const text = td.textContent || '';
            const hasHp = /HP:\s*\d+\/\d+/i.test(text);
            const hasUron = /урон/i.test(text);
            return hasHp && hasUron;
          });
          if (hpTd) {
            return hpTd;
          }
        }
      }
      const allTds = Array.from(document.querySelectorAll('td'));
      const hpTd = allTds.find(td => {
        const text = td.textContent || '';
        const hasHp = /HP:\s*\d+\/\d+/i.test(text);
        const hasUron = /урон/i.test(text);
        return hasHp && hasUron;
      });
      if (hpTd) {
        return hpTd;
      }
    }
    if (IS_SECTOR_PAGE) {
      const sectorTd = Array.from(document.querySelectorAll('td.txt')).find(td =>
        /Сектор/i.test(td.textContent || '')
      );
      if (sectorTd) return sectorTd;
    }
    const container = document.querySelector('.gw-container');
    if (!container) return null;
    const link = container.querySelector('a[href*="/syndicate.php?id="]');
    return link ? link.closest('td') : null;
  }

  function findSeparatorTextNode(td) {
    if (!td) return null;
    const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || '';
      if (!text.includes('|')) continue;
      if (/^\s*\|\s*$/.test(text)) return node;
    }
    return null;
  }

  function ensureSeparatorAnchor(td) {
    if (IS_BATTLE_PAGE && td) {
      return { parent: td };
    }
    const host = (td && td.querySelector('nobr')) || td || document.body;
    return { parent: host || null };
  }

  function ensurePrecedingSeparator(parent, inlineEl) {
    if (!parent || !inlineEl) return;
    let sep = inlineEl.previousSibling;
    if (!sep || sep.nodeType !== Node.TEXT_NODE) {
      sep = document.createTextNode(' | ');
      parent.insertBefore(sep, inlineEl);
      return;
    }
    const text = sep.nodeValue || '';
    if (!/\|\s*$/.test(text)) {
      sep.nodeValue = `${text.replace(/\|.*/, '').trimEnd()} | `;
    }
  }

  function ensureInlinePlacement(parent, inlineEl) {
    if (!parent || !inlineEl) return;
    if (IS_BATTLE_PAGE) {
      if (inlineEl.parentNode !== parent) {
        parent.insertBefore(inlineEl, parent.firstChild);
      } else {
        const firstChild = parent.firstChild;
        if (firstChild !== inlineEl && firstChild && firstChild.nodeType === Node.TEXT_NODE && !/\|\s*$/.test(firstChild.nodeValue)) {
          parent.insertBefore(inlineEl, firstChild);
        } else if (firstChild === inlineEl) {
          return;
        }
      }
      const firstChild = parent.firstChild;
      const sepAfterEl = inlineEl.nextSibling && inlineEl.nextSibling.nodeType === Node.TEXT_NODE && /^\s*\|\s*/.test(inlineEl.nextSibling.nodeValue) ? inlineEl.nextSibling : null;
      if (!sepAfterEl) {
        const sep = document.createTextNode(' | ');
        if (inlineEl.nextSibling) {
          parent.insertBefore(sep, inlineEl.nextSibling);
        } else {
          parent.appendChild(sep);
        }
      } else if (!/^\s*\|\s*$/.test(sepAfterEl.nodeValue)) {
        sepAfterEl.nodeValue = ' | ' + sepAfterEl.nodeValue.replace(/^\s*\|\s*/, '');
      }
      return;
    }
    if (inlineEl.parentNode !== parent || parent.lastChild !== inlineEl) {
      parent.appendChild(inlineEl);
    }
    ensurePrecedingSeparator(parent, inlineEl);
  }

  function ensureHeaderObserver(td) {
    if (!td || typeof MutationObserver === 'undefined') return;
    const sameTarget = headerObserverTarget && headerObserverTarget.isConnected && headerObserverTarget === td;
    if (headerObserver && sameTarget) return;
    if (headerObserver) {
      headerObserver.disconnect();
    }
    headerObserver = new MutationObserver(() => {
      if (IS_BATTLE_PAGE) return;
      const inlineEl = document.getElementById(NOTIF_INLINE_ID);
      if (!inlineEl) return;
      const host = findSyndicateHeaderTd();
      if (!host) return;
      const { parent } = ensureSeparatorAnchor(host);
      if (!parent) return;
      ensureInlinePlacement(parent, inlineEl);
    });
    headerObserver.observe(td, { childList: true, characterData: true, subtree: true });
    headerObserverTarget = td;
  }

  function ensureSectorObserver(td) {
    if (!td || typeof MutationObserver === 'undefined') return;
    const sameTarget = sectorObserverTarget && sectorObserverTarget.isConnected && sectorObserverTarget === td;
    if (sectorObserver && sameTarget) return;
    if (sectorObserver) sectorObserver.disconnect();
    sectorObserver = new MutationObserver(() => {
      const inlineEl = document.getElementById(NOTIF_INLINE_ID);
      if (!inlineEl) return;
      const host = findSyndicateHeaderTd();
      if (!host) return;
      const { parent } = ensureSeparatorAnchor(host);
      if (!parent) return;
      ensureInlinePlacement(parent, inlineEl);
    });
    sectorObserver.observe(td, { childList: true, characterData: true, subtree: true });
    sectorObserverTarget = td;
  }

  function scheduleInlineReattach(source) {
    if (inlineReattachScheduled) return;
    inlineReattachScheduled = true;
    requestAnimationFrame(() => {
      inlineReattachScheduled = false;
      if (inlineReattachTimeout) {
        clearTimeout(inlineReattachTimeout);
        inlineReattachTimeout = null;
      }
      let el = document.getElementById(NOTIF_INLINE_ID);
      if (!el) {
        if (!lastInlinePayload) return;
        renderInlineNotification(lastInlinePayload.message, lastInlinePayload.variant, lastInlinePayload.tooltip, true);
        el = document.getElementById(NOTIF_INLINE_ID);
        if (!el) return;
      }
      const host = findSyndicateHeaderTd();
      if (!host) return;
      const { parent } = ensureSeparatorAnchor(host);
      if (!parent) return;
      if (el.parentNode === parent && parent.lastChild === el) {
        ensurePrecedingSeparator(parent, el);
        return;
      }
      dbg('[inline-reattach]', source, 'moving inline element');
      parent.appendChild(el);
      ensurePrecedingSeparator(parent, el);
    });
  }

  function ensureInlineReattachObserver() {
    if (!IS_SECTOR_PAGE) return;
    if (inlineReattachObserver || typeof MutationObserver === 'undefined') return;
    inlineReattachObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some(m => {
        if (m.type === 'childList') {
          return Array.from(m.addedNodes).some(node => {
            if (!(node instanceof HTMLElement)) return false;
            return node.matches('table') || node.querySelector?.("td.txt");
          });
        }
        return m.type === 'characterData';
      });
      if (relevant) {
        scheduleInlineReattach('mutation');
      } else if (!inlineReattachTimeout) {
        inlineReattachTimeout = setTimeout(() => {
          inlineReattachTimeout = null;
          scheduleInlineReattach('timeout');
        }, 500);
      }
    });
    inlineReattachObserver.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
    dbg('[inline-reattach] observer started');
  }

  function renderInlineNotification(message, variantKey, tooltip, fromReattach = false) {
    const el = ensureInlineNotifElement();
    if (!el) return false;
    applyInlineBaseStyle(el);
    applyInlineVariantStyle(el, variantKey);
    el.textContent = message;
    el.title = tooltip || '';
    if (variantKey === 'alert') {
      el.style.cursor = 'pointer';
      el.onclick = () => {
        window.location.href = 'https://www.gwars.io/wargroup.php?war=attacks';
      };
    } else {
      el.style.cursor = '';
      el.onclick = null;
    }
    lastInlinePayload = { message, variant: variantKey, tooltip };
    if (!fromReattach) dbg('inline notification rendered');
    return true;
  }

  function findBattleLogTable() {
    if (!IS_BATTLE_PAGE) return null;
    const battleLogDiv = document.getElementById('battlelog_div0');
    if (!battleLogDiv) return null;
    return battleLogDiv.closest('table');
  }

  function findTickerRow() {
    if (!IS_BATTLE_PAGE) return null;
    const ticker = document.getElementById('ticker');
    if (!ticker) return null;
    return ticker.closest('tr');
  }

  function ensureBattleTableObserver() {
    if (!IS_BATTLE_PAGE || typeof MutationObserver === 'undefined') return;
    const targetTable = findBattleLogTable();
    if (!targetTable) {
      if (battleTableObserver) {
        battleTableObserver.disconnect();
        battleTableObserver = null;
      }
      dbg('[ensureBattleTableObserver] table not found, will retry');
      setTimeout(ensureBattleTableObserver, 500);
      return;
    }
    if (battleTableObserver) {
      const currentTarget = battleTableObserver.target || (battleTableObserver._targetTable);
      if (currentTarget === targetTable && currentTarget.isConnected) {
        dbg('[ensureBattleTableObserver] observer already active for this table');
        return;
      }
      battleTableObserver.disconnect();
    }
    battleTableObserver = new MutationObserver(() => {
      ensureBattleTableNotifPlacement();
    });
    battleTableObserver._targetTable = targetTable;
    battleTableObserver.observe(targetTable, {
      childList: true,
      subtree: true
    });
    dbg('[ensureBattleTableObserver] observer started for battle table');
  }

  function ensureBattleTableNotifPlacement() {
    if (!IS_BATTLE_PAGE) return null;
    const targetTable = findBattleLogTable();
    if (!targetTable) return null;
    const tickerRow = findTickerRow();
    if (!tickerRow) return null;
    let el = document.getElementById(NOTIF_INLINE_ID);
    if (!el) {
      el = document.createElement('span');
      el.id = NOTIF_INLINE_ID;
    }
    if (el.parentNode !== targetTable) {
      targetTable.style.position = 'relative';
      targetTable.appendChild(el);
    }
    applyInlineBaseStyle(el);
    const rowRect = tickerRow.getBoundingClientRect();
    const tableRect = targetTable.getBoundingClientRect();
    const topOffset = rowRect.top - tableRect.top;
    // Выравниваем по вертикали с текстом в строке
    const rowHeight = rowRect.height;
    const elHeight = el.offsetHeight || parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(tickerRow).lineHeight) || 20;
    const verticalCenter = topOffset + (rowHeight - elHeight) / 2;
    const style = {
      position: 'absolute',
      top: `${verticalCenter}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000',
      pointerEvents: 'auto',
      WebkitTextSizeAdjust: '100%',
      fontSize: '9pt',
      fontFamily: 'verdana,geneva,arial cyr,arial,helvetica,sans-serif',
      padding: '0 1px',
      lineHeight: '1'
    };
    Object.entries(style).forEach(([key, value]) => {
      el.style[key] = value;
    });
    return el;
  }

  function ensureInlineNotifElement() {
    if (IS_BATTLE_PAGE) {
      const el = ensureBattleTableNotifPlacement();
      if (el) {
        ensureBattleTableObserver();
        return el;
      }
      return null;
    }
    let el = document.getElementById(NOTIF_INLINE_ID);
    const tdHost = findSyndicateHeaderTd();
    if (!tdHost) return null;
    const { parent } = ensureSeparatorAnchor(tdHost);
    if (!parent) return null;
    if (!el) {
      el = document.createElement('span');
      el.id = NOTIF_INLINE_ID;
    }
    ensureInlinePlacement(parent, el);
    if (IS_SECTOR_PAGE) {
      ensureSectorObserver(tdHost);
      ensureInlineReattachObserver();
      scheduleInlineReattach('initial');
    } else {
      ensureHeaderObserver(tdHost);
    }
    return el;
  }

  function applyInlineBaseStyle(el) {
    Object.entries(NOTIF_INLINE_BASE_STYLE).forEach(([key, value]) => {
      el.style[key] = value;
    });
  }

  function applyInlineVariantStyle(el, variant) {
    const style = NOTIF_VARIANT_STYLES[variant] || NOTIF_VARIANT_STYLES.normal;
    Object.entries(style).forEach(([key, value]) => {
      el.style[key] = value;
    });
    el.dataset.gwarsNotifVariant = `inline-${variant}`;
  }

  function applyNotifBaseStyle(el) {
    Object.entries(NOTIF_BASE_STYLE).forEach(([key, value]) => {
      el.style[key] = value;
    });
  }

  function applyNotifVariantStyle(el, variant) {
    const style = NOTIF_VARIANT_STYLES[variant] || NOTIF_VARIANT_STYLES.normal;
    Object.entries(style).forEach(([key, value]) => {
      el.style[key] = value;
    });
    el.dataset.gwarsNotifVariant = variant;
  }

  function showNotif(message, variant = 'normal', tooltip) {
    const variantKey = NOTIF_VARIANT_STYLES[variant] ? variant : 'normal';
    const inlineEl = ensureInlineNotifElement();
    if (inlineEl) {
      if (IS_BATTLE_PAGE) {
        applyInlineBaseStyle(inlineEl);
        applyInlineVariantStyle(inlineEl, variantKey);
        const targetTable = findBattleLogTable();
        const tickerRow = findTickerRow();
        if (targetTable && tickerRow) {
          const rowRect = tickerRow.getBoundingClientRect();
          const tableRect = targetTable.getBoundingClientRect();
          const topOffset = rowRect.top - tableRect.top;
          // Выравниваем по вертикали с текстом в строке
          const rowHeight = rowRect.height;
          const elHeight = inlineEl.offsetHeight || parseFloat(getComputedStyle(inlineEl).lineHeight) || parseFloat(getComputedStyle(tickerRow).lineHeight) || 20;
          const verticalCenter = topOffset + (rowHeight - elHeight) / 2;
          const style = {
            position: 'absolute',
            top: `${verticalCenter}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '1000',
            pointerEvents: 'auto',
            fontSize: '9pt',
            fontFamily: 'verdana,geneva,arial cyr,arial,helvetica,sans-serif',
            padding: '0 2px',
            lineHeight: '1'
          };
          Object.entries(style).forEach(([key, value]) => {
            inlineEl.style[key] = value;
          });
        }
      } else {
        applyInlineBaseStyle(inlineEl);
        applyInlineVariantStyle(inlineEl, variantKey);
        inlineEl.style.padding = '0 2px';
      }
      inlineEl.textContent = message;
      inlineEl.title = tooltip || '';
      if (variantKey === 'alert') {
        inlineEl.style.cursor = 'pointer';
        inlineEl.onclick = () => {
          window.location.href = 'https://www.gwars.io/wargroup.php?war=attacks';
        };
      } else {
        inlineEl.style.cursor = '';
        inlineEl.onclick = null;
      }
      lastInlinePayload = { message, variant: variantKey, tooltip };
      return;
    }

    let el = document.getElementById(NOTIF_FLOATING_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = NOTIF_FLOATING_ID;
      document.body.appendChild(el);
    }
    applyNotifBaseStyle(el);
    applyNotifVariantStyle(el, variantKey);
                             el.textContent = message;
    const hint = tooltip ? `${tooltip}\nНажмите, чтобы скрыть` : 'Нажмите, чтобы скрыть';
    el.title = hint;
                             el.onclick = () => el.remove();
  }

function preview(s, max = 120) { if (!s) return ''; s = s.replace(/\s+/g, ' ').trim(); return s.length > max ? s.slice(0, max) + '…' : s; } function previewHTML(s, max = 200) { if (!s) return ''; return s.replace(/\s+/g, ' ').slice(0, max); } })();
