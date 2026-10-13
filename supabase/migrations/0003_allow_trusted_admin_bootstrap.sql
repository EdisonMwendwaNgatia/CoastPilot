-- Permit trusted database operators to provision platform roles while continuing
-- to block any authenticated application user from changing their own role.
create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile identity cannot be changed';
  end if;

  -- SQL Editor runs as the privileged database owner. Requests through the app
  -- run as authenticated and cannot change platform_role.
  if new.platform_role is distinct from old.platform_role
     and current_user not in ('postgres', 'service_role') then
    raise exception 'only a trusted database operator can change platform roles';
  end if;

  return new;
end;
$$;
