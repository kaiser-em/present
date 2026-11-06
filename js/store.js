/* Present — couche données (localStorage v2), migration v1, statistiques */
(function () {
  const KEY = 'present_v2';
  const V1 = { habits: 'present_habits_v1', done: 'present_completions_v1', settings: 'present_settings_v1', blocks: 'present_timeblocks_v1' };

  const CATS = {
    wellbeing: { icon: 'leaf', color: '#8FBF6A' }, spirituality: { icon: 'cross', color: '#8E4568' },
    learning: { icon: 'grad', color: '#5F84A8' }, sport: { icon: 'dumbbell', color: '#F29B93' },
    productivity: { icon: 'briefcase', color: '#E8A800' }, health: { icon: 'heart', color: '#C0587A' },
    reading: { icon: 'book', color: '#3FA7A0' }, other: { icon: 'target', color: '#6B7A86' }
  };
  const catKey = (c = '') => {
    c = String(c).toLowerCase();
    const m = { health: 'health', santé: 'health', sante: 'health', wellness: 'wellbeing', 'bien-être': 'wellbeing', wellbeing: 'wellbeing', spirituality: 'spirituality', spiritualité: 'spirituality', sport: 'sport', reading: 'reading', lecture: 'reading', learning: 'learning', apprentissage: 'learning', productivity: 'productivity', productivité: 'productivity' };
    return m[c] || (CATS[c] ? c : 'other');
  };

  // Correspondance avec le skill HABBIT (clé "pillar") — noms FR/EN historiques conservés pour l'import
  const PILLAR_NAMES = {
    prayer_morning: ['morning prayer', 'prière du matin'], reading_ot: ['old testament reading', 'lecture ancien testament'],
    reading_nt: ['new testament reading', 'lecture nouveau testament'], verse_memorized: ['scripture memorization', 'mémorisation'],
    confession_aloud: ['scripture confession', 'confession à voix haute'], work_7_16: ['professional work', 'travail professionnel'],
    pause_13h: ['noon break', 'pause de midi'], study_night: ['night bible study', 'étude biblique du soir'],
    examen_obedient: ['evening examination', 'examen du soir'], writing_audio: ['writing / audio', 'écriture / audio']
  };
  const pillarOf = (h) => h.pillar || Object.keys(PILLAR_NAMES).find((k) => PILLAR_NAMES[k].includes(String(h.name).toLowerCase())) || '';

  const SEED = [
    ['Prière du matin', 'sparkle', 'spirituality', '', '03:00', 180, 'prayer_morning', 'time', 180, ''],
    ['Lecture — Ancien Testament', 'book', 'reading', '', '04:00', 0, 'reading_ot', 'count', 10, 'chapitres'],
    ['Lecture — Nouveau Testament', 'book', 'reading', '', '05:00', 0, 'reading_nt', 'count', 10, 'chapitres'],
    ['Mémorisation', 'bulb', 'spirituality', '1 verset', '06:00', 0, 'verse_memorized'],
    ['Confession à voix haute', 'mic', 'spirituality', 'À voix haute', '06:30', 0, 'confession_aloud'],
    ['Travail professionnel', 'briefcase', 'productivity', '7h – 16h', '07:00', 540, 'work_7_16'],
    ['Pause de midi', 'coffee', 'wellbeing', 'Pause 13h', '13:00', 0, 'pause_13h'],
    ['Étude biblique du soir', 'grad', 'spirituality', '', '20:00', 30, 'study_night', 'time', 30, ''],
    ['Écriture / Audio', 'pen', 'productivity', '1×/semaine', '20:30', 0, 'writing_audio'],
    ['Examen du soir', 'moon', 'wellbeing', '21:30', '21:30', 0, 'examen_obedient']
  ];

  let S = null;
  const subs = new Set();
  let saveQueued = false;
  let lastError = null;

  const blank = () => ({
    v: 2, habits: [], done: {}, vals: {}, notes: {}, spent: {}, tasks: [], tdone: {}, skip: {}, sub: {},
    settings: { lang: 'fr', theme: 'auto', reminders: true, name: '' },
    meta: { celebrated: '', seeded: false, notified: {} }
  });

  const QUICK = { count: [1, 5], time: [10, 30] };
  const mkHabit = (d, i = 0) => {
    const cat = catKey(d.category);
    const target = Math.max(0, Math.round((+d.target || 0) * 100) / 100);
    const type = (d.type === 'count' || d.type === 'time') && target > 0 ? d.type : 'check';
    const quick = (Array.isArray(d.quick) ? d.quick.map(Number).filter((n) => n > 0 && isFinite(n)).slice(0, 4) : []);
    const dur = type === 'time' ? Math.min(1440, Math.round(target)) : Math.min(1440, +d.dur || 0);
    return {
      id: d.id || U.id('h_'), name: (d.name || '').trim() || 'Habitude', icon: d.icon && Icons.has(d.icon) ? d.icon : CATS[cat].icon,
      color: d.color || CATS[cat].color, category: cat, goal: d.goal || '',
      days: Array.isArray(d.days) && d.days.length ? d.days.slice().sort() : [0, 1, 2, 3, 4, 5, 6],
      time: d.time || '', dur, remind: !!d.remind && !!d.time,
      type, target: type === 'check' ? 0 : target, unit: type === 'count' ? String(d.unit || '').trim().slice(0, 20) : type === 'time' ? 'min' : '',
      quick: type === 'check' ? [] : (quick.length ? quick : QUICK[type]), threshold: Math.max(10, Math.min(100, Math.round(+d.threshold || 100))),
      share: d.share !== false, why: String(d.why || '').trim().slice(0, 200),
      start: d.start || U.today(), archived: !!d.archived, archivedAt: d.archivedAt || '', pillar: d.pillar || '', order: d.order ?? i
    };
  };

  const read = (k, fb) => { try { const r = localStorage.getItem(k); return r === null ? fb : JSON.parse(r); } catch (e) { return fb; } };

  function migrateV1() {
    const oh = read(V1.habits, null);
    if (!Array.isArray(oh)) return null;
    const s = blank();
    const idMap = {};
    oh.forEach((h, i) => {
      const time = h.reminder || '';
      const nh = mkHabit({ id: h.id, name: h.name, category: h.category, goal: h.goal, time, remind: !!h.reminderEnabled, start: (h.createdAt || '').slice(0, 10) || U.today(), archived: h.active === false, archivedAt: U.today(), pillar: pillarOf(h) }, i);
      idMap[h.id] = nh.id; s.habits.push(nh);
    });
    (read(V1.done, []) || []).forEach((c) => {
      if (!idMap[c.habitId] || !c.date) return;
      (s.done[c.date] = s.done[c.date] || []).push(c.habitId);
      const h = s.habits.find((x) => x.id === c.habitId); if (h && c.date < h.start) h.start = c.date;
    });
    (read(V1.blocks, []) || []).forEach((b) => {
      const st = U.toMin(b.start), en = U.toMin(b.end);
      const days = (b.days || []).map((d) => (d + 6) % 7);
      const t = { id: b.id || U.id('t_'), title: b.title || 'Tâche', icon: Icons.has(b.icon) ? b.icon : 'clock', color: b.color || '#3E8E63', date: (b.createdAt || '').slice(0, 10) || U.today(), start: st, dur: en > st ? en - st : 30, repeat: days.length === 7 ? { type: 'daily' } : { type: 'custom', days }, notes: '', subtasks: [], remind: null };
      s.tasks.push(t);
      (b.doneDates || []).forEach((d) => { (s.tdone[d] = s.tdone[d] || []).push(t.id); });
    });
    const st = read(V1.settings, {});
    s.settings.theme = st.darkMode ? 'dark' : 'auto';
    s.settings.reminders = st.reminders !== false;
    s.meta.seeded = true;
    return s;
  }

  function seed(s) {
    SEED.forEach((x, i) => s.habits.push(mkHabit({ name: x[0], icon: x[1], category: x[2], goal: x[3], time: x[4], dur: x[5], pillar: x[6], remind: true, type: x[7], target: x[8], unit: x[9] }, i)));
    s.meta.seeded = true;
  }

  function load() {
    let s = read(KEY, null);
    if (!s || s.v !== 2) { s = migrateV1(); }
    if (!s) { s = blank(); seed(s); }
    const b = blank();
    S = { ...b, ...s, settings: { ...b.settings, ...(s.settings || {}) }, meta: { ...b.meta, ...(s.meta || {}) } };
    commit(true);
  }

  function commit(silent) {
    if (!saveQueued) {
      saveQueued = true;
      queueMicrotask(() => {
        saveQueued = false;
        try { localStorage.setItem(KEY, JSON.stringify(S)); lastError = null; } catch (e) { lastError = e; console.error('Stockage', e); window.dispatchEvent(new CustomEvent('present:storage-error')); }
      });
    }
    if (!silent) subs.forEach((f) => f());
  }

  const list = (map, d) => map[d] || [];
  const dropSpent = (kind, id) => Object.keys(S.spent).forEach((d) => { delete S.spent[d][kind + ':' + id]; if (!Object.keys(S.spent[d]).length) delete S.spent[d]; });
  const meas = (h) => !!h && (h.type === 'count' || h.type === 'time') && h.target > 0;
  const fmtVal = (h, v) => (h.type === 'time' ? (U.dur(Math.round(v)) || '0 min') : `${U.fmtNum(v)}${h.unit ? ' ' + h.unit : ''}`);
  // l'invariant : pour une habitude mesurée, « fait » (liste done) <=> valeur >= objectif
  const syncDone = (h, d) => {
    const v = (S.vals[d] || {})[h.id], a = S.done[d] || (S.done[d] = []), i = a.indexOf(h.id), full = v !== undefined && v >= h.target - 1e-9;
    if (full && i < 0) a.push(h.id); else if (!full && i >= 0) a.splice(i, 1);
    if (!a.length) delete S.done[d];
  };
  const toggleIn = (map, d, id) => {
    const a = map[d] || (map[d] = []); const i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    if (!a.length) delete map[d];
    return i < 0;
  };

  const Store = {
    on: (f) => { subs.add(f); return () => subs.delete(f); },
    get: () => S,
    get settings() { return S.settings; },
    get meta() { return S.meta; },
    setSettings(p) { Object.assign(S.settings, p); commit(); },
    setMeta(p) { Object.assign(S.meta, p); commit(true); },
    CATS, catKey,

    /* ---------- Habitudes ---------- */
    habit: (id) => S.habits.find((h) => h.id === id),
    activeHabits: () => S.habits.filter((h) => !h.archived),
    scheduled(h, d) {
      if (h.days.length && !h.days.includes(U.dow(d))) return false;
      if (d < h.start) return false;
      if (h.archived && d > (h.archivedAt || '9999')) return false;
      return true;
    },
    isDone: (id, d) => list(S.done, d).includes(id),
    meas, fmtVal,
    fmtTarget: (h) => (meas(h) ? fmtVal(h, h.target) : h.goal || ''),
    hasValue: (id, d) => !!S.vals[d] && id in S.vals[d],
    value: (id, d) => (S.vals[d] && S.vals[d][id]) || 0,
    note: (id, d) => (S.notes[d] && S.notes[d][id]) || '',
    // temps réellement passé (minuteur), par élément de timeline : kind = 'task' | 'habit'
    spent: (kind, id, d) => (S.spent[d] && S.spent[d][kind + ':' + id]) || 0,
    addSpent(kind, id, d, min) {
      min = Math.round(min); if (min <= 0) return;
      const m = S.spent[d] || (S.spent[d] = {}); m[kind + ':' + id] = (m[kind + ':' + id] || 0) + min; commit();
    },
    // progression d'un jour : 0..∞ (1 = objectif atteint). Sans valeur saisie : coché = 1.
    progress(h, d) {
      if (meas(h) && Store.hasValue(h.id, d)) return S.vals[d][h.id] / h.target;
      return Store.isDone(h.id, d) ? 1 : 0;
    },
    pct: (h, d) => Math.min(1, Store.progress(h, d)),
    // le jour compte pour la série ? (seuil réglable, 100 % par défaut)
    streakOk: (h, d) => (meas(h) ? Store.progress(h, d) >= (h.threshold || 100) / 100 - 1e-9 : Store.isDone(h.id, d)),
    setValue(id, d, v) {
      const h = Store.habit(id); if (!h || !meas(h)) return false;
      v = Math.max(0, Math.round((+v || 0) * 100) / 100);
      const m = S.vals[d] || (S.vals[d] = {});
      if (v === 0) { delete m[id]; if (!Object.keys(m).length) delete S.vals[d]; } else m[id] = v;
      syncDone(h, d); commit(); return Store.isDone(id, d);
    },
    addValue: (id, d, delta) => Store.setValue(id, d, Store.value(id, d) + delta),
    setNote(id, d, text) {
      text = String(text || '').trim().slice(0, 600); const m = S.notes[d] || (S.notes[d] = {});
      if (text) m[id] = text; else { delete m[id]; if (!Object.keys(m).length) delete S.notes[d]; }
      commit();
    },
    notesFor(id, n = 30) {
      return Object.keys(S.notes).filter((d) => S.notes[d][id]).sort().reverse().slice(0, n).map((d) => [d, S.notes[d][id]]);
    },
    habitsOn(d) {
      return S.habits.filter((h) => Store.scheduled(h, d) || Store.isDone(h.id, d))
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.order - b.order);
    },
    addHabit(d) { const h = mkHabit({ ...d, order: S.habits.length }); S.habits.push(h); commit(); return h; },
    updateHabit(id, p) {
      const h = Store.habit(id); if (!h) return null;
      const n = mkHabit({ ...h, ...p, id }); n.start = h.start; n.order = h.order; n.pillar = h.pillar;
      Object.assign(h, n);
      if (meas(h)) Object.keys(S.vals).forEach((d) => { if (id in S.vals[d]) syncDone(h, d); });   // l'objectif a changé : recalcul des jours déjà saisis
      commit(); return h;
    },
    setArchived(id, v) { const h = Store.habit(id); if (!h) return; h.archived = v; h.archivedAt = v ? U.today() : ''; commit(); },
    deleteHabit(id) {
      S.habits = S.habits.filter((h) => h.id !== id);
      Object.keys(S.done).forEach((d) => { S.done[d] = S.done[d].filter((x) => x !== id); if (!S.done[d].length) delete S.done[d]; });
      [S.vals, S.notes].forEach((m) => Object.keys(m).forEach((d) => { delete m[d][id]; if (!Object.keys(m[d]).length) delete m[d]; }));
      dropSpent('habit', id);
      commit();
    },
    toggleHabit(id, d) {
      const h = Store.habit(id);
      if (meas(h)) { const was = Store.isDone(id, d); Store.setValue(id, d, was ? 0 : h.target); return !was; }   // mesuré : un appui = objectif atteint / remise à zéro
      const on = toggleIn(S.done, d, id); commit(); return on;
    },

    /* ---------- Tâches (time blocks) ---------- */
    task: (id) => S.tasks.find((t) => t.id === id),
    isTaskDone: (id, d) => list(S.tdone, d).includes(id),
    occursOn(t, d) {
      if (!t.date || d < t.date) return false;
      const r = t.repeat || { type: 'none' };
      if (r.until && d > r.until) return false;
      if (list(S.skip, t.id).includes(d)) return false;
      switch (r.type) {
        case 'none': return d === t.date;
        case 'daily': return true;
        case 'weekdays': return U.dow(d) < 5;
        case 'weekly': return U.dow(d) === U.dow(t.date);
        case 'custom': return (r.days || []).includes(U.dow(d));
        default: return false;
      }
    },
    inbox: () => S.tasks.filter((t) => !t.date),
    addTask(d) {
      const t = { id: U.id('t_'), title: (d.title || '').trim() || 'Tâche', icon: d.icon || 'clock', color: d.color || '#5F84A8', date: d.date ?? null, start: d.start ?? null, dur: d.dur ?? 30, repeat: d.repeat || { type: 'none' }, notes: d.notes || '', subtasks: d.subtasks || [], remind: d.remind ?? null };
      if (t.start === null && t.date === null) t.dur = 0;
      S.tasks.push(t); commit(); return t;
    },
    updateTask(id, p) { const t = Store.task(id); if (!t) return null; Object.assign(t, p); commit(); return t; },
    deleteTask(id, scope, d) {
      if (scope === 'one' && d) { (S.skip[id] = S.skip[id] || []).push(d); }
      else {
        S.tasks = S.tasks.filter((t) => t.id !== id); delete S.skip[id]; dropSpent('task', id);
        Object.keys(S.tdone).forEach((x) => { S.tdone[x] = S.tdone[x].filter((i) => i !== id); if (!S.tdone[x].length) delete S.tdone[x]; });
      }
      commit();
    },
    toggleTask(id, d) { const on = toggleIn(S.tdone, d, id); commit(); return on; },
    duplicateTask(id) { const t = Store.task(id); if (!t) return null; const c = JSON.parse(JSON.stringify(t)); c.id = U.id('t_'); c.title += ' (copie)'; c.subtasks.forEach((s) => (s.id = U.id('s_'))); S.tasks.push(c); commit(); return c; },
    subDone: (d, id) => S.sub[d + '|' + id] || [],
    toggleSub(d, id, sid) { const k = d + '|' + id; const a = S.sub[k] || (S.sub[k] = []); const i = a.indexOf(sid); if (i >= 0) a.splice(i, 1); else a.push(sid); commit(); },

    /* Éléments de la timeline d'un jour (tâches + habitudes planifiées), triés */
    itemsOn(d) {
      const out = [];
      S.tasks.forEach((t) => {
        if (!t.date || !Store.occursOn(t, d)) return;
        out.push({ kind: 'task', id: t.id, title: t.title, icon: t.icon, color: t.color, start: t.start, dur: t.dur || 0, done: Store.isTaskDone(t.id, d), spent: Store.spent('task', t.id, d), repeat: (t.repeat || {}).type !== 'none', remind: t.remind, raw: t, date: d });
      });
      Store.habitsOn(d).forEach((h) => {
        const st = U.toMin(h.time);
        out.push({ kind: 'habit', id: h.id, title: h.name, icon: h.icon, color: h.color, start: st, dur: h.dur || 0, done: Store.isDone(h.id, d), val: Store.value(h.id, d), spent: Store.spent('habit', h.id, d), repeat: h.days.length > 0, remind: h.remind ? 0 : null, raw: h, date: d, noTimeline: st === null });
      });
      return out.filter((x) => !x.noTimeline).sort((a, b) => (a.start ?? -1) - (b.start ?? -1) || a.title.localeCompare(b.title));
    },

    /* ---------- Données ---------- */
    firstDate() {
      const ds = [...S.habits.map((h) => h.start), ...Object.keys(S.done)];
      return ds.length ? ds.sort()[0] : U.today();
    },
    export() {
      const completions = [];
      Object.keys(S.done).forEach((date) => S.done[date].forEach((habitId) => completions.push({ habitId, date })));
      const entries = [];   // valeurs partielles et notes (en plus de « completions » = jours réussis, compatible avec les scripts)
      new Set([...Object.keys(S.vals), ...Object.keys(S.notes)]).forEach((date) => {
        new Set([...Object.keys(S.vals[date] || {}), ...Object.keys(S.notes[date] || {})]).forEach((habitId) => {
          const e = { habitId, date }; if (S.vals[date] && habitId in S.vals[date]) e.value = S.vals[date][habitId]; if (S.notes[date] && S.notes[date][habitId]) e.note = S.notes[date][habitId]; entries.push(e);
        });
      });
      const spent = [];
      Object.keys(S.spent).forEach((date) => Object.entries(S.spent[date]).forEach(([k, minutes]) => { const i = k.indexOf(':'); spent.push({ kind: k.slice(0, i), id: k.slice(i + 1), date, minutes }); }));
      return { app: 'present', version: 2, exportedAt: new Date().toISOString(), habits: S.habits, completions, entries, spent, tasks: S.tasks, taskDone: S.tdone, skip: S.skip, sub: S.sub, settings: S.settings };
    },
    isPristine: () => !S.tasks.length && !Object.keys(S.done).length && !Object.keys(S.tdone).length,
    import(data, opt = {}) {
      if (!data || !Array.isArray(data.habits)) throw new Error('invalid');
      const s = blank();
      s.settings = opt.keepSettings ? { ...S.settings } : { ...s.settings, ...(data.settings || {}) };
      data.habits.forEach((h, i) => {
        const isV1 = h.reminderEnabled !== undefined || h.active !== undefined;
        s.habits.push(mkHabit(isV1 ? { id: h.id, name: h.name, category: h.category, goal: h.goal, time: h.reminder || '', remind: !!h.reminderEnabled, start: (h.createdAt || '').slice(0, 10), archived: h.active === false, archivedAt: U.today(), pillar: pillarOf(h) } : h, i));
      });
      (data.completions || []).forEach((c) => {
        if (!c.date || !s.habits.some((h) => h.id === c.habitId)) return;
        const a = s.done[c.date] || (s.done[c.date] = []);
        if (!a.includes(c.habitId)) a.push(c.habitId);
        const h = s.habits.find((x) => x.id === c.habitId); if (c.date < h.start) h.start = c.date;
      });
      (data.entries || []).forEach((e) => {
        const h = s.habits.find((x) => x.id === e.habitId); if (!h || !e.date) return;
        if (e.value !== undefined && e.value !== null) (s.vals[e.date] = s.vals[e.date] || {})[h.id] = +e.value;
        if (e.note) (s.notes[e.date] = s.notes[e.date] || {})[h.id] = String(e.note);
        if (e.date < h.start) h.start = e.date;
      });
      (data.spent || []).forEach((e) => { if (e && e.date && e.id && e.minutes > 0) (s.spent[e.date] = s.spent[e.date] || {})[e.kind + ':' + e.id] = +e.minutes; });
      s.tasks = Array.isArray(data.tasks) ? data.tasks : []; s.tdone = data.taskDone || {}; s.skip = data.skip || {}; s.sub = data.sub || {};
      s.meta = { ...s.meta, ...S.meta, seeded: true }; S = s;
      S.habits.filter(meas).forEach((h) => Object.keys(S.vals).forEach((d) => { if (h.id in S.vals[d]) syncDone(h, d); }));
      commit();
    },
    importHabbit(progress) {
      let n = 0;
      const byPillar = {}; S.habits.forEach((h) => { const p = pillarOf(h); if (p) byPillar[p] = h; });
      (progress.days || []).forEach((day) => {
        Object.entries(day.pillars || {}).forEach(([p, v]) => {
          const h = byPillar[p]; if (!h || !v || !v.done) return;
          const a = S.done[day.date] || (S.done[day.date] = []);
          if (!a.includes(h.id)) {
            a.push(h.id); n++; if (day.date < h.start) h.start = day.date;
            if (meas(h)) (S.vals[day.date] = S.vals[day.date] || {})[h.id] = h.target;
          }
        });
      });
      if (n) commit(); return n;
    },
    resetDay(d) { delete S.done[d]; delete S.tdone[d]; delete S.vals[d]; commit(); },
    resetAll() { S = blank(); commit(); },
    error: () => lastError
  };

  /* ================= Statistiques ================= */
  const Stats = {
    day(d) {
      const hs = Store.habitsOn(d); let done = 0, ok = 0, score = 0;
      hs.forEach((h) => { if (Store.isDone(h.id, d)) done++; if (Store.streakOk(h, d)) ok++; score += Store.pct(h, d); });
      return { done, ok, total: hs.length, score, pct: hs.length ? Math.round((score / hs.length) * 100) : 0 };
    },
    range(from, to) { // inclusif — la régularité pondère les jours partiels (5/10 pages = 50 %)
      let done = 0, total = 0, score = 0; const days = [];
      for (let d = from; d <= to; d = U.add(d, 1)) { const s = Stats.day(d); done += s.done; total += s.total; score += s.score; days.push({ date: d, ...s }); }
      return { done, total, score, pct: total ? Math.round((score / total) * 100) : 0, days };
    },
    streak() {
      const today = U.today(), first = Store.firstDate(); let n = 0;
      for (let d = today; d >= first; d = U.add(d, -1)) {
        const s = Stats.day(d);
        if (!s.total) continue;
        if (s.ok === s.total) n++; else if (d !== today) break;
      }
      return n;
    },
    best() {
      const today = U.today(); let best = 0, cur = 0;
      for (let d = Store.firstDate(); d <= today; d = U.add(d, 1)) {
        const s = Stats.day(d); if (!s.total) continue;
        if (s.ok === s.total) { cur++; best = Math.max(best, cur); } else if (d !== today) cur = 0;
      }
      return best;
    },
    habit(h) {
      const today = U.today(), first = Store.firstDate(); let streak = 0, best = 0, cur = 0, total = 0;
      for (let d = h.start < first ? h.start : first; d <= today; d = U.add(d, 1)) {
        if (Store.streakOk(h, d)) { cur++; best = Math.max(best, cur); if (Store.isDone(h.id, d)) total++; }
        else if (Store.scheduled(h, d) && d !== today) cur = 0;
      }
      for (let d = today; d >= h.start; d = U.add(d, -1)) {
        if (Store.streakOk(h, d)) streak++;
        else if (Store.scheduled(h, d) && d !== today) break;
      }
      let sch = 0, sc = 0, sum = 0, bestVal = 0;
      for (let d = U.add(today, -29); d <= today; d = U.add(d, 1)) {
        const inc = Store.scheduled(h, d) || Store.isDone(h.id, d) || Store.hasValue(h.id, d);
        if (inc) { sch++; sc += Store.pct(h, d); }
        const v = Store.value(h.id, d); sum += v; bestVal = Math.max(bestVal, v);
      }
      return { streak, best, total, rate: sch ? Math.round((sc / sch) * 100) : 0, sum30: Math.round(sum * 100) / 100, avg30: sch ? Math.round((sum / sch) * 100) / 100 : 0, bestVal };
    },
    // temps prévu vs réalisé : le minuteur (temps réel) prime ; sans minuteur, un élément terminé compte pour sa durée prévue
    actual(it, d) { const sp = Store.spent(it.kind, it.id, d); return sp > 0 ? sp : (it.done ? it.dur || 0 : 0); },
    time(from, to) {
      let planned = 0, done = 0, tasks = 0, tasksDone = 0, tracked = 0; const colors = {};
      for (let d = from; d <= to; d = U.add(d, 1)) {
        Store.itemsOn(d).forEach((it) => {
          if (it.kind === 'task') { tasks++; if (it.done) tasksDone++; }
          if (it.dur) planned += it.dur;
          const a = Stats.actual(it, d); if (!a) return;
          done += a; colors[it.color] = (colors[it.color] || 0) + a; if (Store.spent(it.kind, it.id, d) > 0) tracked += Store.spent(it.kind, it.id, d);
        });
      }
      return { planned, done, tasks, tasksDone, colors, tracked };
    },
    byWeekday(from, to) {
      const a = Array.from({ length: 7 }, () => ({ d: 0, t: 0 }));
      for (let d = from; d <= to; d = U.add(d, 1)) { const s = Stats.day(d); const w = a[U.dow(d)]; w.d += s.done; w.t += s.total; }
      return a.map((x) => U.pct(x.d, x.t));
    },
    MILESTONES: [3, 7, 14, 21, 30, 60, 100, 180, 365],
    nextMilestone(streak) { return Stats.MILESTONES.find((m) => m > streak) || streak + 100; }
  };

  load();
  window.Store = Store;
  window.Stats = Stats;
})();
