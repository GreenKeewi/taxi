# Canvas19 renderer cache validation

The Canvas renderer reuses exact world-space vehicle buffers when pose, road-layer history, color, level of detail and brake-light state agree. Vehicle bounds reject groups outside the existing view frustum. Unchanged static geometry can reuse projected faces after an identical camera view repeats. A continuously changing camera projects directly, avoiding projection-cache copy work.

Painter ordering, clipping, fog, road/deck occlusion, mirror geometry and the WebGL path retain their existing behavior. Physics and traffic are unchanged. Projection caches have 128 LRU entries per view, reuse typed arrays, and flush on a new city or renderer disposal.

## Exact-output checks

`node canvas19-regression.cjs` compares the archived junction18 renderer with the changed renderer using frozen animation frames and identical junction18 engine/highway/road scripts. Fifteen scenes compare every pixel channel in the world/mirror canvas and cockpit overlay: front, both side looks, rear, brake lights, color, both LOD boundaries, underpass, deck, ramp, resize, and return to the original view. The third identical frame exercises cache hits. Every scene checks that rendering leaves vehicle state unchanged.

The 180-view traversal warms three frames per view and requires actual cache hits and a full 256-entry LRU; final projected arrays occupy 2,527,744 bytes. Raw results and memory measurements are in `canvas19-regression.json`; matching front/underpass/ramp screenshots are retained.

## Paired browser measurements

`canvas19-browser.cjs` runs the same 64-car fixture with 32 queued vehicles behind eight stopped leaders. It retains the cars and pauses the director through a test-only network wrapper. Both releases load the same archived junction18 physics/road code. Measurements include complete RAF callbacks, traffic CPU time, main and mirror rendering, and total upload time per rendered frame. The moving-camera case changes head direction sinusoidally with simulation time.

| Case | Before FPS | After FPS | Before callback p95 | After callback p95 | Upload/frame before → after |
|---|---:|---:|---:|---:|---:|
| Initial stationary, 1× | 26.00 | 28.50 | 27.0 ms | 24.6 ms | 1.81 → 1.06 ms |
| Initial stationary, 4× | 3.55 | 3.21 | 247.2 ms | 373.8 ms | 8.88 → 5.57 ms |
| Stationary repeat A, 4× | 3.27 | 4.29 | 270.5 ms | 190.2 ms | 8.78 → 4.61 ms |
| Stationary repeat B, reverse order, 4× | 3.82 | 4.25 | 213.1 ms | 202.0 ms | 8.32 → 4.82 ms |
| Final changing camera, 1× | 22.76 | 24.45 | 38.7 ms | 31.8 ms | 1.96 → 1.09 ms |
| Final changing camera, 4× | 3.04 | 3.72 | 489.4 ms | 231.4 ms | 8.87 → 5.28 ms |

The initial paired eight-sample run is retained intact in `canvas19-browser-paired-profile.json`, including the stationary 4× regression. It preceded the stable-view cache-population gate. The two stationary repeats and final changing-camera pairs use that gate and have separate raw files. All samples retain 64 vehicles, have no JavaScript errors and report zero player collisions. Live traffic and frame timing cause the exact stopped count and final view to vary slightly between samples.

Upload work per rendered frame consistently fell. The repeated measurements show a modest overall benefit, with substantial variability under 4× throttling. These measurements use cloud Chromium with Canvas2D on a shared machine. They do not establish physical Chromebook performance or a 30 FPS guarantee.

## Reproduction and scope

Archive taxi commit 8f5539a2e0e5b2e6f236d91b57488d04f7a78826 into /workspace/taxi-junction18-baseline. Serve that tree at port 8131 and the changed tree at port 8130. Run `node canvas19-regression.cjs` and `node canvas19-browser.cjs`. `CANVAS19_RATES`, `CANVAS19_CAMERAS`, `CANVAS19_RELEASES` and `CANVAS19_TAG` select isolated/reversed repeats and separate result names. The shared fixture is `canvas19-fixture.cjs`.

Only `game.js` and `software.js` contain runtime changes. Exploratory CPU profiles and early single-release measurements are preserved outside the repository at `/workspace/canvas19-exploratory`. Final publishing and regression evidence is recorded in FINAL-CORRECTIONS.md.

Runtime SHA-256 hashes: game.js `7d910ec71d3045ae022e2c8a83d054427ee9d8e30bdfbbdc941dbe9e836143d3`; software.js `d3cf98a13d7cc8abe455bede02061638107b77dd11adfe1cf8d62f918834f305`.
