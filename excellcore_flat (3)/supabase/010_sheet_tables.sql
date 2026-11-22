-- ExcellCore 010: every calling sheet gets its own table.
--   * One table per sheet; all services (Biometric, Frisking, CSO) share it.
--   * The primary key starts with project_code (the service's official Project Code), then service, then the row identity.
--   * project_id keeps the link to the project; project_code is kept in step with the project automatically.
--   * Every cell change is written to change_log (who, when, old and new value) by the existing log_changes trigger.
-- Run after 001-008. Safe to run more than once. The old sheet_entries table is left untouched as a backup.

-- Project Codes as real columns, one per service
alter table projects add column if not exists project_code_biometric text, add column if not exists project_code_frisking text, add column if not exists project_code_cso text;
create or replace function public.projects_pcodes_cols() returns trigger language plpgsql set search_path = public as $$
declare pc jsonb := coalesce(new.details->'pcodes', '{}'::jsonb);
begin
  new.project_code_biometric := nullif(pc->>'Biometric', '');
  new.project_code_frisking  := nullif(pc->>'Frisking', '');
  new.project_code_cso       := nullif(pc->>'CSO', '');
  new.official_project_code  := coalesce(new.project_code_biometric, new.project_code_frisking, new.project_code_cso, new.official_project_code);
  return new;
end $$;
drop trigger if exists projects_pcodes_cols on projects;
create trigger projects_pcodes_cols before insert or update on projects for each row execute function public.projects_pcodes_cols();
-- fill the new columns for existing projects (without touching who last edited them)
alter table projects disable trigger stamp_who;
alter table projects disable trigger log_changes;
update projects set details = details;
alter table projects enable trigger stamp_who;
alter table projects enable trigger log_changes;

-- The Project Code of a service. Projects without one yet fall back to the internal id so nothing is lost.
create or replace function public.svc_pcode(pid text, svc text) returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.details->'pcodes'->>svc, ''), nullif(p.details->>'pcode', ''), p.code) from projects p where p.code = pid $$;
create or replace function public.sheet_pcode() returns trigger language plpgsql as $$
begin new.project_code := coalesce(public.svc_pcode(new.project_id, new.service), new.project_code); return new; end $$;

-- Keep the sheet rows in step when a Project Code is edited
create or replace function public.projects_pcode_propagate() returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if coalesce(old.details->'pcodes', '{}'::jsonb) is distinct from coalesce(new.details->'pcodes', '{}'::jsonb) or old.details->>'pcode' is distinct from new.details->>'pcode' then
    foreach t in array array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list'] loop
      execute format('update public.%I set project_code = public.svc_pcode(project_id, service) where project_id = $1', t) using new.code;
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists projects_pcode_propagate on projects;
create trigger projects_pcode_propagate after update on projects for each row execute function public.projects_pcode_propagate();

-- Tables
-- Operator Calling
create table if not exists public.operator_calling (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  center_code text not null,
  exam_date date not null,
  op_no int not null,
  "distance" text,
  "ai_calling_status" text,
  "recording_url" text,
  "biometric_designation" text,
  "experience" text,
  "biometric_operator_name" text,
  "biometric_operator_number" text,
  "biometric_calling_status" text,
  "biometric_has_smartphone_app" text,
  "mode_of_transport" text,
  "reaching_time_on_exam" text,
  "remarks" text,
  "aadhar_card_no" text,
  "aadhar_card_no_valid_not_valid" text,
  "selfie_received" text,
  "aadhar_photo" text,
  "gender" text,
  "age" text,
  "father_name" text,
  "date_of_birth" text,
  "address" text,
  "manpower_rate" text,
  "seqrview_address" text,
  "seqview_number" text,
  "seqrview_onboard" text,
  "seqrview_dob" text,
  "seqrview_name" text,
  "new_onboard" text,
  "training_video_watched" text,
  "video_watched_count" text,
  "video_watched_status" text,
  "final_status" text,
  "onboarded" text,
  "new_on_boarded" text,
  "ai_calling" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, center_code, exam_date, op_no)
);
create index if not exists operator_calling_project_idx on public.operator_calling(project_id, service);

-- Mock Calling
create table if not exists public.mock_calling (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  center_code text not null,
  "material_status" text,
  "re_mock_status" text,
  "mock_date_by_client" text,
  "mock_time_by_client" text,
  "mock_person_name" text,
  "mock_person_number" text,
  "mock_calling_confirmation" text,
  "reaching_time_on_mock" text,
  "remarks" text,
  "fri_vendor" text,
  "ops_view_selfie_upload" text,
  "ops_view_mock_report" text,
  "final_mock" text,
  "mock_attendance" text,
  "mock_report" text,
  "biometric_counter_location_identify" text,
  "location_photo_received" text,
  "wifi_availability_status" text,
  "center_issues" text,
  "remarks_for_center_issues" text,
  "mock_confirmed_from_csup_observer" text,
  "mock_confirmation_remarks" text,
  "remarks_if_any" text,
  "sent_ms1" text,
  "received_mr1" text,
  "sent_ms2" text,
  "received_mr2" text,
  "sent_ms3" text,
  "received_mr3" text,
  "sent_ms4" text,
  "received_mr4" text,
  "sent_ms5" text,
  "received_mr5" text,
  "sent_ms6" text,
  "received_mr6" text,
  "sent_ms7" text,
  "received_mr7" text,
  "sent_ms8" text,
  "received_mr8" text,
  "sent_ms9" text,
  "received_mr9" text,
  "sent_ms10" text,
  "received_mr10" text,
  "sent_ms11" text,
  "received_mr11" text,
  "sent_ms12" text,
  "received_mr12" text,
  "fri_rm" text,
  "fri_material_status" text,
  "cso_vendor" text,
  "cso_rm" text,
  "distance" text,
  "faq_count" text,
  "remock_status" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, center_code)
);
create index if not exists mock_calling_project_idx on public.mock_calling(project_id, service);

-- TV Data Download Calling
create table if not exists public.tv_data_download_calling (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  center_code text not null,
  "device_distribution_status_validation_by_sup" text,
  "ddd_remarks_time_shared_by_op" text,
  "device_person_name_no" text,
  "id_received" text,
  "jacket_received" text,
  "hollogram_received" text,
  "startek_device" text,
  "authority_letter_received" text,
  "device" text,
  "devices_data_download" text,
  "devices_transaction_done" text,
  "unique_bio_device" text,
  "unique_aadhar_transaction" text,
  "training_video_received" text,
  "bio_operator_count" text,
  "training_photos_received" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, center_code)
);
create index if not exists tv_data_download_calling_project_idx on public.tv_data_download_calling(project_id, service);

-- Exam day Calling
create table if not exists public.exam_day_calling (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  center_code text not null,
  exam_date date not null,
  "jco_rm" text,
  "jco_name_no" text,
  "fri_rm" text,
  "fri_name_no" text,
  "fri_vendor" text,
  "ai_eta_ae1" text,
  "eta" text,
  "manpower_reached" text,
  "ai_eta_ae2" text,
  "ai_principal_confirmation" text,
  "m_reached_fri" text,
  "f_reached_fri" text,
  "crowd_baggage" text,
  "cso_reached" text,
  "bio_op_reached_by_cso" text,
  "startek" text,
  "lan_connector" text,
  "cctv_cam_count" text,
  "csr_s1" text,
  "csr_remarks_s1" text,
  "csr_s2" text,
  "csr_remarks_s2" text,
  "csr_s3" text,
  "csr_remarks_s3" text,
  "csr_s4" text,
  "csr_remarks_s4" text,
  "csr_s5" text,
  "csr_remarks_s5" text,
  "csr_s6" text,
  "csr_remarks_s6" text,
  "csr_s7" text,
  "csr_remarks_s7" text,
  "csr_s8" text,
  "csr_remarks_s8" text,
  "csr_remarks" text,
  "center_issues_highlighted_during_exam" text,
  "actual_time_manual_time_1st" text,
  "actual_time_manual_time_last" text,
  "exit_selfie" text,
  "exam_code" text,
  "username" text,
  "password" text,
  "ai_eta_url" text,
  "time_stamp_1" text,
  "time_stamp_2" text,
  "ai_eta_status" text,
  "op_profile" text,
  "opsview_status_total_task" text,
  "opsview_status_task_done" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, center_code, exam_date)
);
create index if not exists exam_day_calling_project_idx on public.exam_day_calling(project_id, service);

-- Guard List
create table if not exists public.guard_list (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  group_key text not null,                                  -- state|city|vendor code
  state text generated always as (split_part(group_key, '|', 1)) stored,
  city text generated always as (split_part(group_key, '|', 2)) stored,
  vendor_code text generated always as (split_part(group_key, '|', 3)) stored,
  "total_h_guard_as_per_vm" text,
  "total_guard_as_per_vm" text,
  "h_guards_google_sheet" text,
  "guards_google_sheet" text,
  "h_guards_pending_as_per_google_sheet" text,
  "guards_pending_as_per_google_sheet" text,
  "list_status" text,
  "vendor_rating" text,
  "uniform_status" text,
  "mail_status" text,
  "am_mapping" text,
  "experience_fresher" text,
  "mock_issues_with_vendor" text,
  "mock_date" text,
  "remarks" text,
  "gp_remarks" text,
  "csr_consignee_name" text,
  "csr_consignee_contact_no" text,
  "address_with_pin_code" text,
  "pin_code" text,
  "ready_for_dispatch" text,
  "docate_number" text,
  "csr_status" text,
  "handover_audit_date" text,
  "uniform_remarks" text,
  "training_video_recieved" text,
  "training_video_date" text,
  "head_guard_count" text,
  "frisking_done_sticker_delivery" text,
  "frisking_done_sticker_delivery_status_rm" text,
  "distribution_status" text,
  "other_remarks_distribution" text,
  "group_created" text,
  "deduction_shared" text,
  "deduction_remarks_others" text,
  "final_deduction_remarks" text,
  "final_deduction_remarks_others" text,
  "max_guard_list" text,
  "pm_remarks" text,
  "age_less_than_18" text,
  "vendor_email" text,
  "ach_email" text,
  "super_viser_no_saved" text,
  "city_head_no_saved" text,
  "intraactive_video" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, group_key)
);
create index if not exists guard_list_project_idx on public.guard_list(project_id, service);

