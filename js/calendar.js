/* Present — Calendrier (mois + agenda) */
(function () {
  const esc = U.esc;
  const MON = '2024-01-01';

  const Cal = {
    state: null,
    init() { const t = U.today(), p = U.parse(t); Cal.state = { y: p.getFullYear(), m: p.getMonth(), sel: t, mode: 'month' }; },
    acts: {
      'cal-prev': () => Cal.shift(-1), 'cal-next': () => Cal.shift(1),
      'cal-sel': (el) => { Cal.state.sel = el.dataset.d; const p = U.parse(el.dataset.d); if (p.getMonth() !== Cal.state.m) { Cal.state.m = p.getMonth(); Cal.state.y = p.getFullYear(); } App.render(); },
      'cal-today': () => { Cal.init(); App.render(); },
      'cal-mode': (el) => { Cal.state.mode = el.dataset.v; App.render(); },
      'cal-timeline': () => App.go('timeline', Cal.state.sel),
      'cal-habit-toggle': (el) => App.toggleItem({ kind: 'habit', id: el.dataset.id, date: Cal.state.sel }),
      'cal-task-toggle': (el) => App.toggleItem({ kind: 'task', id: el.dataset.id, date: Cal.state.sel }),
      'cal-habit-open': (el) => Forms.entry(el.dataset.id, Cal.state.sel),
      'cal-task-open': (el) => Forms.task({ id: el.dataset.id, date: Cal.state.sel }),
      'ag-open': (el) => App.go('timeline', el.dataset.d)
    },
    shift(n) { const s = Cal.state; s.m += n; if (s.m < 0) { s.m = 11; s.y--; } if (s.m > 11) { s.m = 0; s.y++; } App.render(); },

    render() {
      const s = Cal.state, today = U.today();
      return `
      <header class="appbar"><div class="brand">${Icons.i('leaf', 22, 2.2)}<span>${T('cal.title')}</span></div>
        <button type="button" class="pill-btn" data-act="cal-today">${T('btn.today')}</button></header>
      <div class="page">
        ${UI.seg('calmode', [['month', T('cal.month')], ['agenda', T('cal.agenda')]], s.mode).replace(/data-v="(\w+)"/g, 'data-act="cal-mode" data-v="$1"')}
        ${s.mode === 'month' ? Cal.month(s, today) : Cal.agenda(today)}
      </div>`;
    },

    month(s, today) {
      const grid = U.monthGrid(s.y, s.m);
      const cells = grid.map((d) => {
        const inM = U.parse(d).getMonth() === s.m, future = d > today;
        const st = future ? { total: 0, pct: 0 } : Stats.day(d);
        const tasks = Store.itemsOn(d).some((i) => i.kind === 'task');
        const cls = ['cal__d', inM ? '' : 'out', d === s.sel ? 'sel' : '', d === today ? 'today' : '', st.total && st.pct === 100 ? 'full' : st.pct > 0 ? 'part' : ''].join(' ');
        return `<button type="button" class="${cls}" data-act="cal-sel" data-d="${d}" style="--p:${st.pct}" aria-label="${esc(U.longDate(d))}${st.total ? ', ' + st.pct + '%' : ''}" ${d === s.sel ? 'aria-pressed="true"' : ''}><span class="cal__n">${U.parse(d).getDate()}</span>${tasks ? '<i class="cal__dot"></i>' : ''}</button>`;
      }).join('');
      return `
        <section class="card cal">
          <div class="cal__hd"><button class="icon-btn" data-act="cal-prev" aria-label="‹">${Icons.i('left', 22)}</button><h2>${esc(U.cap(U.monthTitle(s.y, s.m)))}</h2><button class="icon-btn" data-act="cal-next" aria-label="›">${Icons.i('right', 22)}</button></div>
          <div class="cal__grid" id="cal-grid"><div class="cal__wk">${Array.from({ length: 7 }, (_, i) => `<span>${esc(U.wdShort(U.add(MON, i)).slice(0, 3))}</span>`).join('')}</div>${cells}</div>
          <div class="legend"><span><i class="lg lg--full"></i>${T('cal.done')}</span><span><i class="lg lg--part"></i>${T('cal.partial')}</span><span><i class="lg lg--none"></i>${T('cal.todo')}</span></div>
        </section>
        <div class="sec-hd"><h2>${esc(U.longDate(s.sel))}${s.sel === today ? '' : ''}</h2>${s.sel === today ? `<span class="tag tag--g">${T('btn.today')}</span>` : ''}</div>
        ${Cal.day(s.sel, today)}`;
    },

    day(d, today) {
      const hs = Store.habitsOn(d), tasks = Store.itemsOn(d).filter((i) => i.kind === 'task'), future = d > today;
      const hRow = (h) => { const dn = Store.isDone(h.id, d), m = Store.meas(h), sub = m ? `${Store.fmtVal(h, Store.value(h.id, d))} / ${Store.fmtVal(h, h.target)}` : h.goal; return `<div class="row-card row-card--sm${dn ? ' is-done' : ''}"><button type="button" class="row-card__main" data-act="cal-habit-open" data-id="${h.id}">${UI.bubble(h.icon, h.color, 36, 18)}<span class="row-card__txt"><b>${esc(h.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>
        ${Forms.chk(h, d, 'cal-habit-toggle', future)}</div>`; };
      const tRow = (t) => `<div class="row-card row-card--sm${t.done ? ' is-done' : ''}"><button type="button" class="row-card__main" data-act="cal-task-open" data-id="${t.id}">${UI.bubble(t.icon, t.color, 36, 18)}<span class="row-card__txt"><b>${esc(t.title)}</b><small>${t.start !== null ? U.hm(t.start) + (t.dur ? ' – ' + U.hm((t.start + t.dur) % 1440) : '') : T('tl.noTime')}</small></span></button>
        <button type="button" class="chk${t.done ? ' on' : ''}" ${future ? 'disabled' : ''} data-act="cal-task-toggle" data-id="${t.id}" role="checkbox" aria-checked="${t.done}" aria-label="${esc(t.title)}">${Icons.i('check', 16, 3.2)}</button></div>`;
      if (!hs.length && !tasks.length) return `<p class="muted">${T('cal.nothing')}</p><button class="btn btn--soft btn--full" data-act="cal-timeline" type="button">${T('cal.openTimeline')}</button>`;
      return `<div class="stack">${hs.map(hRow).join('')}${tasks.map(tRow).join('')}</div>${future ? `<p class="muted small">${T('cal.future')}</p>` : ''}
        <button class="btn btn--soft btn--full" data-act="cal-timeline" type="button">${Icons.i('list', 18)} ${T('cal.openTimeline')}</button>`;
    },

    agenda(today) {
      let html = '', any = false;
      for (let i = 0; i < 14; i++) {
        const d = U.add(today, i), its = Store.itemsOn(d);
        const all = [...its, ...Store.habitsOn(d).filter((h) => !h.time).map((h) => ({ kind: 'habit', id: h.id, title: h.name, icon: h.icon, color: h.color, start: null, dur: 0, done: Store.isDone(h.id, d) }))];
        if (!all.length) continue; any = true;
        const lbl = i === 0 ? T('agenda.today') : i === 1 ? T('agenda.tomorrow') : U.longDate(d);
        html += `<div class="ag"><div class="ag__d"><b>${U.parse(d).getDate()}</b><small>${esc(U.wdShort(d))}</small></div><div class="ag__list"><div class="ag__lbl">${esc(lbl)}</div>${all.map((it) => `<button type="button" class="ag__it${it.done ? ' is-done' : ''}" style="--c:${it.color}" data-act="ag-open" data-d="${d}"><i></i><span class="ag__t">${it.start !== null ? U.hm(it.start) : '—'}</span><span class="ag__n">${esc(it.title)}</span>${Icons.i(it.icon, 16)}</button>`).join('')}</div></div>`;
      }
      return any ? `<div class="agenda">${html}</div>` : `<div class="empty">${Icons.i('calendar', 40, 1.4)}<h3>${T('agenda.empty')}</h3></div>`;
    }
  };
  window.CalendarView = Cal;
})();
