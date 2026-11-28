/* [08] PROJECTS - project list, create / edit form (CRM Project ID, day-wise shift timings), project page */
/* ---- [08.1] CRM Project ID ----
   The Project ID is taken from the mandatory Service Project Code: everything up to and including the date segment (DDMMYY);
   the service / vendor suffix after it is dropped.  UPESSC/ASST-PROF-STAFF/191126/BIOMETRIC/IIL  ->  UPESSC/ASST-PROF-STAFF/191126
   Every service of one exam must give the same Project ID, and two projects can never share one. */
const DDMMYY=t=>{ const m=/^(\d\d)(\d\d)(\d\d)$/.exec(t); if(!m) return false; const d=+m[1], mo=+m[2], y=2000+(+m[3]), x=new Date(Date.UTC(y,mo-1,d)); return x.getUTCDate()===d&&x.getUTCMonth()===mo-1; };
function crmIdOf(pc){
  const parts=String(pc||'').trim().toUpperCase().split('/').map(x=>x.trim());
  if(parts.some(x=>x.includes('|'))) return '';                     // '|' separates keys inside the app
  const i=parts.findIndex((x,j)=>j>0&&DDMMYY(x));                   // the first DDMMYY segment that has something before it
  return i>0&&parts.slice(0,i).every(Boolean)?parts.slice(0,i+1).join('/'):'';
}
const sameId=(a,b)=>String(a||'').trim().toUpperCase()===String(b||'').trim().toUpperCase();
/* pcodes: {service: Service Project Code}. Returns {id} or {err}. editCode: the project being edited (its ID never changes). */
function projectIdFor(pcodes,editCode){
  const ids={}; for(const [sv,c] of Object.entries(pcodes)){ const id=crmIdOf(c); if(!id) return {err:'Project Code for '+sv+' ('+c+') must contain the exam date as DDMMYY after the exam name, e.g. UPESSC/ASST-PROF-STAFF/191126/BIOMETRIC/IIL.'}; ids[sv]=id; }
  const uniq=[...new Set(Object.values(ids))];
  if(uniq.length>1) return {err:'All services of one exam must give the same Project ID: '+Object.entries(ids).map(([sv,id])=>sv+' gives '+id).join(', ')+'. Correct the Project Codes, or create a separate project.'};
  const id=uniq[0], others=db.projects.filter(q=>q.code!==editCode);
  const clash=others.find(q=>sameId(q.code,id)||Object.values(q.pcodes||{}).concat(q.pcode||[]).some(c=>sameId(crmIdOf(c),id)));
  if(clash) return {err:'Project ID '+id+' already exists ('+projTitle(clash)+'). Open that project and add this service there instead of creating a new one.'};
  if(editCode){
    if(crmIdOf(editCode)&&!sameId(editCode,id)) return {err:'This project\'s ID is '+editCode+'. Its Service Project Codes must start with '+editCode+'/ ... (now they give '+id+'). For another exam or date, create a new project.'};
    return {id:editCode};   // the ID of an existing project is never changed (older projects keep their earlier ID)
  }
  return {id};
}

const PSTATUS=['Upcoming','Active','Completed','Postponed','Cancelled'], LIVE_STATUS=['Active','Upcoming'];
/* An inactive person is taken out of Active and Upcoming projects (project manager and RM / AM of centers).
   Completed, Postponed and Cancelled projects keep their history untouched. */
