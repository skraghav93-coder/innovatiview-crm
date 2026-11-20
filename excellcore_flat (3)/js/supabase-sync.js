/* ===== Supabase connection and sync ===== */
const sb=supabase.createClient(SB_URL,SB_KEY);
const SBX=(()=>{
  const SEP='\u0001', ISO=/^\d{4}-\d{2}-\d{2}$/;
  const dt=v=>ISO.test(String(v||''))?String(v):null, nz=v=>(v===undefined||v===null||v==='')?null:v, arr=v=>Array.isArray(v)?v:[];
  const clean=o=>{ Object.keys(o).forEach(k=>{ if(o[k]===''||o[k]==null) delete o[k]; }); return o; };
  const empty=()=>({projects:[],sheets:{},layout:{},teams:{},assign:{},assignRm:{},vendors:[],employees:[],assignments:[],zones:{North:[],South:[],East:[],West:[]},opc:{},calls:{},vcm:[],zml:[],vcl:[]});
  const pset=()=>new Set(db.projects.map(p=>p.code));
  const splitK=k=>{ const p=String(k).split('|'); return p.length>=3?{project_code:p[0],service:p[1],sheet:p.slice(2).join('|')}:{project_code:'_',service:'_',sheet:String(k)}; };
  const joinK=r=>(r.project_code==='_'&&r.service==='_')?r.sheet:r.project_code+'|'+r.service+'|'+r.sheet;

  /* One entry per Supabase table: to() builds rows from db, from() rebuilds db from rows. */
  const SPECS=[
   {t:'projects',pk:['code'],ord:['created_at','code'],
    to:()=>db.projects.filter(p=>p&&p.code).map(p=>({code:String(p.code),name:nz(p.name||p.exam),client:nz(p.client),exam:nz(p.exam),start_date:dt(p.start||p.date),end_date:dt(p.end),services:arr(p.services).map(String),
      status:['Upcoming','Active','Completed'].includes(p.status)?p.status:'Upcoming',details:p,pm_ids:arr(p.pm).map(String)})),
    from:rows=>{ db.projects=rows.map(r=>({...clean({name:r.name,client:r.client,exam:r.exam,date:r.start_date,end:r.end_date}),services:arr(r.services),status:r.status,pm:arr(r.pm_ids),...(r.details||{}),code:r.code})); }},
   {t:'employees',pk:['id'],ord:['id'],
    to:()=>db.employees.filter(e=>e&&e.id).map(e=>({id:String(e.id),name:e.name||'',role:nz(e.role),contact:nz(e.contact||e.mobile),email:nz(e.email),status:e.status||'Active',doj:dt(e.doj),
      aadhar_last4:e.aadharMask?String(e.aadharMask).slice(-4):null,vendor_code:nz(e.vendor),photo_link:nz(e.photo),extra:e})),
    from:rows=>{ db.employees=rows.map(r=>({...clean({name:r.name,role:r.role,contact:r.contact,email:r.email,status:r.status,doj:r.doj,vendor:r.vendor_code,photo:r.photo_link}),...(r.extra||{}),id:r.id})); }},
   {t:'vendors',pk:['code'],ord:['code'],
    to:()=>db.vendors.filter(v=>v&&v.code).map(v=>({code:String(v.code),name:v.name||'',zone:nz(v.zone),zm:nz(v.zm),vc:nz(v.vc),contact:nz(v.contact),extra:v})),
    from:rows=>{ db.vendors=rows.map(r=>({...clean({name:r.name,zone:r.zone,zm:r.zm,vc:r.vc,contact:r.contact}),projects:[],...(r.extra||{}),code:r.code})); }},
   {t:'project_vendors',pk:['project_code','vendor_code'],ord:['project_code','vendor_code'],cascade:true,
    to:()=>{ const ps=pset(), out=[]; db.vendors.forEach(v=>{ if(v&&v.code) arr(v.projects).forEach(c=>{ if(ps.has(c)) out.push({project_code:String(c),vendor_code:String(v.code)}); }); }); return out; },
    from:rows=>{ const m=new Map(db.vendors.map(v=>[v.code,v])); m.forEach(v=>{ v.projects=[]; }); rows.forEach(r=>{ const v=m.get(r.vendor_code); if(v) v.projects.push(r.project_code); }); }},
   {t:'vc_master',pk:['code'],ord:['code'],
    to:()=>arr(db.vcm).filter(v=>v&&v.code).map(v=>({code:String(v.code),holder_name:nz(v.holder),gst_no:nz(v.gst),vendor_name:nz(v.vname),zm:nz(v.zm),vm:nz(v.vm),service:nz(v.service),status:v.status||'Active',extra:v})),
    from:rows=>{ db.vcm=rows.map(r=>({...clean({holder:r.holder_name,gst:r.gst_no,vname:r.vendor_name,zm:r.zm,vm:r.vm,service:r.service,status:r.status}),...(r.extra||{}),code:r.code})); }},
   {t:'zm_state',pk:['state','zm_name'],ord:['state','zm_name'],
    to:()=>arr(db.zml).filter(r=>r&&r.state&&r.zm).map(r=>({state:String(r.state),zm_name:String(r.zm),status:r.status||'Active'})),
    from:rows=>{ db.zml=rows.map(r=>({state:r.state,zm:r.zm_name,status:r.status})); }},
   {t:'vc_state',pk:['state','vc_code'],ord:['state','vc_code'],
    to:()=>arr(db.vcl).filter(r=>r&&r.state&&r.vc).map(r=>({state:String(r.state),vc_code:String(r.vc),status:r.status||'Active'})),
    from:rows=>{ db.vcl=rows.map(r=>({state:r.state,vc:r.vc_code,status:r.status})); }},
   {t:'centers',pk:['project_code','service','center_code'],ord:['id'],cascade:true,
    to:()=>{ const ps=pset(), out=[]; Object.keys(db.sheets||{}).forEach(pc=>{ if(!ps.has(pc)) return; Object.keys(db.sheets[pc]||{}).forEach(sv=>arr(db.sheets[pc][sv]).forEach(c=>{
        if(!c||c.code===undefined||c.code===null||c.code==='') return;
        out.push({project_code:pc,service:sv,center_code:String(c.code),client_code:nz(c.client),state:nz(c.state),city:nz(c.city),name:nz(c.name),address:nz(c.addr),
          shift_candidates:arr(c.cd).flat(2).map(x=>parseInt(x,10)||0),vc_code:nz(c.vc),zm:nz(c.zm),city_head:nz(c.ch),extra:c}); })); }); return out; },
    from:rows=>{ db.sheets={}; rows.forEach(r=>{ const o=(db.sheets[r.project_code]=db.sheets[r.project_code]||{});
        (o[r.service]=o[r.service]||[]).push({...clean({client:r.client_code,state:r.state,city:r.city,name:r.name,addr:r.address,vc:r.vc_code,zm:r.zm,ch:r.city_head}),...(r.extra||{}),code:r.center_code}); }); }},
   {t:'center_assignments',pk:['project_code','center_code'],ord:['project_code','center_code'],
    to:()=>{ const out=[]; Object.keys(db.assign||{}).forEach(pc=>Object.keys(db.assign[pc]||{}).forEach(cc=>{ const a=db.assign[pc][cc]; if(!a||!Object.keys(a).length) return;
        out.push({project_code:pc,center_code:String(cc),rm_id:nz(a.rm),am_id:nz(a.am),rm_name:a.rmN===undefined?null:String(a.rmN),am_code:nz(a.amId),ach:nz(a.ach),csup:nz(a.csup),dr:nz(a.dr),extra:a}); })); return out; },
    from:rows=>{ db.assign={}; rows.forEach(r=>{ const o=(db.assign[r.project_code]=db.assign[r.project_code]||{}); const d=clean({rm:r.rm_id,am:r.am_id,amId:r.am_code,ach:r.ach,csup:r.csup,dr:r.dr}); if(r.rm_name!==null&&r.rm_name!==undefined) d.rmN=r.rm_name; o[r.center_code]={...d,...(r.extra||{})}; }); }},
   {t:'calling_log',pk:['project_code','center_code'],ord:['id'],append:true,
    to:()=>{ const out=[]; Object.keys(db.calls||{}).forEach(pc=>Object.keys(db.calls[pc]||{}).forEach(cc=>{ const s=db.calls[pc][cc]; if(s) out.push({project_code:pc,center_code:String(cc),status:String(s)}); })); return out; },
    from:rows=>{ db.calls={}; rows.forEach(r=>{ (db.calls[r.project_code]=db.calls[r.project_code]||{})[r.center_code]=r.status; }); }},
   {t:'sheet_entries',pk:['project_code','service','sheet','row_key'],ord:['project_code','service','sheet','row_key'],
    to:()=>{ const out=[]; Object.keys(db.opc||{}).forEach(k=>{ const st=db.opc[k]; if(!st||typeof st!=='object') return; const s=splitK(k);
        Object.keys(st).forEach(rk=>{ const d=st[rk]; if(d&&typeof d==='object'&&Object.keys(d).length) out.push({...s,row_key:String(rk),data:d}); }); }); return out; },
    from:rows=>{ db.opc={}; rows.forEach(r=>{ const k=joinK(r); (db.opc[k]=db.opc[k]||{})[r.row_key]=r.data||{}; }); }},
   {t:'app_blobs',pk:['key'],ord:['key'],
    to:()=>['layout','teams'].map(k=>({key:k,data:db[k]||{}})),
    from:rows=>{ rows.forEach(r=>{ if(r.key==='layout'||r.key==='teams') db[r.key]=r.data||{}; }); }}
  ];

  /* What each role may read / write; mirrors the RLS policies in Supabase. */
  const ALL=SPECS.map(s=>s.t);
  const WARN=['projects','employees','vendors','centers','center_assignments','calling_log','sheet_entries'];
  let role='Operations', SNAP={}, LOADED={}, timer=null, retry=null, busy=false, again=false, pending=false, lastErr='', lastErrAt=0; const warned=new Set();
  const keyOf=(s,r)=>s.pk.map(c=>r[c]).join(SEP);
  const toMap=s=>{ const m=new Map(); s.to().forEach(r=>m.set(keyOf(s,r),JSON.stringify(r))); return m; };
  const stat=(t,bad)=>{ const e=document.getElementById('syncst'); if(e){ e.textContent=t; e.style.color=bad?'var(--err)':'var(--muted)'; } };
  const canR=t=>true /* the database filters rows per role */, canW=t=>rolePerm(role).w.includes(t);

  async function fetchAll(s){
    let all=[], from=0; const size=1000;
    for(;;){ let q=sb.from(s.t).select('*'); s.ord.forEach(c=>{ q=q.order(c,{ascending:true}); }); const {data,error}=await q.range(from,from+size-1); if(error) throw error; all=all.concat(data||[]); if(!data||data.length<size) break; from+=size; }
    return all;
  }
  async function loadAll(r){
    role=r; db=empty(); SNAP={}; LOADED={}; warned.clear();
    const res=await Promise.all(SPECS.filter(s=>canR(s.t)).map(s=>fetchAll(s).then(rows=>({s,rows}),err=>({s,err}))));
    const failed=[];
    SPECS.forEach(s=>{ const x=res.find(y=>y.s===s); if(!x) return; if(x.err){ failed.push(s.t+': '+(x.err.message||x.err)); return; } s.from(x.rows); LOADED[s.t]=true; });
    SPECS.forEach(s=>{ if(LOADED[s.t]) SNAP[s.t]=toMap(s); });
    if(failed.length) toast('Could not load: '+failed.join('; '),true);
    return failed.length===0;
  }
  function problem(msg){ const now=Date.now(); if(msg!==lastErr||now-lastErrAt>15000){ lastErr=msg; lastErrAt=now; toast('Not saved: '+msg,true); } stat('Not saved, retrying',true); clearTimeout(retry); retry=setTimeout(flush,15000); }

  async function pass(){
    const plan=[], errs=[];
    for(const s of SPECS){ if(!LOADED[s.t]) continue;
      const cur=new Map(); s.to().forEach(r=>cur.set(keyOf(s,r),r)); const snap=SNAP[s.t], up=[], del=[];
      cur.forEach((r,k)=>{ const j=JSON.stringify(r); if(snap.get(k)!==j) up.push([k,r,j]); });
      if(!s.append) snap.forEach((j,k)=>{ if(!cur.has(k)) del.push(k); });
      if(!up.length&&!del.length) continue;
      if(!canW(s.t)){ if(WARN.includes(s.t)&&!warned.has(s.t)){ warned.add(s.t); toast('Your role ('+role+') cannot save changes to '+s.t.replace(/_/g,' ')+'. They will not be kept.',true); } continue; }
      plan.push({s,up,del}); }
    for(const p of plan){ const s=p.s;
      for(let i=0;i<p.up.length;i+=400){ const ch=p.up.slice(i,i+400), rows=ch.map(x=>x[1]);
        try{ const {error}=await (s.append?sb.from(s.t).insert(rows):sb.from(s.t).upsert(rows,{onConflict:s.pk.join(',')})); if(error) throw error; ch.forEach(x=>SNAP[s.t].set(x[0],x[2])); }
        catch(e){ errs.push(s.t+': '+(e.message||e)); break; } } }
    const gone=new Set(((plan.find(p=>p.s.t==='projects')||{}).del)||[]);
    for(const p of plan.slice().reverse()){ const s=p.s; let del=p.del; if(!del.length) continue;
      if(s.cascade){ del.filter(k=>gone.has(k.split(SEP)[0])).forEach(k=>SNAP[s.t].delete(k)); del=del.filter(k=>!gone.has(k.split(SEP)[0])); }
      const g=new Map(); del.forEach(k=>{ const a=k.split(SEP), last=a.pop(), pre=a.join(SEP); if(!g.has(pre)) g.set(pre,{a,l:[]}); g.get(pre).l.push(last); });
      try{ for(const {a,l} of g.values()) for(let i=0;i<l.length;i+=200){ const part=l.slice(i,i+200); let q=sb.from(s.t).delete(); a.forEach((v,j)=>{ q=q.eq(s.pk[j],v); }); q=q.in(s.pk[a.length],part); const {error}=await q; if(error) throw error; part.forEach(v=>SNAP[s.t].delete(a.concat([v]).join(SEP))); } }
      catch(e){ errs.push(s.t+': '+(e.message||e)); } }
    return errs;
  }
  async function flush(){
    if(busy){ again=true; return; } busy=true; let errs=[];
    try{ stat('Saving...'); do{ again=false; errs=await pass(); }while(again&&!errs.length); }catch(e){ errs=[String(e.message||e)]; }
    busy=false; pending=false;
    if(errs.length) problem(errs[0]); else stat('Saved');
  }
  function soon(){ if(!Object.keys(LOADED).length) return; pending=true; stat('Saving...'); clearTimeout(timer); timer=setTimeout(flush,700); }
  window.addEventListener('beforeunload',e=>{ if(pending||busy){ e.preventDefault(); e.returnValue=''; } });
  const legacy=()=>{ try{ const o=JSON.parse(localStorage.getItem(KEY)); return o&&Array.isArray(o.projects)?o:null; }catch(e){ return null; } };
  const adopt=o=>{ db={...empty(),...o}; soon(); };
  return {empty,loadAll,soon,flush:()=>{ clearTimeout(timer); return flush(); },legacy,adopt,SPECS,_snap:()=>SNAP,_loaded:()=>LOADED,_setRole:r=>{ role=r; }};
})();
function load(){ db=SBX.empty(); }
function save(){ SBX.soon(); }
