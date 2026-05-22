import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, useUpdateSetting } from "@/lib/queries/settings";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/admin/sync")({
  head: () => ({ meta: [{ title: "Admin — Sync de placares" }] }),
  component: SyncPage,
});

function asString(v: any, fb: string) {
  if (v === null || v === undefined) return fb;
  if (typeof v === "string") return v;
  try { return String(v); } catch { return fb; }
}

async function invokeSync(action: string) {
  const { data, error } = await supabase.functions.invoke("sync-match-scores", {
    body: { action },
  });
  if (error) throw error;
  return data;
}

function SyncPage() {
  const { data: settings, refetch: refetchSettings } = useSettings();
  const update = useUpdateSetting();
  const qc = useQueryClient();

  const ativo = settings?.sync_ativo === true;
  const modo = asString(settings?.sync_modo, "shadow");
  const season = asString(settings?.sync_season, "2022");
  const modoTeste = settings?.sync_modo_teste === true;
  const ultima = settings?.sync_ultima_execucao
    ? new Date(asString(settings.sync_ultima_execucao, "")).toLocaleString("pt-BR")
    : "—";

  const [confirmLive, setConfirmLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapResult, setMapResult] = useState<any[] | null>(null);
  const [testeResult, setTesteResult] = useState<any[] | null>(null);

  const logs = useQuery({
    queryKey: ["sync_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sync_logs")
        .select("*")
        .order("executado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const teams = useQuery({
    queryKey: ["teams_codigo_api"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("teams")
        .select("id,nome_pt,bandeira_emoji,codigo_api")
        .order("nome_pt");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggleAtivo(v: boolean) {
    await update.mutateAsync({ key: "sync_ativo", value: v });
    toast.success(v ? "Sync ligado" : "Sync desligado");
  }
  async function changeModo(novo: "shadow" | "live") {
    await update.mutateAsync({ key: "sync_modo", value: novo });
    toast.success(`Modo: ${novo}`);
  }
  async function changeSeason(novo: string) {
    await update.mutateAsync({ key: "sync_season", value: novo });
    toast.success(`Season: ${novo}`);
  }

  async function run(action: string, label: string) {
    setBusy(true);
    try {
      const r = await invokeSync(action);
      toast.success(`${label}: ok`);
      if (action === "mapear") setMapResult(r?.resultado ?? []);
      if (action === "teste") setTesteResult(r?.detalhe ?? []);
      await refetchSettings();
      qc.invalidateQueries({ queryKey: ["sync_logs"] });
      qc.invalidateQueries({ queryKey: ["teams_codigo_api"] });
    } catch (e: any) {
      toast.error(`${label}: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveCodigoApi(teamId: string, codigo: number | null) {
    const { error } = await (supabase as any)
      .from("teams")
      .update({ codigo_api: codigo })
      .eq("id", teamId);
    if (error) toast.error(error.message);
    else {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["teams_codigo_api"] });
    }
  }

  const naoMapeados = useMemo(
    () => (teams.data ?? []).filter((t: any) => !t.codigo_api).length,
    [teams.data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Sincronização de placares</h1>
        <p className="text-sm text-muted-foreground">
          Puxa placares da API-Football automaticamente. Cron roda a cada 1 min;
          só age quando <code>sync_ativo</code> está ligado.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Última execução:</span> <strong>{ultima}</strong></div>
            <div><span className="text-muted-foreground">Modo atual:</span> <Badge variant={modo === "live" ? "default" : "secondary"}>{modo}</Badge></div>
            <div><span className="text-muted-foreground">Season:</span> <strong>{season}</strong></div>
            <div><span className="text-muted-foreground">Sync ativo:</span> <Badge variant={ativo ? "default" : "outline"}>{ativo ? "ligado" : "desligado"}</Badge></div>
            <div><span className="text-muted-foreground">Times sem código:</span> <strong>{naoMapeados}</strong></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">Sync automático</p>
                <p className="text-xs text-muted-foreground">Cron de 1 min; só age se ligado.</p>
              </div>
              <Switch checked={ativo} onCheckedChange={toggleAtivo} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">Modo live</p>
                <p className="text-xs text-muted-foreground">Shadow só registra; live escreve em matches.</p>
              </div>
              <Switch
                checked={modo === "live"}
                onCheckedChange={(v) => v ? setConfirmLive(true) : changeModo("shadow")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-24">Season</Label>
              <select
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                value={season}
                onChange={(e) => changeSeason(e.target.value)}
              >
                <option value="2022">2022 (teste)</option>
                <option value="2026">2026 (oficial)</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => run("manual", "Sync manual")}>Sincronizar agora</Button>
              <Button disabled={busy} variant="secondary" onClick={() => run("mapear", "Mapear times")}>Mapear times</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {modoTeste && (
        <Card>
          <CardHeader><CardTitle>Painel de teste — Copa 2022</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button disabled={busy} onClick={() => run("teste", "Teste 2022")}>
              Testar com dados de 2022
            </Button>
            {testeResult && (
              <div className="max-h-[500px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Casa</TableHead>
                      <TableHead>Fora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>FT (cru)</TableHead>
                      <TableHead>ET (cru)</TableHead>
                      <TableHead>PEN (cru)</TableHead>
                      <TableHead>Derivado normal</TableHead>
                      <TableHead>Derivado prorr.</TableHead>
                      <TableHead>Derivado pênaltis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testeResult.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.home}</TableCell>
                        <TableCell>{r.away}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell>{r.raw.fulltime?.home ?? "—"}×{r.raw.fulltime?.away ?? "—"}</TableCell>
                        <TableCell>{r.raw.extratime?.home ?? "—"}×{r.raw.extratime?.away ?? "—"}</TableCell>
                        <TableCell>{r.raw.penalty?.home ?? "—"}×{r.raw.penalty?.away ?? "—"}</TableCell>
                        <TableCell className="font-mono">{r.derivado.placar_casa ?? "—"}×{r.derivado.placar_fora ?? "—"}</TableCell>
                        <TableCell className="font-mono">{r.derivado.placar_casa_prorrogacao ?? "—"}×{r.derivado.placar_fora_prorrogacao ?? "—"}</TableCell>
                        <TableCell className="font-mono">{r.derivado.penaltis_casa ?? "—"}×{r.derivado.penaltis_fora ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mapeamento de times</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>codigo_api</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(teams.data ?? []).map((t: any) => (
                  <TableRow key={t.id} className={!t.codigo_api ? "bg-destructive/5" : ""}>
                    <TableCell>{t.bandeira_emoji} {t.nome_pt}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={t.codigo_api ?? ""}
                        className="h-8 w-28"
                        onBlur={(e) => {
                          const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                          if ((v ?? null) !== (t.codigo_api ?? null)) saveCodigoApi(t.id, v);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {t.codigo_api ? <Badge>✅ mapeado</Badge> : <Badge variant="destructive">⚠️ pendente</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {mapResult && (
            <p className="mt-3 text-xs text-muted-foreground">
              Última execução de "Mapear times": {mapResult.filter((r) => r.casado).length}/{mapResult.length} casados.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico ({logs.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Verif.</TableHead>
                  <TableHead>Atual.</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead>ms</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs.data ?? []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{new Date(l.executado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{l.modo}</Badge></TableCell>
                    <TableCell>{l.season ?? "—"}</TableCell>
                    <TableCell>{l.jogos_verificados}</TableCell>
                    <TableCell>{l.jogos_atualizados}</TableCell>
                    <TableCell>{l.chamadas_api}</TableCell>
                    <TableCell>{l.duracao_ms}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-destructive">{l.erro ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmLive} onOpenChange={setConfirmLive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar modo LIVE?</AlertDialogTitle>
            <AlertDialogDescription>
              No modo live, a função escreve os placares direto na tabela <code>matches</code>
              e dispara o recálculo de pontos. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => changeModo("live")}>Ativar live</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
