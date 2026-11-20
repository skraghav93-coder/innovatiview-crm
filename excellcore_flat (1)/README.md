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
supabase/  001_schema.sql  002_app_support.sql  003_audit_and_columns.sql  004_roles.sql  005_cleanup_service_fields.sql  006_indexes.sql
vercel.json
```

Scripts are plain `<script>` tags that share one global scope, so **the order in `index.html` matters**. Add a new file by placing its tag before `main.js`.

## Restyling
Colours, radii and sizes are variables in `css/tokens.css`. Change the brand colour there and the whole app follows. Dark mode follows the user's system setting.

## Supabase setup
1. SQL Editor, run in this order: `001_schema.sql` (new projects only), your `excellcore_patch.sql` (if you have it), `002_app_support.sql`, `003_audit_and_columns.sql`, **`004_roles.sql`**, then **`005_cleanup_service_fields.sql`**, then optionally `006_indexes.sql`. If you already have a live database, you only need 004 and 005 (plus 002 if unsure). 002 to 005 are safe to run again.
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
