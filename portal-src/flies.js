
/* ================= fireflies: living lights (replaces the old additive dots) =================
   body  : warm-white core + swarm-coloured glow + wide soft bloom, no outline
   flicker: each one runs its own flash rhythm (Photinus-like): 15–25% ember, 80 ms rise, 0.4–0.7 s fall,
            1.2–5 s apart, ~20% double flashes. On Swarm Night phases couple per swarm and slowly sync.
   motion : drifts on a 3D curl-noise field around a home point near its building, keeps out of buildings
   trails : last 8 positions drawn as fading streaks, only when moving fast
   levels : Spark 1× · Glow 1.4× · Lantern 2× + breathing halo · Beacon 2.6× + halo + a faint light pillar */
let _cr = null, _crT = -1; const canvasRect = () => { const n = performance.now(); if (!_cr || n - _crT > 250) { _cr = canvas.getBoundingClientRect(); _crT = n; } return _cr; };
const toScreen = (v, o = {}) => { const p = _sv.set(v[0] ?? v.x, v[1] ?? v.y, v[2] ?? v.z).project(camera); const r = canvasRect(); o.x = r.left + (p.x + 1) / 2 * r.width - STAGE.x; o.y = r.top + (1 - p.y) / 2 * r.height - STAGE.y; o.z = p.z; return o; };
const _sv = new THREE.Vector3();
const toWorld = (x, y, h = 40) => { const n = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); const rc = new THREE.Raycaster(); rc.setFromCamera(n, camera);
  const hit = new THREE.Vector3(); rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), hit); return hit; };
const flies = new THREE.Group(); scene.add(flies);

