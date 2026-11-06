/* Present — rappels (Notifications API). Se déclenchent app ouverte / récemment active. */
(function () {
  const N = {
    supported: 'Notification' in window,
    async ensurePermission() {
      if (!N.supported) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      try { return (await Notification.requestPermission()) === 'granted'; } catch (e) { return false; }
    },
    async show(title, body, tag) {
      const opts = { body, tag, icon: 'assets/images/app-icon-192.png', badge: 'assets/images/badge-96.png', data: { url: './#/timeline' } };
      try {
        const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
        if (reg && reg.showNotification) return reg.showNotification(title, opts);
        new Notification(title, opts);
      } catch (e) { /* ignoré */ }
    },
    check() {
      if (!Store.settings.reminders) return;
      const today = U.today(), now = U.nowMin(), seen = Store.meta.notified || {};
      let dirty = false;
      Object.keys(seen).forEach((k) => { if (!k.startsWith(today)) { delete seen[k]; dirty = true; } });
      Store.itemsOn(today).forEach((it) => {
        if (it.remind === null || it.remind === undefined || it.start === null || it.done) return;
        const at = it.start - it.remind, key = `${today}|${it.kind}|${it.id}|${at}`;
        if (now >= at && now < at + 45 && !seen[key]) {
          seen[key] = 1; dirty = true;
          const body = it.remind ? `${U.hm(it.start)} · ${T('rem.' + it.remind)}` : U.hm(it.start);
          if (N.supported && Notification.permission === 'granted') N.show(it.title, body, key);
          else UI.toast(`${it.title} · ${U.hm(it.start)}`, { icon: 'bell', ms: 5000 });
        }
      });
      if (dirty) Store.setMeta({ notified: seen });
    },
    start() { N.check(); setInterval(N.check, 30000); document.addEventListener('visibilitychange', () => !document.hidden && N.check()); }
  };
  window.Notifier = N;
})();
