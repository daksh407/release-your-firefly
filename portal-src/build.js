
const SHADOWS = [], BLD_SIDE = [], BGRP = [];   // BGRP: building groups, read by the interactive layer
/* every building sits on a paved apron with a path to its nearest road, and its entrance faces that road */
const APRON = iso('#eadcc2'), APATH = iso('#e3cfae');
function nearestRoad(x, y) { let best = null; ROADS.forEach(([x1, y1, x2, y2, w]) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  const px = x1 + t * dx, py = y1 + t * dy, d = Math.hypot(x - px, y - py); if (!best || d < best.d) best = { x: px, y: py, d, w }; }); return best; }
function pave(x1, y1, x2, y2, w) { const a = P(x1, y1), c = P(x2, y2); const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(c) + w * PX, .5, w * PX), APATH); m.position.copy(a.clone().lerp(c, .5)).setY(1.55); m.rotation.y = -Math.atan2(c.z - a.z, c.x - a.x); scene.add(m); }
const SIDE = { N: [0, -1, 0], S: [0, 1, Math.PI], E: [1, 0, -Math.PI / 2], W: [-1, 0, Math.PI / 2] };
BLD.forEach(([name, x0, y0, x1, y1, floors, type]) => {
  const m = type === 'kiosk' ? 3 : 7; slab(rect(x0 - m, y0 - m, x1 + m, y1 + m), '#eadcc2', .4, 1.2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = nearestRoad(cx, cy); const dx = r.x - cx, dy = r.y - cy;
  const s = Math.abs(dx) * (y1 - y0) > Math.abs(dy) * (x1 - x0) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
  const ex = s === 'E' ? x1 + m : s === 'W' ? x0 - m : Math.max(x0 + 4, Math.min(x1 - 4, r.x)), ey = s === 'S' ? y1 + m : s === 'N' ? y0 - m : Math.max(y0 + 4, Math.min(y1 - 4, r.y));
  const rr = nearestRoad(ex, ey); if (rr.d > rr.w / 2 + 1) { const k = (rr.w / 2 + 1.5) / rr.d; pave(ex, ey, rr.x + (ex - rr.x) * k, rr.y + (ey - rr.y) * k, type === 'kiosk' ? 4 : 7); }
  BLD_SIDE.push(s); });
BLD.forEach(([name, x0, y0, x1, y1, floors, type, rot], i) => {

  const g = new THREE.Group(); g.position.copy(P((x0 + x1) / 2, (y0 + y1) / 2, 1.2)); g.rotation.y = rot * Math.PI / 2; scene.add(g); BGRP[i] = g;
  let W = (x1 - x0) * PX, D = (y1 - y0) * PX; if (rot % 2) [W, D] = [D, W]; const H = floors * FLOOR + 1;
  if (type.startsWith('hero:')) { const k = type.slice(5); HEROES[k](g, W, D, i); FOCUS[k] = g.position.clone(); SHADOWS.push([g.position.clone(), W, D, H, 0]); return; }
  FOCUS[name.split(' ')[0].toLowerCase()] = g.position.clone();
  const wall = (hh, st = 0) => iso(type === 'corbusier' ? C.creamHi : C.cream, { win: true, top: hh, seed: i * 1.37, style: st });
  if (type === 'kiosk') { bx(g, iso(C.cream), W, 4, D, 0, 2, 0); bx(g, RED, W + 2, .8, D + 2, 0, 4.4, 0); bx(g, WARM, W * .6, 2, .2, 0, 2, -D / 2 - .1, false); return; }
  if (type === 'flatroof') { bx(g, sideTop(iso('#d8d0e4', { win: true, top: H, seed: i, style: 1, glow: .5 }), iso('#e9e4f0')), W, H, D, 0, H / 2, 0); return; }
  if (type === 'redroof') { bx(g, iso('#cfc6e0'), W, H + 2, D, 0, H / 2 + 1, 0); bx(g, iso('#c4505e'), W + 1, .8, D + 1, 0, H + 2.4, 0); return; }
  if (type === 'corbusier') {
    bx(g, sideTop(wall(H * .62), iso(C.creamHi)), W, H * .62, D, 0, H * .31, 0); bx(g, sideTop(wall(H), iso(C.creamHi)), W * .5, H * .38, D * .6, -W * .18, H * .81, -D * .1);
    for (let k = 0; k < 3; k++) bx(g, iso('#1d1a33'), W * .5, .5, .3, -W * .18, H * .64 + k * 1.2, -D * .4 - .2, false);
    const t = new THREE.Group(); t.position.set(36, 0, 16); g.add(t);           // the water tank
    cyl(t, iso(C.white), 1.9, 26, 0, 13, 0, 10); const top = new THREE.Mesh(new THREE.CylinderGeometry(7, 4.5, 9, 18), iso(C.white)); top.position.y = 30; t.add(top); edges(top, t);
    return; }
  SHADOWS.push([g.position.clone(), W, D, H, g.rotation.y]);
  const roofMat = type === 'solar' ? null : iso(C.cream);
  bx(g, sideTop(wall(H, type === 'solar' ? 1 : 0), roofMat || iso(C.cream)), W, H, D, 0, H / 2, 0);
  rim(g, W + .8, 1.1, D + .8, 0, H + .55, 0);
  bx(g, iso('#f2a58e'), W + .4, 1.4, D + .4, 0, .7, 0, false);                                        // plinth
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(g, CORAL, 1.6, H + .6, 1.6, sx * (W / 2 + .1), (H + .6) / 2, sz * (D / 2 + .1), false));   // coral corner pilasters
  if (W > 24) bx(g, CORAL, 1.6, H + .6, 1.4, 0, (H + .6) / 2, -D / 2 - .3, false);
  { const [sx, sz, th] = SIDE[BLD_SIDE[i]]; const hf = (sx ? W : D) / 2, fw = sx ? D : W; const eg = new THREE.Group(); eg.rotation.y = th; g.add(eg);
    const cw = Math.min(11, fw * .32);
    bx(eg, RED, cw + 1, 1.1, 4, 0, 4.8, -hf - 2);                                                      // red entrance canopy
    [-1, 1].forEach(sg => bx(eg, RED, .9, 4.6, .9, sg * cw / 2, 2.3, -hf - 3.6, false));
    bx(eg, WARM, cw * .7, 3.4, .2, 0, 2, -hf - .12, false);                                            // glass doors
    [-1, 1].forEach(sg => bx(eg, RED, 1.2, H * .92, .9, sg * (cw / 2 + 1.6), H * .46 + .3, -hf - .45, false));   // red fins either side, full height
    bx(eg, RED, cw + 4.4, 1.6, .7, 0, H - 1, -hf - .4, false);                                         // red name band at the top
    for (let k = 0; k < 3; k++) bx(eg, iso('#eadcc2'), cw, .5, 1.2, 0, .25 + k * .5 - .5, -hf - 4.6 - k * 1.2, false); }
  if (floors >= 4 && D > 14) bx(g, sideTop(iso('#f59a86', { win: true, top: H + 3.2, seed: i + 9, style: 0 }), iso(C.coral)), 4.6, H + 3.2, 5.4, -W / 2 - 1.2, (H + 3.2) / 2, D * .15);
  for (let k = 0; k < Math.min(4, Math.floor(W / 10)); k++) bx(g, iso('#bfb3cf'), 2.4, 1.6, 2, -W * .35 + k * 6, H + 1.9, D * .3, false);
  if (type === 'solar') { const rows = Math.max(1, Math.floor(D / 6)); for (let k = 0; k < rows; k++) { const r = bx(g, iso('#2f4fd6'), W * .82, .5, 3.6, 0, H + 1.6, -D / 2 + 3.5 + k * 6, false); r.rotation.x = -.25; } }
  else if (floors >= 4) { bx(g, iso('#d4c29e'), Math.min(8, W * .3), 3, Math.min(6, D * .3), W * .22, H + 2.6, D * .2); cyl(g, iso('#2c2a3c'), 1.6, 2.6, -W * .25, H + 2.4, -D * .2, 10); }
  if (type === 'babbage') { const mur = new THREE.Mesh(new THREE.PlaneGeometry(W * .7, H * .24), muralMat); mur.rotation.y = Math.PI; mur.position.set(0, H * .2, -D / 2 - .2); g.add(mur);
    bx(g, sideTop(iso('#f3e8d0', { win: true, top: H + 3, seed: 5, style: 0 }), iso(C.cream)), W * .3, H + 3, 1.2, 0, (H + 3) / 2, -D / 2 - .6); }
  if (type === 'tesla') {
    const c1 = bx(g, RED, W * 1.12, 1, 7.5, 0, H + 1.4, -D / 2 + 1); c1.rotation.x = .18;
    const c2 = bx(g, RED, W * .7, .9, 5.5, 0, 4.8, -D / 2 - 2.4); c2.rotation.x = .12;
    bx(g, COOL, 5, H + 3, 5, W / 2 + 2.6, (H + 3) / 2, -D * .3, true);
    bx(g, iso('#7a4a3a'), W + .4, 4, D + .4, 0, 2, 0, false); }
  if (type === 'exploretorium') { const t = new THREE.Mesh(new THREE.TorusGeometry(3.6, .7, 10, 32), new THREE.MeshBasicMaterial({ color: '#ff4458' })); t.position.set(0, H * .6, -D / 2 - .8); g.add(t); bx(g, WHITE, W * .5, .9, 5.5, 0, 5.2, -D / 2 - 2.7); }
  if (type === 'galileo') {   // photos 2478–2479: white, deep stacked balconies, a curved bay, palms at the door
    for (let f = 1; f < floors; f++) bx(g, iso(C.white), W + 2.4, .6, D + 2.4, 0, f * FLOOR + .3, 0, false);
    [-1, 1].forEach(sg => bx(g, iso(C.white), .5, H, D + 2.4, sg * (W / 2 + 1.2), H / 2, 0, false));
    const bay = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, FLOOR * 3, 24, 1, false, 0, Math.PI), iso('#f3e2b8', { win: true, top: FLOOR * 3, seed: 7 })); bay.position.set(0, FLOOR * 1.5, -D / 2); g.add(bay); }
  if (type === 'ios') {       // photos 2471–2472: four floors, a dark slatted band over a glass ground floor, the iOS Development Centre sign
    bx(g, iso('#3a3546'), W + .6, 2.2, 1.2, 0, FLOOR + 1.4, -D / 2 - .6); for (let k = 0; k < 18; k++) bx(g, iso('#5a5266'), .25, 2.2, .3, -W / 2 + .5 + k * W / 17, FLOOR + 1.4, -D / 2 - 1.3, false);
    bx(g, WARM, W * .9, FLOOR * .8, .3, 0, FLOOR * .45, -D / 2 - .2, false); for (let k = 0; k < 6; k++) bx(g, iso(C.cream), 1, FLOOR, 1, -W * .42 + k * W * .168, FLOOR / 2, -D / 2 - .8, false); }
  if (type === 'fleming') {
    const curve = new THREE.Mesh(new THREE.CylinderGeometry(D * .55, D * .55, H, 24, 1, false, Math.PI * .65, Math.PI * .7), sideTop(wall(H), iso(C.cream))); curve.position.set(0, H / 2, -D * .1); g.add(curve);
    // photos 2486–2488: a white curved band wraps the first two floors over the entrance; a long fountain channel runs beside the road
    const band = new THREE.Mesh(new THREE.CylinderGeometry(D * .62, D * .62, FLOOR * 1.6, 32, 1, true, Math.PI * .62, Math.PI * .76), iso(C.white, { lit: .25 })); band.material.side = THREE.DoubleSide;
    band.position.set(0, FLOOR * 2.2, -D * .12); g.add(band);
    const ch = bx(g, iso('#4aa8f0', { lit: .45 }), W * 1.1, .9, 4, 0, .45, -D / 2 - 9); bx(g, iso(C.white), W * 1.1, 1.4, .8, 0, .7, -D / 2 - 11.2);
    for (let k = 0; k < 9; k++) { const j = new THREE.Mesh(new THREE.ConeGeometry(.3, 2.6, 6), new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: .8 })); j.position.set(-W * .45 + k * W * .11, 2, -D / 2 - 9); g.add(j); }
    // #GoGlobal (photos 2490–2491): the Centre for Global Education wing to the right of Fleming's front, red lettering on a canopy over a glass entrance
    { const gw = new THREE.Group(); gw.position.set(W / 2 + 8, 0, -D * .2); g.add(gw); const Hg = 4 * FLOOR + 1;
      bx(gw, sideTop(iso(C.cream, { win: true, top: Hg, seed: 41 }), iso(C.cream)), 16, Hg, 22, 0, Hg / 2, 0);
      bx(gw, iso('#e9e6ef'), 12, .7, 4, 0, 4.6, -12.8); bx(gw, WARM, 9, 3.6, .3, 0, 2, -11.05, false);
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#d42f3f'; x.font = '800 60px Archivo, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('#GoGlobal', 256, 50);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshBasicMaterial({ map: t })); s.rotation.y = Math.PI; s.position.set(0, 5.9, -14.85); gw.add(s); } }
});

