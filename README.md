# ROLLING MILE Berlin

A pixel-art exploration game about Berlin’s running culture. Wander the city, meet runners, and visit every featured spot.

## How to run

1. Open `index.html` in a modern web browser.
2. No build step or server required.

## Controls

| Button | Keyboard | Action |
| --- | --- | --- |
| D-pad | Arrow keys / WASD | Move |
| A | Z / Space / Enter | Talk, read signs, advance text |
| B (hold) | X / Shift | Run |
| START | P / Escape | Pause and open the town map |

On touch devices, use the on-screen handheld buttons.

Tip: sign posts point you toward the nearest spot you haven't visited yet.

## Features

- Classic handheld look: 160x144 screen, 4-shade green palette, 16x16 pixel-art tiles and sprites
- Hand-laid Berlin map: Spree, Tiergarten, Reichstag, Brandenburg Gate, shop street, Wall memorial, running track
- 9 run culture hotspots to discover
- NPCs who turn to face you when you talk
- Town map on the pause screen showing visited and remaining spots
- Progress auto-saves in your browser (localStorage)
- Works on phones in portrait and landscape

## Testing

```bash
npm install
npm test
```

The smoke test loads the game in headless Chrome, fails on runtime errors, and checks that every quest spot and NPC is reachable from the start position. Set `PUPPETEER_EXECUTABLE_PATH` to use an existing Chrome install.

## Tech

- Vanilla JavaScript (ES6+)
- Canvas 2D rendering
- No external dependencies (except Google Fonts for the retro font)

## Wishlist / Possible extensions

- Sound effects and background music
- More NPCs and dynamic events
- Day/night cycle or weather
- Run “events” with simple timers
- Export/import for sharing progress

Enjoy the run! 🏃‍♂️🇩🇪
