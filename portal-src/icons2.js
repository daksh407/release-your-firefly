
/* ================= clearer icons: familiar shapes people already know from Maps, Photos and Messages =================
   Same 24px grid and round 2px strokes for every icon; stroke colour is replaced by currentColor in the UI. */
(() => {
  const S = (d, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14102E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`.replace('stroke-linejoin="round">', `stroke-linejoin="round"${extra}>`);
  const FLY = `<path d="M12 10.2c-1.5 0-2.4 1.3-2.4 3.4 0 2.6 1.1 5 2.4 5s2.4-2.4 2.4-5c0-2.1-.9-3.4-2.4-3.4z" fill="#14102E" stroke="none"/><circle cx="12" cy="8.1" r="1.5" fill="#14102E" stroke="none"/><path d="M11.2 9.9C9 8.4 5.6 8.5 4.6 10.2c-.9 1.6 1.6 3.4 5.2 2.9"/><path d="M12.8 9.9c2.2-1.5 5.6-1.4 6.6.3.9 1.6-1.6 3.4-5.2 2.9"/><path d="M11.3 6.9 9.9 4.8M12.7 6.9l1.4-2.1"/>`;
  const extras = {
    'icon-sky': S('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>'),                                  // map
    'icon-meet': S('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.8 14.4c2.3.1 4.1 1.7 4.7 4.6"/>'),  // people
    'icon-me': S('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.7 3.6-5.8 7-5.8s6.2 2.1 7 5.8"/>'),                            // person
    'icon-release': S(FLY + '<path d="M12 21.5v0" />'),                                                                                 // a firefly
    'icon-glow': S('<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z"/>'),              // heart outline (glow = love it)
    'icon-glow-filled': S('<path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10z" fill="#14102E"/>'),
    'icon-prompt': S('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8 8.5h8M8 12h5"/>'),
    'icon-sketch': S('<path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5z"/><path d="M13.5 6.5l4 4"/>'),
    'icon-share': S('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6.5 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/>'),
    'icon-close': S('<path d="M6 6l12 12M18 6 6 18"/>'),
    'icon-next': S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    'icon-back': S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    'icon-upload': S('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 15-4.5-4.5L7 19.5"/>'),   // photo
    'icon-pin': S('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    'icon-clock': S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    'icon-check': S('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    'icon-info': S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>'),
    'icon-plus': S('<path d="M12 5v14M5 12h14"/>'),
    'icon-minus': S('<path d="M5 12h14"/>'),
    'icon-locate': S('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>'),
    'icon-compass': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.5 15.2 12H8.8z" fill="#E2384A"/><path d="M12 21.5 8.8 12h6.4z" fill="#14102E" opacity=".55"/></svg>`,
    'icon-moon': S('<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/><path d="M16.5 3.5v3M15 5h3"/>'),
    'icon-layers': S('<path d="M12 4 3 9l9 5 9-5-9-5z"/><path d="m3 14 9 5 9-5"/>'),
  };
  for(const [k,v] of Object.entries(extras)) if(!KIT[k])KIT[k]=v;
})();
