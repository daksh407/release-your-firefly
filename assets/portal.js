
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js?v=gestures-4';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- record stage: #rec=916 or #rec=169 locks the whole app to a 9:16 / 16:9 box (also ?rec=) ---------- */
const QS = new URLSearchParams(location.search + '&' + location.hash.slice(1).replace(/-/g, '&'));
if (QS.has('rec916')) QS.set('rec', '916'); if (QS.has('rec169')) QS.set('rec', '169');      // artifact links keep only a plain #name, e.g. #tour-rec916
let REC = QS.get('rec') === '169' ? 16 / 9 : QS.get('rec') === '916' ? 9 / 16 : 0;
const STAGE = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
function fitStage() { const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  if (!REC) { STAGE.x = 0; STAGE.y = 0; STAGE.w = W; STAGE.h = H; return; }
  const m = 0.96; let w = W * m, h = w / REC; if (h > H * m) { h = H * m; w = h * REC; }
  STAGE.w = Math.round(w); STAGE.h = Math.round(h); STAGE.x = Math.round((W - STAGE.w) / 2); STAGE.y = Math.round((H - STAGE.h) / 2); }
fitStage();
Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => STAGE.w }); Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => STAGE.h });
document.documentElement.classList.toggle('rec', !!REC); addEventListener('resize', fitStage, true);
/* V cycles the frame: full window → 9:16 → 16:9 */
addEventListener('keydown', e => { if ((e.key === 'v' || e.key === 'V') && !(e.target.closest && e.target.closest('textarea,input'))) {
  REC = REC === 0 ? 9 / 16 : REC < 1 ? 16 / 9 : 0; document.documentElement.classList.toggle('rec', !!REC); if (!REC) canvas.style.left = canvas.style.top = ''; dispatchEvent(new Event('resize')); } });

/* ---------- coordinates traced from the campus map (0.556 m per px) ---------- */
const PX = 0.9, CX = 520, CY = 250;
const P = (x, y, h = 0) => new THREE.Vector3((x - CX) * PX, h, (y - CY) * PX);
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const HS = 1.2;              // toy exaggeration of heights
const FLOOR = 3.6 * HS;

/* ---------- renderer + isometric camera ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0); renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
function frameCamera() { const a = innerWidth / innerHeight; const V = Math.max(760, 1250 / a);
  camera.left = -V * a / 2; camera.right = V * a / 2; camera.top = V / 2; camera.bottom = -V / 2; camera.updateProjectionMatrix(); }
frameCamera();
const TARGET = P(490, 170);
const PITCH = 30 * Math.PI / 180; let AZ = 135 * Math.PI / 180, azTo = AZ;
const camDir = (az) => new THREE.Vector3(Math.sin(az) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(az) * Math.cos(PITCH));
camera.position.copy(TARGET).add(camDir(AZ).multiplyScalar(2400));
camera.lookAt(TARGET);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(TARGET);
const ISO = Math.acos(1 / Math.sqrt(3));
const POLAR = Math.PI / 2 - PITCH; controls.minPolarAngle = POLAR; controls.maxPolarAngle = POLAR; controls.autoRotate = true; controls.autoRotateSpeed = .35;
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.5;
controls.minZoom = 0.7; controls.maxZoom = 9; controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }; controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; controls.rotateSpeed = .45;
controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(window.__ar); }); controls.addEventListener('end', () => { window.__ar = setTimeout(() => controls.autoRotate = true, 9000); });
camera.zoom = innerWidth < innerHeight ? 3.6 : 2.7; camera.updateProjectionMatrix();

/* ---------- one flat three-tone material for everything ----------
   top face = full colour, two sides = mid and dark tones; windows are drawn procedurally from world position */
const VS = `
  varying vec3 vN; varying vec3 vW; varying vec3 vIC;
  void main(){
    mat4 im = mat4(1.0);
    #ifdef USE_INSTANCING
      im = instanceMatrix;
    #endif
    vIC = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vIC = instanceColor;
    #endif
    vec4 w = modelMatrix * im * vec4(position,1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
    #include <clipping_planes_vertex>
  }`;
const VS_CLIP = VS.replace('varying vec3 vN;', '#include <clipping_planes_pars_vertex>\n varying vec3 vN;').replace('#include <clipping_planes_vertex>', 'vec4 mvPosition = viewMatrix * w;\n #include <clipping_planes_vertex>');
const FS = `
  #include <clipping_planes_pars_fragment>
  uniform vec3 uColor, uSide; uniform float uWin, uSeed, uTop, uField, uGlow, uStyle, uNight, uLit, uWarm;
  varying vec3 vN; varying vec3 vW; varying vec3 vIC;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed*13.7) * 43758.5453); }
  vec3 S2L(vec3 c){ return pow(c, vec3(2.2)); }
  vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y); float e = 1e-10; return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); }
  void main(){
    #include <clipping_planes_fragment>
    vec3 n = normalize(vN); vec3 base = uColor * vIC;
    float sA = mix(.90, .78, uNight), sB = mix(.74, .58, uNight);
    float shade = n.y > .5 ? 1.0 : (n.y < -.5 ? .35 : (abs(n.x) > abs(n.z) ? (n.x > 0. ? sA : sB) : (n.z < 0. ? sB + .04 : sA - .06)));
    float litMask = 0.;
    vec3 col = base * shade;
    if (uField > .5 && n.y > .5) {                       // pencil-row wheat fields on the island top
      vec2 cell = floor(vW.xz / 70.0); float h = hash(cell);
      vec2 d = h > .5 ? vec2(1.,0.) : vec2(0.,1.);
      float row = step(.55, fract(dot(vW.xz, d) / (4.0 + h * 3.0)));
      vec3 a = mix(vec3(.07,.10,.17), vec3(.08,.13,.14), h), b = mix(vec3(.24,.20,.10), vec3(.15,.19,.11), fract(h*7.));
      vec3 dA = mix(vec3(.36,.72,.30), vec3(.42,.78,.34), h), dB = mix(vec3(.50,.84,.38), vec3(.62,.86,.40), fract(h*7.));
      col = mix(mix(dA, dB, row * .8), mix(a, b, row * .55), uNight);
    }
    if (uField > 1.5 && n.y > .5) { float st = step(.5, fract((vW.x + vW.z) / 7.0)); col = base * (.9 + .12 * st); }
    if (uWin > .5 && abs(n.y) < .5) {                    // windows
      float u = abs(n.x) > abs(n.z) ? vW.z : vW.x; float y = vW.y;
      vec2 cell = vec2(floor(u / 7.0), floor(y / ${FLOOR.toFixed(3)}));
      vec2 f = vec2(fract(u / 7.0), fract(y / ${FLOOR.toFixed(3)}));
      float inWin = step(.18, f.x) * step(f.x, .82) * step(.26, f.y) * step(f.y, .80);
      if (uStyle > .5 && uStyle < 1.5) { inWin = step(.30, f.y) * step(f.y, .78) * (1. - step(.94, fract(u / 2.6))); }
      if (uStyle > 1.5) { inWin = (1. - step(.95, fract(u / 3.2))) * (1. - step(.93, f.y)); }
      float band = step(1.5, y) * step(y, uTop - 1.8);
      float on = uStyle > 1.5 ? 1. : step(mix(uStyle > .5 ? .25 : .38, .12, uNight), hash(vec2(uStyle > .5 ? 0. : cell.x, cell.y)));
      on = max(on, step(1. - uWarm * .8, hash(cell * 3.17 + 1.3)));                  // a released firefly warms more windows
      vec3 lit = mix(vec3(1.,.66,.24), vec3(1.,.82,.42), hash(cell * 1.7)) * uGlow * mix(1., .95, uNight) * (1. + uWarm * .9);
      vec3 glass = mix(vec3(.36,.76,.86), vec3(.52,.86,.92), step(.5, f.y)) * (abs(n.x) > abs(n.z) ? 1. : .86);
      vec3 winC = mix(glass, on > .5 ? lit : base * shade * .42, uNight);
      col = mix(col, winC, inWin * band); litMask = inWin * band * on * uNight;
      if (uStyle < 1.5) { col *= 1. - .16 * step(f.y, .07) * step(2.5, y); col *= 1. - .22 * step(y, 1.6); }
    }
    litMask = max(litMask, uLit);
    // night grade: a palette map sampled from the reference night image
    vec3 hsv = rgb2hsv(pow(base, vec3(1./2.2)));
    float hue = hsv.x * 360., sat = hsv.y, val = hsv.z;
    bool top = n.y > .5, side = abs(n.y) < .5;
    bool inst = vIC.r + vIC.g + vIC.b < 2.99;
    vec3 nc;
    if (sat < .14 && val > .6)                 nc = top ? S2L(vec3(.34,.38,.62)) : S2L(vec3(.58,.53,.66));          // white / grey: lavender roofs, mauve walls
    else if (hue > 38. && hue < 68. && sat < .55) nc = top ? S2L(vec3(.34,.38,.62)) : S2L(vec3(.80,.66,.42));       // cream walls: blue-lavender roof, warm tan facade
    else if (hue > 70. && hue < 170.) {                                                                              // greens
      if (uField > 1.5) nc = S2L(vec3(.24,.42,.28));
      else if (inst) nc = top ? S2L(vec3(.12,.27,.22)) : S2L(vec3(.08,.20,.18));
      else nc = S2L(vec3(.06,.24,.27)); }
    else if (hue > 190. && hue < 250.)         nc = val > .8 ? S2L(vec3(.25,.30,.45)) : (val > .6 ? S2L(vec3(.06,.19,.48)) : S2L(vec3(.07,.15,.50)));   // roads, parking, solar
    else if ((hue < 22. || hue > 330.) && sat > .5 && val > .55) nc = side ? S2L(vec3(.97,.46,.30)) : S2L(vec3(.82,.33,.24));   // reds and corals glow
    else if (hue < 38. && val > .75)           nc = S2L(vec3(.40,.30,.32));                                          // peach paths, aprons
    else if (hue < 38.)                        nc = S2L(vec3(.20,.14,.14));                                          // wood, soil
    else if (hue < 70.)                        nc = S2L(vec3(.24,.18,.16));                                          // wheat, yellow buses
    else                                       nc = col * vec3(.3, .3, .5);
    if (uField > .5 && uField < 1.5 && top) { float st = step(.5, fract((vW.x + vW.z) / 5.)); nc = mix(S2L(vec3(.05,.22,.27)), S2L(vec3(.07,.27,.30)), st); }
    float sh = top ? 1. : (abs(n.x) > abs(n.z) ? (n.x > 0. ? .92 : .66) : (n.z < 0. ? .74 : .86));
    vec3 nb = nc * sh;
    if (side && vW.y > .5 && uWin > .5) nb += S2L(vec3(.45,.24,.08)) * exp(-max(vW.y - 1.5, 0.) / 6.) * .8;
    vec3 nightC = mix(nb, col * 1.1, litMask * (1. - step(.01, uLit)));
    col = mix(col, nightC, uNight);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const CLIP_OLD = [new THREE.Plane(new THREE.Vector3(1,0,0), 322), new THREE.Plane(new THREE.Vector3(-1,0,0), 300), new THREE.Plane(new THREE.Vector3(0,0,1), 296), new THREE.Plane(new THREE.Vector3(0,0,-1), 236)];
const NIGHT = { value: 1 };              // the interactive layer is the night edition
function iso(color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSide: { value: new THREE.Color(color) }, uWin: { value: o.win ? 1 : 0 }, uSeed: { value: o.seed ?? rnd() * 10 },
      uTop: { value: o.top ?? 0 }, uField: { value: o.field === 2 ? 2 : (o.field ? 1 : 0) }, uGlow: { value: o.glow ?? 1 }, uStyle: { value: o.style ?? 0 }, uNight: NIGHT, uLit: { value: o.lit ?? 0 }, uWarm: { value: 0 } },
    vertexShader: o.clip ? VS_CLIP : VS, fragmentShader: FS, clipping: !!o.clip, clippingPlanes: o.clip ? CLIP : null,
  });
}
const INK = new THREE.LineBasicMaterial({ color: '#140f33', transparent: true, opacity: .85, visible: false });
const C = { cream: '#fbe6a0', creamHi: '#fff3c4', red: '#ef4a55', gold: '#ffcf6b', ground: '#7cc95e', road: '#8fb3f0', lawn: '#79cf55', oval: '#86d95c',
  courtB: '#4a7ae0', courtR: '#ef6a5e', wood: '#a0673e', bus: '#ffcc2e', tree: '#6fd64e', tree2: '#8be05c', soil: '#7a5a48', soil2: '#5e4436', wheat: '#e8b84a', foil: '#9fbaf2', white: '#f6f2e6', coral: '#f27e6e' };

function edges(mesh, parent) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), INK); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale); (parent || scene).add(e); return e; }
function box(parent, mat, w, h, d, x, y, z, ink = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); if (ink) edges(m, parent); return m; }

/* ================= the island: Chitkara and its surroundings, traced north-up from satellite (0.9 m per px) ================= */
const ISL = [[10,160],[60,240],[120,330],[250,560],[330,700],[400,800],[470,850],[860,850],[876,430],[860,100],[790,-30],[560,-60],[500,-140],[440,-180],[300,-120],[120,20]];
const ISLc = ISL.reduce((a, p) => [a[0] + p[0] / ISL.length, a[1] + p[1] / ISL.length], [0, 0]);
function layer(scale, depth, y, color, ink = true, field = false) {
  const pts = ISL.map(([x, py]) => { const v = P(ISLc[0] + (x - ISLc[0]) * scale, ISLc[1] + (py - ISLc[1]) * scale); return new THREE.Vector2(v.x, -v.z); });
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, iso(color, { field })); m.position.y = y; scene.add(m); if (ink) edges(m); return m;
}
layer(1, 4, -4, '#ffffff', true, true);
layer(1, 16, -20, C.wheat);
layer(1, 12, -32, '#5a3a4e');
layer(.985, 60, -92, C.soil);
layer(.9, 46, -138, C.soil2);
layer(.74, 40, -178, '#22162e');
layer(.5, 34, -212, '#1a1126');
const SAT = { x0: 10, x1: 882, y0: -180, y1: 904 };
[[930, -60, 120, 30], [-40, -110, 520, 24], [920, -150, 760, 18], [560, -40, 950, 22]].forEach(([sx, y, sy, s]) => { const p = P(sx, sy);
  box(scene, iso('#ffffff', { field: true }), s, 3, s, p.x, y, p.z); box(scene, iso(C.wheat), s, 4, s, p.x, y - 3.5, p.z); box(scene, iso(C.soil), s * .8, 12, s * .8, p.x, y - 11, p.z); });
const CLIP = [];

function slab(points, color, h, y, o = {}) {
  const s = new THREE.Shape(points.map(([x, py]) => { const v = P(x, py); return new THREE.Vector2(v.x, -v.z); }));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, iso(color, o)); m.position.y = y; scene.add(m); if (o.ink !== false) edges(m); return m;
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/* land use around the campus */
const DIRT = '#d9b98a', PLANT = '#4aa548', COLONY = '#c9b48c';
slab([[70,330],[130,330],[230,520],[300,690],[420,904],[330,904],[240,700],[160,520],[80,400]], COLONY, .4, 0, { ink: false });          // plotted colony beyond the canal
for (let y = 400; y < 860; y += 56) for (let x = 110; x < 300; x += 62) if (x > 60 + (y - 300) * .35 && x + 40 < 110 + (y - 300) * .45) slab(rect(x, y, x + 44, y + 38), '#e8cfa0', .9, .4);
slab(rect(100, 300, 382, 346), DIRT, .5, 0, { ink: false });
slab(rect(385, 598, 700, 665), DIRT, .5, 0, { ink: false }); slab(rect(620, 770, 712, 826), '#a6df6e', .5, 0, { ink: false });
const PLANTS = [[100, 346, 382, 452], [300, 452, 382, 700], [390, 665, 535, 745], [535, 730, 620, 815], [650, -40, 800, 225]];
PLANTS.forEach(r => slab(rect(...r), PLANT, .6, 0, { ink: false }));

/* campus ground */
const CAMPUS = [[85,212],[248,96],[326,35],[413,-19],[470,-30],[600,20],[640,20],[645,150],[700,150],[770,230],[770,440],[860,440],[860,790],[680,790],[680,598],[382,598],[382,300],[150,300],[85,300]];
slab(CAMPUS, C.ground, 1.2, 0);
const lawn = (pts, c = C.lawn) => slab(pts, c, .6, 1.2, { field: 2 });
/* parks and pitches, outlines from OpenStreetMap */
const ALPHA = [[401,38],[402,119],[421,122],[429,131],[432,144],[522,141],[521,110],[432,20],[416,26]];
lawn(ALPHA);                                                        // Alpha Zone park
lawn(rect(396, 193, 441, 229), '#6fc94e');                          // Chitkara Woods
lawn(rect(460, 199, 528, 231));                                     // garden by Edison
lawn(rect(456, 246, 521, 290), '#93d86a');                          // Beta Zone, in front of Square One
slab(rect(246, 103, 368, 228), '#b9bfd4', .4, 1.2);                 // sports block apron
slab([[685,300],[716,300],[716,434],[685,434]], '#5cb84a', .5, 1.2); // copse by the hostels
/* Omega Zone: the big ground with the octagonal track */
const OMEGA = [611, 366];
{ const o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .8, 8), iso('#f2a58e')); o.scale.set(66 * PX, 1, 70 * PX); o.rotation.y = Math.PI / 8; o.position.copy(P(...OMEGA, 1.4)); scene.add(o); edges(o);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), iso(C.oval)); f.scale.set(54 * PX, 1, 58 * PX); f.position.copy(P(...OMEGA, 1.7)); scene.add(f); edges(f);
  bx(scene, iso('#d9c48a'), 3.4, .3, 18, P(...OMEGA).x, 2.3, P(...OMEGA).z, false); }
/* parking */
const LOTS = [[[164,176],[219,129],[240,128],[238,220],[169,219],[161,214]], rect(386, 386, 536, 433), [[386,386],[536,386],[575,433],[386,433]], rect(527, 98, 585, 140), rect(667, 252, 696, 287), [[256,105],[321,54],[326,84],[331,100],[363,147],[350,155],[350,177],[331,176],[330,110],[277,108]], [[452,-58],[488,-90],[500,-74],[464,-44]], rect(760, 560, 860, 575)];
LOTS.forEach(p => slab(p, '#6b8fe6', .5, 1.2));

/* roads: centrelines from OpenStreetMap, [width, points] */
function road(x1, y1, x2, y2, wpx, c = C.road) { const a = P(x1, y1), b = P(x2, y2), len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len + wpx * PX, .5, wpx * PX), iso(c)); m.position.copy(a.clone().add(b).multiplyScalar(.5)).setY(1.5); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(m); return [a, b]; }
const RPL = [
[16, [[378,-60],[413,-19],[436,7],[463,37],[492,69],[517,96],[527,114]]],                       // main gate avenue
 [15, [[527,114],[528,146],[530,197],[530,234],[531,291],[530,366],[534,376]]],         // Chitkara University Rd
 [11, [[534,376],[569,411],[595,438]]],
 [10, [[531,291],[717,293],[721,299],[721,440]]],
 [10, [[870,445],[752,440],[721,440],[595,438]]],
 [9,  [[595,438],[628,495],[651,509],[678,511],[679,540],[680,800]]],
 [13, [[326,35],[340,83],[352,105],[376,150],[385,188],[386,232],[384,401],[392,409],[529,408],[534,376]]],   // towards Gate 4
 [13, [[386,232],[450,233],[530,234]]],
 [8,  [[530,234],[543,243],[546,259],[539,276],[531,279]]],
 [9,  [[528,146],[459,148],[460,197]]],
 [8,  [[436,7],[399,28],[394,35],[397,139],[402,147],[459,148]]],
 [12, [[392,-4],[326,35],[295,60],[249,96],[248,116],[250,174],[248,228],[386,232]]],
 [9,  [[248,228],[164,223],[106,215],[98,222],[98,284]]],
 [8,  [[156,220],[155,285],[98,284]]],
 [7,  [[441,233],[441,288],[429,300],[428,344]]],
 [7,  [[450,233],[450,292]]],
 [8,  [[467,365],[530,366]]],
 [7,  [[463,37],[499,37],[499,60],[492,69]]],
 [8,  [[517,96],[585,96]]],
 [10, [[532,405],[530,508],[529,592]]],
 [9,  [[473,507],[579,508]]],
 [14, [[380,592],[870,592]]],
 [26, [[384,-53],[424,-8]]],                                           // the widened mouth through the gate
];
const ROADS = []; RPL.forEach(([w, pts]) => { for (let i = 0; i < pts.length - 1; i++) ROADS.push([...pts[i], ...pts[i + 1], w]); });
ROADS.forEach(r => road(...r));
/* footpaths (OSM footways and the Square One pedestrian street) */
const FOOT = [[[528,146],[587,146],[585,233]], [[460,197],[530,197]], [[489,197],[489,228]], [[489,205],[530,206]], [[531,298],[463,298]]];

/* NH-7: silver strip across the north-west corner, cut at the island edge */
const HW0 = P(-10, 202), HW1 = P(536, -212); const HW = { c: HW0.clone().lerp(HW1, .5), th: Math.atan2(414, 546), len: HW0.distanceTo(HW1) };
HW.dir = new THREE.Vector3(Math.cos(HW.th), 0, -Math.sin(HW.th)); HW.n = new THREE.Vector3(Math.sin(HW.th), 0, Math.cos(HW.th));
const GATE_C = [412, -17], LAMPS_EXTRA = [];
const toMap = (lx, lz) => [GATE_C[0] + (lx * Math.cos(HW.th) + lz * Math.sin(HW.th)) / PX, GATE_C[1] + (-lx * Math.sin(HW.th) + lz * Math.cos(HW.th)) / PX];
const GATE_PLAZA = [toMap(-40, -27), toMap(40, -27), toMap(40, 12), toMap(-40, 12)];
{ const h = new THREE.Mesh(new THREE.BoxGeometry(HW.len, 2, 52), iso(C.foil, { clip: true })); h.position.copy(HW.c).setY(.8); h.rotation.y = HW.th; scene.add(h);
  const m = new THREE.Mesh(new THREE.BoxGeometry(HW.len, 1.6, 2.4), iso('#6fd64e', { clip: true })); m.position.copy(HW.c).setY(2.2); m.rotation.y = HW.th; scene.add(m);
  [-1, 1].forEach(sg => { const s = new THREE.Mesh(new THREE.BoxGeometry(HW.len, 1.2, 7), iso('#c9d8f8', { clip: true })); s.position.copy(HW.c).addScaledVector(HW.n, sg * 33).setY(.6); s.rotation.y = HW.th; scene.add(s); }); }
const CARS = 30; const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 2.4, 2.6), iso('#ffffff', { clip: true }), CARS);
const carData = []; const carCols0 = 0; const carCols = ['#e2384a', '#fff1d6', '#4a62c8', '#ffcf6b', '#7ad1b0'];
for (let i = 0; i < CARS; i++) { const f = i % 2 === 0; carData.push({ s: rnd() * 1400 - 700, v: (f ? 1 : -1) * (18 + rnd() * 12), lane: (f ? 1 : -1) * (5 + (i % 4 < 2 ? 0 : 8)) }); cars.setColorAt(i, new THREE.Color(carCols[i % 5])); }
scene.add(cars);
const dummy = new THREE.Object3D();
function updateCars(dt) { carData.forEach((c, i) => { c.s += c.v * dt; const L2 = HW.len / 2 - 4; if (c.s > L2) c.s = -L2; if (c.s < -L2) c.s = L2;
  dummy.position.copy(HW.c).addScaledVector(HW.dir, c.s).addScaledVector(HW.n, c.lane).setY(3); dummy.rotation.set(0, HW.th, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix); }); cars.instanceMatrix.needsUpdate = true; }

/* the canal and its tree belt */
const CANAL = [[130,330],[250,585],[325,695],[400,800],[440,904]];
for (let i = 0; i < CANAL.length - 1; i++) road(...CANAL[i], ...CANAL[i + 1], 9, '#3d8fe0');

/* ---------- buildings ---------- */
const RED = iso(C.red, { lit: .85 }), CORAL = iso(C.coral, { lit: .9 }), GOLD = new THREE.MeshBasicMaterial({ color: C.gold }), WARM = new THREE.MeshBasicMaterial({ color: '#ffe0a0' }), COOL = new THREE.MeshBasicMaterial({ color: '#9fd6ff' });
const WHITE = iso(C.white), WOOD = iso(C.wood);
const muralMat = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const cs = ['#e2384a', '#ffcf6b', '#5fe3ff', '#7cf2b4', '#ff5fa2', '#2c2f78', '#c8f560'];
  g.fillStyle = '#ecdcbc'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { g.fillStyle = cs[i % 7]; g.beginPath(); const x = rnd() * 256, y = rnd() * 256, r = 22 + rnd() * 40; g.moveTo(x, y); g.lineTo(x + r, y + r * .3); g.lineTo(x + r * .2, y + r); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t }); })();

// name, x0, y0, x1, y1 (satellite px), floors, type, rotation (quarter turns)
const BLD = [
 ['Picasso Block',352,52,389,92,9,'hero:picasso',2],
 ['Turing Block',542,155,588,229,6,'hero:turing',3],
 ['Square One',464,328,516,362,3,'hero:squareone',2],
 ['Babbage Block',506,34,535,60,7,'babbage',0],
 ['Square Two',538,40,568,60,2,'box',0],
 ['Le Corbusier Block',536,46,590,92,4,'corbusier',0],
 ['Admission Block',382,18,400,38,2,'box',0],
 ['Chai Chaska Baar',334,34,350,46,1,'kiosk',0],
 ['SOLEVA',320,94,340,110,2,'kiosk',0],
 ['Edison Block',477,149,521,188,5,'solar',0],
 ['Newton Block',393,151,449,187,5,'box',0],
 ['iOS Development Centre',362,152,392,184,4,'ios',0],
 ['Turing annexe',592,155,640,229,4,'flatroof',0],
 ['Galileo Block',401,238,430,295,8,'galileo',0],
 ['Pythagoras Block',399,302,424,379,4,'box',0],
 ['Explore Hub',432,301,462,326,3,'box',0],
 ['Tuc Shop',446,335,455,341,1,'kiosk',0],
 ['Hospitality Block',430,347,456,372,4,'box',0],
 ['Hospitality labs',458,368,526,383,3,'solar',0],
 ['Fleming Block',554,238,624,285,4,'fleming',1],
 ['STP',704,240,746,286,1,'flatroof',0],
 ['Sportorium',249,236,364,263,3,'solar',0],
 ['Exploretorium',166,229,240,258,3,'exploretorium',0],
 ['Tesla Block',272,268,330,294,5,'tesla',0],
 ['School of Maritime Studies',104,228,150,290,6,'box',0],
 ['Ibn Battuta Hostel',729,326,755,438,11,'box',0],
 ['Hostel',762,300,832,422,9,'solar',0],
 ['Vasco Hostel',684,447,754,471,8,'box',0],
 ['Columbus Hostel',626,467,682,521,8,'solar',0],
 ['Chitkara Business School',472,443,519,498,5,'solar',0],
 ['Philip Kotler Block',537,443,577,501,5,'solar',0],
 ['Marco Polo Hostel',588,512,622,580,8,'box',0],
 ['Magellan 506',626,528,672,580,8,'solar',0],
 ['Hostel block',690,600,812,616,8,'solar',0],
 ['Sports hall',478,516,522,586,2,'flatroof',0],
 ['Sports hall',536,516,580,586,2,'flatroof',0],
 ['Alfred Nobel Boys Hostel',690,630,812,652,9,'box',0],
 ['Alfred Nobel Boys Hostel',690,668,812,690,9,'solar',0],
 ['Alfred Nobel Boys Hostel',690,706,812,728,9,'box',0],
 ['Workshop shed',818,600,836,780,1,'redroof',0],
];
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
canvas.addEventListener('pointerup', e => { if(e.pointerType==='touch')return; const now = performance.now(); if (now - lastTap < 320) {
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
  camera.position.add(controls.target.clone().sub(before));
  NIGHT.value += (nightTo - NIGHT.value) * k; NIGHT_HOOKS.forEach(f => f(NIGHT.value));
  if (window.__fm) window.__fm.uniforms.uNightA.value = NIGHT.value;
}
function constrainCamera(){
  const before=controls.target.clone();
  controls.target.x=THREE.MathUtils.clamp(controls.target.x,BOUND.x0,BOUND.x1);
  controls.target.z=THREE.MathUtils.clamp(controls.target.z,BOUND.z0,BOUND.z1);controls.target.y=0;
  const delta=controls.target.clone().sub(before);camera.position.add(delta);
  if(delta.lengthSq()>1e-8)controls.stop?.();
}

/* ================= marker outlines: edge detection on depth + normals, thick silhouettes, thinner creases, slight wobble ================= */
scene.traverse(o => { const m = o.material; if (o.isPoints || o.isSprite || (m && (m === SHMAT || m.transparent || m === TRUNK || m === EUCT))) o.layers.set(1); });
const isPhone = Math.min(innerWidth, innerHeight) < 700;
if (isPhone && !REC) renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
function makeTargets() { const pr = renderer.getPixelRatio(), w = Math.floor(innerWidth * pr), h = Math.floor(innerHeight * pr);
  const type = isPhone || !renderer.capabilities.isWebGL2 ? THREE.UnsignedByteType : THREE.HalfFloatType;
  const col = new THREE.WebGLRenderTarget(w, h, { samples: isPhone ? 0 : 4, type });
  const nrm = new THREE.WebGLRenderTarget(w, h, { type }); nrm.depthTexture = new THREE.DepthTexture(w, h); nrm.depthTexture.type = THREE.UnsignedIntType;
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
/* ================= UI kit: the 59 SVGs from firefly-ui/ (generated by gen-kit.cjs; ids prefixed per file) ================= */
const KIT = {"avatar-1":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-1-shadow\"></g><g id=\"avatar-1-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-1-border\"></g><g id=\"avatar-1-icon\"><g transform=\"translate(2 2) scale(1)\"><g transform=\"translate(15 15) scale(1.25)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></g></svg>",
"avatar-2":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-2-shadow\"></g><g id=\"avatar-2-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-2-border\"></g><g id=\"avatar-2-icon\"><g transform=\"translate(2 2) scale(1)\"><circle cx=\"30\" cy=\"30\" r=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"30\" cy=\"30\" r=\"3\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" /></g></g></svg>",
"avatar-3":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-3-shadow\"></g><g id=\"avatar-3-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FF8A5B\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-3-border\"></g><g id=\"avatar-3-icon\"><g transform=\"translate(2 2) scale(1)\"><path d=\"M20 37L30 19L40 37Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"avatar-4":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-4-shadow\"></g><g id=\"avatar-4-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-4-border\"></g><g id=\"avatar-4-icon\"><g transform=\"translate(2 2) scale(1)\"><rect x=\"20\" y=\"20\" width=\"20\" height=\"20\" rx=\"5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" transform=\"rotate(45 30 30)\"/></g></g></svg>",
"avatar-5":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-5-shadow\"></g><g id=\"avatar-5-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-5-border\"></g><g id=\"avatar-5-icon\"><g transform=\"translate(2 2) scale(1)\"><path d=\"M20 21Q30 13 40 21L35 40H25Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"avatar-6":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"avatar-6-shadow\"></g><g id=\"avatar-6-face\"><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"avatar-6-border\"></g><g id=\"avatar-6-icon\"><g transform=\"translate(2 2) scale(1)\"><path d=\"M18 33C18 20 27 18 30 28C33 18 42 20 42 33C42 43 33 45 30 35C27 45 18 43 18 33Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"badge-beacon":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><defs><radialGradient id=\"badge-beacon-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"badge-beacon-shadow\"><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-beacon-face\"><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-beacon-border\"></g><g id=\"badge-beacon-icon\"><path d=\"M23 31L20 49H40L37 31Z\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M10 18L20 21L10 25ZM50 18L40 21L50 25Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"22\" y=\"29\" width=\"16\" height=\"5\" rx=\"2.5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(21 11) scale(0.75)\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 4V11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><path d=\"M19 50H41\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"badge-glow":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><defs><radialGradient id=\"badge-glow-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"badge-glow-shadow\"><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-glow-face\"><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-glow-border\"></g><g id=\"badge-glow-icon\"><circle cx=\"30\" cy=\"39\" r=\"16\" fill=\"url(#badge-glow-firefly-glow)\"/><g transform=\"translate(15 12) scale(1.25)\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 4V11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"badge-lantern":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><defs><radialGradient id=\"badge-lantern-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"badge-lantern-shadow\"><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-lantern-face\"><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-lantern-border\"></g><g id=\"badge-lantern-icon\"><path d=\"M25 12Q30 6 35 12M30 47V53\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"17\" y=\"16\" width=\"26\" height=\"29\" rx=\"9\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"22\" y=\"12\" width=\"16\" height=\"5\" rx=\"2.5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"22\" y=\"44\" width=\"16\" height=\"5\" rx=\"2.5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(21 20) scale(0.75)\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 4V11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"badge-spark":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><defs><radialGradient id=\"badge-spark-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"badge-spark-shadow\"><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-spark-face\"><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"badge-spark-border\"></g><g id=\"badge-spark-icon\"><g transform=\"translate(15 15) scale(1.25)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"bars-swarms":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"260\" height=\"200\" viewBox=\"0 0 260 200\" fill=\"none\"><defs><clipPath id=\"bars-swarms-bar-0\"><rect x=\"3\" y=\"3\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath><clipPath id=\"bars-swarms-bar-1\"><rect x=\"3\" y=\"37\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath><clipPath id=\"bars-swarms-bar-2\"><rect x=\"3\" y=\"71\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath><clipPath id=\"bars-swarms-bar-3\"><rect x=\"3\" y=\"105\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath><clipPath id=\"bars-swarms-bar-4\"><rect x=\"3\" y=\"139\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath><clipPath id=\"bars-swarms-bar-5\"><rect x=\"3\" y=\"173\" width=\"246\" height=\"22\" rx=\"11\"/></clipPath></defs><g id=\"bars-swarms-shadow\"><rect x=\"7\" y=\"7\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"7\" y=\"41\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"7\" y=\"75\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"7\" y=\"109\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"7\" y=\"143\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"7\" y=\"177\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"bars-swarms-face\"><rect x=\"3\" y=\"3\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-0)\"><rect x=\"3\" y=\"3\" width=\"184\" height=\"22\" fill=\"#FFC84A\"/><path d=\"M187 3V25\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"3\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"3\" y=\"37\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-1)\"><rect x=\"3\" y=\"37\" width=\"146\" height=\"22\" fill=\"#C8F560\"/><path d=\"M149 37V59\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"37\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"3\" y=\"71\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-2)\"><rect x=\"3\" y=\"71\" width=\"212\" height=\"22\" fill=\"#FF8A5B\"/><path d=\"M215 71V93\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"71\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"3\" y=\"105\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-3)\"><rect x=\"3\" y=\"105\" width=\"112\" height=\"22\" fill=\"#FF8FB1\"/><path d=\"M115 105V127\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"105\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"3\" y=\"139\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-4)\"><rect x=\"3\" y=\"139\" width=\"164\" height=\"22\" fill=\"#3CC3B0\"/><path d=\"M167 139V161\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"139\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"3\" y=\"173\" width=\"246\" height=\"22\" rx=\"11\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"0\" /><g clip-path=\"url(#bars-swarms-bar-5)\"><rect x=\"3\" y=\"173\" width=\"132\" height=\"22\" fill=\"#8B7CF6\"/><path d=\"M135 173V195\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"3\" y=\"173\" width=\"246\" height=\"22\" rx=\"11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"bars-swarms-border\"></g><g id=\"bars-swarms-icon\"></g></svg>",
"btn-icon":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"52\" height=\"52\" viewBox=\"0 0 52 52\" fill=\"none\"><g id=\"btn-icon-shadow\"><rect x=\"6\" y=\"6\" width=\"44\" height=\"44\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-icon-face\"><rect x=\"2\" y=\"2\" width=\"44\" height=\"44\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-icon-border\"></g><g id=\"btn-icon-icon\"><g transform=\"translate(12 12) scale(1.0)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"btn-pressed":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"52\" viewBox=\"0 0 200 52\" fill=\"none\"><g id=\"btn-pressed-shadow\"></g><g id=\"btn-pressed-face\"><rect x=\"6\" y=\"6\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-pressed-border\"></g><g id=\"btn-pressed-icon\"><g transform=\"translate(20 16) scale(1.0)\"><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"btn-primary":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"52\" viewBox=\"0 0 200 52\" fill=\"none\"><g id=\"btn-primary-shadow\"><rect x=\"6\" y=\"6\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-primary-face\"><rect x=\"2\" y=\"2\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-primary-border\"></g><g id=\"btn-primary-icon\"><g transform=\"translate(16 12) scale(1.0)\"><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"btn-release":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"88\" height=\"88\" viewBox=\"0 0 88 88\" fill=\"none\"><g id=\"btn-release-shadow\"></g><g id=\"btn-release-face\"></g><g id=\"btn-release-border\"></g><g id=\"btn-release-icon\"><g transform=\"translate(0 0) scale(1)\"><circle cx=\"46\" cy=\"46\" r=\"29\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"42\" cy=\"42\" r=\"29\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"4\" /><path d=\"M42 2A40 40 0 1 1 18.5 74.4L21.4 70.3A35 35 0 1 0 42 7Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(28 28) scale(1.1666666666666667)\"><g transform=\"translate(5.4 -1.2) scale(.74) rotate(24 12 13)\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\"/><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\"/><path d=\"M12 4V11\"/><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\"/></g><path d=\"M9.4 16.4C8 19 5.9 20.8 3.2 21.4\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-dasharray=\".5 4\"/></g></g></g></svg>",
"btn-secondary":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"52\" viewBox=\"0 0 200 52\" fill=\"none\"><g id=\"btn-secondary-shadow\"><rect x=\"6\" y=\"6\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-secondary-face\"><rect x=\"2\" y=\"2\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"btn-secondary-border\"></g><g id=\"btn-secondary-icon\"><g transform=\"translate(16 12) scale(1.0)\"><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"card-building-tag":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"260\" height=\"150\" viewBox=\"0 0 260 150\" fill=\"none\"><g id=\"card-building-tag-shadow\"><rect x=\"6\" y=\"30\" width=\"252\" height=\"118\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"card-building-tag-face\"><rect x=\"2\" y=\"26\" width=\"252\" height=\"118\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"128\" cy=\"42\" r=\"6\" fill=\"#0E1034\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"20\" y=\"66\" width=\"148\" height=\"10\" rx=\"5.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"20\" y=\"94\" width=\"62\" height=\"32\" rx=\"16.0\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(28 100.0) scale(0.8333333333333334)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"102\" y=\"94\" width=\"132\" height=\"32\" rx=\"16\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"98\" y=\"90\" width=\"132\" height=\"32\" rx=\"16\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"card-building-tag-border\"></g><g id=\"card-building-tag-icon\"><path d=\"M128 40C113 23 143 24 132 5\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(150 94) scale(1.0)\"><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"card-constellation":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"200\" viewBox=\"0 0 320 200\" fill=\"none\"><g id=\"card-constellation-shadow\"><rect x=\"6\" y=\"6\" width=\"312\" height=\"192\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"card-constellation-face\"><rect x=\"2\" y=\"2\" width=\"312\" height=\"192\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"45\" cy=\"47\" r=\"24\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"81\" cy=\"47\" r=\"24\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"117\" cy=\"47\" r=\"24\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"153\" cy=\"47\" r=\"24\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"194\" y=\"32\" width=\"84\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"194\" y=\"50\" width=\"60\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"20\" y=\"88\" width=\"130\" height=\"36\" rx=\"18.0\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(28 96.0) scale(0.8333333333333334)\"><path d=\"M19.5 10C19.5 15 12 21 12 21S4.5 15 4.5 10A7.5 7.5 0 0 1 19.5 10Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(7.5 5.5) scale(0.375)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g><rect x=\"162\" y=\"88\" width=\"130\" height=\"36\" rx=\"18.0\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(170 96.0) scale(0.8333333333333334)\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><path d=\"M12 7V12L16 14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"59\" y=\"157\" width=\"105\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"236\" y=\"146\" width=\"54\" height=\"30\" rx=\"15\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"275\" cy=\"161\" r=\"10\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"32\" cy=\"161\" r=\"12\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"card-constellation-border\"></g><g id=\"card-constellation-icon\"><g transform=\"translate(24 153) scale(0.6666666666666666)\"><path d=\"M4 12L9 17L20 6\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"60\" y=\"102\" width=\"64\" height=\"7\" rx=\"3.5\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"202\" y=\"102\" width=\"62\" height=\"7\" rx=\"3.5\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/></g></svg>",
"card-firefly":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"420\" viewBox=\"0 0 320 420\" fill=\"none\"><defs><pattern id=\"card-firefly-art-hatch\" width=\"20\" height=\"20\" patternUnits=\"userSpaceOnUse\"><path d=\"M-5 5L5 -5M0 20L20 0M15 25L25 15\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".12\"/></pattern></defs><g id=\"card-firefly-shadow\"><rect x=\"6\" y=\"6\" width=\"312\" height=\"412\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"card-firefly-face\"><rect x=\"2\" y=\"2\" width=\"312\" height=\"412\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /><rect x=\"20\" y=\"20\" width=\"272\" height=\"272\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"20\" y=\"20\" width=\"272\" height=\"272\" rx=\"12\" fill=\"url(#card-firefly-art-hatch)\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"22\" y=\"312\" width=\"226\" height=\"10\" rx=\"5.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"22\" y=\"330\" width=\"144\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><circle cx=\"38\" cy=\"378\" r=\"16\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"64\" y=\"366\" width=\"86\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"64\" y=\"383\" width=\"62\" height=\"16\" rx=\"8.0\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"248\" y=\"360\" width=\"44\" height=\"44\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"244\" y=\"356\" width=\"44\" height=\"44\" rx=\"12\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(254.0 366.0) scale(1.0)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><circle cx=\"291\" cy=\"354\" r=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"card-firefly-border\"></g><g id=\"card-firefly-icon\"><g transform=\"translate(147 147) scale(0.75)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><rect x=\"286\" y=\"352\" width=\"10\" height=\"4\" rx=\"2.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/></g></svg>",
"chip":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"92\" height=\"36\" viewBox=\"0 0 92 36\" fill=\"none\"><g id=\"chip-shadow\"></g><g id=\"chip-face\"><rect x=\"3\" y=\"3\" width=\"86\" height=\"30\" rx=\"15.0\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><g transform=\"translate(11 8.0) scale(0.8333333333333334)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g><g id=\"chip-border\"></g><g id=\"chip-icon\"></g></svg>",
"confetti-1":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-1-shadow\"></g><g id=\"confetti-1-face\"><rect x=\"7\" y=\"7\" width=\"14\" height=\"14\" rx=\"0\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" transform=\"rotate(-12 14 14)\"/></g><g id=\"confetti-1-border\"></g><g id=\"confetti-1-icon\"></g></svg>",
"confetti-2":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-2-shadow\"></g><g id=\"confetti-2-face\"><path d=\"M14 4L24 14L14 24L4 14Z\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g id=\"confetti-2-border\"></g><g id=\"confetti-2-icon\"></g></svg>",
"confetti-3":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-3-shadow\"></g><g id=\"confetti-3-face\"><g transform=\"translate(2 2) scale(1)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g><g id=\"confetti-3-border\"></g><g id=\"confetti-3-icon\"></g></svg>",
"confetti-4":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-4-shadow\"></g><g id=\"confetti-4-face\"><circle cx=\"14\" cy=\"14\" r=\"8\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"confetti-4-border\"></g><g id=\"confetti-4-icon\"></g></svg>",
"confetti-5":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-5-shadow\"></g><g id=\"confetti-5-face\"><rect x=\"7\" y=\"7\" width=\"14\" height=\"14\" rx=\"0\" fill=\"#FF8A5B\" stroke=\"#14102E\" stroke-width=\"3\" transform=\"rotate(12 14 14)\"/></g><g id=\"confetti-5-border\"></g><g id=\"confetti-5-icon\"></g></svg>",
"confetti-6":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\"><g id=\"confetti-6-shadow\"></g><g id=\"confetti-6-face\"><path d=\"M14 4L17 10L24 11L19 16L20 23L14 20L8 23L9 16L4 11L11 10Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g id=\"confetti-6-border\"></g><g id=\"confetti-6-icon\"></g></svg>",
"confetti-set":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"160\" viewBox=\"0 0 320 160\" fill=\"none\"><g id=\"confetti-set-shadow\"></g><g id=\"confetti-set-face\"><g transform=\"translate(16 22) scale(1)\"><rect x=\"7\" y=\"7\" width=\"14\" height=\"14\" rx=\"0\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" transform=\"rotate(-12 14 14)\"/></g><g transform=\"translate(112 94) scale(1)\"><path d=\"M14 4L24 14L14 24L4 14Z\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(228 18) scale(1)\"><g transform=\"translate(2 2) scale(1)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g><g transform=\"translate(278 104) scale(1)\"><circle cx=\"14\" cy=\"14\" r=\"8\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g transform=\"translate(64 116) scale(1)\"><rect x=\"7\" y=\"7\" width=\"14\" height=\"14\" rx=\"0\" fill=\"#FF8A5B\" stroke=\"#14102E\" stroke-width=\"3\" transform=\"rotate(12 14 14)\"/></g><g transform=\"translate(184 66) scale(1)\"><path d=\"M14 4L17 10L24 11L19 16L20 23L14 20L8 23L9 16L4 11L11 10Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g><g id=\"confetti-set-border\"></g><g id=\"confetti-set-icon\"></g></svg>",
"firefly-dot-lime":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\" fill=\"none\"><defs><radialGradient id=\"firefly-dot-lime-firefly-glow\"><stop stop-color=\"#C8F560\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#C8F560\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#C8F560\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"firefly-dot-lime-shadow\"></g><g id=\"firefly-dot-lime-face\"><circle cx=\"16\" cy=\"16\" r=\"16\" fill=\"url(#firefly-dot-lime-firefly-glow)\"/><circle cx=\"16\" cy=\"16\" r=\"3.5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.5\" /></g><g id=\"firefly-dot-lime-border\"></g><g id=\"firefly-dot-lime-icon\"></g></svg>",
"firefly-dot":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\" fill=\"none\"><defs><radialGradient id=\"firefly-dot-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"firefly-dot-shadow\"></g><g id=\"firefly-dot-face\"><circle cx=\"16\" cy=\"16\" r=\"16\" fill=\"url(#firefly-dot-firefly-glow)\"/><circle cx=\"16\" cy=\"16\" r=\"3.5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.5\" /></g><g id=\"firefly-dot-border\"></g><g id=\"firefly-dot-icon\"></g></svg>",
"icon-back":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-back-shadow\"></g><g id=\"icon-back-face\"></g><g id=\"icon-back-border\"></g><g id=\"icon-back-icon\"><path d=\"M10 5L3 12L10 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-check":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-check-shadow\"></g><g id=\"icon-check-face\"></g><g id=\"icon-check-border\"></g><g id=\"icon-check-icon\"><path d=\"M4 12L9 17L20 6\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-clock":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-clock-shadow\"></g><g id=\"icon-clock-face\"></g><g id=\"icon-clock-border\"></g><g id=\"icon-clock-icon\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><path d=\"M12 7V12L16 14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-close":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-close-shadow\"></g><g id=\"icon-close-face\"></g><g id=\"icon-close-border\"></g><g id=\"icon-close-icon\"><path d=\"M6 6L18 18M18 6L6 18\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-flag":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-flag-shadow\"></g><g id=\"icon-flag-face\"></g><g id=\"icon-flag-border\"></g><g id=\"icon-flag-icon\"><path d=\"M5 21V4M5 4C10 1 14 7 20 4V14C14 17 10 11 5 14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-glow-filled":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-glow-filled-shadow\"></g><g id=\"icon-glow-filled-face\"></g><g id=\"icon-glow-filled-border\"></g><g id=\"icon-glow-filled-icon\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-glow":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-glow-shadow\"></g><g id=\"icon-glow-face\"></g><g id=\"icon-glow-border\"></g><g id=\"icon-glow-icon\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-info":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-info-shadow\"></g><g id=\"icon-info-face\"></g><g id=\"icon-info-border\"></g><g id=\"icon-info-icon\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><path d=\"M12 11V17M12 7V7.1\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-me":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-me-shadow\"></g><g id=\"icon-me-face\"></g><g id=\"icon-me-border\"></g><g id=\"icon-me-icon\"><circle cx=\"12\" cy=\"12\" r=\"9.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"12\" cy=\"9\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><path d=\"M6 19C6.5 13 17.5 13 18 19\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-meet":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-meet-shadow\"></g><g id=\"icon-meet-face\"></g><g id=\"icon-meet-border\"></g><g id=\"icon-meet-icon\"><path d=\"M8.5 6H15.5M7.3 8.2L10.8 15.8M16.7 8.2L13.2 15.8\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"6\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"18\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"12\" cy=\"18\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /></g></svg>",
"icon-next":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-next-shadow\"></g><g id=\"icon-next-face\"></g><g id=\"icon-next-border\"></g><g id=\"icon-next-icon\"><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-pin":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-pin-shadow\"></g><g id=\"icon-pin-face\"></g><g id=\"icon-pin-border\"></g><g id=\"icon-pin-icon\"><path d=\"M19.5 10C19.5 15 12 21 12 21S4.5 15 4.5 10A7.5 7.5 0 0 1 19.5 10Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(7.5 5.5) scale(0.375)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"icon-prompt":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-prompt-shadow\"></g><g id=\"icon-prompt-face\"></g><g id=\"icon-prompt-border\"></g><g id=\"icon-prompt-icon\"><path d=\"M6 3H18Q21 3 21 6V14Q21 17 18 17H9L3 21V6Q3 3 6 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M7 7H17M7 10.5H17M7 14H13\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-release":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-release-shadow\"></g><g id=\"icon-release-face\"></g><g id=\"icon-release-border\"></g><g id=\"icon-release-icon\"><g transform=\"translate(5.4 -1.2) scale(.74) rotate(24 12 13)\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\"/><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\"/><path d=\"M12 4V11\"/><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\"/></g><path d=\"M9.4 16.4C8 19 5.9 20.8 3.2 21.4\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-dasharray=\".5 4\"/></g></svg>",
"icon-share":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-share-shadow\"></g><g id=\"icon-share-face\"></g><g id=\"icon-share-border\"></g><g id=\"icon-share-icon\"><path d=\"M9 4H6Q3 4 3 7V18Q3 21 6 21H17Q20 21 20 18V15M11 13L21 3M14 3H21V10\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-sketch":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-sketch-shadow\"></g><g id=\"icon-sketch-face\"></g><g id=\"icon-sketch-border\"></g><g id=\"icon-sketch-icon\"><path d=\"M4 16L3 21L8 20L20 8Q22 6 20 4Q18 2 16 4ZM14 6L18 10M4 16L8 20\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-sky":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-sky-shadow\"></g><g id=\"icon-sky-face\"></g><g id=\"icon-sky-border\"></g><g id=\"icon-sky-icon\"><path d=\"M3 15L12 10L21 15L12 20Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M7 3V7M5 5H9M17 4V6M16 5H18\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-sound-off":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-sound-off-shadow\"></g><g id=\"icon-sound-off-face\"></g><g id=\"icon-sound-off-border\"></g><g id=\"icon-sound-off-icon\"><path d=\"M4 9H7L12 5V19L7 15H4Q3 15 3 14V10Q3 9 4 9Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M17 10L21 14M21 10L17 14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-sound-on":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-sound-on-shadow\"></g><g id=\"icon-sound-on-face\"></g><g id=\"icon-sound-on-border\"></g><g id=\"icon-sound-on-icon\"><path d=\"M4 9H7L12 5V19L7 15H4Q3 15 3 14V10Q3 9 4 9Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M16 9C18 10.5 18 13.5 16 15M19 6C23 9 23 15 19 18\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"icon-upload":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g id=\"icon-upload-shadow\"></g><g id=\"icon-upload-face\"></g><g id=\"icon-upload-border\"></g><g id=\"icon-upload-icon\"><path d=\"M12 15V4M8 8L12 4L16 8M4 14V18Q4 20 6 20H18Q20 20 20 18V14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"logo-mark":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><defs><radialGradient id=\"logo-mark-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"logo-mark-shadow\"></g><g id=\"logo-mark-face\"><circle cx=\"12\" cy=\"17\" r=\"7\" fill=\"url(#logo-mark-firefly-glow)\"/></g><g id=\"logo-mark-border\"></g><g id=\"logo-mark-icon\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 4V11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>",
"logo-tile":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\" fill=\"none\"><defs><radialGradient id=\"logo-tile-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"logo-tile-shadow\"><rect x=\"8\" y=\"8\" width=\"84\" height=\"84\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"logo-tile-face\"><rect x=\"4\" y=\"4\" width=\"84\" height=\"84\" rx=\"12\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"46\" cy=\"62\" r=\"23\" fill=\"url(#logo-tile-firefly-glow)\"/></g><g id=\"logo-tile-border\"></g><g id=\"logo-tile-icon\"><g transform=\"translate(16 13) scale(2.5)\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 4V11\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"marker-meet":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"80\" viewBox=\"0 0 64 80\" fill=\"none\"><defs><radialGradient id=\"marker-meet-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"marker-meet-shadow\"></g><g id=\"marker-meet-face\"><circle cx=\"32\" cy=\"62\" r=\"16\" fill=\"url(#marker-meet-firefly-glow)\"/><path d=\"M54 26C54 42 32 63 32 63S10 42 10 26A22 22 0 0 1 54 26Z\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g id=\"marker-meet-border\"></g><g id=\"marker-meet-icon\"><g transform=\"translate(20 14) scale(1.0)\"><path d=\"M8.5 6H15.5M7.3 8.2L10.8 15.8M16.7 8.2L13.2 15.8\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"6\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"18\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"12\" cy=\"18\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /></g></g></svg>",
"marker-spot":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"80\" viewBox=\"0 0 64 80\" fill=\"none\"><defs><radialGradient id=\"marker-spot-firefly-glow\"><stop stop-color=\"#FFC84A\" stop-opacity=\".65\"/><stop offset=\".35\" stop-color=\"#FFC84A\" stop-opacity=\".25\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g id=\"marker-spot-shadow\"></g><g id=\"marker-spot-face\"><circle cx=\"32\" cy=\"62\" r=\"16\" fill=\"url(#marker-spot-firefly-glow)\"/><path d=\"M54 26C54 42 32 63 32 63S10 42 10 26A22 22 0 0 1 54 26Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g id=\"marker-spot-border\"></g><g id=\"marker-spot-icon\"><g transform=\"translate(20 14) scale(1.0)\"><path d=\"M12 3C13.2 8.8 15.2 10.8 21 12C15.2 13.2 13.2 15.2 12 21C10.8 15.2 8.8 13.2 3 12C8.8 10.8 10.8 8.8 12 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"marker-you":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" fill=\"none\"><g id=\"marker-you-shadow\"></g><g id=\"marker-you-face\"><circle cx=\"32\" cy=\"32\" r=\"27\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"3\" opacity=\".35\"/><circle cx=\"32\" cy=\"32\" r=\"17\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"marker-you-border\"></g><g id=\"marker-you-icon\"><circle cx=\"32\" cy=\"32\" r=\"5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /></g></svg>",
"navbar":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"84\" viewBox=\"0 0 360 84\" fill=\"none\"><g id=\"navbar-shadow\"><path d=\"M6 82V36Q6 24 18 24H346Q358 24 358 36V82Z\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g id=\"navbar-face\"><path d=\"M2 78V32Q2 20 14 20H342Q354 20 354 32V78Z\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"18\" y=\"34\" width=\"54\" height=\"36\" rx=\"18.0\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"navbar-border\"></g><g id=\"navbar-icon\"><g transform=\"translate(33 40) scale(1.0)\"><path d=\"M3 15L12 10L21 15L12 20Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M7 3V7M5 5H9M17 4V6M16 5H18\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(109 40) scale(1.0)\"><path d=\"M8.5 6H15.5M7.3 8.2L10.8 15.8M16.7 8.2L13.2 15.8\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"6\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"18\" cy=\"6\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"12\" cy=\"18\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /></g><g transform=\"translate(172 0) scale(0.86)\"><circle cx=\"46\" cy=\"46\" r=\"29\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"42\" cy=\"42\" r=\"29\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"4\" /><path d=\"M42 2A40 40 0 1 1 18.5 74.4L21.4 70.3A35 35 0 1 0 42 7Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(28 28) scale(1.1666666666666667)\"><g transform=\"translate(5.4 -1.2) scale(.74) rotate(24 12 13)\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\"/><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\"/><path d=\"M12 4V11\"/><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\"/></g><path d=\"M9.4 16.4C8 19 5.9 20.8 3.2 21.4\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-dasharray=\".5 4\"/></g></g><g transform=\"translate(297 40) scale(1.0)\"><circle cx=\"12\" cy=\"12\" r=\"9.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"12\" cy=\"9\" r=\"2.5\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" /><path d=\"M6 19C6.5 13 17.5 13 18 19\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"sheet-release":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"560\" viewBox=\"0 0 360 560\" fill=\"none\"><g id=\"sheet-release-shadow\"><rect x=\"6\" y=\"6\" width=\"352\" height=\"552\" rx=\"12\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"sheet-release-face\"><rect x=\"2\" y=\"2\" width=\"352\" height=\"552\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"4\" /><rect x=\"154\" y=\"16\" width=\"44\" height=\"5\" rx=\"2.5\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><circle cx=\"152\" cy=\"49\" r=\"5\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"176\" cy=\"49\" r=\"5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.5\" /><circle cx=\"200\" cy=\"49\" r=\"5\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"2.5\" /><rect x=\"22\" y=\"78\" width=\"308\" height=\"222\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" stroke-dasharray=\"8 8\"/><rect x=\"148\" y=\"138\" width=\"56\" height=\"56\" rx=\"12\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"115\" y=\"219\" width=\"122\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"139\" y=\"237\" width=\"74\" height=\"6\" rx=\"3.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><rect x=\"22\" y=\"320\" width=\"308\" height=\"58\" rx=\"12\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><rect x=\"67\" y=\"346\" width=\"171\" height=\"8\" rx=\"4.0\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"0\" opacity=\".16\"/><circle cx=\"42\" cy=\"415\" r=\"16\" fill=\"#FFC84A\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"96\" cy=\"415\" r=\"16\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"150\" cy=\"415\" r=\"16\" fill=\"#FF8A5B\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"204\" cy=\"415\" r=\"16\" fill=\"#FF8FB1\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"258\" cy=\"415\" r=\"16\" fill=\"#3CC3B0\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"312\" cy=\"415\" r=\"16\" fill=\"#8B7CF6\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"sheet-release-border\"></g><g id=\"sheet-release-icon\"><g transform=\"translate(164 154) scale(1.0)\"><path d=\"M12 15V4M8 8L12 4L16 8M4 14V18Q4 20 6 20H18Q20 20 20 18V14\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(36 337) scale(0.9166666666666666)\"><path d=\"M6 3H18Q21 3 21 6V14Q21 17 18 17H9L3 21V6Q3 3 6 3Z\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M7 7H17M7 10.5H17M7 14H13\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(32 405) scale(0.8333333333333334)\"><path d=\"M4 12L9 17L20 6\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(136 454) scale(1)\"><circle cx=\"46\" cy=\"46\" r=\"29\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /><circle cx=\"42\" cy=\"42\" r=\"29\" fill=\"#E2384A\" stroke=\"#14102E\" stroke-width=\"4\" /><path d=\"M42 2A40 40 0 1 1 18.5 74.4L21.4 70.3A35 35 0 1 0 42 7Z\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><g transform=\"translate(28 28) scale(1.1666666666666667)\"><g transform=\"translate(5.4 -1.2) scale(.74) rotate(24 12 13)\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 10C9 6 4 4 3 7C2 10 6 12 9 12\"/><path d=\"M14 10C15 6 20 4 21 7C22 10 18 12 15 12\"/><path d=\"M12 4V11\"/><path d=\"M12 12C12.7 15 14 16.3 17 17C14 17.7 12.7 19 12 22C11.3 19 10 17.7 7 17C10 16.3 11.3 15 12 12Z\" fill=\"#FFC84A\"/></g><path d=\"M9.4 16.4C8 19 5.9 20.8 3.2 21.4\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-dasharray=\".5 4\"/></g></g></g></svg>",
"toast-success":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"52\" viewBox=\"0 0 200 52\" fill=\"none\"><g id=\"toast-success-shadow\"><rect x=\"6\" y=\"6\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#14102E\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"toast-success-face\"><rect x=\"2\" y=\"2\" width=\"192\" height=\"44\" rx=\"22\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"4\" /></g><g id=\"toast-success-border\"></g><g id=\"toast-success-icon\"><g transform=\"translate(16 12) scale(1.0)\"><path d=\"M4 12L9 17L20 6\" fill=\"none\" stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></g></svg>",
"toggle-off":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"36\" viewBox=\"0 0 60 36\" fill=\"none\"><g id=\"toggle-off-shadow\"></g><g id=\"toggle-off-face\"><rect x=\"3\" y=\"3\" width=\"54\" height=\"30\" rx=\"15\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"18\" cy=\"18\" r=\"10\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"toggle-off-border\"></g><g id=\"toggle-off-icon\"></g></svg>",
"toggle-on":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"36\" viewBox=\"0 0 60 36\" fill=\"none\"><g id=\"toggle-on-shadow\"></g><g id=\"toggle-on-face\"><rect x=\"3\" y=\"3\" width=\"54\" height=\"30\" rx=\"15\" fill=\"#C8F560\" stroke=\"#14102E\" stroke-width=\"3\" /><circle cx=\"42\" cy=\"18\" r=\"10\" fill=\"#FFF4DE\" stroke=\"#14102E\" stroke-width=\"3\" /></g><g id=\"toggle-on-border\"></g><g id=\"toggle-on-icon\"></g></svg>"};
/* ================= r04 asset pack: ChatGPT's revision-04 SVGs, inlined (generated by gen-pack.cjs, ids prefixed p-<file>-) ================= */
const PACK = {"art-chai-galaxy":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><g id=\"p-art-chai-galaxy-background-stars\" ><circle cx=\"35\" cy=\"40\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"54\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"265\" cy=\"194\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"46\" cy=\"218\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"211\" cy=\"25\" r=\"1\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"78\" cy=\"66\" r=\"1.3\" fill=\"#FFF4DE\" stroke-width=\"0\"/></g><g id=\"p-art-chai-galaxy-steam\" ><path d=\"M112 95C78 56 143 62 117 28M166 91C193 65 149 48 174 24\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /></g><g id=\"p-art-chai-galaxy-glass\" ><path d=\"M84 112L101 246Q150 269 199 246L216 112Z\" fill=\"#0E1034\" stroke=\"#FFF4DE\" stroke-width=\"4\" /><ellipse cx=\"150\" cy=\"112\" rx=\"66\" ry=\"12\" fill=\"#FFF4DE\" stroke-width=\"3\"/><path d=\"M99 133L111 233M201 133L189 233\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /><ellipse cx=\"150\" cy=\"244\" rx=\"49\" ry=\"10\" fill=\"none\" stroke-width=\"3\"/></g><g id=\"p-art-chai-galaxy-galaxy\" ><ellipse cx=\"150\" cy=\"183\" rx=\"44\" ry=\"13\" fill=\"#8B7CF6\" stroke-width=\"3\"/><ellipse cx=\"150\" cy=\"183\" rx=\"56\" ry=\"8\" fill=\"none\" stroke=\"#FFC84A\" stroke-width=\"3\"/><circle cx=\"153\" cy=\"179\" r=\"17\" fill=\"#FFC84A\" stroke-width=\"3\"/><path d=\"M104 192Q150 160 198 178\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /><circle cx=\"120\" cy=\"155\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"178\" cy=\"211\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"135\" cy=\"218\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/></g></g></svg>","art-constellation-study":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><defs><radialGradient id=\"p-art-constellation-study-constellation-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><g id=\"p-art-constellation-study-constellation-lines\" ><path d=\"M58 185L93 76L191 51L246 149L178 224L58 185M93 76L178 224M191 51L58 185\" fill=\"none\" stroke=\"#8B7CF6\" /></g><g id=\"p-art-constellation-study-star-0\" ><circle cx=\"58\" cy=\"185\" r=\"22\" fill=\"url(#p-art-constellation-study-constellation-glow)\" stroke=\"none\"/><circle cx=\"58\" cy=\"185\" r=\"4\" fill=\"#FFC84A\" stroke-width=\"2\"/></g><g id=\"p-art-constellation-study-star-1\" ><circle cx=\"93\" cy=\"76\" r=\"22\" fill=\"url(#p-art-constellation-study-constellation-glow)\" stroke=\"none\"/><circle cx=\"93\" cy=\"76\" r=\"4\" fill=\"#FF8FB1\" stroke-width=\"2\"/></g><g id=\"p-art-constellation-study-star-2\" ><circle cx=\"191\" cy=\"51\" r=\"22\" fill=\"url(#p-art-constellation-study-constellation-glow)\" stroke=\"none\"/><circle cx=\"191\" cy=\"51\" r=\"4\" fill=\"#3CC3B0\" stroke-width=\"2\"/></g><g id=\"p-art-constellation-study-star-3\" ><circle cx=\"246\" cy=\"149\" r=\"22\" fill=\"url(#p-art-constellation-study-constellation-glow)\" stroke=\"none\"/><circle cx=\"246\" cy=\"149\" r=\"4\" fill=\"#C8F560\" stroke-width=\"2\"/></g><g id=\"p-art-constellation-study-star-4\" ><circle cx=\"178\" cy=\"224\" r=\"22\" fill=\"url(#p-art-constellation-study-constellation-glow)\" stroke=\"none\"/><circle cx=\"178\" cy=\"224\" r=\"4\" fill=\"#FF8A5B\" stroke-width=\"2\"/></g><circle cx=\"30\" cy=\"32\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"266\" cy=\"270\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"55\" cy=\"262\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"46\" r=\"1\" fill=\"#FFF4DE\" stroke-width=\"0\"/></g></svg>","art-creeper-walk":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><defs><radialGradient id=\"p-art-creeper-walk-walk-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><g id=\"p-art-creeper-walk-walk\" ><path d=\"M132 129H168L266 300H34Z\" fill=\"#FFF4DE\" stroke-width=\"3\" /><path d=\"M132 129L59 300M168 129L241 300\" fill=\"none\" stroke-width=\"3\" /></g><g id=\"p-art-creeper-walk-arch-0\" ><path d=\"M121 300V144.4Q121 108 150 108Q179 108 179 144.4V300\" fill=\"none\" stroke=\"#3CC3B0\" stroke-width=\"9\" /><path d=\"M128 300V144.4Q128 117 150 117Q172 117 172 144.4V300\" fill=\"none\" stroke-width=\"2\" /></g><g id=\"p-art-creeper-walk-arch-1\" ><path d=\"M104 300V148.6Q104 93 150 93Q196 93 196 148.6V300\" fill=\"none\" stroke=\"#3CC3B0\" stroke-width=\"9\" /><path d=\"M111 300V148.6Q111 102 150 102Q189 102 189 148.6V300\" fill=\"none\" stroke-width=\"2\" /></g><g id=\"p-art-creeper-walk-arch-2\" ><path d=\"M79 300V153.2Q79 70 150 70Q221 70 221 153.2V300\" fill=\"none\" stroke=\"#3CC3B0\" stroke-width=\"9\" /><path d=\"M86 300V153.2Q86 79 150 79Q214 79 214 153.2V300\" fill=\"none\" stroke-width=\"2\" /></g><g id=\"p-art-creeper-walk-arch-3\" ><path d=\"M42 300V145.2Q42 38 150 38Q258 38 258 145.2V300\" fill=\"none\" stroke=\"#3CC3B0\" stroke-width=\"9\" /><path d=\"M49 300V145.2Q49 47 150 47Q251 47 251 145.2V300\" fill=\"none\" stroke-width=\"2\" /></g><g id=\"p-art-creeper-walk-creeper-foliage\" ><ellipse cx=\"258.0\" cy=\"145.0\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"261.0\" cy=\"140.0\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"255.3\" cy=\"121.2\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"258.3\" cy=\"116.2\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"247.3\" cy=\"98.6\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"250.3\" cy=\"93.6\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"234.4\" cy=\"78.3\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"237.4\" cy=\"73.3\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"217.3\" cy=\"61.3\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"220.3\" cy=\"56.3\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"196.9\" cy=\"48.6\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"199.9\" cy=\"43.6\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"174.0\" cy=\"40.7\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"177.0\" cy=\"35.7\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"150.0\" cy=\"38.0\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"153.0\" cy=\"33.0\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"126.0\" cy=\"40.7\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"129.0\" cy=\"35.7\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"103.1\" cy=\"48.6\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"106.1\" cy=\"43.6\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"82.7\" cy=\"61.3\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"85.7\" cy=\"56.3\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"65.6\" cy=\"78.3\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"68.6\" cy=\"73.3\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"52.7\" cy=\"98.6\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"55.7\" cy=\"93.6\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"44.7\" cy=\"121.2\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"47.7\" cy=\"116.2\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"42.0\" cy=\"145.0\" rx=\"11\" ry=\"8\" fill=\"#3CC3B0\" stroke-width=\"1.7\"/><ellipse cx=\"45.0\" cy=\"140.0\" rx=\"7\" ry=\"4\" fill=\"#C8F560\" stroke-width=\"1.3\"/><ellipse cx=\"42\" cy=\"162\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"158\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"42\" cy=\"187\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"183\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"42\" cy=\"212\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"208\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"42\" cy=\"237\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"233\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"42\" cy=\"262\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"258\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"42\" cy=\"287\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"45\" cy=\"283\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"162\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"158\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"187\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"183\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"212\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"208\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"237\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"233\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"262\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"258\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/><ellipse cx=\"258\" cy=\"287\" rx=\"9\" ry=\"12\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"261\" cy=\"283\" rx=\"5\" ry=\"7\" fill=\"#C8F560\" stroke-width=\"1.2\"/></g><g id=\"p-art-creeper-walk-light-0\" ><circle cx=\"65\" cy=\"90\" r=\"16\" fill=\"url(#p-art-creeper-walk-walk-glow)\" stroke=\"none\"/><circle cx=\"65\" cy=\"90\" r=\"2\" fill=\"#FFC84A\" stroke-width=\"0\"/></g><g id=\"p-art-creeper-walk-light-1\" ><circle cx=\"239\" cy=\"124\" r=\"16\" fill=\"url(#p-art-creeper-walk-walk-glow)\" stroke=\"none\"/><circle cx=\"239\" cy=\"124\" r=\"2\" fill=\"#FFC84A\" stroke-width=\"0\"/></g><g id=\"p-art-creeper-walk-light-2\" ><circle cx=\"116\" cy=\"137\" r=\"16\" fill=\"url(#p-art-creeper-walk-walk-glow)\" stroke=\"none\"/><circle cx=\"116\" cy=\"137\" r=\"2\" fill=\"#FFC84A\" stroke-width=\"0\"/></g><g id=\"p-art-creeper-walk-light-3\" ><circle cx=\"191\" cy=\"184\" r=\"16\" fill=\"url(#p-art-creeper-walk-walk-glow)\" stroke=\"none\"/><circle cx=\"191\" cy=\"184\" r=\"2\" fill=\"#FFC84A\" stroke-width=\"0\"/></g></g></svg>","art-picasso-night":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><defs><radialGradient id=\"p-art-picasso-night-firefly-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><circle cx=\"32\" cy=\"34\" r=\"1.8\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"33\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"271\" cy=\"90\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"56\" cy=\"79\" r=\"1.2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><g id=\"p-art-picasso-night-campus-building\" ><g transform=\"translate(177.62666666666667 175.97333333333333) scale(1.4933333333333334)\"><path d=\"M-59.4 -1.41L-31.11 12.73L-31.11 -12.39L-59.4 -26.53Z\" fill=\"#FFF9EC\" stroke-width=\"1.3\" /><path d=\"M-31.11 12.73L-2.83 -1.41L-2.83 -26.53L-31.11 -12.39Z\" fill=\"#FFF9EC\" stroke-width=\"1.3\" /><path d=\"M-31.11 12.73L-2.83 -1.41L-2.83 -26.53L-31.11 -12.39Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-31.11 -40.67L-2.83 -26.53L-31.11 -12.39L-59.4 -26.53Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M-31.11 -40.67L-2.83 -26.53L-31.11 -12.39L-59.4 -26.53Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-31.11 -40.67L-2.83 -26.53L-31.11 -12.39L-59.4 -26.53Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-39.6 19.80L-7.07 36.06L-7.07 -36.68L-39.6 -52.95Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-7.07 36.06L32.53 16.26L32.53 -56.48L-7.07 -36.68Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-7.07 36.06L32.53 16.26L32.53 -56.48L-7.07 -36.68Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M0 -72.75L32.53 -56.48L-7.07 -36.68L-39.6 -52.95Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M0 -72.75L32.53 -56.48L-7.07 -36.68L-39.6 -52.95Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M0 -72.75L32.53 -56.48L-7.07 -36.68L-39.6 -52.95Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M28.43 14.99L21.35 18.53L21.35 14.20L28.43 10.66Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 20.65L10.04 24.18L10.04 19.85L17.11 16.32Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 26.31L-1.27 29.84L-1.27 25.51L5.8 21.97Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 6.33L21.35 9.87L21.35 5.54L28.43 2.00Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 11.99L10.04 15.52L10.04 11.19L17.11 7.66Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 17.64L-1.27 21.18L-1.27 16.85L5.8 13.31Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 -2.33L21.35 1.21L21.35 -3.12L28.43 -6.66Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 3.33L10.04 6.86L10.04 2.53L17.11 -1.00Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 8.98L-1.27 12.52L-1.27 8.19L5.8 4.65Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 -10.99L21.35 -7.45L21.35 -11.78L28.43 -15.32Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 -5.33L10.04 -1.80L10.04 -6.13L17.11 -9.66Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 0.32L-1.27 3.86L-1.27 -0.47L5.8 -4.01Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 -19.65L21.35 -16.11L21.35 -20.44L28.43 -23.98Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 -13.99L10.04 -10.46L10.04 -14.79L17.11 -18.32Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 -8.34L-1.27 -4.80L-1.27 -9.13L5.8 -12.67Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 -28.31L21.35 -24.77L21.35 -29.10L28.43 -32.64Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 -22.65L10.04 -19.12L10.04 -23.45L17.11 -26.98Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 -17.00L-1.27 -13.46L-1.27 -17.79L5.8 -21.33Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M28.43 -36.97L21.35 -33.43L21.35 -37.76L28.43 -41.30Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.11 -31.31L10.04 -27.78L10.04 -32.11L17.11 -35.64Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M5.8 -25.66L-1.27 -22.12L-1.27 -26.45L5.8 -29.99Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.06 13.79L-31.82 15.91L-31.82 -60.30L-36.06 -62.42Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-31.82 15.91L-24.75 12.37L-24.75 -63.84L-31.82 -60.30Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-31.82 15.91L-24.75 12.37L-24.75 -63.84L-31.82 -60.30Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-28.99 -65.96L-24.75 -63.84L-31.82 -60.30L-36.06 -62.42Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M-28.99 -65.96L-24.75 -63.84L-31.82 -60.30L-36.06 -62.42Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-28.99 -65.96L-24.75 -63.84L-31.82 -60.30L-36.06 -62.42Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-36.91 16.95L-31.25 19.78L-31.25 15.45L-36.91 12.62Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 21.55L-22.06 24.38L-22.06 20.05L-27.72 17.22Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 26.15L-12.87 28.97L-12.87 24.64L-18.53 21.82Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.91 8.29L-31.25 11.12L-31.25 6.79L-36.91 3.96Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 12.89L-22.06 15.72L-22.06 11.39L-27.72 8.56Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 17.49L-12.87 20.31L-12.87 15.98L-18.53 13.16Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.91 -0.37L-31.25 2.46L-31.25 -1.87L-36.91 -4.70Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 4.23L-22.06 7.06L-22.06 2.73L-27.72 -0.10Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 8.83L-12.87 11.65L-12.87 7.32L-18.53 4.50Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.91 -9.03L-31.25 -6.20L-31.25 -10.53L-36.91 -13.36Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 -4.43L-22.06 -1.60L-22.06 -5.93L-27.72 -8.76Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 0.17L-12.87 2.99L-12.87 -1.34L-18.53 -4.16Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.91 -17.69L-31.25 -14.86L-31.25 -19.19L-36.91 -22.02Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 -13.09L-22.06 -10.26L-22.06 -14.59L-27.72 -17.42Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 -8.49L-12.87 -5.67L-12.87 -10.00L-18.53 -12.82Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-36.91 -26.35L-31.25 -23.52L-31.25 -27.85L-36.91 -30.68Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-27.72 -21.75L-22.06 -18.92L-22.06 -23.25L-27.72 -26.08Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-18.53 -17.16L-12.87 -14.33L-12.87 -18.66L-18.53 -21.49Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-38.54 -28.68L-10.25 -14.54L-10.25 -35.32L-38.54 -49.47Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M-38.04 -29.09L-38.04 -48.14\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-35.92 -28.03L-35.92 -47.08\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-33.8 -26.97L-33.8 -46.02\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-31.68 -25.90L-31.68 -44.96\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-29.56 -24.84L-29.56 -43.9\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-27.44 -23.78L-27.44 -42.84\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-25.31 -22.72L-25.31 -41.78\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-23.19 -21.66L-23.19 -40.71\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-21.07 -20.60L-21.07 -39.65\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-18.95 -19.54L-18.95 -38.59\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-16.83 -18.48L-16.83 -37.53\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-14.71 -17.42L-14.71 -36.47\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-12.59 -16.36L-12.59 -35.41\" fill=\"none\" stroke-width=\"0.9\" /><g id=\"p-art-picasso-night-red-L\" ><path d=\"M-43.13 -17.40L-10.61 -1.14L-10.61 -7.20L-43.13 -23.47Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-10.61 -1.14L-7.07 -2.91L-7.07 -8.97L-10.61 -7.20Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-10.61 -1.14L-7.07 -2.91L-7.07 -8.97L-10.61 -7.20Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-39.6 -25.23L-7.07 -8.97L-10.61 -7.20L-43.13 -23.47Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-39.6 -25.23L-7.07 -8.97L-10.61 -7.20L-43.13 -23.47Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-39.6 -25.23L-7.07 -8.97L-10.61 -7.20L-43.13 -23.47Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-14.85 35.71L-9.9 38.18L-9.9 -34.56L-14.85 -37.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-9.9 38.18L-6.36 36.42L-6.36 -36.33L-9.9 -34.56Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-9.9 38.18L-6.36 36.42L-6.36 -36.33L-9.9 -34.56Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-11.31 -38.81L-6.36 -36.33L-9.9 -34.56L-14.85 -37.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-11.31 -38.81L-6.36 -36.33L-9.9 -34.56L-14.85 -37.04Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-11.31 -38.81L-6.36 -36.33L-9.9 -34.56L-14.85 -37.04Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><g id=\"p-art-picasso-night-entrance\" ><path d=\"M-41.72 0.15L-20.51 10.75L-20.51 -3.10L-41.72 -13.71Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M-20.51 10.75L-15.56 8.28L-15.56 -5.58L-20.51 -3.10Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M-20.51 10.75L-15.56 8.28L-15.56 -5.58L-20.51 -3.10Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-36.77 -16.18L-15.56 -5.58L-20.51 -3.10L-41.72 -13.71Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M-36.77 -16.18L-15.56 -5.58L-20.51 -3.10L-41.72 -13.71Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-36.77 -16.18L-15.56 -5.58L-20.51 -3.10L-41.72 -13.71Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-39.74 -3.05L-22.77 5.43L-22.77 1.10L-39.74 -7.38Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-34.65 23.69L-19.09 31.47L-19.09 24.54L-34.65 16.76Z\" fill=\"#FFC84A\" stroke-width=\"1.3\" /><path d=\"M-19.09 31.47L-18.38 31.11L-18.38 24.18L-19.09 24.54Z\" fill=\"#FFC84A\" stroke-width=\"1.3\" /><path d=\"M-19.09 31.47L-18.38 31.11L-18.38 24.18L-19.09 24.54Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-33.94 16.41L-18.38 24.18L-19.09 24.54L-34.65 16.76Z\" fill=\"#FFC84A\" stroke-width=\"1.3\" /><path d=\"M-33.94 16.41L-18.38 24.18L-19.09 24.54L-34.65 16.76Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-33.94 16.41L-18.38 24.18L-19.09 24.54L-34.65 16.76Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><path d=\"M22.27 1.82L3.89 11.02L3.89 -26.22L22.27 -35.41Z\" fill=\"#8B7CF6\" stroke-width=\"1\" /><ellipse cx=\"13.435028820000001\" cy=\"-13.320664149999995\" rx=\"6\" ry=\"9\" fill=\"#E2384A\" stroke-width=\"1.3\"/><path d=\"M-40.31 25.10L-20.51 35.00L-20.51 34.14L-40.31 24.24Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 35.00L-18.38 33.94L-18.38 33.08L-20.51 34.14Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 35.00L-18.38 33.94L-18.38 33.08L-20.51 34.14Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-38.18 23.18L-18.38 33.08L-20.51 34.14L-40.31 24.24Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-38.18 23.18L-18.38 33.08L-20.51 34.14L-40.31 24.24Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-38.18 23.18L-18.38 33.08L-20.51 34.14L-40.31 24.24Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-44.55 25.10L-20.51 37.12L-20.51 35.39L-44.55 23.37Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 37.12L-18.38 36.06L-18.38 34.33L-20.51 35.39Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 37.12L-18.38 36.06L-18.38 34.33L-20.51 35.39Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-42.43 22.31L-18.38 34.33L-20.51 35.39L-44.55 23.37Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-42.43 22.31L-18.38 34.33L-20.51 35.39L-44.55 23.37Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-42.43 22.31L-18.38 34.33L-20.51 35.39L-44.55 23.37Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-48.79 25.10L-20.51 39.24L-20.51 36.65L-48.79 22.50Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 39.24L-18.38 38.18L-18.38 35.59L-20.51 36.65Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-20.51 39.24L-18.38 38.18L-18.38 35.59L-20.51 36.65Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-46.67 21.44L-18.38 35.59L-20.51 36.65L-48.79 22.50Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-46.67 21.44L-18.38 35.59L-20.51 36.65L-48.79 22.50Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-46.67 21.44L-18.38 35.59L-20.51 36.65L-48.79 22.50Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-72.12 16.26V3.26\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"-72.12489156000001\" cy=\"1.26345594\" rx=\"7.199999999999999\" ry=\"6.800000000000001\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"-75.12489156000001\" cy=\"-1.73654406\" rx=\"5.8\" ry=\"6.0\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/></g></g><g id=\"p-art-picasso-night-firefly-1\" ><circle cx=\"77\" cy=\"69\" r=\"14\" fill=\"url(#p-art-picasso-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(71 62) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-picasso-night-insect-6-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-6-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-6-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-picasso-night-insect-6-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-picasso-night-firefly-2\" ><circle cx=\"210\" cy=\"94\" r=\"14\" fill=\"url(#p-art-picasso-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(204 87) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-picasso-night-insect-7-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-7-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-7-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-picasso-night-insect-7-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-picasso-night-firefly-3\" ><circle cx=\"252\" cy=\"181\" r=\"14\" fill=\"url(#p-art-picasso-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(246 174) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-picasso-night-insect-8-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-8-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-picasso-night-insect-8-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-picasso-night-insect-8-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g></g></svg>","art-square-one-night":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><defs><radialGradient id=\"p-art-square-one-night-firefly-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><circle cx=\"32\" cy=\"34\" r=\"1.8\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"33\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"271\" cy=\"90\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"56\" cy=\"79\" r=\"1.2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><g id=\"p-art-square-one-night-campus-building\" ><g transform=\"translate(126.79411764705883 129.2139037433155) scale(1.4064171122994653)\"><g id=\"p-art-square-one-night-plaza\" ><path d=\"M-53.74 22.63L45.25 72.12L12.73 88.39L-86.27 38.89Z\" fill=\"#FFF4DE\" stroke-width=\"1.2\" /></g><path d=\"M-41.72 35.00L-35.36 38.18L-40.31 40.66L-46.67 37.48Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-13.44 49.14L-7.07 52.33L-12.02 54.80L-18.38 51.62Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M14.85 63.29L21.21 66.47L16.26 68.94L9.9 65.76Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-64.35 32.17L-57.98 35.36L-62.93 37.83L-69.3 34.65Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-36.06 46.32L-29.7 49.50L-34.65 51.97L-41.01 48.79Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-7.78 60.46L-1.41 63.64L-6.36 66.11L-12.73 62.93Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M20.51 74.60L26.87 77.78L21.92 80.26L15.56 77.07Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-58.69 43.49L-52.33 46.67L-57.28 49.14L-63.64 45.96Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-30.41 57.63L-24.04 60.81L-28.99 63.29L-35.36 60.10Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-2.12 71.77L4.24 74.95L-0.71 77.43L-7.07 74.25Z\" fill=\"#E2384A\" stroke-width=\"0\" /><g id=\"p-art-square-one-night-block\" ><path d=\"M-50.91 25.46L36.77 69.30L36.77 34.66L-50.91 -9.19Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M36.77 69.30L87.68 43.84L87.68 9.20L36.77 34.66Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M36.77 69.30L87.68 43.84L87.68 9.20L36.77 34.66Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><path d=\"M82.17 43.28L75.8 46.46L75.8 37.80L82.17 34.62Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M71.56 48.58L65.2 51.76L65.2 43.10L71.56 39.92Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M60.95 53.88L54.59 57.06L54.59 48.40L60.95 45.22Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M50.35 59.19L43.98 62.37L43.98 53.71L50.35 50.53Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M82.17 29.42L75.8 32.60L75.8 23.94L82.17 20.76Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M71.56 34.72L65.2 37.90L65.2 29.24L71.56 26.06Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M60.95 40.03L54.59 43.21L54.59 34.55L60.95 31.37Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M50.35 45.33L43.98 48.51L43.98 39.85L50.35 36.67Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><g id=\"p-art-square-one-night-glazing\" ><path d=\"M-41.3 28.81L26.59 62.76L26.59 37.64L-41.3 3.70Z\" fill=\"#FFC84A\" stroke-width=\"1.2\" /><path d=\"M-32.95 33.13L-32.95 8.01\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-24.47 37.37L-24.47 12.26\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-15.98 41.61L-15.98 16.5\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-7.5 45.86L-7.5 20.74\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M0.99 50.10L0.99 24.98\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M9.48 54.34L9.48 29.23\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M17.96 58.58L17.96 33.47\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M26.45 62.83L26.45 37.71\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-41.44 16.76L26.45 50.7\" fill=\"none\" stroke-width=\"1.1\" /><path d=\"M-32.31 18.79L-26.66 21.62L-26.66 13.83L-32.31 11.00Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /><path d=\"M-8.98 30.46L-3.32 33.29L-3.32 25.50L-8.98 22.67Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /><path d=\"M14.35 42.13L20.01 44.96L20.01 37.16L14.35 34.34Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /></g><g id=\"p-art-square-one-night-red-frame\" ><path d=\"M-55.15 26.87L-45.96 31.47L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-45.96 31.47L-42.43 29.70L-42.43 -6.67L-45.96 -4.91Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-45.96 31.47L-42.43 29.70L-42.43 -6.67L-45.96 -4.91Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M24.75 66.82L33.94 71.42L33.94 35.04L24.75 30.45Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 71.42L37.48 69.65L37.48 33.28L33.94 35.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 71.42L37.48 69.65L37.48 33.28L33.94 35.04Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-55.15 -0.84L33.94 43.70L33.94 35.04L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 43.70L37.48 41.94L37.48 33.28L33.94 35.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 43.70L37.48 41.94L37.48 33.28L33.94 35.04Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-45.33 5.01L23.97 39.66L23.97 35.33L-45.33 0.68Z\" fill=\"#FFF4DE\" stroke-width=\"0.6\" /><path d=\"M32.53 70.00L36.06 71.77L36.06 35.40L32.53 33.63Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M36.06 71.77L57.98 60.81L57.98 24.44L36.06 35.40Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M36.06 71.77L57.98 60.81L57.98 24.44L36.06 35.40Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><g id=\"p-art-square-one-night-sign\" ><path d=\"M-23.19 4.92L4.38 18.71L4.38 13.95L-23.19 0.16Z\" fill=\"#FFF4DE\" stroke-width=\"0.8\" /></g><path d=\"M-50.2 39.24V32.24\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-50.20458138\" cy=\"32.24442629\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-27.58 54.09V47.09\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-27.577164420000003\" cy=\"47.09366867000001\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M3.54 66.11V59.11\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"3.5355339000000003\" cy=\"59.114483930000006\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-51.62 51.27V44.27\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-51.61879494\" cy=\"44.265241550000006\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-20.51 67.53V60.53\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-20.50609662\" cy=\"60.52869749\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-79.9 27.93V12.98\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"-79.90306614\" cy=\"10.68071781\" rx=\"8.28\" ry=\"7.82\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"-82.90306614\" cy=\"7.230717810000002\" rx=\"6.67\" ry=\"6.8999999999999995\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><path d=\"M39.6 81.32V67.02\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"39.59797968\" cy=\"64.8172797\" rx=\"7.92\" ry=\"7.48\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"36.59797968\" cy=\"61.5172797\" rx=\"6.38\" ry=\"6.6\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/></g></g><g id=\"p-art-square-one-night-firefly-1\" ><circle cx=\"77\" cy=\"69\" r=\"14\" fill=\"url(#p-art-square-one-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(71 62) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-square-one-night-insect-3-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-3-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-3-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-square-one-night-insect-3-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-square-one-night-firefly-2\" ><circle cx=\"210\" cy=\"94\" r=\"14\" fill=\"url(#p-art-square-one-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(204 87) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-square-one-night-insect-4-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-4-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-4-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-square-one-night-insect-4-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-square-one-night-firefly-3\" ><circle cx=\"252\" cy=\"181\" r=\"14\" fill=\"url(#p-art-square-one-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(246 174) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-square-one-night-insect-5-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-5-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-square-one-night-insect-5-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-square-one-night-insect-5-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g></g></svg>","art-turing-night":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\" fill=\"none\"><defs><radialGradient id=\"p-art-turing-night-firefly-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><circle cx=\"32\" cy=\"34\" r=\"1.8\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"33\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"271\" cy=\"90\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"56\" cy=\"79\" r=\"1.2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><g id=\"p-art-turing-night-campus-building\" ><g transform=\"translate(152.43478260869566 127.3913043478261) scale(1.2173913043478262)\"><path d=\"M-89.1 44.55L-12.73 82.73L-12.73 32.50L-89.1 -5.68Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-12.73 82.73L76.37 38.18L76.37 -12.05L-12.73 32.50Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M-12.73 82.73L76.37 38.18L76.37 -12.05L-12.73 32.50Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M0 -50.23L76.37 -12.05L-12.73 32.50L-89.1 -5.68Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M0 -50.23L76.37 -12.05L-12.73 32.50L-89.1 -5.68Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M0 -50.23L76.37 -12.05L-12.73 32.50L-89.1 -5.68Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M71.56 36.40L63.78 40.29L63.78 35.09L71.56 31.20Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M58.12 43.12L50.35 47.01L50.35 41.81L58.12 37.92Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M44.69 49.83L36.91 53.72L36.91 48.53L44.69 44.64Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M31.25 56.55L23.48 60.44L23.48 55.24L31.25 51.36Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.82 63.27L10.04 67.16L10.04 61.96L17.82 58.07Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M4.38 69.99L-3.39 73.88L-3.39 68.68L4.38 64.79Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M71.56 26.01L63.78 29.90L63.78 24.70L71.56 20.81Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M58.12 32.72L50.35 36.61L50.35 31.42L58.12 27.53Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M44.69 39.44L36.91 43.33L36.91 38.13L44.69 34.25Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M31.25 46.16L23.48 50.05L23.48 44.85L31.25 40.96Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.82 52.88L10.04 56.77L10.04 51.57L17.82 47.68Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M4.38 59.59L-3.39 63.48L-3.39 58.29L4.38 54.40Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M71.56 15.61L63.78 19.50L63.78 14.31L71.56 10.42Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M58.12 22.33L50.35 26.22L50.35 21.03L58.12 17.14Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M44.69 29.05L36.91 32.94L36.91 27.74L44.69 23.85Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M31.25 35.77L23.48 39.66L23.48 34.46L31.25 30.57Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.82 42.48L10.04 46.37L10.04 41.18L17.82 37.29Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M4.38 49.20L-3.39 53.09L-3.39 47.90L4.38 44.01Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M71.56 5.22L63.78 9.11L63.78 3.92L71.56 0.03Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M58.12 11.94L50.35 15.83L50.35 10.63L58.12 6.74Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M44.69 18.66L36.91 22.55L36.91 17.35L44.69 13.46Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M31.25 25.37L23.48 29.26L23.48 24.07L31.25 20.18Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M17.82 32.09L10.04 35.98L10.04 30.79L17.82 26.90Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M4.38 38.81L-3.39 42.70L-3.39 37.50L4.38 33.61Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-87.96 42.80L-58.27 57.65L-58.27 16.08L-87.96 1.23Z\" fill=\"#E2384A\" stroke-width=\"1\" /><path d=\"M-85.28 40.82L-80.33 43.29L-80.33 38.96L-85.28 36.49Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-76.79 45.06L-71.84 47.54L-71.84 43.21L-76.79 40.73Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-68.31 49.30L-63.36 51.78L-63.36 47.45L-68.31 44.97Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-85.28 31.29L-80.33 33.77L-80.33 29.44L-85.28 26.96Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-76.79 35.54L-71.84 38.01L-71.84 33.68L-76.79 31.21Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-68.31 39.78L-63.36 42.25L-63.36 37.92L-68.31 35.45Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-85.28 21.77L-80.33 24.24L-80.33 19.91L-85.28 17.44Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-76.79 26.01L-71.84 28.48L-71.84 24.15L-76.79 21.68Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-68.31 30.25L-63.36 32.73L-63.36 28.40L-68.31 25.92Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-85.28 12.24L-80.33 14.72L-80.33 10.38L-85.28 7.91Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-76.79 16.48L-71.84 18.96L-71.84 14.63L-76.79 12.15Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-68.31 20.73L-63.36 23.20L-63.36 18.87L-68.31 16.40Z\" fill=\"#FFC84A\" stroke-width=\"0.6\" /><path d=\"M-38.54 70.18L-13.08 82.91L-13.08 30.08L-38.54 17.35Z\" fill=\"#FFF9EC\" stroke-width=\"1\" /><path d=\"M-35.21 61.66L-17.54 70.50L-17.54 41.92L-35.21 33.08Z\" fill=\"#3CC3B0\" stroke-width=\"0.7\" /><path d=\"M-33.94 61.57L-19.8 68.64L-21.92 45.93L-29.7 49.84Z\" fill=\"#8B7CF6\" stroke-width=\"0.7\" /><path d=\"M-36.77 27.25L-15.56 37.86L-15.56 34.39L-36.77 23.79Z\" fill=\"#0E1034\" stroke-width=\"0.5\" /><path d=\"M-66.47 65.05L-63.64 66.47L-63.64 9.31L-66.47 7.90Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-63.64 66.47L-60.81 65.05L-60.81 7.90L-63.64 9.31Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-63.64 66.47L-60.81 65.05L-60.81 7.90L-63.64 9.31Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-63.64 6.48L-60.81 7.90L-63.64 9.31L-66.47 7.90Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-63.64 6.48L-60.81 7.90L-63.64 9.31L-66.47 7.90Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-63.64 6.48L-60.81 7.90L-63.64 9.31L-66.47 7.90Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-61.52 67.53L-58.69 68.94L-58.69 11.79L-61.52 10.37Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-58.69 68.94L-55.86 67.53L-55.86 10.37L-58.69 11.79Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-58.69 68.94L-55.86 67.53L-55.86 10.37L-58.69 11.79Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-58.69 8.96L-55.86 10.37L-58.69 11.79L-61.52 10.37Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-58.69 8.96L-55.86 10.37L-58.69 11.79L-61.52 10.37Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-58.69 8.96L-55.86 10.37L-58.69 11.79L-61.52 10.37Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-56.57 70.00L-53.74 71.42L-53.74 14.26L-56.57 12.85Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-53.74 71.42L-50.91 70.00L-50.91 12.85L-53.74 14.26Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-53.74 71.42L-50.91 70.00L-50.91 12.85L-53.74 14.26Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-53.74 11.43L-50.91 12.85L-53.74 14.26L-56.57 12.85Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-53.74 11.43L-50.91 12.85L-53.74 14.26L-56.57 12.85Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-53.74 11.43L-50.91 12.85L-53.74 14.26L-56.57 12.85Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-51.62 72.48L-48.79 73.89L-48.79 16.73L-51.62 15.32Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-48.79 73.89L-45.96 72.48L-45.96 15.32L-48.79 16.73Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-48.79 73.89L-45.96 72.48L-45.96 15.32L-48.79 16.73Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-48.79 13.91L-45.96 15.32L-48.79 16.73L-51.62 15.32Z\" fill=\"#E2384A\" stroke-width=\"0.9\" /><path d=\"M-48.79 13.91L-45.96 15.32L-48.79 16.73L-51.62 15.32Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-48.79 13.91L-45.96 15.32L-48.79 16.73L-51.62 15.32Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-70.71 7.03L-69.3 7.74L-69.3 6.01L-70.71 5.30Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-69.3 7.74L-55.15 0.67L-55.15 -1.07L-69.3 6.01Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-69.3 7.74L-55.15 0.67L-55.15 -1.07L-69.3 6.01Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-56.57 -1.77L-55.15 -1.07L-69.3 6.01L-70.71 5.30Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-56.57 -1.77L-55.15 -1.07L-69.3 6.01L-70.71 5.30Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-56.57 -1.77L-55.15 -1.07L-69.3 6.01L-70.71 5.30Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-66.47 9.15L-65.05 9.86L-65.05 8.13L-66.47 7.42Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-65.05 9.86L-50.91 2.79L-50.91 1.06L-65.05 8.13Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-65.05 9.86L-50.91 2.79L-50.91 1.06L-65.05 8.13Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-52.33 0.35L-50.91 1.06L-65.05 8.13L-66.47 7.42Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-52.33 0.35L-50.91 1.06L-65.05 8.13L-66.47 7.42Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-52.33 0.35L-50.91 1.06L-65.05 8.13L-66.47 7.42Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-62.23 11.27L-60.81 11.98L-60.81 10.25L-62.23 9.54Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-60.81 11.98L-46.67 4.91L-46.67 3.18L-60.81 10.25Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-60.81 11.98L-46.67 4.91L-46.67 3.18L-60.81 10.25Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-48.08 2.47L-46.67 3.18L-60.81 10.25L-62.23 9.54Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-48.08 2.47L-46.67 3.18L-60.81 10.25L-62.23 9.54Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-48.08 2.47L-46.67 3.18L-60.81 10.25L-62.23 9.54Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-57.98 13.39L-56.57 14.10L-56.57 12.37L-57.98 11.66Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-56.57 14.10L-42.43 7.03L-42.43 5.30L-56.57 12.37Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-56.57 14.10L-42.43 7.03L-42.43 5.30L-56.57 12.37Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-43.84 4.59L-42.43 5.30L-56.57 12.37L-57.98 11.66Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-43.84 4.59L-42.43 5.30L-56.57 12.37L-57.98 11.66Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-43.84 4.59L-42.43 5.30L-56.57 12.37L-57.98 11.66Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-53.74 15.52L-52.33 16.22L-52.33 14.49L-53.74 13.78Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-52.33 16.22L-38.18 9.15L-38.18 7.42L-52.33 14.49Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-52.33 16.22L-38.18 9.15L-38.18 7.42L-52.33 14.49Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-39.6 6.71L-38.18 7.42L-52.33 14.49L-53.74 13.78Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-39.6 6.71L-38.18 7.42L-52.33 14.49L-53.74 13.78Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-39.6 6.71L-38.18 7.42L-52.33 14.49L-53.74 13.78Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-49.5 17.64L-48.08 18.34L-48.08 16.61L-49.5 15.90Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-48.08 18.34L-33.94 11.27L-33.94 9.54L-48.08 16.61Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-48.08 18.34L-33.94 11.27L-33.94 9.54L-48.08 16.61Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-35.36 8.83L-33.94 9.54L-48.08 16.61L-49.5 15.90Z\" fill=\"#FFF9EC\" stroke-width=\"0.7\" /><path d=\"M-35.36 8.83L-33.94 9.54L-48.08 16.61L-49.5 15.90Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-35.36 8.83L-33.94 9.54L-48.08 16.61L-49.5 15.90Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-57.7 59.80L-40.02 68.64L-40.02 59.12L-57.7 50.28Z\" fill=\"#FFC84A\" stroke-width=\"0.7\" /><path d=\"M-103.24 58.69V44.39\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"-103.23758988\" cy=\"42.18986274\" rx=\"7.92\" ry=\"7.48\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"-106.23758988\" cy=\"38.88986274\" rx=\"6.38\" ry=\"6.6\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><path d=\"M-37.48 89.45V73.2\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"-37.476659340000005\" cy=\"70.69900767\" rx=\"9.0\" ry=\"8.5\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"-40.476659340000005\" cy=\"66.94900767\" rx=\"7.249999999999999\" ry=\"7.5\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/></g></g><g id=\"p-art-turing-night-firefly-1\" ><circle cx=\"77\" cy=\"69\" r=\"14\" fill=\"url(#p-art-turing-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(71 62) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-turing-night-insect-9-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-9-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-9-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-turing-night-insect-9-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-turing-night-firefly-2\" ><circle cx=\"210\" cy=\"94\" r=\"14\" fill=\"url(#p-art-turing-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(204 87) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-turing-night-insect-10-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-10-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-10-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-turing-night-insect-10-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g><g id=\"p-art-turing-night-firefly-3\" ><circle cx=\"252\" cy=\"181\" r=\"14\" fill=\"url(#p-art-turing-night-firefly-glow)\" stroke=\"none\"/><g transform=\"translate(246 174) scale(0.5)\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-art-turing-night-insect-11-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-11-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-art-turing-night-insect-11-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-art-turing-night-insect-11-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g></g></svg>","avatar-1":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-1-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-avatar-1-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-1-hair\" ><path d=\"M20 24Q17 8 32 11Q49 10 44 25L38 18L30 21L24 17Z\" fill=\"#14102E\" stroke-width=\"2\" /></g></g></svg>","avatar-2":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-2-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#C8F560\" stroke-width=\"4\"/></g><g id=\"p-avatar-2-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-2-hair\" ><path d=\"M18 37V23Q18 7 32 10Q46 9 46 23V39L39 35V19Q32 24 25 18V36Z\" fill=\"#14102E\" stroke-width=\"2\" /></g></g></svg>","avatar-3":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-3-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FF8A5B\" stroke-width=\"4\"/></g><g id=\"p-avatar-3-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-3-hair\" ><path d=\"M18 22Q17 9 32 10Q47 9 46 22Z\" fill=\"#8B7CF6\" stroke-width=\"2\" /><path d=\"M17 23H48\" fill=\"none\" /></g></g></svg>","avatar-4":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-4-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FF8FB1\" stroke-width=\"4\"/></g><g id=\"p-avatar-4-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-4-hair\" ><path d=\"M20 24Q17 8 32 11Q49 10 44 25L38 18L30 21L24 17Z\" fill=\"#14102E\" stroke-width=\"2\" /></g></g></svg>","avatar-5":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-5-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#3CC3B0\" stroke-width=\"4\"/></g><g id=\"p-avatar-5-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-5-hair\" ><path d=\"M18 37V23Q18 7 32 10Q46 9 46 23V39L39 35V19Q32 24 25 18V36Z\" fill=\"#14102E\" stroke-width=\"2\" /></g></g></svg>","avatar-6":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-avatar-6-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#8B7CF6\" stroke-width=\"4\"/></g><g id=\"p-avatar-6-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-6-hair\" ><path d=\"M20 22Q18 9 32 10Q46 10 44 23L38 18L28 20Z\" fill=\"#14102E\" stroke-width=\"2\" /><circle cx=\"27\" cy=\"26\" r=\"4\" fill=\"none\" stroke-width=\"1.7\"/><circle cx=\"37\" cy=\"26\" r=\"4\" fill=\"none\" stroke-width=\"1.7\"/><path d=\"M31 26H33\" fill=\"none\" stroke-width=\"1.5\" /></g></g></svg>","avatar-7":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g><g id=\"p-avatar-7-disc\" ><circle cx=\"32\" cy=\"32\" r=\"29\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-avatar-7-person\" ><path d=\"M14 57V49Q14 36 32 36Q50 36 50 49V57Z\" fill=\"#FFF4DE\" /><circle cx=\"32\" cy=\"25\" r=\"12\" fill=\"#FFF4DE\"/></g><g id=\"p-avatar-7-hair\" ><path d=\"M20 24Q17 8 32 11Q49 10 44 25L38 18L30 21L24 17Z\" fill=\"#14102E\" stroke-width=\"2\" /></g></g></g></svg>","badge-beacon":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-badge-beacon-shadow\" ><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke-width=\"4\"/></g><g id=\"p-badge-beacon-disc\" ><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-badge-beacon-glyph\" ><path d=\"M25 30L21 48H39L35 30Z\" fill=\"#E2384A\" /><rect x=\"24\" y=\"21\" width=\"12\" height=\"10\" rx=\"2\" fill=\"#FFF4DE\" /><path d=\"M26 19L30 14L34 19ZM10 22L19 26L10 30ZM50 22L41 26L50 30Z\" fill=\"#C8F560\" /><path d=\"M20 49H40\" fill=\"none\" /></g></g></svg>","badge-glow":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-badge-glow-shadow\" ><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke-width=\"4\"/></g><g id=\"p-badge-glow-disc\" ><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-badge-glow-glyph\" ><g transform=\"translate(14 10) scale(1.35)\"><g id=\"p-badge-glow-insect-2-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-badge-glow-insect-2-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-badge-glow-insect-2-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-badge-glow-insect-2-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></g></svg>","badge-lantern":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-badge-lantern-shadow\" ><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke-width=\"4\"/></g><g id=\"p-badge-lantern-disc\" ><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-badge-lantern-glyph\" ><path d=\"M25 15Q30 7 35 15M30 46V52\" fill=\"none\" /><rect x=\"18\" y=\"18\" width=\"24\" height=\"27\" rx=\"8\" fill=\"#E2384A\" stroke-width=\"3\" /><path d=\"M23 15H37M23 48H37M26 24V39M34 24V39\" fill=\"none\" stroke=\"#FFF4DE\" /></g></g></svg>","badge-spark":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-badge-spark-shadow\" ><circle cx=\"34\" cy=\"34\" r=\"27\" fill=\"#14102E\" stroke-width=\"4\"/></g><g id=\"p-badge-spark-disc\" ><circle cx=\"30\" cy=\"30\" r=\"27\" fill=\"#FFF4DE\" stroke-width=\"4\"/></g><g id=\"p-badge-spark-glyph\" ><circle cx=\"30\" cy=\"30\" r=\"7\" fill=\"#FFC84A\"/><path d=\"M30 16V12M30 48V44M16 30H12M48 30H44\" fill=\"none\" /></g></g></svg>","ff-spark":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" fill=\"none\"><defs><radialGradient id=\"p-ff-spark-tail-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-ff-spark-glow\" ><circle cx=\"101\" cy=\"132\" r=\"49\" fill=\"url(#p-ff-spark-tail-glow)\" stroke=\"none\"/></g><g id=\"p-ff-spark-wing-l\" ><path d=\"M88 99C65 66 45 78 53 96C58 108 76 111 88 105Z\" fill=\"#FFF4DE\" stroke-width=\"4\" /></g><g id=\"p-ff-spark-wing-r\" ><path d=\"M112 99C132 71 149 79 143 94C138 105 123 107 112 105Z\" fill=\"#FFF4DE\" stroke-width=\"4\" /></g><g id=\"p-ff-spark-body\" ><rect x=\"90\" y=\"89\" width=\"20\" height=\"40\" rx=\"10\" fill=\"#14102E\" stroke-width=\"3\" /><circle cx=\"100\" cy=\"80\" r=\"10\" fill=\"#14102E\" stroke-width=\"3\"/><path d=\"M95 71L87 59M105 71L112 59\" fill=\"none\" stroke-width=\"3\" /></g><g id=\"p-ff-spark-tail-light\" ><ellipse cx=\"100\" cy=\"132\" rx=\"13\" ry=\"18\" fill=\"#FFC84A\" stroke-width=\"4\"/></g><g id=\"p-ff-spark-extra\" ></g></g></svg>","icon-back":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-back-icon\" ><path d=\"M10 5L3 12L10 19M3 12H21\" fill=\"none\" /></g></g></svg>","icon-bring-in":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-bring-in-icon\" ><path d=\"M12 3V16M7 11L12 16L17 11M3 16V20Q3 21 5 21H19Q21 21 21 20V16\" fill=\"none\" /></g></g></svg>","icon-check":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-check-icon\" ><path d=\"M4 12L9 17L20 6\" fill=\"none\" /></g></g></svg>","icon-clock":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-clock-icon\" ><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\"/><path d=\"M12 7V12L16 14\" fill=\"none\" /></g></g></svg>","icon-close":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-close-icon\" ><path d=\"M6 6L18 18M18 6L6 18\" fill=\"none\" /></g></g></svg>","icon-glow-filled":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-glow-filled-icon\" ><path d=\"M12 21C9 19 3 15 3 9A5 5 0 0 1 12 6A5 5 0 0 1 21 9C21 15 15 19 12 21Z\" fill=\"#FFC84A\" /></g></g></svg>","icon-glow":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-glow-icon\" ><path d=\"M12 21C9 19 3 15 3 9A5 5 0 0 1 12 6A5 5 0 0 1 21 9C21 15 15 19 12 21Z\" fill=\"none\" /></g></g></svg>","icon-inbox":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-inbox-icon\" ><path d=\"M3 14L6 4H18L21 14V21H3Z\" fill=\"none\" /><path d=\"M3 14H8L10 17H14L16 14H21\" fill=\"none\" /></g></g></svg>","icon-me":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-me-icon\" ><circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"none\"/><circle cx=\"12\" cy=\"8\" r=\"3\" fill=\"none\"/><path d=\"M5 19C5 12 19 12 19 19\" fill=\"none\" /></g></g></svg>","icon-meet":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-meet-icon\" ><circle cx=\"9\" cy=\"7\" r=\"3\" fill=\"none\"/><path d=\"M3 20V18C3 12 15 12 15 18V20M17 4C21 4 21 10 17 10M18 14C21 14 22 17 22 20\" fill=\"none\" /></g></g></svg>","icon-next":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-next-icon\" ><path d=\"M14 5L21 12L14 19M3 12H21\" fill=\"none\" /></g></g></svg>","icon-pin":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-pin-icon\" ><path d=\"M19.5 10C19.5 15 12 22 12 22S4.5 15 4.5 10A7.5 7.5 0 0 1 19.5 10Z\" fill=\"none\" /><circle cx=\"12\" cy=\"10\" r=\"2.5\" fill=\"none\"/></g></g></svg>","icon-prompt":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-prompt-icon\" ><path d=\"M6 3H18Q21 3 21 6V14Q21 17 18 17H9L3 21V6Q3 3 6 3Z\" fill=\"none\" /><path d=\"M7 7H17M7 11H17\" fill=\"none\" /></g></g></svg>","icon-release":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-release-icon\" ><path d=\"M12 16V3M5 10L12 3L19 10\" fill=\"none\" /><circle cx=\"12\" cy=\"21\" r=\"1.1\" fill=\"#14102E\" stroke-width=\"0\"/></g></g></svg>","icon-share":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-share-icon\" ><path d=\"M12 15V3M7 8L12 3L17 8M7 12H5Q3 12 3 14V20Q3 22 5 22H19Q21 22 21 20V14Q21 12 19 12H17\" fill=\"none\" /></g></g></svg>","icon-sky":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-sky-icon\" ><path d=\"M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21ZM9 3V18M15 6V21\" fill=\"none\" /></g></g></svg>","icon-upload":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-upload-icon\" ><path d=\"M12 15V3M7 8L12 3L17 8M3 15V20Q3 21 5 21H19Q21 21 21 20V15\" fill=\"none\" /></g></g></svg>","icon-walk":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-icon-walk-icon\" ><circle cx=\"14\" cy=\"4\" r=\"2\" fill=\"none\"/><path d=\"M12 9L10 15L5 20M10 15L16 18L18 22M12 9L16 12H21M11 10L7 12H3\" fill=\"none\" /></g></g></svg>","ill-make":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 240\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-ill-make-shadow\" ><rect x=\"22\" y=\"51\" width=\"126\" height=\"162\" rx=\"12\" fill=\"#14102E\" stroke-width=\"4\" /><rect x=\"178\" y=\"39\" width=\"120\" height=\"162\" rx=\"12\" fill=\"#14102E\" stroke-width=\"4\" /></g><g id=\"p-ill-make-sketch\" ><rect x=\"18\" y=\"47\" width=\"126\" height=\"162\" rx=\"12\" fill=\"#FFF4DE\" stroke-width=\"4\" /><path d=\"M39 47V209\" fill=\"none\" /><path d=\"M61 110L70 176Q87 184 106 176L115 110Z\" fill=\"none\" stroke-width=\"3\" /><ellipse cx=\"88\" cy=\"110\" rx=\"27\" ry=\"5\" fill=\"#FFF4DE\" stroke-width=\"3\"/><path d=\"M76 96C63 81 85 85 76 70M98 96C109 83 92 78 101 67\" fill=\"none\" /><ellipse cx=\"88\" cy=\"146\" rx=\"21\" ry=\"5\" fill=\"none\"/><circle cx=\"89\" cy=\"144\" r=\"6.5\" fill=\"none\"/></g><g id=\"p-ill-make-pencil\" ><path d=\"M12 183L26 126L36 129L22 186L15 196Z\" fill=\"#FFC84A\" stroke-width=\"3\" /><path d=\"M14 176L24 179\" fill=\"none\" /></g><g id=\"p-ill-make-dots\" ><path d=\"M151 113H168M162 107L168 113L162 119\" fill=\"none\" /></g><g id=\"p-ill-make-result\" ><rect x=\"174\" y=\"35\" width=\"120\" height=\"162\" rx=\"12\" fill=\"#FFF9EC\" stroke-width=\"4\" /><svg x=\"184\" y=\"45\" width=\"100\" height=\"142\" viewBox=\"0 0 300 300\" preserveAspectRatio=\"xMidYMid slice\"><rect x=\"0\" y=\"0\" width=\"300\" height=\"300\" rx=\"0\" fill=\"#0E1034\" stroke-width=\"0\" /><g id=\"p-ill-make-background-stars\" ><circle cx=\"35\" cy=\"40\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"245\" cy=\"54\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"265\" cy=\"194\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"46\" cy=\"218\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"211\" cy=\"25\" r=\"1\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"78\" cy=\"66\" r=\"1.3\" fill=\"#FFF4DE\" stroke-width=\"0\"/></g><g id=\"p-ill-make-steam\" ><path d=\"M112 95C78 56 143 62 117 28M166 91C193 65 149 48 174 24\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /></g><g id=\"p-ill-make-glass\" ><path d=\"M84 112L101 246Q150 269 199 246L216 112Z\" fill=\"#0E1034\" stroke=\"#FFF4DE\" stroke-width=\"4\" /><ellipse cx=\"150\" cy=\"112\" rx=\"66\" ry=\"12\" fill=\"#FFF4DE\" stroke-width=\"3\"/><path d=\"M99 133L111 233M201 133L189 233\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /><ellipse cx=\"150\" cy=\"244\" rx=\"49\" ry=\"10\" fill=\"none\" stroke-width=\"3\"/></g><g id=\"p-ill-make-galaxy\" ><ellipse cx=\"150\" cy=\"183\" rx=\"44\" ry=\"13\" fill=\"#8B7CF6\" stroke-width=\"3\"/><ellipse cx=\"150\" cy=\"183\" rx=\"56\" ry=\"8\" fill=\"none\" stroke=\"#FFC84A\" stroke-width=\"3\"/><circle cx=\"153\" cy=\"179\" r=\"17\" fill=\"#FFC84A\" stroke-width=\"3\"/><path d=\"M104 192Q150 160 198 178\" fill=\"none\" stroke=\"#FFF4DE\" stroke-width=\"3\" /><circle cx=\"120\" cy=\"155\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"178\" cy=\"211\" r=\"2\" fill=\"#FFF4DE\" stroke-width=\"0\"/><circle cx=\"135\" cy=\"218\" r=\"1.5\" fill=\"#FFF4DE\" stroke-width=\"0\"/></g></svg></g><g id=\"p-ill-make-sparkle-1\" ><circle cx=\"156\" cy=\"34\" r=\"3\" fill=\"#FFC84A\" stroke-width=\"2\"/></g><g id=\"p-ill-make-sparkle-2\" ><circle cx=\"290\" cy=\"206\" r=\"3\" fill=\"#C8F560\" stroke-width=\"2\"/></g><g id=\"p-ill-make-sparkle-3\" ><circle cx=\"148\" cy=\"204\" r=\"3\" fill=\"#FF8A5B\" stroke-width=\"2\"/></g></g></svg>","ill-release":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 240\" fill=\"none\"><defs><radialGradient id=\"p-ill-release-landing-glow\"><stop stop-color=\"#FFF4DE\" stop-opacity=\".9\"/><stop offset=\".2\" stop-color=\"#FFC84A\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#FFC84A\" stop-opacity=\"0\"/></radialGradient></defs><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-ill-release-architecture\" ><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><g id=\"p-ill-release-plaza\" ><path d=\"M-53.74 22.63L45.25 72.12L12.73 88.39L-86.27 38.89Z\" fill=\"#FFF4DE\" stroke-width=\"1.2\" /></g><path d=\"M-41.72 35.00L-35.36 38.18L-40.31 40.66L-46.67 37.48Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-13.44 49.14L-7.07 52.33L-12.02 54.80L-18.38 51.62Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M14.85 63.29L21.21 66.47L16.26 68.94L9.9 65.76Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-64.35 32.17L-57.98 35.36L-62.93 37.83L-69.3 34.65Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-36.06 46.32L-29.7 49.50L-34.65 51.97L-41.01 48.79Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-7.78 60.46L-1.41 63.64L-6.36 66.11L-12.73 62.93Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M20.51 74.60L26.87 77.78L21.92 80.26L15.56 77.07Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-58.69 43.49L-52.33 46.67L-57.28 49.14L-63.64 45.96Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-30.41 57.63L-24.04 60.81L-28.99 63.29L-35.36 60.10Z\" fill=\"#E2384A\" stroke-width=\"0\" /><path d=\"M-2.12 71.77L4.24 74.95L-0.71 77.43L-7.07 74.25Z\" fill=\"#E2384A\" stroke-width=\"0\" /><g id=\"p-ill-release-block\" ><path d=\"M-50.91 25.46L36.77 69.30L36.77 34.66L-50.91 -9.19Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M36.77 69.30L87.68 43.84L87.68 9.20L36.77 34.66Z\" fill=\"#FFF4DE\" stroke-width=\"1.3\" /><path d=\"M36.77 69.30L87.68 43.84L87.68 9.20L36.77 34.66Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#8B7CF6\" stroke-width=\"1.3\" /><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M0 -34.64L87.68 9.20L36.77 34.66L-50.91 -9.19Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><path d=\"M82.17 43.28L75.8 46.46L75.8 37.80L82.17 34.62Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M71.56 48.58L65.2 51.76L65.2 43.10L71.56 39.92Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M60.95 53.88L54.59 57.06L54.59 48.40L60.95 45.22Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M50.35 59.19L43.98 62.37L43.98 53.71L50.35 50.53Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M82.17 29.42L75.8 32.60L75.8 23.94L82.17 20.76Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M71.56 34.72L65.2 37.90L65.2 29.24L71.56 26.06Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M60.95 40.03L54.59 43.21L54.59 34.55L60.95 31.37Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><path d=\"M50.35 45.33L43.98 48.51L43.98 39.85L50.35 36.67Z\" fill=\"#FFC84A\" stroke-width=\"0.8\" /><g id=\"p-ill-release-glazing\" ><path d=\"M-41.3 28.81L26.59 62.76L26.59 37.64L-41.3 3.70Z\" fill=\"#FFC84A\" stroke-width=\"1.2\" /><path d=\"M-32.95 33.13L-32.95 8.01\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-24.47 37.37L-24.47 12.26\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-15.98 41.61L-15.98 16.5\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-7.5 45.86L-7.5 20.74\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M0.99 50.10L0.99 24.98\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M9.48 54.34L9.48 29.23\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M17.96 58.58L17.96 33.47\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M26.45 62.83L26.45 37.71\" fill=\"none\" stroke-width=\"0.9\" /><path d=\"M-41.44 16.76L26.45 50.7\" fill=\"none\" stroke-width=\"1.1\" /><path d=\"M-32.31 18.79L-26.66 21.62L-26.66 13.83L-32.31 11.00Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /><path d=\"M-8.98 30.46L-3.32 33.29L-3.32 25.50L-8.98 22.67Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /><path d=\"M14.35 42.13L20.01 44.96L20.01 37.16L14.35 34.34Z\" fill=\"#FFF4DE\" stroke-width=\"0.3\" /></g><g id=\"p-ill-release-red-frame\" ><path d=\"M-55.15 26.87L-45.96 31.47L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-45.96 31.47L-42.43 29.70L-42.43 -6.67L-45.96 -4.91Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-45.96 31.47L-42.43 29.70L-42.43 -6.67L-45.96 -4.91Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-51.62 -11.27L-42.43 -6.67L-45.96 -4.91L-55.15 -9.50Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M24.75 66.82L33.94 71.42L33.94 35.04L24.75 30.45Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 71.42L37.48 69.65L37.48 33.28L33.94 35.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 71.42L37.48 69.65L37.48 33.28L33.94 35.04Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M28.28 28.68L37.48 33.28L33.94 35.04L24.75 30.45Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-55.15 -0.84L33.94 43.70L33.94 35.04L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 43.70L37.48 41.94L37.48 33.28L33.94 35.04Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M33.94 43.70L37.48 41.94L37.48 33.28L33.94 35.04Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M-51.62 -11.27L37.48 33.28L33.94 35.04L-55.15 -9.50Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/><path d=\"M-45.33 5.01L23.97 39.66L23.97 35.33L-45.33 0.68Z\" fill=\"#FFF4DE\" stroke-width=\"0.6\" /><path d=\"M32.53 70.00L36.06 71.77L36.06 35.40L32.53 33.63Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M36.06 71.77L57.98 60.81L57.98 24.44L36.06 35.40Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M36.06 71.77L57.98 60.81L57.98 24.44L36.06 35.40Z\" fill=\"#14102E\" stroke-width=\"0\" opacity=\".12\"/><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#E2384A\" stroke-width=\"1.3\" /><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#3CC3B0\" stroke-width=\"0\" opacity=\".22\"/><path d=\"M54.45 22.67L57.98 24.44L36.06 35.40L32.53 33.63Z\" fill=\"#0E1034\" stroke-width=\"0\" opacity=\".28\"/></g><g id=\"p-ill-release-sign\" ><path d=\"M-23.19 4.92L4.38 18.71L4.38 13.95L-23.19 0.16Z\" fill=\"#FFF4DE\" stroke-width=\"0.8\" /></g><path d=\"M-50.2 39.24V32.24\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-50.20458138\" cy=\"32.24442629\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-27.58 54.09V47.09\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-27.577164420000003\" cy=\"47.09366867000001\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M3.54 66.11V59.11\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"3.5355339000000003\" cy=\"59.114483930000006\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-51.62 51.27V44.27\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-51.61879494\" cy=\"44.265241550000006\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-20.51 67.53V60.53\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"2.8\" /><ellipse cx=\"-20.50609662\" cy=\"60.52869749\" rx=\"6\" ry=\"2.8\" fill=\"#E2384A\" stroke-width=\"1.1\"/><path d=\"M-79.9 27.93V12.98\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"-79.90306614\" cy=\"10.68071781\" rx=\"8.28\" ry=\"7.82\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"-82.90306614\" cy=\"7.230717810000002\" rx=\"6.67\" ry=\"6.8999999999999995\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><path d=\"M39.6 81.32V67.02\" fill=\"none\" stroke-width=\"2.4\" /><ellipse cx=\"39.59797968\" cy=\"64.8172797\" rx=\"7.92\" ry=\"7.48\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/><ellipse cx=\"36.59797968\" cy=\"61.5172797\" rx=\"6.38\" ry=\"6.6\" fill=\"#3CC3B0\" stroke-width=\"1.5\"/></g></g><g id=\"p-ill-release-arc\" ><path d=\"M18 41C28 9 91 9 119 42C139 67 163 76 199 71\" fill=\"none\" stroke-width=\"3\" stroke-dasharray=\"1 8\"/></g><g id=\"p-ill-release-halo\" ><circle cx=\"203\" cy=\"70\" r=\"25\" fill=\"url(#p-ill-release-landing-glow)\" stroke=\"none\"/></g><g id=\"p-ill-release-firefly\" ><g transform=\"translate(187 48) scale(1.4)\"><g id=\"p-ill-release-insect-12-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-ill-release-insect-12-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-ill-release-insect-12-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-ill-release-insect-12-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g><g id=\"p-ill-release-win-1\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-40.87 28.44L-35.92 30.92L-35.92 22.26L-40.87 19.78Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-2\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-33.45 32.16L-28.5 34.63L-28.5 25.97L-33.45 23.50Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-3\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-26.02 35.87L-21.07 38.34L-21.07 29.68L-26.02 27.21Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-4\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-18.6 39.58L-13.65 42.06L-13.65 33.40L-18.6 30.92Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-5\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-11.17 43.29L-6.22 45.77L-6.22 37.11L-11.17 34.63Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-6\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-3.75 47.01L1.2 49.48L1.2 40.82L-3.75 38.35Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-7\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M3.68 50.72L8.63 53.19L8.63 44.53L3.68 42.06Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-8\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M11.1 54.43L16.05 56.90L16.05 48.24L11.1 45.77Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-9\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M18.53 58.14L23.48 60.62L23.48 51.96L18.53 49.48Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-10\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-40.87 15.89L-35.92 18.36L-35.92 9.70L-40.87 7.23Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-11\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-33.45 19.60L-28.5 22.07L-28.5 13.41L-33.45 10.94Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-12\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-26.02 23.31L-21.07 25.79L-21.07 17.13L-26.02 14.65Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-13\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-18.6 27.02L-13.65 29.50L-13.65 20.84L-18.6 18.36Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-14\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-11.17 30.74L-6.22 33.21L-6.22 24.55L-11.17 22.08Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-15\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M-3.75 34.45L1.2 36.92L1.2 28.26L-3.75 25.79Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-16\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M3.68 38.16L8.63 40.64L8.63 31.98L3.68 29.50Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-17\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M11.1 41.87L16.05 44.35L16.05 35.69L11.1 33.21Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g><g id=\"p-ill-release-win-18\" opacity=\"0\"><g transform=\"translate(137.92253521126761 98.19718309859155) scale(1.3380281690140845)\"><path d=\"M18.53 45.59L23.48 48.06L23.48 39.40L18.53 36.92Z\" fill=\"#FFC84A\" stroke-width=\"0\" /></g></g></g></svg>","logo-mark":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g transform=\"translate(0 0) scale(1)\"><g id=\"p-logo-mark-insect-1-wing-l\" ><path d=\"M9 10C5 4 1 7 3 10C4 13 7 13 9 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-logo-mark-insect-1-wing-r\" ><path d=\"M15 10C19 4 23 7 21 10C20 13 17 13 15 12Z\" fill=\"#FFF4DE\" stroke-width=\"1.7\" /></g><g id=\"p-logo-mark-insect-1-body\" ><rect x=\"10\" y=\"8\" width=\"4\" height=\"9\" rx=\"2\" fill=\"#14102E\" stroke-width=\"1.5\" /><circle cx=\"12\" cy=\"5.5\" r=\"2\" fill=\"#14102E\" stroke-width=\"1\"/><path d=\"M11 4L9 2M13 4L15 2\" fill=\"none\" stroke-width=\"1.5\" /></g><g id=\"p-logo-mark-insect-1-tail-light\" ><ellipse cx=\"12\" cy=\"17.5\" rx=\"3\" ry=\"4\" fill=\"#FFC84A\" stroke-width=\"1.7\"/></g></g></g></svg>","marker-spot":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 80\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-marker-spot-pin\" ><path d=\"M54 26C54 42 32 63 32 63S10 42 10 26A22 22 0 0 1 54 26Z\" fill=\"#FFF4DE\" stroke-width=\"4\" /><g transform=\"translate(12 4) scale(0.9)\"><rect x=\"7\" y=\"10\" width=\"28\" height=\"21\" rx=\"1\" fill=\"#FFF4DE\" stroke-width=\"2\" /><rect x=\"12\" y=\"17\" width=\"18\" height=\"14\" rx=\"0\" fill=\"#FFC84A\" stroke-width=\"1.4\" /><path d=\"M8 30V13H34V30\" fill=\"none\" stroke=\"#E2384A\" stroke-width=\"3\" /><path d=\"M21 18V30\" fill=\"none\" stroke-width=\"1.5\" /></g></g></g></svg>","route-pin":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 80\" fill=\"none\"><g stroke=\"#14102E\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><g id=\"p-route-pin-pin\" ><path d=\"M54 26C54 42 32 63 32 63S10 42 10 26A22 22 0 0 1 54 26Z\" fill=\"#8B7CF6\" stroke-width=\"4\" /><g transform=\"translate(20 14) scale(1)\"><circle cx=\"9\" cy=\"7\" r=\"3\" fill=\"none\"/><path d=\"M3 20V18C3 12 15 12 15 18V20M17 4C21 4 21 10 17 10M18 14C21 14 22 17 22 20\" fill=\"none\" /></g></g></g></svg>"};
const packURL = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PACK[k]);
/* one icon language everywhere: r04's familiar icons replace the older kit glyphs */
for (const k in PACK) if (/^(icon-|avatar-|badge-)/.test(k) || k === 'logo-mark' || k === 'marker-spot') { const vb = (PACK[k].match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) || []); KIT[k] = vb[1] ? PACK[k].replace('<svg ', '<svg width="' + vb[1] + '" height="' + vb[2] + '" ') : PACK[k]; }

/* Supplied GPT concept art: original files remain in the campaign asset pack. */
PACK["art-chai-galaxy"] = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1254 1254\"><image width=\"1254\" height=\"1254\" href=\"assets/art-4fe133d21b4a.webp\"/></svg>";
PACK["art-square-one-night"] = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1254 1254\"><image width=\"1254\" height=\"1254\" href=\"assets/art-c9f9b018bb80.webp\"/></svg>";
PACK["art-picasso-night"] = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1254 1254\"><image width=\"1254\" height=\"1254\" href=\"assets/art-69dcc949fc5f.webp\"/></svg>";
PACK["art-turing-night"] = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1254 1254\"><image width=\"1254\" height=\"1254\" href=\"assets/art-9876f2b127a7.webp\"/></svg>";

/* ================= clearer icons: familiar shapes people already know from Maps, Photos and Messages =================
   Same 24px grid and round 2px strokes for every icon; stroke colour is replaced by currentColor in the UI. */
(() => {
  const S = (d, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14102E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`.replace('stroke-linejoin="round">', `stroke-linejoin="round"${extra}>`);
  const FLY = `<path d="M12 10.2c-1.5 0-2.4 1.3-2.4 3.4 0 2.6 1.1 5 2.4 5s2.4-2.4 2.4-5c0-2.1-.9-3.4-2.4-3.4z" fill="#14102E" stroke="none"/><circle cx="12" cy="8.1" r="1.5" fill="#14102E" stroke="none"/><path d="M11.2 9.9C9 8.4 5.6 8.5 4.6 10.2c-.9 1.6 1.6 3.4 5.2 2.9"/><path d="M12.8 9.9c2.2-1.5 5.6-1.4 6.6.3.9 1.6-1.6 3.4-5.2 2.9"/><path d="M11.3 6.9 9.9 4.8M12.7 6.9l1.4-2.1"/>`;
  const extras = {
    'icon-sky': S('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>'),                                  // map
    'icon-meet': S('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.8 14.4c2.3.1 4.1 1.7 4.7 4.6"/>'),  // people
    'icon-me': S('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.7 3.6-5.8 7-5.8s6.2 2.1 7 5.8"/>'),                            // person
    'icon-release': S(FLY + '<path d="M12 21.5v0" />'),                                                                                 // a firefly
    'icon-glow': S('<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/>'),              // heart outline (glow = love it)
    'icon-glow-filled': S('<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z" fill="#14102E"/>'),
    'icon-prompt': S('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8 8.5h8M8 12h5"/>'),
    'icon-sketch': S('<path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5z"/><path d="M13.5 6.5l4 4"/>'),
    'icon-share': S('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6.5 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/>'),
    'icon-close': S('<path d="M6 6l12 12M18 6 6 18"/>'),
    'icon-next': S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    'icon-back': S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    'icon-upload': S('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 15-4.5-4.5L7 19.5"/>'),   // photo
    'icon-pin': S('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    'icon-clock': S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    'icon-check': S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    'icon-info': S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>'),
    'icon-plus': S('<path d="M12 5v14M5 12h14"/>'),
    'icon-minus': S('<path d="M5 12h14"/>'),
    'icon-locate': S('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>'),
    'icon-compass': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.5 15.2 12H8.8z" fill="#E2384A"/><path d="M12 21.5 8.8 12h6.4z" fill="#14102E" opacity=".55"/></svg>`,
    'icon-moon': S('<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/><path d="M16.5 3.5v3M15 5h3"/>'),
    'icon-layers': S('<path d="M12 4 3 9l9 5 9-5-9-5z"/><path d="m3 14 9 5 9-5"/>'),
  };
  for(const [k,v] of Object.entries(extras)) if(!KIT[k])KIT[k]=v;
})();

/* ================= demo data: seeded, so every recording take is identical ================= */
/* ART: drop your Firefly images here (paths or URLs, e.g. 'art/01.jpg'). Empty = honest hatched placeholders. */
const ART = ["assets/art-4fe133d21b4a.webp", "assets/art-c9f9b018bb80.webp", "assets/art-69dcc949fc5f.webp", "assets/art-9876f2b127a7.webp"];
const CONCEPT_PROMPTS = ["a chai glass holding a tiny galaxy, colourful steam under a night sky", "Square One at night, warm windows and fireflies over the plaza", "Turing Block as an illuminated miniature beneath a night sky", "Picasso Block with warm windows, red architectural details and fireflies"];
const DEMO = (() => {
  let s = 20261029; const r = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(r() * a.length)];
  // swarms = schools (names are placeholders, edit freely); colours are the kit's six
  const SWARMS = [
    { k: 'eng', name: 'Engineering', col: '#FFC84A', home: 1 },   // Turing Block
    { k: 'biz', name: 'Business', col: '#C8F560', home: 29 },     // Chitkara Business School
    { k: 'hos', name: 'Hospitality', col: '#FF8A5B', home: 17 },  // Hospitality Block
    { k: 'des', name: 'Design', col: '#FF8FB1', home: 0 },        // Picasso Block
    { k: 'hea', name: 'Health', col: '#3CC3B0', home: 19 },       // Fleming Block
    { k: 'med', name: 'Media', col: '#8B7CF6', home: 15 },        // Explore Hub
  ];
  const LEVELS = ['Spark', 'Glow', 'Lantern', 'Beacon'];
  // where fireflies get released: building index (into BLD) and weight
  const SPOTW = [[2, 26], [0, 22], [1, 22], [5, 14], [28, 14], [9, 12], [10, 12], [12, 12], [16, 12], [18, 12], [3, 10], [7, 10], [14, 10], [22, 10], [13, 8], [20, 8], [29, 8], [24, 6], [27, 4]];
  const SCHOOL_B = { 1: 0, 3: 0, 9: 0, 10: 0, 22: 0, 12: 0, 29: 1, 30: 1, 17: 2, 18: 2, 0: 3, 5: 3, 19: 4, 13: 4, 15: 5, 21: 5 };
  const NAMES = ['Aarav S.', 'Ishita K.', 'Kabir M.', 'Meher G.', 'Rohan B.', 'Saanvi D.', 'Arjun P.', 'Tanvi R.', 'Vihaan J.', 'Anaya T.', 'Dhruv A.', 'Kiara N.', 'Reyansh V.', 'Myra C.', 'Advik L.',
    'Zoya H.', 'Yuvraj O.', 'Navya E.', 'Ayaan F.', 'Riya Q.', 'Kunal W.', 'Simran Y.', 'Harsh I.', 'Jasleen U.', 'Parth Z.', 'Gurleen X.', 'Nikhil K.', 'Prisha M.', 'Manav S.', 'Avni D.'];
  const PROMPTS = [
    'Turing Block as a paper lantern city at midnight, warm windows, ink outlines',
    'a chai glass that holds a tiny galaxy, steam shaped like stars',
    'monsoon on NH-7 painted like a risograph poster, three inks',
    'a robot reading poetry under a neem tree, soft gouache',
    'fireflies stitched into a phulkari dupatta, macro photo',
    'Square One food court as a cozy pixel-art diorama',
    'my grandmother\'s kitchen rebuilt from origami, morning light',
    'a mustard field that turns into piano keys, wide shot',
    'the Picasso Block melting into a Cubist sunrise',
    'bioluminescent bicycles parked outside a hostel at 2 am',
    'a library where books fly like birds, linocut style',
    'a heart drawn as a subway map of Punjab',
    'circuit boards growing like rice terraces, isometric',
    'a dhaba at the edge of space, cinematic, 35mm',
    'a shy moon learning to dance bhangra, children\'s book art',
    'graduation caps turning into paper boats on a canal',
    'a cricket match played by fireflies on the Play Ground',
    'a recipe card for happiness, collage with stamps',
    'clay animation of exam night, everyone glowing',
    'a lighthouse made of stacked sketchbooks',
    'the campus gate as a giant loom weaving light',
    'a hostel room that is secretly a greenhouse',
    'neon calligraphy of the word together, in five scripts',
    'a sleepy tiger guarding the canteen, flat vector',
    'clouds shaped like chai cups over Rajpura',
    'a skateboard deck painted like a Madhubani mural',
    'a city of umbrellas in the first rain, top view',
    'a stethoscope listening to a tree\'s heartbeat',
    'a hotel lobby made entirely of candy glass',
    'a podcast microphone sprouting sunflowers',
    'a constellation of four friends drawn as one star',
    'a bus stop where time stops for one song',
  ];
  const tot = SPOTW.reduce((a, w) => a + w[1], 0);
  const spot = () => { let x = r() * tot; for (const [b, w] of SPOTW) { if ((x -= w) < 0) return b; } return 2; };
  const lvlOf = () => { const x = r(); return x < .58 ? 0 : x < .86 ? 1 : 2; };
  const makers = NAMES.map((n, i) => ({ id: i, name: n, sw: i % 6, lvl: lvlOf(), av: 1 + (i % 6) }));
  makers[9].lvl = 3; makers[2].lvl = 2; makers[21].lvl = 2;   // Beacons stay rare   // a few guaranteed Beacons and Lanterns
  const ME = { id: -1, name: 'Me', sw: 3, lvl: 2, av: 3, glows: 128, toNext: .62, isMe: true };
  const flies = [];
  for (let i = 0; i < 64; i++) {
    const b = spot(); const home = SCHOOL_B[b];
    let m = pick(makers); if (home !== undefined && r() < .55) { const same = makers.filter(q => q.sw === home); m = pick(same); }
    flies.push({ id: i, b, sw: m.sw, lvl: m.lvl, maker: m, prompt: CONCEPT_PROMPTS[i % 4], sampleArt: true, glows: Math.floor(Math.pow(r(), 2.2) * 180) + 2, sketch: r() < .3, glowed: false, art: ART.length ? ART[i % ART.length] : null });
  }
  // the hero firefly the tour opens: a Beacon over the Picasso Block
  const hero = flies.find(f => f.b === 0 && f.maker.sw === 3) || flies.find(f => f.b === 0); hero.lvl = 3; hero.maker = makers[9]; hero.sw = makers[9].sw; hero.prompt = CONCEPT_PROMPTS[2]; hero.art = ART[2]; hero.sampleArt = true; hero.glows = 211;
  const mine = []; for (let i = 0; i < 4; i++) { const f = flies[5 + i * 15]; f.maker = ME; f.sw = 3; f.lvl = 2; mine.push(f); }
  // tonight's constellations: 3–5 people from different schools, a real spot, a time
  const meets = [
    { spot: 'Square One', at: 2, time: '9:15 PM', people: [makers[1], makers[6], makers[16], ME] },
    { spot: 'Alpha Zone', at: 'alpha', time: '9:30 PM', people: [makers[3], makers[8], makers[11], makers[19], makers[24]] },
    { spot: 'Chai Chaska Baar', at: 7, time: '9:45 PM', people: [makers[0], makers[14], makers[23]] },
  ];
  return { SWARMS, LEVELS, flies, makers, ME, mine, meets, hero, PROMPTS, rand: r };
})();

/* the hatched art placeholder from card-firefly.svg, tinted with the swarm colour */
function artFor(f) {
  if (f.art) return `<img src="${f.art}" alt="" draggable="false">`;
  if (typeof genArt === 'function') return genArt(f.seed ?? f.id, f.sw);
  const c = DEMO.SWARMS[f.sw].col, id = 'h' + f.id;
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="9" height="9" fill="#FFF4DE"/><rect width="3" height="9" fill="${c}" opacity=".55"/></pattern></defs><rect width="100" height="100" fill="url(#${id})"/><path d="M50 40C51 46 54 49 60 50C54 51 51 54 50 60C49 54 46 51 40 50C46 49 49 46 50 40Z" fill="#FFF4DE" stroke="#14102E" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
}

/* ================= sample artwork: small generated posters so the demo feels alive before real Firefly art is added =================
   Six compositions (sunset hills, orbits, night city, bloom, waves, lanterns), coloured by the maker's swarm, ink outlines like the kit.
   Every card that shows one says it is a sample. Real uploads always win. */
function genArt(seed, sw = 0) {
  if (typeof seed === 'string') { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); seed = h >>> 0; }
  let s = (seed * 2654435761 + 12345) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const PAL = [
    ['#2b2170', '#ff8a5b', '#ffc84a', '#fff4de', '#e2384a'], ['#14524a', '#c8f560', '#3cc3b0', '#fff4de', '#ffc84a'],
    ['#3a1d4f', '#ff8a5b', '#ffc84a', '#ff8fb1', '#fff4de'], ['#2a1840', '#ff8fb1', '#8b7cf6', '#fff4de', '#ffc84a'],
    ['#0e3a4a', '#3cc3b0', '#c8f560', '#fff4de', '#ff8a5b'], ['#1b1550', '#8b7cf6', '#3cc3b0', '#ffc84a', '#fff4de']];
  const P = PAL[sw % 6].slice(); if (r() < .5) [P[1], P[2]] = [P[2], P[1]];
  const k = Math.floor(r() * 6), id = 'g' + (seed % 1e7) + k, ink = '#14102E', o = `stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"`;
  let g = '';
  const stars = n => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 55).toFixed(1)}" r="${(r() * .9 + .3).toFixed(2)}" fill="${P[3]}" opacity="${(.5 + r() * .5).toFixed(2)}"/>`; return t; };
  if (k === 0) { // sunset hills
    const sy = 38 + r() * 14;
    g = `<rect width="100" height="100" fill="url(#${id}a)"/><circle cx="${30 + r() * 40}" cy="${sy}" r="${14 + r() * 8}" fill="${P[2]}" ${o}/>`;
    for (let i = 0; i < 3; i++) { const y = 58 + i * 12, a = 6 + r() * 10; g += `<path d="M-2 ${y} C 20 ${y - a} 40 ${y + a} 60 ${y - a * .6} S 90 ${y + a * .4} 102 ${y - 4} V102 H-2Z" fill="${[P[1], P[4], P[0]][i]}" ${o}/>`; }
    g = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}"/></linearGradient></defs>` + g + stars(10);
  } else if (k === 1) { // orbits
    const cx = 40 + r() * 20, cy = 42 + r() * 16;
    g = `<rect width="100" height="100" fill="${P[0]}"/>${stars(26)}`;
    for (let i = 4; i > 0; i--) g += `<circle cx="${cx}" cy="${cy}" r="${i * 11}" fill="none" stroke="${P[3]}" stroke-opacity=".35" stroke-width="1"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="12" fill="${P[2]}" ${o}/>`;
    for (let i = 1; i <= 3; i++) { const a = r() * 6.28; g += `<circle cx="${(cx + Math.cos(a) * i * 11).toFixed(1)}" cy="${(cy + Math.sin(a) * i * 11).toFixed(1)}" r="${2.5 + r() * 3}" fill="${[P[1], P[4], P[3]][i - 1]}" ${o}/>`; }
  } else if (k === 2) { // night city with lit windows
    g = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}" stop-opacity=".8"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id}a)"/>${stars(14)}<circle cx="${70 + r() * 15}" cy="20" r="8" fill="${P[3]}" ${o}/>`;
    let x = -2; while (x < 100) { const w = 10 + r() * 12, h = 25 + r() * 45, y = 100 - h; g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h + 2}" fill="${r() < .5 ? ink : P[0]}" ${o}/>`;
      for (let wy = y + 5; wy < 96; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < .45) g += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2.4" height="3" fill="${r() < .8 ? P[2] : P[3]}"/>`;
      x += w + 1; }
  } else if (k === 3) { // bloom
    const n = 6 + Math.floor(r() * 5);
    g = `<defs><radialGradient id="${id}a"><stop offset="0" stop-color="${P[1]}"/><stop offset="1" stop-color="${P[0]}"/></radialGradient></defs><rect width="100" height="100" fill="url(#${id}a)"/>`;
    for (let i = 0; i < n; i++) g += `<ellipse cx="50" cy="30" rx="${9 + r() * 3}" ry="22" fill="${i % 2 ? P[2] : P[4]}" ${o} transform="rotate(${(i * 360 / n).toFixed(1)} 50 52)"/>`;
    g += `<circle cx="50" cy="52" r="11" fill="${P[3]}" ${o}/>` + stars(8);
  } else if (k === 4) { // waves
    g = `<rect width="100" height="100" fill="${P[0]}"/><circle cx="${25 + r() * 50}" cy="26" r="13" fill="${P[2]}" ${o}/>`;
    for (let i = 0; i < 5; i++) { const y = 46 + i * 11, a = 4 + r() * 5, ph = r() * 20; g += `<path d="M-4 ${y} q ${12.5 + ph * .1} ${-a} 25 0 t 25 0 t 25 0 t 25 0 t 25 0 V104 H-4Z" fill="${[P[1], P[4], P[3], P[2], P[1]][i]}" ${o}/>`; }
  } else { // lanterns
    g = `<defs><radialGradient id="${id}a"><stop offset="0" stop-color="${P[3]}"/><stop offset=".35" stop-color="${P[2]}"/><stop offset="1" stop-color="${P[2]}" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="${P[0]}"/>${stars(12)}`;
    for (let i = 0; i < 6; i++) { const x = 10 + r() * 80, y = 18 + r() * 66, sz = 5 + r() * 7; g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(sz * 2.4).toFixed(1)}" fill="url(#${id}a)" opacity=".55"/><line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${(y - sz).toFixed(1)}" stroke="${P[3]}" stroke-opacity=".4" stroke-width=".8"/><rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz * .7).toFixed(1)}" width="${sz.toFixed(1)}" height="${(sz * 1.4).toFixed(1)}" rx="${(sz / 2.4).toFixed(1)}" fill="${i % 2 ? P[4] : P[1]}" ${o}/>`; }
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}
const artURL = (seed, sw) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(genArt(seed, sw).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" '));

/* until the real Firefly images arrive, demo fireflies use the r04 sample artworks (labelled as samples on every card) */
(() => { if (typeof ART !== 'undefined' && ART.length) return; const K = ['art-chai-galaxy', 'art-square-one-night', 'art-picasso-night', 'art-turing-night', 'art-creeper-walk', 'art-constellation-study'];
  const PR = ['a chai glass that holds a tiny galaxy, steam shaped like stars', 'Square One at night, every window warm, fireflies over the plaza', 'the Picasso Block lit like a lantern, gold slats glowing',
    'Turing Block as a tiny toy model under a night sky', 'the creeper walkway as a tunnel of little lights', 'five fireflies joined into one constellation'];
  DEMO.flies.forEach((f, i) => { if (!f.art) { const k = (i * 7 + (f.b || 0)) % K.length; f.art = packURL(K[k]); f.prompt = PR[k]; f.sampleArt = true; } }); DEMO.hero.art = packURL(K[2]); DEMO.hero.prompt = PR[2]; })();

/* ================= motion: springs, gestures, press feedback ================= */
/* Every UI move runs on a damped spring (no linear eases). Gestures hand their release velocity to the spring.
   prefers-reduced-motion: springs jump to their target and panels cross-fade (150 ms) instead. */
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
let RMO = RMQ.matches || QS.has('rm');
const setRM = v => { RMO = v; document.documentElement.classList.toggle('rm', v); };
setRM(RMO); RMQ.addEventListener && RMQ.addEventListener('change', e => setRM(e.matches));

const SPRING = { snap: [.35, 1], base: [.45, 1], glide: [.45, 1], cam: [1.05, 1], soft: [.8, 1] };
const MOTION = new Set();
class Spring {
  constructor(x = 0, kind = 'base', on = null, eps = .001) { this.x = x; this.v = 0; this.t = x; this.on = on; this.eps = eps; this.done = null; this.kind(kind); }
  kind(k) { const [r, z] = Array.isArray(k) ? k : SPRING[k]; this.k = (2 * Math.PI / r) ** 2; this.c = 4 * Math.PI * z / r; return this; }
  to(t, v) { this.t = t; if (v !== undefined) this.v = v;
    if (RMO) { this.x = t; this.v = 0; MOTION.delete(this); this.on && this.on(t, this); this._fin(); return this; }
    MOTION.add(this); return this; }
  set(x) { this.x = this.t = x; this.v = 0; MOTION.delete(this); this.on && this.on(x, this); return this; }
  then(f) { this.done = f; if (!MOTION.has(this) && Math.abs(this.x - this.t) < this.eps) this._fin(); return this; }
  _fin() { const d = this.done; this.done = null; d && d(); }
  get busy() { return MOTION.has(this); }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * h; this.x += this.v * h; }   // semi-implicit Euler at 240 Hz
    if (Math.abs(this.x - this.t) < this.eps && Math.abs(this.v) < this.eps * 8) { this.x = this.t; this.v = 0; MOTION.delete(this); this.on && this.on(this.x, this); this._fin(); return; }
    this.on && this.on(this.x, this);
  }
}
const spring = (x, kind, on, eps) => new Spring(x, kind, on, eps);
function stepMotion(dt) { for (const s of [...MOTION]) s.step(dt); }

/* Apple's rubber band and scroll projection */
const rubber = (x, d, c = .55) => (1 - 1 / (Math.abs(x) * c / d + 1)) * d * Math.sign(x);
const projectV = (v, rate = .998) => v / 1000 * rate / (1 - rate);
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* pointer position inside the stage */
const sx = e => e.clientX - STAGE.x, sy = e => e.clientY - STAGE.y;

/* drag(): follows the finger, starts after 6 px so taps still work, reports release velocity (px/s) */
function drag(el, h) {
  let st = null;
  el.addEventListener('pointerdown', e => { if (e.button > 0 || (h.ok && !h.ok(e))) return; st = { id: e.pointerId, x: sx(e), y: sy(e), on: false, s: [[performance.now(), sx(e), sy(e)]] }; });
  el.addEventListener('pointermove', e => { if (!st || e.pointerId !== st.id) return; const dx = sx(e) - st.x, dy = sy(e) - st.y;
    if (!st.on) { if (Math.hypot(dx, dy) < 6) return; st.axis = h.axis || (Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'); if (h.lock && h.lock !== st.axis && !h.both) { st = null; return; }
      st.on = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} h.start && h.start(st); }
    const now = performance.now(); st.s.push([now, sx(e), sy(e)]); while (st.s.length > 2 && now - st.s[0][0] > 90) st.s.shift();
    h.move && h.move(dx, dy, st); e.preventDefault(); });
  const up = e => { if (!st || e.pointerId !== st.id) return; const s = st; st = null; if (!s.on) return;
    const a = s.s[0], b = s.s[s.s.length - 1], dt = Math.max(16, b[0] - a[0]);
    const vx = (b[1] - a[1]) / dt * 1000, vy = (b[2] - a[2]) / dt * 1000;
    el.__dragged = performance.now(); h.end && h.end(sx(e) - s.x, sy(e) - s.y, vx, vy, s); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e => { if (el.__dragged && performance.now() - el.__dragged < 250) { e.stopPropagation(); e.preventDefault(); } }, true);
}

/* press feedback: [data-press] tiles scale to .96; .btn faces move 4 px into their hard shadow (the kit's btn-pressed) */
const PRESS = new WeakMap();
function pressOf(el) { let s = PRESS.get(el); if (!s) { s = spring(0, 'snap', v => el.style.setProperty('--p', v.toFixed(4)), .002); PRESS.set(el, s); } return s; }
document.addEventListener('pointerdown', e => { const el = e.target.closest && e.target.closest('[data-press]'); if (!el) return; pressOf(el).to(1);
  const off = () => { pressOf(el).to(0); removeEventListener('pointerup', off); removeEventListener('pointercancel', off); }; addEventListener('pointerup', off); addEventListener('pointercancel', off); });
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };
const wait = ms => new Promise(r => setTimeout(r, ms));

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

/* ================= interactive layer: the UI kit on top of the campus ================= */
const UI = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (k, cls = '') => `<i class="ic ${cls}">${(KIT['icon-' + k] || '').replace(/#14102E/g, 'currentColor')}</i>`;
  const kit = k => KIT[k] || '';
  const SW = DEMO.SWARMS, LV = DEMO.LEVELS;
  const BADGE = ['badge-spark', 'badge-glow', 'badge-lantern', 'badge-beacon'];
  const bname = b => b === 'alpha' ? 'Alpha Zone' : BLD[b][0];

  /* ---------- styles ---------- */
  const css = `
  :root{--ink:#14102E;--cream:#FFF4DE;--night:#0E1034;--red:#E2384A;--amber:#FFC84A;--lime:#C8F560;--teal:#3CC3B0;--violet:#8B7CF6;--pink:#FF8FB1;--coral:#FF8A5B;--sh:#14102E;--ui:"Archivo","Helvetica Neue",Arial,sans-serif}
  body.night{--sh:#05061A}
  .t,.n{display:none!important}
  html.rec,html.rec body{background:#05061A!important}
  html.rec canvas{inset:auto;background:radial-gradient(120% 80% at 50% 20%, #0a3a5c 0%, #062c4c 45%, #021c33 100%)}
  #app{position:fixed;z-index:5;overflow:hidden;pointer-events:none;font-family:var(--ui);color:var(--ink);-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
  #app *{box-sizing:border-box}
  :where(#app) button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
  #app button:focus-visible,#app textarea:focus-visible{outline:3px solid var(--amber);outline-offset:3px}
  .ic{display:inline-grid;place-items:center;width:24px;height:24px;flex:none;color:var(--ink)}
  .ic svg{width:100%;height:100%;display:block}
  .pe{pointer-events:auto}
  /* kit primitives: 4px ink frame, 4px hard shadow, 12px corners; the face moves into its shadow on press */
  .panel{background:var(--cream);border:4px solid var(--ink);border-radius:12px;box-shadow:4px 4px 0 var(--sh)}
  .btn{--p:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:3px solid var(--ink)!important;border-radius:999px;background:var(--cream)!important;
    box-shadow:calc((1 - var(--p))*4px) calc((1 - var(--p))*4px) 0 var(--sh);transform:translate(calc(var(--p)*4px),calc(var(--p)*4px)) scale(calc(1 - var(--p)*.03));font-weight:800!important;font-size:15px!important;letter-spacing:.01em;will-change:transform}
  .btn.amber{background:var(--amber)!important}.btn.lime{background:var(--lime)!important}.btn.red{background:var(--red)!important;color:var(--cream)!important}
  .btn.pill{height:48px;padding:0 20px 0 14px}
  .btn.ib{width:48px;height:48px;border-radius:12px}
  .tile{--p:0;transform:scale(calc(1 - var(--p)*.04))}
  .chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 8px;border:3px solid var(--ink);border-radius:999px;background:var(--cream);font-weight:700;font-size:13px;white-space:nowrap}
  .chip .ic{width:18px;height:18px}
  .dot{width:12px;height:12px;border-radius:50%;border:2.5px solid var(--ink);flex:none}
  .bar{height:6px;border-radius:3px;background:var(--ink);opacity:.16}
  /* top */
  .top{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:flex-start;padding:calc(14px + env(safe-area-inset-top,0px)) 16px 0}
  .mark{display:flex;gap:9px;align-items:center;color:var(--cream)}
  .mark .lg{width:34px;height:34px}.mark .lg svg{width:100%;height:100%}
  .mark b{display:block;font:400 20px/1 Gloock,Georgia,serif;letter-spacing:.005em;text-shadow:0 2px 12px rgba(0,0,0,.45)} .mark b em{font-style:normal;color:var(--amber)}
  .mark small{display:block;margin-top:4px;font:600 10px/1.2 var(--ui);color:#a9a3d6;letter-spacing:.03em}
  body:not(.night) .mark{color:var(--ink)} body:not(.night) .mark b{text-shadow:none} body:not(.night) .mark b em{color:var(--red)} body:not(.night) .mark small{color:#14524a}
  .top .ctl{position:static!important;display:flex;gap:8px}
  .top .ctl button{width:40px!important;height:40px!important;border-radius:11px!important;box-shadow:3px 3px 0 var(--sh)!important}
  .top .ctl svg{width:19px!important;height:19px!important}
  /* column: phone width; on 16:9 it docks to the right and the campus stays in view */
  .col{position:absolute;left:50%;bottom:0;top:0;width:min(100%,440px);transform:translateX(-50%)}
  .land .col{left:auto;right:28px;width:392px;transform:none;top:14px;bottom:6px}
  .land .top{right:440px}
  /* nav */
  .nav{position:absolute;left:12px;right:16px;bottom:calc(14px + env(safe-area-inset-bottom,0px));height:66px;display:grid;grid-template-columns:1fr 1fr 96px 1fr 1fr;align-items:center;justify-items:center;pointer-events:auto}
  .nav .bg{position:absolute;inset:0;border-radius:14px}
  .nav .pill{position:absolute;left:0;top:13px;width:58px;height:40px;border-radius:20px;background:var(--amber);border:3px solid var(--ink)}
  .nav .tab{position:relative;width:58px;height:44px;display:grid;place-items:center}
  .nav .rel{position:relative;grid-column:3;width:80px;height:80px;margin-top:-34px;border-radius:50%}
  .rbtn{--p:0;position:relative;width:100%;height:100%;border-radius:50%;background:var(--red);border:4px solid var(--ink);box-shadow:calc((1 - var(--p))*4px) calc((1 - var(--p))*4px) 0 var(--sh);
    transform:translate(calc(var(--p)*4px),calc(var(--p)*4px)) scale(calc(1 - var(--p)*.04));display:grid;place-items:center;color:var(--cream)}
  .rbtn .ic{width:40px;height:40px;color:var(--cream)}
  .ring{position:absolute;inset:-10px;pointer-events:none}.ring circle{fill:none}
  /* sheets */
  .scrim{position:absolute;inset:0;background:rgba(5,6,26,.38);-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);opacity:0;visibility:hidden;pointer-events:auto}
  .sheet{position:absolute;left:10px;right:14px;bottom:96px;padding:12px 18px 20px;visibility:hidden;pointer-events:auto;will-change:transform;touch-action:none}
  .sheet .grab{width:44px;height:5px;border-radius:3px;background:var(--ink);opacity:.16;margin:0 auto 12px}
  #card,#rel{bottom:calc(16px + env(safe-area-inset-bottom,0px))}
  .rm .sheet,.rm .scrim,.rm .tag,.rm .toast,.rm .intro{transition:opacity .15s ease-out}
  /* firefly card */
  .card .art{position:relative;aspect-ratio:1;border:3px solid var(--ink);border-radius:12px;overflow:hidden;background:var(--cream)}
  .card .art svg,.card .art img,.ghost .ai svg,.ghost .ai img{width:100%;height:100%;display:block;object-fit:cover}
  .glint{position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,244,222,.0) 44%,rgba(255,236,180,.85) 50%,rgba(255,244,222,0) 56%,transparent 58%);transform:translateX(-80%);pointer-events:none;mix-blend-mode:screen}
  .card .prompt{display:flex;gap:10px;align-items:flex-start;margin:14px 2px 0;font:600 14px/1.35 var(--ui)}
  .card .prompt p{margin:0;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .card .prompt .sk{display:none;width:30px;height:30px;border:3px solid var(--ink);border-radius:9px;background:var(--lime);place-items:center}.card .prompt .sk.on{display:grid}.card .prompt .sk .ic{width:17px;height:17px}
  .card .who{display:flex;align-items:center;gap:10px;margin-top:14px}
  .av{width:40px;height:40px;flex:none;display:block}.av svg{width:100%;height:100%;display:block}
  .who .nm{font:800 15px/1.1 var(--ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .who .meta{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:5px}
  .who .lv{width:30px;height:30px;flex:none}.who .lv svg{width:100%;height:100%}
  .glow{position:relative}.glow .cnt{position:absolute;right:-12px;top:-12px;min-width:28px;height:24px;padding:0 6px;border-radius:12px;background:var(--cream);border:3px solid var(--ink);font:800 12px/18px var(--ui);text-align:center;overflow:hidden}
  .glow.on{background:var(--amber)!important}
  .cnt .roll{display:block;transition:none}
  /* tag + markers */
  .anch{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;will-change:transform}
  .tag{position:absolute;left:-118px;top:0;width:236px;transform-origin:118px 0;pointer-events:auto}
  .tag .thread{position:absolute;left:105px;top:-2px;width:30px;height:40px}
  .tag .card0{position:relative;margin-top:36px;padding:22px 16px 16px}
  .tag .hole{position:absolute;left:50%;top:9px;width:13px;height:13px;margin-left:-6px;border-radius:50%;background:var(--night);border:3px solid var(--ink)}
  .tag h3{margin:0 0 12px;font:800 17px/1.1 var(--ui);letter-spacing:-.005em}
  .tag .row{display:flex;gap:10px;align-items:center}
  .tag .chip{background:var(--amber);flex:none}
  .mk{position:absolute;left:-26px;top:-66px;width:52px;height:65px;transform-origin:26px 65px}.mk svg{width:100%;height:100%;display:block;overflow:visible}
  .mk.you{left:-22px;top:-22px;width:44px;height:44px}
  .pulse{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px;border-radius:50%;border:3px solid var(--lime);opacity:0;animation:pulse 2.4s cubic-bezier(.2,.7,.3,1) infinite}
  @keyframes pulse{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.9);opacity:0}}
  .rm .pulse{animation:none}
  /* release sheet */
  .steps{display:flex;gap:10px;justify-content:center;margin:0 0 14px}
  .steps i{width:12px;height:12px;border-radius:50%;border:2.5px solid var(--ink);background:var(--cream)}.steps i.on{background:var(--red)}.steps i.done{background:var(--lime)}
  .rhead{position:absolute;left:14px;top:12px}
  .rhead .btn{width:38px;height:38px;border-radius:11px}
  .rhead .ic{width:20px;height:20px}
  .panes{position:relative;overflow:hidden;margin:0 -4px}
  .track{display:flex;will-change:transform}
  .pane{flex:0 0 100%;padding:2px 4px 8px;display:flex;flex-direction:column}
  .pane.p3{justify-content:center}
  .up{position:relative;height:168px;border:3px dashed var(--ink);border-radius:12px;display:grid;place-items:center;overflow:hidden;background:var(--cream)}
  .up .t0{width:56px;height:56px;border-radius:12px;background:var(--teal);border:3px solid var(--ink);display:grid;place-items:center}
  .up .pv{position:absolute;inset:0;opacity:0}.up .pv svg,.up .pv img{width:100%;height:100%;object-fit:cover;display:block}
  .up input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .fld{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px 12px;border:3px solid var(--ink);border-radius:12px;background:var(--cream)}
  .fld textarea{flex:1;border:0;outline:0;background:transparent;resize:none;font:600 14px/1.35 var(--ui);color:var(--ink);height:40px;padding:2px 0;user-select:text;-webkit-user-select:text}
  .optrow{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
  .tgl{--on:0;position:relative;width:58px;height:32px;border-radius:16px;border:3px solid var(--ink);background:color-mix(in srgb,var(--lime) calc(var(--on)*100%),var(--cream))}
  .tgl::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;border:3px solid var(--ink);background:var(--cream);transform:translateX(calc(var(--on)*26px))}
  .skrow{--p:0;display:flex;align-items:center;gap:10px;cursor:pointer;transform:scale(calc(1 - var(--p)*.04))}
  .spot{display:flex;align-items:center;gap:10px;height:52px;padding:0 14px;border:3px solid var(--ink);border-radius:12px}
  .spot b{font:800 16px var(--ui)} .spot .bar{width:120px}
  .spot .ic{color:var(--red)}
  .sws{display:flex;justify-content:space-between;margin:16px 2px 4px}
  .sw{--p:0;--s:0;width:42px;height:42px;border-radius:50%;border:3px solid var(--ink);transform:translateY(calc(var(--s)*-5px)) scale(calc(1 - var(--p)*.06));box-shadow:0 calc(var(--s)*5px) 0 var(--sh)}
  .sw.sel::after{content:"";position:absolute}
  .holdwrap{display:grid;place-items:center;padding:16px 0 2px}
  .hold{position:relative;width:104px;height:104px}
  .hold .rbtn .ic{width:48px;height:48px}
  .lbl{font:800 15px var(--ui);text-align:center;margin-top:16px}
  .mini{display:flex;gap:12px;align-items:center;justify-content:center}
  .mini .th{width:64px;height:64px;border:3px solid var(--ink);border-radius:12px;overflow:hidden}.mini .th svg,.mini .th img{width:100%;height:100%;object-fit:cover;display:block}
  .flyglyph{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;pointer-events:none}
  /* meet + me */
  .hrow{display:flex;align-items:center;gap:10px;margin-bottom:14px;font:800 18px var(--ui)}
  .cons{padding:16px}
  .avs{display:flex}.avs .av{width:52px;height:52px;margin-right:-12px}
  .chips{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  .inrow{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
  .inrow b{display:flex;align-items:center;gap:8px;font:800 15px var(--ui)}
  .inrow .ck{width:26px;height:26px;border-radius:50%;border:3px solid var(--ink);background:var(--cream);display:grid;place-items:center}.inrow .ck .ic{width:15px;height:15px}
  .others{display:flex;flex-direction:column;gap:10px;margin-top:12px}
  .oth{display:flex;align-items:center;gap:12px;padding:10px 12px;border:3px solid var(--ink);border-radius:12px}
  .oth .avs .av{width:32px;height:32px;margin-right:-8px}.oth span{font:700 13px var(--ui)}.oth .tm{margin-left:auto;font:700 12px var(--ui);opacity:.7}
  .mehead{display:flex;align-items:center;gap:14px}
  .mehead .av{width:60px;height:60px}
  .badges{display:flex;gap:10px;margin-top:2px}.badges .bd{width:46px;height:46px}.badges .bd svg{width:100%;height:100%}.badges .bd.off{opacity:.28;filter:grayscale(1)}
  .prog{position:relative;height:22px;border:3px solid var(--ink);border-radius:11px;background:var(--cream);overflow:hidden;margin-top:12px;box-shadow:3px 3px 0 var(--sh)}
  .prog i{position:absolute;left:0;top:0;bottom:0;background:var(--lime);border-right:3px solid var(--ink);width:0}
  .glowtot{display:flex;align-items:center;gap:10px;margin-top:16px;font:800 30px/1 var(--ui)}.glowtot .ic{width:32px;height:32px}
  .mine{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}.mine .th{aspect-ratio:1;border:3px solid var(--ink);border-radius:10px;overflow:hidden}.mine .th svg{width:100%;height:100%;display:block}
  .bars{display:flex;flex-direction:column;gap:9px;margin-top:16px}
  .sbar{position:relative;height:22px;border:3px solid var(--ink);border-radius:11px;background:var(--cream);box-shadow:3px 3px 0 var(--sh);overflow:hidden}
  .sbar i{position:absolute;left:0;top:0;bottom:0;border-right:3px solid var(--ink);width:0}
  .sbar span{position:absolute;right:10px;top:0;font:800 11px/16px var(--ui)}
  .credit{margin-top:14px;font:600 10.5px var(--ui);opacity:.55;text-align:center}
  /* swarm night */
  .snight{position:absolute;left:12px;right:16px;bottom:100px;padding:14px 16px;visibility:hidden}
  .snight .hrow{margin-bottom:10px}
  .snight .bars{margin-top:0;gap:8px}.snight .sbar{height:20px}
  .clockchip{position:absolute;left:50%;top:84px;transform:translateX(-50%);visibility:hidden}
  .clockchip .chip{height:40px;padding:0 16px 0 12px;font-size:16px;box-shadow:4px 4px 0 var(--sh)}
  .vig{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 45%,transparent 40%,rgba(3,4,18,.65));opacity:0}
  .conf{position:absolute;left:0;top:0;width:22px;height:22px;will-change:transform}.conf svg{width:100%;height:100%}
  /* toasts, ghost, intro, finger */
  .toasts{position:absolute;left:0;right:0;top:76px;display:flex;flex-direction:column;align-items:center;gap:8px}
  .land .toasts{right:420px}
  .toast{display:flex;align-items:center;gap:8px;height:46px;padding:0 20px 0 12px;border-radius:999px;background:var(--lime);border:3px solid var(--ink);box-shadow:4px 4px 0 var(--sh);font:800 15px var(--ui)}
  .toast .ck{width:26px;height:26px;border-radius:50%;background:var(--cream);border:3px solid var(--ink);display:grid;place-items:center}.toast .ck .ic{width:15px;height:15px}
  .ghost{position:absolute;left:0;top:0;transform-origin:0 0;border-radius:50%;overflow:hidden;pointer-events:none;will-change:transform,border-radius}
  .ghost .gl{position:absolute;inset:0}
  .ghost .ai{position:absolute;inset:0;opacity:0}
  .intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--cream);pointer-events:auto;background:radial-gradient(70% 50% at 50% 46%,rgba(14,16,52,.25),rgba(5,6,26,.55))}
  .intro .lt{width:104px;height:104px}.intro .lt svg{width:100%;height:100%}
  .intro h1{margin:22px 0 0;font:800 30px/1.05 var(--ui);letter-spacing:-.01em}
  .intro p{margin:10px 0 0;font:600 15px var(--ui);color:#d7d2f2}
  .intro small{position:absolute;bottom:40px;font:600 11px var(--ui);color:#a9a3d6;letter-spacing:.03em}
  .intro > *{will-change:transform,opacity} .intro[hidden]{display:none}
  .finger{position:absolute;left:0;top:0;width:46px;height:46px;margin:-23px;border-radius:50%;background:rgba(255,244,222,.55);border:3px solid var(--ink);box-shadow:0 0 0 3px rgba(255,244,222,.5),0 6px 18px rgba(0,0,0,.35);opacity:0;will-change:transform}
  .finger::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:3px solid var(--cream);opacity:var(--rip,0);transform:scale(calc(1 + (1 - var(--rip,0))*1.2))}
  html.rec .top .ctl{display:none!important}
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  /* ---------- markup ---------- */
  const app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app);
  const ME = DEMO.ME, M0 = DEMO.meets[0];
  const avOf = m => `<span class="av">${kit('avatar-' + m.av)}</span>`;
  app.innerHTML = `
  <div class="vig"></div>
  <div class="anchors"></div>
  <header class="top"><div class="mark"><span class="lg">${kit('logo-mark')}</span><div><b>Release the <em>Firefly</em></b><small>designed by Daksh · GPT concept art</small></div></div><div class="tr pe"></div></header>
  <div class="clockchip"><span class="chip">${ic('clock')}9:00 PM</span></div>
  <div class="scrim"></div>
  <div class="col">
    <section class="sheet panel card" id="card" aria-label="Firefly">
      <div class="grab"></div>
      <div class="art"><div class="ai"></div><div class="glint"></div></div>
      <div class="provenance"></div><div class="prompt">${ic('prompt')}<p></p><span class="sk" aria-label="Made from my sketch">${ic('sketch')}</span></div>
      <div class="who"><span class="avw"></span><div class="meta"><b class="nm"></b><span class="chip swc"><i class="dot"></i><span></span></span></div><span class="lv"></span>
        <button class="btn ib glow" data-press aria-label="Glow">${ic('glow')}<span class="cnt"><span class="roll">0</span></span></button>
        <button class="btn ib" data-press aria-label="Share">${ic('share')}</button></div>
    </section>
    <section class="sheet panel" id="rel" aria-label="Release">
      <div class="grab"></div>
      <div class="rhead"><button class="btn ib rx" data-press aria-label="Close">${ic('close')}</button></div>
      <h2 class="release-title">Make</h2><div class="steps"><i class="on"></i><i></i><i></i></div>
      <div class="panes"><div class="track">
        <div class="pane p1">
          <label class="up tile" data-press>${''}<span class="t0">${ic('upload')}</span><span class="pv"></span><input type="file" accept="image/*" aria-label="Upload your Firefly image"></label>
          <div class="fld">${ic('prompt')}<textarea rows="2" maxlength="600" placeholder="The prompt you used in Firefly…" aria-label="Prompt" spellcheck="false"></textarea></div>
          <div class="optrow"><span class="skrow" data-press>${ic('sketch')}<span class="tgl sktg" role="switch" aria-label="Made from my sketch"></span></span><button class="btn pill amber nx" data-press>${ic('next')}Next</button></div>
        </div>
        <div class="pane p2">
          <div class="spot">${ic('pin')}<b></b><span class="bar"></span></div><select class="spot-select" aria-label="Choose a campus spot"><option value="">Choose a spot or tap the map</option>${BLD.map((b,i)=>`<option value="${i}">${b[0]}</option>`).join('')}</select>
          <div class="sws">${SW.map((s, i) => `<button class="sw" data-press data-i="${i}" style="background:${s.col}" aria-label="${s.name}"></button>`).join('')}</div>
          <div class="optrow" style="justify-content:flex-end"><button class="btn pill amber nx" data-press>${ic('next')}Next</button></div>
        </div>
        <div class="pane p3">
          <div class="mini"><span class="th"></span><span class="chip spotc">${ic('pin')}<span></span></span></div>
          <div class="holdwrap"><div class="hold"><svg class="ring" viewBox="0 0 124 124"><circle cx="62" cy="62" r="57" stroke="var(--ink)" stroke-width="9" opacity=".18"/><circle class="rp" cx="62" cy="62" r="57" stroke="var(--lime)" stroke-width="6" stroke-linecap="round" transform="rotate(-90 62 62)" stroke-dasharray="358.1" stroke-dashoffset="358.1"/></svg>
            <button class="rbtn hb" data-press aria-label="Press and hold to release">${ic('release')}</button></div></div>
          <div class="lbl">Hold to release</div>
        </div>
      </div></div>
    </section>
    <section class="sheet panel" id="meet" aria-label="Meet">
      <div class="grab"></div>
      <div class="hrow">${ic('meet')}Meet</div>
      <div class="panel cons st">
        <div class="avs">${M0.people.map(avOf).join('')}</div>
        <div class="chips"><span class="chip">${ic('pin')}${M0.spot}</span><span class="chip">${ic('clock')}${M0.time}</span></div>
        <div class="inrow"><b><span class="ck">${ic('check')}</span>I'm in</b><button class="tgl imin" role="switch" aria-label="I'm in" data-press></button></div>
      </div>
      <div class="others">${DEMO.meets.slice(1).map(m => `<div class="oth st"><div class="avs">${m.people.slice(0, 4).map(avOf).join('')}</div><span>${m.spot}</span><span class="tm">${m.time}</span></div>`).join('')}</div>
    </section>
    <section class="sheet panel" id="me" aria-label="Me">
      <div class="grab"></div>
      <div class="mehead st">${avOf(ME)}<div class="badges">${BADGE.map((b, i) => `<span class="bd ${i > ME.lvl ? 'off' : ''}" title="${LV[i]}">${kit(b)}<small>${LV[i]}</small></span>`).join('')}</div></div>
      <div class="prog st"><i></i></div>
      <div class="glowtot st">${ic('glow-filled')}<span class="gt">0</span><small>My Glow</small></div>
      <div class="mine st">${DEMO.mine.map(f => `<button class="th tile" aria-label="Open my firefly" data-press data-f="${f.id}">${artFor(f)}</button>`).join('')}</div>
      <div class="bars st">${SW.map(s => `<div class="swarm-row"><b>${s.name}</b><div class="sbar"><i style="background:${s.col}"></i><span></span></div></div>`).join('')}</div>
      <div class="credit st">designed by Daksh · GPT concept art</div>
    </section>
    <div class="snight panel"><div class="hrow">${ic('glow-filled')}Swarm Night</div><div class="bars">${SW.map(s => `<div class="swarm-row"><b>${s.name}</b><div class="sbar"><i style="background:${s.col}"></i><span></span></div></div>`).join('')}</div></div>
    <nav class="nav" aria-label="Main">
      <div class="bg panel"></div><div class="pill"></div>
      <button class="tab" data-tab="sky" aria-label="Sky">${ic('sky')}</button>
      <button class="tab" data-tab="meet" aria-label="Meet">${ic('meet')}</button>
      <div class="rel"><button class="rbtn" data-press aria-label="Release">${ic('release')}</button></div>
      <button class="tab" data-tab="me" aria-label="Me" style="grid-column:4 / span 2">${ic('me')}</button>
    </nav>
  </div>
  <div class="toasts" role="status" aria-live="polite"></div>
  <div class="confs"></div>
  <div class="ghosts"></div>
  <div class="intro" hidden><span class="lt">${kit('logo-tile')}</span><h1>Release the Firefly.</h1><p>Make something. Find your people.</p><small>Chitkara University, Punjab</small></div>
  <div class="finger"></div>`;
  $('.tr', app).appendChild($('.ctl'));
  const anchors = $('.anchors', app), ghosts = $('.ghosts', app);

  /* ---------- stage + layout ---------- */
  let land = false;
  function layout() { fitStage(); Object.assign(app.style, { left: STAGE.x + 'px', top: STAGE.y + 'px', width: STAGE.w + 'px', height: STAGE.h + 'px' });
    if (REC) Object.assign(canvas.style, { left: STAGE.x + 'px', top: STAGE.y + 'px' });
    land = STAGE.w / STAGE.h > 1.15; app.classList.toggle('land', land);
    if (land) { const off = 220; camera.setViewOffset(STAGE.w, STAGE.h, off, 0, STAGE.w, STAGE.h); } else camera.clearViewOffset(); }
  layout(); addEventListener('resize', () => { layout(); sheets.forEach(s => s.reflow()); requestAnimationFrame(() => setTab(tab)); });

  /* ---------- sheets: follow the finger, rubber-band, project the flick, spring to a detent ---------- */
  const scrim = $('.scrim', app); let scrimN = 0;
  const scrimS = spring(0, 'base', v => { scrim.style.opacity = v; scrim.style.visibility = v > .002 ? 'visible' : 'hidden'; });
  let navAway = null;
  class Sheet {
    constructor(el, o = {}) { this.el = el; this.o = o; this.det = 'closed'; this.h = 0; this.modal = !!o.modal;
      this.y = spring(0, 'base', v => { el.style.transform = `translate3d(${this.xv || 0}px,${v}px,0)`; if (this.o.onY) this.o.onY(v, this); }, .1);
      drag(el, { ok: e => !e.target.closest('textarea,input,select,button,.hb,[data-nodrag]') && (el.scrollHeight <= el.clientHeight + 2 || !!e.target.closest('.grab')) && this.det !== 'closed', both: true,
        start: st => { this.y0 = this.y.x; this.ax = st.axis; if (st.axis === 'x' && o.onX) o.onX('start'); },
        move: (dx, dy, st) => { if (st.axis === 'x' && o.onX) { o.onX('move', dx); return; }
          let y = this.y0 + dy; const top = this.pos(this.o.top || 'full'); if (y < top) y = top - rubber(top - y, 140); this.y.set(y); },
        end: (dx, dy, vx, vy, st) => { if (st.axis === 'x' && o.onX) { o.onX('end', dx, vx); return; }
          const proj = this.y.x + projectV(vy) * .5; const ds = (this.o.detents || ['full']).concat(o.dismiss === false ? [] : ['closed']);
          let best = ds[0], bd = 1e9; ds.forEach(d => { const dd = Math.abs(this.pos(d) - proj); if (dd < bd) { bd = dd; best = d; } });
          if (best === 'closed') this.close(vy); else this.to(best, vy); } });
    }
    pos(d) { const h = this.h || this.el.offsetHeight; if (d === 'full') return 0; if (d === 'peek') return h - (this.o.peek || 180); return h + 140; }
    reflow() { this.h = this.el.offsetHeight; if (this.det !== 'closed') this.y.set(this.pos(this.det)); }
    open(d = 'full', v) { const was = this.det; if (this.modal && navAway) navAway(true); this.el.style.visibility = 'visible'; this.el.style.opacity = 1; this.h = this.el.offsetHeight; if (was === 'closed') this.y.set(this.pos('closed'));
      this.det = d; this.el.setAttribute('aria-hidden','false'); this.y.kind('base').to(this.pos(d), v); if (this.modal && was === 'closed') { scrimN++; scrimS.to(1); } this.o.onOpen && this.o.onOpen(); return this; }
    to(d, v) { this.det = d; this.y.to(this.pos(d), v); return this; }
    close(v) { if (this.det === 'closed') return; this.det = 'closed'; this.el.setAttribute('aria-hidden','true'); if (this.modal && navAway && !sheets.some(s => s !== this && s.modal && s.isOpen)) navAway(false); if (this.modal) { scrimN = Math.max(0, scrimN - 1); if (!scrimN) scrimS.to(0); }
      if (RMO) this.el.style.opacity = 0;
      this.y.to(this.pos('closed'), v).then(() => { if (this.det === 'closed') this.el.style.visibility = 'hidden'; }); this.o.onClose && this.o.onClose(); }
    get isOpen() { return this.det !== 'closed'; }
  }
  const sheets = [];
  const mk = (id, o) => { const s = new Sheet($('#' + id, app), o); sheets.push(s); return s; };

  /* ---------- toasts ---------- */
  function toast(word, icon = 'check') { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<span class="ck">${ic(icon)}</span>${word}`; $('.toasts', app).appendChild(el);
    const s = spring(0, 'base', v => { el.style.opacity = Math.min(1, v * 1.4); el.style.transform = `translateY(${(1 - v) * -26}px) scale(${.92 + .08 * v})`; }, .002).to(1);
    setTimeout(() => s.to(0).then(() => el.remove()), 1700); haptic(6); }

  /* ---------- nav ---------- */
  const nav = $('.nav', app), pill = $('.pill', nav); let tab = 'sky';
  const pillX = spring(0, 'base', v => pill.style.transform = `translateX(${v}px)`, .1);
  function setTab(t) { tab = t; const b = $(`.tab[data-tab="${t}"]`, nav); const nr = nav.getBoundingClientRect(), br = b.getBoundingClientRect();
    pillX.to(br.left - nr.left + (br.width - 58) / 2); $$('.tab', nav).forEach(x => x.setAttribute('aria-current', x === b ? 'page' : 'false')); }
  requestAnimationFrame(() => { const b = $('.tab[data-tab="sky"]', nav), nr = nav.getBoundingClientRect(), br = b.getBoundingClientRect(); pillX.set(br.left - nr.left + (br.width - 58) / 2); });
  nav.addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; go(b.dataset.tab); });
  $('.rel .rbtn', nav).addEventListener('click', () => openRelease());
  function go(t) { if (!['sky','meet','me','glow'].includes(t)) return; document.dispatchEvent(new CustomEvent('ryf:navigate',{detail:t})); if (t === 'glow') t = 'me';
    closeCard(); if (relS.isOpen) relS.close(); hideTag();
    if (t !== 'meet' && meetS.isOpen) meetS.close(); if (t !== 'me' && meS.isOpen) meS.close();
    if (t === 'meet' && window.STORY && !TOUR.on) { setTab('meet'); STORY.meetHub(); return; }
    setTab(t); if (t === 'meet') openMeet(); if (t === 'me') openMe(); if (t === 'sky') camHome(); }

  /* ---------- camera moves on a critically damped spring ---------- */
  const CAM = { x: spring(0, 'cam', null, .05), z: spring(0, 'cam', null, .05), zm: spring(1, 'cam', null, .0005) };
  function camGo(p, zoom, lift = 0) { targetTo = null; zoomTo = null; controls.autoRotate = false; clearTimeout(window.__ar);
    if(typeof THEME !== 'undefined') THEME.cancelFlight();
    // lift: keep the point this many px above centre, so an open sheet never covers it
    let x = p[0] ?? p.x, z = p[2] ?? p.z; if (lift && !land) { const zz = zoom || camera.zoom, ppu = zz * innerHeight / (camera.top - camera.bottom);
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); const k = lift / (ppu * Math.sin(PITCH)); x -= f.x * k; z -= f.z * k; }
    const t = controls.target; CAM.x.set(t.x).to(x); CAM.z.set(t.z).to(z); if (zoom) CAM.zm.set(camera.zoom).to(zoom); if(RMO){const d=new THREE.Vector3(x-controls.target.x,0,z-controls.target.z);controls.target.add(d);camera.position.add(d);if(zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}camera.lookAt(controls.target);}
    window.__ar = setTimeout(() => { if (!TOUR.on) controls.autoRotate = true; }, 12000); }
  function camHome() { if(typeof THEME !== 'undefined') THEME.home(); else camGo(HOMET, HOMEZ); }
  function cancelCamera(){[CAM.x,CAM.z,CAM.zm].forEach(s=>s.set(s.x));}
  controls.addEventListener('start', cancelCamera);
  function camStep() { if (CAM.x.busy || CAM.z.busy) { const d = new THREE.Vector3(CAM.x.x - controls.target.x, 0, CAM.z.x - controls.target.z); controls.target.add(d); camera.position.add(d); }
    if (CAM.zm.busy) { camera.zoom = CAM.zm.x; camera.updateProjectionMatrix(); } }

  /* ---------- building tag on its red thread (a pendulum spring: it sways as the map moves) ---------- */
  const tagA = document.createElement('div'); tagA.className = 'anch'; anchors.appendChild(tagA);
  tagA.innerHTML = `<div class="tag" hidden><svg class="thread" viewBox="0 0 30 40" fill="none"><path d="M15 38C0 21 30 22 19 3" stroke="#E2384A" stroke-width="4" stroke-linecap="round"/></svg><div class="card0 panel"><span class="hole"></span><h3></h3><div class="row"><span class="chip">${ic('glow')}<span class="n"></span></span><button class="btn pill amber go" data-press aria-label="Open" style="height:40px;flex:1">${ic('next')}</button></div></div></div>`;
  const tagEl = $('.tag', tagA); let tagB = null, lastAx = null;
  const tagDrop = spring(0, 'base', v => { tagEl.style.opacity = Math.min(1, v * 1.6); }, .002);
  const tagSw = spring(0, [.45, 1], null, .01);
  const fliesAt = b => FF.list.filter(f => f.d.b === b && f.mode !== 'flight');
  function showTag(b) { if (tagB === b) return; tagB = b; tagEl.hidden = false; $('h3', tagEl).textContent = bname(b); $('.n', tagEl).textContent = fliesAt(b).length;
    tagDrop.set(0).to(1); tagSw.set(RMO ? 0 : 16).to(0); lastAx = null; haptic(5); }
  function hideTag() { if (tagB === null) return; tagB = null; tagDrop.to(0).then(() => { if (tagB === null) tagEl.hidden = true; }); }
  $('.go', tagEl).addEventListener('click', () => { const fs = fliesAt(tagB).sort((a, b) => b.lvl - a.lvl || b.d.glows - a.d.glows); if (fs[0]) openCard(fs[0]); });

  /* map-anchored markers */
  function marker(kind) { const a = document.createElement('div'); a.className = 'anch'; a.innerHTML = kind === 'you' ? `<div class="mk you"><span class="pulse"></span>${kit('marker-you')}</div>` : `<div class="mk">${kit(kind)}</div>`; anchors.appendChild(a);
    const el = a.firstChild; a.style.display = 'none'; const m = { a, el, p: null, s: spring(0, 'base', v => { el.style.opacity = Math.min(1, v * 1.5); el.style.transform = `translateY(${(1 - v) * -46}px) scale(${.7 + .3 * v})`; }, .002) };
    m.show = p => { m.p = p; a.style.display = ''; m.s.set(0).to(1); }; m.hide = () => m.s.to(0).then(() => { if (m.s.t === 0) { a.style.display = 'none'; m.p = null; } }); return m; }
  const mSpot = marker('marker-spot'), mMeet = marker('marker-meet'), mYou = marker('you');
  { const b = FF.bTop(0); mYou.show([b[0] + 22, 2, b[2] + 30]); }

  /* ---------- firefly card + shared-element transition (the firefly flies into the art frame) ---------- */
  const card = $('#card', app); let cur = null, ghost = null;
  const cardS = mk('card', { modal: true, detents: ['full'], onX: (ph, dx, vx) => swipe(ph, dx, vx), onClose: () => flyBack() });
  function fillCard(f) { const d = f.d, s = SW[d.sw]; $('.provenance',card).textContent = d.art && !d.sampleArt && !d.sample ? 'Made in Adobe Firefly · maker supplied' : 'GPT concept art · illustrative prompt'; $('.art .ai', card).innerHTML = artFor(d); $('.prompt p', card).textContent = d.prompt; $('.sk', card).classList.toggle('on', !!d.sketch);
    $('.avw', card).innerHTML = avOf(d.maker); $('.nm', card).textContent = d.maker.name; $('.swc .dot', card).style.background = s.col; $('.swc span', card).textContent = s.name;
    $('.lv', card).innerHTML = kit(BADGE[d.lvl]); const g = $('.glow', card); g.setAttribute('aria-pressed',String(d.glowed)); g.setAttribute('aria-label',d.glowed ? 'Glowed' : 'Glow'); g.classList.toggle('on', d.glowed); g.innerHTML = ic(d.glowed ? 'glow-filled' : 'glow') + `<span class="cnt"><span class="roll">${d.glows}</span></span>`; }
  function glowGhost(col) { return `radial-gradient(circle at 50% 50%, #fff7e6 0 9%, ${col} 22%, ${col}55 42%, transparent 70%)`; }
  function openCard(f) { if (!f) return; if (cur && cur !== f) { cur.visTo = 1; } hideTag(); cur = f; fillCard(f);
    card.style.visibility = 'visible'; const was = cardS.isOpen; cardS.open('full');
    if (was) return;
    const sp = toScreen(f.p); f.visTo = 0; f.vis = 0;
    // measure the art frame where it will settle
    const prev = card.style.transform; card.style.transform = 'none'; const R = $('.art', card).getBoundingClientRect(); card.style.transform = prev;
    const r0 = { x: R.left - STAGE.x, y: R.top - STAGE.y, w: R.width, h: R.height };
    const art = $('.art', card); art.style.visibility = 'hidden';
    if(ghost){MOTION.delete(ghost.s);ghost.el.remove();} const el = document.createElement('div'); el.className = 'ghost'; el.innerHTML = `<div class="gl"></div><div class="ai">${artFor(f.d)}</div>`;
    Object.assign(el.style, { width: r0.w + 'px', height: r0.h + 'px' }); $('.gl', el).style.background = glowGhost(SW[f.d.sw].col); ghosts.appendChild(el);
    const g0 = 46 + f.lvl * 10;
    const gs = spring(0, 'base', p => { const fr = { x: sp.x - g0 / 2, y: sp.y - g0 / 2, w: g0 };
      const cr = $('.art', card).getBoundingClientRect(); const to = { x: cr.left - STAGE.x, y: cr.top - STAGE.y, w: cr.width };
      const x = lerp(fr.x, to.x, p), y = lerp(fr.y, to.y, p), w = lerp(fr.w, to.w, p);
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${w / r0.w})`; el.style.borderRadius = `${lerp(r0.w / 2, 12 * r0.w / w, smooth(0, .7, p))}px`;
      $('.ai', el).style.opacity = smooth(.35, .85, p); $('.gl', el).style.opacity = 1 - smooth(.6, 1, p); }, .001);
    ghost = { el, s: gs }; gs.kind([.5, 1]).set(0); gs.to(1).then(() => { art.style.visibility = ''; el.remove(); if (ghost && ghost.el === el) ghost = null; });
    haptic(6); }
  function closeCard(v) { if (cardS.isOpen) cardS.close(v); }
  function flyBack() { const f = cur; if (!f) return; cur = null; const art = $('.art', card); const R = art.getBoundingClientRect();
    const r0 = { x: R.left - STAGE.x, y: R.top - STAGE.y, w: R.width, h: R.height }; art.style.visibility = 'hidden';
    if(ghost){MOTION.delete(ghost.s);ghost.el.remove();} const el = document.createElement('div'); el.className = 'ghost'; el.innerHTML = `<div class="gl"></div><div class="ai" style="opacity:1">${artFor(f.d)}</div>`;
    Object.assign(el.style, { width: r0.w + 'px', height: r0.h + 'px', transform: `translate3d(${r0.x}px,${r0.y}px,0)` }); $('.gl', el).style.background = glowGhost(SW[f.d.sw].col); ghosts.appendChild(el);
    const g0 = 46 + f.lvl * 10, so = {};
    const gs = spring(0, 'base', p => { toScreen(f.p, so); const to = { x: so.x - g0 / 2, y: so.y - g0 / 2, w: g0 };
      const x = lerp(r0.x, to.x, p), y = lerp(r0.y, to.y, p), w = lerp(r0.w, to.w, p);
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${w / r0.w})`; el.style.borderRadius = `${lerp(12, r0.w / 2, smooth(.2, .9, p))}px`;
      $('.ai', el).style.opacity = 1 - smooth(.15, .6, p); $('.gl', el).style.opacity = smooth(.1, .5, p) * (1 - smooth(.85, 1, p)); }, .001);
    ghost = { el, s: gs }; gs.kind([.5, 1]).to(1).then(() => { el.remove(); art.style.visibility = ''; f.visTo = 1; f.vis = 1; f.tau = 0; if (f.d.glowed) f.shim = 1; if (ghost && ghost.el === el) ghost = null; }); }
  /* sideways: next firefly on the same building */
  const cardX = spring(0, 'base', v => { cardS.xv = v; card.style.transform = `translate3d(${v}px,${cardS.y.x}px,0)`; card.style.opacity = 1 - Math.min(.6, Math.abs(v) / 500); }, .1);
  function swipe(ph, dx, vx) { if (!cur) return; if (ph === 'move') { cardX.set(dx); return; } if (ph !== 'end') return;
    const proj = dx + projectV(vx) * .4; if (Math.abs(proj) < 90) { cardX.to(0, vx); return; }
    const sgn = Math.sign(proj), fs = fliesAt(cur.d.b); if (fs.length < 2) { cardX.to(0, vx); return; }
    const nx = fs[(fs.indexOf(cur) + (sgn < 0 ? 1 : -1) + fs.length) % fs.length];
    cardX.to(sgn * 460, vx).then(() => { cur.visTo = 1; cur = nx; nx.visTo = 0; fillCard(nx); cardX.set(-sgn * 300); cardX.to(0); }); }
  /* Glow: private, one-way, count-up only */
  $('.who', card).addEventListener('click', e => { const g = e.target.closest('.glow'); if (!g || !cur || cur.d.glowed) return; glow(cur); });
  function glow(f) { const d = f.d; if(d.glowed) return; d.glowed = true; f.shim = 1; document.dispatchEvent(new Event('ryf:save'));  const g = $('.glow', card); g.classList.add('on'); $('.ic', g).outerHTML = ic('glow-filled');
    const roll = $('.roll', g), from = d.glows; d.glows++; g.setAttribute('aria-pressed','true'); g.setAttribute('aria-label','Glowed'); document.dispatchEvent(new Event('ryf:save'));
    const s = spring(0, 'snap', v => { roll.style.transform = `translateY(${(1 - v) * 18}px)`; roll.style.opacity = v; }, .002); roll.textContent = d.glows; s.set(0).to(1);
    const gl = $('.glint', card); const gs = spring(0, [.9, 1], v => gl.style.transform = `translateX(${lerp(-80, 80, v)}%)`, .001); gs.set(0).to(1);
    confetti(g.getBoundingClientRect(), 10, true); toast('Glowed privately', 'glow-filled'); haptic(10); }

  /* ---------- release sheet: upload + prompt → spot + swarm → press and hold ---------- */
  const rel = $('#rel', app), track = $('.track', rel); let step = 0, R = { art: null, prompt: '', sketch: false, sample:false, b: null, sw: ME.sw };
  const relS = mk('rel', { modal: true, detents: ['full'], peek: 320, onClose: () => { holdEnd(); mSpot.hide(); } });
  const trackX = spring(0, 'base', v => track.style.transform = `translate3d(${-v * 100}%,0,0)`, .0005);
  function setStep(n, silent) { if(!silent && n>step && !TOUR.on) { if(step===0 && (!R.art && !R.sample || !R.prompt.trim())) { toast('Add an image and your prompt','info'); return; } if(step===1 && R.b===null) { toast('Choose a campus spot','pin'); return; } } step = n; $('.release-title',rel).textContent = ['Make','Pick a spot','Release'][n]; $$('.pane',rel).forEach((p,i)=>{p.inert=i!==n;p.setAttribute('aria-hidden',String(i!==n));}); trackX.to(n); $$('.steps i', rel).forEach((d, i) => d.className = i < n ? 'done' : i === n ? 'on' : '');
    $('.rx', rel).innerHTML = ic(n ? 'back' : 'close'); $('.rx',rel).setAttribute('aria-label',n?'Back':'Close'); if (silent) return;
    if (n === 1) { relS.o.detents = ['peek']; relS.to('peek'); scrimN = 0; scrimS.to(0); camGo(FF.bTop(R.b ?? 2), Math.max(camera.zoom, 3.4), 120); }
    else { relS.o.detents = ['full']; relS.to('full'); if (!scrimN) { scrimN = 1; scrimS.to(1); } }
    if (n === 2) { $('.mini .th', rel).innerHTML = R.art ? `<img src="${R.art}" alt="">` : artFor({ id: 'r', sw: R.sw }); $('.spotc span', rel).textContent = R.b !== null ? bname(R.b) : ''; } }
  function openRelease() { document.dispatchEvent(new CustomEvent('ryf:navigate',{detail:'release'})); holdEnd(); ringS.set(0); holdP=0; $('.ic',hb).style.transform=''; hb.style.boxShadow=''; $('input',rel).value=''; $('.spot-select',rel).value=''; closeCard(); hideTag(); if (meetS.isOpen) meetS.close(); if (meS.isOpen) meS.close(); R = { art: null, prompt: '', sketch: false, sample:false, b: null, sw: ME.sw }; $('.sktg',rel).setAttribute('aria-checked','false');
    $('.pv', rel).innerHTML = ''; $('.pv', rel).style.opacity = 0; $('textarea', rel).value = ''; $('.sktg', rel).style.setProperty('--on', 0); $('.spot b', rel).textContent = 'Tap a building'; $('.spot .bar', rel).style.display = '';
    selSw(ME.sw, true); relS.o.detents = ['full']; setStep(0, true); trackX.set(0); relS.open('full'); }
  $('.rx', rel).addEventListener('click', () => step ? setStep(step - 1) : relS.close());
  $$('.nx', rel).forEach(b => b.addEventListener('click', () => { setStep(step + 1); }));
  const pv = $('.pv', rel), pvS = spring(0, 'base', v => { pv.style.opacity = v; pv.style.transform = `scale(${1.06 - .06 * v})`; }, .002);
  function pickArt(url) { R.art = url || null; R.sample = !url || String(url).startsWith('data:image/svg'); pv.innerHTML = url ? `<img src="${url}" alt="">` : artFor({ id: 'r', sw: R.sw }); pvS.set(0).to(1); haptic(6); }
  $('input', rel).addEventListener('change', async e => { const f=e.target.files[0]; if(!f)return; if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>8*1024*1024){toast('Use PNG, JPG or WebP under 8 MB','info');e.target.value='';return;} try { const url=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(f);}); const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);pickArt(c.toDataURL('image/jpeg',.88)); }catch(err){toast('Image could not open. Try another.','info');} });
  $('textarea', rel).addEventListener('input', e => R.prompt = e.target.value);
  const skS = spring(0, 'snap', v => $('.sktg', rel).style.setProperty('--on', v), .002);
  $('.sktg', rel).closest('.skrow').addEventListener('click', () => { R.sketch = !R.sketch; skS.to(R.sketch ? 1 : 0); });
  const swS = SW.map((_, i) => spring(0, 'snap', v => $$('.sw', rel)[i].style.setProperty('--s', v), .002));
  function selSw(i, now) { R.sw = i; $$('.sw',rel).forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i))); $('.swarm-label',rel)?.replaceChildren(document.createTextNode(SW[i].name)); swS.forEach((s, k) => now ? s.set(k === i ? 1 : 0) : s.to(k === i ? 1 : 0)); if (!now) haptic(5); }
  $('.sws', rel).addEventListener('click', e => { const b = e.target.closest('.sw'); if (b) selSw(+b.dataset.i); });
  $('.spot-select',rel).addEventListener('change',e=>{if(e.target.value!=='')setSpot(+e.target.value);});
  function setSpot(b) { R.b = b; $('.spot-select',rel).value=String(b); $('.spot b', rel).textContent = bname(b); $('.spot .bar', rel).style.display = 'none'; mSpot.show(FF.bTop(b)); camGo(FF.bTop(b), null, 120); haptic(8); }
  /* press and hold: the lime ring fills over 1.2 s; let go early and it springs back */
  const hb = $('.hb', rel), rp = $('.rp', rel); let holdT = null, holdP = 0, holding = false;
  const ringS = spring(0, 'snap', v => { rp.style.strokeDashoffset = 358.1 * (1 - v); }, .001);
  const HOLD = 1.2;
  function holdStart() { if (holding || step!==2 || !relS.isOpen || R.b===null || (!TOUR.on && (!R.prompt.trim() || (!R.art && !R.sample)))) return; holding = true; holdP = 0; ringS.set(0); haptic(6); }
  function holdEnd() { if (!holding) return; holding = false; holdP=0; ringS.to(0); $('.ic',hb).style.transform=''; hb.style.boxShadow=''; }
  hb.addEventListener('pointerdown', e => { e.preventDefault(); if(e.button>0)return; hb.setPointerCapture(e.pointerId); holdStart(); }); hb.addEventListener('lostpointercapture',holdEnd); addEventListener('blur',holdEnd); document.addEventListener('visibilitychange',()=>{if(document.hidden)holdEnd();}); addEventListener('pointerup', holdEnd); addEventListener('pointercancel', holdEnd);
  hb.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); holdStart(); } }); hb.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') holdEnd(); });
  function holdFrame(dt) { if (!holding) return; holdP = Math.min(1, holdP + dt / HOLD); ringS.set(holdP);
    const k = holdP; $('.ic', hb).style.transform = `translateY(${-k * 4}px) scale(${1 + k * .12})`; hb.style.boxShadow = `${4 - 4 * k}px ${4 - 4 * k}px 0 var(--sh), 0 0 ${k * 34}px ${k * 10}px rgba(255,200,74,${k * .55})`;
    if (k > .33 && k - dt / HOLD <= .33 || k > .66 && k - dt / HOLD <= .66) haptic(4);
    if (holdP >= 1) { holding = false; launch(); } }
  function launch() { if(FF.list.length>=280){holdEnd();toast('This demo is full. Reset to try again.','info');return;} haptic(18); const r = hb.getBoundingClientRect(); const s0 = { x: r.left + r.width / 2 - STAGE.x, y: r.top + r.height / 2 - STAGE.y };
    // the firefly glyph leaves the button and becomes the 3D firefly
    const gl = document.createElement('div'); gl.className = 'ghost'; Object.assign(gl.style, { width: '60px', height: '60px', transform: `translate3d(${s0.x - 30}px,${s0.y - 30}px,0)` });
    gl.innerHTML = `<div class="gl" style="background:${glowGhost(SW[R.sw].col)}"></div>`; ghosts.appendChild(gl);
    const d = { id: 'me' + Date.now(), b: R.b ?? 2, sw: R.sw, lvl: ME.lvl, maker: ME, prompt: R.prompt || DEMO.PROMPTS[0], glows: 0, sketch: R.sketch, glowed: false, art: R.art, seed: R.seed, sample: !R.art || !!R.sample };
    DEMO.flies.push(d); DEMO.mine.unshift(d);
    relS.close(); mSpot.hide();
    const f = FF.release(d, s0, () => { toast('Released · find it in Me'); document.dispatchEvent(new Event('ryf:save')); setTimeout(() => { ringS.set(0); $('.ic', hb).style.transform = ''; hb.style.boxShadow = ''; }, 300); });
    f.vis = 0; f.visTo = 0; const so = {};
    const gs = spring(0, [.35, 1], p => { toScreen(f.p, so); gl.style.transform = `translate3d(${so.x - 30}px,${so.y - 30}px,0) scale(${1 - .6 * p})`; gl.style.opacity = 1 - p; }, .002);
    gs.to(1).then(() => gl.remove()); setTimeout(() => f.visTo = 1, 60); }

  /* ---------- meet ---------- */
  const meet = $('#meet', app); let imIn = false, form = null;
  const meetS = mk('meet', { detents: ['full'], onClose: () => { if (tab === 'meet') setTab('sky'); mMeet.hide(); if (form) { FF.formation(form, null, false); form = null; } } });
  const imS = spring(0, 'snap', v => $('.imin', meet).style.setProperty('--on', v), .002);
  function stagger(root) { $$('.st', root).forEach((el, i) => { const s = spring(0, 'base', v => { el.style.opacity = v; el.style.transform = `translateY(${(1 - v) * 18}px)`; }, .002); s.set(0); setTimeout(() => s.to(1), 60 + i * 40); }); }
  function openMeet() { setTab('meet'); meetS.open('full'); stagger(meet);
    $$('.cons .av', meet).forEach((a, i) => { const s = spring(0, 'base', v => { a.style.transform = `scale(${.6 + .4 * v})`; a.style.opacity = v; }, .002); s.set(0); setTimeout(() => s.to(1), 140 + i * 40); });
    const m = DEMO.meets[0], p = FF.at(m.at); mMeet.show([p[0], p[1], p[2]]); camGo(p, 4.2, STAGE.h * .27);
    // the constellation forms: one firefly per person flies to the spot, lines draw between them
    form = m.people.map(pp => pp.isMe ? (DEMO.mine[0].ff) : (FF.list.find(f => f.d.maker === pp) || FF.list[pp.id])).filter(Boolean);
    FF.formation(form, p, true); }
  $('.imin', meet).addEventListener('click', () => { imIn = !imIn; $('.imin',meet).setAttribute('aria-checked',String(imIn)); document.dispatchEvent(new Event('ryf:save')); imS.to(imIn ? 1 : 0); if (imIn) { toast("I'm in"); const p = FF.at(DEMO.meets[0].at); FF.burst([p[0], p[1] + 26, p[2]], FF.COLS[5], 14); } });

  /* ---------- me ---------- */
  const me = $('#me', app);
  const meS = mk('me', { detents: ['full'], onClose: () => { if (tab === 'me') setTab('sky'); } });
  function openMe() { setTab('me'); meS.open('full'); stagger(me);
    const gt = $('.gt', me); spring(0, [.9, 1], v => gt.textContent = Math.round(v), .3).set(0).to(ME.glows);
    const pr = $('.prog i', me); spring(0, [.8, 1], v => pr.style.width = v * 100 + '%', .001).set(0).to(ME.toNext);
    const counts = SW.map((_, i) => FF.list.filter(f => f.sw === i).length), mx = Math.max(...counts);
    $$('.bars .sbar', me).forEach((b, i) => { const el = $('i', b); $('span', b).textContent = counts[i]; const s = spring(0, [.7, 1], v => el.style.width = v * 100 + '%', .001); s.set(0); setTimeout(() => s.to(counts[i] / mx * .92), 180 + i * 40); });
    $('.mine', me).innerHTML = DEMO.mine.slice(0, 4).map(f => `<button class="th tile" aria-label="Open my firefly" data-press data-f="${f.id}">${artFor(f)}</button>`).join(''); }
  $('.mine', me).addEventListener('click', e => { const t = e.target.closest('.th'); if (!t) return; const d = DEMO.flies.find(f => String(f.id) === t.dataset.f); if (d && d.ff) { meS.close(); camGo(d.ff.p); setTimeout(() => openCard(d.ff), 260); } });

  /* ---------- swarm night ---------- */
  const sn = $('.snight', app), cc = $('.clockchip', app), vig = $('.vig', app); let snOn = false;
  const snS = spring(0, 'base', v => { sn.style.visibility = v > .002 ? 'visible' : 'hidden'; sn.style.opacity = Math.min(1, v * 1.4); sn.style.transform = `translateY(${(1 - v) * 40}px)`; }, .002);
  const ccS = spring(0, 'base', v => { cc.style.visibility = v > .002 ? 'visible' : 'hidden'; cc.style.opacity = Math.min(1, v * 1.4); cc.style.transform = `translateX(-50%) translateY(${(1 - v) * -24}px) scale(${.9 + .1 * v})`; }, .002);
  const vgS = spring(0, [1.4, 1], v => vig.style.opacity = v, .002);
  function swarmNight(on = !snOn) { snOn = on; go('sky'); FF.swarmNightOn(on); ccS.to(on ? 1 : 0); vgS.to(on ? 1 : 0);
    if (on) { camGo(HOMET, HOMEZ * .92); setTimeout(() => { if (!snOn) return; snS.to(1); const counts = SW.map((_, i) => FF.list.filter(f => f.sw === i).length), mx = Math.max(...counts);
        $$('.sbar', sn).forEach((b, i) => { const el = $('i', b); $('span', b).textContent = counts[i]; const s = spring(0, [.8, 1], v => el.style.width = v * 100 + '%', .001); s.set(0); setTimeout(() => s.to(counts[i] / mx * .92), 120 + i * 60); }); }, 1400);
      setTimeout(() => snOn && confetti({ left: STAGE.x + STAGE.w / 2, top: STAGE.y + 60, width: 0, height: 0 }, 34), 2600); }
    else snS.to(0); }

  /* ---------- confetti: the kit's six shapes, flung on a little physics sim ---------- */
  const confs = $('.confs', app), CF = [];
  function confetti(r, n = 24, small) { if (RMO) return; for (let i = 0; i < n; i++) { const el = document.createElement('div'); el.className = 'conf'; el.innerHTML = kit('confetti-' + (1 + i % 6)); if (small) el.style.width = el.style.height = '14px'; confs.appendChild(el);
    const a = -Math.PI / 2 + (DEMO.rand() - .5) * (small ? 2.2 : 3.2), sp = (small ? 260 : 420) + DEMO.rand() * 380;
    CF.push({ el, x: r.left - STAGE.x + r.width / 2, y: r.top - STAGE.y + r.height / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: DEMO.rand() * 360, vr: (DEMO.rand() - .5) * 720, life: small ? 1.1 : 2.6 }); } }
  function confFrame(dt) { for (let i = CF.length - 1; i >= 0; i--) { const c = CF[i]; c.life -= dt; if (c.life <= 0 || c.y > STAGE.h + 40) { c.el.remove(); CF.splice(i, 1); continue; }
    const dr = Math.exp(-dt * 2.4); c.vx *= dr; c.vy = c.vy * dr + 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
    c.el.style.transform = `translate3d(${c.x - 11}px,${c.y - 11}px,0) rotate(${c.rot}deg)`; c.el.style.opacity = Math.min(1, c.life * 2.5); } }

  /* ---------- intro ---------- */
  const intro = $('.intro', app);
  const navS = spring(1, 'base', v => { nav.style.transform = `translateY(${(1 - v) * 120}px)`; $('.top', app).style.opacity = v; }, .002);
  navAway = away => navS.to(away ? 0 : 1);
  function showIntro(hold = 2600) { intro.hidden = false; navS.set(0); const parts = [...intro.children];
    parts.forEach((el, i) => { const s = spring(0, i ? 'base' : [.45, 1], v => { el.style.opacity = v; el.style.transform = i ? `translateY(${(1 - v) * 16}px)` : `scale(${.6 + .4 * v}) rotate(${(1 - v) * -8}deg)`; }, .002); s.set(0); setTimeout(() => s.to(1), 150 + i * 110); });
    intro.style.opacity = 1; return new Promise(res => { const done = () => { clearTimeout(tm); intro.removeEventListener('pointerdown', done);
      const s = spring(1, 'base', v => { intro.style.opacity = v; intro.style.transform = `scale(${1.04 - .04 * v})`; }, .002); s.to(0).then(() => { intro.hidden = true; intro.style.transform = ''; res(); }); setTimeout(() => {if(!sheets.some(s=>s.modal&&s.isOpen))navS.to(1);}, 120); };
      const tm = setTimeout(done, hold); intro.addEventListener('pointerdown', done); }); }

  /* ---------- map taps: firefly → card, building → tag, release step 2 → spot ---------- */
  const rc = new THREE.Raycaster(), nd = new THREE.Vector2(); const BMESH = []; BGRP.forEach((g, i) => g && g.traverse(o => { if (o.isMesh) { o.userData.bld = i; BMESH.push(o); } }));
  function buildingAt(x, y) { const r = canvas.getBoundingClientRect(); nd.set((x + STAGE.x - r.left) / r.width * 2 - 1, -((y + STAGE.y - r.top) / r.height) * 2 + 1); rc.setFromCamera(nd, camera); const h = rc.intersectObjects(BAKE.PROXY, false)[0]; return h ? h.object.userData.bld : null; }
  let down = null; const mapPointers=new Set(); let multiTouch=false;
  canvas.addEventListener('pointerdown', e => { mapPointers.add(e.pointerId); if(mapPointers.size>1)multiTouch=true; down = { id:e.pointerId,x: sx(e), y: sy(e), t: performance.now(),moved:false }; });
  canvas.addEventListener('pointermove',e=>{if(down&&Math.hypot(sx(e)-down.x,sy(e)-down.y)>8)down.moved=true;});
  canvas.addEventListener('pointerup', e => { mapPointers.delete(e.pointerId); const blocked=multiTouch; if(!mapPointers.size)multiTouch=false; if (!down) return; const x = sx(e), y = sy(e); const tap = e.pointerId===down.id && !blocked && !down.moved && performance.now() - down.t < 450; down = null; if (tap) mapTap(x, y); });
  canvas.addEventListener('pointercancel',e=>{mapPointers.delete(e.pointerId);down=null;if(!mapPointers.size)multiTouch=false;});
  function mapTap(x, y) {
    if (relS.isOpen && step === 1) { const b = buildingAt(x, y); if (b !== null) setSpot(b); return; }
    if (cardS.isOpen) return;
    const f = FF.pick(x, y); if (f) { openCard(f); return; }
    const b = buildingAt(x, y); if (b !== null) UI.showTag(b); else hideTag(); }
  scrim.addEventListener('click', () => { if (cardS.isOpen) closeCard(); else if (relS.isOpen && step !== 1) relS.close(); });
  addEventListener('keydown', e => { if (e.target.closest && e.target.closest('textarea,input')) return;
    if (e.key === 'Escape') { closeCard(); relS.close(); meetS.close(); meS.close(); hideTag(); }
    if (e.key === 's' || e.key === 'S') swarmNight(); if (e.key === 'r' || e.key === 'R') openRelease(); });

  /* ---------- per frame: things anchored to the map ---------- */
  const so = {};
  function place(a, p, dy = 0) { toScreen(p, so); a.style.transform = `translate3d(${so.x.toFixed(1)}px,${(so.y + dy).toFixed(1)}px,0)`; return so; }
  function frame(t, dt) {
    camStep(); holdFrame(dt); confFrame(dt);
    if (tagB !== null || !tagEl.hidden) { const b = tagB ?? lastB; if (b !== null && b !== undefined) { const p = FF.bTop(b); place(tagA, p, -6);
        if (lastAx !== null && !RMO) { const vx = (so.x - lastAx) / Math.max(dt, 1e-3); tagSw.t = clamp(-vx * .035, -14, 14); MOTION.add(tagSw); } lastAx = so.x; lastB = b;
        tagEl.style.transform = `translateY(${(1 - tagDrop.x) * -30}px) rotate(${tagSw.x.toFixed(2)}deg)`; } }
    [mSpot, mMeet, mYou].forEach(m => { if (m.p) place(m.a, m.p); });
  }
  let lastB = null;
  setTab('sky');
  return { confetti, setTab, hideNav: a => navAway && navAway(a), get tab() { return tab; }, mYou, mSpot, mMeet, bname, go, openCard, closeCard, openRelease, setStep, setSpot, selSw, pickArt, holdStart, holdEnd, glow, openMeet, openMe, swarmNight, showIntro, toast, camGo, camHome, cancelCamera, showTag, hideTag, frame, layout, sheets,
    get cur() { return cur; }, get step() { return step; }, get R() { return R; }, rel, card, meet, me, nav, app, relS, cardS, meetS, meS, $, imin: () => $('.imin', meet).click(), isIn: () => imIn, isNight: () => snOn };
})();

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

/* ================= bake: merge every static campus mesh into a few big draw calls =================
   The campus was ~2,500 separate meshes (two render passes each = ~5,000 draw calls). Every mesh that uses the
   shared campus shader is baked into world space, its per-mesh uniforms become vertex attributes, and the result
   is merged into a handful of geometries. Building warmth (a released firefly lighting windows) is a uniform array
   indexed by building, so the effect still works on merged geometry. Picking uses invisible box proxies. */
const BAKE = (() => {
  const VSB = VS.replace('varying vec3 vN;', 'attribute vec3 aColor; attribute vec4 aP1; attribute vec4 aP2; varying vec3 vColor; varying vec4 vP1; varying vec4 vP2;\n varying vec3 vN;')
               .replace('vIC = vec3(1.0);', 'vIC = vec3(1.0); vColor = aColor; vP1 = aP1; vP2 = aP2;');
  const FSB = FS.replace('uniform vec3 uColor, uSide; uniform float uWin, uSeed, uTop, uField, uGlow, uStyle, uNight, uLit, uWarm;',
    `uniform float uNight; uniform float uWarmA[64]; varying vec3 vColor; varying vec4 vP1; varying vec4 vP2;
     #define uColor vColor
     #define uWin vP1.x
     #define uSeed vP1.y
     #define uTop vP1.z
     #define uField vP1.w
     #define uGlow vP2.x
     #define uStyle vP2.y
     #define uLit vP2.z
     float warmOf(float b){ int i = int(b + .5); float w = 0.; for (int k = 0; k < 64; k++) { if (k == i) w = uWarmA[k]; } return w; }
     #define uWarm warmOf(vP2.w)`);
  const warm = new Array(64).fill(0);
  const mat = new THREE.ShaderMaterial({ uniforms: { uNight: NIGHT, uWarmA: { value: warm } }, vertexShader: VSB, fragmentShader: FSB });
  const bldOf = new Map(); BGRP.forEach((g, i) => g && g.traverse(o => bldOf.set(o, i)));
  const PROXY = BGRP.map((g, i) => { if (!g) return null; const b = new THREE.Box3().setFromObject(g); const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(c); m.userData.bld = i; m.updateMatrixWorld(); return m; });
  scene.updateMatrixWorld(true);
  const take = [];
  scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.visible) return; const m = o.material; if (!m || !m.isShaderMaterial || m.fragmentShader !== FS || m.clipping) return;
    if (o.layers.mask !== 1) return; take.push(o); });
  const parts = [];
  for (const o of take) { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count, u = o.material.uniforms, c = u.uColor.value, b = bldOf.has(o) ? bldOf.get(o) : 63;
    const ac = new Float32Array(n * 3), p1 = new Float32Array(n * 4), p2 = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { ac.set([c.r, c.g, c.b], i * 3); p1.set([u.uWin.value, u.uSeed.value, u.uTop.value, u.uField.value], i * 4); p2.set([u.uGlow.value, u.uStyle.value, u.uLit.value, Math.min(b, 63)], i * 4); }
    g.setAttribute('aColor', new THREE.BufferAttribute(ac, 3)); g.setAttribute('aP1', new THREE.BufferAttribute(p1, 4)); g.setAttribute('aP2', new THREE.BufferAttribute(p2, 4));
    parts.push(g); }
  const CHUNK = 60000 * 3; let cur = [], cnt = 0; const merged = [];
  const flush = () => { if (!cur.length) return; const g = mergeGeometries(cur, false); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; scene.add(m); merged.push(m); cur = []; cnt = 0; };
  for (const g of parts) { cur.push(g); cnt += g.attributes.position.count; if (cnt > CHUNK) flush(); } flush();
  for (const o of take) { o.parent && o.parent.remove(o); o.geometry.dispose(); }
  const lines = []; scene.traverse(o => { if (o.isLineSegments && o.material === INK) lines.push(o); }); lines.forEach(l => l.parent && l.parent.remove(l));
  return { warm, PROXY: PROXY.filter(Boolean), count: take.length, merged: merged.length, lines: lines.length };
})();

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
  const cmpI = $('.cmp .ic', mc), cmpB = $('.cmp', mc), tagBody = $('.tag .card0', app), tagThread = $('.tag .thread', app);

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
    if (closeUp !== null && closeUp !== undefined) { const pr = BAKE.PROXY.find(x => x.userData.bld === closeUp); if (pr) { const bb = pr.geometry.parameters, c = pr.position;
        const top = toScreen([c.x, c.y + bb.height / 2, c.z]).y, base = toScreen([c.x, c.y - bb.height / 2, c.z]).y; tagBody.style.marginTop = Math.max(36, base - top + 46) + 'px'; tagThread.style.opacity = 1; } }
    else { tagBody.style.marginTop = ''; tagThread.style.opacity = ''; }
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
/* Kit styling, accessible controls, recording desk and browser-local demo state. */
const POLISH = (() => {
 const $=UI.$, app=UI.app;
 document.head.insertAdjacentHTML('beforeend',`<style>
 :root{--ink:#14102E;--sh:#05061A;--glass:rgba(255,244,222,.94);--line:#14102E;--txt:#14102E;--sub:#58516C}
 #app{overflow:clip;--ah:100vh;--aw:100vw;container-type:inline-size}
 .panel{background:var(--glass);backdrop-filter:blur(18px) saturate(1.1);-webkit-backdrop-filter:blur(18px) saturate(1.1)}
 .panel .panel{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--cream)}
 .nav{grid-template-columns:1fr 1fr 92px 1fr;height:72px;right:12px}
 .nav .tab{display:flex;flex-direction:column;gap:3px;width:62px;height:56px;z-index:1;font-size:10px;font-weight:800}
 .nav .tab[data-tab=me]{grid-column:4!important}.nav .pill{height:52px;top:9px;border-radius:12px}
 .nav .rel{margin-top:-34px}.nav .rel .rl{pointer-events:none;position:absolute;left:0;right:0;bottom:-10px;text-align:center;font-size:10px;font-weight:800}
 .nav .rel .ic,.hold .ic{color:var(--cream)}
 .mark b{font-family:var(--ui);font-size:18px;font-weight:800;letter-spacing:-.6px}.mark small{max-width:260px;font-size:8px}
 .top .ctl{display:none!important}.top{padding-bottom:26px;background:linear-gradient(#05061A99,transparent)}
 .sheet{max-height:calc(var(--ah) - 128px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#8B7CF6 transparent}
 #card,#rel{max-height:calc(var(--ah) - 40px)}
 .sheet .grab{touch-action:none;min-height:5px;padding:0;margin-bottom:12px}
 .sheet .grab::before{content:'';display:block;height:24px;transform:translateY(-9px)}
 .card .art{width:min(100%,calc(var(--ah) - 244px));min-width:110px;margin:auto}.card .art .ai{height:100%}
 .card .prompt{font-size:13px;margin-top:10px}.card .prompt p{display:block;max-height:72px;overflow:auto;user-select:text}
 .card .who{gap:6px;margin-top:10px}.card .who .av{width:32px;height:32px}.card .who .lv{width:26px;height:26px}
 .card .who .nm{font-size:13px}.card .swc{font-size:10px;padding:0 7px;height:25px;border-width:2px}
 .card .who .btn{width:42px;height:44px}.card .who .meta{gap:4px}
 .provenance{font:600 10px/1.4 var(--ui);margin-top:8px;color:#58516C;text-align:center}
 .release-title{font:800 20px var(--ui);text-align:center;margin:0 0 10px}.steps{margin-bottom:12px}
 .up{height:clamp(100px,23vh,168px)}.up .upload-label{position:absolute;bottom:12px;font:700 12px var(--ui);pointer-events:none}
 .up:has(.pv:not(:empty)) .upload-label{display:none}.up .t0{transform:translateY(-10px)}
 .sample-row{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-size:10px;gap:8px}.sample-row button{font-weight:800;text-decoration:underline;min-height:30px}
 .skrow{font-size:10px}.skrow .ic{width:20px}.tgl{flex:none}.fld{margin-top:7px}
 .spot .bar{display:none!important}.spot{height:44px}.spot b{font-size:14px}
 .spot-select{margin-top:8px;min-height:40px;border:2px solid var(--ink);border-radius:9px;padding:8px;font:600 11px var(--ui);color:var(--ink);background:var(--cream);max-width:100%}
 .sws{margin-top:13px}.sw{width:36px;height:36px}.sw[aria-pressed=true]{outline:2px solid var(--cream);outline-offset:-6px}
 .swarm-label{font-size:11px;font-weight:800;text-align:center;margin-top:7px}.p2 .optrow{margin-top:8px}
 .sheet-close{position:absolute;right:9px;top:8px;width:36px;height:36px;display:grid;place-items:center;z-index:2}.sheet-close .ic{width:18px;height:18px}
 .badges{gap:8px}.badges .bd{width:43px;height:60px;text-align:center}.badges small{display:block;font-size:8px;margin-top:-6px;font-weight:800}
 .mehead>.av{width:46px;height:46px}.glowtot small{font-size:12px}.prog{margin-top:7px}.mine .th img{width:100%;height:100%;object-fit:cover}
 .swarm-row{display:grid;grid-template-columns:82px 1fr;gap:8px;align-items:center}.swarm-row>b{font-size:10px}.bars{gap:7px}.sbar span{background:var(--cream);padding:0 4px;right:3px;border-radius:8px;min-width:22px;text-align:center}
 .meet-note{font-size:11px;line-height:1.4;margin:0 0 12px;color:#58516C}.cons .avs .av{width:44px;height:44px}.cons .chips{gap:5px}.cons .chip{font-size:11px;padding-right:7px}
 .others .oth{gap:8px}.others .oth>span{font-size:10px}.others .avs .av{width:26px;height:26px}
 .mapctl{position:absolute;right:15px;bottom:120px;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
 .land .mapctl{right:438px}.mapctl .grp{border:3px solid var(--ink);background:var(--cream);box-shadow:3px 3px 0 var(--sh);border-radius:12px;overflow:hidden}
 .mapctl button{width:42px;height:42px;display:grid;place-items:center}.mapctl .grp button+button{border-top:2px solid var(--ink)}
 .mapctl .cmp{border:3px solid var(--ink);background:var(--cream);border-radius:50%;visibility:hidden}.mapctl .cmp.show{visibility:visible}
 .sheeton .mapctl{visibility:hidden}.backchip{position:absolute;top:75px;left:50%;transform:translateX(-50%);display:none}.backchip.show{display:block;pointer-events:auto}
 .backchip .btn{padding:0 12px;height:40px;font-size:12px!important}
 .tag .sub{display:block;font-size:11px;margin:-4px 0 12px}.tag .n{display:inline!important;position:static;color:var(--ink);padding:0;background:none;border:0;font-size:12px}
 .tag .thread{height:40px}.tag .card0{padding:23px 14px 14px}.tag h3{font-size:15px}
 .record-tools{position:absolute;right:16px;top:16px;pointer-events:auto}.record-tools>button{width:36px;height:36px;font-size:16px}
 .desk{position:absolute;right:0;top:48px;width:275px;padding:16px;max-height:calc(var(--ah) - 90px);overflow:auto}.desk[hidden]{display:none}.desk h3{margin:0 0 10px;font-size:16px}.desk p{font-size:11px;line-height:1.5;margin:10px 0}.desk .row{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}.desk .btn{font-size:11px!important;min-height:36px;padding:6px 12px}
 .demo-tag{position:absolute;top:68px;left:18px;color:#FFF4DE99;font-size:9px;letter-spacing:.08em}
 .close-card-hint{font-size:10px;margin-top:10px;text-align:center;color:#58516C}
 .tour-caption{position:absolute;left:20px;right:20px;top:139px;text-align:center;color:var(--cream);font-weight:800;font-size:24px;letter-spacing:-.7px;text-shadow:0 3px 12px #05061A;pointer-events:none;opacity:0;transition:opacity .4s ease-out}.land .tour-caption{right:450px;top:139px}
 html.rec .record-tools,html.rec .demo-tag,html.rec .mapctl,html.touring .record-tools,html.touring .mapctl,html.touring .backchip{display:none!important}
 .toasts{z-index:20;pointer-events:none}.toast{font-size:12px;max-width:calc(100% - 24px);height:auto;min-height:44px;padding:9px 13px}
 .intro{z-index:30}.intro h1{font-size:29px}.intro p{font-size:13px}
 button:disabled{opacity:.5;cursor:default}button[aria-pressed=true]{cursor:default}
 @container (max-width:360px){.col{width:100%}.sheet{padding:12px 12px 16px}.nav{grid-template-columns:1fr 1fr 80px 1fr}.nav .rel{width:70px;height:70px}.nav .tab{width:54px}.mark b{font-size:15px}.mark small{font-size:7px;max-width:205px}.mark .lg{width:27px;height:27px}.swarm-row{grid-template-columns:72px 1fr}.sws .sw{width:33px;height:33px}.chip{font-size:11px}.card .who .avw,.card .who .lv{display:none}.record-tools{right:12px}.badges{gap:4px}.badges .bd{width:40px}}
 .rm *{animation:none!important;scroll-behavior:auto!important}.rm .tour-caption{transition:opacity .15s ease-out}
 </style>`);
 function layout(){app.style.setProperty('--ah',STAGE.h+'px');app.style.setProperty('--aw',STAGE.w+'px');}
 layout();addEventListener('resize',layout);
 // The prototype's sample data is explicit and never presented as real activity.
 app.insertAdjacentHTML('beforeend',`<span class="demo-tag">INTERACTIVE DEMO · SAVED ON THIS DEVICE</span><div class="tour-caption" aria-live="polite"></div><div class="record-tools"><button class="btn ib" aria-label="Recording and demo options" data-press>${KIT['icon-info']}</button><section class="desk panel" hidden><h3>Recording desk</h3><p>A local prototype. Makers, Glow totals and meet-ups are samples. Upload your own Firefly art before your final take.</p><div class="row"><button class="btn frame" data-mode="0">Full</button><button class="btn frame" data-mode="916">9:16</button><button class="btn frame" data-mode="169">16:9</button></div><div class="row"><button class="btn amber promo">15 s promo</button><button class="btn tour">Full tour</button><button class="btn night">Swarm Night</button></div><div class="row"><button class="btn theme">Day / night</button><button class="btn motion">Reduce motion</button></div><p>T tour · P promo · V frame · F tap dot · Space pause · Escape exit. Recording frames hide these controls; V brings them back.</p><p class="fps-meter">Preview</p><p class="save-note">Releases and Glows stay in this browser. Nothing is uploaded.</p><button class="btn export">Export with my artwork</button></section></div>`);
 const desk=$('.desk',app);$('.record-tools>button',app).onclick=()=>{desk.hidden=!desk.hidden;};
 $('.record-tools>button svg',app).style.width='20px';
 $$('.frame').forEach(b=>b.onclick=()=>{REC=b.dataset.mode==='916'?9/16:b.dataset.mode==='169'?16/9:0;document.documentElement.classList.toggle('rec',!!REC);if(!REC)canvas.style.left=canvas.style.top='';dispatchEvent(new Event('resize'));desk.hidden=true;});
 function $$(s){return [...app.querySelectorAll(s)];}
 $('.promo',desk).onclick=()=>{desk.hidden=true;TOUR.startPromo();};$('.tour',desk).onclick=()=>{desk.hidden=true;TOUR.start();};$('.night',desk).onclick=()=>{desk.hidden=true;UI.swarmNight();};
 $('.theme',desk).onclick=()=>document.getElementById('nt').click();
 $('.motion',desk).onclick=()=>{setRM(!RMO);$('.motion',desk).setAttribute('aria-pressed',String(RMO));};
 // Keep upload and sample use separate; the sample is always a labelled placeholder.
 $('.up',UI.rel).insertAdjacentHTML('beforeend','<span class="upload-label">Upload your Firefly image</span>');
 $('.up',UI.rel).insertAdjacentHTML('afterend','<div class="sample-row"><span>PNG · JPG · WebP / 8 MB max</span><button type="button" class="use-sample">Use demo sample</button></div>');
 $('.use-sample',UI.rel).onclick=()=>{UI.pickArt();UI.R.prompt=DEMO.PROMPTS[0];$('textarea',UI.rel).value=UI.R.prompt;UI.toast('Sample selected · placeholder art','info');};
 $('.sws',UI.rel).insertAdjacentHTML('afterend','<div class="swarm-label">Design</div>');
 const sk=$('.skrow',UI.rel);sk.insertAdjacentHTML('afterbegin','<span>From my sketch</span>');sk.setAttribute('role','button');sk.tabIndex=0;sk.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sk.click();}};
 sk.addEventListener('click',()=>$('.sktg',sk).setAttribute('aria-checked',String(UI.R.sketch)));$('.sktg',sk).setAttribute('aria-checked','false');
 $('.imin',UI.meet).setAttribute('aria-checked','false');$('.hrow',UI.meet).insertAdjacentHTML('afterend','<p class="meet-note">At 9 PM, find your constellation.<br>4 makers · 4 schools · one piece together.<br>Sample invite · public campus spot · opt in.</p>');
 $('.prog',UI.me).setAttribute('aria-label','Lantern level, 62 percent toward Beacon');$('.prog',UI.me).insertAdjacentHTML('afterend','<p class="meet-note" style="margin-top:9px">Lantern → Beacon · 62%<br>Make · Glow · meet and create together.</p>');
 $('.who',UI.card).insertAdjacentHTML('afterend','<div class="close-card-hint">Glow is private and one-way · swipe to see more</div>');
 for(const s of [UI.cardS,UI.meetS,UI.meS]){s.el.setAttribute('role','dialog');s.el.setAttribute('aria-hidden','true');s.el.insertAdjacentHTML('beforeend',`<button class="sheet-close" aria-label="Close ${s.el.getAttribute('aria-label')}"><i class="ic">${KIT['icon-close']}</i></button>`);$('.sheet-close',s.el).onclick=()=>s.close();}
 UI.rel.setAttribute('role','dialog');UI.rel.setAttribute('aria-hidden','true');
 $('.who button[aria-label=Share]',UI.card).onclick=async()=>{const d=UI.cur?.d;if(!d)return;const url=new URL(location.href);url.hash='';url.search='';try{await navigator.clipboard.writeText(url.href);UI.toast('Demo link copied · uploads stay on this device');}catch{UI.toast('Share this page link','info');}};
 // Modals keep keyboard focus in the visible pane, and return it to the opener.
 let modal=null,previous=null;
 function focusTick(){const next=UI.cardS.isOpen?UI.card:UI.relS.isOpen?UI.rel:null;if(next!==modal){if(next){previous=document.activeElement;next.tabIndex=-1;next.focus({preventScroll:true});}else if(previous?.isConnected)previous.focus({preventScroll:true});modal=next;} }
 setInterval(focusTick,180);
 document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!modal)return;const list=[...modal.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(x=>!x.closest('[inert]')&&!x.disabled&&x.getBoundingClientRect().width);if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){last.focus();e.preventDefault();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal)){first.focus();e.preventDefault();}});
 // Persist only actual manual changes. Tours restore their snapshot and never write it.
 const KEY='ryf-interactive-v2';
 function clean(d){const {ff,maker,...rest}=d;return {...rest,maker:undefined};}
 function snapshot(){return {version:2,works:DEMO.mine.filter(d=>String(d.id).startsWith('me')).map(clean),glows:DEMO.flies.filter(d=>d.glowed).map(d=>String(d.id)),in:UI.isIn()};}
 function save(){if(TOUR.on)return;try{localStorage.setItem(KEY,JSON.stringify(snapshot()));}catch{$('.save-note',desk).textContent='Storage is full or unavailable. Export to keep your artwork.';}}
 document.addEventListener('ryf:save',()=>{if(!TOUR.on)setTimeout(save,0);});
 function restore(s){if(!s||s.version!==2)return;for(const d of (s.works||[]).slice(0,100)){if(typeof d.id!=='string'||DEMO.flies.some(f=>String(f.id)===d.id)||!Number.isInteger(d.b)||!BLD[d.b]||!Number.isInteger(d.sw)||d.sw<0||d.sw>5)continue;if(d.art&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.art))continue;d.maker=DEMO.ME;d.lvl=2;d.prompt=String(d.prompt||'').slice(0,600);DEMO.flies.push(d);DEMO.mine.unshift(d);FF.make(d);}
 for(const id of s.glows||[]){const d=DEMO.flies.find(f=>String(f.id)===String(id));if(d&&!d.glowed){d.glowed=true;d.glows++;}}
 if(s.in&&!UI.isIn())UI.imin();}
 function init(){try{restore(JSON.parse(document.getElementById('ryf-embedded')?.textContent||'null'));restore(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{}const id=QS.get('work')||new URLSearchParams(location.hash.slice(1)).get('work');if(id){const d=DEMO.flies.find(f=>String(f.id)===id);if(d)UI.openCard(d.ff);else UI.toast('This work is local to its maker','info');}}
 $('.export',desk).onclick=async()=>{try{const source=await (await fetch(location.pathname)).text();const packed=JSON.stringify(snapshot()).replace(/</g,'\\u003c');const doc=new DOMParser().parseFromString(source,'text/html');doc.getElementById('ryf-embedded')?.remove();const embedded=doc.createElement('script');embedded.id='ryf-embedded';embedded.type='application/json';embedded.textContent=packed;doc.querySelector('script[type="module"]').before(embedded);const html='<!doctype html>\n'+doc.documentElement.outerHTML;const blob=new Blob([html],{type:'text/html'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='release-your-firefly.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);UI.toast('Portal exported with your artwork');}catch{UI.toast('Open via local preview to export','info');}};
 // Readable error rather than a silent WebGL canvas after a lost GPU context.
 canvas.addEventListener('webglcontextlost',()=>UI.toast('Graphics paused. Reload to continue.','info'));
 return {snapshot,restore,init};
})();
/* ================= the campaign: a 14-day window and a leaderboard of connections =================
   The portal is one part of the "Release the Firefly" campaign: it is open for 14 days, then the board locks on Swarm Night.
   The board ranks makers by Glows received during the 14 days. Who glowed whom stays private; totals and first names only; anyone can hide.
   Demo: #day=N sets the campaign day (default 6). All counts are sample data. */
const CAMP = (() => {
  const DAYS = 14, day = Math.min(DAYS, Math.max(1, +(QS.get('day')) || 6)), left = DAYS - day;
  const SW = DEMO.SWARMS, ME = DEMO.ME;
  const hs = n => { let x = Math.sin(n * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };
  /* sample counts: a few strong connectors, a long tail, all plausible for day 6 */
  const ROWS = DEMO.makers.map((m, i) => ({ m, n: Math.round(12 + Math.pow(hs(i + 1), 1.6) * 230 * day / 6) }));
  const me = { m: ME, get n() { return ME.glows; }, hidden: false };
  const all = () => [...ROWS, me].filter(r => !r.hidden).sort((a, b) => b.n - a.n || (a.m.isMe ? -1 : 1));
  const rank = () => all().indexOf(me) + 1;
  const swarmTot = () => SW.map((s, i) => ({ s, n: ROWS.filter(r => r.m.sw === i).reduce((a, r) => a + r.n, 0) + (ME.sw === i ? me.n : 0) }));
  const icn = k => `<i class="ic">${(KIT['icon-' + k] || '').replace(/#14102E/g, 'currentColor')}</i>`;
  const avt = m => `<span class="av">${(typeof PACK !== 'undefined' && PACK['avatar-' + m.av]) || KIT['avatar-' + m.av]}</span>`;
  const nm = m => m.isMe ? 'You' : m.name.split(' ')[0];
  const segs = () => Array.from({ length: DAYS }, (_, i) => `<i class="${i < day ? 'on' : ''}${i === DAYS - 1 ? ' fin' : ''}"></i>`).join('');

  document.head.insertAdjacentHTML('beforeend', `<style>
  /* campaign card replaces the floating title on the map */
  .top{background:none!important;padding-top:calc(12px + env(safe-area-inset-top,0px))!important}
  .mark{pointer-events:auto}
  .campcard{display:flex!important;align-items:center;gap:10px;padding:8px 12px 9px 9px!important;border-radius:14px!important;background:#FFF4DE!important;border:3px solid #14102E!important;box-shadow:4px 4px 0 #05061A!important;color:#14102E!important;text-align:left;transform:scale(calc(1 - var(--p,0)*.04));max-width:250px}
  .campcard .lg{width:32px;height:32px;flex:none}.campcard .lg svg{width:100%;height:100%}
  .campcard b{display:block;font:900 15px/1 var(--ui);letter-spacing:-.02em;white-space:nowrap}
  .campcard .sg{display:flex;gap:2px;margin-top:6px}.campcard .sg i{width:9px;height:6px;border-radius:2px;background:#14102E26}.campcard .sg i.on{background:#E2384A}.campcard .sg i.fin{background:#FFC84A;width:12px}
  .campcard small{display:block;margin-top:5px;font:800 9.5px var(--ui);letter-spacing:.06em;text-transform:uppercase;opacity:.7;white-space:nowrap}
  .demo-tag{display:none!important}
  .bell{top:calc(12px + env(safe-area-inset-top,0px))!important}.record-tools{top:calc(12px + env(safe-area-inset-top,0px))!important}
  /* board */
  .bd4 .seg{display:grid;grid-template-columns:1fr 1fr;margin:18px auto 0;width:min(100%,300px);border:3px solid var(--ink);border-radius:24px;overflow:hidden;background:var(--card);box-shadow:4px 4px 0 var(--ink)}
  .bd4 .seg button{height:42px;font:800 14px var(--ui);color:var(--ink)!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important}
  .bd4 .seg button.on{background:var(--ink)!important;color:var(--cream)!important}
  .bd4 .pod{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:10px;align-items:end;margin-top:26px}
  .bd4 .pc{position:relative;display:flex;flex-direction:column;align-items:center;padding:30px 6px 12px!important;border-radius:14px!important;box-shadow:4px 4px 0 var(--ink)!important;text-align:center}
  .bd4 .pc .av{position:absolute;top:-26px;width:48px;height:48px}
  .bd4 .pc.p1{background:var(--amber)!important;padding-top:38px!important}.bd4 .pc.p1 .av{width:58px;height:58px;top:-32px}
  .bd4 .pc .rk{position:absolute;left:8px;top:6px;font:900 13px var(--ui)}
  .bd4 .pc b{font:900 16px/1.1 var(--ui)}.bd4 .pc .cn{margin-top:6px;font:900 28px/1 var(--ui);letter-spacing:-.03em}.bd4 .pc small{margin-top:3px;font:800 10.5px var(--ui);opacity:.65}
  .bd4 .pc .sd{display:block;width:13px;height:13px;border-radius:50%;border:2.5px solid var(--ink);margin-top:6px}
  .bd4 .ls{margin-top:16px;padding:4px 14px!important;border-radius:14px!important;box-shadow:4px 4px 0 var(--ink)!important}
  .bd4 .rw{display:grid;grid-template-columns:30px 36px 1fr auto;align-items:center;gap:10px;padding:9px 0;border-bottom:2px solid #14102E14}.bd4 .rw:last-child{border:0}
  .bd4 .rw .k{font:900 14px var(--ui);opacity:.55}.bd4 .rw .av{width:34px;height:34px}.bd4 .rw b{font:800 15px var(--ui);display:flex;align-items:center;gap:7px}.bd4 .rw b .dt{display:inline-block;width:11px;height:11px;border-radius:50%;border:2px solid var(--ink)}
  .bd4 .rw .cn{font:900 18px var(--ui)}.bd4 .rw .cn small{font:800 10px var(--ui);opacity:.55;margin-left:3px}
  .bd4 .you{position:sticky;bottom:0;margin-top:14px;padding:8px 14px!important;background:var(--lime)!important;border-radius:14px!important;box-shadow:4px 4px 0 var(--ink)!important}
  .bd4 .you .rw{border:0}
  .bd4 .sbars{margin-top:22px;display:flex;flex-direction:column;gap:12px}
  .bd4 .sb4{display:grid;grid-template-columns:96px 1fr 44px;align-items:center;gap:10px;font:800 14px var(--ui)}
  .bd4 .sb4 .tr{height:22px;border:3px solid var(--ink);border-radius:11px;background:var(--card);overflow:hidden}.bd4 .sb4 .tr i{display:block;height:100%;border-right:3px solid var(--ink);transform-origin:left;transform:scaleX(0)}
  .bd4 .sb4 .v{text-align:right;font-weight:900}
  .bd4 .rule{margin-top:18px;text-align:center;font:700 13px/1.4 var(--ui);opacity:.75}
  .bd4 .rule button{font:800 13px var(--ui);text-decoration:underline;text-underline-offset:3px;color:var(--ink)!important;background:none!important;border:0!important;box-shadow:none!important;padding:4px!important}
  .bd4 .end{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px 14px!important;border-radius:14px!important;background:#0E1034!important;color:var(--cream)!important;box-shadow:4px 4px 0 var(--ink)!important;font:800 14px/1.3 var(--ui)}
  .bd4 .end .ic{width:26px;height:26px;color:var(--amber);flex:none}
  .bd4 .pane4[hidden]{display:none!important}
  /* rank card used in Meet and Me */
  .rk4{display:flex!important;align-items:center;gap:12px;width:100%;padding:12px 14px!important;border-radius:16px!important;background:var(--lime)!important;box-shadow:4px 4px 0 var(--ink)!important;text-align:left;color:var(--ink)!important;transform:scale(calc(1 - var(--p,0)*.03))}
  .rk4 .big{font:900 30px/1 var(--ui);letter-spacing:-.04em;flex:none;min-width:58px}
  .rk4 .tx{flex:1;min-width:0}.rk4 .tx b{display:block;font:900 15px var(--ui)}.rk4 .tx small{display:block;margin-top:3px;font:800 11.5px var(--ui);opacity:.7}
  .rk4 .ic{width:22px;height:22px;flex:none}
  #me .rk4{margin:0 0 14px}
  /* layout fixes: no neighbouring panes peeking into a sheet, no footnote under the card, map controls out of the middle on desktop */
  #rel .pane[inert]{opacity:0;pointer-events:none}#rel .pane{transition:opacity .2s}
  .close-card-hint{display:none!important}
  .land .sx-night>.sx-bg,.land .sx-deep>.sx-bg{left:auto;right:0;width:452px;border-left:4px solid #14102E;box-shadow:-8px 0 0 #05061A55}
  .land .sx-night,.land .sx-deep{pointer-events:none}.land .sx-night>.sx-col,.land .sx-deep>.sx-col{pointer-events:auto}
  .land .mapctl{left:auto!important;right:18px!important;bottom:118px!important}
  .snon .mapctl,.snon .clockchip~.mapctl{visibility:hidden!important}
  .snon .clockchip{top:92px!important}
  </style>`);

  /* header card on the map */
  function header() { const mk = document.querySelector('#app .mark'); if (!mk) return;
    mk.innerHTML = `<button class="campcard" data-press aria-label="Campaign day ${day} of ${DAYS}. Open the leaderboard"><span class="lg">${KIT['logo-mark']}</span><span><b>Release the Firefly</b><img src="brand/adobe-chitkara.png" alt="Adobe × Chitkara University" style="display:block;width:146px;height:31px;object-fit:contain;background:white;margin:5px 0;border-radius:3px"><span class="sg">${segs()}</span><small>Demo day ${day} of ${DAYS} · ${left ? left + ' days left' : 'last day'}</small></span></button>`;
    mk.querySelector('.campcard').addEventListener('click', () => board()); }

  /* the leaderboard */
  function rowHTML(r, k) { return `<div class="rw"><span class="k">${k}</span>${avt(r.m)}<b>${nm(r.m)}<span class="dt" style="background:${SW[r.m.sw].col}"></span></b><span class="cn">${r.n}<small>glows</small></span></div>`; }
  function board(tab = 'people') { if (typeof STORY === 'undefined') return;
    const L = all(), top = L.slice(0, 3), rest = L.slice(3, 10), rk = rank(), T = swarmTot().sort((a, b) => b.n - a.n), mx = T[0].n;
    const pc = (r, k) => r ? `<div class="pc panel in p${k}">${avt(r.m)}<span class="rk">#${k}</span><b>${nm(r.m)}</b><span class="sd" style="background:${SW[r.m.sw].col}"></span><span class="cn">${r.n}</span><small>glows</small></div>` : '<span></span>';
    const el = STORY.scene(`
      <button class="sx-x" data-act="back" aria-label="Back" style="align-self:flex-start">${icn('back')}</button>
      <h2 class="hx m kt" style="margin-top:10px">Top <em>makers.</em></h2>
      <p class="sb in">most Glows · day ${day} of ${DAYS}</p>
      <div class="seg in" role="tablist"><button data-act="tab" data-t="people" class="${tab === 'people' ? 'on' : ''}">People</button><button data-act="tab" data-t="swarms" class="${tab === 'swarms' ? 'on' : ''}">Swarms</button></div>
      <div class="pane4" data-p="people" ${tab === 'people' ? '' : 'hidden'}>
        <div class="pod">${pc(top[1], 2)}${pc(top[0], 1)}${pc(top[2], 3)}</div>
        <div class="ls panel in">${rest.map((r, i) => rowHTML(r, i + 4)).join('')}</div>
        ${me.hidden ? '' : `<div class="you panel">${rowHTML(me, rk)}</div>`}
      </div>
      <div class="pane4" data-p="swarms" ${tab === 'swarms' ? '' : 'hidden'}>
        <div class="sbars">${T.map(t => `<div class="sb4"><span>${t.s.name}</span><span class="tr"><i style="background:${t.s.col};width:${Math.round(t.n / mx * 100)}%"></i></span><span class="v">${t.n}</span></div>`).join('')}</div>
      </div>
      <div class="end in">${icn('clock')}<span>Day 14: the sky closes. The final board stays, and the top 10 go up on the Swarm Night projection.</span></div>
      <p class="rule">who glowed you stays private. one Glow per person per piece.<br><button data-act="hide">${me.hidden ? 'show me on the board' : 'hide me from the board'}</button></p>`, { mode: 'push', bg: 'night', cls: 'r4 bd4' });
    const grow = () => el.querySelectorAll('.sb4 .tr i').forEach((b, i) => { const s = spring(0, [.6, .9], v => b.style.transform = `scaleX(${v})`, .002); s.set(0); setTimeout(() => s.to(1), 80 * i); });
    if (tab === 'swarms') setTimeout(grow, 300);
    el._act = { tab: b => { const t = b.dataset.t; el.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); el.querySelectorAll('.pane4').forEach(p => p.hidden = p.dataset.p !== t); if (t === 'swarms') grow(); STORY.SFX.tick(t === 'swarms' ? 2 : 0); },
      hide: () => { me.hidden = !me.hidden; STORY.closeAll(true); board(tab); UI.toast(me.hidden ? 'You are hidden from the board' : 'You are back on the board', 'check'); refresh(); } };
    return el; }

  /* rank card: used inside Meet (story.js) and the Me sheet */
  const rankCard = () => `<button class="rk4 panel" data-press data-act="board"><span class="big">${me.hidden ? '–' : '#' + rank()}</span><span class="tx"><b>${me.hidden ? 'Hidden from the board' : me.n + ' Glows'}</b><small>${left ? left + ' days left to climb' : 'last day'} · see the board</small></span>${icn('next')}</button>`;
  function meCard() { const sh = document.querySelector('#me'); if (!sh) return; let c = sh.querySelector('.rk4'); const h = rankCard();
    if (c) { c.outerHTML = h; } else sh.querySelector('.mehead').insertAdjacentHTML('afterend', h); sh.querySelector('.rk4').addEventListener('click', () => board()); }
  function refresh() { meCard(); document.querySelectorAll('.sx .rk4').forEach(c => { c.outerHTML = rankCard(); }); }
  /* a meet-up adds the new people you met */
  function addConn() {}
  function addGlow() { refresh(); }

  function init() { header(); meCard(); const app = document.getElementById('app'), sn = app.querySelector('.snight'); if (sn) new MutationObserver(() => app.classList.toggle('snon', sn.style.visibility === 'visible')).observe(sn, { attributes: true, attributeFilter: ['style'] }); }
  return { DAYS, day, left, board, rankCard, addConn, addGlow, init, get rank() { return rank(); }, me };
})();
CAMP.init();
(() => { const s = document.querySelector('#app .intro small'); if (s) s.textContent = 'A 14-day campaign · Chitkara University, Punjab'; })();
window.CAMP = CAMP;

/* ================= story layer: every moment of the campaign gets its own screen =================
   Onboarding → pick your swarm → your firefly is ready → bring art in from Firefly → cinematic release → "it's out" →
   someone glows it → inbox → Meet hub with the 9 PM countdown → matching → your constellation → the spot and the route →
   slide to join → check-in → make one piece together → it becomes a star → level up → Swarm Night.
   Same app, same kit, but each moment changes the whole screen with its own motion and sound. */
const SFX = (() => {
  let ac = null, on = true, master = null, armed = false;
  const ctx = () => { if (!armed) return null; if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination); } catch (_) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; };
  addEventListener('pointerdown', () => { armed = true; ctx(); }, { once: true, capture: true }); addEventListener('keydown', () => { armed = true; }, { once: true });
  function tone(f, d = .12, type = 'sine', g = .07, f2 = 0, dl = 0) { const a = ctx(); if (!a || !on) return; const t = a.currentTime + dl, o = a.createOscillator(), v = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .006); v.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(v).connect(master); o.start(t); o.stop(t + d + .03); }
  let nb = null; function noise(d = .2, g = .05, f0 = 800, f1 = 0, q = .8, dl = 0) { const a = ctx(); if (!a || !on) return; if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const c = nb.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + dl, s = a.createBufferSource(), fl = a.createBiquadFilter(), v = a.createGain(); s.buffer = nb; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + Math.min(.05, d * .3)); v.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(v).connect(master); s.start(t, Math.random() * .5); s.stop(t + d + .05); }
  return {
    tap: () => tone(620, .06, 'triangle', .04),
    type: () => { noise(.035, .05, 2600 + Math.random() * 1400, 0, 2.5); tone(1800 + Math.random() * 300, .015, 'square', .006); },
    pop: (k = 0) => tone(420 + k * 90, .11, 'sine', .07, 880 + k * 120),
    tick: (k = 0) => tone(1200 + k * 160, .05, 'triangle', .035),
    whoosh: () => noise(.45, .05, 350, 2400, .7),
    rise: () => { noise(1.3, .05, 300, 3200, .9); tone(220, 1.3, 'sine', .03, 660); },
    stamp: () => { tone(120, .2, 'sine', .14, 50); noise(.12, .08, 900, 0, .7); },
    chime: () => [880, 1175, 1568].forEach((f, i) => tone(f, .6, 'sine', .045, 0, i * .07)),
    success: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .45, 'triangle', .05, 0, i * .08)),
    land: () => { tone(300, .5, 'sine', .08, 90); noise(.5, .04, 1600, 400, .6); [1046, 1318].forEach((f, i) => tone(f, .8, 'sine', .03, 0, .1 + i * .09)); },
    get on() { return on; }, set on(v) { on = v; },
  };
})();

const STORY = (() => {
  const app = UI.app, $ = (s, r = app) => r.querySelector(s), $$ = (s, r = app) => [...r.querySelectorAll(s)];
  const ic = k => `<i class="ic">${(KIT['icon-' + k] || '').replace(/#14102E/g, 'currentColor')}</i>`;
  const pic = k => `<i class="ic">${(PACK['icon-' + k] || '').replace(/#14102E/g, 'currentColor')}</i>`;
  const SW = DEMO.SWARMS, LV = DEMO.LEVELS, ME = DEMO.ME, M0 = DEMO.meets[0];
  const BADGE = ['badge-spark', 'badge-glow', 'badge-lantern', 'badge-beacon'];
  const REWARD = ['Story card of your work', 'Printed poster in your corridor', 'Glow-in-the-dark firefly pin', 'Your work on the Swarm Night projection'];
  const av = m => `<span class="av">${KIT['avatar-' + m.av]}</span>`;
  const av4 = m => `<span class="av">${PACK['avatar-' + m.av] || KIT['avatar-' + m.av]}</span>`;
  const heart = col => PACK['icon-glow-filled'].replace('fill="#FFC84A"', `fill="${col}"`);
  const first = n => n === 'Me' ? 'You' : n.split(' ')[0];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const store = { get: k => { try { return localStorage.getItem('ryf-' + k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem('ryf-' + k, v); } catch (_) {} } };

  document.head.insertAdjacentHTML('beforeend', `<style>
  .sx-under,.sx-over,.sx-fx{position:absolute;inset:0;pointer-events:none}
  .sx{position:absolute;inset:0;pointer-events:auto;will-change:transform;color:var(--ink);--paper:#FFF4DE;--card:#FFF9EC;--sub:#4a4366}
  .sx-bg{position:absolute;inset:0}
  .sx-night .sx-bg,.sx-deep .sx-bg{background-color:#FFF4DE;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .06 0 0 0 0 .18 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  .sx-dim .sx-bg{background:rgba(20,16,46,.42);-webkit-backdrop-filter:blur(10px) saturate(1.1);backdrop-filter:blur(10px) saturate(1.1)}
  .sx-clear .sx-bg{background:linear-gradient(rgba(5,6,26,.45),transparent 20%,transparent 60%,rgba(5,6,26,.35));pointer-events:none}
  .sx-clear{pointer-events:none}.sx-clear .sx-col>*{pointer-events:auto}
  .sx-col{position:absolute;top:0;bottom:0;left:50%;width:min(100%,440px);transform:translateX(-50%);display:flex;flex-direction:column;padding:calc(14px + env(safe-area-inset-top,0px)) 20px calc(18px + env(safe-area-inset-bottom,0px));overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
  .land .sx-col{left:auto;right:28px;width:392px;transform:none}
  .sx-h{display:flex;align-items:center;gap:10px;min-height:44px;padding-bottom:10px;margin-bottom:14px;border-bottom:3px solid var(--ink)}
  .sx-clear .sx-h,.sx-dim .sx-h,.match .sx-h.flat{border-bottom:0;margin-bottom:6px}
  .sx-h .sp{flex:1}
  .sx-x{width:42px;height:42px;border-radius:12px;background:var(--card)!important;border:3px solid var(--ink)!important;box-shadow:3px 3px 0 var(--ink);display:grid;place-items:center;transform:translate(calc(var(--p,0)*3px),calc(var(--p,0)*3px));flex:none}
  .sx-x .ic{width:20px;height:20px}
  .sx-title{font:900 28px/1 var(--ui);letter-spacing:-.03em}
  .sx-skip{font:800 13px var(--ui);color:var(--ink)!important;padding:10px 4px!important;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px}
  .sx-step{font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
  .sx h2{margin:14px 0 0;font:900 34px/1.02 var(--ui);letter-spacing:-.035em;color:var(--ink)}
  .sx h2 em{font-style:normal;background:linear-gradient(transparent 60%,var(--amber) 60%,var(--amber) 92%,transparent 92%)}
  .sx p.lead{margin:10px 0 0;font:600 15px/1.45 var(--ui);color:var(--sub)}
  .sx p.lead b{color:var(--ink)}
  .sx-sub{margin:24px 0 10px;padding-top:12px;border-top:2px solid var(--ink);font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
  .sx-foot{margin-top:auto;padding-top:18px;display:flex;gap:10px}
  .sx-foot .btn{flex:1;height:54px;font-size:16px!important}
  .sx .btn[disabled]{opacity:.4;filter:grayscale(.6)}
  .sx .panel{color:var(--ink);background:var(--card);box-shadow:5px 5px 0 var(--ink)}
  .kt{display:block}.kt .w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em}.kt .w>span{display:inline-block;will-change:transform}
  .in{will-change:transform,opacity}
  .navywin{position:relative;background:#0E1034!important;border:4px solid var(--ink);border-radius:18px;box-shadow:5px 5px 0 var(--ink);overflow:hidden;color:var(--cream)}
  /* onboarding */
  .ob-wrap{position:relative;flex:1;min-height:0;margin:0 -20px;overflow:hidden;touch-action:pan-y}
  .ob-track{display:flex;height:100%;will-change:transform}
  .ob-slide{flex:0 0 100%;padding:0 20px;display:flex;flex-direction:column}
  .ob-num{font:800 11px var(--ui);letter-spacing:.08em;margin-top:16px}
  .ob-ill{position:relative;height:clamp(230px,38vh,320px);margin-top:4px}
  .ob-foot{display:flex;align-items:center;gap:14px;padding-top:12px}
  .ob-dots{display:flex;gap:8px;flex:1}.ob-dots i{height:12px;width:12px;border-radius:6px;border:3px solid var(--ink);background:var(--card);transition:width .35s cubic-bezier(.3,1.4,.5,1),background .2s}.ob-dots i.on{width:34px;background:var(--red)}
  .ob-foot .btn{height:54px;min-width:150px}
  .mk-bar{position:absolute;left:3%;right:3%;top:4%;height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;font:700 14px var(--ui)}
  .mk-ff{flex:none;height:30px;padding:0 10px;border-radius:8px;background:var(--ink);color:var(--cream);font:800 11px/30px var(--ui);letter-spacing:.06em}
  .mk-tx{white-space:nowrap;overflow:hidden;max-width:68%}.caret{width:2.5px;height:20px;background:var(--ink);animation:car 1s steps(1) infinite}@keyframes car{50%{opacity:0}}
  .mk-go{margin-left:auto;flex:none;width:34px;height:34px;border-radius:9px;background:var(--amber);border:3px solid var(--ink);display:grid;place-items:center}.mk-go .ic{width:18px;height:18px}
  .mk-grid{position:absolute;left:3%;right:3%;top:calc(4% + 72px);bottom:4px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .mk-t{position:relative;border:3px solid var(--ink);border-radius:12px;overflow:hidden;background:#e9dcc0;box-shadow:4px 4px 0 var(--ink);opacity:0}
  .mk-t svg{width:100%;height:100%;display:block}
  .mk-t.pk{outline:4px solid var(--red);outline-offset:3px}
  .mk-t .ck{position:absolute;right:6px;top:6px;width:28px;height:28px;border-radius:50%;background:var(--lime);border:3px solid var(--ink);display:grid;place-items:center;transform:scale(0)}.mk-t .ck .ic{width:15px;height:15px}
  .shim{position:absolute;inset:0;background:repeating-linear-gradient(-45deg,#e9dcc0 0 8px,#f3e8d2 8px 16px);background-size:200% 100%;animation:shim 1.2s linear infinite}@keyframes shim{from{background-position:0 0}to{background-position:45px 0}}
  .ill-rel svg,.ill-meet svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .ill-rel .win{fill:#e9dcc0;transition:fill .25s}.ill-rel .win.on{fill:#ffc84a}
  .dotfly{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px;border-radius:50%;background:radial-gradient(circle,#fff7e6 0 18%,#ffc84a 34%,#ffc84a55 55%,transparent 72%);will-change:transform}
  .dotfly.ink{background:var(--amber);border:3px solid var(--ink);box-shadow:0 0 0 6px #ffc84a55}
  .tile0{position:absolute;width:86px;height:86px;border:3px solid var(--ink);border-radius:12px;overflow:hidden;box-shadow:4px 4px 0 var(--ink);will-change:transform}.tile0 svg{width:100%;height:100%;display:block}
  .chip.dark{background:var(--ink);color:var(--cream);border-color:var(--ink)}.chip.dark .ic{color:var(--amber)}
  /* swarm pick */
  .sp-orb{position:relative;width:118px;height:118px;margin:0 auto}
  .sp-orb .orb{position:absolute;inset:14px;border-radius:50%;background:var(--c,#e9dcc0);border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink);transition:background .35s}
  .sp-orb .ring{position:absolute;inset:0;border-radius:50%;border:3px dashed var(--ink);opacity:.35;animation:spinr 14s linear infinite}
  .sp-orb .gl{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-44px 0 0 -42px}.sp-orb .gl svg{width:100%;height:100%}
  .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
  .sp-c{--s:0;display:flex!important;align-items:center;gap:10px;padding:12px!important;text-align:left;border-radius:12px;transform:translateY(calc(var(--s)*-4px)) scale(calc(1 - var(--p,0)*.04));box-shadow:calc(4px + var(--s)*3px) calc(4px + var(--s)*3px) 0 var(--ink)!important;transition:background .2s}
  .sp-c b{display:block;font:800 15px/1.1 var(--ui)}.sp-c small{display:block;margin-top:3px;font:600 11px var(--ui);color:var(--sub)}
  .sp-c.sel{background:var(--c)!important}
  .sp-dot{width:30px;height:30px;border-radius:50%;border:3px solid var(--ink);flex:none}
  /* born */
  .bn-stage{position:relative;height:200px;margin-top:4px}
  .bn-orb{position:absolute;left:50%;top:50%;width:112px;height:112px;margin:-56px;border-radius:50%;background:var(--c);border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink)}
  .bn-rays{position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px;overflow:visible}
  .bn-fly{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px}.bn-fly svg{width:100%;height:100%}
  .bn-p{position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px;border-radius:50%;background:var(--c);border:2.5px solid var(--ink);animation:orb var(--d) linear infinite}
  @keyframes orb{from{transform:rotate(0) translateX(var(--r)) rotate(0)}to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}}
  .ladder{margin-top:16px;padding:4px 12px!important}
  .ladder .lr{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:2px solid #14102E1f}.ladder .lr:last-child{border:0}
  .ladder .bd{width:38px;height:38px;flex:none}.ladder .bd svg{width:100%;height:100%}
  .ladder b{display:block;font:800 14px var(--ui)}.ladder small{display:block;font:600 12px var(--ui);color:var(--sub);margin-top:2px}
  .ladder .lr.cur{background:var(--lime);margin:4px -12px 0;padding:9px 12px;border-bottom:3px solid var(--ink);border-top:3px solid var(--ink)}
  /* import */
  .im-card{margin-top:auto;padding:14px 14px 16px!important;border-radius:18px!important}
  .im-h{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:3px solid var(--ink)}
  .im-app{display:flex;align-items:center;gap:10px;flex:1}.im-app .ffl{width:38px;height:38px;border-radius:10px;background:var(--red);border:3px solid var(--ink);display:grid;place-items:center;color:var(--cream);font:900 13px var(--ui)}
  .im-app b{display:block;font:800 16px var(--ui)}.im-app small{display:block;font:600 11px var(--ui);color:var(--sub)}
  .im-sync{display:flex;align-items:center;gap:8px;margin:12px 2px 10px;font:800 11px var(--ui);letter-spacing:.06em;text-transform:uppercase}
  .spin{width:16px;height:16px;border-radius:50%;border:3px solid #14102E33;border-top-color:var(--ink);animation:spn .7s linear infinite}@keyframes spn{to{transform:rotate(360deg)}}
  .im-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .im-t{position:relative;display:block!important;aspect-ratio:1;border:3px solid var(--ink)!important;border-radius:11px!important;overflow:hidden;background:#e9dcc0!important;box-shadow:3px 3px 0 var(--ink);transform:scale(calc(1 - var(--p,0)*.05))}
  .im-t .ai{position:absolute;inset:0;opacity:0}.im-t .ai svg{width:100%;height:100%;display:block}
  .im-t.sel{outline:4px solid var(--red);outline-offset:2px}
  .im-t .ck{position:absolute;right:5px;top:5px;width:24px;height:24px;border-radius:50%;background:var(--lime);border:3px solid var(--ink);display:grid;place-items:center;transform:scale(0);transition:transform .3s cubic-bezier(.3,1.6,.5,1)}.im-t.sel .ck{transform:scale(1)}.im-t .ck .ic{width:13px;height:13px}
  .im-pr{margin:12px 2px 0;min-height:38px;font:600 13px/1.4 var(--ui);display:flex;gap:8px;align-items:flex-start}.im-pr .ic{width:20px;height:20px;flex:none}
  .im-note{margin:8px 2px 0;font:600 10.5px/1.4 var(--ui);color:var(--sub)}
  .im-card .sx-foot{padding-top:12px}
  .ffimp{width:100%;height:46px!important;margin-bottom:10px;background:var(--ink)!important;color:var(--cream)!important}
  .ffimp .ic{color:var(--amber)!important}
  .ffl-s{width:24px;height:24px;border-radius:7px;background:var(--red);border:2px solid var(--cream);font:900 9px/20px var(--ui);text-align:center;color:var(--cream);flex:none}
  /* letterbox + caption */
  .lb{position:absolute;left:0;right:0;height:12%;background:#FFF4DE;z-index:1;will-change:transform}.lb.lbt{top:0;transform:translateY(-100%);border-bottom:4px solid var(--ink)}.lb.lbb{bottom:0;transform:translateY(100%);border-top:4px solid var(--ink)}
  .cap{position:absolute;left:50%;bottom:calc(12% + 18px);transform:translateX(-50%);z-index:2;opacity:0;white-space:nowrap}
  .cap .chip{height:42px;font-size:15px;padding:0 16px 0 10px;box-shadow:4px 4px 0 var(--ink);background:var(--amber)}
  /* released */
  .rs-art{position:relative;width:min(60%,230px);aspect-ratio:1;margin:4px auto 0;padding:0!important;overflow:visible!important;border-radius:16px!important}
  .rs-art .ai{position:absolute;inset:0;border-radius:12px;overflow:hidden}.rs-art .ai svg,.rs-art .ai img{width:100%;height:100%;object-fit:cover;display:block}
  .stamp{position:absolute;right:-22px;bottom:14px;padding:6px 12px;border:4px solid var(--red);border-radius:10px;color:var(--red);background:#fff9ecee;font:900 20px/1 var(--ui);letter-spacing:.08em;transform:rotate(-12deg) scale(0)}
  .rs-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.rs-stats .panel{padding:10px 12px!important}
  .rs-stats b{display:block;font:900 30px/1 var(--ui);letter-spacing:-.03em}.rs-stats small{display:block;margin-top:4px;font:700 11px/1.3 var(--ui);color:var(--sub)}
  .rs-next{margin-top:14px;padding:12px 14px!important}.rs-next>b{font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase}
  .rs-next ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}.rs-next li{display:flex;gap:10px;align-items:center;font:600 13px/1.3 var(--ui)}.rs-next li .ic{width:20px;height:20px}
  .sx .tc{text-align:center}
  /* notification */
  .nt{position:absolute;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));max-width:420px;margin:auto;display:flex;align-items:center;gap:12px;padding:10px 12px!important;pointer-events:auto;cursor:pointer;z-index:4;border-radius:16px!important;background:var(--cream)!important;box-shadow:5px 5px 0 var(--ink)!important}
  .nt .av{width:42px;height:42px}.nt .tx{flex:1;min-width:0}.nt b{display:block;font:800 14px/1.2 var(--ui)}.nt small{display:block;margin-top:2px;font:600 12px var(--ui);opacity:.7}
  .nt .ico{width:38px;height:38px;border-radius:50%;background:var(--amber);border:3px solid var(--ink);display:grid;place-items:center;flex:none}.nt .ico .ic{width:18px;height:18px}
  .heart{position:absolute;left:0;top:0;width:24px;height:24px;margin:-12px;color:var(--red);will-change:transform;pointer-events:none}.heart svg{width:100%;height:100%}
  .bell .bdg{position:absolute;right:-7px;top:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--red);border:2.5px solid var(--ink);color:var(--cream);font:800 11px/15px var(--ui);text-align:center;transform:scale(var(--b,1))}
  .bell .bdg:empty{display:none}
  /* inbox */
  .ib-list{display:flex;flex-direction:column;gap:12px}
  .ib-it{display:flex!important;align-items:center;gap:12px;padding:12px!important;text-align:left;border-radius:14px!important;transform:scale(calc(1 - var(--p,0)*.03))}
  .ib-it .ico{width:42px;height:42px;border-radius:12px;border:3px solid var(--ink);display:grid;place-items:center;flex:none}
  .ib-it .ico>svg{width:100%;height:100%;display:block}
  .sx-h{border-bottom:0!important;margin-bottom:6px!important}.ib-it .ico .ic{width:22px;height:22px}
  .ib-it .tx{flex:1;min-width:0}.ib-it b{display:block;font:800 14px/1.25 var(--ui)}.ib-it small{display:block;margin-top:3px;font:600 12px/1.3 var(--ui);color:var(--sub)}
  .ib-it .new{width:12px;height:12px;border-radius:50%;background:var(--red);border:2.5px solid var(--ink);flex:none}
  .ib-it .tm{font:700 11px var(--ui);color:var(--sub);flex:none}
  /* meet hub */
  .live{background:var(--lime)!important;height:30px!important;font-size:12px!important}.ldot{width:9px;height:9px;border-radius:50%;background:#14102E;animation:ld 1.6s infinite}@keyframes ld{50%{opacity:.25}}
  .mh-hero{padding:16px!important;border-radius:18px!important;text-align:center}
  .mh-ring{position:relative;width:190px;height:190px;margin:2px auto 0}
  .mh-ring svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .mh-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .mh-c small{font:800 10px var(--ui);letter-spacing:.08em;text-transform:uppercase}.mh-c b{font:900 28px/1.1 var(--ui);font-variant-numeric:tabular-nums;letter-spacing:-.03em}.mh-c span{font:700 12px var(--ui);color:var(--sub)}
  .mh-hero p{margin:10px 4px 14px;font:600 13.5px/1.45 var(--ui);color:var(--sub)}
  .mh-hero .btn{width:100%;height:52px}
  .mh-how{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .mh-how .panel{padding:10px!important;border-radius:14px!important;box-shadow:4px 4px 0 var(--ink)}.mh-how .n{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--amber);border:3px solid var(--ink);font:900 13px var(--ui)}
  .mh-how b{display:block;margin-top:8px;font:800 12.5px/1.2 var(--ui)}.mh-how small{display:block;margin-top:4px;font:600 10.5px/1.3 var(--ui);color:var(--sub)}
  .mh-sky{height:150px;padding:0!important}
  .mh-sky svg{width:100%;height:100%;display:block}
  .mh-row{display:flex!important;align-items:center;gap:12px;padding:10px 12px!important;border-radius:14px!important;margin-bottom:12px;width:100%;text-align:left}
  .mh-row .avs .av{width:30px;height:30px;margin-right:-8px}.mh-row b{display:block;font:800 13px var(--ui)}.mh-row small{display:block;font:600 11px var(--ui);color:var(--sub)}.mh-row .tx{flex:1;margin-left:10px}
  .mh-pad{height:110px;flex:none}
  /* match */
  .mt-top{text-align:left}
  .mt-top small{display:block;margin-top:8px;font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase;min-height:16px}
  .mt-win{flex:1;min-height:300px;margin:16px 0 0}
  .mt-cv{position:absolute;inset:0;width:100%;height:100%}
  .mt-node{position:absolute;left:0;top:0;width:0;height:0;z-index:2}
  .mt-node .card{position:absolute;left:-56px;top:20px;width:112px;padding:8px!important;text-align:center;border-radius:12px!important;opacity:0;box-shadow:4px 4px 0 var(--ink)!important}
  .mt-node .av{width:40px;height:40px;margin:-30px auto 2px;display:block}
  .mt-node b{display:block;font:800 13px var(--ui)}.mt-node .chip{height:22px;font-size:10px;padding:0 7px 0 5px;border-width:2px;margin-top:4px}.mt-node .chip .dot{width:9px;height:9px;border-width:2px}
  .mt-bot{margin-top:16px}
  /* spot */
  .ss-card{margin-top:auto;padding:14px!important;border-radius:18px!important}
  .ss-top{display:flex;align-items:center;gap:12px}.ss-pin{width:44px;height:52px;flex:none}.ss-pin svg{width:100%;height:100%}
  .ss-top b{display:block;font:900 20px/1.1 var(--ui);letter-spacing:-.02em}.ss-top small{display:block;margin-top:3px;font:600 12px var(--ui);color:var(--sub)}.ss-top .chip{margin-left:auto;background:var(--amber)}
  .ss-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 14px;padding-top:12px;border-top:2px solid #14102E1f;font:700 12px var(--ui)}.ss-meta span{display:flex;align-items:center;gap:5px}.ss-meta .ic{width:17px;height:17px}
  .slide{position:relative;height:60px;border:3px solid var(--ink);border-radius:30px;background:var(--cream);box-shadow:4px 4px 0 var(--ink);overflow:hidden;touch-action:none}
  .slide .fill{position:absolute;left:0;top:0;bottom:0;background:var(--lime);width:0}
  .slide b{position:absolute;inset:0;display:grid;place-items:center;font:800 16px var(--ui);padding-left:40px}
  .slide .kn{position:absolute;left:4px;top:4px;width:46px;height:46px;border-radius:50%;background:var(--red);border:3px solid var(--ink);display:grid;place-items:center;color:var(--cream);cursor:grab;will-change:transform}.slide .kn .ic{color:var(--cream);width:22px;height:22px}
  .route{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  .walker{position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px;border-radius:50%;background:var(--lime);border:3px solid var(--ink)}
  .who-a{position:absolute;left:0;top:0;width:0;height:0}
  .who-a .bub{position:absolute;left:-23px;top:-74px;width:46px;height:46px;border-radius:50%;border:3px solid var(--ink);background:var(--cream);box-shadow:3px 3px 0 var(--ink);overflow:hidden;transform-origin:50% 120%}
  .who-a .bub svg{width:100%;height:100%}
  .who-a .nm{position:absolute;left:50%;top:-24px;transform:translateX(-50%);white-space:nowrap;font:800 11px var(--ui);background:var(--cream);color:var(--ink);border:2.5px solid var(--ink);padding:2px 7px;border-radius:7px}
  .ckrow{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
  /* joint piece */
  .jt-board{position:relative;aspect-ratio:1;width:min(76%,290px);margin:14px auto 0;padding:0!important;background:#e9dcc0!important;border-radius:18px!important;overflow:hidden}
  .jt-t{position:absolute;width:50%;height:50%;padding:5px;will-change:transform}
  .jt-t .in2{position:relative;width:100%;height:100%;border:3px solid var(--ink);border-radius:10px;overflow:hidden}.jt-t svg{width:100%;height:100%;display:block}
  .jt-t .av{position:absolute;left:4px;bottom:4px;width:26px;height:26px}
  .jt-final{position:absolute;inset:0;opacity:0}.jt-final svg{width:100%;height:100%;display:block}
  .jt-final .ttl{position:absolute;left:10px;right:10px;bottom:10px;padding:8px 10px;border:3px solid var(--ink);border-radius:10px;background:var(--cream);font:800 13px var(--ui);text-align:center}
  .jt-flash{position:absolute;inset:0;background:#fff9ec;opacity:0;pointer-events:none}
  .jt-chain{margin-top:16px;padding:12px 14px!important}.jt-chain>b{font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase}
  .jt-chain ol{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
  .jt-chain li{display:flex;gap:8px;align-items:flex-start;font:600 13px/1.35 var(--ui);min-height:18px}.jt-chain li .av{width:22px;height:22px;flex:none}.jt-chain li b{font-weight:800;flex:none}
  /* star */
  .st-win{flex:1;min-height:280px;margin-top:4px}
  .st-sky{position:absolute;inset:0;width:100%;height:100%}
  .st-lbl{position:absolute;left:0;top:0;transform:translate(-50%,0);white-space:nowrap;opacity:0;background:var(--amber)!important;color:var(--ink)!important}
  .st-txt{margin-top:16px}
  /* level up */
  .lv-stage{position:relative;height:240px;margin-top:4px;display:grid;place-items:center}
  .lv-rays{position:absolute;width:400px;height:400px;border-radius:50%;background:repeating-conic-gradient(from 0deg,#ffc84a 0 7.5deg,transparent 7.5deg 15deg);-webkit-mask:radial-gradient(circle,#000 22%,transparent 64%);mask:radial-gradient(circle,#000 22%,transparent 64%);opacity:.75;animation:spinr 24s linear infinite}
  @keyframes spinr{to{transform:rotate(360deg)}}
  .lv-badge{position:relative;width:150px;height:150px}.lv-badge svg{width:100%;height:100%;filter:drop-shadow(5px 5px 0 #14102E)}
  .lv-rew{margin-top:16px;padding:14px!important;display:flex;gap:12px;align-items:center;border-radius:16px!important}.lv-rew .ico{width:46px;height:46px;border-radius:12px;background:var(--lime);border:3px solid var(--ink);display:grid;place-items:center;flex:none}
  .lv-rew b{display:block;font:800 15px var(--ui)}.lv-rew small{display:block;margin-top:3px;font:600 12px/1.3 var(--ui);color:var(--sub)}
  .lv-next{margin-top:16px;font:800 11px var(--ui);letter-spacing:.08em;text-transform:uppercase}
  .lv-next .prog{margin-top:8px;box-shadow:4px 4px 0 var(--ink)}
  /* swarm night intro */
  .sn-big{margin:auto 0;text-align:left}
  .sn-big .kt{font:900 76px/.9 var(--ui);letter-spacing:-.05em;text-transform:uppercase}
  .sn-big .kt.nb{display:inline-block;margin-top:6px;padding:4px 14px 8px;background:#0E1034;color:var(--amber);border:4px solid var(--ink);border-radius:14px;box-shadow:6px 6px 0 var(--ink)}
  .sn-cd{display:grid;place-items:center;width:110px;height:110px;margin-top:26px;border-radius:50%;background:var(--red);border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);font:900 60px/1 var(--ui);color:var(--cream);font-variant-numeric:tabular-nums}
  .sx-on .bell{opacity:0;pointer-events:none!important}html.rec .bell{display:none}
  .sx-on .demo-tag,.sx-on .record-tools,.sx-on .top{opacity:0!important;pointer-events:none!important;transition:opacity .25s}
  .mt-chip{width:max-content}
  .sx-col>*{flex-shrink:0}
  .sx-on .mapctl,.sx-on .backchip{visibility:hidden!important}
  .rm .sx *{animation:none!important}
  /* ===== r04 rebuild: big centred headlines, few words, no header bar / step numbers / dots / footnotes ===== */
  .r4 .hx{display:block;margin:0;font:900 46px/.9 var(--ui);letter-spacing:-.045em;text-transform:uppercase;text-align:center;color:var(--ink)}
  .r4 .hx.m{font-size:38px}.r4 .hx.s{font-size:30px}
  .r4 .hx em{font-style:normal;background:linear-gradient(transparent 56%,var(--amber) 56%,var(--amber) 90%,transparent 90%)}
  .r4 .sb{margin:12px 0 0;text-align:center;font:700 16px/1.3 var(--ui);color:var(--ink);opacity:.7}
  .r4 .big{height:62px!important;width:100%;font-size:18px!important;justify-content:center;gap:12px;box-shadow:5px 5px 0 var(--ink)!important}
  .r4 .big .ic{width:24px;height:24px}
  .r4 svg g{transform-box:fill-box;transform-origin:center}
  .r4 .ob-top{display:flex;justify-content:space-between;align-items:center;min-height:40px}
  .r4 .camp4{height:34px;padding:0 12px 0 9px;background:var(--amber);box-shadow:3px 3px 0 var(--ink);font:800 12.5px var(--ui)}.r4 .camp4 .ic{width:17px;height:17px}
  .r4 .ob-slide{padding-top:18px;align-items:stretch;overflow:hidden}
  .r4 .ill-meet .chip svg{position:static;inset:auto;width:20px;height:20px}
  .r4 .ob-ill{flex:1;min-height:250px;height:auto;margin-top:14px;display:grid;place-items:center}
  .r4 .ob-ill>svg{width:100%;max-width:380px;height:auto;overflow:visible}
  .r4 .ob-foot{padding-top:16px}.r4 .ob-foot .btn{min-width:0}
  .r4 .ill-make{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
  .r4 .mk-pr{position:relative;max-width:100%;height:44px;padding:0 14px 0 6px;gap:8px;background:var(--card);box-shadow:4px 4px 0 var(--ink);font:700 14px var(--ui);opacity:0;white-space:nowrap}
  .r4 .ffb{flex:none;width:30px;height:30px;border-radius:8px;background:var(--red);border:2.5px solid var(--ink);color:var(--cream);font:900 11px/25px var(--ui);text-align:center}
  .r4 .mk-pr .mk-tx{max-width:none;overflow:hidden}
  .r4 .ill-meet{position:relative}.r4 .ill-rel>svg{position:static;inset:auto}
  /* firefly ready */
  .r4 .rd-fly{position:relative;flex:1;min-height:200px;display:grid;place-items:center}
  .r4 .rd-fly svg{width:230px;height:230px;overflow:visible}
  .r4 .lad{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
  .r4 .lad .ln{position:absolute;left:12%;right:12%;top:39px;height:4px;background:var(--ink);transform-origin:left;transform:scaleX(0)}
  .r4 .lad .st{position:relative;display:flex;flex-direction:column;align-items:center;padding:12px 4px 12px;border-radius:14px;border:4px solid transparent}
  .r4 .lad .st.cur{background:var(--amber);border-color:var(--ink);box-shadow:5px 5px 0 var(--ink)}
  .r4 .lad .bd{width:50px;height:50px}.r4 .lad .bd svg{width:100%;height:100%}
  .r4 .lad b{margin-top:8px;font:900 15px var(--ui)}.r4 .lad small{margin-top:3px;font:700 11.5px var(--ui);opacity:.75}
  /* library */
  .r4 .lib{margin-top:auto;padding:14px 18px 20px!important;border-radius:20px!important;box-shadow:0 -2px 0 var(--ink),5px 5px 0 #05061A!important;background:var(--card)!important}
  .r4 .lib .grab0{width:56px;height:5px;border-radius:3px;background:#14102E33;margin:0 auto 10px}
  .r4 .lib-h{position:relative;padding:4px 40px 0}
  .r4 .lib-h .sx-x{position:absolute;right:-6px;top:-4px}
  .r4 .lib-g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}
  .r4 .lt{position:relative;display:block!important;aspect-ratio:1;padding:0!important;border:3px solid var(--ink)!important;border-radius:12px!important;overflow:hidden;background:#0E1034!important;box-shadow:3px 3px 0 var(--ink);transform:scale(calc(1 - var(--p,0)*.05))}
  .r4 .lt .ai{position:absolute;inset:0;opacity:0}.r4 .lt .ai svg{width:100%;height:100%;display:block}
  .r4 .lt .ck{position:absolute;right:6px;top:6px;width:28px;height:28px;border-radius:50%;background:var(--lime);border:3px solid var(--ink);display:grid;place-items:center;transform:scale(0)}.r4 .lt .ck .ic{width:15px;height:15px}
  .r4 .lt .smp{position:absolute;left:5px;bottom:5px;padding:1px 5px;border-radius:5px;background:#FFF4DEdd;color:var(--ink);font:800 8.5px/14px var(--ui);letter-spacing:.06em}
  .r4 .lt.sel{outline:4px solid var(--lime);outline-offset:-1px}
  .r4 .lib-pr{display:flex;gap:12px;align-items:flex-start;min-height:76px;margin-top:16px;padding:14px 14px!important;border-radius:14px!important;box-shadow:none!important;font:700 15px/1.35 var(--ui)}
  .r4 .lib-pr .ic{width:24px;height:24px;flex:none;margin-top:1px}
  .r4 .lib-pr .ph{opacity:.45}
  .r4 .lib .sx-foot{padding-top:16px}
  /* hold to release (ui.js pane 3) */
  #rel.r4p3 .release-title,#rel .steps{display:none!important}
  #rel .pane.p3{justify-content:flex-start;padding-top:6px}
  #rel.r4p3 .panes{margin-top:46px}
  #rel .p3 .mini{justify-content:flex-start;gap:14px}
  #rel .p3 .mini .th{width:76px;height:76px;border-radius:14px;background:#0E1034;box-shadow:3px 3px 0 var(--ink)}
  #rel .p3 .mini .mt{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
  #rel .p3 .mini .spotc{height:40px;font-size:15px;padding:0 16px 0 10px;background:var(--card)}
  #rel .p3 .mini small{font:800 13px var(--ui)}
  #rel .p3 .hx3{margin:22px 0 0;font:900 34px/.95 var(--ui);letter-spacing:-.04em;text-transform:uppercase;text-align:center}
  #rel .p3 .holdwrap{padding:22px 0 4px}
  #rel .p3 .hold{width:150px;height:150px}
  #rel .p3 .hold .rbtn{position:absolute;inset:18px;width:auto;height:auto;margin:0;border-radius:50%}
  #rel .p3 .hold .rbtn .ic{width:54px;height:54px}
  #rel .p3 .lbl{margin-top:14px;font:700 15px var(--ui);opacity:.7}
  /* released */
  .r4c .sx-col{justify-content:center}.r4c .sx-foot{margin-top:34px}
  .r4 .rs-art{width:min(72%,280px);margin:24px auto 0}
  .r4 .rs-art .ai{border-radius:10px}
  .r4 .stamp{right:-26px;bottom:18px;font-size:24px}
  .r4 .rs2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}
  .r4 .rs2 .panel{padding:12px 14px!important;border-radius:14px!important;box-shadow:4px 4px 0 var(--ink)!important;text-align:center}
  .r4 .rs2 b{display:block;font:900 30px/1 var(--ui);letter-spacing:-.03em}
  .r4 .rs2 small{display:block;margin-top:5px;font:800 12px var(--ui);opacity:.6}
  .r4 .rs-9{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;font:800 16px var(--ui)}.r4 .rs-9 .ic{width:24px;height:24px}
  .r4 .rs-foot{display:flex;gap:12px}.r4 .rs-foot .big{flex:1}.r4 .rs-foot .sh{flex:none;width:62px;height:62px;padding:0!important;border-radius:31px;display:grid;place-items:center;box-shadow:5px 5px 0 var(--ink)!important}.r4 .rs-foot .sh .ic{width:24px;height:24px}
  /* glow notification */
  .nt.r4n{top:calc(68px + env(safe-area-inset-top,0px));gap:14px;padding:14px 16px!important;border-radius:18px!important;box-shadow:5px 5px 0 #05061A!important;border-width:4px!important}
  .nt.r4n .av{width:54px;height:54px;flex:none}
  .nt.r4n b{font:900 18px/1.1 var(--ui);letter-spacing:-.02em}
  .nt.r4n small{margin-top:5px;font:800 12px var(--ui);opacity:.6}
  .nt.r4n .hrt{width:30px;height:30px;flex:none;color:var(--red)}.nt.r4n .hrt svg{width:100%;height:100%}
  .nav .tab[data-tab=me]{position:relative}
  .nav .udot{position:absolute;right:8px;top:4px;width:13px;height:13px;border-radius:50%;background:var(--red);border:2.5px solid var(--ink);transform:scale(0)}
  /* constellation */
  .r4 .ct-top{min-height:118px;display:flex;flex-direction:column;justify-content:flex-end}
  .r4 .ct-win{position:relative;flex:1;min-height:330px;margin-top:20px;padding:0!important;background:#0E1034!important}
  .r4 .ct-g{position:absolute;inset:22px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:34px 30px;z-index:2}
  .r4 .ct-c{position:relative;padding:12px!important;border-radius:12px!important;box-shadow:none!important;border-width:3px!important;opacity:0;display:flex;flex-direction:column;justify-content:flex-end;background:var(--card)!important}
  .r4 .ct-c .av{position:absolute;left:10px;top:10px;width:44px;height:44px;border-radius:50%;box-shadow:0 0 0 0 var(--c)}
  .r4 .ct-c i{position:absolute;right:10px;top:12px;width:18px;height:18px;border-radius:50%;background:var(--c);border:2.5px solid var(--ink)}
  .r4 .ct-c b{font:900 19px/1 var(--ui);letter-spacing:-.02em}.r4 .ct-c small{margin-top:4px;font:800 11.5px var(--ui);opacity:.65}
  .r4 .ct-ln{position:absolute;inset:0;width:100%;height:100%;z-index:1;overflow:visible}
  .r4 .ct-chips{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:16px;opacity:0}
  .r4 .ct-chips span{display:grid;place-items:center;height:40px;border:3px solid var(--ink);border-radius:20px;background:var(--card);font:800 13px var(--ui)}
  .r4 .ct-chips span.on{background:var(--lime)}
  .r4 .ct-brief{margin-top:18px;text-align:center;font:900 20px/1.15 var(--ui);letter-spacing:-.02em;opacity:0}
  .r4 .ct-brief small{display:block;margin-bottom:6px;font:800 12px var(--ui);letter-spacing:.04em;opacity:.55}
  .r4 .btn.violet{background:var(--violet,#8B7CF6)!important;color:var(--ink)!important}
  .r4 .sx-x.tl{position:absolute;left:20px;top:calc(14px + env(safe-area-inset-top,0px));z-index:3}
  /* spot */
  .r4 .sp4{margin-top:auto;padding:12px 18px 18px!important;border-radius:20px!important;background:var(--card)!important;box-shadow:5px 5px 0 #05061A!important}
  .r4 .sp4 .grab0{width:56px;height:5px;border-radius:3px;background:#14102E33;margin:0 auto 12px}
  .r4 .sp4 .hx{font-size:40px}
  .r4 .sp4-m{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
  .r4 .sp4-m span{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;border:3px solid var(--ink);border-radius:22px;background:var(--cream);font:800 15px var(--ui)}.r4 .sp4-m .ic{width:20px;height:20px}
  .r4 .sp4-w{display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0 16px;font:800 15px var(--ui)}
  .r4 .sp4-w .avs{display:flex}.r4 .sp4-w .av{width:34px;height:34px;margin-right:-9px}
  .r4 .slide{height:64px;border-radius:32px;border-width:4px;box-shadow:5px 5px 0 var(--ink)}
  .r4 .slide b{font-size:17px;padding:0 50px;cursor:pointer}
  .r4 .slide .kn{width:50px;height:50px;left:3px;top:3px}
  .r4 .slide .end{position:absolute;right:8px;top:8px;width:42px;height:42px;border-radius:50%;background:var(--lime);border:3px solid var(--ink);display:grid;place-items:center;opacity:.35}.r4 .slide .end .ic{width:22px;height:22px}
  .r4 .slide.ok .end{opacity:1}
  </style>`);
  const G = (root, k, id) => root.querySelector('#p-' + k + '-' + id);
  const rise = (el, d = 0, px = 12, k = [.42, 1]) => { if (!el) return; el.style.opacity = 0; const s = spring(0, k, v => { el.style.opacity = Math.min(1, v * 1.4); el.style.transform = `translateY(${(1 - v) * px}px)`; }, .002); s.set(0); setTimeout(() => s.to(1), d); };

  /* ---------- layers ---------- */
  const under = document.createElement('div'); under.className = 'sx-under'; app.insertBefore(under, $('.col'));
  const over = document.createElement('div'); over.className = 'sx-over'; app.insertBefore(over, $('.toasts'));
  const fx = document.createElement('div'); fx.className = 'sx-fx'; app.appendChild(fx);
  const mapfx = document.createElement('div'); mapfx.className = 'sx-fx'; app.insertBefore(mapfx, over);
  const stack = [];

  /* ---------- scenes: push / up / fade, each with its own content stagger ---------- */
  function scene(html, o = {}) {
    const mode = o.mode || 'push', el = document.createElement('section');
    el.className = `sx sx-${o.bg || 'night'} ${o.cls || ''}`; el.innerHTML = `<div class="sx-bg"></div><div class="sx-col">${html}</div>`;
    (o.under ? under : over).appendChild(el); const prev = stack[stack.length - 1]; el._o = o; el._prev = prev; el._act = o.act || {}; stack.push(el);
    if (!o.keepNav) UI.hideNav(true); app.classList.add('sx-on');
    const col = $('.sx-col', el), bg = $('.sx-bg', el), land = app.classList.contains('land');
    const X = land ? '' : 'translateX(-50%) ';
    el._sp = spring(0, mode === 'push' ? [.5, 1] : [.48, .92], v => {
      if (mode === 'push') { el.style.transform = `translate3d(${(1 - v) * 100}%,0,0)`; if (prev && prev._o.bg !== 'clear') { prev.style.transform = `translate3d(${-v * 28}%,0,0)`; prev.style.filter = `brightness(${1 - .45 * v})`; } }
      else if (mode === 'up') { bg.style.opacity = Math.min(1, v * 1.5); col.style.transform = X + `translate3d(0,${(1 - v) * 100}%,0)`; }
      else { el.style.opacity = Math.min(1, v * 1.4); col.style.transform = X + `scale(${.94 + .06 * v})`; }
    }, .001);
    el._sp.set(0).to(1); if (o.sound !== false) SFX.whoosh(); haptic(6);
    setTimeout(() => reveal(el), mode === 'push' ? 90 : 140);
    return el; }
  function close(el = stack[stack.length - 1], instant) { if (!el) return Promise.resolve(); const i = stack.indexOf(el); if (i < 0) return Promise.resolve(); stack.splice(i, 1);
    const prev = el._prev; el.style.pointerEvents = 'none'; if (el._o.onClose) el._o.onClose();
    if (!stack.length) app.classList.remove('sx-on'); UI.hideNav(stack.some(s => !s._o.keepNav) || !!(UI.relS && UI.relS.isOpen));
    if (instant) { el.remove(); if (prev) { prev.style.transform = ''; prev.style.filter = ''; } return Promise.resolve(); }
    return new Promise(res => el._sp.kind([.42, 1]).to(0).then(() => { el.remove(); res(); })); }
  function closeAll(instant) { return Promise.all([...stack].reverse().map(e => close(e, instant))); }
  /* content: .in rises with a little overshoot; .kt splits into words that come up from a mask */
  function reveal(root, base = 0) {
    $$('.kt', root).forEach(k => { if (k._split) return; k._split = 1; k.innerHTML = k.innerHTML.split(/(<em>.*?<\/em>|\s+)/).filter(x => x && x.trim()).map(w => `<span class="w"><span>${w}</span></span>`).join(' '); });
    let i = 0;
    $$('.kt .w>span', root).forEach(w => { const s = spring(0, [.5, .78], v => w.style.transform = `translate3d(0,${(1 - v) * 105}%,0)`, .002); s.set(0); setTimeout(() => s.to(1), base + 30 + i++ * 45); });
    $$('.in', root).forEach(el => { if (el._in) return; el._in = 1; const s = spring(0, [.46, .74], v => { el.style.opacity = Math.min(1, v * 1.3); el.style.transform = `translate3d(0,${(1 - v) * 26}px,0) scale(${.97 + .03 * v})`; }, .002); s.set(0); setTimeout(() => s.to(1), base + 120 + i++ * 55); }); }
  over.addEventListener('click', act); under.addEventListener('click', act);
  function act(e) { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const sc = b.closest('.sx'); const a = b.dataset.act; SFX.tap();
    if (sc && sc._act[a]) return sc._act[a](b, e); if (a === 'back') close(sc); if (a === 'close') closeAll(); }

  /* ---------- little motion helpers ---------- */
  const pop = (el, d = 0, k = [.42, .6]) => { const s = spring(0, k, v => { el.style.transform = `scale(${Math.max(0, v)})`; el.style.opacity = Math.min(1, v * 2); }, .002); s.set(0); return new Promise(r => setTimeout(() => s.to(1).then(r), d)); };
  async function typeIn(el, str, cps = 26, set) { el.textContent = ''; for (let i = 0; i < str.length; i++) { el.textContent += str[i]; set && set(el.textContent); if (str[i] !== ' ' && i % 2 === 0) SFX.type(); await wait(1000 / cps * (str[i] === ' ' ? 1.6 : .7 + Math.random() * .6)); } }
  const ticker = (el, to, dur = .9) => spring(0, [dur, 1], v => el.textContent = Math.round(v).toLocaleString('en-IN'), .3).set(0).to(to);
  function flyGhost(html, r0, r1, o = {}) { const el = document.createElement('div'); el.style.cssText = `position:absolute;left:0;top:0;width:${r0.width}px;height:${r0.height}px;transform-origin:0 0;will-change:transform;border-radius:${o.br ?? 12}px;overflow:hidden;border:3px solid var(--ink);box-shadow:4px 4px 0 #05061A;z-index:9`;
    el.innerHTML = html; fx.appendChild(el); const S = { x: STAGE.x, y: STAGE.y };
    const s = spring(0, o.k || [.55, .9], p => { const x = lerp(r0.left, r1.left, p) - S.x, y = lerp(r0.top, r1.top, p) - S.y - Math.sin(p * Math.PI) * (o.arc || 0), sc = lerp(1, r1.width / r0.width, p);
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${sc}) rotate(${Math.sin(p * Math.PI) * (o.rot || 0)}deg)`; if (o.fade) el.style.opacity = 1 - smooth(.7, 1, p); }, .001);
    return new Promise(res => s.set(0).to(1).then(() => { el.remove(); res(); })); }
  function glowDot(col = '#ffc84a', sz = 30) { const d = document.createElement('div'); d.className = 'dotfly'; d.style.width = d.style.height = sz + 'px'; d.style.margin = -sz / 2 + 'px'; d.style.background = `radial-gradient(circle,#fff7e6 0 16%,${col} 34%,${col}55 55%,transparent 72%)`; fx.appendChild(d); return d; }
  const confetti = r => UI.confetti && UI.confetti(r, 30);

  /* ================= 1. onboarding ================= */
  function firstRun() { if (QS.has('work') || QS.has('noob') || TOUR.on || REC) return; if (store.get('ob') && !QS.has('ob')) return; onboard(); }
  function onboard() {
    const el = scene(`
      <div class="ob-top"><span class="chip camp4">${ic('clock')}${CAMP.DAYS}-day campaign</span><button class="sx-skip" data-act="skip">Skip</button></div>
      <div class="ob-wrap"><div class="ob-track">
        <div class="ob-slide"><h2 class="hx kt">Make <em>something.</em></h2><p class="sb in">in Adobe Firefly · prompt it or sketch it</p>
          <div class="ob-ill ill-make">${PACK['ill-make']}<span class="chip mk-pr"><span class="ffb">Ff</span><span class="mk-tx"></span><span class="caret"></span></span></div></div>
        <div class="ob-slide"><h2 class="hx kt">Release it <em>on campus.</em></h2><p class="sb in2">it becomes a firefly on the live map</p><div class="ob-ill ill-rel">${PACK['ill-release']}</div></div>
        <div class="ob-slide"><h2 class="hx kt">Meet <em>at 9.</em></h2><p class="sb in2">${CAMP.DAYS} days · most Glows received tops the board</p><div class="ob-ill ill-meet"></div></div>
      </div></div>
      <div class="ob-foot"><button class="btn pill amber big" data-press data-act="next"><span class="bt">Next</span>${ic('next')}</button></div>`, { mode: 'fade', bg: 'night', cls: 'r4' });
    const track = $('.ob-track', el), wrap = $('.ob-wrap', el); let idx = 0, ran = [];
    const tx = spring(0, [.5, 1], v => track.style.transform = `translate3d(${-v * 100}%,0,0)`, .0005);
    function goTo(i) { idx = clamp(i, 0, 2); tx.to(idx); $('.bt', el).textContent = idx === 2 ? 'Pick my swarm' : 'Next';
      if (!ran[idx]) { ran[idx] = 1; $$('.in2', $$('.ob-slide', el)[idx]).forEach(x => x.classList.replace('in2', 'in')); reveal($$('.ob-slide', el)[idx], 80); [illMake, illRel, illMeet][idx]($$('.ob-ill', el)[idx]); } SFX.tick(idx); }
    $$('.in2', el).forEach(x => x.style.opacity = 0);
    let dx0 = null; wrap.addEventListener('pointerdown', e => { dx0 = e.clientX; }); wrap.addEventListener('pointerup', e => { if (dx0 === null) return; const d = e.clientX - dx0; dx0 = null; if (Math.abs(d) > 40) goTo(idx + (d < 0 ? 1 : -1)); });
    el._act = { next: () => idx < 2 ? goTo(idx + 1) : swarmPick(), skip: () => { store.set('ob', 1); closeAll(); } };
    ran[0] = 1; illMake($('.ill-make', el), true); }

  /* r04 s01: sketch and result rise together, the arrow traces sketch → result, one sparkle, then the prompt types in */
  async function illMake(root) { const K = 'ill-make', g = id => G(root, K, id);
    ['sparkle-1', 'sparkle-2', 'sparkle-3'].forEach(id => g(id).style.opacity = 0);
    const arr = g('dots'), ap = arr.querySelector('path'); ap.setAttribute('stroke-dasharray', '40'); ap.setAttribute('stroke-dashoffset', '40');
    rise(g('shadow'), 260); rise(g('sketch'), 260); rise(g('pencil'), 260); rise(g('result'), 330);
    await wait(900); SFX.whoosh(); spring(40, [.5, 1], v => ap.setAttribute('stroke-dashoffset', v), .3).to(0);
    await wait(380); const sp = g('sparkle-1'); spring(0, [.3, .45], v => { sp.style.opacity = Math.min(1, v); sp.style.transform = `scale(${v})`; }, .002).set(0).to(1); SFX.pop(2);
    setTimeout(() => ['sparkle-2', 'sparkle-3'].forEach((id, i) => pop(g(id), i * 140, [.35, .5])), 200);
    const pr = $('.mk-pr', root); await wait(300); rise(pr, 0, 16); await wait(200); await typeIn($('.mk-tx', root), 'a chai glass holding a tiny galaxy', 30); SFX.pop(); }
  /* slide 2: the firefly arcs in and Square One's windows warm one by one */
  async function illRel(root) { const K = 'ill-release', g = id => G(root, K, id), ff = g('firefly'), arc = g('arc').querySelector('path'), halo = g('halo');
    ff.style.opacity = 0; halo.style.opacity = 0; arc.style.opacity = 0; await wait(300);
    arc.style.opacity = 1; arc.setAttribute('stroke-dasharray', '1 8'); SFX.rise();
    const pts = [[18, 41], [119, 42], [199, 71]];
    await spring(0, [1, 1], p => { const u = 1 - p, x = u * u * 18 + 2 * u * p * 70 + p * p * 203, y = u * u * 41 + 2 * u * p * -10 + p * p * 62; ff.style.opacity = 1; ff.setAttribute('transform', `translate(${x - 203} ${y - 62})`); }, .001).set(0).to(1);
    SFX.land(); haptic(14); spring(0, [.6, .8], v => { halo.style.opacity = v; halo.style.transform = `scale(${.4 + .6 * v})`; }, .002).set(0).to(1);
    Array.from({ length: 18 }, (_, i) => g('win-' + (i + 1))).filter(Boolean).sort(() => Math.random() - .5).forEach((w, i) => setTimeout(() => { w.setAttribute('opacity', 1); if (i % 3 === 0) SFX.tick(i % 5); }, 120 + i * 70)); }
  async function illMeet(root) {
    const ppl = M0.people, pts = [[70, 70], [210, 50], [240, 160], [100, 180]];
    root.innerHTML = `<svg viewBox="0 0 300 240">${pts.map((p, i) => { const q = pts[(i + 1) % 4]; return `<line class="ln" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#14102E" stroke-width="3" stroke-linecap="round" stroke-dasharray="200" stroke-dashoffset="200"/>`; }).join('')}
      ${pts.map((p, i) => `<g class="nd" style="transform-origin:${p[0]}px ${p[1]}px;transform:scale(0)"><circle cx="${p[0]}" cy="${p[1]}" r="24" fill="${SW[ppl[i].sw].col}" opacity=".35"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${SW[ppl[i].sw].col}" stroke="#14102E" stroke-width="3"/></g>`).join('')}</svg>
      <div class="chip mt-chip" style="position:absolute;left:50%;top:44%;transform:translateX(-50%) scale(0);background:var(--amber);height:38px;font-size:14px;box-shadow:4px 4px 0 #14102E">${ic('pin')}Square One · 9:15 PM</div>`;
    const nds = $$('.nd', root); for (let i = 0; i < 4; i++) { const g = nds[i]; spring(0, [.4, .55], v => g.style.transform = `scale(${v})`, .002).set(0).to(1); SFX.pop(i); await wait(220); }
    const ls = $$('.ln', root); for (let i = 0; i < 4; i++) { const l = ls[i]; spring(200, [.5, 1], v => l.setAttribute('stroke-dashoffset', v), .5).to(0); SFX.tick(i); await wait(200); }
    const ch = $('.mt-chip', root); spring(0, [.4, .55], v => ch.style.transform = `translateX(-50%) scale(${v})`, .002).set(0).to(1); SFX.chime(); haptic(10); }

  function swarmPick() {
    const counts = SW.map((_, i) => 140 + FF.list.filter(f => f.sw === i).length * 9);
    let pick = null;
    const el = scene(`
      <button class="sx-x" data-act="back" aria-label="Back" style="align-self:flex-start">${ic('back')}</button>
      <div class="sp-orb in"><i class="ring"></i><div class="orb"></div><span class="gl">${PACK['ff-spark']}</span></div>
      <h2 class="hx m kt" style="margin-top:14px">Pick your <em>swarm.</em></h2><p class="sb in">your school is your colour</p>
      <div class="sp-grid">${SW.map((s, i) => `<button class="sp-c panel in" data-press data-act="pick" data-i="${i}" style="--c:${s.col}"><span class="sp-dot" style="background:${s.col}"></span><span><b>${s.name}</b><small>${counts[i]} makers</small></span></button>`).join('')}</div>
      <div class="sx-foot"><button class="btn pill amber" data-press data-act="go" disabled>${ic('check')}This is me</button></div>`, { mode: 'push', bg: 'night', cls: 'r4' });
    const lifts = $$('.sp-c', el).map(c => spring(0, [.35, .6], v => c.style.setProperty('--s', v), .002));
    el._act = { pick: b => { pick = +b.dataset.i; $$('.sp-c', el).forEach((c, k) => c.classList.toggle('sel', k === pick)); lifts.forEach((s, k) => s.to(k === pick ? 1 : 0)); $('.sp-orb', el).style.setProperty('--c', SW[pick].col); $('[data-act=go]', el).disabled = false; SFX.pop(pick); haptic(8); },
      go: () => { ME.sw = pick; born(); } };
    $('.sp-orb', el).style.setProperty('--c', '#FFF9EC'); }

  /* r04 s05: headline settles, one warm flash reveals the wings, the tail falls to an ember, the ladder line traces */
  function born() {
    const c = SW[ME.sw].col, REW = ['Story card', 'Poster', 'Glow pin', 'Projection'];
    const el = scene(`
      <button class="sx-x" data-act="back" aria-label="Back" style="align-self:flex-start">${ic('back')}</button>
      <h2 class="hx kt" style="margin-top:14px">Your firefly <em>is ready.</em></h2><p class="sb in">a little light. yours to grow.</p>
      <div class="rd-fly">${PACK['ff-spark']}</div>
      <div class="lad"><i class="ln"></i>${LV.map((l, i) => `<div class="st ${i === 0 ? 'cur' : ''}"><span class="bd">${PACK[BADGE[i]]}</span><b>${l}</b><small>${REW[i]}</small></div>`).join('')}</div>
      <div class="sx-foot" style="padding-top:22px"><button class="btn pill red big" data-press data-act="fly">Let it fly${pic('release')}</button></div>`, { mode: 'push', bg: 'night', cls: 'r4' });
    const K = 'ff-spark', g = id => G(el, K, id), fl = $('.rd-fly', el), wl = g('wing-l'), wr = g('wing-r'), body = g('body'), tail = g('tail-light'), glow = g('glow');
    $$('stop', el).forEach((st, i) => { if (i) st.setAttribute('stop-color', c); }); tail.querySelector('ellipse').setAttribute('fill', c);
    [wl, wr, glow].forEach(x => x.style.opacity = 0); body.style.opacity = 0; tail.style.opacity = 0; $$('.lad .st', el).forEach(x => x.style.opacity = 0);
    setTimeout(() => { body.style.opacity = 1; tail.style.opacity = 1; pop(tail, 0, [.35, .5]); SFX.pop(1); }, 650);
    setTimeout(() => { SFX.rise(); haptic(16);
      spring(0, [.5, .7], v => { glow.style.opacity = v; glow.style.transform = `scale(${.5 + 1.1 * v})`; }, .002).set(0).to(1).then(() => spring(1, [.5, 1], v => { glow.style.opacity = .55 + .45 * v; glow.style.transform = `scale(${1 + .6 * v})`; }, .002).to(0));
      [wl, wr].forEach((w, i) => spring(0, [.4, .55], v => { w.style.opacity = Math.min(1, v * 2); w.style.transform = `rotate(${(1 - v) * (i ? 40 : -40)}deg) scale(${v})`; }, .002).set(0).to(1)); }, 1050);
    let flap = 0; const flapF = () => { if (!el.isConnected) return; flap += .016; const a = Math.sin(flap * 26) * 7; wl.style.transform = `rotate(${-a}deg)`; wr.style.transform = `rotate(${a}deg)`; fl.style.transform = `translateY(${Math.sin(flap * 2.2) * 6}px)`; requestAnimationFrame(flapF); };
    setTimeout(flapF, 1700);
    setTimeout(() => { const ln = $('.lad .ln', el); spring(0, [.7, 1], v => ln.style.transform = `scaleX(${v})`, .002).set(0).to(1); $$('.lad .st', el).forEach((st, i) => setTimeout(() => { rise(st, 0, 14, [.4, .62]); SFX.tick(i); }, 120 + i * 90)); }, 1500);
    el._act = { fly: async () => { const r = fl.getBoundingClientRect(); store.set('ob', 1); closeAll(); UI.camHome(); const d = glowDot(c, 44); const p0 = { x: r.left + r.width / 2 - STAGE.x, y: r.top + r.height / 2 - STAGE.y }; SFX.rise();
      const so = {}; await spring(0, [.9, 1], p => { toScreen(UI.mYou.p || FF.bTop(0), so); const x = lerp(p0.x, so.x, p), y = lerp(p0.y, so.y, p) - Math.sin(p * Math.PI) * 140; d.style.transform = `translate(${x}px,${y}px) scale(${1 - .5 * p})`; }, .001).set(0).to(1);
      d.remove(); const yp = UI.mYou.p || FF.bTop(0); FF.burst([yp[0], yp[1] + 6, yp[2]], new THREE.Color(c), 18); SFX.land(); UI.toast(`Welcome to the ${SW[ME.sw].name} swarm`, 'glow-filled'); setTimeout(() => notify(NOTES[0]), 2600); } }; }

  /* ================= 2. bring art in from Firefly ================= */
  /* r04 s08: sample library (labelled SAMPLE until the real Firefly images replace them; PACK art is vector, not Firefly output) */
  const LIB = [['art-chai-galaxy', 'a chai glass that holds a tiny galaxy, steam shaped like stars'], ['art-square-one-night', 'Square One at night, every window warm, fireflies over the plaza'], ['art-picasso-night', 'the Picasso Block lit like a lantern, gold slats glowing'],
    ['art-turing-night', 'Turing Block as a tiny toy model under a night sky']].map(([k, prompt],i) => ({ k, prompt: CONCEPT_PROMPTS[i] }));
  function addImport() { const p1 = $('.pane.p1', UI.rel); if (!p1 || $('.ffimp', p1)) return; p1.insertAdjacentHTML('afterbegin', `<button class="btn pill ffimp" data-press><span class="ffl-s">Ff</span>Try a concept image</button>`); $('.ffimp', p1).addEventListener('click', importFF); }
  addImport();
  /* r04 s10: the hold pane, restyled in place (ui.js keeps the hold logic) */
  (function holdPane() { const p3 = $('.pane.p3', UI.rel); if (!p3) return; const mini = $('.mini', p3), sc = $('.spotc', mini);
    const mt = document.createElement('div'); mt.className = 'mt'; mt.append(sc); mt.insertAdjacentHTML('beforeend', '<small class="swn"></small>'); mini.append(mt);
    $('.holdwrap', p3).insertAdjacentHTML('beforebegin', '<h3 class="hx3">Hold to release</h3>'); $('.lbl', p3).textContent = 'let your light go'; $('.hb .ic', p3).innerHTML = PACK['icon-release'].replace(/#14102E/g, 'currentColor');
    const t = $('.release-title', UI.rel), sync = () => { const on = t.textContent === 'Release'; UI.rel.classList.toggle('r4p3', on); if (on) $('.swn', p3).textContent = SW[UI.R.sw].name + ' swarm'; };
    new MutationObserver(sync).observe(t, { childList: true, characterData: true, subtree: true }); sync(); })();
  function importFF() { let sel = null;
    const el = scene(`<div class="lib panel"><div class="grab0"></div>
      <div class="lib-h"><h2 class="hx s kt">Concept <em>library</em></h2><button class="sx-x" data-act="back" aria-label="Close">${ic('close')}</button></div>
      <div class="lib-g">${LIB.map((l, i) => `<button class="lt" data-press data-act="sel" data-i="${i}" aria-label="Sample image ${i + 1}"><span class="ai">${PACK[l.k]}</span><span class="smp">CONCEPT ART</span><span class="ck">${ic('check')}</span></button>`).join('')}</div>
      <div class="lib-pr panel">${ic('prompt')}<span class="ph">Pick a concept. Bring its creative brief.</span></div>
      <div class="sx-foot"><button class="btn pill amber big" data-press data-act="bring" disabled>Use this image${pic('bring-in')}</button></div></div>`, { mode: 'up', bg: 'dim', cls: 'r4' });
    $$('.lt', el).forEach((t, i) => setTimeout(() => { const a = $('.ai', t); spring(0, [.4, .65], v => { a.style.opacity = Math.min(1, v * 1.5); a.style.transform = `scale(${1.12 - .12 * v})`; }, .002).set(0).to(1); SFX.tick(i % 4); }, 380 + i * 35));
    const cks = $$('.lt .ck', el).map(c => spring(0, [.3, .5], v => c.style.transform = `scale(${Math.max(0, v)})`, .002));
    el._act = { sel: b => { const n = +b.dataset.i; if (n === sel) return; sel = n; $$('.lt', el).forEach((t, k) => t.classList.toggle('sel', k === sel)); cks.forEach((s, k) => s.to(k === sel ? 1 : 0));
        const pr = $('.lib-pr span', el); pr.classList.remove('ph'); pr.style.opacity = 0; setTimeout(() => { pr.textContent = LIB[sel].prompt; spring(0, [.3, 1], v => pr.style.opacity = v, .01).set(0).to(1); }, 90);
        $('[data-act=bring]', el).disabled = false; SFX.pop(sel); haptic(6); },
      bring: async () => { const L = LIB[sel], r0 = $$('.lt', el)[sel].getBoundingClientRect(); close(el); const up = $('.up', UI.rel), r1 = up.getBoundingClientRect();
        const sq = { left: r1.left + (r1.width - r1.height) / 2, top: r1.top, width: r1.height, height: r1.height };
        await flyGhost(PACK[L.k], r0, sq, { arc: 60, rot: -6 });
        UI.pickArt(packURL(L.k)); UI.R.sample = true; SFX.stamp(); haptic(10);
        const ta = $('textarea', UI.rel); await typeIn({ set textContent(v) { ta.value = v; }, get textContent() { return ta.value; } }, L.prompt, 38, v => { ta.value = v; ta.dispatchEvent(new Event('input')); });
        UI.toast('Image and prompt added', 'check'); } }; }

  /* ================= 3. the release: follow cam, letterbox, landing, "it's out" ================= */
  const rel0 = FF.release; let follow = null;
  FF.release = (d, s0, onLand) => { const mine = String(d.id).startsWith('me') && !TOUR.on; const f = rel0(d, s0, ff => { onLand && onLand(ff); if (mine) landed(ff); }); if (mine) startFollow(f); return f; };
  const lbT = document.createElement('div'), lbB = document.createElement('div'), cap = document.createElement('div'); lbT.className = 'lb lbt'; lbB.className = 'lb lbb'; cap.className = 'cap'; fx.append(lbT, lbB, cap);
  const lbS = spring(0, [.5, 1], v => { lbT.style.transform = `translateY(${-(1 - v) * 100}%)`; lbB.style.transform = `translateY(${(1 - v) * 100}%)`; cap.style.opacity = v; cap.style.transform = `translateX(-50%) translateY(${(1 - v) * 20}px)`; }, .002);
  function startFollow(f) { follow = { f, z0: camera.zoom }; UI.hideNav(true); cap.innerHTML = `<span class="chip">${ic('release')}Flying to ${UI.bname(f.d.b)}</span>`; lbS.to(1); SFX.rise(); }
  function landed(ff) { setTimeout(() => { lbS.to(0); follow = null; released(ff); }, 650); }
  /* r04 s12: the art settles, RELEASED stamps once, releases count up from zero; nothing else is invented */
  function released(ff) { const d = ff.d, mine = FF.list.filter(f => f.d.maker === ME).length || 1;
    const el = scene(`
      <h2 class="hx kt">Your firefly <em>is out.</em></h2>
      <div class="rs-art panel in"><div class="ai">${artFor(d)}</div><span class="stamp">RELEASED</span></div>
      <div class="rs2 in"><div class="panel"><b class="tk1">00</b><small>releases</small></div><div class="panel"><b>${SW[d.sw].name}</b><small>swarm</small></div></div>
      <div class="rs-9 in">${ic('clock')}9 PM: meet your people</div>
      <div class="sx-foot rs-foot"><button class="btn pill amber big" data-press data-act="see">Back to campus${pic('sky')}</button><button class="btn pill sh" data-press data-act="share" aria-label="Share">${pic('share')}</button></div>`, { mode: 'up', bg: 'night', sound: false, cls: 'r4 r4c' });
    const st = $('.stamp', el); st.style.opacity = 0;
    setTimeout(() => { st.style.opacity = 1; spring(0, [.3, 1], v => st.style.transform = `rotate(-12deg) scale(${lerp(1.5, 1, v)})`, .002).set(0).to(1); SFX.stamp(); haptic(20); }, 750);
    setTimeout(() => { const tk = $('.tk1', el); spring(0, [.6, 1], v => tk.textContent = String(Math.round(v)).padStart(2, '0'), .3).set(0).to(mine); }, 1050);
    const after = () => setTimeout(() => notify({ ico: 'glow-filled', av: DEMO.makers[1], title: 'Demo: someone glowed your firefly', sub: `${SW[DEMO.makers[1].sw].name} swarm · just now`, go: inbox, glow: d }), 2200);
    el._act = { see: () => { close(el); UI.camGo(ff.p, Math.max(camera.zoom, 4.6), 0); after(); },
      share: () => { const t = { title: 'Release the Firefly', text: `I released a firefly over ${UI.bname(d.b)}. Concept demonstration.` }; if (navigator.share) navigator.share(t).catch(() => {}); else UI.toast('Link copied', 'share'); } }; }

  /* ================= 4. notifications + inbox ================= */
  const NOTES = [
    { ico: 'meet', col: '#c8f560', title: 'Tonight\'s constellation is ready', sub: '4 makers · Square One · 9:15 PM', go: () => matchScene(), tm: '8:58 PM', unread: true },
    { ico: 'meet', col: '#c8f560', title: `You're #${CAMP.rank} on the board`, sub: `${CAMP.me.n} Glows · ${CAMP.left} days left`, go: () => CAMP.board(), tm: '8:30 PM', unread: true },
    { ico: 'glow-filled', col: '#ffc84a', av: DEMO.makers[6], title: 'Sample Glow notification', sub: 'Media swarm · over Turing Block', tm: '7:41 PM', unread: true },
    { ico: 'flag', col: '#ff8fb1', title: 'You reached Lantern', sub: 'Your glow-in-the-dark pin is waiting', go: () => levelUp(2), tm: 'Yesterday', unread: true },
    { ico: 'clock', col: '#8b7cf6', title: 'Swarm Night is on Friday', sub: 'Every firefly flashes with its swarm at 9 PM', go: () => swarmIntro(), tm: 'Mon' },
    { ico: 'glow-filled', col: '#ffc84a', av: DEMO.makers[11], title: 'Kiara glowed your firefly', sub: 'Health swarm · over Picasso Block', tm: 'Sun' }];
  const unread = () => NOTES.filter(n => n.unread).length;
  KIT['icon-bell'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14102E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 3v2"/></svg>`;
  app.insertAdjacentHTML('beforeend', `<button class="btn ib bell" data-press aria-label="Inbox" style="position:absolute;right:64px;top:16px;width:36px;height:36px;border-radius:11px;pointer-events:auto">${ic('bell')}<span class="bdg"></span></button>`);
  const bell = $('.bell', app); $('.ic', bell).style.cssText = 'width:20px;height:20px';
  const bdgS = spring(1, [.3, .45], v => $('.bdg', bell).style.setProperty('--b', v), .002);
  function badge() { $('.bdg', bell).textContent = unread() || ''; bdgS.set(.4).to(1); }
  badge(); bell.addEventListener('click', () => inbox());
  let ntEl = null;
  function notify(n) { if (TOUR.on) return; if (!NOTES.includes(n)) { n.unread = true; n.tm = 'Now'; NOTES.unshift(n); } badge(); if (ntEl) ntEl.remove();
    const gl = !!n.glow, el = document.createElement('div'); el.className = 'nt panel' + (gl ? ' r4n' : '');
    el.innerHTML = gl ? `${av4(n.av)}<span class="tx"><b>${n.title}</b><small>private · only counts up</small></span><span class="hrt">${heart('#E2384A')}</span>`
      : `${n.av ? av(n.av) : `<span class="ico" style="background:${n.col || '#ffc84a'}">${ic(n.ico)}</span>`}<span class="tx"><b>${n.title}</b><small>${n.sub}</small></span>`; fx.appendChild(el); ntEl = el;
    const s = spring(0, gl ? [.4, .8] : [.45, .7], v => el.style.transform = gl ? `translateY(${(1 - v) * -16}px)` : `translateY(${(1 - v) * -150}%)`, .002); if (gl) { el.style.opacity = 0; spring(0, [.25, 1], v => el.style.opacity = v, .01).set(0).to(1); } s.set(0).to(1); SFX.chime(); haptic(12);
    if (gl) { const h = $('.hrt', el); setTimeout(() => { pop(h, 0, [.3, .4]); SFX.pop(2); }, 250); }
    let y0 = null; el.addEventListener('pointerdown', e => y0 = e.clientY); el.addEventListener('pointerup', e => { if (y0 !== null && e.clientY - y0 < -20) { hide(); return; } y0 = null; hide(); n.unread = false; badge(); (n.go || inbox)(); });
    const hide = () => { clearTimeout(tm); if (gl) spring(1, [.25, 1], v => el.style.opacity = v, .01).to(0).then(() => el.remove()); else s.to(0).then(() => el.remove()); }, tm = setTimeout(hide, gl ? 4000 : 4200);
    if (n.glow) { ME.glows++; CAMP.addGlow(); n.glow.glows = (n.glow.glows || 0) + 1; hearts(el.getBoundingClientRect()); } }
  function hearts(r0) { const me = $('.tab[data-tab=me]', UI.nav).getBoundingClientRect(); UI.hideNav(false);
    for (let i = 0; i < 7; i++) { const h = document.createElement('div'); h.className = 'heart'; h.innerHTML = heart(i % 2 ? '#FF8FB1' : '#E2384A'); fx.appendChild(h);
      const x0 = r0.left + 30 + Math.random() * 40 - STAGE.x, y0 = r0.top + r0.height / 2 - STAGE.y, x1 = me.left + me.width / 2 - STAGE.x, y1 = me.top + me.height / 2 - STAGE.y, wob = (Math.random() - .5) * 160;
      setTimeout(() => spring(0, [.8 + Math.random() * .3, 1], p => { h.style.transform = `translate(${lerp(x0, x1, p) + Math.sin(p * Math.PI) * wob}px,${lerp(y0, y1, p * p)}px) scale(${1 - .4 * p})`; h.style.opacity = 1 - smooth(.85, 1, p); }, .002).set(0).to(1).then(() => { h.remove(); if (i === 6) { SFX.pop(3); const t = $('.tab[data-tab=me]', UI.nav); spring(0, [.3, .4], v => t.style.transform = `scale(${1 + .25 * Math.sin(v * Math.PI)})`, .002).set(0).to(1); let u = $('.udot', t); if (!u) { t.insertAdjacentHTML('beforeend', '<i class="udot"></i>'); u = $('.udot', t); t.addEventListener('click', () => u.remove(), { once: true }); } pop(u, 120, [.3, .45]); } }), 300 + i * 90); } }
  function inbox() { const el = scene(`
      <header class="sx-h"><button class="sx-x" data-act="back" aria-label="Back">${ic('back')}</button><b class="sx-title" style="margin-left:6px">Inbox</b><span class="sp"></span></header>
      <p class="lead in" style="margin:0 0 14px">Glows are private. Only you see who glowed your work.</p>
      <div class="ib-list">${NOTES.map((n, i) => `<button class="ib-it panel in" data-press data-act="open" data-i="${i}">${n.av ? `<span class="ico" style="background:${n.col || '#ffc84a'};padding:0;overflow:hidden">${KIT['avatar-' + n.av.av]}</span>` : `<span class="ico" style="background:${n.col}">${ic(n.ico)}</span>`}<span class="tx"><b>${n.title}</b><small>${n.sub}</small></span><span class="tm">${n.tm}</span>${n.unread ? '<i class="new"></i>' : ''}</button>`).join('')}</div>`, { mode: 'push', bg: 'night' });
    el._act = { open: b => { const n = NOTES[+b.dataset.i]; n.unread = false; badge(); $('.new', b)?.remove(); if (n.go) n.go(); else { const f = FF.list.find(f => f.d.maker === ME); if (f) { closeAll(); UI.camGo(f.p, 4.6); setTimeout(() => UI.openCard(f), 500); } } } }; }

  /* ================= 5. Meet hub: the 9 PM countdown ================= */
  let hub = null, joined = false;
  function next9() { const n = new Date(), t = new Date(n); t.setHours(21, 0, 0, 0); if (t <= n) t.setDate(t.getDate() + 1); return t; }
  const two = v => String(v).padStart(2, '0');
  function meetHub() { if (hub && stack.includes(hub)) return; UI.closeCard(); UI.hideTag();
    const others = DEMO.meets.slice(1), online = 37 + FF.list.length % 20;
    const pts = [[[40, 40], [70, 28], [95, 52], [62, 70]], [[150, 30], [185, 48], [168, 80]], [[230, 60], [262, 34], [300, 54], [282, 90], [244, 96]], [[330, 30], [360, 64], [390, 38]]];
    const el = hub = scene(`
      <header class="sx-h"><b class="sx-title">Meet</b><span class="sp"></span><span class="chip live"><i class="ldot"></i>${online} makers online</span></header>
      <div class="mh-hero panel in">
        <div class="mh-ring"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="84" fill="none" stroke="#14102E" stroke-opacity=".12" stroke-width="10"/><circle class="arc" cx="95" cy="95" r="84" fill="none" stroke="#E2384A" stroke-width="10" stroke-linecap="round" transform="rotate(-90 95 95)" stroke-dasharray="527.8" stroke-dashoffset="527.8"/>
          <g class="orbs" style="transform-origin:95px 95px;animation:spinr 40s linear infinite">${SW.map((s, i) => { const t = i / SW.length * 6.283 + .5; return `<circle cx="${95 + Math.cos(t) * 84}" cy="${95 + Math.sin(t) * 84}" r="7" fill="${s.col}" stroke="#14102E" stroke-width="2.5"/>`; }).join('')}</g></svg>
          <div class="mh-c"><small>${joined ? 'You\'re in' : 'Next match in'}</small><b class="cd">--:--:--</b><span>${joined ? 'Square One · 9:15 PM' : 'Tonight at 9:00 PM'}</span></div></div>
        <p>Every night at 9 we group 3 to 5 makers from different schools, and give you a public spot and a time. It's opt-in, and you can leave anytime.</p>
        <button class="btn pill amber" data-press data-act="reveal">${ic('meet')}${joined ? 'See my constellation' : 'Reveal tonight\'s constellation'}</button></div>
      <div class="in" style="margin-top:16px">${CAMP.rankCard()}</div>
      <div class="sx-sub in">How it works</div>
      <div class="mh-how">${[['Release your work', 'Make in Firefly, release it on the map.'], ['Get matched at 9', '3 to 5 people, different schools.'], ['Meet and make', 'One piece together becomes a star.']].map((h, i) => `<div class="panel in"><span class="n">${i + 1}</span><b>${h[0]}</b><small>${h[1]}</small></div>`).join('')}</div>
      <div class="sx-sub in">Last night's stars</div>
      <div class="navywin mh-sky in"><svg viewBox="0 0 420 120">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 420}" cy="${(i * 53) % 120}" r="${.6 + (i % 3) * .4}" fill="#fff" opacity=".5"/>`).join('')}
        ${pts.map((c, k) => `<g class="cst" style="opacity:0">${c.map((p, i) => i ? `<line x1="${c[i - 1][0]}" y1="${c[i - 1][1]}" x2="${p[0]}" y2="${p[1]}" stroke="#fff4de" stroke-opacity=".6" stroke-width="1.5"/>` : '').join('')}${c.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${SW[(k * 2 + p[0]) % 6].col}"/>`).join('')}<text x="${c[0][0] - 6}" y="${Math.max(...c.map(p => p[1])) + 18}" fill="#cfc9f2" font-family="Archivo" font-weight="700" font-size="10">${['Chai at Midnight', 'The Inkwells', 'Five Lanterns', 'North Gate'][k]}</text></g>`).join('')}</svg></div>
      <div class="sx-sub in">Other constellations tonight</div>
      ${others.map(m => `<div class="panel mh-row in"><div class="avs">${m.people.slice(0, 4).map(av).join('')}</div><span class="tx"><b>${m.spot}</b><small>${m.people.length} makers · ${new Set(m.people.map(p => p.sw)).size} schools</small></span><span class="chip">${ic('clock')}${m.time}</span></div>`).join('')}
      <div class="mh-pad"></div>`, { mode: 'fade', bg: 'night', under: true, keepNav: true, onClose: () => { hub = null; } });
    const T = next9(), arc = $('.arc', el), cd = $('.cd', el);
    spring(0, [1.2, 1], v => arc.setAttribute('stroke-dashoffset', 527.8 * (1 - v)), .001).set(0).to(1 - (T - Date.now()) / 864e5);
    const tick = () => { if (!el.isConnected) return; const s = Math.max(0, Math.round((T - Date.now()) / 1000)); cd.textContent = `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`; setTimeout(tick, 1000); }; tick();
    setTimeout(() => $$('.cst', el).forEach((g, i) => setTimeout(() => spring(0, [.6, 1], v => g.style.opacity = v, .002).set(0).to(1), i * 260)), 900);
    el._act = { reveal: () => joined ? spotScene(true) : matchScene(), board: () => CAMP.board() }; }
  document.addEventListener('ryf:navigate', e => { if (e.detail !== 'meet' && hub) close(hub); });

  /* ================= 6. matching: fireflies from every swarm swirl, four are picked, the constellation draws ================= */
  function matchScene() { const ppl = M0.people, nS = new Set(ppl.map(p => p.sw)).size;
    const el = scene(`
      <button class="sx-x" data-act="back" aria-label="Back" style="align-self:flex-start">${ic('back')}</button>
      <div class="ct-top"><h2 class="hx m kt">Finding <em>your people</em></h2><p class="sb msg" style="min-height:21px"></p></div>
      <div class="ct-win navywin in"><canvas class="mt-cv"></canvas><svg class="ct-ln"></svg><div class="ct-g"></div></div>
      <div class="ct-chips"><span>${ppl.length} makers</span><span>${nS} schools</span><span class="on">1 public spot</span></div>
      <p class="ct-brief"><small>tonight's brief</small>make a tiny universe from your campus</p>
      <div class="sx-foot" style="opacity:0;padding-top:16px"><button class="btn pill violet big" data-press data-act="where">Where and when${pic('pin')}</button></div>`, { mode: 'fade', bg: 'night', cls: 'r4 match' });
    const cv = $('.mt-cv', el), g = cv.getContext('2d'), col = $('.ct-win', el), grid = $('.ct-g', el);
    grid.innerHTML = ppl.map(p => `<div class="ct-c panel" style="--c:${SW[p.sw].col}">${av4(p)}<i></i><b>${p.isMe ? 'You' : first(p.name)}</b><small>${SW[p.sw].name}</small></div>`).join('');
    const sz = () => { const r = { width: col.clientWidth, height: col.clientHeight }, dpr = Math.min(2, devicePixelRatio); cv.width = r.width * dpr; cv.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); return r; };
    let R = sz(); const W = () => R.width, H = () => R.height;
    const cards = $$('.ct-c', grid), cen = () => { const o = col.getBoundingClientRect(); return cards.map(c => { const r = c.getBoundingClientRect(); return [r.left - o.left + 32, r.top - o.top + 32]; }); };
    const P = Array.from({ length: 84 }, (_, i) => ({ sw: i % 6, a: Math.random() * 6.28, r: .12 + Math.random() * .36, sp: (.3 + Math.random() * .5) * (i % 2 ? 1 : -1), x: 0, y: 0, al: 1, pick: -1, tw: Math.random() * 6 }));
    ppl.forEach((p, k) => { const c = P.find(q => q.sw === p.sw && q.pick < 0); c.pick = k; });
    let phase = 0, t = 0, raf; const msgs = ['mixing six schools', 'checking who is free at 9', 'picking a public spot'];
    const msg = $('.msg', el); msgs.forEach((m, i) => setTimeout(() => { if (el.isConnected && !phase) { msg.textContent = m; SFX.tick(i); } }, 300 + i * 850));
    function draw() { if (!el.isConnected) return; t += 1 / 60; g.clearRect(0, 0, W(), H()); const cx = W() / 2, cy = H() * .5, N = phase ? cen() : null;
      for (const p of P) { p.a += p.sp * (phase ? .4 : 1) / 60 * (1 + 1.5 * Math.max(0, 1 - t / 2.5)); const mm = Math.min(W(), H()), ox = cx + Math.cos(p.a) * p.r * mm * 1.05, oy = cy + Math.sin(p.a) * p.r * mm * .9;
        if (phase && p.pick >= 0) { const [nx, ny] = N[p.pick]; p.x = lerp(p.x, nx, .08); p.y = lerp(p.y, ny, .08); } else { p.x = lerp(p.x || cx, ox, .12); p.y = lerp(p.y || cy, oy, .12); if (phase) p.al = Math.max(.12, p.al - .02); }
        const c = SW[p.sw].col, big = phase && p.pick >= 0, rr = big ? 9 : 2.6 + Math.sin(t * 3 + p.tw) * .8;
        g.globalAlpha = p.al * (big ? 1 : .9); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 4); gr.addColorStop(0, c); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, rr * 4, 0, 6.29); g.fill();
        g.globalAlpha = p.al; g.fillStyle = big ? c : '#fff4de'; g.beginPath(); g.arc(p.x, p.y, big ? rr : rr * .5, 0, 6.29); g.fill(); }
      g.globalAlpha = 1; raf = requestAnimationFrame(draw); }
    draw();
    setTimeout(async () => { if (!el.isConnected) return; phase = 1; SFX.rise(); msg.textContent = ''; await wait(700); if (!el.isConnected) return; SFX.chime();
      const top = $('.ct-top', el); top.innerHTML = `<h2 class="hx m kt">You're in <em>The Night Owls.</em></h2>`; reveal(top);
      /* cards rise one every 60 ms; avatars light up in their school colour */
      cards.forEach((c, k) => setTimeout(() => { spring(0, [.42, .7], v => { c.style.opacity = Math.min(1, v * 1.6); c.style.transform = `translateY(${(1 - v) * 12}px)`; }, .002).set(0).to(1); const a = $('.av', c); spring(0, [.5, .6], v => a.style.boxShadow = `0 0 0 ${v * 5}px ${SW[ppl[k].sw].col}`, .01).set(0).to(1); SFX.pop(k); haptic(6); }, 450 + k * 60));
      /* the constellation lines trace between the cards: across each row, then the X through the middle */
      setTimeout(() => { const o = col.getBoundingClientRect(), r = cards.map(c => c.getBoundingClientRect()), L = []; const mid = q => [q.left - o.left + q.width / 2, q.top - o.top + q.height / 2];
        for (let i = 0; i + 1 < r.length; i += 2) L.push([[r[i].right - o.left, mid(r[i])[1]], [r[i + 1].left - o.left, mid(r[i + 1])[1]]]);
        if (r.length >= 4) { L.push([[r[0].right - o.left, r[0].bottom - o.top], [r[3].left - o.left, r[3].top - o.top]]); L.push([[r[1].left - o.left, r[1].bottom - o.top], [r[2].right - o.left, r[2].top - o.top]]); }
        if (r.length === 3) L.push([[mid(r[0])[0], r[0].bottom - o.top], [r[2].left - o.left + 30, r[2].top - o.top]]);
        const sv = $('.ct-ln', el); sv.innerHTML = L.map(([a, b]) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#8B7CF6" stroke-width="4" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>`; }).join('');
        $$('line', sv).forEach((l, i) => setTimeout(() => { const len = +l.getAttribute('stroke-dasharray'); spring(len, [.45, 1], v => l.setAttribute('stroke-dashoffset', v), .3).to(0); SFX.tick(i); }, i * 140)); }, 450 + cards.length * 60 + 250);
      setTimeout(() => { [$('.ct-chips', el), $('.ct-brief', el), $('.sx-foot', el)].forEach((x, i) => rise(x, i * 110, 16, [.45, .8])); }, 1300 + cards.length * 60);
    }, 3000);
    el._act = { where: () => spotScene(), back: () => { cancelAnimationFrame(raf); close(el); } }; }

  /* ================= 7. the spot: camera flies there, the walking route draws, slide to join ================= */
  let route = null, who = [];
  function spotScene(already) { const m = M0, p = FF.at(m.at); closeAll(); UI.go('sky'); UI.setTab('meet');
    setTimeout(() => { UI.camGo(p, 4.4, STAGE.h * .2); UI.mMeet.show([p[0], p[1], p[2]]);
      const form = m.people.map(pp => pp.isMe ? (DEMO.mine[0] && DEMO.mine[0].ff) : FF.list.find(f => f.d.maker === pp)).filter(Boolean); FF.formation(form, p, true); route = mkRoute(UI.mYou.p, p);
      const el = scene(`
        <button class="sx-x tl" data-act="back" aria-label="Back">${ic('back')}</button>
        <div class="sp4 panel in"><div class="grab0"></div><div class="ss-body">
          <h2 class="hx kt">${m.spot}</h2>
          <div class="sp4-m"><span>${pic('clock')}${m.time}</span><span>${pic('walk')}4 min walk</span></div>
          <div class="sp4-w"><span class="avs">${m.people.filter(pp => !pp.isMe).map(av4).join('')}</span>The Night Owls</div>
          ${already ? joinedHTML() : `<div class="slide"><i class="fill"></i><b role="button" tabindex="0" aria-label="Join">Slide to join</b><span class="end">${ic('check')}</span><span class="kn">${ic('next')}</span></div>`}</div></div>`, { mode: 'up', bg: 'clear', cls: 'r4', onClose: () => { route = null; UI.mMeet.hide(); FF.formation(form, null, false); clearWho(); } });
      el._act = { back: () => { close(el); UI.setTab('sky'); UI.camHome(); }, cal: () => UI.toast('Added to your calendar', 'clock'), skip: () => checkin(el) };
      if (!already) slider(el); }, 160); }
  const joinedHTML = () => `<div class="ckrow"><span class="chip" style="background:var(--lime)">${ic('check')}You're in</span><span class="chip">${ic('meet')}3 others confirmed</span></div><div class="sx-foot"><button class="btn pill" data-press data-act="cal">${ic('clock')}Calendar</button><button class="btn pill amber" data-press data-act="skip">${ic('next')}Skip to 9:15</button></div>`;
  function slider(el) { const sl = $('.slide', el), kn = $('.kn', sl), fill = $('.fill', sl); let x0 = null, max = 0, done = false;
    const ks = spring(0, [.4, .7], v => { kn.style.transform = `translateX(${v}px)`; fill.style.width = (v + 50) + 'px'; }, .1);
    kn.addEventListener('pointerdown', e => { if (done) return; x0 = e.clientX - ks.x; max = sl.clientWidth - 106; kn.setPointerCapture(e.pointerId); haptic(4); });
    kn.addEventListener('pointermove', e => { if (x0 === null) return; const v = clamp(e.clientX - x0, 0, max); ks.set(v); if (Math.floor(v / max * 4) !== kn._q) { kn._q = Math.floor(v / max * 4); SFX.tick(kn._q); } });
    kn.addEventListener('pointerup', () => { if (x0 === null) return; x0 = null; if (ks.x > max * .82) { done = true; ks.to(max); join(el); } else ks.to(0); });
    el._join = () => { if (done) return; done = true; max = sl.clientWidth - 106; ks.to(max).then(() => join(el)); };
    const lb = $('b', sl); lb.addEventListener('click', () => el._join()); lb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el._join(); } }); }
  function join(el) { joined = true; SFX.success(); haptic(24); const b = $('.slide b', el); b.textContent = 'You\'re in'; $('.slide', el).classList.add('ok'); pop($('.slide .end', el), 0, [.3, .45]); CAMP.addConn(M0.people.length - 1); confetti($('.slide', el).getBoundingClientRect());
    const p = FF.at(M0.at); FF.burst([p[0], p[1] + 26, p[2]], new THREE.Color('#c8f560'), 18);
    setTimeout(() => { const body = $('.ss-body', el), sl = $('.slide', el); spring(1, [.4, 1], v => { sl.style.opacity = v; sl.style.transform = `scale(${.9 + .1 * v})`; }, .002).to(0).then(() => { sl.outerHTML = joinedHTML(); $$('.ckrow .chip, .sx-foot .btn', body).forEach((c, i) => pop(c, i * 80, [.4, .6])); }); }, 900); }
  function mkRoute(a, b) { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'route'); sv.innerHTML = `<path d="" fill="none" stroke="#05061A" stroke-width="9" stroke-linecap="round" opacity=".5"/><path class="rt" d="" fill="none" stroke="#c8f560" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 12"/>`; mapfx.appendChild(sv);
    const wk = document.createElement('div'); wk.className = 'walker'; mapfx.appendChild(wk);
    const m = [(a[0] + b[0]) / 2 + (b[2] - a[2]) * .25, 2, (a[2] + b[2]) / 2 - (b[0] - a[0]) * .25], pts = []; for (let i = 0; i <= 36; i++) { const t = i / 36, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], 2, u * u * a[2] + 2 * u * t * m[2] + t * t * b[2]]); }
    const r = { sv, wk, pts, k: 0, t: 0, kill() { sv.remove(); wk.remove(); } }; return r; }
  function stepRoute(dt) { if (!route) { $$('.route,.walker', mapfx).forEach(x => x.remove()); return; } const so = {}, r = route; r.k = Math.min(1, r.k + dt * .7); r.t = (r.t + dt * .22) % 1; const n = Math.max(2, Math.round(r.pts.length * r.k));
    let d = ''; for (let i = 0; i < n; i++) { toScreen(r.pts[i], so); d += (i ? 'L' : 'M') + so.x.toFixed(1) + ' ' + so.y.toFixed(1); } r.sv.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
    $('.rt', r.sv).style.strokeDashoffset = -performance.now() / 40; const q = r.pts[Math.floor(r.t * (r.pts.length - 1) * r.k)]; toScreen(q, so); r.wk.style.transform = `translate(${so.x}px,${so.y}px)`; }

  /* ================= 8. check-in at 9:15: everyone arrives on the map ================= */
  function clearWho() { who.forEach(w => w.el.remove()); who = []; }
  async function checkin(el) { route = null; const p = FF.at(M0.at); UI.camGo(p, 6, STAGE.h * .18); clearWho();
    const body = $('.ss-body', el); body.innerHTML = `<div class="ss-top"><span class="ss-pin">${KIT['marker-meet']}</span><div><b>It's 9:15 at Square One</b><small class="ckmsg">Waiting for everyone…</small></div></div><div class="ckrow"></div>
      <div class="sx-foot" style="opacity:0"><button class="btn pill amber" data-press data-act="make">${ic('sketch')}Make one piece together</button></div>`;
    el._act.make = () => joint(); reveal(body); SFX.chime();
    const ppl = [...M0.people].sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0)); const row = $('.ckrow', body), msg = $('.ckmsg', body);
    for (let k = 0; k < ppl.length; k++) { await wait(k ? 850 : 500); if (!el.isConnected) return; const pp = ppl[k], a = (k / ppl.length) * 6.28 + .6;
      const d = document.createElement('div'); d.className = 'who-a'; mapfx.appendChild(d); d.innerHTML = `<div class="bub" style="border-color:${SW[pp.sw].col};box-shadow:0 0 0 3px #14102E,3px 3px 0 3px #05061A">${KIT['avatar-' + pp.av]}</div><span class="nm">${pp.isMe ? 'You' : first(pp.name)}</span>`;
      who.push({ el: d, p: [p[0] + Math.cos(a) * 62, p[1] + 4, p[2] + Math.sin(a) * 62] }); pop($('.bub', d), 0, [.35, .5]); SFX.pop(k); haptic(8);
      FF.burst([p[0] + Math.cos(a) * 16, p[1] + 10, p[2] + Math.sin(a) * 16], new THREE.Color(SW[pp.sw].col), 10);
      row.insertAdjacentHTML('beforeend', `<span class="chip"><i class="dot" style="background:${SW[pp.sw].col}"></i>${pp.isMe ? 'You\'re here' : first(pp.name) + ' is here'}</span>`); pop(row.lastChild, 0, [.4, .6]);
      msg.textContent = k < ppl.length - 1 ? `${k + 1} of ${ppl.length} here` : 'Everyone is here'; }
    SFX.success(); confetti(row.getBoundingClientRect()); const f = $('.sx-foot', body); spring(0, [.45, .7], v => { f.style.opacity = v; f.style.transform = `translateY(${(1 - v) * 20}px)`; }, .002).set(0).to(1); }

  /* ================= 9. make one piece together → it becomes a star ================= */
  function joint() { const ppl = M0.people, lines = ['a chai stall', 'at the edge of space,', 'lit by four lanterns,', 'risograph poster, three inks'];
    const el = scene(`
      <header class="sx-h"><button class="sx-x" data-act="back" aria-label="Back">${ic('back')}</button><span class="sp"></span><span class="chip dark">${ic('meet')}The Night Owls</span></header>
      <h2 class="kt tc" style="margin-top:0">One piece, <em>four hands.</em></h2>
      <div class="jt-board panel in">${ppl.map((p, i) => `<div class="jt-t" style="left:${(i % 2) * 50}%;top:${Math.floor(i / 2) * 50}%"><div class="in2">${PACK[['art-chai-galaxy', 'art-square-one-night', 'art-turing-night', 'art-creeper-walk', 'art-picasso-night'][i % 5]]}<span class="av">${KIT['avatar-' + p.av]}</span></div></div>`).join('')}
        <div class="jt-final">${PACK['art-constellation-study']}<div class="ttl">The Night Owls · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div></div><div class="jt-flash"></div></div>
      <div class="jt-chain panel in"><b>Prompt chain · each person adds a line</b><ol>${ppl.map(p => `<li>${av(p)}<b>${p.isMe ? 'You' : first(p.name)}:</b><span class="ln"></span></li>`).join('')}</ol></div>
      <div class="sx-foot"><button class="btn pill amber" data-press data-act="gen" disabled><span class="ffl-s" style="border-color:var(--ink)">Ff</span>Generate in Firefly</button></div>`, { mode: 'push', bg: 'deep' });
    (async () => { await wait(700); const ls = $$('.jt-chain .ln', el); for (let i = 0; i < ls.length; i++) { if (!el.isConnected) return; await typeIn(ls[i], lines[i], 34); await wait(180); } $('[data-act=gen]', el).disabled = false; pop($('[data-act=gen]', el), 0, [.35, .6]); })();
    el._act = { gen: async b => { b.disabled = true; const ts = $$('.jt-t', el), fin = $('.jt-final', el), fl = $('.jt-flash', el); SFX.rise();
      ts.forEach((t, i) => spring(0, [.7, .8], v => { const dx = (i % 2 ? -1 : 1) * 25 * v, dy = (i < 2 ? 1 : -1) * 25 * v; t.style.transform = `translate(${dx}%,${dy}%) scale(${1 - .3 * v}) rotate(${v * (i % 2 ? 8 : -8)}deg)`; }, .002).set(0).to(1));
      await wait(800); SFX.land(); haptic(24); spring(0, [.25, 1], v => fl.style.opacity = v, .01).set(0).to(1).then(() => { ts.forEach(t => t.style.opacity = 0); fin.style.opacity = 1; spring(1, [.6, 1], v => fl.style.opacity = v, .01).to(0); });
      await wait(500); confetti($('.jt-board', el).getBoundingClientRect()); b.innerHTML = `${ic('glow-filled')}Light it up`; b.dataset.act = 'star'; b.disabled = false; pop(b, 0, [.35, .55]); },
      star: () => star($('.jt-board', el).getBoundingClientRect()) }; }
  function star(r0) {
    const el = scene(`<header class="sx-h"><span class="sx-step">The Night Owls · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span class="sp"></span></header>
      <div class="st-win navywin in"><canvas class="st-sky"></canvas></div>
      <div class="st-txt"><h2 class="kt">Your constellation <em>is now a star.</em></h2><p class="lead in">Everyone on the campus map can see it tonight. Tomorrow at 9, new people, new stars.</p>
      <div class="sx-foot"><button class="btn pill amber" data-press data-act="home">${ic('sky')}Back to campus</button></div></div>`, { mode: 'fade', bg: 'deep' });
    const cv = $('.st-sky', el), g = cv.getContext('2d'), col = $('.st-win', el); const R = { width: col.clientWidth, height: col.clientHeight }, dpr = Math.min(2, devicePixelRatio); cv.width = R.width * dpr; cv.height = R.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = R.width, H = R.height, S = Array.from({ length: 140 }, () => [Math.random() * W, Math.random() * H, Math.random() * 1.4 + .3, Math.random() * 6]);
    const old = [[[.12, .14], [.2, .1], [.26, .18]], [[.7, .1], [.78, .16], [.86, .08], [.9, .2]], [[.1, .42], [.18, .5], [.12, .58]], [[.82, .44], [.9, .52], [.8, .6]]];
    const nw = [[.36, .34], [.58, .26], [.66, .5], [.42, .58]], c = [W * .505, H * .42]; let k = 0, burst = 0, t = 0;
    const lb = document.createElement('div'); lb.className = 'st-lbl chip dark'; lb.innerHTML = `${ic('glow-filled')}The Night Owls`; col.appendChild(lb); lb.style.left = c[0] + 'px'; lb.style.top = (H * .7) + 'px';
    (function draw() { if (!el.isConnected) return; t += 1 / 60; g.clearRect(0, 0, W, H);
      for (const s of S) { g.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * .8 + s[3])); g.fillStyle = '#fff4de'; g.beginPath(); g.arc(s[0], s[1], s[2], 0, 6.29); g.fill(); }
      g.globalAlpha = .55; g.strokeStyle = '#a9a3d6'; g.lineWidth = 1.2; for (const o of old) { g.beginPath(); o.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.stroke(); o.forEach(([x, y]) => { g.fillStyle = '#fff4de'; g.beginPath(); g.arc(x * W, y * H, 2.5, 0, 6.29); g.fill(); }); }
      if (k > 0) { g.globalAlpha = 1; g.strokeStyle = '#ffc84a'; g.lineWidth = 2.5; g.beginPath(); const n = nw.length; for (let i = 0; i <= n; i++) { const kk = clamp(k * n - i + 1, 0, 1); if (!kk) break; const [x, y] = nw[i % n]; if (!i) g.moveTo(x * W, y * H); else { const [px, py] = nw[(i - 1) % n]; g.lineTo(lerp(px, x, kk) * W, lerp(py, y, kk) * H); } } g.stroke();
        nw.forEach(([x, y], i) => { const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, 16); gr.addColorStop(0, SW[M0.people[i].sw].col); gr.addColorStop(1, '#0000'); g.fillStyle = gr; g.beginPath(); g.arc(x * W, y * H, 16, 0, 6.29); g.fill(); g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(x * W, y * H, 3.5, 0, 6.29); g.fill(); }); }
      if (burst > 0) { g.globalAlpha = burst; g.strokeStyle = '#ffc84a'; g.lineWidth = 3; g.beginPath(); g.arc(c[0], c[1], (1 - burst) * 140, 0, 6.29); g.stroke(); burst = Math.max(0, burst - .02); }
      g.globalAlpha = 1; requestAnimationFrame(draw); })();
    const fin = PACK['art-constellation-study'];
    setTimeout(async () => { const wr = col.getBoundingClientRect(), r1 = { left: c[0] + wr.left - 6, top: c[1] + wr.top - 6, width: 12, height: 12 }; SFX.rise(); await flyGhost(fin, r0, r1, { arc: 80, br: 18, fade: true, k: [1.1, 1] }); burst = 1; SFX.land(); haptic(28); spring(0, [1.6, 1], v => k = v, .001).set(0).to(1);
      for (let i = 0; i < 4; i++) setTimeout(() => SFX.tick(i), i * 380); setTimeout(() => { pop(lb, 0, [.4, .6]); SFX.chime(); }, 1700); }, 250);
    el._act = { home: () => { closeAll(); UI.go('sky'); setTimeout(() => notify({ ico: 'flag', col: '#ff8fb1', title: 'You earned the Night Owls star', sub: 'It shows on your profile now', go: () => levelUp(2) }), 1600); } }; }

  /* ================= 10. level up ================= */
  function levelUp(l = ME.lvl) {
    const el = scene(`<header class="sx-h"><button class="sx-x" data-act="back" aria-label="Back">${ic('close')}</button><span class="sp"></span></header>
      <div class="lv-stage"><div class="lv-rays"></div><div class="lv-badge">${KIT[BADGE[l]]}</div></div>
      <h2 class="kt tc">You're a <em>${LV[l]}.</em></h2><p class="lead in tc"><b class="gc">0</b> Glows from people across ${SW.length} schools.</p>
      <div class="lv-rew panel in"><span class="ico">${ic('flag')}</span><span><b>Unlocked: ${REWARD[l]}</b><small>${l === 2 ? 'Collect it at the Design office, or at Swarm Night on Friday.' : 'We will tell you when it is ready.'}</small></span></div>
      ${l < 3 ? `<div class="lv-next in">Next: ${LV[l + 1]} at 200 Glows<div class="prog"><i></i></div></div>` : ''}
      <div class="sx-foot"><button class="btn pill amber" data-press data-act="back">${ic('check')}Nice</button></div>`, { mode: 'fade', bg: 'deep' });
    const bd = $('.lv-badge', el); bd.style.transform = 'scale(0)'; setTimeout(() => { SFX.land(); haptic(30); spring(0, [.45, .45], v => bd.style.transform = `scale(${v}) rotate(${(1 - v) * -30}deg)`, .002).set(0).to(1); confetti(bd.getBoundingClientRect()); }, 350);
    setTimeout(() => { ticker($('.gc', el), ME.glows, 1.2); const pr = $('.prog i', el); pr && spring(0, [1, 1], v => pr.style.width = v * 100 + '%', .001).set(0).to(Math.min(1, ME.glows / 200)); SFX.success(); }, 800); }

  /* ================= 11. Swarm Night: a title card before every firefly syncs ================= */
  const sn0 = UI.swarmNight;
  function swarmIntro() { closeAll(true);
    const el = scene(`<div class="sn-big"><span class="sx-step">Friday · 9:00 PM · All six swarms</span><div class="kt" style="margin-top:14px">Swarm</div><div class="kt nb">Night</div><p class="lead in" style="margin-top:16px">Every firefly on campus flashes in time with its swarm.</p><div class="sn-cd">3</div></div>`, { mode: 'fade', bg: 'deep' });
    const cd = $('.sn-cd', el); let n = 3; pop(cd, 400, [.35, .5]); SFX.tick(0);
    const iv = setInterval(() => { n--; if (n > 0) { cd.textContent = n; pop(cd, 0, [.3, .5]); SFX.tick(3 - n); haptic(8); } else { clearInterval(iv); close(el); sn0(true); SFX.success(); } }, 800); }
  UI.swarmNight = on => { if ((on === undefined ? !UI.isNight() : on) && !TOUR.on) swarmIntro(); else sn0(on); };

  /* ---------- per frame ---------- */
  function frame(t, dt) {
    if (follow && follow.f.mode === 'flight') { const f = follow.f, tg = controls.target, k = 1 - Math.exp(-dt * 4); const d = new THREE.Vector3((f.p[0] - tg.x) * k, 0, (f.p[2] - tg.z) * k); tg.add(d); camera.position.add(d);
      const zt = Math.max(follow.z0, HOMEZ * 1.7); camera.zoom = lerp(camera.zoom, zt, 1 - Math.exp(-dt * 1.5)); camera.updateProjectionMatrix(); }
    stepRoute(dt); const so = {}; who.forEach(w => { toScreen(w.p, so); w.el.style.transform = `translate(${so.x}px,${so.y}px)`; }); }

  return { firstRun, onboard, swarmPick, born, meetHub, matchScene, spotScene, checkin, joint, star, inbox, levelUp, swarmIntro, importFF, notify, released, frame, closeAll, scene, get stack() { return stack; }, SFX };
})();
window.STORY = STORY; window.UI = UI;
/* Gesture hints and compact map controls. Navigation happens directly on the campus. */
const GESTURES = (()=>{
 const app=UI.app;
 document.head.insertAdjacentHTML('beforeend',`<style>
 .map-help{position:absolute;left:50%;top:calc(132px + env(safe-area-inset-top,0px));transform:translateX(-50%);white-space:nowrap;color:#fff4de;font:600 11px/1.4 var(--ui);pointer-events:none;background:#05061acc;padding:8px 12px;border-radius:999px;transition:opacity .35s ease-out}
 .map-help.used{opacity:0}.mapctl .turns{display:flex}.mapctl .turns button+button{border-top:0;border-left:2px solid var(--ink)}.mapctl .hm{font-size:10px!important;font-weight:800!important;display:flex;flex-direction:column;gap:1px}.mapctl .hm .ic{width:19px;height:19px}
 html.rec .map-help,html.touring .map-help,.sheeton .map-help{display:none!important}
 @media(max-width:700px){.mapctl button{width:44px;height:44px}.mapctl{right:12px;bottom:128px;gap:6px}.mapctl .cmp{display:none}.mapctl .turns button{width:36px}.mapctl .hm{width:100%}.clockchip{display:none}.backchip{top:calc(151px + env(safe-area-inset-top,0px));left:auto;right:16px;transform:none}}
 @media(min-width:701px){.map-help{display:none}}
 @media(prefers-reduced-motion:reduce){.map-help{transition:none}}
 </style>`);
 const help=document.createElement('div');help.className='map-help';help.textContent='Drag to move · pinch to zoom';app.appendChild(help);
 canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')help.classList.add('used');},{passive:true});
 const mc=app.querySelector('.mapctl'),home=mc.querySelector('.hm');home.setAttribute('aria-label','Reset campus view');home.insertAdjacentHTML('beforeend','<span>Reset</span>');
 const turns=document.createElement('div');turns.className='grp turns';turns.innerHTML='<button type="button" aria-label="Turn campus left">↶</button><button type="button" aria-label="Turn campus right">↷</button>';mc.appendChild(turns);
 [...turns.children].forEach((b,i)=>b.onclick=()=>THEME.flyTo({th:THEME.heading+(i?1:-1)*Math.PI/4},.45));
 canvas.setAttribute('aria-label','Chitkara campus. Drag to move and pinch to zoom. Tap a firefly to view the work or tap a building to look closer.');
 return {};
})();

/* ================= tour: a scripted ~34 s run for screen recording =================
   #tour (or T) starts it · Space pauses · 1–5 jump to a beat · F hides the finger · Esc stops
   #rec=916 / #rec=169 lock the frame to 9:16 / 16:9 · #once plays it a single time · #nointro skips the logo */
const TOUR = (() => {
  const fing = UI.app.querySelector('.finger');
  const FX = spring(0, 'glide', null, .1), FY = spring(0, 'glide', null, .1), FO = spring(0, 'base', null, .002), FP = spring(0, 'snap', null, .002), RIP = spring(0, [.5, 1], null, .002);
  let showFinger = !QS.has('nofinger');
  const rectC = el => { const r = (typeof el === 'string' ? UI.app.querySelector(el) : el).getBoundingClientRect(); return [r.left + r.width / 2 - STAGE.x, r.top + r.height / 2 - STAGE.y]; };
  const scr = p => { const o = toScreen(p); return [o.x, o.y]; };
  function fingerTo(xy, appear) { if (!xy) return; if (appear || FO.t === 0) { FX.set(xy[0] + 40); FY.set(xy[1] + 90); } FX.to(xy[0]); FY.to(xy[1]); FO.to(1); }
  function press(down = true) { FP.to(down ? 1 : 0); if (!down) { RIP.set(1); RIP.to(0); } }
  const tap = () => { press(true); PEND.push([T + .16, () => press(false)]); };
  const PEND = [];

  /* the script: [time, action] */
  const S = []; let script = S, saved = null, short = false; const caption = UI.app.querySelector('.tour-caption'); const say = x => { caption.textContent=x; caption.style.opacity=x?'1':'0'; };
  const add = (t, f) => S.push([t, f]);
  let T = 0, on = false, paused = false, i = 0, typed = null, dragC = null, loopN = 0;
  const BEATS = [0, 4.0, 12.6, 18.4, 24.8];
  const hero = () => DEMO.hero.ff;
  // 1 · intro
  add(0, () => { UI.camHome(); controls.autoRotate = true; controls.autoRotateSpeed = .5; if (!QS.has('nointro')) UI.showIntro(3200); });
  // 2 · release: upload + prompt → Square One + Design swarm → hold → flight → windows warm
  add(4.0, () => { controls.autoRotate = false; fingerTo(rectC('.nav .rel'), true); });
  add(4.6, () => { tap(); UI.openRelease(); });
  add(5.2, () => fingerTo(rectC('#rel .up')));
  add(5.6, () => { tap(); UI.pickArt(DEMO.mine.find(d=>d.art)?.art); });
  add(5.9, () => { fingerTo([STAGE.w * .78, STAGE.h * .55]); FO.to(0); typed = { t: 0, s: DEMO.PROMPTS[0], el: UI.rel.querySelector('textarea') }; });
  add(7.0, () => { FO.to(1); fingerTo(rectC('#rel .p1 .nx')); });
  add(7.35, () => { tap(); UI.setStep(1); });
  add(8.1, () => fingerTo(scr(FF.bTop(2))));
  add(8.45, () => { tap(); UI.setSpot(2); });
  add(8.9, () => fingerTo(rectC(UI.rel.querySelectorAll('.sw')[3])));
  add(9.2, () => { tap(); UI.selSw(3); });
  add(9.6, () => fingerTo(rectC('#rel .p2 .nx')));
  add(9.9, () => { tap(); UI.setStep(2); });
  add(10.5, () => fingerTo(rectC('#rel .hb')));
  add(10.8, () => { press(true); UI.holdStart(); });
  add(12.05, () => { press(false); FO.to(0); });
  // 3 · glow: a Beacon over the Picasso Block → shared-element into its card → Glow → swipe down
  add(12.9, () => UI.camGo(hero().p, 4.8));
  add(14.3, () => fingerTo(scr(hero().p), true));
  add(14.7, () => { tap(); UI.openCard(hero()); });
  add(15.7, () => fingerTo(rectC('#card .glow')));
  add(16.05, () => { tap(); UI.glow(hero()); });
  add(17.0, () => fingerTo(rectC('#card .art')));
  add(17.3, () => { press(true); dragC = { t: 0, y0: FY.x }; });
  add(17.65, () => { press(false); dragC = null; UI.closeCard(1700); FO.to(0); });
  // 4 · constellation: Meet → four fireflies form a constellation over Square One → I'm in
  add(18.6, () => fingerTo(rectC('.nav .tab[data-tab="meet"]'), true));
  add(18.95, () => { tap(); UI.go('meet'); });
  add(21.2, () => fingerTo(rectC('#meet .imin')));
  add(21.6, () => { tap(); UI.imin(); });
  add(23.4, () => fingerTo(rectC('.nav .tab[data-tab="sky"]')));
  add(23.75, () => { tap(); UI.go('sky'); });
  add(24.2, () => FO.to(0));
  // 5 · Swarm Night: 9 PM, fireflies fly home to their schools and flash in sync
  add(24.8, () => { UI.swarmNight(true); controls.autoRotate = true; controls.autoRotateSpeed = .35; });
  add(33.4, () => { UI.swarmNight(false); controls.autoRotate = false; });
  add(34.6, () => { if (QS.has('once')) stop(); else { loopN++; restart(0); } });

  function reset() { UI.holdEnd(); say('');
    [UI.cardS, UI.relS, UI.meetS, UI.meS].forEach(s => s.close()); UI.hideTag(); if (UI.isNight()) UI.swarmNight(false);
    // forget anything the tour released, so every loop is identical
    for (let k = FF.list.length - 1; k >= 0; k--) if (String(FF.list[k].d.id).startsWith('me') && !saved?.ids.has(FF.list[k].d.id)) FF.list.splice(k, 1);
    for (let k = DEMO.flies.length - 1; k >= 0; k--) if (String(DEMO.flies[k].id).startsWith('me') && !saved?.ids.has(DEMO.flies[k].id)) DEMO.flies.splice(k, 1);
    for (let k = DEMO.mine.length - 1; k >= 0; k--) if (String(DEMO.mine[k].id).startsWith('me') && !saved?.ids.has(DEMO.mine[k].id)) DEMO.mine.splice(k, 1);
    const h = DEMO.hero; h.glowed = false; h.glows = 211; if (h.ff) { h.ff.visTo = 1; h.ff.shim = 0; }
    if (UI.isIn()) UI.imin();
    FO.set(0); FP.set(0); typed = null; dragC = null; PEND.length = 0; }
  function restart(t0 = 0) { reset(); on = true; paused = false; T = t0; i = 0; while (i < script.length && script[i][0] < t0) i++;
    controls.enabled = false; document.documentElement.classList.add('touring');
    if (t0 > 0) { UI.camHome(); if (t0 >= BEATS[2]) { /* nothing to replay */ } } }
  function capture(){if(!saved)saved={ids:new Set(DEMO.flies.map(d=>d.id)),hero:{glowed:DEMO.hero.glowed,glows:DEMO.hero.glows,art:DEMO.hero.art,prompt:DEMO.hero.prompt},in:UI.isIn()};}
  function useArt(){const art=DEMO.mine.find(d=>d.art);if(art){DEMO.hero.art=art.art;DEMO.hero.prompt=art.prompt;}}
  function start(t0 = 0) { capture();useArt();short=false;script=S;S.sort((a,b)=>a[0]-b[0]);restart(t0); }
  const promo=[
   [0,()=>{UI.camHome();say('Make something.');}],
   [1.0,()=>{UI.openRelease();UI.pickArt(DEMO.mine.find(d=>d.art)?.art);UI.R.prompt=DEMO.PROMPTS[0];UI.rel.querySelector('textarea').value=UI.R.prompt;}],
   [2.3,()=>{UI.setStep(1);UI.setSpot(2);}],
   [3.2,()=>{UI.setStep(2);say('Release your Firefly.');}],
   [3.8,()=>{fingerTo(rectC('#rel .hb'),true);press(true);UI.holdStart();}],
   [5.2,()=>{press(false);FO.to(0);}],
   [6.9,()=>{say('Glow on what you love.');UI.openCard(hero());}],
   [7.8,()=>{fingerTo(rectC('#card .glow'),true);tap();UI.glow(hero());}],
   [8.7,()=>{UI.closeCard();FO.to(0);}],
   [9.3,()=>{say('Find your people.');UI.go('meet');}],
   [10.6,()=>{fingerTo(rectC('#meet .imin'),true);tap();if(!UI.isIn())UI.imin();}],
   [11.6,()=>{FO.to(0);UI.go('sky');UI.swarmNight(true);say('Make → Glow → Meet');}],
   [14.9,()=>stop(true)]
  ];
  function startPromo(){capture();useArt();short=true;script=promo;restart(0);}

  function stop(leaveFinal=false) { UI.holdEnd();UI.app.querySelector('.intro').hidden=true;if(!leaveFinal)reset();on=false;paused=false;controls.enabled=true;FO.to(0);document.documentElement.classList.remove('touring');if(saved){for(const list of [FF.list,DEMO.flies,DEMO.mine])for(let k=list.length-1;k>=0;k--){const d=list[k].d||list[k];if(String(d.id).startsWith('me')&&!saved.ids.has(d.id))list.splice(k,1);} DEMO.hero.glowed=saved.hero.glowed;DEMO.hero.glows=saved.hero.glows;DEMO.hero.art=saved.hero.art;DEMO.hero.prompt=saved.hero.prompt;if(UI.isIn()!==saved.in)UI.imin();saved=null;} }

    function step(dt) {
    fing.style.opacity = showFinger ? FO.x : 0;
    fing.style.transform = `translate3d(${FX.x}px,${FY.x}px,0) scale(${1 - .18 * FP.x})`; fing.style.setProperty('--rip', RIP.x);
    if (!on || paused) return;
    T += dt;
    while (i < script.length && script[i][0] <= T) { const f = script[i][1]; i++; try { f(); } catch (e) { console.warn('tour', e); } }
    for (let k = PEND.length - 1; k >= 0; k--) if (PEND[k][0] <= T) { const f = PEND[k][1]; PEND.splice(k, 1); f(); }
    if (typed) { typed.t += dt; const n = Math.min(typed.s.length, Math.floor(typed.t * 46)); typed.el.value = typed.s.slice(0, n); UI.R.prompt = typed.el.value; if (n >= typed.s.length) typed = null; }
    if (dragC) { dragC.t += dt; const dy = 150 * smooth(0, .35, dragC.t); FY.set(dragC.y0 + dy); UI.cardS.y.set(dy); }
  }
  addEventListener('keydown', e => { if (e.target.closest && e.target.closest('textarea,input')) return;
    if (e.key === 'p' || e.key === 'P') startPromo();
    if (e.key === 't' || e.key === 'T') on ? stop() : start(0);
    if (e.key === ' ' && on) { paused = !paused; e.preventDefault(); }
    if (e.key === 'f' || e.key === 'F') showFinger = !showFinger;
    if (e.key === 'Escape' && on) stop();
    if (/^[1-5]$/.test(e.key)) start(BEATS[+e.key - 1]); });
  return { start, startPromo, stop, step, get paused(){return paused;}, get on() { return on; }, get T() { return T; } };
})();

/* ================= one loop for everything: springs, tour, campus life, camera, fireflies, UI, render ================= */
const clock = new THREE.Clock();
let fpsN = 0, fpsT = 0, FPS = 60, simTime = 0, lowFrames = 0;
function loop() { const realDt = clock.getDelta(), dt = Math.min(realDt,.05); const frozen = document.hidden || (TOUR.on && TOUR.paused); if(!frozen)simTime+=dt;const t=simTime;
  if (frozen) { renderFrame(t); requestAnimationFrame(loop); return; }
  stepMotion(dt); TOUR.step(dt); LIFE.step(RMO?0:t, RMO?0:dt);
  updateCars(RMO?0:dt); updateLife(RMO?0:t,RMO?0:dt); updateCam(dt); UI.frame(t, dt); STORY.frame(t, dt); if(RMO)controls.autoRotate=false; controls.update(); THEME.step(dt); constrainCamera(); camera.updateMatrixWorld();
  FF.update(t, dt); renderFrame(t);
  fpsN++; fpsT += realDt; if (fpsT > 1) { FPS = fpsN / fpsT; const meter=document.querySelector('.fps-meter');if(meter)meter.textContent='Preview · '+Math.round(FPS)+' fps';lowFrames=FPS<43?lowFrames+1:0;if(lowFrames>=3&&renderer.getPixelRatio()>1){renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-.25));dispatchEvent(new Event('resize'));lowFrames=0;} fpsN = 0; fpsT = 0; }
  requestAnimationFrame(loop); }
loop();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); frameCamera(); UI.layout(); });
window.__app = { scene, camera, controls, THREE, UI, FF, TOUR, DEMO, get fps() { return FPS; }, get stage(){return STAGE;}, get reducedMotion(){return RMO;}, focus(k, z = 4) { const p = FOCUS[k]; controls.target.copy(p).setY(0); camera.zoom = z; camera.updateProjectionMatrix(); } }; window.__ready = true;
window.dispatchEvent(new Event('ryf:ready'));
POLISH.init();
if (QS.has('promo')) TOUR.startPromo(); else if (QS.has('tour')) TOUR.start(0); else if (!QS.has('nointro') && !QS.has('work') && !THEME.touchMap) UI.showIntro(1800).then(() => STORY.firstRun());
