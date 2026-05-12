-- I.3.1: Add sigla column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sigla text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_sigla_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sigla_check
  CHECK (sigla IS NULL OR (length(sigla) BETWEEN 1 AND 3 AND sigla = upper(sigla) AND sigla ~ '^[A-Z]+$'));

-- Function to compute default sigla from full name
CREATE OR REPLACE FUNCTION public.compute_default_sigla(p_nome text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_clean text;
  v_palavras text[];
  v_filtradas text[];
  v_sigla text;
  v_blocklist text[] := ARRAY['PAU','CUS','CUZ','COC','COK','BUC','BOC','MER',
                              'FDP','BOS','MIJ','KGD','KKK','KAR','ANU'];
BEGIN
  IF p_nome IS NULL OR length(trim(p_nome)) = 0 THEN RETURN NULL; END IF;

  v_clean := upper(translate(trim(p_nome),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCAAAAAEEEEIIIIOOOOOUUUUC'));

  v_clean := regexp_replace(v_clean, '[^A-Z ]', '', 'g');

  v_palavras := regexp_split_to_array(v_clean, '\s+');

  SELECT array_agg(p) INTO v_filtradas
  FROM unnest(v_palavras) AS p
  WHERE length(p) > 0 AND p NOT IN ('DA','DE','DO','DOS','DAS','E');

  IF v_filtradas IS NULL OR array_length(v_filtradas, 1) = 0 THEN
    RETURN NULL;
  END IF;

  IF array_length(v_filtradas, 1) >= 3 THEN
    v_sigla := left(v_filtradas[1], 1) || left(v_filtradas[2], 1) || left(v_filtradas[3], 1);
  ELSIF array_length(v_filtradas, 1) = 2 THEN
    v_sigla := left(v_filtradas[1], 2) || left(v_filtradas[2], 1);
  ELSE
    v_sigla := left(v_filtradas[1], 3);
  END IF;

  IF length(v_sigla) < 1 THEN RETURN NULL; END IF;
  IF v_sigla = ANY(v_blocklist) THEN RETURN NULL; END IF;
  RETURN v_sigla;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles
SET sigla = public.compute_default_sigla(nome)
WHERE sigla IS NULL AND nome IS NOT NULL;