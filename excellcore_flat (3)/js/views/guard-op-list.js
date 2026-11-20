/* ===== Copy project details, operator bulk upload, Guard List and OP List ===== */
function dl(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
function copyDet(code,kind){
  const p=getP(code), rows=detRows(p);
  const html=`<html><head><meta charset="utf-8"><title>${esc(p.name||p.code)}</title></head><body style="font-family:Arial"><h2>${esc(p.name||p.code)}</h2><table border="1" cellpadding="6" style="border-collapse:collapse">${rows.map(([l,v])=>`<tr><td><b>${esc(l)}</b></td><td>${esc(v).replace(/\n/g,'<br>')}</td></tr>`).join('')}</table></body></html>`;
  if(kind==='doc') return dl(new Blob([html],{type:'application/msword'}),p.code+'_details.doc');
  if(kind==='pdf'){ const w=window.open('','_blank'); if(!w) return toast('Allow pop-ups, then choose Save as PDF in the print window.',true); w.document.write(html+'<script>onload=function(){print()}<\/script>'); w.document.close(); return; }
  const cv=document.createElement('canvas'), ctx=cv.getContext('2d'), W=900, pad=24, lw=260; ctx.font='14px sans-serif';
  const wrap=(t,mw)=>{ const out=[]; String(t).split('\n').forEach(par=>{ let line=''; par.split(' ').forEach(wd=>{ const tt=line?line+' '+wd:wd; if(ctx.measureText(tt).width>mw&&line){ out.push(line); line=wd; } else line=tt; }); out.push(line); }); return out; };
  const L=rows.map(([l,v])=>[l,wrap(v,W-lw-pad*2-10)]), H=pad*2+40+L.reduce((a,[,ls])=>a+Math.max(1,ls.length)*20+12,0);
  cv.width=W; cv.height=H; ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#1a237e'; ctx.font='bold 18px sans-serif'; ctx.fillText(p.name||p.code,pad,pad+8);
  let y=pad+40; ctx.font='14px sans-serif';
  L.forEach(([l,ls])=>{ ctx.fillStyle='#555'; ctx.fillText(l,pad,y+14); ctx.fillStyle='#111'; ls.forEach((t,i)=>ctx.fillText(t,pad+lw,y+14+i*20)); const h=Math.max(1,ls.length)*20+12; ctx.strokeStyle='#e3e6ee'; ctx.beginPath(); ctx.moveTo(pad,y+h-2); ctx.lineTo(W-pad,y+h-2); ctx.stroke(); y+=h; });
  cv.toBlob(async b=>{ try{ await navigator.clipboard.write([new ClipboardItem({'image/png':b})]); toast('Project details copied as an image.'); }catch(e){ dl(b,p.code+'_details.png'); toast('Clipboard not available, so the image was downloaded.'); } });
}
function uploadOpBulk(){ readRows('obfile',rows=>{
  const p=getP(S.pid), cm=cmapOf(p), key=p.code+'|'+curSvc(p)+'|Operator Calling', nd=projDays(p);
  const rmE=db.employees.filter(e=>['Regional Manager','RM','Sr AM'].includes(e.role)&&e.status!=='Inactive'), amE=db.employees.filter(e=>['Area Manager','AM','Sr AM'].includes(e.role)&&e.status!=='Inactive');
  const iso=d=>new Date(new Date(p.start).getTime()+d*864e5).toISOString().slice(0,10);
  const dayOf=v=>{ if(v===undefined||v==='') return -1; let t=String(v).trim(); if(/^\d{5}$/.test(t)) t=new Date(Math.round((+t-25569)*864e5)).toISOString().slice(0,10); for(let d=0;d<nd;d++) if(t===iso(d)||t.toLowerCase()===dayLbl(p,d).toLowerCase()) return d; return -2; };
  db.opc=db.opc||{}; const st=(db.opc[key]=db.opc[key]||{}); db.assign=db.assign||{}; const as=(db.assign[p.code]=db.assign[p.code]||{}), cnt={}; let ok=0,nc=0,nrm=0,nam=0,nbd=0;
  rows.forEach(r=>{
    const c=T(r['Center Code']); if(!cm.get(c)){ nc++; return; }
    const rn=T(r['RM Name']), an=T(r['AM Name']), a=(as[c]=as[c]||{});
    if(rn){ const e=rmE.find(x=>x.name.toLowerCase()===rn.toLowerCase()); if(e){ a.rm=e.id; delete a.rmN; } else nrm++; }
    if(an){ const e=amE.find(x=>x.name.toLowerCase()===an.toLowerCase()); if(e){ a.am=e.id; a.amId=e.id; } else nam++; }
    const nm=T(r['Biometric Operator Name']), no=T(r['Biometric Operator Number']), ad=T(r['Aadhar Card No.']??r['Aadhar card No.']);
    if(!(nm||no||ad)) return;
    cnt[c]=(cnt[c]||0)+1; const n=+r['OP #']||cnt[c], dd=dayOf(r['Exam Date']); if(dd===-2){ nbd++; return; }
    (dd>=0?[dd]:Array.from({length:nd},(_,d)=>d)).forEach(d=>{ const k=`${c}|${d}|${n}`, o=(st[k]=st[k]||{}); if(nm) o.name=nm; if(no) o.num=no; if(ad) o.aad=ad; }); ok++; });
  save(); toast(`${ok} operator rows saved. Not found - centers: ${nc}, RM: ${nrm}, AM: ${nam}; bad dates: ${nbd}`,!!(nc||nrm||nam||nbd)); render(); }); }
const splitNN=s=>{ const m=String(s||'').match(/^(.*?)[\s\-–:,]*([+\d][\d\s-]{7,})$/); return m?[m[1].trim(),m[2].replace(/\D/g,'')]:[String(s||'').trim(),'']; };
const pct=(n,d)=>d?(n*100/d).toFixed(2)+'%':'0.00%', mx0=(a,b)=>Math.max(0,a-b), NM=v=>+v||0;
function groupRows(p,svc){
  const S0=S.svc; S.svc=svc;
  try{
    const g=new Map(), O=db.opc||{}, st=O[p.code+'|'+svc+'|Operator Calling']||{}, mk=O[p.code+'|'+svc+'|Mock Calling']||{}, tv=O[p.code+'|'+svc+'|TV Data Download Calling']||{}, sheetKey=p.code+'|'+svc;
    lst(p).forEach(c=>{ const k=[c.state||'',c.city||'',c.vc||''].join('|'); let o=g.get(k); if(!o){ o={k,state:c.state||'',city:c.city||'',vc:c.vc||'',centers:[]}; g.set(k,o); } o.centers.push(c); });
    return [...g.values()].map(o=>{
      const a={tc:o.centers.length,man:0,rec:0,sup:0,opr:0,going:0,rej:0,nc:0,hconf:0,sqo:0,sqd:[],mock:0,dev:0,dd:0,tr:0,less:0,done:0,need:[]};
      o.centers.forEach(c=>{ const x=calcCenter(p,c); a.man+=x.all;
        x.days.forEach((dy,d)=>{ a.need[d]=(a.need[d]||0)+dy.m; for(let n=1;n<=dy.m;n++){ const r=st[`${c.code}|${d}|${n}`]; if(!r) continue;
          if(r.name){ a.rec++; if(r.des==='Supervisor') a.sup++; else a.opr++; }
          if(r.bcs){ a.done++; if(r.bcs==='Going'){ a.going++; if(r.des==='Supervisor') a.hconf++; } else if(r.bcs==='Denied to work') a.rej++; else if(['Not Connected','Switch off','Wrong Number'].includes(r.bcs)) a.nc++; }
          if(r.sqo){ a.sqo++; a.sqd[d]=(a.sqd[d]||0)+1; } } });
        if((mk[c.code]||{}).ma==='Yes') a.mock++; const t=tv[c.code]||{}; a.dev+=NM(t.dev); a.dd+=NM(t.dd); a.tr+=NM(t.trd); if(t.dd!==undefined&&t.dd!=='') a.less+=mx0(x.all,NM(t.dd)); });
      const f0=o.centers[0]||{}, v=(db.vcm||[]).find(x=>x.code===o.vc)||{}, ch=splitNN((o.centers.find(c=>c.ch)||{}).ch), as=((db.assign||{})[p.code]||{})[f0.code]||{}, emp=id=>db.employees.find(e=>e.id===id)||{};
      const row={...o,a,svc,sk:sheetKey,vname:v.holder||'',vcn:v.vname||'',vnum:(o.centers.find(c=>c.contact)||{}).contact||'',vm:(o.centers.find(c=>c.zm)||{}).zm||'',chn:ch[0],chno:ch[1],
        pm:((p.pmBy||{})[svc]||[]).map(id=>emp(id).name||id).join(', '),rmId:as.rm||'',amId2:as.am||'',...((O[sheetKey+'|'+S.gs]||{})[o.k]||{})};
      row.$rm=emp(row.rmId).name||''; row.$am=emp(row.amId2).name||''; return row; });
  } finally { S.svc=S0; }
}
let GRPC={cols:[],rows:[],store:''};
const rmEmps=()=>db.employees.filter(e=>['Regional Manager','RM','Sr AM'].includes(e.role)&&e.status!=='Inactive'), amEmps=()=>db.employees.filter(e=>['Area Manager','AM','Sr AM'].includes(e.role)&&e.status!=='Inactive');
function grpCols(kind){
  let n=0; const m=(h,o)=>[h,'g'+(n++),o], f=(h,fn)=>[h,null,fn], A=r=>r.a, emp=id=>db.employees.find(e=>e.id===id)||{};
  const rm=['RM Name','$rm'], am=['AM Name','$am'];
  const amF=(h,k)=>f(h,r=>emp(r.amId2)[k]||'');
  const common=[f('State',r=>r.state),f('City',r=>r.city),f('Vendor Name',r=>r.vname),f('Vendor Number',r=>r.vnum)];
  if(kind==='guard') return [...common,f('VM Name',r=>r.vm),f('City Head Name',r=>r.chn),f('City head Number',r=>r.chno),f('Total Center',r=>A(r).tc),f('Total Manpower',r=>A(r).man),
    f('H G Pending',r=>mx0(NM(r.hvm)||A(r).tc,A(r).sup)),f('All G Pending',r=>mx0(NM(r.gvm)||A(r).man,A(r).rec)),['Total H Guard as per VM','hvm'],['Total Guard as per VM','gvm'],
    f('Total Head Guards Recieved',r=>A(r).sup),f('Total Guards Recieved',r=>A(r).rec),f('Pending Head Guards',r=>mx0(NM(r.hvm)||A(r).tc,A(r).sup)),f('Pending Guards',r=>mx0(NM(r.gvm)||A(r).man,A(r).rec)),
    m('H Guards - Google Sheet'),m('Guards Google Sheet'),m('H Guards pending - as per Google Sheet'),m('Guards Pending As per Google Sheet'),
    f('Pending Guards (%)',r=>pct(mx0(NM(r.gvm)||A(r).man,A(r).rec),NM(r.gvm)||A(r).man)),f('H Guard Confirmed',r=>A(r).hconf),f('Going',r=>A(r).going),f('Reject',r=>A(r).rej),f('Not Connect',r=>A(r).nc),f('Calling Pending',r=>mx0(A(r).rec,A(r).done)),
    f('SeqrView Onboard',r=>A(r).sqo),m('List Status'),m('Vendor rating'),m('Uniform Status'),m('Mail Status'),f('PM Name',r=>r.pm),m('AM Mapping'),rm,['AM ID','$amid'],am,amF('AM Number','contact'),amF('AM Email','email'),
    m('Experience/Fresher',['Experience','Fresher']),f('Mock Done',r=>A(r).mock),f('Pending Mock',r=>mx0(A(r).tc,A(r).mock)),f('Pending Mock %',r=>pct(mx0(A(r).tc,A(r).mock),A(r).tc)),
    ...['Mock Issues With Vendor','Mock Date','Remarks','GP Remarks','CSR Consignee Name','CSR Consignee Contact No.','ADDRESS / WITH PIN CODE','PIN CODE','Ready for Dispatch','Docate Number','CSR Status','Handover Audit Date','Uniform Remarks','Training Video Recieved','Training Video Date','Head Guard Count','Frisking Done Sticker Delivery','Frisking Done Sticker Delivery Status RM','Distribution Status','Other Remarks - Distribution','Group Created','Deduction Shared','Deduction Remarks Others','Final Deduction Remarks','Final Deduction Remarks Others','Max Guard List','PM Remarks','Age Less Than 18','Vendor Email','ACH Email'].map(h=>m(h)),
    f('SeqrView Onboard %',r=>pct(A(r).sqo,A(r).rec)),...Array.from({length:Math.min(+curP.days||4,8)},(_,d)=>f('SeqrView Onboard Day'+(d+1),r=>A(r).sqd[d]||0)),m('Super viser No Saved'),m('City Head No Saved'),m('Intraactive Video')];
  return [...common,f('VC Name',r=>r.vcn),f('VM Name',r=>r.vm),f('City head Name',r=>r.chn),f('City head Number',r=>r.chno),f('Days Total Center',r=>A(r).tc),f('Max All Days',r=>A(r).man),
    ...Array.from({length:Math.min(+curP.days||4,8)},(_,d)=>f(dayLbl(curP,d),r=>A(r).need[d]||0)),
    f('SUP Pending As per VM',r=>mx0(NM(r.svm)||A(r).tc,A(r).sup)),f('OP Pending As per VM',r=>mx0(NM(r.ovm)||A(r).man,A(r).opr)),f('SeqrView Onboard',r=>A(r).sqo),['Total Supervisor as per VM','svm'],['Total OP as per VM','ovm'],
    f('Total Supervisor Received',r=>A(r).sup),f('Total OP Received',r=>A(r).opr),f('Pending Supervisor',r=>mx0(NM(r.svm)||A(r).tc,A(r).sup)),f('Pending OP',r=>mx0(NM(r.ovm)||A(r).man,A(r).opr)),
    m('Supervisor Google Sheet'),m('OP Google Sheet'),m('Supervisor pending - as per Google Sheet'),m('OP Pending As per Google Sheet'),f('Supervisor Confirmed',r=>A(r).hconf),f('Going',r=>A(r).going),f('Reject',r=>A(r).rej),f('Not Connect',r=>A(r).nc),f('Calling/ Mnp Pending',r=>mx0(A(r).rec,A(r).done)),
    f('Pending %',r=>pct(mx0(NM(r.ovm)||A(r).man,A(r).opr),NM(r.ovm)||A(r).man)),f('# Device',r=>A(r).dev),f('# Devices Data Download',r=>A(r).dd),f('# Pending Download',r=>mx0(A(r).dev,A(r).dd)),f('# Devices Transaction Done',r=>A(r).tr),f('# Pending Transaction',r=>mx0(A(r).dev,A(r).tr)),f('Less Than OP',r=>A(r).less),
    m('Center with 0 Login'),f('Total Calling Done',r=>A(r).done),f('Total Calling Pending',r=>mx0(A(r).rec,A(r).done)),m('Operator List Status'),m('Remarks'),f('PM Name',r=>r.pm),m('RM Mapping'),m('AM Mapping'),rm,['AM ID','$amid'],am,amF('AM Number','contact'),amF('AM Email','email'),
    m('Experience/Fresher',['Experience','Fresher']),m('Group Created'),f('Mock Done',r=>A(r).mock),f('Pending Mock',r=>mx0(A(r).tc,A(r).mock)),f('Pending Mock %',r=>pct(mx0(A(r).tc,A(r).mock),A(r).tc)),
    ...['Mock Date','Mock Time / Remarks','Device Distribution','Device distribution Remarks','Training date','Training Time / Remarks','CSR Consignee Name','CSR Consignee Contact No.','ADDRESS / WITH PIN CODE','PIN CODE','Ready for Dispatch','DOCKET NUMBER','CSR Status','Handover Audit Date','Max Op List Received','Manpower details received on time','Replacement provided','Mock Rating','Manpower training done','Unique OP profiles / Center','Device Damages / Losses / delays','Over all Rating','Vendor Email','ACH Email'].map(h=>m(h)),
    f('SeqrView Onboard %',r=>pct(A(r).sqo,A(r).rec)),...Array.from({length:Math.min(+curP.days||4,8)},(_,d)=>f('SeqrView Onboard Day'+(d+1),r=>A(r).sqd[d]||0)),m('Age < 18')];
}
let curP=null;
function grpView(sheet,svc,title){
  const p=getP(S.pid); S.gs=sheet; curP=p?{...p,days:p?projDays(p):4}:null;
  const head=`<h2>${title}</h2><div class="card"><div class="row">${pSel(db.projects,"S.pid=this.value;GG={};render()")}<button class="btn ghost" onclick="quickLinks('vendor','${svc}')">Quick links</button></div></div>`;
  if(!p) return head+'<div class="empty">Select a project.</div>';
  if(!p.services.includes(svc)) return head+`<div class="empty">This project does not have the ${svc} service.</div>`;
  const rows=groupRows(p,svc), cols=grpCols(sheet==='Guard List'?'guard':'op'), store=p.code+'|'+svc+'|'+sheet;
  rows.forEach(r=>{ r.$amid=r.amId2; });
  GRPC={cols,rows,store,p,svc};
  const act=Object.keys(GG).filter(k=>GG[k]), vis=rows.filter(r=>act.every(j=>cols[j]&&fmatch(GG[j],opVal(cols[j],r))));
  const ro=!canAllocate();   // PM / RM / AM: view only on the vendor sheets
  const cell=(k,r)=>{ if(!k[1]) return esc(k[2](r)); if(k[1]==='$amid') return esc(r.amId2);
    if(ro){ if(k[1]==='$rm') return esc(((db.employees.find(e=>e.id===r.rmId))||{}).name||''); if(k[1]==='$am') return esc(((db.employees.find(e=>e.id===r.amId2))||{}).name||''); return esc(r[k[1]]||''); }
    if(k[1]==='$rm'||k[1]==='$am'){ const isR=k[1]==='$rm', cur=isR?r.rmId:r.amId2, L=isR?rmEmps():amEmps(); return `<select data-k="${esc(r.k)}" onchange="setGrpRM(this,'${isR?'rm':'am'}')"><option value=""></option>${L.map(e=>`<option value="${esc(e.id)}" ${e.id===cur?'selected':''}>${esc(e.name)}</option>`).join('')}</select>`; }
    const v=r[k[1]]||''; return Array.isArray(k[2])?`<select data-k="${esc(r.k)}" onchange="setGrp(this,'${k[1]}')"><option value=""></option>${k[2].map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input data-k="${esc(r.k)}" value="${esc(v)}" onchange="setGrp(this,'${k[1]}')">`; };
  const cards=cardsHtml([['Vendors with nothing pending',vis.filter(r=>mx0(NM(r.gvm||r.ovm)||r.a.man,r.a.rec)===0).length],['Mock complete',vis.filter(r=>r.a.tc&&r.a.mock>=r.a.tc).length],['SeqrView fully onboarded',vis.filter(r=>r.a.rec&&r.a.sqo>=r.a.rec).length],['Calling done',vis.filter(r=>r.a.rec&&r.a.done>=r.a.rec).length]],vis.length);
  return head+`<div class="card"><p class="lead" style="margin-top:0">One row per state, city and vendor. Counts come from the ${svc} center list, Operator Calling, Mock Calling and TV Data Download. RM and AM chosen here also show in the Operations sheets.</p>${cards}<div class="row" style="margin-bottom:12px"><button class="btn ghost" onclick="GG={};render()">Clear filters</button><button class="btn ghost" onclick="grpExport()">Export to Excel</button>${freezeCtl()}</div><div class="tw"><table><thead><tr>${cols.map((k,j)=>`<th class="${fz(j)}">${fth(k[0],j,'GG','grp','render()','GP')}</th>`).join('')}</tr></thead><tbody>${vis.map(r=>`<tr>${cols.map((k,j)=>`<td class="${fz(j)}" data-label="${esc(k[0])}">${cell(k,r)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="empty">No rows. Upload the ${svc} center list first.</td></tr>`}</tbody></table></div></div>`;
}
const vGlist=()=>grpView('Guard List','Frisking','Guard List'), vOlist=()=>grpView('OP List','Biometric','OP List');
function setGrp(el,k){ const st=((db.opc=db.opc||{})[GRPC.store+'']=db.opc[GRPC.store]||{}), key=el.dataset.k; (st[key]=st[key]||{})[k]=el.value; save(); }
function setGrpRM(el,field){
  const r=GRPC.rows.find(x=>x.k===el.dataset.k); if(!r) return; const as=((db.assign=db.assign||{})[GRPC.p.code]=db.assign[GRPC.p.code]||{});
  r.centers.forEach(c=>{ const a=(as[c.code]=as[c.code]||{}); if(field==='rm'){ a.rm=el.value; delete a.rmN; } else { a.am=el.value; a.amId=el.value; } });
  save(); render();
}
function grpExport(){
  const {cols,rows}=GRPC, act=Object.keys(GG).filter(k=>GG[k]), vis=rows.filter(r=>act.every(j=>fmatch(GG[j],opVal(cols[j],r))));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols.map(k=>k[0]),...vis.map(r=>cols.map(k=>opVal(k,r)))]),S.gs); XLSX.writeFile(wb,GRPC.p.code+'_'+S.gs.replace(/ /g,'_')+'.xlsx');
}