/* ================= landscape, streets, lights and furniture, laid out on the OSM plan ================= */
const LIGHT = new THREE.Vector3(.55, 0, .55);
function inst(geo, mat, list, fn) { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length; list.forEach((p, i) => { dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); fn(p, i); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); scene.add(im); return im; }
const NIGHT_HOOKS = [];
/* ---- occupancy: nothing grows or stands on buildings, roads, parking or pitches ---- */
const BLD_R = BLD.map(b => [b[1] - 4, b[2] - 4, b[3] + 4, b[4] + 4]);
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const HARD = LOTS.concat([rect(246, 103, 368, 228), GATE_PLAZA]);
function segD(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); }
const inR = (x, y, r) => x > r[0] && x < r[2] && y > r[1] && y < r[3];
function blocked(x, y, m = 3) { if (BLD_R.some(r => inR(x, y, r)) || HARD.some(p => inPoly(x, y, p))) return true;
  if (ROADS.some(r => segD(x, y, r[0], r[1], r[2], r[3]) < r[4] / 2 + m)) return true;
  if (FOOT.some(f => f.some((p, i) => i && segD(x, y, ...f[i - 1], ...p) < 3))) return true;
  if (segD(x, y, -10, 202, 536, -212) < 40) return true;
  if (Math.hypot((x - OMEGA[0]) / 62, (y - OMEGA[1]) / 66) < 1) return true;
  if (!inPoly(x, y, ISL)) return true;
  return false; }
function polyline(pts, step, fn) { for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  for (let t = (i ? 0 : step() / 2); t < L; t += step()) fn(x1 + (x2 - x1) * t / L, y1 + (y2 - y1) * t / L, nx, ny); } }

