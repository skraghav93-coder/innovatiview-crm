/* =====================================================================
   [24] RECYCLE BIN - where deleted data goes, and how to bring it back (Super Admin)
   24.1  Load the deleted rows (deleted_rows table, supabase/015)
   24.2  Screen: one line per delete (a project delete brings its centers and sheet rows with it)
   24.3  Restore: the database puts the rows back (restore_deleted), then the app reloads
   Every row deleted from projects, centers, assignments, people, vendors, master data, special logins and all
   calling sheets is copied, complete, into deleted_rows by a database trigger before it disappears.
   Rows deleted before 015 was run come from the old audit_log copy (projects, centers, people, vendors, master data);
   calling-sheet rows deleted before 015 were never kept and cannot be brought back.
   ===================================================================== */
let TRASH = { rows: null, err: '', q: '', busy: false };
const TRASH_NAME = { projects: 'Project', centers: 'Center', center_assignments: 'RM / AM assignment', employees: 'Person (PM / RM / AM)', vendors: 'Vendor', project_vendors: 'Vendor link',
  vc_master: 'Vendor DB row', zm_state: 'ZM list row', vc_state: 'VC list row', special_logins: 'Special login', calling_log: 'Calling log', ...Object.fromEntries(Object.entries(SHEET_OF_TABLE).map(([t, s]) => [t, s + ' row'])) };

/* ---- [24.1] Load ---- */
async function trashLoad() {
  if (TRASH.busy) return; TRASH.busy = true;
  const { data, error } = await sb.from('deleted_rows').select('id,deleted_at,deleted_by_name,deleted_by_email,table_name,project_ref,row_key,batch').is('restored_at', null).order('deleted_at', { ascending: false }).limit(5000);
  TRASH.busy = false; TRASH.rows = error ? [] : (data || []); TRASH.err = error ? error.message : '';
  if (S.view === 'trash') render();
}

/* ---- [24.2] Screen ---- */
function trashGroups() {
  const g = new Map();
  (TRASH.rows || []).forEach(r => { const k = String(r.batch || r.id); let o = g.get(k); if (!o) { o = { k, at: r.deleted_at, by: r.deleted_by_name || r.deleted_by_email || 'system', ids: [], n: {}, proj: new Set(), keys: [] }; g.set(k, o); }
    o.ids.push(r.id); o.n[r.table_name] = (o.n[r.table_name] || 0) + 1; if (r.project_ref) o.proj.add(r.project_ref); if (o.keys.length < 3 && r.row_key) o.keys.push(r.row_key); });
  return [...g.values()];
}
function trashWhat(o) {
  const order = ['projects', 'centers', ...Object.keys(SHEET_OF_TABLE), 'center_assignments'];
  const ix = t => { const i = order.indexOf(t); return i < 0 ? 99 : i; };
  return Object.entries(o.n).sort((a, b) => ix(a[0]) - ix(b[0])).map(([t, n]) => n + ' x ' + (TRASH_NAME[t] || t)).join(', ');
}
function vTrash() {
  if (!canTrash()) return '<div class="empty">Only a Super Admin can open the Recycle bin.</div>';
  if (TRASH.rows === null) { trashLoad(); return '<h2>Recycle bin</h2><div class="empty">Loading...</div>'; }
  const q = TRASH.q.toLowerCase(), G = trashGroups().filter(o => !q || [trashWhat(o), o.by, ...o.proj, ...o.keys].join(' ').toLowerCase().includes(q));
  const when = d => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `<div class="ph"><div><h2>Recycle bin</h2><p class="lead">Everything deleted from the portal lands here first: projects (with their centers and sheet rows), people, vendors, master data, special logins and calling-sheet rows. Restore puts it back exactly as it was.</p></div>
    <div class="row"><input type="search" placeholder="Search project, table or person" value="${esc(TRASH.q)}" onchange="TRASH.q=this.value;render()" style="width:260px"><button class="btn ghost" onclick="TRASH.rows=null;render()">Refresh</button></div></div>
    ${TRASH.err ? `<div class="card" style="color:var(--err)">Could not read the Recycle bin: ${esc(TRASH.err)}. Run supabase/015_special_logins_recycle_bin.sql first.</div>` : ''}
    <div class="card"><div class="tw"><table><thead><tr><th>Deleted on</th><th>Deleted by</th><th>Project</th><th>What</th><th>Example</th><th>Action</th></tr></thead><tbody>${G.slice(0, 300).map(o => `<tr>
      <td data-label="Deleted on">${esc(when(o.at))}</td><td data-label="Deleted by">${esc(o.by)}</td><td data-label="Project">${esc([...o.proj].slice(0, 2).join(', ') || '-')}</td>
      <td data-label="What" style="white-space:normal;min-width:240px">${esc(trashWhat(o))}</td><td data-label="Example" style="white-space:normal">${esc(o.keys.join(' | '))}</td>
      <td data-label="Action"><button class="btn or sm" onclick="trashRestore('${esc(o.k)}')">Restore</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing deleted.</td></tr>'}</tbody></table></div>
    ${G.length > 300 ? `<p class="muted">Showing the latest 300 of ${G.length}. Search to narrow down.</p>` : ''}
    <p class="muted" style="margin-top:10px">A row is restored only if nothing with the same key was created since (the newer row is kept). Restoring a sheet row needs its project to exist, so restore the project first. Calling-sheet rows deleted before the Recycle bin was switched on (015) were not kept.</p></div>`;
}

/* ---- [24.3] Restore ---- */
async function trashRestore(k) {
  const o = trashGroups().find(x => x.k === k); if (!o) return;
  if (!confirm('Restore ' + trashWhat(o) + ' (deleted ' + new Date(o.at).toLocaleString('en-GB') + ' by ' + o.by + ')?')) return;
  try { await SBX.flush(); } catch (e) { }
  const { data, error } = await sb.rpc('restore_deleted', { ids: o.ids });
  if (error) return toast('Not restored: ' + error.message, true);
  const res = data || {};
  toast((res.restored || 0) + ' row(s) restored' + (res.skipped ? ', ' + res.skipped + ' skipped (already there, or their project is missing)' : '') + '. Reloading data...', !!res.skipped);
  await SBX.loadAll(ROLE); if (typeof migrateOpc === 'function') migrateOpc();
  TRASH.rows = null; render();
}
