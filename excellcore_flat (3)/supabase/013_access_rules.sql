-- ExcellCore 013: who may sign in, and who may change CSUP.
--   * Sign-in: an @innovatiview.in / @innovatiview.com email, OR an email that is in the people list (employees.email, Active).
--     The role comes from the people list (Project Manager / Regional Manager / Area Manager, see 011) or is set by a Super Admin.
--   * CSUP Name / Number: only Super Admin and Admin can change it. For anyone else the saved value stays.
-- Safe to run more than once.
create or replace function public.only_innovatiview() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email, '@', 2)) in ('innovatiview.in', 'innovatiview.com') then return new; end if;
  if exists (select 1 from employees e where lower(trim(e.email)) = lower(trim(new.email)) and coalesce(e.status, 'Active') <> 'Inactive') then return new; end if;
  raise exception 'This email is not allowed. Use an Innovatiview account or ask an Admin to add your email to the people list.';
end $$;
drop trigger if exists only_innovatiview on auth.users;
create trigger only_innovatiview before insert on auth.users for each row execute function public.only_innovatiview();

alter table center_assignments add column if not exists csup text;
create or replace function public.csup_admin_only() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(app_role(), '') in ('Super Admin', 'Admin') then return new; end if;   -- admins, and the database owner running a script
  if tg_op = 'INSERT' then new.csup := null; elsif new.csup is distinct from old.csup then new.csup := old.csup; end if;
  return new;
end $$;
drop trigger if exists csup_admin_only on center_assignments;
create trigger csup_admin_only before insert or update on center_assignments for each row execute function public.csup_admin_only();
