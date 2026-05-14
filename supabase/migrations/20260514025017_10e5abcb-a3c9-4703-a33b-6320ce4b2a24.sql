
CREATE OR REPLACE FUNCTION public.protect_lote_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;
    NEW.valor_esperado := OLD.valor_esperado;
    NEW.quantidade_pedida := OLD.quantidade_pedida;
    NEW.tentativas_comprovante := OLD.tentativas_comprovante;
    NEW.comprovante_url := OLD.comprovante_url;
    NEW.motivo_rejeicao := OLD.motivo_rejeicao;
    NEW.decidido_em := OLD.decidido_em;
    NEW.criado_em := OLD.criado_em;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lote_fields ON public.lotes_compra;
CREATE TRIGGER trg_protect_lote_fields
BEFORE UPDATE ON public.lotes_compra
FOR EACH ROW
EXECUTE FUNCTION public.protect_lote_fields();
