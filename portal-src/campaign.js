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