-- OP List
create table if not exists public.op_list (
  project_code text not null,                               -- the service's official Project Code
  project_id text not null references public.projects(code) on delete cascade on update cascade,
  service text not null,
  group_key text not null,                                  -- state|city|vendor code
  state text generated always as (split_part(group_key, '|', 1)) stored,
  city text generated always as (split_part(group_key, '|', 2)) stored,
  vendor_code text generated always as (split_part(group_key, '|', 3)) stored,
  "total_supervisor_as_per_vm" text,
  "total_op_as_per_vm" text,
  "supervisor_google_sheet" text,
  "op_google_sheet" text,
  "supervisor_pending_as_per_google_sheet" text,
  "op_pending_as_per_google_sheet" text,
  "center_with_0_login" text,
  "operator_list_status" text,
  "remarks" text,
  "rm_mapping" text,
  "am_mapping" text,
  "experience_fresher" text,
  "group_created" text,
  "mock_date" text,
  "mock_time_remarks" text,
  "device_distribution" text,
  "device_distribution_remarks" text,
  "training_date" text,
  "training_time_remarks" text,
  "csr_consignee_name" text,
  "csr_consignee_contact_no" text,
  "address_with_pin_code" text,
  "pin_code" text,
  "ready_for_dispatch" text,
  "docket_number" text,
  "csr_status" text,
  "handover_audit_date" text,
  "max_op_list_received" text,
  "manpower_details_received_on_time" text,
  "replacement_provided" text,
  "mock_rating" text,
  "manpower_training_done" text,
  "unique_op_profiles_center" text,
  "device_damages_losses_delays" text,
  "over_all_rating" text,
  "vendor_email" text,
  "ach_email" text,
  "age_18" text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(), created_by_id uuid, created_by_email text, created_by_name text,
  updated_at timestamptz not null default now(), updated_by_id uuid, updated_by_email text, updated_by_name text,
  primary key (project_code, service, group_key)
);
create index if not exists op_list_project_idx on public.op_list(project_id, service);

