# Highway and collision repair — highway-14

The repair starts from taxi `648d048f470e9cd144fd9860336f15c5ff67cd8d` and mirror `2de989bb6d893ceab5ae3aa00aec0fbd7fb0d4db`. The native Tab/Space/Enter menu and original-game-link fix is retained. Original 2D root files and the games hub are outside the change.

## What changed

- One shared road model now supplies curved deck geometry, ramp surfaces, collision support, visible guardrails and their contact volumes. The former independent full-length median collider is removed.
- The highway has **two express and two collector lanes per direction**, 3.6 m lane spacing, divided carriageways and marked transfer openings. City ramps join the outside collector lane. Traffic follows the same curves, changes lane within its carriageway, and crosses the express/collector separator only in an opening. GPS uses those openings too.
- Spadina is an actual signed Toronto ramp feeder. Its southward surface extension is removed where it would occupy the same low-clearance ascent. Other avenues retain their ground-level crossings beneath the viaduct.
- Ramp rails open wherever a same-level ramp or deck joins. Ascent, acceleration lane, taper and collector deck share their surface coordinates and height. No invisible rail collider remains across an opening.
- Support uses the four tyre contact locations, allowing a bumper to overhang a seam without a false collision. The centre cannot jump to a lower deck; edge loss restores the last supported pose. Ramp support history follows the same surface through steep bus axle contacts.
- Taxi collision uses the exact centred 4.4 × 2.2 m chamfered body outline that the vehicle mesh uses, rotated with the car. Static barriers use their visible oriented dimensions. There is no enlarged rectangle around the chamfered corners.
- Road-end turning pads are visibly wider for a bus, with open separators and visible end guardrails. Legacy saved highway/ramp placements migrate onto the revised geometry.

## Evidence and methods

`highway14-regression.cjs` samples all twelve ramps for taxi and bus, including tyre positions, visible rail intersections and eight lane centres through curved deck seams. It checks exact body-outline agreement, a 0.1-world-unit clear gap versus overlap, empty chamfer corners, legal express/collector transfers, and old save migration. A bus-wheel sweep measured a maximum local road-plane deviation of **0.722 world units (7.22 cm)** over the ramp curves.

`keyboard-ramps.cjs` uses **one declared start fixture per case**, then trusted browser W/A/D/Space input and the ordinary animation/physics loop across the complete approach, ramp and departure. It does not directly step physics or move the car during a case. Traffic is disabled for these ramp-isolation tests. `keyboard-ramps14.json` records all **24 passed cases** (12 taxi and 12 bus): every case reaches both height 0 and height 65, with zero collisions. Each approach/ramp/departure takes approximately 41–49 seconds.

`keyboard-highway14.cjs` uses one express-lane start fixture, then native keyboard input through curves and a legal transfer with **48-car normal traffic**. It reached **101.66 km/h**, held height **65 throughout**, and finished in the collector lane with **zero collisions**. The controller slows for the transfer; this is not a claim of a 100 km/h lane change.

`physical-regression.cjs` separately exercises all six directed intercity trips for both vehicles through the existing physics with digital inputs and isolated traffic. `terminal14-regression.cjs` exercises both end turnarounds for both vehicles (approximately 28–30 seconds each), with zero collisions. These are simulation-input regressions, distinct from the actual browser keyboard tests.

The normal fresh-title keyboard pickup also passed with **48 cars, 9.22 seconds, zero collisions and zero red-light fines**, with no starting placement or direct simulation control. Ground underpasses, vehicle following, debt, right-on-red and map containment pass in `physics-checks.cjs`.

The native Tab/Space/Enter regression is retained in `highway14-menu/keyboard-navigation.json`. The original-game link is activated by keyboard; its external load is blocked by the cloud proxy, not intercepted by the game.

The Canvas assembly metadata is also checked: all **11,064 road surface triangles** retain their correct classification after scenery assembly and chunking; **zero top faces** carry a deck-hiding flag. Maximum triangle-centre support sampling error is **0.122 world units (1.22 cm)**. The software renderer seals subpixel road-panel seams without changing physical geometry. See `mesh14.json`.

## Captures

Actual keyboard-driving captures:

- `spadina-taxi-keyboard14.png`
- `spadina-bus-keyboard14.png`
- `express-keyboard14.png`
- `collectors-keyboard14.png`
- `keyboard-pickup.png`

Controlled visual fixtures, explicitly not full-driving proof:

- `curved-express14.png`
- `spadina-opening14.png`
- `ground-underpass14.png`
- `curved-map14.png`
- `spadina-canvas-surface14.png` (Canvas surface review after classification fix)

## Performance and limits

Forced Canvas fallback, cloud Chromium, 1280 × 800, short samples: Toronto **30 FPS / 15.9 ms JS rendering**; freight highway **30 FPS / 9.4 ms**; wetland highway **30 FPS / 5.1 ms**. Geometry remains spatially chunked and culled. These are cloud measurements, not physical Chromebook validation; JS work timing excludes compositor waits.

The geography and highway layout are compressed and stylized. Test fixtures are labelled above. Direct public Pages loads have previously been blocked by the cloud Envoy proxy; deployment verification is recorded against the final remote SHA and GitHub Pages workflow, without claiming a blocked live browser load succeeded.

During development, a serial-key test controller oversteered into a visible rail. The final bus suite batches trusted key delivery and uses a controlled departure speed; the high-speed test slows for its lane transfer. Those runs isolate road defects from controller timing and do not imply collision immunity at arbitrary steering/speed.
