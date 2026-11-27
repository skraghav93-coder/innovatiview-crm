/* [25] MAIN - start-up: sign-in check, keyboard shortcuts */
/* [25.1] Initialize */
load();
window.addEventListener('load',initAuth);
/* The database refuses a sign-in whose email is neither @innovatiview.in / .com nor in the people list (PM / RM / AM DB with an email). Say so clearly. */
window.addEventListener('load',()=>{ const q=new URLSearchParams((location.hash||'').replace(/^#/,'')+'&'+(location.search||'').replace(/^\?/,'')), e=q.get('error_description')||q.get('error');
  if(e){ history.replaceState(null,'',location.pathname); setTimeout(()=>toast('This email cannot sign in. Use an @innovatiview.in / @innovatiview.com account, or ask an Admin to add your email to the people list (PM / RM / AM DB).',true),400); } });

/* [25.2] Close modal on backdrop click */
$('#ov').addEventListener('click', e => { if(e.target.id==='ov') closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeModal(); closeFilter(); } });

/* Press "/" anywhere (outside a form field) to jump to the global search */
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  const gs = $('#gs'); if (gs && $('#app').style.display !== 'none') { e.preventDefault(); gs.focus(); }
});
