# S3.2b — Promotor e referência no cadastro

## Implementação
- Criar hooks tipados para consultar o painel do promotor e registrar indicações pelas RPCs existentes.
- Exibir, abaixo de cada competição elegível do lobby (`pesquisa`, `inscricoes` ou `ativa`), um card somente para promotores autenticados, com métricas, incentivo, cópia do link e cadastro de e-mail.
- Tratar `nao_e_promotor` como ausência silenciosa e mapear os erros previstos do convite para mensagens em português.
- Capturar `ref` e `comp` nas páginas públicas, persistir em `sessionStorage` e incluir `ref_codigo` e `ref_competicao` no cadastro público da Champions.

## Regras preservadas
- Nenhuma rota nova, alteração administrativa, DemoTour, vitrine da Copa ou regra de banco.
- Copa arquivada e competições em rascunho não consultam nem mostram o card.
- Usuários deslogados nunca consultam nem veem o card.

## Validação
- Rodar o typecheck e conferir os diagnósticos do preview.
- Fazer smoke test do lobby e do cadastro, incluindo resposta `ok:false / nao_e_promotor` sem card nem erro visível.