/* ---------- trees: five species ---------- */
const TREES = { neem: [], round: [], ashoka: [], euc: [], shrub: [], tall: [] };
const clear = { tall: 11, neem: 9, round: 7, ashoka: 5, euc: 7, shrub: 3 };
const nearBld = (x, y, d) => BLD.some(b => x > b[1] - d && x < b[3] + d && y > b[2] - d && y < b[4] + d);
const put = (kind, x, y, s) => { if (blocked(x, y, kind === 'shrub' ? 1.5 : 3) || nearBld(x, y, clear[kind])) return;
  if (kind !== 'shrub' && rnd() < .12) return;                                      // natural gaps
  const v = .72 + rnd() * .62; TREES[kind].push([x + gauss() * 1.5, y + gauss() * 1.5, s * v]); };
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
/* the gate avenue and Chitkara University Rd: ashoka columns, a neem every few */
[RPL[0][1], RPL[1][1]].forEach(pts => polyline(pts, () => 7 + rnd() * 5, (x, y, nx, ny) => { for (const sg of [1, -1]) if (rnd() > .08) { const o = 11 + rnd() * 2; put(rnd() < .78 ? 'ashoka' : 'neem', x + nx * sg * o, y + ny * sg * o, .9 + rnd() * .35); } }));
/* every other road: loose rows with gaps */
RPL.slice(2).forEach(([w, pts]) => polyline(pts, () => 12 + rnd() * 16, (x, y, nx, ny) => { if (rnd() < .7) { const sg = rnd() < .5 ? 1 : -1, o = w / 2 + 6 + rnd() * 4; put(rnd() < .6 ? 'round' : 'neem', x + nx * sg * o, y + ny * sg * o, .8 + rnd() * .5); } }));
/* parks: clumps around open lawn */
function clumps(poly, n, keepC, keepR) { const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let c = 0, tries = 0; c < n && tries < 400; tries++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (!inPoly(x, y, poly)) continue; if (keepC && Math.hypot(x - keepC[0], y - keepC[1]) < keepR) continue; c++;
    const m = 2 + Math.floor(rnd() * 4); for (let i = 0; i < m; i++) { const tx = x + gauss() * 8, ty = y + gauss() * 8; if (inPoly(tx, ty, poly)) put(rnd() < .55 ? 'neem' : 'round', tx, ty, .75 + rnd() * .7); }
    for (let i = 0; i < 3; i++) { const tx = x + gauss() * 11, ty = y + gauss() * 11; if (inPoly(tx, ty, poly)) put('shrub', tx, ty, .8 + rnd() * .5); } } }
/* Alpha Zone: a ring of big trees around one open lawn, ashoka columns along the avenue, single trees in round beds */
const ALPHA_C = ALPHA.reduce((a, p) => [a[0] + p[0] / ALPHA.length, a[1] + p[1] / ALPHA.length], [0, 0]);
const inset = (p, d) => { const dx = ALPHA_C[0] - p[0], dy = ALPHA_C[1] - p[1], L = Math.hypot(dx, dy); return [p[0] + dx / L * d, p[1] + dy / L * d]; };
for (let i = 0; i < ALPHA.length; i++) { const a = ALPHA[i], c = ALPHA[(i + 1) % ALPHA.length], av = a[0] >= 432 && c[0] >= 432 && c[1] > a[1] && a[1] < 112;
  polyline([inset(a, 5), inset(c, 5)], () => av ? 5 + rnd() * 1.5 : 6 + rnd() * 5, (x, y, nx, ny) => { if (av) put('ashoka', x, y, 1.05 + rnd() * .2); else { put(rnd() < .55 ? 'tall' : 'neem', x + gauss() * 2, y + gauss() * 2, .85 + rnd() * .35); if (rnd() < .5) put('shrub', x + nx * 6, y + ny * 6, .8); } }); }
const ALPHA_BEDS = [[442, 61], [457, 86], [474, 97], [461, 109], [480, 114], [436, 88]];
ALPHA_BEDS.forEach(([x, y]) => TREES.neem.push([x, y, 1.15 + rnd() * .25]));
/* the tall forest left of the avenue when you drive in (north-east side), from the gate to Babbage */
polyline([[420, -30], [452, 0], [505, 58]], () => 3 + rnd() * 2, (x, y, nx, ny) => { for (let k = 0; k < 4; k++) { const o = -(13 + k * 6 + rnd() * 3); put(k === 0 && rnd() < .5 ? 'ashoka' : 'tall', x + nx * o, y + ny * o, .95 + rnd() * .35); } });
/* hedge and ashoka line on the lawn side */
polyline([[436, 7], [463, 37], [492, 69], [517, 96]], () => 2.2, (x, y, nx, ny) => put('shrub', x + nx * 10, y + ny * 10, 1.1));
/* a few tall trees behind the Admission Block */
for (let i = 0; i < 25; i++) { const x = 360 + rnd() * 40, y = -20 + rnd() * 60; if (x + y * .3 < 405) put('tall', x, y, .9 + rnd() * .4); }
clumps(rect(396, 193, 441, 229), 6, null, 0);
clumps(rect(456, 246, 521, 290), 4, [488, 268], 18);
clumps(rect(685, 300, 716, 434), 14, null, 0);
for (let a = 0; a < 6.28; a += .24 + rnd() * .2) put(rnd() < .5 ? 'neem' : 'round', OMEGA[0] + Math.cos(a) * (66 + rnd() * 6), OMEGA[1] + Math.sin(a) * (70 + rnd() * 6), .9 + rnd() * .4);
/* NH-7 green belt on the campus side */
polyline([[30, 232], [240, 84], [380, -18]], () => 5 + rnd() * 5, (x, y, nx, ny) => put(rnd() < .55 ? 'tall' : 'ashoka', x + nx * (6 + rnd() * 6), y + ny * (6 + rnd() * 6), .85 + rnd() * .3));
/* eucalyptus plantations */
PLANTS.forEach(([x0, y0, x1, y1]) => { for (let y = y0 + 7; y < y1 - 4; y += 13) for (let x = x0 + 7 + (Math.floor(y / 13) % 2) * 6; x < x1 - 4; x += 13) if (rnd() < .72) put('euc', x + gauss() * 3, y + gauss() * 3, .8 + rnd() * .55); });
/* canal belt */
polyline(CANAL, () => 6 + rnd() * 8, (x, y, nx, ny) => { const o = (rnd() < .5 ? 1 : -1) * (9 + rnd() * 16); put(rnd() < .4 ? 'neem' : rnd() < .6 ? 'round' : 'euc', x + nx * o, y + ny * o, .7 + rnd() * .6); });
/* hedges along building fronts */
BLD.forEach(([n, x0, y0, x1, y1, f, type]) => { if (type === 'kiosk' || f < 3) return; for (let x = x0 + 2; x < x1 - 2; x += 3 + rnd() * 3) if (rnd() < .55) put('shrub', x, y0 - 6 - rnd() * 2, .6 + rnd() * .35); });

