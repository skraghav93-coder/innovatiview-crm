-- ExcellCore 015: special logins, column rights on the Guard List / OP List, Vendor DB email, and the Recycle bin.
-- Run after 001-014 in Supabase > SQL Editor. Safe to run more than once.
--
--   1. Vendor DB (vc_master): an email column. The Guard List / OP List show it as Vendor Email (looked up by VC Code).
--   2. Guard List / OP List: new columns (Candidate Login, Staff Login, the chosen PM, ratings ...), and Vendor Email as a looked-up column.
--   3. Special logins (Sr Project Manager, Vendor Team Head, Operation Manager, Process Excellence, SCM Team ...):
--      role 'Special', every project, and only the sheets / columns given in special_logins.perms (view or edit).
--   4. Who may change which column, enforced here as well as on screen (col_guard):
--        Guard List / OP List  PM and RM: status, logins, remarks, experience, group, mock, device distribution, training, CSR / dispatch columns
--                              RM only: the five vendor ratings;  PM only: Over all Rating and the PM of the row (an allotted PM of the service)
--                              SCM Team (a special login): Device Damages / Losses / delays;  Vendor Manager: everything else, as before
--        Special logins        only the columns given as Edit; anything else they send is ignored
--   5. Recycle bin: every deleted row (projects, centers, people, vendors, master data, calling sheets, special logins) is kept whole
--      in deleted_rows; restore_deleted() puts rows back (Super Admin). Older deletions are copied in from audit_log where it kept them.
--
-- Mobile numbers (10 digits, starting 6-9) and the CRM Project ID (Service Project Code up to the DDMMYY date) are checked by the app.

-- ---------------------------------------------------------------------------------------------
-- 1. Vendor DB email
-- ---------------------------------------------------------------------------------------------
alter table vc_master add column if not exists email text;

-- ---------------------------------------------------------------------------------------------
-- 2. Guard List / OP List: new columns (dropdowns, dates, ratings, the chosen PM) and the Vendor Email looked up from the Vendor DB
-- ---------------------------------------------------------------------------------------------
alter table public.op_list add column if not exists "candidate_login" text, add column if not exists "staff_login" text, add column if not exists "pm_selected" text, add column if not exists "vendor_email_lookup" text;
alter table public.guard_list add column if not exists "candidate_login" text, add column if not exists "staff_login" text, add column if not exists "pm_selected" text, add column if not exists "vendor_email_lookup" text, add column if not exists "mock_time_remarks" text, add column if not exists "training_date" text, add column if not exists "training_time_remarks" text, add column if not exists "manpower_details_received_on_time" text, add column if not exists "replacement_provided" text, add column if not exists "mock_rating" text, add column if not exists "manpower_training_done" text, add column if not exists "unique_op_profiles_center" text, add column if not exists "device_damages_losses_delays" text, add column if not exists "over_all_rating" text;
insert into field_labels(scope, key, label) values
  ('op_list', 'candidate_login', 'Candidate Login'),
  ('op_list', 'staff_login', 'Staff Login'),
  ('op_list', 'pm_selected', 'PM Name (selected PM)'),
  ('op_list', 'vendor_email_lookup', 'Vendor Email'),
  ('guard_list', 'candidate_login', 'Candidate Login'),
  ('guard_list', 'staff_login', 'Staff Login'),
  ('guard_list', 'pm_selected', 'PM Name (selected PM)'),
  ('guard_list', 'vendor_email_lookup', 'Vendor Email'),
  ('guard_list', 'mock_time_remarks', 'Mock Time / Remarks'),
  ('guard_list', 'training_date', 'Training date'),
  ('guard_list', 'training_time_remarks', 'Training Time / Remarks'),
  ('guard_list', 'manpower_details_received_on_time', 'Manpower details received on time'),
  ('guard_list', 'replacement_provided', 'Replacement provided'),
  ('guard_list', 'mock_rating', 'Mock Rating'),
  ('guard_list', 'manpower_training_done', 'Manpower training done'),
  ('guard_list', 'unique_op_profiles_center', 'Unique OP profiles / Center'),
  ('guard_list', 'device_damages_losses_delays', 'Device Damages / Losses / delays'),
  ('guard_list', 'over_all_rating', 'Over all Rating'),
  ('vc_master', 'email', 'Email ID'),
  ('projects', 'dayWise', 'Different shift timings on different days'), ('projects', 'durD', 'Exam Duration (day wise)'),
  ('projects', 'bwinD', 'Biometric Window (day wise)'), ('projects', 'fwinD', 'Frisking Window (day wise)')
