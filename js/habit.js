/* Present — fiche habitude */
(function () {
  const esc = U.esc;
  const MON = '2024-01-01';
  const H = {
    month: null,
    acts: {
      'hb-back': () => App.back(),
      'hb-edit': (el) => Forms.habit(el.dataset.id),
      'hb-del': (el) => H.remove(el.dataset.id),
      'hb-more': (el) => H.more(el.dataset.id),
      'hb-prev': () => { H.shift(-1); }, 'hb-next': () => { H.shift(1); },
      'hb-day': (el) => { const d = el.dataset.d; if (d > U.today()) return; const hb = Store.habit(el.dataset.id); if (Store.meas(hb)) return Forms.entry(hb.id, d); UI.haptic(); Store.toggleHabit(el.dataset.id, d); }
    },
    shift(n) { H.month.m += n; if (H.month.m < 0) { H.month.m = 11; H.month.y--; } if (H.month.m > 11) { H.month.m = 0; H.month.y++; } App.render(); },

    volume(h, st) {
      const today = U.today(), days = Array.from({ length: 14 }, (_, i) => U.add(today, i - 13));
      const vals = days.map((d) => Store.value(h.id, d)), max = Math.max(h.target, ...vals, 1), PX = 74;
      return `<section class="card vol"><div class="sec-hd sec-hd--in"><h2>${T('hb.volume')}</h2></div>
        <div class="vol__bars" style="--t:${Math.round((h.target / max) * PX)}px"><i class="vol__t"></i>${days.map((d, i) => `<div><span style="height:${Math.max(vals[i] ? 4 : 2, Math.round((vals[i] / max) * PX))}px" class="${vals[i] >= h.target ? 'full' : vals[i] ? '' : 'off'}"></span><small>${esc(U.wdLetter(d))}</small></div>`).join('')}</div>
        <div class="tm"><div><b>${esc(Store.fmtVal(h, st.sum30))}</b><span>${T('hb.total30')}</span></div><div><b>${esc(Store.fmtVal(h, st.avg30))}</b><span>${T('hb.avg')}</span></div><div><b>${esc(Store.fmtVal(h, st.bestVal))}</b><span>${T('hb.bestDay')}</span></div></div></section>`;
    },
    journal(id) {
      const ns = Store.notesFor(id, 20);
      return `<section class="card"><div class="sec-hd sec-hd--in"><h2>${T('hb.notes')}</h2></div>${ns.length ? ns.map(([d, n]) => `<div class="jn"><time>${esc(U.cap(U.fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })))}</time><p>${esc(n)}</p></div>`).join('') : `<p class="muted small">${T('hb.noNotes')}</p>`}</section>`;
    },

    async remove(id) {
      const h = Store.habit(id); if (!h) return;
      const ok = await UI.confirm({ title: T('habit.deleteQ'), text: T('habit.deleteSub'), ok: T('btn.delete'), danger: true });
      if (!ok) return; Store.deleteHabit(id); UI.toast(T('habit.deleted'), { icon: 'check' }); App.go('today');
    },
    more(id) {
      const h = Store.habit(id);
      UI.sheet({ title: h.name, cls: 'sheet--dialog', body: `<div class="qa-list">
        <button class="qa" data-q="edit" type="button">${Icons.i('edit', 20)}<span>${T('btn.edit')}</span></button>
        <button class="qa" data-q="arch" type="button">${Icons.i('archive', 20)}<span>${T(h.archived ? 'habit.unarchive' : 'habit.archive')}</span></button>
        <button class="qa qa--danger" data-q="del" type="button">${Icons.i('trash', 20)}<span>${T('btn.delete')}</span></button></div>`,
        onMount(el, close) { el.onclick = (e) => { const b = e.target.closest('[data-q]'); if (!b) return; const q = b.dataset.q; close();
          if (q === 'edit') setTimeout(() => Forms.habit(id), 260);
          else if (q === 'arch') { Store.setArchived(id, !h.archived); UI.toast(T(h.archived ? 'habit.saved' : 'habit.archived'), { icon: 'check' }); if (!h.archived) App.go('today'); }
          else setTimeout(() => H.remove(id), 260); }; } });
    },

    render(id) {
      const h = Store.habit(id);
      if (!h) return `<header class="appbar"><button class="icon-btn" data-act="hb-back" aria-label="${T('btn.back')}">${Icons.i('back', 22)}</button></header><div class="page"><div class="empty"><h3>${T('habit.notFound')}</h3></div></div>`;
      if (!H.month || H.id !== id) { const p = new Date(); H.month = { y: p.getFullYear(), m: p.getMonth() }; H.id = id; }
      const st = Stats.habit(h), today = U.today();
      const last5 = Array.from({ length: 5 }, (_, i) => U.add(today, -i));
      const grid = U.monthGrid(H.month.y, H.month.m);
      const cells = grid.map((d) => {
        const inM = U.parse(d).getMonth() === H.month.m, done = Store.isDone(id, d), sch = Store.scheduled(h, d), fut = d > today, pp = Math.round(Store.pct(h, d) * 100), part = Store.meas(h) && !done && pp > 0;
        return `<button type="button" class="hm__d${inM ? '' : ' out'}${done ? ' on' : part ? ' part' : sch && !fut && d !== today ? ' miss' : ''}${!sch && !done && !part ? ' off' : ''}${d === today ? ' today' : ''}" style="--c:${h.color};--pp:${pp}" data-act="hb-day" data-id="${id}" data-d="${d}" ${fut ? 'disabled' : ''} aria-label="${esc(U.longDate(d))}" aria-pressed="${done}">${U.parse(d).getDate()}</button>`;
      }).join('');
      const days = h.days.length === 7 ? T('wd.all') : h.days.map((i) => U.wdShort(U.add(MON, i))).join(', ');
      return `
      <header class="appbar"><button class="icon-btn" data-act="hb-back" aria-label="${T('btn.back')}">${Icons.i('back', 22)}</button>
        <button class="icon-btn" data-act="hb-more" data-id="${id}" aria-label="…">${Icons.i('more', 22)}</button></header>
      <div class="page">
        <div class="hd-hero"><span class="bubble bubble--xl" style="--c:${h.color}">${Icons.i(h.icon, 46, 1.8)}</span><h1>${esc(h.name)}</h1>
          ${h.why ? `<p class="ent__why">“${esc(h.why)}”</p>` : ''}<p class="muted">${h.goal ? esc(h.goal) + ' · ' : ''}${esc(days)}${h.time ? ' · ' + h.time + (h.dur ? ' (' + U.dur(h.dur) + ')' : '') : ''}</p>${h.archived ? `<span class="tag">${T('habit.archive')}</span>` : ''}</div>
        <section class="card hero hero--sm"><div class="hero__ring">${UI.ring(st.rate, 84, 9)}<div class="hero__pct">${st.rate}<small>%</small></div></div>
          <div class="hero__info"><div class="hero__big">${st.streak}<span> ${T(st.streak > 1 ? 'days' : 'day')}</span></div><div class="muted">${T('habit.streak')}</div>
            <div class="hero__streak">${Icons.i('trophy', 16)}<b>${st.best}</b> ${T(st.best > 1 ? 'days' : 'day')}<small class="muted"> · ${T('habit.best')}</small></div></div></section>
        <div class="sec-hd"><h2>${T('habit.history')}</h2></div>
        <div class="last5">${last5.map((d) => { const dn = Store.isDone(id, d); return `<button type="button" class="last5__d${dn ? ' on' : ''}" data-act="hb-day" data-id="${id}" data-d="${d}" aria-pressed="${dn}" aria-label="${esc(U.longDate(d))}"><span class="chk${dn ? ' on' : ''}${Store.meas(h) && !dn && Store.pct(h, d) > 0 ? ' part' : ''}" style="--p:${Math.round(Store.pct(h, d) * 100)}">${Icons.i('check', 14, 3.4)}</span><b>${esc(U.wdShort(d))}</b><small>${U.parse(d).getDate()}</small></button>`; }).join('')}</div>
        <section class="card hm"><div class="cal__hd"><button class="icon-btn" data-act="hb-prev" aria-label="‹">${Icons.i('left', 20)}</button><h2>${esc(U.cap(U.monthTitle(H.month.y, H.month.m)))}</h2><button class="icon-btn" data-act="hb-next" aria-label="›">${Icons.i('right', 20)}</button></div>
          <div class="hm__grid"><div class="cal__wk">${Array.from({ length: 7 }, (_, i) => `<span>${U.wdLetter(U.add(MON, i))}</span>`).join('')}</div>${cells}</div></section>
        ${Store.meas(h) ? H.volume(h, st) : ''}
        ${H.journal(id)}
        <div class="actions"><button class="btn btn--soft btn--full" data-act="hb-edit" data-id="${id}" type="button">${Icons.i('edit', 18)} ${T('btn.edit')}</button><button class="btn btn--danger-soft btn--full" data-act="hb-del" data-id="${id}" type="button">${Icons.i('trash', 18)} ${T('btn.delete')}</button></div>
      </div>`;
    }
  };
  window.HabitView = H;
})();
