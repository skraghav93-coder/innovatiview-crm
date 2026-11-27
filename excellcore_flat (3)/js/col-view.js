/* =====================================================================
   [22] COLUMN VIEW - which columns a person sees on each sheet
   22.1  Sheet names used by column choices and special-login permissions
   22.2  Special logins: what a special login may view / edit (sheet + column)
   22.3  Column chooser: every person hides the columns not relevant to them (kept in this browser, per login)
   ===================================================================== */

/* ---- [22.1] Sheet names ---- */
const SHEETS = ['Bio Center List', 'Frisking Center List', 'CSO Center List', 'Guard List', 'OP List', 'Operator Calling', 'Mock Calling', 'TV Data Download Calling', 'Exam day Calling'];
const VIEW_ONLY_SHEETS = ['Bio Center List', 'Frisking Center List', 'CSO Center List'];   // center lists: special logins can view, never edit
const SHEET_OF_TABLE = { operator_calling: 'Operator Calling', mock_calling: 'Mock Calling', tv_data_download_calling: 'TV Data Download Calling', exam_day_calling: 'Exam day Calling', guard_list: 'Guard List', op_list: 'OP List' };
const centerListName = svc => ({ Biometric: 'Bio Center List', Frisking: 'Frisking Center List', CSO: 'CSO Center List' })[svc] || (svc + ' Center List');
/* A column label that carries an exam date ("19 Nov 2026") is stored as "Day 1", so a choice holds for every project */
function colKey(p, label) {
  let t = String(label); if (!p) return t;
  projDates(p).forEach((d, i) => { const l = dayLbl(p, i); if (l && t.includes(l)) t = t.split(l).join('Day ' + (i + 1)); });
  return t;
}

/* ---- [22.2] Special logins ----
   SPECIAL = { title, perms: [{ sheets: ['*'] or [sheet names], cols: ['*'] or [column labels], mode: 'view' | 'edit' }] }
   Rows add up. Edit includes view. Center lists are view only. */
let SPECIAL = null;
const isSpecial = () => ROLE === 'Special';
function spMode(sheet, label) {
  if (!SPECIAL) return '';
  let m = '';
  for (const r of SPECIAL.perms || []) {
    const sh = r.sheets || [], cs = r.cols || [];
    if (!(sh.includes('*') || sh.includes(sheet))) continue;
    if (label !== null && !(cs.includes('*') || cs.includes(label))) continue;
    if (r.mode === 'edit' && !VIEW_ONLY_SHEETS.includes(sheet)) return 'edit';
    m = 'view';
  }
  return m;
}
const spSheet = sheet => !isSpecial() || !!spMode(sheet, null);           // may open the sheet
const spView  = (sheet, label) => !isSpecial() || !!spMode(sheet, label);  // may see the column
const spEdit  = (sheet, label) => isSpecial() && spMode(sheet, label) === 'edit';
const spSheetEdit = sheet => isSpecial() && (SPECIAL.perms || []).some(r => r.mode === 'edit' && !VIEW_ONLY_SHEETS.includes(sheet) && ((r.sheets || []).includes('*') || (r.sheets || []).includes(sheet)));
/* Builds the Special role (screens and tables) from the login's permissions; called at sign-in before the data loads */
function setSpecial(row) {
  SPECIAL = { title: row.title || 'Special login', perms: Array.isArray(row.perms) ? row.perms : [] };
  const views = ['dashboard', 'projects', 'project'];
  if (VIEW_ONLY_SHEETS.some(spSheet)) views.push('vteam');
  if (spSheet('Guard List')) views.push('glist');
  if (spSheet('OP List')) views.push('olist');
  if (['Operator Calling', 'Mock Calling', 'TV Data Download Calling', 'Exam day Calling'].some(spSheet)) views.push('ops');
  const w = Object.keys(SHEET_OF_TABLE).filter(t => spSheetEdit(SHEET_OF_TABLE[t]));
  ROLE_DEFS['Special'] = { views, w: [...w, 'app_blobs'] };
  ROLE_LABEL['Special'] = SPECIAL.title;
}

/* ---- [22.3] Column chooser ---- */
const CV_STORE = () => 'xc_cols|' + String(($('#uname') || {}).textContent || '').trim().toLowerCase();
let CVH = null;   // sheet -> [hidden column labels]
const cvLoad = () => { if (!CVH) { try { CVH = JSON.parse(localStorage.getItem(CV_STORE())) || {}; } catch (e) { CVH = {}; } } return CVH; };
const colShown = (sheet, key) => !(cvLoad()[sheet] || []).includes(key) && spView(sheet, key);
let CV_CUR = { sheet: '', labels: [] };   // the sheet on screen and its column labels, for the chooser
/* Indices of the columns to draw. Indices always refer to the full column list, so filters keep working when columns are hidden. */
function visIdx(sheet, cols, p) {
  const keys = cols.map(k => colKey(p, k[0]));
  CV_CUR = { sheet, labels: [...new Set(keys.filter(k => spView(sheet, k)))] };
  const out = []; keys.forEach((k, j) => { if (colShown(sheet, k)) out.push(j); });
  return out;
}
const colsBtn = () => `<button class="btn ghost" onclick="colsOpen()" title="Choose the columns to show">Columns${(cvLoad()[CV_CUR.sheet] || []).length ? ' (' + (cvLoad()[CV_CUR.sheet] || []).length + ' hidden)' : ''}</button>`;
function colsOpen() {
  const { sheet, labels } = CV_CUR; if (!sheet) return;
  const hid = new Set(cvLoad()[sheet] || []);
  openModal('Columns - ' + sheet,
    `<p class="lead" style="margin-top:0">Tick the columns you want to see on <b>${esc(sheet)}</b>. The rest are hidden for you only (in this browser); nothing is deleted. Export to Excel follows this choice.</p>
     <div class="row" style="margin-bottom:8px"><input type="search" id="cv_q" placeholder="Search columns" oninput="cvFilter(this.value)" style="width:220px"><button class="btn ghost sm" onclick="cvAll(true)">Show all</button><button class="btn ghost sm" onclick="cvAll(false)">Hide all</button></div>
     <div class="colpick" id="cv_list">${labels.map(l => `<label><input type="checkbox" value="${esc(l)}" ${hid.has(l) ? '' : 'checked'}><span>${esc(l)}</span></label>`).join('')}</div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="cvSave()">Apply</button>`, true);
}
function cvFilter(q) { q = String(q || '').toLowerCase(); document.querySelectorAll('#cv_list label').forEach(l => { l.style.display = !q || l.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }
function cvAll(on) { document.querySelectorAll('#cv_list label').forEach(l => { if (l.style.display !== 'none') l.querySelector('input').checked = on; }); }
function cvSave() {
  const hid = [...document.querySelectorAll('#cv_list input')].filter(i => !i.checked).map(i => i.value);
  if (hid.length === CV_CUR.labels.length) return toast('Keep at least one column.', true);
  cvLoad()[CV_CUR.sheet] = hid; try { localStorage.setItem(CV_STORE(), JSON.stringify(CVH)); } catch (e) { }
  closeModal(); render();
}
/* Frozen columns follow the visible order: the first N columns on screen */
const fzv = pos => pos < FREEZE ? 'fz fz' + pos : '';
