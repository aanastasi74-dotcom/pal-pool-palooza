
-- N.38: prazos da §8 do Top 4 movidos para 12:00 BRT (28/06 e 04/07).
CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE IF NOT EXISTS backups.functions_pre_n38 (
  nome text,
  definicao text,
  salvado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO backups.functions_pre_n38 (nome, definicao)
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN ('get_peso_top4_atual', 'protect_top4_fields');

-- Substitui get_peso_top4_atual por versão baseada em prazos absolutos.
CREATE OR REPLACE FUNCTION public.get_peso_top4_atual()
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inicio_copa     constant timestamptz := '2026-06-11 16:00:00-03'::timestamptz;
  deadline_grupos constant timestamptz := '2026-06-28 12:00:00-03'::timestamptz;
  deadline_r32    constant timestamptz := '2026-07-04 12:00:00-03'::timestamptz;
  agora timestamptz := now();
BEGIN
  IF agora < inicio_copa THEN RETURN 100;
  ELSIF agora < deadline_grupos THEN RETURN 50;
  ELSIF agora < deadline_r32 THEN RETURN 25;
  ELSE
    RAISE EXCEPTION 'Palpites Top 4 bloqueados após 04/07/2026 12:00 BRT';
  END IF;
END;
$$;

-- Atualiza trigger protect_top4_fields para travar via prazo absoluto (não via fase_atual_copa).
CREATE OR REPLACE FUNCTION public.protect_top4_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deadline_r32 constant timestamptz := '2026-07-04 12:00:00-03'::timestamptz;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.quota_id := OLD.quota_id;
    NEW.pontos_calculados := OLD.pontos_calculados;
    IF (NEW.posicao_1 IS DISTINCT FROM OLD.posicao_1)
       OR (NEW.posicao_2 IS DISTINCT FROM OLD.posicao_2)
       OR (NEW.posicao_3 IS DISTINCT FROM OLD.posicao_3)
       OR (NEW.posicao_4 IS DISTINCT FROM OLD.posicao_4) THEN
      IF now() >= deadline_r32 THEN
        RAISE EXCEPTION 'Top 4 não pode mais ser alterado: a janela fechou em 04/07/2026 às 12:00 BRT';
      END IF;
      NEW.alterado_em := now();
      NEW.fase_alteracao := public.fase_atual_copa();
    ELSE
      NEW.alterado_em := OLD.alterado_em;
      NEW.fase_alteracao := OLD.fase_alteracao;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