on conflict (scope, key) do update set label = excluded.label;
comment on column public.op_list."candidate_login" is 'Candidate Login';
comment on column public.op_list."staff_login" is 'Staff Login';
comment on column public.op_list."pm_selected" is 'PM Name (selected PM)';
comment on column public.op_list."vendor_email_lookup" is 'Vendor Email';
comment on column public.guard_list."candidate_login" is 'Candidate Login';
comment on column public.guard_list."staff_login" is 'Staff Login';
comment on column public.guard_list."pm_selected" is 'PM Name (selected PM)';
comment on column public.guard_list."vendor_email_lookup" is 'Vendor Email';
comment on column public.guard_list."mock_time_remarks" is 'Mock Time / Remarks';
comment on column public.guard_list."training_date" is 'Training date';
comment on column public.guard_list."training_time_remarks" is 'Training Time / Remarks';
comment on column public.guard_list."manpower_details_received_on_time" is 'Manpower details received on time';
comment on column public.guard_list."replacement_provided" is 'Replacement provided';
comment on column public.guard_list."mock_rating" is 'Mock Rating';
comment on column public.guard_list."manpower_training_done" is 'Manpower training done';
comment on column public.guard_list."unique_op_profiles_center" is 'Unique OP profiles / Center';
comment on column public.guard_list."device_damages_losses_delays" is 'Device Damages / Losses / delays';
comment on column public.guard_list."over_all_rating" is 'Over all Rating';

