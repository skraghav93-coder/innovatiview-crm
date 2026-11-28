-- ExcellCore 012: project statuses Postponed and Cancelled, and inactive people.
--   * An employee marked Inactive is removed from every Active and Upcoming project: as Project Manager (project details)
--     and as RM / AM (center assignments). Completed, Cancelled and Postponed projects keep them exactly as they were.
--   * It is enforced in the database, so it also holds for uploads, stale screens and direct edits:
--     an inactive person cannot be saved into an Active / Upcoming project, or assigned to one of its centers.
--   * A project that moves back to Active / Upcoming is cleaned the same way.
-- Run after 010. Safe to run more than once.

-- 1. two more project statuses
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.projects'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%Upcoming%' loop
    execute format('alter table projects drop constraint %I', c);
  end loop;
  alter table projects add constraint projects_status_check check (status in ('Upcoming','Active','Completed','Postponed','Cancelled'));
end $$;

-- 2. projects: never keep an inactive person in an Active / Upcoming project (named to run before the other project triggers)
create or replace function public.projects_00_no_inactive() returns trigger language plpgsql security definer set search_path = public as $$
declare bad text[];
begin
  if new.status in ('Active', 'Upcoming') then
    select coalesce(array_agg(id::text), '{}') into bad from employees where status = 'Inactive';
    if cardinality(bad) > 0 then
      new.pm_ids := array(select x from unnest(new.pm_ids) x where x <> all (bad));
      new.details := jsonb_set(jsonb_set(coalesce(new.details, '{}'::jsonb), '{pm}',
          coalesce((select jsonb_agg(v) from jsonb_array_elements(case when jsonb_typeof(new.details->'pm') = 'array' then new.details->'pm' else '[]'::jsonb end) v where (v #>> '{}') <> all (bad)), '[]'::jsonb)),
        '{pmBy}',
          coalesce((select jsonb_object_agg(e.key, coalesce((select jsonb_agg(v) from jsonb_array_elements(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) v where (v #>> '{}') <> all (bad)), '[]'::jsonb))
                    from jsonb_each(case when jsonb_typeof(new.details->'pmBy') = 'object' then new.details->'pmBy' else '{}'::jsonb end) e), '{}'::jsonb));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists projects_00_no_inactive on projects;
create trigger projects_00_no_inactive before insert or update on projects for each row execute function public.projects_00_no_inactive();

-- 3. center assignments: no inactive RM / AM on an Active / Upcoming project
create or replace function public.assignments_no_inactive() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from projects p where p.code = new.project_code and p.status in ('Active', 'Upcoming')) then
    if new.rm_id is not null and exists (select 1 from employees e where e.id::text = new.rm_id::text and e.status = 'Inactive') then new.rm_id := null; end if;
    if new.am_id is not null and exists (select 1 from employees e where e.id::text = new.am_id::text and e.status = 'Inactive') then new.am_id := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists assignments_no_inactive on center_assignments;
create trigger assignments_no_inactive before insert or update on center_assignments for each row execute function public.assignments_no_inactive();

-- 4. the moment someone is marked Inactive, clean their live projects and centers (the two triggers above do the removal)
create or replace function public.retire_employee() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Inactive' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update projects p set details = p.details
      where p.status in ('Active', 'Upcoming') and (new.id::text = any (p.pm_ids) or p.details::text like '%"' || new.id::text || '"%');
    update center_assignments a set rm_id = a.rm_id, am_id = a.am_id
      where (a.rm_id::text = new.id::text or a.am_id::text = new.id::text) and exists (select 1 from projects p where p.code = a.project_code and p.status in ('Active', 'Upcoming'));
  end if;
  return null;
end $$;
drop trigger if exists retire_employee on employees;
create trigger retire_employee after insert or update of status on employees for each row execute function public.retire_employee();

-- 5. clean what is already there today
update projects set details = details where status in ('Active', 'Upcoming');
update center_assignments a set rm_id = a.rm_id, am_id = a.am_id where exists (select 1 from projects p where p.code = a.project_code and p.status in ('Active', 'Upcoming'));

notify pgrst, 'reload schema';
