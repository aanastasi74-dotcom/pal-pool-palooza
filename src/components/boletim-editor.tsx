import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function BoletimEditor({
  open,
  onOpenChange,
  initial,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: string;
  onPublish: (final: string, original: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar boletim antes de publicar</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Sua edição é salva como exemplo pra perebada — a próxima geração aprende com o seu tom.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full rounded-2xl border border-border bg-secondary p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onPublish(text, initial);
              onOpenChange(false);
              toast.success("Boletim publicado pra perebada!");
            }}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
          >
            Publicar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
