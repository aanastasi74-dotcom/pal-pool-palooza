import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePesquisaAtiva, useMinhaParticipacao, useUpsertParticipacao } from "@/lib/queries/pesquisas";

export function PesquisaPopup() {
  const navigate = useNavigate();
  const { data: pesquisa } = usePesquisaAtiva();
  const { data: participacao, isLoading: loadingParticipacao } = useMinhaParticipacao(pesquisa?.id);
  const upsert = useUpsertParticipacao();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pesquisa) return;
    if (loadingParticipacao) return;   // aguarda a query resolver antes de decidir
    if (participacao?.status === "concluida" || participacao?.status === "opt_out") {
      setOpen(false);
      return;
    }
    if (participacao?.lembrar_depois_em && new Date(participacao.lembrar_depois_em) > new Date()) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [pesquisa, participacao, loadingParticipacao]);

  if (!pesquisa) return null;

  const responderAgora = async () => {
    try {
      await upsert.mutateAsync({
        pesquisa_id: pesquisa.id,
        status: "iniciada",
      });
      setOpen(false);
      navigate({ to: "/app/pesquisa/$slug", params: { slug: pesquisa.slug } });
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };

  const lembrarAmanha = async () => {
    try {
      const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await upsert.mutateAsync({
        pesquisa_id: pesquisa.id,
        status: "iniciada",
        lembrar_depois_em: amanha,
      });
      setOpen(false);
      toast.info("Combinado — te lembramos amanhã.");
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };

  const optOut = async () => {
    try {
      await upsert.mutateAsync({
        pesquisa_id: pesquisa.id,
        status: "opt_out",
      });
      setOpen(false);
      toast.info("Ok, não perguntamos mais. Se mudar de ideia, é só ir em Perfil.");
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            {pesquisa.titulo}
          </DialogTitle>
          <DialogDescription>
            {pesquisa.descricao}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <button
            onClick={responderAgora}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Responder agora
          </button>
          <button
            onClick={lembrarAmanha}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-bold text-foreground hover:bg-muted/40"
          >
            Lembrar amanhã
          </button>
          <button
            onClick={optOut}
            className="rounded-full px-5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Não me pergunte de novo
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Você pode responder depois em Perfil → Pesquisa.
        </p>
      </DialogContent>
    </Dialog>
  );
}
