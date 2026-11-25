-- ExcellCore 005: remove fields that do not belong to a project's services.
-- Example: a Biometric-only project that still carries Frisking window / ratio values.
-- The website now does this automatically on every save and bulk upload; this fixes projects saved earlier.
-- Safe to run more than once.

-- 0. Fix for databases where employees.id is a uuid: compare as text (the original version failed with "uuid = text").
--    This also stops project saves from failing when a project has Project Managers.
create or replace function public.projects_pm_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from project_managers where project_code = new.code;
  insert into project_managers(project_code, service, pm_id, pm_name)
  select new.code, s.key, p.value, (select e.name from employees e where e.id::text = p.value)
  from jsonb_each(case when jsonb_typeof(new.details->'pmBy') = 'object' then new.details->'pmBy' else '{}'::jsonb end) s,
       lateral jsonb_array_elements_text(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) p(value)
  on conflict do nothing;
  return null;
end $$;

alter table projects disable trigger stamp_who;
alter table projects disable trigger log_changes;
alter table projects disable trigger audit_projects;

update projects set details = details - 'fwin' - 'frServices' - 'frRatio' - 'bagRatio'
  where not ('Frisking' = any (services)) and details ?| array['fwin','frServices','frRatio','bagRatio'];

update projects set details = details - 'modality' - 'bioDev' - 'bwin' - 'attLoc' - 'aadhaar' - 'opRatio'
  where not ('Biometric' = any (services)) and details ?| array['modality','bioDev','bwin','attLoc','aadhaar','opRatio'];

update projects set details = details - 'csoNote'
  where not ('CSO' = any (services)) and details ? 'csoNote';

update projects set details = details - 'bagRatio'
  where details ? 'bagRatio' and not coalesce(details->'frServices', '[]'::jsonb) ? 'Baggage';

alter table projects enable trigger stamp_who;
alter table projects enable trigger log_changes;
alter table projects enable trigger audit_projects;

-- What is left: projects whose services list and filled-in fields now agree
select code, services, details ?| array['fwin','frServices','frRatio'] as has_frisking_fields,
       details ?| array['modality','bwin','opRatio'] as has_biometric_fields from projects order by code;
