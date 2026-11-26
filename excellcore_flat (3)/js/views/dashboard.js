/* =====================================================================
   Dashboards (Admin, MIS, Operations, Vendor).
   Each view returns: header, KPI cards, then a two-column area.
   render() passes the result through withTiles(), which fills the
   <!--SIDE--> slot with workspaces and shortcuts the role may open.
   ===================================================================== */

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const firstName = () => String(($('#uname') || {}).textContent || '').trim().split(/[\s@]/)[0];

const dashHead = (sub, actions) =>
  `<div class="ph"><div><h2>${hello()}${firstName() ? ', ' + esc(firstName()) : ''}</h2><p class="lead">${esc(sub)}</p></div><div class="row">${actions || ''}</div></div>`;

const kpis = items =>
  `<div class="kpis">${items.map(([label, value, icon, tone]) =>
    `<div class="kpi ${tone || ''}"><span class="kic">${ico(IC[icon] || IC.dashboard, 20)}</span><div><b>${value}</b><span>${esc(label)}</span></div></div>`).join('')}</div>`;

// Centers live in db.sheets[project][service]; count each center code once per project.
const centerCount = p => new Set(Object.values(db.sheets[p.code] || {}).flatMap(list => (list || []).map(c => c.code))).size;

function statusMix() {
  const n = s => db.projects.filter(p => p.status === s).length, total = db.projects.length || 1;
  return `<div class="card"><h3>Projects by status</h3>${['Active', 'Upcoming', 'Completed', 'Postponed', 'Cancelled'].map(s =>
    `<div class="mix"><span>${s}</span><div class="bar ${s}"><i style="width:${Math.round(n(s) / total * 100)}%"></i></div><b>${n(s)}</b></div>`).join('')}</div>`;
}

function recentProjects() {
  const list = db.projects.slice(-5).reverse();
  const table = list.length
    ? `<div class="tw"><table><thead><tr><th>Project</th><th>Client</th><th>Dates</th><th>Status</th></tr></thead><tbody>${list.map(p =>
        `<tr class="click" onclick="go('project','${esc(p.code)}')"><td class="wrap" data-label="Project"><b>${esc(projTitle(p))}</b></td><td data-label="Client">${esc(p.client)}</td><td data-label="Dates">${fmtDate(p.start || p.date)}${p.end ? ' – ' + fmtDate(p.end) : ''}</td><td data-label="Status"><span class="pill ${p.status}">${p.status}</span></td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">No projects yet. Create your first project to get started.</div>';
  return `<div class="card"><div class="ch"><h3>Recent projects</h3><a class="lnk" onclick="go('projects')">View all</a></div>${table}</div>`;
}

function vDashboard() {
  const isVendor = ROLE === 'Vendor Manager', canCreate = canCreateProjects();
  const candidates = db.projects.reduce((a, p) => a + (+p.candidates || 0), 0);
  const centers = db.projects.reduce((a, p) => a + centerCount(p), 0);
  const active = db.projects.filter(p => p.status === 'Active').length;
  const cards = isVendor
    ? [['Projects', db.projects.length, 'projects'], ['Active projects', active, 'check', 'ok'], ['Vendors', db.vendors.length, 'vendors']]
    : [['Projects', db.projects.length, 'projects'], ['Active projects', active, 'check', 'ok'], ['Centers', centers.toLocaleString('en-IN'), 'pin'],
       ['Employees', db.employees.length, 'employees'], ['Vendors', db.vendors.length, 'vendors'], ['Candidates', candidates.toLocaleString('en-IN'), 'guard']];
  const actions = isVendor ? '' :
    `${canCreate ? '<button class="btn or" onclick="newProject()">+ New project</button>' : ''}<button class="btn ghost" onclick="assignModal()">Assign employee</button><button class="btn ghost" onclick="go('reports')">View reports</button>`;
  return dashHead('Overview of operations across all projects.', actions) + kpis(cards) +
    `<div class="dash"><div>${recentProjects()}</div><div>${statusMix()}<!--SIDE--></div></div>`;
}

