
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
