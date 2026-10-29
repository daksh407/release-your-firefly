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
