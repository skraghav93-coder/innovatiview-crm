-- ExcellCore: run once in Supabase > SQL Editor.
-- Then create users in Authentication > Users and add one row each in profiles (role: Admin, MIS, Operations, Vendor).

create table profiles(id uuid primary key references auth.users on delete cascade, name text not null,
  role text not null check (role in ('Admin','MIS','Operations','Vendor')), active boolean not null default true);

create function app_role() returns text language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() and active $$;

create table projects(code text primary key, name text, client text, exam text, start_date date, end_date date,
  services text[] not null default '{}', status text not null default 'Upcoming' check (status in ('Upcoming','Active','Completed')),
  details jsonb not null default '{}', pm_ids text[] not null default '{}', created_at timestamptz default now());

create table employees(id text primary key, name text not null, role text, contact text, email text, status text default 'Active',
  doj date, aadhar_last4 text, vendor_code text, photo_link text);   -- Emp ID for AM / Sr AM = first 3 letters of name + last 4 Aadhaar digits
create table vendors(code text primary key, name text not null, zone text, zm text, vc text, contact text);
create table project_vendors(project_code text references projects on delete cascade, vendor_code text references vendors on delete cascade,
  primary key (project_code, vendor_code));

create table vc_master(code text primary key, holder_name text, gst_no text, vendor_name text, zm text, vm text, service text, status text default 'Active');
create table zm_state(state text, zm_name text, status text default 'Active', primary key (state, zm_name));
create table vc_state(state text, vc_code text references vc_master, status text default 'Active', primary key (state, vc_code));

create table centers(id bigint generated always as identity primary key,
  project_code text not null references projects on delete cascade, service text not null default 'Biometric',
  center_code text not null, client_code text, state text, city text, name text, address text,
  shift_candidates int[] not null default '{}', vc_code text references vc_master,
  zm text check (zm in ('Chetan','Deven','Girish','Monu')), vendor_contact text, city_head text, city_head_address text,
  verification_stamp text, stand text, queue_manager text, updated_at timestamptz default now(),
  unique (project_code, service, center_code));
create index on centers(project_code, service);
create index on centers(center_code);

create table center_assignments(project_code text, center_code text, rm_id text references employees, am_id text references employees, rm_name text, am_code text, ach text, csup text, dr text,
  primary key (project_code, center_code));

create table calling_log(id bigint generated always as identity primary key, project_code text not null, center_code text not null,
  status text not null, note text, called_by uuid default auth.uid() references auth.users, called_at timestamptz default now());
create index on calling_log(project_code, center_code, called_at desc);

create table audit_log(id bigint generated always as identity primary key, actor uuid default auth.uid(), action text,
  table_name text, row_key text, old_data jsonb, new_data jsonb, at timestamptz default now());

create function audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(action, table_name, row_key, old_data, new_data)
  values (tg_op, tg_table_name,
    coalesce(to_jsonb(new)->>'code', to_jsonb(new)->>'center_code', to_jsonb(old)->>'code', to_jsonb(old)->>'center_code'),
    to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['projects','employees','vendors','centers','center_assignments'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit()', t);
  end loop;
  -- everyone signed in with a role can read operational data, except Vendor (see below)
  foreach t in array array['projects','employees','vendors','project_vendors','centers','center_assignments','calling_log','audit_log','profiles','vc_master','zm_state','vc_state'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
  foreach t in array array['projects','employees','vendors','project_vendors','centers','center_assignments','calling_log','vc_master','zm_state','vc_state'] loop
    execute format('create policy read_%1$s on %1$I for select to authenticated using (app_role() in (''Admin'',''MIS'',''Operations''))', t);
  end loop;
  -- Admin and MIS manage master data
  foreach t in array array['projects','employees','centers','vc_master','zm_state','vc_state'] loop
    execute format('create policy write_%1$s on %1$I for all to authenticated using (app_role() in (''Admin'',''MIS'')) with check (app_role() in (''Admin'',''MIS''))', t);
  end loop;
  foreach t in array array['vendors','project_vendors'] loop
    execute format('create policy write_%1$s on %1$I for all to authenticated using (app_role() in (''Admin'',''MIS'',''Vendor'')) with check (app_role() in (''Admin'',''MIS'',''Vendor''))', t);
  end loop;
end $$;

-- Vendor role: can see projects and vendor lists only (no center or phone data)
create policy vendor_read_projects on projects for select to authenticated using (app_role() = 'Vendor');
create policy vendor_read_vendors on vendors for select to authenticated using (app_role() = 'Vendor');
create policy vendor_read_pv on project_vendors for select to authenticated using (app_role() = 'Vendor');

create policy vendor_read_vcm on vc_master for select to authenticated using (app_role() = 'Vendor');

-- Operations: RM/AM assignment and calling log
create policy ops_assign on center_assignments for all to authenticated using (app_role() in ('Admin','Operations')) with check (app_role() in ('Admin','Operations'));
create policy ops_call_insert on calling_log for insert to authenticated with check (app_role() in ('Admin','Operations') and called_by = auth.uid());

-- Profiles and audit
create policy own_profile on profiles for select to authenticated using (id = auth.uid() or app_role() = 'Admin');
create policy admin_profiles on profiles for all to authenticated using (app_role() = 'Admin') with check (app_role() = 'Admin');
create policy admin_audit on audit_log for select to authenticated using (app_role() = 'Admin');

-- Sheet entries: Operator Calling, Mock Calling and Exam day Calling. Only filled-in rows are stored; rows are generated from Max Day in the Guard OP sheet.
create table sheet_entries(project_code text not null, service text not null, sheet text not null, row_key text not null,
  data jsonb not null default '{}', updated_by uuid default auth.uid(), updated_at timestamptz default now(),
  primary key (project_code, service, sheet, row_key));
alter table sheet_entries enable row level security;
create policy read_se on sheet_entries for select to authenticated using (app_role() in ('Admin','MIS','Operations'));
create policy write_se on sheet_entries for all to authenticated using (app_role() in ('Admin','MIS','Operations')) with check (app_role() in ('Admin','MIS','Operations'));
create trigger audit_sheet_entries after insert or update or delete on sheet_entries for each row execute function audit();

-- Only Innovatiview Google accounts can ever sign up (enable the Google provider in Authentication > Providers).
create function public.only_innovatiview() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email, '@', 2)) not in ('innovatiview.in', 'innovatiview.com') then
    raise exception 'Only Innovatiview accounts are allowed';
  end if;
  return new;
end $$;
create trigger only_innovatiview before insert on auth.users for each row execute function public.only_innovatiview();

-- New users start with the least-privileged role; an Admin upgrades them in the profiles table.
create function public.new_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, name, role) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'Operations') on conflict do nothing;
  return new;
end $$;
create trigger new_profile after insert on auth.users for each row execute function public.new_profile();
-- First Admin: after your first sign-in, run: update profiles set role = 'Admin' where id = (select id from auth.users where email = 'you@innovatiview.in');
