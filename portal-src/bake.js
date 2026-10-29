
/* ================= bake: merge every static campus mesh into a few big draw calls =================
   The campus was ~2,500 separate meshes (two render passes each = ~5,000 draw calls). Every mesh that uses the
   shared campus shader is baked into world space, its per-mesh uniforms become vertex attributes, and the result
   is merged into a handful of geometries. Building warmth (a released firefly lighting windows) is a uniform array
   indexed by building, so the effect still works on merged geometry. Picking uses invisible box proxies. */
const BAKE = (() => {
  const VSB = VS.replace('varying vec3 vN;', 'attribute vec3 aColor; attribute vec4 aP1; attribute vec4 aP2; varying vec3 vColor; varying vec4 vP1; varying vec4 vP2;\n varying vec3 vN;')
               .replace('vIC = vec3(1.0);', 'vIC = vec3(1.0); vColor = aColor; vP1 = aP1; vP2 = aP2;');
  const FSB = FS.replace('uniform vec3 uColor, uSide; uniform float uWin, uSeed, uTop, uField, uGlow, uStyle, uNight, uLit, uWarm;',
    `uniform float uNight; uniform float uWarmA[64]; varying vec3 vColor; varying vec4 vP1; varying vec4 vP2;
     #define uColor vColor
     #define uWin vP1.x
     #define uSeed vP1.y
     #define uTop vP1.z
     #define uField vP1.w
     #define uGlow vP2.x
     #define uStyle vP2.y
     #define uLit vP2.z
     float warmOf(float b){ int i = int(b + .5); float w = 0.; for (int k = 0; k < 64; k++) { if (k == i) w = uWarmA[k]; } return w; }
     #define uWarm warmOf(vP2.w)`);
  const warm = new Array(64).fill(0);
  const mat = new THREE.ShaderMaterial({ uniforms: { uNight: NIGHT, uWarmA: { value: warm } }, vertexShader: VSB, fragmentShader: FSB });
  const bldOf = new Map(); BGRP.forEach((g, i) => g && g.traverse(o => bldOf.set(o, i)));
  const PROXY = BGRP.map((g, i) => { if (!g) return null; const b = new THREE.Box3().setFromObject(g); const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(c); m.userData.bld = i; m.updateMatrixWorld(); return m; });
  scene.updateMatrixWorld(true);
  const take = [];
  scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.visible) return; const m = o.material; if (!m || !m.isShaderMaterial || m.fragmentShader !== FS || m.clipping) return;
    if (o.layers.mask !== 1) return; take.push(o); });
  const parts = [];
  for (const o of take) { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count, u = o.material.uniforms, c = u.uColor.value, b = bldOf.has(o) ? bldOf.get(o) : 63;
    const ac = new Float32Array(n * 3), p1 = new Float32Array(n * 4), p2 = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { ac.set([c.r, c.g, c.b], i * 3); p1.set([u.uWin.value, u.uSeed.value, u.uTop.value, u.uField.value], i * 4); p2.set([u.uGlow.value, u.uStyle.value, u.uLit.value, Math.min(b, 63)], i * 4); }
    g.setAttribute('aColor', new THREE.BufferAttribute(ac, 3)); g.setAttribute('aP1', new THREE.BufferAttribute(p1, 4)); g.setAttribute('aP2', new THREE.BufferAttribute(p2, 4));
    parts.push(g); }
  const CHUNK = 60000 * 3; let cur = [], cnt = 0; const merged = [];
  const flush = () => { if (!cur.length) return; const g = mergeGeometries(cur, false); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; scene.add(m); merged.push(m); cur = []; cnt = 0; };
  for (const g of parts) { cur.push(g); cnt += g.attributes.position.count; if (cnt > CHUNK) flush(); } flush();
  for (const o of take) { o.parent && o.parent.remove(o); o.geometry.dispose(); }
  const lines = []; scene.traverse(o => { if (o.isLineSegments && o.material === INK) lines.push(o); }); lines.forEach(l => l.parent && l.parent.remove(l));
  return { warm, PROXY: PROXY.filter(Boolean), count: take.length, merged: merged.length, lines: lines.length };
})();
