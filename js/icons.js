/* Present — jeu d'icônes SVG inline (style trait, 24×24) */
(function () {
  const p = (d) => `<path d="${d}"/>`;
  const c = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  const S = {
    check: p('M20 6 9 17l-5-5'),
    plus: p('M12 5v14M5 12h14'),
    x: p('M18 6 6 18M6 6l12 12'),
    left: p('m15 18-6-6 6-6'), right: p('m9 18 6-6-6-6'), down: p('m6 9 6 6 6-6'),
    back: p('m12 19-7-7 7-7M19 12H5'),
    home: p('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z') + p('M9 22V12h6v10'),
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/>' + p('M16 2v4M8 2v4M3 10h18'),
    chart: p('M18 20V10M12 20V4M6 20v-6'),
    user: p('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2') + c(12, 7, 4),
    list: p('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
    bell: p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9') + p('M10.3 21a1.94 1.94 0 0 0 3.4 0'),
    clock: c(12, 12, 10) + p('M12 6v6l4 2'),
    alarm: c(12, 13, 8) + p('M12 9v4l2 2M5 3 2 6M22 6l-3-3'),
    trash: p('M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
    edit: p('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'),
    leaf: p('M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z') + p('M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'),
    flame: p('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z'),
    trophy: p('M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z'),
    star: p('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
    book: p('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z') + p('M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'),
    dumbbell: p('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'),
    activity: p('M22 12h-4l-3 9L9 3l-3 9H2'),
    eye: p('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z') + c(12, 12, 3),
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/>' + p('M2 20h20'),
    moon: p('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'),
    sun: c(12, 12, 4) + p('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'),
    droplet: p('M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'),
    heart: p('M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'),
    cross: p('M12 2v20M6 8h12'),
    sparkle: p('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z'),
    grad: p('M22 10 12 5 2 10l10 5 10-5z') + p('M6 12v5c3 3 9 3 12 0v-5M22 10v6'),
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/>' + p('M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'),
    coffee: p('M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z M6 2v2M10 2v2M14 2v2'),
    pen: p('M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'),
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/>' + p('M19 10v2a7 7 0 0 1-14 0v-2M12 19v3'),
    music: p('M9 18V5l12-2v13') + c(6, 18, 3) + c(18, 16, 3),
    walk: c(13.5, 4, 1.5) + p('M10 21l2-6-3-3 2-5M8 12l-3 1M12 9l3 3 3 1'),
    apple: p('M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z M10 2c1 .5 2 2 2 5'),
    bulb: p('M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4'),
    code: p('m16 18 6-6-6-6M8 6l-6 6 6 6'),
    target: c(12, 12, 10) + c(12, 12, 6) + c(12, 12, 2),
    bed: p('M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9'),
    smile: c(12, 12, 10) + p('M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01'),
    sliders: p('M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'),
    download: p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
    upload: p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'),
    repeat: p('m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3'),
    inbox: p('M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'),
    more: p('M12 12h.01M12 5h.01M12 19h.01'),
    hourglass: p('M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.41L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.41L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2'),
    globe: c(12, 12, 10) + p('M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'),
    archive: p('M21 8v13H3V8M1 3h22v5H1zM10 12h4'),
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/>' + p('M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'),
    arrowRight: p('M5 12h14m-7-7 7 7-7 7'),
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/>' + p('M12 18h.01'),
    play: '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    next: '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/><path d="M19 5v14"/>',
    prev: '<polygon points="19 20 9 12 19 4 19 20" fill="currentColor"/><path d="M5 5v14"/>',
    send: p('M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z'),
    file: p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z') + p('M14 2v6h6')
  };

  // Icônes proposées dans les sélecteurs
  const PICKER = ['leaf', 'cross', 'sparkle', 'book', 'dumbbell', 'activity', 'walk', 'eye', 'laptop', 'code', 'grad', 'briefcase',
    'coffee', 'pen', 'mic', 'music', 'bulb', 'target', 'heart', 'apple', 'droplet', 'moon', 'sun', 'bed', 'smile', 'flame', 'star', 'clock'];
  const COLORS = ['#F29B93', '#E8A800', '#8FBF6A', '#5F84A8', '#8E4568', '#C0587A', '#E07B39', '#3FA7A0', '#7C5CBF', '#6B7A86'];

  window.Icons = {
    PICKER, COLORS,
    // i('check', 18) → balise SVG ; les couleurs héritent de currentColor
    i(name, size = 20, sw = 2) {
      return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S[name] || S.target}</svg>`;
    },
    has: (n) => !!S[n]
  };
})();
