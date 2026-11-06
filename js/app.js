/* Present — bootstrap, routeur par hash, navigation, thème */
(function () {
  const { $ } = UI;
  const NAV = [['today', 'home', 'nav.today'], ['timeline', 'list', 'nav.timeline'], ['calendar', 'calendar', 'nav.calendar'], ['stats', 'chart', 'nav.stats'], ['coach', 'sparkle', 'nav.coach'], ['profile', 'user', 'nav.profile']];

  const App = {
    VERSION: '2.5.0',
    date: U.today(),
    installPrompt: null,
    _route: 'today', _param: null, _tlScroll: false, _raf: 0, _minute: -1, _touching: false,
    views: {},
    route: () => App._route,

    /* ---------- Navigation ---------- */
    go(r, p) {
      const h = '#/' + r + (p ? '/' + p : '');
      if (location.hash === h) App.handleRoute(); else location.hash = h;
    },
    back() { if (App._navCount > 1) history.back(); else App.go('today'); },
    setDate(d) { App.date = d; App._tlScroll = true; if (App._route !== 'timeline') App.go('timeline', d); else { history.replaceState(history.state, '', '#/timeline/' + d); App.render(); } },

    handleRoute() {
      const [r, p] = (location.hash.replace(/^#\/?/, '') || 'today').split('/');
      const route = App.views[r] ? r : 'today';
      if (route === 'timeline') { App.date = p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : App.date; }
      const changed = route !== App._route || p !== App._param;
      App._route = route; App._param = p || null;
      if (changed) { if (route === 'timeline') App._tlScroll = true; $('#view').scrollTop = 0; }
      App._navCount = (App._navCount || 0) + 1;
      App.render(changed);
    },

    requestRender() { cancelAnimationFrame(App._raf); App._raf = requestAnimationFrame(() => App.render()); },

    render() {
      const v = App.views[App._route], root = $('#view'), top = root.scrollTop;
      root.classList.toggle('view--chat', App._route === 'coach');
      root.innerHTML = v.render(App._param);
      root.scrollTop = top;
      v.mount && v.mount(root);
      document.querySelectorAll('#nav a').forEach((a) => {
        const on = a.dataset.r === (App._route === 'habit' ? 'today' : App._route);
        a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false');
      });
      if (App._pop) { document.querySelectorAll(`#view [data-act$="toggle"][data-id="${App._pop}"], #view [data-id="${App._pop}"] [data-act="tl-toggle"]`).forEach((n) => n.classList.add('pop')); App._pop = null; }
      const fab = $('#fab'); fab.hidden = !v.fab;
      fab.setAttribute('aria-label', T(v.fab === 'task' ? 'task.new' : 'btn.add'));
      document.title = 'Present — ' + T('nav.' + (App._route === 'habit' ? 'today' : App._route));
    },

    /* ---------- Cocher habitude / tâche ---------- */
    toggleItem(it) {
      const isH = it.kind === 'habit', h = isH ? Store.habit(it.id) : null, prev = isH ? Store.value(it.id, it.date) : 0;
      const on = isH ? Store.toggleHabit(it.id, it.date) : Store.toggleTask(it.id, it.date);
      if (!on) return;
      UI.haptic(12); App._pop = it.id;
      const undo = () => (isH ? (Store.meas(h) ? Store.setValue(it.id, it.date, prev) : Store.toggleHabit(it.id, it.date)) : Store.toggleTask(it.id, it.date));
      UI.toast(isH ? T('habit.validated') : T('act.complete'), { icon: 'check', action: undo });
      if (isH) App.habitProgressed(it.date);
    },
    // journée parfaite ? (utilisé par la coche, la saisie rapide et plus tard le minuteur)
    habitProgressed(date) {
      if (date !== U.today()) return;
      const s = Stats.day(date);
      if (s.total && s.done === s.total && Store.meta.celebrated !== date) { Store.setMeta({ celebrated: date }); setTimeout(App.celebrate, 450); }
    },
    celebrate() {
      const streak = Stats.streak();
      const reached = Stats.MILESTONES.includes(streak);
      const nxt = Stats.nextMilestone(streak);
      UI.sheet({
        cls: 'sheet--dialog sheet--center',
        body: `<div class="cele"><div class="cele__trophy">${Icons.i('trophy', 64, 1.5)}</div>
          <h2>${reached ? T('st.streakGoal', { n: streak }) : T('goal.celebrate')}</h2><p class="muted">${T('goal.celebrateSub')}</p>
          <div class="cele__sub muted">${T('goal.title')} · ${T('st.streakGoal', { n: nxt })}</div>
          <div class="bar"><i style="width:${U.pct(streak, nxt)}%"></i></div><div class="muted small">${T('goal.progress', { a: streak, b: nxt })}</div>
          <button class="btn btn--primary btn--full" data-close type="button">${T('goal.close')}</button></div>`
      });
      UI.haptic([20, 40, 20]);
    },

    /* ---------- Thème / langue ---------- */
    applyTheme() {
      const t = Store.settings.theme, root = document.documentElement;
      if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
      const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      $('meta[name=theme-color]').setAttribute('content', dark ? '#121214' : '#F2F2F4');
    },
    buildNav() {
      $('#nav').innerHTML = NAV.map(([r, ic, k]) => `<a href="#/${r}" data-r="${r}"><span class="nav__ic">${Icons.i(ic, 22)}</span><span class="nav__l">${T(k)}</span></a>`).join('');
      $('#fab').innerHTML = Icons.i('plus', 26, 2.6); App.syncDot();
    },
    syncDot() { const n = document.querySelector('#nav a[data-r=profile] .nav__ic'); if (n) n.dataset.sync = ['pending', 'offline', 'conflict', 'error', 'auth'].includes(Sync.state) ? Sync.state : ''; },
    rebuildChrome() { App.buildNav(); App.render(); },

    /* ---------- Init ---------- */
    init() {
      Object.assign(App.views, { today: TodayView, timeline: TimelineView, calendar: CalendarView, stats: StatsView, coach: CoachView, profile: ProfileView, habit: HabitView });
      I18n.set(Store.settings.lang); App.applyTheme(); CalendarView.init(); App.buildNav();
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', App.applyTheme);

      const acts = Object.assign({}, ...Object.values(App.views).map((v) => v.acts || {}));
      UI.delegate($('#view'), acts);
      $('#fab').onclick = async () => {
        if (App.views[App._route].fab === 'task') return Forms.task({ date: App._route === 'timeline' ? App.date : U.today() });
        const c = await UI.choose({ title: T('btn.add'), options: [{ label: T('habit.new'), value: 'h', primary: true }, { label: T('task.new'), value: 't' }] });
        if (c === 'h') setTimeout(() => Forms.habit(), 260); else if (c === 't') setTimeout(() => Forms.task({ date: U.today() }), 260);
      };
      $('#file-import').onchange = (e) => { const f = e.target.files[0]; if (f) ProfileView.handleFile(f); e.target.value = ''; };

      Store.on(() => App.requestRender());
      window.addEventListener('hashchange', App.handleRoute);
      window.addEventListener('present:storage-error', () => UI.toast('⚠ ' + T('set.importErr'), { ms: 6000 }));
      window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.installPrompt = e; if (App._route === 'profile') App.render(); });
      window.addEventListener('offline', () => UI.toast(T('offline'), { icon: 'bell' }));
      document.addEventListener('touchstart', () => (App._touching = true), { passive: true });
      document.addEventListener('touchend', () => setTimeout(() => (App._touching = false), 400), { passive: true });

      // rafraîchissement à la minute (ligne "maintenant", passage à minuit)
      const tick = () => {
        const m = Math.floor(Date.now() / 60000);
        if (m === App._minute || document.hidden || UI.isOpen() || App._touching) return;
        App._minute = m;
        if (['today', 'timeline'].includes(App._route)) App.render();
      };
      setInterval(tick, 15000); document.addEventListener('visibilitychange', () => { if (!document.hidden) { App._minute = -1; tick(); } });

      window.addEventListener('present:sync', () => { App.syncDot(); if (App._route === 'profile' && !UI.isOpen()) App.requestRender(); });
      if (!location.hash) history.replaceState(null, '', '#/today');
      App.handleRoute(); Notifier.start(); Sync.init(); CoachView.start(); Timer.init();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('./service-worker.js').then((reg) => {
          reg.addEventListener('updatefound', () => {
            const w = reg.installing;
            w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) UI.toast(T('update.ready'), { icon: 'sparkle', label: T('update.reload'), action: () => location.reload(), ms: 12000 }); });
          });
        }).catch(() => {});
      }
    }
  };
  window.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})();
