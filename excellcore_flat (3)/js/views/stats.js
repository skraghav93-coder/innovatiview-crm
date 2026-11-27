/* [15] STATS - Quick links: RM wise and Vendor / VM wise stats */
/* =====================================================================
   Quick links: RM wise stats (Operations sheets) and Vendor / VM wise
   stats (Vendor sheets). Opens in a popup. Uses exactly the same counting
   rules as the Guard List / OP List group rows, so the numbers agree.
   ===================================================================== */

let ST = { dim: 'rm', svc: '' };   // what the popup is currently showing

const NONE_KEY = { id: '', label: 'Unassigned', sub: '' };
const STAT_KEYS = {
  rm:     (p, c) => { const n = asg(p, c.code).rm; return n ? { id: n, label: n, sub: '' } : NONE_KEY; },
  vendor: (p, c) => { if (!c.vc) return NONE_KEY; const v = vcOf(c); return { id: c.vc, label: v.holder || c.vc, sub: c.vc + (v.vname ? ' - ' + v.vname : '') }; },
  vm:     (p, c) => c.zm ? { id: c.zm, label: c.zm, sub: '' } : NONE_KEY
};
const STAT_TITLE = { rm: 'RM wise stats', vendor: 'Vendor wise stats', vm: 'VM wise stats' };
const STAT_FIRST = { rm: 'Regional Manager', vendor: 'Vendor', vm: 'VM / ZM' };

function aggStats(p, svc, dim) {
  const S0 = S.svc; S.svc = svc;
  try {
    const O = db.opc || {}, sheet = n => O[p.code + '|' + svc + '|' + n] || {};
    const st = sheet('Operator Calling'), mk = sheet('Mock Calling'), tv = sheet('TV Data Download Calling');
    const g = new Map();
    lst(p).forEach(c => {
      const k = STAT_KEYS[dim](p, c);
      let a = g.get(k.id);
      if (!a) { a = { label: k.label, sub: k.sub, centers: 0, ams: new Set(), man: 0, rec: 0, sup: 0, opr: 0, going: 0, rej: 0, nc: 0, done: 0, sqo: 0, mock: 0, dev: 0, dd: 0, tr: 0 }; g.set(k.id, a); }
      const x = calcCenter(p, c);
      a.centers++; a.man += x.all;
      const am = asg(p, c.code).am; if (am) a.ams.add(am);
      x.days.forEach((dy, d) => { for (let n = 1; n <= dy.m; n++) {
        const r = st[`${c.code}|${d}|${n}`]; if (!r) continue;
        if (r.name) { a.rec++; if (r.des === 'Supervisor') a.sup++; else a.opr++; }
        if (r.bcs) { a.done++; if (r.bcs === 'Going') a.going++; else if (r.bcs === 'Denied to work') a.rej++; else if (['Not Connected', 'Switch off', 'Wrong Number'].includes(r.bcs)) a.nc++; }
        if (r.sqo) a.sqo++;
      } });
      if ((mk[c.code] || {}).ma === 'Yes') a.mock++;
      const t = tv[c.code] || {}; a.dev += NM(t.dev); a.dd += NM(t.dd); a.tr += NM(t.trd);
    });
    // unassigned last, everything else A to Z
    return [...g.values()].sort((a, b) => (a.label === 'Unassigned') - (b.label === 'Unassigned') || String(a.label).localeCompare(b.label));
  } finally { S.svc = S0; }
}

function statCols(dim) {
  const c = [[STAT_FIRST[dim], a => `<b>${esc(a.label)}</b>${a.sub ? `<small>${esc(a.sub)}</small>` : ''}`, a => a.label]];
  c.push(['Centers', a => a.centers]);
  if (dim === 'rm') c.push(['AMs', a => a.ams.size]);
  c.push(['Manpower needed', a => a.man], ['Received', a => a.rec], ['Supervisors', a => a.sup], ['Operators / Guards', a => a.opr],
         ['Pending to receive', a => mx0(a.man, a.rec)], ['Pending %', a => pct(mx0(a.man, a.rec), a.man)],
         ['Going', a => a.going], ['Rejected', a => a.rej], ['Not connected', a => a.nc], ['Calling pending', a => mx0(a.rec, a.done)],
         ['SeqrView onboarded', a => a.sqo], ['Mock done (centers)', a => a.mock], ['Devices', a => a.dev], ['Data downloaded', a => a.dd], ['Transactions done', a => a.tr]);
  return c;
}

function statsHtml() {
  const p = getP(S.pid), cols = statCols(ST.dim), rows = aggStats(p, ST.svc, ST.dim);
  const sum = k => rows.reduce((t, a) => t + (typeof k === 'function' ? k(a) : a[k]), 0);
  const tabs = ST.dim === 'rm' ? '' : `<div class="seg">${['vendor', 'vm'].map(k => `<button class="${ST.dim === k ? 'on' : ''}" onclick="statsModal('${k}','${esc(ST.svc)}')">${k === 'vendor' ? 'Vendor wise' : 'VM wise'}</button>`).join('')}</div>`;
  const head = `<p class="muted" style="margin:0 0 12px">${esc(projTitle(p))} - ${esc(ST.svc)}. Counts come from the center list, RM/AM allocation and the Operator, Mock and TV Data Download calling sheets.</p>`;
  if (!rows.length) return head + tabs + '<div class="empty">No centers uploaded for this service yet.</div>';
  const tot = ['Total', ...cols.slice(1).map(([h, f]) => (['Pending %'].includes(h) ? pct(mx0(sum('man'), sum('rec')), sum('man')) : h === 'AMs' ? '' : sum(f)))];
  return head + tabs + `<div class="tw"><table class="stat"><thead><tr>${cols.map(([h], i) => `<th class="${i ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(a =>
    `<tr>${cols.map(([h, f], i) => `<td class="${i ? 'num' : ''}">${f(a)}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr>${tot.map((v, i) => `<td class="${i ? 'num' : ''}"><b>${v}</b></td>`).join('')}</tr></tfoot></table></div>`;
}

function statsModal(dim, svc) {
  const p = getP(S.pid); if (!p) return toast('Select a project first.', true);
  ST = { dim, svc: svc || curSvc(p) };
  openModal(STAT_TITLE[dim], statsHtml(), `<button class="btn ghost" onclick="statsExport()">Export to Excel</button><button class="btn" onclick="closeModal()">Close</button>`, true);
}

// Entry point used by the "Quick links" buttons: 'ops' = Operations sheets, 'vendor' = Vendor sheets
function quickLinks(kind, svc) { statsModal(kind === 'ops' ? 'rm' : 'vendor', svc); }

function statsExport() {
  const p = getP(S.pid), cols = statCols(ST.dim), rows = aggStats(p, ST.svc, ST.dim);
  const strip = v => String(v).replace(/<[^>]*>/g, '');
  const aoa = [cols.map(c => c[0]), ...rows.map(a => cols.map(([h, f, plain]) => plain ? plain(a) : strip(f(a))))];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), STAT_TITLE[ST.dim].slice(0, 31));
  XLSX.writeFile(wb, `${p.code}_${ST.svc}_${STAT_TITLE[ST.dim].replace(/ /g, '_')}.xlsx`);
}