const icos = new THREE.IcosahedronGeometry(1, 1);
const TRUNK = iso(C.wood), EUCT = iso('#e6dcc6');
const greens = (list, cols, mesh) => list.forEach((p, i) => mesh.setColorAt(i, new THREE.Color(cols[Math.floor(rnd() * cols.length)]).offsetHSL((rnd() - .5) * .05, (rnd() - .5) * .12, (rnd() - .5) * .1)));
{ const L = TREES.neem; inst(new THREE.CylinderGeometry(.4, .6, 1, 6), TRUNK, L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 2.4 * s)); dummy.scale.set(s * 1.3, 4.8 * s, s * 1.3); dummy.rotation.set(0, 0, 0); });
  const a = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 6.2 * s)); dummy.scale.set(4.6 * s * (.8 + rnd() * .4), 2.6 * s * (.8 + rnd() * .5), 4.2 * s * (.8 + rnd() * .4)); dummy.rotation.set(0, rnd() * 6, 0); });
  const b = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x - 1.2, y + .8, 1.8 + 8.2 * s)); dummy.scale.set(2.8 * s, 2 * s, 2.8 * s); dummy.rotation.set(0, rnd() * 6, 0); });
  const c = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x + 1.8, y - 1, 1.8 + 7.3 * s)); dummy.scale.set(2.4 * s, 1.8 * s, 2.4 * s); dummy.rotation.set(0, rnd() * 6, 0); });
  greens(L, ['#5cc44a', '#4fb84a', '#66cc50'], a); greens(L, ['#7ad957', '#86de5e'], b); greens(L, ['#6fd64e', '#7ad957'], c); }
{ const L = TREES.round; inst(new THREE.CylinderGeometry(.3, .45, 1, 6), TRUNK, L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 1.8 * s)); dummy.scale.set(s, 3.6 * s, s); dummy.rotation.set(0, 0, 0); });
  const a = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 5.2 * s)); { const w = 2.9 * s * (.8 + rnd() * .4); dummy.scale.set(w, 3 * s * (.8 + rnd() * .45), w); } dummy.rotation.set(0, rnd() * 6, 0); });
  greens(L, ['#8be05c', '#9be86a', '#7ad957'], a); }
{ const L = TREES.ashoka; inst(new THREE.CylinderGeometry(.25, .35, 1, 5), TRUNK, L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 1 * s)); dummy.scale.set(s, 2 * s, s); dummy.rotation.set(0, 0, 0); });
  const a = inst(new THREE.ConeGeometry(1, 1, 7), iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.8 + 8 * s)); dummy.scale.set(2.1 * s * (.8 + rnd() * .4), 13 * s * (.75 + rnd() * .5), 2.1 * s * (.8 + rnd() * .4)); dummy.rotation.set(0, rnd() * 6, 0); });
  greens(L, ['#3f9e46', '#358f3e', '#47a94c'], a); }
{ const L = TREES.euc; inst(new THREE.CylinderGeometry(.22, .34, 1, 5), EUCT, L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.2 + 6 * s)); dummy.scale.set(s, 12 * s, s); dummy.rotation.set((rnd() - .5) * .08, 0, (rnd() - .5) * .08); });
  const a = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.2 + 13 * s)); dummy.scale.set(4 * s, 4.6 * s, 4 * s); dummy.rotation.set(rnd(), rnd() * 6, 0); });
  greens(L, ['#7fcf62', '#6fc157', '#8ad86a', '#62b450'], a); }
/* tall: silver oak / eucalyptus giants, twice the height of the rest */
{ const L = TREES.tall; inst(new THREE.CylinderGeometry(.35, .55, 1, 6), EUCT, L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.6 + 9 * s)); dummy.scale.set(s * 1.2, 18 * s, s * 1.2); });
  const a = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 1.6 + 17 * s)); { const w = 4.2 * s * (.75 + rnd() * .5); dummy.scale.set(w, 7.5 * s * (.75 + rnd() * .5), w * (.85 + rnd() * .3)); } dummy.rotation.set(0, rnd() * 6, 0); });
  const b2 = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x + .8, y - .6, 1.6 + 22.5 * s)); dummy.scale.set(2.8 * s, 4.4 * s, 2.8 * s); dummy.rotation.set(0, rnd() * 6, 0); });
  greens(L, ['#3f9e46', '#4aa84c', '#368f42'], a); greens(L, ['#52b356', '#5cbc5a'], b2); }
{ const L = TREES.shrub; const a = inst(icos, iso('#ffffff'), L, ([x, y, s]) => { dummy.position.copy(P(x, y, 2.6 * s)); dummy.scale.set(1.8 * s, 1.3 * s, 1.8 * s); dummy.rotation.set(0, rnd() * 6, 0); });
  greens(L, ['#4fb84a', '#5cc44a', '#3fa040'], a); }
const ROUND = [].concat(TREES.neem.map(([x, y, s]) => [x, y, s * 1.4]), TREES.round, TREES.ashoka.map(([x, y, s]) => [x, y, s * .6]), TREES.euc.map(([x, y, s]) => [x, y, s * .8]), TREES.tall.map(([x, y, s]) => [x, y, s * 1.6])), EUC = [];
/* ---------- streets ---------- */
const PAVEMENT = iso('#f4cfb4', { lit: .12 }), LINE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
ROADS.forEach(([x1, y1, x2, y2, w]) => { const a = P(x1, y1), b = P(x2, y2), len = a.distanceTo(b), ang = -Math.atan2(b.z - a.z, b.x - a.x), mid = a.clone().lerp(b, .5);
  const n = new THREE.Vector3(Math.sin(-ang), 0, Math.cos(-ang)).multiplyScalar(-1);
  const nearGate = Math.hypot((x1 + x2) / 2 - GATE_C[0], (y1 + y2) / 2 - GATE_C[1]) < 38;
  if (!nearGate) for (const sg of [1, -1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(len, .9, 2.4), PAVEMENT); m.position.copy(mid).addScaledVector(n, sg * (w * PX / 2 + 1.2)).setY(1.75); m.rotation.y = ang; scene.add(m); }
  if (nearGate) {} else if (w >= 16) { [-.35, .35].forEach(o => { const c = new THREE.Mesh(new THREE.BoxGeometry(len, .1, .3), new THREE.MeshBasicMaterial({ color: '#ffcc2e' })); c.position.copy(mid).addScaledVector(n, o).setY(1.8); c.rotation.y = ang; scene.add(c); });
    [-1, 1].forEach(sg => { for (let t = 4; t < len - 4; t += 7) { const d = new THREE.Mesh(new THREE.BoxGeometry(3.2, .1, .4), LINE); d.position.copy(a.clone().lerp(b, t / len)).addScaledVector(n, sg * w * PX / 4).setY(1.8); d.rotation.y = ang; scene.add(d); } }); }
  else if (w >= 11) for (let t = 4; t < len - 4; t += 7) { const d = new THREE.Mesh(new THREE.BoxGeometry(3.2, .1, .45), LINE); d.position.copy(a.clone().lerp(b, t / len)).setY(1.8); d.rotation.y = ang; scene.add(d); } });
