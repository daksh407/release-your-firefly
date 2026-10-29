/* Direct navigation for touch screens. Geometry and building artwork are unchanged. */
const EXPLORE = (()=>{
 const app=UI.app, touch=THEME.touchMap;
 document.head.insertAdjacentHTML('beforeend',`<style>
 .explore-open{position:absolute;top:calc(151px + env(safe-area-inset-top,0px));left:16px;pointer-events:auto;padding:0 16px!important;height:44px;font-size:13px!important;gap:8px}
 .map-help{position:absolute;left:16px;bottom:143px;max-width:230px;color:#fff4de;font:600 11px/1.5 var(--ui);text-shadow:0 2px 8px #05061a;pointer-events:none;background:#05061acc;padding:8px 11px;border-radius:10px}
 .map-help b{display:block;font-weight:800}.map-help[hidden]{display:none}
 #campus-places{box-sizing:border-box;width:min(460px,calc(100% - 24px));max-height:min(65dvh,560px);padding:20px;margin:auto auto max(110px,env(safe-area-inset-bottom)) auto;border:3px solid #14102e;border-radius:20px;background:#fff4de;color:#14102e;box-shadow:5px 5px 0 #05061a;font-family:Archivo,Arial,sans-serif}
 #campus-places::backdrop{background:#05061a88;backdrop-filter:blur(5px)}
 #campus-places header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}
 #campus-places h2{font-size:22px;letter-spacing:-.6px;margin:0}#campus-places button{font:700 14px Archivo,Arial,sans-serif;color:inherit;cursor:pointer}
 #campus-places .places-close{border:0;background:transparent;min-width:44px;min-height:44px;font-size:24px}
 #campus-places input{box-sizing:border-box;width:100%;border:2px solid #14102e;border-radius:10px;padding:12px;font:16px Archivo,Arial,sans-serif;color:#14102e;background:#fffaf0;margin-bottom:10px}
 #campus-places .places-list{overflow:auto;max-height:35dvh;overscroll-behavior:contain;display:grid;gap:7px}
 #campus-places .places-list button{border:2px solid #14102e;border-radius:11px;text-align:left;background:#fffaf0;padding:13px 14px;min-height:48px;display:flex;justify-content:space-between;align-items:center}
 #campus-places .places-list button:first-child{background:#ffc84a}#campus-places .places-empty{padding:20px;font-size:14px}
 .mapctl .turns{display:flex}.mapctl .turns button+button{border-top:0;border-left:2px solid var(--ink)}.mapctl .hm{font-size:10px!important;font-weight:800!important;display:flex;flex-direction:column;gap:1px}.mapctl .hm .ic{width:19px;height:19px}
 html.rec .explore-open,html.rec .map-help,html.touring .explore-open,html.touring .map-help,.sheeton .explore-open,.sheeton .map-help{display:none!important}
 @media(max-width:700px){.mapctl button{width:44px;height:44px}.mapctl{right:12px;bottom:128px;gap:6px}.mapctl .cmp{display:none}.mapctl .turns button{width:36px}.mapctl .hm{width:100%}.map-help{max-width:205px}.clockchip{display:none}.backchip{top:calc(151px + env(safe-area-inset-top,0px));left:auto;right:16px;transform:none}}
 @media(min-width:701px){.explore-open{top:160px}.map-help{display:none}.land .explore-open{left:20px}}
 </style>`);
 const open=document.createElement('button');open.className='btn amber explore-open';open.type='button';open.textContent='Explore campus';open.setAttribute('aria-haspopup','dialog');app.appendChild(open);
 const help=document.createElement('div');help.className='map-help';help.innerHTML='<b>Drag to move. Pinch to zoom.</b>Tap a firefly to see someone’s work.';app.appendChild(help);
 const dialog=document.createElement('dialog');dialog.id='campus-places';dialog.setAttribute('aria-labelledby','places-title');
 dialog.innerHTML='<header><h2 id="places-title">Where to?</h2><button class="places-close" aria-label="Close places">×</button></header><input type="search" placeholder="Find a building" aria-label="Find a building"><div class="places-list"></div>';
 document.body.appendChild(dialog);const list=dialog.querySelector('.places-list'),search=dialog.querySelector('input');
 function add(label,callback){const b=document.createElement('button');b.type='button';b.append(document.createTextNode(label));const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');b.appendChild(arrow);b.onclick=()=>{dialog.close();callback();help.hidden=true;};list.appendChild(b);}
 function populate(){list.replaceChildren();const q=search.value.trim().toLowerCase();if(!q){add('Whole campus',()=>{UI.go('sky');THEME.home();});add('See a sample firefly',()=>{UI.go('sky');UI.openCard(FF.list.find(f=>f.mode!=='flight'));});}if(!q||'alpha zone'.includes(q))add('Alpha Zone',()=>{UI.go('sky');const p=P(470,95);THEME.flyTo({x:p.x,z:p.z,zoom:5},.75);});
 const priority=['Square One','Picasso Block','Turing Block','Fleming Block'];
 const names=new Set();const rows=BLD.map((b,i)=>({name:b[0],i})).filter(b=>{if(names.has(b.name)||!b.name.toLowerCase().includes(q))return false;names.add(b.name);return true;}).sort((a,b)=>{const ai=priority.indexOf(a.name),bi=priority.indexOf(b.name);return(ai<0?99:ai)-(bi<0?99:bi)||a.name.localeCompare(b.name);});
 rows.forEach(b=>add(b.name,()=>{UI.go('sky');UI.showTag(b.i);}));if(!list.children.length){const p=document.createElement('p');p.className='places-empty';p.textContent='Try another building name.';list.appendChild(p);}}
 open.onclick=()=>{search.value='';populate();dialog.showModal();dialog.querySelector('.places-close').focus();};
 search.oninput=populate;dialog.querySelector('.places-close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
 const mc=app.querySelector('.mapctl'),home=mc.querySelector('.hm');home.insertAdjacentHTML('beforeend','<span>Reset</span>');
 const turns=document.createElement('div');turns.className='grp turns';turns.innerHTML='<button type="button" aria-label="Turn campus left">↶</button><button type="button" aria-label="Turn campus right">↷</button>';mc.appendChild(turns);
 [...turns.children].forEach((b,i)=>b.onclick=()=>THEME.flyTo({th:THEME.heading+(i?1:-1)*Math.PI/4},.45));
 canvas.setAttribute('aria-label','Chitkara campus. Drag to move, pinch to zoom, or use Explore campus to choose a building.');
 return {touch,open:()=>open.click()};
})();
