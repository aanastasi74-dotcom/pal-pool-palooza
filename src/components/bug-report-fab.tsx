import { useState } from "react";
import { Bug } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { currentUser, reportes, type Reporte } from "@/lib/mock-data";
import { toast } from "sonner";

type Severidade = Reporte["severidade"];

export function BugReportFAB() {
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [severidade, setSeveridade] = useState<Severidade>("importante");

  const enviar = () => {
    if (!descricao.trim()) {
      toast.error("Conta o que aconteceu, peraba.");
      return;
    }
    const novo: Reporte = {
      id: `r${Date.now()}`,
      descricao: descricao.trim(),
      url: typeof window !== "undefined" ? window.location.pathname : "",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      autor: currentUser.nome,
      data: new Date().toLocaleString("pt-BR"),
      severidade,
      status: "aberto",
    };
    reportes.unshift(novo);
    toast.success("Reporte enviado, peraba!");
    setDescricao("");
    setSeveridade("importante");
    setOpen(false);
  };

  const url = typeof window !== "undefined" ? window.location.pathname : "—";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "—";

  return (
    <>
      <button
        aria-label="Reportar problema"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-glow transition hover:scale-105 md:bottom-6"
      >
        <Bug className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar problema</DialogTitle>
            <DialogDescription>Conta o que tá quebrado que a gente arruma, peraba.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold">Descrição</label>
              <Textarea
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que aconteceu? O que você esperava?"
              />
            </div>
            <div>
              <label className="text-xs font-bold">Severidade</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["critico", "importante", "menor"] as Severidade[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeveridade(s)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize transition ${
                      severidade === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {s === "critico" ? "Crítico" : s === "importante" ? "Importante" : "Menor"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Crítico = afeta pontos/financeiro · Importante = quebrou em parte · Menor = cosmético/UX.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
              <p><strong>URL:</strong> {url}</p>
              <p><strong>Usuário:</strong> {currentUser.nome} ({currentUser.role})</p>
              <p className="truncate"><strong>Navegador:</strong> {ua}</p>
              <p><strong>Quando:</strong> {new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={enviar}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
