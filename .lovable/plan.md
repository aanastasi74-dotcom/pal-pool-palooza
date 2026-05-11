## Rodada F.1 — Fundação Copa 2026

Esta rodada cria as tabelas de times/estádios, ajusta `matches`, trava regras críticas (peso Top 4, bloqueio de quota, lanterninha via settings, apelido único, ator de sistema), atualiza ranking com critérios de desempate e adiciona telas/dropdowns. **Nenhum dado é populado** — só schema + UI.

---

### 1. Migration SQL (tudo numa só, idempotente)

```text
supabase/migrations/<ts>_rodada_f1_foundation.sql
```

Conteúdo:
- `CREATE TABLE IF NOT EXISTS teams` (id, nome_pt, bandeira_emoji, grupo CHECK A-L, bracket_position UNIQUE, confederacao CHECK 6 valores, created_at) + index `idx_teams_grupo` + RLS (SELECT público autenticado, write admin via `is_admin()`).
- `CREATE TABLE IF NOT EXISTS stadiums` (id, nome, cidade, pais CHECK EUA/Canadá/México, fuso_horario, created_at) + RLS análoga.
- `ALTER TABLE matches ADD COLUMN IF NOT EXISTS` para: `team_home_id`, `team_away_id`, `stadium_id` (FK), `slot_casa`, `slot_visitante`, `numero_jogo`, `hora_definida bool default true`. **Fase**: já existe como `text NOT NULL`, então só ampliar/recriar CHECK constraint para incluir `grupos, round_of_32, oitavas, quartas, semi, terceiro_lugar, final` (drop+add). Indexes `idx_matches_fase`, `idx_matches_data` em `data_jogo`.
- `ALTER TABLE top4_predictions ADD COLUMN IF NOT EXISTS peso_no_palpite smallint NOT NULL DEFAULT 100`.
- Function `get_peso_top4_atual()` SECURITY DEFINER: lê `fase_atual_copa()` existente; mapeia antes_copa→100, grupos→50, round_32→25; raise exception nas demais.
- Trigger `BEFORE INSERT/UPDATE` em `top4_predictions` que só recalcula `peso_no_palpite` quando os campos `posicao_*` mudam (mantém peso original em saves sem alteração — alinha com `protect_top4_fields`).
- Settings seed: `INSERT ... ON CONFLICT DO NOTHING` para `copa_start_date` (`'2026-06-11T20:00:00Z'`) e `lanterninha_rule` (`{"engajamento_minimo":0.8,"pontos_minimos":200}`).
- Function `pode_criar_quota()` SECURITY DEFINER retorna boolean comparando settings com `now()`.
- Trigger `BEFORE INSERT` em `quotas` que chama `pode_criar_quota()` e bloqueia (admin bypass via `is_admin()`).
- View `ranking_geral` com colunas `quota_id, user_id, apelido, pontos, exatos, resultados, posicao` ordenando por `pontos DESC, exatos DESC, resultados DESC, apelido ASC` (com `row_number()`). Exatos/resultados via join em predictions+matches encerrados.
- `ALTER TABLE profiles ADD CONSTRAINT profiles_apelido_unique UNIQUE (apelido)` (envolto em DO block que ignora se já existir).
- Perfil sistema: `INSERT INTO profiles (id, email, nome, apelido, role, ativo) VALUES ('00000000-0000-0000-0000-000000000001', 'sistema@bolaodosperebas.com', 'Sistema', 'Sistema', 'sistema', false) ON CONFLICT DO NOTHING`. Permitir role 'sistema' (profiles.role é text livre, OK).
- `consume_invite` permanece como está; validação de apelido único acontece naturalmente via constraint na inserção do profile (handle_new_user). Frontend valida em tempo real.

---

### 2. Edge functions

- `calcular-pontos`: ler `lanterninha_rule` de settings em vez de hardcode 0.8/200. Usar `SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'` em audit_log.
- `gerar-boletim-diario` e `lembrete-palpite`: trocar audit `ator_nome: "system"` → `ator_id: SYSTEM_USER_ID`.

---

### 3. Frontend

**Novos hooks/queries:**
- `src/lib/queries/teams.ts` — `useTeams()`, `useTeamsAgrupados()`.
- `src/lib/queries/stadiums.ts` — `useStadiums()`.
- `src/lib/queries/copa.ts` — `usePodeCriarQuota()` (RPC).

**Modificações:**
- `src/lib/lanterninha.ts`: aceitar parâmetros (engajamento_minimo, pontos_minimos) com fallback aos defaults atuais; manter texto `REGRA_LANTERNINHA` dinâmico via função.
- `src/lib/queries/quotas.ts`: em `useCreateQuota`, antes do insert, chamar RPC `pode_criar_quota`; se false throw msg amigável.
- `src/routes/app.quotas.tsx`: esconder botão "Comprar nova quota" e mostrar banner quando `!podeCriarQuota`.
- `src/routes/app.admin.configuracoes.tsx`: novo accordion "Copa" com datetime picker para `copa_start_date` e campos para `lanterninha_rule`.
- `src/routes/app.admin.jogos.tsx`: form com dropdowns (`teams`, `stadiums`), select de fase com novos valores, inputs slot/numero_jogo/hora_definida, validação condicional, e placar visível só com status=encerrado.
- `src/components/app-shell.tsx`: adicionar itens menu "Times da Copa" (Globe) e "Estádios" (MapPin/Building).

**Novas rotas:**
- `src/routes/app.times.tsx` — agrupar por grupo A-L; chips de confederação opcionais.
- `src/routes/app.estadios.tsx` — agrupar por país com bandeira.

---

### 4. Ranking

- `src/lib/queries/quotas.ts`: substituir `useRanking` para `select('*')` da view `ranking_geral`. Ranking diário: query separada que filtra predictions de matches do dia, agrega e aplica mesma ordenação client-side (mais simples que view paramétrica).

---

### 5. Fora de escopo (confirmado pelo brief)
Itens listados em "Fora de escopo (vai pra F.2)" não serão tocados.

---

### Critérios de aceitação cobertos
Todos os 12 itens do brief, exceto:
- Validação debounced de apelido no signup: faremos via check pontual no submit + tratamento do erro UNIQUE (debounced async é refinamento).

### Riscos / notas
- View `ranking_geral` precisa de `security_invoker = true` para respeitar RLS de quotas; alternativa é função SECURITY DEFINER. Vou usar function `get_ranking_geral()` SECURITY DEFINER pra simplificar.
- `matches.fase` CHECK pode falhar se houver dados existentes com valores antigos (`Final`, `Quartas`, etc. usados em `fase_atual_copa()`). Vou normalizar valores existentes (`UPDATE`) antes de aplicar novo CHECK e ajustar `fase_atual_copa()` para usar os novos valores em snake_case.
- Trigger no `quotas` precisa permitir admin (insert manual) — checar `is_admin()`.
