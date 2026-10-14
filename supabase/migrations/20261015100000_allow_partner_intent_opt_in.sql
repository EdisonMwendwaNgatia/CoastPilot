-- The profile trigger permits only the one-way, nonprivileged youth to
-- potential_partner transition. It always rejects a client-set partner value.
grant update (account_type) on public.profiles to authenticated;
