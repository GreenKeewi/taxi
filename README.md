# Toronto Taxi · Driver's Seat

The low-poly 3D edition of Toronto Taxi, published at https://greenkeewi.github.io/taxi/ . The original 2D edition remains at https://greenkeewi.github.io/night-shift-taxi/ . Open this directory through any static web server; there is no build step, backend, CDN dependency, texture download, framework, or sign-in.

## Controls
- Enter starts or confirms. Arrow keys / W S select menus.
- WASD / arrows drive. S / down brakes, then reverses. Space brakes.
- Hold Shift with the pedals for precision parking: approximately 30 forward / 20 reverse.
- Q / E glance left / right. Hold C to look behind. The rearview mirror is a live, horizontally mirrored rear view.
- Tab opens a paused dispatch map. Esc / P pauses; H opens the handbook.
- R calls roadside assistance ($15, 10 seconds, 5 condition). L toggles low-power rendering; M toggles engine sound.

## Design
An interpolated, stable driver-eye camera follows the cab. The dashboard, steering wheel, hands and forearms are drawn as a lightweight faceted cockpit overlay; the wheel and both grips rotate with steering input. No artificial camera shake or bob is applied. The world and moving cars use real perspective-projected 3D geometry.

Seeded Toronto-inspired streets include two lanes each direction, traffic signals, parking bays, an expressway with merge traffic, a waterfront and recognizable CN Tower, Rogers Centre and aquarium shapes. This is a compact fictional layout, not a geographic street map.

The simulation is shared with the 2D game, without changing that engine. First-person fare timers are more generous. Follow the blue lane to a pickup and amber lane to delivery. Match the bay arrow, center the cab and stop; reverse bays require real backward movement. Fares, deadlines and rush-hour traffic continue through an endless shift. Three missed calls or zero cab condition ends the run.

## Rendering and compatibility
WebGL 1 is the primary renderer. If unavailable, a Canvas2D software renderer uses the same 3D city mesh, perspective, clipping and mirrored camera, automatically starting in low-power mode. It has fog, cached static geometry, bounded queues and a reduced-detail mirror. Far vehicles use simpler geometry; traffic remains capped at 64. If neither renderer can start, a readable message links to the original 2D edition.

## Verification
- 49 automated engine, geometry and mock-runtime checks passed, including a complete physical-input first fare, stable timestep interpolation, keyboard menus, Shift precision control, reverse requirements, traffic caps and context-loss handling.
- 200 seeded cities were checked for finite geometry and bounded size; 10,515 lane, ramp and parking-access samples found no static obstruction.
- The public software-rendered game completed the entire first fare using actual keyboard controls: $79 earned, 100 condition, one delivery and next dispatch. No teleporting or game-state injection was used. A red-light penalty was observed; a separate deliberate wall collision verified damage and the repair charge. Help, map, pause, brake and reverse were checked in the browser.
- Native WebGL visual rendering could not be verified because the available cloud browser disables WebGL. The shader/buffer API path was tested with mocks. Software 3D was visually and interactively verified. This is not a physical old-hardware benchmark or a player-retention study.

All game assets are generated in code. No external runtime requests are needed after the static files load.
