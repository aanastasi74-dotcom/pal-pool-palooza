CREATE OR REPLACE FUNCTION public.guard_matches_crud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'CRUD de matches restrito. Use SQL com service role.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_matches ON public.matches;
CREATE TRIGGER trg_guard_matches
  BEFORE INSERT OR DELETE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.guard_matches_crud();