
/* ================= sample artwork: small generated posters so the demo feels alive before real Firefly art is added =================
   Six compositions (sunset hills, orbits, night city, bloom, waves, lanterns), coloured by the maker's swarm, ink outlines like the kit.
   Every card that shows one says it is a sample. Real uploads always win. */
function genArt(seed, sw = 0) {
  if (typeof seed === 'string') { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); seed = h >>> 0; }
  let s = (seed * 2654435761 + 12345) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const PAL = [
    ['#2b2170', '#ff8a5b', '#ffc84a', '#fff4de', '#e2384a'], ['#14524a', '#c8f560', '#3cc3b0', '#fff4de', '#ffc84a'],
    ['#3a1d4f', '#ff8a5b', '#ffc84a', '#ff8fb1', '#fff4de'], ['#2a1840', '#ff8fb1', '#8b7cf6', '#fff4de', '#ffc84a'],
    ['#0e3a4a', '#3cc3b0', '#c8f560', '#fff4de', '#ff8a5b'], ['#1b1550', '#8b7cf6', '#3cc3b0', '#ffc84a', '#fff4de']];
  const P = PAL[sw % 6].slice(); if (r() < .5) [P[1], P[2]] = [P[2], P[1]];
  const k = Math.floor(r() * 6), id = 'g' + (seed % 1e7) + k, ink = '#14102E', o = `stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"`;
  let g = '';
  const stars = n => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 55).toFixed(1)}" r="${(r() * .9 + .3).toFixed(2)}" fill="${P[3]}" opacity="${(.5 + r() * .5).toFixed(2)}"/>`; return t; };
  if (k === 0) { // sunset hills
    const sy = 38 + r() * 14;
    g = `<rect width="100" height="100" fill="url(#${id}a)"/><circle cx="${30 + r() * 40}" cy="${sy}" r="${14 + r() * 8}" fill="${P[2]}" ${o}/>`;
    for (let i = 0; i < 3; i++) { const y = 58 + i * 12, a = 6 + r() * 10; g += `<path d="M-2 ${y} C 20 ${y - a} 40 ${y + a} 60 ${y - a * .6} S 90 ${y + a * .4} 102 ${y - 4} V102 H-2Z" fill="${[P[1], P[4], P[0]][i]}" ${o}/>`; }
    g = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}"/></linearGradient></defs>` + g + stars(10);
  } else if (k === 1) { // orbits
    const cx = 40 + r() * 20, cy = 42 + r() * 16;
    g = `<rect width="100" height="100" fill="${P[0]}"/>${stars(26)}`;
    for (let i = 4; i > 0; i--) g += `<circle cx="${cx}" cy="${cy}" r="${i * 11}" fill="none" stroke="${P[3]}" stroke-opacity=".35" stroke-width="1"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="12" fill="${P[2]}" ${o}/>`;
    for (let i = 1; i <= 3; i++) { const a = r() * 6.28; g += `<circle cx="${(cx + Math.cos(a) * i * 11).toFixed(1)}" cy="${(cy + Math.sin(a) * i * 11).toFixed(1)}" r="${2.5 + r() * 3}" fill="${[P[1], P[4], P[3]][i - 1]}" ${o}/>`; }
  } else if (k === 2) { // night city with lit windows
    g = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}" stop-opacity=".8"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id}a)"/>${stars(14)}<circle cx="${70 + r() * 15}" cy="20" r="8" fill="${P[3]}" ${o}/>`;
    let x = -2; while (x < 100) { const w = 10 + r() * 12, h = 25 + r() * 45, y = 100 - h; g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h + 2}" fill="${r() < .5 ? ink : P[0]}" ${o}/>`;
      for (let wy = y + 5; wy < 96; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < .45) g += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2.4" height="3" fill="${r() < .8 ? P[2] : P[3]}"/>`;
      x += w + 1; }
  } else if (k === 3) { // bloom
    const n = 6 + Math.floor(r() * 5);
    g = `<defs><radialGradient id="${id}a"><stop offset="0" stop-color="${P[1]}"/><stop offset="1" stop-color="${P[0]}"/></radialGradient></defs><rect width="100" height="100" fill="url(#${id}a)"/>`;
    for (let i = 0; i < n; i++) g += `<ellipse cx="50" cy="30" rx="${9 + r() * 3}" ry="22" fill="${i % 2 ? P[2] : P[4]}" ${o} transform="rotate(${(i * 360 / n).toFixed(1)} 50 52)"/>`;
    g += `<circle cx="50" cy="52" r="11" fill="${P[3]}" ${o}/>` + stars(8);
  } else if (k === 4) { // waves
    g = `<rect width="100" height="100" fill="${P[0]}"/><circle cx="${25 + r() * 50}" cy="26" r="13" fill="${P[2]}" ${o}/>`;
    for (let i = 0; i < 5; i++) { const y = 46 + i * 11, a = 4 + r() * 5, ph = r() * 20; g += `<path d="M-4 ${y} q ${12.5 + ph * .1} ${-a} 25 0 t 25 0 t 25 0 t 25 0 t 25 0 V104 H-4Z" fill="${[P[1], P[4], P[3], P[2], P[1]][i]}" ${o}/>`; }
  } else { // lanterns
    g = `<defs><radialGradient id="${id}a"><stop offset="0" stop-color="${P[3]}"/><stop offset=".35" stop-color="${P[2]}"/><stop offset="1" stop-color="${P[2]}" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="${P[0]}"/>${stars(12)}`;
    for (let i = 0; i < 6; i++) { const x = 10 + r() * 80, y = 18 + r() * 66, sz = 5 + r() * 7; g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(sz * 2.4).toFixed(1)}" fill="url(#${id}a)" opacity=".55"/><line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${(y - sz).toFixed(1)}" stroke="${P[3]}" stroke-opacity=".4" stroke-width=".8"/><rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz * .7).toFixed(1)}" width="${sz.toFixed(1)}" height="${(sz * 1.4).toFixed(1)}" rx="${(sz / 2.4).toFixed(1)}" fill="${i % 2 ? P[4] : P[1]}" ${o}/>`; }
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}
const artURL = (seed, sw) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(genArt(seed, sw).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" '));

/* until the real Firefly images arrive, demo fireflies use the r04 sample artworks (labelled as samples on every card) */
(() => { if (typeof ART !== 'undefined' && ART.length) return; const K = ['art-chai-galaxy', 'art-square-one-night', 'art-picasso-night', 'art-turing-night', 'art-creeper-walk', 'art-constellation-study'];
  const PR = ['a chai glass that holds a tiny galaxy, steam shaped like stars', 'Square One at night, every window warm, fireflies over the plaza', 'the Picasso Block lit like a lantern, gold slats glowing',
    'Turing Block as a tiny toy model under a night sky', 'the creeper walkway as a tunnel of little lights', 'five fireflies joined into one constellation'];
  DEMO.flies.forEach((f, i) => { if (!f.art) { const k = (i * 7 + (f.b || 0)) % K.length; f.art = packURL(K[k]); f.prompt = PR[k]; f.sampleArt = true; } }); DEMO.hero.art = packURL(K[2]); DEMO.hero.prompt = PR[2]; })();
