(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Screen: a 160x144 handheld LCD with a strict 4-shade palette.
    // ------------------------------------------------------------------
    const SW = 160, SH = 144, TILE = 16;
    const canvas = document.getElementById('game-canvas');
    canvas.width = SW;
    canvas.height = SH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;

    // 0 = lightest ... 3 = darkest
    const PAL = ['#e0f0c0', '#98c070', '#3f6c48', '#142a1e'];
    const PAL_RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    const PAL_LUM = PAL_RGB.map(([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11);
    const FONT = '"Press Start 2P", monospace';

    // ------------------------------------------------------------------
    // Pixel art helpers. Art is written as 16-char strings, '.' = clear.
    // ------------------------------------------------------------------
    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    function art(rows, remap) {
        const h = rows.length, w = rows[0].length;
        const c = makeCanvas(w, h), g = c.getContext('2d');
        rows.forEach((row, y) => {
            if (row.length !== w) throw new Error('Bad art row ' + y + ': ' + row);
            for (let x = 0; x < w; x++) {
                const ch = row[x];
                if (ch === '.') continue;
                const shade = remap && remap[ch] !== undefined ? remap[ch] : +ch;
                g.fillStyle = PAL[shade];
                g.fillRect(x, y, 1, 1);
            }
        });
        return c;
    }

    function mirror(src) {
        const c = makeCanvas(src.width, src.height), g = c.getContext('2d');
        g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
        return c;
    }

    // Procedural 16x16 tile: fn(x, y) returns a shade or null for clear.
    function proc(fn) {
        const rows = [];
        for (let y = 0; y < TILE; y++) {
            let r = '';
            for (let x = 0; x < TILE; x++) { const v = fn(x, y); r += v === null || v === undefined ? '.' : v; }
            rows.push(r);
        }
        return art(rows);
    }

    // ------------------------------------------------------------------
    // Tiles
    // ------------------------------------------------------------------
    const tuft = (x, y, ox, oy) => (y === oy && (x === ox || x === ox + 2)) || (y === oy + 1 && x === ox + 1);
    const flower = (x, y, cx, cy, diag) => {
        if (x === cx && y === cy) return 3;
        const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        return (diag ? dx === 1 && dy === 1 : dx + dy === 1) ? 0 : null;
    };
    const IMG = {
        grass: proc((x, y) => (tuft(x, y, 2, 2) || tuft(x, y, 10, 6) || tuft(x, y, 5, 11)) ? 2 : 1),
        tall: proc((x, y) => {
            const lx = x % 8, ly = y % 8;
            if (ly === 1 && (lx === 1 || lx === 5)) return 2;
            if (ly >= 2 && ly <= 4 && lx % 2 === 0) return 3;
            if (ly >= 2 && ly <= 4) return 2;
            if (ly === 5) return 3;
            return 1;
        }),
        path: proc((x, y) => ((x * 7 + y * 13) % 29 === 0) ? 1 : 0),
        flowerA: proc((x, y) => flower(x, y, 4, 4, false) ?? flower(x, y, 11, 10, false) ?? (tuft(x, y, 9, 2) ? 2 : 1)),
        flowerB: proc((x, y) => flower(x, y, 4, 4, true) ?? flower(x, y, 11, 10, true) ?? (tuft(x, y, 9, 2) ? 2 : 1)),
        tree: art([
            '....33333333....',
            '..332222222233..',
            '.32221122222223.',
            '.32211222222223.',
            '3222112222222223',
            '3222222222212223',
            '3222222222112223',
            '3222222221122233',
            '.32222222222333.',
            '.33222222223333.',
            '..333222223333..',
            '....33322333....',
            '......3223......',
            '......3123......',
            '.....332233.....',
            '................'
        ]),
        sign: art([
            '................',
            '................',
            '..333333333333..',
            '.30000000000003.',
            '.30222220222003.',
            '.30000000000003.',
            '.30222022222003.',
            '.31000000000013.',
            '..333333333333..',
            '......3113......',
            '......3113......',
            '......3113......',
            '......3113......',
            '.....22222222...',
            '................',
            '................'
        ]),
        bench: art([
            '................',
            '................',
            '................',
            '..333333333333..',
            '..300000000003..',
            '..333333333333..',
            '..300000000003..',
            '..333333333333..',
            '..3..........3..',
            '..3..........3..',
            '..22........22..',
            '................',
            '................',
            '................',
            '................',
            '................'
        ]),
        door: proc((x, y) => {
            if (x < 3 || x > 12 || y < 2) return null;
            if (x === 3 || x === 12 || y === 2) return 3;
            if (x === 10 && y === 9) return 0;
            if ((x === 5 || x === 8) && y >= 4 && y <= 13) return 3;
            return 2;
        }),
        window: proc((x, y) => {
            if (x >= 3 && x <= 12 && y >= 3 && y <= 11) {
                if (x === 3 || x === 12 || y === 3 || y === 11 || y === 7) return 3;
                if ((x === 5 && y >= 4 && y <= 5) || (x === 4 && y === 4)) return 0;
                return 1;
            }
            if (y === 12 && x >= 2 && x <= 13) return 2;
            return null;
        }),
        finish: proc((x, y) => ((x >> 2) + (y >> 2)) % 2 ? 3 : 0),
        trackBase: proc((x, y) => ((x * 5 + y * 3) % 11 === 0) ? 3 : 2)
    };

    // Water: two frames of drifting wave marks.
    function waterFrame(shift) {
        return proc((x, y) => {
            const wave = (ox, oy) => {
                const lx = (x - ox - shift + 32) % 16;
                if (y === oy && lx >= 1 && lx <= 3) return 0;
                if (y === oy + 1 && (lx === 0 || lx === 4)) return 1;
                return null;
            };
            return wave(2, 3) ?? wave(9, 10) ?? 2;
        });
    }
    IMG.water = [waterFrame(0), waterFrame(2)];

    // Reichstag dome: drawn once at 32x32, blitted one quarter per tile.
    IMG.dome = (function () {
        const c = makeCanvas(32, 32), g = c.getContext('2d');
        const cx = 15.5, cy = 26, rx = 13, ry = 22;
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
            const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
            let s;
            if (y <= 27 && d <= 1) {
                if (d > 0.82) s = 3;
                else if (Math.round(x - cx) % 4 === 0) s = 2;
                else if (x < cx - 4 && y < 18) s = 0;
                else s = 1;
            } else if (y >= 28) s = 3;
            else continue;
            g.fillStyle = PAL[s]; g.fillRect(x, y, 1, 1);
        }
        return c;
    })();

    // ------------------------------------------------------------------
    // Sprites (16x16). Head rows 0-8, body rows 9-15.
    // Shade 1 = headband + shirt, 2 = hair + shorts (remapped per NPC).
    // ------------------------------------------------------------------
    const HEAD = {
        down: [
            '....33333333....',
            '...3222222223...',
            '..322222222223..',
            '..311111111113..',
            '..322222222223..',
            '..320000000023..',
            '..300300003003..',
            '..300300003003..',
            '...3000000003...'
        ],
        up: [
            '....33333333....',
            '...3222222223...',
            '..322222222223..',
            '..311111111113..',
            '..322222222223..',
            '..322222222223..',
            '..322222222223..',
            '..322222222223..',
            '...3222222223...'
        ],
        side: [
            '.....3333333....',
            '....322222223...',
            '...32222222223..',
            '...31111111113..',
            '...32222222223..',
            '...32222000003..',
            '...32220003003..',
            '...32220003003..',
            '....322000003...'
        ]
    };
    const BODY = {
        frontA: [
            '...3311111133...',
            '..311111111113..',
            '.30311111111303.',
            '..331111111133..',
            '...3222222223...',
            '...3223..3223...',
            '...3333..3333...'
        ],
        frontB: [
            '...3311111133...',
            '..311111111113..',
            '.30311111111303.',
            '..331111111133..',
            '...3222222223...',
            '...3223...323...',
            '...333....33....'
        ],
        sideA: [
            '....33111113....',
            '...3111111113...',
            '...3111300113...',
            '...3111300113...',
            '....32222223....',
            '....3223.323....',
            '....3333.333....'
        ],
        sideB: [
            '....33111113....',
            '...3111111113...',
            '...3111300113...',
            '...3111300113...',
            '....32222223....',
            '....322223......',
            '.....3333.......'
        ]
    };

    // Frames per direction: [standing, step, other step].
    function buildSpriteSet(remap) {
        const mk = (head, body) => art(head.concat(body), remap);
        const down = [mk(HEAD.down, BODY.frontA), mk(HEAD.down, BODY.frontB)];
        const up = [mk(HEAD.up, BODY.frontA), mk(HEAD.up, BODY.frontB)];
        const right = [mk(HEAD.side, BODY.sideA), mk(HEAD.side, BODY.sideB)];
        const left = right.map(mirror);
        return {
            0: [down[0], down[1], mirror(down[1])],
            1: [up[0], up[1], mirror(up[1])],
            2: [left[0], left[1], left[1]],
            3: [right[0], right[1], right[1]]
        };
    }
    const SPRITES = {
        player: buildSpriteSet(null),
        npc: [
            buildSpriteSet({ 1: 2, 2: 3 }),   // dark kit
            buildSpriteSet({ 2: 1, 1: 0 }),   // light hair, white shirt
            buildSpriteSet({ 1: 0 })          // white shirt
        ]
    };

    // ------------------------------------------------------------------
    // World map. Legend:
    //  ~ water   = path   . grass   , tall grass   * flowers   T tree
    //  # fence   W memorial wall   S sign   b bench
    //  r shingle roof   R flat roof   O dome   n window   w wall   d door
    //  c colonnade   G gate lintel   h gate arch   g gate column
    //  k running track   f finish line
    // ------------------------------------------------------------------
    const MAP_ROWS = [
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        'T==============================================T',
        'TTTTTT==TTTTT==..........==....................T',
        'TT.*..==..*.T==.RRROORRR.==.rrrrrr.rrrrr.RRRRR.T',
        'TT..,,==,,..T==.RRROORRR.==.rrrrrr.rrrrr.RRRRR.T',
        'TT*.,,==,,*.T==.wnnwwnnw.==.nnwwnn.nnwnn.nwnwn.T',
        'TT....==....T==.cccdcccc.==.wwwdwwSwwdww.wwdww.T',
        'T==============*========*======================T',
        'TT....==*,,*T====S=============================T',
        'TT~~~.==*,,.T==============.*.b..*..,,..*.b..*.T',
        'TT~~~.==.b*.T==*,GhGhGhG.==..T....T....T....T..T',
        'TT~~~.==..,,T==,*g=g=g=g.==.*..*......*..*.....T',
        'TT....==*..*T==================================T',
        'TT.TTT==TTTTT==================================T',
        'T==============T..T..T..T===..T..T..T..T..T..T.T',
        'TT*..,==,,*.T==..........===...................T',
        'TT.,,*==*,,.T==.rrrrrr...===##################.T',
        'TT,,..==.,*,T==.rrrrrr...===#kkkkkkkfkkkkkkkk#.T',
        'TT*...==....T==.nwnnwn...===#kkkkkkkfkkkkkkkk#.T',
        'TTTTTT==TTTTT==.wwdwww...===#kk............kk#.T',
        'T=====================S=====#kk.*........*.kk#.T',
        'T.....==.....==.*.,,.*.,.===#kk............kk#.T',
        'T.,,.,==,,.,,==..........==S#kk.....,,.....kk#.T',
        'T...S.==.....==.RRRRRR...====kk............kk#.T',
        'T.WWWW==WWWW.==.RRRRRR...===#kk.....,,.....kk#.T',
        'T==============.nnwwnn...===#kk............kk#.T',
        'T...*.==*....==.wwwdww...===#kk.*........*.kk#.T',
        'T..T..==.T...===============#kk............kk#.T',
        'T.....==.....==*,.*,.*,.*===#kkkkkkkkkkkkkkkk#.T',
        'T.....==.....==..........===#kkkkkkkkkkkkkkkk#.T',
        'T==============..........===##################.T',
        'T.*.,.*.,.*.,==..........======================T',
        'T.....==.....==..........==....................T',
        'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ];
    const MR = MAP_ROWS.length, MC = MAP_ROWS[0].length;
    MAP_ROWS.forEach((r, i) => { if (r.length !== MC) throw new Error('Map row ' + i + ' has length ' + r.length); });
    const map = MAP_ROWS.map(r => r.split(''));

    const SOLID = new Set(['T', '~', '#', 'W', 'S', 'b', 'r', 'R', 'O', 'n', 'w', 'd', 'c', 'G', 'g']);
    const PATHLIKE = new Set(['=', 'h', 'k', 'f', 'g', 'd', 'c', 'S']);
    const ROOFS = new Set(['r', 'R', 'O']);
    const WALLS = new Set(['n', 'w', 'd', 'c']);
    const tileAt = (x, y) => (x < 0 || y < 0 || x >= MC || y >= MR) ? null : map[y][x];
    const isSolid = (x, y) => { const t = tileAt(x, y); return t === null || SOLID.has(t); };

    // Ground under objects (signs, benches, fences) follows the neighbours.
    const ground = map.map((row, y) => row.map((t, x) => {
        if (t === '=' || t === 'h' || t === 'g') return 'path';
        let p = 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (tileAt(x + dx, y + dy) === '=') p++; });
        return p >= 2 ? 'path' : 'grass';
    }));

    const triggers = [
        { x: 31, y: 9, id: 'cic', name: 'CIC Berlin', subtitle: 'Wed 7AM sessions' },
        { x: 37, y: 9, id: 'arys', name: 'Arys Store', subtitle: 'Tue 7PM social run' },
        { x: 18, y: 22, id: 'fm', name: 'Flat Mountain', subtitle: 'Running gear shop' },
        { x: 19, y: 29, id: 'aa', name: 'Arys Annex', subtitle: 'Nutrition + vibes' },
        { x: 36, y: 20, id: 'tk', name: 'Interval Track', subtitle: 'Thu 7PM intervals' },
        { x: 20, y: 13, id: 'bg', name: 'Brandenburg Gate', subtitle: 'Iconic finish line' },
        { x: 8, y: 3, id: 'sp', name: 'Spree River', subtitle: 'Scenic long runs' },
        { x: 9, y: 27, id: 'bw', name: 'Berlin Wall', subtitle: 'Historic trail' },
        { x: 19, y: 9, id: 'rs', name: 'Reichstag', subtitle: 'Parliament views' }
    ].map(t => Object.assign({ w: 1, h: 1 }, t));

    // dir: 0 down, 1 up, 2 left, 3 right
    const npcs = [
        { x: 33, y: 10, dir: 2, type: 0, baseText: "CIC at 7AM. Can't oversleep!", altText: 'Join us for intervals!' },
        { x: 39, y: 10, dir: 2, type: 1, baseText: 'The Arys run is great for meeting people.', altText: 'New shoes just dropped.' },
        { x: 11, y: 3, dir: 0, type: 2, baseText: 'River breeze is perfect today.', altText: 'Morning laps here are gold.' },
        { x: 22, y: 14, dir: 1, type: 0, baseText: 'Just ran through the Gate! PR!', altText: 'Try it at sunset!' },
        { x: 40, y: 20, dir: 2, type: 1, baseText: 'Track day. My legs hurt already.', altText: '400m repeats today. Oof.' },
        { x: 3, y: 27, dir: 3, type: 2, baseText: 'The Wall trail is deep in history.', altText: 'Each step tells a story.' },
        { x: 22, y: 10, dir: 0, type: 0, baseText: 'The Reichstag loop is 5k exactly.', altText: 'Tourists always get in the way.' },
        { x: 3, y: 10, dir: 3, type: 1, baseText: 'Tiergarten is best at dawn.', altText: 'Watch out for bikers!' },
        { x: 21, y: 29, dir: 2, type: 2, baseText: 'Arys Annex has gels on sale.', altText: 'I prefer flat laces.' },
        { x: 20, y: 23, dir: 1, type: 0, baseText: 'Flat Mountain fixed my gait.', altText: 'Bring spikes for winter.' }
    ];

    const randomEvents = [
        { text: 'A group of runners zooms past!', duration: 3000 },
        { text: 'You found a dropped energy gel.', duration: 2500 },
        { text: 'A cyclist rings their bell.', duration: 2000 },
        { text: 'A street musician plays a tune.', duration: 4000 },
        { text: 'A dog chases you briefly.', duration: 2200 },
        { text: 'An ice cream truck jingles nearby.', duration: 3500 }
    ];

    const runEvents = [
        { name: '5K Community Run', startHour: 7, durationMinutes: 45, message: 'Join the 5K at CIC!' },
        { name: 'Arys Social Run', startHour: 19, durationMinutes: 60, message: 'Social run from Arys!' },
        { name: 'Track Intervals', startHour: 19, durationMinutes: 40, message: 'Intervals at the track!' },
        { name: 'Sunset Loop', startHour: 20, durationMinutes: 50, message: 'Sunset loop at the Gate!' }
    ];

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    const START = { x: 31, y: 11 };
    const SAVE_KEY = 'rollingMileSave_v2';
    const OLD_SAVE_KEY = 'runClubBerlinSave';
    const player = { x: START.x, y: START.y, px: START.x * TILE, py: START.y * TILE, dir: 0, walking: false, step: 0, speed: 1 };
    const cam = { x: 0, y: 0 };
    const dialog = { active: false, pages: [], page: 0, chars: 0 };
    const banner = { lines: [], timer: 0 };
    let mode = 'title'; // title | play | pause
    let lastTriggerId = null;
    let visitedSpots = new Set();
    let gameFrame = 0;
    let animFrame = 0;
    let currentEvent = null;
    let nextRandomEventTime = 900;
    let titlePan = 0;

    // ------------------------------------------------------------------
    // Input
    // ------------------------------------------------------------------
    const keys = {};          // held right now (movement, run)
    const tapped = new Set(); // pressed since last check (buttons), so quick taps are never missed
    const normKey = k => (k.length === 1 ? k.toLowerCase() : k);
    const GAME_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'p', 'Escape', 'z', 'x'];
    window.addEventListener('keydown', e => {
        const k = normKey(e.key);
        keys[k] = true;
        if (!e.repeat) tapped.add(k);
        if (GAME_KEYS.includes(k) && e.target.tagName !== 'BUTTON') e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[normKey(e.key)] = false; });
    const clearKeys = () => { for (const k in keys) keys[k] = false; tapped.clear(); };
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });

    // Edge-triggered press: true once per tap of any of the given keys.
    function pressed(...names) {
        if (!names.some(n => tapped.has(n))) return false;
        names.forEach(n => tapped.delete(n));
        return true;
    }
    const A_KEYS = [' ', 'Enter', 'z'];
    const START_KEYS = ['p', 'Escape'];
    const runHeld = () => keys['Shift'] || keys['x'];

    // ------------------------------------------------------------------
    // Text + boxes
    // ------------------------------------------------------------------
    const CHARS_PER_LINE = 18; // 8px monospace font in a 144px text area

    function wrap(str, width) {
        const out = [];
        str.split('\n').forEach(para => {
            let line = '';
            para.split(' ').forEach(word => {
                const test = line ? line + ' ' + word : word;
                if (test.length > width && line) { out.push(line); line = word; } else line = test;
            });
            out.push(line);
        });
        return out;
    }

    function fill(x, y, w, h, s) { ctx.fillStyle = PAL[s]; ctx.fillRect(x, y, w, h); }

    function box(x, y, w, h) {
        fill(x, y, w, h, 3);
        fill(x + 1, y + 1, w - 2, h - 2, 0);
        fill(x + 2, y + 2, w - 4, h - 4, 3);
        fill(x + 3, y + 3, w - 6, h - 6, 0);
    }

    function text(str, x, y, s = 3, size = 8) {
        ctx.fillStyle = PAL[s];
        ctx.font = size + 'px ' + FONT;
        ctx.textBaseline = 'top';
        ctx.fillText(str, x, y);
    }

    function centerText(str, y, s = 3, size = 8) { text(str, Math.round((SW - str.length * size) / 2), y, s, size); }

    function showDialog(t) {
        const lines = wrap(t, CHARS_PER_LINE), pages = [];
        for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
        dialog.active = true; dialog.pages = pages; dialog.page = 0; dialog.chars = 0;
    }
    const pageText = () => dialog.pages[dialog.page].join('\n');

    function showBanner(t, frames = 180) {
        banner.lines = wrap(t, CHARS_PER_LINE).slice(0, 2);
        banner.timer = frames;
    }

    // ------------------------------------------------------------------
    // Quest helpers
    // ------------------------------------------------------------------
    function nearestUnvisited() {
        let best = null, bestD = Infinity;
        for (const t of triggers) {
            if (visitedSpots.has(t.id)) continue;
            const d = Math.abs(t.x - player.x) + Math.abs(t.y - player.y);
            if (d < bestD) { bestD = d; best = t; }
        }
        return best;
    }

    function signText() {
        const t = nearestUnvisited();
        if (!t) return 'SIGN: You have seen every spot. Go run!';
        const dx = t.x - player.x, dy = t.y - player.y;
        const ns = dy < -1 ? 'NORTH' : dy > 1 ? 'SOUTH' : '';
        const ew = dx < -1 ? 'WEST' : dx > 1 ? 'EAST' : '';
        const dirText = (ns + (ns && ew ? '-' : '') + ew) || 'RIGHT HERE';
        return `SIGN: ${t.name}\n-> ${dirText}`;
    }

    // ------------------------------------------------------------------
    // World rendering
    // ------------------------------------------------------------------
    function drawGround(tx, ty, x, y) {
        if (ground[ty][tx] !== 'path') { ctx.drawImage(IMG.grass, x, y); return; }
        ctx.drawImage(IMG.path, x, y);
        // dotted kerb where the path meets grass
        const open = t => t !== null && (PATHLIKE.has(t) || t === '~');
        const up = open(tileAt(tx, ty - 1)), dn = open(tileAt(tx, ty + 1));
        const lf = open(tileAt(tx - 1, ty)), rt = open(tileAt(tx + 1, ty));
        for (let i = 0; i < TILE; i += 2) {
            if (!up) fill(x + i, y, 1, 1, 1);
            if (!dn) fill(x + i, y + TILE - 1, 1, 1, 1);
            if (!lf) fill(x, y + i, 1, 1, 1);
            if (!rt) fill(x + TILE - 1, y + i, 1, 1, 1);
        }
    }

    function drawRoof(t, tx, ty, x, y) {
        const isRoof = n => n !== null && ROOFS.has(n);
        if (t === 'r') {
            for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
                let s = 2;
                if (py % 4 === 3) s = 3;
                else if ((px + ((py >> 2) % 2) * 4) % 8 === 0) s = 3;
                else if (py % 4 === 0) s = 1;
                fill(x + px, y + py, 1, 1, s);
            }
        } else {
            fill(x, y, TILE, TILE, 3);
            for (let i = 0; i < TILE; i += 2) { fill(x + i, y + 7, 1, 1, 2); fill(x + 7, y + i, 1, 1, 2); }
        }
        if (!isRoof(tileAt(tx, ty - 1))) { fill(x, y, TILE, 1, 3); fill(x, y + 1, TILE, 1, 1); }
        if (!isRoof(tileAt(tx - 1, ty))) { fill(x, y, 1, TILE, 3); fill(x + 1, y + 1, 1, TILE - 1, 1); }
        if (!isRoof(tileAt(tx + 1, ty))) fill(x + TILE - 1, y, 1, TILE, 3);
        if (!isRoof(tileAt(tx, ty + 1))) { fill(x, y + TILE - 3, TILE, 1, 2); fill(x, y + TILE - 2, TILE, 2, 3); }
    }

    function drawWall(t, tx, ty, x, y) {
        const isWall = n => n !== null && WALLS.has(n);
        if (t === 'c') {
            for (let px = 0; px < TILE; px++) {
                const m = px % 8;
                fill(x + px, y, 1, TILE, (m >= 1 && m <= 4) ? (m === 4 ? 1 : 0) : 2);
            }
            fill(x, y, TILE, 2, 3); fill(x, y + TILE - 2, TILE, 2, 3);
        } else {
            fill(x, y, TILE, TILE, 0);
            fill(x, y + 5, TILE, 1, 1); fill(x, y + 11, TILE, 1, 1);
            fill(x + 4, y, 1, 5, 1); fill(x + 12, y + 6, 1, 5, 1); fill(x + 6, y + 12, 1, 4, 1);
            if (t === 'n') ctx.drawImage(IMG.window, x, y);
            if (t === 'd') ctx.drawImage(IMG.door, x, y);
            if (!isWall(tileAt(tx, ty + 1))) fill(x, y + TILE - 1, TILE, 1, 2);
        }
        if (!isWall(tileAt(tx - 1, ty))) fill(x, y, 1, TILE, 3);
        if (!isWall(tileAt(tx + 1, ty))) fill(x + TILE - 1, y, 1, TILE, 3);
    }

    function drawFence(tx, ty, x, y) {
        const f = (dx, dy) => tileAt(tx + dx, ty + dy) === '#';
        if (f(-1, 0)) { fill(x, y + 5, 8, 2, 2); fill(x, y + 10, 8, 2, 2); }
        if (f(1, 0)) { fill(x + 8, y + 5, 8, 2, 2); fill(x + 8, y + 10, 8, 2, 2); }
        if (f(0, -1)) fill(x + 7, y, 2, 6, 2);
        if (f(0, 1)) fill(x + 7, y + 10, 2, 6, 2);
        fill(x + 5, y + 2, 6, 12, 3);
        fill(x + 6, y + 3, 2, 10, 1);
    }

    function drawLintel(x, y) {
        fill(x, y, TILE, 5, 0);
        fill(x, y, TILE, 1, 3); fill(x, y + 4, TILE, 1, 3);
        for (let i = 1; i < TILE; i += 3) fill(x + i, y + 2, 1, 2, 2);
    }

    function drawTile(tx, ty) {
        const t = map[ty][tx], x = tx * TILE, y = ty * TILE;
        switch (t) {
            case '~': {
                ctx.drawImage(IMG.water[(animFrame >> 1) % 2], x, y);
                const wet = n => n === '~' || n === null;
                if (!wet(tileAt(tx, ty - 1))) fill(x, y, TILE, 2, 0);
                if (!wet(tileAt(tx - 1, ty))) fill(x, y, 1, TILE, 0);
                if (!wet(tileAt(tx + 1, ty))) fill(x + TILE - 1, y, 1, TILE, 0);
                if (!wet(tileAt(tx, ty + 1))) { fill(x, y + TILE - 3, TILE, 1, 1); fill(x, y + TILE - 2, TILE, 2, 3); }
                return;
            }
            case ',': ctx.drawImage(IMG.tall, x, y); return;
            case '*': ctx.drawImage((animFrame % 2) ? IMG.flowerB : IMG.flowerA, x, y); return;
            case '=': drawGround(tx, ty, x, y); return;
            case 'T': ctx.drawImage(IMG.grass, x, y); ctx.drawImage(IMG.tree, x, y); return;
            case 'S': drawGround(tx, ty, x, y); ctx.drawImage(IMG.sign, x, y); return;
            case 'b': drawGround(tx, ty, x, y); ctx.drawImage(IMG.bench, x, y); return;
            case '#': drawGround(tx, ty, x, y); drawFence(tx, ty, x, y); return;
            case 'W':
                drawGround(tx, ty, x, y);
                fill(x, y + 1, TILE, 14, 3);
                fill(x, y + 2, TILE, 12, 1);
                fill(x, y + 2, TILE, 2, 0);
                fill(x + 7, y + 2, 1, 12, 2);
                fill(x + 2 + (tx * 5) % 9, y + 7, 3, 2, 2);
                fill(x + 10 - (tx * 3) % 7, y + 10, 2, 2, 3);
                if (tileAt(tx - 1, ty) !== 'W') fill(x, y + 1, 1, 14, 3);
                if (tileAt(tx + 1, ty) !== 'W') fill(x + TILE - 1, y + 1, 1, 14, 3);
                return;
            case 'r': case 'R': drawRoof(t, tx, ty, x, y); return;
            case 'O': {
                drawRoof('R', tx, ty, x, y);
                const ox = tileAt(tx - 1, ty) === 'O' ? 16 : 0, oy = tileAt(tx, ty - 1) === 'O' ? 16 : 0;
                ctx.drawImage(IMG.dome, ox, oy, 16, 16, x, y, 16, 16);
                return;
            }
            case 'n': case 'w': case 'd': case 'c': drawWall(t, tx, ty, x, y); return;
            case 'G':
                fill(x, y, TILE, TILE, 0);
                drawLintel(x, y);
                fill(x + 3, y + 5, 10, 11, 3); fill(x + 4, y + 5, 8, 11, 0); fill(x + 9, y + 5, 3, 11, 1);
                return;
            case 'h':
                drawGround(tx, ty, x, y);
                drawLintel(x, y);
                fill(x, y + 5, TILE, 3, 2);
                return;
            case 'g':
                drawGround(tx, ty, x, y);
                fill(x + 3, y, 10, TILE, 3);
                fill(x + 4, y, 8, TILE, 0);
                fill(x + 9, y, 3, TILE, 1);
                fill(x + 2, y + 13, 12, 3, 3); fill(x + 3, y + 13, 10, 2, 1);
                return;
            case 'k': {
                ctx.drawImage(IMG.trackBase, x, y);
                const track = n => n === 'k' || n === 'f';
                if (!track(tileAt(tx, ty - 1))) fill(x, y, TILE, 1, 0);
                if (!track(tileAt(tx, ty + 1))) fill(x, y + TILE - 1, TILE, 1, 0);
                if (!track(tileAt(tx - 1, ty))) fill(x, y, 1, TILE, 0);
                if (!track(tileAt(tx + 1, ty))) fill(x + TILE - 1, y, 1, TILE, 0);
                return;
            }
            case 'f': ctx.drawImage(IMG.finish, x, y); return;
            default: ctx.drawImage(IMG.grass, x, y);
        }
    }

    function drawSprite(set, dir, frame, x, y) {
        ctx.drawImage(set[dir][frame], Math.round(x), Math.round(y));
    }

    function updateCamera() {
        cam.x = Math.max(0, Math.min(player.px - SW / 2 + TILE / 2, MC * TILE - SW));
        cam.y = Math.max(0, Math.min(player.py - SH / 2 + TILE / 2, MR * TILE - SH));
    }

    function drawWorld() {
        const cx = Math.round(cam.x), cy = Math.round(cam.y);
        const sc = Math.floor(cx / TILE), sr = Math.floor(cy / TILE);
        const ec = Math.min(sc + SW / TILE + 1, MC), er = Math.min(sr + Math.ceil(SH / TILE) + 1, MR);
        ctx.save();
        ctx.translate(-cx, -cy);
        for (let r = sr; r < er; r++) for (let c = sc; c < ec; c++) drawTile(c, r);
        const ents = [{ p: true, y: player.py }].concat(npcs.map(n => ({ n, y: n.y * TILE })));
        ents.sort((a, b) => a.y - b.y).forEach(e => {
            if (e.p) drawSprite(SPRITES.player, player.dir, player.walking ? (player.step ? 1 : 2) : 0, player.px, player.py);
            else drawSprite(SPRITES.npc[e.n.type], e.n.dir, 0, e.n.x * TILE, e.n.y * TILE);
        });
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // HUD and screens (all drawn on the LCD)
    // ------------------------------------------------------------------
    function drawHud() {
        if (banner.timer > 0) {
            box(0, 0, SW, banner.lines.length * 10 + 10);
            banner.lines.forEach((l, i) => text(l, 8, 6 + i * 10));
            return;
        }
        const label = `${visitedSpots.size}/${triggers.length}`;
        box(2, 2, 22 + label.length * 8, 16);
        fill(8, 6, 1, 9, 3); fill(9, 6, 5, 4, 3); fill(10, 7, 3, 2, 1);   // little flag
        text(label, 17, 6);
    }

    function drawDialog() {
        if (!dialog.active) return;
        const by = SH - 46;
        box(0, by, SW, 46);
        pageText().substring(0, dialog.chars).split('\n').forEach((l, i) => text(l, 8, by + 7 + i * 11));
        if (dialog.chars >= pageText().length && (gameFrame >> 4) % 2 === 0) {
            const ax = SW - 13, ay = by + 37;
            fill(ax, ay, 5, 1, 3); fill(ax + 1, ay + 1, 3, 1, 3); fill(ax + 2, ay + 2, 1, 1, 3);
        }
    }

    function drawTitle() {
        // slow pan across the city behind the logo
        titlePan += 0.25;
        const span = MC * TILE - SW, t = titlePan % (span * 2);
        cam.x = t < span ? t : span * 2 - t;
        cam.y = 7 * TILE;
        drawWorld();
        box(12, 16, SW - 24, 66);
        centerText('ROLLING', 24, 3, 16);
        centerText('MILE', 42, 3, 16);
        fill(32, 61, SW - 64, 1, 2);
        centerText('- BERLIN -', 66, 2);
        box(SW / 2 - 14, 88, 28, 26);
        drawSprite(SPRITES.player, 3, (gameFrame >> 3) % 2 ? 1 : 0, SW / 2 - 8, 93);
        if ((gameFrame >> 5) % 2 === 0) {
            const label = visitedSpots.size ? 'CONTINUE' : 'PRESS START';
            box(Math.round((SW - label.length * 8) / 2) - 8, 120, label.length * 8 + 16, 18);
            centerText(label, 125);
        }
    }

    function drawPause() {
        box(0, 0, SW, SH);
        centerText('TOWN MAP', 7);
        const s = 3, ox = Math.round((SW - MC * s) / 2), oy = 19;
        for (let y = 0; y < MR; y++) for (let x = 0; x < MC; x++) {
            const t = map[y][x];
            let c = 1;
            if (t === '~') c = (x + y) % 2 ? 2 : 1;
            else if (t === 'T') c = 2;
            else if (SOLID.has(t)) c = 3;
            else if (PATHLIKE.has(t)) c = 0;
            fill(ox + x * s, oy + y * s, s, s, c);
        }
        const blink = (gameFrame >> 4) % 2 === 0;
        triggers.forEach(t => {
            const done = visitedSpots.has(t.id);
            if (!done && !blink) return;
            fill(ox + t.x * s - 1, oy + t.y * s - 1, 5, 5, 3);
            fill(ox + t.x * s, oy + t.y * s, 3, 3, done ? 3 : 0);
        });
        if (!blink) {
            fill(ox + player.x * s - 2, oy + player.y * s - 2, 7, 7, 3);
            fill(ox + player.x * s - 1, oy + player.y * s - 1, 5, 5, 0);
        }
        text(`SPOTS ${visitedSpots.size}/${triggers.length}`, 8, 130);
    }

    // Snap every pixel to the 4-shade palette (cleans font anti-aliasing).
    function quantize() {
        const img = ctx.getImageData(0, 0, SW, SH), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
            let best = 0, bd = Infinity;
            for (let k = 0; k < 4; k++) { const dd = Math.abs(l - PAL_LUM[k]); if (dd < bd) { bd = dd; best = k; } }
            const c = PAL_RGB[best];
            d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    function render() {
        fill(0, 0, SW, SH, 0);
        if (mode === 'title') drawTitle();
        else if (mode === 'pause') drawPause();
        else { updateCamera(); drawWorld(); drawHud(); drawDialog(); }
        quantize();
    }

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    const MDX = [0, 0, -1, 1], MDY = [1, -1, 0, 0];

    function startGame() {
        if (mode !== 'title') return;
        mode = 'play';
        clearKeys();
        if (!visitedSpots.size) showDialog('Welcome to Berlin! Find all 9 run spots. Signs point the way. Hold B to run.');
    }

    function handleInput() {
        if (mode === 'title') {
            if (pressed(...A_KEYS, ...START_KEYS)) startGame();
            return;
        }
        if (mode === 'pause') {
            if (pressed(...START_KEYS, ...A_KEYS)) mode = 'play';
            return;
        }
        if (pressed(...START_KEYS)) { mode = 'pause'; saveGame(); return; }

        if (dialog.active) {
            if (pressed(...A_KEYS)) {
                if (dialog.chars < pageText().length) dialog.chars = pageText().length;
                else if (dialog.page < dialog.pages.length - 1) { dialog.page++; dialog.chars = 0; }
                else dialog.active = false;
            }
            return;
        }
        if (player.walking) return;

        let dir = -1;
        if (keys['ArrowDown'] || keys['s']) dir = 0;
        else if (keys['ArrowUp'] || keys['w']) dir = 1;
        else if (keys['ArrowLeft'] || keys['a']) dir = 2;
        else if (keys['ArrowRight'] || keys['d']) dir = 3;
        if (dir >= 0) {
            player.dir = dir;
            const nx = player.x + MDX[dir], ny = player.y + MDY[dir];
            if (!isSolid(nx, ny) && !npcs.some(n => n.x === nx && n.y === ny)) {
                player.walking = true;
                player.step = 1 - player.step;
                player.speed = runHeld() ? 2 : 1;
            }
        }

        if (pressed(...A_KEYS)) {
            const fx = player.x + MDX[player.dir], fy = player.y + MDY[player.dir];
            const npc = npcs.find(n => n.x === fx && n.y === fy);
            if (npc) {
                npc.dir = [1, 0, 3, 2][player.dir];
                showDialog(Math.random() > 0.5 ? npc.baseText : npc.altText);
                return;
            }
            const t = tileAt(fx, fy);
            if (t === 'S') showDialog(signText());
            else if (t === 'd') showDialog("It's locked. You peek through the glass.");
            else if (t === '~') showDialog('The Spree glitters. Better not swim.');
        }
    }

    function updatePlayer() {
        if (!player.walking) return;
        player.px += MDX[player.dir] * player.speed;
        player.py += MDY[player.dir] * player.speed;
        const tx = (player.x + MDX[player.dir]) * TILE, ty = (player.y + MDY[player.dir]) * TILE;
        if (player.px !== tx || player.py !== ty) return;
        player.x += MDX[player.dir]; player.y += MDY[player.dir];
        player.walking = false;
        const trig = triggers.find(t => t.x === player.x && t.y === player.y);
        if (!trig) { lastTriggerId = null; return; }
        if (lastTriggerId === trig.id) return;
        lastTriggerId = trig.id;
        showBanner(`${trig.name}\n${trig.subtitle}`);
        if (!visitedSpots.has(trig.id)) {
            visitedSpots.add(trig.id);
            saveGame();
            if (visitedSpots.size === triggers.length) {
                showDialog('QUEST COMPLETE! You visited every Berlin run spot. Legend status unlocked!');
            }
        }
    }

    function updateNpcs() {
        if (dialog.active || Math.random() >= 1 / 90) return;
        const n = npcs[Math.floor(Math.random() * npcs.length)];
        n.dir = Math.floor(Math.random() * 4);
    }

    function updateRunEvents() {
        const now = new Date(), current = now.getHours() * 60 + now.getMinutes();
        if (currentEvent && current >= currentEvent.startHour * 60 + currentEvent.durationMinutes) currentEvent = null;
        if (currentEvent) return;
        for (const ev of runEvents) {
            const start = ev.startHour * 60;
            if (current >= start && current < start + ev.durationMinutes) {
                currentEvent = ev;
                showBanner(`${ev.name}! ${ev.message}`, 240);
                break;
            }
        }
    }

    function updateRandomEvents() {
        if (gameFrame <= nextRandomEventTime || banner.timer > 0 || dialog.active) return;
        const ev = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        showBanner(ev.text, Math.round(ev.duration / (1000 / 60)));
        nextRandomEventTime = gameFrame + 900 + Math.floor(Math.random() * 900);
    }

    function update() {
        gameFrame++;
        if (gameFrame % 32 === 0) animFrame = (animFrame + 1) % 4;
        handleInput();
        if (mode !== 'play') return;
        updatePlayer();
        updateNpcs();
        updateRunEvents();
        updateRandomEvents();
        if (banner.timer > 0) banner.timer--;
        if (dialog.active && dialog.chars < pageText().length) dialog.chars++;
        if (gameFrame % 300 === 0) saveGame();
    }

    // ------------------------------------------------------------------
    // Save / load
    // ------------------------------------------------------------------
    function saveGame() {
        if (mode === 'title') return;
        const save = { player: { x: player.x, y: player.y }, visitedSpots: Array.from(visitedSpots) };
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
    }

    function loadGame() {
        let save = null, legacy = false;
        try {
            save = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (!save) { save = JSON.parse(localStorage.getItem(OLD_SAVE_KEY)); legacy = !!save; }
        } catch (e) { save = null; }
        if (!save) return;
        const ids = new Set(triggers.map(t => t.id));
        visitedSpots = new Set((save.visitedSpots || []).filter(id => ids.has(id)));
        if (legacy) return; // old map layout: keep progress, start at the default spot
        const sx = save.player && save.player.x, sy = save.player && save.player.y;
        const ok = Number.isInteger(sx) && Number.isInteger(sy) && !isSolid(sx, sy) && !npcs.some(n => n.x === sx && n.y === sy);
        if (ok) { player.x = sx; player.y = sy; }
        player.px = player.x * TILE; player.py = player.y * TILE;
        lastTriggerId = (triggers.find(t => t.x === player.x && t.y === player.y) || {}).id || null;
    }

    // ------------------------------------------------------------------
    // Loop (fixed 60 Hz simulation, any display refresh rate)
    // ------------------------------------------------------------------
    const STEP_MS = 1000 / 60;
    let lastTime = performance.now(), acc = 0;
    function loop(now) {
        acc += Math.min(250, now - lastTime);
        lastTime = now;
        while (acc >= STEP_MS) { update(); acc -= STEP_MS; }
        render();
        requestAnimationFrame(loop);
    }

    // ------------------------------------------------------------------
    // Page layout + on-screen buttons
    // ------------------------------------------------------------------
    function resize() {
        const landscape = window.innerWidth > window.innerHeight && window.innerHeight < 560;
        document.body.classList.toggle('landscape', landscape);
        // horizontal room taken by the shell + bezel padding (smaller on phones, see styles.css)
        const chrome = window.innerWidth <= 520 ? 64 : 124;
        const availW = landscape ? window.innerWidth - 340 : window.innerWidth - chrome;
        const availH = landscape ? window.innerHeight - 64 : window.innerHeight - 300;
        let s = Math.min(availW / SW, availH / SH);
        s = s >= 2 ? Math.floor(s) : Math.max(1, s);
        canvas.style.width = Math.round(SW * s) + 'px';
        canvas.style.height = Math.round(SH * s) + 'px';
    }
    window.addEventListener('resize', resize);
    resize();

    document.querySelectorAll('[data-key]').forEach(btn => {
        const key = btn.dataset.key;
        const press = e => { e.preventDefault(); keys[key] = true; tapped.add(key); btn.classList.add('down'); };
        const release = e => { e.preventDefault(); keys[key] = false; btn.classList.remove('down'); };
        btn.addEventListener('pointerdown', press);
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, release));
        btn.addEventListener('contextmenu', e => e.preventDefault());
    });
    canvas.addEventListener('pointerdown', startGame);
    window.addEventListener('beforeunload', saveGame);

    // Read-only hook used by test.js to verify map reachability.
    window.__ROLLING_MILE__ = Object.freeze({ map, triggers, npcs, isSolid, start: START, MC, MR });

    loadGame();
    requestAnimationFrame(loop);
})();
