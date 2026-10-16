# Static collision lookup and bus recovery follow-up

This checkpoint follows the separately published resize correction: taxi `e4bc968ece0a5ca6d6b6d77dd597fb925d45ff76`, mirror `b7708fc6b9c4dc13ffbd84963914334198009b68`. Both Pages workflows succeeded (38964556253 / 38964605115). `RESIZE23.md` records real 2560/3840-pixel viewport and native L-toggle assertions: full quality restores 1280/1920 world pixels, while Low Power permits 896/1344.

## Change

`spatial.js` indexes immutable map rectangles in 128-world-unit cells, queries the complete rotated vehicle envelope, and bounds its candidate-list LRU to 256 entries per index. It preserves original obstacle ordering before the existing exact, height-aware SAT contact test. Highway traffic and player physics use this lookup; the player also avoids concatenating and scanning every static city obstacle on each physics step. No renderer, traffic-count, steering, highway geometry, or GPS-planning change is included.

The whole-body query fixes a genuine omission in the previous 400-unit, center-only highway bins: a bus front could touch a visible separator in the adjacent bin while the old lookup returned no contact. The deterministic case is in `spatial24-regression.json`; the exploratory 6000-pose legacy comparison is retained in `spatial24-legacy-coverage.json` (4 missed contacts, 73 different first identities, including overlapping continuous rail segments). Consequently, globally identical collision outcomes to the old incomplete lookup are not claimed. Physical hulls and exact contact rules are unchanged.

## Verification

- 32,000 varied taxi/bus poses compared candidate contacts with every highway/static rectangle using the exact contact function: pass. Original ordering, array replacement/length changes, explicit geometry invalidation, cache bound, and adjacent-bin bus contact: pass.
- Eight 15-second, 120 Hz Normal/Gridlock taxi/bus scenarios over two seeds: all 120 full snapshot comparisons exactly match Canvas22. These are simulation tests, not browser driving.
- Shared highway opening, wheel support, lane seam, transfer, and legacy save migration checks pass. Exact SAT comparison covers 100,000 vehicle pairs and 100,000 obstacles. GPS regression covers 10 reported-pose routes, 172 reroutes, and 56 whole-highway sweeps; all pass.
- Fourteen junction ownership, wrong-lane queue recovery, and receiving-lane blockage regressions: pass.
- Fifteen full-quality views, each world/mirror and cockpit layer, are pixel-identical to Canvas22. All three Low Power tiers also match exactly. Protected road/barrier/bridge/dynamic-face audit, 180-view cache bound, and adaptive degrade/recover/deferred resize checks pass.
- Native taxi and mirrored rush-hour bus 900 menus, Q/E/C look, L quality, M audio, map pause, saved Continue, restart, and original 2D root: pass with no page errors. Fresh-title pickup uses only keyboard events and normal animation: one pickup, zero collisions/red lights, 96 traffic vehicles.

## Bus recovery diagnosis

The original `gps22-failed-bus64.json` remains unchanged. A new baseline run with critical screenshot capture disabled still failed at station 5412 with lateral position about 99.4. Screenshot capture alone therefore does not explain the failure. That reactive test controller starts the lateral move too late for the long bus at its initial speed; this does not establish an infeasible road opening or a steering defect.

`bus23-feasibility.json` isolates the maneuver at 120 Hz with traffic removed solely for diagnosis, maintaining 64.8 km/h: early right-steering pulses of 0.16–0.50 seconds clear the rail; 0.12 seconds fails. This is a physics feasibility experiment, not a live-traffic result.

`keyboard-bus24-traffic-final-native65.json` records the stronger browser check: one initial pose, native steering/throttle keys, a roughly 0.24-simulation-second early steering pulse, normal animation, 96 cars, and an unchanged live director. Both directions complete the recovery without collisions. The quiet-run early-control speed ranges are 64.24–65.38 km/h east and 64.54–65.31 km/h west; the controller regulates about 65 km/h rather than claiming an exact constant speed. Final-source fingerprints are embedded. The contention run is separately retained and exercises the final 600- and 460-pixel adaptive tiers.

