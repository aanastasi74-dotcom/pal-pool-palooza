## Resultado da verificação

**1. Build (`bun run build`):** ✅ PASSA — `✓ built in 13.60s`, exit 0.
Os erros TS relatados pelo harness são pré-existentes ao S0.8 (types.ts do Supabase desatualizado: falta declarar `bulletins`, `personality_profiles`, `audit_log`, e campo `conteudo` em `bulletins`). Não bloqueiam o build de produção.

**2. Banner nas 6 rotas admin:** ✅ todas corretas — `<CopaArquivadaBanner />` fica sempre como primeiro filho do `<div>` raiz do `return` do componente principal:

- `app.admin.jogos.tsx` (L68)
- `app.admin.sync.tsx` (L134)
- `app.admin.encerrar-copa.tsx` (L55)
- `app.admin.premiacao.tsx` (L20)
- `app.admin.pagamentos.tsx` (L112, dentro de `Pagamentos`; o return do sub-componente `DetalhePagamento` na L278 corretamente não recebeu banner)
- `app.admin.quotas.tsx` (L66)

Nenhum solto, nenhum duplicado, nenhum fora de return.

**3. JSX de `src/routes/app.index.tsx`:** ✅ balanceado — 7 `<section>` × 7 `</section>`. As duas `</section>` consecutivas (L143-144) fecham o `<section>` "Boletim" (L138) e o `<section>` externo "Copa 2026 — encerrada" (L70). Build confirma.

## Conclusão

Nada precisa ser corrigido no escopo do S0.8. Se você quiser, posso propor um plano separado para regenerar `src/integrations/supabase/types.ts` e resolver os erros de type-check pré-existentes — não afetam o build, mas poluem o IDE.
