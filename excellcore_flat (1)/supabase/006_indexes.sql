-- ExcellCore 006: speeds up the RM / AM / Project Manager scope checks. Safe to run more than once.
create index if not exists ca_project_center_idx on center_assignments(project_code, center_code);
create index if not exists ca_rm_idx on center_assignments(rm_id);
create index if not exists ca_am_idx on center_assignments(am_id);
create index if not exists centers_project_center_idx on centers(project_code, center_code);
create index if not exists sheet_entries_project_idx on sheet_entries(project_code);
