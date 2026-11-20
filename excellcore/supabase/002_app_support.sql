-- ExcellCore 002: things the app code relies on. Safe to run more than once.
-- If you already ran your own excellcore_patch.sql this does nothing new (everything is "if not exists").
-- Run order: 001_schema.sql -> (your excellcore_patch.sql, if you have it) -> 002_app_support.sql -> 003_audit_and_columns.sql

-- The app keeps the full original record of these rows in an "extra" JSON column.
do $$ declare t text; begin
  foreach t in array array['employees','vendors','vc_master','centers','center_assignments'] loop
    execute format('alter table %I add column if not exists extra jsonb not null default ''{}''', t);
  end loop;
end $$;

-- Center columns the app writes
alter table centers add column if not exists contact text;

-- Layout / team settings stored as JSON blobs (key = 'layout' or 'teams')
create table if not exists app_blobs(key text primary key, data jsonb not null default '{}');
alter table app_blobs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_blobs' and policyname = 'read_app_blobs') then
    create policy read_app_blobs on app_blobs for select to authenticated
      using (app_role() in ('Admin','MIS','Operations'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'app_blobs' and policyname = 'write_app_blobs') then
    create policy write_app_blobs on app_blobs for all to authenticated
      using (app_role() in ('Admin','MIS','Operations')) with check (app_role() in ('Admin','MIS','Operations'));
  end if;
end $$;
