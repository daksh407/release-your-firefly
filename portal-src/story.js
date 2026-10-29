
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
