/* [02] HELPERS - shared state, small utilities, the 10 digit mobile rule, safe file names, call popup */
/* =====================================================================
   Shared state and small utilities used by every other file.
   Load order matters: config.js > helpers.js > supabase-sync.js > ... > main.js
   ===================================================================== */
const KEY = 'excellcore_v2';   // old localStorage key, only read once to offer a one-time import
let db;                        // in-memory copy of the data; supabase-sync.js loads and saves it

/* [02.1] Helpers */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '–';
function toast(msg, err){ const t=document.createElement('div'); t.className='toast'+(err?' err':''); t.textContent=msg; $('#toasts').append(t); setTimeout(()=>t.remove(),3000); }
function openModal(title, body, footer, wide){ $('.modal').classList.toggle('wide',!!wide); $('#mt').textContent=title; $('#mb').innerHTML=body; $('#mfoot').innerHTML=footer||''; $('#ov').classList.add('show'); }
function closeModal(){ $('#ov').classList.remove('show'); }
const val = id => { const e=$('#'+id); return e ? e.value.trim() : ''; };
const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(e=>e.value);

/* Custom rounding: 8.5 -> 8, 8.6 -> 9 */
function customRound(num) {
  const decimal = num - Math.floor(num);
  if (decimal <= 0.5) {
    return Math.floor(num);
  } else {
    return Math.ceil(num);
  }
}

/* ---- [02.2] Mobile numbers: the 10 digit rule ----
   A mobile number is 10 digits and starts with 6, 7, 8 or 9. A +91, 91 or 0 in front is dropped; spaces and dashes are ignored. */
function normMobile(v){ let d=String(v??'').replace(/\D/g,''); if(d.length===12&&d.startsWith('91')) d=d.slice(2); else if(d.length===11&&d.startsWith('0')) d=d.slice(1); return d; }
const mobileOk=v=>/^[6-9]\d{9}$/.test(normMobile(v));
const MOBILE_RULE='A mobile number must have 10 digits and start with 6, 7, 8 or 9 (a +91 or 0 in front is fine).';
/* For an input that holds a mobile number: '' when empty, the clean 10 digits when valid; null (after a message, and with the old value put back) when not. */
function checkMobileInput(el){ const raw=String(el.value||'').trim(); if(!raw) return ''; const d=normMobile(raw);
  if(!mobileOk(d)){ toast(MOBILE_RULE+' "'+raw+'" was not saved.',true); el.value=el.defaultValue||''; return null; } el.value=d; el.defaultValue=d; return d; }
const mobAttrs='inputmode="tel" maxlength="16" pattern="[0-9+ -]*"';

/* ---- [02.3] File names: a Project ID can hold "/" which is not allowed in a file name ---- */
const fsafe=s=>String(s??'').replace(/[\\/:*?"<>|]+/g,'-');

/* ---- [02.4] Call popup: a cell that lists several "Name-Number" entries opens a small list with a Call button for each ---- */
const PHONE_RE=/(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
function phonesIn(text){
  const out=[], seen=new Set();
  String(text??'').split(/[,;\n]+/).forEach(part=>{ const ms=part.match(PHONE_RE); if(!ms) return;
    const name=part.replace(PHONE_RE,'').replace(/[\s\-–:/()]+$/,'').replace(/^[\s\-–:/()]+/,'').trim();
    ms.forEach(m=>{ const n=normMobile(m); if(mobileOk(n)&&!seen.has(n)){ seen.add(n); out.push({name,num:n}); } }); });
  return out;
}
const CALL_IC='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
/* The cell text, plus a phone button when it holds at least one valid number */
function callCell(text,title){ const t=String(text??''), n=phonesIn(t).length; if(!n) return esc(t);
  return `<span class="callcell"><span>${esc(t)}</span><button type="button" class="btn ghost sm callbtn" title="Call (${n})" aria-label="Call ${n} number${n>1?'s':''}" data-t="${esc(t)}" data-h="${esc(title||'')}" onclick="callPop(this)">${CALL_IC}${n>1?'<small>'+n+'</small>':''}</button></span>`; }
function callPop(btn){
  const list=phonesIn(btn.dataset.t); if(!list.length) return;
  const old=document.getElementById('cpop'); if(old){ const same=old.dataset.for===btn.dataset.t; old.remove(); if(same) return; }
  const pop=document.createElement('div'); pop.id='cpop'; pop.dataset.for=btn.dataset.t;
  pop.innerHTML=`<div class="cph"><b>${esc(btn.dataset.h||'Call')}</b><button type="button" aria-label="Close" onclick="this.closest('#cpop').remove()">×</button></div>`+list.map(x=>`<div class="cpr"><span><b>${esc(x.name||'—')}</b><small>${esc(x.num)}</small></span><a class="btn or sm" href="tel:+91${esc(x.num)}">${CALL_IC} Call</a></div>`).join('');
  document.body.appendChild(pop); const r=btn.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(r.left,innerWidth-300))+'px'; pop.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-pop.offsetHeight-8))+'px';
  const off=e=>{ if(!pop.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)){ pop.remove(); document.removeEventListener('mousedown',off,true); window.removeEventListener('scroll',off,true); } };
  setTimeout(()=>{ document.addEventListener('mousedown',off,true); window.addEventListener('scroll',off,true); },0);
}