-- the change log skips calculated columns (Vendor Email is now looked up, so it is one of them)
create or replace function public.flat_row(t text, j jsonb) returns jsonb language plpgsql immutable as $$
declare
  calc jsonb := '{"operator_calling": ["project_code_calc", "op", "client_code", "center_code_calc", "center_name", "city_calc", "state_calc", "rm_name", "am_id", "am_name", "vendor_name", "zm_name", "ach_name_no", "total_shift", "exam_date_calc", "key"], "mock_calling": ["project_code_calc", "client_code", "center_code_calc", "center_name", "city_calc", "state_calc", "rm_name", "am_id", "am_name", "vendor_name", "vm_name", "ach_name_no", "csup_name_number", "dr_name_no", "total_opr", "vc_name", "supervisor_name_no", "exam_date_calc", "exam_dates"], "tv_data_download_calling": ["project_code_calc", "client_code", "center_code_calc", "center_name", "city_calc", "state_calc", "rm_name", "am_id", "am_name", "vendor_name", "vm_name", "ach_name_no", "csup_name_number", "total_operator", "supervisor_name_no", "exam_date_calc", "exam_dates", "pending_data_download_devices", "dd_less_than_op", "devices_transaction_pending", "pending_transation_less_then_op", "uniless_than_op_unique_device"], "exam_day_calling": ["project_code_calc", "client_code", "center_code_calc", "center_name", "city_calc", "state_calc", "rm_name", "am_id", "am_name", "vendor_name", "vm_name", "ach_name_no", "csup_name_number", "dr_name_no", "jco_rm", "jco_name_no", "vc_name", "fri_rm", "fri_name_no", "fri_vendor", "bio_rm", "bio_name_no", "supervisor_name_number", "opr_name_no_1", "exam_date_calc", "shift", "total_shift", "total_operator", "bio_op_difference_pending_partial_completed", "tab", "fps", "iris", "otg", "hologram", "id_card", "supervisor_no"], "guard_list": ["project_code_calc", "state_calc", "city_calc", "vendor_name", "vendor_number", "vm_name", "city_head_name", "city_head_number", "total_center", "total_manpower", "h_g_pending", "all_g_pending", "total_head_guards_recieved", "total_guards_recieved", "pending_head_guards", "pending_guards", "pending_guards_calc", "h_guard_confirmed", "going", "reject", "not_connect", "calling_pending", "seqrview_onboard", "pm_name", "rm_name", "am_id", "am_name", "am_number", "am_email", "mock_done", "pending_mock", "pending_mock_calc", "seqrview_onboard_calc", "seqrview_onboard_day1", "seqrview_onboard_day2", "vendor_email_lookup"], "op_list": ["project_code_calc", "state_calc", "city_calc", "vendor_name", "vendor_number", "vc_name", "vm_name", "city_head_name", "city_head_number", "days_total_center", "max_all_days", "sup_pending_as_per_vm", "op_pending_as_per_vm", "seqrview_onboard", "total_supervisor_received", "total_op_received", "pending_supervisor", "pending_op", "supervisor_confirmed", "going", "reject", "not_connect", "calling_mnp_pending", "pending", "device", "devices_data_download", "pending_download", "devices_transaction_done", "pending_transaction", "less_than_op", "total_calling_done", "total_calling_pending", "pm_name", "rm_name", "am_id", "am_name", "am_number", "am_email", "mock_done", "pending_mock", "pending_mock_calc", "seqrview_onboard_calc", "seqrview_onboard_day1", "seqrview_onboard_day2", "vendor_email_lookup"]}'::jsonb;
   r jsonb := '{}'; k text; v jsonb;
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
  if t = any(array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list']) then      -- one column per cell; the keys are not cells
    for k, v in select key, value from jsonb_each(j) loop
      if k = any(skip) or k = 'extra_calc' or k = any(array['project_code','project_id','service','center_code','exam_date','op_no','group_key','state','city','vendor_code']) or (calc -> t) ? k then continue; end if;
      r := r || jsonb_build_object(k, v);
    end loop;
    for k, v in select key, value from jsonb_each(coalesce(j->'extra','{}'::jsonb)) loop r := r || jsonb_build_object(k, v); end loop;
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

-- ---------------------------------------------------------------------------------------------
-- 3. Special logins
-- ---------------------------------------------------------------------------------------------
create table if not exists special_logins(
  email text primary key check (email = lower(trim(email))),
  name text not null,
  title text not null,                            -- Sr Project Manager, Vendor Team Head, Operation Manager, Process Excellence Manager / Member, SCM Team ...
  active boolean not null default true,
  perms jsonb not null default '[]',              -- [{"sheets": ["*"] | [sheet names], "cols": ["*"] | [column labels], "mode": "view" | "edit"}]
  created_at timestamptz default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz, updated_by_id uuid, updated_by_email text, updated_by_name text);
alter table special_logins enable row level security;
grant select, insert, update, delete on special_logins to authenticated;
drop policy if exists sel_special_logins on special_logins; drop policy if exists ins_special_logins on special_logins;
drop policy if exists upd_special_logins on special_logins; drop policy if exists del_special_logins on special_logins;
create policy sel_special_logins on special_logins for select to authenticated using (email = lower(auth.jwt()->>'email') or app_role() in ('Super Admin','Admin'));
create policy ins_special_logins on special_logins for insert to authenticated with check (app_role() in ('Super Admin','Admin'));
create policy upd_special_logins on special_logins for update to authenticated using (app_role() in ('Super Admin','Admin')) with check (app_role() in ('Super Admin','Admin'));
create policy del_special_logins on special_logins for delete to authenticated using (app_role() in ('Super Admin','Admin'));
drop trigger if exists stamp_who on special_logins;
create trigger stamp_who before insert or update on special_logins for each row execute function public.stamp_who();
drop trigger if exists log_changes on special_logins;
create trigger log_changes after insert or update or delete on special_logins for each row execute function public.log_changes();
insert into field_labels(scope, key, label) values ('special_logins','name','Name'),('special_logins','title','Title'),('special_logins','active','Active'),('special_logins','perms','Access'),('special_logins','email','Email')
on conflict (scope, key) do nothing;

-- the new role
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%Vendor Manager%' loop
    execute format('alter table profiles drop constraint %I', c);
  end loop;
  alter table profiles add constraint profiles_role_check check (role in ('Super Admin','Admin','Project Manager','RM','AM','Vendor Manager','Special'));
end $$;

create or replace function public.my_special_perms() returns jsonb language sql stable security definer set search_path = public as $$
  select perms from special_logins where email = lower(auth.jwt()->>'email') and active $$;

-- Sign-in: an email in special_logins (Active) may sign in, whatever its domain
create or replace function public.only_innovatiview() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email, '@', 2)) in ('innovatiview.in', 'innovatiview.com') then return new; end if;
  if exists (select 1 from employees e where lower(trim(e.email)) = lower(trim(new.email)) and coalesce(e.status, 'Active') <> 'Inactive') then return new; end if;
  if exists (select 1 from special_logins s where s.email = lower(trim(new.email)) and s.active) then return new; end if;
  raise exception 'This email is not allowed. Use an Innovatiview account or ask an Admin to add your email to the people list.';
end $$;

create or replace function public.login_allowed() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.role = 'Special' then exists (select 1 from special_logins s where s.email = lower(p.email) and s.active)
      when lower(split_part(coalesce(p.email, ''), '@', 2)) in ('innovatiview.in', 'innovatiview.com') then true
      when p.role in ('Super Admin', 'Admin', 'Vendor Manager') then true
      else public.my_employee_id() is not null and (
        exists (select 1 from projects j where j.status in ('Active', 'Upcoming') and public.my_employee_id() = any (j.pm_ids))
        or exists (select 1 from center_assignments a join projects j on j.code = a.project_code
                   where j.status in ('Active', 'Upcoming') and public.my_employee_id() in (a.rm_id::text, a.am_id::text)))
    end
    from profiles p where p.id = auth.uid() and p.active), false) $$;

