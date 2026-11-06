/* Present — Coach IA : chat, sermons audio (lecteur inline), voix, autonomie, notifications */
(function () {
  const esc = U.esc;
  const L = {
    fr: {
      title: 'Coach', setup: 'Configure ton coach', setupSub: 'Ajoute une clé API (protocole OpenAI) pour activer le chat, les sermons audio et le suivi autonome.', setupBtn: 'Configurer',
      off: 'Coach indisponible', offSub: 'Lance « python3 server.py » (version avec coach) pour activer le coach.', hello: 'Je suis ton coach. Je suis ton suivi, je t’encourage et je te reprends avec grâce. Demande-moi un sermon ou écris-moi.',
      ph: 'Écris à ton coach…', send: 'Envoyer', mic: 'Dicter', typing: 'Le coach écrit…', preparing: 'Le coach prépare ton message…', recording: 'Enregistrement de la voix…', retry: 'Réessayer', retryAudio: 'Réessayer l’audio',
      readText: 'Lire le texte', hideText: 'Masquer le texte', play: 'Lecture', pause: 'Pause', pos: 'Position', today: 'Aujourd’hui', yesterday: 'Hier', sermon: 'Sermon audio',
      qDaily: 'Sermon du jour', qReview: 'Bilan', qEnc: 'Encourage-moi', qCor: 'Corrige-moi', qTopic: 'Sujet…', topicT: 'Sermon sur un sujet', topicPh: 'Ex. la persévérance, la discipline…', topicGo: 'Lancer le sermon',
      k_examen: 'Examen', k_morning: 'Matin', k_evening: 'Soir', k_weekly: 'Semaine', k_daily: 'Sermon', k_review: 'Bilan', k_encourage: 'Encouragement', k_correct: 'Correction', k_topic: 'Sujet', k_nudge: 'Rappel',
      newMsg: 'Nouveau message du coach', open: 'Ouvrir', err: 'Le coach est indisponible', voice: 'Voix du coach', settings: 'Réglages du coach',
      sConn: 'Connexion IA', sUrl: 'URL de l’API (protocole OpenAI)', sModel: 'Modèle', sKey: 'Clé API', sKeyKeep: 'Laisser vide pour conserver', sTest: 'Tester la connexion', sTesting: 'Test en cours…', sPriv: 'Tes données de suivi sont envoyées au fournisseur choisi. La clé reste sur ton serveur.',
      sStyle: 'Style du coach', st_sermon: 'Sermon (pastoral)', st_coach: 'Coach direct', st_gentle: 'Bienveillant', st_strict: 'Exigeant', sLen: 'Durée des sermons', l_short: '≈ 1 min', l_medium: '≈ 2-3 min', l_long: '≈ 5 min',
      sLang: 'Langue du coach', auto: 'Auto', sName: 'Prénom (optionnel)', sAuto: 'Autonomie', sAutoOn: 'Coach autonome', sAutoHint: 'Il t’écrit de lui-même, sans que tu demandes.', sAudio: 'Joindre l’audio aux messages auto',
      sMorning: 'Sermon du matin', sEvening: 'Bilan du soir', sWeekly: 'Bilan de la semaine', sNudge: 'Relances si habitude manquée', sGrace: 'Délai (min)', sQuiet: 'Heures calmes', sFrom: 'de', sTo: 'à', sMax: 'Max messages auto / jour',
      sPush: 'Notifications (app fermée)', pushOn: 'Activer les notifications', pushOff: 'Désactiver sur cet appareil', pushActive: 'Actives sur cet appareil', pushNA: 'Optionnel : « pip install pywebpush » pour être notifié même app fermée.', pushDenied: 'Notifications bloquées dans le navigateur',
      sClear: 'Effacer l’historique du coach', clearQ: 'Effacer tout l’historique ?', clearSub: 'Messages et fichiers audio seront supprimés.', save: 'Enregistrer', saved: 'Réglages enregistrés', days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      vProv: 'Moteur vocal', vEdge: 'Edge (gratuit)', vOpenai: 'OpenAI', vOff: 'Texte seul', vVoices: 'Voix', vEn: 'English', vFr: 'Français', vRate: 'Vitesse de la voix', vMulti: 'Les voix « Multilingual » (Ava, Andrew, Emma, Brian, Vivienne, Rémy) lisent aussi bien le français que l’anglais.', vNoEdge: 'edge-tts n’est pas installé sur le serveur : pip install edge-tts', vModel: 'Modèle TTS', vOV: 'Voix OpenAI', vSel: 'Voix choisie',
      tOk: 'Connexion OK', speed: 'Vitesse', unavailableAudio: 'Audio indisponible',
      qExamen: 'Examen du soir', tabChat: 'Chat', tabVerse: 'Verset', sExamen: 'Examen guidé du soir', sExamenT: 'Heure (vide = heure de l’habitude)',
      vEleven: 'ElevenLabs', vUrl: 'URL de l’API vocale (vide = celle du chat)', vKey: 'Clé API vocale (vide = celle du chat)', vKeyEl: 'Clé ElevenLabs', vVoiceId: 'Voice ID ElevenLabs', vModelEl: 'Modèle ElevenLabs',
      vFallback: 'Basculer sur Edge si le moteur échoue', vPreview: 'Écouter un aperçu', vKeep: 'vide = conserver'
    },
    en: {
      title: 'Coach', setup: 'Set up your coach', setupSub: 'Add an API key (OpenAI protocol) to enable chat, audio sermons and autonomous follow-up.', setupBtn: 'Set up',
      off: 'Coach unavailable', offSub: 'Run “python3 server.py” (coach-enabled version) to enable the coach.', hello: 'I’m your coach. I follow your progress, encourage you and correct you with grace. Ask for a sermon or write to me.',
      ph: 'Write to your coach…', send: 'Send', mic: 'Dictate', typing: 'Coach is typing…', preparing: 'Your coach is preparing your message…', recording: 'Recording the voice…', retry: 'Retry', retryAudio: 'Retry audio',
      readText: 'Read the text', hideText: 'Hide the text', play: 'Play', pause: 'Pause', pos: 'Position', today: 'Today', yesterday: 'Yesterday', sermon: 'Audio sermon',
      qDaily: 'Sermon of the day', qReview: 'Review', qEnc: 'Encourage me', qCor: 'Correct me', qTopic: 'Topic…', topicT: 'Sermon on a topic', topicPh: 'E.g. perseverance, discipline…', topicGo: 'Start the sermon',
      k_examen: 'Examen', k_morning: 'Morning', k_evening: 'Evening', k_weekly: 'Week', k_daily: 'Sermon', k_review: 'Review', k_encourage: 'Encouragement', k_correct: 'Correction', k_topic: 'Topic', k_nudge: 'Reminder',
      newMsg: 'New message from your coach', open: 'Open', err: 'Coach is unavailable', voice: 'Coach voice', settings: 'Coach settings',
      sConn: 'AI connection', sUrl: 'API URL (OpenAI protocol)', sModel: 'Model', sKey: 'API key', sKeyKeep: 'Leave empty to keep', sTest: 'Test connection', sTesting: 'Testing…', sPriv: 'Your tracking data is sent to the chosen provider. The key stays on your server.',
      sStyle: 'Coach style', st_sermon: 'Sermon (pastoral)', st_coach: 'Direct coach', st_gentle: 'Gentle', st_strict: 'Demanding', sLen: 'Sermon length', l_short: '≈ 1 min', l_medium: '≈ 2-3 min', l_long: '≈ 5 min',
      sLang: 'Coach language', auto: 'Auto', sName: 'First name (optional)', sAuto: 'Autonomy', sAutoOn: 'Autonomous coach', sAutoHint: 'Writes to you on its own, without being asked.', sAudio: 'Attach audio to auto messages',
      sMorning: 'Morning sermon', sEvening: 'Evening review', sWeekly: 'Weekly review', sNudge: 'Nudges for missed habits', sGrace: 'Delay (min)', sQuiet: 'Quiet hours', sFrom: 'from', sTo: 'to', sMax: 'Max auto messages / day',
      sPush: 'Notifications (app closed)', pushOn: 'Enable notifications', pushOff: 'Disable on this device', pushActive: 'Active on this device', pushNA: 'Optional: “pip install pywebpush” to be notified even when the app is closed.', pushDenied: 'Notifications are blocked in the browser',
      sClear: 'Clear coach history', clearQ: 'Clear the whole history?', clearSub: 'Messages and audio files will be deleted.', save: 'Save', saved: 'Settings saved', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      vProv: 'Voice engine', vEdge: 'Edge (free)', vOpenai: 'OpenAI', vOff: 'Text only', vVoices: 'Voices', vEn: 'English', vFr: 'Français', vRate: 'Voice speed', vMulti: '“Multilingual” voices (Ava, Andrew, Emma, Brian, Vivienne, Rémy) read French and English equally well.', vNoEdge: 'edge-tts is not installed on the server: pip install edge-tts', vModel: 'TTS model', vOV: 'OpenAI voice', vSel: 'Selected voice',
      tOk: 'Connection OK', speed: 'Speed', unavailableAudio: 'Audio unavailable',
      qExamen: 'Evening examen', tabChat: 'Chat', tabVerse: 'Verse', sExamen: 'Guided evening examen', sExamenT: 'Time (empty = habit time)',
      vEleven: 'ElevenLabs', vUrl: 'Voice API URL (empty = chat one)', vKey: 'Voice API key (empty = chat one)', vKeyEl: 'ElevenLabs key', vVoiceId: 'ElevenLabs voice ID', vModelEl: 'ElevenLabs model',
      vFallback: 'Fall back to Edge if the engine fails', vPreview: 'Play a preview', vKeep: 'empty = keep'
    }
  };
  const c = (k) => (L[I18n.lang] || L.fr)[k] ?? L.fr[k] ?? k;
  const sw = (id, on) => `<button type="button" class="switch${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${!!on}"><i></i></button>`;
  const fmtT = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const tm = (ts) => new Date(ts).toLocaleTimeString(I18n.lang, { hour: '2-digit', minute: '2-digit' });
  const dayLbl = (ts) => { const d = U.iso(new Date(ts)), t = U.today(); return d === t ? c('today') : d === U.add(t, -1) ? c('yesterday') : U.longDate(d); };

  /* ------------------------------------------------------------- lecteur audio (un seul à la fois) */
  const Player = {
    a: new Audio(), id: null, rate: +localStorage.getItem('present_co_rate') || 1, pending: null,
    init() {
      const a = Player.a; a.preload = 'none';
      ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'error'].forEach((e) => a.addEventListener(e, () => Player.paint()));
      a.addEventListener('loadedmetadata', () => { if (Player.pending != null && isFinite(a.duration)) { a.currentTime = Player.pending * a.duration; Player.pending = null; } });
      a.addEventListener('error', () => { if (Player.id) UI.toast(c('unavailableAudio')); });
      a.addEventListener('ended', () => { a.currentTime = 0; });
    },
    url(m) { return `./api/coach/audio/${encodeURIComponent(m.audio.file)}${Sync.token ? '?token=' + encodeURIComponent(Sync.token) : ''}`; },
    msg(id) { return Coach.msgs.find((x) => x.id === id); },
    dur(m) { return (Player.id === m.id && isFinite(Player.a.duration) && Player.a.duration > 0) ? Player.a.duration : (m.audio && m.audio.dur) || 0; },
    toggle(m, at) {
      const a = Player.a; window.CoachGuide && CoachGuide.halt();
      if (Player.id === m.id && a.src) { a.paused ? a.play().catch(() => {}) : a.pause(); return; }
      Preview.stop(); a.pause(); Player.id = m.id; Player.pending = at ?? null; a.src = Player.url(m); a.playbackRate = Player.rate;
      a.play().catch(() => {}); Player.session(m);
    },
    seek(m, ratio) {
      if (Player.id !== m.id) return Player.toggle(m, ratio);
      const d = Player.dur(m); if (d) Player.a.currentTime = ratio * d;
    },
    speed() {
      const steps = [1, 1.25, 1.5, 0.85]; Player.rate = steps[(steps.indexOf(Player.rate) + 1) % steps.length];
      Player.a.playbackRate = Player.rate; localStorage.setItem('present_co_rate', Player.rate); Player.paint();
    },
    session(m) {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: m.title || c('sermon'), artist: 'Coach · Present', album: 'Present', artwork: [{ src: 'assets/images/app-icon-512.png', sizes: '512x512', type: 'image/png' }] });
        const a = Player.a;
        navigator.mediaSession.setActionHandler('play', () => a.play());
        navigator.mediaSession.setActionHandler('pause', () => a.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => { a.currentTime = Math.max(0, a.currentTime - 15); });
        navigator.mediaSession.setActionHandler('seekforward', () => { a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 15); });
        navigator.mediaSession.setActionHandler('seekto', (e) => { a.currentTime = e.seekTime; });
      } catch (e) { /* non supporté */ }
    },
    paint() {
      const a = Player.a;
      document.querySelectorAll('.ap').forEach((el) => {
        const m = Player.msg(el.dataset.id); if (!m || !m.audio) return;
        const cur = Player.id === m.id, playing = cur && !a.paused && !a.ended, dur = Player.dur(m), pos = cur ? a.currentTime : 0;
        el.classList.toggle('playing', playing); el.classList.toggle('active', cur);
        const btn = el.querySelector('.ap__btn'); btn.innerHTML = Icons.i(playing ? 'pause' : 'play', 22); btn.setAttribute('aria-label', c(playing ? 'pause' : 'play'));
        const r = el.querySelector('.ap__seek');
        if (!r.matches(':active') && !el.dataset.drag) { r.value = dur ? Math.round((pos / dur) * 1000) : 0; r.style.setProperty('--v', r.value / 10 + '%'); }
        el.querySelector('.ap__t').textContent = fmtT(pos); el.querySelector('.ap__d').textContent = '/ ' + fmtT(dur);
        el.querySelector('.ap__spd').textContent = Player.rate + '×';
      });
    }
  };
  // aperçu de voix (séparé du lecteur principal)
  const Preview = { a: new Audio(), stop() { Preview.a.pause(); } };

  const player = (m) => `<div class="ap" data-id="${m.id}">
      <button type="button" class="ap__btn" data-act="co-play" aria-label="${c('play')}">${Icons.i('play', 22)}</button>
      <div class="ap__mid"><input type="range" class="ap__seek" min="0" max="1000" value="0" aria-label="${c('pos')}" style="--v:0%"><div class="ap__meta"><span class="ap__t">0:00</span><span class="ap__d">/ ${fmtT(m.audio.dur)}</span></div></div>
      <button type="button" class="ap__spd" data-act="co-speed" aria-label="${c('speed')}">${Player.rate}×</button></div>`;

  /* ------------------------------------------------------------- vue */
  const Coach = {
    info: null, msgs: [], seq: 0, epoch: 0, draft: '', available: null, sending: false, open: new Set(), _poll: 0, _fast: false, _lastNotified: 0, rec: null,

    api(path, opt = {}, timeout = 15000) {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
      const url = `./api/coach/${path}${path.includes('?') ? '&' : '?'}lang=${I18n.lang}`;
      return fetch(url, { ...opt, signal: ctl.signal, cache: 'no-store', headers: { ...(opt.body ? { 'Content-Type': 'application/json' } : {}), ...(Sync.token ? { 'X-Token': Sync.token } : {}) } })
        .then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) })).finally(() => clearTimeout(t));
    },

    /* ----- synchro (polling léger) ----- */
    start() {
      Player.init();
      if (location.protocol === 'file:') { Coach.available = false; return; }
      Coach.poll();
      Coach._poll = setInterval(() => { if (!document.hidden) Coach.poll(); }, 15000);
      document.addEventListener('visibilitychange', () => !document.hidden && Coach.poll());
      window.addEventListener('present:sync', () => { if (Coach.available === false && Sync.state === 'synced') Coach.poll(); });
    },
    async poll() {
      try {
        const r = await Coach.api('state');
        if (r.status !== 200 || !r.json.available) { Coach.available = false; return Coach.badge(); }
        const first = Coach.info === null; Coach.available = true; Coach.info = r.json;
        if (r.json.epoch !== Coach.epoch) { Coach.msgs = []; Coach.seq = 0; Coach.epoch = r.json.epoch; }
        if (r.json.seq !== Coach.seq) await Coach.pull(first);
        Coach.badge();
        if (App.route() === 'coach') { Coach.paintHead(); Coach.paintList(); Coach.markRead(); }
        else if (App.route() === 'today') App.requestRender();
        const wantFast = r.json.busy; if (wantFast !== Coach._fast) { Coach._fast = wantFast; clearInterval(Coach._fastT); if (wantFast) Coach._fastT = setInterval(() => Coach.poll(), 2500); }
      } catch (e) { Coach.available = Coach.available === true ? true : false; }
    },
    async pull(silent) {
      const r = await Coach.api('messages?after=' + Coach.seq);
      if (r.status !== 200) return;
      r.json.messages.forEach((m) => { const i = Coach.msgs.findIndex((x) => x.id === m.id); if (i >= 0) Coach.msgs[i] = m; else Coach.msgs.push(m); });
      Coach.msgs = Coach.msgs.filter((m) => !m.tmp); Coach.msgs.sort((a, b) => a.ts - b.ts); Coach.seq = r.json.seq;
      // nouveau message du coach non lu alors que l'onglet n'est pas ouvert → notification locale / toast
      const fresh = Coach.msgs.filter((m) => m.role === 'coach' && !m.read && m.status !== 'generating' && m.ts > Coach._lastNotified && m.type !== 'chat');
      if (silent) Coach._lastNotified = Date.now();
      else if (fresh.length && App.route() !== 'coach') {
        const m = fresh[fresh.length - 1]; Coach._lastNotified = Date.now();
        if (document.hidden && window.Notifier && Notifier.supported && Notification.permission === 'granted' && !(Coach.info.push_subs > 0)) Notifier.show(m.title || 'Coach', m.notification || m.text.slice(0, 110), 'coach-' + m.id);
        else if (!document.hidden) UI.toast(c('newMsg'), { icon: 'sparkle', label: c('open'), action: () => App.go('coach'), ms: 6000 });
      }
    },
    badge() {
      const n = document.querySelector('#nav a[data-r=coach] .nav__ic'); if (!n) return;
      const u = Coach.info && Coach.info.unread || 0; n.dataset.unread = u && App.route() !== 'coach' ? '1' : '';
    },
    markRead() { if (Coach.info && Coach.info.unread > 0 && !document.hidden) { Coach.info.unread = 0; Coach.badge(); Coach.api('read', { method: 'POST', body: '{}' }).catch(() => {}); } },

    /* ----- rendu ----- */
    acts: {
      'co-send': () => Coach.send(),
      'co-quick': (el) => Coach.sermon(el.dataset.k),
      'co-topic': () => Coach.topicSheet(),
      'co-settings': () => Coach.settings(),
      'co-voice': () => Coach.voiceSheet(),
      'co-setup': () => Coach.settings(),
      'co-tab': (el) => App.go('coach', el.dataset.v === 'verse' ? 'verse' : ''),
      'co-play': (el) => { const m = Player.msg(el.closest('.ap').dataset.id); if (m) Player.toggle(m); },
      'co-speed': () => Player.speed(),
      'co-text': (el) => { const id = el.dataset.id; Coach.open.has(id) ? Coach.open.delete(id) : Coach.open.add(id); Coach.paintList(true); },
      'co-regen': (el) => { Coach.api('regen', { method: 'POST', body: JSON.stringify({ id: el.dataset.id }) }).then(() => Coach.poll()); },
      'co-retry': (el) => Coach.sermon(el.dataset.k || 'daily'),
      'co-mic': () => Coach.dictate(),
      'home-coach': () => App.go('coach')
    },
    fab: null,
    propHtml: () => '', guideHtml: () => '', verseHtml: () => '',

    render(param) {
      Coach.tab = param === 'verse' ? 'verse' : 'chat';
      const unav = Coach.available === false;
      const tabs = UI.seg('cotab', [['chat', c('tabChat')], ['verse', c('tabVerse')]], Coach.tab).replace(/data-v="(\w+)"/g, 'data-act="co-tab" data-v="$1"');
      if (Coach.tab === 'verse') return `
      <header class="appbar"><div class="brand">${Icons.i('sparkle', 22, 2.2)}<span>${c('title')}</span></div><div class="co__tools" id="co-head">${Coach.headHtml()}</div></header>
      <div class="co"><div class="co__tabs">${tabs}</div>${unav ? `<div class="empty">${Icons.i('sparkle', 40, 1.4)}<h3>${c('off')}</h3><p>${c('offSub')}</p></div>` : `<div id="vs">${Coach.verseHtml()}</div>`}</div>`;
      return `
      <header class="appbar"><div class="brand">${Icons.i('sparkle', 22, 2.2)}<span>${c('title')}</span></div>
        <div class="co__tools" id="co-head">${Coach.headHtml()}</div></header>
      <div class="co" id="co"><div class="co__tabs">${tabs}</div>
        ${unav ? `<div class="empty">${Icons.i('sparkle', 40, 1.4)}<h3>${c('off')}</h3><p>${c('offSub')}</p></div>` : `
        <div id="co-banner"></div><div class="co__list" id="co-list"></div>`}
      </div>
      ${unav ? '' : `<div class="co__dock">
        <div class="co__chips">${[['daily', 'mic', 'qDaily'], ['examen', 'moon', 'qExamen'], ['review', 'chart', 'qReview'], ['encourage', 'heart', 'qEnc'], ['correct', 'target', 'qCor']].map(([k, ic, l]) => `<button type="button" class="chip" data-act="co-quick" data-k="${k}">${Icons.i(ic, 15)} ${c(l)}</button>`).join('')}<button type="button" class="chip" data-act="co-topic">${Icons.i('pen', 15)} ${c('qTopic')}</button></div>
        <div class="co__input"><textarea id="co-in" rows="1" maxlength="2000" placeholder="${esc(c('ph'))}" aria-label="${esc(c('ph'))}">${esc(Coach.draft)}</textarea>
          ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button type="button" class="icon-btn co__mic" data-act="co-mic" aria-label="${c('mic')}">${Icons.i('mic', 22)}</button>` : ''}
          <button type="button" class="co__send" data-act="co-send" aria-label="${c('send')}">${Icons.i('send', 20, 2.2)}</button></div></div>`}`;
    },
    headHtml() {
      const v = Coach.info && Coach.info.voices.find((x) => x.id === Coach.info.settings.tts.voice), prov = Coach.info && Coach.info.settings.tts.provider;
      return `<button type="button" class="pill-btn" data-act="co-voice">${Icons.i('mic', 15)} ${esc(prov === 'off' ? c('vOff') : prov === 'openai' ? 'OpenAI' : prov === 'eleven' ? 'ElevenLabs' : v ? v.label : '—')}</button>
        <button type="button" class="icon-btn" data-act="co-settings" aria-label="${c('settings')}">${Icons.i('sliders', 22)}</button>`;
    },
    paintHead() { const h = document.getElementById('co-head'); if (h) h.innerHTML = Coach.headHtml(); },

    msgHtml(m) {
      if (m.role === 'user') return `<div class="msg msg--me"><div class="bub">${md(m.text)}</div>${m.error ? `<small class="msg__err">${esc(m.error)}</small>` : ''}<time>${tm(m.ts)}</time></div>`;
      const av = `<span class="msg__av">${Icons.i('sparkle', 16, 2.2)}</span>`;
      if (m.type !== 'sermon') return `<div class="msg msg--co">${av}<div class="msg__c"><div class="bub${m.type === 'nudge' ? ' bub--nudge' : ''}">${md(m.text)}</div>${Coach.propHtml(m)}<time>${tm(m.ts)}</time></div></div>`;
      let body;
      if (m.status === 'generating' || m.status === 'tts') body = `<div class="sk"><i></i><i></i><i style="width:60%"></i></div><div class="muted small">${c(m.status === 'tts' ? 'recording' : 'preparing')}</div>`;
      else if (m.status === 'error') body = `<p class="msg__err">${esc(m.error || c('err'))}</p><button type="button" class="btn btn--soft btn--sm" data-act="co-retry" data-k="${m.kind}">${c('retry')}</button>`;
      else body = `${m.text ? `<p class="sm__t">${md(m.text)}</p>` : ''}
        ${m.steps && m.steps.length ? Coach.guideHtml(m) : m.audio ? player(m) : `<div class="sm__noaudio">${m.error ? esc(m.error) : ''}${m.script ? `<button type="button" class="btn btn--soft btn--sm" data-act="co-regen" data-id="${m.id}">${Icons.i('mic', 16)} ${c('retryAudio')}</button>` : ''}</div>`}
        ${m.script ? `<button type="button" class="link sm__tg" data-act="co-text" data-id="${m.id}">${c(Coach.open.has(m.id) ? 'hideText' : 'readText')}</button>${Coach.open.has(m.id) ? `<div class="sm__sc">${md(m.script)}</div>` : ''}` : ''}${Coach.propHtml(m)}`;
      return `<div class="msg msg--co msg--sm">${av}<div class="msg__c"><article class="sm"><header><span class="tag tag--g">${esc(c('k_' + m.kind) || c('sermon'))}${m.auto ? ' · auto' : ''}</span>${m.title ? `<h3>${esc(m.title)}</h3>` : ''}</header>${body}</article><time>${tm(m.ts)}</time></div></div>`;
    },

    paintList(keep) {
      const list = document.getElementById('co-list'), ban = document.getElementById('co-banner'); if (!list) return;
      const vw = document.getElementById('view'), near = vw.scrollHeight - vw.scrollTop - vw.clientHeight < 160;
      const cfg = Coach.info && Coach.info.configured;
      ban.innerHTML = Coach.info && !cfg ? `<div class="card co__setup">${UI.bubble('sparkle', 'var(--primary)', 48, 24)}<div><b>${c('setup')}</b><p class="muted small">${c('setupSub')}</p></div><button class="btn btn--primary btn--sm" type="button" data-act="co-setup">${c('setupBtn')}</button></div>` : '';
      let html = '', last = '';
      Coach.msgs.forEach((m) => { const d = dayLbl(m.ts); if (d !== last) { html += `<div class="co__day">${esc(d)}</div>`; last = d; } html += Coach.msgHtml(m); });
      if (Coach.sending) html += `<div class="msg msg--co"><span class="msg__av">${Icons.i('sparkle', 16, 2.2)}</span><div class="bub typing"><i></i><i></i><i></i></div></div>`;
      if (!Coach.msgs.length && !Coach.sending) html = `<div class="msg msg--co"><span class="msg__av">${Icons.i('sparkle', 16, 2.2)}</span><div class="msg__c"><div class="bub">${esc(c('hello'))}</div></div></div>`;
      list.innerHTML = html; Player.paint();
      if (!keep && near) Coach.toBottom();
    },
    toBottom(smooth) { const v = document.getElementById('view'); v.scrollTo({ top: v.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); },

    mount(root) {
      Coach.badge();
      if (Coach.available === false) return;
      if (Coach.tab === 'verse') return Coach.verseMount && Coach.verseMount();
      const inp = document.getElementById('co-in'), list = document.getElementById('co-list');
      Coach.paintList(true); requestAnimationFrame(() => Coach.toBottom());
      if (Coach.info === null) Coach.poll().then(() => Coach.paintList());
      else { Coach.markRead(); }
      const grow = () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 120) + 'px'; };
      inp.addEventListener('input', () => { Coach.draft = inp.value; grow(); }); grow();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Coach.send(); } });
      // curseur de position : aperçu pendant le glissement, déplacement au relâchement
      list.addEventListener('input', (e) => { const r = e.target.closest('.ap__seek'); if (!r) return; const ap = r.closest('.ap'); ap.dataset.drag = '1'; r.style.setProperty('--v', r.value / 10 + '%'); const m = Player.msg(ap.dataset.id); ap.querySelector('.ap__t').textContent = fmtT((r.value / 1000) * Player.dur(m)); });
      list.addEventListener('change', (e) => { const r = e.target.closest('.ap__seek'); if (!r) return; const ap = r.closest('.ap'); delete ap.dataset.drag; const m = Player.msg(ap.dataset.id); if (m) Player.seek(m, r.value / 1000); });
    },

    /* ----- actions ----- */
    async send() {
      const inp = document.getElementById('co-in'), text = (inp ? inp.value : Coach.draft).trim();
      if (!text || Coach.sending) return;
      Coach.draft = ''; if (inp) { inp.value = ''; inp.style.height = 'auto'; }
      Coach.msgs.push({ id: 'tmp' + Date.now(), tmp: true, ts: Date.now(), role: 'user', type: 'chat', text, status: 'ready' }); Coach.sending = true; Coach.paintList(); Coach.toBottom(true);
      let failed = false;
      try {
        const r = await Coach.api('chat', { method: 'POST', body: JSON.stringify({ text }) }, 90000);
        if (r.status !== 200) { failed = true; UI.toast(r.json.error || c('err'), { ms: 5000 }); }
      } catch (e) { failed = true; UI.toast(c('err')); }
      Coach.sending = false; await Coach.poll();
      Coach.msgs = Coach.msgs.filter((m) => !m.tmp);                      // le message temporaire n'a pas été enregistré côté serveur
      if (failed && !Coach.msgs.some((m) => m.role === 'user' && m.text === text)) { Coach.draft = text; const i = document.getElementById('co-in'); if (i) i.value = text; }
      Coach.paintList(); Coach.toBottom(true);
    },
    async sermon(kind, topic) {
      if (Coach.info && !Coach.info.configured) return Coach.settings();
      try {
        const r = await Coach.api('sermon', { method: 'POST', body: JSON.stringify({ kind, topic: topic || '' }) });
        if (r.status !== 200) return UI.toast(r.json.error || c('err'), { ms: 5000 });
      } catch (e) { return UI.toast(c('err')); }
      await Coach.poll(); Coach.toBottom(true);
    },
    topicSheet() {
      UI.sheet({ title: c('topicT'), cls: 'sheet--dialog', body: `<input class="inp" id="tp" maxlength="120" placeholder="${esc(c('topicPh'))}"><button class="btn btn--primary btn--full" id="tp-ok" type="button">${c('topicGo')}</button>`,
        onMount(el, close) { const i = el.querySelector('#tp'); setTimeout(() => i.focus(), 300); const go = () => { const v = i.value.trim(); if (!v) return; close(); Coach.sermon('topic', v); }; el.querySelector('#tp-ok').onclick = go; i.onkeydown = (e) => e.key === 'Enter' && go(); } });
    },
    dictate() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
      const btn = document.querySelector('.co__mic'), inp = document.getElementById('co-in');
      if (Coach.rec) { Coach.rec.stop(); return; }
      const r = Coach.rec = new SR(); r.lang = I18n.lang === 'fr' ? 'fr-FR' : 'en-US'; r.interimResults = true; r.continuous = false;
      const base = inp.value ? inp.value.trim() + ' ' : '';
      r.onresult = (e) => { inp.value = base + [...e.results].map((x) => x[0].transcript).join(' '); Coach.draft = inp.value; inp.dispatchEvent(new Event('input')); };
      r.onend = () => { Coach.rec = null; btn && btn.classList.remove('rec'); }; r.onerror = r.onend;
      btn && btn.classList.add('rec'); try { r.start(); } catch (e) { Coach.rec = null; }
    },

    /* ----- voix ----- */
    voiceList(sel) {
      const v = Coach.info.voices, row = (x) => `<div class="vo${x.id === sel ? ' on' : ''}" data-v="${x.id}"><button type="button" class="vo__sel" data-pick="${x.id}"><span class="vo__rd"></span><span class="vo__n"><b>${esc(x.label)}</b>${x.multi ? '<em>Multilingual</em>' : ''}<small>${esc(x.note)}</small></span></button><button type="button" class="vo__pv icon-btn" data-prev="${x.id}" aria-label="▶ ${esc(x.label)}">${Icons.i('play', 18)}</button></div>`;
      return `<div class="vo__g">${c('vEn')}</div>${v.filter((x) => x.lang === 'en').map(row).join('')}<div class="vo__g">${c('vFr')}</div>${v.filter((x) => x.lang === 'fr').map(row).join('')}`;
    },
    voiceSheet() {
      if (!Coach.info) return;
      if (!Coach.info.configured && Coach.info.settings.tts.provider === 'openai') return Coach.settings();
      const I = Coach.info, s = I.settings.tts;
      const f = (id, label, val, extra = '') => `<label class="fld"><span>${label}</span><input class="inp" id="${id}" autocapitalize="off" autocomplete="off" ${extra} value="${esc(val)}"></label>`;
      UI.sheet({
        title: c('voice'), full: true,
        body: `<div class="fld"><span>${c('vProv')}</span>${UI.seg('prov', [['edge', 'Edge'], ['openai', 'OpenAI'], ['eleven', 'Eleven'], ['off', c('vOff')]], s.provider)}</div>
          ${I.tts_available ? '' : `<p class="msg__err small" id="vo-warn">${c('vNoEdge')}</p>`}
          <div data-sec="openai" ${s.provider === 'openai' ? '' : 'hidden'}>
            ${f('vo-url', c('vUrl'), s.base_url, 'inputmode="url" placeholder="https://api.openai.com/v1"')}
            <label class="fld"><span>${c('vKey')}</span><input class="inp" id="vo-key" type="password" autocomplete="off" placeholder="${esc(I.tts_key_hint ? I.tts_key_hint + ' · ' + c('vKeep') : '')}"></label>
            <div class="row2">${f('vo-m', c('vModel'), s.openai_model)}${f('vo-v', c('vOV'), s.openai_voice)}</div></div>
          <div data-sec="eleven" ${s.provider === 'eleven' ? '' : 'hidden'}>
            <label class="fld"><span>${c('vKeyEl')}</span><input class="inp" id="vo-ekey" type="password" autocomplete="off" placeholder="${esc(I.eleven_key_hint ? I.eleven_key_hint + ' · ' + c('vKeep') : '')}"></label>
            <div class="row2">${f('vo-eid', c('vVoiceId'), s.eleven_voice)}${f('vo-em', c('vModelEl'), s.eleven_model)}</div></div>
          <div data-sec="openai eleven" ${['openai', 'eleven'].includes(s.provider) ? '' : 'hidden'}>
            <button type="button" class="btn btn--soft btn--full" id="vo-pv">${Icons.i('play', 18)} ${c('vPreview')}</button>
            <div class="toggle-row"><div class="tr__t">${c('vFallback')}</div>${sw('vo-fb', s.fallback)}</div></div>
          <div data-sec="edge" ${s.provider === 'edge' ? '' : 'hidden'}><div class="fld"><span>${c('vRate')} <b id="vo-rv">${s.rate > 0 ? '+' : ''}${s.rate}%</b></span><input type="range" class="ap__seek" id="vo-rate" min="-30" max="30" step="5" value="${s.rate}" style="--v:${(s.rate + 30) / 0.6}%"></div>
          <p class="muted small">${c('vMulti')}</p><div id="vo-list">${Coach.voiceList(s.voice)}</div></div>`,
        onMount(el, close) {
          const put = async (patch) => { const r = await Coach.api('settings', { method: 'PUT', body: JSON.stringify(patch) }); if (r.status === 200) { Coach.info = { ...Coach.info, ...r.json, voices: Coach.info.voices }; Coach.paintHead(); } else UI.toast(r.json.error || c('err')); return r.status === 200; };
          const show = (p) => el.querySelectorAll('[data-sec]').forEach((x) => { x.hidden = !x.dataset.sec.split(' ').includes(p); });
          el.querySelector('[data-seg=prov]').onclick = (e) => { const b = e.target.closest('.seg__b'); if (!b) return; el.querySelectorAll('[data-seg=prov] .seg__b').forEach((x) => x.classList.toggle('on', x === b)); show(b.dataset.v); put({ tts: { provider: b.dataset.v } }); };
          const saveOA = () => put({ tts: { base_url: el.querySelector('#vo-url').value, openai_model: el.querySelector('#vo-m').value, openai_voice: el.querySelector('#vo-v').value } });
          ['#vo-url', '#vo-m', '#vo-v'].forEach((q) => { el.querySelector(q).onchange = saveOA; });
          el.querySelector('#vo-key').onchange = async (e) => { if (e.target.value.trim() && await put({ tts_api_key: e.target.value })) { e.target.value = ''; e.target.placeholder = Coach.info.tts_key_hint + ' · ' + c('vKeep'); } };
          el.querySelector('#vo-ekey').onchange = async (e) => { if (e.target.value.trim() && await put({ eleven_api_key: e.target.value })) { e.target.value = ''; e.target.placeholder = Coach.info.eleven_key_hint + ' · ' + c('vKeep'); } };
          const saveEL = () => put({ tts: { eleven_voice: el.querySelector('#vo-eid').value, eleven_model: el.querySelector('#vo-em').value } });
          ['#vo-eid', '#vo-em'].forEach((q) => { el.querySelector(q).onchange = saveEL; });
          const fb = el.querySelector('#vo-fb'); fb.onclick = () => { const on = !fb.classList.contains('on'); fb.classList.toggle('on', on); fb.setAttribute('aria-checked', on); put({ tts: { fallback: on } }); };
          const play = async (body, btn) => {
            btn && btn.classList.add('busy'); Coach.Player.a.pause();
            try { const r = await Coach.api('preview', { method: 'POST', body: JSON.stringify(body) }, 60000); if (r.status !== 200) throw new Error(r.json.error); Preview.a.src = r.json.url + (Sync.token ? '?token=' + encodeURIComponent(Sync.token) : ''); await Preview.a.play(); }
            catch (err) { UI.toast(String(err.message || c('err')), { ms: 5000 }); } btn && btn.classList.remove('busy');
          };
          el.querySelector('#vo-pv').onclick = (e) => { saveOA(); saveEL(); setTimeout(() => play({}, e.currentTarget), 400); };
          const rate = el.querySelector('#vo-rate'); rate.oninput = () => { rate.style.setProperty('--v', (+rate.value + 30) / 0.6 + '%'); el.querySelector('#vo-rv').textContent = (rate.value > 0 ? '+' : '') + rate.value + '%'; }; rate.onchange = () => put({ tts: { rate: +rate.value } });
          el.querySelector('#vo-list').onclick = (e) => {
            const pick = e.target.closest('[data-pick]'), pv = e.target.closest('[data-prev]');
            if (pick) { el.querySelectorAll('.vo').forEach((x) => x.classList.toggle('on', x.dataset.v === pick.dataset.pick)); put({ tts: { voice: pick.dataset.pick } }); }
            if (pv) play({ voice: pv.dataset.prev }, pv);
          };
        },
        onClose: () => Preview.stop()
      });
    },

    /* ----- réglages ----- */
    settings() {
      if (!Coach.info) return UI.toast(c('err'));
      const I = Coach.info, s = I.settings, a = s.auto;
      const chips = (name, items, val) => `<div class="chips" data-chips="${name}">${items.map(([v, l]) => `<button type="button" class="chip${v === val ? ' on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
      const trow = (k, label, extra = '') => `<div class="toggle-row"><div class="tr__t">${label}</div><div class="row">${extra}${sw('a-' + k, a[k].on)}</div></div>`;
      const st = { style: s.coach.style, length: s.coach.length, lang: s.coach.lang };
      UI.sheet({
        title: c('settings'), full: true,
        body: `<h3 class="co__h">${c('sConn')}</h3>
          <label class="fld"><span>${c('sUrl')}</span><input class="inp" id="s-url" inputmode="url" autocapitalize="off" value="${esc(s.llm.base_url)}"></label>
          <div class="row2"><label class="fld"><span>${c('sModel')}</span><input class="inp" id="s-model" autocapitalize="off" value="${esc(s.llm.model)}"></label>
          <label class="fld"><span>${c('sKey')}</span><input class="inp" id="s-key" type="password" autocomplete="off" placeholder="${I.configured ? esc(I.key_hint + ' · ' + c('sKeyKeep')) : 'sk-…'}"></label></div>
          <button type="button" class="btn btn--soft btn--full" id="s-test">${Icons.i('check', 18)} ${c('sTest')}</button><p class="muted small" id="s-res">${c('sPriv')}</p>
          <h3 class="co__h">${c('sStyle')}</h3>${chips('style', ['sermon', 'coach', 'gentle', 'strict'].map((k) => [k, c('st_' + k)]), st.style)}
          <h3 class="co__h">${c('sLen')}</h3>${chips('length', ['short', 'medium', 'long'].map((k) => [k, c('l_' + k)]), st.length)}
          <div class="row2"><div class="fld"><span>${c('sLang')}</span>${chips('lang', [['auto', c('auto')], ['fr', 'FR'], ['en', 'EN']], st.lang)}</div><label class="fld"><span>${c('sName')}</span><input class="inp" id="s-name" maxlength="24" value="${esc(s.coach.name)}"></label></div>
          <h3 class="co__h">${c('sAuto')}</h3>
          <div class="toggle-row"><div><div class="tr__t">${c('sAutoOn')}</div><div class="muted tr__s">${c('sAutoHint')}</div></div>${sw('a-enabled', a.enabled)}</div>
          <div class="toggle-row"><div class="tr__t">${c('sAudio')}</div>${sw('a-audio', a.audio)}</div>
          ${trow('morning', c('sMorning'), `<input class="inp inp--time" type="time" id="a-morning-t" value="${a.morning.time}">`)}
          ${trow('evening', c('sEvening'), `<input class="inp inp--time" type="time" id="a-evening-t" value="${a.evening.time}">`)}
          ${trow('examen', c('sExamen'), `<input class="inp inp--time" type="time" id="a-examen-t" value="${a.examen.time}" aria-label="${c('sExamenT')}">`)}
          ${trow('weekly', c('sWeekly'), `<select class="inp inp--time" id="a-weekly-d">${c('days').map((d, i) => `<option value="${i}"${i === a.weekly.day ? ' selected' : ''}>${d}</option>`).join('')}</select><input class="inp inp--time" type="time" id="a-weekly-t" value="${a.weekly.time}">`)}
          ${trow('nudges', c('sNudge'), `<input class="inp inp--time" type="number" min="10" max="240" step="5" id="a-nudges-g" value="${a.nudges.grace}" aria-label="${c('sGrace')}">`)}
          <div class="fld"><span>${c('sQuiet')}</span><div class="row"><span class="muted">${c('sFrom')}</span><input class="inp" type="time" id="a-q-f" value="${a.quiet.from}"><span class="muted">${c('sTo')}</span><input class="inp" type="time" id="a-q-t" value="${a.quiet.to}"></div></div>
          <div class="fld"><span>${c('sMax')}</span>${chips('max', [2, 3, 5, 8].map((n) => [n, n]), a.max_per_day)}</div>
          <h3 class="co__h">${c('sPush')}</h3><div id="s-push"><p class="muted small">…</p></div>
          <button type="button" class="btn btn--danger-soft btn--full" id="s-clear">${Icons.i('trash', 18)} ${c('sClear')}</button>`,
        foot: `<button class="btn btn--soft btn--full" data-close type="button">${T('btn.cancel')}</button><button class="btn btn--primary btn--full" id="s-save" type="button">${c('save')}</button>`,
        onMount(el, close) {
          el.addEventListener('click', (e) => { const b = e.target.closest('[data-chips] .chip'); if (!b) return; const g = b.parentElement; g.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b)); });
          el.querySelectorAll('.switch').forEach((b) => b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
          const val = (n) => { const x = el.querySelector(`[data-chips=${n}] .chip.on`); return x ? x.dataset.v : null; };
          const on = (id) => el.querySelector('#' + id).classList.contains('on');
          const collect = () => ({
            api_key: el.querySelector('#s-key').value, llm: { base_url: el.querySelector('#s-url').value.trim(), model: el.querySelector('#s-model').value.trim() },
            coach: { style: val('style'), length: val('length'), lang: val('lang'), name: el.querySelector('#s-name').value },
            auto: { enabled: on('a-enabled'), audio: on('a-audio'), max_per_day: +val('max'),
              morning: { on: on('a-morning'), time: el.querySelector('#a-morning-t').value }, evening: { on: on('a-evening'), time: el.querySelector('#a-evening-t').value },
              examen: { on: on('a-examen'), time: el.querySelector('#a-examen-t').value }, weekly: { on: on('a-weekly'), day: +el.querySelector('#a-weekly-d').value, time: el.querySelector('#a-weekly-t').value },
              nudges: { on: on('a-nudges'), grace: +el.querySelector('#a-nudges-g').value }, quiet: { from: el.querySelector('#a-q-f').value, to: el.querySelector('#a-q-t').value } }
          });
          const save = async () => { const r = await Coach.api('settings', { method: 'PUT', body: JSON.stringify(collect()) }); if (r.status !== 200) { UI.toast(r.json.error || c('err')); return false; } Coach.info = { ...Coach.info, ...r.json, voices: Coach.info.voices }; el.querySelector('#s-key').value = ''; Coach.paintHead(); return true; };
          el.querySelector('#s-save').onclick = async () => { if (await save()) { UI.toast(c('saved'), { icon: 'check' }); close(); Coach.paintList(true); } };
          el.querySelector('#s-test').onclick = async () => {
            const res = el.querySelector('#s-res'); res.textContent = c('sTesting'); await save();
            const r = await Coach.api('test', { method: 'POST', body: '{}' }, 45000);
            res.innerHTML = r.status === 200 ? `${r.json.llm.ok ? '✅' : '❌'} LLM — ${esc(r.json.llm.ok ? c('tOk') : r.json.llm.msg)}<br>${r.json.tts.ok ? '✅' : '⚠️'} TTS — ${esc(r.json.tts.msg)}` : esc(r.json.error || c('err'));
          };
          el.querySelector('#s-clear').onclick = async () => { if (await UI.confirm({ title: c('clearQ'), text: c('clearSub'), ok: T('btn.delete'), danger: true })) { await Coach.api('clear', { method: 'POST', body: '{}' }); Player.a.pause(); Player.id = null; await Coach.poll(); Coach.paintList(true); UI.toast(c('saved'), { icon: 'check' }); } };
          Coach.pushUI(el.querySelector('#s-push'));
        }
      });
    },

    /* ----- Web Push ----- */
    async pushUI(box) {
      const I = Coach.info;
      if (!I.push_available) { box.innerHTML = `<p class="muted small">${c('pushNA')}</p>`; return; }
      let sub = null; try { const reg = await navigator.serviceWorker.ready; sub = await reg.pushManager.getSubscription(); } catch (e) {}
      const denied = 'Notification' in window && Notification.permission === 'denied';
      box.innerHTML = sub ? `<p class="small">✅ ${c('pushActive')}</p><button type="button" class="btn btn--soft btn--full" id="pu-off">${c('pushOff')}</button>`
        : `${denied ? `<p class="msg__err small">${c('pushDenied')}</p>` : ''}<button type="button" class="btn btn--primary btn--full" id="pu-on" ${denied ? 'disabled' : ''}>${Icons.i('bell', 18)} ${c('pushOn')}</button>`;
      const on = box.querySelector('#pu-on'), off = box.querySelector('#pu-off');
      if (on) on.onclick = async () => { try { await Coach.enablePush(); } catch (e) { UI.toast(String(e.message || e)); } Coach.pushUI(box); };
      if (off) off.onclick = async () => { try { await sub.unsubscribe(); await Coach.api('push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch (e) {} Coach.pushUI(box); Coach.poll(); };
    },
    async enablePush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push non supporté par ce navigateur');
      if ((await Notification.requestPermission()) !== 'granted') throw new Error(c('pushDenied'));
      const k = await Coach.api('push/key'); if (!k.json.available) throw new Error(c('pushNA'));
      const raw = atob(k.json.public_key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - k.json.public_key.length % 4) % 4));
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (ch) => ch.charCodeAt(0)) });
      const r = await Coach.api('push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) }); if (r.status !== 200) throw new Error(r.json.error || 'Erreur');
      UI.toast(c('pushActive'), { icon: 'check' }); Coach.poll();
    }
  };
  Coach.Player = Player; Coach.Preview = Preview; Coach.md = md; Coach.L = L; Coach.c = c; Coach.sw = sw; Coach.fmtT = fmtT;
  window.CoachView = Coach;
})();
