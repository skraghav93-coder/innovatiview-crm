/* Employees */
function vEmployees(){
  return `<div class="ph"><div><h2>Employees</h2><p class="lead">Manage staff and assign them to projects.</p></div>
  <div class="row">
    <button class="btn ghost" onclick="bulkModal('employees')">⬆ Bulk upload</button>
    <button class="btn or" onclick="empModal()">+ Add employee</button>
  </div></div>
  <div class="card"><h3>Employee list</h3><div class="tw"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
    db.employees.map(e=>`<tr><td data-label="ID">${esc(e.id)}</td><td data-label="Name">${esc(e.name)}</td><td data-label="Role">${esc(e.role)}</td><td data-label="Contact">${esc(e.contact)}</td><td data-label="Status"><span class="pill ${e.status==='Active'?'Active':'Completed'}">${e.status}</span></td>
    <td data-label="Actions"><button class="btn ghost sm" onclick="empModal('${esc(e.id)}')">Edit</button> <button class="btn ghost sm" onclick="delEmp('${esc(e.id)}')">Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function empModal(id){
  const e = db.employees.find(x=>x.id===id) || {};
  openModal(id?'Edit employee':'Add employee', `<table class="qa">
    <tr><td>Name</td><td><input id="e_name" value="${esc(e.name||'')}"></td></tr>
    <tr><td>Role</td><td><select id="e_role"><option ${e.role==='Project Manager'?'selected':''}>Project Manager</option><option ${e.role==='Field Supervisor'?'selected':''}>Field Supervisor</option><option ${e.role==='Coordinator'?'selected':''}>Coordinator</option><option ${e.role==='RM'?'selected':''}>RM</option><option ${e.role==='AM'?'selected':''}>AM</option></select></td></tr>
    <tr><td>Contact</td><td><input id="e_contact" value="${esc(e.contact||'')}"></td></tr>
    <tr><td>Email</td><td><input id="e_email" type="email" value="${esc(e.email||'')}"></td></tr>
    <tr><td>Status</td><td><select id="e_status"><option ${e.status==='Active'?'selected':''}>Active</option><option ${e.status==='Inactive'?'selected':''}>Inactive</option></select></td></tr></table>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveEmp('${esc(id||'')}')">Save employee</button>`);
}

const mob10=v=>String(v??'').replace(/\D/g,'').slice(-10);
/* One email address and one mobile number can belong to one person only, whatever the role. Returns the reason, or '' if free. */
function contactClash(rec,selfId){
  const em=String(rec.email||'').trim().toLowerCase(), mb=mob10(rec.contact||rec.mobile);
  for(const e of db.employees){ if(e.id===selfId) continue;
    if(em&&String(e.email||'').trim().toLowerCase()===em) return 'The email '+rec.email+' already belongs to '+e.name+' ('+e.role+'). An email can be used by one person only.';
    if(mb.length>=10&&mob10(e.contact||e.mobile)===mb) return 'The mobile number '+(rec.contact||rec.mobile)+' already belongs to '+e.name+' ('+e.role+'). A mobile number can be used by one person only.'; }
  return '';
}
function saveEmp(id){
  if(!val('e_name')) return toast('Employee name is required.', true);
  const rec = {
    id: id || nextEmpId(), 
    name:val('e_name'), 
    role:val('e_role'), 
    contact:val('e_contact'), 
    email:val('e_email'), 
    status:val('e_status')
  };
  
  const clash=contactClash(rec,id||null); if(clash) return toast(clash,true);
  const prevStatus=id?(db.employees.find(e=>e.id===id)||{}).status:'';
  if(id) db.employees[db.employees.findIndex(e=>e.id===id)] = rec; 
  else db.employees.push(rec);
  if(rec.status==='Inactive'&&prevStatus!=='Inactive') retireEmployee(rec.id);
  
  save(); 
  closeModal(); 
  toast('Employee saved'); 
  render();
}

function delEmp(id){ 
  if(!confirm('Delete this employee?')) return; 
  db.employees=db.employees.filter(e=>e.id!==id); 
  save(); 
  toast('Employee deleted'); 
  render(); 
}

/* Vendors */
function vVendors(){
  return `<div class="ph"><div><h2>Vendors</h2><p class="lead">Vendor directory and project links.</p></div><div class="row"><button class="btn or" onclick="vendorModal()">+ Add vendor</button></div></div>
  <div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Name</th><th>Zone</th><th>ZM</th><th>VC</th><th>Contact</th><th>Actions</th></tr></thead><tbody>${
   db.vendors.map(v=>`<tr><td data-label="Code">${esc(v.code)}</td><td data-label="Name">${esc(v.name)}</td><td data-label="Zone">${esc(v.zone||'N/A')}</td><td data-label="ZM">${esc(v.zm||'N/A')}</td><td data-label="VC">${esc(v.vc||'N/A')}</td><td data-label="Contact">${esc(v.contact||'N/A')}</td>
   <td data-label="Actions"><button class="btn ghost sm" onclick="vendorModal('${esc(v.code)}')">Edit</button> <button class="btn ghost sm" onclick="delVendor('${esc(v.code)}')">Delete</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function vendorModal(code){
  const v = db.vendors.find(x=>x.code===code) || {};
  openModal(code?'Edit vendor':'Add vendor', `<table class="qa">
    <tr><td>Vendor Name</td><td><input id="v_name" value="${esc(v.name||'')}"></td></tr>
    <tr><td>Vendor Code</td><td><input id="v_code" value="${esc(v.code||'')}" ${code?'readonly':''}></td></tr>
    <tr><td>Zone</td><td><select id="v_zone"><option ${v.zone==='North'?'selected':''}>North</option><option ${v.zone==='South'?'selected':''}>South</option><option ${v.zone==='East'?'selected':''}>East</option><option ${v.zone==='West'?'selected':''}>West</option></select></td></tr>
    <tr><td>ZM Name</td><td><input id="v_zm" value="${esc(v.zm||'')}"></td></tr>
    <tr><td>VC Name</td><td><input id="v_vc" value="${esc(v.vc||'')}"></td></tr>
    <tr><td>Contact</td><td><input id="v_contact" value="${esc(v.contact||'')}"></td></tr></table>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveVendor('${esc(code||'')}')">Save vendor</button>`);
}

function saveVendor(old){
  if(!val('v_name')) return toast('Vendor name is required.', true);
  const code = old || val('v_code') || 'V-'+String(db.vendors.length+1).padStart(3,'0');
  if(!old && db.vendors.some(v=>v.code===code)) return toast('This vendor code already exists.', true);
  
  const prev = db.vendors.find(v=>v.code===old) || {projects:[]};
  const rec = {...prev, code, name:val('v_name'), zone:val('v_zone'), contact:val('v_contact'), zm:val('v_zm'), vc:val('v_vc')};
  
  if(old) db.vendors[db.vendors.findIndex(v=>v.code===old)] = rec; 
  else db.vendors.push(rec);
  
  save(); 
  closeModal(); 
  toast('Vendor saved'); 
  render();
}

function delVendor(code){ 
  if(!confirm('Delete this vendor?')) return; 
  db.vendors=db.vendors.filter(v=>v.code!==code); 
  save(); 
  toast('Vendor deleted'); 
  render(); 
}
