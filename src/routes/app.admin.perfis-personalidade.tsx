import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { UserCog, Save } from "lucide-react";
import { usePerfisPersonalidade, useSalvarPerfilPersonalidade } from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/admin/perfis-personalidade")({
  head: () => ({ meta: [{ title: "Admin — Perfis de personalidade" }] }),
  component: PerfisPersonalidade,
});

function PerfisPersonalidade() {
  const { data: perfis, isLoading } = usePerfisPersonalidade();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Perfis de personalidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione observações sobre cada pereba (ex: "o cartesiano do grupo", "sempre aposta empate").
          Isso entra no contexto do boletim diário pra personalizar a zoeira.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-2">
          {(perfis ?? []).map((p: any) => (
            <PerfilRow key={p.profile_id} perfil={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PerfilRow({ perfil }: { perfil: any }) {
  const salvar = useSalvarPerfilPersonalidade();
  const [valor, setValor] = useState(perfil.descricao ?? "");
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValor(perfil.descricao ?? "");
    setDirty(false);
  }, [perfil.profile_id, perfil.descricao]);

  const persistir = async (next: string) => {
    try {
      await salvar.mutateAsync({ profile_id: perfil.profile_id, descricao: next });
      setDirty(false);
    } catch (e: any) {
      toast.error(`Erro ao salvar ${perfil.apelido}: ${e?.message ?? ""}`);
    }
  };

  const onChange = (v: string) => {
    setValor(v);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persistir(v), 1000);
  };

  const onBlur = () => {
    if (dirty) {
      if (timer.current) clearTimeout(timer.current);
      persistir(valor);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10">
            <UserCog className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-display text-sm font-bold">{perfil.apelido ?? perfil.nome}</p>
            <p className="text-[10px] text-muted-foreground">{perfil.nome}</p>
          </div>
        </div>
        {dirty ? (
          <span className="text-[10px] text-accent">salvando…</span>
        ) : perfil.atualizado_em ? (
          <span className="flex items-center gap-1 text-[10px] text-success">
            <Save className="h-3 w-3" /> salvo
          </span>
        ) : null}
      </div>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Ex: o cartesiano do grupo, sempre escolhe placar mínimo."
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
