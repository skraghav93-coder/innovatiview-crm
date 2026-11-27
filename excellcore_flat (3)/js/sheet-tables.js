/* [03] SHEET TABLES - one database table per calling sheet: which app field goes to which column.
   Generated from the sheet column definitions; 015 added the new Guard List / OP List columns by hand (keep this file and the SQL in step).
   Each calling sheet has its own table; project_code, the service's official Project Code, leads every primary key.
   cols maps a field used in the app to its column; anything else is kept in the extra column. */
const SHEET_TABLES = {
 "Operator Calling": {
  "table": "operator_calling",
  "kind": "op",
  "pk": [
   "project_code",
   "service",
   "center_code",
   "exam_date",
   "op_no"
  ],
  "cols": {
   "dist": "distance",
   "aics": "ai_calling_status",
   "rec": "recording_url",
   "sqst": "seqrview_status",
   "sqon": "seqrview_onboarded_on",
   "des": "biometric_designation",
   "exp": "experience",
   "name": "biometric_operator_name",
   "num": "biometric_operator_number",
   "bcs": "biometric_calling_status",
   "app": "biometric_has_smartphone_app",
   "mot": "mode_of_transport",
   "rt": "reaching_time_on_exam",
   "rem": "remarks",
   "aad": "aadhar_card_no",
   "aadv": "aadhar_card_no_valid_not_valid",
   "selfie": "selfie_received",
   "aadp": "aadhar_photo",
   "gen": "gender",
   "age": "age",
   "fn": "father_name",
   "dob": "date_of_birth",
   "addr": "address",
   "rate": "manpower_rate",
   "sqa": "seqrview_address",
   "sqn": "seqview_number",
   "sqo": "seqrview_onboard",
   "sqd": "seqrview_dob",
   "sqname": "seqrview_name",
   "newob": "new_onboard",
   "tvw": "training_video_watched",
   "tvc": "video_watched_count",
   "tvs": "video_watched_status",
   "fin": "final_status",
   "onb": "onboarded",
   "nonb": "new_on_boarded",
   "aic": "ai_calling"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "OP #",
    "op"
   ],
   [
    "Client Code",
    "client_code"
   ],
   [
    "Center Code",
    "center_code_calc"
   ],
   [
    "Center Name",
    "center_name"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "ZM Name",
    "zm_name"
   ],
   [
    "ACH Name & No",
    "ach_name_no"
   ],
   [
    "Total Shift",
    "total_shift"
   ],
   [
    "Exam Date",
    "exam_date_calc"
   ],
   [
    "Key",
    "key"
   ]
  ]
 },
 "Mock Calling": {
  "table": "mock_calling",
  "kind": "ctr",
  "pk": [
   "project_code",
   "service",
   "center_code"
  ],
  "cols": {
   "mat": "material_status",
   "rms": "re_mock_status",
   "mdc": "mock_date_by_client",
   "mtc": "mock_time_by_client",
   "mpname": "mock_person_name",
   "mpn": "mock_person_number",
   "mcc": "mock_calling_confirmation",
   "rtm": "reaching_time_on_mock",
   "rem": "remarks",
   "fv": "fri_vendor",
   "ovs": "ops_view_selfie_upload",
   "ovm": "ops_view_mock_report",
   "fm": "final_mock",
   "ma": "mock_attendance",
   "mrp": "mock_report",
   "bcl": "biometric_counter_location_identify",
   "lpr": "location_photo_received",
   "wifi": "wifi_availability_status",
   "ci": "center_issues",
   "cir": "remarks_for_center_issues",
   "mcs": "mock_confirmed_from_csup_observer",
   "mcr": "mock_confirmation_remarks",
   "rem2": "remarks_if_any",
   "ms1": "sent_ms1",
   "mr1": "received_mr1",
   "ms2": "sent_ms2",
   "mr2": "received_mr2",
   "ms3": "sent_ms3",
   "mr3": "received_mr3",
   "ms4": "sent_ms4",
   "mr4": "received_mr4",
   "ms5": "sent_ms5",
   "mr5": "received_mr5",
   "ms6": "sent_ms6",
   "mr6": "received_mr6",
   "ms7": "sent_ms7",
   "mr7": "received_mr7",
   "ms8": "sent_ms8",
   "mr8": "received_mr8",
   "ms9": "sent_ms9",
   "mr9": "received_mr9",
   "ms10": "sent_ms10",
   "mr10": "received_mr10",
   "ms11": "sent_ms11",
   "mr11": "received_mr11",
   "ms12": "sent_ms12",
   "mr12": "received_mr12",
   "frm": "fri_rm",
   "fms": "fri_material_status",
   "csv": "cso_vendor",
   "csrm": "cso_rm",
   "dist": "distance",
   "faq": "faq_count",
   "rmk": "remock_status"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "Client Code",
    "client_code"
   ],
   [
    "Center Code",
    "center_code_calc"
   ],
   [
    "Center Name",
    "center_name"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "VM Name",
    "vm_name"
   ],
   [
    "ACH Name & No",
    "ach_name_no"
   ],
   [
    "CSUP Name / Number",
    "csup_name_number"
   ],
   [
    "DR Name & No",
    "dr_name_no"
   ],
   [
    "Total Opr",
    "total_opr"
   ],
   [
    "VC NAME",
    "vc_name"
   ],
   [
    "Supervisor Name / No",
    "supervisor_name_no"
   ],
   [
    "Exam Date",
    "exam_date_calc"
   ],
   [
    "Exam Dates",
    "exam_dates"
   ]
  ]
 },
 "TV Data Download Calling": {
  "table": "tv_data_download_calling",
  "kind": "ctr",
  "pk": [
   "project_code",
   "service",
   "center_code"
  ],
  "cols": {
   "dvs": "device_distribution_status_validation_by_sup",
   "ddr": "ddd_remarks_time_shared_by_op",
   "dpn": "device_person_name_no",
   "idr": "id_received",
   "jkr": "jacket_received",
   "hlr": "hollogram_received",
   "stk": "startek_device",
   "alr": "authority_letter_received",
   "dev": "device",
   "dd": "devices_data_download",
   "trd": "devices_transaction_done",
   "ub": "unique_bio_device",
   "ua": "unique_aadhar_transaction",
   "tvr": "training_video_received",
   "boc": "bio_operator_count",
   "tph": "training_photos_received"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "Client Code",
    "client_code"
   ],
   [
    "Center Code",
    "center_code_calc"
   ],
   [
    "Center Name",
    "center_name"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "VM Name",
    "vm_name"
   ],
   [
    "ACH Name & No",
    "ach_name_no"
   ],
   [
    "CSUP Name / Number",
    "csup_name_number"
   ],
   [
    "Total Operator",
    "total_operator"
   ],
   [
    "Supervisor Name & No",
    "supervisor_name_no"
   ],
   [
    "Exam Date",
    "exam_date_calc"
   ],
   [
    "Exam Dates",
    "exam_dates"
   ],
   [
    "# Pending Data Download Devices",
    "pending_data_download_devices"
   ],
   [
    "DD Less Than OP",
    "dd_less_than_op"
   ],
   [
    "# Devices Transaction Pending",
    "devices_transaction_pending"
   ],
   [
    "Pending Transation - Less then OP",
    "pending_transation_less_then_op"
   ],
   [
    "UniLess than OP Unique Device",
    "uniless_than_op_unique_device"
   ]
  ]
 },
 "Exam day Calling": {
  "table": "exam_day_calling",
  "kind": "ex",
  "pk": [
   "project_code",
   "service",
   "center_code",
   "exam_date"
  ],
  "cols": {
   "ae1": "ai_eta_ae1",
   "eta": "eta",
   "mpr": "manpower_reached",
   "ae2": "ai_eta_ae2",
   "apc": "ai_principal_confirmation",
   "mrf": "m_reached_fri",
   "frf": "f_reached_fri",
   "cb": "crowd_baggage",
   "csor": "cso_reached",
   "bor": "bio_op_reached_by_cso",
   "stk": "startek",
   "lan": "lan_connector",
   "cctv": "cctv_cam_count",
   "csr1": "csr_s1",
   "csrr1": "csr_remarks_s1",
   "csr2": "csr_s2",
   "csrr2": "csr_remarks_s2",
   "csr3": "csr_s3",
   "csrr3": "csr_remarks_s3",
   "csr4": "csr_s4",
   "csrr4": "csr_remarks_s4",
   "csr5": "csr_s5",
   "csrr5": "csr_remarks_s5",
   "csr6": "csr_s6",
   "csrr6": "csr_remarks_s6",
   "csr7": "csr_s7",
   "csrr7": "csr_remarks_s7",
   "csr8": "csr_s8",
   "csrr8": "csr_remarks_s8",
   "csrr": "csr_remarks",
   "cih": "center_issues_highlighted_during_exam",
   "at1": "actual_time_manual_time_1st",
   "at2": "actual_time_manual_time_last",
   "exs": "exit_selfie",
   "exc": "exam_code",
   "usr": "username",
   "pwd": "password",
   "aeu": "ai_eta_url",
   "ts1": "time_stamp_1",
   "ts2": "time_stamp_2",
   "aes": "ai_eta_status",
   "opp": "op_profile",
   "ost": "opsview_status_total_task",
   "osd": "opsview_status_task_done"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "Client Code",
    "client_code"
   ],
   [
    "Center Code",
    "center_code_calc"
   ],
   [
    "Center Name",
    "center_name"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "VM Name",
    "vm_name"
   ],
   [
    "ACH Name & No",
    "ach_name_no"
   ],
   [
    "CSUP Name / Number",
    "csup_name_number"
   ],
   [
    "DR Name & No",
    "dr_name_no"
   ],
   [
    "JCO RM",
    "jco_rm"
   ],
   [
    "JCO Name & No",
    "jco_name_no"
   ],
   [
    "VC Name",
    "vc_name"
   ],
   [
    "FRI RM",
    "fri_rm"
   ],
   [
    "FRI Name & NO",
    "fri_name_no"
   ],
   [
    "Fri Vendor",
    "fri_vendor"
   ],
   [
    "Bio RM",
    "bio_rm"
   ],
   [
    "Bio Name & No",
    "bio_name_no"
   ],
   [
    "Supervisor Name & Number",
    "supervisor_name_number"
   ],
   [
    "Opr Name & No 1",
    "opr_name_no_1"
   ],
   [
    "Exam Date",
    "exam_date_calc"
   ],
   [
    "Shift",
    "shift"
   ],
   [
    "Total Shift",
    "total_shift"
   ],
   [
    "Total Operator",
    "total_operator"
   ],
   [
    "Bio OP Difference (Pending/Partial/Completed)",
    "bio_op_difference_pending_partial_completed"
   ],
   [
    "TAB",
    "tab"
   ],
   [
    "FPS",
    "fps"
   ],
   [
    "IRIS",
    "iris"
   ],
   [
    "OTG",
    "otg"
   ],
   [
    "Hologram",
    "hologram"
   ],
   [
    "ID CARD",
    "id_card"
   ],
   [
    "Supervisor no.",
    "supervisor_no"
   ]
  ]
 },
 "Guard List": {
  "table": "guard_list",
  "kind": "grp",
  "pk": [
   "project_code",
   "service",
   "group_key"
  ],
  "cols": {
   "hvm": "total_h_guard_as_per_vm",
   "gvm": "total_guard_as_per_vm",
   "h_guards_google_sheet": "h_guards_google_sheet",
   "guards_google_sheet": "guards_google_sheet",
   "h_guards_pending_as_per_google_sheet": "h_guards_pending_as_per_google_sheet",
   "guards_pending_as_per_google_sheet": "guards_pending_as_per_google_sheet",
   "list_status": "list_status",
   "vendor_rating": "vendor_rating",
   "uniform_status": "uniform_status",
   "mail_status": "mail_status",
   "am_mapping": "am_mapping",
   "experience_fresher": "experience_fresher",
   "mock_issues_with_vendor": "mock_issues_with_vendor",
   "mock_date": "mock_date",
   "remarks": "remarks",
   "gp_remarks": "gp_remarks",
   "csr_consignee_name": "csr_consignee_name",
   "csr_consignee_contact_no": "csr_consignee_contact_no",
   "address_with_pin_code": "address_with_pin_code",
   "pin_code": "pin_code",
   "ready_for_dispatch": "ready_for_dispatch",
   "docate_number": "docate_number",
   "csr_status": "csr_status",
   "handover_audit_date": "handover_audit_date",
   "uniform_remarks": "uniform_remarks",
   "training_video_recieved": "training_video_recieved",
   "training_video_date": "training_video_date",
   "head_guard_count": "head_guard_count",
   "frisking_done_sticker_delivery": "frisking_done_sticker_delivery",
   "frisking_done_sticker_delivery_status_rm": "frisking_done_sticker_delivery_status_rm",
   "distribution_status": "distribution_status",
   "other_remarks_distribution": "other_remarks_distribution",
   "group_created": "group_created",
   "deduction_shared": "deduction_shared",
   "deduction_remarks_others": "deduction_remarks_others",
   "final_deduction_remarks": "final_deduction_remarks",
   "final_deduction_remarks_others": "final_deduction_remarks_others",
   "max_guard_list": "max_guard_list",
   "pm_remarks": "pm_remarks",
   "age_less_than_18": "age_less_than_18",
   "vendor_email": "vendor_email",
   "ach_email": "ach_email",
   "super_viser_no_saved": "super_viser_no_saved",
   "city_head_no_saved": "city_head_no_saved",
   "intraactive_video": "intraactive_video",
   "candidate_login": "candidate_login",
   "staff_login": "staff_login",
   "pm_selected": "pm_selected",
   "mock_time_remarks": "mock_time_remarks",
   "training_date": "training_date",
   "training_time_remarks": "training_time_remarks",
   "manpower_details_received_on_time": "manpower_details_received_on_time",
   "replacement_provided": "replacement_provided",
   "mock_rating": "mock_rating",
   "manpower_training_done": "manpower_training_done",
   "unique_op_profiles_center": "unique_op_profiles_center",
   "device_damages_losses_delays": "device_damages_losses_delays",
   "over_all_rating": "over_all_rating"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "Vendor Number",
    "vendor_number"
   ],
   [
    "VM Name",
    "vm_name"
   ],
   [
    "City Head Name",
    "city_head_name"
   ],
   [
    "City head Number",
    "city_head_number"
   ],
   [
    "Total Center",
    "total_center"
   ],
   [
    "Total Manpower",
    "total_manpower"
   ],
   [
    "H G Pending",
    "h_g_pending"
   ],
   [
    "All G Pending",
    "all_g_pending"
   ],
   [
    "Total Head Guards Recieved",
    "total_head_guards_recieved"
   ],
   [
    "Total Guards Recieved",
    "total_guards_recieved"
   ],
   [
    "Pending Head Guards",
    "pending_head_guards"
   ],
   [
    "Pending Guards",
    "pending_guards"
   ],
   [
    "Pending Guards (%)",
    "pending_guards_calc"
   ],
   [
    "H Guard Confirmed",
    "h_guard_confirmed"
   ],
   [
    "Going",
    "going"
   ],
   [
    "Reject",
    "reject"
   ],
   [
    "Not Connect",
    "not_connect"
   ],
   [
    "Calling Pending",
    "calling_pending"
   ],
   [
    "SeqrView Onboard",
    "seqrview_onboard"
   ],
   [
    "PM Name",
    "pm_name"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "AM Number",
    "am_number"
   ],
   [
    "AM Email",
    "am_email"
   ],
   [
    "Mock Done",
    "mock_done"
   ],
   [
    "Pending Mock",
    "pending_mock"
   ],
   [
    "Pending Mock %",
    "pending_mock_calc"
   ],
   [
    "SeqrView Onboard %",
    "seqrview_onboard_calc"
   ],
   [
    "SeqrView Onboard Day1",
    "seqrview_onboard_day1"
   ],
   [
    "SeqrView Onboard Day2",
    "seqrview_onboard_day2"
   ],
   [
    "Vendor Email",
    "vendor_email_lookup"
   ]
  ]
 },
 "OP List": {
  "table": "op_list",
  "kind": "grp",
  "pk": [
   "project_code",
   "service",
   "group_key"
  ],
  "cols": {
   "svm": "total_supervisor_as_per_vm",
   "ovm": "total_op_as_per_vm",
   "supervisor_google_sheet": "supervisor_google_sheet",
   "op_google_sheet": "op_google_sheet",
   "supervisor_pending_as_per_google_sheet": "supervisor_pending_as_per_google_sheet",
   "op_pending_as_per_google_sheet": "op_pending_as_per_google_sheet",
   "center_with_0_login": "center_with_0_login",
   "operator_list_status": "operator_list_status",
   "remarks": "remarks",
   "rm_mapping": "rm_mapping",
   "am_mapping": "am_mapping",
   "experience_fresher": "experience_fresher",
   "group_created": "group_created",
   "mock_date": "mock_date",
   "mock_time_remarks": "mock_time_remarks",
   "device_distribution": "device_distribution",
   "device_distribution_remarks": "device_distribution_remarks",
   "training_date": "training_date",
   "training_time_remarks": "training_time_remarks",
   "csr_consignee_name": "csr_consignee_name",
   "csr_consignee_contact_no": "csr_consignee_contact_no",
   "address_with_pin_code": "address_with_pin_code",
   "pin_code": "pin_code",
   "ready_for_dispatch": "ready_for_dispatch",
   "docket_number": "docket_number",
   "csr_status": "csr_status",
   "handover_audit_date": "handover_audit_date",
   "max_op_list_received": "max_op_list_received",
   "manpower_details_received_on_time": "manpower_details_received_on_time",
   "replacement_provided": "replacement_provided",
   "mock_rating": "mock_rating",
   "manpower_training_done": "manpower_training_done",
   "unique_op_profiles_center": "unique_op_profiles_center",
   "device_damages_losses_delays": "device_damages_losses_delays",
   "over_all_rating": "over_all_rating",
   "vendor_email": "vendor_email",
   "ach_email": "ach_email",
   "age_18": "age_18",
   "candidate_login": "candidate_login",
   "staff_login": "staff_login",
   "pm_selected": "pm_selected"
  },
  "calc": [
   [
    "Project Code",
    "project_code_calc"
   ],
   [
    "State",
    "state_calc"
   ],
   [
    "City",
    "city_calc"
   ],
   [
    "Vendor Name",
    "vendor_name"
   ],
   [
    "Vendor Number",
    "vendor_number"
   ],
   [
    "VC Name",
    "vc_name"
   ],
   [
    "VM Name",
    "vm_name"
   ],
   [
    "City head Name",
    "city_head_name"
   ],
   [
    "City head Number",
    "city_head_number"
   ],
   [
    "Days Total Center",
    "days_total_center"
   ],
   [
    "Max All Days",
    "max_all_days"
   ],
   [
    "SUP Pending As per VM",
    "sup_pending_as_per_vm"
   ],
   [
    "OP Pending As per VM",
    "op_pending_as_per_vm"
   ],
   [
    "SeqrView Onboard",
    "seqrview_onboard"
   ],
   [
    "Total Supervisor Received",
    "total_supervisor_received"
   ],
   [
    "Total OP Received",
    "total_op_received"
   ],
   [
    "Pending Supervisor",
    "pending_supervisor"
   ],
   [
    "Pending OP",
    "pending_op"
   ],
   [
    "Supervisor Confirmed",
    "supervisor_confirmed"
   ],
   [
    "Going",
    "going"
   ],
   [
    "Reject",
    "reject"
   ],
   [
    "Not Connect",
    "not_connect"
   ],
   [
    "Calling/ Mnp Pending",
    "calling_mnp_pending"
   ],
   [
    "Pending %",
    "pending"
   ],
   [
    "# Device",
    "device"
   ],
   [
    "# Devices Data Download",
    "devices_data_download"
   ],
   [
    "# Pending Download",
    "pending_download"
   ],
   [
    "# Devices Transaction Done",
    "devices_transaction_done"
   ],
   [
    "# Pending Transaction",
    "pending_transaction"
   ],
   [
    "Less Than OP",
    "less_than_op"
   ],
   [
    "Total Calling Done",
    "total_calling_done"
   ],
   [
    "Total Calling Pending",
    "total_calling_pending"
   ],
   [
    "PM Name",
    "pm_name"
   ],
   [
    "RM Name",
    "rm_name"
   ],
   [
    "AM ID",
    "am_id"
   ],
   [
    "AM Name",
    "am_name"
   ],
   [
    "AM Number",
    "am_number"
   ],
   [
    "AM Email",
    "am_email"
   ],
   [
    "Mock Done",
    "mock_done"
   ],
   [
    "Pending Mock",
    "pending_mock"
   ],
   [
    "Pending Mock %",
    "pending_mock_calc"
   ],
   [
    "SeqrView Onboard %",
    "seqrview_onboard_calc"
   ],
   [
    "SeqrView Onboard Day1",
    "seqrview_onboard_day1"
   ],
   [
    "SeqrView Onboard Day2",
    "seqrview_onboard_day2"
   ],
   [
    "Vendor Email",
    "vendor_email_lookup"
   ]
  ]
 }
};
const SHEET_T = Object.values(SHEET_TABLES).map(s => s.table);
const SHEET_VENDOR_T = ['guard_list', 'op_list'];   // vendor sheets
const SHEET_OPS_T = SHEET_T.filter(t => !SHEET_VENDOR_T.includes(t));   // operations sheets
const ADMIN_BULK = {"Operator Calling": ["aics", "rec", "aic", "tvw", "tvc", "tvs"], "Mock Calling": ["ovs", "ovm"], "TV Data Download Calling": ["tvr"], "Exam day Calling": ["ae1", "ae2", "apc", "aeu", "aes", "ost", "osd"]};   // Opsview / AI / Training video columns: bulk upload by Admin only

