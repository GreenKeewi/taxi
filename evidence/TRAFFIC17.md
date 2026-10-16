# Traffic-17: persistent queues and indexed vehicle decisions

Traffic now forms and retains physical queues. A blocked receiving lane holds upstream cars before the crossing, and following traffic carries that blockage back through preceding junctions. Clearing the obstruction lets the queue drain. Normal / High / Gridlock use increasing demand rather than a preset-wide speed penalty.

## Runtime changes

- One shared preset configuration sets initial / maximum regional populations: Light **24 / 32**, Normal **96 / 120**, High **160 / 200**, Gridlock **224 / 280**. Time of day increases demand; High retains the `rush` identifier for existing saves. Nearby-demand targets are bounded independently of the world size.
- Removed the 40-second stopped-car reset. The director can recycle only distant, hidden, moving, unconstrained cars; queue members, nearby queue leaders, turns, merges and reservations stay in place. Resume skips initial redistribution and preserves queued IDs.
- Immutable per-step sensing uses reused numeric spatial buckets, directed edge/lane groups, and sorted highway station groups. Following and receiving-space checks use those groups; highway queries use binary station ranges. Stable wait-age / ID ordering removes traffic-array-order dependence.
- Junctions reserve individual movements. Cached conservative swept movement paths admit compatible parallel/opposing movements and exclude conflicting ones. Receiving capacity includes the complete rotated taxi or bus body. Exact final NPC hull checks prevent unsafe movement into another car.
- Physical collision hulls remain the published chamfered outlines. Cheap conservative broad rejection, cached pose polygons and cached static-obstacle proxies avoid repeated work. No rendering geometry or vehicle population was removed for the paired performance test.
- Empty ground-node candidate pools in the greenbelts are handled safely. Start/Continue/Resume reset timing; callback-time sampling avoids counting a delayed scene rebuild as driving. Runtime timing includes simulation and total callbacks, while `frameMs` continues to describe draw work only.

## Correctness and gameplay

- [11 deterministic scenarios](traffic17-regression.json): red platoon stops/drains; 46-second spillback remains without relocation and drains after release; compatible four-lane crossing; conflicting turns; taxi/bus and transverse-bus receiving blockers; removed-car index cleanup; ground/deck separation; queue save/restore; reversed traffic-array order. Fixtures assert body separation throughout their simulated runs.
- [200,000 collision equivalence cases](collision17.json): 100,000 rotated car pairs and 100,000 oriented obstacles exactly match a frozen copy of the published `7508658` SAT, including reused mutable objects to test cache invalidation.
- [Two seeds × three presets × 60 simulated seconds](traffic17-congestion.json): fixed real vehicle populations and real signals, no director/render; every preset retains traffic and continues processing junction crossings. One-second exact-hull audits found no AI overlaps. Seed 8427 peak queue counts: Normal **53**, High **87**, Gridlock **123**; seed 1729: **48 / 80 / 120**. This is an engine workload, not browser driving or an all-input guarantee.
- [Fresh keyboard-only pickup](traffic17-keyboard-pickup.json): **96 normal cars**, one pickup, zero collisions, zero red-light fines and no browser errors. The first pickup approach remains playable.
- [Live-GPS keyboard cases](traffic17-gps-bus.json) and [normal-traffic transfer](traffic17-gps-normal.json): westbound bus reconstruction and eastbound taxi transfer passed with stable plans and zero collisions. The taxi case retained 96 normal cars. Each transfer test declares one initial pose; subsequent motion uses trusted keyboard events and the normal animation loop.
- [GPS geometry regression](traffic17-gps-regression.json): both original reported poses / both directions / both body sizes, 172 repeated reroutes and 56 whole-highway sweeps pass. The residual manual-transfer recovery task remains queued; this release does not claim to solve it.
- [12 simulated intercity journeys and both bus loops](traffic17-physical.json) pass, including controlled fare, passenger and saved-state checks. Existing highway-14 support/seam/hull/migration, regional layer continuity and road mesh checks pass.
- [Native keyboard regression](traffic17-navigation.json): menu Tab/Shift+Tab/Space/Enter, start, pause/resume, map and original-2D link activation pass. The public destination itself is proxy-blocked.
- [Greenbelt and keyboard save flow](traffic17-save-browser.json): the real director runs in a ground-node-free highway sector without error. All **96** IDs survive pause/reload/Continue; resumed movement is bounded by actual elapsed simulation time (0.083 s), with no redistribution. Map, quality toggle and restart pass.

