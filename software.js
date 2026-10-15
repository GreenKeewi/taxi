/* Actual-perspective Canvas2D fallback for machines without WebGL.
   Geometry and camera conventions are identical to Taxi3D.Renderer. */
(function (root) {
  'use strict';
  const T = root.Taxi3D;
  const CACHE = 16, DRAW = 24, SKY = [176, 209, 219], FOG_STEPS = 24;
  const samePoint = (a, i, j) => a[i] === a[j] && a[i + 1] === a[j + 1] && a[i + 2] === a[j + 2];
  function capacity(n) { let p = 64; while (p < n) p *= 2; return p; }

  class TaxiSoftwareRenderer {
    constructor(canvas) {
      if (!T) throw new Error('The 3D camera helpers must load before the software renderer.');
      if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas is required for 3D rendering.');
      let context;
      try { context = canvas.getContext('2d', { alpha: false }); } catch (_) {}
      if (!context) throw new Error('This browser could not create either a WebGL or Canvas2D rendering context.');
      this.canvas = canvas; this.ctx = context; this.scale = 1;
      this.width = canvas.width || 1; this.height = canvas.height || 1;
      this.calls = 0; this.software = true;
      this.far = 1600; this.mirrorFar = 850;
      this.gl = { deleteBuffer(b) { if (b) { b.data = null; b.count = 0; b.triangles = 0; b.capacity = 0; } } };
      this._palette = []; this._colors = new Map();
      this._queue = new Float32Array(0); this._ground = new Uint32Array(0); this._objects = new Uint32Array(0);
      this._clipA = new Float64Array(48); this._clipB = new Float64Array(48);
      this._depthOrder = (a, b) => this._queue[b * DRAW] - this._queue[a * DRAW] || a - b;
      this._groundOrder = (a, b) => this._queue[a * DRAW + 1] - this._queue[b * DRAW + 1] || this._depthOrder(a, b);
      this.dynamic = this.buffer({ data: [] }, true);
    }

    _color(r, g, b) {
      const rr = Math.round(r * 255), gg = Math.round(g * 255), bb = Math.round(b * 255);
      const key = (rr << 16) | (gg << 8) | bb;
      let id = this._colors.get(key);
      if (id !== undefined) return id;
      id = this._palette.length; this._colors.set(key, id);
      const colors = [];
      for (let f = 0; f <= FOG_STEPS; f++) {
        const q = f / FOG_STEPS * .8;
        colors.push('rgb(' + Math.round(rr + (SKY[0] - rr) * q) + ',' + Math.round(gg + (SKY[1] - gg) * q) + ',' + Math.round(bb + (SKY[2] - bb) * q) + ')');
      }
      this._palette.push(colors); return id;
    }

    buffer(mesh, dynamic = false) {
      const b = { buffer: null, count: 0, triangles: 0, dynamic, capacity: 0, data: null };
      b.buffer = b; this.upload(b, mesh); return b;
    }

    upload(b, mesh) {
      const src = mesh.data, n = Math.floor(src.length / 18);
      if (!b.data || b.capacity < n) { b.capacity = capacity(n); b.data = new Float32Array(b.capacity * CACHE); }
      const dst = b.data; b.count = n * 3; b.triangles = n;
      for (let t = 0; t < n; t++) {
        const s = t * 18, d = t * CACHE;
        let cx = 0, cy = 0, cz = 0, ymin = Infinity, ymax = -Infinity;
        for (let v = 0; v < 3; v++) {
          const i = s + v * 6, k = d + v * 3;
          const x = src[i], y = src[i + 1], z = src[i + 2];
          dst[k] = x; dst[k + 1] = y; dst[k + 2] = z;
          cx += x; cy += y; cz += z; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
        }
        cx /= 3; cy /= 3; cz /= 3;
        dst[d + 9] = cx; dst[d + 10] = cy; dst[d + 11] = cz;
        let radius = 0;
        for (let v = 0; v < 3; v++) { const k = d + v * 3; radius = Math.max(radius, Math.hypot(dst[k] - cx, dst[k + 1] - cy, dst[k + 2] - cz)); }
        dst[d + 12] = radius;
        dst[d + 13] = this._color(src[s + 3], src[s + 4], src[s + 5]);
        // Ground sheets are drawn before all upright geometry, strictly by height.
        dst[d + 14] = ymax - ymin < .002 && ymax <= 1.12 ? 1 : 0;
        const ax = dst[d + 3] - dst[d], ay = dst[d + 4] - dst[d + 1], az = dst[d + 5] - dst[d + 2];
        const bx = dst[d + 6] - dst[d], by = dst[d + 7] - dst[d + 1], bz = dst[d + 8] - dst[d + 2];
        dst[d + 15] = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
      }
      // Treat Mesh.quad's two triangles as one face for stable painter ordering.
      for (let t = 0; t + 1 < n; t++) {
        const s = t * 18, d = t * CACHE, e = d + CACHE;
        if (!samePoint(src, s, s + 18) || !samePoint(src, s + 12, s + 24) || dst[d + 13] !== dst[e + 13]) continue;
        for (let k = 9; k < 12; k++) { const q = (dst[d + k] + dst[e + k]) / 2; dst[d + k] = dst[e + k] = q; }
        // A conservative bound remains valid after replacing the sort centre.
        const radius = Math.max(dst[d + 12], dst[e + 12]) * 1.5;
        dst[d + 12] = dst[e + 12] = radius; t++;
      }
    }

    resize(w, h, scale = 1) {
      this.width = Math.max(1, w); this.height = Math.max(1, h); this.scale = Math.max(.1, scale);
      this.canvas.width = Math.max(1, Math.round(w * this.scale));
      this.canvas.height = Math.max(1, Math.round(h * this.scale));
    }

    _reserve(n) {
      if (this._ground.length >= n) return;
      const c = capacity(n);
      this._queue = new Float32Array(c * DRAW); this._ground = new Uint32Array(c); this._objects = new Uint32Array(c);
    }

    scene(camera, buffers, rect) {
      const scale = this.scale, x = rect ? Math.round(rect.x * scale) : 0, y = rect ? Math.round(rect.y * scale) : 0;
      const w = rect ? Math.max(1, Math.round(rect.w * scale)) : this.canvas.width;
      const h = rect ? Math.max(1, Math.round(rect.h * scale)) : this.canvas.height;
      const fov = camera.fov || Math.PI * .38, near = .8, far = rect ? this.mirrorFar : this.far;
      // Return the exact WebGL projection for labels and other parent-rendered overlays.
      const projection = T.perspective(fov, w / h, near, 4500);
      if (camera.mirror) projection[0] *= -1;
      const matrix = T.multiply(projection, T.view(camera.eye, camera.yaw, camera.pitch || 0));
      const ctx = this.ctx;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = 'rgb(176,209,219)'; ctx.fillRect(x, y, w, h);
      let total = 0; for (const b of buffers) total += b.triangles || 0;
      this._reserve(total);
      const q = this._queue, ground = this._ground, objects = this._objects;
      const eye = camera.eye, cyaw = Math.cos(camera.yaw), syaw = Math.sin(camera.yaw);
      const cp = Math.cos(camera.pitch || 0), sp = Math.sin(camera.pitch || 0);
      const tanY = Math.tan(fov / 2), tanX = tanY * w / h, focal = h / (2 * tanY), horizontalSign = camera.mirror ? -1 : 1;
      const sxNorm = Math.sqrt(1 + tanX * tanX), syNorm = Math.sqrt(1 + tanY * tanY);
      let count = 0, ng = 0, no = 0;
      for (const b of buffers) {
        if (!b.data || !b.triangles) continue;
        this.calls++;
        const data = b.data;
        for (let t = 0; t < b.triangles; t++) {
          const d = t * CACHE, dx = data[d + 9] - eye[0], dy = data[d + 10] - eye[1], dz = data[d + 11] - eye[2];
          const horizontal = dx * cyaw + dz * syaw;
          const depth = horizontal * cp + dy * sp, right = -dx * syaw + dz * cyaw, up = dy * cp - horizontal * sp;
          const radius = data[d + 12], flat = data[d + 14] === 1;
          if (depth + radius < near || depth - radius > far || Math.abs(right) - radius * sxNorm > depth * tanX || Math.abs(up) - radius * syNorm > depth * tanY) continue;
          // Subpixel details have no readable shape, especially in the small mirror.
          if (!flat && depth > 80 && data[d + 15] * focal * focal / (depth * depth) < (rect ? 1.1 : .18)) continue;
          let input = this._clipA, output = this._clipB, n = 3, clipMask = 0, outsideMask = 63;
          for (let v = 0; v < 3; v++) {
            const k = d + v * 3, a = data[k] - eye[0], b = data[k + 1] - eye[1], c = data[k + 2] - eye[2], forward = a * cyaw + c * syaw;
            const rx = -a * syaw + c * cyaw, uy = b * cp - forward * sp, fz = forward * cp + b * sp;
            input[v * 3] = rx; input[v * 3 + 1] = uy; input[v * 3 + 2] = fz;
            const mask = (fz < near ? 1 : 0) | (fz > far ? 2 : 0) | (rx < -fz * tanX ? 4 : 0) | (rx > fz * tanX ? 8 : 0) | (uy < -fz * tanY ? 16 : 0) | (uy > fz * tanY ? 32 : 0);
            clipMask |= mask; outsideMask &= mask;
          }
          if (outsideMask) continue;
          // Sutherland-Hodgman clipping in camera space: near, far, left/right, top/bottom.
          // At most nine vertices survive a clipped triangle; fixed scratch storage is reused.
          for (let plane = 0; plane < 6 && n; plane++) {
            if (!(clipMask & (1 << plane))) continue;
            let out = 0, pk = (n - 1) * 3;
            let px = input[pk], py = input[pk + 1], pz = input[pk + 2];
            let pd = plane === 0 ? pz - near : plane === 1 ? far - pz : plane === 2 ? px + pz * tanX : plane === 3 ? pz * tanX - px : plane === 4 ? py + pz * tanY : pz * tanY - py;
            for (let v = 0; v < n; v++) {
              const k = v * 3, ax = input[k], ay = input[k + 1], az = input[k + 2];
              const ad = plane === 0 ? az - near : plane === 1 ? far - az : plane === 2 ? ax + az * tanX : plane === 3 ? az * tanX - ax : plane === 4 ? ay + az * tanY : az * tanY - ay;
              if ((ad >= 0) !== (pd >= 0)) {
                const f = pd / (pd - ad); output[out++] = px + (ax - px) * f; output[out++] = py + (ay - py) * f; output[out++] = pz + (az - pz) * f;
              }
              if (ad >= 0) { output[out++] = ax; output[out++] = ay; output[out++] = az; }
              px = ax; py = ay; pz = az; pd = ad;
            }
            n = out / 3; const swap = input; input = output; output = swap;
          }
          if (n < 3) continue;
          const o = count * DRAW;
          // Ignore camera pitch for face ordering so glazing stays on its parent facade.
          q[o] = horizontal; q[o + 1] = data[d + 10]; q[o + 2] = data[d + 13]; q[o + 3] = n;
          let area = 0, lastX = 0, lastY = 0, firstX = 0, firstY = 0;
          for (let v = 0; v < n; v++) {
            const k = v * 3, z = input[k + 2];
            const xx = x + w * .5 + input[k] * focal / z * horizontalSign, yy = y + h * .5 - input[k + 1] * focal / z;
            q[o + 5 + v * 2] = xx; q[o + 6 + v * 2] = yy;
            if (v) area += lastX * yy - xx * lastY; else { firstX = xx; firstY = yy; }
            lastX = xx; lastY = yy;
          }
          area += lastX * firstY - firstX * lastY;
          if (Math.abs(area) < (rect ? .2 : .08)) continue;
          // Quantized atmospheric colors avoid generating thousands of strings each frame.
          const distance = Math.max(0, Math.hypot(dx, dy, dz) - (flat ? radius * .5 : 0));
          q[o + 4] = Math.max(0, Math.min(FOG_STEPS, Math.round((distance - 400) / 1850 * FOG_STEPS)));
          if (flat) ground[ng++] = count; else objects[no++] = count;
          count++;
        }
      }
      const floors = ground.subarray(0, ng), solids = objects.subarray(0, no);
      floors.sort(this._groundOrder); solids.sort(this._depthOrder);
      let style = '';
      const draw = list => {
        for (let i = 0; i < list.length; i++) {
          const o = list[i] * DRAW, n = q[o + 3], color = this._palette[q[o + 2]][q[o + 4]];
          if (color !== style) { ctx.fillStyle = color; style = color; }
          ctx.beginPath(); ctx.moveTo(q[o + 5], q[o + 6]);
          for (let v = 1; v < n; v++) ctx.lineTo(q[o + 5 + v * 2], q[o + 6 + v * 2]);
          ctx.closePath(); ctx.fill();
        }
      };
      draw(floors); draw(solids); ctx.restore();
      this.trianglesDrawn = count;
      this.stats = { triangles: count, groundTriangles: ng, objectTriangles: no, mirror: !!rect, cachedCapacity: this._ground.length };
      return matrix;
    }

    dispose() {
      this.gl.deleteBuffer(this.dynamic.buffer);
      this._queue = new Float32Array(0); this._ground = new Uint32Array(0); this._objects = new Uint32Array(0);
      this._palette.length = 0; this._colors.clear();
    }
  }
  root.TaxiSoftwareRenderer = TaxiSoftwareRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
