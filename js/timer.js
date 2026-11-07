/* Present — minuteur sur les blocs de la timeline : enregistre le temps réellement passé */
(function () {
  const KEY = 'present_timer', SKIP = 'present_timer_skip';                 // état propre à l'appareil (pas dans db.json)
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const persist = () => { try { Timer.st ? localStorage.setItem(KEY, JSON.stringify(Timer.st)) : localStorage.removeItem(KEY); } catch (e) {} };
  const hms = (ms) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`; };

  const Timer = {
    st: load(), _iv: 0,
    elapsed() { const s = Timer.st; return s ? s.acc + (s.running ? Date.now() - s.t0 : 0) : 0; },
    is: (kind, id, date) => !!Timer.st && Timer.st.kind === kind && Timer.st.id === id && Timer.st.date === date,
    fmt: () => hms(Timer.elapsed()),
    // un élément peut être chronométré s'il a une durée prévue (ou une habitude de type Temps)
    can: (it) => !it.done && ((it.dur || 0) > 0 || (it.kind === 'habit' && it.raw && it.raw.type === 'time')),

    info(kind, id, date) {
      if (kind === 'habit') { const h = Store.habit(id); return h && { title: h.name, icon: h.icon, color: h.color, planned: h.type === 'time' ? h.target : h.dur || 0 }; }
      const t = Store.task(id); return t && { title: t.title, icon: t.icon, color: t.color, planned: t.dur || 0 };
    },
    async begin(kind, id, date) {
      const inf = Timer.info(kind, id, date); if (!inf) return;
      if (Timer.st) {
        if (Timer.is(kind, id, date)) return Timer.toggle();
        if (!(await UI.confirm({ title: T('tm.switchQ'), text: T('tm.switchSub', { t: Timer.st.title }), ok: T('tm.switch') }))) return;
        Timer.stop();
      }
      Timer.st = { kind, id, date, ...inf, t0: Date.now(), acc: 0, running: true, alerted: false }; persist(); UI.haptic(15); Timer.paint(true);
    },
    toggle() {
      const s = Timer.st; if (!s) return;
      if (s.running) { s.acc += Date.now() - s.t0; s.running = false; } else { s.t0 = Date.now(); s.running = true; }
      persist(); Timer.paint(true);
    },
    // termine et enregistre : habitude Temps → ajouté à la valeur ; tâche → terminée si le prévu est atteint
    stop(capMs) {
      const s = Timer.st; if (!s) return;
      Timer.skip(s.kind, s.id, s.date);
      const ms = capMs ? Math.min(Timer.elapsed(), capMs) : Timer.elapsed(), min = ms >= 30000 ? Math.max(1, Math.round(ms / 60000)) : 0;
      Timer.st = null; persist(); Timer.paint(true);
      if (!min) return UI.toast(T('tm.short'));
      Store.addSpent(s.kind, s.id, s.date, min);
      if (s.kind === 'habit') { const h = Store.habit(s.id); if (h && h.type === 'time') { Store.addValue(s.id, s.date, min); App.habitProgressed(s.date); } }
      let action;
      if (s.kind === 'task' && !Store.isTaskDone(s.id, s.date)) {
        if (s.planned && Store.spent('task', s.id, s.date) >= s.planned) Store.toggleTask(s.id, s.date);
        else action = { label: T('tm.complete'), action: () => Store.toggleTask(s.id, s.date) };
      }
      UI.toast(T('tm.saved', { d: U.dur(min) }) + ` · ${s.title}`, { icon: 'check', ms: 4500, ...(action || {}) });
    },
    discard() { if (Timer.st) Timer.skip(Timer.st.kind, Timer.st.id, Timer.st.date); Timer.st = null; persist(); Timer.paint(true); },

    /* ----- démarrage / fin automatiques selon l'horaire du bloc ----- */
    skipped() { try { return JSON.parse(localStorage.getItem(SKIP)) || {}; } catch (e) { return {}; } },
    skip(kind, id, date) {
      const o = Timer.skipped(), today = U.today();
      Object.keys(o).forEach((k) => { if (!k.startsWith(today)) delete o[k]; });
      o[`${date}|${kind}|${id}`] = 1; try { localStorage.setItem(SKIP, JSON.stringify(o)); } catch (e) {}
    },
    auto() {
      if (!window.Store || !Store.itemsOn) return;
      const today = U.today(), now = U.nowMin(), s = Timer.st;
      if (s && s.auto && (s.date !== today || now >= s.end)) {                        // fin du bloc → arrêt + enregistrement
        const t = s.title, cap = s.dur * 60000, mins = Math.max(1, Math.round(Math.min(Timer.elapsed(), cap) / 60000));
        Timer.stop(cap); UI.haptic([30, 60, 30]);
        if (window.Notifier) Notifier.notify(T('tm.autoEnd', { t }), T('tm.autoEndBody', { d: U.dur(mins) }), 'timer-end-' + s.id, { toast: false });
        return;
      }
      if (Timer.st) return;
      const sk = Timer.skipped();
      const it = Store.itemsOn(today).find((i) => i.start !== null && i.dur > 0 && !i.done && Timer.can(i) && now >= i.start && now < i.start + i.dur && !sk[`${today}|${i.kind}|${i.id}`]);
      if (!it) return;
      const inf = Timer.info(it.kind, it.id, today); if (!inf) return;
      Timer.st = { kind: it.kind, id: it.id, date: today, ...inf, t0: Date.now(), acc: 0, running: true, alerted: true, auto: true, end: it.start + it.dur, dur: it.dur };
      persist(); UI.haptic(15); Timer.paint(true);
      if (window.Notifier) Notifier.notify(T('tm.autoStart', { t: it.title }), T('tm.autoStartBody', { a: U.hm(it.start), b: U.hm((it.start + it.dur) % 1440) }), 'timer-start-' + it.id, { icon: 'play' });
    },

    /* ----- interface : barre flottante + puces de la timeline ----- */
    paint(full) {
      const bar = document.getElementById('tbar'), app = document.querySelector('.app'); if (!bar) return;
      const s = Timer.st;
      app.classList.toggle('app--timing', !!s); document.body.classList.toggle('is-timing', !!s); bar.hidden = !s;
      if (!s) { clearInterval(Timer._iv); Timer._iv = 0; if (full) document.querySelectorAll('.tl__go').forEach((b) => b.classList.remove('on')); if (full && window.App) App.requestRender(); return; }
      if (full || !bar.firstChild) {
        bar.style.setProperty('--c', s.color);
        bar.innerHTML = `<button type="button" class="tbar__main" data-tm="open">${UI.bubble(s.icon, s.color, 38, 19)}<span class="tbar__t"><b>${U.esc(s.title)}</b><small><span class="tbar__e"></span>${s.planned ? ` / ${U.dur(s.planned)}` : ''}</small></span></button>
          <button type="button" class="tbar__b" data-tm="toggle" aria-label="${T(s.running ? 'tm.pause' : 'tm.resume')}">${Icons.i(s.running ? 'pause' : 'play', 20)}</button>
          <button type="button" class="tbar__b tbar__b--ok" data-tm="stop" aria-label="${T('tm.stop')}">${Icons.i('check', 20, 3)}</button>
          <button type="button" class="tbar__b tbar__b--x" data-tm="discard" aria-label="${T('tm.discard')}">${Icons.i('x', 18)}</button>`;
        if (window.App && full) App.requestRender();
      }
      bar.classList.toggle('paused', !s.running);
      const t = Timer.fmt(); const e = bar.querySelector('.tbar__e'); if (e) e.textContent = t;
      document.querySelectorAll('.tl__go.on .tm-live').forEach((x) => { x.textContent = t; });
      if (!Timer._iv) Timer._iv = setInterval(Timer.tick, 1000);
    },
    tick() {
      const s = Timer.st; if (!s) return;
      if (!document.hidden) Timer.paint(false);
      if (s.running && s.planned && !s.alerted && Timer.elapsed() >= s.planned * 60000) {         // temps prévu atteint
        s.alerted = true; persist(); UI.haptic([30, 60, 30]);
        const msg = T('tm.reached', { t: s.title, d: U.dur(s.planned) });
        if (document.hidden && window.Notifier && Notifier.supported && Notification.permission === 'granted') Notifier.show(s.title, msg, 'timer'); else UI.toast(msg, { icon: 'clock', ms: 6000 });
      }
    },
    init() {
      const bar = document.getElementById('tbar');
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tm]'); if (!b) return;
        const a = b.dataset.tm;
        if (a === 'toggle') Timer.toggle(); else if (a === 'stop') Timer.stop();
        else if (a === 'discard') UI.confirm({ title: T('tm.discard') + ' ?', ok: T('tm.discard'), danger: true }).then((ok) => ok && Timer.discard());
        else if (a === 'open' && Timer.st) App.go('timeline', Timer.st.date);
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) Timer.paint(false); });
      Timer.paint(false);
      setInterval(Timer.auto, 5000); setTimeout(Timer.auto, 800);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) Timer.auto(); });
      // première interaction : demande l'autorisation de notifier (début / fin des blocs)
      const ask = () => { document.removeEventListener('pointerdown', ask); if (window.Notifier && Notifier.supported && Notification.permission === 'default' && Store.settings.reminders) Notifier.ensurePermission(); };
      document.addEventListener('pointerdown', ask);
    }
  };
  window.Timer = Timer;
})();
