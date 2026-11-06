/* Present — synchronisation avec db.json via server.py (temps réel, avec repli manuel) */
(function () {
  const LS = 'present_sync';
  const POLL_MS = 20000, DEBOUNCE_MS = 900;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();

  const Sync = {
    state: 'checking',            // checking | synced | pending | offline | conflict | auth | manual | error
    etag: saved.etag || '', dirty: !!saved.dirty, token: saved.token || '', last: saved.last || 0, hadServer: !!saved.etag,
    detail: '', _timer: 0, _poll: 0, _ver: 0, _applying: false, _busy: false, _server: null, _prompted: false,

    _persist() { try { localStorage.setItem(LS, JSON.stringify({ etag: Sync.etag, dirty: Sync.dirty, token: Sync.token, last: Sync.last })); } catch (e) {} },
    _set(state, detail = '') { Sync.state = state; Sync.detail = detail; window.dispatchEvent(new CustomEvent('present:sync')); },
    get active() { return !['manual', 'auth'].includes(Sync.state); },
    setToken(t) { Sync.token = t.trim(); Sync._persist(); return Sync.check(true); },

    async api(path, opt = {}) {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
      try {
        const r = await fetch(path, { ...opt, signal: ctl.signal, cache: 'no-store', headers: { ...(opt.headers || {}), ...(Sync.token ? { 'X-Token': Sync.token } : {}) } });
        const ct = r.headers.get('content-type') || '';
        return { status: r.status, json: ct.includes('json') ? await r.json().catch(() => null) : null };
      } finally { clearTimeout(to); }
    },

    /* ---------- cycle de vie ---------- */
    init() {
      if (location.protocol === 'file:') return Sync._set('manual');
      Store.on(() => Sync._onChange());
      window.addEventListener('online', () => Sync.check());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) Sync.check(); });
      Sync._poll = setInterval(() => { if (!document.hidden && Sync.active && !['conflict', 'checking'].includes(Sync.state)) Sync.poll(); }, POLL_MS);
      return Sync.check(true);
    },

    _onChange() {
      if (Sync._applying || ['manual', 'auth'].includes(Sync.state)) return;
      Sync._ver++; Sync.dirty = true; Sync._persist();
      if (Sync.state !== 'conflict') Sync._set('pending');
      clearTimeout(Sync._timer); Sync._timer = setTimeout(() => Sync.push(), DEBOUNCE_MS);
    },

    // détection d'une modification externe (script, édition à la main, autre appareil)
    async poll() {
      try {
        const r = await Sync.api('./api/etag');
        if (r.status === 200 && r.json && r.json.etag !== Sync.etag) return Sync.check();
        if (Sync.state === 'offline') return Sync.check();
      } catch (e) { if (Sync.state !== 'pending') Sync._set('offline'); }
    },

    async check(initial) {
      if (Sync._busy) return; Sync._busy = true;
      try {
        const r = await Sync.api('./api/db');
        if (r.status === 401) return Sync._set('auth');
        if (r.status === 422) return Sync._set('error', (r.json && r.json.error) || '');
        if (r.status !== 200 || !r.json || !('exists' in r.json)) return Sync._set('manual');   // serveur statique : pas d'API
        Sync.hadServer = true; if (!Sync.active) Sync._set('checking');
        const { exists, etag, db } = r.json;
        if (!exists) { Sync.etag = 'none'; Sync.dirty = true; return await Sync.push(true); }
        if (etag === Sync.etag) return Sync.dirty ? await Sync.push(true) : Sync._set('synced');
        // le fichier a changé depuis la dernière synchro
        const firstRun = !Sync.etag;
        if (!Sync.dirty && (!firstRun || Store.isPristine())) { Sync._apply(db, etag, !initial); return; }
        Sync._server = { etag, db }; Sync._set('conflict'); Sync.resolve();
      } catch (e) {
        Sync._set(Sync.hadServer || navigator.onLine === false ? 'offline' : 'manual');
      } finally { Sync._busy = false; }
    },

    _apply(db, etag, notify) {
      Sync._applying = true;
      try { Store.import(db, { keepSettings: true }); } catch (e) { Sync._applying = false; return Sync._set('error', 'db.json'); }
      Sync._applying = false; Sync.etag = etag; Sync.dirty = false; Sync.last = Date.now(); Sync._persist(); Sync._set('synced');
      if (notify) UI.toast(T('sync.loaded'), { icon: 'check' });
    },

    async push(force) {
      clearTimeout(Sync._timer);
      if (!Sync.active) return;
      const ver = Sync._ver;
      try {
        const r = await Sync.api('./api/db', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': Sync.etag || 'none' }, body: JSON.stringify({ data: Store.export() }) });
        if (r.status === 200) {
          Sync.etag = r.json.etag; Sync.last = Date.now();
          if (ver === Sync._ver) { Sync.dirty = false; Sync._persist(); Sync._set('synced'); }
          else { Sync._persist(); Sync._set('pending'); Sync._timer = setTimeout(() => Sync.push(), 200); }
          return true;
        }
        if (r.status === 409) { Sync._server = { etag: r.json.etag, db: r.json.db }; Sync._set('conflict'); return Sync.resolve(); }
        if (r.status === 401) return Sync._set('auth');
        Sync._set('error', (r.json && r.json.error) || String(r.status));
      } catch (e) { Sync._set('offline'); }
    },

    /* ---------- actions utilisateur ---------- */
    async flush() {          // bouton « Enregistrer maintenant »
      if (Sync.state === 'manual' || Sync.state === 'auth') return false;
      if (Sync.state === 'conflict') return Sync.resolve();
      if (Sync.state === 'offline' || Sync.state === 'error') await Sync.check(true);
      else { Sync.dirty = true; await Sync.push(true); }
      if (Sync.state === 'synced') UI.toast(T('sync.saved'), { icon: 'check' });
      else UI.toast(T('sync.' + Sync.state));
    },
    async pull() {           // bouton « Recharger depuis db.json »
      const r = await Sync.api('./api/db').catch(() => null);
      if (!r || r.status !== 200 || !r.json.exists) return UI.toast(T('sync.' + (Sync.state === 'manual' ? 'manual' : 'offline')));
      if (Sync.dirty && !(await UI.confirm({ title: T('sync.reloadQ'), text: T('sync.reloadSub'), ok: T('sync.reload'), danger: true }))) return;
      Sync._apply(r.json.db, r.json.etag, false); UI.toast(T('sync.loaded'), { icon: 'check' });
    },
    async resolve() {
      if (Sync._prompted || !Sync._server) return; Sync._prompted = true;
      const c = await UI.choose({ title: T('sync.conflictTitle'), text: T('sync.conflictText'), options: [{ label: T('sync.mine'), value: 'mine', primary: true }, { label: T('sync.theirs'), value: 'theirs', danger: true }, { label: T('sync.later'), value: null }] });
      Sync._prompted = false;
      if (!c || !Sync._server) return;
      if (c === 'theirs') Sync._apply(Sync._server.db, Sync._server.etag, true);
      else { Sync.etag = Sync._server.etag; Sync.dirty = true; Sync._set('pending'); await Sync.push(true); }
      Sync._server = null;
    },
    ago() {
      if (!Sync.last) return '';
      const s = Math.round((Sync.last - Date.now()) / 1000), f = new Intl.RelativeTimeFormat(I18n.lang, { numeric: 'auto' });
      return Math.abs(s) < 60 ? f.format(s, 'second') : Math.abs(s) < 3600 ? f.format(Math.round(s / 60), 'minute') : f.format(Math.round(s / 3600), 'hour');
    }
  };
  window.Sync = Sync;
})();
