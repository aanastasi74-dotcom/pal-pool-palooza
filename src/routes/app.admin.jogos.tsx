import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useMatches, useUpdateMatch } from "@/lib/queries/matches";
import { useTeams } from "@/lib/queries/teams";
import { useStadiums } from "@/lib/queries/stadiums";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/jogos")({
  head: () => ({ meta: [{ title: "Admin — Jogos" }] }),
  component: JogosAdmin,
});

const FASES = [
  { v: "grupos", l: "Fase de grupos" },
  { v: "round_of_32", l: "Round of 32" },
  { v: "oitavas", l: "Oitavas" },
  { v: "quartas", l: "Quartas" },
  { v: "semi", l: "Semifinal" },
  { v: "terceiro_lugar", l: "Disputa de terceiro" },
  { v: "final", l: "Final" },
];
const faseLabel = (v: string) => FASES.find((f) => f.v === v)?.l ?? v;

type MatchRow = any;

function JogosAdmin() {
  const { data: matches, isLoading } = useMatches();
  const { data: teams = [] } = useTeams();
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const [fase, setFase] = useState("todas");
  const [editar, setEditar] = useState<MatchRow | null>(null);

  const todos = matches ?? [];
  const fases = Array.from(new Set(todos.map((j: any) => j.fase)));

  const predicate = useCallback(
    (j: MatchRow, q: string) => {
      if (fase !== "todas" && j.fase !== fase) return false;
      if (!q) return true;
      const casa = (teamMap.get(j.team_home_id)?.nome_pt ?? j.casa ?? "").toLowerCase();
      const fora = (teamMap.get(j.team_away_id)?.nome_pt ?? j.fora ?? "").toLowerCase();
      return casa.includes(q) || fora.includes(q);
    },
    [fase, teamMap],
  );

  const { query, setQuery, page, setPage, totalPages, slice, total, pageSize } = usePaginatedList(todos, predicate, 20);

  const renderConfronto = (j: any) => {
    const home = teamMap.get(j.team_home_id);
    const away = teamMap.get(j.team_away_id);
    if (home && away) return `${home.bandeira_emoji} ${home.nome_pt} × ${away.nome_pt} ${away.bandeira_emoji}`;
    if (j.fase !== "grupos" && (j.slot_casa || j.slot_visitante))
      return `${j.slot_casa ?? "?"} × ${j.slot_visitante ?? "?"}`;
    return `${j.casa ?? "?"} × ${j.fora ?? "?"}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Jogos da Copa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize placares, times de mata-mata e horários.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Os 104 jogos da Copa estão pré-cadastrados. Esta tela permite atualizar placares, times de mata-mata
          (quando a fase resolver) e data/hora (em caso de adiamento). Para alterações estruturais (fase,
          número do jogo, slots ou estádio), use SQL direto.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <select value={fase} onChange={(e) => setFase(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs">
          <option value="todas">Todas as fases</option>
          {fases.map((f: any) => <option key={f} value={f}>{faseLabel(f)}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar seleção…" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
        <span className="text-xs text-muted-foreground">{total} jogo(s) · página {page} de {totalPages}</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : total === 0 ? (
        <EmptyState title="Sem jogos cadastrados" description="Nenhum jogo encontrado." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Fase</th>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Confronto</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Placar</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((j: any) => (
                  <tr key={j.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 text-xs text-muted-foreground">{j.numero_jogo ?? "—"}</td>
                    <td className="p-2 text-xs">{faseLabel(j.fase)}</td>
                    <td className="p-2 text-xs">{new Date(j.data_jogo).toLocaleString("pt-BR")}</td>
                    <td className="p-2 font-medium">{renderConfronto(j)}</td>
                    <td className="p-2 text-xs">{j.status}</td>
                    <td className="p-2 text-right font-display font-bold">
                      {j.placar_casa != null ? `${j.placar_casa} - ${j.placar_fora}` : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={() => setEditar(j)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination total={total} page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      {editar && <EditarJogoDialog jogo={editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

const FASES_KO = new Set(["round_of_32", "oitavas", "quartas", "semi", "terceiro_lugar", "final"]);

function EditarJogoDialog({ jogo, onClose }: { jogo: MatchRow; onClose: () => void }) {
  const [j, setJ] = useState<any>({ ...jogo, data_local: new Date(jogo.data_jogo ?? Date.now()).toISOString().slice(0, 16) });
  const update = useUpdateMatch();
  const { data: teams = [] } = useTeams();
  const { data: stadiums = [] } = useStadiums();
  const isGrupos = j.fase === "grupos";
  const isKO = FASES_KO.has(j.fase);
  const stadium = stadiums.find((s) => s.id === j.stadium_id);

  const placarCasaN = j.placar_casa !== "" && j.placar_casa != null ? Number(j.placar_casa) : null;
  const placarForaN = j.placar_fora !== "" && j.placar_fora != null ? Number(j.placar_fora) : null;
  const prorCasaN = j.placar_casa_prorrogacao !== "" && j.placar_casa_prorrogacao != null ? Number(j.placar_casa_prorrogacao) : null;
  const prorForaN = j.placar_fora_prorrogacao !== "" && j.placar_fora_prorrogacao != null ? Number(j.placar_fora_prorrogacao) : null;

  const tempoNormalEmpate =
    isKO && placarCasaN != null && placarForaN != null && placarCasaN === placarForaN;
  const prorrogacaoEmpate =
    tempoNormalEmpate && prorCasaN != null && prorForaN != null && prorCasaN === prorForaN;

  const jaEstavaEncerradoComPlacar =
    jogo.status === "encerrado" && jogo.placar_casa != null && jogo.placar_fora != null;

  const salvar = async () => {
    if (isGrupos && (!j.team_home_id || !j.team_away_id)) {
      toast.error("Em jogos de grupo, selecione os dois times.");
      return;
    }
    const home = teams.find((t) => t.id === j.team_home_id);
    const away = teams.find((t) => t.id === j.team_away_id);
    const isEncerrado = j.status === "encerrado";
    const pc = isEncerrado ? placarCasaN : null;
    const pf = isEncerrado ? placarForaN : null;
    if (pc != null && (pc < 0 || pc > 20)) { toast.error("Placar deve estar entre 0 e 20"); return; }
    if (pf != null && (pf < 0 || pf > 20)) { toast.error("Placar deve estar entre 0 e 20"); return; }

    // Prorrogação só se mata-mata e tempo normal empate
    let prorC: number | null = null;
    let prorF: number | null = null;
    if (isEncerrado && tempoNormalEmpate) {
      prorC = prorCasaN;
      prorF = prorForaN;
      if (prorC != null && (prorC < 0 || prorC > 20)) { toast.error("Prorrogação deve ser entre 0 e 20"); return; }
      if (prorF != null && (prorF < 0 || prorF > 20)) { toast.error("Prorrogação deve ser entre 0 e 20"); return; }
    }

    // Pênaltis só se prorrogação empatou
    let penC: number | null = null;
    let penF: number | null = null;
    if (isEncerrado && prorrogacaoEmpate) {
      penC = j.penaltis_casa !== "" && j.penaltis_casa != null ? Number(j.penaltis_casa) : null;
      penF = j.penaltis_fora !== "" && j.penaltis_fora != null ? Number(j.penaltis_fora) : null;
      if (penC != null && (penC < 0 || penC > 30)) { toast.error("Pênaltis deve ser entre 0 e 30"); return; }
      if (penF != null && (penF < 0 || penF > 30)) { toast.error("Pênaltis deve ser entre 0 e 30"); return; }
      if (penC != null && penF != null && penC === penF) {
        toast.error("Disputa de pênaltis não pode terminar empatada");
        return;
      }
    }

    if (jaEstavaEncerradoComPlacar && (pc !== jogo.placar_casa || pf !== jogo.placar_fora)) {
      if (!confirm("Esse jogo já foi pontuado. Alterar o placar vai recalcular pontos dos perebas que palpitaram. Continuar?")) return;
    }

    const payload: any = {
      data_jogo: new Date(j.data_local).toISOString(),
      team_home_id: j.team_home_id || null,
      team_away_id: j.team_away_id || null,
      hora_definida: !!j.hora_definida,
      casa: home?.nome_pt ?? j.slot_casa ?? j.casa ?? "",
      fora: away?.nome_pt ?? j.slot_visitante ?? j.fora ?? "",
      status: j.status,
      placar_casa: pc,
      placar_fora: pf,
      placar_casa_prorrogacao: prorC,
      placar_fora_prorrogacao: prorF,
      penaltis_casa: penC,
      penaltis_fora: penF,
    };
    await update.mutateAsync({ id: jogo.id, ...payload });
    toast.success(isEncerrado ? "Placar salvo. Pontuação está sendo recalculada..." : "Jogo salvo.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg space-y-3 overflow-y-auto">
        <DialogHeader><DialogTitle>Editar jogo</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Fase (estrutural)">
            <input value={faseLabel(j.fase)} readOnly className="w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground" />
          </Field>
          <Field label="Número FIFA (estrutural)">
            <input value={j.numero_jogo ?? "—"} readOnly className="w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground" />
          </Field>
          <Field label="Data/hora">
            <input type="datetime-local" value={j.data_local} onChange={(e) => setJ({ ...j, data_local: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
          </Field>
          <Field label="Hora confirmada">
            <select value={String(!!j.hora_definida)} onChange={(e) => setJ({ ...j, hora_definida: e.target.value === "true" })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              <option value="true">Sim</option>
              <option value="false">Não (a definir)</option>
            </select>
          </Field>
          {isGrupos ? (
            <>
              <Field label="Casa">
                <select value={j.team_home_id ?? ""} onChange={(e) => setJ({ ...j, team_home_id: e.target.value || null })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
                  <option value="">— selecione —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.bandeira_emoji} {t.nome_pt} ({t.bracket_position})</option>)}
                </select>
              </Field>
              <Field label="Visitante">
                <select value={j.team_away_id ?? ""} onChange={(e) => setJ({ ...j, team_away_id: e.target.value || null })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
                  <option value="">— selecione —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.bandeira_emoji} {t.nome_pt} ({t.bracket_position})</option>)}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Slot casa (estrutural)">
                <input value={j.slot_casa ?? "—"} readOnly className="w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground" />
              </Field>
              <Field label="Slot visitante (estrutural)">
                <input value={j.slot_visitante ?? "—"} readOnly className="w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground" />
              </Field>
              <Field label="Time da casa (mata-mata)">
                <select value={j.team_home_id ?? ""} onChange={(e) => setJ({ ...j, team_home_id: e.target.value || null })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
                  <option value="">— a definir —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.bandeira_emoji} {t.nome_pt}</option>)}
                </select>
              </Field>
              <Field label="Time visitante (mata-mata)">
                <select value={j.team_away_id ?? ""} onChange={(e) => setJ({ ...j, team_away_id: e.target.value || null })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
                  <option value="">— a definir —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.bandeira_emoji} {t.nome_pt}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Estádio (estrutural)">
            <input
              value={stadium ? `${stadium.nome} — ${stadium.cidade}, ${stadium.pais}` : (j.estadio ?? "—")}
              readOnly
              className="col-span-2 w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground"
            />
          </Field>
          <Field label="Peso (auto)">
            <input
              value={j.peso ?? 10}
              readOnly
              title="Peso é calculado automaticamente pelo dia da Copa."
              className="w-full rounded-lg border border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground"
            />
          </Field>
          <Field label="Status">
            <select value={j.status} onChange={(e) => setJ({ ...j, status: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm">
              <option value="agendado">Agendado</option>
              <option value="ao-vivo">Ao vivo</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
          {j.status === "encerrado" && (
            <>
              <div className="col-span-2 mt-2 rounded-lg border border-border bg-muted/30 p-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                Placar tempo normal (90 + acréscimos)
              </div>
              <Field label="Casa (tempo normal, 0-20)">
                <input type="number" min={0} max={20} step={1} inputMode="numeric" value={j.placar_casa ?? ""} onChange={(e) => setJ({ ...j, placar_casa: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
              </Field>
              <Field label="Visitante (tempo normal, 0-20)">
                <input type="number" min={0} max={20} step={1} inputMode="numeric" value={j.placar_fora ?? ""} onChange={(e) => setJ({ ...j, placar_fora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
              </Field>

              {isKO && tempoNormalEmpate && (
                <>
                  <div className="col-span-2 mt-2 rounded-lg border border-accent/40 bg-accent/10 p-2 text-[10px] uppercase tracking-widest">
                    Prorrogação — gols marcados APENAS na prorrogação (não some com tempo normal)
                  </div>
                  <Field label="Casa (prorrogação)">
                    <input type="number" min={0} max={20} step={1} inputMode="numeric" value={j.placar_casa_prorrogacao ?? ""} onChange={(e) => setJ({ ...j, placar_casa_prorrogacao: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                  </Field>
                  <Field label="Visitante (prorrogação)">
                    <input type="number" min={0} max={20} step={1} inputMode="numeric" value={j.placar_fora_prorrogacao ?? ""} onChange={(e) => setJ({ ...j, placar_fora_prorrogacao: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                  </Field>
                </>
              )}

              {isKO && prorrogacaoEmpate && (
                <>
                  <div className="col-span-2 mt-2 rounded-lg border border-accent/40 bg-accent/10 p-2 text-[10px] uppercase tracking-widest">
                    Disputa de pênaltis
                  </div>
                  <Field label="Casa (pênaltis)">
                    <input type="number" min={0} max={30} step={1} inputMode="numeric" value={j.penaltis_casa ?? ""} onChange={(e) => setJ({ ...j, penaltis_casa: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                  </Field>
                  <Field label="Visitante (pênaltis)">
                    <input type="number" min={0} max={30} step={1} inputMode="numeric" value={j.penaltis_fora ?? ""} onChange={(e) => setJ({ ...j, penaltis_fora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                  </Field>
                </>
              )}

              {jaEstavaEncerradoComPlacar && (
                <p className="col-span-2 text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠️ Jogo já foi pontuado. Alterar placar recalcula pontos automaticamente.
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-bold">Cancelar</button>
          <button onClick={salvar} className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Salvar</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}
