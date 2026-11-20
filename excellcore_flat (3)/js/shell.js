/* =====================================================================
   App shell: icons, sidebar navigation, global search, Google sign-in.
   ===================================================================== */
const OK_DOMAINS=['innovatiview.in','innovatiview.com'];
const ico=(p,s=22)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',projects:'<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',ops:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',employees:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',masters:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',vteam:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',vendors:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',dashboard:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'};
Object.assign(IC,{
  pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  guard:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  oplist:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  download:'<path d="M12 4v10M8 10l4 4 4-4M5 20h14"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  device:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>'
});
// sidebar label -> icon
const NAV_ICON={'Dashboard':'dashboard','Projects':'projects','Bio Center List':'pin','Frisking Center List':'shield','Guard List':'guard','OP List':'oplist','Vendor DB':'masters','ZM/VC DB':'globe','PM/RM/AM DB':'employees','Operator Calling':'ops','Mock Calling':'chat','TV Data Download Calling':'download','Exam day Calling':'calendar','Device master':'device','Employees':'employees','Vendors':'vendors','Reports':'reports','Settings':'settings'};
const navLbl=l=>l.replace(/^[^A-Za-z]+/,'');
function navHtml(items){
  const has=new Set(items.map(i=>i[0])), lbl=new Map(items.map(([k,l])=>[k,navLbl(l)])), OPS=['Operator Calling','Mock Calling','TV Data Download Calling','Exam day Calling','Device master'];
  const G=[['Main',[['dashboard','Dashboard',"go('dashboard')",()=>S.view==='dashboard'],['projects','Projects',"go('projects')",()=>S.view==='projects'||S.view==='project']]],
   ['Vendor & Guard OP',[['vteam','Bio Center List',"S.svc='Biometric';go('vteam')",()=>S.view==='vteam'&&(S.svc||'Biometric')==='Biometric'],['vteam','Frisking Center List',"S.svc='Frisking';go('vteam')",()=>S.view==='vteam'&&S.svc==='Frisking'],['glist','Guard List',"go('glist')",()=>S.view==='glist'],['olist','OP List',"go('olist')",()=>S.view==='olist'],['masters','Vendor DB',"S.mt='vdb';go('masters')",()=>S.view==='masters'&&S.mt!=='zvc'&&S.mt!=='ppl'],['masters','ZM/VC DB',"S.mt='zvc';go('masters')",()=>S.view==='masters'&&S.mt==='zvc'],['masters','PM/RM/AM DB',"S.mt='ppl';go('masters')",()=>S.view==='masters'&&S.mt==='ppl']]],
   ['Operations',OPS.map(t=>['ops',t,`S.otab='${t}';go('ops')`,()=>S.view==='ops'&&(S.otab||OPS[0])===t])],
   ['Others',['employees','vendors','reports','settings'].map(k=>[k,lbl.get(k)||k,`go('${k}')`,()=>S.view===k])]];
  S.go=S.go||{};
  $('#gx').innerHTML='<option value="">Select exam</option>'+db.projects.map(p=>`<option value="${esc(p.code)}" ${p.code===S.pid?'selected':''}>${esc(p.exam||p.name)}</option>`).join('');
  $('#nav').innerHTML=G.map(([g,en])=>{ const e=en.filter(x=>has.has(x[0])); if(!e.length) return ''; const open=S.go[g]!==false||e.some(x=>x[3]());
    return `<div class="grp ${open?'open':''}" onclick="S.go['${g}']=${open?'false':'true'};render()">${esc(g)}</div><div class="sub">${e.map(x=>`<a class="${x[3]()?'on':''}" ${x[3]()?'aria-current="page"':''} onclick="${x[2]}">${ico(IC[NAV_ICON[x[1]]]||IC.dashboard,18)}<span>${esc(x[1])}</span></a>`).join('')}</div>`; }).join('');
}

function gsearch(q){
  q=String(q||'').trim().toLowerCase(); if(!q) return;
  const p=db.projects.find(x=>[x.code,x.name,x.client].join(' ').toLowerCase().includes(q)); if(p) return go('project',p.code);
  for(const pr of db.projects){ for(const sv of pr.services){ if(((db.sheets[pr.code]||{})[sv]||[]).some(c=>String(c.code).toLowerCase()===q)){ S.svc=sv; go('vteam',pr.code); BF[0]=q; render(); return; } } }
  toast('No project or center found for "'+q+'".',true);
}
function enter(role,name){
  ROLE=role; loadVC(); S.pm='overview'; $('#uname').textContent=name; $('#urole').textContent=ROLE_LABEL[role]||role; $('#uav').textContent=(name||'?')[0].toUpperCase();
  $('#login').style.display='none'; $('#app').style.display='block'; go('dashboard');
}
async function signInGoogle(){
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error) toast('Could not start Google sign-in: '+error.message,true);
}
async function logout(){
  try{ await SBX.flush(); }catch(e){}
  await sb.auth.signOut(); location.reload();
}
function showLogin(){ $('#app').style.display='none'; $('#login').style.display='grid'; }
async function startSession(session){
  const email=String(session.user.email||'').toLowerCase();
  if(!OK_DOMAINS.includes(email.split('@')[1]||'')){ await sb.auth.signOut(); showLogin(); return toast('Only Innovatiview accounts (innovatiview.in or innovatiview.com) can sign in.',true); }
  const {data:prof,error}=await sb.from('profiles').select('name,role,active,employee_id,email').eq('id',session.user.id).maybeSingle();
  if(error||!prof||!prof.active){ await sb.auth.signOut(); showLogin(); return toast(error?('Could not read your profile: '+error.message):'Your account is not active. Ask an Admin to enable it.',true); }
  if(!ROLES.includes(prof.role)){ await sb.auth.signOut(); showLogin(); return toast('Your role ('+prof.role+') is not recognised. Ask a Super Admin to set it (run supabase/004_roles.sql).',true); }
  await SBX.loadAll(prof.role);
  MY_ID=String(prof.employee_id||(db.employees.find(e=>String(e.email||'').toLowerCase()===email)||{}).id||'');
  if(prof.role==='Super Admin'&&!db.projects.length&&!localStorage.getItem(KEY+'_imported')){
    const o=SBX.legacy();
    if(o&&((o.projects||[]).length||(o.employees||[]).length)){
      const ok=confirm('This browser has older ExcellCore data ('+(o.projects||[]).length+' projects, '+(o.employees||[]).length+' employees). Import it into Supabase?');
      if(ok) SBX.adopt(o);
    }
    try{ localStorage.setItem(KEY+'_imported','1'); }catch(e){}
  }
  enter(prof.role,prof.name||email);
}
async function initAuth(){
  const q=new URLSearchParams(location.search+'&'+location.hash.slice(1)), em=q.get('error_description');
  if(em){ toast(/database error/i.test(em)?'Only Innovatiview accounts (innovatiview.in or innovatiview.com) can sign in.':em,true); history.replaceState(null,'',location.pathname); }
  const {data:{session}}=await sb.auth.getSession();
  if(session) await startSession(session); else showLogin();
}

