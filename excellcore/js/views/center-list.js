/* ===== Bio Center List ===== */
let BQ='', BP=0;
const CBASE=['Center Code','Client Code','State','City Name','Center Name','Center Address'];
/* Bio / CSO center lists: these values come from the uploaded file. Nothing is calculated for them. */
const UPCOLS=['Tab','FPS','OTG','Hologram','Id Card','Jacket','IRIS'];
const UPRE=/^(Tab|FPS|OTG|Hologram|Id Card|Jacket|IRIS|Max All Day|OP Count D\d+ S\d+|Max Day D\d+)$/;
const hasIris=p=>p.bioDev==='Both'||/iris/i.test([].concat(p.mode||[],p.modality||[],p.bioDev||'').join(' '));
const projDays=p=>{ if(p.start&&p.end){ const n=Math.round((new Date(p.end)-new Date(p.start))/864e5)+1; if(n>0) return Math.min(n,15); } return Math.min(+p.days||1,15); };
const dayLbl=(p,i)=>p.start?fmtDate(new Date(new Date(p.start).getTime()+i*864e5)):'Day '+(i+1);
const vendorOf=c=>db.vendors.find(v=>v.code===c.vendor)||{};
const getP=code=>db.projects.find(x=>x.code===code);
function candAt(c,d,s){ const v=c.cd&&c.cd[d]&&c.cd[d][s]; return (v!==undefined&&v!=='')?(+v||0):(+(c.cand||[])[s]||0); }
function mfShare(c,d){ const m=String(c['mf'+d]||'50:50').split(/[:/]/).map(Number), a=m[0]||0, b=m[1]||0; return a+b>0?[a/(a+b),b/(a+b)]:[.5,.5]; }
function calcCenter(p,c){
  const sv=curSvc(p), ns=+p.shifts||1, nd=projDays(p), fr=sv==='Frisking', bio=sv==='Biometric';
  const r=bio?+p.opRatio||0:fr?+p.frRatio||0:0, br=+p.bagRatio||0, bag=(p.frServices||[]).includes('Baggage');
  const gd=n=>(n>0&&r>0)?Math.max(1,Math.floor(n/r)):0, eq=m=>Math.floor(m*12/10);   // allotment ratio; equipment +20%
  const days=[]; let all=0,tot=0,maxC=0,mxM=0,mxF=0,mxB=0;
  for(let d=0;d<nd;d++){
    const cs=Array.from({length:ns},(_,i)=>candAt(c,d,i)), cd=cs.reduce((a,b)=>a+b,0); tot+=cd; maxC=Math.max(maxC,cd);
    if(fr){ const g=gd(cd), f0=mfShare(c,d)[1]; let fe=Math.floor(g*f0); if(g>1&&f0>0&&fe===0) fe=1;
      const ma=g-fe, bg=(bag&&br>0&&cd>0)?Math.max(1,Math.floor(cd/br)):0, t=g+bg;
      days.push({s:[],m:t,c:cd,male:ma,female:fe,bag:bg}); all=Math.max(all,t); mxM=Math.max(mxM,ma); mxF=Math.max(mxF,fe); mxB=Math.max(mxB,bg); }
    else { const sh=cs.map(n=>bio?gd(n):1), m=Math.max(0,...sh); all=Math.max(all,m); days.push({s:sh,m,c:cd}); }
  }
  // Values uploaded in the Bio / CSO center list win over the ratio calculation (the calculation stays only as a fallback for older lists)
  const up=(!fr&&c.up)||{}, num=k=>(up[k]===undefined||up[k]===''||up[k]===null)?null:(+up[k]||0);
  if(Object.keys(up).length){
    days.forEach((dy,d)=>{ let hit=false; dy.s=dy.s.map((v,s)=>{ const u=num(`OP Count D${d+1} S${s+1}`); if(u!==null){ hit=true; return u; } return v; });
      const m=num(`Max Day D${d+1}`); if(m!==null) dy.m=m; else if(hit) dy.m=Math.max(0,...dy.s); });
    const ma=num('Max All Day'); all=ma!==null?ma:Math.max(0,...days.map(dy=>dy.m));
  }
  const e=eq(all), ir=hasIris(p), pk=(k,d)=>{ const u=num(k); return u===null?d:u; };
  return {total:tot,days,all,tab:pk('Tab',e),fps:pk('FPS',ir?1:e),otg:pk('OTG',e*2),holo:pk('Hologram',Math.floor(maxC*12/1000)),id:pk('Id Card',e),jkt:pk('Jacket',all),iris:pk('IRIS',ir?e:1),mxM,mxF,mxB};
}
const ZMS=['Chetan','Deven','Girish','Monu'];
let BF={};
const VC_SHEET='1ALgVeX9ui-1DrZTPlNd2ksNuGaRUwxsb-oq4tj3z8Bw';
const vcActive=v=>String(v.status||'Active').trim().toLowerCase()==='active';
const vcList=()=>{ const sv=curSvc(getP(S.pid)).toLowerCase(); return (db.vcm||[]).filter(v=>vcActive(v)&&(!v.service||v.service.toLowerCase().includes(sv))); };
const vcOf=c=>(db.vcm||[]).find(v=>v.code===c.vc)||{};
const T=v=>String(v??'').trim();
function setVCRows(rows){
  const old=new Map((db.vcm||[]).map(v=>[v.code,v]));
  db.vcm=rows.map(r=>({code:T(r['VC Code']??r['Vendor Code']),holder:T(r['Account Holder Name']),gst:T(r['GST No.']),vname:T(r['Vendor Name']),zm:T(r['ZM']),vm:T(r['VM']),service:T(r['Service']),status:T(r['Status'])})).filter(v=>v.code).map(v=>{ const o=old.get(v.code); return o&&o.manual?{...v,status:o.status,manual:true}:v; });
  save(); toast(db.vcm.length+' vendors loaded'); if(S.view==='project'||S.view==='masters') render();
}
async function loadVC(manual){
  try{ const r=await fetch(`https://docs.google.com/spreadsheets/d/${VC_SHEET}/gviz/tq?tqx=out:csv&gid=0`); if(!r.ok) throw 0; const wb=XLSX.read(await r.text(),{type:'string'}); setVCRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); }
  catch(e){ if(manual||!(db.vcm||[]).length) toast('Could not read the Google Sheet. Share it as "Anyone with the link can view", or upload the file in Master Data.',true); }
}
function readRows(id,cb){
  const f=$('#'+id).files[0]; if(!f) return toast('Select a file first.',true);
  const rd=new FileReader(); rd.onload=ev=>{ try{ const wb=XLSX.read(ev.target.result,{type:'array'}); cb(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); }catch(err){ toast('Error: '+err.message,true); } }; rd.readAsArrayBuffer(f);
}
function uploadVC(){ readRows('vcfile',setVCRows); }
function uploadZML(){ readRows('zfile',rows=>{ db.zml=rows.map(r=>({state:T(r['State']),zm:T(r['ZM Name']??r['ZM'])})).filter(r=>r.state&&r.zm); save(); toast(db.zml.length+' ZM rows loaded'); render(); }); }
function uploadVCL(){ readRows('lfile',rows=>{ db.vcl=rows.map(r=>({state:T(r['State']),vc:T(r['VC Code'])})).filter(r=>r.state&&r.vc); save(); toast(db.vcl.length+' VC rows loaded'); render(); }); }
function uploadAlloc(){ readRows('afile',rows=>{
  const p=getP(S.pid), list=lst(p), m=new Map(list.map((c,i)=>[c.code,i])), known=new Set((db.vcm||[]).map(v=>v.code)); let ok=0,nf=0,uv=0,ia=0;
  rows.forEach(r=>{ const j=m.get(T(r['Center Code'])), vc=T(r['VC Code']); if(j===undefined){nf++;return;} const c=list[j];
    if(vc){ const vv=(db.vcm||[]).find(x=>x.code===vc); if(known.size&&!known.has(vc)) uv++; if(vv&&!vcActive(vv)){ ia++; } else c.vc=vc; }
    [['ZM','zm'],['City Head','ch'],['City Head Address','cha'],['Contact Number','contact']].forEach(([h,k])=>{ if(T(r[h])) c[k]=T(r[h]); }); ok++; });
  save(); toast(`${ok} centers mapped, ${nf} center codes not found, ${uv} unknown VC codes, ${ia} skipped (inactive vendor)`,!!(nf||uv||ia)); render(); }); }
