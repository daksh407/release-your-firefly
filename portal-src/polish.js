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
