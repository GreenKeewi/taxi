# Interrupted highway transfer recovery

An unplanned interruption near station5300/lateral98 could leave GPS following the separator into its closed section. When the original1000-unit transfer cannot be reconstructed, GPS now finds a swept-body-clear remaining crossing to the inner collector before settling into the outer collector. The physical road, rails, collision hull, steering and speed model remain unchanged. Recovery metadata survives saved shifts and repeated route refreshes. These are stylized game coordinates, not real street geometry.

Cloud verification:
-Previous code: four critical taxi/bus east/west paths fail whole-body clearance; new paths all pass (gps20-before-after.json).
-172 original reroutes and56 full-highway opening/lane/body sweeps pass, plus six interrupted recovery/save poses and258 recovery refreshes (gps20-regression.json).
-Four real-keyboard Canvas drives after one initial placement: taxi/bus east at5300/+98 and west at4400/-98. Normal animation, half-second GPS refresh, zero collisions, body height65, final outer-collector lateral within5units. Live route deviations may require a later safe recovery plan; exact plan-start invariance is only asserted for deterministic on-route reroutes. Runs15–17 simulated seconds; keyboard-gps20.json and gps20-*.png.
-Junction18 regressions remain14/14 passing.

No physical Chromebook validation. Direct public Pages browsing remains blocked by the cloud proxy (CONNECT403 / ERR_TUNNEL_CONNECTION_FAILED); deployment verification uses exact Git commits and GitHub Actions.
