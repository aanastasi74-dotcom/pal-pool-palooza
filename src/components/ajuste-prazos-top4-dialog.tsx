import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, FileText } from "lucide-react";

// N.38 — Aviso de ajuste dos prazos da §8 do Top 4.
const FIM_JANELA_1 = new Date("2026-06-28T12:00:00-03:00");
const INICIO_JANELA_2 = new Date("2026-07-03T00:00:00-03:00");
const FIM_JANELA_2 = new Date("2026-07-04T12:00:00-03:00");

const LS_KEYS = {
  1: "ajuste_prazos_top4_janela_1_visto",
  2: "ajuste_prazos_top4_janela_2_visto",
} as const;

function detectarJanela(agora: Date): 1 | 2 | null {
  if (agora < FIM_JANELA_1) return 1;
  if (agora >= INICIO_JANELA_2 && agora < FIM_JANELA_2) return 2;
  return null;
}

export function AjustePrazosTop4Dialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [janela, setJanela] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const j = detectarJanela(new Date());
    if (!j) return;
    const visto = window.localStorage.getItem(LS_KEYS[j]);
    if (!visto) {
      setJanela(j);
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    if (janela && typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEYS[janela], "true");
    }
    setOpen(false);
  };

  if (!janela) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pereba, novo prazo do Top 4!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <p>Os prazos finais dos marcos da §8 foram ajustados:</p>
              <ul className="space-y-2 pl-4">
                <li>
                  <strong className="text-foreground">Antes do início do Round of 32:</strong> termina <strong>28/06 às 12:00 BRT</strong> (não mais 23:59 de 27/06).
                </li>
                <li>
                  <strong className="text-foreground">Antes do início das oitavas:</strong> termina <strong>04/07 às 12:00 BRT</strong> (não mais 23:59 de 03/07) — esse será o último prazo de ajuste.
                </li>
              </ul>
              <p>
                Razão: o prazo antigo terminava antes do final da fase posterior, no meio dos últimos jogos da fase, contrariando o espírito da regra.
              </p>
              <p>
                Se quiser ajustar teu Top 4, ainda tem tempo. Lembre-se que alterar custa pontos. Confira o impacto antes de salvar.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => { dismiss(); navigate({ to: "/regras" }); }}
          >
            <FileText className="mr-2 h-4 w-4" /> Ver regulamento
          </Button>
          <Button onClick={dismiss}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
