/* ================= hero buildings, modelled from photos ================= */
const FOCUS = {};
const tone = (c, o = {}) => iso(c, o);
const sideTop = (side, top) => [side, side, top, top, side, side];
function bx(g, mat, w, h, d, x, y, z, ink = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); if (ink) edges(m, g); return m; }
function cyl(g, mat, r, h, x, y, z, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); g.add(m); edges(m, g); return m; }
function tree(g, x, z, s = 1, cube = false) {
  bx(g, tone(C.wood), .6 * s, 2.2 * s, .6 * s, x, 1.1 * s, z, false);
  const m = cube ? new THREE.Mesh(new THREE.BoxGeometry(3.2 * s, 3.2 * s, 3.2 * s), tone(C.tree2)) : new THREE.Mesh(new THREE.ConeGeometry(2 * s, 5 * s, 6), tone(C.tree));
  m.position.set(x, (cube ? 3.6 : 4.6) * s, z); g.add(m); edges(m, g);
}
const PARAPET = '#f27e6e', DARK = '#2a2440';
const RIMW = iso(C.coral, { lit: .3 });
function rim(g, w, h, d, x, y, z) { const t = .8; bx(g, RIMW, w, h, t, x, y, z - d / 2 + t / 2, false); bx(g, RIMW, w, h, t, x, y, z + d / 2 - t / 2, false); bx(g, RIMW, t, h, d, x - w / 2 + t / 2, y, z, false); bx(g, RIMW, t, h, d, x + w / 2 - t / 2, y, z, false); }
const HEROES = {
  squareone(g, W, D, seed) {
    // from the photos: one big two-storey hall; a deep red box frame wraps a tall glass front,
    // a cream band with the SQUARE ONE sign runs along the top, red-and-cream tiled plaza with red mushroom tables in front
    const H = 2 * FLOOR + 6, d = D * .9, z0 = -D / 2 + d / 2, fz = z0 + d / 2;
    bx(g, sideTop(tone(C.cream, { win: true, top: H, style: 1, seed }), tone(C.cream)), W, H, d, 0, H / 2, z0);
    // tall glass curtain, lit warm, with mullions
    bx(g, tone('#ffd48a', { win: true, top: H, style: 2, seed: seed + 1, glow: 1 }), W * .78, H * .72, .5, 0, H * .36 + .4, fz + .3);
    for (let k = 0; k <= 8; k++) bx(g, tone('#4a4a5c'), .35, H * .72, .6, -W * .39 + k * W * .78 / 8, H * .36 + .4, fz + .55, false);
    bx(g, tone('#4a4a5c'), W * .78, .35, .6, 0, H * .38, fz + .55, false);
    // the red box frame: two thick side walls, a deep top beam, angled return on the right
    const fr = fz + 2.2, T = 3.4;
    [-1, 1].forEach(sg => bx(g, RED, W * .11, H + 1, 4.8, sg * (W * .445), (H + 1) / 2, fr));
    bx(g, RED, W, H * .22, 4.8, 0, H - H * .11 + .5, fr);
    const ret = bx(g, RED, 4.2, H + 1, d * .5, W / 2 + .2, (H + 1) / 2, fz - d * .2); ret.rotation.y = -.28;
    bx(g, tone('#efe6cf'), W * .78, H * .1, .6, 0, H * .74, fz + .8);                     // cream band between glass and beam
    { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 512, 96);
      x.fillStyle = '#2c2a3c'; x.font = '800 54px Archivo, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SQUARE ONE □', 256, 50);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Mesh(new THREE.PlaneGeometry(W * .34, W * .34 * 96 / 512), new THREE.MeshBasicMaterial({ map: t }));
      s.position.set(0, H + 1.6, fr - 1); g.add(s); bx(g, tone('#efe6cf'), W * .36, W * .36 * 96 / 512 + .6, .5, 0, H + 1.6, fr - 1.35, false); }
    // plaza: red and cream tiles, red mushroom tables with stools
    const PZ = fr + 2.4, PD = 26;
    bx(g, tone('#e9dcc4'), W * 1.15, .35, PD, 0, .2, PZ + PD / 2, false);
    for (let i = 0; i < 18; i++) { const x = -W * .5 + (i % 6) * W * .2, z = PZ + 3 + Math.floor(i / 6) * 8; if ((i + Math.floor(i / 6)) % 2) bx(g, tone('#c8443f'), W * .1, .4, 4, x, .22, z, false); }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const tx = -W * .42 + k * W * .14 + (r % 2) * W * .07, tz = PZ + 5 + r * 7;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.35, .6, 2.2, 8), RED); st.position.set(tx, 1.1, tz); g.add(st);
      const tp = new THREE.Mesh(new THREE.CylinderGeometry(1.3, .9, .5, 12), RED); tp.position.set(tx, 2.4, tz); g.add(tp);
      for (let q = 0; q < 3; q++) { const a = q * 2.1; cyl(g, RED, .45, 1.1, tx + Math.cos(a) * 2, .55, tz + Math.sin(a) * 2, 8); } }
  },
  picasso(g, W, D, seed) {
    // front faces the lawn (-x). Viewer's left is -z, right is +z.
    const H = 9 * FLOOR + 1, tw = 22, tx = 3, tz = 3, td = 26, fx = tx - tw / 2;
    bx(g, sideTop(tone(C.cream, { win: true, top: H, style: 0, seed }), tone(C.cream)), tw, H, td, tx, H / 2, tz);
    rim(g, tw + .8, 1.2, td + .8, tx, H + .6, tz);
    // the low white wing on the left
    const Hw = 3 * FLOOR + 1; bx(g, sideTop(tone(C.creamHi, { win: true, top: Hw, style: 1, seed: seed + 2 }), tone(C.creamHi)), 18, Hw, 16, tx + 2, Hw / 2, tz - td / 2 - 8);
    // stair core on the left of the tower front
    bx(g, sideTop(tone('#f0e4c8', { win: true, top: H + 2, style: 0, seed: seed + 3 }), tone(C.cream)), 2, H + 2, 6, fx - 1, (H + 2) / 2, tz - 9);
    // gold slatted screen on the top floors, lit from behind
    const z0 = tz - 5, z1 = tz + 13, sy0 = H * .64, sh = H * .34;
    bx(g, new THREE.MeshBasicMaterial({ color: '#ffd98a' }), .3, sh, z1 - z0, fx - .2, sy0 + sh / 2, (z0 + z1) / 2, false);
    for (let z = z0 + .6; z < z1; z += 1.25) bx(g, new THREE.MeshBasicMaterial({ color: '#c98a1e' }), .5, sh, .35, fx - .7, sy0 + sh / 2, z, false);
    rim(g, 1.6, .8, z1 - z0 + 1, fx - .8, sy0 + sh + .4, (z0 + z1) / 2);
    // the red L: a band across the front with the sign, turning down the right edge
    const by = H * .56; bx(g, RED, 2.4, 3.6, z1 - z0 + 3, fx - 1.2, by, (z0 + z1) / 2 + 1.5);
    bx(g, new THREE.MeshBasicMaterial({ color: '#fff1d6' }), .2, .6, 7, fx - 2.5, by, (z0 + z1) / 2 - 1, false);
    bx(g, RED, 2.4, H, 3, fx - 1.2, H / 2, z1 + 1.5);                                       // the red leg runs the full height of the corner (photos 2462, 2466)
    // grey clad box projecting over the entrance, a strip window in it
    bx(g, tone('#8a8c98'), 3.4, H * .2, 14, fx - 1.7, H * .42, tz + 4);
    bx(g, new THREE.MeshBasicMaterial({ color: '#ffd48a' }), .2, H * .06, 9, fx - 3.5, H * .44, tz + 4, false);
    // the big round logo panel on the side wall, grey clad with a red disc
    { const lp = new THREE.Group(); lp.position.set(tx + 2, 0, tz + td / 2 + .5); g.add(lp);
      bx(lp, tone('#a9aab4'), 12, H * .62, .8, 0, H * .55, 0);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, .6, 40), tone('#2c2a3c')); disc.rotation.x = Math.PI / 2; disc.position.set(0, H * .58, .7); lp.add(disc);
      const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, .7, 40), RED); disc2.rotation.x = Math.PI / 2; disc2.position.set(0, H * .58, .8); lp.add(disc2);
      for (let k = 0; k < 4; k++) bx(lp, tone('#2c2a3c'), 3.6 - k * .8, .35, .3, 0, H * .58 - 1.6 + k * 1.05, 1.2, false); }
    // entrance steps and glass door
    for (let k = 0; k < 4; k++) bx(g, tone(C.creamHi), 2, .5, 10 - k, fx - 4 + k * .7, .25 + k * .5, tz, false);
    bx(g, new THREE.MeshBasicMaterial({ color: '#ffe0a0' }), .2, 4, 6, fx - .2, 4, tz, false);
    // the treehouse on stilts, front left
    const th = new THREE.Group(); th.position.set(fx - 12, 0, tz - 17); g.add(th);
    [[-3,-2.4],[3,-2.4],[-3,2.4],[3,2.4]].forEach(([a, b]) => bx(th, tone(C.wood), .8, 5.4, .8, a, 2.7, b, false));
    bx(th, tone('#8a5a36'), 9, .6, 7, 0, 5.4, 0);
    bx(th, tone('#b07a4a', { win: true, top: 9.4, style: 0, seed: 4 }), 7.4, 3.6, 5.6, 0, 7.5, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3.8, 4), tone('#6e4228')); roof.rotation.y = Math.PI / 4; roof.position.set(0, 11.2, 0); th.add(roof); edges(roof, th);
    const st = bx(th, tone(C.wood), 1.4, .4, 7, -6.4, 2.8, 1.5, false); st.rotation.x = .75;
    // Alpha Zone sign on the lawn, front right
    const az = new THREE.Group(); az.position.set(fx - 24, 0, tz + 16); g.add(az);
    bx(az, tone(C.creamHi), 11, 1, 2.6, 0, .5, 0);
    const a = new THREE.Mesh(new THREE.TorusGeometry(1.6, .55, 8, 24), new THREE.MeshBasicMaterial({ color: '#ff4a5e' })); a.rotation.y = Math.PI / 2; a.position.set(0, 3, -3.2); az.add(a);
    bx(az, new THREE.MeshBasicMaterial({ color: '#ff4a5e' }), .6, 3.6, .6, 0, 2.8, -1.4, false);
    bx(az, new THREE.MeshBasicMaterial({ color: '#ffe9b8' }), .6, 2.2, 6, 0, 2.1, 2, false);
    [-.35, .35].forEach(t => tree(g, fx - 8, tz + t * 30, 1.2, t > 0));
  },
  turing(g, W, D, seed) {
    // front faces +z (the avenue from the main gate)
    const H = 5 * FLOOR + 1, bd = D * .82, bz = -D / 2 + bd / 2, fz = bz + bd / 2;
    bx(g, sideTop(tone(C.cream, { win: true, top: H, style: 0, seed }), tone(C.cream)), W, H, bd, 0, H / 2, bz);
    rim(g, W + .8, 1.2, bd + .8, 0, H + .6, bz);
    // maroon clad wing on the left of the front
    bx(g, sideTop(tone('#7a3f45', { win: true, top: H - 4, style: 0, seed: seed + 5, glow: .9 }), tone('#6a343a')), W * .42, H - 4, 2, -W * .29, (H - 4) / 2 + 2, fz + 1);
    // right side: the tall mural wall and the dark CHITKARA sign bar
    bx(g, tone(C.creamHi), W * .36, H + 2, 2, W * .32, (H + 2) / 2, fz + 1);
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(W * .3, H * .62), muralMat); mur.position.set(W * .32, H * .42, fz + 2.05); g.add(mur);
    bx(g, tone(DARK), W * .26, 1.6, .4, W * .32, H - .6, fz + 2.2);
    // four tall red pillars carrying the pergola
    const px0 = -W * .08, pz = fz + 6.5;
    for (let k = 0; k < 4; k++) bx(g, RED, 1.9, H + 4, 1.9, px0 + k * 3.2, (H + 4) / 2, pz);
    bx(g, tone(C.white), 12, 1, 1.2, px0 + 4.8, H + 4.3, pz);
    for (let k = 0; k < 6; k++) bx(g, tone(C.white), .7, .6, 7, px0 - .6 + k * 2.3, H + 4.9, pz - 3, false);
    bx(g, new THREE.MeshBasicMaterial({ color: '#ffe0a0' }), 9, 4.5, .2, px0 + 4.8, 2.6, fz + 2.1, false);     // glass entrance
    // the lit book kiosk in front
    const kk = new THREE.Group(); kk.position.set(-W * .32, 0, fz + 13); g.add(kk);
    bx(kk, new THREE.MeshBasicMaterial({ color: '#ffd48a' }), 8, 3.4, 3, 0, 1.9, 0);
    bx(kk, tone('#4a3a44'), 9.4, .7, 4.4, 0, 3.9, 0);
    [-.3, 0, .3].forEach((t, i) => tree(g, t * W, fz + 19, 1.1, i === 1));
  },
};

