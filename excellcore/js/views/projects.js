function projectRows(list){
  if(!list.length) return `<div class="empty">No projects yet. Create your first project to get started.</div>`;
  return `<div class="tw"><table><thead><tr><th>Project Code</th><th>Client</th><th>Exam</th><th>Date</th><th>Services</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
    list.map(p=>`<tr class="click" onclick="go('project','${esc(p.code)}')"><td data-label="Code"><b>${esc(p.code)}</b><br><small>${esc(p.name||'')}</small></td><td data-label="Client">${esc(p.client)}</td><td data-label="Exam">${esc(p.exam)}</td><td data-label="Date">${fmtDate(p.start||p.date)}${p.end?' – '+fmtDate(p.end):''}</td><td data-label="Services">${esc(p.services.join(', '))}</td><td data-label="Status"><span class="pill ${p.status}">${p.status}</span></td>
    <td data-label="Actions" onclick="event.stopPropagation()"><button class="btn ghost sm" onclick="go('project','${esc(p.code)}')">Open</button> ${canCreateProjects()?`<button class="btn ghost sm" onclick="delProject('${esc(p.code)}')">Delete</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}

function vProjects(){
  return `<div class="ph"><div><h2>Projects</h2><p class="lead">Select a project to manage centers, vendors and material.</p></div>
  ${canCreateProjects()?`<div class="row"><input type="file" id="pfile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn ghost" onclick="uploadProjects()">Bulk upload</button><button class="btn ghost" onclick="projTpl()">Template</button><button class="btn or" onclick="newProject()">➕ Create New Project</button></div>`:''}</div><div class="card">${projectRows(db.projects)}</div>`;
}

/* Project Detail with PM Multi-select */
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
  {k:'dur',l:'Exam Duration (per shift)',t:'rng',s:'BFCX',c:1},
  {k:'jammer',l:'Jammer Installed',t:'sel',s:'BFCX',c:1,o:['No','Yes']},
  {k:'idcard',l:'ID Card Requirement',t:'text',s:'BFCX',c:1},
  {k:'pcode',l:'Project Code (can be filled later)',t:'text',s:'BFCX',c:1},
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

function shown(f, sv){
  if(!sv.length || (f.when && !f.when(draft))) return false;
  return sv.some(x => f.s.includes(SL[x]||'X'));
}

function fieldHTML(f, v){
  const id='f_'+f.k, x = v===undefined||v===0 ? '' : esc(v);
  if(f.t==='chk') return `<div class="chk">${f.o.map(o=>`<label><input type="checkbox" name="${id}" value="${o}" onchange="refreshFields()" ${(v||[]).includes(o)?'checked':''}>${o}</label>`).join('')}</div>`;
  if(f.t==='sel') return `<select id="${id}" ${f.rf?'onchange="refreshFields()"':''}>${f.o.map(o=>`<option ${String(v)===String(o)?'selected':''}>${o}</option>`).join('')}</select>`;
  if(f.t==='rng'){ const n=Math.max(1,Math.min(8,+draft.shifts||1)), a=Array.isArray(v)?v:[];
    return Array.from({length:n},(_,i)=>`<div class="row" style="margin:3px 0"><b style="min-width:64px">Shift ${i+1}</b>From <input type="time" id="f_${f.k}_${i}_a" value="${esc((a[i]||[])[0]||'')}" style="width:auto"> To <input type="time" id="f_${f.k}_${i}_b" value="${esc((a[i]||[])[1]||'')}" style="width:auto"></div>`).join(''); }
  if(f.t==='ro') return `<input readonly value="${esc(f.k==='bioDev'?devOf(draft.modality):f.val||'')}">`;
  if(f.t==='area') return `<textarea id="${id}" rows="3" placeholder="${esc(f.ph||'')}">${x}</textarea>`;
  return `<input id="${id}" type="${f.t==='num'?'number':f.t}"${f.t==='num'?' min="0"':''} value="${x}" placeholder="${esc(f.ph||'')}">`;
}

function readFields(){
  const o={};
  FIELDS.forEach(f=>{
    if(f.t==='chk'){ if(document.querySelector(`[name="f_${f.k}"]`)) o[f.k]=checked('f_'+f.k); }
    else if(f.t==='rng'){ if($('#f_'+f.k+'_0_a')){ const a=[]; for(let i=0;$('#f_'+f.k+'_'+i+'_a');i++) a.push([$('#f_'+f.k+'_'+i+'_a').value,$('#f_'+f.k+'_'+i+'_b').value]); o[f.k]=a; } }
    else if(f.t!=='ro' && $('#f_'+f.k)){ const v=$('#f_'+f.k).value.trim(); o[f.k]=f.t==='num' ? (+v||0) : v; }
  });
  return o;
}

function refreshFields(){
  Object.assign(draft, readFields());
  const sv=checked('svc'); SVL=sv;
  const rowsOf=fs=>fs.map(f=>`<tr><td>${esc(f.l)}</td><td>${fieldHTML(f,draft[f.k])}</td></tr>`).join('');
  $('#cmn').innerHTML=`<table class="qa">${rowsOf(FIELDS.filter(f=>f.c))}</table>`;
  $('#dyn').innerHTML=sv.length?sv.map((x,i)=>`<h4 style="margin:16px 0 6px">${esc(x)} details</h4><table class="qa">${rowsOf(FIELDS.filter(f=>!f.c&&f.s.includes(SL[x]||'X')&&(!f.when||f.when(draft))))}<tr><td>Project Manager</td><td><div class="multi-select" id="pmx${i}"></div></td></tr></table>`).join(''):'<div class="empty">Select at least one service.</div>';
  sv.forEach((x,i)=>renderPM(i));
}

/* Multi-select PM dropdown */
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
  draft={...p}; draftPM={...(p.pmBy||{})};
  if(!p.pmBy&&p.pm&&p.pm.length) p.services.forEach(x=>{ draftPM[x]=[...p.pm]; });
  const rows=[['Project Name',`<input id="f_pname" value="${esc(p.name||p.exam||p.code||'')}" placeholder="e.g. UPESSC Special Teacher Eligibility Test">`],['Start Date',`<input id="f_start" type="date" value="${esc(p.start||p.date||'')}" onchange="$('#f_end').min=this.value">`],['End Date',`<input id="f_end" type="date" min="${esc(p.start||p.date||'')}" value="${esc(p.end||'')}">`]];
  const svcRow=`<tr><td>Select Services</td><td><div class="chk">${allSvcs(p).map(x=>`<label><input type="checkbox" name="svc" value="${esc(x)}" onchange="refreshFields()" ${p.services.includes(x)?'checked':''}>${esc(x)}</label>`).join('')}</div><div class="row" style="margin-top:8px"><input id="f_svcx" placeholder="Add a service manually" style="width:210px"><button class="btn ghost sm" type="button" onclick="addSvc()">Add</button></div></td></tr>`;
  openModal(p.code?'Edit project':'Create new project',
    `<table class="qa">${rows.map(([q,a])=>`<tr><td>${q}</td><td>${a}</td></tr>`).join('')}</table><div id="cmn"></div><table class="qa">${svcRow}</table><div id="dyn"></div>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveProject('${esc(p.code||'')}')">${p.code?'Save changes':'Create project'}</button>`);
  refreshFields();
  setTimeout(()=>{ document.addEventListener('click',function cd(e){ if(!e.target.closest('.multi-select')){ document.querySelectorAll('.multi-select-options').forEach(d=>d.classList.remove('show')); document.removeEventListener('click',cd); } }); },150);
}

/* A project only keeps the fields of the services it has: Biometric-only projects carry no Frisking fields, etc. */
function pruneProject(rec){
  const sv=rec.services||[];
  FIELDS.forEach(f=>{ if(!sv.some(x=>f.s.includes(SL[x]||'X'))) delete rec[f.k]; });
  if(!(rec.frServices||[]).includes('Baggage')) delete rec.bagRatio;
  rec.bioDev = sv.includes('Biometric') ? devOf(rec.modality) : '';
  return rec;
}

function saveProject(editCode){
  const pname=val('f_pname'), services=checked('svc');
  if(!pname) return toast('Project name is required.', true);
  if(!services.length) return toast('Select at least one service.', true);
  { const sd=val('f_start'), ed=val('f_end'); if(sd&&ed&&ed<sd) return toast('End date cannot be before the start date.', true); }
  
  let code = editCode||'';
  if(!code){
    const base = pname.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g,'') || 'PRJ';
    let n = db.projects.length+1; 
    do{ code = `${base}-${String(n++).padStart(3,'0')}`; }while(db.projects.some(p=>p.code===code));
  }
  
  if(!editCode && db.projects.some(p=>p.code===code)) return toast('This project code already exists.', true);
  
  Object.assign(draft, readFields());
  const old = db.projects.find(p=>p.code===editCode) || {status:'Upcoming', created:new Date().toISOString().slice(0,10)};
  const rec = {...old, ...draft, code, name:pname, start:val('f_start'), end:val('f_end'), services, pm:[...new Set(services.flatMap(x=>draftPM[x]||[]))], pmBy:Object.fromEntries(services.map(x=>[x,draftPM[x]||[]]))};
  pruneProject(rec);
  
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
  
  if(isScoped()) return vPMProject(p);
  if(ROLE==='Vendor Manager') return vVendorProject(p);
  
  return `<button class="btn ghost sm" onclick="go('projects')">← All projects</button>
  <div class="ph">
    <div><h2>${esc(p.name||p.code)}</h2><p class="lead" style="margin:0">${esc(p.code)} · ${esc(p.client)} · ${fmtDate(p.start||p.date)}${p.end?' – '+fmtDate(p.end):''}</p></div>
    <div class="row">
      <select onchange="setStatus('${esc(p.code)}',this.value)" style="width:auto">${['Upcoming','Active','Completed'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <button class="btn ghost" onclick="newProject('${esc(p.code)}')">Edit project</button>
    </div>
  </div>
  ${detailsPanel(p)}
  <div class="card"><h3>Project Managers</h3>${p.pm && p.pm.length ? `<div class="row">${p.pm.map(pmId => {
    const pm = db.employees.find(e => e.id === pmId);
    return pm ? `<span class="tag">${esc(pm.name)}</span>` : '';
  }).join('')}</div>` : '<span class="muted">No PMs assigned</span>'}</div>
  <div class="card"><h3>Centers</h3>${projectCenterRows(p)}</div>`;
}