## Westbound provenance correction

The previous westbound GPS22 evidence showing level 1 at 640 pixels came from the intermediate 800/640/520 calibration, not the final Canvas22 800/600/460 policy. It supports the earlier maneuver only. `keyboard-gps24-traffic-final-renderer128-quiet.json` reruns westbound recovery against the final Spatial24 source: 96 live cars, native keys, zero collisions, and matching SHA256 fingerprints for game/software/engine/highway/spatial. Every sample asserts that the actual width is exactly 800/600/460 for its adaptive level. A concurrent-browser attempt failed with the reactive controller and is preserved as `gps24-failed-final-renderer128.json`; it is not hidden or counted as a pass.

## Actual driving performance

Cloud Chromium, Canvas renderer, 1100×720 viewport, normal 96 cars and live traffic director. A single initial pose/destination setup is followed by native pedals and normal animation through a roughly 160 m near-straight highway segment at about 50 km/h. The segment has no ramps or intersections; this benchmark is not end-to-end intercity navigation. Measurements wrap the complete animation callback, including simulation, director, HUD, rendering, and adaptive policy. Both sources retain the same traffic count and final resolution. The baseline is the archived `4be6845` Canvas22 commit; its resize regression makes no difference at this viewport.

| Run | Before FPS | After FPS | Before / after callback p95 | Before / after simulation ms per step |
| --- | ---: | ---: | ---: | ---: |
| 1× CPU, profiled | 29.65 | 29.24 | 10.3 / 10.9 ms | 0.987 / 0.784 |
| 4× CPU, profiled, before first | 7.57 | 7.71 | 140.2 / 183.3 ms | 3.722 / 3.271 |
| 4× CPU, unprofiled, after first | 8.06 | 10.43 | 174.6 / 105.7 ms | 3.714 / 2.679 |

Normal-speed results remain near the 30 FPS cap. Throttled full-frame gains vary from about 2% to 29%; the profiled tail worsened. No universal smoothness or low-end-device guarantee follows. Simulation cost per step fell in both paired 4× runs. Final mean candidate counts in the actual profiled drive are about 10.2 highway rectangles out of 6900 and 0.1 static rectangles out of 357; highway cache hits exceed 97%, with 256 cached queries maximum.

The real-driving CPU profile identified highway obstacle scans as material work. Their large anonymous `.some(buildingHit)` frame disappears after indexing; remaining dominant named work is `updateTraffic`, `stepPhysics`, traffic sensing/reset, and Canvas scene/draw. Raw profiles and both complete results are retained alongside `spatial24-performance-summary.json`, including the weaker result. CPU throttling in cloud Chromium is not physical Chromebook validation. At 4× this remains roughly 8–10 FPS, below a satisfactory driving target.

## Deployment and limitations

Publish the same committed tree to the existing taxi Pages site and `night-shift-taxi/3d/`. Preserve the original 2D root and unrelated bio/flight/subway/hub repositories. Verify exact remote heads and successful Pages workflows after publishing. Fresh public Pages browser requests from this environment have been blocked by its CONNECT proxy; successful local browser tests and GitHub deployment workflows do not prove a fresh public browser load. The final delivery records the exact publication status and any remaining network blocker.

The native WebGL/SwiftShader keyboard-navigation regression also passes; activation of the original-game link encounters the same external proxy block. This validates keyboard activation, not a public-page load.

To reproduce the comparisons, archive commit `4be684510757463e5f7fe2805e15d3583227ca61` into `/workspace/taxi-canvas22-baseline`, serve that directory on 8151, and serve this checkout on 8150. The test scripts use the installed cloud Chromium and Playwright.

Screenshots include `bus24-east-complete.png`, `bus24-west-complete.png`, `gps24-taxi-west-interrupted-traffic.png`, `spatial24-final-taxi-map.png`, `spatial24-final-mirror-bus-map.png`, `spatial24-low-tier1-highway.png`, and the before/after actual-driving captures. Raw failures remain available.