function zebra(x, y, ang, w) { const c = P(x, y); for (let k = -3; k <= 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, .12, w), LINE); s.position.set(c.x + Math.cos(ang) * k * 2.1, 1.82, c.z - Math.sin(ang) * k * 2.1); s.rotation.y = ang; scene.add(s); } }
zebra(528, 130, 0, 10); zebra(530, 215, 0, 10); zebra(410, 232, Math.PI / 2, 9); zebra(531, 310, 0, 10); zebra(425, -6, -.84, 11); zebra(386, 300, Math.PI / 2, 9);
/* ================= the main gate, modelled from the gate photo: wide white canopy, stone pillars, red logo column, two lanes ================= */
function textTex(txt, w, h, bg, fg, font) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 2); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
{ const g = new THREE.Group(); g.position.copy(P(...GATE_C, 1.2)); g.rotation.y = HW.th; scene.add(g); FOCUS.gate = g.position.clone();
  const STONE = iso('#e7d6b6'), STONE2 = iso('#d6c09a'), CANOPY = iso('#f6f2e6', { lit: .35 }), DARKW = iso('#2c2a3c'), WOODC = iso('#a06a3e', { lit: .2 });
  // forecourt: two-tone tiled plaza, lane markings, central island
  bx(g, iso('#b9bfd4'), 80, .5, 36, 0, .25, -8, false);
  for (let k = -7; k <= 7; k++) bx(g, iso('#a7aec7'), 2.4, .52, 36, k * 5.3, .27, -8, false);
  bx(g, iso('#5d6894'), 22, .56, 36, 0, .29, -8, false);                                   // driveway through the plaza
  for (let k = 0; k < 6; k++) bx(g, LINE, .5, .1, 3, -5.5, .6, -22 + k * 6, false), bx(g, LINE, .5, .1, 3, 5.5, .6, -22 + k * 6, false);
  // central red logo column on its planter island
  bx(g, STONE2, 5.6, 1, 10, 0, .5, 0); const isl = []; for (let k = 0; k < 10; k++) isl.push([(rnd() - .5) * 4.4, (rnd() - .5) * 8.4]);
  isl.forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 0), iso(['#5cc44a', '#ef4a55', '#ffcc2e'][Math.floor(rnd() * 3)])); s.position.set(x, 1.4, z); g.add(s); });
  bx(g, RED, 4.2, 7.6, 4.2, 0, 3.8 + .9, 0);                                                         // red logo box under the canopy
  { const lt = textTex('CU', 128, 128, '#ef4a55', '#fff4de', '900 72px Archivo, Arial Black, sans-serif'); [[-2.12, Math.PI], [2.12, 0]].forEach(([z, ry]) => {
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: lt })); lg.position.set(0, 6.2, z); lg.rotation.y = ry; g.add(lg); }); }
  [-1, 1].forEach(sg => { const px = sg * 12.5; bx(g, STONE, 3.6, 9, 3.6, px, 4.5, 0); bx(g, STONE, 3.6, 9, 3.6, sg * 3.4, 4.5, 0); });   // square stone piers either side of the lanes
  // one long flat canopy with turned-down ends, thin white posts at the tips
  bx(g, CANOPY, 44, 1, 8, 0, 9.5, 0); bx(g, CANOPY, 44, 1.4, .6, 0, 9.3, -3.9); bx(g, CANOPY, 44, 1.4, .6, 0, 9.3, 3.9);
  [-1, 1].forEach(sg => { const e = bx(g, CANOPY, 3, 1, 8, sg * 23.2, 8.9, 0); e.rotation.z = sg * .35; bx(g, iso('#f6f2e6'), .5, 8.6, .5, sg * 21, 4.3, -3, false); bx(g, iso('#f6f2e6'), .5, 8.6, .5, sg * 21, 4.3, 3, false); });
  const nameT = textTex('CHITKARA  UNIVERSITY', 1024, 64, '#f6f2e6', '#2c2a3c', '700 40px Archivo, Arial, sans-serif');
  [[-4.25, Math.PI, 1], [4.25, 0, -1]].forEach(([z, ry, f]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.1), new THREE.MeshBasicMaterial({ map: nameT })); s.position.set(f * 10, 9.3, z); s.rotation.y = ry; g.add(s);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: textTex('चितकारा विश्वविद्यालय', 512, 64, '#f6f2e6', '#2c2a3c', '600 34px sans-serif') })); s2.position.set(-f * 11, 9.3, z); s2.rotation.y = ry; g.add(s2); });
  for (let k = -4; k <= 4; k++) cyl(g, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), .3, .2, k * 4.8, 8.95, 0, 8);
  // sliding gates in both lanes (dark frame, white bars, pulled half open)
  [-1, 1].forEach(sg => { const gx = sg * 6.4; bx(g, DARKW, 8.6, .5, .5, gx + sg * 2.5, 3, -.5, false); bx(g, DARKW, 8.6, .5, .5, gx + sg * 2.5, .8, -.5, false);
    for (let k = 0; k < 9; k++) bx(g, iso('#f6f2e6'), .25, 2.2, .3, gx + sg * 2.5 - 4 + k, 1.9, -.5, false); });
  // guard rooms in the wings: warm wood cladding, lit windows
  [-1, 1].forEach(sg => { const wx = sg * 16.6; bx(g, WOODC, 7.2, 6.6, 6, wx, 3.3, .5); bx(g, iso('#2c2a3c', { lit: .1 }), 5.6, 4.6, .2, wx, 3.3, -2.55, false); bx(g, WARM, 2.4, 1.4, .25, wx, 4.2, -2.6, false); });
  // boundary walls: stone panels with a cap, running off both sides
  [-1, 1].forEach(sg => { for (let k = 0; k < 9; k++) { const wx = sg * (25 + k * 7); bx(g, STONE, 6.6, 4.6, 2, wx, 2.3, 2); bx(g, STONE2, 1.6, 5.4, 2.6, wx + sg * 3.5, 2.7, 2); bx(g, iso('#cdbb96'), 7, .6, 2.6, wx, 4.8, 2, false); } });
  // three flagpoles and planters on the forecourt
  [-26, -30, -34].forEach((x, k) => { cyl(g, iso('#d8d8e0'), .18, 14, x, 7, -18, 6); const f = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, .1), iso(['#ff9933', '#ffffff', '#ef4a55'][k])); f.position.set(x + 1.8, 12.6, -18); g.add(f); });
  [-24, -10, 10, 24].forEach(x => { bx(g, STONE2, 4, 1.2, 4, x, .6, -24); const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), iso('#5cc44a')); t.position.set(x, 2.4, -24); g.add(t); });
  // tall lamp posts flanking the forecourt
  [-36, -16, 16, 36].forEach(x => { cyl(g, iso('#3a3758'), .25, 10, x, 5, -12, 6); bx(g, iso('#3a3758'), 3, .4, .6, x, 10, -12, false); cyl(g, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), .55, .4, x - 1.2, 9.7, -12, 8); cyl(g, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), .55, .4, x + 1.2, 9.7, -12, 8); });
  SHADOWS.push([g.position.clone(), 46, 8, 10, HW.th]);
}