function detRows(p){
  const has=v=>Array.isArray(v)?v.length:(v!==undefined&&v!==''&&v!==0);
  const fmt=(f,v)=>f.t==='rng'?v.map((r,i)=>`Shift ${i+1}: ${r[0]||'-'} to ${r[1]||'-'}`).join('\n'):Array.isArray(v)?v.join(', '):String(v);
  const rows=FIELDS.filter(f=>f.t!=='ro'&&has(p[f.k])).map(f=>[f.l,fmt(f,p[f.k])]);
  const pms=Object.entries(p.pmBy||{}).filter(([,a])=>a.length).map(([x,a])=>['Project Manager - '+x,a.map(id=>(db.employees.find(e=>e.id===id)||{}).name||id).join(', ')]);
  return [['Project',p.name||p.code],['Project ID',p.code],['Start Date',fmtDate(p.start||p.date)],['End Date',p.end?fmtDate(p.end):'-'],['Services',p.services.join(', ')],...rows,...pms];
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
  if(!confirm('Delete project '+code+'?')) return; 
  db.projects=db.projects.filter(p=>p.code!==code); 
  delete db.sheets[code]; 
  save(); 
  toast('Project deleted'); 
  render(); 
}

function setStatus(code,s){ 
  db.projects.find(p=>p.code===code).status=s; 
  save(); 
  toast('Status updated'); 
}
