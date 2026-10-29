#!/bin/bash
# Release Your Firefly: concatenate portal-src into one deployable portal.html
# (kit.js is generated from ../firefly-ui by gen-kit.cjs; re-run it if you change an SVG)
cd "$(dirname "$0")/portal-src" && cat head.js mid.js hero.js build.js post.js kit.js pack.js icons2.js data.js art.js motion.js flies.js ui.js life.js bake.js theme.js polish.js campaign.js story.js tour.js loop.js > ../portal.html && wc -c ../portal.html