/* ================= sports block, as on the satellite: football ground, tennis/pickleball, basketball, volleyball ================= */
function court(x0, y0, x1, y1, surf, lineC, kind, rot = 0) {
  const a = P(x0, y0), b = P(x1, y1), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, W = Math.abs(b.x - a.x), D = Math.abs(b.z - a.z);
  const g = new THREE.Group(); g.position.set(cx, 1.8, cz); scene.add(g);
  bx(g, iso(surf, { lit: .15 }), W, .5, D, 0, 0, 0, false);
  const L = new THREE.MeshBasicMaterial({ color: lineC }), ln = (w, d, x, z) => bx(g, L, w, .1, d, x, .3, z, false);
  const box4 = (w, d, x = 0, z = 0) => { ln(w, .25, x, z - d / 2); ln(w, .25, x, z + d / 2); ln(.25, d, x - w / 2, z); ln(.25, d, x + w / 2, z); };
  if (kind === 'football') { box4(W - 4, D - 4); ln(W - 4, .25, 0, 0); const r = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.9, 32).rotateX(-Math.PI / 2), L); r.position.y = .3; g.add(r);
    [-1, 1].forEach(s => { box4(18, 8, 0, s * (D / 2 - 6)); box4(8, 3, 0, s * (D / 2 - 3.5)); const gx = new THREE.Group(); gx.position.set(0, 0, s * (D / 2 - 2)); g.add(gx);
      bx(gx, iso('#ffffff'), .35, 2.6, .35, -3.6, 1.3, 0, false); bx(gx, iso('#ffffff'), .35, 2.6, .35, 3.6, 1.3, 0, false); bx(gx, iso('#ffffff'), 7.6, .35, .35, 0, 2.6, 0, false); });
    for (let k = 0; k < 8; k++) bx(g, iso(k % 2 ? '#5fb84a' : '#6fc94e'), W - 4, .52, (D - 4) / 8, 0, .02, -D / 2 + 2 + (k + .5) * (D - 4) / 8, false); }
  if (kind === 'basketball') { const n = 2, cw = W / n; for (let i = 0; i < n; i++) { const x = -W / 2 + cw * (i + .5); bx(g, iso('#3a63c9', { lit: .15 }), cw - 3, .52, D - 3, x, .02, 0, false); box4(cw - 4, D - 4, x); ln(cw - 4, .25, x, 0);
      const c = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.65, 24).rotateX(-Math.PI / 2), L); c.position.set(x, .3, 0); g.add(c);
      [-1, 1].forEach(s => { const k = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.65, 24, 1, s > 0 ? Math.PI : 0, Math.PI).rotateX(-Math.PI / 2), L); k.position.set(x, .3, s * (D / 2 - 2)); g.add(k);
        bx(g, iso('#d84a3a'), 4.6, .53, 5.8, x, .03, s * (D / 2 - 4.9), false); cyl(g, iso('#3a3758'), .2, 4.2, x, 2.1, s * (D / 2 - .6), 6); bx(g, iso('#ffffff'), 2, 1.3, .15, x, 4, s * (D / 2 - 1.2), false);
        const h = new THREE.Mesh(new THREE.TorusGeometry(.4, .07, 6, 14).rotateX(Math.PI / 2), iso('#ff7a2e')); h.position.set(x, 3.6, s * (D / 2 - 1.8)); g.add(h); }); } }
  if (kind === 'tennis') { const n = 2, cw = W / n; for (let i = 0; i < n; i++) { const x = -W / 2 + cw * (i + .5); box4(cw - 3, D - 5, x); ln(.25, D - 5, x, 0); ln(cw - 3, .25, x, -D / 4); ln(cw - 3, .25, x, D / 4);
      bx(g, iso('#f6f2e6'), cw - 2, 1, .12, x, .8, 0, false); [-1, 1].forEach(s => cyl(g, iso('#3a3758'), .12, 1.2, x + s * (cw / 2 - 1), .8, 0, 5)); } }
  if (kind === 'pickleball') { const n = 2, cw = W / n; for (let i = 0; i < n; i++) { const x = -W / 2 + cw * (i + .5); bx(g, iso('#3e8fd6', { lit: .15 }), cw - 2, .52, D - 3, x, .02, 0, false); box4(cw - 3, D - 4, x); ln(cw - 3, .25, x, -2.2); ln(cw - 3, .25, x, 2.2); ln(.25, D - 4, x, 0);
      bx(g, iso('#f6f2e6'), cw - 2, .9, .12, x, .7, 0, false); } }
  if (kind === 'volleyball') { box4(W - 3, D - 4); ln(W - 3, .25, 0, 0); [-1, 1].forEach(s => cyl(g, iso('#3a3758'), .15, 3, s * (W / 2 - 1), 1.5, 0, 6)); bx(g, iso('#f6f2e6'), W - 2, 1, .12, 0, 2.5, 0, false); }
  if (kind !== 'football') { // chain-link fence: posts and rails
    const H = 4, F = iso('#2f3a5c'); [[W, 0, -D / 2], [W, 0, D / 2], [D, 1, -W / 2], [D, 1, W / 2]].forEach(([len, side, off]) => { for (let t = -len / 2; t <= len / 2; t += 4) bx(g, F, .2, H, .2, side ? off : t, H / 2, side ? t : off, false);
      bx(g, F, side ? .15 : len, .15, side ? len : .15, side ? off : 0, H, side ? 0 : off, false); bx(g, new THREE.MeshBasicMaterial({ color: '#3a4670', transparent: true, opacity: .18, depthWrite: false }), side ? .05 : len, H, side ? len : .05, side ? off : 0, H / 2, side ? 0 : off, false); }); }
  return g;
}
FOCUS.sports = P(305, 168); FOCUS.alpha = P(462, 82); court(253, 108, 331, 175, '#5fb84a', '#ffffff', 'football');
court(250, 177, 273, 223, '#3f8a54', '#ffffff', 'tennis');
court(273, 177, 319, 223, '#c4503e', '#ffffff', 'basketball');
court(319, 177, 340, 223, '#8d96b4', '#ffffff', 'pickleball');
court(341, 180, 363, 222, '#e7c98c', '#ffffff', 'volleyball');
/* floodlight masts at the four corners of the sports block */
[[251, 106], [333, 106], [251, 225], [365, 225]].forEach(([x, y]) => { const p = P(x, y); cyl(scene, iso('#3a3758'), .35, 18, p.x, 10.9, p.z, 6); bx(scene, iso('#3a3758'), 4.4, 2.2, .6, p.x, 20, p.z, false);
  for (let k = 0; k < 4; k++) bx(scene, new THREE.MeshBasicMaterial({ color: '#fff4de' }), .9, .9, .2, p.x - 1.5 + k, 20, p.z + .4, false); LAMPS_EXTRA.push([x, y]); });

/* footpaths */
const WALKWAY = iso('#f2b99a', { lit: .22 });
function walk(pts, w = 3) { for (let i = 0; i < pts.length - 1; i++) { const a = P(...pts[i]), b = P(...pts[i + 1]); const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b) + w * .6, .35, w), WALKWAY); m.position.copy(a.clone().lerp(b, .5)).setY(1.95); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(m); } }
const ring = (cx, cy, rx, ry, n = 28) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * 6.283; p.push([cx + Math.cos(a) * rx * (1 + .08 * Math.sin(a * 3)), cy + Math.sin(a) * ry * (1 + .08 * Math.cos(a * 2))]); } return p; };
FOOT.forEach(f => walk(f, 4));
walk(ALPHA.map(p => inset(p, 11)).concat([inset(ALPHA[0], 11)]), 3.4); walk([[421, 30], inset([432, 20], 11)], 3.4); walk([[511, 130], inset([522, 141], 11)], 3.4);
walk(ring(418, 211, 15, 11, 18), 2.6); walk([[398, 211], [440, 211]], 2.4);
walk(ring(488, 268, 22, 14, 20), 2.6); walk([[463, 298], [488, 268], [488, 246]], 3);
/* open-air stage in the south-west corner of Alpha Zone (OSM): a raised half-round platform with a curved shell, facing the open lawn */
{ const g = new THREE.Group(); g.position.copy(P(415, 131, 1.9)); g.rotation.y = Math.atan2(-(86 - 131), (456 - 415)) - Math.PI / 2; scene.add(g);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1.6, 32, 1, false, -Math.PI / 2, Math.PI), iso('#e9dcc4')); plat.position.y = .8; g.add(plat); edges(plat, g);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, .3, 32, 1, false, -Math.PI / 2, Math.PI), iso('#8a5a36', { lit: .2 })); top.position.y = 1.7; g.add(top);
  for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(11.6 + k * 1.2, 11.6 + k * 1.2, .55, 32, 1, true, -Math.PI / 2, Math.PI), iso('#e9dcc4')); st.position.y = .28 + (2 - k) * .5; g.add(st); }
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(10.6, 10.6, 9, 32, 1, true, Math.PI / 2, Math.PI), iso('#f6f2e6', { lit: .3 })); shell.material.side = THREE.DoubleSide; shell.position.y = 6.2; g.add(shell); edges(shell, g);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(10.6, .45, 6, 32, Math.PI), RED); rim.rotation.x = -Math.PI / 2; rim.rotation.z = Math.PI; rim.position.y = 10.7; g.add(rim);
  for (let k = 0; k < 7; k++) { const a = Math.PI / 2 + k / 6 * Math.PI; cyl(g, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), .4, .4, Math.cos(a) * 9.6, 10.1, Math.sin(a) * 9.6, 6); }
  [-9, 9].forEach(x => { bx(g, iso('#2c2a3c'), 1.6, 2.6, 1.4, x, 3.1, 2, false); }); }
