-- Organization members may propose sponsorship, but only administrators may
-- change sponsorship or prize fields on a challenge.
create or replace function private.guard_challenge_sponsorship_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_admin()
      and (new.is_sponsored or new.sponsor_name is not null or new.prize_type <> 'none'
        or new.cash_prize_amount <> 0 or cardinality(new.tangible_prizes) > 0
        or new.prize_notes is not null) then
      raise exception 'sponsorship and prize details require administrator review';
    end if;
    return new;
  end if;

  if not private.is_admin() and (
    new.is_sponsored is distinct from old.is_sponsored
    or new.sponsor_name is distinct from old.sponsor_name
    or new.prize_type is distinct from old.prize_type
    or new.cash_prize_amount is distinct from old.cash_prize_amount
    or new.cash_prize_currency is distinct from old.cash_prize_currency
    or new.tangible_prizes is distinct from old.tangible_prizes
    or new.prize_notes is distinct from old.prize_notes
  ) then
    raise exception 'sponsorship and prize details require administrator review';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_challenge_sponsorship_fields() from public, anon, authenticated;
create trigger guard_challenge_sponsorship_fields
before insert or update on public.challenges
for each row execute function private.guard_challenge_sponsorship_fields();
