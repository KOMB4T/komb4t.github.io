// ==UserScript==
// @name         [GWars] OutlandGatePass
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Стрелки/WASD ведут к краю сектора (шлюзу), даже когда на клетке шлюза стоит персонаж и игра отключила стрелку и хоткей
// @author       KOMBAT
// @match        https://www.gwars.io/walk*
// @icon         https://www.google.com/s2/favicons?domain=gwars.io
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const LOG = '[OutlandGatePass] ';
    const log = (...args) => console.log(LOG, ...args);

    // Направления: коды клавиш (стрелки + WASD), смещение шага, картинка стрелки на карте
    const DIRS = [
        { keys: [38, 87], dx: 0,  dy: -1, arrow: 'arrow_top.png' },    // вверх
        { keys: [40, 83], dx: 0,  dy: 1,  arrow: 'arrow_bottom.png' }, // вниз
        { keys: [37, 65], dx: -1, dy: 0,  arrow: 'arrow_left.png' },   // влево
        { keys: [39, 68], dx: 1,  dy: 0,  arrow: 'arrow_right.png' }   // вправо
    ];

    // id якоря клетки a_<x>_<y>, префикс m — минус (m41 = -41)
    function cellFromId(id) {
        const m = /^a_(m?\d+)_(m?\d+)$/.exec(id || '');
        if (!m) return null;
        const toNum = (v) => (v[0] === 'm' ? -parseInt(v.slice(1), 10) : parseInt(v, 10));
        return { x: toNum(m[1]), y: toNum(m[2]) };
    }

    // Координата в id элементов: -2 -> m2, 0 -> 0
    const coordId = (n) => (n < 0 ? 'm' + (-n) : String(n));

    // Все клетки страницы (walk-якоря и якоря занятых клеток): [{el, x, y, href}]
    function cellAnchors() {
        const list = [];
        document.querySelectorAll('a[id^="a_"]').forEach((a) => {
            const c = cellFromId(a.id);
            if (c) list.push({ el: a, x: c.x, y: c.y, href: a.getAttribute('href') || '' });
        });
        return list;
    }

    // Стоит ли на клетке персонаж: спрайт персонажа лежит в подпапке q-new/
    // (q-new/turists/3_1_0.gif), а рельеф — сразу в q-new/ (t.png, wood.gif)
    function cellHasCharacter(x, y) {
        const img = document.getElementById('img_' + coordId(x) + '_' + coordId(y));
        return !!(img && img.src && /q-new\/[^/]+\//.test(img.src));
    }

    // Попытка шага в направлении, которое игра сама не обработала
    function forceWalk(dir, evt) {
        // Стрелка на карте видна — игровой хоткей работает, не мешаем
        if (document.querySelector('img[src*="' + dir.arrow + '"]')) {
            log('стрелка', dir.arrow, 'видна — штатный хоткей, пропускаем');
            return;
        }

        const cells = cellAnchors();
        if (!cells.length) {
            log('клеток на странице нет, не карта');
            return; // не страница карты
        }

        // Крайний ряд в выбранном направлении
        const along = (c) => (dir.dx !== 0 ? c.x : c.y);
        const extreme = (dir.dx < 0 || dir.dy < 0)
            ? Math.min.apply(null, cells.map(along))
            : Math.max.apply(null, cells.map(along));
        const edgeCells = cells.filter((c) => along(c) === extreme)
            .sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)));

        // Срабатывает только занятый шлюз: на клетке крайнего ряда стоит персонаж
        const target = edgeCells.find((c) => cellHasCharacter(c.x, c.y));
        if (!target) {
            log('на крайнем ряду персонажа нет — не занятый шлюз, не трогаем');
            return;
        }

        // Walk-ссылка на клетку есть (собственная клетка) — кликаем её: переход через шлюз
        if (/^\/walk\.op\.php\?w=/.test(target.href)) {
            log('занятый шлюз, клик:', target.href);
            evt.preventDefault();
            target.el.click();
            return;
        }

        // Клетку перекрывает чужой персонаж (якорь ведёт в info) — собираем walk URL
        // по образцу соседней walk-ссылки (w и xc сохраняются)
        const tmpl = cells.find((c) => /wx=(-?\d+)&wy=(-?\d+)/.exec(c.href));
        if (!tmpl) {
            log('walk-шаблона для URL нет');
            return;
        }
        const m = /wx=(-?\d+)&wy=(-?\d+)/.exec(tmpl.href);
        const href = tmpl.href.replace('wx=' + m[1] + '&wy=' + m[2], 'wx=' + target.x + '&wy=' + target.y);
        const a = document.createElement('a');
        a.href = href;
        log('занятый шлюз (чужой персонаж), gotourl:', href);
        evt.preventDefault();
        if (typeof gotourl === 'function') {
            gotourl(a);
        } else {
            window.location.href = href;
        }
    }

    document.addEventListener('keydown', function(evt) {
        // Не перехватываем ввод в чат и других полях
        const tag = (evt.target && evt.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        const dir = DIRS.find((d) => d.keys.indexOf(evt.keyCode) !== -1);
        if (dir) {
            log('keydown', evt.keyCode, 'цель:', (evt.target && evt.target.id) || (evt.target && evt.target.tagName));
            forceWalk(dir, evt);
        }
    });
})();