function mTpl(k){
  const H={vc:['VC Code','Account Holder Name','GST No.','Vendor Name','ZM','VM','Service','Status'],zm:['State','ZM Name'],vcl:['State','VC Code'],alloc:['Center Code','VC Code','ZM','City Head','City Head Address','Contact Number'],am:['Name','DOJ','Mobile','Email','Aadhar No','Vendor Code','Photo Drive Link'],opb:['Center Code','Exam Date','OP #','RM Name','AM Name','Biometric Operator Name','Biometric Operator Number','Aadhar Card No.'],ppl:['Name','Employee ID','Mobile','Email']}[k];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([H]),'Sheet1'); XLSX.writeFile(wb,k+'_template.xlsx');
}
function mTable(h,rows,st){
  const H=st?[...h,'Status']:h;
  return `<div class="tw" style="max-height:320px"><table><thead><tr>${H.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,200).map((r,ri)=>`<tr>${r.map((v,i)=>`<td data-label="${h[i]}">${esc(v)}</td>`).join('')}${st?`<td data-label="Status">${st[ri]}</td>`:''}</tr>`).join('')||`<tr><td colspan="${H.length}" class="empty">Nothing uploaded yet.</td></tr>`}</tbody></table></div>${rows.length>200?`<p>Showing first 200 of ${rows.length}.</p>`:''}`;
}
const stSel=(kind,key,cur,ed)=>ed?`<select style="width:auto" onchange="setStat('${kind}','${esc(key)}',this.value)">${['Active','Inactive'].map(o=>`<option ${o===(cur||'Active')?'selected':''}>${o}</option>`).join('')}</select>`:esc(cur||'Active');
function setStat(kind,key,v){
  if(kind==='emp'){ const e=db.employees.find(x=>x.id===key); if(e) e.status=v; }
  else { const r=db[kind][+key]; if(r){ r.status=v; r.manual=true; } }
  save(); render();
}
function vMasters(){ if(S.mt==='ppl') return vPeople(); const h=vMastersAll(), i=h.indexOf('<div class="card"><h3>ZM List'); return `<h2>${S.mt==='zvc'?'ZM/VC DB':'Vendor DB'}</h2>`+(S.mt==='zvc'?h.slice(i):h.slice(0,i)); }
function vMastersAll(){
  const ed=canMaster(), vc=db.vcm||[], z=db.zml||[], l=db.vcl||[];
  const up=(id,fn,k)=>ed?`<div class="row" style="margin:10px 0"><input type="file" id="${id}" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="${fn}()">Upload</button><button class="btn ghost" onclick="mTpl('${k}')">Template</button></div>`:'';
  return `<div class="card"><h3>Vendor Master (${vc.length})</h3><p>VC Code, Account Holder Name, GST No., Vendor Name, ZM, VM, Service, Status</p>${up('vcfile','uploadVC','vc')}${ed?'<button class="btn ghost sm" onclick="loadVC(true)">Refresh from Google Sheet</button>':''}${mTable(['VC Code','Account Holder Name','GST No.','Vendor Name','ZM','VM','Service'],vc.map(v=>[v.code,v.holder,v.gst,v.vname,v.zm,v.vm,v.service]),vc.map((v,i)=>stSel('vcm',i,v.status,ed)))}</div>
  <div class="card"><h3>ZM List - state wise (${z.length})</h3>${up('zfile','uploadZML','zm')}${mTable(['State','ZM Name'],z.map(r=>[r.state,r.zm]),z.map((r,i)=>stSel('zml',i,r.status,ed)))}</div>
  <div class="card"><h3>VC List - state wise (${l.length})</h3><p>If a state is listed, the VC Code dropdown for its centers shows only these codes.</p>${up('lfile','uploadVCL','vcl')}${mTable(['State','VC Code'],l.map(r=>[r.state,r.vc]),l.map((r,i)=>stSel('vcl',i,r.status,ed)))}</div>`;
}
function applyBulk(){
  const p=getP(S.pid), set={zm:$('#bzm').value,vc:$('#bvc').value,ch:T($('#bch').value),cha:T($('#bcha').value)}, keys=Object.keys(set).filter(k=>set[k]);
  if(!keys.length) return toast('Enter at least one value.',true);
  const idx=bioIdx(p); if(!idx.length) return toast('No centers to update.',true);
  if(!confirm(`Update ${keys.length} field(s) for ${idx.length} centers (current filter)?`)) return;
  const list=db.sheets[p.code][curSvc(p)]; idx.forEach(i=>keys.forEach(k=>list[i][k]=set[k])); save(); render(); toast(idx.length+' centers updated');
}
function applyZMState(){
  const p=getP(S.pid), z=new Map((db.zml||[]).map(r=>[r.state.toLowerCase(),r.zm])); if(!z.size) return toast('Upload the ZM list in Master Data first.',true);
  const list=db.sheets[p.code][curSvc(p)]; let n=0; bioIdx(p).forEach(i=>{ const v=z.get(String(list[i].state||'').toLowerCase()); if(v){ list[i].zm=v; n++; } });
  save(); render(); toast(n+' centers updated from the ZM list');
}
function bioCols(p,edit){
  const e=edit?esc:(v=>String(v??'')), ns=+p.shifts||1, nd=projDays(p);
  const upv=h=>c=>e((c.up||{})[h]??'');   // value from the uploaded file, shown as is
  const zo='<option value="">Select ZM</option>'+ZMS.map(z=>`<option value="${z}">${z}</option>`).join('');
  const vcs=vcList(), bySt={}; (db.vcl||[]).forEach(r=>{ if(String(r.status||'Active')==='Inactive') return; const k=r.state.toLowerCase(); (bySt[k]=bySt[k]||new Set()).add(r.vc); });
  const cache={}, vo=c=>cache[c.state]||(cache[c.state]='<option value="">Select VC Code</option>'+vcs.filter(v=>!bySt[String(c.state||'').toLowerCase()]||bySt[String(c.state||'').toLowerCase()].has(v.code)).map(v=>`<option value="${esc(v.code)}">${esc(v.code)}</option>`).join(''));
  const inp=k=>(c,x,i)=>edit?`<input value="${esc(c[k]||'')}" onchange="setCF(${i},'${k}',this.value)">`:e(c[k]);
  const sel=(k,O)=>(c,x,i)=>{ if(!edit) return e(c[k]); let o=typeof O==='function'?O(c):O; const cur=esc(c[k]||''); if(cur&&!o.includes(`value="${cur}"`)) o+=`<option value="${cur}">${cur}</option>`; return `<select onchange="setCF(${i},'${k}',this.value)">${o.replace(`value="${cur}"`,'$& selected')}</select>`; };
  let L=[['Center Code',c=>e(c.code)],['Client Code',c=>e(c.client)],['State',c=>e(c.state)],['City Name',c=>e(c.city)],['Center Name',c=>e(c.name)],['Center Address',c=>e(c.addr)],
   ['Vendor Check',c=>c.vc?'Yes':'No'],['Vendor Name',c=>e(vcOf(c).holder||'')],['ZM Name',sel('zm',zo)],['VC Name',c=>e(vcOf(c).vname||'')],['Vendor Name-Contact Number',inp('contact')],['VC Code',sel('vc',vo)],
   ...UPCOLS.map(h=>[h,upv(h)]),
   ['Verification Stamp',inp('stamp')],['Stand',inp('stand')],['Queue Manager',inp('qm')],['City Head',inp('ch')],['City Head Address',inp('cha')],['Project Code',()=>e(p.pcode||p.code)],['Candidate Count',(c,x)=>x.total],['Max All Day',upv('Max All Day')]];
  if(curSvc(p)==='Frisking'){
    const mf=d=>(c,x,i)=>edit?`<input value="${esc(c['mf'+d]||'')}" placeholder="50:50" onchange="setCF(${i},'mf${d}',this.value)">`:e(c['mf'+d]||'50:50');
    const F=[['Center Code',c=>e(c.code)],['Client Code',c=>e(c.client)],['State Name',c=>e(c.state)],['City Name',c=>e(c.city)],['Center Name',c=>e(c.name)],['Center Address',c=>e(c.addr)],['ZM Name',sel('zm',zo)],['VC Name',c=>e(vcOf(c).vname||'')],['Vendor Name-Contact Number',inp('contact')],['VC Code',sel('vc',vo)],['Vendor Name',c=>e(vcOf(c).holder||'')],['Vendor Check',c=>c.vc?'Yes':'No'],['Remarks',inp('rem')],['Negative Balance',inp('neg')],['Guard Type',inp('gt')],['HHMD',inp('hhmd')],['Enclosure',inp('encl')],['Id Cards',inp('idc')],['Jackets Inno',inp('jk')],['Total Candidate',(c,x)=>x.total],['Project Code',()=>e(p.pcode||p.code)]];
    for(let d=0;d<nd;d++) F.push([`Male:Female ${dayLbl(p,d)}`,mf(d)]);
    F.push(['Max Male',(c,x)=>x.mxM],['Max Female',(c,x)=>x.mxF],['Max All Day',(c,x)=>x.all]);
    for(let d=0;d<nd;d++) F.push([`Male ${dayLbl(p,d)}`,(c,x)=>x.days[d].male],[`Female ${dayLbl(p,d)}`,(c,x)=>x.days[d].female],[`Baggage/Crowd ${dayLbl(p,d)}`,(c,x)=>x.days[d].bag],[`Total ${dayLbl(p,d)}`,(c,x)=>x.days[d].m]);
    return F;
  }
  if(curSvc(p)!=='Biometric') L=L.filter(k=>!['Tab','FPS','OTG','Hologram','Id Card','Jacket','IRIS'].includes(k[0]));
  for(let d=0;d<nd;d++){ for(let s=0;s<ns;s++) L.push([`OP Count S${s+1} (${dayLbl(p,d)})`,upv(`OP Count D${d+1} S${s+1}`)]); L.push([`Max Day${d+1}`,upv(`Max Day D${d+1}`)]); }
  return L;
}
function bioIdx(p){
  const list=lst(p), cols=bioCols(p,false), act=Object.keys(BF).filter(k=>BF[k]), out=[];
  list.forEach((c,i)=>{ if(act.length){ const x=calcCenter(p,c); if(!act.every(k=>cols[k]&&String(cols[k][1](c,x,i))===BF[k])) return; } out.push(i); });
  return out;
}
function bioBody(p){
  const list=lst(p), idx=bioIdx(p), cols=bioCols(p,canAllocate()), per=100, pages=Math.max(1,Math.ceil(idx.length/per)); if(BP>=pages) BP=pages-1;
  const rows=idx.slice(BP*per,BP*per+per).map(i=>{ const c=list[i], x=calcCenter(p,c); return `<tr>${cols.map((k,j)=>`<td class="${fz(j)}" data-label="${esc(k[0])}">${k[1](c,x,i)}</td>`).join('')}</tr>`; }).join('')||`<tr><td colspan="${cols.length}" class="empty">No centers to show. Upload a center list or clear the filters.</td></tr>`;
  return {rows,pager:`<button class="btn ghost sm" onclick="BP=Math.max(0,BP-1);bioRefresh()">Prev</button><span>Page ${BP+1} of ${pages} · ${idx.length} centers</span><button class="btn ghost sm" onclick="BP++;bioRefresh()">Next</button>`};
}
function bioRefresh(){ const p=getP(S.pid); if(!p||!$('#bioB')) return; const b=bioBody(p); $('#bioB').innerHTML=b.rows; $('#bioPg').innerHTML=b.pager; if($('#bioCards')) $('#bioCards').innerHTML=bioCards(p); }
function bioCard(p){
  if(!p.services.length) return `<div class="card"><h3>Centers</h3>${projectCenterRows(p)}</div>`;
  const cols=bioCols(p,false), b=bioBody(p), ed=canAllocate(), upl=canUploadLists();
  const warn=(curSvc(p)==='Frisking'&&!+p.frRatio)?'<p style="color:var(--err)">Enter the Frisking allotment ratio in Project details to calculate guard requirements.</p>':'';
  const zo=ZMS.map(z=>`<option>${z}</option>`).join(''), vo=vcList().map(v=>`<option value="${esc(v.code)}">${esc(v.code)}</option>`).join('');
  return `<div class="card"><h3>${esc(({Biometric:'Bio',Frisking:'Frisking'})[curSvc(p)]||curSvc(p))} Center List</h3>${warn}${upl?`<div class="row" style="margin-bottom:12px"><input type="file" id="cfile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="uploadCenters('${esc(p.code)}')">Upload center list</button><button class="btn ghost" onclick="centerTemplate('${esc(p.code)}')">Download template</button></div>`:''}${ed?`
  <div class="row" style="margin-bottom:12px"><input type="file" id="afile" accept=".xlsx,.xls,.csv" style="width:auto"><button class="btn or" onclick="uploadAlloc()">Upload allocation (Center Code + VC Code)</button><button class="btn ghost" onclick="mTpl('alloc')">Template</button></div>
  <div class="row" style="margin-bottom:12px"><b>Bulk update centers in current filter:</b><select id="bzm" style="width:auto"><option value="">ZM</option>${zo}</select><select id="bvc" style="width:auto"><option value="">VC Code</option>${vo}</select><input id="bch" placeholder="City Head" style="width:auto"><input id="bcha" placeholder="City Head Address" style="width:auto"><button class="btn ghost sm" onclick="applyBulk()">Apply</button><button class="btn ghost sm" onclick="applyZMState()">Set ZM by state</button></div>`:''}
  <div id="bioCards">${bioCards(p)}</div><div class="row" style="margin-bottom:12px"><button class="btn ghost" onclick="BF={};render()">Clear filters</button><button class="btn ghost" onclick="exportBio('${esc(p.code)}')">Export to Excel</button>${freezeCtl()}</div>
  <div class="tw" style="max-height:70vh"><table><thead><tr>${cols.map((k,j)=>`<th class="${fz(j)}">${fth(k[0],j,'BF','bio','bioRefresh()','BP')}</th>`).join('')}</tr></thead><tbody id="bioB">${b.rows}</tbody></table></div><div class="row" id="bioPg" style="margin-top:10px">${b.pager}</div></div>`;
}
function centerTemplate(code){
  const p=getP(code), n=+p.shifts||1, nd=projDays(p), h=[...CBASE];
  for(let d=0;d<nd;d++) for(let s=0;s<n;s++) h.push(`Candidate Count D${d+1} S${s+1}`);
  if(curSvc(p)==='Frisking') for(let d=0;d<nd;d++) h.push(`Male:Female D${d+1}`);
  else{ h.push(...UPCOLS,'Max All Day'); for(let d=0;d<nd;d++){ for(let s=0;s<n;s++) h.push(`OP Count D${d+1} S${s+1}`); h.push(`Max Day D${d+1}`); } }
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([h,['C001','CL01','Uttar Pradesh','Lucknow','Sample School','Sample address',...h.slice(6).map(x=>x.startsWith('Male')?'50:50':x.startsWith('Candidate')?500:10)]]),'Centers');
  XLSX.writeFile(wb,'center_list_template.xlsx');
}
function uploadCenters(code){
  const p=getP(code), f=$('#cfile').files[0]; if(!f) return toast('Select a file first.',true);
  const rd=new FileReader(); rd.onload=ev=>{ try{
    const wb=XLSX.read(ev.target.result,{type:'array'}), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]), n=+p.shifts||1, nd=projDays(p);
    const sh=db.sheets[code]=db.sheets[code]||{}, list=sh[curSvc(p)]=sh[curSvc(p)]||[], m=new Map(list.map((c,i)=>[c.code,i])); let add=0,upd=0,skip=0;
    rows.forEach(r=>{ const cc=String(r['Center Code']??'').trim(); if(!cc){skip++;return;}
      const cd=Array.from({length:nd},(_,d)=>Array.from({length:n},(_,i)=>+(r[`Candidate Count D${d+1} S${i+1}`]??r['Candidate Count S'+(i+1)]??(i===0?r['Candidate Count']:0))||0));
      const rec={code:cc,client:String(r['Client Code']??''),state:String(r['State']??''),city:String(r['City Name']??''),name:String(r['Center Name']??''),addr:String(r['Center Address']??''),cd};
      for(let d=0;d<nd;d++){ const v=r[`Male:Female D${d+1}`]; if(v!==undefined&&v!=='') rec['mf'+d]=String(v); }
      const up={}; Object.keys(r).forEach(h=>{ const k=String(h).trim(), v=String(r[h]??'').trim(); if(UPRE.test(k)&&v!=='') up[k]=v; });
      if(m.has(cc)){ const old=list[m.get(cc)]; list[m.get(cc)]={...old,...rec,up:{...(old.up||{}),...up}}; upd++; } else { if(Object.keys(up).length) rec.up=up; m.set(cc,list.push(rec)-1); add++; } });
    save(); toast(`${add} added, ${upd} updated, ${skip} skipped`); render();
  }catch(err){ toast('Error: '+err.message,true); } }; rd.readAsArrayBuffer(f);
}
function setCF(i,k,v){ const p=getP(S.pid); db.sheets[p.code][curSvc(p)][i][k]=v; save(); if(k==='vc') bioRefresh(); }
function exportBio(code){
  const p=getP(code), cols=bioCols(p,false), list=lst(p);
  if(!list.length) return toast('No centers to export.',true);
  const aoa=[cols.map(k=>k[0]),...list.map((c,i)=>{ const x=calcCenter(p,c); return cols.map(k=>k[1](c,x,i)); })];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Bio Center List'); XLSX.writeFile(wb,code+'_bio_center_list.xlsx');
}