/* ---- [03.1] how the app saves a sheet row into its table, and reads it back ---- */
const DSNAP = {};   // table -> Map(key -> JSON of the calculated columns last seen in the database)
const dKey = (def, r) => def.pk.map(c => r[c]).join('\u0001');
const calcJson = (def, r) => JSON.stringify([...def.calc.map(x => r[x[1]] ?? null), r.extra_calc && Object.keys(r.extra_calc).length ? r.extra_calc : {}]);
Object.values(SHEET_TABLES).forEach(d => { d.calcMap = Object.fromEntries(d.calc); });
const sheetDayIso = (p, d) => dayIso(p, d) || ('1900-01-' + String(d + 1).padStart(2, '0'));   // projects without dates keep a placeholder date
const sheetDayIdx = (p, iso) => { const i = projDates(p).indexOf(iso); if (i >= 0) return i; const m = /^1900-01-(\d\d)$/.exec(String(iso)); return m ? +m[1] - 1 : -1; };
const sheetKeyCols = {
  op:  (p, rk) => { const a = String(rk).split('|'); return a.length === 3 && /^\d+$/.test(a[1]) && /^\d+$/.test(a[2]) ? { center_code: a[0], exam_date: sheetDayIso(p, +a[1]), op_no: +a[2] } : null; },
  ex:  (p, rk) => { const a = String(rk).split('|'); return a.length === 2 && /^\d+$/.test(a[1]) ? { center_code: a[0], exam_date: sheetDayIso(p, +a[1]) } : null; },
  ctr: (p, rk) => ({ center_code: String(rk) }),
  grp: (p, rk) => ({ group_key: String(rk) }),
};
const sheetRowKey = {
  op:  (p, r) => { const d = sheetDayIdx(p, r.exam_date); return d < 0 ? null : r.center_code + '|' + d + '|' + r.op_no; },
  ex:  (p, r) => { const d = sheetDayIdx(p, r.exam_date); return d < 0 ? null : r.center_code + '|' + d; },
  ctr: (p, r) => r.center_code,
  grp: (p, r) => r.group_key,
};
function sheetSpecs(ctx) {
  return Object.entries(SHEET_TABLES).map(([sheet, def]) => ({
    t: def.table, pk: def.pk, ord: def.pk, cascade: true,   // rows of a deleted project go with it in the database (see supabase-sync.js)
    to: () => {
      const out = [], ps = ctx.pset();
      Object.keys(db.opc || {}).forEach(k => {
        const s = ctx.splitK(k); if (s.sheet !== sheet) return;
        const p = (db.projects || []).find(x => x.code === s.project_code); if (!p || !ps.has(p.code)) return;
        const st = db.opc[k]; if (!st || typeof st !== 'object') return;
        Object.keys(st).forEach(rk => {
          const d = st[rk]; if (!d || typeof d !== 'object') return;
          const kc = sheetKeyCols[def.kind](p, rk); if (!kc) return;
          const row = { project_code: pcodeOf(p, s.service) || p.code, project_id: p.code, service: s.service, ...kc }, extra = {}; let any = false;
          Object.keys(d).forEach(key => {
            const v = d[key]; if (v === undefined || v === null || v === '') return;
            const col = def.cols[key];
            if (col && (typeof v === 'string' || typeof v === 'number')) { row[col] = String(v); any = true; } else { extra[key] = v; any = true; }
          });
          if (!any) return;
          row.extra = extra; out.push(row);
        });
      });
      return out;
    },
    from: rows => {
      db.opc = db.opc || {}; DSNAP[def.table] = new Map(); const back = {}; Object.keys(def.cols).forEach(k => { back[def.cols[k]] = k; });
      const pm = new Map((db.projects || []).map(p => [p.code, p]));
      rows.forEach(r => {
        DSNAP[def.table].set(dKey(def, r), calcJson(def, r));
        const p = pm.get(r.project_id); if (!p) return;
        const rk = sheetRowKey[def.kind](p, r); if (rk === null || rk === undefined) return;   // a date that is no longer part of the project: kept in the database, not shown
        const data = {}; Object.keys(back).forEach(c => { if (r[c] !== null && r[c] !== undefined) data[back[c]] = r[c]; });
        Object.assign(data, r.extra || {});
        if (!Object.keys(data).length) return;   // a row that only holds calculated columns has nothing typed in
        const k = r.project_id + '|' + r.service + '|' + sheet; (db.opc[k] = db.opc[k] || {})[rk] = data;
      });
    },
  }));
}
