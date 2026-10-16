# GPS-15: continuous highway transfers

The expanded stylized Toronto–Pickering–Oshawa map now keeps express-to-collector transfers inside a single connected separator opening and preserves their progress during the half-second GPS refresh. Road geometry, physical vehicle hulls, deck support, steering, traffic physics, and the original 2D edition remain unchanged.

## Fix and reproduction

- The previous release checked only two opening endpoints. At station 3600 / lateral 58, its taxi body contacted the closed separator at station 3863.84, before the centre line crossed it. At 4760 / 85.78, a fresh route held that lateral position and contacted the next separator at 5428.01. [Measured previous-release reproduction](gps15-before.json).
- The planner merges overlapping openings and requires the complete 1000-unit transfer plus a vehicle-sized margin to fit one opening. For the eastbound 3600 case it waits for the 4250–5450 opening; the taxi starts near 4279 and the longer bus near 4297.
- A conservative continuous swept-body envelope checks actual barrier boxes throughout the transfer, including adjacent spatial bins. This planning envelope does not enlarge the physical collision hull.
- GPS refreshes retain the transfer start and progress. Missing state is reconstructed from the smooth transfer curve, including after crossing lateral 88. Small steering errors receive a smooth, clearance-checked correction. Saved shifts retain the active plan.
- Exit selection requires a reachable collector approach. Short remaining distances do not force a jump to lateral 152. Terminal recovery starts from the lane actually reached, and small post-transfer lane errors correct promptly.

## Final validation

- [Geometry / repeated reroutes](gps15-regression.json): both reported poses, taxi and bus, both directions; **172 repeated refreshes**, including saved transfer state and reconstruction; **56 whole-highway body sweeps** with zero barrier contacts. Includes a six-unit steering-offset correction and insufficient-distance rejection.
- [Real keyboard driving](keyboard-gps15.json): **8 cases**, taxi/bus × east/west × closed-gap/reconstruction. One declared initial pose per case, isolated traffic, trusted keyboard events thereafter, normal Canvas rendering and the actual half-second UI GPS refresh. Every case retained one transfer plan, reached collectors beyond the separator, and recorded **zero collisions / browser errors**. The controller drove about 47 km/h for taxis and 42 km/h for buses; these are transfer tests, not maximum-speed claims.
- [Normal traffic keyboard run](keyboard-gps15-traffic.json): 48 cars, live GPS, zero collisions; [fresh keyboard-only pickup](keyboard-pickup15.json): one pickup, zero collisions / red-light fines. No placement fixture was used in the fresh pickup run.
- [Physical intercity regression](physical-gps15.json): all **12** ordered city-to-city taxi/bus drives passed with zero collisions; both 509 and 900 boarding/alighting loops and controlled fare/save states passed. These are Node simulations, not browser key drives.
- [Terminal recovery](terminal-gps15.json): **16** taxi/bus × east/west × four starting lanes passed with zero collisions in Node simulation.
- [Keyboard save flow](saved-gps15.json): pause/save → reload → Continue saved shift retained the same transfer start; Tab map and keyboard restart passed.
- [Native menu regression](keyboard-navigation15.json): Tab / Shift+Tab / Space / Enter, pause/resume, map, arrow selection and original 2D link activation passed. The external link request was observed; its destination load was proxy-blocked.
- Existing highway-14 exact-hull, all-ramp wheel-support, eight-lane seams, legacy-save migration, road-mesh surface checks and regional taxi/bus route continuity pass.

## Performance and limitations

The 172-call cloud Node route sample measured median **2.35 ms**, p95 **3.40 ms**, maximum **6.15 ms**. [Cloud Canvas scene samples](scene-performance15.json) record frame times, submitted vertices and visible chunks; the renderer still culls against 1932 chunks. These are short cloud Chromium samples, not physical Chromebook validation. The map remains deliberately stylized, not an exact reproduction of real streets.

The eight GPS keyboard cases isolate navigation from traffic; the separate 48-car case exercises normal traffic. These runs do not establish collision freedom for every driving input or traffic arrangement. Prior highway-14 maximum-speed evidence remains separate.

Git pushes and GitHub deployment status can be verified here. Direct GET/HEAD or browser navigation to both public Pages links is blocked by this cloud environment's Envoy CONNECT proxy (403 / ERR_TUNNEL_CONNECTION_FAILED), so a fresh public-page load cannot be claimed.

## Screenshots

All driving screenshots below came from the actual keyboard cases after their one initial pose; the saved map capture uses a declared saved-state fixture.

- [Taxi eastbound transfer](gps15-taxi-east-closed-gap.png)
- [Taxi westbound transfer](gps15-taxi-west-closed-gap.png)
- [Bus eastbound transfer](gps15-bus-east-closed-gap.png)
- [Bus westbound transfer](gps15-bus-west-closed-gap.png)
- [Normal-traffic transfer](gps15-taxi-east-closed-gap-traffic.png)
- [Saved-transfer regional map](gps15-resumed-map.png)
- [Fresh keyboard-only pickup](keyboard-pickup15.png)
