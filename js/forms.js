/* Present — formulaires (habitude, tâche), inbox, sélecteur de date */
(function () {
  const { $, $$ } = UI;
  const esc = U.esc;
  const MON = '2024-01-01'; // un lundi de référence pour les libellés de jours
  const DUR = [5, 15, 30, 45, 60, 90, 120, 180, 240];
  const REM = [null, 0, 5, 10, 15, 30, 60];

  const sw = (id, on, dis) => `<button type="button" class="switch${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${!!on}" ${dis ? 'disabled' : ''}><i></i></button>`;
  const chip = (v, label, on, extra = '') => `<button type="button" class="chip${on ? ' on' : ''}" data-v="${v}" ${extra}>${label}</button>`;
  const dayBtns = (sel) => Array.from({ length: 7 }, (_, i) => `<button type="button" class="dbtn${sel.includes(i) ? ' on' : ''}" data-d="${i}" aria-label="${U.cap(U.fmt(U.add(MON, i), { weekday: 'long' }))}" aria-pressed="${sel.includes(i)}">${U.wdLetter(U.add(MON, i))}</button>`).join('');
  const picker = (icon, color, kind) => `
    <div class="pk" id="pk" hidden>
      <div class="pk__lbl">${T('task.icon')}</div>
      <div class="pk__icons">${Icons.PICKER.map((n) => `<button type="button" class="pk__i${n === icon ? ' on' : ''}" data-icon="${n}" aria-label="${n}">${Icons.i(n, 20)}</button>`).join('')}</div>
      <div class="pk__lbl">${T('task.color')}</div>
      <div class="pk__colors">${Icons.COLORS.map((c) => `<button type="button" class="pk__c${c === color ? ' on' : ''}" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>
    </div>`;

  // Branche l'aperçu icône + panneau de choix ; renvoie des fonctions de lecture
  function bindPicker(el, st, onChange) {
    const prev = $('#pv', el), pk = $('#pk', el);
    const paint = () => {
      prev.style.setProperty('--c', st.color); prev.innerHTML = Icons.i(st.icon, 30);
      $$('.pk__i', el).forEach((b) => b.classList.toggle('on', b.dataset.icon === st.icon));
      $$('.pk__c', el).forEach((b) => b.classList.toggle('on', b.dataset.color === st.color));
    };
    $('#pv-btn', el).onclick = () => { pk.hidden = !pk.hidden; };
    pk.addEventListener('click', (e) => {
      const i = e.target.closest('[data-icon]'), c = e.target.closest('[data-color]');
      if (i) { st.icon = i.dataset.icon; st.customIcon = true; }
      if (c) { st.color = c.dataset.color; st.customColor = true; }
      if (i || c) { paint(); onChange && onChange(); }
    });
    paint();
    return paint;
  }

  const Forms = {
    /* ================= HABITUDE ================= */
    // pastille de coche : anneau de progression pour les habitudes mesurées partiellement
    chk(h, d, act, disabled) {
      const pct = Math.round(Store.pct(h, d) * 100), done = Store.isDone(h.id, d), part = Store.meas(h) && !done && pct > 0;
      return `<button type="button" class="chk${done ? ' on' : ''}${part ? ' part' : ''}" ${part ? `style="--p:${pct}"` : ''} ${disabled ? 'disabled' : ''} data-act="${act}" data-id="${h.id}" role="checkbox" aria-checked="${done}" aria-label="${esc(h.name)}${part ? ' ' + pct + '%' : ''}">${Icons.i('check', 16, 3.2)}</button>`;
    },

    habit(id) {
      const ex = id ? Store.habit(id) : null;
      const cat0 = ex ? ex.category : 'wellbeing';
      const st = ex ? { ...ex, days: ex.days.slice(), quick: (ex.quick || []).slice() } : { name: '', category: cat0, icon: Store.CATS[cat0].icon, color: Store.CATS[cat0].color, goal: '', days: [0, 1, 2, 3, 4, 5, 6], time: '', dur: 0, remind: false, type: 'check', target: 0, unit: '', quick: [], threshold: 100, share: true, why: '' };
      st.customIcon = !!ex; st.customColor = !!ex;
      const UNITS = I18n.lang === 'en' ? ['pages', 'chapters', 'verses', 'glasses', 'km', 'sessions'] : ['pages', 'chapitres', 'versets', 'verres', 'km', 'séances'];
      const tgtTxt = (h) => (!h.target ? '' : h.type === 'time' ? U.dur(h.target) : U.fmtNum(h.target));
      const quickTxt = (h) => (h.type === 'check' ? '' : h.quick.map((q) => (h.type === 'time' ? U.dur(q) : U.fmtNum(q))).join(', '));
      // un objectif texte existant (« 180 min », « 10 chapitres ») peut devenir mesurable en un appui
      const conv = (() => {
        const m = String(st.goal || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d].*)?$/); if (!m || st.type !== 'check') return null;
        const unit = (m[2] || '').trim();
        if (/^(h|heures?|hours?|min|minutes?|mn)\b/i.test(unit)) { const d = U.parseDur(m[1] + ' ' + unit); return d ? { type: 'time', target: d } : null; }
        const n = U.parseNum(m[1]);
        return n && unit && unit.length <= 20 && !/[/×]/.test(unit) ? { type: 'count', target: n, unit } : null;
      })();

      UI.sheet({
        title: T(ex ? 'habit.edit' : 'habit.new'), full: true,
        body: `
          <div class="pv-wrap"><button type="button" id="pv-btn" class="pv-btn" aria-label="${T('habit.icon')}"><span class="pv bubble" id="pv"></span></button><span class="muted">${T('habit.icon')}</span></div>
          ${picker(st.icon, st.color)}
          <label class="fld"><span>${T('habit.name')} <b class="req">*</b></span><input class="inp" id="f-name" maxlength="60" placeholder="${esc(T('habit.namePh'))}" value="${esc(st.name)}" autocomplete="off"></label>
          <div class="fld"><span>${T('habit.category')}</span><div class="chips" id="f-cat">${Object.keys(Store.CATS).map((k) => chip(k, `${Icons.i(Store.CATS[k].icon, 15)} ${T('cat.' + k)}`, k === st.category)).join('')}</div></div>
          <div class="fld"><span>${T('habit.type')}</span>${UI.seg('htype', [['check', T('habit.type.check')], ['count', T('habit.type.count')], ['time', T('habit.type.time')]], st.type)}</div>
          <div data-for="check"><label class="fld"><span>${T('habit.goal')}</span><input class="inp" id="f-goal" maxlength="40" placeholder="${esc(T('habit.goalPh'))}" value="${esc(st.goal)}"></label>
            ${conv ? `<button type="button" class="chip chip--conv" id="f-conv">${Icons.i('chart', 15)} ${esc(T('habit.measure', { g: st.goal }))}</button>` : ''}</div>
          <div data-for="count"><div class="row2"><label class="fld"><span>${T('habit.target')}</span><input class="inp" id="f-tc" inputmode="decimal" autocomplete="off" placeholder="10" value="${st.type === 'count' ? esc(tgtTxt(st)) : ''}"></label>
            <label class="fld"><span>${T('habit.unit')}</span><input class="inp" id="f-unit" maxlength="20" autocomplete="off" value="${esc(st.unit)}"></label></div>
            <div class="chips chips--sm" id="f-units" style="margin:-6px 0 16px">${UNITS.map((u) => chip(u, u, u === st.unit)).join('')}</div></div>
          <div data-for="time"><label class="fld"><span>${T('habit.targetTime')}</span><input class="inp" id="f-tt" autocomplete="off" placeholder="${esc(T('habit.durHint'))}" value="${st.type === 'time' ? esc(tgtTxt(st)) : ''}"></label>
            <div class="chips chips--sm" id="f-tts" style="margin:-6px 0 16px">${[15, 30, 60, 120, 180].map((d) => chip(d, U.dur(d), d === st.target)).join('')}</div></div>
          <div data-for="count time"><label class="fld"><span>${T('habit.quick')}</span><input class="inp" id="f-quick" autocomplete="off" placeholder="${esc(T('habit.quickPh'))}" value="${esc(quickTxt(st))}"></label>
            <div class="fld"><span>${T('habit.threshold')} <small class="muted">· ${T('habit.thresholdHint')}</small></span><div class="chips" id="f-thr">${[100, 75, 50, 25].map((v) => chip(v, v + '%', v === st.threshold)).join('')}</div></div></div>
          <div class="fld"><span>${T('habit.days')}</span><div class="days" id="f-days">${dayBtns(st.days)}</div></div>
          <div class="fld"><span>${T('habit.time')} <small class="muted">· ${T('habit.timeHint')}</small></span>
            <div class="row"><input class="inp" type="time" id="f-time" value="${esc(st.time)}"><button type="button" class="btn btn--soft btn--sm" id="f-time-clear" ${st.time ? '' : 'hidden'}>${Icons.i('x', 16)}</button></div></div>
          <div class="fld" id="f-dur-wrap" hidden><span>${T('habit.duration')}</span>
            <div class="chips" id="f-dur">${[0, 15, 30, 45, 60, 90, 120, 180, 240].map((d) => chip(d, d ? U.dur(d) : '—', d === st.dur)).join('')}</div>
            <input class="inp" id="f-dur-c" autocomplete="off" placeholder="${esc(T('habit.durCustom') + ' : ' + T('habit.durHint'))}" style="margin-top:8px"></div>
          <p class="hint" id="f-tdn" hidden>${T('habit.timeDur')}</p>
          <div class="toggle-row"><div><div class="tr__t">${T('habit.reminder')}</div><div class="muted tr__s">${T('habit.reminderHint')}</div></div>${sw('f-remind', st.remind, !st.time)}</div>
          <label class="fld"><span>${T('habit.why')}</span><textarea class="inp" id="f-why" rows="2" maxlength="200" placeholder="${esc(T('habit.whyPh'))}">${esc(st.why)}</textarea></label>
          <div class="toggle-row"><div class="tr__t">${T('habit.share')}</div>${sw('f-share', st.share)}</div>`,
        foot: `<button class="btn btn--soft btn--full" data-close type="button">${T('btn.cancel')}</button><button class="btn btn--primary btn--full" id="f-save" type="button">${T('btn.save')}</button>`,
        onMount(el, close) {
          const paint = bindPicker(el, st);
          const name = $('#f-name', el); if (!ex) setTimeout(() => name.focus(), 350);
          const timeEl = $('#f-time', el), rem = $('#f-remind', el);
          const sync = () => {
            $$('[data-for]', el).forEach((x) => { x.hidden = !x.dataset.for.split(' ').includes(st.type); });
            $$('[data-seg=htype] .seg__b', el).forEach((b) => { b.classList.toggle('on', b.dataset.v === st.type); b.setAttribute('aria-selected', b.dataset.v === st.type); });
            $('#f-dur-wrap', el).hidden = !st.time || st.type === 'time'; $('#f-tdn', el).hidden = !(st.time && st.type === 'time');
            $('#f-time-clear', el).hidden = !st.time; rem.disabled = !st.time;
            if (!st.time) { st.remind = false; rem.classList.remove('on'); rem.setAttribute('aria-checked', 'false'); }
            $$('#f-dur .chip', el).forEach((c) => c.classList.toggle('on', +c.dataset.v === st.dur));
          };
          sync();
          $('[data-seg=htype]', el).onclick = (e) => { const b = e.target.closest('.seg__b'); if (!b) return; st.type = b.dataset.v; sync(); };
          $('#f-cat', el).onclick = (e) => {
            const b = e.target.closest('.chip'); if (!b) return;
            st.category = b.dataset.v; const c = Store.CATS[st.category];
            if (!st.customIcon) st.icon = c.icon; if (!st.customColor) st.color = c.color;
            $$('.chip', e.currentTarget).forEach((x) => x.classList.toggle('on', x === b)); paint();
          };
          $('#f-days', el).onclick = (e) => {
            const b = e.target.closest('.dbtn'); if (!b) return; const d = +b.dataset.d;
            st.days = st.days.includes(d) ? st.days.filter((x) => x !== d) : [...st.days, d];
            b.classList.toggle('on'); b.setAttribute('aria-pressed', st.days.includes(d));
          };
          $('#f-units', el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; $('#f-unit', el).value = b.dataset.v; $$('#f-units .chip', el).forEach((x) => x.classList.toggle('on', x === b)); };
          $('#f-tts', el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; $('#f-tt', el).value = U.dur(+b.dataset.v); $$('#f-tts .chip', el).forEach((x) => x.classList.toggle('on', x === b)); };
          $('#f-thr', el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; st.threshold = +b.dataset.v; $$('#f-thr .chip', el).forEach((x) => x.classList.toggle('on', x === b)); };
          const cv = $('#f-conv', el);
          if (cv) cv.onclick = () => { st.type = conv.type; if (conv.type === 'time') $('#f-tt', el).value = U.dur(conv.target); else { $('#f-tc', el).value = U.fmtNum(conv.target); $('#f-unit', el).value = conv.unit; } sync(); };
          const syncTime = () => { st.time = timeEl.value; sync(); };
          timeEl.onchange = timeEl.oninput = syncTime;
          $('#f-time-clear', el).onclick = () => { timeEl.value = ''; syncTime(); };
          $('#f-dur', el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; st.dur = +b.dataset.v; $('#f-dur-c', el).value = ''; sync(); };
          rem.onclick = () => { st.remind = !st.remind; rem.classList.toggle('on', st.remind); rem.setAttribute('aria-checked', st.remind); if (st.remind && window.Notifier) Notifier.ensurePermission(); };
          const shr = $('#f-share', el); shr.onclick = () => { st.share = !st.share; shr.classList.toggle('on', st.share); shr.setAttribute('aria-checked', st.share); };
          $('#f-save', el).onclick = () => {
            const n = name.value.trim();
            if (!n) { name.classList.add('err'); name.focus(); UI.toast(T('err.name')); return; }
            if (!st.days.length) st.days = [0, 1, 2, 3, 4, 5, 6];
            let target = 0, unit = '', quick = [], goal = $('#f-goal', el).value.trim(), dur = st.dur;
            if (st.type !== 'check') {
              target = st.type === 'time' ? U.parseDur($('#f-tt', el).value) : U.parseNum($('#f-tc', el).value);
              if (!target || target <= 0) { UI.toast(T('err.target')); return; }
              unit = st.type === 'count' ? $('#f-unit', el).value.trim() : 'min';
              quick = $('#f-quick', el).value.split(/\s*;\s*|\s*,\s+|\n/).map((x) => (st.type === 'time' ? U.parseDur(x) : U.parseNum(x))).filter((v) => v > 0);
              goal = st.type === 'time' ? U.dur(target) : `${U.fmtNum(target)}${unit ? ' ' + unit : ''}`;
              if (st.type === 'time') dur = Math.min(1440, target);
            } else if (st.time) { const c = U.parseDur($('#f-dur-c', el).value); if (c) dur = Math.min(1440, c); }
            const data = { name: n, icon: st.icon, color: st.color, category: st.category, goal, days: st.days, time: st.time, dur: st.time ? dur : 0, remind: st.remind, type: st.type, target, unit, quick, threshold: st.threshold, share: st.share, why: $('#f-why', el).value.trim() };
            if (ex) Store.updateHabit(ex.id, data); else Store.addHabit(data);
            UI.toast(T(ex ? 'habit.saved' : 'habit.created'), { icon: 'check' }); close();
          };
        }
      });
    },

    /* ================= SAISIE RAPIDE (valeur + note) ================= */
    entry(id, date) {
      if (!Store.habit(id)) return; date = date || U.today();
      const fut = date > U.today(); let flush = () => {};
      const top = () => {
        const h = Store.habit(id), m = Store.meas(h), v = Store.value(id, date), done = Store.isDone(id, date), pct = Math.round(Store.progress(h, date) * 100);
        const lbl = date === U.today() ? T('btn.today') : U.longDate(date), tg = Store.fmtTarget(h);
        const q = (h.quick && h.quick.length) ? h.quick : [1], qf = (x) => (h.type === 'time' ? U.dur(x) : U.fmtNum(x));
        const main = m
          ? `<div class="ent__prog"><div class="ent__big">${esc(Store.fmtVal(h, v))}<span> / ${esc(Store.fmtVal(h, h.target))}</span></div><div class="bar bar--lg"><i style="width:${Math.min(100, pct)}%"></i></div><small class="muted">${pct}%${pct > 100 ? ' · +' + (pct - 100) + '%' : ''}</small></div>
            <div class="ent__quick">${q.map((x) => `<button type="button" class="chip" data-q="${x}" ${fut ? 'disabled' : ''}>+${esc(qf(x))}</button>`).join('')}<button type="button" class="chip chip--m" data-q="-${q[0]}" ${fut || !v ? 'disabled' : ''}>−${esc(qf(q[0]))}</button></div>
            <div class="row"><input class="inp" id="e-in" inputmode="${h.type === 'time' ? 'text' : 'decimal'}" autocomplete="off" placeholder="${esc(T(h.type === 'time' ? 'ent.inTime' : 'ent.inCount'))}" ${fut ? 'disabled' : ''}>
              <button class="btn btn--soft btn--sm" data-e="add" type="button" ${fut ? 'disabled' : ''}>${T('ent.add')}</button><button class="btn btn--soft btn--sm" data-e="set" type="button" ${fut ? 'disabled' : ''}>${T('ent.set')}</button></div>
            <button type="button" class="btn btn--primary btn--full" data-e="full" ${fut || done ? 'disabled' : ''}>${Icons.i('check', 18, 3)} ${T('ent.full')}</button>
            ${date === U.today() && h.type === 'time' && !done ? `<button type="button" class="btn btn--soft btn--full" data-e="timer">${Icons.i(Timer.is('habit', id, date) ? 'pause' : 'play', 18)} ${T(Timer.is('habit', id, date) ? 'tm.pause' : 'tm.start')} · ${T('tm.running').toLowerCase()}</button>` : ''}
            ${v ? `<button type="button" class="link ent__rst" data-e="reset">${T('ent.reset')}</button>` : ''}`
          : `<button type="button" class="btn ${done ? 'btn--soft' : 'btn--primary'} btn--full" data-e="toggle" ${fut ? 'disabled' : ''}>${done ? T('ent.undone') : T('ent.done')}</button>`;
        return `<div class="ent__hd">${UI.bubble(h.icon, h.color, 46, 23)}<div class="ent__ti"><b>${esc(h.name)}</b><small class="muted">${esc(lbl)}${tg ? ' · ' + T('ent.goal') + ' ' + esc(tg) : ''}</small></div><button type="button" class="link" data-more>${T('ent.details')} ${Icons.i('right', 14, 2.6)}</button></div>${h.why ? `<p class="ent__why">“${esc(h.why)}”</p>` : ''}${main}`;
      };
      UI.sheet({
        title: '', cls: 'sheet--dialog ent', onClose: () => flush(),
        body: `<div id="e-top">${top()}</div><label class="fld ent__note"><span>${T('ent.note')}</span><textarea class="inp" id="e-note" rows="3" maxlength="600" placeholder="${esc(T('ent.notePh'))}">${esc(Store.note(id, date))}</textarea></label>`,
        onMount(el, close) {
          const box = $('#e-top', el), note = $('#e-note', el); let timer = 0, saved = Store.note(id, date);
          const saveNote = () => { clearTimeout(timer); if (note.value.trim() !== saved) { Store.setNote(id, date, note.value); saved = note.value.trim(); } };
          flush = saveNote; note.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(saveNote, 500); }); note.addEventListener('blur', saveNote);
          const repaint = (was) => { box.innerHTML = top(); if (!was && Store.isDone(id, date)) { UI.haptic(14); App.habitProgressed(date); } };
          const read = (h) => { const raw = $('#e-in', el).value; const v = h.type === 'time' ? U.parseDur(raw) : U.parseNum(raw); if (v === null || v === undefined || v < 0) { UI.toast(T(h.type === 'time' ? 'ent.badTime' : 'ent.badNum')); $('#e-in', el).classList.add('err'); return null; } return v; };
          el.addEventListener('click', (e) => {
            const h = Store.habit(id), was = Store.isDone(id, date);
            if (e.target.closest('[data-more]')) { saveNote(); close(); setTimeout(() => App.go('habit', id), 240); return; }
            const q = e.target.closest('[data-q]'), b = e.target.closest('[data-e]');
            if (q && !q.disabled) { Store.addValue(id, date, +q.dataset.q); repaint(was); return; }
            if (!b || b.disabled) return;
            const a = b.dataset.e;
            if (a === 'add' || a === 'set') { const v = read(h); if (v === null) return; if (a === 'add') Store.addValue(id, date, v); else Store.setValue(id, date, v); repaint(was); }
            else if (a === 'full') { Store.setValue(id, date, h.target); repaint(was); }
            else if (a === 'reset') { Store.setValue(id, date, 0); repaint(was); }
            else if (a === 'timer') { saveNote(); close(); Timer.begin('habit', id, date); }
            else if (a === 'toggle') { Store.toggleHabit(id, date); repaint(was); }
          });
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'e-in') { e.preventDefault(); el.querySelector('[data-e=add]').click(); } });
        }
      });
    },

    /* ================= TÂCHE ================= */
    task(o = {}) {
      const ex = o.id ? Store.task(o.id) : null;
      const date0 = o.date || U.today();
      const nowSlot = Math.min(23 * 60 + 30, Math.ceil((U.nowMin() + 1) / 15) * 15);
      const st = ex ? JSON.parse(JSON.stringify(ex)) : { title: '', icon: 'clock', color: '#5F84A8', date: date0, start: o.start ?? (date0 === U.today() ? nowSlot : 9 * 60), dur: o.dur ?? 30, repeat: { type: 'none' }, notes: '', subtasks: [], remind: null };
      let mode = o.mode || (!ex ? 'time' : !ex.date ? 'inbox' : ex.start === null ? 'day' : 'time');
      if (ex && !ex.date) { st.date = o.date || date0; st.start = o.start ?? 9 * 60; st.dur = 30; }
      if (ex && ex.date && ex.start === null) { st.start = 9 * 60; st.dur = 30; }
      st.repeat = st.repeat || { type: 'none' }; st.subtasks = st.subtasks || [];

      const subHtml = () => st.subtasks.map((s) => `<div class="sub" data-sid="${s.id}"><span class="sub__t">${esc(s.t)}</span><button type="button" class="icon-btn" data-rm aria-label="${T('btn.delete')}">${Icons.i('x', 16)}</button></div>`).join('');

      UI.sheet({
        title: T(ex ? 'task.edit' : 'task.new'), full: true,
        body: `
          <div class="pv-wrap"><button type="button" id="pv-btn" class="pv-btn"><span class="pv bubble" id="pv"></span></button>
            <input class="inp inp--title" id="f-title" maxlength="80" placeholder="${esc(T('task.titlePh'))}" value="${esc(st.title)}" autocomplete="off" aria-label="${T('task.title')}"></div>
          ${picker(st.icon, st.color)}
          ${UI.seg('mode', [['time', T('task.whenTime')], ['day', T('tl.noTime')], ['inbox', T('inbox.title')]], mode)}
          <div id="w-date" class="fld"><span>${T('task.date')}</span><input class="inp" type="date" id="f-date" value="${st.date || date0}"></div>
          <div id="w-time">
            <div class="row2"><label class="fld"><span>${T('task.start')}</span><input class="inp" type="time" id="f-start" value="${U.hm(st.start ?? 540)}"></label>
              <div class="fld"><span>${T('task.duration')}</span><div class="stepper"><button type="button" data-step="-5" aria-label="-5 min">−</button><b id="f-durv"></b><button type="button" data-step="5" aria-label="+5 min">+</button></div></div></div>
            <div class="chips chips--sm" id="f-dur">${DUR.map((d) => chip(d, U.dur(d), d === st.dur)).join('')}</div>
            <div class="hint" id="f-end"></div>
          </div>
          <div id="w-rep" class="fld"><span>${T('task.repeat')}</span>
            <div class="chips" id="f-rep">${['none', 'daily', 'weekdays', 'weekly', 'custom'].map((v) => chip(v, T('rep.' + v), st.repeat.type === v)).join('')}</div>
            <div class="days" id="f-rdays" ${st.repeat.type === 'custom' ? '' : 'hidden'}>${dayBtns(st.repeat.days || [])}</div>
            <label class="fld fld--in" id="w-until" ${st.repeat.type === 'none' ? 'hidden' : ''}><span>${T('task.until')}</span><input class="inp" type="date" id="f-until" value="${st.repeat.until || ''}"></label></div>
          <div id="w-rem" class="fld"><span>${T('task.remind')}</span><div class="chips chips--sm" id="f-rem">${REM.map((v) => chip(v === null ? 'n' : v, T(v === null ? 'rem.none' : 'rem.' + v), st.remind === v)).join('')}</div></div>
          <label class="fld"><span>${T('task.notes')}</span><textarea class="inp" id="f-notes" rows="3" maxlength="500" placeholder="${esc(T('task.notesPh'))}">${esc(st.notes)}</textarea></label>
          <div class="fld"><span>${T('task.subtasks')}</span><div id="f-subs">${subHtml()}</div>
            <div class="row"><input class="inp" id="f-sub" maxlength="80" placeholder="${esc(T('task.subPh'))}"><button type="button" class="btn btn--soft btn--sm" id="f-subadd" aria-label="${T('btn.add')}">${Icons.i('plus', 18)}</button></div></div>`,
        foot: `${ex ? `<button class="btn btn--danger-soft" id="f-del" type="button" aria-label="${T('btn.delete')}">${Icons.i('trash', 20)}</button>` : `<button class="btn btn--soft btn--full" data-close type="button">${T('btn.cancel')}</button>`}<button class="btn btn--primary btn--full" id="f-save" type="button">${T('btn.save')}</button>`,
        onMount(el, close) {
          const paint = bindPicker(el, st);
          const title = $('#f-title', el); if (!ex) setTimeout(() => title.focus(), 350);
          const startEl = $('#f-start', el), dateEl = $('#f-date', el);

          const refresh = () => {
            $('#w-date', el).hidden = mode === 'inbox';
            $('#w-time', el).hidden = mode !== 'time';
            $('#w-rep', el).hidden = mode === 'inbox';
            $('#w-rem', el).hidden = mode !== 'time';
            $$('.seg__b', el).forEach((b) => { b.classList.toggle('on', b.dataset.v === mode); b.setAttribute('aria-selected', b.dataset.v === mode); });
            $('#f-durv', el).textContent = st.dur ? U.dur(st.dur) : '0';
            $$('#f-dur .chip', el).forEach((c) => c.classList.toggle('on', +c.dataset.v === st.dur));
            const s0 = U.toMin(startEl.value);
            if (s0 !== null && mode === 'time') {
              const en = s0 + st.dur; let msg = st.dur ? `${U.hm(s0)} → ${U.hm(en % 1440)}${en >= 1440 ? ' (+1 j)' : ''}` : '';
              const d = dateEl.value || date0;
              const clash = Store.itemsOn(d).find((it) => !(it.kind === 'task' && ex && it.id === ex.id) && it.dur && it.start !== null && st.dur && s0 < it.start + it.dur && it.start < s0 + st.dur);
              if (clash) msg += `  ·  <span class="warn">${Icons.i('clock', 13)} ${T('tl.conflict')} : ${esc(clash.title)}</span>`;
              $('#f-end', el).innerHTML = msg;
            } else $('#f-end', el).innerHTML = '';
          };
          refresh();
          $('[data-seg=mode]', el).onclick = (e) => { const b = e.target.closest('.seg__b'); if (b) { mode = b.dataset.v; refresh(); } };
          startEl.onchange = startEl.oninput = dateEl.onchange = refresh;
          $('#f-dur', el).onclick = (e) => { const b = e.target.closest('.chip'); if (b) { st.dur = +b.dataset.v; refresh(); } };
          $('.stepper', el).onclick = (e) => { const b = e.target.closest('[data-step]'); if (!b) return; st.dur = U.clamp(st.dur + +b.dataset.step * (st.dur >= 60 ? 3 : 1), 0, 720); refresh(); };
          $('#f-rep', el).onclick = (e) => {
            const b = e.target.closest('.chip'); if (!b) return; st.repeat.type = b.dataset.v;
            $$('.chip', e.currentTarget).forEach((x) => x.classList.toggle('on', x === b));
            $('#f-rdays', el).hidden = st.repeat.type !== 'custom'; $('#w-until', el).hidden = st.repeat.type === 'none';
            if (st.repeat.type === 'custom' && !(st.repeat.days || []).length) { st.repeat.days = [U.dow(dateEl.value || date0)]; $$('#f-rdays .dbtn', el).forEach((x) => x.classList.toggle('on', +x.dataset.d === st.repeat.days[0])); }
          };
          $('#f-rdays', el).onclick = (e) => { const b = e.target.closest('.dbtn'); if (!b) return; const d = +b.dataset.d; const a = st.repeat.days || []; st.repeat.days = a.includes(d) ? a.filter((x) => x !== d) : [...a, d]; b.classList.toggle('on'); };
          $('#f-rem', el).onclick = (e) => {
            const b = e.target.closest('.chip'); if (!b) return; st.remind = b.dataset.v === 'n' ? null : +b.dataset.v;
            $$('.chip', e.currentTarget).forEach((x) => x.classList.toggle('on', x === b));
            if (st.remind !== null && window.Notifier) Notifier.ensurePermission();
          };
          const addSub = () => { const i = $('#f-sub', el), v = i.value.trim(); if (!v) return; st.subtasks.push({ id: U.id('s_'), t: v }); i.value = ''; $('#f-subs', el).innerHTML = subHtml(); i.focus(); };
          $('#f-subadd', el).onclick = addSub;
          $('#f-sub', el).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } };
          $('#f-subs', el).onclick = (e) => { const r = e.target.closest('[data-rm]'); if (!r) return; st.subtasks = st.subtasks.filter((s) => s.id !== r.closest('.sub').dataset.sid); $('#f-subs', el).innerHTML = subHtml(); };

          const del = $('#f-del', el);
          if (del) del.onclick = () => Forms.deleteTask(ex.id, o.date || date0).then((ok) => ok && close());

          $('#f-save', el).onclick = () => {
            const t = title.value.trim();
            if (!t) { title.classList.add('err'); title.focus(); UI.toast(T('err.name')); return; }
            const p = { title: t, icon: st.icon, color: st.color, notes: $('#f-notes', el).value.trim(), subtasks: st.subtasks };
            if (mode === 'inbox') Object.assign(p, { date: null, start: null, dur: 0, repeat: { type: 'none' }, remind: null });
            else {
              const rep = { type: st.repeat.type }; if (rep.type === 'custom') rep.days = (st.repeat.days || []).slice().sort(); if (rep.type !== 'none' && $('#f-until', el).value) rep.until = $('#f-until', el).value;
              if (rep.type === 'custom' && !rep.days.length) rep.type = 'none';
              Object.assign(p, { date: dateEl.value || date0, repeat: rep });
              if (mode === 'time') { const s0 = U.toMin(startEl.value); if (s0 === null) { UI.toast(T('err.time')); return; } Object.assign(p, { start: s0, dur: st.dur, remind: st.remind }); }
              else Object.assign(p, { start: null, dur: 0, remind: null });
            }
            if (ex) Store.updateTask(ex.id, p); else Store.addTask(p);
            UI.toast(T(ex ? 'task.saved' : 'task.created'), { icon: 'check' });
            if (p.date && window.App && App.route() === 'timeline') App.setDate(p.date);
            close();
          };
        }
      });
    },

    // Suppression avec choix de portée pour les tâches récurrentes
    async deleteTask(id, date) {
      const t = Store.task(id); if (!t) return false;
      const rec = (t.repeat || {}).type !== 'none';
      let scope = 'all';
      if (rec) {
        scope = await UI.choose({ title: T('task.deleteQ'), text: T('task.deleteSub'), options: [{ label: T('task.deleteOne'), value: 'one' }, { label: T('task.deleteAll'), value: 'all', danger: true }, { label: T('btn.cancel'), value: null }] });
        if (!scope) return false;
      } else if (!(await UI.confirm({ title: T('task.deleteQ'), ok: T('btn.delete'), danger: true }))) return false;
      Store.deleteTask(id, scope, date); UI.toast(T('task.deleted'), { icon: 'check' }); return true;
    },

    /* ================= ACTIONS RAPIDES (appui long) ================= */
    taskActions(it) {
      const isTask = it.kind === 'task';
      const act = (a, ic, l, cls = '') => `<button type="button" class="qa ${cls}" data-qa="${a}">${Icons.i(ic, 20)}<span>${l}</span></button>`;
      UI.sheet({
        title: it.title, cls: 'sheet--dialog',
        body: `<div class="qa-list">
          ${act('done', 'check', T(it.done ? 'act.uncomplete' : 'act.complete'))}
          ${act('edit', 'edit', isTask ? T('btn.edit') : T('act.openHabit'))}
          ${isTask ? `<div class="qa-shift"><span class="muted">${T('act.shift')}</span>${[-60, -15, 15, 60].map((m) => `<button type="button" class="chip" data-shift="${m}">${m > 0 ? '+' : '−'}${Math.abs(m) >= 60 ? '1 h' : Math.abs(m) + ' min'}</button>`).join('')}</div>
          ${act('tomorrow', 'arrowRight', T('act.tomorrow'))}${act('dup', 'copy', T('act.duplicate'))}${act('del', 'trash', T('btn.delete'), 'qa--danger')}` : ''}</div>`,
        onMount(el, close) {
          el.addEventListener('click', (e) => {
            const sh = e.target.closest('[data-shift]'), b = e.target.closest('[data-qa]');
            if (sh) { const t = Store.task(it.id); if (t && t.start !== null) { Store.updateTask(t.id, { start: U.clamp(t.start + +sh.dataset.shift, 0, 1439) }); UI.toast(T('task.moved'), { icon: 'check' }); close(); } return; }
            if (!b) return; const a = b.dataset.qa;
            if (a === 'done') { App.toggleItem(it); close(); }
            else if (a === 'edit') { close(); setTimeout(() => (isTask ? Forms.task({ id: it.id, date: it.date }) : Forms.habit(it.id)), 260); }
            else if (a === 'tomorrow') { const t = Store.task(it.id); if (t) { if ((t.repeat || {}).type === 'none') Store.updateTask(t.id, { date: U.add(it.date, 1) }); else { Store.deleteTask(t.id, 'one', it.date); Store.addTask({ ...t, repeat: { type: 'none' }, date: U.add(it.date, 1), subtasks: [] }); } UI.toast(T('task.moved'), { icon: 'check' }); } close(); }
            else if (a === 'dup') { Store.duplicateTask(it.id); UI.toast(T('task.duplicated'), { icon: 'check' }); close(); }
            else if (a === 'del') { close(); setTimeout(() => Forms.deleteTask(it.id, it.date), 260); }
          });
        }
      });
    },

    /* ================= INBOX ================= */
    inbox(date) {
      const render = () => {
        const l = Store.inbox();
        return l.length ? l.map((t) => `<div class="ib" data-id="${t.id}"><button type="button" class="ib__chk" data-ib="done" aria-label="${T('act.complete')}"></button>${UI.bubble(t.icon, t.color, 38, 18)}
          <button type="button" class="ib__t" data-ib="edit">${esc(t.title)}</button><button type="button" class="btn btn--soft btn--sm" data-ib="plan">${T('btn.plan')}</button></div>`).join('')
          : `<div class="empty empty--sm">${Icons.i('inbox', 36, 1.5)}<h3>${T('inbox.empty')}</h3><p>${T('inbox.emptySub')}</p></div>`;
      };
      UI.sheet({
        title: T('inbox.title'), full: true,
        body: `<div class="row"><input class="inp" id="ib-new" maxlength="80" placeholder="${esc(T('inbox.add'))}"><button type="button" class="btn btn--primary btn--sm" id="ib-add" aria-label="${T('btn.add')}">${Icons.i('plus', 18)}</button></div><div id="ib-list">${render()}</div>`,
        onMount(el, close) {
          const list = $('#ib-list', el), inp = $('#ib-new', el);
          const add = () => { const v = inp.value.trim(); if (!v) return; Store.addTask({ title: v, date: null, start: null, icon: 'inbox', color: '#6B7A86' }); inp.value = ''; list.innerHTML = render(); inp.focus(); };
          $('#ib-add', el).onclick = add; inp.onkeydown = (e) => { if (e.key === 'Enter') add(); };
          list.onclick = (e) => {
            const b = e.target.closest('[data-ib]'); if (!b) return; const id = b.closest('.ib').dataset.id, t = Store.task(id); if (!t) return;
            if (b.dataset.ib === 'done') { const copy = { ...t }; Store.deleteTask(id); list.innerHTML = render(); UI.toast(T('act.complete'), { icon: 'check', action: () => { Store.get().tasks.push(copy); Store.updateTask(copy.id, {}); list.innerHTML = render(); } }); }
            else { close(); setTimeout(() => Forms.task({ id, date, mode: b.dataset.ib === 'plan' ? 'time' : 'inbox' }), 260); }
          };
        }
      });
    },

    /* ================= SÉLECTEUR DE DATE ================= */
    datePicker(current, onPick) {
      let y = U.parse(current).getFullYear(), m = U.parse(current).getMonth();
      const paint = (el) => {
        const grid = U.monthGrid(y, m), today = U.today();
        $('.dp__t', el).textContent = U.cap(U.monthTitle(y, m));
        $('.dp__g', el).innerHTML = Array.from({ length: 7 }, (_, i) => `<span class="dp__w">${U.wdLetter(U.add(MON, i))}</span>`).join('') + grid.map((d) => {
          const inM = U.parse(d).getMonth() === m;
          const has = inM && Store.itemsOn(d).length;
          return `<button type="button" class="dp__d${inM ? '' : ' out'}${d === current ? ' sel' : ''}${d === today ? ' today' : ''}" data-d="${d}">${U.parse(d).getDate()}${has ? '<i></i>' : ''}</button>`;
        }).join('');
      };
      UI.sheet({
        title: T('tl.pickDate'), cls: 'sheet--dialog',
        body: `<div class="dp"><div class="dp__h"><button class="icon-btn" data-nav="-1" aria-label="‹">${Icons.i('left', 20)}</button><b class="dp__t"></b><button class="icon-btn" data-nav="1" aria-label="›">${Icons.i('right', 20)}</button></div><div class="dp__g"></div></div>
          <button type="button" class="btn btn--soft btn--full" data-today>${T('btn.today')}</button>`,
        onMount(el, close) {
          paint(el);
          el.addEventListener('click', (e) => {
            const n = e.target.closest('[data-nav]'), d = e.target.closest('[data-d]');
            if (n) { m += +n.dataset.nav; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } paint(el); }
            else if (d) { close(); onPick(d.dataset.d); }
            else if (e.target.closest('[data-today]')) { close(); onPick(U.today()); }
          });
        }
      });
    }
  };
  window.Forms = Forms;
})();
