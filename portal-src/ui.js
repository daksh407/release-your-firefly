
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
  .tag-thread{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:2}
  .tag-thread[hidden]{display:none}
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
  tagA.innerHTML = `<div class="tag" hidden><div class="card0 panel"><span class="hole"></span><h3></h3><div class="row"><span class="chip">${ic('glow')}<span class="n"></span></span><button class="btn pill amber go" data-press aria-label="Open" style="height:40px;flex:1">${ic('next')}</button></div></div></div><svg class="tag-thread" viewBox="0 0 1 1" fill="none" aria-hidden="true" hidden><path stroke="#E2384A" stroke-width="3" stroke-linecap="round"/><circle r="2.2" fill="#E2384A"/></svg>`;
  const tagEl = $('.tag', tagA); let tagB = null, lastAx = null;
  const tagString=$('.tag-thread',tagA),tagPath=$('path',tagString),tagKnot=$('circle',tagString),tagHole=$('.hole',tagEl);
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
  }
  // Project anchors after every camera controller has finished its work for this frame.
  function frameAnchors(t,dt){
    tagString.toggleAttribute('hidden',tagEl.hidden);
    if (tagB !== null || !tagEl.hidden) { const b = tagB ?? lastB; if (b !== null && b !== undefined) { const p = FF.bTop(b); place(tagA, p, -6);
        if (lastAx !== null && !RMO) { const vx = (so.x - lastAx) / Math.max(dt, 1e-3); tagSw.t = clamp(-vx * .035, -14, 14); MOTION.add(tagSw); } lastAx = so.x; lastB = b;
        tagEl.style.transform = `translateY(${(1 - tagDrop.x) * -30}px) rotate(${tagSw.x.toFixed(2)}deg)`;
        // Read the transformed hole, so the string stays connected through sway and drop.
        const anchor=tagA.getBoundingClientRect(),hole=tagHole.getBoundingClientRect();
        const x=hole.left+hole.width/2-anchor.left,y=hole.top+hole.height/2-anchor.top;
        tagPath.setAttribute('d',`M0 0 Q${(x*.5+2).toFixed(2)} ${(y*.5).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`);
        tagKnot.setAttribute('cx',x.toFixed(2));tagKnot.setAttribute('cy',y.toFixed(2));
        tagString.style.opacity=tagEl.style.opacity;
      } }
    [mSpot, mMeet, mYou].forEach(m => { if (m.p) place(m.a, m.p); });
  }
  let lastB = null;
  setTab('sky');
  return { confetti, setTab, hideNav: a => navAway && navAway(a), get tab() { return tab; }, mYou, mSpot, mMeet, bname, go, openCard, closeCard, openRelease, setStep, setSpot, selSw, pickArt, holdStart, holdEnd, glow, openMeet, openMe, swarmNight, showIntro, toast, camGo, camHome, cancelCamera, showTag, hideTag, frame, frameAnchors, layout, sheets,
    get cur() { return cur; }, get step() { return step; }, get R() { return R; }, rel, card, meet, me, nav, app, relS, cardS, meetS, meS, $, imin: () => $('.imin', meet).click(), isIn: () => imIn, isNight: () => snOn };
})();