/* round fountain plaza at the south-east corner of Alpha Zone */
function fountain(x, y, R0) { const p = P(x, y); cyl(scene, iso('#e3cfae', { lit: .15 }), R0, .5, p.x, 2, p.z, 32); cyl(scene, iso('#e9dcc4'), R0 * .62, 1.2, p.x, 2.5, p.z, 28);
  cyl(scene, iso('#4aa8f0', { lit: .45 }), R0 * .56, 1.25, p.x, 2.55, p.z, 28); cyl(scene, iso('#e9dcc4'), R0 * .14, 2.6, p.x, 3.6, p.z, 12); cyl(scene, iso('#e9dcc4'), R0 * .3, .4, p.x, 4.9, p.z, 16);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(R0 * .12, 4, 10), new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: .8 })); jet.position.set(p.x, 7, p.z); scene.add(jet);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, j = new THREE.Mesh(new THREE.ConeGeometry(.25, 2.4, 6), jet.material); j.position.set(p.x + Math.cos(a) * R0 * .42, 4.2, p.z + Math.sin(a) * R0 * .42); scene.add(j); } }
fountain(511, 130, 9); fountain(488, 268, 7); fountain(424, 32, 6);
{ const c = [424, 32]; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, p = P(c[0] + Math.cos(a) * 12, c[1] + Math.sin(a) * 12); const bed = bx(scene, iso(k % 2 ? '#ef4a55' : '#ffcc2e', { lit: .2 }), 6, .6, 2.4, p.x, 2.2, p.z, false); bed.rotation.y = -a; } }
/* covered walkways: shade-net canopies on steel frames over the pedestrian street and the Turing walk */
const NET = new THREE.MeshBasicMaterial({ color: '#4fa86a', transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }), STEEL = iso('#e9e6ef');
function shadeWalk(pts, w = 6, h = 5.5) { for (let i = 0; i < pts.length - 1; i++) { const a = P(...pts[i]), c = P(...pts[i + 1]), L = a.distanceTo(c), ang = -Math.atan2(c.z - a.z, c.x - a.x);
  const g = new THREE.Group(); g.position.copy(a.clone().lerp(c, .5)).setY(1.9); g.rotation.y = ang; scene.add(g);
  for (let t = -L / 2; t <= L / 2; t += 5) { [-1, 1].forEach(s => bx(g, STEEL, .3, h, .3, t, h / 2, s * w / 2, false)); const arch = new THREE.Mesh(new THREE.TorusGeometry(w / 2, .15, 4, 12, Math.PI), STEEL); arch.position.set(t, h, 0); arch.rotation.y = Math.PI / 2; g.add(arch); }
  const net = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, L, 12, 1, true, 0, Math.PI), NET); net.rotation.z = Math.PI / 2; net.rotation.y = 0; net.position.y = h; g.add(net); } }
/* creeper tunnels (photos 2476, 2477, 2480): arched steel hoops smothered in green, the long walk from Newton to Square One with Galileo on the right */
function creeper(pts, w = 6, h = 5) { const LEAF = iso('#3f9e46'), LEAF2 = iso('#5cbc5a'); for (let i = 0; i < pts.length - 1; i++) { const a = P(...pts[i]), c = P(...pts[i + 1]), L = a.distanceTo(c), ang = -Math.atan2(c.z - a.z, c.x - a.x);
  const g = new THREE.Group(); g.position.copy(a.clone().lerp(c, .5)).setY(1.9); g.rotation.y = ang; scene.add(g);
  bx(g, iso('#cfc3a8'), L, .3, w - .6, 0, .1, 0, false);
  for (let t = -L / 2; t <= L / 2; t += 3.2) { const arch = new THREE.Mesh(new THREE.TorusGeometry(w / 2, .55, 5, 10, Math.PI), t % 6.4 < 3.2 ? LEAF : LEAF2); arch.position.set(t, h - w / 2, 0); arch.rotation.y = Math.PI / 2; g.add(arch);
    [-1, 1].forEach(s => bx(g, iso('#e9e6ef'), .25, h - w / 2, .25, t, (h - w / 2) / 2, s * w / 2, false)); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + .5, w / 2 + .5, L, 10, 1, true, 0, Math.PI), LEAF); top.material = LEAF; top.rotation.z = Math.PI / 2; top.position.y = h - w / 2; g.add(top);
  [-1, 1].forEach(s => { bx(g, iso('#3a8f45'), L, 1, .9, 0, .5, s * (w / 2 + 1), false); }); } }
creeper([[446, 190], [446, 300], [462, 326]], 6.5); creeper([[389, 160], [362, 150]], 5);
shadeWalk(FOOT[4], 7);
/* tensile sails over the bus parking */
for (let k = 0; k < 6; k++) { const x = 400 + k * 22, p = P(x, 398); const g = new THREE.Group(); g.position.set(p.x, 1.9, p.z); scene.add(g);
  [[-9, -8], [9, -8], [-9, 8], [9, 8]].forEach(([a, c], i) => bx(g, STEEL, .35, i % 2 ? 9 : 6.5, .35, a, (i % 2 ? 9 : 6.5) / 2, c, false));
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(19, 17, 1, 1), new THREE.MeshBasicMaterial({ color: k % 2 ? '#f6f2e6' : '#ef4a55', side: THREE.DoubleSide, transparent: true, opacity: .9 }));
  sail.rotation.x = -Math.PI / 2; sail.rotation.y = .12 * (k % 2 ? 1 : -1); sail.position.y = 7.6; g.add(sail); }
/* gazebo in Chitkara Woods */
{ const g = new THREE.Group(); g.position.copy(P(418, 211, 1.9)); scene.add(g);
  cyl(g, iso('#f2b99a'), 5.4, .8, 0, .4, 0, 8); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; cyl(g, iso(C.white), .3, 5, Math.cos(a) * 4.5, 3, Math.sin(a) * 4.5, 5); }
  const r = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3.4, 8), iso('#8a5a36')); r.position.y = 7.2; g.add(r); edges(r, g); }
const FLOW = []; ALPHA_BEDS.forEach(([x, y]) => { for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, r = 3.2 + rnd() * .8; FLOW.push([x + Math.cos(a) * r / PX, y + Math.sin(a) * r / PX]); } });
for (let i = 0; i < 30; i++) FLOW.push([466 + rnd() * 50, 293 + rnd() * 2]);
const fl = inst(new THREE.BoxGeometry(.6, .6, .6), iso('#ffffff'), FLOW, ([x, y]) => { dummy.position.copy(P(x, y, 2.7)); dummy.rotation.set(0, rnd(), 0); dummy.scale.setScalar(1); }); FLOW.forEach((p, i) => fl.setColorAt(i, new THREE.Color(['#ef4a55', '#ffcc2e', '#fff4de', '#ff8fb1'][i % 4])));

