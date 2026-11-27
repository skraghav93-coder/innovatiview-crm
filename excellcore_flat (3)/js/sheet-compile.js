/* [19] SHEET COMPILE - calculated columns of every sheet written to the database */
/* ===== [19.1] Every column of every sheet is saved in the database =====
   Typed-in columns (and the values fetched from SeQRView, which are written into the row) are saved by the normal sync.
   Columns that are fetched or calculated from other sheets (Client Code, Center Name, RM, Vendor, Total Opr, counts ...)
   are compiled here from the sheet itself and written into the same table row, for every row of the sheet. */
let CUR_SHEET = null, CMP_T = null, CMP_BUSY = false, CMP_ERR = '', CMP_ERR_AT = 0;

const sheetApplies = (p, sv, sheet) => p.services.includes(sv) && (sheet === 'Guard List' ? sv === 'Frisking' : sheet === 'OP List' ? sv === 'Biometric' : tabOk(sheet, sv));

/* Builds a sheet exactly as the screen does (same columns, no filters) and hands it to fn while the screen's own context is in place,
   because many columns read it (the open project, the sheet name, the Operator Calling rows ...). Everything is put back afterwards. */
function withSheet(p, sv, sheet, fn) {
  const keep = { svc: S.svc, otab: S.otab, gs: S.gs, cp: curP, gf: GF, gg: GG, ctx: CTX };
  try {
    GF = {}; GG = {};
    if (sheet === 'Guard List' || sheet === 'OP List') {
      S.gs = sheet; curP = { ...p, days: projDays(p) };
      const rows = groupRows(p, sv), cols = grpCols(sheet === 'Guard List' ? 'guard' : 'op');
      rows.forEach(r => { r.$amid = r.amId2; });
      return fn(cols, rows);
    }
    S.svc = sv; S.otab = sheet;
    const cm = cmapOf(p), cols = opCols(p, cm);
    return fn(cols, opScan(p, cols, cm, 0, 1e9).page);
  } finally { S.svc = keep.svc; S.otab = keep.otab; S.gs = keep.gs; curP = keep.cp; GF = keep.gf; GG = keep.gg; CTX = keep.ctx; }
}

/* One payload row per sheet row: the key, every calculated column (empty ones as null) and extra_calc for columns that depend on the dates. */
function compileSheet(p, sv, sheet) {
  const def = SHEET_TABLES[sheet], pcode = pcodeOf(p, sv) || p.code;
  return withSheet(p, sv, sheet, (cols, rows) => {
    const seen = {}, out = [];
    const plan = cols.map(k => {
      if (k[1] && k[1][0] !== '@' && k[1][0] !== '$') return null;   // typed-in column: saved by the normal sync
      const n = seen[k[0]] = (seen[k[0]] || 0) + 1;
      return { k, col: n === 1 ? def.calcMap[k[0]] : null, label: n === 1 ? k[0] : k[0] + ' #' + n };
    }).filter(Boolean);
    rows.forEach(r => {
      const kc = sheetKeyCols[def.kind](p, r.k); if (!kc) return;
      const row = { project_code: pcode, project_id: p.code, service: sv, ...kc }, ex = {};
      def.calc.forEach(x => { row[x[1]] = null; });
      plan.forEach(x => {
        let v = opVal(x.k, r); v = (v === undefined || v === null) ? '' : String(v);
        if (x.col) row[x.col] = v === '' ? null : v; else if (v !== '') ex[x.label] = v;
      });
      row.extra_calc = ex; out.push(row);
    });
    return { def, rows: out };
  });
}

/* Writes only the rows whose calculated columns differ from what the database holds. */
async function writeCalculated(p, sv, sheet) {
  const { def, rows } = compileSheet(p, sv, sheet); if (!canWriteT(def.table)) return 0;
  const snap = (DSNAP[def.table] = DSNAP[def.table] || new Map()), todo = [];
  rows.forEach(r => { const j = calcJson(def, r), k = dKey(def, r); if (snap.get(k) !== j) todo.push([k, r, j]); });
  for (let i = 0; i < todo.length; i += 400) {
    const ch = todo.slice(i, i + 400), { error } = await sb.from(def.table).upsert(ch.map(x => x[1]), { onConflict: def.pk.join(',') });
    if (error) throw error; ch.forEach(x => snap.set(x[0], x[2]));
  }
  return todo.length;
}

function scheduleCompile(delay) { clearTimeout(CMP_T); CMP_T = setTimeout(runCompile, delay || 2500); }
async function runCompile() {
  if (!CUR_SHEET) return; if (CMP_BUSY) return scheduleCompile(3000);
  CMP_BUSY = true;
  try { const c = CUR_SHEET; await writeCalculated(c.p, c.sv, c.sheet); }
  catch (e) { const m = String((e && e.message) || e), now = Date.now(); console.warn('Calculated columns not saved: ' + m); if (m !== CMP_ERR || now - CMP_ERR_AT > 30000) { CMP_ERR = m; CMP_ERR_AT = now; toast('Calculated columns not saved: ' + m, true); } }
  finally { CMP_BUSY = false; }
}

/* Button: compile every sheet of the open project (all services). */
async function compileProject() {
  const p = getP(S.pid); if (!p) return toast('Select a project first.', true);
  toast('Saving all columns of all sheets to the database...'); let n = 0;
  try { for (const sv of p.services) for (const sheet of Object.keys(SHEET_TABLES)) if (sheetApplies(p, sv, sheet)) n += await writeCalculated(p, sv, sheet); toast('All sheet columns are saved in the database (' + n + ' rows updated).'); }
  catch (e) { toast('Not saved: ' + ((e && e.message) || e), true); }
}
