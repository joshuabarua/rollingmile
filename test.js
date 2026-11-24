// Smoke test: loads the game in headless Chrome, checks for runtime errors,
// and verifies every quest spot and NPC can actually be reached.
// Run: npm test   (set PUPPETEER_EXECUTABLE_PATH to use a system Chrome)
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto('file://' + path.join(__dirname, 'index.html'));
    await new Promise(r => setTimeout(r, 500));

    const report = await page.evaluate(() => {
        const { map, triggers, npcs, isSolid, start, MC, MR } = window.__ROLLING_MILE__;
        const npcAt = (x, y) => npcs.some(n => n.x === x && n.y === y);
        const seen = new Set([start.x + ',' + start.y]);
        const queue = [[start.x, start.y]];
        while (queue.length) {
            const [x, y] = queue.shift();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
                if (seen.has(k) || isSolid(nx, ny) || npcAt(nx, ny)) continue;
                seen.add(k);
                queue.push([nx, ny]);
            }
        }
        const unreachableSpots = triggers.filter(t => !seen.has(t.x + ',' + t.y)).map(t => t.id);
        const unreachableNpcs = npcs
            .filter(n => isSolid(n.x, n.y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((n.x + dx) + ',' + (n.y + dy))))
            .map(n => `${n.x},${n.y}`);
        return { unreachableSpots, unreachableNpcs, size: [MC, MR], rows: map.length };
    });

    await browser.close();

    const failures = [];
    if (errors.length) failures.push('Runtime errors: ' + errors.join(' | '));
    if (report.unreachableSpots.length) failures.push('Unreachable quest spots: ' + report.unreachableSpots.join(', '));
    if (report.unreachableNpcs.length) failures.push('Unreachable NPCs: ' + report.unreachableNpcs.join(', '));

    if (failures.length) {
        console.error('FAIL\n- ' + failures.join('\n- '));
        process.exit(1);
    }
    console.log('PASS: no runtime errors, all quest spots and NPCs reachable');
})().catch(err => { console.error(err); process.exit(1); });
