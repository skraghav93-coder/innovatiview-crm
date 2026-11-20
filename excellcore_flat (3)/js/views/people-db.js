/* ===== Services (manual), PM/RM/AM DB, project bulk upload ===== */
const BASE_SVC=['Biometric','Frisking','CSO'];
const allSvcs=p=>[...BASE_SVC,...new Set([...(p?p.services:[]),...(db.projects||[]).flatMap(x=>x.services)].filter(x=>!BASE_SVC.includes(x)))];
function addSvc(){
  const v=T($('#f_svcx').value).replace(/\s+/g,' '); if(!v) return;
  const box=document.querySelector('[name="svc"]').closest('.chk');
  if([...box.querySelectorAll('[name="svc"]')].some(i=>i.value.toLowerCase()===v.toLowerCase())) return toast('That service is already listed.',true);
  box.insertAdjacentHTML('beforeend',`<label><input type="checkbox" name="svc" value="${esc(v)}" onchange="refreshFields()" checked>${esc(v)}</label>`);
  $('#f_svcx').value=''; refreshFields();
}
const PEOPLE=[['Project Managers','Project Manager'],['Regional Managers','Regional Manager'],['Area Managers','Area Manager'],['Sr AMs','Sr AM']];
const AMROLES=['Area Manager'];   // only Area Managers use the Aadhaar based template; Sr AM uses the same template as PM / RM
const toDate=v=>typeof v==='number'?new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10):T(v);
function addAM(role,r){   // Emp ID = first 3 letters of the name + last 4 digits of Aadhaar (only the last 4 digits are kept)
  const name=T(r.name), ad=String(r.aadhar||'').replace(/\D/g,'');
  if(!name||ad.length<4) return 'bad';
  const id=name.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase().padEnd(3,'X')+ad.slice(-4), e=db.employees.find(x=>x.id===id);
  if(e&&String(e.name).toLowerCase()!==name.toLowerCase()) return 'dup';
  const rec={id,name,role,doj:toDate(r.doj),contact:T(r.mobile),mobile:T(r.mobile),email:T(r.email),aadharMask:'XXXXXXXX'+ad.slice(-4),vendor:T(r.vendor),photo:T(r.photo),status:e?e.status:'Active'};
  if(e){ Object.assign(e,rec); return 'upd'; } db.employees.push(rec); return 'add';
}
function uploadPeople(role,id){ readRows(id,rows=>{
  const n={add:0,upd:0,bad:0,dup:0};
  rows.forEach(r=>{
    if(AMROLES.includes(role)){ n[addAM(role,{name:r['Name'],doj:r['DOJ'],mobile:r['Mobile'],email:r['Email'],aadhar:r['Aadhar No'],vendor:r['Vendor Code'],photo:r['Photo Drive Link']})]++; return; }
    const name=T(r['Name']); if(!name) return; const eid=T(r['Employee ID']);
    const e=db.employees.find(x=>x.role===role&&(eid?x.id===eid:String(x.name).toLowerCase()===name.toLowerCase()));
    const rec={name,role,contact:T(r['Mobile']),mobile:T(r['Mobile']),email:T(r['Email']),status:e?e.status:'Active'};
    if(e){ Object.assign(e,rec); n.upd++; } else { db.employees.push({id:eid||nextEmpId(),...rec}); n.add++; } });
  save(); toast(`${n.add} added, ${n.upd} updated`+(n.bad?`, ${n.bad} skipped (name or Aadhaar missing)`:'')+(n.dup?`, ${n.dup} skipped (Emp ID clash)`:''),!!(n.bad||n.dup)); render(); }); }