-- A login whose email has an active special login gets the Special role (Super Admin / Admin logins are never changed);
-- when the special login is removed or made inactive, the login goes back to the people list role (011) or AM.
create or replace function public.link_special(only_email text) returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles pr set role = 'Special'
   where lower(pr.email) = lower(only_email) and pr.role not in ('Super Admin', 'Admin', 'Special')
     and exists (select 1 from special_logins s where s.email = lower(only_email) and s.active);
  update profiles pr set role = 'AM'
   where lower(pr.email) = lower(only_email) and pr.role = 'Special'
     and not exists (select 1 from special_logins s where s.email = lower(only_email) and s.active);
  perform public.link_profiles(only_email);
end $$;
create or replace function public.special_on_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public.link_special(old.email); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform public.link_special(new.email); end if;
  return null;
end $$;
drop trigger if exists special_on_change on special_logins;
create trigger special_on_change after insert or update or delete on special_logins for each row execute function public.special_on_change();
create or replace function public.special_on_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.link_special(new.email); return null; end $$;
drop trigger if exists special_on_profile on profiles;   -- runs after link_on_profile (011), so a special login wins over the people list
create trigger special_on_profile after insert on profiles for each row execute function public.special_on_profile();

-- Special logins see every project (the sheets and columns they see are decided by perms)
create or replace function public.can_scope_project(pc text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager','Special') then true
    when app_role() = 'Project Manager' then exists (select 1 from projects p where p.code = pc and my_employee_id() = any (p.pm_ids::text[]))
    when app_role() in ('RM','AM') then exists (select 1 from center_assignments a where a.project_code = pc and my_employee_id() in (a.rm_id::text, a.am_id::text))
    else false end $$;
create or replace function public.can_scope_center(pc text, cc text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager','Special') then true
    when app_role() = 'Project Manager' then can_scope_project(pc)
    when app_role() in ('RM','AM') then exists (select 1 from center_assignments a where a.project_code = pc and a.center_code = cc and my_employee_id() in (a.rm_id::text, a.am_id::text))
    else false end $$;
create or replace function public.can_scope_sheet(pc text, rk text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when app_role() in ('Super Admin','Admin','Vendor Manager','Special') then true
    when app_role() = 'Project Manager' then can_scope_project(pc)
    when app_role() in ('RM','AM') then can_scope_project(pc) and (
         not exists (select 1 from centers c where c.project_code = pc and c.center_code = split_part(rk, '|', 1))
         or can_scope_center(pc, split_part(rk, '|', 1)))
    else false end $$;

-- ---------------------------------------------------------------------------------------------
-- 4. Who may change which column of a sheet (col_guard). Changes to other columns are ignored (the old value stays).
-- ---------------------------------------------------------------------------------------------

-- typed-in columns of each sheet table (the calculated ones are written by the app's compile step and are never blocked)
create or replace function public.sheet_typed_cols(t text) returns text[] language sql immutable as $$
  select case t
    when 'operator_calling' then array['aadhar_card_no', 'aadhar_card_no_valid_not_valid', 'aadhar_photo', 'address', 'age', 'ai_calling', 'ai_calling_status', 'biometric_calling_status', 'biometric_designation', 'biometric_has_smartphone_app', 'biometric_operator_name', 'biometric_operator_number', 'date_of_birth', 'distance', 'experience', 'father_name', 'final_status', 'gender', 'manpower_rate', 'mode_of_transport', 'new_on_boarded', 'new_onboard', 'onboarded', 'reaching_time_on_exam', 'recording_url', 'remarks', 'selfie_received', 'seqrview_address', 'seqrview_dob', 'seqrview_name', 'seqrview_onboard', 'seqrview_onboarded_on', 'seqrview_status', 'seqview_number', 'training_video_watched', 'video_watched_count', 'video_watched_status']::text[]
    when 'mock_calling' then array['biometric_counter_location_identify', 'center_issues', 'cso_rm', 'cso_vendor', 'distance', 'faq_count', 'final_mock', 'fri_material_status', 'fri_rm', 'fri_vendor', 'location_photo_received', 'material_status', 'mock_attendance', 'mock_calling_confirmation', 'mock_confirmation_remarks', 'mock_confirmed_from_csup_observer', 'mock_date_by_client', 'mock_person_name', 'mock_person_number', 'mock_report', 'mock_time_by_client', 'ops_view_mock_report', 'ops_view_selfie_upload', 're_mock_status', 'reaching_time_on_mock', 'received_mr1', 'received_mr10', 'received_mr11', 'received_mr12', 'received_mr2', 'received_mr3', 'received_mr4', 'received_mr5', 'received_mr6', 'received_mr7', 'received_mr8', 'received_mr9', 'remarks', 'remarks_for_center_issues', 'remarks_if_any', 'remock_status', 'sent_ms1', 'sent_ms10', 'sent_ms11', 'sent_ms12', 'sent_ms2', 'sent_ms3', 'sent_ms4', 'sent_ms5', 'sent_ms6', 'sent_ms7', 'sent_ms8', 'sent_ms9', 'wifi_availability_status']::text[]
    when 'tv_data_download_calling' then array['authority_letter_received', 'bio_operator_count', 'ddd_remarks_time_shared_by_op', 'device', 'device_distribution_status_validation_by_sup', 'device_person_name_no', 'devices_data_download', 'devices_transaction_done', 'hollogram_received', 'id_received', 'jacket_received', 'startek_device', 'training_photos_received', 'training_video_received', 'unique_aadhar_transaction', 'unique_bio_device']::text[]
    when 'exam_day_calling' then array['actual_time_manual_time_1st', 'actual_time_manual_time_last', 'ai_eta_ae1', 'ai_eta_ae2', 'ai_eta_status', 'ai_eta_url', 'ai_principal_confirmation', 'bio_op_reached_by_cso', 'cctv_cam_count', 'center_issues_highlighted_during_exam', 'crowd_baggage', 'cso_reached', 'csr_remarks', 'csr_remarks_s1', 'csr_remarks_s2', 'csr_remarks_s3', 'csr_remarks_s4', 'csr_remarks_s5', 'csr_remarks_s6', 'csr_remarks_s7', 'csr_remarks_s8', 'csr_s1', 'csr_s2', 'csr_s3', 'csr_s4', 'csr_s5', 'csr_s6', 'csr_s7', 'csr_s8', 'eta', 'exam_code', 'exit_selfie', 'f_reached_fri', 'lan_connector', 'm_reached_fri', 'manpower_reached', 'op_profile', 'opsview_status_task_done', 'opsview_status_total_task', 'password', 'startek', 'time_stamp_1', 'time_stamp_2', 'username']::text[]
    when 'guard_list' then array['ach_email', 'address_with_pin_code', 'age_less_than_18', 'am_mapping', 'candidate_login', 'city_head_no_saved', 'csr_consignee_contact_no', 'csr_consignee_name', 'csr_status', 'deduction_remarks_others', 'deduction_shared', 'device_damages_losses_delays', 'distribution_status', 'docate_number', 'experience_fresher', 'final_deduction_remarks', 'final_deduction_remarks_others', 'frisking_done_sticker_delivery', 'frisking_done_sticker_delivery_status_rm', 'gp_remarks', 'group_created', 'guards_google_sheet', 'guards_pending_as_per_google_sheet', 'h_guards_google_sheet', 'h_guards_pending_as_per_google_sheet', 'handover_audit_date', 'head_guard_count', 'intraactive_video', 'list_status', 'mail_status', 'manpower_details_received_on_time', 'manpower_training_done', 'max_guard_list', 'mock_date', 'mock_issues_with_vendor', 'mock_rating', 'mock_time_remarks', 'other_remarks_distribution', 'over_all_rating', 'pin_code', 'pm_remarks', 'pm_selected', 'ready_for_dispatch', 'remarks', 'replacement_provided', 'staff_login', 'super_viser_no_saved', 'total_guard_as_per_vm', 'total_h_guard_as_per_vm', 'training_date', 'training_time_remarks', 'training_video_date', 'training_video_recieved', 'uniform_remarks', 'uniform_status', 'unique_op_profiles_center', 'vendor_email', 'vendor_rating']::text[]
    when 'op_list' then array['ach_email', 'address_with_pin_code', 'age_18', 'am_mapping', 'candidate_login', 'center_with_0_login', 'csr_consignee_contact_no', 'csr_consignee_name', 'csr_status', 'device_damages_losses_delays', 'device_distribution', 'device_distribution_remarks', 'docket_number', 'experience_fresher', 'group_created', 'handover_audit_date', 'manpower_details_received_on_time', 'manpower_training_done', 'max_op_list_received', 'mock_date', 'mock_rating', 'mock_time_remarks', 'op_google_sheet', 'op_pending_as_per_google_sheet', 'operator_list_status', 'over_all_rating', 'pin_code', 'pm_selected', 'ready_for_dispatch', 'remarks', 'replacement_provided', 'rm_mapping', 'staff_login', 'supervisor_google_sheet', 'supervisor_pending_as_per_google_sheet', 'total_op_as_per_vm', 'total_supervisor_as_per_vm', 'training_date', 'training_time_remarks', 'unique_op_profiles_center', 'vendor_email']::text[]
    else '{}'::text[] end $$;
create or replace function public.sheet_name_of(t text) returns text language sql immutable as $$
  select case t when 'operator_calling' then 'Operator Calling' when 'mock_calling' then 'Mock Calling' when 'tv_data_download_calling' then 'TV Data Download Calling' when 'exam_day_calling' then 'Exam day Calling' when 'guard_list' then 'Guard List' when 'op_list' then 'OP List' end $$;
-- Guard List / OP List: the columns PM and RM fill, the RM ratings, and the columns a Vendor Manager no longer changes
create or replace function public.vendor_pmrm_cols(t text) returns text[] language sql immutable as $$
  select case t when 'op_list' then array['operator_list_status', 'candidate_login', 'staff_login', 'remarks', 'experience_fresher', 'group_created', 'mock_date', 'mock_time_remarks', 'device_distribution', 'device_distribution_remarks', 'training_date', 'training_time_remarks', 'csr_consignee_name', 'csr_consignee_contact_no', 'address_with_pin_code', 'pin_code', 'ready_for_dispatch', 'docket_number']::text[] when 'guard_list' then array['list_status', 'candidate_login', 'staff_login', 'experience_fresher', 'mock_date', 'mock_time_remarks', 'remarks', 'csr_consignee_name', 'csr_consignee_contact_no', 'address_with_pin_code', 'pin_code', 'ready_for_dispatch', 'docate_number', 'training_date', 'training_time_remarks', 'distribution_status', 'other_remarks_distribution', 'group_created']::text[] else '{}'::text[] end $$;
create or replace function public.vendor_rm_cols() returns text[] language sql immutable as $$ select array['manpower_details_received_on_time', 'replacement_provided', 'mock_rating', 'manpower_training_done', 'unique_op_profiles_center']::text[] $$;
create or replace function public.vendor_restricted_cols() returns text[] language sql immutable as $$ select array['manpower_details_received_on_time', 'replacement_provided', 'mock_rating', 'manpower_training_done', 'unique_op_profiles_center', 'over_all_rating', 'device_damages_losses_delays', 'pm_selected']::text[] $$;

-- The typed-in columns a special login may change on a table: null = all of them, '{}' = none. Column labels are matched through field_labels.
create or replace function public.special_edit_cols(t text) returns text[] language plpgsql stable security definer set search_path = public as $$
declare p jsonb := public.my_special_perms(); r jsonb; sh text := public.sheet_name_of(t); labels text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'array' then return '{}'; end if;
  for r in select value from jsonb_array_elements(p) loop
    if coalesce(r->>'mode', '') <> 'edit' then continue; end if;
    if not (coalesce(r->'sheets', '[]') ? '*' or coalesce(r->'sheets', '[]') ? sh) then continue; end if;
    if coalesce(r->'cols', '[]') ? '*' then return null; end if;
    labels := labels || array(select jsonb_array_elements_text(r->'cols'));
  end loop;
  return array(select fl.key from field_labels fl where fl.scope = t and fl.label = any (labels));
end $$;

-- An RM changes only the Guard List / OP List rows (state | city | vendor) that hold one of his centers
create or replace function public.rm_owns_group(pid text, svc text, gk text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from centers c join center_assignments a on a.project_code = c.project_code and a.center_code = c.center_code
                 where c.project_code = pid and c.service = svc and coalesce(c.state, '') = split_part(gk, '|', 1) and coalesce(c.city, '') = split_part(gk, '|', 2)
                   and coalesce(c.vc_code, '') = split_part(gk, '|', 3) and a.rm_id::text = public.my_employee_id()) $$;

create or replace function public.col_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare
  role text := app_role(); vend boolean := tg_table_name in ('guard_list', 'op_list'); allowed text[]; c text;
  typed text[] := public.sheet_typed_cols(tg_table_name);
  j jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  pms jsonb;
begin
  if auth.uid() is null or role in ('Super Admin', 'Admin') then return new; end if;   -- admins, and the database owner running a script
  if role = 'Special' then allowed := public.special_edit_cols(tg_table_name);
  elsif not vend then return new;                                                       -- operations sheets: PM / RM / AM as before (admin_only_cols still applies)
  elsif role = 'Vendor Manager' then allowed := array(select x from unnest(typed) x where x <> all (public.vendor_restricted_cols()));
  elsif role = 'Project Manager' then allowed := public.vendor_pmrm_cols(tg_table_name) || array['over_all_rating', 'pm_selected'];
  elsif role = 'RM' then allowed := case when public.rm_owns_group(new.project_id, new.service, j->>'group_key') then public.vendor_pmrm_cols(tg_table_name) || public.vendor_rm_cols() else '{}'::text[] end;
  else allowed := '{}';
  end if;
  if allowed is not null then
    foreach c in array typed loop
      if not (c = any (allowed)) then j := jsonb_set(j, array[c], coalesce(o -> c, 'null'::jsonb)); end if;
    end loop;
    j := jsonb_set(j, '{extra}', coalesce(o -> 'extra', '{}'::jsonb));                 -- values without a column of their own: Admin / Vendor Manager / full-edit special logins only
    if role = 'Vendor Manager' then j := jsonb_set(j, '{extra}', coalesce(to_jsonb(new) -> 'extra', '{}'::jsonb)); end if;
  end if;
  -- the PM of a row: only a PM allotted to the service, and only one of the service's PMs
  if vend and (j ->> 'pm_selected') is distinct from (o ->> 'pm_selected') then
    select coalesce(p.details -> 'pmBy' -> new.service, '[]'::jsonb) into pms from projects p where p.code = new.project_id;
    if (j ->> 'pm_selected') is not null and not (coalesce(pms, '[]'::jsonb) ? (j ->> 'pm_selected'))
       or not (coalesce(pms, '[]'::jsonb) ? coalesce(public.my_employee_id(), '')) then
      j := jsonb_set(j, '{pm_selected}', coalesce(o -> 'pm_selected', 'null'::jsonb));
    end if;
  end if;
  return jsonb_populate_record(new, j);
end $$;

-- Access for the six sheet tables: PM and RM may now write the Guard List / OP List (col_guard decides the columns); special logins write
-- where they have Edit, and never delete.
create or replace function public._pol15(t text, sel text, wr text, del text) returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', 'sel_' || t, t); execute format('drop policy if exists %I on public.%I', 'ins_' || t, t);
  execute format('drop policy if exists %I on public.%I', 'upd_' || t, t); execute format('drop policy if exists %I on public.%I', 'del_' || t, t);
  execute format('create policy %I on public.%I for select to authenticated using (%s)', 'sel_' || t, t, sel);
  execute format('create policy %I on public.%I for insert to authenticated with check (%s)', 'ins_' || t, t, wr);
  execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', 'upd_' || t, t, wr, wr);
  execute format('create policy %I on public.%I for delete to authenticated using (%s)', 'del_' || t, t, del);
end $$;
do $$ declare t text; begin
  foreach t in array array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling'] loop
    perform public._pol15(t, 'can_scope_sheet(project_id, center_code)',
      $q$ app_role() <> 'Vendor Manager' and can_scope_sheet(project_id, center_code) $q$,
      $q$ app_role() in ('Super Admin','Admin','Project Manager','RM','AM') and can_scope_sheet(project_id, center_code) $q$);
  end loop;
  foreach t in array array['guard_list', 'op_list'] loop
    perform public._pol15(t, 'can_scope_sheet(project_id, group_key)',
      $q$ app_role() in ('Super Admin','Admin','Vendor Manager','Project Manager','RM','Special') and can_scope_sheet(project_id, group_key) $q$,
      $q$ app_role() in ('Super Admin','Admin','Vendor Manager') $q$);
  end loop;
  foreach t in array array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list'] loop
    execute format('drop trigger if exists col_guard on public.%I', t);
    execute format('create trigger col_guard before insert or update on public.%I for each row execute function public.col_guard()', t);
  end loop;
end $$;
drop function public._pol15(text, text, text, text);

-- ---------------------------------------------------------------------------------------------
-- 5. Recycle bin
-- ---------------------------------------------------------------------------------------------
create table if not exists deleted_rows(
  id bigint generated always as identity primary key,
  deleted_at timestamptz not null default now(),
  batch bigint not null default txid_current(),        -- one delete action (a project with its centers and sheet rows) shares a batch
  deleted_by_id uuid, deleted_by_email text, deleted_by_name text,
  table_name text not null, project_ref text, row_key text,
  data jsonb not null,                                 -- the whole row as it was
  audit_id bigint unique,                              -- set for rows copied from audit_log
  restored_at timestamptz, restored_by text);
create index if not exists deleted_rows_at_idx on deleted_rows(deleted_at desc);
create index if not exists deleted_rows_batch_idx on deleted_rows(batch);
alter table deleted_rows enable row level security;
grant select on deleted_rows to authenticated;
drop policy if exists sel_deleted_rows on deleted_rows;
create policy sel_deleted_rows on deleted_rows for select to authenticated using (app_role() = 'Super Admin');

create or replace function public.deleted_key(t text, o jsonb) returns text language sql immutable as $$
  select case
    when t = 'projects' then o->>'code' || coalesce(' ' || nullif(o->>'name', ''), '')
    when t = 'centers' then (o->>'center_code') || ' (' || coalesce(o->>'service', '') || ')'
    when t = 'center_assignments' then o->>'center_code'
    when t in ('operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list') then
      coalesce(o->>'service', '') || ' ' || coalesce(o->>'center_code', o->>'group_key', '') || coalesce(' ' || (o->>'exam_date'), '') || coalesce(' OP ' || (o->>'op_no'), '')
    when t = 'employees' then (o->>'id') || ' ' || coalesce(o->>'name', '')
    when t = 'vendors' then (o->>'code') || ' ' || coalesce(o->>'name', '')
    when t = 'special_logins' then o->>'email'
    when t = 'zm_state' then (o->>'state') || ' / ' || coalesce(o->>'zm_name', '')
    when t = 'vc_state' then (o->>'state') || ' / ' || coalesce(o->>'vc_code', '')
    when t = 'project_vendors' then (o->>'project_code') || ' / ' || coalesce(o->>'vendor_code', '')
    else coalesce(o->>'code', o->>'id', o->>'email') end $$;
create or replace function public.deleted_project(t text, o jsonb) returns text language sql immutable as $$
  select coalesce(o->>'project_id', case when t = 'projects' then o->>'code' end, o->>'project_code') $$;

create or replace function public.keep_deleted() returns trigger language plpgsql security definer set search_path = public as $$
declare w record; o jsonb := to_jsonb(old);
begin
  select * into w from public.who();
  insert into deleted_rows(deleted_by_id, deleted_by_email, deleted_by_name, table_name, project_ref, row_key, data)
  values (w.uid, w.email, w.name, tg_table_name, public.deleted_project(tg_table_name, o), public.deleted_key(tg_table_name, o), o);
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['projects', 'employees', 'vendors', 'project_vendors', 'vc_master', 'zm_state', 'vc_state', 'centers', 'center_assignments', 'calling_log',
                           'operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list', 'special_logins'] loop
    execute format('drop trigger if exists keep_deleted on public.%I', t);
    execute format('create trigger keep_deleted after delete on public.%I for each row execute function public.keep_deleted()', t);
  end loop;
end $$;

-- Deletions from before this file: audit_log kept the whole row for these tables. One delete action = one timestamp.
insert into deleted_rows(deleted_at, batch, deleted_by_id, deleted_by_email, deleted_by_name, table_name, project_ref, row_key, data, audit_id)
select a.at, -floor(extract(epoch from a.at) * 1000000)::bigint, a.actor, a.actor_email, a.actor_name, a.table_name,
       public.deleted_project(a.table_name, a.old_data), public.deleted_key(a.table_name, a.old_data), a.old_data, a.id
from audit_log a
where a.action = 'DELETE' and a.old_data is not null
  and a.table_name in ('projects', 'employees', 'vendors', 'project_vendors', 'vc_master', 'zm_state', 'vc_state', 'centers', 'center_assignments', 'calling_log')
on conflict (audit_id) do nothing;

-- Restore (Super Admin): rows go back in a safe order (projects first, sheet rows last). A row whose key is taken again,
-- or whose project is gone, is skipped and stays in the bin.
create or replace function public.restore_deleted(ids bigint[]) returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; cols text; ident boolean; n int := 0; s int := 0; rc int; me text;
begin
  if app_role() is distinct from 'Super Admin' then raise exception 'Only a Super Admin can restore deleted data.'; end if;
  select coalesce(email, name) into me from public.who();
  for r in select * from deleted_rows d where d.id = any (ids) and d.restored_at is null
           order by case d.table_name when 'projects' then 0 when 'employees' then 1 when 'vendors' then 1 when 'vc_master' then 1 when 'special_logins' then 1
                                      when 'zm_state' then 2 when 'vc_state' then 2 when 'centers' then 3 when 'project_vendors' then 3 when 'center_assignments' then 4 else 5 end, d.id loop
    select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position), bool_or(c.is_identity = 'YES') into cols, ident
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = r.table_name and c.is_generated = 'NEVER' and r.data ? c.column_name;
    if cols is null then s := s + 1; continue; end if;
    begin
      execute format('insert into public.%I (%s) %s select %s from jsonb_populate_record(null::public.%I, $1) on conflict do nothing',
                     r.table_name, cols, case when ident then 'overriding system value' else '' end, cols, r.table_name) using r.data;
      get diagnostics rc = row_count;
      if rc > 0 then n := n + 1; update deleted_rows set restored_at = now(), restored_by = me where id = r.id; else s := s + 1; end if;
    exception when others then s := s + 1;
    end;
  end loop;
  return jsonb_build_object('restored', n, 'skipped', s);
end $$;
revoke all on function public.restore_deleted(bigint[]) from public;
grant execute on function public.restore_deleted(bigint[]) to authenticated;

notify pgrst, 'reload schema';
