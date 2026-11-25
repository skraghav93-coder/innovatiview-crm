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
supabase/  001_schema.sql  002_app_support.sql  003_audit_and_columns.sql  004_roles.sql  005_cleanup_service_fields.sql  006_indexes.sql  007_pm_service_scope.sql  008_allow_both_domains.sql  010_sheet_tables.sql  011_link_people.sql  012_inactive_people.sql  013_access_rules.sql
vercel.json
```

Scripts are plain `<script>` tags that share one global scope, so **the order in `index.html` matters**. Add a new file by placing its tag before `main.js`.

## Restyling
Colours, radii and sizes are variables in `css/tokens.css`. Change the brand colour there and the whole app follows. Dark mode follows the user's system setting.

## Supabase setup
1. SQL Editor, run in this order: `001_schema.sql` (new projects only), your `excellcore_patch.sql` (if you have it), `002_app_support.sql`, `003_audit_and_columns.sql`, **`004_roles.sql`**, then **`005_cleanup_service_fields.sql`**, then optionally `006_indexes.sql`, then `007_pm_service_scope.sql` `008_allow_both_domains.sql`, `010_sheet_tables.sql`, `011_link_people.sql`, `012_inactive_people.sql` and `013_access_rules.sql`. SeQRView lookups use the Edge Function in `supabase/functions/seqrview-lookup` (secrets MIS_USERNAME and MIS_PASSWORD). If you already have a live database, you only need 004 and 005 (plus 002 if unsure). 002 to 005 are safe to run again.
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