function vPeople(){
  const ed=canMaster();
  return '<h2>PM/RM/AM DB</h2><p class="lead">Uploaded names feed the Project Manager dropdown in projects and the RM/AM assignment. Sr AMs can be chosen as RM or AM.</p>'+PEOPLE.map(([t,role],i)=>{ const l=db.employees.filter(e=>e.role===role), am=AMROLES.includes(role);
    const tbl=am?mTable(['Emp ID','Name','DOJ','Mobile','Email','Aadhar','Vendor Code','Photo Link'],l.map(e=>[e.id,e.name,e.doj||'',e.contact||e.mobile||'',e.email||'',e.aadharMask||'',e.vendor||'',e.photo||'']),l.map(e=>stSel('emp',e.id,e.status,ed))):mTable(['Name','Employee ID','Mobile','Email'],l.map(e=>[e.name,e.id,e.contact||e.mobile||'',e.email||'']),l.map(e=>stSel('emp',e.id,e.status,ed)));
    return `<div class="card"><h3>${t} (${l.length})</h3>${ed?`<div class="row" style="margin:10px 0"><input type="file" id="pf${i}" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="uploadPeople('${role}','pf${i}')">Upload</button><button class="btn ghost" onclick="mTpl('${am?'am':'ppl'}','${role}')">Template</button>${am?`<button class="btn ghost" onclick="addAMForm('${role}')">Add ${role}</button>`:''}</div>`:''}${tbl}</div>`; }).join('');
}
function addAMForm(role){
  const F=[['Name','am_name','text'],['DOJ','am_doj','date'],['Mobile','am_mob','text'],['Email','am_mail','text'],['Aadhar No','am_ad','text'],['Vendor Code','am_vc','text'],['Photo Drive Link','am_ph','text']];
  openModal('Add '+role,`<table class="qa">${F.map(([l,id,t])=>`<tr><td>${l}</td><td><input id="${id}" type="${t}"></td></tr>`).join('')}</table><p class="muted">Emp ID is created automatically: first 3 letters of the name + last 4 digits of Aadhaar. Only the last 4 digits are stored.</p>`,`<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveAM('${role}')">Save</button>`);
}
function saveAM(role){
  const r=addAM(role,{name:val('am_name'),doj:val('am_doj'),mobile:val('am_mob'),email:val('am_mail'),aadhar:val('am_ad'),vendor:val('am_vc'),photo:val('am_ph')});
  if(r==='bad') return toast('Name and a valid Aadhaar number are required.',true);
  if(r==='dup') return toast('Another person already has this Emp ID.',true);
  save(); closeModal(); toast(r==='add'?'Added':'Updated'); render();
}
const SH=(h,a)=>Array.from({length:8},(_,i)=>[h+' S'+(i+1),'','x',a[i]||'']);
const PF=[['Project Name','name','t','Sample Exam 2026'],['Official Project Code','pcode','t',''],['Client Name','client','t','Sample Client'],['Exam Name','exam','t','Sample Exam'],['Start Date','start','d','2026-11-15'],['End Date','end','d','2026-11-16'],['Services','services','l','Biometric, Frisking, CSO'],['Exam Spread','spread','t','PAN India'],['Candidate Count','candidates','n',50000],['Shift Count (max 3)','shifts','n',3],...SH('Exam Duration',['09:30 - 12:00','13:00 - 15:30','16:00 - 18:30']),['Jammer Installed','jammer','t','No'],['ID Card Requirement','idcard','t','Yes'],['Modality','modality','l','FPS + FR, Iris + FR'],...SH('Biometric Window',['07:30 - 09:00','11:30 - 13:00','14:30 - 16:00']),['Biometric Location','attLoc','t','At gate'],['Aadhaar/Non Aadhaar','aadhaar','t','Aadhaar'],['Biometric Allotment Ratio','opRatio','n',80],...SH('Frisking Window',['07:30 - 09:00','11:30 - 13:00','14:30 - 16:00']),['Frisking Services','frServices','l','HHMD, Baggage'],['Frisking Allotment Ratio','frRatio','n',100],['Baggage Allotment Ratio','bagRatio','n',500]];
function projTpl(){
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([PF.map(x=>x[0]),PF.map(x=>x[3])]),'Projects'); XLSX.writeFile(wb,'projects_template.xlsx');
}
function uploadProjects(){
  const f=$('#pfile').files[0]; if(!f) return toast('Select a file first.',true);
  const rd=new FileReader(); rd.onload=ev=>{ try{
    const rows=XLSX.utils.sheet_to_json((w=>w.Sheets[w.SheetNames[0]])(XLSX.read(ev.target.result,{type:'array',cellDates:true})));
    const D=v=>v instanceof Date?new Date(v.getTime()+12*36e5).toISOString().slice(0,10):T(v), L=v=>T(v).split(/[,;]/).map(x=>x.trim()).filter(Boolean), N=v=>+v||0; let add=0,skip=0;
    rows.forEach(r=>{ const rec={}; PF.forEach(([h,k,t])=>{ if(t==='x') return; const v=r[h]; rec[k]=t==='d'?D(v):t==='l'?L(v):t==='n'?N(v):T(v); });
      rec.services=[...new Set(rec.services.map(y=>BASE_SVC.find(x=>x.toLowerCase()===y.toLowerCase())||y))];
      if(!rec.name||!rec.services.length||(rec.start&&rec.end&&rec.end<rec.start)){ skip++; return; }
      const rg=h=>Array.from({length:Math.max(1,Math.min(8,rec.shifts||1))},(_,i)=>String(r[h+' S'+(i+1)]||'').split(/\s*(?:-|–|to)\s*/i).slice(0,2)); rec.dur=rg('Exam Duration'); rec.bwin=rg('Biometric Window'); rec.fwin=rg('Frisking Window');
      const base=rec.name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g,'')||'PRJ'; let n=db.projects.length+1, code; do{ code=`${base}-${String(n++).padStart(3,'0')}`; }while(db.projects.some(p=>p.code===code));
      db.projects.push(pruneProject({status:'Upcoming',created:new Date().toISOString().slice(0,10),...rec,code,shifts:rec.shifts||1,pm:[]})); add++; });
    save(); toast(`${add} projects created, ${skip} skipped`,!!skip&&!add); render();
  }catch(err){ toast('Error: '+err.message,true); } }; rd.readAsArrayBuffer(f);
}
function toggleSide(){ if(innerWidth<=860) $('#side').classList.toggle('open'); else { document.body.classList.toggle('noside'); try{ localStorage.setItem('xc_noside',document.body.classList.contains('noside')?'1':''); }catch(e){} } }
window.addEventListener('load',()=>{ try{ if(localStorage.getItem('xc_noside')) document.body.classList.add('noside'); }catch(e){} });

