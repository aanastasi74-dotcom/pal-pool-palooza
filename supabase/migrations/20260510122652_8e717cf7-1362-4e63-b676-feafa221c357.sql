CREATE OR REPLACE FUNCTION public.set_prediction_submetido_em_on_insert()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.placar_casa IS NOT NULL AND NEW.placar_fora IS NOT NULL THEN
    NEW.submetido_em := now();
  ELSE
    NEW.submetido_em := NULL;
  END IF;
  NEW.pontos_calculados := 0;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_top4_fase_on_insert()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.alterado_em := now();
  NEW.fase_alteracao := 'antes_copa';
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_prediction_submetido_em_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_top4_fase_on_insert() FROM PUBLIC, anon, authenticated;