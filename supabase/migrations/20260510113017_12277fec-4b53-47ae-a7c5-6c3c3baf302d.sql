-- handle_new_user só é usada via trigger AFTER INSERT em auth.users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- rls_auto_enable é event trigger, não deve ser chamada por ninguém
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- is_admin: revogar do anon (não logado nunca é admin); manter para authenticated pois é usada em policies
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;