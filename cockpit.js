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
  function mirrorRect(width, height, state) {
    if(state&&Math.abs(number(state.look,0))>.8)return null;
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
    // Rounded windscreen seals and tapered A-pillars keep the cab from reading as a box.
    for(const side of [-1,1]){
      ctx.save();if(side>0){ctx.translate(w,0);ctx.scale(-1,1);}
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.017,0);
      ctx.bezierCurveTo(w*.020,h*.22,w*.033,h*.54,w*.046,h*.745);
      ctx.quadraticCurveTo(w*.049,h*.786,0,h*.828);ctx.closePath();ctx.fillStyle='#393731';ctx.fill();
      ctx.beginPath();ctx.moveTo(w*.007,0);ctx.bezierCurveTo(w*.010,h*.27,w*.027,h*.61,w*.032,h*.747);
      ctx.quadraticCurveTo(w*.033,h*.774,w*.012,h*.793);ctx.strokeStyle=side<0?'#686056':'#544f45';ctx.lineWidth=w*.009;ctx.stroke();
      ctx.beginPath();ctx.moveTo(w*.019,0);ctx.bezierCurveTo(w*.025,h*.34,w*.038,h*.66,w*.047,h*.764);ctx.strokeStyle='#19231e';ctx.lineWidth=Math.max(2,w*.004);ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,h*.022);ctx.quadraticCurveTo(w*.5,-h*.006,0,h*.022);ctx.closePath();ctx.fillStyle='#2c2d29';ctx.fill();
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
    const surface=(offset,depth,color)=>{
      ctx.beginPath();ctx.moveTo(0,h*(top+offset));
      ctx.bezierCurveTo(w*.15,h*(top+offset-.015),w*.27,h*(top+offset+.028),w*.5,h*(top+offset+.04));
      ctx.bezierCurveTo(w*.7,h*(top+offset+.04),w*.85,h*(top+offset-.008),w,h*(top+offset));
      ctx.lineTo(w,h*(top+offset+depth));ctx.quadraticCurveTo(w*.48,h*(top+offset+depth+.04),0,h*(top+offset+depth));ctx.closePath();ctx.fillStyle=color;ctx.fill();
    };
    ctx.fillStyle='#302f2b';ctx.fillRect(0,h*(top+.04),w,h);
    surface(0,.068,'#514a41');surface(.067,.009,'#79664e');surface(.078,.014,'#292d27');
    // Curved door padding at the near edges, with narrow daylight-visible seals.
    for(const side of [-1,1]){
      ctx.save();if(side>0){ctx.translate(w,0);ctx.scale(-1,1);}
      ctx.beginPath();ctx.moveTo(0,h*(top+.084));ctx.quadraticCurveTo(w*.065,h*(top+.08),w*.125,h*(top+.11));ctx.quadraticCurveTo(w*.16,h*.91,w*.115,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle='#252b26';ctx.fill();ctx.restore();
    }
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
    // Physics units are quarter-metres; convert world units/second to km/h.
    const speed = Math.round(Math.abs(number(state.speed, 0)) * .9);
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
    label(ctx, 'NET BALANCE', mx + mw * 0.106, my + mh * 0.275, 9 * unit, '#aabd98', 'left', 600);
    const cash = Math.floor(number(state.cash, 0)), absolute=Math.abs(cash);
    const money = (cash<0?'−$':'$') + (absolute >= 100000 ? (absolute / 1000).toFixed(1) + 'k' : absolute.toLocaleString('en-CA'));
    label(ctx, money, mx + mw * 0.106, my + mh * 0.58, 23 * unit, cash<0?'#efad91':'#e2d497', 'left', 700);
    const fares = Math.max(0, Math.floor(number(state.fares, 0)));
    label(ctx, fares + (fares === 1 ? ' FARE' : ' FARES'), mx + mw * 0.876, my + mh * 0.60, 9 * unit, '#aabd98', 'right', 600);
    // Clock is deliberately connected to simulation time, never decorative random text.
    const clockX = w * 0.605, clockY = rear ? h * 0.953 : h * 0.895;
    box(ctx, clockX - w * 0.04, clockY - h * 0.018, w * 0.08, h * 0.035, h * 0.005, '#1e2720', '#625d4e', Math.max(1, unit));
    label(ctx, String(state.clock || '4:15 PM'), clockX, clockY, 13 * unit, '#d3d6b9', 'center', 600);
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
    ctx.translate(side * r * 0.99, -r * 0.16);
    ctx.rotate(side * 0.08);
    ctx.scale(side, 1);
    polygon(ctx, [[-r * 0.085, r * 0.205], [r * 0.095, r * 0.18], [r * 0.139, r * 0.048], [r * 0.12, -r * 0.134], [r * 0.056, -r * 0.19], [-r * 0.064, -r * 0.172], [-r * 0.12, -r * 0.105], [-r * 0.127, r * 0.065]], '#c78f65', '#805a42', r * 0.013);
    polygon(ctx, [[-r * 0.085, r * 0.205], [r * 0.02, r * 0.176], [r * 0.027, -r * 0.126], [-r * 0.064, -r * 0.172], [-r * 0.12, -r * 0.105], [-r * 0.127, r * 0.065]], '#dfa679');
    polygon(ctx, [[r * 0.027, -r * 0.126], [r * 0.056, -r * 0.19], [r * 0.12, -r * 0.134], [r * 0.139, r * 0.048], [r * 0.08, r * 0.133], [r * 0.018, r * 0.078]], '#b47a56');
    for(let finger=0;finger<4;finger++){
      const fy=r*(-.115+finger*.065);
      box(ctx,-r*.09,fy,r*.19,r*.052,r*.018,finger===0?'#efbf93':'#dda378','#a16d4c',r*.008);
    }
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
    const bus=state.vehicleType==='bus';
    const r = Math.min(h * (bus?.146:.132), w * .174);
    const cx = w * (bus?.248:.268), cy = h * (bus?.85:.852);
    const angle = clamp(number(state.steer, 0), -1, 1) * (100 * Math.PI / 180);
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    // Forearms remain attached to the seated driver. Only the grips and wheel rotate.
    for (const side of [-1, 1]) {
      const hx = side * r * 0.99, hy = -r * 0.16;
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

  function drawSideWindow(ctx,w,h,state){
    const left=number(state.look,0)<0;
    ctx.save();if(!left){ctx.translate(w,0);ctx.scale(-1,1);}
    // The view rotates with the driver's head. A side door replaces the forward dashboard.
    ctx.beginPath();ctx.moveTo(0,h*.025);ctx.quadraticCurveTo(w*.5,-h*.01,w,h*.035);ctx.lineTo(w,0);ctx.lineTo(0,0);ctx.closePath();ctx.fillStyle='#30352e';ctx.fill();
    ctx.beginPath();ctx.moveTo(w*.865,0);ctx.bezierCurveTo(w*.84,h*.3,w*.87,h*.6,w*.94,h*.8);ctx.lineTo(w,h*.83);ctx.lineTo(w,0);ctx.closePath();ctx.fillStyle='#45463d';ctx.fill();
    ctx.beginPath();ctx.moveTo(w*.861,0);ctx.bezierCurveTo(w*.84,h*.33,w*.87,h*.63,w*.94,h*.8);ctx.strokeStyle='#242c24';ctx.lineWidth=w*.008;ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,h*.79);ctx.quadraticCurveTo(w*.4,h*.76,w,h*.82);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle='#393d33';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,h*.80);ctx.quadraticCurveTo(w*.43,h*.775,w,h*.833);ctx.strokeStyle='#847157';ctx.lineWidth=h*.018;ctx.stroke();
    box(ctx,w*.26,h*.866,w*.4,h*.058,h*.025,'#242e26','#51594a',Math.max(1,w*.001));
    box(ctx,w*.58,h*.852,w*.13,h*.036,h*.012,'#b6b3a0','#596054',1);
    box(ctx,w*.37,h*.884,w*.047,h*.012,h*.004,'#677064');
    ctx.restore();
  }

  function drawBusCockpit(ctx,w,h,state,rear){
    const unit=Math.min(w/1280,h/720);
    if(rear){
      // A bus has a passenger cabin behind the driver, so the rear glance shows its aisle.
      ctx.fillStyle='#9faaa3';ctx.fillRect(0,0,w,h);
      polygon(ctx,[[w*.12,h],[w*.44,h*.26],[w*.56,h*.26],[w*.88,h]],'#414e49');
      polygon(ctx,[[0,0],[w,0],[w*.67,h*.24],[w*.33,h*.24]],'#e3e3d1');
      box(ctx,w*.39,h*.15,w*.22,h*.21,h*.015,'#8ba9ad','#586f6c',4*unit);
      for(let i=4;i>=0;i--){
        const t=i/5,ys=h*(.38+(1-t)*.52),scale=1-t*.7,ww=w*.14*scale,hh=h*.19*scale;
        for(const side of [-1,1]){
          const xx=w*.5+side*w*(.1+(1-t)*.20)-ww/2;
          box(ctx,xx,ys-hh,ww,hh,8*unit*scale,'#456a74','#244852',3*unit*scale);
          box(ctx,xx+ww*.09,ys-hh*.89,ww*.82,hh*.58,5*unit*scale,'#668891');
          polygon(ctx,[[xx,ys],[xx+ww,ys],[xx+ww*1.09,ys+hh*.27],[xx-ww*.09,ys+hh*.27]],'#4c737b');
        }
      }
      for(const side of [-1,1]){
        ctx.beginPath();ctx.moveTo(w*(side<0?.24:.76),h);ctx.lineTo(w*(side<0?.41:.59),h*.22);ctx.strokeStyle='#d0b259';ctx.lineWidth=7*unit;ctx.stroke();
      }
      label(ctx,'PASSENGER CABIN',w*.5,h*.95,12*unit,'#eef0d9','center',700);
      return;
    }
    // Broad upright windshield, low flat cowl and a driver console: no taxi bonnet.
    ctx.fillStyle='#253831';ctx.fillRect(0,0,w,h*.017);
    polygon(ctx,[[0,0],[w*.024,0],[w*.025,h*.80],[0,h]],'#47534a');
    polygon(ctx,[[w,0],[w*.978,0],[w*.954,h*.80],[w,h]],'#47534a');
    ctx.beginPath();ctx.moveTo(w*.52,0);ctx.lineTo(w*.51,h*.752);ctx.strokeStyle='#34483e';ctx.lineWidth=Math.max(3,w*.005);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,h*.758);ctx.quadraticCurveTo(w*.42,h*.78,w,h*.76);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle='#37413a';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,h*.76);ctx.quadraticCurveTo(w*.46,h*.784,w,h*.764);ctx.strokeStyle='#6d796a';ctx.lineWidth=h*.018;ctx.stroke();
    // Rubber demister grille and small switches remain below the driver's road sightline.
    for(let x=.04;x<.92;x+=.023){ctx.fillStyle='#202e28';ctx.fillRect(w*x,h*.786,w*.013,h*.009);}
    box(ctx,w*.393,h*.81,w*.205,h*.108,8*unit,'#152c24','#6e7e67',2*unit);
    label(ctx,String(Math.round(Math.abs(number(state.speed,0))*.9)).padStart(2,'0'),w*.456,h*.856,31*unit,'#e4ead0','center',700);
    label(ctx,'km/h',w*.504,h*.863,10*unit,'#aabcaa','left',500);
    label(ctx,state.reverse?'R':'D',w*.556,h*.851,18*unit,state.reverse?'#ecc184':'#d6e5c4','center',700);
    label(ctx,'BUS',w*.415,h*.899,8*unit,'#b7c6ae');
    box(ctx,w*.455,h*.895,w*.111,h*.006,2*unit,'#425640');
    box(ctx,w*.455,h*.895,w*.111*clamp(number(state.health,100)/100,0,1),h*.006,2*unit,'#acc280');
    box(ctx,w*.685,h*.814,w*.267,h*.128,5*unit,'#12291f','#63755e',2*unit);
    label(ctx,(state.routeId||'509')+'  HARBOUR LOOP',w*.706,h*.841,11*unit,'#e8d190');
    label(ctx,number(state.passengers,0)+' / '+number(state.capacity,36)+' RIDERS',w*.706,h*.881,19*unit,'#e2ebcf');
    label(ctx,number(state.stops,0)+' STOPS · LAP '+(number(state.laps,0)+1),w*.706,h*.916,9*unit,'#b9caae');
    box(ctx,w*.616,h*.862,w*.045,h*.064,4*unit,state.doorsOpen?'#b8cd86':'#354d3c','#829272',1);
    label(ctx,state.doorsOpen?'OPEN':'DOOR',w*.638,h*.894,8*unit,state.doorsOpen?'#223e2c':'#c2d4ba','center');
    box(ctx,w*.433,h*.95,w*.15,h*.033,4*unit,'#213629','#657559',1);
    label(ctx,String(state.clock||'4:00 PM'),w*.508,h*.967,13*unit,'#dee5c7','center');
    const cash=Math.floor(number(state.cash,0));
    label(ctx,'NET '+(cash<0?'−$':'$')+Math.abs(cash).toLocaleString('en-CA'),w*.933,h*.974,12*unit,cash<0?'#efad91':'#d5dfbe','right',600);
    drawWheel(ctx,w,h,state);
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
    if(Math.abs(number(state.look,0))>.8&&!rear){drawSideWindow(ctx,w,h,state);if(state.vehicleType==='bus'){ctx.beginPath();ctx.moveTo(w*.89,0);ctx.lineTo(w*.89,h*.94);ctx.strokeStyle='#c5ac5d';ctx.lineWidth=Math.max(3,w*.007);ctx.stroke();}ctx.restore();return {mirror:null};}
    if(state.vehicleType==='bus'){drawBusCockpit(ctx,w,h,state,rear);const mirror=rear?null:drawMirror(ctx,w,h);ctx.restore();return {mirror};}
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