-- Column labels, shown in the change log and as comments in the database
insert into field_labels(scope, key, label) values
  ('operator_calling', 'distance', 'Distance'),
  ('operator_calling', 'ai_calling_status', 'AI Calling Status'),
  ('operator_calling', 'recording_url', 'Recording URL'),
  ('operator_calling', 'biometric_designation', 'Biometric Designation'),
  ('operator_calling', 'experience', 'Experience'),
  ('operator_calling', 'biometric_operator_name', 'Biometric Operator Name'),
  ('operator_calling', 'biometric_operator_number', 'Biometric Operator Number'),
  ('operator_calling', 'biometric_calling_status', 'Biometric Calling Status'),
  ('operator_calling', 'biometric_has_smartphone_app', 'Biometric has Smartphone/App'),
  ('operator_calling', 'mode_of_transport', 'Mode of Transport'),
  ('operator_calling', 'reaching_time_on_exam', 'Reaching Time on Exam'),
  ('operator_calling', 'remarks', 'Remarks'),
  ('operator_calling', 'aadhar_card_no', 'Aadhar card No.'),
  ('operator_calling', 'aadhar_card_no_valid_not_valid', 'Aadhar card No. Valid / Not Valid'),
  ('operator_calling', 'selfie_received', 'Selfie Received'),
  ('operator_calling', 'aadhar_photo', 'Aadhar Photo'),
  ('operator_calling', 'gender', 'Gender'),
  ('operator_calling', 'age', 'Age'),
  ('operator_calling', 'father_name', 'Father Name'),
  ('operator_calling', 'date_of_birth', 'Date Of Birth'),
  ('operator_calling', 'address', 'Address'),
  ('operator_calling', 'manpower_rate', 'Manpower Rate'),
  ('operator_calling', 'seqrview_address', 'Seqrview Address'),
  ('operator_calling', 'seqview_number', 'SeqView Number'),
  ('operator_calling', 'seqrview_onboard', 'SeqrView Onboard'),
  ('operator_calling', 'seqrview_dob', 'SeqrView DOB'),
  ('operator_calling', 'seqrview_name', 'SeqrView Name'),
  ('operator_calling', 'new_onboard', 'New Onboard'),
  ('operator_calling', 'training_video_watched', 'Training Video Watched'),
  ('operator_calling', 'video_watched_count', 'Video Watched Count'),
  ('operator_calling', 'video_watched_status', 'Video Watched Status'),
  ('operator_calling', 'final_status', 'Final Status'),
  ('operator_calling', 'onboarded', 'Onboarded'),
  ('operator_calling', 'new_on_boarded', 'New On Boarded'),
  ('operator_calling', 'ai_calling', 'AI Calling'),
  ('mock_calling', 'material_status', 'Material Status'),
  ('mock_calling', 're_mock_status', 'RE Mock Status'),
  ('mock_calling', 'mock_date_by_client', 'Mock Date By Client'),
  ('mock_calling', 'mock_time_by_client', 'Mock Time By Client'),
  ('mock_calling', 'mock_person_name', 'Mock Person Name'),
  ('mock_calling', 'mock_person_number', 'Mock Person Number'),
  ('mock_calling', 'mock_calling_confirmation', 'Mock Calling Confirmation'),
  ('mock_calling', 'reaching_time_on_mock', 'Reaching Time on Mock'),
  ('mock_calling', 'remarks', 'Remarks'),
  ('mock_calling', 'fri_vendor', 'Fri Vendor'),
  ('mock_calling', 'ops_view_selfie_upload', 'OPS View Selfie Upload'),
  ('mock_calling', 'ops_view_mock_report', 'OPS View Mock Report'),
  ('mock_calling', 'final_mock', 'Final Mock'),
  ('mock_calling', 'mock_attendance', 'Mock Attendance'),
  ('mock_calling', 'mock_report', 'Mock Report'),
  ('mock_calling', 'biometric_counter_location_identify', 'Biometric Counter Location Identify'),
  ('mock_calling', 'location_photo_received', 'Location Photo Received'),
  ('mock_calling', 'wifi_availability_status', 'WIFI Availability Status'),
  ('mock_calling', 'center_issues', 'Center Issues'),
  ('mock_calling', 'remarks_for_center_issues', 'Remarks for Center issues'),
  ('mock_calling', 'mock_confirmed_from_csup_observer', 'Mock Confirmed from CSUP / Observer'),
  ('mock_calling', 'mock_confirmation_remarks', 'Mock Confirmation Remarks'),
  ('mock_calling', 'remarks_if_any', 'Remarks (if any)'),
  ('mock_calling', 'sent_ms1', 'Sent'),
  ('mock_calling', 'received_mr1', 'Received'),
  ('mock_calling', 'sent_ms2', 'Sent'),
  ('mock_calling', 'received_mr2', 'Received'),
  ('mock_calling', 'sent_ms3', 'Sent'),
  ('mock_calling', 'received_mr3', 'Received'),
  ('mock_calling', 'sent_ms4', 'Sent'),
  ('mock_calling', 'received_mr4', 'Received'),
  ('mock_calling', 'sent_ms5', 'Sent'),
  ('mock_calling', 'received_mr5', 'Received'),
  ('mock_calling', 'sent_ms6', 'Sent'),
  ('mock_calling', 'received_mr6', 'Received'),
  ('mock_calling', 'sent_ms7', 'Sent'),
  ('mock_calling', 'received_mr7', 'Received'),
  ('mock_calling', 'sent_ms8', 'Sent'),
  ('mock_calling', 'received_mr8', 'Received'),
  ('mock_calling', 'sent_ms9', 'Sent'),
  ('mock_calling', 'received_mr9', 'Received'),
  ('mock_calling', 'sent_ms10', 'Sent'),
  ('mock_calling', 'received_mr10', 'Received'),
  ('mock_calling', 'sent_ms11', 'Sent'),
  ('mock_calling', 'received_mr11', 'Received'),
  ('mock_calling', 'sent_ms12', 'Sent'),
  ('mock_calling', 'received_mr12', 'Received'),
  ('mock_calling', 'fri_rm', 'FRI RM'),
  ('mock_calling', 'fri_material_status', 'Fri Material Status'),
  ('mock_calling', 'cso_vendor', 'CSO Vendor'),
  ('mock_calling', 'cso_rm', 'CSO RM'),
  ('mock_calling', 'distance', 'Distance'),
  ('mock_calling', 'faq_count', 'FAQ Count'),
  ('mock_calling', 'remock_status', 'REMOCK Status'),
  ('tv_data_download_calling', 'device_distribution_status_validation_by_sup', 'Device Distribution status Validation by Supervisor'),
  ('tv_data_download_calling', 'ddd_remarks_time_shared_by_op', 'DDD Remarks (Time Shared by OP)'),
  ('tv_data_download_calling', 'device_person_name_no', 'Device Person Name & No'),
  ('tv_data_download_calling', 'id_received', 'ID Received'),
  ('tv_data_download_calling', 'jacket_received', 'Jacket Received'),
  ('tv_data_download_calling', 'hollogram_received', 'Hollogram Received'),
  ('tv_data_download_calling', 'startek_device', 'STARTEK Device'),
  ('tv_data_download_calling', 'authority_letter_received', 'Authority Letter Received'),
  ('tv_data_download_calling', 'device', '# Device'),
  ('tv_data_download_calling', 'devices_data_download', '# Devices Data Download'),
  ('tv_data_download_calling', 'devices_transaction_done', '# Devices Transaction Done'),
  ('tv_data_download_calling', 'unique_bio_device', '# Unique Bio Device'),
  ('tv_data_download_calling', 'unique_aadhar_transaction', '# Unique Aadhar Transaction'),
  ('tv_data_download_calling', 'training_video_received', 'Training Video Received'),
  ('tv_data_download_calling', 'bio_operator_count', '# Bio Operator Count'),
  ('tv_data_download_calling', 'training_photos_received', 'Training Photos Received'),
  ('exam_day_calling', 'jco_rm', 'JCO RM'),
  ('exam_day_calling', 'jco_name_no', 'JCO Name & No'),
  ('exam_day_calling', 'fri_rm', 'FRI RM'),
  ('exam_day_calling', 'fri_name_no', 'FRI Name & NO'),
  ('exam_day_calling', 'fri_vendor', 'Fri Vendor'),
  ('exam_day_calling', 'ai_eta_ae1', 'AI ETA'),
  ('exam_day_calling', 'eta', 'ETA'),
  ('exam_day_calling', 'manpower_reached', 'Manpower Reached'),
  ('exam_day_calling', 'ai_eta_ae2', 'AI ETA'),
  ('exam_day_calling', 'ai_principal_confirmation', 'AI Principal Confirmation'),
  ('exam_day_calling', 'm_reached_fri', 'M Reached FRI'),
  ('exam_day_calling', 'f_reached_fri', 'F Reached FRI'),
  ('exam_day_calling', 'crowd_baggage', 'Crowd/Baggage'),
  ('exam_day_calling', 'cso_reached', 'CSO Reached'),
  ('exam_day_calling', 'bio_op_reached_by_cso', 'Bio OP Reached By CSO'),
  ('exam_day_calling', 'startek', 'Startek'),
  ('exam_day_calling', 'lan_connector', 'Lan Connector'),
  ('exam_day_calling', 'cctv_cam_count', 'CCTV Cam Count'),
  ('exam_day_calling', 'csr_s1', 'CSR S1'),
  ('exam_day_calling', 'csr_remarks_s1', 'CSR Remarks S1'),
  ('exam_day_calling', 'csr_s2', 'CSR S2'),
  ('exam_day_calling', 'csr_remarks_s2', 'CSR Remarks S2'),
  ('exam_day_calling', 'csr_s3', 'CSR S3'),
  ('exam_day_calling', 'csr_remarks_s3', 'CSR Remarks S3'),
  ('exam_day_calling', 'csr_s4', 'CSR S4'),
  ('exam_day_calling', 'csr_remarks_s4', 'CSR Remarks S4'),
  ('exam_day_calling', 'csr_s5', 'CSR S5'),
  ('exam_day_calling', 'csr_remarks_s5', 'CSR Remarks S5'),
  ('exam_day_calling', 'csr_s6', 'CSR S6'),
  ('exam_day_calling', 'csr_remarks_s6', 'CSR Remarks S6'),
  ('exam_day_calling', 'csr_s7', 'CSR S7'),
  ('exam_day_calling', 'csr_remarks_s7', 'CSR Remarks S7'),
  ('exam_day_calling', 'csr_s8', 'CSR S8'),
  ('exam_day_calling', 'csr_remarks_s8', 'CSR Remarks S8'),
  ('exam_day_calling', 'csr_remarks', 'CSR Remarks'),
  ('exam_day_calling', 'center_issues_highlighted_during_exam', 'Center Issues Highlighted During exam'),
  ('exam_day_calling', 'actual_time_manual_time_1st', 'Actual Time (Manual Time 1st)'),
  ('exam_day_calling', 'actual_time_manual_time_last', 'Actual Time (Manual Time Last)'),
  ('exam_day_calling', 'exit_selfie', 'Exit Selfie'),
  ('exam_day_calling', 'exam_code', 'Exam Code'),
  ('exam_day_calling', 'username', 'Username'),
  ('exam_day_calling', 'password', 'Password'),
  ('exam_day_calling', 'ai_eta_url', 'AI ETA URL'),
  ('exam_day_calling', 'time_stamp_1', 'Time Stamp 1'),
  ('exam_day_calling', 'time_stamp_2', 'Time Stamp 2'),
  ('exam_day_calling', 'ai_eta_status', 'AI ETA Status'),
  ('exam_day_calling', 'op_profile', 'OP Profile'),
  ('exam_day_calling', 'opsview_status_total_task', 'Opsview Status Total Task'),
  ('exam_day_calling', 'opsview_status_task_done', 'Opsview Status Task Done'),
  ('guard_list', 'total_h_guard_as_per_vm', 'Total H Guard as per VM'),
  ('guard_list', 'total_guard_as_per_vm', 'Total Guard as per VM'),
  ('guard_list', 'h_guards_google_sheet', 'H Guards - Google Sheet'),
  ('guard_list', 'guards_google_sheet', 'Guards Google Sheet'),
  ('guard_list', 'h_guards_pending_as_per_google_sheet', 'H Guards pending - as per Google Sheet'),
  ('guard_list', 'guards_pending_as_per_google_sheet', 'Guards Pending As per Google Sheet'),
  ('guard_list', 'list_status', 'List Status'),
  ('guard_list', 'vendor_rating', 'Vendor rating'),
  ('guard_list', 'uniform_status', 'Uniform Status'),
  ('guard_list', 'mail_status', 'Mail Status'),
  ('guard_list', 'am_mapping', 'AM Mapping'),
  ('guard_list', 'experience_fresher', 'Experience/Fresher'),
  ('guard_list', 'mock_issues_with_vendor', 'Mock Issues With Vendor'),
  ('guard_list', 'mock_date', 'Mock Date'),
  ('guard_list', 'remarks', 'Remarks'),
  ('guard_list', 'gp_remarks', 'GP Remarks'),
  ('guard_list', 'csr_consignee_name', 'CSR Consignee Name'),
  ('guard_list', 'csr_consignee_contact_no', 'CSR Consignee Contact No.'),
  ('guard_list', 'address_with_pin_code', 'ADDRESS / WITH PIN CODE'),
  ('guard_list', 'pin_code', 'PIN CODE'),
  ('guard_list', 'ready_for_dispatch', 'Ready for Dispatch'),
  ('guard_list', 'docate_number', 'Docate Number'),
  ('guard_list', 'csr_status', 'CSR Status'),
  ('guard_list', 'handover_audit_date', 'Handover Audit Date'),
  ('guard_list', 'uniform_remarks', 'Uniform Remarks'),
  ('guard_list', 'training_video_recieved', 'Training Video Recieved'),
  ('guard_list', 'training_video_date', 'Training Video Date'),
  ('guard_list', 'head_guard_count', 'Head Guard Count'),
  ('guard_list', 'frisking_done_sticker_delivery', 'Frisking Done Sticker Delivery'),
  ('guard_list', 'frisking_done_sticker_delivery_status_rm', 'Frisking Done Sticker Delivery Status RM'),
  ('guard_list', 'distribution_status', 'Distribution Status'),
  ('guard_list', 'other_remarks_distribution', 'Other Remarks - Distribution'),
  ('guard_list', 'group_created', 'Group Created'),
  ('guard_list', 'deduction_shared', 'Deduction Shared'),
  ('guard_list', 'deduction_remarks_others', 'Deduction Remarks Others'),
  ('guard_list', 'final_deduction_remarks', 'Final Deduction Remarks'),
  ('guard_list', 'final_deduction_remarks_others', 'Final Deduction Remarks Others'),
  ('guard_list', 'max_guard_list', 'Max Guard List'),
  ('guard_list', 'pm_remarks', 'PM Remarks'),
  ('guard_list', 'age_less_than_18', 'Age Less Than 18'),
  ('guard_list', 'vendor_email', 'Vendor Email'),
  ('guard_list', 'ach_email', 'ACH Email'),
  ('guard_list', 'super_viser_no_saved', 'Super viser No Saved'),
  ('guard_list', 'city_head_no_saved', 'City Head No Saved'),
  ('guard_list', 'intraactive_video', 'Intraactive Video'),
  ('op_list', 'total_supervisor_as_per_vm', 'Total Supervisor as per VM'),
  ('op_list', 'total_op_as_per_vm', 'Total OP as per VM'),
  ('op_list', 'supervisor_google_sheet', 'Supervisor Google Sheet'),
  ('op_list', 'op_google_sheet', 'OP Google Sheet'),
  ('op_list', 'supervisor_pending_as_per_google_sheet', 'Supervisor pending - as per Google Sheet'),
  ('op_list', 'op_pending_as_per_google_sheet', 'OP Pending As per Google Sheet'),
  ('op_list', 'center_with_0_login', 'Center with 0 Login'),
  ('op_list', 'operator_list_status', 'Operator List Status'),
  ('op_list', 'remarks', 'Remarks'),
  ('op_list', 'rm_mapping', 'RM Mapping'),
  ('op_list', 'am_mapping', 'AM Mapping'),
  ('op_list', 'experience_fresher', 'Experience/Fresher'),
  ('op_list', 'group_created', 'Group Created'),
  ('op_list', 'mock_date', 'Mock Date'),
  ('op_list', 'mock_time_remarks', 'Mock Time / Remarks'),
  ('op_list', 'device_distribution', 'Device Distribution'),
  ('op_list', 'device_distribution_remarks', 'Device distribution Remarks'),
  ('op_list', 'training_date', 'Training date'),
  ('op_list', 'training_time_remarks', 'Training Time / Remarks'),
  ('op_list', 'csr_consignee_name', 'CSR Consignee Name'),
  ('op_list', 'csr_consignee_contact_no', 'CSR Consignee Contact No.'),
  ('op_list', 'address_with_pin_code', 'ADDRESS / WITH PIN CODE'),
  ('op_list', 'pin_code', 'PIN CODE'),
  ('op_list', 'ready_for_dispatch', 'Ready for Dispatch'),
  ('op_list', 'docket_number', 'DOCKET NUMBER'),
  ('op_list', 'csr_status', 'CSR Status'),
  ('op_list', 'handover_audit_date', 'Handover Audit Date'),
  ('op_list', 'max_op_list_received', 'Max Op List Received'),
  ('op_list', 'manpower_details_received_on_time', 'Manpower details received on time'),
  ('op_list', 'replacement_provided', 'Replacement provided'),
  ('op_list', 'mock_rating', 'Mock Rating'),
  ('op_list', 'manpower_training_done', 'Manpower training done'),
  ('op_list', 'unique_op_profiles_center', 'Unique OP profiles / Center'),
  ('op_list', 'device_damages_losses_delays', 'Device Damages / Losses / delays'),
  ('op_list', 'over_all_rating', 'Over all Rating'),
  ('op_list', 'vendor_email', 'Vendor Email'),
  ('op_list', 'ach_email', 'ACH Email'),
  ('op_list', 'age_18', 'Age < 18')
