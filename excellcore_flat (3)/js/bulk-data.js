/* ===== Opsview data, AI data and Training video data: bulk upload by Admin only =====
   These columns cannot be typed into a sheet by anyone (the database also refuses it). An Admin fills them here, from a file:
   download the template (it comes with the current values), change it, upload it. Rows are matched by Center Code, plus Exam Date and OP #
   where the sheet has one row per day / per operator. A row without a matching centre or date is skipped and reported; nothing is applied to all dates at once. */
const BULK_DATA = [
  { id: 'ai-op',   label: 'AI data - Operator Calling',               sheet: 'Operator Calling',         keys: ['Center Code', 'Exam Date', 'OP #'], fields: [['AI Calling Status', 'aics'], ['AI Calling', 'aic']] },
  { id: 'ai-ex',   label: 'AI data - Exam day Calling',               sheet: 'Exam day Calling',         keys: ['Center Code', 'Exam Date'],         fields: [['AI ETA (S1)', 'ae1'], ['AI ETA (S2)', 'ae2'], ['AI Principal Confirmation', 'apc'], ['AI ETA URL', 'aeu'], ['AI ETA Status', 'aes']] },
  { id: 'ops-mk',  label: 'Opsview data - Mock Calling',              sheet: 'Mock Calling',             keys: ['Center Code'],                      fields: [['OPS View Selfie Upload', 'ovs'], ['OPS View Mock Report', 'ovm']] },
  { id: 'ops-ex',  label: 'Opsview data - Exam day Calling',          sheet: 'Exam day Calling',         keys: ['Center Code', 'Exam Date'],         fields: [['Opsview Status Total Task', 'ost'], ['Opsview Status Task Done', 'osd']] },
  { id: 'tv-op',   label: 'Training video data - Operator Calling',   sheet: 'Operator Calling',         keys: ['Center Code', 'Exam Date', 'OP #'], fields: [['Training Video Watched', 'tvw'], ['Video Watched Count', 'tvc'], ['Video Watched Status', 'tvs']] },
  { id: 'tv-dl',   label: 'Training video data - TV Data Download Calling', sheet: 'TV Data Download Calling', keys: ['Center Code'],                fields: [['Training Video Received', 'tvr']] },
];

function bulkDataOpen() {
  if (!canBulkData()) return toast('Only an Admin can upload this data.', true);
  const p = getP(S.pid); if (!p) return toast('Select a project first.', true);
  const svOpts = p.services.map(x => `<option ${x === curSvc(p) ? 'selected' : ''}>${esc(x)}</option>`).join('');
  openModal('Bulk data upload (Admin)',
    `<p class="lead">Opsview data, AI data and Training video data are filled from a file by an Admin. Project: <b>${esc(projTitle(p))}</b>.</p>
     <table class="qa"><tr><td>Service</td><td><select id="bd_sv" onchange="bulkDataPick()">${svOpts}</select></td></tr>
       <tr><td>Data</td><td><select id="bd_kind"></select></td></tr>
       <tr><td>File</td><td><input type="file" id="bd_file" accept=".xlsx,.xls,.csv"></td></tr></table>
     <p class="muted" id="bd_hint"></p>`,
    `<button class="btn ghost" onclick="closeModal()">Close</button><button class="btn ghost" onclick="bulkDataTemplate()">Download template</button><button class="btn or" onclick="bulkDataUpload()">Upload</button>`);
  bulkDataPick();
}
function bulkDataPick() {
  const p = getP(S.pid), sv = $('#bd_sv').value;
  $('#bd_kind').innerHTML = BULK_DATA.filter(b => sheetApplies(p, sv, b.sheet)).map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('');
  $('#bd_hint').textContent = 'The template lists every row of the sheet with its current values. Keep the first columns as they are and change only the data columns.';
}
const bulkSel = () => BULK_DATA.find(b => b.id === $('#bd_kind').value);
const bulkIso = (p, v) => { let t = String(v ?? '').trim(); if (/^\d{5}$/.test(t)) t = new Date(Math.round((+t - 25569) * 864e5)).toISOString().slice(0, 10); const dts = projDates(p); if (dts.includes(t)) return t; const m = dmIso(t, dts[0] || p.start || ''); return dts.includes(m) ? m : ''; };

function bulkDataTemplate() {
  const p = getP(S.pid), sv = $('#bd_sv').value, b = bulkSel(); if (!b) return toast('Nothing to upload for this service.', true);
  const rows = withSheet(p, sv, b.sheet, (cols, rows) => rows.map(r => [r.c, ...(b.keys.includes('Exam Date') ? [dayIso(p, r.d)] : []), ...(b.keys.includes('OP #') ? [r.n] : []), ...b.fields.map(f => r[f[1]] ?? '')]));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...b.keys, ...b.fields.map(f => f[0])], ...rows]), 'Data');
  XLSX.writeFile(wb, b.id + '_template.xlsx');
}

function bulkDataUpload() {
  const f = $('#bd_file').files[0]; if (!f) return toast('Select a file first.', true);
  const p = getP(S.pid), sv = $('#bd_sv').value, b = bulkSel(); if (!b) return;
  const rd = new FileReader(); rd.onload = ev => { try {
    const wb = XLSX.read(ev.target.result, { type: 'array' }), objs = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const res = bulkApply(p, sv, b, objs);
    save(); closeModal(); render();
    toast(`${res.done} row(s) updated` + (res.nokey ? `; ${res.nokey} without a matching center` : '') + (res.nodate ? `; ${res.nodate} without a valid exam date` : '') + (res.noop ? `; ${res.noop} without an OP #` : '') + '.', !!(res.nokey || res.nodate || res.noop));
  } catch (e) { toast('Error: ' + e.message, true); } }; rd.readAsArrayBuffer(f);
}

/* Applies the rows of a file. Returns the counts; also used by the tests. */
function bulkApply(p, sv, b, objs) {
  const res = { done: 0, nokey: 0, nodate: 0, noop: 0 }, st = ((db.opc = db.opc || {})[p.code + '|' + sv + '|' + b.sheet] = (db.opc[p.code + '|' + sv + '|' + b.sheet] || {}));
  const centers = ((db.sheets || {})[p.code] || {})[sv] || [], find = code => centers.find(c => c.code === String(code).trim()) || centers.find(c => normC(c.code) === normC(code));
  objs.forEach(o => {
    const c = find(o['Center Code'] ?? ''); if (!c) { res.nokey++; return; }
    let rk = c.code;
    if (b.keys.includes('Exam Date')) { const iso = bulkIso(p, o['Exam Date']); if (!iso) { res.nodate++; return; } const d = projDates(p).indexOf(iso); rk = c.code + '|' + d; if (b.keys.includes('OP #')) { const n = +o['OP #']; if (!n) { res.noop++; return; } rk += '|' + n; } }
    const row = (st[rk] = st[rk] || {}); let any = false;
    b.fields.forEach(([h, k]) => { if (!(h in o)) return; const v = o[h]; if (v === '' || v === null || v === undefined) { if (row[k] !== undefined) { delete row[k]; any = true; } return; } row[k] = String(v); any = true; });
    if (any) res.done++;
  });
  return res;
}
