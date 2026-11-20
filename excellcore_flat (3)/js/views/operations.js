/* ===== Vendor Team and Operations ===== */
let GF={}, GP=0;
const OTABS=['Operator Calling','Mock Calling','TV Data Download Calling','Exam day Calling','Device master'];
const pSel=(ps,fn)=>`<select onchange="${fn}"><option value="">Select project</option>${ps.map(x=>`<option value="${esc(x.code)}" ${x.code===S.pid?'selected':''}>${esc(x.exam||x.name)} (${esc(x.code)})</option>`).join('')}</select>`;
function svcBar(p){
  const cur=curSvc(p);
  return `<div class="seg">${allSvcs(p).map(x=>{ const ok=!p||p.services.includes(x); return `<button class="${x===cur&&ok?'on':''}" ${ok?'':'disabled'} onclick="S.svc='${x}';BF={};BP=0;GF={};GP=0;render()">${x}</button>`; }).join('')}</div>`;
}
function vVTeam(){
  const p=getP(S.pid);
  return `<h2>${({Biometric:'Bio',Frisking:'Frisking'})[curSvc(p)]||curSvc(p)} Center List</h2>${svcBar(p)}<div class="card"><div class="row">${pSel(db.projects,"S.pid=this.value;BF={};BP=0;render()")}<button class="btn ghost" onclick="quickLinks('vendor')">Quick links</button></div></div>`+(p?bioCard(p):'<div class="empty">Select a project to open its Guard/Op sheet.</div>');
}
const OPM=[['Biometric Designation','des',['Supervisor','Operator']],['Experience','exp',['Experience','Fresher']],['Biometric Operator Name','name'],['Biometric Operator Number','num'],['Biometric Calling Status','bcs',CALLS],['Biometric has Smartphone/App','app',['Yes','No']],['Mode of Transport','mot'],['Reaching Time on Exam','rt'],['Remarks','rem'],['Aadhar card No.','aad'],['Aadhar card No. Valid / Not Valid','aadv',['Valid','Not Valid']],['Selfie Received','selfie',['Yes','No']],['Aadhar Photo','aadp',['Yes','No']],['Gender','gen',['Male','Female','Other']],['Age','age'],['Father Name','fn'],['Date Of Birth','dob'],['Address','addr'],['Manpower Rate','rate'],['Seqrview Address','sqa'],['SeqView Number','sqn'],['SeqrView Onboard','sqo'],['SeqrView DOB','sqd'],['SeqrView Name','sqname'],['New Onboard','newob'],['Training Video Watched','tvw',['Yes','No']],['Video Watched Count','tvc'],['Video Watched Status','tvs'],['Final Status','fin'],['Onboarded','onb'],['New On Boarded','nonb'],['AI Calling','aic']];
const asg=(p,code)=>{ const a=((db.assign||{})[p.code]||{})[code]||{}, nm=id=>(db.employees.find(e=>e.id===id)||{}).name||''; return {rm:a.rmN!==undefined?a.rmN:nm(a.rm),am:nm(a.am),amId:a.amId||'',ach:a.ach||'',csup:a.csup||'',dr:a.dr||''}; };
const cmapOf=p=>new Map((lst(p)).map(c=>[c.code,c]));
function opColsOC(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], M=(h,k,o)=>[h,k,o], C=(h,f,fn)=>[h,'@'+f,fn];
  return [F('OP #',r=>r.n),F('Client Code',r=>cc(r).client),F('Center Code',r=>r.c),F('Center Name',r=>cc(r).name),F('City',r=>cc(r).city),F('State',r=>cc(r).state),C('RM Name','rmN',r=>asg(p,r.c).rm),C('AM ID','amId',r=>asg(p,r.c).amId),F('AM Name',r=>asg(p,r.c).am),F('Vendor Name',r=>vcOf(cc(r)).holder||''),F('ZM Name',r=>cc(r).zm||''),F('ACH Name & No',r=>cc(r).ch||''),F('Total Shift',r=>Array.from({length:+p.shifts||1},(_,i)=>candAt(cc(r),r.d,i)>0?'S'+(i+1):'').filter(Boolean).join(',')),M('Distance','dist'),M('AI Calling Status','aics'),M('Recording URL','rec'),F('Exam Date',r=>dayLbl(p,r.d)),...OPM.map(a=>M(...a)),F('Key',r=>r.c+(r.des||''))];
}
const opVal=(k,r)=>k[1]&&k[1][0]!=='@'?(r[k[1]]??''):(k[2](r)??'');
const telHref=v=>{ const d=String(v||'').replace(/[^\d+]/g,''); return d?'tel:'+(d.length===10?'+91'+d:d):'#'; };
const PHONE='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
function opInput(k,r){
  const i=`<input data-k="${esc(r.k)}" value="${esc(r[k[1]]||'')}" onchange="setOp(this,'${k[1]}')">`;
  return PHK.includes(k[1])?`<div style="display:flex;gap:6px;align-items:center">${i}<a class="btn ghost sm" href="${telHref(r[k[1]])}" title="Call" aria-label="Call">${PHONE}</a></div>`:i;
}
function setOpC(el,f){ const p=getP(S.pid), as=(db.assign=db.assign||{}), pa=(as[p.code]=as[p.code]||{}), c=el.dataset.c; (pa[c]=pa[c]||{})[f]=el.value; save(); opRefresh(); }
function opScan(p,cols,cm,from,per){
  const list=lst(p), st=(db.opc||{})[opK(p)]||{}, act=Object.keys(GF).filter(k=>GF[k]), page=[], cds=CARDS[S.otab]||[], cnt=cds.map(()=>0), ex=S.otab==='Exam day Calling', op=S.otab==='Operator Calling'; let total=0;
  const push=r=>{ if(COLLECT){ COLLECT(r); return; } if(act.length&&!act.every(j=>cols[j]&&String(opVal(cols[j],r))===GF[j])) return; cds.forEach((c,i)=>{ if(c[1](r)) cnt[i]++; }); if(total>=from&&total<from+per) page.push(r); total++; };
  list.forEach(c=>{ const x=calcCenter(p,c);
    if(!ex&&!op){ push({c:c.code,k:c.code,x,...(st[c.code]||{})}); return; }
    x.days.forEach((dy,d)=>{
      if(op){ for(let n=1;n<=dy.m;n++){ const k=c.code+'|'+d+'|'+n; push({c:c.code,d,n,k,m:dy.m,x,...(st[k]||{})}); } }
      else { const sh=Array.from({length:+p.shifts||1},(_,i)=>i).filter(i=>candAt(c,d,i)>0); (sh.length?sh:[0]).forEach(i=>{ const k=c.code+'|'+d+'|S'+(i+1); push({c:c.code,d,s:i,k,m:dy.m,x,...(st[k]||{})}); }); } }); });
  return {total,page,cnt};
}
function opBody(p,cols,cm){
  const per=100, ed=canOpsEdit(); let sc=opScan(p,cols,cm,GP*per,per); if(!sc.page.length&&GP>0){ GP=0; sc=opScan(p,cols,cm,0,per); }
  const cell=(k,r)=>!k[1]?esc(k[2](r)):k[1][0]==='@'?(ed?`<input data-c="${esc(r.c)}" value="${esc(k[2](r))}" onchange="setOpC(this,'${k[1].slice(1)}')">`:esc(k[2](r))):!ed?esc(r[k[1]]):Array.isArray(k[2])?`<select data-k="${esc(r.k)}" onchange="setOp(this,'${k[1]}')"><option value=""></option>${k[2].map(o=>`<option ${o===r[k[1]]?'selected':''}>${esc(o)}</option>`).join('')}</select>`:opInput(k,r);
  const rows=sc.page.map(r=>`<tr>${cols.map((k,j)=>`<td class="${fz(j)}" data-label="${esc(k[0])}">${cell(k,r)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="empty">No rows. They are created automatically once the Vendor &amp; Guard OP sheet has centers and Operator Ratio is set.</td></tr>`;
  const pages=Math.max(1,Math.ceil(sc.total/per));
  return {rows,cards:opCards(sc),pager:`<button class="btn ghost sm" onclick="GP=Math.max(0,GP-1);opRefresh()">Prev</button><span>Page ${GP+1} of ${pages} · ${sc.total} rows</span><button class="btn ghost sm" onclick="GP=Math.min(${pages-1},GP+1);opRefresh()">Next</button>`};
}
function opRefresh(){ const p=getP(S.pid); if(!p||!$('#opB')) return; const cm=cmapOf(p), b=opBody(p,opCols(p,cm),cm); $('#opB').innerHTML=b.rows; $('#opPg').innerHTML=b.pager; if($('#opCards')) $('#opCards').innerHTML=b.cards; }
function setOp(el,k){ const p=getP(S.pid), o=(db.opc=db.opc||{}), st=(o[opK(p)]=o[opK(p)]||{}), key=el.dataset.k; (st[key]=st[key]||{})[k]=el.value; save(); if(PHK.includes(k)&&el.nextElementSibling) el.nextElementSibling.href=telHref(el.value); }
function opExport(){
  const p=getP(S.pid), cm=cmapOf(p), cols=opCols(p,cm), sc=opScan(p,cols,cm,0,1e9);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols.map(k=>k[0]),...sc.page.map(r=>cols.map(k=>opVal(k,r)))]),S.otab); XLSX.writeFile(wb,p.code+'_'+S.otab.replace(/ /g,'_')+'.xlsx');
}
function vOps(){
  S.otab=S.otab||OTABS[0]; const p=getP(S.pid);
  const head=`<h2>${esc(S.otab)}</h2>${svcBar(p)}<div class="card"><div class="row">${pSel(db.projects,"S.pid=this.value;GF={};GP=0;render()")}<button class="btn ghost" onclick="quickLinks('ops')">Quick links</button></div></div>`;
  if(!p) return head+'<div class="empty">Select a project.</div>';
  if(S.otab==='Device master') return head+(curSvc(p)!=='Biometric'?'<div class="empty">Device master applies to Biometric only.</div>':'<div class="card"><h3>Device master</h3><p>Columns for this sheet are not defined yet. Share the headers and I will build it the same way.</p></div>');
  const cm=cmapOf(p), cols=opCols(p,cm), b=opBody(p,cols,cm), desc=({'Operator Calling':'One row per operator needed, per center, per exam day (from Max Day in Guard/Op).','Mock Calling':'One row per center.','TV Data Download Calling':'One row per center.','Exam day Calling':'One row per center, exam date and shift.'})[S.otab];
  return head+`<div class="card"><h3>${esc(S.otab)} - ${curSvc(p)}</h3><p>${desc} Fetched columns come from Guard/Op and Operator Calling; the rest are filled manually.</p><div id="opCards">${b.cards}</div>${S.otab==='Operator Calling'&&canOpsEdit()?`<div class="row" style="margin-bottom:12px"><input type="file" id="obfile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="uploadOpBulk()">Bulk upload (RM, AM, operators)</button><button class="btn ghost" onclick="mTpl('opb')">Template</button></div>`:''}<div class="row" style="margin-bottom:12px"><button class="btn ghost" onclick="GF={};render()">Clear filters</button><button class="btn ghost" onclick="opExport()">Export to Excel</button>${freezeCtl()}</div><div class="tw" style="max-height:70vh"><table><thead><tr>${cols.map((k,j)=>`<th class="${fz(j)}">${fth(k[0],j,'GF','op','opRefresh()','GP')}</th>`).join('')}</tr></thead><tbody id="opB">${b.rows}</tbody></table></div><div class="row" id="opPg" style="margin-top:10px">${b.pager}</div></div>`;
}


/* ===== Services, Mock Calling, Exam day Calling, bulk projects ===== */
const curSvc=p=>p?(p.services.includes(S.svc)?S.svc:p.services[0]):'Biometric';
const lst=p=>(db.sheets[p.code]||{})[curSvc(p)]||[];
const opK=p=>p.code+'|'+curSvc(p)+'|'+(S.otab||'Operator Calling');
const PHK=['num','sqn','mpn'];
const svcTabs=p=>p.services.length>1?`<div class="seg">${p.services.map(x=>`<button class="${x===curSvc(p)?'on':''}" onclick="S.svc='${x}';BF={};BP=0;GF={};GP=0;render()">${x}</button>`).join('')}</div>`:'';
let CTX={sup:new Map(),oc:{}};
function opCols(p,cm){
  if(S.otab==='Operator Calling') return opColsOC(p,cm);
  const oc=(db.opc||{})[p.code+'|'+curSvc(p)+'|Operator Calling']||{}, sup=new Map();
  Object.keys(oc).forEach(k=>{ const v=oc[k]; if(v.des==='Supervisor'&&(v.name||v.num)) sup.set(k.split('|')[0],(v.name||'')+(v.num?' - '+v.num:'')); });
  CTX={sup,oc}; return S.otab==='Mock Calling'?mockCols(p,cm):S.otab==='TV Data Download Calling'?tvCols(p,cm):examCols(p,cm);
}
const mm=(h,k,o)=>[h,k,o];
function baseCols(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], C=(h,f,fn)=>[h,'@'+f,fn];
  return [F('Client Code',r=>cc(r).client),F('Center Code',r=>r.c),F('Center Name',r=>cc(r).name),F('City',r=>cc(r).city),F('State',r=>cc(r).state),C('RM Name','rmN',r=>asg(p,r.c).rm),C('AM ID','amId',r=>asg(p,r.c).amId),F('AM Name',r=>asg(p,r.c).am),F('Vendor Name',r=>vcOf(cc(r)).holder||''),F('VM Name',r=>cc(r).zm||''),F('ACH Name & No',r=>cc(r).ch||''),C('CSUP Name / Number','csup',r=>asg(p,r.c).csup),C('DR Name & No','dr',r=>asg(p,r.c).dr)];
}
function mockCols(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], YN=['Yes','No'], sp=[]; for(let i=1;i<=12;i++) sp.push(mm('Sent','ms'+i),mm('Received','mr'+i));
  return [...baseCols(p,cm),mm('Material Status','mat',['Pending','Delivered','Partial']),F('Total Opr',r=>r.x.all),F('VC NAME',r=>vcOf(cc(r)).vname||''),mm('RE Mock Status','rms'),F('Supervisor Name / No',r=>CTX.sup.get(r.c)||''),mm('Mock Date By Client','mdc'),mm('Mock Time By Client','mtc'),mm('Mock Person Name','mpname'),mm('Mock Person Number','mpn'),mm('Mock Calling Confirmation','mcc',CALLS),mm('Reaching Time on Mock','rtm'),mm('Remarks','rem'),mm('Fri Vendor','fv'),mm('OPS View Selfie Upload','ovs',YN),mm('OPS View Mock Report','ovm',YN),mm('Final Mock','fm'),mm('Mock Attendance','ma',YN),mm('Mock Report','mrp',YN),mm('Biometric Counter Location Identify','bcl',YN),mm('Location Photo Received','lpr',YN),mm('WIFI Availability Status','wifi',YN),mm('Center Issues','ci'),mm('Remarks for Center issues','cir'),mm('Mock Confirmed from CSUP / Observer','mcs'),mm('Mock Confirmation Remarks','mcr'),mm('Remarks (if any)','rem2'),...sp,mm('FRI RM','frm'),mm('Fri Material Status','fms'),F('Exam Date',r=>dayLbl(p,0)),F('Exam Dates',r=>r.x.days.map((_,d)=>dayLbl(p,d)).join(', ')),mm('CSO Vendor','csv'),mm('CSO RM','csrm'),mm('Distance','dist'),mm('FAQ Count','faq'),mm('REMOCK Status','rmk')];
}
function examCols(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], YN=['Yes','No'], csr=[];
  const ops=r=>{ const a=[]; for(let n=1;n<=r.m;n++){ const v=CTX.oc[r.c+'|'+r.d+'|'+n]; if(v&&(v.name||v.num)) a.push((v.name||'')+(v.num?'-'+v.num:'')); } return a.join(', '); };
  Array.from({length:Math.max(3,+p.shifts||0)},(_,i)=>i+1).forEach(i=>csr.push(mm('CSR S'+i,'csr'+i),mm('CSR Remarks S'+i,'csrr'+i)));
  return [...baseCols(p,cm),mm('JCO RM','jrm'),mm('JCO Name & No','jnn'),F('VC Name',r=>vcOf(cc(r)).vname||''),mm('FRI RM','frm'),mm('FRI Name & NO','fnn'),mm('Fri Vendor','fv'),F('Supervisor Name & Number',r=>CTX.sup.get(r.c)||''),F('Opr Name & No 1',ops),F('Exam Date',r=>dayLbl(p,r.d)),F('Shift',r=>'S'+(r.s+1)),F('Total Shift',r=>Array.from({length:+p.shifts||1},(_,i)=>candAt(cc(r),r.d,i)).filter(n=>n>0).length||1),mm('AI ETA','ae1'),F('Total Operator',r=>r.m),mm('ETA','eta'),mm('Manpower Reached','mpr'),F('BIo OP Difference (Completed/Partial)',bodOf),mm('AI ETA','ae2'),mm('AI Principal Confirmation','apc'),mm('M Reached FRI','mrf'),mm('F Reached FRI','frf'),mm('Crowd/Baggage','cb'),mm('CSO Reached','csor'),mm('Bio OP Reached By CSO','bor'),F('TAB',r=>r.x.tab),F('FPS',r=>r.x.fps),F('IRIS',r=>r.x.iris),F('OTG',r=>r.x.otg),F('Hologram',r=>r.x.holo),F('ID CARD',r=>r.x.id),mm('Startek','stk'),mm('Lan Connector','lan'),mm('CCTV Cam Count','cctv'),...csr,mm('CSR Remarks','csrr'),mm('Center Issues Highlighted During exam','cih'),mm('Actual Time (Manual Time 1st)','at1'),mm('Actual Time (Manual Time Last)','at2'),mm('Exit Selfie','exs',YN),mm('Exam Code','exc'),mm('Username','usr'),mm('Password','pwd'),mm('AI ETA URL','aeu'),mm('Time Stamp 1','ts1'),mm('Time Stamp 2','ts2'),F('Supervisor no.',r=>(CTX.sup.get(r.c)||'').split(' - ')[1]||''),mm('AI ETA Status','aes'),mm('OP Profile','opp'),mm('Opsview Status Total Task','ost'),mm('Opsview Status Task Done','osd')];
}


let COLLECT=null, GG={};
/* ---------- column freezing: chosen by the user, off by default ---------- */
let FREEZE=(()=>{ try{ return Math.min(3,Math.max(0,+localStorage.getItem('xc_freeze')||0)); }catch(e){ return 0; } })();
const fz=j=>j<FREEZE?'fz fz'+j:'';
function setFreeze(v){ FREEZE=Math.min(3,Math.max(0,+v||0)); try{ localStorage.setItem('xc_freeze',FREEZE); }catch(e){} render(); }
const freezeCtl=()=>`<label class="frz">Freeze columns<select onchange="setFreeze(this.value)" aria-label="Freeze columns">${[[0,'None'],[1,'First 1'],[2,'First 2'],[3,'First 3']].map(([n,l])=>`<option value="${n}" ${n===FREEZE?'selected':''}>${l}</option>`).join('')}</select></label>`;

/* ---------- column filters: a funnel icon in each header opens a searchable list of values ---------- */
const FSTATE=m=>({BF:()=>BF,GF:()=>GF,GG:()=>GG})[m]();
const FUNNEL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>';
const fth=(label,j,m,kind,fn,pg)=>`<span class="th-in">${esc(label)}<button type="button" class="fbtn ${FSTATE(m)[j]?'on':''}" title="Filter ${esc(label)}" aria-label="Filter ${esc(label)}" onclick="openFilter(event,'${m}',${j},'${kind}','${fn}','${pg}')">${FUNNEL}</button></span>`;
function filterVals(kind,j){
  const p=getP(S.pid), set=new Set();
  if(kind==='bio'){ const cols=bioCols(p,false), l=lst(p); l.forEach((c,i)=>{ set.add(String(cols[j][1](c,calcCenter(p,c),i))); }); }
  else if(kind==='op'){ const cm=cmapOf(p), cols=opCols(p,cm); COLLECT=r=>set.add(String(opVal(cols[j],r))); try{ opScan(p,cols,cm,0,0); }finally{ COLLECT=null; } }
  else if(kind==='grp'){ GRPC.rows.forEach(r=>set.add(String(opVal(GRPC.cols[j],r)))); }
  return [...set].filter(v=>v!=='').sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).slice(0,500);
}
let FPH=null;
function closeFilter(){ const e=$('#fpop'); if(e) e.remove(); if(FPH){ document.removeEventListener('mousedown',FPH,true); window.removeEventListener('scroll',FPH,true); FPH=null; } }
function openFilter(ev,m,j,kind,fn,pg){
  ev.stopPropagation(); const btn=ev.currentTarget, had=$('#fpop'), id=m+j; closeFilter(); if(had&&had.dataset.k===id) return;
  const vals=filterVals(kind,j), cur=FSTATE(m)[j]||'', pop=document.createElement('div'); pop.id='fpop'; pop.dataset.k=id;
  pop.innerHTML='<input type="search" placeholder="Search values" aria-label="Search values"><div class="fl"></div>'; document.body.appendChild(pop);
  const list=pop.querySelector('.fl'), q=pop.querySelector('input');
  const draw=()=>{ const s=q.value.trim().toLowerCase(), v=vals.filter(x=>!s||x.toLowerCase().includes(s));
    list.innerHTML=`<button type="button" data-v="" class="${cur?'':'sel'}">All (clear filter)</button>`+v.map(x=>`<button type="button" data-v="${esc(x)}" class="${x===cur?'sel':''}">${esc(x)}</button>`).join('')+(v.length?'':'<div class="fe">No matching values</div>'); };
  list.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const v=b.dataset.v; closeFilter(); FSTATE(m)[j]=v; btn.classList.toggle('on',!!v); new Function(pg+'=0;'+fn)(); };
  q.oninput=draw; draw();
  const r=btn.getBoundingClientRect(); pop.style.left=Math.max(8,Math.min(r.left,innerWidth-268))+'px'; pop.style.top=Math.min(r.bottom+6,innerHeight-120)+'px';
  FPH=e=>{ if(!pop.contains(e.target)&&!(e.target.closest&&e.target.closest('.fbtn'))) closeFilter(); };
  document.addEventListener('mousedown',FPH,true); window.addEventListener('scroll',FPH,true); q.focus();
}
/* ===== Reporting cards, TV Data Download, automatic manpower status ===== */
const NUM=v=>+v||0, BLANK=v=>v===undefined||v==='';
const bodOf=r=>BLANK(r.mpr)?'':(NUM(r.mpr)>=r.m?'Completed':'Partial');
const CARDS={
  'Operator Calling':[['Operator name filled',r=>r.name],['Calling: Going',r=>r.bcs==='Going'],['Selfie received',r=>r.selfie==='Yes'],['Aadhar valid',r=>r.aadv==='Valid'],['Training video watched',r=>r.tvw==='Yes'],['Final status filled',r=>r.fin]],
  'Mock Calling':[['Mock calling confirmed',r=>r.mcc==='Going'],['Material delivered',r=>r.mat==='Delivered'],['Mock attendance',r=>r.ma==='Yes'],['Location photo received',r=>r.lpr==='Yes'],['WIFI available',r=>r.wifi==='Yes'],['Final mock filled',r=>r.fm]],
  'TV Data Download Calling':[['Data download complete',r=>!BLANK(r.dd)&&NUM(r.dd)>=r.x.all],['Transactions complete',r=>!BLANK(r.trd)&&NUM(r.trd)>=r.x.all],['Unique devices OK',r=>!BLANK(r.ub)&&NUM(r.ub)>=r.x.all],['ID received',r=>r.idr==='Yes'],['Jacket received',r=>r.jkr==='Yes'],['Training video received',r=>r.tvr]],
  'Exam day Calling':[['Manpower complete',r=>bodOf(r)==='Completed'],['Manpower partial',r=>bodOf(r)==='Partial'],['Principal confirmed',r=>r.apc],['CSO reached',r=>r.csor],['Exit selfie',r=>r.exs==='Yes'],['Issues highlighted',r=>r.cih]]
};
function cardsHtml(items,total){
  return `<div class="rcards">${items.map(([l,n])=>`<div class="rc"><span>${esc(l)}</span><b>${total?Math.round(n*100/total):0}%</b><span>${n} of ${total}</span></div>`).join('')}</div>`;
}
const opCards=sc=>cardsHtml((CARDS[S.otab]||[]).map((c,i)=>[c[0],sc.cnt[i]]),sc.total);
function bioCards(p){
  const l=lst(p), idx=bioIdx(p), f=fn=>idx.filter(i=>fn(l[i])).length;
  return cardsHtml([['Vendor allocated',f(c=>c.vc)],['ZM assigned',f(c=>c.zm)],['City Head filled',f(c=>c.ch)],['Vendor contact filled',f(c=>c.contact)]],idx.length);
}
function tvCols(p,cm){
  const F=(h,fn)=>[h,null,fn], YN=['Yes','No'], diff=(a,b)=>BLANK(a)&&BLANK(b)?'':NUM(a)-NUM(b), less=(op,v)=>BLANK(v)?'':Math.max(0,op-NUM(v));
  return [...baseCols(p,cm).filter(k=>k[0]!=='DR Name & No'),F('Total Operator',r=>r.x.all),F('Supervisor Name & No',r=>CTX.sup.get(r.c)||''),F('Exam Date',r=>dayLbl(p,0)),F('Exam Dates',r=>r.x.days.map((_,d)=>dayLbl(p,d)).join(', ')),
   mm('Device Distribution status Validation by Supervisor','dvs'),mm('DDD Remarks (Time Shared by OP)','ddr'),mm('Device Person Name & No','dpn'),mm('ID Received','idr',YN),mm('Jacket Received','jkr',YN),mm('Hollogram Received','hlr',YN),mm('STARTEK Device','stk'),mm('Authority Letter Received','alr',YN),
   mm('# Device','dev'),mm('# Devices Data Download','dd'),F('# Pending Data Download Devices',r=>diff(r.dev,r.dd)),F('DD Less Than OP',r=>less(r.x.all,r.dd)),mm('# Devices Transaction Done','trd'),F('# Devices Transaction Pending',r=>diff(r.dev,r.trd)),F('Pending Transation - Less then OP',r=>less(r.x.all,r.trd)),
   mm('# Unique Bio Device','ub'),F('UniLess than OP Unique Device',r=>less(r.x.all,r.ub)),mm('# Unique Aadhar Transaction','ua'),mm('Training Video Received','tvr'),mm('# Bio Operator Count','boc'),mm('Training Photos Received','tph')];
}

