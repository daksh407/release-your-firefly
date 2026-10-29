
/* ================= tiny life: students on lawns, a cricket game, a crowd at the chai stall, walkers on the avenue ================= */
const PEOPLE = [];
const crowd = (x, y, r, n, shirts) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * r; PEOPLE.push([x + Math.cos(a) * d, y + Math.sin(a) * d, shirts[i % shirts.length], rnd() < .4]); } };
const SHIRTS = ['#e2384a', '#ffc84a', '#3cc3b0', '#8b7cf6', '#ff8fb1', '#fff4de', '#4a62c8'];
crowd(470, 95, 20, 26, SHIRTS);  crowd(430, 50, 12, 10, SHIRTS);  crowd(414, 150, 10, 18, SHIRTS);       // Alpha Zone lawn and the stage
crowd(342, 54, 6, 12, SHIRTS);                                      // Chai Chaska Baar
crowd(490, 312, 12, 20, SHIRTS);                                    // Square One food court
crowd(418, 205, 12, 10, SHIRTS); crowd(488, 268, 12, 10, SHIRTS);                                    // central lawn
crowd(536, 192, 5, 8, SHIRTS);                                      // Turing entrance
for (let i = 0; i < 11; i++) { const a = rnd() * 6.28, d = 10 + rnd() * 30; PEOPLE.push([OMEGA[0] + Math.cos(a) * d * .8, OMEGA[1] + Math.sin(a) * d, '#ffffff', false]); }   // cricket on the Play Ground
const pBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.8, .8), iso('#ffffff'), PEOPLE.length);
const pHead = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 8, 6), iso('#b07a4a'), PEOPLE.length);
const pLegs = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, 1.4, .6), iso('#2c2f78'), PEOPLE.length);
PEOPLE.forEach(([x, y, c, sit], i) => { const p = P(x, y); const h = sit ? -1.1 : 0; dummy.rotation.set(0, rnd() * 6.28, 0); dummy.scale.setScalar(1.25);
  dummy.position.set(p.x, 2.0 + 1.75 + h + 1.1, p.z); dummy.updateMatrix(); pBody.setMatrixAt(i, dummy.matrix); pBody.setColorAt(i, new THREE.Color(c));
  dummy.position.set(p.x, 2.0 + 3.3 + h + 1.1, p.z); dummy.updateMatrix(); pHead.setMatrixAt(i, dummy.matrix);
  dummy.position.set(p.x, 2.0 + .9 + (sit ? -.4 : 0), p.z); dummy.updateMatrix(); pLegs.setMatrixAt(i, dummy.matrix); });
scene.add(pBody, pHead, pLegs);
/* walkers along the avenue and Chitkara University Rd */
const PATHS = [RPL[0][1].concat(RPL[1][1].slice(1)), RPL[6][1], RPL[7][1], RPL[3][1], FOOT[0]];
const WALK = []; for (let i = 0; i < 26; i++) WALK.push({ path: PATHS[i % PATHS.length], t: rnd(), v: (.008 + rnd() * .01) * (rnd() < .5 ? 1 : -1), side: (rnd() < .5 ? 1 : -1) * (6 + rnd() * 2), c: SHIRTS[i % 7] });
const wBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.8, .8), iso('#ffffff'), WALK.length), wHead = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 8, 6), iso('#b07a4a'), WALK.length), wLegs = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, 1.4, .6), iso('#2c2f78'), WALK.length);
WALK.forEach((w, i) => wBody.setColorAt(i, new THREE.Color(w.c))); scene.add(wBody, wHead, wLegs);
function pathAt(path, t) { const segs = []; let L = 0; for (let i = 0; i < path.length - 1; i++) { const a = P(...path[i]), b = P(...path[i + 1]); const l = a.distanceTo(b); segs.push([a, b, l]); L += l; }
  let d = ((t % 1) + 1) % 1 * L; for (const [a, b, l] of segs) { if (d <= l) { const dir = b.clone().sub(a).normalize(); return [a.clone().lerp(b, d / l), dir]; } d -= l; } return [segs[0][0], new THREE.Vector3(1, 0, 0)]; }
