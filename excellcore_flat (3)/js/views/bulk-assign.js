/* Bulk Upload */
function bulkModal(kind){
  openModal('Bulk upload: '+kind, `<p>Upload Excel/CSV file with proper headers.</p><input type="file" id="bfile" accept=".xlsx,.xls,.csv">`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="bulkSave('${kind}')">Upload</button>`);
}

function bulkSave(kind){
  const file = $('#bfile').files[0];
  if(!file) return toast('Select a file first.', true);
  
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      let count = 0;
      if(kind === 'employees'){
        data.forEach(row => {
          if(row['Name']){
            db.employees.push({
              id: nextEmpId(),
              name: String(row['Name']),
              role: String(row['Role'] || 'Field Supervisor'),
              contact: String(row['Contact'] || ''),
              email: String(row['Email'] || ''),
              status: 'Active'
            });
            count++;
          }
        });
      }
      
      save();
      toast(`${count} records uploaded`);
      closeModal();
      render();
    } catch(err){
      toast('Error: ' + err.message, true);
    }
  };
  reader.readAsArrayBuffer(file);
}

/* Assignment Modal - RM/AM moved to Operation team */
function assignModal(){
  if(!db.projects.length||!db.employees.length) return toast('Add projects and employees first.', true);
  
  openModal('Assign employee', `<table class="qa">
    <tr><td>Employee</td><td><select id="a_emp">${db.employees.filter(e=>e.status==='Active').map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.role)})</option>`).join('')}</select></td></tr>
    <tr><td>Project</td><td><select id="a_proj">${db.projects.map(p=>`<option value="${esc(p.code)}">${esc(projTitle(p))}</option>`).join('')}</select></td></tr>
    <tr><td>Role</td><td><input id="a_role" placeholder="e.g. RM, AM, Supervisor"></td></tr>
    <tr><td>Date</td><td><input id="a_date" type="date"></td></tr></table>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveAssign()">Assign</button>`);
}

function saveAssign(){
  const rec={
    emp:val('a_emp'), 
    project:val('a_proj'), 
    role:val('a_role'), 
    date:val('a_date'), 
    status:'Assigned'
  };
  
  db.assignments.push(rec);
  save(); 
  closeModal(); 
  toast('Employee assigned'); 
  render();
}
