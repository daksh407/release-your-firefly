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
