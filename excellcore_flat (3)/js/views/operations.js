/* [14] OPERATIONS - Operator, Mock, TV Data Download and Exam day calling sheets, filters, SeQRView */
/* ===== [14.1] Vendor Team and Operations ===== */
let GF={}, GP=0;
const OTABS=['Operator Calling','Mock Calling','TV Data Download Calling','Exam day Calling','Device master'];
/* Data Download and Device master exist for Biometric only. Frisking and CSO have Operator Calling, Mock Calling and Exam day Calling in the same format. */
const BIO_ONLY_TABS=['TV Data Download Calling','Device master'];
const svcNow=()=>{ const p=typeof getP==='function'?getP(S.pid):null; return p?curSvc(p):'Biometric'; };
const tabOk=(t,svc)=>(svc==='Biometric'||!BIO_ONLY_TABS.includes(t))&&(t==='Device master'?!isSpecial():spSheet(t));   // special logins: only the sheets they were given
const pSel=(ps,fn)=>`<select onchange="${fn}"><option value="">Select project</option>${ps.map(x=>`<option value="${esc(x.code)}" ${x.code===S.pid?'selected':''}>${esc(projTitle(x))}</option>`).join('')}</select>`;
function svcBar(p){
  const cur=curSvc(p);
  return `<div class="seg">${allSvcs(p).map(x=>{ const ok=(!p||p.services.includes(x))&&svcAllowed(p,x); return `<button class="${x===cur&&ok?'on':''}" ${ok?'':'disabled'} onclick="S.svc='${x}';BF={};BP=0;GF={};GP=0;render()">${x}</button>`; }).join('')}</div>`;
}
function vVTeam(){
  const p=getP(S.pid);
  return `<h2>${({Biometric:'Bio',Frisking:'Frisking'})[curSvc(p)]||curSvc(p)} Center List</h2>${svcBar(p)}<div class="card"><div class="row">${pSel(db.projects,"S.pid=this.value;BF={};BP=0;render()")}<button class="btn ghost" onclick="quickLinks('vendor')">Quick links</button></div></div>`+(p&&!spSheet(centerListName(curSvc(p)))?'<div class="empty">Your login does not include the '+esc(centerListName(curSvc(p)))+'.</div>':p?bioCard(p):'<div class="empty">Select a project to open its Guard/Op sheet.</div>');
}
const OPM=[['Biometric Designation','des',['Supervisor','Operator']],['Experience','exp',['Experience','Fresher']],['Biometric Operator Name','name'],['Biometric Operator Number','num'],['Biometric Calling Status','bcs',CALLS],['Biometric has Smartphone/App','app',['Yes','No']],['Mode of Transport','mot'],['Reaching Time on Exam','rt'],['Remarks','rem'],['Aadhar card No.','aad'],['Aadhar card No. Valid / Not Valid','aadv',['Valid','Not Valid']],['Selfie Received','selfie',['Yes','No']],['Aadhar Photo','aadp',['Yes','No']],['Gender','gen',['Male','Female','Other']],['Age','age'],['Father Name','fn'],['Date Of Birth','dob'],['Address','addr'],['Manpower Rate','rate'],['Seqrview Address','sqa'],['SeqView Number','sqn'],['SeqrView Onboard','sqo'],['SeqrView DOB','sqd'],['SeqrView Name','sqname'],['New Onboard','newob'],['Training Video Watched','tvw',['Yes','No']],['Video Watched Count','tvc'],['Video Watched Status','tvs'],['Final Status','fin'],['Onboarded','onb'],['New On Boarded','nonb'],['AI Calling','aic']];
const asg=(p,code)=>{ const a=((db.assign||{})[p.code]||{})[code]||{}, nm=id=>(db.employees.find(e=>e.id===id)||{}).name||''; return {rm:a.rmN!==undefined?a.rmN:nm(a.rm),am:nm(a.am),amId:a.amId||'',ach:a.ach||'',csup:a.csup||'',dr:a.dr||''}; };
const cmapOf=p=>new Map((lst(p)).map(c=>[c.code,c]));
function opColsOC(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], M=(h,k,o)=>[h,k,o], C=(h,f,fn)=>[h,'@'+f,fn];
  return [F('Project Code',()=>pcodeOf(p)),F('OP #',r=>r.n),F('Client Code',r=>cc(r).client),F('Center Code',r=>r.c),F('Center Name',r=>cc(r).name),F('City',r=>cc(r).city),F('State',r=>cc(r).state),C('RM Name','$rm',r=>asg(p,r.c).rm),F('AM ID',r=>asg(p,r.c).amId),C('AM Name','$am',r=>asg(p,r.c).am),F('Vendor Name',r=>vcOf(cc(r)).holder||''),F('ZM Name',r=>cc(r).zm||''),F('ACH Name & No',r=>cc(r).ch||''),F('Total Shift',r=>Array.from({length:+p.shifts||1},(_,i)=>candAt(cc(r),r.d,i)>0?'S'+(i+1):'').filter(Boolean).join(',')),M('Distance','dist'),M('AI Calling Status','aics'),M('Recording URL','rec'),F('Exam Date',r=>dayLbl(p,r.d)),M('SeQRView Status','sqst'),M('SeQRView Onboarded On','sqon'),...OPM.map(a=>M(...a)),F('Key',r=>r.c+(r.des||''))];
}
const opVal=(k,r)=>k[1]&&k[1][0]!=='@'?((typeof sqv==='function'&&sqv(k,r))??r[k[1]]??''):(k[2](r)??'');
const telHref=v=>{ const d=String(v||'').replace(/[^\d+]/g,''); return d?'tel:'+(d.length===10?'+91'+d:d):'#'; };
const PHONE='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
function opInput(k,r){
  const i=`<input data-k="${esc(r.k)}" value="${esc(r[k[1]]||'')}" ${PHK.includes(k[1])?mobAttrs+' placeholder="10 digit mobile"':''} onchange="setOp(this,'${k[1]}')">`;
  return PHK.includes(k[1])?`<div style="display:flex;gap:6px;align-items:center">${i}<a class="btn ghost sm" href="${telHref(r[k[1]])}" title="Call" aria-label="Call">${PHONE}</a></div>`:i;
}
function asgSel(f,r){
  const p=getP(S.pid), a=((db.assign||{})[p.code]||{})[r.c]||{}, cur=f==='rm'?a.rm:a.am, L=f==='rm'?rmEmps():amEmps(), old=(f==='rm'&&!a.rm&&a.rmN)?a.rmN:'';
  return `<select class="asg" data-c="${esc(r.c)}" onchange="setOpAsg(this,'${f}')"><option value="">${old?esc(old)+' (not in DB)':''}</option>${L.map(e=>`<option value="${esc(e.id)}" ${e.id===cur?'selected':''}>${esc(e.name)}</option>`).join('')}</select>`;
}
function setOpAsg(el,f){ const p=getP(S.pid), as=(db.assign=db.assign||{}), pa=(as[p.code]=as[p.code]||{}), a=(pa[el.dataset.c]=pa[el.dataset.c]||{}); if(f==='rm'){ a.rm=el.value; delete a.rmN; } else { a.am=el.value; a.amId=el.value; } save(); opRefresh(); }
function setOpC(el,f){ const p=getP(S.pid), as=(db.assign=db.assign||{}), pa=(as[p.code]=as[p.code]||{}), c=el.dataset.c; (pa[c]=pa[c]||{})[f]=el.value; save(); opRefresh(); }
function opScan(p,cols,cm,from,per){
  const list=lst(p), st=(db.opc||{})[opK(p)]||{}, act=Object.keys(GF).filter(k=>GF[k]), page=[], cds=CARDS[S.otab]||[], cnt=cds.map(()=>0), ex=S.otab==='Exam day Calling', op=S.otab==='Operator Calling'; let total=0;
  const push=r=>{ if(COLLECT){ COLLECT(r); return; } if(act.length&&!act.every(j=>cols[j]&&fmatch(GF[j],opVal(cols[j],r)))) return; cds.forEach((c,i)=>{ if(c[1](r)) cnt[i]++; }); if(total>=from&&total<from+per) page.push(r); total++; };
  const byDay=[];   // Operator Calling and Exam day Calling: one block per exam date, so all of date 1 comes first, then date 2
  list.forEach(c=>{ const x=calcCenter(p,c);
    if(!ex&&!op){ push({c:c.code,k:c.code,x,...(st[c.code]||{})}); return; }
    x.days.forEach((dy,d)=>{ const b=(byDay[d]=byDay[d]||[]);
      if(op){ for(let n=1;n<=dy.m;n++){ const k=c.code+'|'+d+'|'+n; b.push({c:c.code,d,n,k,m:dy.m,x,...(st[k]||{})}); } }   // one row per operator, per exam date
      else { const k=c.code+'|'+d; b.push({c:c.code,d,k,m:dy.m,x,...(st[k]||{})}); } }); });   // one row per center, per exam date
  byDay.forEach(b=>(b||[]).forEach(push));
  return {total,page,cnt};
}
function opBody(p,cols,cm){
  const per=100, ed=canOpsEdit(); let sc=opScan(p,cols,cm,GP*per,per); if(!sc.page.length&&GP>0){ GP=0; sc=opScan(p,cols,cm,0,per); }
  if(S.otab==='Operator Calling') sqLookup(sc.page);
  const edCol=k=>!isSpecial()||spEdit(S.otab,colKey(p,k[0]));   // special logins edit only the columns they were given
  const shown=v=>CALLABLE.test(v[0]);
  const cell=(k,r)=>!k[1]?(shown(k)?callCell(k[2](r),k[0]):esc(k[2](r))):k[1][0]==='@'?((k[1]==='@$rm'||k[1]==='@$am')?((ed&&!isSpecial()&&S.otab==='Operator Calling'&&canAssign(k[1].slice(2),((db.assign||{})[p.code]||{})[r.c]))?asgSel(k[1].slice(2),r):esc(k[2](r))):(ed&&!isSpecial()&&(k[1]!=='@csup'||canCsup()))?`<input data-c="${esc(r.c)}" value="${esc(k[2](r))}" onchange="setOpC(this,'${k[1].slice(1)}')">`:callCell(k[2](r),k[0])):((ADMIN_BULK[S.otab]||[]).includes(k[1])||(S.otab==='Operator Calling'&&k[1]==='age'))?`<span class="sqv" title="${k[1]==='age'?'Fetched from SeQRView':'Updated in bulk by an Admin'}">${esc((k[1]==='age'?sqv(k,r):null)??r[k[1]]??'')}</span>`:(k[1]==='sqst'||k[1]==='sqon')?`<span class="sqv" title="From SeQRView">${esc(sqv(k,r)??r[k[1]]??(k[1]==='sqst'?sqStatus(r):''))}</span>`:sqv(k,r)!==null?`<span class="sqv" title="From SeQRView">${esc(sqv(k,r))}</span>`:!(ed&&edCol(k))?(PHK.includes(k[1])?callCell(r[k[1]],k[0]):esc(r[k[1]])):Array.isArray(k[2])?`<select data-k="${esc(r.k)}" onchange="setOp(this,'${k[1]}')"><option value=""></option>${k[2].map(o=>`<option ${o===r[k[1]]?'selected':''}>${esc(o)}</option>`).join('')}</select>`:opInput(k,r);
  const vi=visIdx(S.otab,cols,p);
  const rows=sc.page.map(r=>`<tr>${vi.map((j,pos)=>`<td class="${fzv(pos)}" data-label="${esc(cols[j][0])}">${cell(cols[j],r)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${vi.length||1}" class="empty">No rows. They are created automatically once the Vendor &amp; Guard OP sheet has centers and Operator Ratio is set.</td></tr>`;
  const pages=Math.max(1,Math.ceil(sc.total/per));
  return {rows,cards:opCards(sc),pager:`<button class="btn ghost sm" onclick="GP=Math.max(0,GP-1);opRefresh()">Prev</button><span>Page ${GP+1} of ${pages} · ${sc.total} rows</span><button class="btn ghost sm" onclick="GP=Math.min(${pages-1},GP+1);opRefresh()">Next</button>`};
}
function opRefresh(){ const p=getP(S.pid); if(!p||!$('#opB')) return; const cm=cmapOf(p), b=opBody(p,opCols(p,cm),cm); $('#opB').innerHTML=b.rows; $('#opPg').innerHTML=b.pager; if($('#opCards')) $('#opCards').innerHTML=b.cards; }
/* Read-only cells whose text holds names and numbers get a call button (several numbers: a small list to call each) */
const CALLABLE=/(\bno\.?$|\bnumber\b|name\s*[&/]\s*no|\bno\s*\d*$)/i;
function setOp(el,k){ const p=getP(S.pid), o=(db.opc=db.opc||{}), st=(o[opK(p)]=o[opK(p)]||{}), key=el.dataset.k;
  if(PHK.includes(k)&&checkMobileInput(el)===null) return;   // mobile number cells follow the 10 digit rule
  (st[key]=st[key]||{})[k]=el.value; save(); if(PHK.includes(k)&&el.nextElementSibling) el.nextElementSibling.href=telHref(el.value); if(k==='num'||k==='sqn'){ sqLookup([{...(st[key]||{}),k:key}]); } }
function opExport(){
  const p=getP(S.pid), cm=cmapOf(p), all=opCols(p,cm), sc=opScan(p,all,cm,0,1e9), cols=visIdx(S.otab,all,p).map(j=>all[j]);   // the columns shown on screen
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols.map(k=>k[0]),...sc.page.map(r=>cols.map(k=>opVal(k,r)))]),S.otab); XLSX.writeFile(wb,fsafe(p.code)+'_'+S.otab.replace(/ /g,'_')+'.xlsx');
}
function vOps(){
  S.otab=S.otab||OTABS[0]; const p=getP(S.pid);
  if(p&&!tabOk(S.otab,curSvc(p))) S.otab=OTABS.find(t=>tabOk(t,curSvc(p)))||'Operator Calling';   // Frisking / CSO have no Data Download or Device master
  const head=`<h2>${esc(S.otab)}</h2>${svcBar(p)}<div class="card"><div class="row">${pSel(db.projects,"S.pid=this.value;GF={};GP=0;render()")}<button class="btn ghost" onclick="quickLinks('ops')">Quick links</button>${canWriteT('operator_calling')?'<button class="btn ghost" onclick="compileProject()">Save all columns to DB</button>':''}${canBulkData()?'<button class="btn ghost" onclick="bulkDataOpen()">Bulk data upload (Admin)</button>':''}</div></div>`;
  if(!p) return head+'<div class="empty">Select a project.</div>';
  if(S.otab==='Device master') return head+(curSvc(p)!=='Biometric'?'<div class="empty">Device master applies to Biometric only.</div>':'<div class="card"><h3>Device master</h3><p>Columns for this sheet are not defined yet. Share the headers and I will build it the same way.</p></div>');
  CUR_SHEET=SHEET_TABLES[S.otab]?{p,sv:curSvc(p),sheet:S.otab}:null; scheduleCompile();   // the columns of this sheet are saved in the database too
  const cm=cmapOf(p), cols=opCols(p,cm), b=opBody(p,cols,cm), desc=({'Operator Calling':'One row per operator needed, per center, per exam date, sorted by exam date. RM and AM are assigned here only.','Mock Calling':'One row per center.','TV Data Download Calling':'One row per center.','Exam day Calling':'One row per center, exam date and shift.'})[S.otab];
  return head+`<div class="card"><h3>${esc(S.otab)} - ${curSvc(p)}</h3><p>${desc} Fetched columns come from Guard/Op and Operator Calling; the rest are filled manually.</p><div id="opCards">${b.cards}</div>${S.otab==='Operator Calling'&&canOpsEdit()&&!isSpecial()?`<div class="row" style="margin-bottom:12px"><input type="file" id="obfile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="uploadOpBulk()">Bulk upload (RM, AM, operators)</button><button class="btn ghost" onclick="mTpl('opb')">Template</button></div>`:''}<div class="row" style="margin-bottom:12px"><button class="btn ghost" onclick="GF={};render()">Clear filters</button><button class="btn ghost" onclick="opExport()">Export to Excel</button>${colsBtn()}${freezeCtl()}</div><div class="tw" style="max-height:70vh"><table><thead><tr>${visIdx(S.otab,cols,p).map((j,pos)=>`<th class="${fzv(pos)}">${fth(cols[j][0],j,'GF','op','opRefresh()','GP')}</th>`).join('')}</tr></thead><tbody id="opB">${b.rows}</tbody></table></div><div class="row" id="opPg" style="margin-top:10px">${b.pager}</div></div>`;
}


