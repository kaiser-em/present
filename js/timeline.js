/* Present — Timeline (time blocker façon Structured) */
(function () {
  const esc = U.esc;
  const PX_H = 56;                 // hauteur d'une heure
  const pillH = (dur) => (dur ? U.clamp(Math.round((dur / 60) * PX_H), 56, 380) : 56);
  const end = (it) => (it.start ?? 0) + (it.dur || 0);

  function dots(d) {
    const its = Store.itemsOn(d);
    const sorted = [...its.filter((i) => i.kind === 'task'), ...its.filter((i) => i.kind === 'habit')];
    const seen = new Set(), pick = [];
    sorted.forEach((i) => { if (pick.length < 4 && !seen.has(i.color)) { seen.add(i.color); pick.push(i); } });
    return pick.map((i) => `<span class="wk__dot" style="--c:${i.color}">${Icons.i(i.icon, 8, 3)}</span>`).join('');
  }

  function row(it, d, idx, nowMin, isToday, conflict) {
    const h = pillH(it.dur), inProg = isToday && it.dur && nowMin >= it.start && nowMin < end(it);
    const prog = inProg ? Math.round(((nowMin - it.start) / it.dur) * 100) : 0;
    const mv = it.kind === 'habit' && Store.meas(it.raw) ? ` · ${Store.fmtVal(it.raw, it.val || 0)}/${Store.fmtVal(it.raw, it.raw.target)}` : '';
    const range = (it.dur ? `${U.hm(it.start)} - ${U.hm(end(it) % 1440)} (${U.dur(it.dur)})` : U.hm(it.start)) + mv;
    const subs = it.kind === 'task' && it.raw.subtasks.length ? `<span class="tl__tag">${Icons.i('check', 12, 3)} ${Store.subDone(d, it.id).length}/${it.raw.subtasks.length}</span>` : '';
    const notes = it.kind === 'task' && it.raw.notes ? `<span class="tl__tag">${Icons.i('file', 12)}</span>` : '';
    const small = h <= 60;
    const timing = isToday && window.Timer && Timer.is(it.kind, it.id, d);
    const go = isToday && window.Timer && (timing || Timer.can(it)) ? `<button type="button" class="tl__go${timing ? ' on' : ''}${timing && !Timer.st.running ? ' paused' : ''}" data-act="tl-timer">${Icons.i(timing && Timer.st.running ? 'pause' : 'play', 12)} ${timing ? `<span class="tm-live">${Timer.fmt()}</span>` : T('tm.start')}</button>` : '';
    return `<div class="tl__row${it.done ? ' is-done' : ''}${inProg ? ' is-now' : ''}${timing ? ' is-timing' : ''}" style="--c:${it.color};--h:${h}px;--p:${prog}%" data-kind="${it.kind}" data-id="${it.id}" data-i="${idx}">
      <div class="tl__time"><span class="tl__t0">${U.hm(it.start)}</span>${it.dur && h >= 110 ? `<span class="tl__t1">${U.hm(end(it) % 1440)}</span>` : ''}</div>
      <div class="tl__rail"><div class="tl__pill${it.dur ? '' : ' tl__pill--dot'}">${Icons.i(it.icon, 24, 2)}</div></div>
      <div class="tl__body" data-act="tl-open" role="button" tabindex="0">
        <div class="tl__meta">${range}${it.repeat ? ' ' + Icons.i('repeat', 13) : ''}${inProg ? `<em class="tl__live">${T('tl.inProgress')}</em>` : ''}</div>
        <div class="tl__title${small ? ' tl__title--sm' : ''}">${esc(it.title)}</div>
        ${subs || notes || conflict ? `<div class="tl__tags">${subs}${notes}${conflict ? `<span class="tl__tag tl__tag--warn">${Icons.i('clock', 12)} ${T('tl.conflict')}</span>` : ''}</div>` : ''}
        ${go}
      </div>
      <button type="button" class="tl__chk${it.done ? ' on' : ''}" data-act="tl-toggle" role="checkbox" aria-checked="${it.done}" aria-label="${esc(it.title)}">${it.done ? Icons.i('check', 16, 3.4) : ''}</button>
    </div>`;
  }

  function gap(prev, next, d, nowMin, isToday) {
    const from = prev ? end(prev) : 0, to = next ? next.start : 24 * 60, g = to - from;
    if (prev && next && g <= 0) return `<div class="tl__gap tl__gap--tight" style="--c1:${prev.color};--c2:${next.color}"><div class="tl__rail"><i class="tl__conn"></i></div></div>`;
    if (g < 5) return '';
    const past = d < U.today() || (isToday && to <= nowMin);
    const inGap = isToday && nowMin >= from && nowMin < to;
    const hgt = U.clamp(Math.round(34 + g * 0.3), 40, 120);
    const txt = past && g >= 20 ? `<span class="tl__gap-t">${Icons.i('hourglass', 15)} ${T('tl.past')}</span>`
      : !past && g >= 20 ? `<button type="button" class="tl__gap-t tl__gap-add" data-act="tl-addgap" data-start="${Math.max(from, inGap ? Math.ceil(nowMin / 5) * 5 : from)}" data-dur="${Math.min(g, 60)}">${T('tl.free', { d: U.dur(g) })} ${Icons.i('plus', 14, 2.5)}</button>` : '';
    const now = inGap ? `<div class="tl__now" style="top:${U.pct(nowMin - from, g)}%"><span>${U.hm(nowMin)}</span><i></i></div>` : '';
    const dashed = g > 15;
    return `<div class="tl__gap${dashed ? ' is-dashed' : ''}" style="--h:${hgt}px;--c1:${prev ? prev.color : 'var(--line)'};--c2:${next ? next.color : 'var(--line)'}">
      <div class="tl__rail">${prev || next ? '<i class="tl__conn"></i>' : ''}</div><div class="tl__gap-body">${txt}</div>${now}</div>`;
  }

  const Timeline = {
    fab: 'task',
    acts: {
      'tl-day': (el) => App.setDate(el.dataset.d),
      'tl-inbox': () => Forms.inbox(App.date),
      'tl-pick': () => Forms.datePicker(App.date, (d) => App.setDate(d)),
      'tl-today': () => App.setDate(U.today()),
      'tl-open': (el) => { const r = el.closest('[data-id]'); Timeline.open(r.dataset.kind, r.dataset.id); },
      'tl-toggle': (el) => { const r = el.closest('[data-id]'); UI.haptic(); App.toggleItem({ kind: r.dataset.kind, id: r.dataset.id, date: App.date }); },
      'tl-addgap': (el) => Forms.task({ date: App.date, start: +el.dataset.start, dur: +el.dataset.dur }),
      'tl-add-empty': () => Forms.task({ date: App.date }),
      'tl-timer': (el) => { const r = el.closest('[data-id]'); Timer.begin(r.dataset.kind, r.dataset.id, App.date); },
      'tl-prevw': () => App.setDate(U.add(App.date, -7)),
      'tl-nextw': () => App.setDate(U.add(App.date, 7)),
      'tl-sub': (el) => { Store.toggleSub(App.date, el.dataset.tid, el.dataset.sid); }
    },

    open(kind, id) {
      if (kind === 'habit') return Forms.entry(id, App.date);
      Timeline.detail(id, App.date);
    },

    // Fiche de détail d'une tâche (notes, sous-tâches cochables)
    detail(id, d) {
      const t = Store.task(id); if (!t) return;
      const it = { kind: 'task', id, date: d, title: t.title, done: Store.isTaskDone(id, d) };
      const body = () => {
        const sd = Store.subDone(d, id);
        return `<div class="det"><div class="det__hd">${UI.bubble(t.icon, t.color, 52, 26)}<div><b>${esc(t.title)}</b><div class="muted">${U.longDate(d)}${t.start !== null ? ' · ' + U.hm(t.start) + (t.dur ? ' – ' + U.hm((t.start + t.dur) % 1440) + ' (' + U.dur(t.dur) + ')' : '') : ''}</div></div></div>
          ${t.notes ? `<p class="det__n">${esc(t.notes)}</p>` : ''}
          ${d === U.today() && Timer.can({ kind: 'task', done: Store.isTaskDone(id, d), dur: t.dur }) ? `<button type="button" class="btn btn--soft btn--full" data-do="timer" style="margin-bottom:12px">${Icons.i(Timer.is('task', id, d) ? 'pause' : 'play', 18)} ${T(Timer.is('task', id, d) ? 'tm.pause' : 'tm.start')}</button>` : ''}
          ${t.subtasks.length ? `<div class="stack">${t.subtasks.map((s) => `<button type="button" class="subrow${sd.includes(s.id) ? ' on' : ''}" data-sid="${s.id}"><span class="chk${sd.includes(s.id) ? ' on' : ''}">${Icons.i('check', 14, 3.4)}</span><span>${esc(s.t)}</span></button>`).join('')}</div>` : ''}
        </div>`;
      };
      UI.sheet({
        title: '', cls: 'sheet--dialog', body: body(),
        foot: `<button class="btn btn--soft btn--full" data-do="edit" type="button">${Icons.i('edit', 18)} ${T('btn.edit')}</button><button class="btn btn--primary btn--full" data-do="done" type="button">${Icons.i('check', 18, 3)} ${T(it.done ? 'act.uncomplete' : 'act.complete')}</button>`,
        onMount(el, close) {
          el.addEventListener('click', (e) => {
            const s = e.target.closest('.subrow'), b = e.target.closest('[data-do]');
            if (s) { Store.toggleSub(d, id, s.dataset.sid); el.querySelector('.sheet__bd').innerHTML = body(); }
            else if (b && b.dataset.do === 'timer') { close(); Timer.begin('task', id, d); }
            else if (b && b.dataset.do === 'done') { App.toggleItem(it); close(); }
            else if (b) { close(); setTimeout(() => Forms.task({ id, date: d }), 260); }
          });
        }
      });
    },

    render() {
      const d = App.date, today = U.today(), isToday = d === today, nowMin = U.nowMin();
      const [y, m] = [U.parse(d).getFullYear(), U.parse(d).getMonth()];
      const monthName = U.cap(U.fmt(d, { month: 'long' }));
      const all = Store.itemsOn(d), untimed = all.filter((i) => i.start === null), items = all.filter((i) => i.start !== null);
      const inbox = Store.inbox().length;
      const week = U.week(d);

      let list = '';
      if (!items.length && !untimed.length) {
        list = `<div class="empty">${Icons.i('calendar', 44, 1.4)}<h3>${T('tl.empty')}</h3><p>${T('tl.emptySub')}</p><button class="btn btn--primary" data-act="tl-add-empty" type="button">${Icons.i('plus', 18, 2.5)} ${T('task.new')}</button></div>`;
      } else {
        const before = items.length && isToday && nowMin < items[0].start;
        const nowTop = `<div class="tl__now tl__now--top"><span>${U.hm(nowMin)}</span><i></i></div>`;
        let html = untimed.length ? `<div class="tl__untimed"><div class="tl__lbl">${T('tl.noTime')}</div>${untimed.map((u) => `<div class="tl__un${u.done ? ' is-done' : ''}" style="--c:${u.color}" data-kind="${u.kind}" data-id="${u.id}">${UI.bubble(u.icon, u.color, 34, 17)}<button type="button" class="tl__un-t" data-act="tl-open">${esc(u.title)}</button><button type="button" class="tl__chk${u.done ? ' on' : ''}" data-act="tl-toggle" role="checkbox" aria-checked="${u.done}" aria-label="${esc(u.title)}">${u.done ? Icons.i('check', 16, 3.4) : ''}</button></div>`).join('')}</div>` : '';
        if (before) html += nowTop;
        items.forEach((it, i) => {
          const prev = items[i - 1];
          if (prev) html += gap(prev, it, d, nowMin, isToday);
          const conflict = prev && it.dur && prev.dur && it.start < end(prev);
          html += row(it, d, i, nowMin, isToday, conflict);
        });
        const last = items[items.length - 1];
        if (last && end(last) < 23 * 60) html += gap(last, null, d, nowMin, isToday);
        list = `<div class="tl__list" id="tl-list">${html}</div>`;
      }

      return `
      <div class="tl__top"><header class="tl__hd">
        <h1 class="tl__month">${esc(monthName)} <span>${y}</span></h1>
        <div class="tl__hd-r">
          ${!isToday ? `<button type="button" class="pill-btn" data-act="tl-today">${T('btn.today')}</button>` : ''}
          <button type="button" class="icon-btn icon-btn--lg" data-act="tl-inbox" aria-label="${T('tl.inbox')}">${Icons.i('inbox', 22)}${inbox ? `<b class="badge">${inbox}</b>` : ''}</button>
          <button type="button" class="icon-btn icon-btn--lg" data-act="tl-pick" aria-label="${T('tl.pickDate')}">${Icons.i('calendar', 22)}</button>
        </div>
      </header>
      <div class="wk" id="wk">${week.map((w) => `<button type="button" class="wk__d${w === d ? ' sel' : ''}${w === today ? ' today' : ''}" data-act="tl-day" data-d="${w}" aria-label="${esc(U.longDate(w))}" ${w === d ? 'aria-current="date"' : ''}>
          <span class="wk__w">${U.wdShort(w)}</span><span class="wk__n">${U.parse(w).getDate()}</span><span class="wk__dots">${dots(w)}</span></button>`).join('')}</div></div>
      <div class="tl" id="tl">${list}</div>`;
    },

    mount(root) {
      const tl = root.querySelector('#tl'); if (!tl) return;

      // défilement vers "maintenant" (ou le premier élément) à l'ouverture d'un jour
      if (App._tlScroll) {
        App._tlScroll = false;
        const target = tl.querySelector('.tl__now') || tl.querySelector('.tl__row:not(.is-done)') || tl.querySelector('.tl__row');
        if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
      }

      // appui long → actions rapides ; balayage horizontal → jour précédent / suivant
      let timer = null, sx = 0, sy = 0, fired = false, t0 = 0;
      tl.addEventListener('pointerdown', (e) => {
        sx = e.clientX; sy = e.clientY; fired = false; t0 = Date.now();
        const r = e.target.closest('.tl__row'); if (!r || e.target.closest('.tl__chk')) return;
        timer = setTimeout(() => {
          fired = true; UI.haptic(15);
          const it = Store.itemsOn(App.date).find((x) => x.id === r.dataset.id && x.kind === r.dataset.kind);
          if (it) Forms.taskActions(it);
        }, 480);
      });
      const cancel = () => clearTimeout(timer);
      tl.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancel(); });
      tl.addEventListener('pointerup', cancel); tl.addEventListener('pointercancel', cancel);
      tl.addEventListener('click', (e) => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
      tl.addEventListener('contextmenu', (e) => { if (e.target.closest('.tl__row')) e.preventDefault(); });
      const swipe = (el) => {
        let x0 = 0, y0 = 0, ts = 0;
        el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; ts = Date.now(); }, { passive: true });
        el.addEventListener('touchend', (e) => {
          const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
          if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - ts < 900) App.setDate(U.add(App.date, dx < 0 ? 1 : -1));
        }, { passive: true });
      };
      swipe(tl); swipe(root.querySelector('#wk'));
    }
  };
  window.TimelineView = Timeline;
})();
