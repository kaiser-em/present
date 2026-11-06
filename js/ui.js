/* Present — composants UI : bottom sheets, toasts, confirmations, anneau, helpers */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stack = [];

  const UI = {
    $, $$,
    haptic(ms = 8) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} },

    // Délégation d'évènements : <button data-act="nom" data-id="…"> → handlers.nom(el, event)
    delegate(root, handlers, type = 'click') {
      root.addEventListener(type, (e) => {
        const el = e.target.closest('[data-act]');
        if (!el || !root.contains(el)) return;
        const fn = handlers[el.dataset.act];
        if (fn) fn(el, e);
      });
    },

    ring(pct, size = 96, stroke = 9, cls = '') {
      const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - U.clamp(pct, 0, 100) / 100);
      return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${pct}%">
        <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
        <circle class="ring__fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
    },

    bubble(icon, color, size = 44, ic = 22) {
      return `<span class="bubble" style="--c:${color};width:${size}px;height:${size}px">${Icons.i(icon, ic)}</span>`;
    },

    seg(name, opts, val) {
      return `<div class="seg" role="tablist" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" role="tab" aria-selected="${v == val}" class="seg__b${v == val ? ' on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
    },

    /* ---------- Toast ---------- */
    toast(msg, o = {}) {
      let t = $('#toast');
      clearTimeout(UI._tt);
      t.innerHTML = `${o.icon ? `<span class="toast__ic">${Icons.i(o.icon, 18, 2.5)}</span>` : ''}<span class="toast__m">${U.esc(msg)}</span>${o.action ? `<button class="toast__a" type="button">${U.esc(o.label || T('habit.undo'))}</button>` : ''}`;
      t.classList.add('show');
      const a = $('.toast__a', t);
      if (a) a.onclick = () => { t.classList.remove('show'); o.action(); };
      UI._tt = setTimeout(() => t.classList.remove('show'), o.ms || 3200);
    },

    /* ---------- Bottom sheets (gèrent le bouton retour Android) ---------- */
    sheet({ title = '', body = '', foot = '', full = false, cls = '', onMount, onClose } = {}) {
      const ov = document.createElement('div');
      ov.className = 'sheet-ov';
      ov.innerHTML = `<div class="sheet ${full ? 'sheet--full' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
        <div class="sheet__grab" aria-hidden="true"></div>
        ${title ? `<div class="sheet__hd"><h2>${U.esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="${T('btn.close')}">${Icons.i('x', 20)}</button></div>` : ''}
        <div class="sheet__bd">${body}</div>${foot ? `<div class="sheet__ft">${foot}</div>` : ''}</div>`;
      document.body.appendChild(ov);
      const el = ov.firstElementChild;
      const entry = { ov, el, onClose, closed: false };
      stack.push(entry);
      history.pushState({ sh: stack.length }, '');
      requestAnimationFrame(() => ov.classList.add('open'));
      const close = () => UI._close(entry);
      entry.close = close;
      ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });

      // glisser vers le bas pour fermer
      let sy = 0, dy = 0, drag = false;
      const grab = $('.sheet__grab', el), hd = $('.sheet__hd', el);
      [grab, hd].forEach((h) => h && h.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = true; sy = e.clientY; dy = 0; h.setPointerCapture(e.pointerId); el.style.transition = 'none'; }));
      [grab, hd].forEach((h) => h && h.addEventListener('pointermove', (e) => { if (!drag) return; dy = Math.max(0, e.clientY - sy); el.style.transform = `translateY(${dy}px)`; }));
      [grab, hd].forEach((h) => h && h.addEventListener('pointerup', () => { if (!drag) return; drag = false; el.style.transition = ''; if (dy > 90) close(); else el.style.transform = ''; }));

      onMount && onMount(el, close);
      return { el, close };
    },
    _close(entry, fromPop) {
      if (entry.closed) return;
      entry.closed = true;
      const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1);
      entry.ov.classList.remove('open');
      setTimeout(() => entry.ov.remove(), 220);
      entry.onClose && entry.onClose();
      if (!fromPop && history.state && history.state.sh > stack.length) history.back();
    },
    closeAll() { while (stack.length) UI._close(stack[stack.length - 1], true); },
    isOpen: () => stack.length > 0,

    choose({ title, text = '', options }) {
      return new Promise((res) => {
        let picked = false;
        const s = UI.sheet({
          title, cls: 'sheet--dialog',
          body: `${text ? `<p class="muted dlg-t">${U.esc(text)}</p>` : ''}<div class="dlg-btns">${options.map((o, i) => `<button type="button" class="btn ${o.danger ? 'btn--danger' : o.primary ? 'btn--primary' : 'btn--soft'} btn--full" data-i="${i}">${U.esc(o.label)}</button>`).join('')}</div>`,
          onClose: () => { if (!picked) res(null); },
          onMount: (el, close) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; picked = true; res(options[+b.dataset.i].value); close(); })
        });
      });
    },
    confirm({ title, text, ok = T('btn.confirm'), danger = false }) {
      return UI.choose({ title, text, options: [{ label: ok, value: true, danger, primary: !danger }, { label: T('btn.cancel'), value: false }] }).then((v) => !!v);
    }
  };

  window.addEventListener('popstate', () => {
    const depth = (history.state && history.state.sh) || 0;
    while (stack.length > depth) UI._close(stack[stack.length - 1], true);
  });

  window.UI = UI;
})();
