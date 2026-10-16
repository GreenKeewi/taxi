# Street-16: remove floating street names

Removed projected street-name billboards at ground junctions and Lake Shore crossings. Landmarks, directional/highway signs, pickup/dropoff markers, HUD street/destination guidance and maps remain available. World meshes and driving code are unchanged.

Cloud Chromium check used the same declared stationary street pose with the previous city renderer and the new renderer. Canvas text capture confirmed `Richmond St West` appeared before and disappeared after. Both builds submitted the same 740523 static vertices and had no browser errors. Native keyboard Start, pause/resume, Tab map, menu focus/activation and original-2D link activation passed; the public link load itself remains blocked by the cloud proxy.

- [Before](street16-before.png)
- [After](street16-after.png)
- [Captured labels and assertions](street16-check.json)
- [Keyboard check](street16-navigation.json)

No physical Chromebook validation was performed. The original 2D root is unchanged.
