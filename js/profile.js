/* Present — Profil / réglages */
(function () {
  const esc = U.esc;
  const save = (name, data, type = 'application/json') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const Profile = {
    acts: {
      'pf-reminders': async () => {
        const on = !Store.settings.reminders; Store.setSettings({ reminders: on });
        if (on) { const ok = await Notifier.ensurePermission(); if (!ok && Notifier.supported) UI.toast(T('set.notifDenied')); }
      },
      'pf-name': () => {
        UI.sheet({ title: T('set.name'), cls: 'sheet--dialog', body: `<input class="inp" id="nm" maxlength="24" value="${esc(Store.settings.name)}" autocomplete="given-name"><button class="btn btn--primary btn--full" id="nm-ok" type="button">${T('btn.save')}</button>`,
          onMount(el, close) { const i = el.querySelector('#nm'); setTimeout(() => i.focus(), 300); const ok = () => { Store.setSettings({ name: i.value.trim() }); close(); }; el.querySelector('#nm-ok').onclick = ok; i.onkeydown = (e) => e.key === 'Enter' && ok(); } });
      },
      'pf-theme': (el) => { Store.setSettings({ theme: el.dataset.v }); App.applyTheme(); },
      'pf-lang': (el) => { Store.setSettings({ lang: el.dataset.v }); I18n.set(el.dataset.v); App.rebuildChrome(); },
      'pf-sync-save': () => (Sync.state === 'manual' ? Profile.acts['pf-export']() : Sync.flush()),
      'pf-sync-load': () => (Sync.state === 'manual' ? document.getElementById('file-import').click() : Sync.pull()),
      'pf-token': () => UI.sheet({ title: T('sync.token'), cls: 'sheet--dialog', body: `<input class="inp" id="tk" type="password" autocomplete="off" placeholder="${esc(T('sync.tokenPh'))}"><button class="btn btn--primary btn--full" id="tk-ok" type="button">${T('btn.save')}</button>`,
        onMount(el, close) { const i = el.querySelector('#tk'); setTimeout(() => i.focus(), 300); const ok = () => { Sync.setToken(i.value); close(); }; el.querySelector('#tk-ok').onclick = ok; i.onkeydown = (e) => e.key === 'Enter' && ok(); } }),
      'pf-export': () => { save(`present-${U.today()}.json`, JSON.stringify(Store.export(), null, 2)); UI.toast(T('set.exported'), { icon: 'check' }); },
      'pf-import': () => document.getElementById('file-import').click(),
      'pf-habbit': async () => {
        try {
          const r = await fetch('./progress-data.json', { cache: 'no-store' }); if (!r.ok) throw 0;
          const n = Store.importHabbit(await r.json());
          UI.toast(n ? T('set.habbitDone', { n }) : T('set.habbitNone'), { icon: 'check' });
        } catch (e) { UI.toast(T('set.habbitErr')); }
      },
      'pf-resetday': async () => { if (await UI.confirm({ title: T('set.resetDayQ'), text: T('set.resetDaySub'), ok: T('set.resetDay'), danger: true })) { Store.resetDay(U.today()); UI.toast(T('set.resetDone'), { icon: 'check' }); } },
      'pf-resetall': async () => { if (await UI.confirm({ title: T('set.resetAllQ'), text: T('set.resetAllSub'), ok: T('set.resetAll'), danger: true })) { Store.resetAll(); App.go('today'); } },
      'pf-install': async () => { const p = App.installPrompt; if (!p) return; p.prompt(); await p.userChoice; App.installPrompt = null; App.render(); }
    },
    handleFile(file) {
      const r = new FileReader();
      r.onload = () => { try { Store.import(JSON.parse(r.result)); UI.toast(T('set.imported'), { icon: 'check' }); } catch (e) { UI.toast(T('set.importErr')); } };
      r.readAsText(file);
    },
    render() {
      const s = Store.settings;
      const row = (act, ic, label, extra = '', cls = '') => `<button type="button" class="set__r ${cls}" data-act="${act}">${Icons.i(ic, 20)}<span>${label}</span>${extra}</button>`;
      return `
      <header class="appbar"><div class="brand">${Icons.i('leaf', 22, 2.2)}<span>Present</span></div></header>
      <div class="page">
        <section class="card me"><span class="bubble bubble--lg" style="--c:var(--primary)">${Icons.i('leaf', 34, 1.8)}</span>
          <div><h1>${s.name ? esc(s.name) : T('set.title')}</h1><p class="muted">${T('set.sub')}</p></div>
          <button type="button" class="link" data-act="pf-name">${T('btn.edit')}</button></section>

        <div class="sec-hd"><h2>${T('set.prefs')}</h2></div>
        <div class="card set">
          <div class="set__r set__r--sw">${Icons.i('bell', 20)}<span>${T('set.reminders')}</span><button type="button" class="switch${s.reminders ? ' on' : ''}" data-act="pf-reminders" role="switch" aria-checked="${s.reminders}" aria-label="${T('set.reminders')}"><i></i></button></div>
          <div class="set__r set__r--seg">${Icons.i('moon', 20)}<span>${T('set.theme')}</span>${UI.seg('theme', [['auto', T('set.auto')], ['light', T('set.light')], ['dark', T('set.darkOpt')]], s.theme).replace(/data-v="(\w+)"/g, 'data-act="pf-theme" data-v="$1"')}</div>
          <div class="set__r set__r--seg">${Icons.i('globe', 20)}<span>${T('set.lang')}</span>${UI.seg('lang', [['fr', 'Français'], ['en', 'English']], s.lang).replace(/data-v="(\w+)"/g, 'data-act="pf-lang" data-v="$1"')}</div>
        </div>

        <div class="sec-hd"><h2>${T('sync.title')}</h2></div>
        <div class="card set sync sync--${Sync.state}">
          <div class="sync__st"><i class="sync__dot"></i><div><b>${T('sync.' + Sync.state)}</b>${Sync.state === 'synced' && Sync.ago() ? `<small class="muted"> · ${esc(Sync.ago())}</small>` : ''}${Sync.detail ? `<div class="muted small">${esc(Sync.detail)}</div>` : ''}</div></div>
          ${Sync.state === 'auth' ? `<button type="button" class="btn btn--primary btn--full" data-act="pf-token">${Icons.i('sparkle', 18)} ${T('sync.token')}</button>` : ''}
          <div class="sync__btns"><button type="button" class="btn btn--primary btn--full" data-act="pf-sync-save" ${Sync.state === 'auth' ? 'disabled' : ''}>${Icons.i('download', 18)} ${T('sync.save')}</button>
            <button type="button" class="btn btn--soft btn--full" data-act="pf-sync-load" ${Sync.state === 'auth' ? 'disabled' : ''}>${Icons.i('upload', 18)} ${T('sync.reload')}</button></div>
        </div>

        <div class="sec-hd"><h2>${T('set.data')}</h2></div>
        <div class="card set">
          ${row('pf-export', 'download', T('set.export'))}${row('pf-import', 'upload', T('set.import'))}${row('pf-habbit', 'book', T('set.importHabbit'))}
          ${row('pf-resetday', 'repeat', T('set.resetDay'), '', 'set__r--danger')}${row('pf-resetall', 'trash', T('set.resetAll'), '', 'set__r--danger')}
        </div>

        <div class="sec-hd"><h2>${T('set.app')}</h2></div>
        <div class="card set">
          ${App.installPrompt ? row('pf-install', 'smartphone', T('set.install'), Icons.i('right', 18)) : ''}
          <div class="set__r">${Icons.i('sparkle', 20)}<span>${T('set.version')}</span><em class="muted">${App.VERSION}</em></div>
        </div>
        <p class="muted small center">${T('set.storage')}</p>
      </div>`;
    }
  };
  window.ProfileView = Profile;
})();
