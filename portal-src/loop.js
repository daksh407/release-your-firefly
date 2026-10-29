
/* ================= one loop for everything: springs, tour, campus life, camera, fireflies, UI, render ================= */
const clock = new THREE.Clock();
let fpsN = 0, fpsT = 0, FPS = 60, simTime = 0, lowFrames = 0;
function loop() { const realDt = clock.getDelta(), dt = Math.min(realDt,.05); const frozen = document.hidden || (TOUR.on && TOUR.paused); if(!frozen)simTime+=dt;const t=simTime;
  if (frozen) { renderFrame(t); requestAnimationFrame(loop); return; }
  stepMotion(dt); TOUR.step(dt); LIFE.step(RMO?0:t, RMO?0:dt);
  updateCars(RMO?0:dt); updateLife(RMO?0:t,RMO?0:dt); updateCam(dt); UI.frame(t, dt); STORY.frame(t, dt); if(RMO)controls.autoRotate=false; controls.update(); THEME.step(dt); camera.updateMatrixWorld();
  FF.update(t, dt); renderFrame(t);
  fpsN++; fpsT += realDt; if (fpsT > 1) { FPS = fpsN / fpsT; const meter=document.querySelector('.fps-meter');if(meter)meter.textContent='Preview · '+Math.round(FPS)+' fps';lowFrames=FPS<43?lowFrames+1:0;if(lowFrames>=3&&renderer.getPixelRatio()>1){renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-.25));dispatchEvent(new Event('resize'));lowFrames=0;} fpsN = 0; fpsT = 0; }
  requestAnimationFrame(loop); }
loop();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); frameCamera(); UI.layout(); });
window.__app = { scene, camera, controls, THREE, UI, FF, TOUR, DEMO, get fps() { return FPS; }, get stage(){return STAGE;}, get reducedMotion(){return RMO;}, focus(k, z = 4) { const p = FOCUS[k]; controls.target.copy(p).setY(0); camera.zoom = z; camera.updateProjectionMatrix(); } }; window.__ready = true;
window.dispatchEvent(new Event('ryf:ready'));
POLISH.init();
if (QS.has('promo')) TOUR.startPromo(); else if (QS.has('tour')) TOUR.start(0); else if (!QS.has('nointro') && !QS.has('work') && !THEME.touchMap) UI.showIntro(1800).then(() => STORY.firstRun());
</script>

</body></html>
