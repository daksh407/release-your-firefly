# GitHub demo

No sign-in. Releases and Glows are saved only in each visitor’s browser. Sample makers, rankings and meetings demonstrate the campaign; they are not real participants. The four concept illustrations were generated with GPT, not Adobe Firefly.

## Publish

Upload this folder to a public GitHub repository. In **Settings → Pages**, choose **GitHub Actions**. The included workflow deploys the site on pushes to `main`, or can be run manually. It does not replace any portfolio repository.

# Release Your Firefly — interactive portal

Open `index.html` in a modern desktop browser with internet access. The UI, SVG kit, data and campus are in that file. Three.js r160 and fonts load from their existing public CDNs. No account, backend or build step is needed to view it. This is a GitHub Pages-ready demo. No sign-in or shared server is used.

## Prepare a real-art take

1. Press **R** or tap **Release**. Upload a Firefly-generated PNG, JPG or WebP (up to 8 MB), then enter the actual prompt. The browser resizes uploads to a maximum 1,200 pixels for a light prototype.
2. Choose a building from the map or spot list, select your swarm, then hold **Release** for 1.2 seconds. Releasing early cancels the charge. Keyboard users can hold Space or Enter.
3. Your release appears in **Me** and stays in that browser. The sample seed contains fictional makers, sample counts and clearly labelled art placeholders. “Use demo sample” rehearses the flow without implying Firefly provenance.
4. Open **ⓘ → Recording desk**. The promo uses a released image when available. Use **Export with my artwork** to create an HTML containing your released images and prompts. Export needs the portal opened through HTTP (a local preview or hosting), because browsers restrict reading a file opened directly from disk.

For local HTTP preview, put the HTML in a folder, open a terminal in that folder, run `python3 -m http.server 8000`, and open `http://localhost:8000/portal.html`. Keep this running while preparing or exporting. Ctrl+C stops it.

## Recording controls

| Action | Key |
| --- | --- |
| 15-second promo, once | P |
| Full 34.6-second looping tour | T |
| Full window → 9:16 → 16:9 | V |
| Pause / resume the tour animation | Space |
| Jump to full-tour beat 1–5 | 1–5 |
| Show / hide tap indicator | F |
| Swarm Night | S |
| Release sheet | R |
| Day / night | N |
| Stop tour / dismiss sheet | Escape |

Use the recording desk to choose the frame before starting a tour. It and the map controls hide in recording mode. Crop your recording to the framed area; these modes set composition, not a guaranteed pixel export size. Use a 1080×1920 or 1920×1080 browser/capture surface for that delivery resolution.

Direct entry links, after hosting or local preview:

- `portal.html#promo-rec916-nofinger` — 15-second portrait promo.
- `portal.html#promo-rec169-nofinger` — 15-second landscape promo.
- `portal.html#tour-rec916-once-nofinger` — full portrait tour, once.
- `portal.html#tour-rec169-once-nofinger` — full landscape tour, once.
- Add `-rm` for reduced motion or `-nointro` to skip the introduction. Reload if you change the hash in an already-open tab.

The promo beats are: 0–1 s opening → 1–3.2 s image/prompt and spot → 3.2–6.9 s hold, flight and landing → 6.9–9.3 s Glow → 9.3–11.6 s Meet → 11.6–15 s Swarm Night. It finishes on the final scene. Tour-generated releases are removed when the tour stops; manual releases are retained.

## What is real and what is simulated

- Campus geometry is retained from the supplied source. The interaction layer uses the provided inline SVG kit, including the firefly with an upward trail.
- Glow is private in interaction and one-way within this browser. It cannot be toggled off or repeatedly incremented. This is not server-enforced identity or shared activity.
- Meet invitations are sample opt-in cards, formed from 3–5 distinct schools. There is no live 9 PM matching service, messaging, or real RSVP delivery.
- Uploads, prompts, Glows and RSVP state are browser-local. Export embeds the released work into a new HTML; it does not publish it. A local work link only resolves where that work is stored or embedded.
- No new Firefly art was generated during implementation. Replace placeholders with your genuine Firefly exports before final recording. The supplied campus and UI graphics are prototype graphics; the credit line is retained as requested, with placeholder disclosures on the cards.
- Rewards, Adobe perks, shared storage and Supabase integration are not implemented in this prototype.

## Validation

Browser checks covered startup, a held release, persistence after reload, repeat Glow protection, RSVP persistence, portrait promo completion, full landscape tour completion, reduced-motion Meet, and a downloaded HTML re-opened successfully. The development preview reported approximately 60 fps on this Mac; mid-range Android performance is not measured. The renderer lowers its resolution if sustained frame rate drops.

Automated checks covered identical seeded demo data, 3–5 distinct schools per constellation, critically damped spring settling, reduced-motion snapping, JavaScript parsing, and byte-for-byte preservation of `mid.js`, `hero.js`, and `build.js` (the campus geometry).

## Editable source

`portal-source.zip` contains the source modules and `build.sh`. Run `bash build.sh` inside the extracted folder to regenerate `portal.html`. The SVG kit is already inlined in `kit.js`; the original external kit folder is not needed. The new interaction and recording polish lives primarily in `ui.js`, `polish.js`, `motion.js`, `flies.js`, and `tour.js`.

After editing the source files, run `bash build.sh` then `cp portal.html index.html`.

## Phone and playback update — 29 October

The published entry page now uses four shared, compressed artwork files and a separate cached script. Its existing Three.js r160 library is hosted alongside the site. The complete portal.html remains available as the source export. The Pages workflow publishes assets/ and vendor/ with the page.

On phones, drag to move and pinch to zoom. The opening view is zoomed into the main campus. Drag to pan and pinch to zoom; the viewing angle stays steady. Reset returns to the closer opening view. The Explore campus picker has been removed. Lifting one finger after a pinch continues the drag, and drags cannot open buildings accidentally. Turning also has compact optional controls. A loading screen offers recovery instructions for camera scanner browsers. The QR address is unchanged and has been decoded from the final streamed film to verify it.

The film player uses 720p fast-start versions, with HD downloads available separately. The short cut waits until play before downloading. Both mixes retain the original action sound design, including typing, pencil marks, taps, paper, whooshes, launch, Glow, constellation and title cues. All 37 cues have balanced levels and curved fades.
