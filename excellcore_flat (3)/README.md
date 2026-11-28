# ExcellCore

CRM and operations management for the Innovatiview Excellence team.

| Technology | Purpose | Where it lives |
|---|---|---|
| HTML | CRM structure | `index.html` (sign-in screen, app shell, modal) |
| CSS | Design and layout | `css/` (tokens, base, layout, components, login) |
| JavaScript | Buttons, forms, logic, calculations | `js/` |
| Supabase | Database, login, permissions | `supabase/` (SQL) + `js/supabase-sync.js` |
| Vercel | Hosting and deployment | `vercel.json` |

## Folder map

```
index.html
css/   tokens.css  base.css  layout.css  components.css  login.css
js/    config.js           Supabase URL + publishable key
       roles.js            the six roles and what each may do
       helpers.js          shared state and utilities
       supabase-sync.js    load/save to Supabase, role permissions
       router.js           navigation and render()
       shell.js            sidebar, icons, search, Google sign-in
       main.js             start-up
       views/              one file per area of the CRM
supabase/  001_schema.sql ... 014_login_and_unique.sql  015_special_logins_recycle_bin.sql
vercel.json
```

Scripts are plain `<script>` tags that share one global scope, so **the order in `index.html` matters**. Add a new file by placing its tag before `main.js`.

## Restyling
Colours, radii and sizes are variables in `css/tokens.css`. Change the brand colour there and the whole app follows. Dark mode follows the user's system setting.

## Supabase setup
1. SQL Editor, run in this order: `001_schema.sql` (new projects only), your `excellcore_patch.sql` (if you have it), `002_app_support.sql`, `003_audit_and_columns.sql`, **`004_roles.sql`**, then **`005_cleanup_service_fields.sql`**, then optionally `006_indexes.sql`, then `007_pm_service_scope.sql` `008_allow_both_domains.sql`, `010_sheet_tables.sql`, `011_link_people.sql`, `012_inactive_people.sql`, `013_access_rules.sql`, `014_login_and_unique.sql` and **`015_special_logins_recycle_bin.sql`**. SeQRView lookups use the Edge Function in `supabase/functions/seqrview-lookup` (secrets MIS_USERNAME and MIS_PASSWORD). If you already have a live database, you only need 004 and 005 (plus 002 if unsure). 002 to 005 are safe to run again.
2. Authentication > Providers: enable Google. Only `innovatiview.in` / `innovatiview.com` accounts can sign up (database trigger).
3. Authentication > URL Configuration: add your Vercel URL to Site URL and Redirect URLs.
4. Run `004_roles.sql` and deploy the new site straight after each other; the old site does not know the new role names.

## Roles
| Role | Access |
|---|---|
| Super Admin | Complete CRM, users, logs |
| Admin | MIS tasks: create and edit projects, upload Bio / Frisking / CSO center lists, master data, employees |
| Project Manager | Assigned projects only (projects where they are a PM) |
| RM | Assigned projects and assigned centers only |
| AM (AM / Sr AM) | Assigned projects and assigned centers only |
| Vendor Manager | Vendor and manpower allocation: vendors, vendor / ZM / ACH columns, Guard List, OP List |
| Special | Special logins (Sr Project Manager, Vendor Team Head, Operation Manager, Process Excellence, SCM Team ...): every project, only the sheets / columns given, View or Edit (015) |

Existing users are converted once by `004_roles.sql`: Admin -> Super Admin, MIS -> Admin, Operations -> Project Manager, Vendor -> Vendor Manager.

Set a role (and link the person to their employee row, used to find their projects and centers):
```sql
update profiles set role = 'RM', employee_id = 'E-003' where email = 'name@innovatiview.in';
```
If `employee_id` is empty, the login email is matched to `employees.email`. New sign-ins start as AM and see nothing until they are assigned centers.

The rules are enforced by Row Level Security in the database (`004_roles.sql`); `js/roles.js` mirrors them to decide what to show. Change both together.

The key in `js/config.js` is the *publishable* key and is safe in the browser. Never put the `service_role` key in this folder.

## Deploy on Vercel
Push this folder to a Git repository and import it in Vercel. No build step or framework is needed (`vercel.json` already says so). Or with the CLI: `vercel --prod`.

## Run locally
`python3 -m http.server 8000` in this folder, then open http://localhost:8000. Google sign-in needs `http://localhost:8000` added to Supabase's Redirect URLs.


## One table per calling sheet (010)

| Sheet | Table | Primary key |
|---|---|---|
| Operator Calling | `operator_calling` | project_code, service, center_code, exam_date, op_no |
| Mock Calling | `mock_calling` | project_code, service, center_code |
| TV Data Download Calling | `tv_data_download_calling` | project_code, service, center_code |
| Exam day Calling | `exam_day_calling` | project_code, service, center_code, exam_date |
| Guard List | `guard_list` | project_code, service, group_key (state\|city\|vendor code) |
| OP List | `op_list` | project_code, service, group_key |

