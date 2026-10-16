# Traffic, highway GPS and Canvas corrections

Published in separate coherent checkpoints to taxi and night-shift-taxi/3d. The original 2D root remains byte-identical across its seven original tracked files. The existing stylized Toronto–Pickering–Oshawa corridor retains 128 junctions, 109 bays, 12 ramps, connected collector/express highways, lane-aware GPS and both bus services. No exact real-street geography or physical Chromebook validation is claimed.

## Checkpoints

- Junction admission: taxi 8f5539a2e0e5b2e6f236d91b57488d04f7a78826 / mirror b7705ec672234af1747013ea253a3c4777cc61f2. [Traffic evidence](TRAFFIC18.md).
- Interrupted transfer GPS: taxi 2161c781faf53f8ab48c4dfdcfdca2a377137b80 / mirror b4a3139c7ea786d6d614b47d6336ee5b4d4952b4. [Highway evidence](GPS20.md).
- Canvas caching: exact unchanged world buffers, conservative vehicle frustum bounds and bounded 128-entry projection LRUs per main/mirror view. Changing cameras avoid cache-copy work. [Pixel and performance evidence](canvas19-report.md).

## Final verification

- 14 new junction regressions and 11 existing traffic cases pass. Wrong-lane hold 185 resumes after the adjacent taxi/bus clears. Live receiving-space changes revoke unused admissions; blocked approaches and stale/numeric owners release properly; active crossings retain ownership.
- 12 continuous taxi/bus city-pair drives pass with zero collisions; 509 and 900 complete full stop loops; fares and ramp saves pass.
- 172 original highway reroutes, 56 full-highway sweeps and six interrupted recovery/save poses pass. Four actual keyboard drives recover critical east 5300/+98 and west 4400/-98 positions with zero collisions; half-second GPS refresh remains active.
- 15 exact Canvas pixel comparisons pass for both world/mirror and cockpit layers, including look directions, LOD changes, brakes, color, deck, ramp, underpass and resize. 180 views × 3 warm frames fill the bounded 256-entry cache with actual hits; final projected arrays use 2,527,744 bytes.
-Six natural traffic runs: two seeds×Normal 96 / High 160 / Gridlock 224 cars × 60 simulated seconds, 120 Hz, no director or rendering. One-second exact AI hull audits find no overlaps. 421–906 junction crossings per run. Queues remain physical; the longest wait in the stationary-player Gridlock fixture persisted for the whole 60-second observation.
-Final normal-traffic keyboard pickup: 96 cars, 9.08 simulated seconds, one pickup, zero collisions/red violations/errors. No state placement, manual simulation stepping or traffic removal.
-Final native keyboard taxi and mirrored900 bus flows pass: vehicle/service, 6 PM time selection, High traffic, Q/E/C look, quality, audio, paused map, save/reload/Continue/restart. Original 2D root returns200, renders and reports no page errors. WebGL native menu/focus/link activation passes; the external link request is emitted but its public destination is proxy-blocked.

Raw supporting files: final-congestion.json, final-corrections-browser.json, final-pickup.json, final-webgl/, final-*.png, and the checkpoint-specific reports/scripts. The native bus smoke starts at 6 PM with High traffic and 200 cars because rush-hour demand applies.

## Performance and limits

Final moving-camera Canvas measurements on shared cloud Chromium: 22.76→24.45 FPS at 1× CPU and 3.04→3.72 FPS at synthetic 4× CPU throttling. Vehicle upload time per frame falls about 40–47%. Two stationary 4× repeats improve; an earlier slower 4× sample remains in the report and raw data. Synthetic4× remains too slow for comfortable play. These are cloud measurements, not a device guarantee.

Public targets: https://greenkeewi.github.io/taxi/ and https://greenkeewi.github.io/night-shift-taxi/3d/. Git pushes and exact-SHA GitHub Actions Pages deployments can be verified. Fresh public browser/curl loads are blocked by the cloud Envoy proxy with CONNECT 403 / ERR_TUNNEL_CONNECTION_FAILED, so a fresh public browser load cannot be asserted.
