-- ExcellCore 014: external logins need a live assignment, and an email / mobile number belongs to one person only.
--   * login_allowed(): people who sign in with a non-Innovatiview address (the people-list whitelist) may log in only while they are
--     assigned to at least one Active or Upcoming project (as Project Manager) or center (as RM / AM). Innovatiview addresses,
--     Super Admin, Admin and Vendor Manager are always allowed. The app calls this right after sign-in.
--   * employees: one email and one mobile number per person, across all roles (PM, RM, AM, Sr AM).
-- If the unique rule cannot be applied because duplicates already exist, this file stops and tells you where; fix them and run it again.
-- Safe to run more than once.
create or replace function public.login_allowed() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when lower(split_part(coalesce(p.email, ''), '@', 2)) in ('innovatiview.in', 'innovatiview.com') then true
      when p.role in ('Super Admin', 'Admin', 'Vendor Manager') then true
      else public.my_employee_id() is not null and (
        exists (select 1 from projects j where j.status in ('Active', 'Upcoming') and public.my_employee_id() = any (j.pm_ids))
        or exists (select 1 from center_assignments a join projects j on j.code = a.project_code
                   where j.status in ('Active', 'Upcoming') and public.my_employee_id() in (a.rm_id::text, a.am_id::text)))
    end
    from profiles p where p.id = auth.uid() and p.active), false) $$;

do $$ declare d int; begin
  select count(*) into d from (select lower(trim(email)) from employees where email is not null and trim(email) <> '' group by 1 having count(*) > 1) x;
  if d > 0 then raise exception '% email address(es) are used by more than one employee. See them with: select lower(trim(email)) as email, string_agg(id || '' '' || name || '' ('' || role || '')'', '' | '') from employees where coalesce(trim(email), '''') <> '''' group by 1 having count(*) > 1;  Fix them, then run this file again.', d; end if;
  select count(*) into d from (select right(regexp_replace(contact, '\D', '', 'g'), 10) from employees where length(regexp_replace(coalesce(contact, ''), '\D', '', 'g')) >= 10 group by 1 having count(*) > 1) x;
  if d > 0 then raise exception '% mobile number(s) are used by more than one employee. See them with: select right(regexp_replace(contact, ''\D'', '''', ''g''), 10) as mobile, string_agg(id || '' '' || name || '' ('' || role || '')'', '' | '') from employees where length(regexp_replace(coalesce(contact, ''''), ''\D'', '''', ''g'')) >= 10 group by 1 having count(*) > 1;  Fix them, then run this file again.', d; end if;
end $$;
create unique index if not exists employees_email_uq on employees (lower(trim(email))) where email is not null and trim(email) <> '';
create unique index if not exists employees_mobile_uq on employees ((right(regexp_replace(contact, '\D', '', 'g'), 10))) where length(regexp_replace(coalesce(contact, ''), '\D', '', 'g')) >= 10;
