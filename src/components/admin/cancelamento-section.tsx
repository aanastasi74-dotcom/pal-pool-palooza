import { useState } from "react";
import { AlertTriangle, ChevronDown, Mail, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/queries/admin-financeiro";
import { COMPROVANTE_ACCEPT, validarComprovanteDevolucao } from "@/lib/queries/admin-financial-rules";
import {
  type Devolucao,
  JaEnviadoError,
  STATUS_CANCELAVEIS,
  useCancelarCompeticao,
  useCompeticaoStatus,
  useDevolucoes,
  useEnviarEmailCancelamento,
  useRegistrarDevolucao,
} from "@/lib/queries/admin-cancelamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CancelamentoSection({ slug }: { slug: string }) {
  const { data: comp, isLoading } = useCompeticaoStatus(slug);
  if (isLoading || !comp) return null;
  if (STATUS_CANCELAVEIS.includes(comp.status)) return <ZonaPerigo slug={slug} nome={comp.nome} />;
  if (comp.status === "cancelada") return <ChecklistDevolucoes slug={slug} />;
  return null;
}

function ZonaPerigo({ slug, nome }: { slug: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirmSlug, setConfirmSlug] = useState("");
  const cancelar = useCancelarCompeticao(slug);
  const motivoOk = motivo.trim().length >= 10;
  const pode = motivoOk && confirmSlug.trim() === slug && !cancelar.isPending;

  const confirmar = async () => {
    try {
      const r = await cancelar.mutateAsync(motivo.trim());
      toast.success(`${nome} cancelada — ${r.perebas} pereba${r.perebas === 1 ? "" : "s"}, ${brl(r.total)} a devolver.`);
      setDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar");
    }
  };

  return (
    <section className="rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-destructive"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">Zona de perigo</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Cancelar encerra a competição definitivamente e abre o checklist de devoluções a quem pagou.
          </p>
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setMotivo("");
              setConfirmSlug("");
              setDialog(true);
            }}
          >
            Cancelar competição…
          </Button>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={(v) => !cancelar.isPending && setDialog(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar {nome}?</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Inscrições, palpites e ranking param; todo valor pago precisa ser
              devolvido manualmente aos perebas pelo checklist que vai aparecer aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Motivo (mín. 10 caracteres)</label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              {!motivoOk && motivo.length > 0 && (
                <p className="text-xs text-destructive">Faltam {10 - motivo.trim().length} caracteres.</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Digite <code className="rounded bg-muted px-1 font-mono break-all">{slug}</code> para confirmar
              </label>
              <Input value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} disabled={cancelar.isPending}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={!pode} onClick={confirmar}>
              {cancelar.isPending ? "Cancelando..." : "Cancelar competição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ChecklistDevolucoes({ slug }: { slug: string }) {
  const { data = [], isLoading, error } = useDevolucoes(slug, true);
  const registrar = useRegistrarDevolucao(slug);
  const enviar = useEnviarEmailCancelamento(slug);
  const [alvo, setAlvo] = useState<Devolucao | null>(null);
  const [valor, setValor] = useState("");
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [motivoEmail, setMotivoEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);

  const devolvidos = data.filter((d) => d.saldo_a_devolver <= 0.001).length;
  const saldoTotal = data.reduce((s, d) => s + d.saldo_a_devolver, 0);

  const salvar = async () => {
    if (!alvo) return;
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return toast.error("Informe um valor maior que zero");
    if (v > alvo.saldo_a_devolver + 0.001) return toast.error(`O valor excede o saldo (${brl(alvo.saldo_a_devolver)})`);
    try {
      validarComprovanteDevolucao(comprovante);
      if (!comprovante) return;
      const r = await registrar.mutateAsync({ userId: alvo.user_id, valor: v, comprovante });
      if (r.emailEnviado) toast.success("Devolução registrada e pereba avisado por e-mail (comprovante anexado)");
      else toast.warning("Devolução registrada, mas o e-mail falhou");
      setAlvo(null);
      setComprovante(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível registrar");
    }
  };

  const disparar = async (force: boolean) => {
    try {
      const r = await enviar.mutateAsync({ motivo: motivoEmail.trim(), force });
      if (r.falhas > 0) toast.warning(`${r.enviados} e-mails enviados, ${r.falhas} falharam.`);
      else toast.success(`${r.enviados} e-mails de cancelamento enviados.`);
    } catch (e) {
      if (e instanceof JaEnviadoError) setConfirmForce(true);
      else toast.error(e instanceof Error ? e.message : "Falha ao enviar e-mails");
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Undo2 className="h-4 w-4 shrink-0 text-destructive" />
        <h2 className="font-display text-lg font-bold">Devoluções (competição cancelada)</h2>
      </div>

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar"}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold">
              {devolvidos} de {data.length} devolvidos
            </span>
            <span className="text-muted-foreground">Falta devolver: {brl(saldoTotal)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${data.length ? (devolvidos / data.length) * 100 : 100}%` }}
            />
          </div>

          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém pagou — nada a devolver.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((d) => (
                <li key={d.user_id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{d.apelido ?? d.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Pago {brl(d.pago)} · Devolvido {brl(d.devolvido)}
                    </p>
                  </div>
                  <span
                    className={`font-display font-bold ${d.saldo_a_devolver > 0.001 ? "text-destructive" : "text-success"}`}
                  >
                    {d.saldo_a_devolver > 0.001 ? brl(d.saldo_a_devolver) : "Quitado"}
                  </span>
                  {d.saldo_a_devolver > 0.001 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAlvo(d);
                        setValor(d.saldo_a_devolver.toFixed(2));
                        setComprovante(null);
                      }}
                    >
                      Registrar devolução feita
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-xs font-semibold">Motivo para o e-mail</label>
            <Textarea value={motivoEmail} onChange={(e) => setMotivoEmail(e.target.value)} rows={2} />
            <Button
              variant="outline"
              disabled={motivoEmail.trim().length < 3 || enviar.isPending}
              onClick={() => setConfirmEmail(true)}
            >
              <Mail className="mr-1 h-4 w-4" />
              {enviar.isPending ? "Enviando..." : "Enviar e-mail de cancelamento"}
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!alvo} onOpenChange={(v) => !v && !registrar.isPending && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>
              {alvo?.apelido ?? alvo?.nome} — saldo {alvo ? brl(alvo.saldo_a_devolver) : ""}
              <span className="mt-2 block">Anexe o comprovante do PIX que você JÁ FEZ — o registro entra no caixa e o pereba recebe o e-mail com o comprovante.</span>
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-sm">
            <span>Valor devolvido (R$)</span>
            <Input inputMode="decimal" value={valor} disabled={registrar.isPending} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Comprovante do PIX (obrigatório)</span>
            <Input type="file" accept={COMPROVANTE_ACCEPT} disabled={registrar.isPending} onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setComprovante(null);
              if (!file) return;
              try {
                validarComprovanteDevolucao(file);
                setComprovante(file);
              } catch (error) {
                e.target.value = "";
                toast.error(error instanceof Error ? error.message : "Comprovante inválido");
              }
            }} />
            <span className="block text-xs text-muted-foreground">PNG, JPG ou PDF · até 5 MB</span>
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlvo(null)} disabled={registrar.isPending}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!comprovante || registrar.isPending}>
              {registrar.isPending ? "Salvando..." : "Registrar devolução feita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmEmail}
        onOpenChange={setConfirmEmail}
        title="Enviar e-mail de cancelamento?"
        description="Todos que pagaram vão receber o aviso com o motivo e o valor individual a devolver."
        confirmLabel="Enviar"
        destructive={false}
        onConfirm={() => disparar(false)}
      />
      <ConfirmDialog
        open={confirmForce}
        onOpenChange={setConfirmForce}
        title="E-mail já enviado"
        description="O e-mail de cancelamento já foi enviado antes. Quer reenviar para todos que pagaram?"
        confirmLabel="Reenviar"
        onConfirm={() => disparar(true)}
      />
    </section>
  );
}
