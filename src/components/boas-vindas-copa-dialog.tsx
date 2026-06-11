import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

const LS_KEY = "boas_vindas_copa_visto_v1";

export function BoasVindasCopaDialog() {
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
            <PartyPopper className="h-5 w-5 text-primary" />
            Bem-vindos à Copa, perebada!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <p>
                A bola já está rolando. Dois recados rápidos antes de mergulhar nos palpites:
              </p>
              <p>
                Esse app é nossa primeira casa, feita por perebas, para perebas. Como toda estreia, pode dar uns esbarrões pelo caminho. Se notar qualquer coisa estranha, é só usar o botão <strong>"Reportar Problema"</strong> ali no canto da tela — a gente ajusta no embalo.
              </p>
              <p>
                E o que mais importa: bolão é entre amigos. Vai ter zoeira, vai ter palpite do louco, vai ter lágrima de quem confiou demais. O que vale mesmo é se divertir junto.
              </p>
              <p className="font-semibold text-foreground">
                Boa Copa!
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            Bora!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
