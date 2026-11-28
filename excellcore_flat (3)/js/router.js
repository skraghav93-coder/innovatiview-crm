/* [06] ROUTER - navigation and render()
   06.1  Navigation entries */
const NAV = [
  ['dashboard',' Dashboard'],
  ['projects',' Projects'],
  ['employees',' Employees'],
  ['vendors',' Vendors'],
  ['masters','🗂 Master Data'],
  ['vteam','🏢 Vendor Team'],
  ['glist','Guard List'],
  ['olist','OP List'],
  ['ops','📞 Operations'],
  ['reports',' Reports'],
  ['special','Special logins'],
  ['trash','Recycle bin'],
  ['settings','️ Settings']
];

let S = {view:'dashboard', pid:null, svc:null, sec:'data'};
let ROLE = '';   // set at sign-in from profiles.role (see roles.js)

function go(view, pid, tab){ 
  if(!rolePerm(ROLE).views.includes(view)) return toast('Not allowed for your role.', true);
  if(view!=='project' || S.view!=='project' || S.pid!==pid){ 
    S.sec='data'; S.pm='overview'; 
  } 
  BF={}; BQ=''; BP=0; GF={}; GP=0; S.view=view; S.pid=pid||S.pid||null; if(tab) S.svc=tab; 
  $('#side').classList.remove('open'); 
  render(); 
  window.scrollTo(0,0); 
}

function render(){
  const cp=document.getElementById('cpop'); if(cp) cp.remove();   // the call popup belongs to the screen it was opened on
  const navItems = NAV.filter(n => rolePerm(ROLE).views.includes(n[0]));
  
  navHtml(navItems);
  
  const v = {
    dashboard:()=>isScoped()?vPMDashboard():ROLE==='Admin'?vMISDashboard():vDashboard(), 
    projects:vProjects, 
    project:vProject, 
    employees:vEmployees, 
    vendors:vVendors, 
    masters:vMasters, 
    vteam:vVTeam, 
    glist:vGlist, 
    olist:vOlist, 
    ops:vOps, 
    reports:vReports, 
    special:vSpecial,
    trash:vTrash,
    settings:vSettings
  }[S.view];
  
  $('#view').innerHTML = v ? (S.view==='dashboard'?withTiles(v(),navItems):v()) : '<div class="empty">View not found</div>';
  enhanceTables($('#view'));   // a filter on every table that has none of its own
}
