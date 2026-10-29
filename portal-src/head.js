<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Release Your Firefly</title>
<meta name="theme-color" content="#0b0d26">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Gloock&display=swap">
<style>
/* Layout: full-screen isometric island on a night gradient; only a title and one note on top. */
:root{
  color-scheme: dark;
  --night:#0b0d26; --violet:#2b2170; --indigo:#1a1d55; --cream:#fff1d6; --glow:#ffc84a; --muted:#a9a3d6;
  --display:"Gloock", Georgia, serif; --body:"Archivo", "Helvetica Neue", Arial, sans-serif;
}
html,body{height:100%;margin:0;overflow:hidden;color:var(--cream);font-family:var(--body);
  background:radial-gradient(120% 80% at 50% 18%, #5fd0c0 0%, #2fae9a 45%, #1d8a7d 100%) fixed;background-color:#2fae9a;transition:background .6s}
html.night body,body.night{background:radial-gradient(120% 80% at 50% 20%, #0a3a5c 0%, #062c4c 45%, #021c33 100%) fixed;background-color:#032a4a}
canvas{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.t{position:fixed;z-index:2;top:calc(14px + env(safe-area-inset-top,0px));left:max(16px,env(safe-area-inset-left,0px));pointer-events:none}
.t b{display:block;font:400 24px/1 var(--display);color:#14102E}
body.night .t b{color:var(--cream);text-shadow:0 2px 14px rgba(0,0,0,.5)}
body.night .t span{color:var(--muted)}
.t b em{font-style:normal;color:#e2384a}
body.night .t b em{color:var(--glow)}
.t span{display:block;margin-top:6px;font:600 11.5px var(--body);color:#14524a;letter-spacing:.04em}
.ctl{position:fixed;z-index:3;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;gap:10px}
.ctl button{width:46px;height:46px;border-radius:12px;background:#FFF4DE;border:3px solid #14102E;box-shadow:4px 4px 0 #05061A;display:grid;place-items:center;cursor:pointer;padding:0;transition:transform .08s,box-shadow .08s}
.ctl button:active{transform:translate(4px,4px);box-shadow:0 0 0 #05061A}
.ctl button:focus-visible{outline:3px solid #FFC84A;outline-offset:3px}
.ctl svg{width:22px;height:22px;fill:none;stroke:#14102E;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.n{position:fixed;z-index:2;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));font:600 11px var(--body);color:var(--muted);background:rgba(11,13,38,.6);border:1px solid rgba(255,241,214,.16);padding:6px 10px;border-radius:999px;pointer-events:none}
</style>
<canvas id="gl" tabindex="0" aria-label="Isometric night model of Chitkara University, Punjab. Drag to turn, pinch or scroll to zoom, two fingers to pan."></canvas>
<div class="t"><b>Release Your <em>Firefly</em></b><span>Chitkara University, Punjab</span></div>
<div class="n">Drag to turn · two fingers to move · pinch to zoom</div>
<div class="ctl"><button id="rl" aria-label="Turn left"><svg viewBox="0 0 24 24"><path d="M9 5 4 10l5 5"/><path d="M4 10h9a6 6 0 0 1 0 12h-2"/></svg></button><button id="hm" aria-label="Back to the whole campus"><svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg></button><button id="nt" aria-label="Switch day and night"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg></button><button id="rr" aria-label="Turn right"><svg viewBox="0 0 24 24"><path d="m15 5 5 5-5 5"/><path d="M20 10h-9a6 6 0 0 0 0 12h2"/></svg></button></div>

<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