on conflict (scope, key) do update set label = excluded.label;
comment on column public.operator_calling."distance" is 'Distance';
comment on column public.operator_calling."ai_calling_status" is 'AI Calling Status';
comment on column public.operator_calling."recording_url" is 'Recording URL';
comment on column public.operator_calling."biometric_designation" is 'Biometric Designation';
comment on column public.operator_calling."experience" is 'Experience';
comment on column public.operator_calling."biometric_operator_name" is 'Biometric Operator Name';
comment on column public.operator_calling."biometric_operator_number" is 'Biometric Operator Number';
comment on column public.operator_calling."biometric_calling_status" is 'Biometric Calling Status';
comment on column public.operator_calling."biometric_has_smartphone_app" is 'Biometric has Smartphone/App';
comment on column public.operator_calling."mode_of_transport" is 'Mode of Transport';
comment on column public.operator_calling."reaching_time_on_exam" is 'Reaching Time on Exam';
comment on column public.operator_calling."remarks" is 'Remarks';
comment on column public.operator_calling."aadhar_card_no" is 'Aadhar card No.';
comment on column public.operator_calling."aadhar_card_no_valid_not_valid" is 'Aadhar card No. Valid / Not Valid';
comment on column public.operator_calling."selfie_received" is 'Selfie Received';
comment on column public.operator_calling."aadhar_photo" is 'Aadhar Photo';
comment on column public.operator_calling."gender" is 'Gender';
comment on column public.operator_calling."age" is 'Age';
comment on column public.operator_calling."father_name" is 'Father Name';
comment on column public.operator_calling."date_of_birth" is 'Date Of Birth';
comment on column public.operator_calling."address" is 'Address';
comment on column public.operator_calling."manpower_rate" is 'Manpower Rate';
comment on column public.operator_calling."seqrview_address" is 'Seqrview Address';
comment on column public.operator_calling."seqview_number" is 'SeqView Number';
comment on column public.operator_calling."seqrview_onboard" is 'SeqrView Onboard';
comment on column public.operator_calling."seqrview_dob" is 'SeqrView DOB';
comment on column public.operator_calling."seqrview_name" is 'SeqrView Name';
comment on column public.operator_calling."new_onboard" is 'New Onboard';
comment on column public.operator_calling."training_video_watched" is 'Training Video Watched';
comment on column public.operator_calling."video_watched_count" is 'Video Watched Count';
comment on column public.operator_calling."video_watched_status" is 'Video Watched Status';
comment on column public.operator_calling."final_status" is 'Final Status';
comment on column public.operator_calling."onboarded" is 'Onboarded';
comment on column public.operator_calling."new_on_boarded" is 'New On Boarded';
comment on column public.operator_calling."ai_calling" is 'AI Calling';
comment on column public.mock_calling."material_status" is 'Material Status';
comment on column public.mock_calling."re_mock_status" is 'RE Mock Status';
comment on column public.mock_calling."mock_date_by_client" is 'Mock Date By Client';
comment on column public.mock_calling."mock_time_by_client" is 'Mock Time By Client';
comment on column public.mock_calling."mock_person_name" is 'Mock Person Name';
comment on column public.mock_calling."mock_person_number" is 'Mock Person Number';
comment on column public.mock_calling."mock_calling_confirmation" is 'Mock Calling Confirmation';
comment on column public.mock_calling."reaching_time_on_mock" is 'Reaching Time on Mock';
comment on column public.mock_calling."remarks" is 'Remarks';
comment on column public.mock_calling."fri_vendor" is 'Fri Vendor';
comment on column public.mock_calling."ops_view_selfie_upload" is 'OPS View Selfie Upload';
comment on column public.mock_calling."ops_view_mock_report" is 'OPS View Mock Report';
comment on column public.mock_calling."final_mock" is 'Final Mock';
comment on column public.mock_calling."mock_attendance" is 'Mock Attendance';
comment on column public.mock_calling."mock_report" is 'Mock Report';
comment on column public.mock_calling."biometric_counter_location_identify" is 'Biometric Counter Location Identify';
comment on column public.mock_calling."location_photo_received" is 'Location Photo Received';
comment on column public.mock_calling."wifi_availability_status" is 'WIFI Availability Status';
comment on column public.mock_calling."center_issues" is 'Center Issues';
comment on column public.mock_calling."remarks_for_center_issues" is 'Remarks for Center issues';
comment on column public.mock_calling."mock_confirmed_from_csup_observer" is 'Mock Confirmed from CSUP / Observer';
comment on column public.mock_calling."mock_confirmation_remarks" is 'Mock Confirmation Remarks';
comment on column public.mock_calling."remarks_if_any" is 'Remarks (if any)';
comment on column public.mock_calling."sent_ms1" is 'Sent';
comment on column public.mock_calling."received_mr1" is 'Received';
comment on column public.mock_calling."sent_ms2" is 'Sent';
comment on column public.mock_calling."received_mr2" is 'Received';
comment on column public.mock_calling."sent_ms3" is 'Sent';
comment on column public.mock_calling."received_mr3" is 'Received';
comment on column public.mock_calling."sent_ms4" is 'Sent';
comment on column public.mock_calling."received_mr4" is 'Received';
comment on column public.mock_calling."sent_ms5" is 'Sent';
comment on column public.mock_calling."received_mr5" is 'Received';
comment on column public.mock_calling."sent_ms6" is 'Sent';
comment on column public.mock_calling."received_mr6" is 'Received';
comment on column public.mock_calling."sent_ms7" is 'Sent';
comment on column public.mock_calling."received_mr7" is 'Received';
comment on column public.mock_calling."sent_ms8" is 'Sent';
comment on column public.mock_calling."received_mr8" is 'Received';
comment on column public.mock_calling."sent_ms9" is 'Sent';
comment on column public.mock_calling."received_mr9" is 'Received';
comment on column public.mock_calling."sent_ms10" is 'Sent';
comment on column public.mock_calling."received_mr10" is 'Received';
comment on column public.mock_calling."sent_ms11" is 'Sent';
comment on column public.mock_calling."received_mr11" is 'Received';
comment on column public.mock_calling."sent_ms12" is 'Sent';
comment on column public.mock_calling."received_mr12" is 'Received';
comment on column public.mock_calling."fri_rm" is 'FRI RM';
comment on column public.mock_calling."fri_material_status" is 'Fri Material Status';
comment on column public.mock_calling."cso_vendor" is 'CSO Vendor';
comment on column public.mock_calling."cso_rm" is 'CSO RM';
comment on column public.mock_calling."distance" is 'Distance';
comment on column public.mock_calling."faq_count" is 'FAQ Count';
comment on column public.mock_calling."remock_status" is 'REMOCK Status';
comment on column public.tv_data_download_calling."device_distribution_status_validation_by_sup" is 'Device Distribution status Validation by Supervisor';
comment on column public.tv_data_download_calling."ddd_remarks_time_shared_by_op" is 'DDD Remarks (Time Shared by OP)';
comment on column public.tv_data_download_calling."device_person_name_no" is 'Device Person Name & No';
comment on column public.tv_data_download_calling."id_received" is 'ID Received';
comment on column public.tv_data_download_calling."jacket_received" is 'Jacket Received';
comment on column public.tv_data_download_calling."hollogram_received" is 'Hollogram Received';
comment on column public.tv_data_download_calling."startek_device" is 'STARTEK Device';
comment on column public.tv_data_download_calling."authority_letter_received" is 'Authority Letter Received';
comment on column public.tv_data_download_calling."device" is '# Device';
comment on column public.tv_data_download_calling."devices_data_download" is '# Devices Data Download';
comment on column public.tv_data_download_calling."devices_transaction_done" is '# Devices Transaction Done';
comment on column public.tv_data_download_calling."unique_bio_device" is '# Unique Bio Device';
comment on column public.tv_data_download_calling."unique_aadhar_transaction" is '# Unique Aadhar Transaction';
comment on column public.tv_data_download_calling."training_video_received" is 'Training Video Received';
comment on column public.tv_data_download_calling."bio_operator_count" is '# Bio Operator Count';
comment on column public.tv_data_download_calling."training_photos_received" is 'Training Photos Received';
comment on column public.exam_day_calling."jco_rm" is 'JCO RM';
comment on column public.exam_day_calling."jco_name_no" is 'JCO Name & No';
comment on column public.exam_day_calling."fri_rm" is 'FRI RM';
comment on column public.exam_day_calling."fri_name_no" is 'FRI Name & NO';
comment on column public.exam_day_calling."fri_vendor" is 'Fri Vendor';
comment on column public.exam_day_calling."ai_eta_ae1" is 'AI ETA';
comment on column public.exam_day_calling."eta" is 'ETA';
comment on column public.exam_day_calling."manpower_reached" is 'Manpower Reached';
comment on column public.exam_day_calling."ai_eta_ae2" is 'AI ETA';
comment on column public.exam_day_calling."ai_principal_confirmation" is 'AI Principal Confirmation';
comment on column public.exam_day_calling."m_reached_fri" is 'M Reached FRI';
comment on column public.exam_day_calling."f_reached_fri" is 'F Reached FRI';
comment on column public.exam_day_calling."crowd_baggage" is 'Crowd/Baggage';
comment on column public.exam_day_calling."cso_reached" is 'CSO Reached';
comment on column public.exam_day_calling."bio_op_reached_by_cso" is 'Bio OP Reached By CSO';
comment on column public.exam_day_calling."startek" is 'Startek';
comment on column public.exam_day_calling."lan_connector" is 'Lan Connector';
comment on column public.exam_day_calling."cctv_cam_count" is 'CCTV Cam Count';
comment on column public.exam_day_calling."csr_s1" is 'CSR S1';
comment on column public.exam_day_calling."csr_remarks_s1" is 'CSR Remarks S1';
comment on column public.exam_day_calling."csr_s2" is 'CSR S2';
comment on column public.exam_day_calling."csr_remarks_s2" is 'CSR Remarks S2';
comment on column public.exam_day_calling."csr_s3" is 'CSR S3';
comment on column public.exam_day_calling."csr_remarks_s3" is 'CSR Remarks S3';
comment on column public.exam_day_calling."csr_s4" is 'CSR S4';
comment on column public.exam_day_calling."csr_remarks_s4" is 'CSR Remarks S4';
comment on column public.exam_day_calling."csr_s5" is 'CSR S5';
comment on column public.exam_day_calling."csr_remarks_s5" is 'CSR Remarks S5';
comment on column public.exam_day_calling."csr_s6" is 'CSR S6';
comment on column public.exam_day_calling."csr_remarks_s6" is 'CSR Remarks S6';
comment on column public.exam_day_calling."csr_s7" is 'CSR S7';
comment on column public.exam_day_calling."csr_remarks_s7" is 'CSR Remarks S7';
comment on column public.exam_day_calling."csr_s8" is 'CSR S8';
comment on column public.exam_day_calling."csr_remarks_s8" is 'CSR Remarks S8';
comment on column public.exam_day_calling."csr_remarks" is 'CSR Remarks';
comment on column public.exam_day_calling."center_issues_highlighted_during_exam" is 'Center Issues Highlighted During exam';
comment on column public.exam_day_calling."actual_time_manual_time_1st" is 'Actual Time (Manual Time 1st)';
comment on column public.exam_day_calling."actual_time_manual_time_last" is 'Actual Time (Manual Time Last)';
comment on column public.exam_day_calling."exit_selfie" is 'Exit Selfie';
comment on column public.exam_day_calling."exam_code" is 'Exam Code';
comment on column public.exam_day_calling."username" is 'Username';
comment on column public.exam_day_calling."password" is 'Password';
comment on column public.exam_day_calling."ai_eta_url" is 'AI ETA URL';
comment on column public.exam_day_calling."time_stamp_1" is 'Time Stamp 1';
comment on column public.exam_day_calling."time_stamp_2" is 'Time Stamp 2';
comment on column public.exam_day_calling."ai_eta_status" is 'AI ETA Status';
comment on column public.exam_day_calling."op_profile" is 'OP Profile';
comment on column public.exam_day_calling."opsview_status_total_task" is 'Opsview Status Total Task';
comment on column public.exam_day_calling."opsview_status_task_done" is 'Opsview Status Task Done';
comment on column public.guard_list."total_h_guard_as_per_vm" is 'Total H Guard as per VM';
comment on column public.guard_list."total_guard_as_per_vm" is 'Total Guard as per VM';
comment on column public.guard_list."h_guards_google_sheet" is 'H Guards - Google Sheet';
comment on column public.guard_list."guards_google_sheet" is 'Guards Google Sheet';
comment on column public.guard_list."h_guards_pending_as_per_google_sheet" is 'H Guards pending - as per Google Sheet';
comment on column public.guard_list."guards_pending_as_per_google_sheet" is 'Guards Pending As per Google Sheet';
comment on column public.guard_list."list_status" is 'List Status';
comment on column public.guard_list."vendor_rating" is 'Vendor rating';
comment on column public.guard_list."uniform_status" is 'Uniform Status';
comment on column public.guard_list."mail_status" is 'Mail Status';
comment on column public.guard_list."am_mapping" is 'AM Mapping';
comment on column public.guard_list."experience_fresher" is 'Experience/Fresher';
comment on column public.guard_list."mock_issues_with_vendor" is 'Mock Issues With Vendor';
comment on column public.guard_list."mock_date" is 'Mock Date';
comment on column public.guard_list."remarks" is 'Remarks';
comment on column public.guard_list."gp_remarks" is 'GP Remarks';
comment on column public.guard_list."csr_consignee_name" is 'CSR Consignee Name';
comment on column public.guard_list."csr_consignee_contact_no" is 'CSR Consignee Contact No.';
comment on column public.guard_list."address_with_pin_code" is 'ADDRESS / WITH PIN CODE';
comment on column public.guard_list."pin_code" is 'PIN CODE';
comment on column public.guard_list."ready_for_dispatch" is 'Ready for Dispatch';
comment on column public.guard_list."docate_number" is 'Docate Number';
comment on column public.guard_list."csr_status" is 'CSR Status';
comment on column public.guard_list."handover_audit_date" is 'Handover Audit Date';
comment on column public.guard_list."uniform_remarks" is 'Uniform Remarks';
comment on column public.guard_list."training_video_recieved" is 'Training Video Recieved';
comment on column public.guard_list."training_video_date" is 'Training Video Date';
comment on column public.guard_list."head_guard_count" is 'Head Guard Count';
comment on column public.guard_list."frisking_done_sticker_delivery" is 'Frisking Done Sticker Delivery';
comment on column public.guard_list."frisking_done_sticker_delivery_status_rm" is 'Frisking Done Sticker Delivery Status RM';
comment on column public.guard_list."distribution_status" is 'Distribution Status';
comment on column public.guard_list."other_remarks_distribution" is 'Other Remarks - Distribution';
comment on column public.guard_list."group_created" is 'Group Created';
comment on column public.guard_list."deduction_shared" is 'Deduction Shared';
comment on column public.guard_list."deduction_remarks_others" is 'Deduction Remarks Others';
comment on column public.guard_list."final_deduction_remarks" is 'Final Deduction Remarks';
comment on column public.guard_list."final_deduction_remarks_others" is 'Final Deduction Remarks Others';
comment on column public.guard_list."max_guard_list" is 'Max Guard List';
comment on column public.guard_list."pm_remarks" is 'PM Remarks';
comment on column public.guard_list."age_less_than_18" is 'Age Less Than 18';
comment on column public.guard_list."vendor_email" is 'Vendor Email';
comment on column public.guard_list."ach_email" is 'ACH Email';
comment on column public.guard_list."super_viser_no_saved" is 'Super viser No Saved';
comment on column public.guard_list."city_head_no_saved" is 'City Head No Saved';
comment on column public.guard_list."intraactive_video" is 'Intraactive Video';
comment on column public.op_list."total_supervisor_as_per_vm" is 'Total Supervisor as per VM';
comment on column public.op_list."total_op_as_per_vm" is 'Total OP as per VM';
comment on column public.op_list."supervisor_google_sheet" is 'Supervisor Google Sheet';
comment on column public.op_list."op_google_sheet" is 'OP Google Sheet';
comment on column public.op_list."supervisor_pending_as_per_google_sheet" is 'Supervisor pending - as per Google Sheet';
comment on column public.op_list."op_pending_as_per_google_sheet" is 'OP Pending As per Google Sheet';
comment on column public.op_list."center_with_0_login" is 'Center with 0 Login';
comment on column public.op_list."operator_list_status" is 'Operator List Status';
comment on column public.op_list."remarks" is 'Remarks';
comment on column public.op_list."rm_mapping" is 'RM Mapping';
comment on column public.op_list."am_mapping" is 'AM Mapping';
comment on column public.op_list."experience_fresher" is 'Experience/Fresher';
comment on column public.op_list."group_created" is 'Group Created';
comment on column public.op_list."mock_date" is 'Mock Date';
comment on column public.op_list."mock_time_remarks" is 'Mock Time / Remarks';
comment on column public.op_list."device_distribution" is 'Device Distribution';
comment on column public.op_list."device_distribution_remarks" is 'Device distribution Remarks';
comment on column public.op_list."training_date" is 'Training date';
comment on column public.op_list."training_time_remarks" is 'Training Time / Remarks';
comment on column public.op_list."csr_consignee_name" is 'CSR Consignee Name';
comment on column public.op_list."csr_consignee_contact_no" is 'CSR Consignee Contact No.';
comment on column public.op_list."address_with_pin_code" is 'ADDRESS / WITH PIN CODE';
comment on column public.op_list."pin_code" is 'PIN CODE';
comment on column public.op_list."ready_for_dispatch" is 'Ready for Dispatch';
comment on column public.op_list."docket_number" is 'DOCKET NUMBER';
comment on column public.op_list."csr_status" is 'CSR Status';
comment on column public.op_list."handover_audit_date" is 'Handover Audit Date';
comment on column public.op_list."max_op_list_received" is 'Max Op List Received';
comment on column public.op_list."manpower_details_received_on_time" is 'Manpower details received on time';
comment on column public.op_list."replacement_provided" is 'Replacement provided';
comment on column public.op_list."mock_rating" is 'Mock Rating';
comment on column public.op_list."manpower_training_done" is 'Manpower training done';
comment on column public.op_list."unique_op_profiles_center" is 'Unique OP profiles / Center';
comment on column public.op_list."device_damages_losses_delays" is 'Device Damages / Losses / delays';
comment on column public.op_list."over_all_rating" is 'Over all Rating';
comment on column public.op_list."vendor_email" is 'Vendor Email';
comment on column public.op_list."ach_email" is 'ACH Email';
comment on column public.op_list."age_18" is 'Age < 18';

