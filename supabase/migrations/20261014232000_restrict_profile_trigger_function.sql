-- Profile creation is invoked by the Auth trigger, never by an API caller.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
