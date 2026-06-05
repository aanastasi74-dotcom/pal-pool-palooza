import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Printer, Check, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/regras")({
  validateSearch: z.object({ force: z.boolean().optional() }).parse,
  head: () => ({
    meta: [
      { title: "Regulamento — Bolão dos Perebas Copa 2026" },
      {
        name: "description",
        content:
          "Regulamento oficial do Bolão dos Perebas Copa 2026 — pontuação, premiação, governança e regras gerais.",
      },
    ],
  }),
  component: RegrasPage,
});

const secoes = [
  ["1", "Apresentação"],
  ["2", "Participação"],
  ["3", "Quotas"],
  ["4", "Aprovação de Pagamento"],
  ["5", "Palpites de Jogos"],
  ["6", "Sistema de Pesos"],
  ["7", "Pontuação por Placar"],
  ["8", "Pontuação Top 4 da Copa"],
  ["9", "Ranking e Desempate"],
  ["10", "Premiação"],
  ["11", "Regra do Lanterninha"],
  ["12", "Governança"],
  ["13", "Espírito Pereba e Convivência"],
  ["14", "Pagamento aos Vencedores"],
] as const;

function RegrasPage() {
  const { force } = Route.useSearch();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  
  const [aceitando, setAceitando] = useState(false);
  const aceitouEm = (profile as any)?.aceitou_regras_em as string | null | undefined;
  const podeAceitar = !!user && !aceitouEm;

  const aceitar = async () => {
    setAceitando(true);
    const { error } = await supabase.rpc("aceitar_regras" as any);
    if (error) {
      setAceitando(false);
      toast.error("Não consegui registrar o aceite: " + error.message);
      return;
    }
    toast.success("Aceite registrado!");
    // Dispara email de boas-vindas pós-aceite (fire-and-forget, idempotente no backend)
    supabase.functions
      .invoke("send-regras-signup", { body: {} })
      .catch((err) => console.warn("send-regras-signup falhou silenciosamente:", err));
    await qc.invalidateQueries({ queryKey: ["profile"] });
    // Hard reload pra refetch do profile no AuthContext e liberar o gate
    window.location.href = "/app";
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <h1 className="font-display text-lg font-extrabold leading-tight">
              Regulamento — Bolão dos Perebas Copa 2026
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Versão 1.0 — Aprovada em 17/05/2026 pelos Admins Anasta, Anão e Prof
            </p>
          </div>
          {podeAceitar && !force && (
            <button
              onClick={aceitar}
              disabled={aceitando}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {aceitando ? "Registrando…" : "Li e aceito as regras"}
            </button>
          )}
          {!!aceitouEm && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-[11px] font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Aceito em{" "}
              {new Date(aceitouEm).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 text-sm leading-relaxed">
        {force && podeAceitar && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Antes de continuar usando o app, é necessário aceitar o regulamento.
              Lê com calma e clica no botão fixo no rodapé.
            </p>
          </div>
        )}

        {/* Índice */}
        <nav className="mb-8 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Índice
          </p>
          <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {secoes.map(([n, t]) => (
              <li key={n}>
                <a
                  href={`#s${n}`}
                  className="text-primary hover:underline"
                >
                  {n}. {t}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Secao n="1" titulo="Apresentação">
          <p>
            O Bolão dos Perebas Copa 2026 é uma competição entre amigos baseada em palpites
            dos jogos da Copa do Mundo FIFA 2026. Organizado pelos Admins{" "}
            <strong>Anasta</strong>, <strong>Anão</strong> e <strong>Glauco "Prof"</strong>.
            Toda operação acontece pelo app pal-pool-palooza.lovable.app, instalável como PWA
            no celular. Participação é por convite, limitada a 350 pessoas. Ao se cadastrar,
            o participante recebe oficialmente o título de <em>Pereba honorário</em> — uma
            referência carinhosa criada pra galera deixar o ego no vestiário e curtir o
            bolão. Quem entra, vira da turma. 100% da arrecadação é distribuída como
            premiação. Os Admins NÃO recebem remuneração pelo bolão. Custos operacionais
            (hospedagem, infraestrutura, domínio) foram cobertos pelos Admins do próprio
            bolso, sem dedução da arrecadação. E por isso o bolão tem limites de
            participantes e quotas.
          </p>
        </Secao>

        <Secao n="2" titulo="Participação">
          <ul className="list-disc space-y-1 pl-5">
            <li>Entrada apenas por convite emitido por Admin (expira em 7 dias).</li>
            <li>Cada email pode ter apenas uma conta de pereba.</li>
            <li>Pereba escolhe apelido único (até 8 caracteres, maiúsculas) e sigla de 3 letras para o avatar.</li>
            <li>Ao se cadastrar, declara que leu e aceita este regulamento.</li>
            <li>
              <strong>Importante:</strong> o mero cadastro NÃO significa participação no bolão. Pra participar
              de fato, é necessário acessar a tela Minhas Quotas e adquirir pelo menos uma quota.
            </li>
          </ul>
        </Secao>

        <Secao n="3" titulo="Quotas">
          <ul className="list-disc space-y-1 pl-5">
            <li>Cada quota custa R$ 50,00. Múltiplas quotas por pereba permitidas (limite padrão 5, flexibilizável por Admin a pedido desde que ainda não tenhamos atingido o limite de 1500 quotas).</li>
            <li>Pagamento via PIX (chave e QR code exibidos no app no momento da compra). Comprovante anexado pelo próprio pereba.</li>
            <li>Aprovação manual por qualquer um dos 3 Admins.</li>
            <li>Prazo para adquirir quota: até o início do primeiro jogo (11/06/2026). Quotas compradas antes mas aprovadas depois continuam válidas.</li>
            <li>Limite global: 1.500 quotas em todo o bolão.</li>
          </ul>
        </Secao>

        <Secao n="4" titulo="Aprovação de Pagamento">
          <ul className="list-disc space-y-1 pl-5">
            <li>Se o comprovante for inválido, Admin rejeita com motivo e o pereba pode reenviar.</li>
            <li>Limite de 3 tentativas por quota. Após 3 rejeições, a quota é encerrada (pereba compra nova se quiser).</li>
            <li>Quotas encerradas não geram pontuação no ranking nem somam na arrecadação.</li>
          </ul>
        </Secao>

        <Secao n="5" titulo="Palpites de Jogos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Cada quota palpita um placar exato em cada um dos 104 jogos da Copa.</li>
            <li>
              Janela de palpite: editável até <strong>5 minutos antes do horário previsto</strong> do jogo
              (independente de eventual atraso real do início). Depois, palpite trava automaticamente.
            </li>
            <li>
              <strong>Indisponibilidade do app (responsabilidade do pereba):</strong> o app pode eventualmente
              ficar fora do ar por falha do provedor de hospedagem, manutenção, problema de internet do próprio
              pereba ou qualquer outra causa fora do controle dos Admins. <strong>Por isso, evite deixar palpites
              para a última hora.</strong> Recomendamos preencher e revisar palpites com pelo menos algumas horas
              de antecedência. <strong>Os Admins não se responsabilizam por palpites não enviados em caso de
              indisponibilidade, e palpites recebidos após o horário de trava do jogo não serão considerados em
              nenhuma hipótese.</strong>
            </li>
            <li>
              <strong>Mata-mata (placar oficial):</strong> a partir do mata-mata (Round of 32 em diante, ou seja,
              da fase eliminatória da Copa 2026 com 48 seleções), o placar considerado
              para fins de pontuação é <strong>exclusivamente o resultado do tempo normal</strong> (90 minutos +
              acréscimos). <strong>Eventuais gols na prorrogação e cobranças de pênaltis são ignorados pelo
              bolão</strong> — só contam pra definir quem avança no chaveamento da Copa, não pra pontuar os palpites.
            </li>
            <li>
              Além dos palpites por jogo, cada quota também faz <strong>um palpite Top 4</strong> (Campeão, Vice,
              3º, 4º colocados) — regras detalhadas na seção 8.
            </li>
          </ul>
        </Secao>

        <Secao n="6" titulo="Sistema de Pesos">
          <ul className="list-disc space-y-1 pl-5">
            <li>O peso de cada jogo aumenta conforme a Copa avança.</li>
            <li>Dia 1 (11/06/2026): peso 10. Cada dia subsequente com jogos soma +1 (12/06 = 11, 13/06 = 12, etc.). Dias sem jogos não contam.</li>
            <li><strong>Exceção:</strong> a Final (jogo 104) tem peso fixo 50. Disputa de 3º e Semifinais seguem o peso natural.</li>
          </ul>
        </Secao>

        <Secao n="7" titulo="Pontuação por Placar">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60 text-left">
                  <th className="border border-border px-3 py-2">Acerto</th>
                  <th className="border border-border px-3 py-2">Pontos base</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-border px-3 py-2">Placar exato (ex.: palpitou 2×1, foi 2×1)</td><td className="border border-border px-3 py-2 font-semibold">12 pts × peso do dia</td></tr>
                <tr><td className="border border-border px-3 py-2">Resultado certo (vitória/empate), placar errado</td><td className="border border-border px-3 py-2">4 pts × peso do dia</td></tr>
                <tr><td className="border border-border px-3 py-2">Diferença de gols</td><td className="border border-border px-3 py-2">2 pts × peso do dia</td></tr>
                <tr><td className="border border-border px-3 py-2">Gols de um time (mandante OU visitante)</td><td className="border border-border px-3 py-2">1 pt × peso do dia</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            <strong>Importante (pontuação não cumulativa com placar exato):</strong> por jogo, <strong>placar exato
            é exclusivo</strong> — quando o pereba acerta o placar (12 pts × peso), ele não soma também as demais
            faixas. Recebe apenas os 12 pts. As demais faixas (4, 2, 1) só valem quando o placar exato não foi
            acertado, e <strong>se acumulam entre si conforme se aplicarem ao mesmo palpite</strong>. Cada critério
            é avaliado independentemente: resultado certo, diferença de gols e gols de um time podem somar pontos
            simultaneamente, dependendo do palpite.
          </p>
          <p className="mt-3">
            <strong>Critério importante:</strong> todos os critérios secundários (resultado, diferença de gols,
            gols de um time) são avaliados <strong>respeitando a posição mandante × visitante</strong>. Se o pereba
            inverteu o resultado (palpitou vitória de um time e o outro venceu), os critérios secundários também
            ficam zerados — porque nenhum elemento do palpite corresponde ao que aconteceu no jogo. Exemplo: palpite
            2×1, real 1×2 → 0 pontos.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Exemplo 1</strong> — palpite 3×2, real 2×1: resultado certo (4 pts) + diferença de gols igual (2 pts) = <strong>6 pts × peso</strong>. Não bate gols isolados de cada time (mandante 3 ≠ 2; visitante 2 ≠ 1).</li>
            <li><strong>Exemplo 2</strong> — palpite 3×1, real 2×1: resultado certo (4 pts) + gols do visitante (1 pt, porque acertou o 1 do perdedor) = <strong>5 pts × peso</strong>. Não bate diferença (2 ≠ 1) nem gols do mandante (3 ≠ 2).</li>
            <li><strong>Exemplo 3</strong> — palpite 2×1, real 2×1: placar exato = <strong>12 pts × peso</strong>. As demais faixas ficam desativadas (não somam, mesmo todas se aplicando).</li>
            <li><strong>Exemplo 4</strong> — palpite 2×1, real 1×2 (resultado invertido): <strong>0 pts</strong>. Embora a magnitude do placar coincida, o palpite errou quem venceu, então nenhum critério secundário se aplica.</li>
            <li><strong>Exemplo 5</strong> — palpite 1×1, real 1×0 (empate previsto, vitória da casa): <strong>0 pts</strong>. O resultado errou (palpitou empate e foi vitória), então todos os critérios secundários ficam zerados. O mesmo vale ao contrário: palpitou vitória de qualquer lado e o jogo terminou empatado → também 0 pts. A pontuação secundária só vale quando o resultado (vitória da casa, empate ou vitória do visitante) bate.</li>
            <li><strong>Exemplo 6</strong> — palpite 1×1, real 2×2 (empate previsto, empate aconteceu): resultado certo (4 pts × peso, ambos empate) + diferença de gols igual (2 pts × peso, ambos zero) = <strong>6 pts × peso</strong>. Não bate gols isolados de nenhum time (palpite 1 ≠ real 2 nos dois lados).</li>
          </ul>
        </Secao>

        <Secao n="8" titulo="Pontuação Top 4 da Copa">
          <p>
            Cada quota palpita os 4 primeiros colocados da Copa (Campeão, Vice, 3º, 4º). Esse palpite é independente
            dos palpites por jogo. A pontuação por seleção acertada depende de quando o palpite foi feito ou
            modificado pela última vez.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60 text-left">
                  <th className="border border-border px-3 py-2">Período</th>
                  <th className="border border-border px-3 py-2">Posição certa</th>
                  <th className="border border-border px-3 py-2">Posição errada</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-border px-3 py-2">Até 23:59 de 10/06/2026 (Brasília)</td><td className="border border-border px-3 py-2 font-semibold">1.000 pts</td><td className="border border-border px-3 py-2">400 pts</td></tr>
                <tr><td className="border border-border px-3 py-2">Até 23:59 de 27/06/2026 (grupos)</td><td className="border border-border px-3 py-2">500 pts (50%)</td><td className="border border-border px-3 py-2">200 pts (50%)</td></tr>
                <tr><td className="border border-border px-3 py-2">Até 23:59 de 03/07/2026 (round of 32)</td><td className="border border-border px-3 py-2">250 pts (25%)</td><td className="border border-border px-3 py-2">100 pts (25%)</td></tr>
                <tr><td className="border border-border px-3 py-2">Depois de 03/07/2026</td><td className="border border-border px-3 py-2" colSpan={2}>Palpite travado</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            <strong>Atenção (regra importante):</strong> qualquer alteração no palpite Top 4 — mesmo de uma única
            seleção entre as 4 — aplica o redutor da janela atual sobre <strong>TODOS os 4 acertos</strong>, não
            apenas o palpite modificado. Exemplo: se você modificar apenas o Vice durante a fase de grupos, todos
            os 4 palpites passam a valer 50% (mesmo os que você não tocou). Acerto em posição errada (palpitou
            Brasil como Campeão e Brasil terminou em 3º) vale 400 pts no início, com os mesmos redutores. Pontuação
            máxima do Top 4 (mantido inalterado antes do início da Copa) é 4 × 1.000 = 4.000 pts. Após 03/07/2026,
            palpite Top 4 fica travado até o fim da Copa.
          </p>
        </Secao>

        <Secao n="9" titulo="Ranking e Desempate">
          <p>
            Ranking lista quotas ativas em ordem decrescente de pontos. Em caso de empate de pontos totais,
            critério de desempate: maior número de placares exatos, depois maior número de resultados acertados,
            depois quota mais antiga (a que foi criada primeiro).
          </p>
        </Secao>

        <Secao n="10" titulo="Premiação">
          <p>
            Arrecadação total = N° de quotas ativas × R$ 50. 100% da arrecadação é distribuída entre os vencedores.
            A distribuição varia em função do tamanho do bolão, conforme a tabela abaixo:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="bg-muted/60 text-left">
                  <th className="border border-border px-2 py-2">Posição / Nº Quotas</th>
                  <th className="border border-border px-2 py-2">≤ 49</th>
                  <th className="border border-border px-2 py-2">50–99</th>
                  <th className="border border-border px-2 py-2">100–249</th>
                  <th className="border border-border px-2 py-2">250–499</th>
                  <th className="border border-border px-2 py-2">500–999</th>
                  <th className="border border-border px-2 py-2">1000–1249</th>
                  <th className="border border-border px-2 py-2">1250–1500</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-border px-2 py-2 font-bold">1º</td><td className="border border-border px-2 py-2">60%</td><td className="border border-border px-2 py-2">59%</td><td className="border border-border px-2 py-2">57,5%</td><td className="border border-border px-2 py-2">55,75%</td><td className="border border-border px-2 py-2">55%</td><td className="border border-border px-2 py-2">52,5%</td><td className="border border-border px-2 py-2">50%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">2º</td><td className="border border-border px-2 py-2">25%</td><td className="border border-border px-2 py-2">24%</td><td className="border border-border px-2 py-2">23,5%</td><td className="border border-border px-2 py-2">23,25%</td><td className="border border-border px-2 py-2">23%</td><td className="border border-border px-2 py-2">22,5%</td><td className="border border-border px-2 py-2">22,5%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">3º</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td><td className="border border-border px-2 py-2">10%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">4º</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">2%</td><td className="border border-border px-2 py-2">2,5%</td><td className="border border-border px-2 py-2">2,5%</td><td className="border border-border px-2 py-2">2,5%</td><td className="border border-border px-2 py-2">4%</td><td className="border border-border px-2 py-2">5%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">5º</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">1,5%</td><td className="border border-border px-2 py-2">1,5%</td><td className="border border-border px-2 py-2">1,5%</td><td className="border border-border px-2 py-2">2,5%</td><td className="border border-border px-2 py-2">3%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">6º a 10º</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">Devolução</td><td className="border border-border px-2 py-2">0,20%</td><td className="border border-border px-2 py-2">0,30%</td><td className="border border-border px-2 py-2">0,26%</td></tr>
                <tr><td className="border border-border px-2 py-2 font-bold">Lanterninha</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td><td className="border border-border px-2 py-2">5%</td></tr>
                <tr className="bg-yellow-200/40 dark:bg-yellow-900/30"><td className="border border-border px-2 py-2 font-bold">Devolução</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">—</td><td className="border border-border px-2 py-2">P6 a P10</td><td className="border border-border px-2 py-2">P11 a P20</td><td className="border border-border px-2 py-2">P11 a P30</td><td className="border border-border px-2 py-2">P11 a P50</td></tr>
                <tr className="bg-amber-300/30 dark:bg-amber-800/30"><td className="border border-border px-2 py-2 font-bold">Bônus do 1º</td><td className="border border-border px-2 py-2">Não</td><td className="border border-border px-2 py-2">Não</td><td className="border border-border px-2 py-2">Não</td><td className="border border-border px-2 py-2 font-bold">Sim</td><td className="border border-border px-2 py-2 font-bold">Sim</td><td className="border border-border px-2 py-2 font-bold">Sim</td><td className="border border-border px-2 py-2 font-bold">Sim</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            <strong>Como ler a tabela:</strong> cada coluna representa uma faixa de tamanho do bolão (em número de
            quotas ativas). As linhas mostram o percentual da arrecadação total que cada posição recebe. Exemplo:
            com 600 quotas no bolão (faixa 500–999), o 1º colocado recebe 55% da arrecadação, o 2º recebe 23%, e
            assim por diante.
          </p>
          <p className="mt-3">
            <strong>Devolução da inscrição:</strong> em vez de receberem percentual, perebas elegíveis à devolução
            recebem <strong>R$ 50,00 fixos</strong> cada (o valor pago pela quota). Quem é elegível depende da
            faixa: em 250–499 quotas, são as posições 6 a 10; em 500–999, são as 11 a 20; em 1000–1249, as 11 a 30;
            em 1250–1500, as 11 a 50.
          </p>
          <p className="mt-3">
            <strong>Bônus do 1º colocado:</strong> a partir de 250 quotas, pode haver um saldo residual decorrente
            da combinação entre percentuais e devolução de valor fixo. Esse saldo é <strong>integralmente
            adicionado ao prêmio do 1º colocado</strong>. O valor é zero exatamente na quota mínima de cada faixa
            (250, 500, 1000, 1250) e cresce gradualmente conforme o bolão se enche dentro da faixa — sendo R$ 0 no
            limite inferior e podendo chegar a algumas centenas de reais no limite superior. Esse bônus é declarado
            aqui para que ninguém estranhe ao ver um valor um pouco maior do que o percentual sugere para o 1º.
          </p>
        </Secao>

        <Secao n="11" titulo="Regra do Lanterninha">
          <ul className="list-disc space-y-2 pl-5">
            <li>O prêmio do lanterninha (5% da arrecadação) vai pro último colocado, mas apenas se ele participou de fato — não basta criar a quota e abandonar.</li>
            <li>Critérios de elegibilidade (<strong>ambos obrigatórios</strong>): (a) a quota precisa ter pontuado no mínimo 200 pontos ao final da Copa; e (b) ter palpitado em pelo menos 80% dos jogos (ou seja, no mínimo 84 dos 104 jogos da Copa).</li>
            <li>Se o último colocado não atender aos dois critérios, o prêmio passa para o penúltimo elegível, e assim sucessivamente. Bottom 25% do ranking vê aviso de elegibilidade na tela.</li>
          </ul>
        </Secao>

        <Secao n="12" titulo="Governança">
          <ul className="list-disc space-y-2 pl-5">
            <li>3 Admins com mesmos poderes administrativos, sem hierarquia: Alessandro Anastasi (Anasta), Alessandro Michelin (Anão) e Glauco Peres (Prof).</li>
            <li>Poderes: aprovar/rejeitar pagamentos, encerrar quotas órfãs, atualizar placares, publicar boletins, emitir convites, flexibilizar limite de quotas individual, promover novos Admins em casos excepcionais.</li>
            <li>Admins NÃO veem palpites de outros perebas enquanto a janela do jogo está aberta (mesma regra para Admin e pereba comum). Após o jogo travar, palpites de todos viram públicos.</li>
            <li>Casos omissos: decisão por consenso entre os 3 Admins. Decisão final.</li>
          </ul>
        </Secao>

        <Secao n="13" titulo="Espírito Pereba e Convivência">
          <p>
            Bolão é entre perebas, e perebas têm espírito ogro: zoeira, provocação leve e rivalidade saudável fazem
            parte do jogo. A quinta série mora dentro de cada um e tem direito a sair de vez em quando — desde que
            ninguém saia chateado de verdade. Ofensa pessoal, fraude no comprovante ou comportamento que faça outro
            pereba se sentir mal: passa do limite. Os Admins podem excluir pereba por comportamento incompatível,
            com motivo registrado no log do sistema.
          </p>
        </Secao>

        <Secao n="14" titulo="Pagamento aos Vencedores">
          <ul className="list-disc space-y-2 pl-5">
            <li>Após o último jogo da Copa (Final, 19/07/2026), os Admins calculam o ranking definitivo e distribuem os prêmios via PIX.</li>
            <li>Cada vencedor precisa fornecer chave PIX ativa no momento do recebimento. Prazo de pagamento: até 3 dias após a Final.</li>
          </ul>
        </Secao>

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Última atualização: 17/05/2026 · Em caso de dúvida, fale com qualquer Admin.
          <div className="mt-3">
            <Link to="/" className="text-primary hover:underline">Voltar à home</Link>
          </div>
        </footer>
      </main>

      {/* Ações flutuantes */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card shadow-card hover:bg-muted"
          aria-label="Imprimir"
        >
          <Printer className="h-4 w-4" />
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card shadow-card hover:bg-muted"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {/* Sticky bottom bar pro gate forçado */}
      {force && podeAceitar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Você precisa aceitar o regulamento pra continuar usando o app.
            </p>
            <button
              onClick={aceitar}
              disabled={aceitando}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {aceitando ? "Registrando…" : "Li e aceito"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Secao({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="mb-8 scroll-mt-24">
      <h2 className="mb-3 font-display text-xl font-bold">
        {n}. {titulo}
      </h2>
      <div className="space-y-2 text-foreground/90">{children}</div>
    </section>
  );
}
