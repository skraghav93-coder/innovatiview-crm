/* =====================================================================
   [23] SPECIAL LOGINS - logins for Sr Project Manager, Vendor Team Head, Operation Manager,
        Process Excellence Manager / Member, SCM Team and any other title
   23.1  Column lists of every sheet (for the permission picker)
   23.2  Multi-select dropdown with "All" (single, several or all values)
   23.3  List screen (Super Admin / Admin)
   23.4  Add / edit form: name, email, title, then rows of Sheets + Columns + View / Edit
   Stored in the special_logins table (supabase/015). A special login sees every project; the database also checks
   which columns it may change (015, col_guard). Center lists are view only for special logins.
   ===================================================================== */
const SP_TITLES = ['Sr Project Manager', 'Vendor Team Head', 'Operation Manager', 'Process Excellence Manager', 'Process Excellence Member', 'SCM Team'];
let SPL = { list: null, busy: false };   // special logins as loaded from the database
let SPD = null;                          // the login being added / edited

/* ---- [23.1] Column labels of a sheet, built the same way the sheet builds them (dates shown as Day 1, Day 2 ...) ---- */
const SP_COLS = {};
function sheetLabels(sheet) {
  if (SP_COLS[sheet]) return SP_COLS[sheet];
  const P = { code: '__columns__', name: 'Columns', services: ['Biometric', 'Frisking', 'CSO'], shifts: '8', days: 8, dates: [], pmBy: {}, opRatio: 1, frRatio: 1 };
  let cols = [];
  try {
    if (VIEW_ONLY_SHEETS.includes(sheet)) {
      const k = S.svc; S.svc = { 'Bio Center List': 'Biometric', 'Frisking Center List': 'Frisking', 'CSO Center List': 'CSO' }[sheet];
      try { cols = bioCols(P, false); } finally { S.svc = k; }
    } else cols = withSheet(P, sheet === 'Guard List' ? 'Frisking' : 'Biometric', sheet, c => c);
  } catch (e) { console.warn('Columns of ' + sheet + ': ' + e.message); }
  return (SP_COLS[sheet] = [...new Set(cols.map(k => String(k[0])))]);
}

