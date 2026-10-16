# GTA Lakeshore expansion — cloud verification

2026-10-16. Release `regional-11`. The user story is keyboard menu → taxi/bus simulation → directed city/ramp/highway route → cockpit/minimap rendering, with browser-local shift saves and static GitHub Pages publishing. There is no backend or external runtime dependency.

## Delivered scope

- Toronto 8×7 plus distinct Pickering and Oshawa 6×6 street grids: **128 junctions, 109 taxi destinations, 12 slip roads**.
- **2.98 km** wide world; approximately **2.90 km** of continuous divided expressway, including two uninterrupted greenbelt stretches of approximately **1.01 km and 1.06 km**.
- Regional/intercity/local dispatch, nearby pickups, route-distance fare pricing and trip allowances. A typical tested Toronto-to-Oshawa route is around 3.7 km including local streets and ramps.
- Ten-stop **509 Harbour Loop**, preserved, plus six-stop **900 Lakeshore Intercity**, outbound and return.
- Independent surface/deck layers, proper ramp exits and missed-exit recovery; no surface shortcuts across the gaps. Eastbound ramps pass below the main road before climbing outside it. Existing water, cockpit/head-look, progressive steering, speed model, reverse bays, audio, debt, right-on-red and 12-hour clock remain.
- Mesh cells and viewing-cone/distance culling. The Canvas fallback uses spatially indexed bridge sightlines. Saved shifts continue after a browser reload.
- This is deliberately compressed, stylized geography, not a claim about exact real streets.

## Checks and results

| Boundary | Result | Evidence |
|---|---|---|
| Static startup and rendering | Pass, no page errors | `browser-results.json`, screenshots |
| Keyboard → driving/settings | Pass: pedals/steering, Q/E/C, pause, help, map, restart, taxi/bus, 900 selection, PM time, low power, mute | `browser-regression.cjs`, `browser-log.txt` |
| Engine → road network | All nine town pairs, every ramp, both bus services, missed-exit routes and terminal turnarounds pass route sampling | `tests-region.cjs`, `route-audit.txt` |
| Continuous physical driving | All six directed intercity trips pass for taxi **and** bus, **zero collisions** | `physical-results.json` |
| Stop/passenger flow | 509: 10 stops, 1 lap, 77 boarded / 41 alighted. 900: 6 stops, 1 lap, 55 boarded / 19 alighted | `physical-log.txt` |
| Taxi pickup/drop-off | Held parking state advances pickup → drop-off → paid completion | `physical-regression.cjs`; browser on-board screenshot |
| Save → reload → continue | Pass, browser keyboard continuation and engine ramp-state round trip | browser and physical regressions |
| Grade separation | Taxi and bus cross below expressway at all three towns, remain at height 0 with no collisions | `physics-checks.json`, `underpass.png` |
| Traffic/debt/rules | Following stops and resumes without overlap; deck/ground vehicles do not collide; solid regional buildings; negative balance; qualified right-on-red accepted, straight red crossing fined | `physics-checks.cjs` |
| Map edges/seeds | Vehicles remain within map boundaries; seeds 1, 42, 8427, 12345 and 999999 retain joined highway decks | `physics-checks.json` |
| GitHub / Pages | Both exact feature commits pushed; both Pages build/deployment workflows succeeded. Direct public Pages HTTP loads remain blocked by this cloud’s Envoy 403 | delivery notes |

The continuous driving tests use an automated driver sending ordinary digital steering/pedal inputs through the existing physics, with other traffic disabled to isolate road geometry. That driver does not obey signals; red-light behavior is tested separately. Each trip begins with a controlled start placement. Bus-stop tests place the bus shortly before each stop, then use actual forward movement/braking/boarding. Taxi fare-state tests use controlled parking placements. These are not a claim of one uninterrupted human-played traffic session.

## Performance measurements

Cloud Chromium 1280×800, normal 48-car traffic, stationary Toronto starting view, approximately 4.5-second sample after startup. Baseline is commit `6b7c734`. WebGL uses CPU SwiftShader emulation; Canvas is forced with WebGL disabled. Canvas automatically uses low-power rendering in both versions.

| Renderer / mode | Expanded FPS | Expanded JS render ms | Baseline FPS | Baseline JS render ms |
|---|---:|---:|---:|---:|
| SwiftShader / full | 12 | 5.0 | 6 | 7.0 |
| SwiftShader / low | 13 | 5.4 | 6 | 6.8 |
| Canvas fallback | 30 | 13.8 | 29 | 18.3 |
| Canvas fallback / low | 30 | 14.0 | 30 | 19.1 |

The expanded world contains 679,314 static vertices. In the measured starting view, full mode submits 125,868 and low mode 105,135 (approximately 18.5% / 15.5% of the world), using nearby chunks rather than drawing every town. Full raw readings are in `browser-results.json`. The JS timing excludes GPU/compositor waits; it must not be presented as the actual displayed frame interval. These short cloud samples are indicative, not a hardware benchmark or a guarantee. **No physical Chromebook validation was performed.**

## Screenshots

- `title.png` — regional scope and keyboard settings.
- `regional-map.png` — three separate grids and the highway corridor.
- `ramp-ascent.png`, `underpass.png` — different road levels.
- `lakeshore-expressway.png`, `highway-traffic.png` — long highway section and moving browser traffic scenario.
- `pickering.png`, `oshawa.png` — the different local centres.
- `intercity-bus.png`, `fare-on-board.png` — selected bus service and taxi rider state.

Screenshots use explicit scenario placements; see `capture-evidence.cjs` and `highway-browser.cjs`. Their purpose is visual regression, not proof of the full intercity traversal. Continuous movement evidence is recorded by the physical tests.

## Publishing evidence

- Taxi feature commit: `a250bb03fd979e30c814636812d62b3afa8d9060`, confirmed by `git ls-remote`. [Successful Pages deployment](https://github.com/GreenKeewi/taxi/actions/runs/38849094263).
- 3D mirror feature commit: `f62bfb5aafca8a1e9f71d4a30da73ca4f84c68cd`, confirmed by `git ls-remote`. [Successful Pages deployment](https://github.com/GreenKeewi/night-shift-taxi/actions/runs/38849121395).
- Local mirror browser pass: `/3d/` starts, plays, shows the 29,800-unit region and opens its map in Canvas fallback. Original 2D `/` starts and moves with Enter/W; no page errors. All original repository root file hashes match the pre-change snapshot.
- Moving browser highway sample: 6,500 → 9,095.6 world units, 118.0 km/h, highway layer throughout, zero collisions, four nearby cars at the final capture. See `highway-browser.json`.
- Public destinations: https://greenkeewi.github.io/taxi/ and https://greenkeewi.github.io/night-shift-taxi/3d/. Direct GET/HEAD attempts, including additional network permission, fail at the cloud proxy with `CONNECT tunnel failed, response 403` / `server: envoy`; the web fetch tool also cannot open either URL. Bypassing the proxy cannot resolve the host here. This blocks a direct live-browser load claim, not the confirmed pushes or successful GitHub deployments.
