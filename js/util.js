/* Present — utilitaires (dates locales, formats, helpers) */
(function () {
  const pad = (n) => String(n).padStart(2, '0');
  const U = {};

  // Dates : TOUJOURS en heure locale (l'ancienne version utilisait l'UTC → mauvais jour entre 00h et 03h)
  U.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.today = () => U.iso(new Date());
  U.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  U.add = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.diff = (a, b) => Math.round((U.parse(a) - U.parse(b)) / 864e5);
  U.dow = (s) => (U.parse(s).getDay() + 6) % 7; // lundi = 0
  U.weekStart = (s) => U.add(s, -U.dow(s));
  U.week = (s) => { const m = U.weekStart(s); return Array.from({ length: 7 }, (_, i) => U.add(m, i)); };
  U.monthGrid = (y, m) => {
    const first = U.iso(new Date(y, m, 1, 12));
    const last = U.iso(new Date(y, m + 1, 0, 12));
    const out = [];
    for (let d = U.weekStart(first), end = U.add(U.weekStart(last), 6); d <= end; d = U.add(d, 1)) out.push(d);
    return out;
  };
  U.nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  U.hm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
  U.toMin = (s) => { if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return null; const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  U.dur = (min) => {
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? `${h}h${pad(m)}` : `${h}h`) : `${m} min`;
  };
  U.id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // Durées saisies librement : 30 · 30 min · 45' · 0,5h · 1h30 · 1 h 30 · 1:30 · 2 heures → minutes (null si illisible)
  U.parseDur = (raw) => {
    const s = String(raw ?? '').trim().toLowerCase().replace(',', '.').replace(/\s+/g, ' ');
    let m;
    if (!s) return null;
    if ((m = s.match(/^(\d+(?:\.\d+)?) ?: ?(\d{1,2})$/))) return Math.round(+m[1] * 60 + +m[2]);
    if ((m = s.match(/^(\d+(?:\.\d+)?) ?(?:h|hr|hrs|heure|heures|hour|hours)(?: ?(\d{1,2}) ?(?:m|min|mn|minutes?)?)?$/))) return Math.round(+m[1] * 60 + (m[2] ? +m[2] : 0));
    if ((m = s.match(/^(\d+(?:\.\d+)?) ?(?:m|min|mn|minutes?|')$/))) return Math.round(+m[1]);
    if (/^\d+$/.test(s)) return +s;                     // entier seul = minutes
    if (/^\d*\.\d+$/.test(s)) return Math.round(+s * 60);  // décimal seul = heures (0,5 → 30 min)
    return null;
  };
  U.parseNum = (raw) => { const s = String(raw ?? '').trim().replace(',', '.'); const n = /^\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN; return isFinite(n) ? n : null; };
  U.fmtNum = (n) => String(Math.round(n * 100) / 100).replace('.', (window.I18n && I18n.lang === 'en') ? '.' : ',');

  // Formats localisés via Intl (aucune table de mois à maintenir)
  const loc = () => (window.I18n ? I18n.lang : 'fr');
  U.fmt = (iso, opts) => new Intl.DateTimeFormat(loc(), opts).format(U.parse(iso));
  U.monthTitle = (y, m) => new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric' }).format(new Date(y, m, 1, 12));
  U.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  U.wdShort = (iso) => U.cap(U.fmt(iso, { weekday: 'short' }).replace('.', ''));
  U.wdLetter = (iso) => U.cap(U.fmt(iso, { weekday: 'narrow' }));
  U.longDate = (iso) => U.cap(U.fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }));

  window.U = U;
})();
