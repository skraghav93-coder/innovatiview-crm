/* [12] OPERATIONS TEAM - Reports / Settings pages, PM project view, calling status list */
/* [12.1] Placeholder pages */
function vReports(){ 
  return `<h2>Reports</h2><p class="lead">Reports module coming soon.</p><div class="card"><div class="empty">Reports will appear here.</div></div>`; 
}

function vSettings(){
  return `<h2>Settings</h2><p class="lead">System configuration.</p>
  <div class="card"><h3>Material Calculation</h3>
  <p>Custom rounding: 8.5 rounds down to 8, 8.6 rounds up to 9</p>
  </div>`;
}


/* [12.2] PM Functions */
function pmStats(p){
  const centers = Object.values(db.sheets[p.code]||{}).reduce((acc, arr) => acc + arr.length, 0);
  return {n:centers, as:centers, slots:0, conf:0};
}

function vPMProject(p){
  return `<button class="btn ghost sm" onclick="go('projects')">← All projects</button>
  <div class="ph">
    <div><h2>${esc(projTitle(p))}</h2><p class="lead">Operations view - Assign RM/AM and manage calling</p></div>
  </div>
${['RM','AM'].includes(ROLE)?'':`  <div class="card">
    <h3>Operation Team (RM & AM)</h3>
    <p class="lead">Assign Regional Managers and Area Managers to centers</p>
    <button class="btn or" onclick="assignRMAM()">Assign RM/AM</button>
  </div>`}
  <div class="card">
    <h3>Biometric Calling Status</h3>
    <div class="row" style="margin:12px 0">
      <select id="callStatusFilter">
        <option value="">All Status</option>
        <option>Going</option>
        <option>Going to Different Center</option>
        <option>Doesn't Know Where to Go</option>
        <option>Wrong Number</option>
        <option>Not Connected</option>
        <option>No. Not available but confirmed</option>
        <option>Denied to work</option>
        <option>Language Barrier</option>
        <option>Switch off</option>
      </select>
      <button class="btn" onclick="updateCallingStatus()">Update Status</button>
    </div>
    <div id="callingList">${callingList(p)}</div>
  </div>`;
}

function assignRMAM(){
  openModal('Assign RM/AM to Center', `
    <table class="qa">
      <tr><td>Center</td><td><select id="centerSelect">${getCenterOptions()}</select></td></tr>
      <tr><td>RM (Regional Manager)</td><td><select id="rmSelect">${getRMOptions()}</select></td></tr>
      <tr><td>AM (Area Manager)</td><td><select id="amSelect">${getAMOptions()}</select></td></tr>
      <tr><td>AM ID</td><td><input id="amId" placeholder="Enter AM ID"></td></tr>
    </table>`,
    `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn or" onclick="saveRMAM()">Save Assignment</button>`
  );
}

function getCenterOptions(){
  const centers = [];
  Object.values(db.sheets[S.pid]||{}).forEach(arr => {
    arr.forEach(c => {
      if(c.code || c.name) centers.push({code:c.code||'', name:c.name||''});
    });
  });
  return centers.map(c => `<option value="${esc(c.code)}">${esc(c.code)} - ${esc(c.name)}</option>`).join('') || '<option>No centers</option>';
}

function getRMOptions(){
  const rms = db.employees.filter(e => (e.role === 'RM' || e.role === 'Regional Manager' || e.role === 'Sr AM') && e.status !== 'Inactive');
  return rms.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('') || '<option value="">No RM available</option>';
}

function getAMOptions(){
  const ams = db.employees.filter(e => (e.role === 'AM' || e.role === 'Area Manager' || e.role === 'Sr AM') && e.status !== 'Inactive');
  return ams.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('') || '<option value="">No AM available</option>';
}

function saveRMAM(){
  const centerCode = val('centerSelect');
  const rmId = val('rmSelect');
  const amId = val('amSelect');
  const amIdText = val('amId');
  
  if(!centerCode) return toast('Select a center', true);
  if(!rmId && !amId) return toast('Choose an RM or AM', true);
  
  // Save assignment
  if(!db.assign[S.pid]) db.assign[S.pid] = {};
  db.assign[S.pid][centerCode] = {rm:rmId, am:amId, amId:amIdText};
  
  save();
  closeModal();
  toast('RM/AM assigned successfully'); render();
}

function callingList(p){
  const centers = [];
  Object.values(db.sheets[p.code]||{}).forEach(arr => {
    arr.forEach(c => {
      if(c.code || c.name) centers.push(c);
    });
  });
  
  if(!centers.length) return '<div class="empty">No centers available</div>';
  
  return `<div class="tw"><table><thead><tr><th>Center</th><th>RM</th><th>AM</th><th>Calling Status</th><th>Actions</th></tr></thead><tbody>${centers.slice(0,300).map(c=>`<tr><td data-label="Center">${esc(c.name||c.code)}</td><td data-label="RM">${getRMForCenter(c.code)}</td><td data-label="AM">${getAMForCenter(c.code)}</td><td data-label="Status"><select class="callStatus" data-center="${esc(c.code)}">${callOpts(c.code)}</select></td><td data-label="Actions"><button class="btn sm" onclick="saveCenterStatus('${esc(c.code)}')">Save</button></td></tr>`).join('')}</tbody></table></div>`;
}

function getRMForCenter(code){
  const assign = db.assign[S.pid]||{};
  const rmId = assign[code]?.rm;
  if(!rmId) return 'Not assigned';
  const rm = db.employees.find(e => e.id === rmId);
  return rm ? esc(rm.name) : 'Not assigned';
}

function getAMForCenter(code){
  const assign = db.assign[S.pid]||{};
  const amId = assign[code]?.am;
  if(!amId) return 'Not assigned';
  const am = db.employees.find(e => e.id === amId);
  return am ? esc(am.name) : 'Not assigned';
}

function saveCenterStatus(code){
  const select = document.querySelector(`select.callStatus[data-center="${code}"]`);
  if(!select) return;
  
  const status = select.value;
  db.calls=db.calls||{}; (db.calls[S.pid]=db.calls[S.pid]||{})[code]=status; save();
  toast(`Status saved for ${code}: ${status}`);
}

function updateCallingStatus(){
  toast('Calling status updated');
}


function nextEmpId(){ const m=Math.max(0,...db.employees.map(e=>+String(e.id).replace(/\D/g,'')||0)); return 'E-'+String(m+1).padStart(3,'0'); }
const CALLS=['Going','Going to Different Center',"Doesn't Know Where to Go",'Wrong Number','Not Connected','No. Not available but confirmed','Denied to work','Language Barrier','Switch off'];
function callOpts(code){ const cur=((db.calls||{})[S.pid]||{})[code]; return CALLS.map(o=>`<option ${o===cur?'selected':''}>${esc(o)}</option>`).join(''); }