* `project_code` is the service's official Project Code; Biometric, Frisking and CSO share each table. `project_id` links to the project.
* Every cell change is written to `change_log` (who, when, previous and new value); read it through `activity_log`.
* The old `sheet_entries` table is kept as a backup and is no longer used by the app.
* If `003` is ever run again it replaces the logging functions; run `010` again afterwards (it is safe to repeat).
* `js/sheet-tables.js` lists the columns of each table. It is generated from the sheet definitions; when a column is added to a sheet, add it to the table and to that file (anything not listed is kept in the table's `extra` column, so nothing is lost meanwhile).

## Every column is saved (010) and the compile step
* Typed-in columns and the values fetched from SeQRView are saved by the normal sync.
* Columns that are fetched or calculated from other sheets (Center Name, RM, Vendor, Total Opr, counts ...) are written by `js/sheet-compile.js`
  for every row of the open sheet a couple of seconds after any change, and for the whole project with the **Save all columns to DB** button.
* Run `010` again whenever you deploy a version that adds columns: it adds the missing columns to existing tables and never removes data.

## People and access (011, 012)
* `011`: a login whose email is in the PM / RM / AM lists gets that role automatically (also if the person is added after first sign-in).
* `012`: an employee marked Inactive is removed from every Active and Upcoming project (as PM and as RM / AM of centers); Completed, Postponed and Cancelled projects keep them. Projects can now be Postponed or Cancelled.
* PM / RM / AM edit the operations sheets (Operator, Mock, Data Download, Exam day) and can only view Guard List and OP List.

## Access rules (013) and the Admin-only data
* **Sign-in**: an @innovatiview.in / .com email, or any email listed in the people list (PM / RM / AM DB, Active). Role follows the people list (011).
* **CSUP Name / Number**: Super Admin and Admin only (screen and database). ACH name / number follows the centre list: Admin and Vendor Manager.
* **Opsview, AI and Training video data** (AI Calling Status, AI ETA ..., Opsview status, Training Video Watched / Received ...): nobody types them in.
  An Admin fills them with **Bulk data upload (Admin)** on the operations sheets; the database refuses changes from anyone else.
* **Exam day Calling**: JCO (CSO), Frisking and Biometric RM, operator name and number and the Frisking vendor come from those services' own sheets.
  Centres are matched across services by code (0101 = 101).
* **Filters**: every table has a filter on each column; tables that already had their own keep them.

## Login for outside addresses, one person per email / mobile (014)
* A login that is not @innovatiview.in / .com (the people-list whitelist) works only while the person is assigned to an Active or Upcoming project (PM) or center (RM / AM). Super Admin, Admin and Vendor Manager are not affected.
* An email address and a mobile number can belong to one person only, across all roles. The screens and uploads refuse a clash, and the database enforces it.
  If duplicates already exist, `014` stops and shows how to list them; fix them and run it again.
* Every role opens the same project page (project details / scope of work, PMs, centers). Only Admin and Super Admin can create or edit projects.
* AI Calling Status and Recording URL are filled by an Admin's bulk upload only; Age is fetched from SeQRView.


## Code map: numbering - module - purpose
Every file starts with `[NN] MODULE - purpose`; its sections are numbered `[NN.n]`. Search for `[14.6]` to jump to a section.

| No. | File | Module - purpose |
|---|---|---|
| 01 | js/config.js | CONFIG - Supabase URL and publishable key |
| 02 | js/helpers.js | HELPERS - shared utilities, 10 digit mobile rule (02.2), safe file names (02.3), call popup (02.4) |
| 03 | js/sheet-tables.js | SHEET TABLES - which app field goes to which database column |
| 04 | js/roles.js | ROLES - what each role may see and change on screen |
| 05 | js/supabase-sync.js | SUPABASE SYNC - load and save |
| 06 | js/router.js | ROUTER - navigation and render() |
| 07 | js/views/dashboard.js | DASHBOARD - home page of each role |
| 08 | js/views/projects.js | PROJECTS - CRM Project ID (08.1), project form incl. day-wise shift timings, project page |
| 09 | js/views/vendor-upload.js | VENDOR UPLOAD - ZM / VM upload (Vendor Manager) |
| 10 | js/views/people.js | PEOPLE - Employees and Vendors screens |
| 11 | js/views/bulk-assign.js | BULK ASSIGN - employee upload, RM / AM popup |
| 12 | js/views/operations-team.js | OPERATIONS TEAM - Reports / Settings, PM view |
| 13 | js/views/center-list.js | CENTER LIST - Bio / Frisking / CSO center lists, Vendor DB (with Email ID), ZM / VC DB |
| 14 | js/views/operations.js | OPERATIONS - Operator, Mock, TV Data Download, Exam day calling |
| 15 | js/views/stats.js | STATS - Quick links |
| 16 | js/shell.js | SHELL - sidebar, search, Google sign-in |
| 17 | js/views/people-db.js | PEOPLE DB - services, PM / RM / AM DB, project bulk upload |
| 18 | js/views/guard-op-list.js | GUARD / OP LIST - dropdowns and edit rights (18.2), screen (18.3) |
| 19 | js/sheet-compile.js | SHEET COMPILE - calculated columns to the database |
| 20 | js/bulk-data.js | BULK DATA - Opsview / AI / Training video upload (Admin) |
| 21 | js/table-filters.js | TABLE FILTERS - a filter on every other table |
| 22 | js/col-view.js | COLUMN VIEW - Columns button on every sheet, special-login sheet / column access |
| 23 | js/special-logins.js | SPECIAL LOGINS - list and add / edit screen |
| 24 | js/recycle-bin.js | RECYCLE BIN - deleted data and restore |
| 25 | js/main.js | MAIN - start-up |
| C1-C5 | css/tokens, base, layout, components, login | design |
| 001-015 | supabase/*.sql | database, run in number order |

## Project ID, timings, mobile numbers (app)
* **CRM Project ID** = the Service Project Code up to and including its date segment (DDMMYY): `UPESSC/ASST-PROF-STAFF/191126/BIOMETRIC/IIL` -> `UPESSC/ASST-PROF-STAFF/191126`.
  Every service of the exam must give the same ID; a second project with that ID is refused (add the service to the existing project instead).
  The ID of an existing project never changes; older projects keep their earlier ID.
* **Shift timings**: tick *Different shift timings on different days* to enter shifts x exam dates; untick to enter one set per shift.
* **Mobile numbers** (operator / SeqView / mock person numbers, CSR consignee contact, people lists, operator upload): 10 digits starting 6-9; +91 / 0 in front is dropped.
* **Call popup**: a cell with several "Name-Number" entries (Exam day: Opr Name & No, Bio / FRI / JCO Name & No, Supervisor ...) has a phone button listing every number with a Call button.

## Guard List / OP List columns and who edits them (015)
| Column | Values | Edited by (besides Super Admin / Admin) |
|---|---|---|
| Operator List Status / List Status | Sharing, Not Sure, Received, Partial received, Only Supervisor Received, Not Connected, Payment Issue, Mail not received, Wrong Number, Denied to work | PM, RM |
| Candidate Login, Staff Login | Shared / Not Shared | PM, RM |
| Remarks, Mock Time / Remarks, Device distribution Remarks, Training Time / Remarks, CSR Consignee Name, Address, Docket Number | free text | PM, RM |
| Experience/Fresher | Experience / Fresher | PM, RM |
| Group Created | Created by vendor, Not Created by vendor, AM Created (Team not added by Vendor), AM created (Team added), Other | PM, RM |
| Mock Date, Training date | calendar | PM, RM |
| Device Distribution / Distribution Status | Distribution done to supervisor, Partial done, Distribution done (Op & SUP), Distribution Pending, On Going, Other, Material Not Delivered | PM, RM |
| CSR Consignee Contact No. / PIN CODE | 10 digit mobile / 6 digit PIN | PM, RM |
| Ready for Dispatch | Yes / No | PM, RM |
| Manpower details received on time, Replacement provided, Mock Rating, Manpower training done, Unique OP profiles / Center | 1-5 | RM (his own rows) |
| Device Damages / Losses / delays | 1-5 | SCM Team (a special login) |
| Over all Rating | 1-5 | PM |
| PM Name | the service's PMs (when it has more than one) | an allotted PM of that service |
| Vendor Email | looked up from the Vendor DB (Email ID) | - |

Vendor Manager keeps editing the other typed columns; an RM edits only rows that hold his centers. The database enforces the same (col_guard).
Every sheet has a **Columns** button: each person ticks the columns they need (saved in that browser); Export to Excel follows it.

## Special logins (015)
Super Admin / Admin: **Others > Special logins**. Name, Google email (any domain), title, then rows of Sheets (one, several, All) + Columns (one, several, All) + View / Edit.
A special login sees every project. Center lists are view only. Choosing the title *SCM Team* fills in: view Guard List and OP List, edit Device Damages / Losses / delays.

## Where deleted data goes (015)
* Before 015: projects, centers, assignments, people, vendors and master data were kept whole in `audit_log` (Super Admin); calling-sheet rows left only a "deleted" line in `change_log`, without their values.
* From 015: every deleted row of every table (sheets included) is copied whole into `deleted_rows`. Older deletions found in `audit_log` are copied there too.
* Super Admin: **Others > Recycle bin** lists each delete (a project with its centers and sheet rows is one entry) and **Restore** puts it back.
* A value that was only cleared (not deleted) is in the change log (`activity_log`: previous -> new value).
