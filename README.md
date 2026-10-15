# Toronto Taxi · Driver’s Seat

Play at https://greenkeewi.github.io/taxi/ . The original 2D game remains at https://greenkeewi.github.io/night-shift-taxi/ .

A static first-person taxi game with Toronto-inspired 3D streets, taller buildings, modeled vehicles, denser nearby traffic, cockpit steering and animated hands. No installation, backend, dependencies or account is needed.

Enter starts; arrows/WASD drive; Space brakes; S/down brakes then reverses; Shift gives precise parking control. Q/E look sideways; C looks behind. Esc/P pauses; Tab shows the map; F1 opens help; H sounds the horn; M toggles sound; L toggles low power. Title-screen menus select time and traffic.

WebGL is the primary renderer. Browsers without it use a perspective-projected software 3D fallback. The cloud-browser environment disables WebGL, so native GPU visuals are not yet verified.

The taxi-depth-5b source passed 17 runtime, 14 engine, 4 traffic and 12 audio checks. The unchanged original 2D game passed 33 regressions. A physical-input first fare with normal dense traffic completed for $79 and full health, without collisions, red-light fines or missed fares. These are automated checks, not a retention study or an old-hardware benchmark.

Serve this folder with any static web server. All gameplay assets are generated in code.