/* ---------- shadows ---------- */
const SHMAT = new THREE.MeshBasicMaterial({ color: '#1d3a6a', transparent: true, opacity: .18, depthWrite: false });
function hull(pts) { pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); }
SHADOWS.forEach(([c, W, D, H, r]) => { const cs = Math.abs(Math.cos(r)) > .5; const w = cs ? W : D, d = cs ? D : W; const off = LIGHT.clone().multiplyScalar(H * .55);
  const base = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]; const pts = hull(base.concat(base.map(([x, z]) => [x + off.x, z + off.z])));
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, SHMAT); m.position.set(c.x, 1.95, c.z); m.renderOrder = 1; scene.add(m); });
inst(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), SHMAT, ROUND, ([x, y, s]) => { const p = P(x, y, 1.96); dummy.position.set(p.x + 3 * s, 1.96, p.z + 3 * s); dummy.scale.set(3.4 * s, 1, 2.6 * s); dummy.rotation.set(0, -.78, 0); });

/* ---------- warm lights everywhere: street lamps on every road, path lamps in the parks, bollards ---------- */
const LAMPS = [], BOLL = [];
RPL.forEach(([w, pts], ri) => { let side = 1; polyline(pts, () => 15 + rnd() * 4, (x, y, nx, ny) => { side = ri < 2 ? side : -side; for (const sg of (ri < 2 ? [1, -1] : [side])) { const o = w / 2 + 3; const lx = x + nx * sg * o, ly = y + ny * sg * o; if (!BLD_R.some(r => inR(lx, ly, r)) && !HARD.slice(-2).some(p => inPoly(lx, ly, p))) LAMPS.push([lx, ly]); } }); });
FOOT.forEach(f => polyline(f, () => 12, (x, y, nx, ny) => BOLL.push([x + nx * 3.5, y + ny * 3.5])));
[ALPHA.map(p => inset(p, 11)), ring(418, 211, 15, 11, 8), ring(488, 268, 22, 14, 10)].forEach(r => r.slice(0, -1).forEach(([x, y]) => BOLL.push([x, y])));
LAMPS.push(...LAMPS_EXTRA.map(([x, y]) => [x + 2, y + 2]));
for (let a = 0; a < 6.28; a += .4) LAMPS.push([OMEGA[0] + Math.cos(a) * 62, OMEGA[1] + Math.sin(a) * 66]);
const lampHeadMat = new THREE.MeshBasicMaterial({ color: '#d8d2c4' });
inst(new THREE.CylinderGeometry(.2, .28, 7, 5), iso('#3a3758'), LAMPS, ([x, y]) => { dummy.position.copy(P(x, y, 5.4)); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); });
inst(new THREE.BoxGeometry(1.8, .5, .9), iso('#3a3758'), LAMPS, ([x, y]) => { dummy.position.copy(P(x, y, 8.9)); });
inst(new THREE.SphereGeometry(.65, 8, 6), lampHeadMat, LAMPS, ([x, y]) => { dummy.position.copy(P(x, y, 8.4)); });
inst(new THREE.CylinderGeometry(.35, .4, 2.2, 6), iso('#3a3758'), BOLL, ([x, y]) => { dummy.position.copy(P(x, y, 3)); });
inst(new THREE.SphereGeometry(.45, 6, 5), lampHeadMat, BOLL, ([x, y]) => { dummy.position.copy(P(x, y, 4.3)); });
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,200,120,.95)'); gr.addColorStop(.4, 'rgba(255,160,70,.38)'); gr.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffb066', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, LAMPS, ([x, y]) => { dummy.position.copy(P(x, y, 2.05)); dummy.scale.set(20, 1, 20); });
inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, BOLL, ([x, y]) => { dummy.position.copy(P(x, y, 2.06)); dummy.scale.set(7, 1, 7); });
/* red uplights washing the Chitkara red frames */
const redPoolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: '#ff5a5a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const REDGLOW = [];
inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), redPoolMat, REDGLOW, ([x, y, s]) => { dummy.position.copy(P(x, y, 2.07)); dummy.scale.set(s, 1, s); });
NIGHT_HOOKS.push(n => { poolMat.opacity = .85 * n; redPoolMat.opacity = .75 * n; lampHeadMat.color.set(n > .5 ? '#fff0c8' : '#d8d2c4'); });

/* ---------- benches, bins and red planters scattered along paths and lawns ---------- */
const BENCH = [];
FOOT.concat([ALPHA.map(p => inset(p, 11)).concat([inset(ALPHA[0], 11)]), ring(418, 211, 15, 11, 10), ring(488, 268, 22, 14, 12)]).forEach(f => polyline(f, () => 9 + rnd() * 8, (x, y, nx, ny) => { if (rnd() < .65) BENCH.push([x + nx * 4.6, y + ny * 4.6, Math.atan2(ny, nx)]); }));
RPL.slice(0, 2).forEach(([w, pts]) => polyline(pts, () => 26 + rnd() * 10, (x, y, nx, ny) => BENCH.push([x + nx * (w / 2 + 5), y + ny * (w / 2 + 5), Math.atan2(ny, nx)])));
const benchOK = BENCH.filter(([x, y]) => !BLD_R.some(r => inR(x, y, r)));
inst(new THREE.BoxGeometry(3.2, .5, 1.2), iso('#b07a4a'), benchOK, ([x, y, a]) => { dummy.position.copy(P(x, y, 2.9)); dummy.rotation.set(0, -a + Math.PI / 2, 0); });
inst(new THREE.BoxGeometry(3.2, 1.2, .3), iso('#8a5a36'), benchOK, ([x, y, a]) => { const p = P(x, y, 3.6); dummy.position.set(p.x + Math.cos(-a) * .5, 3.6, p.z + Math.sin(-a) * .5); dummy.rotation.set(0, -a + Math.PI / 2, 0); });
inst(new THREE.BoxGeometry(.3, 1, 1), iso('#3a3758'), benchOK.flatMap(b => [b, b]), ([x, y, a], i) => { const p = P(x, y); const s = i % 2 ? 1.3 : -1.3; dummy.position.set(p.x + Math.cos(-a + Math.PI / 2) * s, 2.3, p.z + Math.sin(-a + Math.PI / 2) * s); dummy.rotation.set(0, -a + Math.PI / 2, 0); });

/* yellow buses in their real rows (OSM bus parking) */
const busPos = []; for (let x = 392; x < 530; x += 4.6) { busPos.push([x, 392, 0]); busPos.push([x + 1, 405, 0]); } for (let x = 392; x < 540; x += 4.6) busPos.push([x, 424, 0]);
const buses = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 3.4, 10.5), iso('#ffffff'), busPos.length);
busPos.forEach(([x, y, r], i) => { dummy.position.copy(P(x, y, 3.2)); dummy.rotation.set(0, r ? Math.PI / 2 : 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); buses.setMatrixAt(i, dummy.matrix); buses.setColorAt(i, new THREE.Color(C.bus)); });
scene.add(buses);
const parked = []; [LOTS[0], LOTS[3], LOTS[4], LOTS[5], LOTS[6]].forEach(p => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  for (let y = Math.min(...ys) + 4; y < Math.max(...ys) - 3; y += 7) for (let x = Math.min(...xs) + 3; x < Math.max(...xs) - 2; x += 3.4) if (rnd() < .3 && inPoly(x, y, p)) parked.push([x, y]); });
const pc = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.5, 4.2), iso('#ffffff'), parked.length); const pcc = ['#8f8aa6', '#4f5a88', '#c9c4d6', '#7a3040', '#a8a290', '#ef4a55'];
parked.forEach(([x, y], i) => { dummy.position.copy(P(x, y, 2.2)); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pc.setMatrixAt(i, dummy.matrix); pc.setColorAt(i, new THREE.Color(pcc[i % 6])); }); scene.add(pc);
