-- ExcellCore patch 2: run ONCE in Supabase > SQL Editor, AFTER excellcore_supabase.sql and excellcore_patch.sql.
-- Safe to run again. It does not change how the app saves data; everything below is filled in by database triggers.
--   1. Who created / last modified every row (name + email) on projects and the other main tables
--   2. Every project detail in its own column (no comma-separated or JSON-only values), plus a project_managers table
--   3. Audit log shows the person's email and name
--   4. Field-level change log:  "<name> (<email>) modified <field> on <date time>"  followed by a line "<previous> -> <current>"

-- ---------------------------------------------------------------------------------------------
-- 0. Who is making this change?  (name comes from profiles, email from the sign-in token)
-- ---------------------------------------------------------------------------------------------
create or replace function public.who() returns table(uid uuid, email text, name text)
language sql stable security definer set search_path = public as $$
  select auth.uid(),
         nullif(auth.jwt()->>'email',''),
         coalesce((select p.name from public.profiles p where p.id = auth.uid()),
                  nullif(auth.jwt()->'user_metadata'->>'full_name',''),
                  nullif(auth.jwt()->>'email',''))
$$;

-- ---------------------------------------------------------------------------------------------
-- 1. Created by / last modified by
-- ---------------------------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['projects','employees','vendors','vc_master','zm_state','vc_state','centers','center_assignments','sheet_entries'] loop
    execute format('alter table %I
        add column if not exists created_at timestamptz default now(),
        add column if not exists created_by_id uuid,
        add column if not exists created_by_email text,
        add column if not exists created_by_name text,
        add column if not exists updated_at timestamptz,
        add column if not exists updated_by_id uuid,
        add column if not exists updated_by_email text,
        add column if not exists updated_by_name text', t);
  end loop;
end $$;

create or replace function public.stamp_who() returns trigger language plpgsql security definer set search_path = public as $$
declare w record; v jsonb;
begin
  select * into w from public.who();
  if tg_op = 'INSERT' then
    v := jsonb_build_object('created_at', now(), 'created_by_id', w.uid, 'created_by_email', w.email, 'created_by_name', w.name,
                            'updated_at', now(), 'updated_by_id', w.uid, 'updated_by_email', w.email, 'updated_by_name', w.name);
  else   -- the creator never changes
    v := jsonb_build_object('created_at', to_jsonb(old)->'created_at', 'created_by_id', to_jsonb(old)->'created_by_id',
                            'created_by_email', to_jsonb(old)->'created_by_email', 'created_by_name', to_jsonb(old)->'created_by_name',
                            'updated_at', now(), 'updated_by_id', w.uid, 'updated_by_email', w.email, 'updated_by_name', w.name);
  end if;
  new := jsonb_populate_record(new, v);
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['projects','employees','vendors','vc_master','zm_state','vc_state','centers','center_assignments','sheet_entries'] loop
    execute format('drop trigger if exists stamp_who on %I', t);
    execute format('create trigger stamp_who before insert or update on %I for each row execute function public.stamp_who()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 2. Project details as real columns
-- ---------------------------------------------------------------------------------------------
alter table projects
  add column if not exists official_project_code text,
  add column if not exists exam_spread text,
  add column if not exists candidate_count int,
  add column if not exists shift_count int,
  add column if not exists jammer_installed text,
  add column if not exists id_card_requirement text,
  add column if not exists svc_biometric boolean,
  add column if not exists svc_frisking boolean,
  add column if not exists svc_cso boolean,
  add column if not exists other_service_1 text,
  add column if not exists other_service_2 text,
  add column if not exists other_service_3 text,
  add column if not exists mod_fps_fr boolean,
  add column if not exists mod_iris_fr boolean,
  add column if not exists mod_face_auth boolean,
  add column if not exists mod_biometric_verification boolean,
  add column if not exists mod_ancillary_services boolean,
  add column if not exists mod_palm_fr boolean,
  add column if not exists bio_device_fps boolean,
  add column if not exists bio_device_iris boolean,
  add column if not exists bio_device_palm boolean,
  add column if not exists biometric_location text,
  add column if not exists aadhaar_type text,
  add column if not exists biometric_allotment_ratio numeric,
  add column if not exists fr_hhmd boolean,
  add column if not exists fr_dfmd boolean,
  add column if not exists fr_baggage boolean,
  add column if not exists fr_female_enclosure boolean,
  add column if not exists frisking_allotment_ratio numeric,
  add column if not exists baggage_allotment_ratio numeric;

-- one From and one To column for every shift (1 to 8): exam duration, biometric window, frisking window
do $$ declare i int; k text; begin
  for i in 1..8 loop
    foreach k in array array['exam','bio_window','frisking_window'] loop
      execute format('alter table projects add column if not exists %I time, add column if not exists %I time', k||'_s'||i||'_from', k||'_s'||i||'_to');
    end loop;
  end loop;
end $$;

create or replace function public.safe_num(t text) returns numeric language plpgsql immutable as $$
begin return nullif(trim(t),'')::numeric; exception when others then return null; end $$;
create or replace function public.safe_time(t text) returns time language plpgsql immutable as $$
begin return nullif(trim(t),'')::time; exception when others then return null; end $$;

create or replace function public.projects_cols() returns trigger language plpgsql set search_path = public as $$
declare
  d  jsonb := coalesce(new.details, '{}'::jsonb);
  sv jsonb := case when jsonb_typeof(d->'services')   = 'array' then d->'services'   else '[]'::jsonb end;
  md jsonb := case when jsonb_typeof(d->'modality')   = 'array' then d->'modality'   else '[]'::jsonb end;
  fs jsonb := case when jsonb_typeof(d->'frServices') = 'array' then d->'frServices' else '[]'::jsonb end;
  oth text[]; v jsonb; i int;
begin
  select coalesce(array_agg(x), '{}') into oth from jsonb_array_elements_text(sv) x where x not in ('Biometric','Frisking','CSO');
  v := jsonb_build_object(
    'official_project_code', nullif(d->>'pcode',''), 'exam_spread', nullif(d->>'spread',''),
    'candidate_count', safe_num(d->>'candidates')::int, 'shift_count', safe_num(d->>'shifts')::int,
    'jammer_installed', nullif(d->>'jammer',''), 'id_card_requirement', nullif(d->>'idcard',''),
    'svc_biometric', sv ? 'Biometric', 'svc_frisking', sv ? 'Frisking', 'svc_cso', sv ? 'CSO',
    'other_service_1', oth[1], 'other_service_2', oth[2], 'other_service_3', oth[3],
    'mod_fps_fr', md ? 'FPS + FR', 'mod_iris_fr', md ? 'Iris + FR', 'mod_face_auth', md ? 'Face Auth',
    'mod_biometric_verification', md ? 'Biometric Verification', 'mod_ancillary_services', md ? 'Ancillary Services', 'mod_palm_fr', md ? 'Palm + FR',
    'bio_device_fps', md ? 'FPS + FR', 'bio_device_iris', md ? 'Iris + FR', 'bio_device_palm', md ? 'Palm + FR',
    'biometric_location', nullif(d->>'attLoc',''), 'aadhaar_type', nullif(d->>'aadhaar',''),
    'biometric_allotment_ratio', safe_num(d->>'opRatio'),
    'fr_hhmd', fs ? 'HHMD', 'fr_dfmd', fs ? 'DFMD', 'fr_baggage', fs ? 'Baggage', 'fr_female_enclosure', fs ? 'Female Enclosure',
    'frisking_allotment_ratio', safe_num(d->>'frRatio'), 'baggage_allotment_ratio', safe_num(d->>'bagRatio'));
  for i in 1..8 loop
    v := v || jsonb_build_object(
      'exam_s'||i||'_from',            safe_time(d #>> array['dur',  (i-1)::text, '0']), 'exam_s'||i||'_to',            safe_time(d #>> array['dur',  (i-1)::text, '1']),
      'bio_window_s'||i||'_from',      safe_time(d #>> array['bwin', (i-1)::text, '0']), 'bio_window_s'||i||'_to',      safe_time(d #>> array['bwin', (i-1)::text, '1']),
      'frisking_window_s'||i||'_from', safe_time(d #>> array['fwin', (i-1)::text, '0']), 'frisking_window_s'||i||'_to', safe_time(d #>> array['fwin', (i-1)::text, '1']));
  end loop;
  new := jsonb_populate_record(new, v);
  return new;
end $$;

drop trigger if exists projects_cols on projects;
create trigger projects_cols before insert or update on projects for each row execute function public.projects_cols();

-- Project managers: one row per person per service (no lists inside a single cell)
create table if not exists project_managers(project_code text not null references projects on delete cascade, service text not null,
  pm_id text not null, pm_name text, primary key (project_code, service, pm_id));
alter table project_managers enable row level security;
drop policy if exists read_project_managers on project_managers;
create policy read_project_managers on project_managers for select to authenticated using (app_role() is not null);

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
drop trigger if exists projects_pm_sync on projects;
create trigger projects_pm_sync after insert or update on projects for each row execute function public.projects_pm_sync();

-- ---------------------------------------------------------------------------------------------
-- 3. Audit log: add the person's email and name
-- ---------------------------------------------------------------------------------------------
alter table audit_log add column if not exists actor_email text, add column if not exists actor_name text;

create or replace function public.audit() returns trigger language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.who();
  insert into audit_log(actor, actor_email, actor_name, action, table_name, row_key, old_data, new_data)
  values (w.uid, w.email, w.name, tg_op, tg_table_name,
    coalesce(to_jsonb(new)->>'code', to_jsonb(new)->>'center_code', to_jsonb(new)->>'id',
             to_jsonb(old)->>'code', to_jsonb(old)->>'center_code', to_jsonb(old)->>'id'),
    to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end $$;

-- fill in the email for rows that were logged before this patch
update audit_log a set actor_email = u.email, actor_name = coalesce(p.name, u.email)
from auth.users u left join profiles p on p.id = u.id
where a.actor = u.id and a.actor_email is null;

-- ---------------------------------------------------------------------------------------------
-- 4. Field-level change log
-- ---------------------------------------------------------------------------------------------
create table if not exists change_log(id bigint generated always as identity primary key, "at" timestamptz not null default now(),
  actor_id uuid, actor_email text, actor_name text, table_name text not null, project_code text, row_key text,
  action text not null, field text, old_value text, new_value text);
create index if not exists change_log_at_idx      on change_log("at" desc);
create index if not exists change_log_project_idx on change_log(project_code, "at" desc);
create index if not exists change_log_row_idx     on change_log(table_name, row_key);
alter table change_log enable row level security;
drop policy if exists admin_change_log on change_log;
create policy admin_change_log on change_log for select to authenticated using (app_role() = 'Super Admin');

-- friendly field names
create table if not exists field_labels(scope text not null, key text not null, label text not null, primary key (scope, key));
alter table field_labels enable row level security;
drop policy if exists read_field_labels on field_labels;
create policy read_field_labels on field_labels for select to authenticated using (true);
insert into field_labels(scope, key, label) values
 ('projects','name','Project Name'),('projects','client','Client Name'),('projects','exam','Exam Name'),('projects','pcode','Project Code'),('projects','spread','Exam Spread'),
 ('projects','candidates','Candidate Count'),('projects','shifts','Shift Count'),('projects','dur','Exam Duration'),('projects','jammer','Jammer Installed'),('projects','idcard','ID Card Requirement'),
 ('projects','modality','Modality'),('projects','bwin','Biometric Window'),('projects','attLoc','Biometric Location'),('projects','aadhaar','Aadhaar / Non Aadhaar'),
 ('projects','opRatio','Biometric Allotment Ratio'),('projects','fwin','Frisking Window'),('projects','frServices','Frisking Service'),('projects','frRatio','Frisking Allotment Ratio'),
 ('projects','bagRatio','Baggage Allotment Ratio'),('projects','pmBy','Project Manager'),('projects','services','Services'),('projects','start','Start Date'),('projects','end','End Date'),('projects','status','Status'),
 ('employees','name','Name'),('employees','role','Role'),('employees','contact','Mobile'),('employees','email','Email'),('employees','status','Status'),('employees','doj','DOJ'),
 ('employees','aadhar_last4','Aadhaar (last 4)'),('employees','vendor_code','Vendor Code'),('employees','photo_link','Photo Drive Link'),
 ('vc_master','holder_name','Account Holder Name'),('vc_master','gst_no','GST No.'),('vc_master','vendor_name','Vendor Name'),('vc_master','zm','ZM'),('vc_master','vm','VM'),('vc_master','service','Service'),('vc_master','status','Status'),
 ('zm_state','status','Status'),('vc_state','status','Status'),
 ('centers','client_code','Client Code'),('centers','state','State'),('centers','city','City'),('centers','name','Center Name'),('centers','address','Center Address'),
 ('centers','shift_candidates','Candidate Count (date and shift wise)'),('centers','vc_code','VC Code'),('centers','zm','ZM Name'),('centers','city_head','City Head'),
 ('centers','contact','Vendor Name-Contact Number'),('centers','stamp','Verification Stamp'),('centers','stand','Stand'),('centers','qm','Queue Manager'),('centers','rem','Remarks'),
 ('centers','neg','Negative Balance'),('centers','gt','Guard Type'),('centers','hhmd','HHMD'),('centers','encl','Enclosure'),('centers','idc','Id Cards'),('centers','jk','Jackets Inno'),('centers','cha','City Head Address'),
 ('center_assignments','rm_id','RM'),('center_assignments','am_id','AM'),('center_assignments','rm_name','RM Name'),('center_assignments','am_code','AM ID'),
 ('center_assignments','ach','ACH Name & No'),('center_assignments','csup','CSUP Name / Number'),('center_assignments','dr','DR Name & No'),
 ('sheet_entries','name','Biometric Operator Name'),('sheet_entries','num','Biometric Operator Number'),('sheet_entries','des','Biometric Designation'),('sheet_entries','exp','Experience'),
 ('sheet_entries','bcs','Biometric Calling Status'),('sheet_entries','app','Has Smartphone/App'),('sheet_entries','mot','Mode of Transport'),('sheet_entries','rt','Reaching Time on Exam'),
 ('sheet_entries','rem','Remarks'),('sheet_entries','aad','Aadhar card No.'),('sheet_entries','aadv','Aadhar Valid / Not Valid'),('sheet_entries','selfie','Selfie Received'),
 ('sheet_entries','aadp','Aadhar Photo'),('sheet_entries','gen','Gender'),('sheet_entries','age','Age'),('sheet_entries','fn','Father Name'),('sheet_entries','dob','Date Of Birth'),
 ('sheet_entries','addr','Address'),('sheet_entries','rate','Manpower Rate'),('sheet_entries','sqa','Seqrview Address'),('sheet_entries','sqn','SeqView Number'),('sheet_entries','sqo','SeqrView Onboard'),
 ('sheet_entries','sqd','SeqrView DOB'),('sheet_entries','sqname','SeqrView Name'),('sheet_entries','newob','New Onboard'),('sheet_entries','tvw','Training Video Watched'),
 ('sheet_entries','tvc','Video Watched Count'),('sheet_entries','tvs','Video Watched Status'),('sheet_entries','fin','Final Status'),('sheet_entries','onb','Onboarded'),
 ('sheet_entries','nonb','New On Boarded'),('sheet_entries','aic','AI Calling'),('sheet_entries','aics','AI Calling Status'),('sheet_entries','rec','Recording URL'),('sheet_entries','dist','Distance'),
 ('sheet_entries','mat','Material Status'),('sheet_entries','rms','RE Mock Status'),('sheet_entries','mdc','Mock Date By Client'),('sheet_entries','mtc','Mock Time By Client'),
 ('sheet_entries','mpname','Mock Person Name'),('sheet_entries','mpn','Mock Person Number'),('sheet_entries','mcc','Mock Calling Confirmation'),('sheet_entries','rtm','Reaching Time on Mock'),
 ('sheet_entries','fm','Final Mock'),('sheet_entries','ma','Mock Attendance'),('sheet_entries','mrp','Mock Report'),('sheet_entries','wifi','WIFI Availability Status'),
 ('sheet_entries','dev','# Device'),('sheet_entries','dd','# Devices Data Download'),('sheet_entries','trd','# Devices Transaction Done'),('sheet_entries','ub','# Unique Bio Device'),
 ('sheet_entries','ua','# Unique Aadhar Transaction'),('sheet_entries','tvr','Training Video Received'),('sheet_entries','boc','# Bio Operator Count'),('sheet_entries','tph','Training Photos Received'),
 ('sheet_entries','mpr','Manpower Reached'),('sheet_entries','eta','ETA'),('sheet_entries','exs','Exit Selfie'),('sheet_entries','exc','Exam Code'),('sheet_entries','usr','Username'),
 ('sheet_entries','at1','Actual Time (First)'),('sheet_entries','at2','Actual Time (Last)'),('sheet_entries','cih','Center Issues Highlighted During exam'),
 ('profiles','role','Login Role'),('profiles','active','Login Active'),('profiles','name','Name')
on conflict (scope, key) do nothing;

create or replace function public.field_label(t text, k text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select label from field_labels where scope = t and key = k),
                  case when k ~ '^mf[0-9]$' then 'Male:Female Day ' || (substr(k,3)::int + 1)
                       when k ~ '^csrr?[0-9]+$' then 'CSR ' || k
                       else initcap(replace(k,'_',' ')) end)
$$;

-- value to readable text (arrays, per-shift times and objects included)
create or replace function public.fmt_val(v jsonb) returns text language plpgsql immutable as $$
declare r text;
begin
  if v is null or jsonb_typeof(v) = 'null' then return null; end if;
  if jsonb_typeof(v) = 'string' then return v #>> '{}'; end if;
  if jsonb_typeof(v) = 'array' then
    if jsonb_array_length(v) = 0 then return null; end if;
    if jsonb_typeof(v->0) = 'array' then
      select string_agg('S'||ord||' '||coalesce(nullif(e->>0,''),'-')||' to '||coalesce(nullif(e->>1,''),'-'), '; ' order by ord) into r from jsonb_array_elements(v) with ordinality t(e, ord);
    else
      select string_agg(x, ', ') into r from jsonb_array_elements_text(v) x;
    end if;
    return r;
  end if;
  if jsonb_typeof(v) = 'object' then
    select string_agg(key||': '||coalesce(public.fmt_val(value),'-'), '; ') into r from jsonb_each(v) where public.fmt_val(value) is not null;
    return r;
  end if;
  return v #>> '{}';
end $$;

-- the fields worth logging for each table
create or replace function public.flat_row(t text, j jsonb) returns jsonb language plpgsql immutable as $$
declare r jsonb := '{}'; k text; v jsonb;
  skip text[] := array['created_at','created_by_id','created_by_email','created_by_name','updated_at','updated_by_id','updated_by_email','updated_by_name','updated_by','id','extra','details','data'];
  dup  text[] := array['code','client','state','city','name','addr','vc','zm','ch','cd','cand'];
begin
  if j is null then return r; end if;
  if t = 'projects' then
    for k, v in select key, value from jsonb_each(coalesce(j->'details','{}'::jsonb)) loop
      if k not in ('code','created','pm','bioDev','date') then r := r || jsonb_build_object(k, v); end if;
    end loop;
    return r;
  end if;
  if t = 'sheet_entries' then
    for k, v in select key, value from jsonb_each(coalesce(j->'data','{}'::jsonb)) loop r := r || jsonb_build_object(k, v); end loop;
    return r;
  end if;
  for k, v in select key, value from jsonb_each(j) loop
    if t = 'projects' or k = any(skip) then continue; end if;
    r := r || jsonb_build_object(k, v);
  end loop;
  if t = 'centers' then
    for k, v in select key, value from jsonb_each(coalesce(j->'extra','{}'::jsonb)) loop
      if not (k = any(dup)) then r := r || jsonb_build_object(k, v); end if;
    end loop;
  end if;
  return r;
end $$;

create or replace function public.log_changes() returns trigger language plpgsql security definer set search_path = public as $$
declare w record; o jsonb; n jsonb; r record; pc text; rk text; lbl text;
  ins text := 'insert into change_log(actor_id, actor_email, actor_name, table_name, project_code, row_key, action, field, old_value, new_value) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)';
begin
  select * into w from public.who();
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  pc := coalesce(n->>'project_code', o->>'project_code', case when tg_table_name = 'projects' then coalesce(n->>'code', o->>'code') end);
  rk := case tg_table_name
          when 'sheet_entries'   then coalesce(n->>'sheet', o->>'sheet') || ' ' || coalesce(n->>'row_key', o->>'row_key')
          when 'zm_state'        then coalesce(n->>'state', o->>'state') || ' / ' || coalesce(n->>'zm_name', o->>'zm_name')
          when 'vc_state'        then coalesce(n->>'state', o->>'state') || ' / ' || coalesce(n->>'vc_code', o->>'vc_code')
          when 'project_vendors' then coalesce(n->>'project_code', o->>'project_code') || ' / ' || coalesce(n->>'vendor_code', o->>'vendor_code')
          when 'centers'         then coalesce(n->>'center_code', o->>'center_code') || ' (' || coalesce(n->>'service', o->>'service') || ')'
          when 'center_assignments' then coalesce(n->>'center_code', o->>'center_code')
          when 'employees'       then coalesce(n->>'id', o->>'id') || ' ' || coalesce(n->>'name', o->>'name')
          when 'profiles'        then coalesce(n->>'name', o->>'name')
          else coalesce(n->>'code', o->>'code', n->>'id', o->>'id') end;

  if tg_op = 'INSERT' then
    if tg_table_name = 'centers' then
      execute ins using w.uid, w.email, w.name, tg_table_name, pc, rk, 'created', null::text, null::text, null::text;
    else
      for r in select key as f, value as v from jsonb_each(public.flat_row(tg_table_name, n)) where coalesce(public.fmt_val(value),'') <> '' loop
        execute ins using w.uid, w.email, w.name, tg_table_name, pc, rk, 'added', public.field_label(tg_table_name, r.f), null::text, public.fmt_val(r.v);
      end loop;
    end if;
  elsif tg_op = 'DELETE' then
    execute ins using w.uid, w.email, w.name, tg_table_name, pc, rk, 'deleted', null::text, null::text, null::text;
  else
    for r in select coalesce(a.key, b.key) as f, a.value as ov, b.value as nv
             from jsonb_each(public.flat_row(tg_table_name, o)) a full join jsonb_each(public.flat_row(tg_table_name, n)) b on a.key = b.key
             where coalesce(public.fmt_val(a.value),'') <> coalesce(public.fmt_val(b.value),'') loop
      execute ins using w.uid, w.email, w.name, tg_table_name, pc, rk, 'modified', public.field_label(tg_table_name, r.f), public.fmt_val(r.ov), public.fmt_val(r.nv);
    end loop;
  end if;
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['projects','employees','vendors','vc_master','zm_state','vc_state','centers','center_assignments','sheet_entries','project_vendors','profiles'] loop
    execute format('drop trigger if exists log_changes on %I', t);
    execute format('create trigger log_changes after insert or update or delete on %I for each row execute function public.log_changes()', t);
  end loop;
end $$;

-- readable views (Admin only, because they follow the change_log permissions)
create or replace view activity_log with (security_invoker = true) as
select c.id, c."at" as at_utc, (c."at" at time zone 'Asia/Kolkata') as at_ist,
       coalesce(c.actor_name, c.actor_email, 'system') as by_name, coalesce(c.actor_email, 'system') as by_email,
       c.table_name, c.project_code, c.row_key, c.action, c.field, c.old_value, c.new_value,
       coalesce(c.actor_name, c.actor_email, 'system')
         || case when c.actor_email is not null and c.actor_name is distinct from c.actor_email then ' (' || c.actor_email || ')' else '' end
         || ' ' || c.action || ' ' || coalesce(c.field, c.table_name) || ' [' || c.table_name || ' ' || coalesce(c.row_key,'') || ']'
         || ' on ' || to_char(c."at" at time zone 'Asia/Kolkata', 'DD-Mon-YYYY HH24:MI') || ' IST' as message,
       case when c.action in ('modified','added') then coalesce(c.old_value,'(blank)') || ' -> ' || coalesce(c.new_value,'(blank)') end as change
from change_log c;

-- two lines per change: the sentence, then the previous -> current value on the next row
create or replace view activity_feed with (security_invoker = true) as
select id, 1 as line, at_utc, message as text from activity_log
union all
select id, 2, at_utc, '        ' || change from activity_log where change is not null;

grant select on activity_log, activity_feed to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Fill the new columns for projects that already exist (does not count as an edit)
-- ---------------------------------------------------------------------------------------------
alter table projects disable trigger stamp_who;
alter table projects disable trigger log_changes;
alter table projects disable trigger audit_projects;
update projects set details = details;
-- who created / last changed each existing project, taken from the audit log
update projects p set created_by_id = a.actor, created_by_email = a.actor_email, created_by_name = a.actor_name
from (select distinct on (row_key) row_key, actor, actor_email, actor_name from audit_log where table_name = 'projects' order by row_key, at asc) a
where a.row_key = p.code and p.created_by_email is null;
update projects p set updated_by_id = a.actor, updated_by_email = a.actor_email, updated_by_name = a.actor_name, updated_at = coalesce(p.updated_at, a.at)
from (select distinct on (row_key) row_key, actor, actor_email, actor_name, at from audit_log where table_name = 'projects' order by row_key, at desc) a
where a.row_key = p.code and p.updated_by_email is null;
alter table projects enable trigger stamp_who;
alter table projects enable trigger log_changes;
alter table projects enable trigger audit_projects;
