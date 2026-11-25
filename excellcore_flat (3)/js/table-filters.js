/* ===== A filter on every table =====
   Tables that already carry their own filters (operations sheets, centre lists, Guard / OP list) are left alone. Every other table
   (projects, people lists, vendor and master data, reports ...) gets a funnel in each column header: tick one or more values, Apply.
   The choice is remembered for that screen while you move around. */
const TF = new Map();   // screen + table position -> { column index: [values] }
const tfText = c => { const el = c.querySelector('select,input:not([type=checkbox]):not([type=file])'); const v = el ? (el.tagName === 'SELECT' ? ((el.options[el.selectedIndex] || {}).text || '') : el.value) : c.textContent; return String(v).replace(/\s+/g, ' ').trim(); };
const tfScreen = () => [S.view, S.otab, S.svc, S.pid].join('|');

function enhanceTables(root) {
  const base = tfScreen();
  (root || document).querySelectorAll('table').forEach((t, ti) => {
    if (t.querySelector('.fbtn') || t.classList.contains('qa') || t.closest('.modal') || !t.tHead || !t.tBodies.length) return;
    const head = t.tHead.rows[t.tHead.rows.length - 1], key = base + '|' + ti; t.dataset.tfk = key; if (!TF.has(key)) TF.set(key, {});
    [...head.cells].forEach((th, ci) => {
      if (!th.textContent.trim() || th.querySelector('.tfb')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fbtn tfb' + ((TF.get(key)[ci] || []).length ? ' on' : '');
      const name = th.textContent.trim(); b.title = 'Filter ' + name; b.setAttribute('aria-label', 'Filter ' + name); b.innerHTML = FUNNEL; b.onclick = ev => tfOpen(ev, t, ci); th.appendChild(b);
    });
    tfApply(t);
  });
}
function tfApply(t) {
  const f = TF.get(t.dataset.tfk) || {}, cols = Object.keys(f).filter(c => (f[c] || []).length);
  [...t.tBodies].forEach(tb => [...tb.rows].forEach(r => { r.style.display = cols.every(c => f[c].includes(tfText(r.cells[+c] || document.createElement('td')))) ? '' : 'none'; }));
}
function tfOpen(ev, t, ci) {
  ev.stopPropagation(); const btn = ev.currentTarget, had = document.querySelector('#fpop'), id = t.dataset.tfk + '|' + ci; closeFilter(); if (had && had.dataset.k === id) return;
  const vals = [...new Set([...t.tBodies].flatMap(tb => [...tb.rows].map(r => tfText(r.cells[ci] || document.createElement('td')))).filter(v => v !== ''))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 500);
  const st = TF.get(t.dataset.tfk), sel = new Set(st[ci] || []), pop = document.createElement('div'); pop.id = 'fpop'; pop.dataset.k = id;
  pop.innerHTML = '<input type="search" placeholder="Search values" aria-label="Search values"><div class="fbar"><button type="button" data-a="all">Select shown</button><button type="button" data-a="none">Clear</button></div><div class="fl"></div><div class="ffoot"><button type="button" class="btn ghost sm" data-a="cancel">Cancel</button><button type="button" class="btn or sm" data-a="apply">Apply</button></div>';
  document.body.appendChild(pop);
  const list = pop.querySelector('.fl'), q = pop.querySelector('input'); let shown = [];
  const draw = () => { const s = q.value.trim().toLowerCase(); shown = vals.filter(x => !s || x.toLowerCase().includes(s));
    list.innerHTML = shown.map(x => `<label><input type="checkbox" value="${esc(x)}" ${sel.has(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('') || '<div class="fe">No matching values</div>'; };
  list.onchange = e => { const c = e.target; if (c.type !== 'checkbox') return; if (c.checked) sel.add(c.value); else sel.delete(c.value); };
  pop.onclick = e => { const bt = e.target.closest('button[data-a]'); if (!bt) return; const a = bt.dataset.a;
    if (a === 'all') { shown.forEach(x => sel.add(x)); draw(); } else if (a === 'none') { sel.clear(); draw(); } else if (a === 'cancel') closeFilter();
    else { st[ci] = [...sel]; closeFilter(); btn.classList.toggle('on', sel.size > 0); tfApply(t); } };
  q.oninput = draw; draw();
  const r = btn.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(r.left, innerWidth - 268)) + 'px'; pop.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - 420)) + 'px';
  FPH = e => { if (!pop.contains(e.target) && !(e.target.closest && e.target.closest('.fbtn'))) closeFilter(); };
  document.addEventListener('mousedown', FPH, true); window.addEventListener('scroll', FPH, true); q.focus();
}
