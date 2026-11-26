-- ExcellCore 008: allow Google sign-in from both @innovatiview.in and @innovatiview.com
create or replace function public.only_innovatiview() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email, '@', 2)) not in ('innovatiview.in', 'innovatiview.com') then
    raise exception 'Only Innovatiview accounts are allowed';
  end if;
  return new;
end $$;
drop trigger if exists only_innovatiview on auth.users;
create trigger only_innovatiview before insert on auth.users for each row execute function public.only_innovatiview();
