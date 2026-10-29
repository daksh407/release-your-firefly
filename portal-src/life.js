
/* ================= campus life at night: cars and e-carts on the internal roads, red roof beacons, blinking signs ================= */
const LIFE = (() => {
  const routes = RPL.filter(([w]) => w >= 9).map(([w, pts]) => { const seg = []; let L = 0; for (let i = 0; i < pts.length - 1; i++) { const a = P(...pts[i]), b = P(...pts[i + 1]); const l = a.distanceTo(b); seg.push([a, b, l, L]); L += l; } return { seg, L, w: w * PX }; }).filter(r => r.L > 60);
  const N = 22, body = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, 2.2, 2.2), iso('#ffffff'), N), roof = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 1.1, 2), iso('#d9dbe6'), N);
  const HL = new THREE.MeshBasicMaterial({ color: '#fff4c8' }), TL = new THREE.MeshBasicMaterial({ color: '#ff3b3b' });
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .5, 1.8), HL, N), tail = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .5, 1.8), TL, N);
  const beam = new THREE.InstancedMesh(new THREE.PlaneGeometry(14, 6).rotateX(-Math.PI / 2).translate(7, 0, 0), new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending }), N);
  [body, roof, head, tail, beam].forEach(m => { m.frustumCulled = false; scene.add(m); }); beam.layers.set(1);
  const COLS = ['#ef4a55', '#f6f2e6', '#4a7ae0', '#ffcc2e', '#3a3758', '#8f8aa6', '#ff8a2e'];
  const cars = []; for (let i = 0; i < N; i++) { const r = routes[i % routes.length]; cars.push({ r, s: Math.random() * r.L, v: (i % 2 ? 1 : -1) * (5 + Math.random() * 5), wait: 0, cart: i % 5 === 0 });
    body.setColorAt(i, new THREE.Color(cars[i].cart ? '#ff8a2e' : COLS[i % COLS.length])); }
  const d = new THREE.Object3D(), tmp = new THREE.Vector3();
  function at(r, s) { s = ((s % r.L) + r.L) % r.L; for (const [a, b, l, L0] of r.seg) if (s <= L0 + l) { const t = (s - L0) / l; return [tmp.copy(a).lerp(b, t), Math.atan2(b.z - a.z, b.x - a.x)]; } const q = r.seg[r.seg.length - 1]; return [tmp.copy(q[1]), 0]; }
  function put(m, i, x, y, z, ang, ox = 0, oz = 0) { const c = Math.cos(-ang), s = Math.sin(-ang); d.position.set(x + ox * c - oz * s, y, z + ox * s + oz * c); d.rotation.set(0, -ang, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }
  /* red aviation beacons on every tall roof */
  const tall = BGRP.map((g, i) => g && BLD[i] && BLD[i][5] >= 7 ? new THREE.Box3().setFromObject(g) : null).filter(Boolean);
  const bc = new THREE.InstancedMesh(new THREE.SphereGeometry(.7, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true }), tall.length * 2);
  tall.forEach((b, i) => { [[b.min.x + 1.5, b.min.z + 1.5], [b.max.x - 1.5, b.max.z - 1.5]].forEach(([x, z], k) => { d.position.set(x, b.max.y + 1.6, z); d.rotation.set(0, 0, 0); d.updateMatrix(); bc.setMatrixAt(i * 2 + k, d.matrix); }); });
  bc.layers.set(1); scene.add(bc);
  function step(t, dt) {
    cars.forEach((c, i) => { c.s += c.v * dt; const [p, a] = at(c.r, c.s); const ang = a + (c.v < 0 ? Math.PI : 0), side = c.r.w * .23;
      const nx = -Math.sin(a) * side * Math.sign(c.v), nz = Math.cos(a) * side * Math.sign(c.v);
      const x = p.x + nx, z = p.z + nz, y = 3.1;
      put(body, i, x, y, z, ang); put(roof, i, x, y + 1.4, z, ang, -.4); put(head, i, x, y - .2, z, ang, 2.25); put(tail, i, x, y - .2, z, ang, -2.25);
      put(beam, i, x, 1.95, z, ang, 2.2); });
    [body, roof, head, tail, beam].forEach(m => m.instanceMatrix.needsUpdate = true);
    beam.material.opacity = .2 * NIGHT.value; bc.material.opacity = .25 + .75 * Math.pow(Math.max(0, Math.sin(t * 2.2)), 8);
  }
  return { step };
})();
