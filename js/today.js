/* Present — écran Accueil */
(function () {
  const esc = U.esc;
  let prevPct = null;

  const habitRow = (h, date) => {
    const done = Store.isDone(h.id, date), v = Store.value(h.id, date), m = Store.meas(h);
    const prog = m ? `${Store.fmtVal(h, v)} / ${Store.fmtVal(h, h.target)}` : h.goal;
    const sub = [prog, h.time, Store.note(h.id, date) && '✎'].filter(Boolean).join(' · ');
    return `<div class="row-card${done ? ' is-done' : ''}" data-id="${h.id}">
      <button type="button" class="row-card__main" data-act="habit-open" data-id="${h.id}">${UI.bubble(h.icon, h.color, 42, 21)}
        <span class="row-card__txt"><b>${esc(h.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>
      ${Forms.chk(h, date, 'habit-toggle')}</div>`;
  };
  const taskRow = (it) => `<div class="row-card${it.done ? ' is-done' : ''}">
      <button type="button" class="row-card__main" data-act="task-open" data-id="${it.id}">${UI.bubble(it.icon, it.color, 42, 21)}
        <span class="row-card__txt"><b>${esc(it.title)}</b><small>${it.start !== null ? U.hm(it.start) + (it.dur ? ' – ' + U.hm((it.start + it.dur) % 1440) : '') : T('tl.noTime')}</small></span></button>
      <button type="button" class="chk${it.done ? ' on' : ''}" data-act="task-toggle" data-id="${it.id}" role="checkbox" aria-checked="${it.done}" aria-label="${esc(it.title)}">${Icons.i('check', 16, 3.2)}</button></div>`;

  const Today = {
    acts: {
      'habit-open': (el) => Forms.entry(el.dataset.id, U.today()),
      'habit-toggle': (el) => App.toggleItem({ kind: 'habit', id: el.dataset.id, date: U.today() }),
      'task-open': (el) => Forms.task({ id: el.dataset.id, date: U.today() }),
      'task-toggle': (el) => App.toggleItem({ kind: 'task', id: el.dataset.id, date: U.today() }),
      'home-add-habit': () => Forms.habit(),
      'home-next': () => App.go('timeline', U.today()),
      'home-bell': () => Today.bell(),
      'home-all': () => App.go('calendar'),
      'home-coach': () => App.go('coach'),
      'home-verse': () => App.go('coach', 'verse')
    },
    fab: 'add',
    greet(g, name) { const w = T('greet.' + g).replace(/\s*!$/, ''); return w + (name ? ' ' + name : '') + (I18n.lang === 'fr' ? ' !' : '!'); },

    render() {
      const date = U.today(), hs = Store.habitsOn(date), s = Stats.day(date), streak = Stats.streak();
      const hr = new Date().getHours();
      const g = hr < 5 ? 'night' : hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
      const tasks = Store.itemsOn(date).filter((i) => i.kind === 'task');
      const now = U.nowMin();
      const next = Store.itemsOn(date).filter((i) => !i.done && i.start !== null && (i.start >= now || (i.dur && i.start + i.dur > now)))[0];
      const goal = Stats.nextMilestone(streak);
      const quote = T('quote.' + ((U.parse(date).getDate() % 5) + 1));
      const pct = s.total ? s.pct : 0;
      Today._pct = pct;

      return `
      <header class="appbar"><div class="brand">${Icons.i('leaf', 22, 2.2)}<span>Present</span></div>
        <button class="icon-btn" data-act="home-bell" aria-label="${T('bell.title')}">${Icons.i('bell', 22)}</button></header>
      <div class="page">
        <div class="hello"><h1>${esc(Today.greet(g, Store.settings.name))}</h1><p class="muted">${esc(U.longDate(date))} · ${T('today.sub')}</p></div>

        <section class="card hero">
          <div class="hero__ring">${UI.ring(prevPct ?? 0, 104, 10)}<div class="hero__pct">${pct}<small>%</small></div></div>
          <div class="hero__info">
            <div class="hero__big">${s.done}<span> / ${s.total}</span></div><div class="muted">${T('today.habitsToday')}</div>
            <div class="hero__streak">${Icons.i('flame', 18, 2.2)}<b>${streak}</b> ${T(streak > 1 ? 'days' : 'day')}<small class="muted"> · ${T('today.streak')}</small></div>
          </div>
        </section>

        ${window.CoachView && CoachView.info && CoachView.info.verse_due ? `<button type="button" class="coachcard" data-act="home-verse">${UI.bubble('book', 'var(--primary)', 42, 21)}<span class="coachcard__t"><small>${I18n.lang === 'fr' ? 'Verset à réviser' : 'Verse to review'}</small><b>${esc(CoachView.info.verse_due.ref)}</b></span>${Icons.i('right', 20)}</button>` : ''}
        ${window.CoachView && CoachView.info && CoachView.info.last ? `<button type="button" class="coachcard" data-act="home-coach">${UI.bubble('sparkle', 'var(--primary)', 42, 21)}<span class="coachcard__t"><small>Coach${CoachView.info.unread ? ' · ●' : ''}</small><b>${esc(CoachView.info.last.title || CoachView.info.last.text.slice(0, 70))}</b>${CoachView.info.last.title ? `<em>${esc(CoachView.info.last.text.slice(0, 90))}</em>` : ''}</span>${Icons.i(CoachView.info.last.audio ? 'play' : 'right', 20)}</button>` : ''}

        ${next ? `<button type="button" class="next" data-act="home-next" style="--c:${next.color}">${UI.bubble(next.icon, next.color, 40, 20)}
          <span class="next__t"><small>${T('today.next')} · ${U.hm(next.start)}</small><b>${esc(next.title)}</b></span>${Icons.i('right', 20)}</button>` : ''}

        <div class="sec-hd"><h2>${T('today.yourHabits')}</h2><button type="button" class="link" data-act="home-all">${T('today.seeAll')} ${Icons.i('right', 14, 2.5)}</button></div>
        ${hs.length ? `<div class="stack">${hs.map((h) => habitRow(h, date)).join('')}</div>` :
          `<div class="empty">${Icons.i('leaf', 40, 1.5)}<h3>${T(Store.activeHabits().length ? 'today.restDay' : 'today.noHabits')}</h3>${Store.activeHabits().length ? '' : `<p>${T('today.noHabitsSub')}</p><button class="btn btn--primary" data-act="home-add-habit" type="button">${T('habit.new')}</button>`}</div>`}

        ${tasks.length ? `<div class="sec-hd"><h2>${T('cal.tasks')}</h2></div><div class="stack">${tasks.map(taskRow).join('')}</div>` : ''}

        <section class="card goal"><div class="goal__hd">${Icons.i('trophy', 20)}<b>${T('goal.title')}</b></div>
          <p class="muted">${T('goal.sub', { n: goal })}</p>
          <div class="bar"><i style="width:${U.pct(Math.min(streak, goal), goal)}%"></i></div>
          <div class="goal__ft"><span>${T('goal.progress', { a: streak, b: goal })}</span></div></section>

        <p class="quote">“${esc(quote)}”</p>
      </div>`;
    },

    mount(root) {
      const fill = root.querySelector('.hero__ring .ring__fill');
      if (fill) {
        const r = +fill.getAttribute('r'), c = 2 * Math.PI * r;
        requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.strokeDashoffset = (c * (1 - Today._pct / 100)).toFixed(1); }));
      }
      prevPct = Today._pct;
    },

    bell() {
      const date = U.today(), items = Store.itemsOn(date).filter((i) => i.remind !== null && i.remind !== undefined && i.start !== null);
      const supported = window.Notifier && Notifier.supported;
      const perm = supported ? Notification.permission : 'denied';
      UI.sheet({
        title: T('bell.title'), cls: 'sheet--dialog',
        body: `${items.length ? `<div class="stack">${items.map((i) => `<div class="row-card row-card--sm">${UI.bubble(i.icon, i.color, 34, 17)}<span class="row-card__txt"><b>${esc(i.title)}</b><small>${U.hm(i.start - i.remind)}${i.remind ? ' · ' + T('rem.' + i.remind) : ''}</small></span>${i.done ? `<span class="tag">${T('done')}</span>` : ''}</div>`).join('')}</div>` : `<p class="muted">${T('bell.none')}</p>`}
          ${supported && perm !== 'granted' ? `<button type="button" class="btn btn--primary btn--full" id="bell-en">${T('bell.enable')}</button>` : ''}
          ${perm === 'denied' && supported ? `<p class="muted small">${T('set.notifDenied')}</p>` : ''}
          <p class="muted small">${T('bell.note')}</p>`,
        onMount(el, close) { const b = el.querySelector('#bell-en'); if (b) b.onclick = async () => { await Notifier.ensurePermission(); close(); }; }
      });
    }
  };
  window.TodayView = Today;
})();
