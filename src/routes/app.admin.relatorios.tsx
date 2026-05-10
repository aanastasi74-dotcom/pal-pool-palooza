import { createFileRoute } from "@tanstack/react-router";
import { FileText, Users, Wallet, Trophy, Download, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { ranking } from "@/lib/mock-data";
import { isElegivelLanterna, distribuicaoSemLanterna } from "@/lib/lanterninha";

export const Route = createFileRoute("/app/admin/relatorios")({
  head: () => ({ meta: [{ title: "Admin — Relatórios" }] }),
  component: Relatorios,
});

const cards = [
  { icon: Wallet, title: "Relatório financeiro completo", desc: "Pagamentos, status, conciliação e totais." },
  { icon: Users, title: "Relatório por participante", desc: "Quotas, pagamentos, palpites e pontos por usuário." },
  { icon: FileText, title: "Relatório por quota", desc: "Detalhamento individual de cada quota e desempenho." },
];

function Relatorios() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Relatórios e exportação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Baixe os números pra registrar a história da perebada.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold">{c.title}</h3>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => toast.success(`${c.title} — CSV gerado, peraba!`)} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-bold">
                <Download className="h-3 w-3" /> CSV
              </button>
              <button onClick={() => toast.success(`${c.title} — PDF gerado, peraba!`)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                <Download className="h-3 w-3" /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <FechamentoCopa />
    </div>
  );
}

function FechamentoCopa() {
  const ordenado = [...ranking].sort((a, b) => a.pontos - b.pontos);
  const ultimo = ordenado[0];
  const primeiroElegivel = ordenado.find((p) => isElegivelLanterna(p));
  const ninguemElegivel = !primeiroElegivel;
  const dist = ninguemElegivel ? distribuicaoSemLanterna() : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display font-bold">Fechamento da Copa</h3>
          <p className="text-xs text-muted-foreground">PDF final com cálculo do prêmio, podium, lanterninha e auditoria.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-secondary/50 p-3 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Lightbulb className="h-3.5 w-3.5 rotate-180" /> Decisão da regra do lanterninha
        </div>
        {ninguemElegivel ? (
          <p className="text-muted-foreground">
            Nenhuma quota atendeu aos critérios. Os 5% serão redistribuídos: 1º {dist!.primeiro}% · 2º {dist!.segundo}% · 3º {dist!.terceiro}%.
          </p>
        ) : ultimo?.id === primeiroElegivel?.id ? (
          <p className="text-muted-foreground">
            Lanterninha vai para <span className="font-semibold text-foreground">{primeiroElegivel?.nome}</span> (último colocado, atende aos critérios).
          </p>
        ) : (
          <p className="text-muted-foreground">
            Último colocado <span className="font-semibold text-foreground">{ultimo?.nome}</span> não atende. Prêmio sobe para <span className="font-semibold text-foreground">{primeiroElegivel?.nome}</span>.
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => toast.success("Fechamento da Copa — CSV gerado, peraba!")} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-bold">
          <Download className="h-3 w-3" /> CSV
        </button>
        <button onClick={() => toast.success("Fechamento da Copa — PDF gerado com a decisão do lanterninha documentada.")} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
          <Download className="h-3 w-3" /> PDF
        </button>
      </div>
    </div>
  );
}
