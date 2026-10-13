-- Trusted database notifications for moderation and participation workflow events.
-- Triggers execute with the migration owner; clients cannot invoke these functions.
create function private.notify_problem_review_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and new.status in ('needs_changes', 'approved', 'rejected')
     and new.reviewed_by = (select auth.uid())
     and private.is_admin() then
    insert into public.notifications(user_id, notification_type, title, message, link)
    values (
      new.reporter_id,
      'problem_review',
      'Your community problem was reviewed',
      case new.status
        when 'needs_changes' then 'An administrator requested changes to your submission. Check the review note.'
        when 'approved' then 'Your community problem was approved for challenge development.'
        else 'An administrator reviewed your community problem. Check the review note.'
      end,
      '/dashboard'
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_problem_review_decision() from public, anon, authenticated;
create trigger problem_review_notification after update of status on public.problems
for each row execute function private.notify_problem_review_decision();

create function private.notify_challenge_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare reporter uuid;
begin
  if new.status = 'published' and old.status is distinct from new.status
     and new.problem_id is not null and private.is_admin() then
    select p.reporter_id into reporter from public.problems p
    where p.id = new.problem_id and p.status in ('approved', 'converted_to_challenge');
    if reporter is not null then
      insert into public.notifications(user_id, notification_type, title, message, link)
      values (reporter, 'challenge_published', 'Your approved problem is now a challenge',
        '“' || new.title || '” is published and open for youth applications.', '/challenges');
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_challenge_publication() from public, anon, authenticated;
create trigger challenge_publication_notification after update of status on public.challenges
for each row execute function private.notify_challenge_publication();

create function private.notify_application_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and new.status in ('accepted', 'rejected')
     and new.reviewed_by = (select auth.uid()) then
    insert into public.notifications(user_id, notification_type, title, message, link)
    values (new.applicant_id, 'application_status', 'Application updated',
      'Your challenge application was ' || new.status::text || '.', '/dashboard');
  end if;
  return new;
end;
$$;
revoke all on function private.notify_application_decision() from public, anon, authenticated;
create trigger application_decision_notification after update of status on public.challenge_applications
for each row execute function private.notify_application_decision();