function updateLife(t, dt) {
  WALK.forEach((w, i) => { w.t += w.v * dt; const [p, dir] = pathAt(w.path, w.t); const n = new THREE.Vector3(-dir.z, 0, dir.x); p.addScaledVector(n, w.side);
    const bob = Math.abs(Math.sin(t * 7 + i)) * .35; dummy.rotation.set(0, Math.atan2(dir.x, dir.z), 0); dummy.scale.setScalar(1.25);
    dummy.position.set(p.x, 4.85 + bob, p.z); dummy.updateMatrix(); wBody.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, 6.4 + bob, p.z); dummy.updateMatrix(); wHead.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, 2.9, p.z); dummy.updateMatrix(); wLegs.setMatrixAt(i, dummy.matrix); });
  wBody.instanceMatrix.needsUpdate = wHead.instanceMatrix.needsUpdate = wLegs.instanceMatrix.needsUpdate = true;
}

/* ================= camera: 90° snap turns, panning kept on the island, double-tap to look closer ================= */
let turnLeft = 0;
function turn(k) { turnLeft += k * Math.PI / 2; controls.autoRotate = false; clearTimeout(window.__ar); window.__ar = setTimeout(() => controls.autoRotate = true, 9000); }
document.getElementById('rl').onclick = () => turn(-1); document.getElementById('rr').onclick = () => turn(1);
let zoomTo = null, targetTo = null;
const HOMEZ = camera.zoom, HOMET = controls.target.clone();
document.getElementById('hm').onclick = () => { zoomTo = HOMEZ; targetTo = HOMET.clone(); };
let nightTo = 1; document.body.classList.add('night'); document.getElementById('nt').onclick = () => { nightTo = nightTo ? 0 : 1; document.body.classList.toggle('night', !!nightTo); };
addEventListener('keydown', e => { if(e.target.closest('textarea,input,select'))return; if (e.key === 'q' || e.key === 'Q') turn(-1); if (e.key === 'e' || e.key === 'E') turn(1); if (e.key === 'n' || e.key === 'N') document.getElementById('nt').click(); });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let lastTap = 0;
canvas.addEventListener('pointerup', e => { const now = performance.now(); if (now - lastTap < 320) {
  ndc.set((e.clientX - STAGE.x) / innerWidth * 2 - 1, -((e.clientY - STAGE.y) / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2); const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, hit)) { targetTo = hit.setY(0); zoomTo = Math.min(controls.maxZoom, camera.zoom * 2); } }
  lastTap = now; });
const BOUND = { x0: P(60, 0).x, x1: P(870, 0).x, z0: P(0, -120).z, z1: P(0, 840).z };
const UP = new THREE.Vector3(0, 1, 0);
function updateCam(dt) {
  const k = 1 - Math.pow(.0025, dt);
  if (Math.abs(turnLeft) > 1e-4) { const step = turnLeft * k; turnLeft -= step; const off = camera.position.clone().sub(controls.target).applyAxisAngle(UP, step); camera.position.copy(controls.target).add(off); }
  const before = controls.target.clone();
  if (targetTo) { controls.target.lerp(targetTo, k); if (controls.target.distanceTo(targetTo) < .5) targetTo = null; }
  if (zoomTo) { camera.zoom += (zoomTo - camera.zoom) * k; camera.updateProjectionMatrix(); if (Math.abs(zoomTo - camera.zoom) < .01) zoomTo = null; }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, BOUND.x0, BOUND.x1); controls.target.z = THREE.MathUtils.clamp(controls.target.z, BOUND.z0, BOUND.z1); controls.target.y = 0;
  camera.position.add(controls.target.clone().sub(before));
  NIGHT.value += (nightTo - NIGHT.value) * k; NIGHT_HOOKS.forEach(f => f(NIGHT.value));
  if (window.__fm) window.__fm.uniforms.uNightA.value = NIGHT.value;
}

