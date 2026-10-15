/* Toronto Taxi — lightweight, steady driver cockpit. All coordinates are CSS pixels. */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function polygon(ctx, points, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function rounded(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function box(ctx, x, y, w, h, radius, fill, stroke, lineWidth) {
    ctx.beginPath();
    rounded(ctx, x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.font = (weight || 600) + ' ' + size + 'px system-ui, -apple-system, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // The rear camera should be rendered into this exact rectangle BEFORE draw().
  // The cockpit never paints over its glass. It is deliberately independent of steer/speed.
  function mirrorRect(width, height) {
    const border = Math.max(3, Math.min(width, height) * 0.006);
    const outerW = width * 0.164;
    const outerH = height * 0.073;
    return {
      x: (width - outerW) * 0.5 + border,
      y: height * 0.037 + border,
      w: Math.max(1, outerW - border * 2),
      h: Math.max(1, outerH - border * 2)
    };
  }

  function drawMirror(ctx, w, h) {
    const glass = mirrorRect(w, h);
    const b = Math.max(3, Math.min(w, h) * 0.006);
    // Stem, outer bevel, and an open glass center; no fake reflected landscape.
    polygon(ctx, [[w * 0.493, 0], [w * 0.507, 0], [w * 0.504, glass.y - b], [w * 0.496, glass.y - b]], '#252722');
    ctx.beginPath();
    rounded(ctx, glass.x - b, glass.y - b, glass.w + b * 2, glass.h + b * 2, b * 1.6);
    ctx.rect(glass.x, glass.y, glass.w, glass.h);
    ctx.fillStyle = '#262b28';
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.moveTo(glass.x + b, glass.y - b * 0.47);
    ctx.lineTo(glass.x + glass.w - b, glass.y - b * 0.47);
    ctx.strokeStyle = '#666b62';
    ctx.lineWidth = Math.max(1, b * 0.22);
    ctx.stroke();
    polygon(ctx, [[w * 0.487, glass.y + glass.h + b], [w * 0.513, glass.y + glass.h + b], [w * 0.509, glass.y + glass.h + b * 1.8], [w * 0.491, glass.y + glass.h + b * 1.8]], '#343733');
    return glass;
  }

  function drawPillars(ctx, w, h) {
    // A-pillars stay at the windshield edges instead of hiding road junctions.
    polygon(ctx, [[0, 0], [w * 0.018, 0], [w * 0.052, h * 0.77], [0, h * 0.868]], '#302e2b');
    polygon(ctx, [[0, 0], [w * 0.007, 0], [w * 0.035, h * 0.771], [0, h * 0.818]], '#5a524a');
    polygon(ctx, [[w * 0.018, 0], [w * 0.022, 0], [w * 0.057, h * 0.775], [w * 0.052, h * 0.77]], '#1b211e');
    polygon(ctx, [[w, 0], [w * 0.982, 0], [w * 0.948, h * 0.77], [w, h * 0.868]], '#302e2b');
    polygon(ctx, [[w, 0], [w * 0.993, 0], [w * 0.966, h * 0.771], [w, h * 0.818]], '#49443d');
    polygon(ctx, [[w * 0.982, 0], [w * 0.978, 0], [w * 0.943, h * 0.775], [w * 0.948, h * 0.77]], '#1b211e');
    polygon(ctx, [[0, 0], [w, 0], [w, h * 0.022], [w * 0.75, h * 0.012], [w * 0.25, h * 0.012], [0, h * 0.022]], '#2c2d29');
  }

  function drawHood(ctx, w, h) {
    polygon(ctx, [[w * 0.405, h * 0.746], [w * 0.593, h * 0.746], [w * 0.728, h * 0.817], [w * 0.271, h * 0.817]], '#d2a63e');
    polygon(ctx, [[w * 0.421, h * 0.745], [w * 0.579, h * 0.745], [w * 0.621, h * 0.815], [w * 0.374, h * 0.815]], '#edc75b');
    polygon(ctx, [[w * 0.407, h * 0.746], [w * 0.421, h * 0.745], [w * 0.374, h * 0.815], [w * 0.282, h * 0.815]], '#e1b650');
    polygon(ctx, [[w * 0.579, h * 0.745], [w * 0.593, h * 0.746], [w * 0.728, h * 0.817], [w * 0.621, h * 0.815]], '#b48930');
    ctx.strokeStyle = 'rgba(116, 85, 34, 0.42)';
    ctx.lineWidth = Math.max(1, h * 0.0012);
    ctx.beginPath();
    ctx.moveTo(w * 0.422, h * 0.748); ctx.lineTo(w * 0.375, h * 0.801);
    ctx.moveTo(w * 0.578, h * 0.748); ctx.lineTo(w * 0.619, h * 0.801);
    ctx.stroke();
  }

  function drawDashboard(ctx, w, h, state, rear) {
    const top = rear ? 0.878 : 0.78;
    polygon(ctx, [[0, h * top], [w * 0.18, h * (top + 0.015)], [w * 0.5, h * (top + 0.039)], [w * 0.81, h * (top + 0.018)], [w, h * top], [w, h], [0, h]], '#302f2b');
    polygon(ctx, [[0, h * top], [w * 0.18, h * (top + 0.015)], [w * 0.5, h * (top + 0.039)], [w * 0.81, h * (top + 0.018)], [w, h * top], [w, h * (top + 0.065)], [w * 0.52, h * (top + 0.076)], [0, h * (top + 0.06)]], '#514a41');
    polygon(ctx, [[0, h * (top + 0.061)], [w * 0.5, h * (top + 0.077)], [w, h * (top + 0.065)], [w, h * (top + 0.073)], [w * 0.5, h * (top + 0.085)], [0, h * (top + 0.069)]], '#75604b');
    polygon(ctx, [[0, h * (top + 0.081)], [w * 0.19, h * (top + 0.078)], [w * 0.12, h], [0, h]], '#242824');
    polygon(ctx, [[w, h * (top + 0.078)], [w * 0.79, h * (top + 0.081)], [w * 0.85, h], [w, h]], '#262924');
    ctx.strokeStyle = '#635b50';
    ctx.lineWidth = Math.max(1, h * 0.0014);
    ctx.beginPath();
    ctx.moveTo(w * 0.73, h * (top + 0.122)); ctx.lineTo(w * 0.94, h * (top + 0.114));
    ctx.stroke();
    // Passenger-side air vent, with a small warm metallic bezel.
    const vx = w * 0.913, vy = h * (top + 0.045), vw = w * 0.065, vh = h * 0.035;
    box(ctx, vx, vy, vw, vh, h * 0.005, '#1d2420', '#776a55', 1);
    ctx.strokeStyle = '#575b50'; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = vy + vh * i / 5;
      ctx.beginPath(); ctx.moveTo(vx + vw * 0.1, y); ctx.lineTo(vx + vw * 0.9, y); ctx.stroke();
    }
  }

  function drawInstruments(ctx, w, h, state, rear) {
    const unit = Math.min(w / 1280, h / 720);
    const health = clamp(number(state.health, 100), 0, 100);
    const speed = Math.round(Math.abs(number(state.speed, 0)));
    const y = rear ? h * 0.9 : h * 0.796;
    const x = w * 0.383, iw = w * 0.152, ih = h * 0.101;
    // Inset instrument binnacle beside the wheel stays readable at every steering angle.
    polygon(ctx, [[x - iw * 0.12, y + ih], [x - iw * 0.02, y + ih * 0.19], [x + iw * 0.15, y], [x + iw * 0.85, y], [x + iw * 1.02, y + ih * 0.2], [x + iw * 1.12, y + ih]], '#242824', '#625c50', Math.max(1, unit));
    box(ctx, x, y + ih * 0.19, iw, ih * 0.69, 5 * unit, '#111c18', '#3c463b', Math.max(1, unit));
    label(ctx, String(speed).padStart(2, '0'), x + iw * 0.43, y + ih * 0.44, 30 * unit, '#e8efd5', 'center', 700);
    label(ctx, 'km/h', x + iw * 0.75, y + ih * 0.43, 10 * unit, '#a8b2a0', 'center', 500);
    label(ctx, state.reverse ? 'R' : 'D', x + iw * 0.11, y + ih * 0.45, 16 * unit, state.reverse ? '#efc67a' : '#d5e5be', 'center', 700);
    const gx = x + iw * 0.32, gy = y + ih * 0.74, gw = iw * 0.58;
    label(ctx, 'CAB', x + iw * 0.09, gy, 8 * unit, '#a3ad99', 'left', 600);
    box(ctx, gx, gy - 2 * unit, gw, 4 * unit, 2 * unit, '#394338');
    box(ctx, gx, gy - 2 * unit, Math.max(0.1, gw * health / 100), 4 * unit, 2 * unit, health > 55 ? '#a8bc84' : health > 25 ? '#d7b666' : '#d07c60');
    if (state.brake) label(ctx, 'BRAKE', x + iw * 0.5, y + ih * 0.94, 8 * unit, '#e6af85', 'center', 700);

    const mx = w * 0.69, my = rear ? h * 0.896 : h * 0.801, mw = w * 0.187, mh = h * 0.105;
    polygon(ctx, [[mx - mw * 0.023, my + mh], [mx, my], [mx + mw * 0.94, my], [mx + mw, my + mh]], '#252d27', '#6c6656', Math.max(1, unit));
    box(ctx, mx + mw * 0.053, my + mh * 0.13, mw * 0.873, mh * 0.68, 4 * unit, '#14251c', '#3d4938', Math.max(1, unit));
    label(ctx, 'SHIFT EARNINGS', mx + mw * 0.106, my + mh * 0.275, 9 * unit, '#aabd98', 'left', 600);
    const cash = Math.max(0, number(state.cash, 0));
    const money = '$' + (cash >= 100000 ? (cash / 1000).toFixed(1) + 'k' : Math.floor(cash).toLocaleString('en-CA'));
    label(ctx, money, mx + mw * 0.106, my + mh * 0.58, 23 * unit, '#e2d497', 'left', 700);
    const fares = Math.max(0, Math.floor(number(state.fares, 0)));
    label(ctx, fares + (fares === 1 ? ' FARE' : ' FARES'), mx + mw * 0.876, my + mh * 0.60, 9 * unit, '#aabd98', 'right', 600);
    // Clock is deliberately connected to simulation time, never decorative random text.
    const clockX = w * 0.605, clockY = rear ? h * 0.953 : h * 0.895;
    box(ctx, clockX - w * 0.04, clockY - h * 0.018, w * 0.08, h * 0.035, h * 0.005, '#1e2720', '#625d4e', Math.max(1, unit));
    label(ctx, String(state.clock || '16:15'), clockX, clockY, 16 * unit, '#d3d6b9', 'center', 600);
    if (!rear) {
      // Three simple console switches add scale without becoming a second HUD.
      for (let i = 0; i < 3; i++) box(ctx, w * (0.499 + i * 0.037), h * 0.941, w * 0.027, h * 0.027, 3 * unit, '#252c25', '#5b5c4e', Math.max(1, unit));
      polygon(ctx, [[w * 0.5475, h * 0.946], [w * 0.5417, h * 0.96], [w * 0.5533, h * 0.96]], null, '#b98869', Math.max(1, unit));
      label(ctx, state.lowPower ? 'ECO' : 'AIR', w * 0.5865, h * 0.955, 8 * unit, '#a6af99', 'center', 600);
    }
  }

  function drawArm(ctx, anchorX, anchorY, wristX, wristY, radius, isLeft) {
    const dx = wristX - anchorX, dy = wristY - anchorY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length, ny = dx / length;
    const base = radius * 0.235, cuff = radius * 0.108;
    polygon(ctx, [[anchorX - nx * base, anchorY - ny * base], [anchorX + nx * base, anchorY + ny * base], [wristX + nx * cuff, wristY + ny * cuff], [wristX - nx * cuff, wristY - ny * cuff]], '#53615c');
    polygon(ctx, [[anchorX - nx * base, anchorY - ny * base], [anchorX - nx * base * 0.1, anchorY - ny * base * 0.1], [wristX - nx * cuff * 0.05, wristY - ny * cuff * 0.05], [wristX - nx * cuff, wristY - ny * cuff]], isLeft ? '#67746b' : '#68746b');
    polygon(ctx, [[anchorX + nx * base * 0.7, anchorY + ny * base * 0.7], [anchorX + nx * base, anchorY + ny * base], [wristX + nx * cuff, wristY + ny * cuff], [wristX + nx * cuff * 0.4, wristY + ny * cuff * 0.4]], '#344640');
    ctx.beginPath(); ctx.moveTo(wristX - nx * cuff, wristY - ny * cuff); ctx.lineTo(wristX + nx * cuff, wristY + ny * cuff);
    ctx.strokeStyle = '#293c34'; ctx.lineWidth = radius * 0.035; ctx.stroke();
  }

  function drawHand(ctx, r, side) {
    // A faceted palm, four knuckle facets, and a thumb hooked inside the wheel rim.
    ctx.save();
    ctx.translate(side * r * 0.89, -r * 0.28);
    ctx.rotate(side * 0.18);
    ctx.scale(side, 1);
    polygon(ctx, [[-r * 0.085, r * 0.205], [r * 0.095, r * 0.18], [r * 0.139, r * 0.048], [r * 0.12, -r * 0.134], [r * 0.056, -r * 0.19], [-r * 0.064, -r * 0.172], [-r * 0.12, -r * 0.105], [-r * 0.127, r * 0.065]], '#c78f65', '#805a42', r * 0.013);
    polygon(ctx, [[-r * 0.085, r * 0.205], [r * 0.02, r * 0.176], [r * 0.027, -r * 0.126], [-r * 0.064, -r * 0.172], [-r * 0.12, -r * 0.105], [-r * 0.127, r * 0.065]], '#dfa679');
    polygon(ctx, [[r * 0.027, -r * 0.126], [r * 0.056, -r * 0.19], [r * 0.12, -r * 0.134], [r * 0.139, r * 0.048], [r * 0.08, r * 0.133], [r * 0.018, r * 0.078]], '#b47a56');
    for (let i = 0; i < 3; i++) {
      const fy = r * (-0.108 + i * 0.067);
      ctx.beginPath(); ctx.moveTo(r * 0.041, fy); ctx.lineTo(r * 0.12, fy + r * 0.016);
      ctx.strokeStyle = '#996949'; ctx.lineWidth = r * 0.012; ctx.stroke();
    }
    polygon(ctx, [[-r * 0.109, -r * 0.066], [-r * 0.186, -r * 0.02], [-r * 0.206, r * 0.047], [-r * 0.165, r * 0.09], [-r * 0.068, r * 0.016], [-r * 0.04, -r * 0.032]], '#e0a87c', '#af7854', r * 0.012);
    polygon(ctx, [[-r * 0.186, -r * 0.02], [-r * 0.109, -r * 0.066], [-r * 0.04, -r * 0.032], [-r * 0.088, -r * 0.023]], '#eab98c');
    ctx.restore();
  }

  function drawWheel(ctx, w, h, state) {
    const r = Math.min(h * 0.132, w * 0.174);
    const cx = w * 0.268, cy = h * 0.852;
    const angle = clamp(number(state.steer, 0), -1, 1) * (100 * Math.PI / 180);
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    // Forearms remain attached to the seated driver. Only the grips and wheel rotate.
    for (const side of [-1, 1]) {
      const hx = side * r * 0.89, hy = -r * 0.28;
      const wx = cx + hx * cosine - hy * sine;
      const wy = cy + hx * sine + hy * cosine + r * 0.08;
      drawArm(ctx, cx + side * r * 0.88, h * 1.063, wx, wy, r, side < 0);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // Outer rubber, subtle upper bevel, and three asymmetric spokes make rotation clear.
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = '#111b18'; ctx.lineWidth = r * 0.19; ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 0.012, -r * 0.015, r * 0.994, Math.PI * 1.04, Math.PI * 1.94); ctx.strokeStyle = '#667064'; ctx.lineWidth = r * 0.045; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.917, 0, TAU); ctx.strokeStyle = '#39463e'; ctx.lineWidth = r * 0.024; ctx.stroke();
    polygon(ctx, [[-r * 0.94, -r * 0.095], [-r * 0.9, r * 0.145], [-r * 0.19, r * 0.14], [-r * 0.14, -r * 0.11]], '#4e5a50', '#15221b', r * 0.018);
    polygon(ctx, [[r * 0.94, -r * 0.095], [r * 0.9, r * 0.145], [r * 0.19, r * 0.14], [r * 0.14, -r * 0.11]], '#4e5a50', '#15221b', r * 0.018);
    polygon(ctx, [[-r * 0.16, r * 0.1], [r * 0.16, r * 0.1], [r * 0.21, r * 0.94], [-r * 0.21, r * 0.94]], '#303f36', '#18281f', r * 0.018);
    polygon(ctx, [[-r * 0.06, r * 0.27], [r * 0.06, r * 0.27], [r * 0.085, r * 0.84], [-r * 0.085, r * 0.84]], '#687469');
    box(ctx, -r * 0.31, -r * 0.24, r * 0.62, r * 0.52, r * 0.115, '#263b2f', '#667260', r * 0.02);
    box(ctx, -r * 0.08, -r * 0.09, r * 0.16, r * 0.17, r * 0.022, '#c7b977');
    polygon(ctx, [[-r * 0.044, -r * 0.032], [r * 0.044, -r * 0.032], [r * 0.044, -r * 0.014], [r * 0.012, -r * 0.014], [r * 0.012, r * 0.047], [-r * 0.012, r * 0.047], [-r * 0.012, -r * 0.014], [-r * 0.044, -r * 0.014]], '#455742');
    // A small top-centre stitch also rotates with the actual steering angle.
    polygon(ctx, [[-r * 0.042, -r * 1.085], [r * 0.042, -r * 1.085], [r * 0.042, -r * 0.92], [-r * 0.042, -r * 0.92]], '#c9b47c');
    drawHand(ctx, r, -1);
    drawHand(ctx, r, 1);
    ctx.restore();
  }

  function draw(ctx, width, height, state) {
    const w = number(width, 0), h = number(height, 0);
    if (!ctx || w <= 0 || h <= 0) return { mirror: null };
    state = state || {};
    const rear = Math.abs(number(state.look, 0)) > 2;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawPillars(ctx, w, h);
    if (!rear) drawHood(ctx, w, h);
    drawDashboard(ctx, w, h, state, rear);
    drawInstruments(ctx, w, h, state, rear);
    if (!rear) drawWheel(ctx, w, h, state);
    else label(ctx, 'REARWARD GLANCE', w * 0.5, h * 0.873, Math.min(w / 1280, h / 720) * 10, '#e7e4ca', 'center', 600);
    const mirror = drawMirror(ctx, w, h);
    ctx.restore();
    return { mirror: mirror };
  }

  global.TaxiCockpit = Object.freeze({ draw: draw, mirrorRect: mirrorRect, getMirrorRect: mirrorRect });
})(typeof window !== 'undefined' ? window : globalThis);
