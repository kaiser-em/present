/* Present — écran Statistiques */
(function () {
  const esc = U.esc;
  const V = { range: 30, bar: null };

  function barChart(days, n) {
    const W = 320, Hh = 120, gap = n <= 7 ? 12 : n <= 30 ? 3 : 1, bw = (W - gap * (n - 1)) / n;
    const step = n <= 7 ? 1 : n <= 30 ? 5 : 15;
    const bars = days.map((d, i) => {
      const h = Math.max(d.total ? 4 : 2, (d.pct / 100) * (Hh - 8)), x = i * (bw + gap), sel = V.bar === d.date;
      return `<rect class="bc__b${sel ? ' sel' : ''}${d.date === U.today() ? ' today' : ''}${d.total ? '' : ' off'}" data-act="st-bar" data-d="${d.date}" x="${x.toFixed(1)}" y="${(Hh - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(6, bw / 2).toFixed(1)}"><title>${d.date} · ${d.pct}%</title></rect>`;
    }).join('');
    const labels = days.map((d, i) => (i % step === (n <= 7 ? 0 : (n - 1) % step) || (n <= 7)) ? `<text x="${(i * (bw + gap) + bw / 2).toFixed(1)}" y="${Hh + 16}" text-anchor="middle">${n <= 7 ? U.wdLetter(d.date) : U.parse(d.date).getDate()}</text>` : '').join('');
    return `<svg class="bc" viewBox="0 0 ${W} ${Hh + 22}" role="img" aria-label="${T('st.activity')}"><line x1="0" y1="${Hh}" x2="${W}" y2="${Hh}" class="bc__ax"/>${bars}${labels}</svg>`;
  }

  function heatmap() {
    const today = U.today(), start = U.add(U.weekStart(today), -15 * 7);
    let cells = '';
    for (let w = 0; w < 16; w++) for (let r = 0; r < 7; r++) {
      const d = U.add(start, w * 7 + r);
      if (d > today) { cells += '<i class="hmap__c fut"></i>'; continue; }
      const s = Stats.day(d), l = !s.total ? 0 : s.pct === 0 ? 1 : s.pct < 50 ? 2 : s.pct < 100 ? 3 : 4;
      cells += `<i class="hmap__c l${l}" title="${d} · ${s.pct}%"></i>`;
    }
    return `<div class="hmap"><div class="hmap__w">${[0, 2, 4, 6].map((i) => `<span style="grid-row:${i + 1}">${U.wdLetter(U.add('2024-01-01', i))}</span>`).join('')}</div><div class="hmap__g">${cells}</div></div>
      <div class="legend legend--r"><span>${T('st.less')}</span><i class="hmap__c l1"></i><i class="hmap__c l2"></i><i class="hmap__c l3"></i><i class="hmap__c l4"></i><span>${T('st.more')}</span></div>`;
  }

  const Stat = {
    acts: {
      'st-range': (el) => { V.range = +el.dataset.v; V.bar = null; App.render(); },
      'st-bar': (el) => { V.bar = V.bar === el.dataset.d ? null : el.dataset.d; App.render(); },
      'st-habit': (el) => App.go('habit', el.dataset.id)
    },
    render() {
      const today = U.today(), n = V.range, from = U.add(today, -(n - 1)), prevFrom = U.add(from, -n), prevTo = U.add(from, -1);
      const cur = Stats.range(from, today), prev = Stats.range(prevFrom, prevTo);
      const streak = Stats.streak(), best = Stats.best(), td = Stats.day(today);
      const habits = Store.activeHabits();
      const hasData = cur.total > 0;
      const delta = prev.total ? cur.pct - prev.pct : null;
      const perHabit = habits.map((h) => ({ h, st: Stats.habit(h) })).sort((a, b) => b.st.rate - a.st.rate);
      const time = Stats.time(from, today);
      const byItem = {};
      for (let d = from; d <= today; d = U.add(d, 1)) Store.itemsOn(d).forEach((it) => { const a = Stats.actual(it, d); if (a) { const k = it.kind + it.id; (byItem[k] = byItem[k] || { t: it.title, icon: it.icon, color: it.color, m: 0 }).m += a; } });
      const top = Object.values(byItem).sort((a, b) => b.m - a.m).slice(0, 5);
      const wd = Stats.byWeekday(from, today), bestWd = wd.indexOf(Math.max(...wd));
      const goal = Stats.nextMilestone(streak);
      const selDay = V.bar && cur.days.find((x) => x.date === V.bar);
      const insights = [];
      if (hasData && Math.max(...wd) > 0) insights.push(T('st.bestDay', { d: U.cap(U.fmt(U.add('2024-01-01', bestWd), { weekday: 'long' })), p: wd[bestWd] }));
      if (perHabit.length > 1) { insights.push(T('st.bestHabit', { h: perHabit[0].h.name, p: perHabit[0].st.rate })); const w = perHabit[perHabit.length - 1]; if (w.st.rate < 100) insights.push(T('st.worstHabit', { h: w.h.name, p: w.st.rate })); }

      return `
      <header class="appbar"><div class="brand">${Icons.i('chart', 22, 2.2)}<span>${T('st.title')}</span></div><button type="button" class="pill-btn" data-act="st-report">${Icons.i('file', 15)} ${I18n.lang === 'fr' ? 'Résumé' : 'Summary'}</button></header>
      <div class="page">
        ${UI.seg('range', [[7, T('st.d7')], [30, T('st.d30')], [90, T('st.d90')]], n).replace(/data-v="(\d+)"/g, 'data-act="st-range" data-v="$1"')}
        <section class="card hl"><div class="hl__top"><div><div class="hl__t">${T('st.regularity')}</div><div class="muted small">${T('st.last', { n })}</div></div><div class="hl__v">${cur.pct}<small>%</small></div></div>
          <div class="bar bar--lg"><i style="width:${cur.pct}%"></i></div>
          ${delta !== null ? `<div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} pt ${T('st.vsPrev')}</div>` : ''}</section>
        <div class="grid2">
          <div class="card mini">${Icons.i('flame', 22, 2)}<b>${streak} <small>${T(streak > 1 ? 'days' : 'day')}</small></b><span>${T('st.streak')}</span></div>
          <div class="card mini mini--gold">${Icons.i('trophy', 22, 2)}<b>${best} <small>${T(best > 1 ? 'days' : 'day')}</small></b><span>${T('st.best')}</span></div>
          <div class="card mini">${Icons.i('check', 22, 2.6)}<b>${td.done}</b><span>${T('st.doneToday')}</span></div>
          <div class="card mini">${Icons.i('leaf', 22, 2)}<b>${habits.length}</b><span>${T('st.active')}</span></div>
        </div>
        ${!hasData ? `<div class="empty">${Icons.i('chart', 40, 1.4)}<h3>${T('st.noData')}</h3><p>${T('st.noDataSub')}</p></div>` : `
        <section class="card"><div class="sec-hd sec-hd--in"><h2>${T('st.activity')}</h2><span class="muted small">${selDay ? `${esc(U.longDate(selDay.date))} · ${selDay.pct}%` : T('st.estimated')}</span></div>${barChart(cur.days, n)}</section>
        <section class="card"><div class="sec-hd sec-hd--in"><h2>${T('st.heatmap')}</h2></div>${heatmap()}</section>
        <section class="card"><div class="sec-hd sec-hd--in"><h2>${T('st.perHabit')}</h2></div><div class="perf">${perHabit.map(({ h, st }) => `<button type="button" class="perf__r" data-act="st-habit" data-id="${h.id}" style="--c:${h.color}">${UI.bubble(h.icon, h.color, 34, 17)}<span class="perf__m"><span class="perf__t"><b>${esc(h.name)}</b><em>${st.rate}%</em></span><span class="bar bar--c"><i style="width:${st.rate}%"></i></span></span>${st.streak ? `<span class="perf__s">${Icons.i('flame', 13, 2.2)}${st.streak}</span>` : ''}</button>`).join('')}</div></section>`}
        <section class="card"><div class="sec-hd sec-hd--in"><h2>${T('st.time')}</h2></div>
          <div class="tm"><div><b>${U.dur(time.planned) || '0'}</b><span>${T('st.planned')}</span></div><div><b>${U.dur(time.done) || '0'}</b><span>${T('st.completed')}</span></div><div><b>${time.tasksDone}/${time.tasks}</b><span>${T('st.tasksDone')}</span></div></div>
          <div class="bar"><i style="width:${U.pct(time.done, time.planned)}%"></i></div>
          ${top.length ? `<div class="lbl">${T('st.byColor')}</div><div class="split">${top.map((x) => `<i style="flex:${x.m};background:${x.color}"></i>`).join('')}</div>
          <div class="split-l">${top.map((x) => `<span style="--c:${x.color}"><i></i>${esc(x.t)} <b>${U.dur(x.m)}</b></span>`).join('')}</div>` : ''}</section>
        <section class="card goal"><div class="goal__hd">${Icons.i('trophy', 20)}<b>${T('st.nextGoal')}</b></div><p class="muted">${T('st.streakGoal', { n: goal })}</p>
          <div class="bar"><i style="width:${U.pct(Math.min(streak, goal), goal)}%"></i></div><div class="goal__ft"><span>${T('goal.progress', { a: streak, b: goal })}</span></div></section>
        ${insights.length ? `<section class="card"><div class="sec-hd sec-hd--in"><h2>${T('st.insights')}</h2></div><ul class="ins">${insights.map((i) => `<li>${Icons.i('sparkle', 16)}<span>${esc(i)}</span></li>`).join('')}</ul></section>` : ''}
      </div>`;
    }
  };
  window.StatsView = Stat;
})();