-- Existing data: copy from the old shared table (the log trigger is attached afterwards, so this is not logged cell by cell)
insert into public.operator_calling(project_code, project_id, service, center_code, exam_date, op_no, "distance", "ai_calling_status", "recording_url", "biometric_designation", "experience", "biometric_operator_name", "biometric_operator_number", "biometric_calling_status", "biometric_has_smartphone_app", "mode_of_transport", "reaching_time_on_exam", "remarks", "aadhar_card_no", "aadhar_card_no_valid_not_valid", "selfie_received", "aadhar_photo", "gender", "age", "father_name", "date_of_birth", "address", "manpower_rate", "seqrview_address", "seqview_number", "seqrview_onboard", "seqrview_dob", "seqrview_name", "new_onboard", "training_video_watched", "video_watched_count", "video_watched_status", "final_status", "onboarded", "new_on_boarded", "ai_calling", extra, created_at, updated_at)
select public.svc_pcode(se.project_code, se.service), se.project_code, se.service, split_part(se.row_key,'|',1),
       coalesce(nullif(p.details->'dates'->>split_part(se.row_key,'|',2)::int, '')::date, nullif(p.details->>'start','')::date + split_part(se.row_key,'|',2)::int, date '1900-01-01' + split_part(se.row_key,'|',2)::int), split_part(se.row_key,'|',3)::int, se.data->>'dist', se.data->>'aics', se.data->>'rec', se.data->>'des', se.data->>'exp', se.data->>'name', se.data->>'num', se.data->>'bcs', se.data->>'app', se.data->>'mot', se.data->>'rt', se.data->>'rem', se.data->>'aad', se.data->>'aadv', se.data->>'selfie', se.data->>'aadp', se.data->>'gen', se.data->>'age', se.data->>'fn', se.data->>'dob', se.data->>'addr', se.data->>'rate', se.data->>'sqa', se.data->>'sqn', se.data->>'sqo', se.data->>'sqd', se.data->>'sqname', se.data->>'newob', se.data->>'tvw', se.data->>'tvc', se.data->>'tvs', se.data->>'fin', se.data->>'onb', se.data->>'nonb', se.data->>'aic', se.data - array['dist', 'aics', 'rec', 'des', 'exp', 'name', 'num', 'bcs', 'app', 'mot', 'rt', 'rem', 'aad', 'aadv', 'selfie', 'aadp', 'gen', 'age', 'fn', 'dob', 'addr', 'rate', 'sqa', 'sqn', 'sqo', 'sqd', 'sqname', 'newob', 'tvw', 'tvc', 'tvs', 'fin', 'onb', 'nonb', 'aic'], coalesce(se.updated_at, now()), coalesce(se.updated_at, now())
