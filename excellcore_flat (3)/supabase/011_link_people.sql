-- ExcellCore 011: people listed as Project Manager, RM or AM get that access when they sign in.
--   * The login email is matched to employees.email (the PM / RM / AM lists uploaded in Master data).
--   * Role is set from the employee's role: Project Manager -> Project Manager, Regional Manager -> RM, Area Manager / Sr AM -> AM.
--   * Works when the person signs in after being added, and also when they are added after their first sign-in.
--   * Super Admin, Admin and Vendor Manager logins are never changed by this.
-- Safe to run more than once.
create or replace function public.role_of_employee(r text) returns text language sql immutable as $$
  select case
    when lower(coalesce(r, '')) like '%project manager%' then 'Project Manager'
    when lower(coalesce(r, '')) like '%regional manager%' or lower(trim(coalesce(r, ''))) = 'rm' then 'RM'
    when lower(coalesce(r, '')) like '%area manager%' or lower(coalesce(r, '')) like '%sr am%' or lower(trim(coalesce(r, ''))) = 'am' then 'AM'
  end $$;

create or replace function public.link_profiles(only_email text default null) returns void language sql security definer set search_path = public as $$
  update profiles pr set role = x.r, employee_id = x.id
  from (select distinct on (lower(e.email)) lower(e.email) as em, e.id::text as id, public.role_of_employee(e.role) as r
        from employees e
        where e.email is not null and trim(e.email) <> '' and coalesce(e.status, 'Active') = 'Active' and public.role_of_employee(e.role) is not null
        order by lower(e.email), case public.role_of_employee(e.role) when 'Project Manager' then 1 when 'RM' then 2 else 3 end, e.id::text) x
  where lower(pr.email) = x.em and pr.role in ('AM', 'RM', 'Project Manager')
    and (only_email is null or lower(pr.email) = lower(only_email))
    and (pr.role is distinct from x.r or pr.employee_id is distinct from x.id) $$;

create or replace function public.link_on_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.link_profiles(new.email); return null; end $$;
drop trigger if exists link_on_profile on profiles;
create trigger link_on_profile after insert on profiles for each row execute function public.link_on_profile();

create or replace function public.link_on_employee() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.email is not null then perform public.link_profiles(new.email); end if; return null; end $$;
drop trigger if exists link_on_employee on employees;
create trigger link_on_employee after insert or update of email, role, status on employees for each row execute function public.link_on_employee();

select public.link_profiles();   -- people who have already signed in
