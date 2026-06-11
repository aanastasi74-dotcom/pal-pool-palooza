## Rodada N.12 — Detalhes do jogo + Jogos encerrados expansíveis

### Parte 0 — Backup + Migração (aditivo)
- `CREATE TABLE backups.matches_pre_n12 AS TABLE matches;` (cria schema `backups` se não existir)
- `ALTER TABLE matches ADD COLUMN IF NOT EXISTS estatisticas jsonb;`
- `ALTER TABLE matches ADD COLUMN IF NOT EXISTS escalacoes jsonb;`

Sem default, sem NOT NULL. Não toca em outras tabelas, triggers, RLS ou constraints.

### Parte 1 — Edge function `get-match-details` (verify_jwt = true)
- Input: `{ match_id: uuid }`
- Lê o match + nomes/bandeiras dos times via service role.
- Se `status='encerrado'` E `estatisticas IS NULL`: GET em `/fixtures/statistics?fixture=<codigo_api>` e `/fixtures/lineups?fixture=<codigo_api>` usando header `x-apisports-key: API_FOOTBALL_KEY`, persiste em `matches.estatisticas` e `matches.escalacoes`. Sem RPC bypass.
- Não chama API para jogos `agendado`/`ao-vivo` — só usa o que já está no banco.
- Retorna `{ match, estatisticas, escalacoes, fonte_stats: 'cache'|'api'|'indisponivel' }`.
- Registrar em `supabase/config.toml` com `verify_jwt = true`.
- Verificar/garantir o secret `API_FOOTBALL_KEY` (já usado pelo `sync-match-scores`).

### Parte 2 — Nova rota `/app/jogo/$match_id/detalhes`
Arquivo: `src/routes/app.jogo.$match_id.detalhes.tsx` (mesma convenção da N.9).

Layout:
- Cabeçalho: bandeiras, nomes, placar grande (do banco), badge de status, peso, data/hora BRT, estádio/cidade.
- Timeline de gols a partir de `matches.eventos` (minuto + jogador + time). Empty state amigável.
- `encerrado` + stats presentes: seção "Estatísticas" lado a lado (posse, finalizações totais/no gol, escanteios, faltas, amarelos/vermelhos) + "Escalações iniciais" (formação + titulares, reservas quando houver).
- `ao-vivo`: aviso "estatísticas após encerrar" mantendo placar/eventos visíveis.
- `agendado`: aviso "jogo ainda não começou".
- Rodapé: link → `/app/jogo/$id/palpites`.

Chamada à edge function via `supabase.functions.invoke('get-match-details', { body: { match_id } })`.

### Parte 3 — Botão "Detalhes do jogo" no card de `/app/jogos`
- Link discreto com ícone `BarChart3` (lucide) levando a `/app/jogo/$match_id/detalhes`.
- Aparece em todos os status, posicionado na linha do rodapé do card sem competir com Editar/Palpitar/Ver todos os palpites.

### Parte 4 — Seção "Jogos encerrados (N)" em `/app/palpites`
- Componente colapsável (Radix Collapsible) **acima** da lista de jogos abertos.
- Header: "Jogos encerrados ({N})" + chevron. Default colapsado.
- Persistência: `localStorage['palpites_encerrados_expandidos_v1']`.
- Conteúdo: jogos com `status='encerrado'` ordenados por `data_jogo` ASC, mostrando bandeiras+nomes, placar real, palpite do pereba na quota selecionada, pontos da quota no jogo, mini-link "Detalhes".
- Read-only — sem botão "Editar".
- Contador atual ("X jogos abertos para palpitar") continua filtrando só não-encerrados sem palpite.

### Itens explicitamente intocados
- `sync-match-scores`, `calcular-pontos`, qualquer trigger (`trg_recalc_pontos_on_match_update`, `check_prediction_deadline`, `protect_*_fields`), constraint `matches_status_check`, RLS existente, dados existentes.
- Rota `/app/jogo/$id/palpites` e componente "Ver todos os palpites" da N.9.
- Tabelas `predictions`, `quotas`, `profiles`, etc.

### Ordem de execução
1. Rodar migração (backup + 2 colunas).
2. Após aprovação da migração e regeneração de types: criar edge function, deploy, registrar no `config.toml`.
3. Criar rota `detalhes` + adicionar link no card de `/app/jogos`.
4. Adicionar seção colapsável em `/app/palpites`.
5. Build check.

Confirma que posso seguir?
