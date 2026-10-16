# Canvas22: adaptive rendering and compact traffic sensing

Baseline: taxi `bdec24491d91713fb07d41d697aa5ddd4a65c84a`, mirror `ae7392f59ea7c931f48bd12565ae52051eda9e3e`. Work and verification were performed entirely in the cloud.

## Changes and preserved behavior

The moving-camera CPU profile showed polygon painting/fills as the largest rendering cost, alongside traffic sensing and repeated full-car object copies. Low Power now adjusts world resolution, optional facade detail and view distance from smoothed full-frame work and frame spacing. It steps quality back up after sustained headroom. Resizing is deferred until the next paint, preserving the last complete road image during a change.

At the tested 1100×720 CSS viewport, world widths are 800 / 600 / 460 pixels. The cockpit, map, labels and menus retain their native overlay resolution. Main view distances are 160 / 140 / 120 metres, mirror distances 85 / 75 / 65 metres, and optional facade bands/mullions and tiny decoration are omitted beyond 85 / 55 / 34 metres. The shorter view gets stronger atmospheric fog. A 35% minimum viewport scale also applies on larger windows. Full quality retains the original view/detail behavior; L still toggles quality with the keyboard.

Roads, ramp decks, bridge structure, barriers, ground driving surfaces and dynamic vehicles are protected from optional-detail removal. Large building volumes/glazing remain. The region, route graph, road geometry, physical hulls, speed/steering models, traffic presets and 120Hz simulation remain. Traffic sensing and collision guards now copy only the fields they actually read into reusable/compact records, avoiding full route/style/state copies. No cars or queues are removed to obtain the performance result.

## Comparable full-frame measurements

Shared cloud Chromium, forced Canvas2D, 1100×720 viewport. 4× is synthetic CPU throttling, not a physical Chromebook. FPS is rendered scenes per measured wall time; callback p95 includes the full RAF callback and simulation, rather than traffic CPU alone.

| Scenario | Before FPS | After FPS | Full callback p95 before → after |
|---|---:|---:|---:|
| Controlled head yaw, 1× | 25.32 | 29.13 | 28.7 → 19.8 ms |
| Controlled head yaw, 4× | 3.86 | 5.70 | 206.0 → 178.4 ms |
| Actual highway cruise, 1× | 29.67 | 29.78 | 10.4 → 11.2 ms |
| Actual highway cruise, 4× | 4.60 | 6.97 | 250.2 → 177.5 ms |

The controlled case retains the same 64 cars, including 32 initial queued cars behind eight stopped leaders. The player is stationary, head yaw changes sinusoidally, and the director is paused by an explicit test wrapper. This case is not described as actual driving. Source SHA-256 hashes and raw profile data are recorded in `canvas22-browser-release-profile.json`.

The actual case uses native pedal events to drive about 160m along the same naturally near-straight highway segment, with 96 cars and the unmodified traffic director running. After one pose/destination setup, there is no placement, manual stepping, traffic removal or altered simulation calls; timing wrappers invoke the original methods. The initial heading follows the segment's tangent; no intersection or exit occurs inside the measurement. The director refreshes traffic during each run. Every completed measured cruise has zero collisions and page errors. Actual end distance varies slightly because observations occur after complete frames. Raw data: `canvas22-driving-release-cruise.json`.

Normal-CPU highway cruising was already near the 30FPS low-power cap. Its p95 rose slightly in the final pair; this is retained in the table. Results vary on the shared machine. Earlier calibration data and the rejected batching experiment are retained outside the repository in `/workspace/canvas22-exploratory`; some calibration captures also remain alongside the release artifacts. Only the explicitly named release tables are used for the conclusions.

## Verification

- 15 exact full-quality pixel comparisons, at matching world resolution, pass for both world/mirror and cockpit layers: look directions, brakes, color, vehicle LOD boundaries, underpass, deck, ramp, resize and return view. Rendering leaves physical state unchanged.
- Protected-road/dynamic-face audit finds zero protected faces marked optional. The bounded projection cache still fills to 256 entries and records real hits. All three low-power tiers retain native overlay width. Synthetic policy checks cover degradation, recovery, disabling and deferred resizing.
- 120 exact full saved-state comparisons across two seeds × Normal/Gridlock × taxi/bus, 15 seconds each at 120Hz, match the independently loaded published engine. Gridlock still contains 224 cars. All 14 junction regressions pass.
- Native taxi and mirrored 900-bus flows cover time/traffic/service settings, Q/E/C, quality, audio, map, save/reload/Continue/restart. Fresh keyboard pickup and WebGL menu/focus checks are recorded separately. The original 2D root is checked locally and its seven original source hashes are preserved.

Raw validation: `canvas22-regression.json`, `canvas22-physics.json`, `canvas22-junction-regression.json`, `canvas22-smoke.json`, `canvas22-pickup.json`, `canvas22-webgl/`. Screenshots include before/after driving and controlled scenes, full-quality underpass/ramp parity, each low-power highway tier, the ordinary pickup and the preserved 2D root.

## Live-traffic highway recovery and limits

Separate 1× keyboard tests retain all 96 Normal cars and the live director. Taxi recovery passes eastbound at a measured maximum 75.7km/h and westbound at 65.3km/h, with zero collisions. Bus recovery passes both directions near 50km/h after starting at rest. These cases use the normal animation loop and half-second GPS refresh after one initial pose/destination setup.

A bus attempt starting/cruising at 64.8km/h hit the closing separator near station5411. Reactive steering controllers also collided in the published baseline under 4× throttling before the near-straight cruise method was selected. Failed attempts and method changes are retained in `gps22-attempts.json`, `gps22-failed-bus64.json` and `canvas22-driving-attempts.json`. This pass does not establish reliable high-speed bus recovery or complex turning under 4× throttling. GPS geometry and steering physics were not changed by this performance pass.

The final throttled city case remains around 5.7FPS and the final highway cruise around 7FPS. Those rates remain too low for comfortable play on an equivalently constrained device. No physical Chromebook validation or 30FPS guarantee is claimed. Full-quality pixels are identical in the tested scenes; low-power pixels intentionally trade distant decoration, resolution and horizon for speed.

Targets remain https://greenkeewi.github.io/taxi/ and https://greenkeewi.github.io/night-shift-taxi/3d/. Final remote SHAs, deployment runs, mirror/source hashes and any public-load blocker are recorded in `/workspace/taxi-canvas22-delivery.json`.

Selected captures: [actual cruise after,4×](canvas22-cruise-release-after-4x.png), [actual cruise before,4×](canvas22-cruise-release-before-4x.png), [lowest-power highway view](canvas22-low-tier2-highway.png), [full-quality underpass](canvas22-after-parity-underpass.png), [ordinary pickup](canvas22-pickup.png).
