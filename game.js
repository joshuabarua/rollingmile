(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const TILE = 32;
    let INTERNAL_W = 320;
    let INTERNAL_H = 240;
    const buf = document.createElement('canvas');
    buf.width = INTERNAL_W;
    buf.height = INTERNAL_H;
    const bctx = buf.getContext('2d');
    bctx.imageSmoothingEnabled = false;

    const K = {
        g1: '#24383d', g2: '#1b2c33', g3: '#2f4d55', g4: '#102026',
        p1: '#4d4258', p2: '#3a3347', p3: '#665870',
        t1: '#1f5d55', t2: '#15433d', t3: '#0d2826', trunk: '#5b3a2a', trunk2: '#3c241b',
        w1: '#1f4f74', w2: '#173d5a', w3: '#46a7d8',
        wallC: '#c9c0d8', wallC2: '#a79ab7',
        wallG: '#646a82', wallG2: '#505669',
        roofR: '#a33b68', roofR2: '#732744',
        roofB: '#3657a6', roofB2: '#243b70',
        roofG: '#1f7a73', roofG2: '#14524d',
        roofY: '#ba7a1f', roofY2: '#885615',
        roofD: '#242433', roofD2: '#151520',
        door: '#3b2230', doorF: '#6a4360',
        win: '#69d8ff', winF: '#14263c',
        fen: '#7b7489', fen2: '#534d60',
        sgn: '#ff4fa3', sgn2: '#6b183f', sgnP: '#29101e',
        tkR: '#5f3157', tkL: '#ff5ca8', tkD: '#34152f',
        tg1: '#1d7462', tg2: '#145948', tg3: '#0d4033',
        fl1: '#ff4fa3', fl2: '#34d7ff', fl3: '#ffd166',
        black: '#090811', white: '#f7f2ff',
        dlgBg: '#f7f2ff', dlgBdr: '#1c1530', dlgTxt: '#1c1530', shadow: 'rgba(0,0,0,0.28)',
        skin: '#f2bf8c', skinD: '#c88b59', hair: '#120f1f', hat: '#ff4fa3', hat2: '#c71d6d',
        shirt: '#34d7ff', shirt2: '#1389b7', pants: '#161828', shoe: '#ff5ca8',
        N: { h: ['#ff9f1c', '#9b5cff', '#f7f2ff'], s1: ['#00d1b2', '#ff5ca8', '#4c7dff'], s2: ['#0d8b78', '#a91b68', '#2948b8'] }
    };

    const T = {
        GRASS: 0, PATH: 1, TREE: 2, WALL_C: 3, WALL_G: 4,
        ROOF_R: 5, ROOF_B: 6, ROOF_G: 7, ROOF_Y: 8, ROOF_D: 9,
        DOOR: 10, WIN: 11, WATER: 12, FENCE: 13, SIGN: 14,
        TGRASS: 15, FLOWER: 16, FINISH: 17, TRACK: 18, B_WALL: 19,
        GATE_COL: 20, GATE_TOP: 21
    };
    const SOLID = [T.TREE, T.WALL_C, T.WALL_G, T.DOOR, T.WIN, T.ROOF_R, T.ROOF_B, T.ROOF_G, T.ROOF_Y, T.ROOF_D, T.WATER, T.FENCE, T.B_WALL, T.GATE_COL];

    const MC = 50, MR = 38;
    const map = new Array(MR).fill(0).map(() => new Array(MC).fill(T.GRASS));

    function stamp(sx, sy, w, h, type) {
        for (let y = sy; y < sy + h; y++) for (let x = sx; x < sx + w; x++) map[y][x] = type;
    }
    function outline(sx, sy, w, h, type) {
        stamp(sx, sy, w, 1, type); stamp(sx, sy + h - 1, w, 1, type);
        stamp(sx, sy + 1, 1, h - 2, type); stamp(sx + w - 1, sy + 1, 1, h - 2, type);
    }

    function fillRectSafe(sx, sy, w, h, type) {
        for (let y = sy; y < sy + h; y++) {
            if (y < 0 || y >= MR) continue;
            for (let x = sx; x < sx + w; x++) {
                if (x < 0 || x >= MC) continue;
                map[y][x] = type;
            }
        }
    }

    function carveRoadH(y, x1, x2, width = 2) {
        fillRectSafe(x1, y, x2 - x1 + 1, width, T.PATH);
    }

    function carveRoadV(x, y1, y2, width = 2) {
        fillRectSafe(x, y1, width, y2 - y1 + 1, T.PATH);
    }

    function placeBuilding(x, y, w, h, roof, wall = T.WALL_C) {
        fillRectSafe(x - 1, y - 1, w + 2, h + 2, T.PATH);
        fillRectSafe(x, y, w, h, wall);
        fillRectSafe(x, y - 2, w, 2, roof);
        for (let wx = x + 1; wx < x + w - 1; wx += 2) {
            if (wx !== x + Math.floor(w / 2)) fillRectSafe(wx, y + 1, 1, 1, T.WIN);
        }
        fillRectSafe(x + Math.floor(w / 2), y + h - 1, 1, 1, T.DOOR);
    }

    function addPocketPark(x, y, w, h) {
        fillRectSafe(x, y, w, h, T.GRASS);
        for (let py = y; py < y + h; py++) {
            for (let px = x; px < x + w; px++) {
                const seed = (px * 19 + py * 23) % 9;
                if (seed === 0) map[py][px] = T.TGRASS;
                if (seed === 1) map[py][px] = T.FLOWER;
            }
        }
    }

    for (let x = 0; x < MC; x++) {
        const riverDepth = 3 + Math.floor(Math.sin(x * 0.3) + Math.sin(x * 0.13));
        fillRectSafe(x, 0, 1, Math.max(2, riverDepth), T.WATER);
        map[Math.max(2, riverDepth)][x] = T.PATH;
    }

    outline(0, 0, MC, MR, T.TREE);
    fillRectSafe(0, 0, MC, 1, T.WATER);

    carveRoadH(5, 0, MC - 1, 2);
    carveRoadV(24, 5, MR - 5, 2);
    carveRoadH(17, 15, 42, 2);
    carveRoadH(23, 24, 46, 2);
    carveRoadH(28, 4, 30, 2);
    carveRoadV(38, 10, 31, 2);
    carveRoadV(30, 16, 30, 2);

    fillRectSafe(2, 8, 11, 9, T.TREE);
    fillRectSafe(14, 8, 8, 6, T.TGRASS);
    fillRectSafe(3, 27, 18, 1, T.B_WALL);
    fillRectSafe(3, 28, 18, 2, T.PATH);
    addPocketPark(14, 24, 7, 4);
    addPocketPark(10, 18, 5, 4);

    fillRectSafe(18, 10, 6, 3, T.PATH);
    fillRectSafe(18, 9, 6, 1, T.GATE_TOP);
    fillRectSafe(18, 10, 1, 2, T.GATE_COL);
    fillRectSafe(20, 10, 1, 2, T.GATE_COL);
    fillRectSafe(23, 10, 1, 2, T.GATE_COL);

    placeBuilding(29, 9, 6, 5, T.ROOF_D, T.WALL_G);
    placeBuilding(35, 10, 6, 5, T.ROOF_R, T.WALL_C);
    placeBuilding(42, 9, 5, 5, T.ROOF_B, T.WALL_G);
    placeBuilding(33, 18, 6, 5, T.ROOF_G, T.WALL_C);
    placeBuilding(41, 18, 6, 5, T.ROOF_R, T.WALL_G);
    placeBuilding(27, 22, 7, 5, T.ROOF_Y, T.WALL_C);
    placeBuilding(27, 29, 6, 4, T.ROOF_D, T.WALL_G);

    fillRectSafe(31, 8, 14, 1, T.PATH);
    fillRectSafe(31, 15, 14, 1, T.PATH);
    fillRectSafe(31, 16, 16, 1, T.PATH);
    fillRectSafe(32, 24, 15, 10, T.PATH);
    outline(33, 25, 13, 8, T.FENCE);
    outline(34, 26, 11, 6, T.TRACK);
    outline(35, 27, 9, 4, T.TRACK);
    fillRectSafe(39, 27, 2, 2, T.FINISH);

    fillRectSafe(37, 22, 4, 3, T.PATH);
    fillRectSafe(36, 21, 6, 1, T.SIGN);
    fillRectSafe(28, 27, 4, 2, T.PATH);
    fillRectSafe(29, 28, 1, 1, T.SIGN);

    for (let y = 2; y < MR - 2; y++) {
        for (let x = 2; x < MC - 2; x++) {
            if (map[y][x] !== T.GRASS) continue;
            const seed = (x * 37 + y * 17) % 100;
            if (seed < 2) map[y][x] = T.FLOWER;
            else if (seed < 7) map[y][x] = T.TGRASS;
            else if (seed === 12 || seed === 19) map[y][x] = T.TREE;
        }
    }

    map[11][20] = T.SIGN;
    map[10][32] = T.SIGN;
    map[11][44] = T.SIGN;
    map[20][35] = T.SIGN;
    map[20][43] = T.SIGN;
    map[28][15] = T.SIGN;

    const triggers = [
        { x: 38, y: 15, w: 1, h: 1, id: 'cic', name: 'CIC Berlin', subtitle: 'Wed 7:00 AM · Neon sessions' },
        { x: 44, y: 14, w: 1, h: 1, id: 'arys', name: 'Arys Store', subtitle: 'Tue 7 PM · Gear hub' },
        { x: 43, y: 23, w: 1, h: 1, id: 'fm', name: 'Flat Mountain', subtitle: 'Running gear' },
        { x: 30, y: 30, w: 1, h: 1, id: 'aa', name: 'Arys Annex', subtitle: 'Nutrition & vibes' },
        { x: 32, y: 29, w: 1, h: 1, id: 'tk', name: 'Interval Track', subtitle: 'Thu 7 PM Speed' },
        { x: 20, y: 11, w: 1, h: 1, id: 'bg', name: 'Brandenburg Gate', subtitle: 'Iconic finish line' },
        { x: 8, y: 5, w: 1, h: 1, id: 'sp', name: 'Spree River', subtitle: 'Scenic long runs' },
        { x: 12, y: 28, w: 1, h: 1, id: 'bw', name: 'Berlin Wall', subtitle: 'Historic trail' },
        { x: 26, y: 10, w: 1, h: 1, id: 'rs', name: 'Reichstag', subtitle: 'Parliament views' }
    ];

    const npcs = [
        { x: 37, y: 16, dir: 'up', type: 0, baseText: "CIC at 7AM. Can't oversleep!", altText: "Join us for intervals!" },
        { x: 43, y: 16, dir: 'left', type: 1, baseText: "Arys run is great for socialization.", altText: "New shoes just dropped." },
        { x: 11, y: 5, dir: 'down', type: 2, baseText: "River breeze is perfect today.", altText: "Morning laps here are gold." },
        { x: 21, y: 12, dir: 'right', type: 0, baseText: "Just ran through the Gate! PR!", altText: "Try it at sunset!" },
        { x: 38, y: 28, dir: 'left', type: 1, baseText: "Track day. My legs hurt already.", altText: "400m repeats today. Oof." },
        { x: 16, y: 29, dir: 'up', type: 2, baseText: "Wall trail is deep in history.", altText: "Each step tells a story." },
        { x: 24, y: 8, dir: 'up', type: 0, baseText: "Reichstag loop is 5k exactly.", altText: "Tourists always get in the way." },
        { x: 10, y: 20, dir: 'right', type: 1, baseText: "Tiergarten is best at dawn.", altText: "Watch out for bikers!" },
        { x: 45, y: 16, dir: 'down', type: 2, baseText: "Arys has gels on sale.", altText: "I prefer flat laces." },
        { x: 31, y: 31, dir: 'left', type: 0, baseText: "Track closed on Mondays.", altText: "Bring spikes for winter." }
    ];

    const randomEvents = [
        { text: "A group of runners zooms past!", duration: 3000 },
        { text: "You found a dropped energy gel.", duration: 2500 },
        { text: "A cyclist rings their bell.", duration: 2000 },
        { text: "Street musician plays a tune.", duration: 4000 },
        { text: "A dog chases you briefly.", duration: 2200 },
        { text: "Ice cream truck jingle in the distance.", duration: 3500 }
    ];

    const runEvents = [
        { name: "5K Community Run", startHour: 7, durationMinutes: 45, location: 'cic', message: "Join the 5K at CIC!" },
        { name: "Arys Social Run", startHour: 19, durationMinutes: 60, location: 'arys', message: "Evening social run from Arys!" },
        { name: "Track Intervals", startHour: 19, durationMinutes: 40, location: 'tk', message: "Intervals at the track!" },
        { name: "Sunset Loop", startHour: 20, durationMinutes: 50, location: 'bg', message: "Sunset Brandenburg Loop!" }
    ];

    const player = { x: 38, y: 16, px: 38 * TILE, py: 16 * TILE, dir: 0, walking: false, step: 0 };
    const cam = { x: 0, y: 0 };
    const dialog = { active: false, text: '', displayedChars: 0, timer: 0, speed: 1, lines: [], autoClose: 0 };
    let lastTriggerId = null;
    let visitedSpots = new Set();
    let gameStarted = true;
    let paused = false;
    let gameFrame = 0;
    let currentEvent = null;
    let eventTimer = 0;
    let nextRandomEventTime = 0;


    const particles = [];
    for (let i = 0; i < 40; i++) particles.push({
        x: Math.random() * MC * TILE,
        y: Math.random() * MR * TILE,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.3 - 0.1,
        size: Math.random() * 2 + 1,
        a: Math.random() * 0.4 + 0.1,
        c: ['#fff', '#dfd', '#ffd'][Math.floor(Math.random() * 3)]
    });

    const keys = {};
    window.addEventListener('keydown', e => { keys[e.key] = true; if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'p', 'P', 'Escape'].includes(e.key)) e.preventDefault(); });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
        const aspect = window.innerWidth / window.innerHeight;
        INTERNAL_H = Math.round(INTERNAL_W / aspect);
        buf.height = INTERNAL_H;
    }
    window.addEventListener('resize', resize);
    resize();

    function px(c, x, y, w, h) { w = w || 1; h = h || 1; bctx.fillStyle = c; bctx.fillRect(x, y, w, h); }
    let animFrame = 0, animTick = 0;

    function drawTile(type, tx, ty) {
        const x = tx * TILE, y = ty * TILE;
        bctx.fillStyle = ((tx + ty) % 2 === 0) ? K.g1 : K.g2;
        bctx.fillRect(x, y, TILE, TILE);
        if (type === T.GRASS) {
            const s = (tx * 7 + ty * 13) % 6;
            px(K.g4, x, y + TILE - 4, TILE, 2);
            if (s === 0) px(K.g3, x + 5, y + 6, 4, 4);
            if (s === 1) px(K.g4, x + 11, y + 3, 4, 3);
            if (s === 2) px(K.g4, x + 18, y + 8, 5, 4);
            if (s === 3) px('#2c5962', x + 22, y + 20, 3, 3);
            return;
        }

        switch (type) {
            case T.PATH:
                bctx.fillStyle = K.p1; bctx.fillRect(x, y, TILE, TILE);
                px(K.p2, x, y, TILE, 2); px(K.p2, x, y + TILE - 2, TILE, 2);
                px(K.p3, x + 3, y + 6, TILE - 6, 2); px(K.p3, x + 6, y + 18, TILE - 12, 2);
                px('#756785', x + 4, y + 27, TILE - 8, 1);
                break;
            case T.TREE:
                px(K.trunk, x + 12, y + 19, 8, 11); px(K.trunk2, x + 14, y + 19, 4, 11);
                bctx.fillStyle = K.t1; bctx.fillRect(x + 4, y + 4, 24, 14); bctx.fillRect(x + 2, y + 8, 28, 10);
                bctx.fillStyle = K.t2; bctx.fillRect(x + 6, y + 6, 10, 7); bctx.fillStyle = K.t3; bctx.fillRect(x + 16, y + 11, 10, 6);
                const sway = Math.sin(animFrame * 0.05 + tx) * 1;
                bctx.fillStyle = K.t2; bctx.fillRect(x + 6 + sway, y + 6, 10, 7);
                break;
            case T.WALL_C:
                bctx.fillStyle = K.wallC; bctx.fillRect(x, y, TILE, TILE);
                px(K.wallC2, x, y + 6, TILE, 2); px(K.wallC2, x, y + 14, TILE, 2); px(K.wallC2, x, y + 22, TILE, 2);
                px('#f3ecff', x, y, TILE, 2); px('#87799f', x + TILE - 2, y, 2, TILE);
                px('#ff74bf', x + 3, y + TILE - 6, TILE - 6, 2);
                px('#e7ddf7', x + 4, y + 9, 2, 2); px('#e7ddf7', x + 24, y + 17, 2, 2);
                break;
            case T.WALL_G:
                bctx.fillStyle = K.wallG; bctx.fillRect(x, y, TILE, TILE);
                px(K.wallG2, x, y + 6, TILE, 2); px(K.wallG2, x, y + 14, TILE, 2); px(K.wallG2, x, y + 22, TILE, 2);
                px('#93a0bf', x, y, TILE, 2); px('#2d3240', x + TILE - 2, y, 2, TILE);
                px('#34d7ff', x + 3, y + TILE - 6, TILE - 6, 2);
                px('#7e8cae', x + 4, y + 9, 2, 2); px('#7e8cae', x + 24, y + 17, 2, 2);
                break;
            case T.ROOF_R:
                bctx.fillStyle = K.roofR; bctx.fillRect(x, y, TILE, TILE);
                px(K.roofR2, x, y + TILE - 7, TILE, 7);
                for (let i = 0; i < TILE; i += 4) px('#ff74bf', x + i, y + 5, 2, 2);
                px('#f8a7d0', x + 3, y + 3, TILE - 6, 2);
                px('#5a1932', x, y + TILE - 2, TILE, 2);
                break;
            case T.ROOF_B:
                bctx.fillStyle = K.roofB; bctx.fillRect(x, y, TILE, TILE);
                px(K.roofB2, x, y + TILE - 7, TILE, 7);
                for (let i = 0; i < TILE; i += 4) px('#34d7ff', x + i, y + 5, 2, 2);
                px('#86e7ff', x + 3, y + 3, TILE - 6, 2);
                px('#17274f', x, y + TILE - 2, TILE, 2);
                break;
            case T.ROOF_G:
                bctx.fillStyle = K.roofG; bctx.fillRect(x, y, TILE, TILE);
                px(K.roofG2, x, y + TILE - 7, TILE, 7);
                for (let i = 0; i < TILE; i += 4) px('#2fffd5', x + i, y + 5, 2, 2);
                px('#7bf7e4', x + 3, y + 3, TILE - 6, 2);
                px('#0f352f', x, y + TILE - 2, TILE, 2);
                break;
            case T.ROOF_Y:
                bctx.fillStyle = K.roofY; bctx.fillRect(x, y, TILE, TILE);
                px(K.roofY2, x, y + TILE - 7, TILE, 7);
                for (let i = 0; i < TILE; i += 4) px('#ffd166', x + i, y + 5, 2, 2);
                px('#ffe29a', x + 3, y + 3, TILE - 6, 2);
                px('#4e3208', x, y + TILE - 2, TILE, 2);
                break;
            case T.ROOF_D:
                bctx.fillStyle = K.roofD; bctx.fillRect(x, y, TILE, TILE);
                px(K.roofD2, x + 4, y + 5, TILE - 8, TILE - 10);
                px('#ff4fa3', x + 4, y + TILE - 8, TILE - 8, 2);
                px('#7c6cff', x + 6, y + 6, TILE - 12, 2);
                px('#05050b', x, y + TILE - 2, TILE, 2);
                break;
            case T.DOOR:
                bctx.fillStyle = K.wallC; bctx.fillRect(x, y, TILE, TILE);
                bctx.fillStyle = K.door; bctx.fillRect(x + 9, y + 6, 14, 24);
                px(K.doorF, x + 10, y + 8, 12, 20);
                px('#ff4fa3', x + 12, y + 10, 8, 2);
                px('#f7f2ff', x + 19, y + 18, 2, 3);
                break;
            case T.WIN:
                bctx.fillStyle = K.wallC; bctx.fillRect(x, y, TILE, TILE);
                bctx.fillStyle = K.winF; bctx.fillRect(x + 5, y + 6, 22, 16);
                bctx.fillStyle = K.win; bctx.fillRect(x + 7, y + 8, 18, 12);
                px('#c7f5ff', x + 8, y + 9, 6, 4); px('#7c6cff', x + 16, y + 9, 7, 4);
                px('#14374f', x + 15, y + 8, 2, 12); px('#14374f', x + 7, y + 13, 18, 2);
                px('#f7f2ff', x + 6, y + 7, 20, 1);
                break;
            case T.WATER:
                bctx.fillStyle = K.w1; bctx.fillRect(x, y, TILE, TILE);
                px(K.w3, x + ((4 + animFrame * 6) % 24), y + 7, 6, 2); px(K.w2, x + ((13 + animFrame * 4) % 22), y + 18, 7, 2);
                px('#7c6cff', x + 2, y + TILE - 5, TILE - 4, 2);
                px('#9cecff', x + 5, y + 4, 7, 2);
                break;
            case T.FENCE:
                px(K.fen, x + 5, y, 4, TILE); px(K.fen, x + TILE - 9, y, 4, TILE); px(K.fen2, x, y + 12, TILE, 4);
                px('#ff4fa3', x + 2, y + 8, TILE - 4, 2);
                break;
            case T.SIGN:
                px('rgba(0,0,0,0.35)', x + 6, y + 24, 12, 3);
                px(K.sgnP, x + 13, y + 15, 5, 15);
                bctx.fillStyle = K.sgn2; bctx.fillRect(x + 3, y + 4, 26, 12);
                bctx.fillStyle = K.sgn; bctx.fillRect(x + 5, y + 6, 22, 8);
                px('#f7f2ff', x + 7, y + 8, 18, 1); px('#34d7ff', x + 9, y + 11, 14, 1);
                px('#f7f2ff', x + 24, y + 8, 1, 4);
                break;
            case T.TGRASS: px(K.tg1, x + 6, y + 4, 4, 24); px(K.tg2, x + 14, y + 10, 3, 16); px(K.tg3, x + 22, y + 6, 4, 20); break;
            case T.FLOWER:
                const petal = (animFrame + tx * ty) % 3;
                px([K.fl1, K.fl2, K.fl3][petal], x + 8, y + 8, 4, 4);
                px(K.fl2, x + 18, y + 15, 4, 4);
                break;
            case T.FINISH:
                for (let r = 0; r < TILE; r += 4) for (let c = 0; c < TILE; c += 4) { bctx.fillStyle = ((r / 4 + c / 4) % 2 === 0) ? K.white : K.black; bctx.fillRect(x + c, y + r, 4, 4); }
                px('#ff4fa3', x, y + TILE - 4, TILE, 2);
                break;
            case T.TRACK: bctx.fillStyle = K.tkR; bctx.fillRect(x, y, TILE, TILE); px(K.tkL, x, y + 13, TILE, 3); px(K.tkD, x, y + TILE - 5, TILE, 2); break;
            case T.B_WALL: bctx.fillStyle = '#7d7a8b'; bctx.fillRect(x, y + 8, TILE, 20); px('#4e495a', x, y + 5, TILE, 5); px(K.fl1, x + 5, y + 13, 5, 5); px('#34d7ff', x + 16, y + 16, 4, 4); break;
            case T.GATE_COL: bctx.fillStyle = K.wallC; bctx.fillRect(x + 8, y, 16, TILE); px(K.wallC2, x + 22, y, 2, TILE); px('#ff4fa3', x + 8, y + 8, 16, 2); break;
            case T.GATE_TOP: bctx.fillStyle = K.wallC; bctx.fillRect(x, y, TILE, TILE); px(K.roofD, x, y, TILE, 12); px('#34d7ff', x + 3, y + 14, TILE - 6, 2); break;
        }
    }

    function drawSprite(x, y, dir, frame, hc, sc, sc2) {
        const p = (c, ox, oy, w, h) => { px(c, x + ox, y + oy, w || 1, h || 1); };
        p('rgba(0,0,0,0.35)', 6, 27, 18, 3);
        p(hc, 8, 1, 12, 6); p(hc, 6, 4, 16, 4);
        p(K.hair, 7, 6, 14, 3);
        if (dir !== 1) {
            p(K.skin, 8, 8, 12, 8);
            if (dir === 2) p(K.black, 9, 11, 3, 2);
            else if (dir === 3) p(K.black, 16, 11, 3, 2);
            else { p(K.black, 10, 11, 2, 2); p(K.black, 16, 11, 2, 2); }
        }
        p(sc, 6, 17, 16, 7); p(sc2, 6, 17, 3, 7); p(sc2, 19, 17, 3, 7);
        p('#ff4fa3', 10, 18, 8, 1);
        p('#f7f2ff', 11, 9, 2, 1); p('#f7f2ff', 17, 9, 1, 1);
        p(K.skin, 4, 18, 2, 4); p(K.skin, 22, 18, 2, 4);
        if (frame === 0) {
            p(K.pants, 8, 24, 5, 4); p(K.pants, 15, 24, 5, 4);
            p(K.shoe, 8, 28, 5, 2); p(K.shoe, 15, 28, 5, 2);
        } else {
            p(K.pants, 6, 24, 5, 4); p(K.pants, 17, 24, 5, 4);
            p(K.shoe, 6, 28, 5, 2); p(K.shoe, 17, 28, 5, 2);
        }
    }

    function drawPlayerSprite(x, y, dir, frame) { drawSprite(x, y, dir, frame, K.hat, K.shirt, K.shirt2); }
    function drawNPCSprite(x, y, dir, t) { drawSprite(x, y, dir === 'up' ? 1 : dir === 'left' ? 2 : dir === 'right' ? 3 : 0, 0, K.N.h[t], K.N.s1[t], K.N.s2[t]); }

    function wordWrap(text, maxWidth) {
        bctx.font = '8px "Press Start 2P", monospace';
        const words = text.split(' '), lines = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const test = line ? line + ' ' + words[i] : words[i];
            if (bctx.measureText(test).width > maxWidth && line) { lines.push(line); line = words[i]; } else line = test;
        }
        if (line) lines.push(line);
        return lines;
    }

    function drawDialogBox() {
        if (!dialog.active) return;
        const bx = 4, by = INTERNAL_H - 58, bw = INTERNAL_W - 8, bh = 54;
        bctx.fillStyle = 'rgba(0,0,0,0.5)'; bctx.fillRect(bx + 2, by + 2, bw, bh);
        bctx.fillStyle = K.dlgBdr; bctx.fillRect(bx, by, bw, bh);
        bctx.fillStyle = K.white; bctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
        bctx.fillStyle = K.dlgBdr; bctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
        bctx.fillStyle = K.dlgBg; bctx.fillRect(bx + 5, by + 5, bw - 10, bh - 10);

        if (dialog.lines.length === 0) dialog.lines = wordWrap(dialog.text, bw - 24);
        const fT = dialog.lines.join('\n');
        const vT = fT.substring(0, Math.floor(dialog.displayedChars));
        const vL = vT.split('\n');

        bctx.fillStyle = K.dlgTxt; bctx.font = '8px "Press Start 2P"'; bctx.textBaseline = 'top';
        for (let i = 0; i < vL.length && i < 4; i++) bctx.fillText(vL[i], bx + 12, by + 10 + i * 11);

        if (dialog.displayedChars >= fT.length && animFrame % 2 === 0) {
            bctx.fillStyle = K.dlgBdr;
            bctx.fillRect(bx + bw - 16, by + bh - 14, 6, 4); bctx.fillRect(bx + bw - 15, by + bh - 10, 4, 1); bctx.fillRect(bx + bw - 14, by + bh - 9, 2, 1);
        }
    }

    function showDialog(t, autoCloseFrames = 0) {
        dialog.active = true; dialog.text = t; dialog.displayedChars = 0; dialog.timer = 0; dialog.lines = [];
        dialog.autoClose = autoCloseFrames;
    }

    function updateQuestUI() {
        const count = visitedSpots.size;
        const total = triggers.length;
        const progressEl = document.getElementById('quest-progress');
        const currentEl = document.getElementById('quest-current');
        const statusEl = document.getElementById('status-text');
        progressEl.textContent = `${count} / ${total} spots visited`;
        if (count === total) {
            currentEl.textContent = 'All spots visited! You are a Berlin run legend.';
            statusEl.textContent = 'Quest complete!';
        } else {
            currentEl.textContent = 'Find the run culture hotspots.';
            statusEl.textContent = 'Explore the city.';
        }
    }

    function showLocationCard(name, subtitle) {
        const card = document.getElementById('location-card');
        const titleEl = document.getElementById('location-title');
        const subtitleEl = document.getElementById('location-subtitle');
        titleEl.textContent = name;
        subtitleEl.textContent = subtitle;
        card.classList.add('visible');
        setTimeout(() => card.classList.remove('visible'), 3000);
    }

    function updateCamera() {
        cam.x = Math.max(0, Math.min(player.px - INTERNAL_W / 2 + TILE / 2, MC * TILE - INTERNAL_W));
        cam.y = Math.max(0, Math.min(player.py - INTERNAL_H / 2 + TILE / 2, MR * TILE - INTERNAL_H));
    }

    const MDX = [0, 0, -1, 1], MDY = [1, -1, 0, 0], SPEED = 2;

    function handleInput() {
        if (paused) {
            if (keys['p'] || keys['P'] || keys['Escape']) {
                togglePause();
                keys['p'] = keys['P'] = keys['Escape'] = false;
            }
            return;
        }

        if (dialog.active) {
            if (keys[' '] || keys['Enter']) {
                const ft = dialog.lines.join('\n');
                if (dialog.displayedChars < ft.length) dialog.displayedChars = ft.length; else dialog.active = false;
                keys[' '] = keys['Enter'] = false;
            }
            return;
        }
        if (!player.walking) {
            let dir = -1;
            if (keys['ArrowDown'] || keys['s']) dir = 0; else if (keys['ArrowUp'] || keys['w']) dir = 1;
            else if (keys['ArrowLeft'] || keys['a']) dir = 2; else if (keys['ArrowRight'] || keys['d']) dir = 3;
            if (dir >= 0) {
                player.dir = dir;
                const nx = player.x + MDX[dir], ny = player.y + MDY[dir];
                if (nx >= 0 && nx < MC && ny >= 0 && ny < MR) {
                    const tile = map[ny][nx];
                    const npcHere = npcs.find(n => n.x === nx && n.y === ny);
                    if (!SOLID.includes(tile) && !npcHere) { player.walking = true; player.step = 1 - player.step; }
                }
            }
            if (keys[' '] || keys['Enter']) {
                keys[' '] = keys['Enter'] = false;
                const fx = player.x + MDX[player.dir], fy = player.y + MDY[player.dir];
                const npc = npcs.find(n => n.x === fx && n.y === fy);
                if (npc) {
                    showDialog(Math.random() > 0.5 ? npc.baseText : npc.altText);
                    return;
                }
                if (fx >= 0 && fx < MC && fy >= 0 && fy < MR) {
                    const t = map[fy][fx];
                    if (t === T.SIGN) showDialog("Sign post: It points the way.");
                    if (t === T.DOOR) showDialog("It's locked, but you can peek inside.");
                }
            }
            if (keys['p'] || keys['P'] || keys['Escape']) {
                togglePause();
                keys['p'] = keys['P'] = keys['Escape'] = false;
            }
        }
    }

    function updatePlayer() {
        if (!player.walking) return;
        const dx = MDX[player.dir] * SPEED, dy = MDY[player.dir] * SPEED;
        player.px += dx; player.py += dy;
        const tx = (player.x + MDX[player.dir]) * TILE, ty = (player.y + MDY[player.dir]) * TILE;
        if ((dx > 0 && player.px >= tx) || (dx < 0 && player.px <= tx) || (dy > 0 && player.py >= ty) || (dy < 0 && player.py <= ty)) {
            player.x += MDX[player.dir]; player.y += MDY[player.dir];
            player.px = player.x * TILE; player.py = player.y * TILE;
            player.walking = false;
            const trig = triggers.find(t => player.x >= t.x && player.x < t.x + t.w && player.y >= t.y && player.y < t.y + t.h);
            if (trig) {
                if (lastTriggerId !== trig.id && !dialog.active) {
                    lastTriggerId = trig.id;
                    showDialog(`${trig.name}\n${trig.subtitle}`);
                    if (!visitedSpots.has(trig.id)) {
                        visitedSpots.add(trig.id);
                        updateQuestUI();
                        showLocationCard(trig.name, trig.subtitle);
                    }
                }
            } else {
                lastTriggerId = null;
            }
        }
    }

    function drawMinimap() {
        const mmX = INTERNAL_W - 70, mmY = 8, mmW = 64, mmH = 48, scale = 1;
        bctx.fillStyle = 'rgba(10, 10, 18, 0.8)';
        bctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
        bctx.strokeStyle = '#ffdd44';
        bctx.lineWidth = 1;
        bctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
        for (let y = 0; y < MR; y++) {
            for (let x = 0; x < MC; x++) {
                const t = map[y][x];
                let c = '#0a0a12';
                if (t === T.PATH) c = '#c4af96';
                else if (t === T.WATER) c = '#3a8ab0';
                else if (t === T.TREE || t === T.B_WALL || SOLID.includes(t)) c = '#2d7a3a';
                bctx.fillStyle = c;
                bctx.fillRect(mmX + x * scale, mmY + y * scale, scale, scale);
            }
        }
        triggers.forEach(t => {
            bctx.fillStyle = visitedSpots.has(t.id) ? '#ffdd44' : '#ff6b8a';
            bctx.fillRect(mmX + t.x - 1, mmY + t.y - 1, 3, 3);
        });
        bctx.fillStyle = '#e83838';
        bctx.fillRect(mmX + player.x - 1, mmY + player.y - 1, 3, 3);
    }

    function updateRunEvents() {
        const now = Date.now();
        const hour = new Date(now).getHours();
        const minute = new Date(now).getMinutes();
        runEvents.forEach(event => {
            const eventStart = event.startHour * 60;
            const eventEnd = eventStart + event.durationMinutes;
            const current = hour * 60 + minute;
            if (current >= eventStart && current < eventEnd && !currentEvent) {
                currentEvent = event;
                showDialog(`${event.name}\n${event.message}`, 180);
            }
        });
        if (currentEvent) {
            const eventStart = currentEvent.startHour * 60;
            const eventEnd = eventStart + currentEvent.durationMinutes;
            const current = hour * 60 + minute;
            if (current >= eventEnd) {
                currentEvent = null;
            }
        }
    }

    function updateRandomEvents() {
        if (gameFrame > nextRandomEventTime && !dialog.active && !currentEvent) {
            const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
            showDialog(event.text, 180);
            currentEvent = { text: event.text };
            eventTimer = event.duration;
            nextRandomEventTime = gameFrame + 600 + Math.floor(Math.random() * 600);
        }
        if (currentEvent && eventTimer > 0) {
            eventTimer -= 16;
            if (eventTimer <= 0) currentEvent = null;
        }
    }

    function render() {
        bctx.fillStyle = K.black; bctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
        updateCamera();
        const sc = Math.floor(cam.x / TILE), sr = Math.floor(cam.y / TILE), ec = Math.min(sc + Math.ceil(INTERNAL_W / TILE) + 1, MC), er = Math.min(sr + Math.ceil(INTERNAL_H / TILE) + 1, MR);
        bctx.save(); bctx.translate(-Math.round(cam.x), -Math.round(cam.y));
        for (let r = sr; r < er; r++) for (let c = sc; c < ec; c++) drawTile(map[r][c], c, r);
        const ents = [{ type: 'p', y: player.py }];
        npcs.forEach((n, i) => ents.push({ type: 'n', idx: i, y: n.y * TILE }));
        ents.sort((a, b) => a.y - b.y).forEach(e => {
            if (e.type === 'p') drawPlayerSprite(player.px, player.py, player.dir, player.walking ? player.step : 0);
            else { const n = npcs[e.idx]; drawNPCSprite(n.x * TILE, n.y * TILE, n.dir, n.type); }
        });
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; if (p.y < 0) { p.y = MR * TILE; p.x = Math.random() * MC * TILE; } if (p.x < 0) p.x = MC * TILE; if (p.x > MC * TILE) p.x = 0;
            bctx.globalAlpha = p.a; bctx.fillStyle = p.c; bctx.fillRect(p.x, p.y, p.size, p.size);
        });
        bctx.globalAlpha = 1; bctx.restore();
        bctx.filter = 'none';

        const grd = bctx.createRadialGradient(INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_W * 0.4, INTERNAL_W / 2, INTERNAL_H / 2, INTERNAL_W * 0.7);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.2)');
        bctx.fillStyle = grd; bctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

        drawMinimap();
        drawDialogBox();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, INTERNAL_W, INTERNAL_H, 0, 0, canvas.width, canvas.height);
    }

    function togglePause() {
        paused = !paused;
        const pauseScreen = document.getElementById('pause-screen');
        if (paused) {
            pauseScreen.classList.add('visible');
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.remove('visible');
            setTimeout(() => pauseScreen.classList.add('hidden'), 300);
        }
    }

    function saveGame() {
        const save = {
            player: { x: player.x, y: player.y },
            visitedSpots: Array.from(visitedSpots),
            gameFrame
        };
        localStorage.setItem('runClubBerlinSave', JSON.stringify(save));
    }

    function loadGame() {
        const saved = localStorage.getItem('runClubBerlinSave');
        if (saved) {
            const save = JSON.parse(saved);
            player.x = save.player.x;
            player.y = save.player.y;
            player.px = player.x * TILE;
            player.py = player.y * TILE;
            visitedSpots = new Set(save.visitedSpots);
            gameFrame = save.gameFrame || 0;
            updateQuestUI();
        }
    }

    function startGame() {
        loadGame();
        updateQuestUI();
    }

    function loop() {
        if (!paused) {
            gameFrame++;
            animTick++; if (animTick % 30 === 0) animFrame = (animFrame + 1) % 4;
            handleInput(); updatePlayer();
            updateRunEvents();
            updateRandomEvents();
            if (dialog.active) {
                if (dialog.displayedChars < (dialog.lines.length ? dialog.lines.join('\n').length : dialog.text.length)) {
                    if (++dialog.timer >= dialog.speed) { dialog.timer = 0; dialog.displayedChars++; }
                } else if (dialog.autoClose > 0) {
                    dialog.autoClose--;
                    if (dialog.autoClose <= 0) dialog.active = false;
                }
            }
            if (gameFrame % 300 === 0) saveGame();
        }
        render();
        requestAnimationFrame(loop);
    }

    document.getElementById('start-button').addEventListener('click', () => {
        document.getElementById('start-screen').classList.remove('visible');
        setTimeout(() => document.getElementById('start-screen').classList.add('hidden'), 300);
    });
    document.getElementById('resume-button').addEventListener('click', togglePause);

    document.querySelectorAll('#mobile-controls button').forEach(btn => {
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            keys[btn.dataset.key] = true;
        });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            keys[btn.dataset.key] = false;
        });
        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            keys[btn.dataset.key] = true;
        });
        btn.addEventListener('mouseup', e => {
            e.preventDefault();
            keys[btn.dataset.key] = false;
        });
    });

    window.addEventListener('beforeunload', saveGame);

    startGame();
    loop();
})();
