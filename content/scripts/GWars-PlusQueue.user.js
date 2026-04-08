// ==UserScript==
// @name         [GWars] Plus Queue
// @namespace    gwars-tools
// @version      0.3
// @description  Учет очереди замен на основе плюсов (+) в логе боя
// @match        https://www.gwars.io/warlog.php?bid=*
// @match        https://www.gwars.io/b0/b.php?bid=*
// @grant        none
// @author       KOMBAT
// ==/UserScript==

(function () {
  'use strict';

  const SYNDICATE_ID_CACHE_KEY = 'gwars_plus_queue_target_syndicate';
  const SYND_MEMBERS_TTL_MS = 6 * 60 * 60 * 1000; // 2 часа
  const CACHE_PREFIX = 'gwars_plus_queue_';
  const CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 дня
  const PANEL_ID = 'gwars-plus-queue-panel';
  const STYLE_ID = 'gwars-plus-queue-style';
  const B0_PATH_RE = /\/b0\/b\.php/i;
  const WARLOG_PATH_RE = /\/warlog\.php/i;
  const B0_CONTROLS_TABLE_SELECTOR = 'table[width="100%"][cellpadding="5"][cellspacing="1"][style*="position: relative"]';
  const MIN_SYNC_INTERVAL_MS = 700;
  const PERIODIC_SYNC_INTERVAL_MS = 3000;
  const PERF_LOG_INTERVAL_MS = 10000;
  let isQueueCollapsed = false;
  let isQueueCollapseManuallySet = false;
  let membersLoadPromise = null;
  let membersLoadSid = null;
  let syncInFlight = false;
  let syncTimer = null;
  let lastSyncAt = 0;
  let lastRenderSignature = '';
  let lastDetectedSide = null;
  let lastDetectedSideAt = 0;
  const PERF_ENABLED = !!window.DEBUG_GWARS_PLUSQUEUE_PERF;
  const PERF = (() => {
    const counters = Object.create(null);
    const timings = Object.create(null);
    let timerId = null;

    const bump = (name, delta = 1) => {
      if (!PERF_ENABLED) return;
      counters[name] = (counters[name] || 0) + delta;
    };

    const start = (name) => {
      if (!PERF_ENABLED) return () => {};
      const t0 = performance.now();
      return () => {
        const dt = performance.now() - t0;
        const stat = timings[name] || (timings[name] = { sum: 0, cnt: 0, max: 0 });
        stat.sum += dt;
        stat.cnt += 1;
        if (dt > stat.max) stat.max = dt;
      };
    };

    const flush = () => {
      if (!PERF_ENABLED) return;
      const counterKeys = Object.keys(counters);
      const timingKeys = Object.keys(timings);
      if (counterKeys.length === 0 && timingKeys.length === 0) return;

      const ts = new Date().toLocaleTimeString();
      console.groupCollapsed(`[GWars][PlusQueue][Perf] ${ts}`);
      if (counterKeys.length) {
        console.table(counterKeys.map((k) => ({ metric: k, value: counters[k] })));
      }
      if (timingKeys.length) {
        console.table(timingKeys.map((k) => {
          const s = timings[k];
          return {
            metric: k,
            calls: s.cnt,
            avg_ms: Number((s.sum / s.cnt).toFixed(2)),
            max_ms: Number(s.max.toFixed(2))
          };
        }));
      }
      console.groupEnd();

      for (const k of counterKeys) delete counters[k];
      for (const k of timingKeys) delete timings[k];
    };

    const startAuto = () => {
      if (!PERF_ENABLED || timerId) return;
      timerId = setInterval(flush, PERF_LOG_INTERVAL_MS);
      if (typeof timerId?.unref === 'function') timerId.unref();
    };

    return { bump, start, startAuto };
  })();

  function getBid() {
    const fromUrl = new URLSearchParams(window.location.search).get('bid');
    if (fromUrl) return String(fromUrl);
    if (typeof window.bid !== 'undefined' && window.bid !== null) return String(window.bid);
    const input = document.querySelector('input[name="bid"]');
    return input && input.value ? String(input.value) : '';
  }

  function storageKey() {
    const bid = getBid();
    return bid ? `${CACHE_PREFIX}${bid}` : '';
  }

  function cleanupStaleCaches() {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX)) continue;
      try {
        const obj = JSON.parse(localStorage.getItem(key));
        if (!obj || !obj.ts || now - obj.ts > CACHE_TTL_MS) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  }

  function parseSyndicateIdFromFirstLink() {
    const firstLink = document.querySelector('a[href*="syndicate.php?id="]');
    if (!firstLink) return null;
    const href = firstLink.getAttribute('href') || '';
    const match = href.match(/syndicate\.php\?id=(\d+)/i);
    return match ? String(match[1]) : null;
  }

  function loadSyndicateIdCache() {
    try {
      const raw = localStorage.getItem(SYNDICATE_ID_CACHE_KEY);
      if (!raw) return { ts: 0, sid: null };
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.sid) return { ts: 0, sid: null };
      return { ts: Number(obj.ts) || 0, sid: String(obj.sid) };
    } catch (e) {
      return { ts: 0, sid: null };
    }
  }

  function saveSyndicateIdCache(sid) {
    if (!sid) return;
    localStorage.setItem(SYNDICATE_ID_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      sid: String(sid)
    }));
  }

  function getTargetSyndicateId() {
    const cached = loadSyndicateIdCache();
    const isFresh = cached.ts && (Date.now() - cached.ts) < SYND_MEMBERS_TTL_MS;
    if (isFresh && cached.sid) return cached.sid;

    const parsedSid = parseSyndicateIdFromFirstLink();
    if (parsedSid) {
      saveSyndicateIdCache(parsedSid);
      return parsedSid;
    }
    return cached.sid || null;
  }

  function getMembersCacheKey(sid) {
    return sid ? `gwars_synd_members_${sid}` : '';
  }

  function loadMembersCache(sid) {
    const key = getMembersCacheKey(sid);
    if (!key) return { ts: 0, nicks: [] };
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ts: 0, nicks: [] };
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.nicks) || !obj.ts) return { ts: 0, nicks: [] };
      return obj;
    } catch (e) {
      return { ts: 0, nicks: [] };
    }
  }

  function saveMembersCache(sid, nicks) {
    const key = getMembersCacheKey(sid);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify({
      ts: Date.now(),
      nicks
    }));
  }

  function isMembersCacheFresh(cache) {
    return cache.ts && (Date.now() - cache.ts) < SYND_MEMBERS_TTL_MS && cache.nicks.length > 0;
  }

  function parseMembersFromHtml(html) {
    const result = [];
    const seen = new Set();

    let doc = null;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      doc = null;
    }

    let links = [];
    if (doc) {
      // Ищем таблицу состава ниже фразы "Состав синдиката"
      const headerCell = Array.from(doc.querySelectorAll('td, b'))
        .find((el) => /Состав\s+синдиката/i.test(el.textContent || ''));
      const membersTable = headerCell ? headerCell.closest('table') : null;
      const root = membersTable || doc;
      links = Array.from(root.querySelectorAll('a[href*="info.php?id="]'));
    }

    for (const link of links) {
      const href = (link.getAttribute('href') || '').trim();
      if (!/info\.php\?id=\d+/i.test(href)) continue;

      const nick = htmlToText(link.textContent || '');
      if (!nick) continue;
      const key = normalizeNick(nick);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(nick);
    }

    return result;
  }

  async function fetchAndCacheSyndMembers(sid) {
    if (!sid) return [];
    const url = `/syndicate.php?id=${sid}&page=members`;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`members fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    // Страницы GWars часто в cp1251, иначе кириллица ломается.
    const html = decodeHtmlBuffer(buffer);
    const nicks = parseMembersFromHtml(html);
    if (nicks.length > 0) {
      saveMembersCache(sid, nicks);
      return nicks;
    }
    return [];
  }

  function decodeHtmlBuffer(buffer) {
    try {
      return new TextDecoder('windows-1251').decode(buffer);
    } catch (e) {
      try {
        return new TextDecoder('utf-8').decode(buffer);
      } catch (e2) {
        return '';
      }
    }
  }

  async function getTargetMembersSet() {
    const sid = getTargetSyndicateId();
    const cache = loadMembersCache(sid);
    if (isMembersCacheFresh(cache)) {
      return new Set(cache.nicks.map(normalizeNick));
    }

    if (!membersLoadPromise || membersLoadSid !== sid) {
      membersLoadSid = sid;
      membersLoadPromise = fetchAndCacheSyndMembers(sid)
        .catch(() => cache.nicks || [])
        .finally(() => {
          membersLoadPromise = null;
          membersLoadSid = null;
        });
    }

    const nicks = await membersLoadPromise;
    return new Set((nicks || []).map(normalizeNick));
  }

  function loadCache() {
    const key = storageKey();
    if (!key) return {
      ts: Date.now(), players: [], entered: [], plusTurns: {}, enteredTurns: {}
    };
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return {
          ts: Date.now(), players: [], entered: [], plusTurns: {}, enteredTurns: {}
        };
      }
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.players)) {
        return {
          ts: Date.now(), players: [], entered: [], plusTurns: {}, enteredTurns: {}
        };
      }
      if (!Array.isArray(obj.entered)) obj.entered = [];
      if (!obj.plusTurns || typeof obj.plusTurns !== 'object') obj.plusTurns = {};
      if (!obj.enteredTurns || typeof obj.enteredTurns !== 'object') obj.enteredTurns = {};
      if (!obj.ts || Date.now() - obj.ts > CACHE_TTL_MS) {
        return {
          ts: Date.now(), players: [], entered: [], plusTurns: {}, enteredTurns: {}
        };
      }
      return obj;
    } catch (e) {
      return {
        ts: Date.now(), players: [], entered: [], plusTurns: {}, enteredTurns: {}
      };
    }
  }

  function saveCache(cache) {
    const key = storageKey();
    if (!key) return;
    cache.ts = Date.now();
    localStorage.setItem(key, JSON.stringify(cache));
  }

  function normalizeNick(nick) {
    return String(nick || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function htmlToText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function getBattleLogBlock() {
    // Разные режимы боя используют разные контейнеры лога.
    return document.querySelector('#chatlog_block0')
      || document.querySelector('#battlelog_div0')
      || document.querySelector('[id^="battlelog_div"]');
  }

  function parseChatInfo() {
    const block = getBattleLogBlock();
    if (!block) return { plusPlayers: [], enteredPlayers: [], plusTurns: {}, enteredTurns: {} };

    const lines = (block.innerHTML || '').split(/<br\s*\/?>/i);
    const plusPlayers = [];
    const plusSeen = new Set();
    const enteredPlayers = [];
    const enteredSeen = new Set();
    const plusTurns = {};
    const enteredTurns = {};
    let currentTurn = null;

    for (const line of lines) {
      if (!line) continue;
      const turnMatches = Array.from(line.matchAll(/turn:(\d+)/gi));
      if (turnMatches.length > 0) {
        currentTurn = parseInt(turnMatches[turnMatches.length - 1][1], 10);
      }

      const text = htmlToText(line);
      if (!text) continue;

      if (/входит\s+в\s+бой\.?\s*$/i.test(text)) {
        const enteredNick = text.replace(/входит\s+в\s+бой\.?\s*$/i, '').trim();
        if (enteredNick) {
          const enteredKey = normalizeNick(enteredNick);
          if (!enteredSeen.has(enteredKey)) {
            enteredSeen.add(enteredKey);
            enteredPlayers.push(enteredNick);
          }
          if (Number.isFinite(currentTurn)) {
            if (!Number.isFinite(enteredTurns[enteredKey])) {
              enteredTurns[enteredKey] = currentTurn;
            } else {
              enteredTurns[enteredKey] = Math.min(enteredTurns[enteredKey], currentTurn);
            }
          }
        }
      }

      if (!text.startsWith('***')) continue;
      const chatLine = text.replace(/^\*{3}\s*/, '').trim();
      const sepIndex = chatLine.indexOf(':');
      if (sepIndex === -1) continue;
      const nick = chatLine.slice(0, sepIndex).trim();
      const message = chatLine.slice(sepIndex + 1).trim();
      if (!message.includes('+')) continue;

      if (!nick) continue;
      const key = normalizeNick(nick);
      if (plusSeen.has(key)) continue;
      plusSeen.add(key);
      plusPlayers.push(nick);
      if (Number.isFinite(currentTurn)) {
        if (!Number.isFinite(plusTurns[key])) {
          plusTurns[key] = currentTurn;
        } else {
          plusTurns[key] = Math.min(plusTurns[key], currentTurn);
        }
      }
    }

    return { plusPlayers, enteredPlayers, plusTurns, enteredTurns };
  }

  function mergeIntoCache(chatInfo, targetMembersSet) {
    const cache = loadCache();
    const existingSet = new Set(cache.players.map(normalizeNick));
    const enteredSet = new Set(cache.entered.map(normalizeNick));
    let changed = false;

    for (const nick of chatInfo.plusPlayers) {
      const norm = normalizeNick(nick);
      if (!targetMembersSet.has(norm)) continue;
      if (existingSet.has(norm)) continue;
      cache.players.push(nick);
      existingSet.add(norm);
      changed = true;
      if (!cache.plusTurns[norm] && chatInfo.plusTurns[norm]) {
        cache.plusTurns[norm] = chatInfo.plusTurns[norm];
        changed = true;
      }
    }

    for (const norm of Object.keys(chatInfo.plusTurns)) {
      if (!targetMembersSet.has(norm)) continue;
      if (!cache.plusTurns[norm]) {
        cache.plusTurns[norm] = chatInfo.plusTurns[norm];
        changed = true;
      } else {
        const newTurn = Math.min(cache.plusTurns[norm], chatInfo.plusTurns[norm]);
        if (newTurn !== cache.plusTurns[norm]) {
          cache.plusTurns[norm] = newTurn;
          changed = true;
        }
      }
    }

    for (const nick of chatInfo.enteredPlayers) {
      const norm = normalizeNick(nick);
      if (!targetMembersSet.has(norm)) continue;
      if (enteredSet.has(norm)) continue;
      cache.entered.push(nick);
      enteredSet.add(norm);
      changed = true;
      if (!cache.enteredTurns[norm] && chatInfo.enteredTurns[norm]) {
        cache.enteredTurns[norm] = chatInfo.enteredTurns[norm];
        changed = true;
      }
    }

    for (const norm of Object.keys(chatInfo.enteredTurns)) {
      if (!targetMembersSet.has(norm)) continue;
      if (!cache.enteredTurns[norm]) {
        cache.enteredTurns[norm] = chatInfo.enteredTurns[norm];
        changed = true;
      } else {
        const newTurn = Math.min(cache.enteredTurns[norm], chatInfo.enteredTurns[norm]);
        if (newTurn !== cache.enteredTurns[norm]) {
          cache.enteredTurns[norm] = newTurn;
          changed = true;
        }
      }
    }

    if (changed) saveCache(cache);
    return cache;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: absolute;
        top: 6px;
        z-index: 20;
        max-width: 520px;
        padding: 4px 6px;
        border: 1px solid #99bb99;
        background: rgba(240, 255, 240, 0.92);
        color: inherit;
        font-family: verdana, geneva, "arial cyr", arial, helvetica, sans-serif !important;
        font-size: 8pt !important;
        line-height: 1.2 !important;
      }
      #${PANEL_ID} .pq-title {
        font-weight: 700;
        margin-bottom: 3px;
        font-size: 8pt !important;
        line-height: 1.2 !important;
        cursor: pointer;
        user-select: none;
        display: block;
      }
      #${PANEL_ID} .pq-title-main {
        display: block;
      }
      #${PANEL_ID} .pq-title-hint {
        display: block;
        margin-top: 1px;
        font-weight: 700;
        font-size: 8pt !important;
        line-height: 1.2 !important;
      }
      #${PANEL_ID} .pq-title-hint-wait {
        color: #8a6d00;
      }
      #${PANEL_ID} .pq-title-hint-go {
        color: #0b7a0b;
      }
      #${PANEL_ID} .pq-toggle {
        opacity: 0.75;
      }
      #${PANEL_ID} .pq-empty {
        opacity: 0.8;
      }
      #${PANEL_ID} table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
        border: 1px solid #a9c7a9;
        background: rgba(245, 255, 245, 0.95);
      }
      #${PANEL_ID} th,
      #${PANEL_ID} td {
        padding: 2px 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 400;
        font-family: inherit;
        font-size: 8pt !important;
        line-height: 1.2 !important;
        color: inherit;
        border-right: 1px dotted #9db99d;
        border-bottom: 1px dotted #b8d0b8;
      }
      #${PANEL_ID} th {
        font-weight: 700;
        background: rgba(224, 242, 224, 0.9);
      }
      #${PANEL_ID} th:last-child,
      #${PANEL_ID} td:last-child {
        border-right: none;
      }
      #${PANEL_ID} tbody tr:last-child td {
        border-bottom: none;
      }
      #${PANEL_ID} .pq-col-num {
        width: 18px;
        text-align: right;
      }
      #${PANEL_ID} .pq-col-plus {
        width: 28px;
        text-align: center;
      }
      #${PANEL_ID} .pq-col-enter {
        width: 28px;
        text-align: center;
      }
      #${PANEL_ID} .pq-col-comment {
        width: 96px;
      }
      #${PANEL_ID} td:nth-child(2),
      #${PANEL_ID} td.pq-col-comment {
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }
      #${PANEL_ID} td.pq-col-comment {
        white-space: nowrap;
      }
      #${PANEL_ID} tr.pq-no-plus-row td {
        color: #b30000;
        font-weight: 700;
      }
      #${PANEL_ID} tr.pq-waiting-row td {
        color: #0b7a0b;
        font-weight: 700;
      }
      #${PANEL_ID} .pq-waiting {
        color: #0b7a0b;
        font-weight: 700;
      }
      #${PANEL_ID}.pq-side-left {
        left: 6px;
        right: auto;
        text-align: left;
      }
      #${PANEL_ID}.pq-side-right {
        right: 6px;
        left: auto;
        text-align: left;
      }
      #${PANEL_ID}.pq-side-right table {
        direction: ltr;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRelativeHost(host) {
    if (!host) return null;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    return host;
  }

  function getPageMode() {
    if (B0_PATH_RE.test(location.pathname)) return 'b0';
    if (WARLOG_PATH_RE.test(location.pathname)) return 'warlog';
    return 'other';
  }

  function getB0ControlsHost() {
    const battleForm = document.querySelector('#battleform');
    const controlsTable = document.querySelector(B0_CONTROLS_TABLE_SELECTOR);
    return battleForm?.closest('td[style*="padding:0"]')
      || battleForm?.closest('td')
      // Режим "ждем ход противника": battleform отсутствует, берем верхний td этой таблицы.
      || controlsTable?.querySelector('tbody > tr > td[style*="padding:0"]')
      || controlsTable?.querySelector('tr > td')
      || null;
  }

  function getPanelHost(sideHint = null) {
    const mode = getPageMode();

    if (mode === 'warlog') {
      // Для просмотра боя: ставим в блок со статусом "Бой ещё не окончен."
      const battleState = document.querySelector('#battle_state_block0');
      const warlogHost = battleState?.closest('td') || battleState;
      if (warlogHost) return ensureRelativeHost(warlogHost);

      // Для завершенного боя battle_state_block0 отсутствует:
      // ставим панель в строку с тактической картой (td внутри нужного tr).
      const finishedBattleHost = document.querySelector('#battle_area_block0')?.closest('td')
        || document.querySelector('#battle_area_block0')?.parentElement;
      return ensureRelativeHost(finishedBattleHost);
    }

    if (mode === 'b0') {
      // На активном бою панель должна быть в верхнем td блока управления боем.
      return ensureRelativeHost(getB0ControlsHost());
    }

    const battleCell = document.querySelector('#battle_area_block0')?.closest('td');
    const fallbackCell = document.querySelector('div[data-comment="basic_tactical"]')?.closest('td');
    const host = battleCell || fallbackCell;
    return ensureRelativeHost(host);
  }

  function getSyndicateNickSetFromCache() {
    const membersCache = loadMembersCache(getTargetSyndicateId());
    return new Set((membersCache.nicks || []).map(normalizeNick));
  }

  function collectPanelNicksFromRoot(block) {
    if (!block) return [];
    const nicks = [];
    const seen = new Set();
    const links = block.querySelectorAll('a[href^="/info.php?id="]');
    for (const link of links) {
      const nick = htmlToText(link.textContent || '');
      if (!nick) continue;
      const norm = normalizeNick(nick.replace(/\s*\[\d+\]\s*$/, ''));
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      nicks.push(norm);
    }
    return nicks;
  }

  function getSidePanelRoots() {
    const leftById = document.querySelector('#left_users_block0');
    const rightById = document.querySelector('#right_users_block0');
    if (leftById && rightById) {
      return { leftRoot: leftById, rightRoot: rightById };
    }

    const mapCell = document.querySelector('div[data-comment="basic_tactical"]')?.closest('td');
    const row = mapCell?.closest('tr');
    const cells = row ? Array.from(row.children).filter((el) => el.tagName === 'TD') : [];
    if (cells.length >= 3) {
      return { leftRoot: cells[0], rightRoot: cells[cells.length - 1] };
    }

    // Для b0 "ждем ход": карта часто во вложенной таблице, берем внешнюю строку с 3 колонками.
    const mapBlock = document.querySelector('div[data-comment="basic_tactical"]');
    const centerCol = mapBlock?.closest('td[align="center"]');
    const outerRow = centerCol?.parentElement;
    const outerCells = outerRow ? Array.from(outerRow.children).filter((el) => el.tagName === 'TD') : [];
    if (outerCells.length >= 3) {
      return { leftRoot: outerCells[0], rightRoot: outerCells[outerCells.length - 1] };
    }

    return { leftRoot: null, rightRoot: null };
  }

  function detectSyndicateSide() {
    const now = Date.now();
    if (lastDetectedSide && (now - lastDetectedSideAt) < 2000) {
      return lastDetectedSide;
    }

    const targetSet = getSyndicateNickSetFromCache();
    if (targetSet.size === 0) {
      lastDetectedSide = 'right';
      lastDetectedSideAt = now;
      return 'right';
    }

    const { leftRoot, rightRoot } = getSidePanelRoots();
    const leftNicks = collectPanelNicksFromRoot(leftRoot);
    const rightNicks = collectPanelNicksFromRoot(rightRoot);
    let leftHits = 0;
    let rightHits = 0;

    for (const nick of leftNicks) {
      if (targetSet.has(nick)) leftHits += 1;
    }
    for (const nick of rightNicks) {
      if (targetSet.has(nick)) rightHits += 1;
    }

    const side = leftHits > rightHits ? 'left' : 'right';
    lastDetectedSide = side;
    lastDetectedSideAt = now;
    return side;
  }

  function getOrCreatePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
    }
    return panel;
  }

  function applyPanelLayout(panel, mode, side) {
    panel.classList.remove('pq-side-left', 'pq-side-right');
    panel.classList.add(side === 'left' ? 'pq-side-left' : 'pq-side-right');

    // Сначала применяем целевые стили, потом вставляем в DOM — без "вспышки" базового absolute.
    if (mode === 'b0') {
      panel.style.visibility = 'hidden';
      panel.style.position = 'absolute';
      panel.style.top = '0';
      panel.style.left = side === 'left' ? '6px' : 'auto';
      panel.style.right = side === 'right' ? '6px' : 'auto';
      panel.style.margin = '0';
      panel.style.maxWidth = '520px';
      panel.style.float = '';
      panel.style.clear = '';
    } else if (mode === 'warlog') {
      panel.style.visibility = '';
      panel.style.position = 'absolute';
      panel.style.top = '4px';
      panel.style.left = side === 'left' ? '6px' : 'auto';
      panel.style.right = side === 'right' ? '6px' : 'auto';
      panel.style.margin = '0';
      panel.style.maxWidth = '520px';
      panel.style.float = '';
      panel.style.clear = '';
    } else {
      panel.style.visibility = '';
      panel.style.position = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.right = '';
      panel.style.margin = '';
      panel.style.maxWidth = '';
      panel.style.float = '';
      panel.style.clear = '';
    }
  }

  function mountPanel(panel, host, mode) {
    // Не дергаем DOM без необходимости: повторный appendChild того же узла
    // создает лишние mutation-события и нагружает другие userscript-наблюдатели.
    if (panel.parentNode !== host) {
      host.appendChild(panel);
    }
    if (mode === 'b0') panel.style.visibility = 'visible';
  }

  function bindPanelToggle(panel) {
    const title = panel.querySelector('.pq-title');
    const body = panel.querySelector('.pq-body');
    if (!title || !body) return;

    if (!panel.dataset.hoverBound) {
      panel.addEventListener('mouseenter', () => {
        isQueueCollapsed = false;
        const currentBody = panel.querySelector('.pq-body');
        if (currentBody) currentBody.style.display = '';
        const currentToggle = panel.querySelector('.pq-toggle');
        if (currentToggle) currentToggle.textContent = '[−]';
      });

      panel.addEventListener('mouseleave', () => {
        isQueueCollapsed = true;
        const currentBody = panel.querySelector('.pq-body');
        if (currentBody) currentBody.style.display = 'none';
        const currentToggle = panel.querySelector('.pq-toggle');
        if (currentToggle) currentToggle.textContent = '[+]';
      });

      panel.dataset.hoverBound = '1';
    }

    body.style.display = isQueueCollapsed ? 'none' : '';
    const toggle = title.querySelector('.pq-toggle');
    if (toggle) toggle.textContent = isQueueCollapsed ? '[+]' : '[−]';
  }

  function renderQueue(cache) {
    const stopRender = PERF.start('renderQueue.total');
    const side = detectSyndicateSide();
    const host = getPanelHost(side);
    if (!host) {
      PERF.bump('renderQueue.noHost');
      stopRender();
      return;
    }
    const mode = getPageMode();
    const panel = getOrCreatePanel();

    applyPanelLayout(panel, mode, side);
    mountPanel(panel, host, mode);

    const queueOrder = getQueueOrder(cache);
    const enteredSet = new Set(cache.entered.map(normalizeNick));
    const outOfOrderSet = getOutOfOrderEnteredSet(cache);
    const displayQueue = buildDisplayQueue(cache, enteredSet, queueOrder);
    const plusTurns = cache.plusTurns || {};
    const enteredTurns = cache.enteredTurns || {};
    const waitingMarkedCount = queueOrder.reduce((acc, nick) => {
      const norm = normalizeNick(nick);
      return Number.isFinite(enteredTurns[norm]) ? acc : acc + 1;
    }, 0);
    const currentNick = getCurrentPlayerNick();
    const currentNorm = normalizeNick(currentNick);
    let titleHintHtml = '';
    if (currentNorm) {
      const myIndex = queueOrder.findIndex((nick) => normalizeNick(nick) === currentNorm);
      const isCurrentInQueue = myIndex >= 0;
      const currentAlreadyEntered = Number.isFinite(enteredTurns[currentNorm]);
      if (isCurrentInQueue && !currentAlreadyEntered) {
        let waitingBefore = 0;
        for (let i = 0; i < myIndex; i += 1) {
          const norm = normalizeNick(queueOrder[i]);
          if (!Number.isFinite(enteredTurns[norm])) waitingBefore += 1;
        }
        titleHintHtml = waitingBefore > 0
          ? `<span class="pq-title-hint pq-title-hint-wait">перед вами ${waitingBefore}</span>`
          : '<span class="pq-title-hint pq-title-hint-go">можно входить</span>';
      }
    }
    const itemsHtml = displayQueue.length
      ? (() => {
        let plusIndex = 0;
        const rows = displayQueue.map((item) => {
          const norm = normalizeNick(item.nick);
          const plusTurn = plusTurns[norm];
          const enteredTurn = enteredTurns[norm];
          const plusCell = item.noPlus
            ? '-'
            : (Number.isFinite(plusTurn) ? String(plusTurn + 1) : '—');
          const enterCell = Number.isFinite(enteredTurn) ? String(enteredTurn + 1) : '-';
          const commentCell = item.noPlus
            ? 'вход без плюса'
            : (outOfOrderSet.has(norm) && Number.isFinite(enteredTurn) ? 'вход вне очереди' : (Number.isFinite(enteredTurn) ? '' : 'ожидает'));
          const rowClass = item.noPlusViolation
            ? ' class="pq-no-plus-row"'
            : (commentCell === 'ожидает' ? ' class="pq-waiting-row"' : '');
          const numCell = item.noPlus ? '' : String(++plusIndex);
          return `<tr${rowClass}>
            <td class="pq-col-num">${numCell}</td>
            <td>${escapeHtml(item.nick)}</td>
            <td class="pq-col-plus">${plusCell}</td>
            <td class="pq-col-enter">${enterCell}</td>
            <td class="pq-col-comment">${commentCell}</td>
          </tr>`;
        }).join('');
        return `<table>
          <thead>
            <tr>
              <th class="pq-col-num">#</th>
              <th>Ник</th>
              <th class="pq-col-plus">+</th>
              <th class="pq-col-enter">Вход</th>
              <th class="pq-col-comment">Комментарий</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
      })()
      : '<div class="pq-empty">Нет отметившихся</div>';

    // Режим hover: по умолчанию свернуто, на наведение раскрывается.
    isQueueCollapsed = !panel.matches(':hover');

    const signature = JSON.stringify({
      mode,
      side,
      players: cache.players || [],
      entered: cache.entered || [],
      plusTurns: cache.plusTurns || {},
      enteredTurns: cache.enteredTurns || {},
      currentNorm,
      titleHintHtml,
      collapsed: isQueueCollapsed,
      collapsedManual: isQueueCollapseManuallySet
    });

    if (signature === lastRenderSignature) {
      PERF.bump('renderQueue.signatureUnchanged');
      stopRender();
      return;
    }
    lastRenderSignature = signature;
    PERF.bump('renderQueue.rerendered');

    panel.innerHTML = `
      <div class="pq-title"><span class="pq-title-main">Очередь замен (${waitingMarkedCount})</span>${titleHintHtml}</div>
      <div class="pq-body">${itemsHtml}</div>
    `;
    bindPanelToggle(panel);
    stopRender();
  }

  function getQueueOrder(cache) {
    const plusTurns = cache.plusTurns || {};
    const players = cache.players || [];
    return players
      .map((nick, idx) => ({
        nick,
        idx,
        turn: plusTurns[normalizeNick(nick)]
      }))
      .sort((a, b) => {
        const aHas = Number.isFinite(a.turn);
        const bHas = Number.isFinite(b.turn);
        if (aHas && bHas) {
          if (a.turn !== b.turn) return a.turn - b.turn;
          return a.idx - b.idx;
        }
        if (aHas) return -1;
        if (bHas) return 1;
        return a.idx - b.idx;
      })
      .map((x) => x.nick);
  }

  function getCurrentPlayerNick() {
    const hpHeader = document.querySelector('#hpheader') || document.querySelector('#hpheader1');
    if (hpHeader) {
      const td = hpHeader.closest('td');
      const link = td?.querySelector('a[href^="/info.php?id="] b')
        || td?.querySelector('a[href^="/info.php?id="]');
      const nick = htmlToText(link?.textContent || '');
      if (nick) return nick;
    }

    const topHeaderLink = document.querySelector('table a[href^="/info.php?id="] b')
      || document.querySelector('table a[href^="/info.php?id="]');
    return htmlToText(topHeaderLink?.textContent || '');
  }

  function buildDisplayQueue(cache, enteredSet, queueOrder) {
    const base = (queueOrder || cache.players || []).map((nick) => ({ nick, noPlus: false }));
    const baseNormSet = new Set(base.map((item) => normalizeNick(item.nick)));
    const enteredTurns = cache.enteredTurns || {};
    const plusTurns = cache.plusTurns || {};

    // Бойцы синдиката, вошедшие без плюса.
    const noPlusEntered = Object.keys(enteredTurns)
      .filter((norm) => !baseNormSet.has(norm))
      .map((norm) => ({
        norm,
        turn: enteredTurns[norm]
      }))
      .sort((a, b) => a.turn - b.turn);

    if (noPlusEntered.length === 0) return base;

    const enteredNames = cache.entered || [];
    const resolveNick = (norm) => {
      const byEntered = enteredNames.find((n) => normalizeNick(n) === norm);
      if (byEntered) return byEntered;
      return norm;
    };

    let splitIndex = base.findIndex((item) => !enteredSet.has(normalizeNick(item.nick)));
    if (splitIndex === -1) splitIndex = base.length;

    const hasPlusNotEnteredBefore = (turn) => base.some((item) => {
      const norm = normalizeNick(item.nick);
      const plusTurn = plusTurns[norm];
      const plusEnteredTurn = enteredTurns[norm];
      // Нарушение только если плюс был поставлен не позже этого хода,
      // а плюсующий не вошел раньше.
      if (plusTurn === undefined || plusTurn === null) return false;
      if (plusTurn > turn) return false;
      return !plusEnteredTurn || plusEnteredTurn > turn;
    });

    const insertItems = noPlusEntered.map((entry) => ({
      nick: resolveNick(entry.norm),
      noPlus: true,
      noPlusViolation: hasPlusNotEnteredBefore(entry.turn)
    }));

    // Debug: почему "Himera7" может быть не красной.
    const himeraEntry = noPlusEntered.find((entry) => entry.norm === 'himera7');
    if (himeraEntry) {
      const blockers = base
        .map((item) => {
          const norm = normalizeNick(item.nick);
          return {
            nick: item.nick,
            plusTurn: (plusTurns[norm] === undefined || plusTurns[norm] === null) ? null : plusTurns[norm],
            enteredTurn: (enteredTurns[norm] === undefined || enteredTurns[norm] === null) ? null : enteredTurns[norm]
          };
        })
        .filter((x) => x.plusTurn !== null && x.plusTurn <= himeraEntry.turn && (x.enteredTurn === null || x.enteredTurn > himeraEntry.turn));
      console.debug('[GWars Plus Queue][Himera7 debug]', {
        himeraTurn: himeraEntry.turn,
        blockers,
        noPlusViolation: blockers.length > 0
      });
    }

    return [
      ...base.slice(0, splitIndex),
      ...insertItems,
      ...base.slice(splitIndex)
    ];
  }

  function getOutOfOrderEnteredSet(cache) {
    const out = new Set();
    const enteredTurns = cache.enteredTurns || {};
    const order = getQueueOrder(cache);

    for (let i = 0; i < order.length; i += 1) {
      const nick = order[i];
      const norm = normalizeNick(nick);
      const turn = enteredTurns[norm];
      if (!turn) continue;

      let violation = false;
      for (let j = 0; j < i; j += 1) {
        const higherNorm = normalizeNick(order[j]);
        const higherTurn = enteredTurns[higherNorm];
        // Выше по очереди не вошел или вошел позже — нарушение.
        if (!higherTurn || higherTurn > turn) {
          violation = true;
          break;
        }
      }
      if (violation) out.add(norm);
    }
    return out;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (ch) => (
      ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;'
    ));
  }

  async function runSync() {
    PERF.bump('runSync.called');
    if (syncInFlight) return;

    const now = Date.now();
    const waitMs = MIN_SYNC_INTERVAL_MS - (now - lastSyncAt);
    if (waitMs > 0) {
      if (!syncTimer) {
        syncTimer = setTimeout(() => {
          syncTimer = null;
          void runSync();
        }, waitMs);
      }
      return;
    }

    syncInFlight = true;
    lastSyncAt = now;
    const stopRunSync = PERF.start('runSync.total');
    try {
      if (!getBid()) return;
      const targetMembersSet = await getTargetMembersSet();
      if (targetMembersSet.size === 0) return;
      const stopParse = PERF.start('parseChatInfo');
      const chatInfo = parseChatInfo();
      stopParse();
      const stopMerge = PERF.start('mergeIntoCache');
      const cache = mergeIntoCache(chatInfo, targetMembersSet);
      stopMerge();
      renderQueue(cache);
    } catch (e) {
      // Не даем transient DOM-ошибкам ломать цикл обновления панели.
      console.debug('[GWars Plus Queue] runSync skipped:', e);
    } finally {
      syncInFlight = false;
      stopRunSync();
    }
  }

  function initObservers() {
    let timer = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      PERF.bump('observer.schedule');
      timer = setTimeout(() => {
        timer = null;
        void runSync();
      }, 180);
    };

    const observer = new MutationObserver((mutations) => {
      PERF.bump('observer.callback');
      PERF.bump('observer.mutations', mutations.length);
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        if (m.target && m.target.id && (
          m.target.id === 'chatlog_block0'
          || m.target.id === 'battlelog_div0'
          || m.target.id.startsWith('battlelog_div')
          || m.target.id === 'battle_area_block0'
        )) {
          schedule();
          return;
        }
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.id === 'chatlog_block0'
            || node.id === 'battlelog_div0'
            || node.id.startsWith('battlelog_div')
            || node.id === 'battle_area_block0'
            || node.querySelector?.('#chatlog_block0')
            || node.querySelector?.('#battlelog_div0')
            || node.querySelector?.('[id^="battlelog_div"]')
          ) {
            schedule();
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      PERF.bump('periodicSync.tick');
      void runSync();
    }, PERIODIC_SYNC_INTERVAL_MS);
  }

  function start() {
    PERF.startAuto();
    cleanupStaleCaches();
    ensureStyles();
    void runSync();
    initObservers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
