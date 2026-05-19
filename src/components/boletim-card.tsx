import { Link } from "@tanstack/react-router";
import { Newspaper, Share2, ArrowRight } from "lucide-react";
import { useBoletimPublicadoMaisRecente } from "@/lib/queries/boletins-l1";
import { Skeleton } from "@/components/ui/skeleton";

export function BoletimCard() {
  const { data: boletim, isLoading } = useBoletimPublicadoMaisRecente();

  if (isLoading) return <Skeleton className="h-44" />;

  if (!boletim) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Newspaper className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-widest">Boletim</p>
        </div>
        <p className="mt-2 text-sm">
          Próximo boletim sai às 22h dos dias com jogos da Copa. Fica de olho, pereba.
        </p>
      </div>
    );
  }

  const dataFmt = new Date(`${boletim.data_referencia}T12:00:00`).toLocaleDateString("pt-BR");
  const preview = (boletim.publicado_md ?? "").replace(/^#+\s*/gm, "").slice(0, 200);

  const compartilhar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cabec = `📰 Boletim do dia ${dataFmt}\n\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(cabec + (boletim.publicado_md ?? ""))}`;
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Newspaper className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-widest">Boletim do dia {dataFmt}</p>
        </div>
        <button
          onClick={compartilhar}
          className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-1 text-[10px] font-bold text-success"
        >
          <Share2 className="h-3 w-3" /> WhatsApp
        </button>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{preview}…</p>
      <Link
        to="/app/boletim/$data"
        params={{ data: boletim.data_referencia }}
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary"
      >
        Ler completo <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