from public.sheet_entries se join public.projects p on p.code = se.project_code
where se.sheet = 'Operator Calling' and se.row_key ~ '^[^|]+[|][0-9]+[|][0-9]+$' on conflict do nothing;
insert into public.mock_calling(project_code, project_id, service, center_code, "material_status", "re_mock_status", "mock_date_by_client", "mock_time_by_client", "mock_person_name", "mock_person_number", "mock_calling_confirmation", "reaching_time_on_mock", "remarks", "fri_vendor", "ops_view_selfie_upload", "ops_view_mock_report", "final_mock", "mock_attendance", "mock_report", "biometric_counter_location_identify", "location_photo_received", "wifi_availability_status", "center_issues", "remarks_for_center_issues", "mock_confirmed_from_csup_observer", "mock_confirmation_remarks", "remarks_if_any", "sent_ms1", "received_mr1", "sent_ms2", "received_mr2", "sent_ms3", "received_mr3", "sent_ms4", "received_mr4", "sent_ms5", "received_mr5", "sent_ms6", "received_mr6", "sent_ms7", "received_mr7", "sent_ms8", "received_mr8", "sent_ms9", "received_mr9", "sent_ms10", "received_mr10", "sent_ms11", "received_mr11", "sent_ms12", "received_mr12", "fri_rm", "fri_material_status", "cso_vendor", "cso_rm", "distance", "faq_count", "remock_status", extra, created_at, updated_at)
select public.svc_pcode(se.project_code, se.service), se.project_code, se.service, se.row_key, se.data->>'mat', se.data->>'rms', se.data->>'mdc', se.data->>'mtc', se.data->>'mpname', se.data->>'mpn', se.data->>'mcc', se.data->>'rtm', se.data->>'rem', se.data->>'fv', se.data->>'ovs', se.data->>'ovm', se.data->>'fm', se.data->>'ma', se.data->>'mrp', se.data->>'bcl', se.data->>'lpr', se.data->>'wifi', se.data->>'ci', se.data->>'cir', se.data->>'mcs', se.data->>'mcr', se.data->>'rem2', se.data->>'ms1', se.data->>'mr1', se.data->>'ms2', se.data->>'mr2', se.data->>'ms3', se.data->>'mr3', se.data->>'ms4', se.data->>'mr4', se.data->>'ms5', se.data->>'mr5', se.data->>'ms6', se.data->>'mr6', se.data->>'ms7', se.data->>'mr7', se.data->>'ms8', se.data->>'mr8', se.data->>'ms9', se.data->>'mr9', se.data->>'ms10', se.data->>'mr10', se.data->>'ms11', se.data->>'mr11', se.data->>'ms12', se.data->>'mr12', se.data->>'frm', se.data->>'fms', se.data->>'csv', se.data->>'csrm', se.data->>'dist', se.data->>'faq', se.data->>'rmk', se.data - array['mat', 'rms', 'mdc', 'mtc', 'mpname', 'mpn', 'mcc', 'rtm', 'rem', 'fv', 'ovs', 'ovm', 'fm', 'ma', 'mrp', 'bcl', 'lpr', 'wifi', 'ci', 'cir', 'mcs', 'mcr', 'rem2', 'ms1', 'mr1', 'ms2', 'mr2', 'ms3', 'mr3', 'ms4', 'mr4', 'ms5', 'mr5', 'ms6', 'mr6', 'ms7', 'mr7', 'ms8', 'mr8', 'ms9', 'mr9', 'ms10', 'mr10', 'ms11', 'mr11', 'ms12', 'mr12', 'frm', 'fms', 'csv', 'csrm', 'dist', 'faq', 'rmk'], coalesce(se.updated_at, now()), coalesce(se.updated_at, now())
from public.sheet_entries se join public.projects p on p.code = se.project_code
where se.sheet = 'Mock Calling' on conflict do nothing;
insert into public.tv_data_download_calling(project_code, project_id, service, center_code, "device_distribution_status_validation_by_sup", "ddd_remarks_time_shared_by_op", "device_person_name_no", "id_received", "jacket_received", "hollogram_received", "startek_device", "authority_letter_received", "device", "devices_data_download", "devices_transaction_done", "unique_bio_device", "unique_aadhar_transaction", "training_video_received", "bio_operator_count", "training_photos_received", extra, created_at, updated_at)
select public.svc_pcode(se.project_code, se.service), se.project_code, se.service, se.row_key, se.data->>'dvs', se.data->>'ddr', se.data->>'dpn', se.data->>'idr', se.data->>'jkr', se.data->>'hlr', se.data->>'stk', se.data->>'alr', se.data->>'dev', se.data->>'dd', se.data->>'trd', se.data->>'ub', se.data->>'ua', se.data->>'tvr', se.data->>'boc', se.data->>'tph', se.data - array['dvs', 'ddr', 'dpn', 'idr', 'jkr', 'hlr', 'stk', 'alr', 'dev', 'dd', 'trd', 'ub', 'ua', 'tvr', 'boc', 'tph'], coalesce(se.updated_at, now()), coalesce(se.updated_at, now())
from public.sheet_entries se join public.projects p on p.code = se.project_code
where se.sheet = 'TV Data Download Calling' on conflict do nothing;
-- older rows were saved per shift (center|day|S1, S2 ...): one row per center and exam date now, shifts combined (S1 wins on a clash)
insert into public.exam_day_calling(project_code, project_id, service, center_code, exam_date, "jco_rm", "jco_name_no", "fri_rm", "fri_name_no", "fri_vendor", "ai_eta_ae1", "eta", "manpower_reached", "ai_eta_ae2", "ai_principal_confirmation", "m_reached_fri", "f_reached_fri", "crowd_baggage", "cso_reached", "bio_op_reached_by_cso", "startek", "lan_connector", "cctv_cam_count", "csr_s1", "csr_remarks_s1", "csr_s2", "csr_remarks_s2", "csr_s3", "csr_remarks_s3", "csr_s4", "csr_remarks_s4", "csr_s5", "csr_remarks_s5", "csr_s6", "csr_remarks_s6", "csr_s7", "csr_remarks_s7", "csr_s8", "csr_remarks_s8", "csr_remarks", "center_issues_highlighted_during_exam", "actual_time_manual_time_1st", "actual_time_manual_time_last", "exit_selfie", "exam_code", "username", "password", "ai_eta_url", "time_stamp_1", "time_stamp_2", "ai_eta_status", "op_profile", "opsview_status_total_task", "opsview_status_task_done", extra, created_at, updated_at)
select public.svc_pcode(m.project_code, m.service), m.project_code, m.service, m.c,
       coalesce(nullif(p.details->'dates'->>m.d, '')::date, nullif(p.details->>'start','')::date + m.d, date '1900-01-01' + m.d), m.data->>'jrm', m.data->>'jnn', m.data->>'frm', m.data->>'fnn', m.data->>'fv', m.data->>'ae1', m.data->>'eta', m.data->>'mpr', m.data->>'ae2', m.data->>'apc', m.data->>'mrf', m.data->>'frf', m.data->>'cb', m.data->>'csor', m.data->>'bor', m.data->>'stk', m.data->>'lan', m.data->>'cctv', m.data->>'csr1', m.data->>'csrr1', m.data->>'csr2', m.data->>'csrr2', m.data->>'csr3', m.data->>'csrr3', m.data->>'csr4', m.data->>'csrr4', m.data->>'csr5', m.data->>'csrr5', m.data->>'csr6', m.data->>'csrr6', m.data->>'csr7', m.data->>'csrr7', m.data->>'csr8', m.data->>'csrr8', m.data->>'csrr', m.data->>'cih', m.data->>'at1', m.data->>'at2', m.data->>'exs', m.data->>'exc', m.data->>'usr', m.data->>'pwd', m.data->>'aeu', m.data->>'ts1', m.data->>'ts2', m.data->>'aes', m.data->>'opp', m.data->>'ost', m.data->>'osd', m.data - array['jrm', 'jnn', 'frm', 'fnn', 'fv', 'ae1', 'eta', 'mpr', 'ae2', 'apc', 'mrf', 'frf', 'cb', 'csor', 'bor', 'stk', 'lan', 'cctv', 'csr1', 'csrr1', 'csr2', 'csrr2', 'csr3', 'csrr3', 'csr4', 'csrr4', 'csr5', 'csrr5', 'csr6', 'csrr6', 'csr7', 'csrr7', 'csr8', 'csrr8', 'csrr', 'cih', 'at1', 'at2', 'exs', 'exc', 'usr', 'pwd', 'aeu', 'ts1', 'ts2', 'aes', 'opp', 'ost', 'osd'], m.at, m.at
