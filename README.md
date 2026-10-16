# Toronto Taxi: GTA Lakeshore

A lightweight, keyboard-driven 3D driving game. Play at https://greenkeewi.github.io/taxi/ or the identical 3D mirror at https://greenkeewi.github.io/night-shift-taxi/3d/.

The original 2D game remains at https://greenkeewi.github.io/night-shift-taxi/.

## The regional expansion

Three distinct, connected centres: Toronto's original 8×7 downtown/waterfront grid, a greener 6×6 Pickering-inspired town, and a lower industrial 6×6 Oshawa-inspired town. There are 128 junctions, 109 taxi destinations, twelve slip roads, and a continuous four-lane expressway across a 2.98 km wide world. Two greenbelt stretches each provide about a kilometre of uninterrupted highway driving. These are compressed, fictional places, not exact real street geometry.

- **Regional dispatch** mixes intercity and local fares. **Intercity** always sends the rider to another city; **Local** stays in the current city. Pickups stay nearby. Fares and trip allowances account for the routed journey.
- **509 Harbour Loop** retains its ten Toronto stops. **900 Lakeshore Intercity** serves six stops, travelling Toronto → Pickering → Oshawa and back.
- The HUD shows actual driving distance, a rough journey estimate, numbered exit countdowns and acceleration/merge guidance. Freight yards and cranes distinguish the western highway stretch; creek islands and taller woodland distinguish the eastern reserve.
- The opening pickup has a wider approach and a smooth guide curve. The later tight and reverse bays retain their parking challenge.
- GPS uses directed street lanes, proper ramp entry/exit, and the correct deck. Missing an exit sends you to another interchange to return. End-of-corridor turning areas have a median opening; slow down to turn.
- Gardiner/Lakeshore Expressway crosses above Lake Shore Boulevard. Eastbound ramps cross beneath the expressway before climbing alongside it, with clear space for buses and no piers in their path.
- City meshes are split into spatial cells. Each view submits nearby cells within its viewing cone; distant cities are not drawn. The software renderer also indexes bridge-occlusion tests spatially.
- Shifts save in this browser every eight seconds and on pause/map/exit. Use **Continue saved shift** after reloading. Each Pages link has its own browser save. Restart starts fresh.

## Controls

Enter starts/confirms; arrows select menu rows, and left/right changes a setting. WASD or arrows drive; S/down brakes, then reverses. Space brakes. Q/E look left/right; C looks behind. Shift plus the pedals gives fine parking control. Escape/P pauses; F1 opens help; Tab opens the regional map; H sounds the horn; R calls roadside assist ($15); L toggles low power; M toggles sound.

Choose taxi/bus, dispatch/service, start time (12-hour display), and traffic level with the keyboard. On menu screens, Tab/Shift+Tab reaches every button and link; Enter/Space activates a focused control. Tab opens the regional map while driving. Fines and assist can leave the balance below zero. Low power limits rendering to 30 FPS and reduces resolution/draw distance; it is not a guarantee of 30 FPS on every device.

## Build and validation

Static HTML/CSS/JavaScript, no backend, dependencies, or build step. Release `regional-13`. Serve with `python3 -m http.server 8080`.

Engine tests: `node tests-region.cjs`, `node physical-regression.cjs`, `node physics-checks.cjs`, `node journey-polish.cjs`. `node keyboard-navigation.cjs` checks native menu/link focus and activation alongside arrow controls. `node keyboard-pickup.cjs` drives the opening pickup using real browser keyboard events with normal traffic. Browser regression: `node browser-regression.cjs` (requires Playwright and `/usr/bin/chromium`; uses port 8080 for this game and 8081 for the previous revision when comparing performance). The `?test` URL enables placement helpers solely for reproducible regression.

See [evidence/REPORT.md](evidence/REPORT.md) for the measured results, test boundaries, screenshots and publishing evidence. Cloud Chromium testing covers WebGL through SwiftShader and the Canvas2D fallback; it does not constitute physical Chromebook validation.
