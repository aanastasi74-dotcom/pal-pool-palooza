import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const LS_KEY = "esclarecimento_empate_visto_v1";

export function EsclarecimentoEmpateDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(LS_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, "true");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Esclarecimento sobre a pontuação por placar
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <p>
                Pereba, notamos que a regra de empate na pontuação podia gerar dúvida no regulamento — então acrescentamos dois exemplos pra deixar cristalino. <strong>Sem mudança de regra, é só esclarecimento.</strong>
              </p>
              <p>
                Palpitou empate e foi vitória (ou o contrário) → <strong>0 pontos</strong>. Os critérios secundários (resultado, diferença de gols, gols de um time) só contam quando você acerta o resultado (vitória da casa, empate ou vitória do visitante).
              </p>
              <p>
                Palpitou empate e foi empate (com placar diferente) → você pontua. Ex.: palpite 1×1, jogo 2×2 → <strong>6 pts × peso</strong> (resultado certo + diferença igual).
              </p>
              <Link
                to="/regras"
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                Reler o regulamento completo
              </Link>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            OK, entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