from (select x.project_code, x.service, split_part(x.row_key,'|',1) as c, split_part(x.row_key,'|',2)::int as d, max(coalesce(x.updated_at, now())) as at,
             coalesce(jsonb_object_agg(e.key, e.value order by x.row_key desc) filter (where e.value not in ('""'::jsonb, 'null'::jsonb)), '{}'::jsonb) as data
      from public.sheet_entries x left join lateral jsonb_each(x.data) e on true
      where x.sheet = 'Exam day Calling' and x.row_key ~ '^[^|]+[|][0-9]+([|]S[0-9]+)?$'
      group by x.project_code, x.service, split_part(x.row_key,'|',1), split_part(x.row_key,'|',2)::int) m
join public.projects p on p.code = m.project_code
on conflict do nothing;
insert into public.guard_list(project_code, project_id, service, group_key, "total_h_guard_as_per_vm", "total_guard_as_per_vm", "h_guards_google_sheet", "guards_google_sheet", "h_guards_pending_as_per_google_sheet", "guards_pending_as_per_google_sheet", "list_status", "vendor_rating", "uniform_status", "mail_status", "am_mapping", "experience_fresher", "mock_issues_with_vendor", "mock_date", "remarks", "gp_remarks", "csr_consignee_name", "csr_consignee_contact_no", "address_with_pin_code", "pin_code", "ready_for_dispatch", "docate_number", "csr_status", "handover_audit_date", "uniform_remarks", "training_video_recieved", "training_video_date", "head_guard_count", "frisking_done_sticker_delivery", "frisking_done_sticker_delivery_status_rm", "distribution_status", "other_remarks_distribution", "group_created", "deduction_shared", "deduction_remarks_others", "final_deduction_remarks", "final_deduction_remarks_others", "max_guard_list", "pm_remarks", "age_less_than_18", "vendor_email", "ach_email", "super_viser_no_saved", "city_head_no_saved", "intraactive_video", extra, created_at, updated_at)
select public.svc_pcode(se.project_code, se.service), se.project_code, se.service, se.row_key, se.data->>'hvm', se.data->>'gvm', coalesce(se.data->>'g0', se.data->>'h_guards_google_sheet'), coalesce(se.data->>'g1', se.data->>'guards_google_sheet'), coalesce(se.data->>'g2', se.data->>'h_guards_pending_as_per_google_sheet'), coalesce(se.data->>'g3', se.data->>'guards_pending_as_per_google_sheet'), coalesce(se.data->>'g4', se.data->>'list_status'), coalesce(se.data->>'g5', se.data->>'vendor_rating'), coalesce(se.data->>'g6', se.data->>'uniform_status'), coalesce(se.data->>'g7', se.data->>'mail_status'), coalesce(se.data->>'g8', se.data->>'am_mapping'), coalesce(se.data->>'g9', se.data->>'experience_fresher'), coalesce(se.data->>'g10', se.data->>'mock_issues_with_vendor'), coalesce(se.data->>'g11', se.data->>'mock_date'), coalesce(se.data->>'g12', se.data->>'remarks'), coalesce(se.data->>'g13', se.data->>'gp_remarks'), coalesce(se.data->>'g14', se.data->>'csr_consignee_name'), coalesce(se.data->>'g15', se.data->>'csr_consignee_contact_no'), coalesce(se.data->>'g16', se.data->>'address_with_pin_code'), coalesce(se.data->>'g17', se.data->>'pin_code'), coalesce(se.data->>'g18', se.data->>'ready_for_dispatch'), coalesce(se.data->>'g19', se.data->>'docate_number'), coalesce(se.data->>'g20', se.data->>'csr_status'), coalesce(se.data->>'g21', se.data->>'handover_audit_date'), coalesce(se.data->>'g22', se.data->>'uniform_remarks'), coalesce(se.data->>'g23', se.data->>'training_video_recieved'), coalesce(se.data->>'g24', se.data->>'training_video_date'), coalesce(se.data->>'g25', se.data->>'head_guard_count'), coalesce(se.data->>'g26', se.data->>'frisking_done_sticker_delivery'), coalesce(se.data->>'g27', se.data->>'frisking_done_sticker_delivery_status_rm'), coalesce(se.data->>'g28', se.data->>'distribution_status'), coalesce(se.data->>'g29', se.data->>'other_remarks_distribution'), coalesce(se.data->>'g30', se.data->>'group_created'), coalesce(se.data->>'g31', se.data->>'deduction_shared'), coalesce(se.data->>'g32', se.data->>'deduction_remarks_others'), coalesce(se.data->>'g33', se.data->>'final_deduction_remarks'), coalesce(se.data->>'g34', se.data->>'final_deduction_remarks_others'), coalesce(se.data->>'g35', se.data->>'max_guard_list'), coalesce(se.data->>'g36', se.data->>'pm_remarks'), coalesce(se.data->>'g37', se.data->>'age_less_than_18'), coalesce(se.data->>'g38', se.data->>'vendor_email'), coalesce(se.data->>'g39', se.data->>'ach_email'), coalesce(se.data->>'g40', se.data->>'super_viser_no_saved'), coalesce(se.data->>'g41', se.data->>'city_head_no_saved'), coalesce(se.data->>'g42', se.data->>'intraactive_video'),
       se.data - array['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'g17', 'g18', 'g19', 'g20', 'g21', 'g22', 'g23', 'g24', 'g25', 'g26', 'g27', 'g28', 'g29', 'g30', 'g31', 'g32', 'g33', 'g34', 'g35', 'g36', 'g37', 'g38', 'g39', 'g40', 'g41', 'g42', 'hvm', 'gvm', 'h_guards_google_sheet', 'guards_google_sheet', 'h_guards_pending_as_per_google_sheet', 'guards_pending_as_per_google_sheet', 'list_status', 'vendor_rating', 'uniform_status', 'mail_status', 'am_mapping', 'experience_fresher', 'mock_issues_with_vendor', 'mock_date', 'remarks', 'gp_remarks', 'csr_consignee_name', 'csr_consignee_contact_no', 'address_with_pin_code', 'pin_code', 'ready_for_dispatch', 'docate_number', 'csr_status', 'handover_audit_date', 'uniform_remarks', 'training_video_recieved', 'training_video_date', 'head_guard_count', 'frisking_done_sticker_delivery', 'frisking_done_sticker_delivery_status_rm', 'distribution_status', 'other_remarks_distribution', 'group_created', 'deduction_shared', 'deduction_remarks_others', 'final_deduction_remarks', 'final_deduction_remarks_others', 'max_guard_list', 'pm_remarks', 'age_less_than_18', 'vendor_email', 'ach_email', 'super_viser_no_saved', 'city_head_no_saved', 'intraactive_video'], coalesce(se.updated_at, now()), coalesce(se.updated_at, now())
from public.sheet_entries se join public.projects p on p.code = se.project_code
where se.sheet = 'Guard List' on conflict do nothing;
insert into public.op_list(project_code, project_id, service, group_key, "total_supervisor_as_per_vm", "total_op_as_per_vm", "supervisor_google_sheet", "op_google_sheet", "supervisor_pending_as_per_google_sheet", "op_pending_as_per_google_sheet", "center_with_0_login", "operator_list_status", "remarks", "rm_mapping", "am_mapping", "experience_fresher", "group_created", "mock_date", "mock_time_remarks", "device_distribution", "device_distribution_remarks", "training_date", "training_time_remarks", "csr_consignee_name", "csr_consignee_contact_no", "address_with_pin_code", "pin_code", "ready_for_dispatch", "docket_number", "csr_status", "handover_audit_date", "max_op_list_received", "manpower_details_received_on_time", "replacement_provided", "mock_rating", "manpower_training_done", "unique_op_profiles_center", "device_damages_losses_delays", "over_all_rating", "vendor_email", "ach_email", "age_18", extra, created_at, updated_at)
select public.svc_pcode(se.project_code, se.service), se.project_code, se.service, se.row_key, se.data->>'svm', se.data->>'ovm', coalesce(se.data->>'g0', se.data->>'supervisor_google_sheet'), coalesce(se.data->>'g1', se.data->>'op_google_sheet'), coalesce(se.data->>'g2', se.data->>'supervisor_pending_as_per_google_sheet'), coalesce(se.data->>'g3', se.data->>'op_pending_as_per_google_sheet'), coalesce(se.data->>'g4', se.data->>'center_with_0_login'), coalesce(se.data->>'g5', se.data->>'operator_list_status'), coalesce(se.data->>'g6', se.data->>'remarks'), coalesce(se.data->>'g7', se.data->>'rm_mapping'), coalesce(se.data->>'g8', se.data->>'am_mapping'), coalesce(se.data->>'g9', se.data->>'experience_fresher'), coalesce(se.data->>'g10', se.data->>'group_created'), coalesce(se.data->>'g11', se.data->>'mock_date'), coalesce(se.data->>'g12', se.data->>'mock_time_remarks'), coalesce(se.data->>'g13', se.data->>'device_distribution'), coalesce(se.data->>'g14', se.data->>'device_distribution_remarks'), coalesce(se.data->>'g15', se.data->>'training_date'), coalesce(se.data->>'g16', se.data->>'training_time_remarks'), coalesce(se.data->>'g17', se.data->>'csr_consignee_name'), coalesce(se.data->>'g18', se.data->>'csr_consignee_contact_no'), coalesce(se.data->>'g19', se.data->>'address_with_pin_code'), coalesce(se.data->>'g20', se.data->>'pin_code'), coalesce(se.data->>'g21', se.data->>'ready_for_dispatch'), coalesce(se.data->>'g22', se.data->>'docket_number'), coalesce(se.data->>'g23', se.data->>'csr_status'), coalesce(se.data->>'g24', se.data->>'handover_audit_date'), coalesce(se.data->>'g25', se.data->>'max_op_list_received'), coalesce(se.data->>'g26', se.data->>'manpower_details_received_on_time'), coalesce(se.data->>'g27', se.data->>'replacement_provided'), coalesce(se.data->>'g28', se.data->>'mock_rating'), coalesce(se.data->>'g29', se.data->>'manpower_training_done'), coalesce(se.data->>'g30', se.data->>'unique_op_profiles_center'), coalesce(se.data->>'g31', se.data->>'device_damages_losses_delays'), coalesce(se.data->>'g32', se.data->>'over_all_rating'), coalesce(se.data->>'g33', se.data->>'vendor_email'), coalesce(se.data->>'g34', se.data->>'ach_email'), coalesce(se.data->>'g35', se.data->>'age_18'),
       se.data - array['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'g17', 'g18', 'g19', 'g20', 'g21', 'g22', 'g23', 'g24', 'g25', 'g26', 'g27', 'g28', 'g29', 'g30', 'g31', 'g32', 'g33', 'g34', 'g35', 'svm', 'ovm', 'supervisor_google_sheet', 'op_google_sheet', 'supervisor_pending_as_per_google_sheet', 'op_pending_as_per_google_sheet', 'center_with_0_login', 'operator_list_status', 'remarks', 'rm_mapping', 'am_mapping', 'experience_fresher', 'group_created', 'mock_date', 'mock_time_remarks', 'device_distribution', 'device_distribution_remarks', 'training_date', 'training_time_remarks', 'csr_consignee_name', 'csr_consignee_contact_no', 'address_with_pin_code', 'pin_code', 'ready_for_dispatch', 'docket_number', 'csr_status', 'handover_audit_date', 'max_op_list_received', 'manpower_details_received_on_time', 'replacement_provided', 'mock_rating', 'manpower_training_done', 'unique_op_profiles_center', 'device_damages_losses_delays', 'over_all_rating', 'vendor_email', 'ach_email', 'age_18'], coalesce(se.updated_at, now()), coalesce(se.updated_at, now())
from public.sheet_entries se join public.projects p on p.code = se.project_code
where se.sheet = 'OP List' on conflict do nothing;

-- Cell-level change log for the new tables
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
  if t = any(array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list']) then      -- one column per cell; the keys are not cells
    for k, v in select key, value from jsonb_each(j) loop
      if k = any(skip) or k = any(array['project_code','project_id','service','center_code','exam_date','op_no','group_key','state','city','vendor_code']) then continue; end if;
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
          when 'operator_calling' then coalesce(n->>'service', o->>'service') || ' ' || 'Operator Calling ' || coalesce(n->>'center_code', o->>'center_code') || ' ' || coalesce(n->>'exam_date', o->>'exam_date') || ' OP ' || coalesce(n->>'op_no', o->>'op_no')
          when 'mock_calling' then coalesce(n->>'service', o->>'service') || ' ' || 'Mock Calling ' || coalesce(n->>'center_code', o->>'center_code')
          when 'tv_data_download_calling' then coalesce(n->>'service', o->>'service') || ' ' || 'TV Data Download Calling ' || coalesce(n->>'center_code', o->>'center_code')
          when 'exam_day_calling' then coalesce(n->>'service', o->>'service') || ' ' || 'Exam day Calling ' || coalesce(n->>'center_code', o->>'center_code') || ' ' || coalesce(n->>'exam_date', o->>'exam_date')
          when 'guard_list' then coalesce(n->>'service', o->>'service') || ' ' || 'Guard List ' || coalesce(n->>'group_key', o->>'group_key')
          when 'op_list' then coalesce(n->>'service', o->>'service') || ' ' || 'OP List ' || coalesce(n->>'group_key', o->>'group_key')
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

-- Access: same rules as before (scope by project and center), written once for every table
create or replace function public._pol(t text, sel text, wr text) returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', 'sel_' || t, t); execute format('drop policy if exists %I on public.%I', 'ins_' || t, t);
  execute format('drop policy if exists %I on public.%I', 'upd_' || t, t); execute format('drop policy if exists %I on public.%I', 'del_' || t, t);
  execute format('create policy %I on public.%I for select to authenticated using (%s)', 'sel_' || t, t, sel);
  if wr is not null then
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', 'ins_' || t, t, wr);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', 'upd_' || t, t, wr, wr);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', 'del_' || t, t, wr);
  end if;
end $$;
do $$ declare t text; begin
  foreach t in array array['operator_calling', 'mock_calling', 'tv_data_download_calling', 'exam_day_calling', 'guard_list', 'op_list'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    perform public._pol(t, case when t in ('guard_list','op_list') then 'can_scope_sheet(project_id, group_key)' else 'can_scope_sheet(project_id, center_code)' end,
                           case when t in ('guard_list','op_list') then 'can_scope_sheet(project_id, group_key)' else 'can_scope_sheet(project_id, center_code)' end);
    execute format('drop trigger if exists sheet_pcode on public.%I', t);
    execute format('create trigger sheet_pcode before insert or update on public.%I for each row execute function public.sheet_pcode()', t);
    execute format('drop trigger if exists stamp_who on public.%I', t);
    execute format('create trigger stamp_who before insert or update on public.%I for each row execute function public.stamp_who()', t);
    execute format('drop trigger if exists log_changes on public.%I', t);
    execute format('create trigger log_changes after insert or update or delete on public.%I for each row execute function public.log_changes()', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
