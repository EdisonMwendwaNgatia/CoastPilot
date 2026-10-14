create table public.user_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references public.profiles(id) on delete set null,
  target_name text not null default 'CoastPilot member',
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null check (action_type in ('warning', 'ban', 'unban', 'account_deleted')),
  reason text not null check (length(btrim(reason)) between 5 and 1000),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index user_moderation_actions_target_created
  on public.user_moderation_actions(target_user_id, created_at desc);

alter table public.user_moderation_actions enable row level security;
grant select, insert on public.user_moderation_actions to authenticated;

create policy "users and admins can read moderation history"
  on public.user_moderation_actions for select
  using (target_user_id = (select auth.uid()) or private.is_admin());

create policy "admins can record moderation actions"
  on public.user_moderation_actions for insert
  with check (actor_id = (select auth.uid()) and private.is_admin());

create or replace function private.notify_user_of_warning() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action_type = 'warning' and new.target_user_id is not null then
    insert into public.notifications(user_id, notification_type, title, message, link)
    values (new.target_user_id, 'user_warning', 'A message from CoastPilot', new.reason, '/dashboard');
  end if;
  return new;
end;
$$;
revoke all on function private.notify_user_of_warning() from public, anon, authenticated;
create trigger notify_user_of_warning
  after insert on public.user_moderation_actions
  for each row execute function private.notify_user_of_warning();

-- New-user alerts open the new member's admin profile panel directly.
create or replace function private.notify_admin_new_profile() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.platform_role = 'youth' then
    perform private.notify_platform_admins(
      'new_user', 'New member joined',
      'A new CoastPilot account has been created.',
      '/admin?tab=users&userId=' || new.id::text, new.id
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_admin_new_profile() from public, anon, authenticated;
