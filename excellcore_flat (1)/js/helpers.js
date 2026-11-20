/* =====================================================================
   Shared state and small utilities used by every other file.
   Load order matters: config.js > helpers.js > supabase-sync.js > ... > main.js
   ===================================================================== */
const KEY = 'excellcore_v2';   // old localStorage key, only read once to offer a one-time import
let db;                        // in-memory copy of the data; supabase-sync.js loads and saves it

/* Helpers */
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
