create type public.challenge_prize_type as enum ('none', 'cash', 'tangible', 'cash_and_tangible');

alter table public.challenges
  add column is_sponsored boolean not null default false,
  add column sponsor_name text,
  add column prize_type public.challenge_prize_type not null default 'none',
  add column cash_prize_amount numeric(12,2) not null default 0,
  add column cash_prize_currency text not null default 'KES',
  add column tangible_prizes text[] not null default '{}',
  add column prize_notes text,
  add constraint challenges_prize_amount_nonnegative check (cash_prize_amount >= 0),
  add constraint challenges_prize_currency_format check (cash_prize_currency ~ '^[A-Z]{3}$'),
  add constraint challenges_sponsor_name_only_when_sponsored check (is_sponsored or sponsor_name is null),
  add constraint challenges_prize_type_matches_values check (
    (prize_type = 'none' and cash_prize_amount = 0 and cardinality(tangible_prizes) = 0)
    or (prize_type = 'cash' and cash_prize_amount > 0 and cardinality(tangible_prizes) = 0)
    or (prize_type = 'tangible' and cash_prize_amount = 0 and cardinality(tangible_prizes) > 0)
    or (prize_type = 'cash_and_tangible' and cash_prize_amount > 0 and cardinality(tangible_prizes) > 0)
  );