/* ================= marker outlines: edge detection on depth + normals, thick silhouettes, thinner creases, slight wobble ================= */
scene.traverse(o => { const m = o.material; if (o.isPoints || o.isSprite || (m && (m === SHMAT || m.transparent || m === TRUNK || m === EUCT))) o.layers.set(1); });
const isPhone = Math.min(innerWidth, innerHeight) < 700;
if (isPhone && !REC) renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
function makeTargets() { const pr = renderer.getPixelRatio(), w = Math.floor(innerWidth * pr), h = Math.floor(innerHeight * pr);
  const col = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType });
  const nrm = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }); nrm.depthTexture = new THREE.DepthTexture(w, h); nrm.depthTexture.type = THREE.UnsignedIntType;
  return { col, nrm, w, h }; }
let RT = makeTargets();
const normalMat = new THREE.MeshNormalMaterial();
const post = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: null }, tNrm: { value: null }, tDep: { value: null }, uRes: { value: new THREE.Vector2(RT.w, RT.h) }, uW: { value: isPhone ? 1.6 : 2.2 }, uT: { value: 0 }, uN: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tCol, tNrm, tDep; uniform vec2 uRes; uniform float uW, uT, uN; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    float D(vec2 uv){ return texture2D(tDep, uv).r; }
    vec3 N(vec2 uv){ return texture2D(tNrm, uv).rgb * 2. - 1.; }
    void main(){
      vec2 px = 1. / uRes;
      vec2 wob = (vec2(noise(vUv * uRes / 38.), noise(vUv * uRes / 38. + 7.3)) - .5) * 1.6 * px;   // hand-drawn wobble
      vec2 uv = vUv + wob;
      float w = uW * (.8 + .5 * noise(vUv * uRes / 90.));                                           // varying marker weight
      float d0 = D(uv); vec3 n0 = N(uv); float de = 0., ne = 0.;
      vec2 ox = vec2(px.x * w * 1.35, 0.), oy = vec2(0., px.y * w * 1.35);
      // second derivative: zero on any flat or evenly sloped surface, large at silhouettes
      de = max(abs(D(uv + ox) + D(uv - ox) - 2. * d0), abs(D(uv + oy) + D(uv - oy) - 2. * d0));
      for (int k = 0; k < 4; k++) { vec2 o = (k == 0 ? vec2(1,0) : k == 1 ? vec2(-1,0) : k == 2 ? vec2(0,1) : vec2(0,-1));
        vec3 nn = N(uv + o * px * w * .75); ne = max(ne, 1. - dot(nn, n0)); }
      float edge = max(smoothstep(.0005, .0012, de), smoothstep(.45, .75, ne) * .55) * .9;
      vec4 c = texture2D(tCol, vUv);
      if (uN > .01) {
        vec3 bl = vec3(0.); for (int k = 0; k < 12; k++) { float a = float(k) * .5236; for (int r = 1; r <= 3; r++) { vec2 o = vec2(cos(a), sin(a)) * px * float(r) * 5.;
          vec3 s = texture2D(tCol, vUv + o).rgb; bl += max(s - .6, 0.) / float(r); } }
        c.rgb += bl * .06 * uN; }
      vec3 ink = mix(vec3(.012, .011, .045), vec3(.004, .004, .02), uN);
      float a = max(c.a, edge);
      gl_FragColor = vec4(mix(c.rgb, ink, edge), a);
      #include <colorspace_fragment>
    }`, transparent: true, depthTest: false, depthWrite: false });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function renderFrame(t) {
  flies.layers.set(1);
  camera.layers.set(0); scene.overrideMaterial = normalMat; renderer.setRenderTarget(RT.nrm); renderer.setClearColor(0x8080ff, 1); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null; camera.layers.enableAll(); renderer.setRenderTarget(RT.col); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear();
  post.uniforms.tCol.value = RT.col.texture; post.uniforms.tNrm.value = RT.nrm.texture; post.uniforms.tDep.value = RT.nrm.depthTexture; post.uniforms.uT.value = t; post.uniforms.uN.value = NIGHT.value; post.uniforms.uW.value = (isPhone ? .85 : 1.05) * THREE.MathUtils.clamp(camera.zoom / 2.6, .45, 1.1);
  renderer.render(qScene, qCam);
}
addEventListener('resize', () => { RT.col.dispose(); RT.nrm.dispose(); RT = makeTargets(); post.uniforms.uRes.value.set(RT.w, RT.h); });
window.__post = post; window.__RT = () => RT;