/* ===== [14.2] Services, Mock Calling, Exam day Calling, bulk projects ===== */
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
  return [F('Project Code',()=>pcodeOf(p)),F('Client Code',r=>cc(r).client),F('Center Code',r=>r.c),F('Center Name',r=>cc(r).name),F('City',r=>cc(r).city),F('State',r=>cc(r).state),C('RM Name','$rm',r=>asg(p,r.c).rm),F('AM ID',r=>asg(p,r.c).amId),C('AM Name','$am',r=>asg(p,r.c).am),F('Vendor Name',r=>vcOf(cc(r)).holder||''),F('VM Name',r=>cc(r).zm||''),F('ACH Name & No',r=>cc(r).ch||''),C('CSUP Name / Number','csup',r=>asg(p,r.c).csup),C('DR Name & No','dr',r=>asg(p,r.c).dr)];
}
function mockCols(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], YN=['Yes','No'], sp=[]; for(let i=1;i<=12;i++) sp.push(mm('Sent','ms'+i),mm('Received','mr'+i));
  return [...baseCols(p,cm),mm('Material Status','mat',['Pending','Delivered','Partial']),F('Total Opr',r=>r.x.all),F('VC NAME',r=>vcOf(cc(r)).vname||''),mm('RE Mock Status','rms'),F('Supervisor Name / No',r=>CTX.sup.get(r.c)||''),mm('Mock Date By Client','mdc'),mm('Mock Time By Client','mtc'),mm('Mock Person Name','mpname'),mm('Mock Person Number','mpn'),mm('Mock Calling Confirmation','mcc',CALLS),mm('Reaching Time on Mock','rtm'),mm('Remarks','rem'),mm('Fri Vendor','fv'),mm('OPS View Selfie Upload','ovs',YN),mm('OPS View Mock Report','ovm',YN),mm('Final Mock','fm'),mm('Mock Attendance','ma',YN),mm('Mock Report','mrp',YN),mm('Biometric Counter Location Identify','bcl',YN),mm('Location Photo Received','lpr',YN),mm('WIFI Availability Status','wifi',YN),mm('Center Issues','ci'),mm('Remarks for Center issues','cir'),mm('Mock Confirmed from CSUP / Observer','mcs'),mm('Mock Confirmation Remarks','mcr'),mm('Remarks (if any)','rem2'),...sp,mm('FRI RM','frm'),mm('Fri Material Status','fms'),F('Exam Date',r=>dayLbl(p,0)),F('Exam Dates',r=>r.x.days.map((_,d)=>dayLbl(p,d)).join(', ')),mm('CSO Vendor','csv'),mm('CSO RM','csrm'),mm('Distance','dist'),mm('FAQ Count','faq'),mm('REMOCK Status','rmk')];
}
function examCols(p,cm){
  const cc=r=>cm.get(r.c)||{}, F=(h,fn)=>[h,null,fn], YN=['Yes','No'], csr=[];
  const ops=r=>{ const a=[]; for(let n=1;n<=r.m;n++){ const v=CTX.oc[r.c+'|'+r.d+'|'+n]; if(v&&(v.name||v.num)) a.push((v.name||'')+(v.num?'-'+v.num:'')); } return a.join(', '); };
  Array.from({length:Math.max(3,+p.shifts||0)},(_,i)=>i+1).forEach(i=>csr.push(mm('CSR S'+i,'csr'+i),mm('CSR Remarks S'+i,'csrr'+i)));
  return [...baseCols(p,cm),F('JCO RM',r=>svcRM(p,'CSO',r.c)),F('JCO Name & No',r=>svcOps(p,'CSO',r.c,r.d)),F('VC Name',r=>vcOf(cc(r)).vname||''),F('FRI RM',r=>svcRM(p,'Frisking',r.c)),F('FRI Name & NO',r=>svcOps(p,'Frisking',r.c,r.d)),F('Fri Vendor',r=>svcVendor(p,'Frisking',r.c)),F('Bio RM',r=>svcRM(p,'Biometric',r.c)),F('Bio Name & No',r=>svcOps(p,'Biometric',r.c,r.d)),F('Supervisor Name & Number',r=>CTX.sup.get(r.c)||''),F('Opr Name & No 1',ops),F('Exam Date',r=>dayLbl(p,r.d)),F('Shift',r=>Array.from({length:+p.shifts||1},(_,i)=>candAt(cc(r),r.d,i)>0?'S'+(i+1):'').filter(Boolean).join(',')||'S1'),F('Total Shift',r=>Array.from({length:+p.shifts||1},(_,i)=>candAt(cc(r),r.d,i)).filter(n=>n>0).length||1),mm('AI ETA','ae1'),F('Total Operator',r=>r.m),mm('ETA','eta'),mm('Manpower Reached','mpr'),F('Bio OP Difference (Pending/Partial/Completed)',bodOf),mm('AI ETA','ae2'),mm('AI Principal Confirmation','apc'),mm('M Reached FRI','mrf'),mm('F Reached FRI','frf'),mm('Crowd/Baggage','cb'),mm('CSO Reached','csor'),mm('Bio OP Reached By CSO','bor'),F('TAB',r=>r.x.tab),F('FPS',r=>r.x.fps),F('IRIS',r=>r.x.iris),F('OTG',r=>r.x.otg),F('Hologram',r=>r.x.holo),F('ID CARD',r=>r.x.id),mm('Startek','stk'),mm('Lan Connector','lan'),mm('CCTV Cam Count','cctv'),...csr,mm('CSR Remarks','csrr'),mm('Center Issues Highlighted During exam','cih'),mm('Actual Time (Manual Time 1st)','at1'),mm('Actual Time (Manual Time Last)','at2'),mm('Exit Selfie','exs',YN),mm('Exam Code','exc'),mm('Username','usr'),mm('Password','pwd'),mm('AI ETA URL','aeu'),mm('Time Stamp 1','ts1'),mm('Time Stamp 2','ts2'),F('Supervisor no.',r=>(CTX.sup.get(r.c)||'').split(' - ')[1]||''),mm('AI ETA Status','aes'),mm('OP Profile','opp'),mm('Opsview Status Total Task','ost'),mm('Opsview Status Task Done','osd')];
}


