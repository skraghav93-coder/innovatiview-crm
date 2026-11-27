/* =====================================================================
   [04] ROLES - the roles and what each may see and change on screen
   Roles. Each person has exactly one role (profiles.role in Supabase).
   The same rules are enforced in the database by Row Level Security
   (supabase/004_roles.sql); this file only decides what to SHOW.

   Super Admin      Complete CRM
   Admin            MIS-team tasks: create / edit projects, upload Bio, Frisking and CSO center lists, master data
   Project Manager  Assigned projects only
   RM               Assigned projects and assigned centers only
   AM               AM / Sr AM: assigned projects and assigned centers only
   Vendor Manager   Vendor and manpower allocation
   Special          Special logins (Sr Project Manager, Vendor Team Head, Operation Manager, Process Excellence, SCM Team ...):
                    every project; the sheets and columns given to the login, view or edit (see col-view.js and special-logins.js)
   ===================================================================== */
const ROLES = ['Super Admin', 'Admin', 'Project Manager', 'RM', 'AM', 'Vendor Manager', 'Special'];
const ROLE_LABEL = { 'AM': 'AM / Sr AM' };

const ALL_TABLES = ['projects', 'employees', 'vendors', 'project_vendors', 'vc_master', 'zm_state', 'vc_state', 'centers',
                    'center_assignments', 'calling_log', ...SHEET_T, 'app_blobs'];
const OPS_WRITE = ['center_assignments', 'calling_log', ...SHEET_OPS_T, 'app_blobs'];   // AM: view only on the vendor sheets (Guard List, OP List)
const OPS_VENDOR_WRITE = [...OPS_WRITE, ...SHEET_VENDOR_T];   // PM and RM also fill their columns of the Guard List / OP List (the database checks which columns)

const ROLE_DEFS = {
  'Super Admin': { views: ['dashboard', 'projects', 'project', 'employees', 'vendors', 'masters', 'vteam', 'glist', 'olist', 'ops', 'reports', 'special', 'trash', 'settings'], w: ALL_TABLES },
  'Admin':       { views: ['dashboard', 'projects', 'project', 'employees', 'masters', 'vteam', 'glist', 'olist', 'ops', 'special'],
                   w: ['projects', 'employees', 'vendors', 'project_vendors', 'centers', 'vc_master', 'zm_state', 'vc_state', ...SHEET_T, 'app_blobs'] },
  /* Project Manager / RM / AM: full access to their Operations sheets. Center lists: view only. Guard List / OP List: PM and RM edit their columns (guard-op-list.js), AM views */
  'Project Manager': { views: ['dashboard', 'projects', 'project', 'vteam', 'glist', 'olist', 'reports', 'ops'], w: OPS_VENDOR_WRITE },
  'RM':          { views: ['dashboard', 'projects', 'project', 'vteam', 'glist', 'olist', 'reports', 'ops'], w: OPS_VENDOR_WRITE },
  'AM':          { views: ['dashboard', 'projects', 'project', 'vteam', 'glist', 'olist', 'reports', 'ops'], w: OPS_WRITE },
  'Vendor Manager': { views: ['dashboard', 'projects', 'project', 'vendors', 'masters', 'vteam', 'glist', 'olist'],
                      w: ['vendors', 'project_vendors', 'centers', ...SHEET_VENDOR_T, 'app_blobs'] }
};
const NO_ROLE = { views: ['dashboard'], w: [] };
const rolePerm = r => ROLE_DEFS[r] || NO_ROLE;

/* [04.1] What the signed-in role may do on screen */
const canWriteT        = t => rolePerm(ROLE).w.includes(t);
const canCreateProjects = () => canWriteT('projects');                    // Super Admin, Admin
const canMaster        = () => canWriteT('vc_master');                    // Vendor DB, ZM/VC DB, PM/RM/AM DB
const canUploadLists   = () => ROLE === 'Super Admin' || ROLE === 'Admin'; // Bio / Frisking / CSO center lists
const canAllocate      = () => canWriteT('centers');                      // vendor, ZM, ACH, stamp, stand ... columns
const canOpsEdit       = () => ROLE !== 'Vendor Manager';                 // Operations sheets (a special login: only its edit columns)
const canSpecialAdmin  = () => ['Super Admin', 'Admin'].includes(ROLE);   // create / change special logins
const canTrash         = () => ROLE === 'Super Admin';                    // recycle bin: see and restore deleted data
const isScoped         = () => ['Project Manager', 'RM', 'AM'].includes(ROLE);

/* Who the signed-in person is in the employees table (set at sign-in) */
let MY_ID = '';
/* Who may change a center's RM / AM (in Operator Calling only): Super Admin, Admin and the PM set both; an RM sets the AM of his own centers */
const canAssign = (f, a) => ['Super Admin', 'Admin', 'Project Manager'].includes(ROLE) || (f === 'am' && ROLE === 'RM' && !!a && !!MY_ID && a.rm === MY_ID);
/* A Project Manager works only on the services they are PM for; everyone else follows the database scope */
const svcAllowed = (p, sv) => ROLE !== 'Project Manager' || !p || !p.pmBy || !Object.values(p.pmBy).some(a => (a || []).length) || ((p.pmBy || {})[sv] || []).includes(MY_ID);
const canCsup = () => ['Super Admin', 'Admin'].includes(ROLE);                  // CSUP number: Admin only
const canBulkData = () => ['Super Admin', 'Admin'].includes(ROLE);              // Opsview / AI / Training video data: bulk upload by Admin only
