/* Present — Coach : propositions « Accepter », examen guidé audio, versets à mémoriser */
(function () {
  const Coach = window.CoachView, esc = U.esc, { Player, Preview } = Coach;
  const L2 = {
    fr: {
      accept: 'Accepter', dismiss: 'Ignorer', undo: 'Annuler', accepted: 'Appliqué', dismissed: 'Ignoré', applied: 'Appliqué à ton planning', missing: 'Élément introuvable',
      gdStart: 'Commencer l’examen', gdSettle: 'Écoute', gdPause: 'Silence', gdDone: 'Examen terminé', gdPaused: 'En pause', gdHabit: 'Valider « {h} »', gdHabitDone: 'Habitude « {h} » déjà validée', gdTake: 'Prends ce temps…', gdPrev: 'Étape précédente', gdNext: 'Étape suivante', gdAgain: 'Recommencer',
      vTitle: 'Verset du jour', vNone: 'Aucun verset pour l’instant', vNoneSub: 'Ajoute un verset à mémoriser : le coach t’aide à le réviser au bon rythme.', vAdd: 'Ajouter un verset', vDoneToday: 'Rien à réviser aujourd’hui', vNext: 'Prochaine révision {d}', vMine: 'Mes versets',
      vRead: 'Lire', vFill: 'Compléter', vRecite: 'Réciter', vHide: 'Cacher plus', vReveal: 'Révéler', vListen: 'Écouter', vOk: 'Je l’ai su', vHard: 'Difficile', vFail: 'À revoir', vHow: 'Comment ça s’est passé ?', vTap: 'Touche un mot caché pour le révéler.',
      vReciteHint: 'Récite le verset à voix haute, puis révèle-le pour vérifier.', vLinked: 'Relié à l’habitude « {h} »', vLinkedDone: 'validée aujourd’hui', vNoHabit: 'Astuce : crée une habitude « Mémorisation » pour la relier.', vHabitOn: 'Habitude « {h} » validée',
      vBox: 'Boîte {n}/5', vMastered: 'Maîtrisé', vToday: 'aujourd’hui', vTomorrow: 'demain', vIn: 'dans {n} j', vLate: 'en retard', vDel: 'Supprimer ce verset ?', vSug: 'Suggestions', vOwn: 'Mon verset', vRef: 'Référence', vRefPh: 'Ex. Psaume 119:11', vText: 'Texte', vTextPh: 'Écris ou colle le verset (ta traduction préférée)', vSave: 'Ajouter', vAdded: 'Verset ajouté', vCheck: 'Textes : Louis Segond 1910 / King James (domaine public). Vérifie toujours dans ta Bible.', vAlready: 'Déjà ajouté', vLang: 'Langue',
      vErr: 'Référence et texte requis', vAudioErr: 'Audio indisponible'
    },
    en: {
      accept: 'Accept', dismiss: 'Dismiss', undo: 'Undo', accepted: 'Applied', dismissed: 'Dismissed', applied: 'Applied to your schedule', missing: 'Item not found',
      gdStart: 'Start the examen', gdSettle: 'Listening', gdPause: 'Silence', gdDone: 'Examen complete', gdPaused: 'Paused', gdHabit: 'Check off “{h}”', gdHabitDone: 'Habit “{h}” already done', gdTake: 'Take this time…', gdPrev: 'Previous step', gdNext: 'Next step', gdAgain: 'Start over',
      vTitle: 'Verse of the day', vNone: 'No verse yet', vNoneSub: 'Add a verse to memorize: your coach helps you review it at the right pace.', vAdd: 'Add a verse', vDoneToday: 'Nothing to review today', vNext: 'Next review {d}', vMine: 'My verses',
      vRead: 'Read', vFill: 'Fill in', vRecite: 'Recite', vHide: 'Hide more', vReveal: 'Reveal', vListen: 'Listen', vOk: 'I knew it', vHard: 'Hard', vFail: 'Review again', vHow: 'How did it go?', vTap: 'Tap a hidden word to reveal it.',
      vReciteHint: 'Say the verse aloud, then reveal it to check.', vLinked: 'Linked to the “{h}” habit', vLinkedDone: 'done today', vNoHabit: 'Tip: create a “Memorization” habit to link it.', vHabitOn: 'Habit “{h}” done',
      vBox: 'Box {n}/5', vMastered: 'Mastered', vToday: 'today', vTomorrow: 'tomorrow', vIn: 'in {n} d', vLate: 'overdue', vDel: 'Delete this verse?', vSug: 'Suggestions', vOwn: 'My verse', vRef: 'Reference', vRefPh: 'E.g. Psalm 119:11', vText: 'Text', vTextPh: 'Type or paste the verse (your preferred translation)', vSave: 'Add', vAdded: 'Verse added', vCheck: 'Texts: Louis Segond 1910 / King James (public domain). Always double-check in your Bible.', vAlready: 'Already added', vLang: 'Language',
      vErr: 'Reference and text required', vAudioErr: 'Audio unavailable'
    }
  };
  const t = (k, v) => { let s = (L2[I18n.lang] || L2.fr)[k] ?? L2.fr[k] ?? k; if (v) for (const x in v) s = s.replaceAll('{' + x + '}', v[x]); return s; };
  const habitFor = (re, pillar) => Store.get().habits.find((h) => !h.archived && (h.pillar === pillar || re.test(h.name)));
  const find = (mid) => Coach.msgs.find((m) => m.id === mid);
  const post = (path, body) => Coach.api(path, { method: 'POST', body: JSON.stringify(body) }, 60000);

  /* ======================================================== propositions d'ajustements */
  const undo = {};
  Coach.propHtml = (m) => {
    if (!m.proposals || !m.proposals.length) return '';
    return `<div class="pr">${m.proposals.map((p) => `<div class="pr__i pr__i--${p.status}" data-mid="${m.id}" data-pid="${p.id}">
      <div class="pr__t">${Icons.i(p.type === 'create_task' ? 'plus' : 'clock', 18, 2.4)}<div><b>${esc(p.label)}</b>${p.why ? `<small>${esc(p.why)}</small>` : ''}</div></div>
      <div class="pr__b">${p.status === 'pending' ? `<button type="button" class="btn btn--primary btn--sm" data-act="pr-accept">${t('accept')}</button><button type="button" class="btn btn--soft btn--sm" data-act="pr-dismiss">${t('dismiss')}</button>`
        : p.status === 'accepted' ? `<span class="tag tag--g">✓ ${t('accepted')}</span>${undo[p.id] ? `<button type="button" class="link" data-act="pr-undo">${t('undo')}</button>` : ''}` : `<span class="tag">${t('dismissed')}</span>`}</div></div>`).join('')}</div>`;
  };
  // exécute la proposition sur les données locales (l'app reste l'unique écrivain de db.json) et renvoie l'inverse
  Coach.apply = (p) => {
    const a = p.args;
    if (p.type === 'create_task') {
      const tk = Store.addTask({ title: a.title, icon: 'clock', color: '#F29B93', date: a.date, start: U.toMin(a.time), dur: a.dur });
      return { undo: () => Store.deleteTask(tk.id, 'all') };
    }
    if (p.type === 'move_task') {
      const tk = Store.task(a.task_id); if (!tk) return null;
      const prev = { start: tk.start, date: tk.date };
      Store.updateTask(tk.id, { start: U.toMin(a.time), ...(a.date ? { date: a.date } : {}) });
      return { undo: () => Store.updateTask(tk.id, prev) };
    }
    if (p.type === 'move_habit') {
      const h = Store.habit(a.habit_id); if (!h) return null;
      const prev = h.time; Store.updateHabit(h.id, { time: a.time });
      return { undo: () => Store.updateHabit(h.id, { time: prev }) };
    }
    return null;
  };
  const setStatus = async (el, status) => {
    const row = el.closest('.pr__i'), m = find(row.dataset.mid), p = m && m.proposals.find((x) => x.id === row.dataset.pid); if (!p) return null;
    p.status = status; Coach.paintList(true);
    post('proposal', { id: m.id, pid: p.id, status }).catch(() => {});
    return p;
  };
  Object.assign(Coach.acts, {
    'pr-accept': (el) => {
      const row = el.closest('.pr__i'), m = find(row.dataset.mid), p = m && m.proposals.find((x) => x.id === row.dataset.pid); if (!p) return;
      const r = Coach.apply(p); if (!r) return UI.toast(t('missing'));
      undo[p.id] = r.undo; UI.haptic(12); setStatus(el, 'accepted');
      UI.toast(t('applied'), { icon: 'check', label: t('undo'), action: () => { r.undo(); delete undo[p.id]; p.status = 'pending'; post('proposal', { id: m.id, pid: p.id, status: 'pending' }); Coach.paintList(true); } });
    },
    'pr-dismiss': (el) => setStatus(el, 'dismissed'),
    'pr-undo': (el) => { const row = el.closest('.pr__i'), pid = row.dataset.pid; if (undo[pid]) { undo[pid](); delete undo[pid]; setStatus(el, 'pending'); } }
  });

  /* ======================================================== examen guidé (étapes audio + silences) */
  const G = { id: null, i: 0, phase: 'idle', until: 0, left: 0, paused: false, timer: 0, wake: null, lastPaint: 0 };
  const stepAudio = (m, i) => `./api/coach/audio/${encodeURIComponent(m.steps[i].audio.file)}${Sync.token ? '?token=' + encodeURIComponent(Sync.token) : ''}`;
  const cur = () => find(G.id);
  const hab = () => habitFor(/exam/i, 'examen_obedient');
  const habDone = () => { const h = hab(); return !!(h && Store.isDone(h.id, U.today())); };

  Coach.guideInner = (m) => {
    const act = G.id === m.id, n = m.steps.length, i = act ? G.i : 0, phase = act ? G.phase : 'idle';
    const prog = phase === 'speak' && Player.a.duration ? Player.a.currentTime / Player.a.duration : phase === 'pause' ? 1 - Math.max(0, (G.paused ? G.left : G.until - Date.now())) / (m.steps[i].pause * 1000 || 1) : phase === 'done' ? 1 : 0;
    const remain = Math.ceil(Math.max(0, G.paused ? G.left : G.until - Date.now()) / 1000);
    const sub = phase === 'speak' ? (G.paused ? t('gdPaused') : t('gdSettle') + ' · ' + Coach.fmtT(Player.a.currentTime)) : phase === 'pause' ? (G.paused ? t('gdPaused') : t('gdPause') + ' · ' + Coach.fmtT(remain)) : phase === 'done' ? t('gdDone') : `${n} · ${Coach.fmtT(m.steps.reduce((s, x) => s + (x.audio ? x.audio.dur : 0) + x.pause, 0))}`;
    const playing = (phase === 'speak' || phase === 'pause') && !G.paused;
    const h = hab();
    return `<div class="gd__dots">${m.steps.map((s, k) => `<i class="${phase === 'done' || k < i ? 'done' : k === i && phase !== 'idle' ? 'on' : ''}" title="${esc(s.title)}"></i>`).join('')}</div>
      <div class="gd__now"><b>${phase === 'idle' ? esc(t('gdStart')) : phase === 'done' ? esc(t('gdDone')) : `${i + 1}/${n} · ${esc(m.steps[i].title)}`}</b><span>${esc(sub)}</span>${phase === 'pause' && !G.paused ? `<em>${esc(t('gdTake'))}</em>` : ''}</div>
      <div class="gd__bar ${phase === 'pause' ? 'gd__bar--p' : ''}"><i style="width:${Math.round(prog * 100)}%"></i></div>
      <div class="gd__ctl"><button type="button" class="gd__b" data-act="gd-prev" aria-label="${t('gdPrev')}" ${phase === 'idle' || phase === 'done' ? 'disabled' : ''}>${Icons.i('prev', 22)}</button>
        <button type="button" class="gd__play" data-act="gd-play" aria-label="${playing ? 'Pause' : 'Play'}">${Icons.i(playing ? 'pause' : phase === 'done' ? 'repeat' : 'play', 26)}</button>
        <button type="button" class="gd__b" data-act="gd-skip" aria-label="${t('gdNext')}" ${phase === 'idle' || phase === 'done' ? 'disabled' : ''}>${Icons.i('next', 22)}</button></div>
      ${phase === 'done' && h ? (habDone() ? `<p class="gd__ok">✓ ${esc(t('gdHabitDone', { h: h.name }))}</p>` : `<button type="button" class="btn btn--primary btn--full" data-act="gd-habit">${Icons.i('check', 18, 3)} ${esc(t('gdHabit', { h: h.name }))}</button>`) : ''}`;
  };
  Coach.guideHtml = (m) => {
    if (!m.steps.every((s) => s.audio)) return `<div class="sm__noaudio">${m.error ? esc(m.error) : ''}<button type="button" class="btn btn--soft btn--sm" data-act="co-regen" data-id="${m.id}">${Icons.i('mic', 16)} ${Coach.c('retryAudio')}</button></div>`;
    return `<div class="gd" data-id="${m.id}">${Coach.guideInner(m)}</div>`;
  };
  G.paint = (force) => {
    const m = cur(); if (!m) return; if (!force && Date.now() - G.lastPaint < 400) return; G.lastPaint = Date.now();
    document.querySelectorAll(`.gd[data-id="${m.id}"]`).forEach((el) => { el.innerHTML = Coach.guideInner(m); });
  };
  G.session = (m) => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${m.steps[G.i].title}`, artist: m.title || 'Examen', album: 'Present · Coach', artwork: [{ src: 'assets/images/app-icon-512.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.setActionHandler('play', G.toggle); navigator.mediaSession.setActionHandler('pause', G.toggle);
      navigator.mediaSession.setActionHandler('nexttrack', G.skip); navigator.mediaSession.setActionHandler('previoustrack', G.prev);
    } catch (e) { /* non supporté */ }
  };
  G.lock = async (on) => { try { if (on && 'wakeLock' in navigator && !G.wake) G.wake = await navigator.wakeLock.request('screen'); if (!on && G.wake) { await G.wake.release(); G.wake = null; } } catch (e) { G.wake = null; } };
  G.load = () => {
    const m = cur(); if (!m) return; clearInterval(G.timer);
    G.phase = 'speak'; G.paused = false; Player.id = null;
    Player.a.src = stepAudio(m, G.i); Player.a.playbackRate = Player.rate; Player.a.play().catch(() => { G.paused = true; G.paint(true); });
    G.session(m); G.lock(true); G.paint(true);
  };
  G.start = (m, i = 0) => { Preview.stop(); Player.a.pause(); G.id = m.id; G.i = i; G.load(); };
  G.halt = () => { if (G.phase === 'idle') return; clearInterval(G.timer); const m = cur(); G.phase = 'idle'; G.paused = false; G.lock(false); m && G.paint(true); G.id = null; };
  G.next = () => {
    const m = cur(); if (!m) return; clearInterval(G.timer);
    if (G.i + 1 >= m.steps.length) { G.phase = 'done'; Player.a.pause(); G.lock(false); G.paint(true); return; }
    G.i++; G.load();
  };
  G.prev = () => { if (G.phase === 'idle' || G.phase === 'done') return; G.i = Math.max(0, G.i - 1); G.load(); };
  G.skip = () => { if (G.phase === 'idle' || G.phase === 'done') return; Player.a.pause(); G.next(); };
  G.toggle = () => {
    const m = cur();
    if (!m || G.phase === 'idle') return;
    if (G.phase === 'done') { G.i = 0; return G.load(); }
    if (G.phase === 'speak') { if (G.paused) { G.paused = false; Player.a.play(); } else { G.paused = true; Player.a.pause(); } }
    else if (G.phase === 'pause') { if (G.paused) { G.paused = false; G.until = Date.now() + G.left; } else { G.paused = true; G.left = Math.max(0, G.until - Date.now()); } }
    G.paint(true);
  };
  Player.a.addEventListener('ended', () => {            // fin de la voix d'une étape → silence guidé (ou étape suivante)
    const m = cur(); if (!m || G.phase !== 'speak') return;
    const p = m.steps[G.i].pause;
    if (p > 0) { G.phase = 'pause'; G.until = Date.now() + p * 1000; clearInterval(G.timer); G.timer = setInterval(() => { if (!G.paused && Date.now() >= G.until) G.next(); else G.paint(); }, 250); G.paint(true); }
    else G.next();
  });
  Player.a.addEventListener('timeupdate', () => { if (G.phase === 'speak') G.paint(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (G.phase === 'speak' || G.phase === 'pause') && !G.paused) { G.lock(true); G.paint(true); } });
  window.CoachGuide = G;
  Object.assign(Coach.acts, {
    'gd-play': (el) => { const m = find(el.closest('.gd').dataset.id); if (!m) return; if (G.id === m.id && G.phase !== 'idle') G.toggle(); else G.start(m); },
    'gd-skip': () => G.skip(), 'gd-prev': () => G.prev(),
    'gd-habit': () => { const h = hab(); if (h && !habDone()) App.toggleItem({ kind: 'habit', id: h.id, date: U.today() }); G.paint(true); }
  });

  /* ======================================================== versets à mémoriser (révision espacée) */
  const V = { data: null, sel: null, mode: 'read', level: 0, shown: new Set(), recite: false, busy: false };
  Coach.vs = V;
  const hashN = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const cur_ = () => { if (!V.data) return null; return V.data.verses.find((v) => v.id === V.sel) || V.data.due || null; };
  const dueLbl = (v) => {
    if (v.mastered && v.due > V.data.today) return t('vMastered');
    const d = U.diff(v.due, V.data.today); return d < 0 ? t('vLate') : d === 0 ? t('vToday') : d === 1 ? t('vTomorrow') : t('vIn', { n: d });
  };
  const dots = (v) => `<span class="vs__dots" aria-label="${t('vBox', { n: v.box })}">${[1, 2, 3, 4, 5].map((n) => `<i class="${v.box >= n ? 'on' : ''}"></i>`).join('')}</span>`;

  Coach.verseHtml = () => {
    if (!V.data) return `<div class="sk" style="margin-top:20px"><i></i><i></i><i style="width:60%"></i></div>`;
    const h = habitFor(/m[ée]mor/i, 'verse_memorized'), v = cur_(), vs = V.data.verses;
    const link = h ? `<p class="vs__link">${Icons.i('check', 14, 3)} ${esc(t('vLinked', { h: h.name }))}${Store.isDone(h.id, U.today()) ? ' · ' + t('vLinkedDone') : ''}</p>` : `<p class="vs__link muted">${esc(t('vNoHabit'))}</p>`;
    let main;
    if (!vs.length) main = `<div class="empty">${Icons.i('book', 40, 1.4)}<h3>${t('vNone')}</h3><p>${t('vNoneSub')}</p><button class="btn btn--primary" type="button" data-act="vs-add">${Icons.i('plus', 18, 2.5)} ${t('vAdd')}</button></div>`;
    else if (!v) { const nxt = vs.filter((x) => !x.mastered).sort((a, b) => a.due.localeCompare(b.due))[0]; main = `<div class="card vs__card vs__card--idle">${Icons.i('check', 34, 2.4)}<h3>${t('vDoneToday')}</h3>${nxt ? `<p class="muted">${t('vNext', { d: dueLbl(nxt) })} · ${esc(nxt.ref)}</p>` : ''}</div>`; }
    else main = Coach.verseCard(v);
    return `${main}${link}
      <div class="sec-hd"><h2>${t('vMine')}</h2><button type="button" class="link" data-act="vs-add">${Icons.i('plus', 14, 2.6)} ${t('vAdd')}</button></div>
      <div class="stack">${vs.map((x) => `<div class="vs__row${v && x.id === v.id ? ' on' : ''}"><button type="button" class="vs__pick" data-act="vs-pick" data-id="${x.id}"><b>${esc(x.ref)}</b><small>${dots(x)} ${esc(dueLbl(x))}${x.lang !== I18n.lang ? ' · ' + x.lang.toUpperCase() : ''}</small></button><button type="button" class="icon-btn" data-act="vs-del" data-id="${x.id}" aria-label="${t('vDel')}">${Icons.i('trash', 18)}</button></div>`).join('')}</div>`;
  };
  Coach.verseCard = (v) => {
    const words = v.text.split(' '), n = words.length;
    const order = words.map((_, i) => i).sort((a, b) => hashN(v.id + a) - hashN(v.id + b));
    const hide = new Set(order.slice(0, Math.round((V.level / 100) * n)));
    let body;
    if (V.mode === 'recite' && !V.recite) body = `<p class="vs__hint">${esc(t('vReciteHint'))}</p><button type="button" class="btn btn--soft btn--full" data-act="vs-reveal">${Icons.i('eye', 18)} ${t('vReveal')}</button>`;
    else if (V.mode === 'fill') body = `<p class="vs__t">${words.map((w, i) => hide.has(i) && !V.shown.has(i) ? `<button type="button" class="cz" data-act="vs-word" data-i="${i}" aria-label="•">${'•'.repeat(Math.max(2, Math.min(w.length, 9)))}</button>` : esc(w)).join(' ')}</p>
      <div class="vs__lv"><span class="muted small">${t('vTap')}</span><button type="button" class="chip" data-act="vs-level">${Icons.i('eye', 15)} ${t('vHide')} · ${V.level}%</button></div>`;
    else body = `<p class="vs__t">${esc(v.text)}</p>`;
    return `<div class="card vs__card"><div class="vs__hd"><span class="tag tag--g">${t('vTitle')}</span>${dots(v)}</div><h2 class="vs__ref">${esc(v.ref)}</h2>
      ${UI.seg('vsmode', [['read', t('vRead')], ['fill', t('vFill')], ['recite', t('vRecite')]], V.mode).replace(/data-v="(\w+)"/g, 'data-act="vs-mode" data-v="$1"')}
      ${body}
      <button type="button" class="btn btn--soft btn--full vs__listen" data-act="vs-audio" data-id="${v.id}">${Icons.i('play', 18)} ${t('vListen')}</button>
      <p class="vs__how">${t('vHow')}</p>
      <div class="vs__grade"><button type="button" class="btn vs__g vs__g--ok" data-act="vs-grade" data-r="ok">${Icons.i('check', 18, 3)} ${t('vOk')}</button><button type="button" class="btn vs__g" data-act="vs-grade" data-r="hard">${t('vHard')}</button><button type="button" class="btn vs__g vs__g--fail" data-act="vs-grade" data-r="fail">${Icons.i('repeat', 16)} ${t('vFail')}</button></div></div>`;
  };
  Coach.verseMount = () => { Coach.loadVerses(); };
  Coach.loadVerses = async () => {
    try { const r = await Coach.api('verses'); if (r.status === 200) { V.data = r.json; if (V.sel && !V.data.verses.some((x) => x.id === V.sel)) V.sel = null; } } catch (e) { /* hors-ligne */ }
    Coach.paintVerse();
  };
  Coach.paintVerse = () => { const el = document.getElementById('vs'); if (el) el.innerHTML = Coach.verseHtml(); };
  const reset = () => { V.level = 0; V.shown = new Set(); V.recite = false; };

  Object.assign(Coach.acts, {
    'vs-mode': (el) => { V.mode = el.dataset.v; reset(); if (V.mode === 'fill') V.level = 50; Coach.paintVerse(); },
    'vs-level': () => { V.level = V.level >= 100 ? 0 : V.level + 25; V.shown = new Set(); Coach.paintVerse(); },
    'vs-word': (el) => { V.shown.add(+el.dataset.i); Coach.paintVerse(); },
    'vs-reveal': () => { V.recite = true; Coach.paintVerse(); },
    'vs-pick': (el) => { V.sel = el.dataset.id; reset(); Coach.paintVerse(); window.scrollTo?.(0, 0); document.getElementById('view').scrollTo({ top: 0, behavior: 'smooth' }); },
    'vs-add': () => Coach.verseAdd(),
    'vs-del': async (el) => { if (await UI.confirm({ title: t('vDel'), ok: T('btn.delete'), danger: true })) { await post('verse', { action: 'delete', id: el.dataset.id }); Coach.loadVerses(); Coach.poll(); } },
    'vs-audio': async (el) => {
      if (V.busy) return; V.busy = true; el.classList.add('busy'); Player.a.pause(); G.halt();
      try { const r = await post('verse', { action: 'audio', id: el.dataset.id }); if (r.status !== 200) throw new Error(r.json.error || t('vAudioErr')); Preview.a.src = r.json.url + (Sync.token ? '?token=' + encodeURIComponent(Sync.token) : ''); await Preview.a.play(); }
      catch (e) { UI.toast(String(e.message || t('vAudioErr')), { ms: 5000 }); }
      V.busy = false; el.classList.remove('busy');
    },
    'vs-grade': async (el) => {
      const v = cur_(); if (!v) return; const r = el.dataset.r;
      const res = await post('verse', { action: 'review', id: v.id, result: r }); if (res.status !== 200) return UI.toast(res.json.error || '');
      UI.haptic(12); V.sel = null; reset();
      const h = habitFor(/m[ée]mor/i, 'verse_memorized');                     // réviser = faire l'habitude « Mémorisation »
      if (h && r !== 'fail' && !Store.isDone(h.id, U.today())) { App.toggleItem({ kind: 'habit', id: h.id, date: U.today() }); UI.toast(t('vHabitOn', { h: h.name }), { icon: 'check', label: t('undo'), action: () => Store.toggleHabit(h.id, U.today()) }); }
      await Coach.loadVerses(); Coach.poll();
    }
  });

  // ajout : suggestions (banque bilingue) ou verset personnel
  Coach.verseAdd = () => {
    const lang0 = I18n.lang, have = new Set(V.data.verses.map((x) => x.bank).filter(Boolean));
    UI.sheet({
      title: t('vAdd'), full: true,
      body: `${UI.seg('vtab', [['sug', t('vSug')], ['own', t('vOwn')]], 'sug')}
        <div id="va-sug"><div class="stack" style="margin-top:14px">${V.data.bank.map((b) => `<div class="vb"><div class="vb__t"><b>${esc(b.ref[lang0])}</b><small>${esc(b[lang0])}</small></div><button type="button" class="btn btn--soft btn--sm" data-bank="${b.id}" ${have.has(b.id) ? 'disabled' : ''}>${have.has(b.id) ? '✓' : Icons.i('plus', 18, 2.6)}</button></div>`).join('')}</div><p class="muted small" style="margin-top:12px">${esc(t('vCheck'))}</p></div>
        <div id="va-own" hidden style="margin-top:14px"><label class="fld"><span>${t('vRef')}</span><input class="inp" id="va-ref" maxlength="60" placeholder="${esc(t('vRefPh'))}"></label>
          <label class="fld"><span>${t('vText')}</span><textarea class="inp" id="va-txt" rows="5" maxlength="1200" placeholder="${esc(t('vTextPh'))}"></textarea></label>
          <div class="fld"><span>${t('vLang')}</span>${UI.seg('vlang', [['fr', 'Français'], ['en', 'English']], lang0)}</div></div>`,
      foot: `<button class="btn btn--soft btn--full" data-close type="button">${T('btn.close')}</button><button class="btn btn--primary btn--full" id="va-save" type="button" hidden>${t('vSave')}</button>`,
      onMount(el, close) {
        let tab = 'sug', lang = lang0;
        el.querySelector('[data-seg=vtab]').onclick = (e) => { const b = e.target.closest('.seg__b'); if (!b) return; tab = b.dataset.v; el.querySelectorAll('[data-seg=vtab] .seg__b').forEach((x) => x.classList.toggle('on', x === b)); el.querySelector('#va-sug').hidden = tab !== 'sug'; el.querySelector('#va-own').hidden = tab !== 'own'; el.querySelector('#va-save').hidden = tab !== 'own'; };
        el.querySelector('[data-seg=vlang]').onclick = (e) => { const b = e.target.closest('.seg__b'); if (!b) return; lang = b.dataset.v; el.querySelectorAll('[data-seg=vlang] .seg__b').forEach((x) => x.classList.toggle('on', x === b)); };
        el.querySelector('#va-sug').onclick = async (e) => {
          const b = e.target.closest('[data-bank]'); if (!b || b.disabled) return;
          const r = await post('verse', { action: 'add', bank: b.dataset.bank, lang: lang0 }); if (r.status !== 200) return UI.toast(r.json.error || '');
          b.disabled = true; b.textContent = '✓'; UI.toast(t('vAdded'), { icon: 'check' }); await Coach.loadVerses(); Coach.poll();
        };
        el.querySelector('#va-save').onclick = async () => {
          const r = await post('verse', { action: 'add', ref: el.querySelector('#va-ref').value, text: el.querySelector('#va-txt').value, lang });
          if (r.status !== 200) return UI.toast(t('vErr'));
          UI.toast(t('vAdded'), { icon: 'check' }); close(); V.sel = r.json.verse.id; await Coach.loadVerses(); Coach.poll();
        };
      }
    });
  };
})();
