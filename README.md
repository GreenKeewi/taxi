# Toronto Taxi: Driver’s Seat

A lightweight, keyboard-driven 3D Toronto-inspired driving game.

Play at https://greenkeewi.github.io/taxi/ once GitHub Pages is enabled.

This independent version preserves the original 2D game at https://greenkeewi.github.io/night-shift-taxi/.

## Controls

- Enter to start; arrow keys navigate menus.
- WASD or arrow keys drive. Down/S brakes, then reverses. Space is the handbrake.
- Q/E look through the side windows.
- Escape pauses; F1 opens help.
- Choose a taxi or bus, time of day, and traffic level from the keyboard menu.

## Build

Static HTML, CSS, and JavaScript; no backend, dependencies, or build step. Version: highway-air-7.

The city and vehicles use 3D world geometry. The primary renderer uses WebGL, with a bounded perspective software renderer when WebGL is unavailable. Native WebGL visuals have not yet been verified in the cloud test browser, which disables WebGL.

The city includes elevated highways, rising and descending ramps, and an island runway with a taking-off aircraft. The update has passed integration, physical-input taxi fare and full bus-loop, highway round trips, road and aircraft geometry, and Canvas screenshot checks. Public browser gameplay and final presentation checks remain pending until Pages is enabled.
