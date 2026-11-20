-- ExcellCore 005: remove fields that do not belong to a project's services.
-- Example: a Biometric-only project that still carries Frisking window / ratio values.
-- The website now does this automatically on every save and bulk upload; this fixes projects saved earlier.
-- Safe to run more than once.

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