/* ---- [23.2] Multi-select with "All" ---- */
function msBox(id, opts, sel, allLabel, disabled) {
  const all = sel.includes('*'), shown = all ? `<span class="tag">${esc(allLabel)}</span>` : sel.length ? sel.slice(0, 4).map(x => `<span class="tag">${esc(x)}</span>`).join('') + (sel.length > 4 ? `<span class="tag">+${sel.length - 4} more</span>` : '') : '<span class="muted">Select...</span>';
  if (disabled) return `<div class="ms"><div class="msd" style="cursor:default;opacity:.7">${shown}</div></div>`;
  return `<div class="ms" id="${id}"><div class="msd" onclick="msOpen('${id}')">${shown}</div><div class="mso"><input type="search" placeholder="Search" oninput="msFind('${id}',this.value)">
    <label><input type="checkbox" value="*" ${all ? 'checked' : ''} onchange="spPick('${id}',this)"><b>${esc(allLabel)}</b></label>
    ${opts.map(o => `<label><input type="checkbox" value="${esc(o)}" ${!all && sel.includes(o) ? 'checked' : ''} ${all ? 'disabled' : ''} onchange="spPick('${id}',this)"><span>${esc(o)}</span></label>`).join('')}</div></div>`;
}
let MS_OPEN = '';
function msOpen(id) { const el = document.getElementById(id); if (!el) return; const was = el.classList.contains('open'); document.querySelectorAll('.ms.open').forEach(x => x.classList.remove('open')); if (!was) { el.classList.add('open'); MS_OPEN = id; } else MS_OPEN = ''; }
function msFind(id, q) { q = String(q || '').toLowerCase(); document.querySelectorAll('#' + id + ' .mso label').forEach((l, i) => { l.style.display = i === 0 || !q || l.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }
document.addEventListener('mousedown', e => { if (MS_OPEN && !(e.target.closest && e.target.closest('.ms'))) { document.querySelectorAll('.ms.open').forEach(x => x.classList.remove('open')); MS_OPEN = ''; } });

/* ---- [23.3] List ---- */
async function spLoad() {
  if (SPL.busy) return; SPL.busy = true;
  const { data, error } = await sb.from('special_logins').select('*').order('name');
  SPL.busy = false;
  if (error) { SPL.list = []; SPL.err = error.message; } else { SPL.list = data || []; SPL.err = ''; }
  if (S.view === 'special') render();
}
const permText = r => `${r.mode === 'edit' ? '<span class="badge edit">Edit</span>' : '<span class="badge">View</span>'} ${esc((r.sheets || []).includes('*') ? 'All sheets' : (r.sheets || []).join(', '))} - ${esc((r.cols || []).includes('*') ? 'all columns' : (r.cols || []).length + ' column' + ((r.cols || []).length > 1 ? 's' : '') + ': ' + (r.cols || []).slice(0, 3).join(', ') + ((r.cols || []).length > 3 ? ' ...' : ''))}`;
function vSpecial() {
  if (!canSpecialAdmin()) return '<div class="empty">Only Super Admin and Admin manage special logins.</div>';
  if (SPL.list === null) { spLoad(); return '<h2>Special logins</h2><div class="empty">Loading...</div>'; }
  const L = SPL.list;
  return `<div class="ph"><div><h2>Special logins</h2><p class="lead">Logins with their own title (Sr Project Manager, Vendor Team Head, Operation Manager, Process Excellence, SCM Team ...). Each one sees every project, and only the sheets and columns given here, as View or Edit.</p></div>
    <div class="row"><button class="btn ghost" onclick="SPL.list=null;render()">Refresh</button><button class="btn or" onclick="spForm()">+ Add special login</button></div></div>
    ${SPL.err ? `<div class="card" style="color:var(--err)">Could not read special logins: ${esc(SPL.err)}. Run supabase/015_special_logins_recycle_bin.sql first.</div>` : ''}
    <div class="card"><div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Title</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead><tbody>${L.map((x, i) => `<tr>
      <td data-label="Name"><b>${esc(x.name)}</b></td><td data-label="Email">${esc(x.email)}</td><td data-label="Title">${esc(x.title)}</td>
      <td data-label="Access" style="white-space:normal;min-width:320px">${(x.perms || []).map(permText).join('<br>') || '<span class="muted">Nothing given yet</span>'}</td>
      <td data-label="Status"><span class="pill ${x.active === false ? 'Completed' : 'Active'}">${x.active === false ? 'Inactive' : 'Active'}</span></td>
      <td data-label="Actions"><button class="btn ghost sm" onclick="spForm(${i})">Edit</button> <button class="btn ghost sm" onclick="spDelete(${i})">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No special logins yet.</td></tr>'}</tbody></table></div>
    <p class="muted" style="margin-top:10px">The person signs in with Google using this email (any domain). Center lists can be given as View only. A column whose name holds a date is listed as Day 1, Day 2 ...; the column choice applies to every project.</p></div>`;
}
async function spDelete(i) {
  const x = SPL.list[i]; if (!x) return;
  if (!confirm('Delete the special login of ' + x.name + ' (' + x.email + ')? They can no longer sign in. A Super Admin can bring it back from the Recycle bin.')) return;
  const { error } = await sb.from('special_logins').delete().eq('email', x.email);
  if (error) return toast('Not deleted: ' + error.message, true);
  toast('Special login deleted'); SPL.list = null; render();
}

/* ---- [23.4] Add / edit ---- */
function spForm(i) {
  const x = i === undefined ? null : SPL.list[i];
  SPD = x ? { orig: x.email, name: x.name, email: x.email, title: x.title, active: x.active !== false, perms: JSON.parse(JSON.stringify(x.perms || [])) }
          : { orig: '', name: '', email: '', title: '', active: true, perms: [{ sheets: [], cols: [], mode: 'view' }] };
  openModal(x ? 'Edit special login' : 'Add special login',
    `<table class="qa">
      <tr><td>Name *</td><td><input id="sp_name" value="${esc(SPD.name)}" placeholder="Full name"></td></tr>
      <tr><td>Email (Google sign-in) *</td><td><input id="sp_email" type="email" value="${esc(SPD.email)}" placeholder="name@company.com"></td></tr>
      <tr><td>Title *</td><td><input id="sp_title" list="sp_titles" value="${esc(SPD.title)}" placeholder="Pick or type a title" onchange="spTitle(this.value)"><datalist id="sp_titles">${SP_TITLES.map(t => `<option value="${esc(t)}">`).join('')}</datalist></td></tr>
      <tr><td>Status</td><td><select id="sp_active"><option value="1" ${SPD.active ? 'selected' : ''}>Active</option><option value="0" ${SPD.active ? '' : 'selected'}>Inactive</option></select></td></tr></table>
     <h4 style="margin:6px 0">Access: sheets, columns, view or edit</h4>
     <p class="muted" style="margin-top:0">Choose one sheet, several or All; then one column, several or All. Add more rows for a different access on other columns (for example View all columns, Edit two of them).</p>
     <div id="sp_perms"></div><button class="btn ghost sm" type="button" onclick="spAddRow()">+ Add access row</button>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="spSave()">${x ? 'Save changes' : 'Create login'}</button>`, true);
  spDraw();
}
function spTitle(v) {   // SCM Team: Device Damages / Losses / delays can be edited in the Guard List and OP List, everything else there is view
  if (v === 'SCM Team' && !SPD.perms.some(r => (r.sheets || []).length)) { SPD.perms = [{ sheets: ['Guard List', 'OP List'], cols: ['*'], mode: 'view' }, { sheets: ['Guard List', 'OP List'], cols: ['Device Damages / Losses / delays'], mode: 'edit' }]; spDraw(); toast('SCM Team access filled in: view the Guard List and OP List, edit Device Damages / Losses / delays. Change it if needed.'); }
}
function spColsFor(r) { const sh = (r.sheets || []).includes('*') ? SHEETS : (r.sheets || []); return [...new Set(sh.flatMap(sheetLabels))]; }
function spDraw() {
  const box = $('#sp_perms'); if (!box) return;
  box.innerHTML = `<table class="permtbl" style="min-width:0;width:100%"><thead><tr><th style="width:30%">Sheets</th><th>Columns</th><th style="width:110px">Access</th><th style="width:40px"></th></tr></thead><tbody>${SPD.perms.map((r, i) => {
    const onlyView = (r.sheets || []).length && !(r.sheets || []).includes('*') && r.sheets.every(x => VIEW_ONLY_SHEETS.includes(x));
    return `<tr><td>${msBox('sp_s_' + i, SHEETS, r.sheets || [], 'All sheets')}</td><td>${(r.sheets || []).length ? msBox('sp_c_' + i, spColsFor(r), r.cols || [], 'All columns') : '<span class="muted">Choose the sheets first</span>'}</td>
      <td><select onchange="SPD.perms[${i}].mode=this.value" ${onlyView ? 'disabled title="Center lists are view only"' : ''}><option value="view" ${r.mode !== 'edit' ? 'selected' : ''}>View</option><option value="edit" ${r.mode === 'edit' && !onlyView ? 'selected' : ''}>Edit</option></select></td>
      <td><button class="btn ghost sm" type="button" title="Remove row" aria-label="Remove row" onclick="SPD.perms.splice(${i},1);spDraw()">×</button></td></tr>`; }).join('')}</tbody></table>`;
  if (MS_OPEN && document.getElementById(MS_OPEN)) document.getElementById(MS_OPEN).classList.add('open');
}
function spAddRow() { SPD.perms.push({ sheets: [], cols: [], mode: 'view' }); spDraw(); }
function spPick(id, el) {
  const [, kind, i] = id.split('_'), r = SPD.perms[+i]; if (!r) return;
  const key = kind === 's' ? 'sheets' : 'cols'; let a = (r[key] || []).filter(x => x !== '*');
  if (el.value === '*') a = el.checked ? ['*'] : []; else if (el.checked) a.push(el.value); else a = a.filter(x => x !== el.value);
  r[key] = [...new Set(a)];
  if (kind === 's') { const ok = new Set(spColsFor(r)); if (!(r.cols || []).includes('*')) r.cols = (r.cols || []).filter(c => ok.has(c)); }   // drop columns of sheets no longer chosen
  MS_OPEN = id; spDraw();
}
async function spSave() {
  const name = val('sp_name'), email = val('sp_email').toLowerCase(), title = val('sp_title'), active = val('sp_active') === '1';
  if (!name) return toast('Enter the name.', true);
  if (!EMAIL_OK(email)) return toast('Enter a valid email address.', true);
  if (!title) return toast('Pick or type a title.', true);
  const perms = SPD.perms.filter(r => (r.sheets || []).length && (r.cols || []).length).map(r => ({ sheets: r.sheets, cols: r.cols, mode: r.mode === 'edit' && !r.sheets.every(x => VIEW_ONLY_SHEETS.includes(x)) ? 'edit' : 'view' }));
  if (!perms.length) return toast('Give at least one sheet and column.', true);
  if ((SPL.list || []).some(x => x.email === email && x.email !== SPD.orig)) return toast('This email already has a special login.', true);
  const emp = db.employees.find(e => String(e.email || '').trim().toLowerCase() === email);
  if (emp && !confirm(email + ' is in the people list as ' + emp.name + ' (' + emp.role + '). As a special login this person gets the special access instead of the ' + emp.role + ' access. Continue?')) return;
  if (SPD.orig && SPD.orig !== email) { const { error } = await sb.from('special_logins').delete().eq('email', SPD.orig); if (error) return toast('Not saved: ' + error.message, true); }
  const { error } = await sb.from('special_logins').upsert({ email, name, title, active, perms }, { onConflict: 'email' });
  if (error) return toast('Not saved: ' + error.message, true);
  closeModal(); toast('Special login saved. ' + name + ' signs in with Google using ' + email + '.'); SPL.list = null; render();
}
