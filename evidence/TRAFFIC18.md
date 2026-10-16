# Junction admission correction — checkpoint18

Unused junction reservations are rechecked against live receiving bodies and the player approach before entry. Cars already crossing retain ownership; stale/changed-destination/numeric saved owners are normalized. Stopped wrong-lane cars retry a safe merge before the stop line after the adjacent blocker clears.

Validation in cloud Node/Chromium:
-14/14 new deterministic120Hz regressions; baseline9f4a523 failed9 of the original10 cases. Every substep checks exact hull separation and movement continuity.
-11/11 existing traffic regressions.
-12/12 physical intercity taxi/bus journeys, zero collisions; full509/900 bus loops, fare handling and ramp save/restore.
-Keyboard pause/reload/Continue/map/quality/restart retained96 traffic identities; native focus, Space/Enter and arrow menu controls passed, zero JavaScript errors.
-224-car traffic update mean1.21ms/substep, p95 batch mean1.46ms on shared cloud machine. This is simulation CPU, not FPS or Chromebook validation.

Evidence: traffic18-regression.json, traffic18-legacy-regression.json, traffic18-profile.json, traffic18-physical.json, traffic18-save-browser.json, traffic18-resumed-map.png, traffic18-keyboard/.

The cloud proxy rejects direct public Pages navigation with ERR_TUNNEL_CONNECTION_FAILED. Git push and GitHub Actions deployment checks are available; a new public browser load cannot be claimed from this environment.