let COLLECT=null, GG={};
/* ---------- [14.3] column freezing: chosen by the user, off by default ---------- */
let FREEZE=(()=>{ try{ return Math.min(10,Math.max(0,+localStorage.getItem('xc_freeze')||0)); }catch(e){ return 0; } })();
const fz=j=>j<FREEZE?'fz fz'+j:'';
function setFreeze(v){ FREEZE=Math.min(10,Math.max(0,+v||0)); try{ localStorage.setItem('xc_freeze',FREEZE); }catch(e){} render(); }
const freezeCtl=()=>`<label class="frz">Freeze columns<select onchange="setFreeze(this.value)" aria-label="Freeze columns">${[[0,'None'],...Array.from({length:10},(_,i)=>[i+1,'First '+(i+1)])].map(([n,l])=>`<option value="${n}" ${n===FREEZE?'selected':''}>${l}</option>`).join('')}</select></label>`;

/* ---------- [14.4] column filters: a funnel icon in each header opens a searchable list of values ---------- */
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
const fmatch=(f,v)=>Array.isArray(f)?f.includes(String(v)):String(v)===f;   // a filter is one value or a list of values
function openFilter(ev,m,j,kind,fn,pg){
  ev.stopPropagation(); const btn=ev.currentTarget, had=$('#fpop'), id=m+j; closeFilter(); if(had&&had.dataset.k===id) return;
  const vals=filterVals(kind,j), c0=FSTATE(m)[j], sel=new Set(Array.isArray(c0)?c0:(c0?[c0]:[])), pop=document.createElement('div'); pop.id='fpop'; pop.dataset.k=id;
  pop.innerHTML='<input type="search" placeholder="Search values" aria-label="Search values"><div class="fbar"><button type="button" data-a="all">Select shown</button><button type="button" data-a="none">Clear</button></div><div class="fl"></div><div class="ffoot"><button type="button" class="btn ghost sm" data-a="cancel">Cancel</button><button type="button" class="btn or sm" data-a="apply">Apply</button></div>'; document.body.appendChild(pop);
  const list=pop.querySelector('.fl'), q=pop.querySelector('input'); let shown=[];
  const draw=()=>{ const s=q.value.trim().toLowerCase(); shown=vals.filter(x=>!s||x.toLowerCase().includes(s));
    list.innerHTML=shown.map(x=>`<label><input type="checkbox" value="${esc(x)}" ${sel.has(x)?'checked':''}><span>${esc(x)}</span></label>`).join('')||'<div class="fe">No matching values</div>'; };
  list.onchange=e=>{ const c=e.target; if(c.type!=='checkbox') return; if(c.checked) sel.add(c.value); else sel.delete(c.value); };
  pop.onclick=e=>{ const b=e.target.closest('button[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='all'){ shown.forEach(x=>sel.add(x)); draw(); } else if(a==='none'){ sel.clear(); draw(); } else if(a==='cancel') closeFilter();
    else { const arr=[...sel]; closeFilter(); FSTATE(m)[j]=arr.length?arr:''; btn.classList.toggle('on',!!arr.length); new Function(pg+'=0;'+fn)(); } };
  q.oninput=draw; draw();
  const r=btn.getBoundingClientRect(); pop.style.left=Math.max(8,Math.min(r.left,innerWidth-268))+'px'; pop.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-420))+'px';
  FPH=e=>{ if(!pop.contains(e.target)&&!(e.target.closest&&e.target.closest('.fbtn'))) closeFilter(); };
  document.addEventListener('mousedown',FPH,true); window.addEventListener('scroll',FPH,true); q.focus();
}
/* ===== [14.5] Reporting cards, TV Data Download, automatic manpower status ===== */
const NUM=v=>+v||0, BLANK=v=>v===undefined||v==='';
const bodOf=r=>BLANK(r.mpr)?'Pending':(NUM(r.mpr)>=r.m?'Completed':'Partial');   // reached count blank: Pending; below the operators needed: Partial; equal or more: Completed
const CARDS={
  'Operator Calling':[['Operator name filled',r=>r.name],['Calling: Going',r=>r.bcs==='Going'],['Selfie received',r=>r.selfie==='Yes'],['Aadhar valid',r=>r.aadv==='Valid'],['Training video watched',r=>r.tvw==='Yes'],['Final status filled',r=>r.fin]],
  'Mock Calling':[['Mock calling confirmed',r=>r.mcc==='Going'],['Material delivered',r=>r.mat==='Delivered'],['Mock attendance',r=>r.ma==='Yes'],['Location photo received',r=>r.lpr==='Yes'],['WIFI available',r=>r.wifi==='Yes'],['Final mock filled',r=>r.fm]],
  'TV Data Download Calling':[['Data download complete',r=>!BLANK(r.dd)&&NUM(r.dd)>=r.x.all],['Transactions complete',r=>!BLANK(r.trd)&&NUM(r.trd)>=r.x.all],['Unique devices OK',r=>!BLANK(r.ub)&&NUM(r.ub)>=r.x.all],['ID received',r=>r.idr==='Yes'],['Jacket received',r=>r.jkr==='Yes'],['Training video received',r=>r.tvr]],
  'Exam day Calling':[['Manpower complete',r=>bodOf(r)==='Completed'],['Manpower partial',r=>bodOf(r)==='Partial'],['Manpower pending',r=>bodOf(r)==='Pending'],['Principal confirmed',r=>r.apc],['CSO reached',r=>r.csor],['Exit selfie',r=>r.exs==='Yes'],['Issues highlighted',r=>r.cih]]
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


/* Saved row keys: Operator Calling is center|day|n (one row per operator per exam date) and Exam day Calling is center|day (one row per center per date).
   Older layouts are converted once on load: center|n is copied to every exam date, and center|day|S1 is merged into center|day. */
function migrateOpc(){ let ch=false;
  Object.keys(db.opc||{}).forEach(sk=>{ const st=db.opc[sk], pr=getP(sk.split('|')[0]);
    if(/\|Operator Calling$/.test(sk)){ const nd=pr?projDays(pr):1;
      Object.keys(st).forEach(k=>{ const m=k.match(/^(.+)\|(\d+)$/); if(!m) return; for(let d=0;d<nd;d++){ const nk=`${m[1]}|${d}|${m[2]}`; if(!st[nk]) st[nk]={...st[k]}; } delete st[k]; ch=true; }); }
    else if(/\|Exam day Calling$/.test(sk)){
      Object.keys(st).forEach(k=>{ const m=k.match(/^(.+)\|(\d+)\|S(\d+)$/); if(!m) return; const nk=`${m[1]}|${m[2]}`; if(!st[nk]) st[nk]=st[k]; else Object.keys(st[k]).forEach(f=>{ if(st[nk][f]===undefined||st[nk][f]==='') st[nk][f]=st[k][f]; }); delete st[k]; ch=true; }); } });
  if(ch) save(); }

/* ===== [14.6] SeQRView status (read only, live) =====
   Numbers typed in Operator Calling (Biometric / Frisking Operator Number, SeqView Number) are looked up on the SeQRView
   portal through the seqrview-lookup function, by their last 10 digits. Nothing is stored and nothing is sent to SeQRView. */
const SQC={}, SQT={}, SQSTAGE={PROFILE_COMPLETED:'Onboarded',KYC_COMPLETED:'KYC Done',KYC_STARTED:'KYC Started',FR_STARTED:'FR Started',FR_COMPLETED:'FR Done',INITIATED:'Initiated',MOBILE_VERIFIED:'Mobile Verified'};
const sqStage=c=>SQSTAGE[c]||String(c||'').toLowerCase().replace(/_/g,' ').replace(/^./,x=>x.toUpperCase());
const last10=v=>String(v||'').replace(/\D/g,'').slice(-10);
const sqOf=r=>SQC[last10(r.num)]||SQC[last10(r.sqn)]||null;
const SQMAP={sqname:q=>q.name, sqo:q=>sqStage(q.stage), onb:q=>q.app_status, age:q=>q.age, sqst:q=>sqStage(q.stage), sqon:q=>q.onboarded_on};   // columns filled from SeQRView
function sqv(k,r){ if(S.otab!=='Operator Calling'||!SQMAP[k[1]]) return null; const q=sqOf(r); if(!q) return null; const v=SQMAP[k[1]](q); return (v===undefined||v===null||v==='')?null:v; }
let SQBUSY=false, SQFAIL=false;
function sqStatus(r){ const a=last10(r.num), b=last10(r.sqn); if(a.length<10&&b.length<10) return ''; const q=sqOf(r); if(q) return sqStage(q.stage)||'Found'; if(a in SQC||b in SQC) return 'Not in SeQRView'; return SQFAIL?'Lookup unavailable':'Checking...'; }
async function sqLookup(rows){
  const now=Date.now();   // a number is checked again 5 minutes after its last check; the old value stays on screen meanwhile
  const need=[...new Set(rows.flatMap(r=>[last10(r.num),last10(r.sqn)]).filter(n=>n.length===10&&(!(n in SQC)||now-(SQT[n]||0)>300000)))];
  if(!need.length||SQBUSY) return; SQBUSY=true;
  try{
    for(let i=0;i<need.length;i+=20){
      const part=need.slice(i,i+20), {data,error}=await sb.functions.invoke('seqrview-lookup',{body:{mobiles:part}}); if(error) throw error;
      const res=(data&&data.results)||{};
      part.forEach(m=>{ const q=res[m]; if(q&&q.error) return; SQC[m]=q||null; SQT[m]=now; });
    }
    SQFAIL=false;
  }catch(e){ console.warn('SeQRView lookup failed: '+e.message); SQFAIL=true; SQBUSY=false; if(S.otab==='Operator Calling') render(); return; }
  SQBUSY=false; sqStore(rows); if(S.otab==='Operator Calling') render();
}
/* The values fetched from SeQRView are saved into the row (and so into the database), not only shown. */
function sqStore(rows){
  const p=getP(S.pid); if(!p||S.otab!=='Operator Calling') return; const o=(db.opc=db.opc||{}), st=(o[opK(p)]=o[opK(p)]||{}); let ch=false;
  rows.forEach(r=>{ if(!r.k) return; const a=last10(r.num), b=last10(r.sqn); if(a.length<10&&b.length<10) return; const q=sqOf(r), cur=st[r.k]||{};
    const want=q?{sqname:q.name,sqo:sqStage(q.stage),onb:q.app_status,age:q.age,sqst:sqStage(q.stage),sqon:q.onboarded_on}:((a in SQC||b in SQC)?{sqst:'Not in SeQRView'}:{});
    Object.keys(want).forEach(k=>{ const v=want[k]; if(v===undefined||v===null||v==='') return; if(String(cur[k]??'')!==String(v)){ (st[r.k]=st[r.k]||{})[k]=String(v); ch=true; } }); });
  if(ch) save();
}

/* ---- [14.7] Exam day Calling: RM and operator of the other services (JCO = CSO, Frisking, Biometric) come from their own sheets ----
   The same centre is found in the other service's centre list by its code (0101 and 101 are the same centre). */
const normC=c=>String(c??'').trim().replace(/^0+(?=\d)/,'').toUpperCase();
function svcCenter(p,svc,code){ const l=((db.sheets||{})[p.code]||{})[svc]||[]; return l.find(c=>c.code===code)||l.find(c=>normC(c.code)===normC(code))||null; }
function svcRM(p,svc,code){ const c=svcCenter(p,svc,code); if(!c) return ''; const a=(((db.assign||{})[p.code])||{})[c.code]||{}; return (a.rmN!==undefined&&!a.rm)?a.rmN:((db.employees.find(e=>e.id===a.rm)||{}).name||''); }
function svcVendor(p,svc,code){ const c=svcCenter(p,svc,code); return c?vcLabel(c):''; }
function svcOps(p,svc,code,d){
  const c=svcCenter(p,svc,code); if(!c) return ''; const st=((db.opc||{})[p.code+'|'+svc+'|Operator Calling'])||{}, a=[];
  Object.keys(st).forEach(k=>{ const x=k.split('|'); if(x[0]===c.code&&+x[1]===d&&st[k]&&(st[k].name||st[k].num)) a.push([+x[2],(st[k].name||'')+(st[k].num?'-'+st[k].num:'')]); });
  return a.sort((u,v)=>u[0]-v[0]).map(x=>x[1]).join(', ');
}
