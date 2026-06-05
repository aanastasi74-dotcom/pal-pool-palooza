
-- Backup defensivo antes da N.5
CREATE TABLE backups.quotas_pre_n5 AS TABLE public.quotas;
CREATE TABLE backups.payments_pre_n5 AS TABLE public.payments;
CREATE TABLE backups.lotes_compra_pre_n5 AS TABLE public.lotes_compra;

-- Atualiza pode_criar_quota() pra usar MIN(data_jogo) como fonte única de verdade
CREATE OR REPLACE FUNCTION public.pode_criar_quota()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deadline timestamptz;
BEGIN
  SELECT MIN(data_jogo) INTO deadline FROM public.matches;
  -- defensivo: se não houver jogos cadastrados, não bloqueia
  IF deadline IS NULL THEN RETURN true; END IF;
  RETURN now() < deadline;
END;
$function$;

-- Função do trigger: bloqueia INSERT em quotas após o início do primeiro jogo
CREATE OR REPLACE FUNCTION public.check_quota_creation_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deadline timestamptz;
BEGIN
  SELECT MIN(data_jogo) INTO deadline FROM public.matches;
  -- defensivo: tabela vazia não bloqueia
  IF deadline IS NULL THEN RETURN NEW; END IF;
  IF now() >= deadline THEN
    RAISE EXCEPTION 'Prazo para criar quota encerrado: o primeiro jogo da Copa começou em %', deadline
      USING HINT = 'Regulamento §3 — prazo para adquirir quota é até o início do primeiro jogo.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_check_quota_creation_deadline ON public.quotas;
CREATE TRIGGER trg_check_quota_creation_deadline
  BEFORE INSERT ON public.quotas
  FOR EACH ROW EXECUTE FUNCTION public.check_quota_creation_deadline();