const FF = (() => {
  const LV_SIZE = [1, 1.4, 2, 2.6], LV_BRIGHT = [.85, 1, 1.1, 1.3];
  const CAP = 300, SPK = 96, TOT = CAP + SPK;
  const COLS = DEMO.SWARMS.map(s => new THREE.Color(s.col));
  const WHITE = new THREE.Color('#fff1d6'), VIOLET = new THREE.Color('#8B7CF6');

  /* --- building boxes, for homes, avoidance, tags --- */
  const BOX = BGRP.map(g => g ? new THREE.Box3().setFromObject(g) : null);
  const bTop = i => { const b = BOX[i]; return b ? [(b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2] : [0, 0, 0]; };
  const at = k => { if (k === 'alpha') { const p = FOCUS.alpha; return [p.x, 2, p.z]; } return bTop(k); };

  /* --- the firefly sprite --- */
  const quad = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.setAttribute('position', quad.getAttribute('position'));
  const A = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
  const aPos = A(TOT, 3), aCol = A(TOT, 3), aP = A(TOT, 4), aPh = A(TOT, 1), aV = A(TOT, 3);
  g.setAttribute('iPos', aPos); g.setAttribute('iCol', aCol); g.setAttribute('iP', aP); g.setAttribute('iPh', aPh); g.setAttribute('iV', aV);
  const ADD = { transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor };
  const U = { uScale: { value: 1 }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ ...ADD, uniforms: U,
    vertexShader: `uniform float uScale; attribute vec3 iPos, iCol; attribute vec4 iP; attribute float iPh; varying vec2 vUv; varying vec3 vCol; varying vec4 vP; varying float vPh;
      void main(){ vec4 mv = viewMatrix * vec4(iPos, 1.); float R = 7. + iP.w * 2.;            // quad spans 7 body radii (9 while shimmering)
        float s = uScale * iP.x; if (iP.y < .002) s = 0.; mv.xy += position.xy * s * R; gl_Position = projectionMatrix * mv;
        vUv = position.xy * R; vCol = iCol; vP = iP; vPh = iPh; }`,
    fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vCol; varying vec4 vP; varying float vPh;
      void main(){ float r = length(vUv), b = vP.y;
        float core = exp(-r * r * 5.5) * .35, body = exp(-r * r * .9), bloom = exp(-r * 1.15) * .26;
        vec3 c = vec3(1., .96, .78) * core * b + mix(vec3(1., .9, .45), vCol, .55) * (body * .75 + bloom) * b;
        if (vP.z > 0.) { float br = .55 + .45 * sin(uT * 2.1 + vPh * 6.28); float ring = exp(-pow((r - 3.3) / .3, 2.)) * vP.z * (.10 + .10 * br);
          c += vCol * (ring + exp(-r * .7) * .06 * vP.z * br); }
        if (vP.w > .001) { float a = uT * .9 + vPh * 6.; vec2 u = mat2(cos(a), -sin(a), sin(a), cos(a)) * vUv;
          float st = exp(-abs(u.y) * 3.2) * exp(-abs(u.x) * .5) + exp(-abs(u.x) * 3.2) * exp(-abs(u.y) * .5);
          c += mix(vec3(1.), vCol, .35) * st * vP.w * .9; }
        float m = max(c.r, max(c.g, c.b)); if (m < .004) discard; gl_FragColor = vec4(c, min(1., m)); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 10; flies.add(mesh);
  /* --- the insect itself: a little beetle drawn in the shader, heading where it flies, wings beating, lantern pulsing --- */
  const bmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, uniforms: U,
    vertexShader: `uniform float uScale; attribute vec3 iPos, iCol, iV; attribute vec4 iP; attribute float iPh; varying vec2 vQ; varying vec3 vCol; varying float vB, vPh, vSp;
      void main(){ vec4 mv = viewMatrix * vec4(iPos, 1.); vec3 vv = (viewMatrix * vec4(iV, 0.)).xyz; float sp = length(vv.xy);
        float a = sp > .5 ? atan(vv.x, vv.y) : iPh * 6.283;                                     // nose points along screen motion
        float s = uScale * iP.x * 3.4; if (iP.y < .002 || iP.x < .7) s = 0.;
        vec2 q = position.xy; mv.xy += mat2(cos(a), -sin(a), sin(a), cos(a)) * q * s; gl_Position = projectionMatrix * mv;
        vQ = q; vCol = iCol; vB = iP.y; vPh = iPh; vSp = clamp(sp / 20., 0., 1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vQ; varying vec3 vCol; varying float vB, vPh, vSp;
      float ell(vec2 p, vec2 c, vec2 r){ vec2 d = (p - c) / r; return 1. - smoothstep(.82, 1., length(d)); }
      vec2 rot(vec2 p, float a){ return mat2(cos(a), sin(a), -sin(a), cos(a)) * p; }
      void main(){ vec2 p = vQ; vec4 o = vec4(0.);
        float flap = .5 + .5 * sin(uT * (34. + 10. * vPh) + vPh * 40.); float open = mix(.35, .95, flap) * mix(.65, 1., vSp);
        for (int k = 0; k < 2; k++) { float sd = k == 0 ? 1. : -1.; vec2 w = rot(vec2(p.x * sd, p.y) - vec2(.05, .10), -open);
          float wm = ell(w, vec2(.0, -.30), vec2(.15, .36)); float edge = wm - ell(w, vec2(.0, -.30), vec2(.12, .32));
          vec4 wc = vec4(mix(vec3(.80, .86, 1.), vec3(.18, .2, .35), edge * 1.6), wm * .55); o = mix(o, vec4(wc.rgb, 1.), wc.a); o.a = max(o.a, wc.a); }
        float abd = ell(p, vec2(0., -.30), vec2(.17, .32));                                      // glowing lantern
        float lamp = (1. - smoothstep(-.62, -.12, p.y));                                                 // the light sits at the tail end
        vec3 lantern = mix(vec3(1., .97, .62), mix(vec3(.95, 1., .45), vCol, .45), smoothstep(0., .35, length(p - vec2(0., -.42))));
        vec3 ac = mix(vec3(.16, .13, .10), lantern * (1.4 + 1.8 * vB), lamp * (.45 + .55 * vB));
        o = mix(o, vec4(ac, 1.), abd);
        float th = ell(p, vec2(0., .10), vec2(.15, .15)); o = mix(o, vec4(vec3(.13, .10, .09), 1.), th);
        float pr = ell(p, vec2(0., .26), vec2(.14, .09)); o = mix(o, vec4(.92, .36, .22, 1.), pr);   // the red-orange shield behind the head
        float hd = ell(p, vec2(0., .36), vec2(.065, .06)); o = mix(o, vec4(.08, .07, .07, 1.), hd);
        for (int k = 0; k < 2; k++) { float sd = k == 0 ? 1. : -1.; vec2 a0 = vec2(.03 * sd, .40), a1 = vec2(.16 * sd, .62); vec2 pa = p - a0, ba = a1 - a0;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); float an = 1. - smoothstep(.012, .03, length(pa - ba * h)); o = mix(o, vec4(.1, .08, .08, 1.), an); }
        float halo = exp(-dot(p - vec2(0., -.42), p - vec2(0., -.42)) * 9.) * vB * .8;           // light spilling onto the wings
        o.rgb += lantern * halo; o.a = max(o.a, min(1., halo));
        if (o.a < .02) discard; gl_FragColor = vec4(o.rgb, o.a); }` });
  const bmesh = new THREE.Mesh(g, bmat); bmesh.frustumCulled = false; bmesh.layers.set(1); bmesh.renderOrder = 11; flies.add(bmesh);

  /* --- streaks: trails, beacon pillars, constellation lines --- */
  const SCAP = 3600; const sq = new THREE.PlaneGeometry(1, 1);
  const sg = new THREE.InstancedBufferGeometry(); sg.index = sq.index; sg.setAttribute('position', sq.getAttribute('position'));
  const sA = A(SCAP, 3), sB = A(SCAP, 3), sC = A(SCAP, 3), sW = A(SCAP, 3); sg.setAttribute('iA', sA); sg.setAttribute('iB', sB); sg.setAttribute('iC', sC); sg.setAttribute('iW', sW);
  const smat = new THREE.ShaderMaterial({ ...ADD, uniforms: {},
    vertexShader: `attribute vec3 iA, iB, iC, iW; varying float vAl, vX; varying vec3 vC;
      void main(){ vec4 a = viewMatrix * vec4(iA, 1.), b = viewMatrix * vec4(iB, 1.); vec2 d = b.xy - a.xy; float L = length(d); d = L > 1e-4 ? d / L : vec2(1., 0.);
        vec2 n = vec2(-d.y, d.x); float t = position.x + .5; vec4 p = mix(a, b, t); p.xy += n * position.y * iW.x + d * (t - .5) * iW.x * .6;
        gl_Position = projectionMatrix * p; vAl = mix(iW.y, iW.z, t); vX = position.y * 2.; vC = iC; }`,
    fragmentShader: `varying float vAl, vX; varying vec3 vC; void main(){ float a = vAl * exp(-vX * vX * 3.2); vec3 c = vC * a; float m = max(c.r, max(c.g, c.b)); if (m < .003) discard; gl_FragColor = vec4(c, min(1., m)); }` });
  const smesh = new THREE.Mesh(sg, smat); smesh.frustumCulled = false; smesh.layers.set(1); smesh.renderOrder = 9; flies.add(smesh);

  /* --- landing rings --- */
  const RINGS = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 72), new THREE.MeshBasicMaterial({ color: '#FFC84A', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.layers.set(1); m.visible = false; flies.add(m); return { m, t: 9 }; });

  /* --- curl noise: curl of a smooth trigonometric potential, divergence-free so paths swirl instead of clumping --- */
  const pot = (x, y, z, t, o) => Math.sin(x * .9 + o + Math.sin(z * .63 + t * .13 + o)) * Math.cos(y * 1.13 - o * .7 + t * .11) + .55 * Math.sin(z * 1.71 + x * .53 - t * .09 + o * 2.1) * Math.cos(x * .37 - y * .8 + o);
  const CN = [0, 0, 0];
  function curl(x, y, z, t) { const e = .04;
    const Ay = (pot(x, y + e, z, t, 0) - pot(x, y - e, z, t, 0)), Az = (pot(x, y, z + e, t, 0) - pot(x, y, z - e, t, 0));
    const Bx = (pot(x + e, y, z, t, 3.1) - pot(x - e, y, z, t, 3.1)), Bz = (pot(x, y, z + e, t, 3.1) - pot(x, y, z - e, t, 3.1));
    const Cx = (pot(x + e, y, z, t, 7.4) - pot(x - e, y, z, t, 7.4)), Cy = (pot(x, y + e, z, t, 7.4) - pot(x, y - e, z, t, 7.4));
    CN[0] = (Cy - Bz) / (2 * e); CN[1] = (Az - Cx) / (2 * e); CN[2] = (Bx - Ay) / (2 * e); return CN; }

  /* --- state --- */
  const r = DEMO.rand, list = [];
  function homeNear(b, spread = 1) { const B = BOX[b]; const cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2, hx = (B.max.x - B.min.x) / 2, hz = (B.max.z - B.min.z) / 2;
    const a = r() * 6.283, rad = (Math.max(hx, hz) * .7 + 6 + r() * 26) * spread; return [cx + Math.cos(a) * rad, 8 + r() * (B.max.y + 22), cz + Math.sin(a) * rad]; }
  function make(d, p) { const f = { d, p: p ? p.slice() : homeNear(d.b), v: [0, 0, 0], ph: r(), om: 1 / (1.2 + 3.8 * Math.pow(r(), 1.3)), tau: 9, tau2: 9, dbl: 0,
      ember: .3 + r() * .14, seed: r() * 100, hist: [], hT: 0, mode: 'wander', shim: 0, vis: 1, visTo: 1, boost: 0, fly: null, lvl: d.lvl, sw: d.sw };
    f.home = f.p.slice(); f.anchor = f.home; for (let i = 0; i < 8; i++) f.hist.push(f.p.slice()); d.ff = f; list.push(f); return f; }
  DEMO.flies.forEach(d => make(d));
  const sparks = [];
  const env = t => t < .08 ? t / .08 : Math.exp(-(t - .08) / .5);
  let sync = 0, syncTo = 0, swarmNight = false; const ORD = DEMO.SWARMS.map(() => [0, 0, 0]);
  const lines = [];     // constellation lines [fa, fb, spring]
  const warmS = {};

  function warm(b) { if (!BGRP[b]) return; let w = warmS[b];
    if (!w) w = warmS[b] = spring(0, [1.1, 1], v => { if (b < 64) BAKE.warm[b] = v; });
    w.kind([.5, 1]).to(1).then(() => setTimeout(() => w.kind([2.4, 1]).to(.45), 900)); }
  function burst(p, col, n = 16) { if(RMO)return; RINGS.sort((a, b) => b.t - a.t); const R = RINGS[0]; R.t = 0; R.p = p; R.m.material.color.copy(col); R.m.visible = true;
    const R2 = RINGS[1]; R2.t = -.16; R2.p = p; R2.m.material.color.copy(col);
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + r() * .3, el = .3 + r() * .9, sp = 26 + r() * 30;
      sparks.push({ p: p.slice(), v: [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * .9 + 10, Math.sin(a) * Math.cos(el) * sp], life: 1, dec: 1 / (.7 + r() * .6), col: r() < .4 ? WHITE : col }); }
    if (sparks.length > SPK) sparks.splice(0, sparks.length - SPK); }

  /* release flight: hold → charge (in the UI) → launch arc → land burst + warm windows */
  function release(d, sxy, onLand) {
    const f = make(d, toWorld(sxy.x, sxy.y, 60).toArray()); const B = bTop(d.b);
    const land = [B[0] + (r() - .5) * 8, B[1] + 9, B[2] + (r() - .5) * 8];
    const p0 = f.p.slice(), dur = RMO ? 0 : 1.75;
    const c1 = [p0[0] + (land[0] - p0[0]) * .1, p0[1] + 110, p0[2] + (land[2] - p0[2]) * .1], c2 = [land[0], land[1] + 150, land[2]];
    f.mode = 'flight'; f.fly = { t: 0, dur, p0, c1, c2, land, onLand }; f.tau = 0; f.boost = 1;
    for (let i = 0; i < 8; i++) f.hist[i] = p0.slice();
    if (!dur) { f.p = land.slice(); landed(f); }
    return f; }
  function landed(f) { const fl = f.fly; f.mode = 'wander'; f.home = [fl.land[0], fl.land[1] + 4, fl.land[2]]; f.anchor = f.home; f.fly = null; f.tau = 0; f.boost = .8;
    burst(f.p, COLS[f.sw], 18); warm(f.d.b); haptic(14); fl.onLand && fl.onLand(f); }
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const easeFlight = t => { const a = t * t * (3 - 2 * t), b = 1 - Math.pow(1 - t, 2.4); return a * .55 + b * .45; };

  /* --- per frame --- */
  let scale = 1, sCount = 0;
  const writeStreak = (a, b, c, w, aa, ab) => { if (sCount >= SCAP) return; const i = sCount++;
    sA.array.set(a, i * 3); sB.array.set(b, i * 3); sC.array[i * 3] = c.r; sC.array[i * 3 + 1] = c.g; sC.array[i * 3 + 2] = c.b; sW.array[i * 3] = w; sW.array[i * 3 + 1] = aa; sW.array[i * 3 + 2] = ab; };
  function update(t, dt) {
    const ppu = camera.zoom * innerHeight / (camera.top - camera.bottom);          // css px per world unit
    scale = 2.6 * Math.pow(camera.zoom / 3, .42) / ppu; U.uScale.value = scale; U.uT.value = RMO ? 0 : t;
    const night = .3 + .7 * NIGHT.value;
    sync += (syncTo - sync) * (1 - Math.exp(-dt / 2.2));
    if (sync > .01) { ORD.forEach(o => (o[0] = o[1] = o[2] = 0)); list.forEach(f => { const o = ORD[f.sw]; o[0] += Math.cos(f.ph * 6.283); o[1] += Math.sin(f.ph * 6.283); o[2]++; }); }
    let n = 0; sCount = 0;
    const amp = RMO ? 0 : 1;
    for (const f of list) {
      const p = f.p, v = f.v;
      /* flash rhythm */
      let dphi = f.om * dt * (RMO ? .5 : 1);
      if (sync > .01) { const o = ORD[f.sw]; const R = Math.hypot(o[0], o[1]) / Math.max(1, o[2]), psi = Math.atan2(o[1], o[0]) / 6.283;
        let dd = psi - f.ph; dd -= Math.round(dd); dphi = (lerp(f.om, f.omS, sync) + sync * 1.8 * R * Math.sin(dd * 6.283) / 6.283 * 6) * dt; }
      f.ph += dphi; f.tau += dt; f.tau2 += dt;
      if (f.ph >= 1) { f.ph -= 1; f.tau = 0; if (sync < .3) { f.om = 1 / (1.2 + 3.8 * Math.pow(r(), 1.3)); f.dbl = r() < .2 ? .2 + r() * .12 : 0; } }
      if (f.dbl && f.tau >= f.dbl) { f.tau2 = 0; f.dbl = 0; }
      const emb = f.ember * (.8 + .4 * Math.sin(t * .7 + f.seed) * Math.sin(t * 1.13 + f.seed * 2.3));
      let b = RMO ? .65 : emb + (1 - emb) * Math.max(env(f.tau), .75 * env(f.tau2));
      if (f.boost > 0) { b = Math.max(b, f.boost); f.boost = Math.max(0, f.boost - dt * .45); }
      f.vis += (f.visTo - f.vis) * (1 - Math.exp(-dt * 14)); f.shim = Math.max(0, f.shim - dt / 1.1);
      /* movement */
      const ox = p[0], oy = p[1], oz = p[2];
      if (f.mode === 'flight') { const fl = f.fly; fl.t += dt; const u = Math.min(1, fl.t / fl.dur), e = easeFlight(u);
        for (let k = 0; k < 3; k++) p[k] = bez(fl.p0[k], fl.c1[k], fl.c2[k], fl.land[k], e);
        b = .85 + .15 * Math.sin(t * 31); if (u >= 1) landed(f); }
      else if (amp) {
        const c = curl(p[0] / 40 + f.seed * .01, p[1] / 30, p[2] / 40, t * .35 + f.seed);
        const night2 = f.mode === 'night', form = f.mode === 'form';
        const sp = form ? 1.2 : night2 ? 5 : 6.5, kp = form ? .9 : night2 ? .5 : .11;
        const an = f.anchor;
        let dx = c[0] * sp + (an[0] - p[0]) * kp, dy = c[1] * sp * .45 + (an[1] - p[1]) * kp * 1.3, dz = c[2] * sp + (an[2] - p[2]) * kp;
        const sv = Math.hypot(dx, dy, dz), mx = night2 || form ? 70 : 22; if (sv > mx) { dx *= mx / sv; dy *= mx / sv; dz *= mx / sv; }
        const kk = 1 - Math.exp(-dt * (form || night2 ? 2.4 : 1.6)); v[0] += (dx - v[0]) * kk; v[1] += (dy - v[1]) * kk; v[2] += (dz - v[2]) * kk;
        p[0] += v[0] * dt; p[1] += v[1] * dt; p[2] += v[2] * dt;
        if (p[1] < 5) p[1] += (5 - p[1]) * .2;
        for (let i = 0; i < BOX.length; i++) { const B = BOX[i]; if (!B) continue;                  // keep out of buildings: slide up and out
          if (p[0] > B.min.x - 2 && p[0] < B.max.x + 2 && p[2] > B.min.z - 2 && p[2] < B.max.z + 2 && p[1] < B.max.y + 3) {
            const cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2; p[1] += (B.max.y + 3 - p[1]) * .08; p[0] += Math.sign(p[0] - cx) * .35; p[2] += Math.sign(p[2] - cz) * .35; } }
      }
      const speed = Math.hypot(p[0] - ox, p[1] - oy, p[2] - oz) / Math.max(dt, 1e-3);
      /* trail history, sampled every 40 ms */
      f.hT += dt; if (f.hT > .04) { f.hT = 0; const h = f.hist.pop(); h[0] = p[0]; h[1] = p[1]; h[2] = p[2]; f.hist.unshift(h); }
      const lv = f.lvl, size = LV_SIZE[lv] * (.86 + .22 * b) * (1 + .5 * f.shim) * (f.mode === 'flight' ? 1.25 : 1);
      const bright = Math.min(1.25, b * LV_BRIGHT[lv] + f.shim * .6) * f.vis * night * (1 - .35 * sync);       // dense swarms would wash out to white
      const col = COLS[f.sw];
      aPos.array.set(p, n * 3); aCol.array[n * 3] = col.r; aCol.array[n * 3 + 1] = col.g; aCol.array[n * 3 + 2] = col.b;
      aV.array[n * 3] = (p[0] - ox) / Math.max(dt, 1e-3); aV.array[n * 3 + 1] = (p[1] - oy) / Math.max(dt, 1e-3); aV.array[n * 3 + 2] = (p[2] - oz) / Math.max(dt, 1e-3);
      aP.array[n * 4] = size; aP.array[n * 4 + 1] = bright; aP.array[n * 4 + 2] = lv >= 2 ? (lv === 3 ? 1 : .6) * f.vis : 0; aP.array[n * 4 + 3] = f.shim * f.vis; aPh.array[n] = f.seed % 1; n++;
      /* streaks */
      const rw = scale * LV_SIZE[lv];
      const tr = smooth(9, 42, speed) * (RMO ? 0 : 1) * f.vis;
      if (tr > .02) { let a = p; for (let k = 0; k < 7; k++) { const q = f.hist[k + 1]; const fa = Math.pow(1 - k / 7, 1.6), fb = Math.pow(1 - (k + 1) / 7, 1.6);
        writeStreak(a, q, col, rw * (1.5 - k * .14), fa * .6 * tr * night, fb * .6 * tr * night); a = q; } }
      if (lv === 3 && f.vis > .05) writeStreak(p, [p[0], p[1] + 150, p[2]], col, rw * 2.2, .14 * bright, 0);
    }
    for (const L of lines) { const a = L[0].p, bb = L[1].p, k = L[2].x; if (k < .005) continue;
      writeStreak(a, [lerp(a[0], bb[0], k), lerp(a[1], bb[1], k), lerp(a[2], bb[2], k)], VIOLET, scale * 1.1, .7 * Math.min(1, k * 2) * night, .7 * Math.min(1, k * 2) * night); }
    /* sparks */
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt * s.dec; if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const dr = Math.exp(-dt * 2.2); s.v[0] *= dr; s.v[1] = s.v[1] * dr - 22 * dt; s.v[2] *= dr; s.p[0] += s.v[0] * dt; s.p[1] += s.v[1] * dt; s.p[2] += s.v[2] * dt;
      aPos.array.set(s.p, n * 3); aCol.array[n * 3] = s.col.r; aCol.array[n * 3 + 1] = s.col.g; aCol.array[n * 3 + 2] = s.col.b;
      aV.array[n * 3] = aV.array[n * 3 + 1] = aV.array[n * 3 + 2] = 0; aP.array[n * 4] = .55; aP.array[n * 4 + 1] = Math.pow(s.life, 1.4) * night; aP.array[n * 4 + 2] = 0; aP.array[n * 4 + 3] = 0; aPh.array[n] = 0; n++;
      if (!RMO) writeStreak(s.p, [s.p[0] - s.v[0] * .05, s.p[1] - s.v[1] * .05, s.p[2] - s.v[2] * .05], s.col, scale * .7, .5 * s.life * night, 0); }
    g.instanceCount = n; sg.instanceCount = sCount;
    [aPos, aCol, aP, aPh, aV].forEach(a => { a.needsUpdate = true; a.addUpdateRange ? (a.clearUpdateRanges(), a.addUpdateRange(0, n * a.itemSize)) : 0; });
    [sA, sB, sC, sW].forEach(a => { a.needsUpdate = true; a.addUpdateRange ? (a.clearUpdateRanges(), a.addUpdateRange(0, Math.max(1, sCount) * a.itemSize)) : 0; });
    for (const R of RINGS) { if (R.t > 1.2) { R.m.visible = false; continue; } R.t += dt; if (R.t < 0) continue; const u = R.t / 1.1;
      R.m.visible = true; R.m.position.set(R.p[0], R.p[1] - 7, R.p[2]); R.m.scale.setScalar(6 + 46 * (1 - Math.pow(1 - Math.min(1, u), 3))); R.m.material.opacity = Math.max(0, 1 - u) * .9 * night; }
  }

  /* --- picking: nearest visible firefly on screen --- */
  const so = {};
  function pick(x, y) { let best = null, bd = 1e9;
    for (const f of list) { if (f.vis < .5 || f.mode === 'flight') continue; toScreen(f.p, so); const d = Math.hypot(so.x - x, so.y - y), lim = 11 + LV_SIZE[f.lvl] * 4 * Math.min(1.6, Math.max(.8, camera.zoom / 3));
      if (d < lim && d < bd) { bd = d; best = f; } } return best; }

  /* --- modes for the story beats --- */
  function swarmNightOn(on) { swarmNight = on; syncTo = on ? 1 : 0;
    list.forEach(f => { if (f.mode === 'flight') return;
      if (on) { const hb = DEMO.SWARMS[f.sw].home, B = BOX[hb]; const cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2;
        const a = r() * 6.283, rr = 6 + Math.pow(r(), .7) * 34; f.anchor = [cx + Math.cos(a) * rr, B.max.y + 16 + r() * 46, cz + Math.sin(a) * rr]; f.mode = 'night'; f.omS = 1 / 1.5 * (.96 + r() * .08); }
      else { f.anchor = f.home; f.mode = 'wander'; } }); }
  function formation(fs, centre, on) {
    lines.forEach(L => L[2].to(0)); const old=lines.slice(); setTimeout(() => { if(!on) old.forEach(l=>{const i=lines.indexOf(l);if(i>=0)lines.splice(i,1);}); }, 700);
    if (!on) { fs.forEach(f => { f.mode = 'wander'; f.anchor = f.home; }); return; }
    lines.length = 0; const n = fs.length, R = 16;
    fs.forEach((f, i) => { const a = i / n * 6.283 - Math.PI / 2 + .3; f.mode = 'form'; f.anchor = [centre[0] + Math.cos(a) * R * (i % 2 ? 1 : .8), centre[1] + 26 + Math.sin(a * 2) * 4, centre[2] + Math.sin(a) * R]; f.tau = 0; if(RMO)f.p=f.anchor.slice(); });
    fs.forEach((f, i) => { const L = [f, fs[(i + 1) % n], spring(0, [.6, 1])]; lines.push(L); setTimeout(() => L[2].to(1), 900 + i * 160); }); }
  return { list, update, release, pick, warm, burst, swarmNightOn, formation, bTop, at, BOX, make, COLS, get scale() { return scale; } };
})();
