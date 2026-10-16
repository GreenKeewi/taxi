# Full-quality Canvas resize correction

The Canvas22 minimum scale of0.35 incorrectly also applied when Low Power was off. At2560CSS pixels, fullquality rendered1000pixels instead of the original1280; at3840 it rendered1344 instead of1920. The minimum0.35 now applies only to Canvas Low Power; fullquality and WebGL keep the original0.5 minimum.

`resize23-regression.cjs` uses real viewport changes at2560/3840 and nativeL toggles without forcing renderer dimensions. Both cases pass: fullquality1280/1920, lowpower896/1344, then return to fullquality1280/1920. No page errors. The earlier matching900-pixel parity harness did not cover this normal-resize regression.

Evidence: `resize23-results.json`, `resize23-full-2560.png`, `resize23-full-3840.png`. This checkpoint changes the resize floor and asset cache tag only; traffic, physics and map geometry are unchanged.
