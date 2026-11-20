/* Initialize */
load();
window.addEventListener('load',initAuth);

/* Close modal on backdrop click */
$('#ov').addEventListener('click', e => { if(e.target.id==='ov') closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeModal(); closeFilter(); } });

/* Press "/" anywhere (outside a form field) to jump to the global search */
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  const gs = $('#gs'); if (gs && $('#app').style.display !== 'none') { e.preventDefault(); gs.focus(); }
});
