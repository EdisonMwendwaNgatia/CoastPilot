-- Notify every platform administrator when meaningful intake events occur.
-- Trigger-owned writes keep clients from forging admin notifications.
create or replace function private.notify_platform_admins(
  event_type text,
  event_title text,
  event_message text,
  event_link text default '/admin?tab=notifications',
  excluded_user uuid default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications(user_id, notification_type, title, message, link)
  select p.id, event_type, event_title, event_message, event_link
  from public.profiles p
  where p.platform_role = 'admin'
    and (excluded_user is null or p.id <> excluded_user);
end;
$$;
revoke all on function private.notify_platform_admins(text, text, text, text, uuid) from public, anon, authenticated;

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
      '/admin?tab=notifications', new.id
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_admin_new_profile() from public, anon, authenticated;
create trigger admin_new_profile_notification after insert on public.profiles
for each row execute function private.notify_admin_new_profile();

create or replace function private.notify_admin_problem_submission() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted' then
    perform private.notify_platform_admins(
      'problem_submission', 'New problem submitted',
      '“' || new.title || '” is waiting for review.',
      '/admin?tab=problems'
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_admin_problem_submission() from public, anon, authenticated;
create trigger admin_problem_submission_notification after insert on public.problems
for each row execute function private.notify_admin_problem_submission();

create or replace function private.notify_admin_challenge_submission() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'draft' then
    perform private.notify_platform_admins(
      'challenge_submission', 'New challenge submitted',
      '“' || new.title || '” has been submitted as a draft for review.',
      '/admin?tab=challenges', new.created_by
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_admin_challenge_submission() from public, anon, authenticated;
create trigger admin_challenge_submission_notification after insert on public.challenges
for each row execute function private.notify_admin_challenge_submission();

create or replace function private.notify_admin_challenge_application() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare challenge_title text;
begin
  select c.title into challenge_title from public.challenges c where c.id = new.challenge_id;
  perform private.notify_platform_admins(
    'challenge_application', 'New challenge application',
    'A youth innovator applied to “' || coalesce(challenge_title, 'a challenge') || '”.',
    '/admin?tab=challenges'
  );
  return new;
end;
$$;
revoke all on function private.notify_admin_challenge_application() from public, anon, authenticated;
create trigger admin_challenge_application_notification after insert on public.challenge_applications
for each row execute function private.notify_admin_challenge_application();