function dropFromProject(p,ids){
  if(!LIVE_STATUS.includes(p.status)||!ids.length) return {pm:0,centers:0}; let pm=0, centers=0;
  if(Array.isArray(p.pm)&&p.pm.some(x=>ids.includes(x))){ p.pm=p.pm.filter(x=>!ids.includes(x)); pm++; }
  if(p.pmBy) Object.keys(p.pmBy).forEach(sv=>{ if((p.pmBy[sv]||[]).some(x=>ids.includes(x))){ p.pmBy[sv]=p.pmBy[sv].filter(x=>!ids.includes(x)); pm++; } });
  const as=((db.assign||{})[p.code])||{};
  Object.keys(as).forEach(c=>{ const a=as[c]; if(ids.includes(a.rm)){ a.rm=''; delete a.rmN; centers++; } if(ids.includes(a.am)||ids.includes(a.amId)){ a.am=''; a.amId=''; centers++; } });
  return {pm,centers};
}
function retireEmployee(id){
  const name=(db.employees.find(e=>e.id===id)||{}).name||id; let np=0, nc=0;
  db.projects.forEach(p=>{ const r=dropFromProject(p,[id]); if(r.pm||r.centers) np++; nc+=r.centers; });
  if(np||nc) toast(name+' was removed from '+np+' active / upcoming project(s) and '+nc+' center assignment(s). Completed, postponed and cancelled projects keep them as they were.');
}
const inactiveIds=()=>db.employees.filter(e=>e.status==='Inactive').map(e=>e.id);
function projectRows(list){
  if(!list.length) return `<div class="empty">No projects yet. Create your first project to get started.</div>`;
  return `<div class="tw"><table><thead><tr><th>Exam</th><th>Client</th><th>Date</th><th>Services</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
    list.map(p=>`<tr class="click" onclick="go('project','${esc(p.code)}')"><td data-label="Exam"><b>${esc(projTitle(p))}</b></td><td data-label="Client">${esc(p.client)}</td><td data-label="Date">${fmtDate(p.start||p.date)}${p.end?' – '+fmtDate(p.end):''}</td><td data-label="Services">${esc(p.services.join(', '))}</td><td data-label="Status"><span class="pill ${p.status}">${p.status}</span></td>
    <td data-label="Actions" onclick="event.stopPropagation()"><button class="btn ghost sm" onclick="go('project','${esc(p.code)}')">Open</button> ${canCreateProjects()?`<button class="btn ghost sm" onclick="delProject('${esc(p.code)}')">Delete</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}

function vProjects(){
  return `<div class="ph"><div><h2>Projects</h2><p class="lead">Select a project to manage centers, vendors and material.</p></div>
  ${canCreateProjects()?`<div class="row"><input type="file" id="pfile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn ghost" onclick="uploadProjects()">Bulk upload</button><button class="btn ghost" onclick="projTpl()">Template</button><button class="btn or" onclick="newProject()">➕ Create New Project</button></div>`:''}</div><div class="card">${projectRows(db.projects)}</div>`;
}

/* [08.2] Project Detail with PM Multi-select */
const MODES = ['Fingerprint Enrollment','Iris Enrollment','Face Matching','Biometric Verification','Ancillary Services'];
const STAT = ['Pending','Shared','Not required'];
const SL = {Biometric:'B', Frisking:'F', CSO:'C'};

const MODALITY=['FPS + FR','Iris + FR','Face Auth','Biometric Verification','Ancillary Services','Palm + FR'];
const devOf=m=>[...new Set((m||[]).map(x=>({'FPS + FR':'FPS','Iris + FR':'IRIS','Palm + FR':'Palm'})[x]).filter(Boolean))].join(', ');
const FIELDS = [
  {k:'client',l:'Client Name',t:'text',s:'BFCX',c:1},
  {k:'exam',l:'Exam Name',t:'text',s:'BFCX',c:1},
  {k:'spread',l:'Exam Spread',t:'sel',s:'BFCX',c:1,o:['PAN India','Region Specific']},
  {k:'candidates',l:'Candidate Count',t:'num',s:'BFCX',c:1},
  {k:'shifts',l:'Shift Count (max 8)',t:'sel',s:'BFCX',c:1,rf:1,o:['1','2','3','4','5','6','7','8']},
  {k:'dayWise',l:'Different shift timings on different days',t:'tick',s:'BFCX',c:1},
  {k:'dur',l:'Exam Duration (per shift)',t:'rng',s:'BFCX',c:1},
  {k:'jammer',l:'Jammer Installed',t:'sel',s:'BFCX',c:1,o:['No','Yes']},
  {k:'idcard',l:'ID Card Requirement',t:'text',s:'BFCX',c:1},
  {k:'modality',l:'Modality',t:'chk',s:'B',o:MODALITY},
  {k:'bioDev',l:'Bio Device (auto from modality)',t:'ro',s:'B'},
  {k:'bwin',l:'Biometric Window (per shift)',t:'rng',s:'B'},
  {k:'attLoc',l:'Biometric Location',t:'sel',s:'B',o:['At gate','Inside Class']},
  {k:'aadhaar',l:'Aadhaar / Non Aadhaar',t:'sel',s:'B',o:['Aadhaar','Non Aadhaar']},
  {k:'opRatio',l:'Allotment Ratio - Biometric (1 operator per X candidates)',t:'num',s:'B'},
  {k:'fwin',l:'Frisking Window (per shift)',t:'rng',s:'F'},
  {k:'frServices',l:'Frisking Service',t:'chk',s:'F',o:['HHMD','DFMD','Baggage','Female Enclosure']},
  {k:'frRatio',l:'Allotment Ratio - Frisking (1 guard per X candidates)',t:'num',s:'F'},
  {k:'bagRatio',l:'Baggage Allotment Ratio (1 baggage guard per X candidates)',t:'num',s:'F',when:d=>(d.frServices||[]).includes('Baggage')},
  {k:'csoNote',l:'CSO Tender Ratio',t:'ro',s:'C',val:'1 per center (fixed)'}
];

let draft = {};
let draftPMs = [];
let draftPM = {}, SVL = [];
let draftDates = [], draftPC = {};
function readPC(){ document.querySelectorAll('[data-pc]').forEach(el=>{ draftPC[el.dataset.pc]=el.value.trim(); }); }
function drawDates(){ const b=$('#f_dates'); if(!b) return;
  b.innerHTML=`<div class="dchips">${draftDates.map((d,i)=>`<span class="dchip">${esc(fmtDate(new Date(d)))}<button type="button" aria-label="Remove ${esc(d)}" onclick="rmDate(${i})">×</button></span>`).join('')||'<span class="muted">No dates added yet</span>'}</div><div class="row" style="margin-top:8px"><input id="f_dnew" type="date" style="width:auto"><button type="button" class="btn ghost sm" onclick="addDate()">Add date</button></div>`; }
function addDate(){ const v=$('#f_dnew').value; if(!v) return toast('Pick a date first.', true); if(draftDates.includes(v)) return toast('That date is already added.', true); if(draftDates.length>=15) return toast('At most 15 exam dates.', true); syncDayWise(); draftDates.push(v); draftDates.sort(); drawDates(); if(draft.dayWise) refreshFields(); }
function rmDate(i){ syncDayWise(); draftDates.splice(i,1); drawDates(); if(draft.dayWise) refreshFields(); }
function syncDayWise(){ if(draft.dayWise&&$('#cmn')) Object.assign(draft, readFields()); }   // keep typed timings before the date list changes

function shown(f, sv){
  if(!sv.length || (f.when && !f.when(draft))) return false;
  return sv.some(x => f.s.includes(SL[x]||'X'));
}

function fieldHTML(f, v){
  const id='f_'+f.k, x = v===undefined||v===0 ? '' : esc(v);
  if(f.t==='chk') return `<div class="chk">${f.o.map(o=>`<label><input type="checkbox" name="${id}" value="${o}" onchange="refreshFields()" ${(v||[]).includes(o)?'checked':''}>${o}</label>`).join('')}</div>`;
  if(f.t==='sel') return `<select id="${id}" ${f.rf?'onchange="refreshFields()"':''}>${f.o.map(o=>`<option ${String(v)===String(o)?'selected':''}>${o}</option>`).join('')}</select>`;
  if(f.t==='tick') return `<label class="chk" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="${id}" onchange="refreshFields()" ${v?'checked':''}> Yes, each exam date has its own shift timings</label>`;
  if(f.t==='rng'){ const n=Math.max(1,Math.min(8,+draft.shifts||1)), a=Array.isArray(v)?v:[];
    const one=(pre,x,i)=>`<div class="row" style="margin:3px 0"><b style="min-width:64px">Shift ${i+1}</b>From <input type="time" id="${pre}_${i}_a" value="${esc((x[i]||[])[0]||'')}" style="width:auto"> To <input type="time" id="${pre}_${i}_b" value="${esc((x[i]||[])[1]||'')}" style="width:auto"></div>`;
    if(!draft.dayWise) return Array.from({length:n},(_,i)=>one('f_'+f.k,a,i)).join('');   // shifts only: the same timings on every exam date
    if(!draftDates.length) return '<span class="muted">Add the exam dates first; each date then gets its own shift timings.</span>';
    const byD=draft[f.k+'D']||{};   // shifts x days, kept by date so a timing stays with its date when dates are added or removed
    return draftDates.map((d,di)=>`<div style="margin:4px 0 8px"><div class="muted" style="font-weight:600">${esc(fmtDate(new Date(d)))}</div>${Array.from({length:n},(_,i)=>one('f_'+f.k+'_d'+di,byD[d]||a,i)).join('')}</div>`).join(''); }
  if(f.t==='ro') return `<input readonly value="${esc(f.k==='bioDev'?devOf(draft.modality):f.val||'')}">`;
  if(f.t==='area') return `<textarea id="${id}" rows="3" placeholder="${esc(f.ph||'')}">${x}</textarea>`;
  return `<input id="${id}" type="${f.t==='num'?'number':f.t}"${f.t==='num'?' min="0"':''} value="${x}" placeholder="${esc(f.ph||'')}">`;
}

function readFields(){
  const o={};
  FIELDS.forEach(f=>{
    if(f.t==='chk'){ if(document.querySelector(`[name="f_${f.k}"]`)) o[f.k]=checked('f_'+f.k); }
    else if(f.t==='tick'){ if($('#f_'+f.k)) o[f.k]=$('#f_'+f.k).checked; }
    else if(f.t==='rng'){ const rd=pre=>{ const a=[]; for(let i=0;$('#'+pre+'_'+i+'_a');i++) a.push([$('#'+pre+'_'+i+'_a').value,$('#'+pre+'_'+i+'_b').value]); return a; };
      if($('#f_'+f.k+'_0_a')) o[f.k]=rd('f_'+f.k);
      else if($('#f_'+f.k+'_d0_0_a')){ const byD={...(draft[f.k+'D']||{})}; draftDates.forEach((d,di)=>{ if($('#f_'+f.k+'_d'+di+'_0_a')) byD[d]=rd('f_'+f.k+'_d'+di); }); o[f.k+'D']=byD; o[f.k]=byD[draftDates[0]]||[]; } }   // day-wise: the first date's timings also fill the per-shift field
    else if(f.t!=='ro' && $('#f_'+f.k)){ const v=$('#f_'+f.k).value.trim(); o[f.k]=f.t==='num' ? (+v||0) : v; }
  });
  return o;
}

function refreshFields(){
  Object.assign(draft, readFields()); readPC();
  const sv=checked('svc'); SVL=sv;
  const rowsOf=fs=>fs.map(f=>`<tr><td>${esc(f.l)}</td><td>${fieldHTML(f,draft[f.k])}</td></tr>`).join('');
  $('#cmn').innerHTML=`<table class="qa">${rowsOf(FIELDS.filter(f=>f.c))}</table>`;
  $('#dyn').innerHTML=sv.length?sv.map((x,i)=>`<h4 style="margin:16px 0 6px">${esc(x)} details</h4><table class="qa"><tr><td>Project Code *</td><td><input data-pc="${esc(x)}" value="${esc(draftPC[x]||'')}" placeholder="e.g. UPESSC/ASST-PROF-STAFF/191126/${esc(String(x).toUpperCase())}/IIL" oninput="showPid()" required><div class="muted pidhint" style="font-size:12px;margin-top:4px"></div></td></tr>${rowsOf(FIELDS.filter(f=>!f.c&&f.s.includes(SL[x]||'X')&&(!f.when||f.when(draft))))}<tr><td>Project Manager</td><td><div class="multi-select" id="pmx${i}"></div></td></tr></table>`).join(''):'<div class="empty">Select at least one service.</div>';
  sv.forEach((x,i)=>renderPM(i));
  showPid();
}
/* Live hint under each Service Project Code: the CRM Project ID it gives */
function showPid(){ readPC(); document.querySelectorAll('[data-pc]').forEach(el=>{ const h=el.parentElement.querySelector('.pidhint'); if(!h) return; const v=el.value.trim(), id=crmIdOf(v);
  h.textContent=!v?'':id?'CRM Project ID: '+id:'Must contain the exam date as DDMMYY, e.g. UPESSC/ASST-PROF-STAFF/191126/BIOMETRIC/IIL'; h.style.color=v&&!id?'var(--err)':''; }); }

/* [08.3] Multi-select PM dropdown */
function renderPMSelect(){
  const pms = db.employees.filter(e => e.role === 'Project Manager' && e.status === 'Active');
  const container = $('#pmSelect');
  if(!container) return;
  
  let html = `<div class="multi-select-display" onclick="$('#pmDropdown').classList.toggle('show')">`;
  if(draftPMs.length === 0) {
    html += '<span style="color:var(--muted)">Select Project Managers...</span>';
  } else {
    draftPMs.forEach(pmId => {
      const pm = pms.find(p => p.id === pmId);
      if(pm) html += `<span class="tag">${esc(pm.name)}</span>`;
    });
  }
  html += `</div><div id="pmDropdown" class="multi-select-options">`;
  
  pms.forEach(pm => {
    const checked = draftPMs.includes(pm.id) ? 'checked' : '';
    html += `<label class="multi-select-option"><input type="checkbox" value="${esc(pm.id)}" ${checked} onchange="togglePM('${esc(pm.id)}')"> ${esc(pm.name)}</label>`;
  });
  
  html += `</div>`;
  container.innerHTML = html;
}

function renderPM(i){
  const c=$('#pmx'+i); if(!c) return;
  const svc=SVL[i], pms=db.employees.filter(e=>e.role==='Project Manager'&&e.status==='Active'), sel=draftPM[svc]||[];
  c.innerHTML=`<div class="multi-select-display" onclick="this.nextElementSibling.classList.toggle('show')">${sel.length?sel.map(id=>{ const m=pms.find(x=>x.id===id); return m?`<span class="tag">${esc(m.name)}</span>`:''; }).join(''):'<span style="color:var(--muted)">Select Project Managers...</span>'}</div><div class="multi-select-options">${pms.map(m=>`<label class="multi-select-option"><input type="checkbox" ${sel.includes(m.id)?'checked':''} onchange="togglePM(${i},'${esc(m.id)}')"> ${esc(m.name)}</label>`).join('')||'<div style="padding:8px">Upload Project Managers in PM/RM/AM DB first.</div>'}</div>`;
}
function togglePM(i,id){
  const svc=SVL[i], a=draftPM[svc]||(draftPM[svc]=[]), j=a.indexOf(id); if(j>=0) a.splice(j,1); else a.push(id);
  renderPM(i); const c=$('#pmx'+i), o=c&&c.querySelector('.multi-select-options'); if(o) o.classList.add('show');
}

function newProject(editCode){
  const p=db.projects.find(x=>x.code===editCode)||{services:[]};
  draft={...p}; draftPM={...(p.pmBy||{})}; draftPC={...(p.pcodes||{})};
  if(!Object.keys(draftPC).length&&p.pcode&&(p.services||[])[0]) draftPC[p.services[0]]=p.pcode;
  if(!p.pmBy&&p.pm&&p.pm.length) p.services.forEach(x=>{ draftPM[x]=[...p.pm]; });
  const rows=[['Project Name',`<input id="f_pname" value="${esc(p.name||p.exam||p.code||'')}" placeholder="e.g. UPESSC Special Teacher Eligibility Test">`],['Exam Dates',`<div id="f_dates"></div>`]];
  const svcRow=`<tr><td>Select Services</td><td><div class="chk">${allSvcs(p).map(x=>`<label><input type="checkbox" name="svc" value="${esc(x)}" onchange="refreshFields()" ${p.services.includes(x)?'checked':''}>${esc(x)}</label>`).join('')}</div><div class="row" style="margin-top:8px"><input id="f_svcx" placeholder="Add a service manually" style="width:210px"><button class="btn ghost sm" type="button" onclick="addSvc()">Add</button></div></td></tr>`;
  openModal(p.code?'Edit project':'Create new project',
    `<table class="qa">${rows.map(([q,a])=>`<tr><td>${q}</td><td>${a}</td></tr>`).join('')}</table><div id="cmn"></div><table class="qa">${svcRow}</table><div id="dyn"></div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveProject('${esc(p.code||'')}')">${p.code?'Save changes':'Create project'}</button>`);
  draftDates=projDates(p); drawDates();
  refreshFields();
  setTimeout(()=>{ document.addEventListener('click',function cd(e){ if(!e.target.closest('.multi-select')){ document.querySelectorAll('.multi-select-options').forEach(d=>d.classList.remove('show')); document.removeEventListener('click',cd); } }); },150);
}

/* A project only keeps the fields of the services it has: Biometric-only projects carry no Frisking fields, etc. */
function pruneProject(rec){
  const sv=rec.services||[];
  FIELDS.forEach(f=>{ if(!sv.some(x=>f.s.includes(SL[x]||'X'))) delete rec[f.k]; });
  if(!(rec.frServices||[]).includes('Baggage')) delete rec.bagRatio;
  FIELDS.filter(f=>f.t==='rng').forEach(f=>{   // day-wise timings: only while the tick is on, only for the service's own fields and the project's dates
    const k=f.k+'D'; if(!rec.dayWise||!(k in rec)||!(f.k in rec)){ delete rec[k]; return; }
    const ds=rec.dates||[]; rec[k]=Object.fromEntries(Object.entries(rec[k]||{}).filter(([d])=>ds.includes(d))); });
  if(!rec.dayWise) delete rec.dayWise;
  rec.bioDev = sv.includes('Biometric') ? devOf(rec.modality) : '';
  return rec;
}

function saveProject(editCode){
  const pname=val('f_pname'), services=checked('svc');
  if(!pname) return toast('Project name is required.', true);
  if(!services.length) return toast('Select at least one service.', true);
  { const sd=val('f_start'), ed=val('f_end'); if(sd&&ed&&ed<sd) return toast('End date cannot be before the start date.', true); }
  
  Object.assign(draft, readFields());
  if(!draftDates.length) return toast('Add at least one exam date.', true);
  readPC(); const pcodes={};   // one Project Code per service, mandatory. Services of the same project may share a code (for example CSO and Biometric); another project may not reuse it
  const taken=new Set(db.projects.filter(q=>q.code!==editCode).flatMap(q=>[...Object.values(q.pcodes||{}),q.pcode]).filter(Boolean).map(x=>String(x).trim().toLowerCase()));
  for(const sv of services){ const c=(draftPC[sv]||'').trim(); if(!c) return toast('Enter the Project Code for '+sv+'.', true);
    if(taken.has(c.toLowerCase())) return toast('Project Code '+c+' is already used by another project.', true); pcodes[sv]=c; }
  const pid=projectIdFor(pcodes,editCode); if(pid.err) return toast(pid.err,true);
  const code=pid.id;
  const old = db.projects.find(p=>p.code===editCode) || {status:'Upcoming', created:new Date().toISOString().slice(0,10)};
  if(editCode){   // entered data stays on its own exam date when dates are added, removed or put in between
    const oldD=projDates(old), newD=[...draftDates].sort();
    if(JSON.stringify(oldD)!==JSON.stringify(newD)){
      const gone=oldD.map((d,i)=>newD.includes(d)?-1:i).filter(i=>i>=0), n=gone.length?dateDataCount(editCode,oldD,gone):0;
      if(n&&!confirm('Removing '+gone.map(i=>fmtDate(new Date(oldD[i]))).join(', ')+' also removes the candidate counts, manpower counts and operator rows entered for '+(gone.length>1?'those dates':'that date')+' ('+n+' entries). Continue?')) return;
      remapDates(editCode,oldD,newD);
    }
  }
  const rec = {...old, ...draft, code, name:pname, pcodes, pcode:'', dates:[...draftDates], start:draftDates[0]||'', end:draftDates[draftDates.length-1]||'', services, pm:[...new Set(services.flatMap(x=>draftPM[x]||[]))], pmBy:Object.fromEntries(services.map(x=>[x,draftPM[x]||[]]))};
  pruneProject(rec); dropFromProject(rec,inactiveIds());
  
  if(editCode) db.projects[db.projects.findIndex(p=>p.code===editCode)] = rec; 
  else db.projects.push(rec);
  
  save(); 
  closeModal(); 
  toast(editCode?'Project updated':'Project created'); 
  go('project', code);
}

function vProject(){
  const p = db.projects.find(x=>x.code===S.pid); 
  if(!p) return `<div class="empty">Project not found.</div>`;
  
  
  return `<button class="btn ghost sm" onclick="go('${rolePerm(ROLE).views.includes('projects')?'projects':'dashboard'}')">← ${rolePerm(ROLE).views.includes('projects')?'All projects':'Dashboard'}</button>
  <div class="ph">
    <div><h2>${esc(projTitle(p))}</h2><p class="lead" style="margin:0">${esc(p.client)} · ${projDates(p).map(d=>fmtDate(d)).join(', ')||fmtDate(p.start||p.date)}</p></div>
    ${canCreateProjects()?`<div class="row">
      <select onchange="setStatus('${esc(p.code)}',this.value)" style="width:auto">${PSTATUS.map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <button class="btn ghost" onclick="newProject('${esc(p.code)}')">Edit project</button>
    </div>`:`<span class="pill ${esc(p.status)}">${esc(p.status)}</span>`}
  </div>
  ${detailsPanel(p)}
  <div class="card"><h3>Project Managers</h3>${p.pm && p.pm.length ? `<div class="row">${p.pm.map(pmId => {
    const pm = db.employees.find(e => e.id === pmId);
    return pm ? `<span class="tag">${esc(pm.name)}</span>` : '';
  }).join('')}</div>` : '<span class="muted">No PMs assigned</span>'}</div>
  <div class="card"><h3>Centers</h3>${projectCenterRows(p)}</div>
  ${ROLE==='Vendor Manager'?vVendorProject(p):''}`;
}

function detRows(p){
  const has=v=>Array.isArray(v)?v.length:(v!==undefined&&v!==''&&v!==0);
  const sh=v=>(v||[]).map((r,i)=>`Shift ${i+1}: ${r[0]||'-'} to ${r[1]||'-'}`).join('\n');
  const fmt=(f,v)=>f.t==='tick'?'Yes':f.t==='rng'?(p.dayWise&&p[f.k+'D']?projDates(p).map(d=>fmtDate(new Date(d))+'\n'+sh(p[f.k+'D'][d])).join('\n'):sh(v)):Array.isArray(v)?v.join(', '):String(v);
  const rows=FIELDS.filter(f=>f.t!=='ro'&&has(p[f.k])).map(f=>[f.t==='rng'&&p.dayWise?f.l.replace('(per shift)','(per shift, day wise)'):f.l,fmt(f,p[f.k])]);
  const pms=Object.entries(p.pmBy||{}).filter(([,a])=>a.length).map(([x,a])=>['Project Manager - '+x,a.map(id=>(db.employees.find(e=>e.id===id)||{}).name||id).join(', ')]);
  const pcs=p.services.map(x=>['Project Code - '+x,pcodeOf(p,x)||'-']);
  return [['Project ID',p.code],['Exam',projTitle(p)],['Exam Dates',projDates(p).map(d=>fmtDate(d)).join(', ')||'-'],['Services',p.services.join(', ')],...pcs,...rows,...pms];
}
function detailsPanel(p){
  const c=esc(p.code);
  return `<details class="card" open><summary style="cursor:pointer;font-weight:600">Project details</summary><div class="row" style="margin:10px 0"><button class="btn ghost sm" onclick="copyDet('${c}','img')">Copy as Image</button><button class="btn ghost sm" onclick="copyDet('${c}','pdf')">Save as PDF</button><button class="btn ghost sm" onclick="copyDet('${c}','doc')">Download Doc</button></div><table class="qa">${detRows(p).map(([l,v])=>`<tr><td>${esc(l)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table></details>`;
}

function projectCenterRows(p){
  const list=lst(p), ns=+p.shifts||1, nd=projDays(p), head=['Center Code','Client Code','State','City','Center Name','Center Address'], dc=[];
  for(let d=0;d<nd;d++) for(let s=0;s<ns;s++) dc.push([d,s]);
  if(!list.length) return svcBar(p)+'<div class="empty">No centers uploaded yet. Upload the center list in Vendor Team > Guard/Op.</div>';
  return svcBar(p)+`<div class="tw"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}${dc.map(([d,s])=>`<th>${dayLbl(p,d)} S${s+1}</th>`).join('')}<th>Total</th></tr></thead><tbody>${list.slice(0,200).map(c=>`<tr>${[c.code,c.client,c.state,c.city,c.name,c.addr].map((v,i)=>`<td data-label="${head[i]}">${esc(v)}</td>`).join('')}${dc.map(([d,s])=>`<td>${candAt(c,d,s)}</td>`).join('')}<td>${calcCenter(p,c).total}</td></tr>`).join('')}</tbody></table></div>${list.length>200?`<p>Showing first 200 of ${list.length} centers. Use Guard/Op for the full list.</p>`:''}`;
}

function delProject(code){ 
  const p=getP(code); if(!confirm('Delete project '+(p?projTitle(p)+' ('+code+')':code)+' with its centers and all sheet rows?\n\nA Super Admin can bring it back from the Recycle bin.')) return; 
  db.projects=db.projects.filter(p=>p.code!==code); 
  delete db.sheets[code]; 
  save(); 
  toast('Project deleted'); 
  render(); 
}

function setStatus(code,s){ 
  const pr=db.projects.find(p=>p.code===code); pr.status=s; if(LIVE_STATUS.includes(s)) dropFromProject(pr,inactiveIds());   // a project that is live again carries no inactive people
  save(); 
  toast('Status updated'); 
}
