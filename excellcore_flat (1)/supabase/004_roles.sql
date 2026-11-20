-- ExcellCore 004: the six roles, and what each can see and change.
--   Super Admin      Complete CRM
--   Admin            MIS-team tasks: create / edit projects, upload Bio / Frisking / CSO center lists, master data
--   Project Manager  Assigned projects only
--   RM               Assigned projects and assigned centers only
--   AM               AM / Sr AM: assigned projects and assigned centers only
--   Vendor Manager   Vendor and manpower allocation
--
-- Run AFTER 001, 002 and 003. Safe to run again.
-- Existing users are converted ONCE:  Admin -> Super Admin,  MIS -> Admin,  Operations -> Project Manager,  Vendor -> Vendor Manager.
-- Deploy the new website right after running this (the old website does not know the new role names).

-- 1. Roles ------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass
             and pg_get_constraintdef(oid) like '%MIS%') then
    alter table profiles drop constraint profiles_role_check;
    update profiles set role = case role when 'Admin' then 'Super Admin' when 'MIS' then 'Admin'
                                          when 'Operations' then 'Project Manager' when 'Vendor' then 'Vendor Manager' end;
    alter table profiles add constraint profiles_role_check
      check (role in ('Super Admin','Admin','Project Manager','RM','AM','Vendor Manager'));
  elsif not exists (select 1 from pg_constraint where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) then
    alter table profiles add constraint profiles_role_check
      check (role in ('Super Admin','Admin','Project Manager','RM','AM','Vendor Manager'));
  end if;
end $$;

-- Link a login to an employee row. Used to find "my" projects and centers.
-- If left empty, the login email is matched to employees.email automatically.
alter table profiles add column if not exists employee_id text;   -- plain text on purpose: matches employees.id without needing it to be unique
alter table profiles add column if not exists email text;
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- New sign-ins start as AM: they see only centers assigned to them (none until an assignment exists).
create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, name, role, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'AM', new.email) on conflict do nothing;
  return new;
end $$;

-- 2. Helpers ----------------------------------------------------------------
create or replace function public.my_employee_id() returns text language sql stable security definer set search_path = public as $$
  select coalesce((select employee_id::text from profiles where id = auth.uid()),
                  (select e.id::text from employees e where lower(e.email) = lower(auth.jwt()->>'email') order by e.id limit 1)) $$;

-- Project Manager: projects where they are a PM.  RM / AM: projects where they hold at least one center.
create or replace function public.can_scope_project(pc text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager') then true
    when app_role() = 'Project Manager' then exists (select 1 from projects p where p.code = pc and my_employee_id() = any (p.pm_ids::text[]))
    when app_role() in ('RM','AM') then exists (select 1 from center_assignments a where a.project_code = pc and my_employee_id() in (a.rm_id::text, a.am_id::text))
    else false end $$;

-- RM / AM: only the centers assigned to them.  Project Manager: every center of their projects.
create or replace function public.can_scope_center(pc text, cc text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager') then true
    when app_role() = 'Project Manager' then can_scope_project(pc)
    when app_role() in ('RM','AM') then exists (select 1 from center_assignments a where a.project_code = pc and a.center_code = cc and my_employee_id() in (a.rm_id::text, a.am_id::text))
    else false end $$;

-- Sheet rows are keyed "<center code>|day|n" for center level sheets.
create or replace function public.can_scope_sheet(pc text, rk text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager') then true
    when app_role() = 'Project Manager' then can_scope_project(pc)
    when app_role() in ('RM','AM') then can_scope_project(pc) and (
         not exists (select 1 from centers c where c.project_code = pc and c.center_code = split_part(rk, '|', 1))
         or can_scope_center(pc, split_part(rk, '|', 1)))
    else false end $$;

-- 3. Policies: drop every old one on these tables, then create the new set ---
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in
    ('projects','employees','vendors','project_vendors','vc_master','zm_state','vc_state','centers','center_assignments',
     'calling_log','sheet_entries','app_blobs','profiles','audit_log','change_log','project_managers','field_labels')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

create or replace function public._pol(t text, sel text, wr text) returns void language plpgsql as $$
begin
  execute format('create policy %I on public.%I for select to authenticated using (%s)', 'sel_' || t, t, sel);
  if wr is not null then
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', 'ins_' || t, t, wr);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', 'upd_' || t, t, wr, wr);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', 'del_' || t, t, wr);
  end if;
end $$;

-- Projects: everyone sees only what their role allows; Super Admin and Admin create and edit.
select _pol('projects', 'can_scope_project(code)', $q$ app_role() in ('Super Admin','Admin') $q$);

-- Center data follows the same scope
select _pol('centers', 'can_scope_center(project_code, center_code)', $q$ app_role() in ('Super Admin','Admin','Vendor Manager') $q$);
select _pol('center_assignments', 'can_scope_center(project_code, center_code)',
  $q$ app_role() in ('Super Admin','Admin','Project Manager','RM','AM') and can_scope_center(project_code, center_code) $q$);
select _pol('sheet_entries', 'can_scope_sheet(project_code, row_key)', $q$ can_scope_sheet(project_code, row_key) $q$);

-- Calling log is append only
select _pol('calling_log', 'can_scope_center(project_code, center_code)', null);
create policy ins_calling_log on calling_log for insert to authenticated
  with check (app_role() in ('Super Admin','Admin','Project Manager','RM','AM') and can_scope_center(project_code, center_code) and called_by = auth.uid());

-- Reference data: every signed-in role can read; who can change it differs
select _pol('employees',  'app_role() is not null', $q$ app_role() in ('Super Admin','Admin') $q$);
select _pol('vendors',    'app_role() is not null', $q$ app_role() in ('Super Admin','Admin','Vendor Manager') $q$);
select _pol('project_vendors', 'app_role() is not null', $q$ app_role() in ('Super Admin','Admin','Vendor Manager') $q$);
select _pol('vc_master',  'app_role() is not null', $q$ app_role() in ('Super Admin','Admin') $q$);
select _pol('zm_state',   'app_role() is not null', $q$ app_role() in ('Super Admin','Admin') $q$);
select _pol('vc_state',   'app_role() is not null', $q$ app_role() in ('Super Admin','Admin') $q$);
select _pol('app_blobs',  'app_role() is not null', 'app_role() is not null');
select _pol('project_managers', 'app_role() is not null', null);

-- Users and logs: Super Admin only
select _pol('profiles',   $q$ id = auth.uid() or app_role() = 'Super Admin' $q$, $q$ app_role() = 'Super Admin' $q$);
select _pol('audit_log',  $q$ app_role() = 'Super Admin' $q$, null);
select _pol('change_log', $q$ app_role() = 'Super Admin' $q$, null);
select _pol('field_labels', 'true', null);

drop function public._pol(text, text, text);

-- First Super Admin (if you have none yet):
--   update profiles set role = 'Super Admin' where id = (select id from auth.users where email = 'you@innovatiview.in');
-- Make someone a Project Manager / RM / AM and link them to their employee row:
--   update profiles set role = 'RM', employee_id = 'E-003' where email = 'name@innovatiview.in';
