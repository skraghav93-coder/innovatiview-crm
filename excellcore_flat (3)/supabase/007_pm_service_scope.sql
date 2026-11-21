-- ExcellCore 007: a Project Manager works only on the services they are PM for.
-- Safe to run more than once. Run after 004.
-- If a project has no per-service PM rows yet, the PM keeps project-level access (re-save the project to fill them).
create or replace function public.can_scope_center(pc text, cc text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager') then true
    when app_role() = 'Project Manager' then can_scope_project(pc) and (
         not exists (select 1 from project_managers m where m.project_code = pc)
         or exists (select 1 from centers c join project_managers m on m.project_code = c.project_code and m.service = c.service
                    where c.project_code = pc and c.center_code = cc and m.pm_id = my_employee_id())
         or not exists (select 1 from centers c where c.project_code = pc and c.center_code = cc))
    when app_role() in ('RM','AM') then exists (select 1 from center_assignments a where a.project_code = pc and a.center_code = cc and my_employee_id() in (a.rm_id::text, a.am_id::text))
    else false end $$;

create or replace function public.can_scope_sheet(pc text, rk text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager') then true
    when app_role() in ('Project Manager','RM','AM') then can_scope_project(pc) and (
         not exists (select 1 from centers c where c.project_code = pc and c.center_code = split_part(rk, '|', 1))
         or can_scope_center(pc, split_part(rk, '|', 1)))
    else false end $$;

notify pgrst, 'reload schema';
