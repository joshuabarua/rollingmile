# ROLLING MILE Berlin

A pixel-art exploration game about Berlin’s running culture. Wander the city, meet runners, and visit every featured spot.

## How to run

1. Open `index.html` in a modern web browser.
2. No build step or server required.

## Controls

- **Arrow keys or WASD**: Move
- **Space/Enter**: Interact with NPCs and signs
- **P or Escape**: Pause/resume

Tip: sign posts point you toward the nearest spot you haven't visited yet.

Mobile: on-screen D-pad and interact button appear automatically on touch devices.

## Features

- Berlin-inspired pixel map with landmarks (Brandenburg Gate, Spree, Reichstag, etc.)
- 9 run culture hotspots to discover
- NPCs with randomized dialogue
- Progress auto-saves in your browser (localStorage)
- Quest progress tracker
- Minimap in the top-right
- Location cards when you discover a new spot
- Start screen and pause menu
- Mobile-friendly controls
- Atmospheric particles and subtle animations

## Project structure

```
/
├── index.html      # Main page and UI shell
├── styles.css      # Styles for game, HUD, overlays, and mobile controls
├── game.js         # Game engine, rendering, input, and game logic
├── test.js         # Headless smoke test (npm test)
└── README.md       # This file
```

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
