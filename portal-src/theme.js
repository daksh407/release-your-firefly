
/* ================= night interface: dark glass, labelled icons, map-app controls, building close-ups ================= */
const THEME = (() => {
  const $ = UI.$, app = UI.app;
  document.body.classList.add('night');
  const LBL={sky:'Sky',meet:'Meet',me:'Me'};
  [...app.querySelectorAll('.nav .tab')].forEach(b=>b.insertAdjacentHTML('beforeend',`<span>${LBL[b.dataset.tab]}</span>`));
  $('.nav .rel',app).insertAdjacentHTML('beforeend','<span class="rl">Release</span>');
  /* the tag says what its numbers and button mean */
  { const chip = $('.tag .chip', app), go = $('.tag .go', app);
    chip.querySelector('.ic').innerHTML = KIT['icon-release'].replace(/#14102E/g, 'currentColor');
    go.insertAdjacentHTML('afterbegin', '<span style="font:700 14px var(--ui);white-space:nowrap">See work</span>'); go.style.gap = '6px'; go.setAttribute('aria-label', 'See the fireflies here');
    const n = $('.tag .n', app); new MutationObserver(() => { chip.style.display = +n.textContent > 0 ? '' : 'none'; }).observe(n, { childList: true, characterData: true, subtree: true }); }
  /* the building tag gets a one-line description */
  const SUB = { 'Square One': 'The cafeteria', 'Picasso Block': 'Old girls hostel', 'Turing Block': 'Engineering', 'Babbage Block': 'Computer science', 'Le Corbusier Block': 'Planning & architecture',
    'Fleming Block': 'Pharmacy', 'Tesla Block': 'Engineering', 'Exploretorium': 'Innovation lab', 'Sportorium': 'Sports complex', 'Chai Chaska Baar': 'Chai and snacks', 'Admission Block': 'Admissions' };
  const tagH = $('.tag h3', app); tagH.insertAdjacentHTML('afterend', '<small class="sub"></small>'); const tagSub = $('.tag .sub', app);
  new MutationObserver(() => { tagSub.textContent = SUB[tagH.textContent] || ''; }).observe(tagH, { childList: true, characterData: true, subtree: true });

  /* ---------- map-app gestures: one finger moves, two fingers pinch, turn and tilt; scroll zooms where you point ---------- */
  controls.autoRotate = false; controls.autoRotateSpeed = 0; clearTimeout(window.__ar);
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.panSpeed = 1; controls.rotateSpeed = .55; controls.zoomSpeed = 1.1; controls.dampingFactor = .09;
  const TILT_MIN = 18 * Math.PI / 180, TILT_MAX = 58 * Math.PI / 180;
  controls.minPolarAngle = Math.PI / 2 - TILT_MAX; controls.maxPolarAngle = Math.PI / 2 - TILT_MIN; controls.minZoom = .8; controls.maxZoom = 14;
  const touchMap = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
  if (touchMap) {
    // Keep a predictable viewing angle. Turning has its own explicit buttons.
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2 - 32 * Math.PI / 180;
    controls.panSpeed = .85; controls.zoomSpeed = 1; controls.maxZoom = 10;
    controls.zoomToCursor = false; controls.dampingFactor = .18;
  }
  // keep the post.js idle spin from coming back
  const _ar = setInterval(() => { if (!TOUR.on) controls.autoRotate = false; }, 500);

  /* ---------- controls ---------- */
  const mc = document.createElement('div'); mc.className = 'mapctl';
  mc.innerHTML = `<button class="cmp" data-press aria-label="Point north">${UI.$ ? '' : ''}<i class="ic">${KIT['icon-compass']}</i></button>
    <div class="grp"><button class="zi" data-press aria-label="Zoom in"><i class="ic">${KIT['icon-plus'].replace(/#14102E/g, 'currentColor')}</i></button><button class="zo" data-press aria-label="Zoom out"><i class="ic">${KIT['icon-minus'].replace(/#14102E/g, 'currentColor')}</i></button></div>
    <div class="grp"><button class="hm" data-press aria-label="Show the whole campus"><i class="ic">${KIT['icon-locate'].replace(/#14102E/g, 'currentColor')}</i></button></div>`;
  $('.col', app).appendChild(mc);
  const back = document.createElement('div'); back.className = 'backchip';
  back.innerHTML = `<button class="btn" data-press><i class="ic">${KIT['icon-back'].replace(/#14102E/g, 'currentColor')}</i>Campus</button>`; app.appendChild(back);
  const cmpI = $('.cmp .ic', mc), cmpB = $('.cmp', mc), tagBody = $('.tag .card0', app);

  /* ---------- one smooth camera flight: target, zoom, heading and tilt together ---------- */
  const sph = new THREE.Spherical(); const off = new THREE.Vector3();
  const F = { on: false, t: 0, dur: 1.1, a: null, b: null };
  const ease = t => 1 - Math.pow(1 - t, 3) * (1 - t) ;               // smooth out, no overshoot
  const ease2 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function state() { off.copy(camera.position).sub(controls.target); sph.setFromVector3(off); return { x: controls.target.x, z: controls.target.z, zoom: camera.zoom, th: sph.theta, ph: sph.phi, r: sph.radius }; }
  function flyTo(to, dur = 1.15) { UI.cancelCamera(); cancelFlight(); const a = state(); const b = Object.assign({}, a, to);
    let d = b.th - a.th; d = Math.atan2(Math.sin(d), Math.cos(d)); b.th = a.th + d;              // shortest way round
    F.a = a; F.b = b; F.t = 0; F.dur = RMO ? .01 : dur; F.on = true; targetTo = null; zoomTo = null; }
  function cancelFlight(){ F.on=false; targetTo=null; zoomTo=null; turnLeft=0; controls.stop?.(); }
  controls.addEventListener('start', cancelFlight);
  function step(dt) {
    if (F.on) { F.t = Math.min(1, F.t + dt / F.dur); const k = ease2(F.t), A = F.a, B = F.b, L = (p) => A[p] + (B[p] - A[p]) * k;
      controls.target.set(L('x'), 0, L('z')); sph.set(A.r, L('ph'), L('th')); off.setFromSpherical(sph); camera.position.copy(controls.target).add(off);
      camera.zoom = A.zoom * Math.pow(B.zoom / A.zoom, k); camera.updateProjectionMatrix(); camera.lookAt(controls.target); if (F.t >= 1) F.on = false; }
    camera.updateMatrixWorld();
    if (closeUp !== null && closeUp !== undefined) { const pr = BAKE.PROXY.find(x => x.userData.bld === closeUp); if (pr) { const bb = pr.geometry.parameters, c = pr.position;
        const top = toScreen([c.x, c.y + bb.height / 2, c.z]).y, base = toScreen([c.x, c.y - bb.height / 2, c.z]).y; tagBody.style.marginTop = Math.max(36, base - top + 46) + 'px'; } }
    else { tagBody.style.marginTop = ''; }
    const s = state(); cmpI.style.transform = `rotate(${(-s.th + 3 * Math.PI / 4)}rad)`;
    const away = Math.abs(Math.atan2(Math.sin(s.th - HOME.th), Math.cos(s.th - HOME.th))) > .12 || Math.abs(s.ph - HOME.ph) > .08; cmpB.classList.toggle('show', away);
  }
  /* open at the main gate: standing just inside it, looking down the avenue across the Alpha Zone to the whole campus */
  const HOME = (() => { const tgt = P(488, 150), gate = P(...GATE_C); const th = Math.atan2(gate.x - tgt.x, gate.z - tgt.z);
    const s0 = state(); return { x: tgt.x, z: tgt.z, zoom: HOMEZ * (innerWidth < innerHeight ? 1.15 : 1.25), th, ph: Math.PI / 2 - 32 * Math.PI / 180, r: s0.r }; })();
  function fitPhoneOverview() {
    if (!touchMap || REC) return;
    const bounds = new THREE.Box3(); BGRP.forEach(g => { if(g) bounds.expandByObject(g); });
    const c = P(488,190); HOME.x=c.x; HOME.z=c.z;
    controls.target.set(c.x,0,c.z); sph.set(HOME.r,HOME.ph,HOME.th); camera.position.copy(controls.target).add(off.setFromSpherical(sph));
    camera.zoom=1; camera.updateProjectionMatrix(); camera.lookAt(controls.target); camera.updateMatrixWorld();
    let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [0,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) {
      const p=new THREE.Vector3(x,y,z).project(camera); x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);
    }
    const fit=Math.min(2*(innerWidth-30)/innerWidth/(x1-x0),2*Math.max(240,innerHeight-310)/innerHeight/(y1-y0));
    HOME.zoom=THREE.MathUtils.clamp(fit*2.05,2.8,4.2);
  }
  fitPhoneOverview();
  if (!QS.has('tour')) { controls.target.set(HOME.x, 0, HOME.z); sph.set(HOME.r, HOME.ph, HOME.th); off.setFromSpherical(sph); camera.position.copy(controls.target).add(off); camera.zoom = HOME.zoom; camera.updateProjectionMatrix(); camera.lookAt(controls.target); }
  $('.zi', mc).addEventListener('click', () => flyTo({ zoom: Math.min(controls.maxZoom, camera.zoom * 1.6) }, .45));
  $('.zo', mc).addEventListener('click', () => flyTo({ zoom: Math.max(controls.minZoom, camera.zoom / 1.6) }, .45));
  cmpB.addEventListener('click', () => flyTo({ th: HOME.th, ph: HOME.ph }, .8));
  function home(){ closeUp = null; back.classList.remove('show'); UI.hideTag(); flyTo({ x: HOME.x, z: HOME.z, zoom: HOME.zoom, th: HOME.th, ph: HOME.ph }, .75); }
  $('.hm', mc).addEventListener('click', home);

  /* ---------- tap a building: fly in close, turn to face its entrance, lower the camera to see the facade ---------- */
  const SIDE_TH = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };
  let closeUp = null, before = null;
  function closeUpOn(b) { const B = BLD[b]; if (!B) return; const box = new THREE.Box3().setFromObject(BAKE.PROXY.find(p => p.userData.bld === b) || BGRP[b]);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const r = canvas.getBoundingClientRect(), span = Math.max(s.x, s.z, s.y * 1.6) * 1.7;           // building fills ~45% of the screen
    const zoom = THREE.MathUtils.clamp((camera.top - camera.bottom) * Math.min(1, r.width / r.height) / span, 2.2, controls.maxZoom);
    const rq = (B[7] || 0) * Math.PI / 2, HF = { 'hero:squareone': 0, 'hero:turing': 0, 'hero:picasso': -Math.PI / 2, fleming: Math.PI, galileo: Math.PI, ios: Math.PI };
    const th = (B[6] in HF ? rq + HF[B[6]] : SIDE_TH[BLD_SIDE[b] || 'S']) + .5;                       // three-quarter view of the entrance side
    if (closeUp === null) before = state(); closeUp = b;
    // keep the building a little above centre so the tag and sheets never cover it
    const fwd = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)), tilt = (touchMap ? 32 : 30) * Math.PI / 180;
    const lift = (camera.top - camera.bottom) / zoom * .13 / Math.sin(tilt);                           // building sits in the upper half, tag and sheets below it
    flyTo({ x: c.x + fwd.x * lift, z: c.z + fwd.z * lift, zoom, th, ph: Math.PI / 2 - tilt }, 1.25);
    back.classList.add('show'); }
  back.addEventListener('click', () => { const p = before || HOME; closeUp = null; before = null; back.classList.remove('show'); UI.hideTag(); flyTo({ x: p.x, z: p.z, zoom: p.zoom, th: p.th, ph: p.ph }, 1.1); });
  const _show = UI.showTag; UI.showTag = b => { _show(b); if (typeof b === 'number' && !TOUR.on) closeUpOn(b); };

  document.addEventListener('ryf:navigate',()=>{back.classList.remove('show');});
  window.__dbg = { BLD, BAKE, camera, canvas, closeUpOn };
  setInterval(() => { app.classList.toggle('sheeton', [UI.cardS, UI.relS, UI.meetS, UI.meS].some(x => x && x.isOpen)); }, 120);
  return { step, flyTo, cancelFlight, closeUpOn, home, touchMap, get heading(){return state().th;}, get closeUp() { return closeUp; } };
})();