## Full-callback cloud performance

The paired test serves the previous street-label checkpoint and current runtime to cloud Chromium at 1100×720 with forced Canvas. Both use the same 64 cars, including 32 queued behind stopped lane leaders; an explicit test-only HTTP wrapper pauses the density director. All 64 are retained, traffic still updates at about 120 Hz, and both submit the same 40 nearby chunks / 105135 static vertices. This isolates traffic/runtime work; it is not an ordinary uncontrolled drive. [Full results and methods](traffic17-browser-profile.json).

| Synthetic CPU rate | Previous → current FPS | Full callback p95 | Draw-gap p95 | Traffic CPU during sample |
|---|---:|---:|---:|---:|
| 1× | 25.67 → 27.33 | 30.4 → 25.8 ms | 50.2 → 41.1 ms | 431 / 4.52s → 316 / 4.54s |
| 4× | 3.34 → 4.02 | 296.6 → 213.7 ms | 366.2 → 296.4 ms | 2439 / 6.58s → 1847 / 6.71s |

The primary callback measurement wraps the complete RAF callback, including simulation. It does not substitute draw-only `frameMs` for total CPU work. Measurements vary on a shared cloud machine; these are short samples, not physical Chromebook validation.

Unmodified UI [preset samples](traffic17-presets.json), without traffic replacement or director interception:

| Preset | Cars | Unthrottled Canvas FPS | Synthetic 4× FPS |
|---|---:|---:|---:|
| Normal | 96 | 28.33 | 4.14 |
| High | 160 | 27.87 | 2.96 |
| Gridlock | 224 | 25.25 | 1.64 |

**Remaining performance limit:** the synthetic 4× runs remain slow, especially Gridlock. The extra population has a real CPU cost. Canvas main-view, mirror and dynamic-upload work remain substantial. This release improves the equal-population traffic case; it does not establish a low-end-device FPS guarantee or claim the larger presets are free. Existing spatial mesh culling remains enabled; the whole regional map is not drawn each frame.

Engine-only [120 Hz benchmark](traffic17-profile.json), five-second warm-up plus thirty measured one-second batches (p95 is a batch mean, not a per-call/frame p95):

| Cars | Mean/update | p95 batch mean |
|---:|---:|---:|
| 48 | 0.182 ms | 0.225 ms |
| 96 | 0.573 ms | 0.745 ms |
| 160 | 0.872 ms | 1.081 ms |
| 224 | 1.187 ms | 1.423 ms |

## Screenshots

- [Normal](traffic17-normal-1x.png), [High](traffic17-rush-1x.png), [Gridlock](traffic17-gridlock-1x.png) — fresh title/UI settings, no placement.
- [Retained-queue performance view](traffic17-after-1x.png) — declared 64-car bottleneck fixture.
- [96-car keyboard pickup](traffic17-keyboard-pickup.png).
- [Bus GPS](traffic17-gps-bus-west.png), [normal-traffic taxi GPS](traffic17-gps-normal.png).
- [Saved regional map](traffic17-resumed-map.png).

## Publication boundary

Only the taxi repository and the mirror’s `3d/` directory are updated. The original seven 2D root files are hash-checked unchanged; the unrelated bio, firetruck, hub and other game repositories are untouched. Exact pushed SHAs and Pages Actions outcomes are supplied in the delivery record. Direct public Pages loads remain denied by this cloud environment’s Envoy CONNECT proxy (403); successful Actions deployments do not prove a fresh public browser load.
