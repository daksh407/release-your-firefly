
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
