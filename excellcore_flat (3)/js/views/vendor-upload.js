/* [09] VENDOR UPLOAD - ZM / VM vendor upload on the project page (Vendor Manager) */
/* [09.1] Vendor Team - Upload ZM/VM with zone-wise auto-allotment */
function vVendorProject(p){   // the vendor upload cards, shown under the standard project page for a Vendor Manager
  return `<div class="card">
    <h3>Upload ZM/VM Data</h3>
    <p class="lead">Upload vendor data with zone-wise auto-allotment. ZM will be automatically assigned based on zone (North/South/East/West).</p>
    <div class="row" style="margin:16px 0">
      <input type="file" id="vendorFile" accept=".xlsx,.xls,.csv">
      <button class="btn or" onclick="uploadVendorData()">⬆ Upload</button>
      <button class="btn ghost" onclick="downloadVendorTemplate()"> Download Template</button>
    </div>
    <p style="color:var(--muted);font-size:12.5px">Template should have columns: Vendor Code, Vendor Name, Contact, Zone (North/South/East/West), ZM Name, VC Name</p>
  </div>
  <div class="card">
    <h3>Current Vendors</h3>
    ${vendorRows(p)}
  </div>`;
}

function vendorRows(p){
  const vendors = db.vendors.filter(v => (v.projects||[]).includes(p.code));
  if(!vendors.length) return '<div class="empty">No vendors linked to this project yet.</div>';
  
  return `<div class="tw"><table><thead><tr><th>Vendor Code</th><th>Vendor Name</th><th>Zone</th><th>ZM Name</th><th>VC Name</th><th>Contact</th></tr></thead><tbody>${vendors.map(v=>`<tr><td data-label="Code">${esc(v.code)}</td><td data-label="Name">${esc(v.name)}</td><td data-label="Zone">${esc(v.zone||'N/A')}</td><td data-label="ZM">${esc(v.zm||'N/A')}</td><td data-label="VC">${esc(v.vc||'N/A')}</td><td data-label="Contact">${esc(v.contact||'N/A')}</td></tr>`).join('')}</tbody></table></div>`;
}

function downloadVendorTemplate(){
  if(typeof XLSX==='undefined') return toast('File tools could not load.', true);
  const headers = ['Vendor Code','Vendor Name','Contact','Zone','ZM Name','VC Name'];
  const example = [['V-001','Example Vendor','9876543210','North','Rahul Mehta','Anita Rao']];
  const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet([headers,...example]);
  XLSX.utils.book_append_sheet(wb,ws,'Template');
  const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  
  const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendor_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
  toast('Template downloaded');
}

function uploadVendorData(){
  const file = $('#vendorFile').files[0];
  if(!file) return toast('Please select a file first.', true);
  
  if(typeof XLSX==='undefined') return toast('File reader could not load.', true);
  
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      let count = 0;
      data.forEach(row => {
        if(row['Vendor Code'] && row['Vendor Name']){
          const zone = row['Zone'] || 'North';
          const vendor = {
            code: String(row['Vendor Code']),
            name: String(row['Vendor Name']),
            contact: String(row['Contact'] || ''),
            zone: zone,
            zm: String(row['ZM Name'] || ''),
            vc: String(row['VC Name'] || ''),
            projects: [S.pid]
          };
          
          // Auto-allot ZM based on zone
          if(!vendor.zm && zone){
            const zoneZMs = {
              'North': 'Rajesh Kumar (North)',
              'South': 'Priya Singh (South)',
              'East': 'Amit Sharma (East)',
              'West': 'Neha Singh (West)'
            };
            vendor.zm = zoneZMs[zone] || 'Auto Assigned';
          }
          
          const existing = db.vendors.find(v => v.code === vendor.code);
          if(existing){
            Object.assign(existing, vendor);
          } else {
            db.vendors.push(vendor);
          }
          count++;
        }
      });
      
      save();
      toast(`${count} vendors uploaded successfully`);
      render();
    } catch(err){
      toast('Error reading file: ' + err.message, true);
    }
  };
  reader.readAsArrayBuffer(file);
}