function vMISDashboard() {
  const centers = db.projects.reduce((a, p) => a + centerCount(p), 0);
  const cards = [['Projects', db.projects.length, 'projects'], ['Active projects', db.projects.filter(p => p.status === 'Active').length, 'check', 'ok'],
                 ['Centers', centers.toLocaleString('en-IN'), 'pin'], ['Employees', db.employees.length, 'employees'], ['Vendors', db.vendors.length, 'vendors']];
  const actions = `<button class="btn or" onclick="newProject()">+ New project</button><button class="btn ghost" onclick="bulkModal('employees')">Upload employees</button>`;
  return dashHead('Create projects, upload center lists and manage project data.', actions) + kpis(cards) +
    `<div class="dash"><div>${recentProjects()}</div><div>${statusMix()}<!--SIDE--></div></div>`;
}

function vPMDashboard() {
  const R = db.projects.map(p => ({ p, ...pmStats(p) })), sum = k => R.reduce((a, x) => a + x[k], 0);
  const cards = [['Projects', R.length, 'projects'], ['Centers', sum('n'), 'pin'], ['Centers assigned', sum('as'), 'check', 'ok'],
                 ['Unassigned', sum('n') - sum('as'), 'shield', 'warn'], ['Operator slots', sum('slots'), 'users'], ['Calls confirmed', sum('conf'), 'ops']];
  const table = R.length
    ? `<div class="tw"><table><thead><tr><th>Project</th><th>Centers</th><th>Assignment</th><th>Operator slots</th><th>Confirmed</th><th></th></tr></thead><tbody>${R.map(x => {
        const pct = x.n ? Math.round(x.as / x.n * 100) : 0;
        return `<tr class="click" onclick="go('project','${esc(x.p.code)}')"><td data-label="Project"><b>${esc(x.p.name || x.p.code)}</b><br><small>${esc(x.p.code)}</small></td><td data-label="Centers">${x.n}</td><td data-label="Assignment"><div class="prog"><div class="bar Active"><i style="width:${pct}%"></i></div><span>${x.as}/${x.n}</span></div></td><td data-label="Operator slots">${x.slots}</td><td data-label="Confirmed">${x.conf}</td><td><button class="btn ghost sm">Open</button></td></tr>`;
      }).join('')}</tbody></table></div>`
    : '<div class="empty">No projects yet.</div>';
  return dashHead('Your projects, team and calling progress.', '') + kpis(cards) +
    `<div class="dash"><div><div class="card"><h3>Projects</h3>${table}</div></div><div><!--SIDE--></div></div>`;
}

function withTiles(h, items) {
  const keys = new Set(items.map(i => i[0]));
  const T = [['projects', 'Projects', 'Create, bulk upload and manage projects'], ['vteam', 'Vendor & Guard OP', 'Center lists, Guard List, OP List and vendor databases'],
             ['ops', 'Operations', 'Operator, Mock, TV Data Download and Exam day calling'], ['employees', 'Employees', 'Team members and assignments'],
             ['vendors', 'Vendors', 'Vendor directory'], ['reports', 'Reports', 'Progress and status reports']].filter(t => keys.has(t[0]));
  const L = [];
  if (keys.has('projects')) L.push(['New project / bulk upload', "go('projects')"], ['All projects', "go('projects')"]);
  if (keys.has('vteam')) L.push(['Guard/Op', "go('vteam')"]);
  if (keys.has('ops')) ['Operator Calling', 'Mock Calling', 'TV Data Download Calling', 'Exam day Calling', 'Device master'].filter(t => tabOk(t, svcNow())).forEach(t => L.push([t, `S.otab='${t}';go('ops')`]));
  if (keys.has('masters')) L.push(['Vendor DB', "S.mt='vdb';go('masters')"], ['ZM/VC DB', "S.mt='zvc';go('masters')"]);
  if (keys.has('reports')) L.push(['Reports', "go('reports')"]);
  const tiles = `<div class="card"><h3>Workspaces</h3><div class="tiles">${T.map(([k, t, d]) =>
    `<div class="tile" tabindex="0" role="link" onclick="go('${k}')" onkeydown="if(event.key==='Enter')go('${k}')"><span class="ic">${ico(IC[k] || IC.dashboard, 20)}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')}</div></div>`;
  const links = L.length ? `<div class="card"><h3>Shortcuts</h3><div class="ql">${L.map(([l, c]) => `<a onclick="${c}">${esc(l)}</a>`).join('')}</div></div>` : '';
  const side = tiles + links;
  return h.includes('<!--SIDE-->') ? h.replace('<!--SIDE-->', side) : h + side;
}
