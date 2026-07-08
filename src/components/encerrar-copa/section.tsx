import { ReactNode, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Lock } from "lucide-react";

type Props = {
  num: number;
  label: string;
  done?: boolean;
  disabled?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Section({ num, label, done, disabled, defaultOpen, children }: Props) {
  const initialOpen = defaultOpen ?? (!done && !disabled);
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => {
    setOpen(defaultOpen ?? (!done && !disabled));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, disabled]);

  const state = disabled ? "disabled" : done ? "done" : "active";

  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-card transition ${
        state === "disabled"
          ? "border-border bg-card/50 opacity-60"
          : state === "done"
            ? "border-success/40 bg-card"
            : "border-accent bg-card"
      }`}
    >
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-bold ${
            state === "done"
              ? "bg-success text-success-foreground"
              : state === "disabled"
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground"
          }`}
        >
          {state === "done" ? <Check className="h-4 w-4" /> : state === "disabled" ? <Lock className="h-4 w-4" /> : num}
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-bold">
            Etapa {num} — {label}
          </p>
          {state === "done" && <p className="text-xs text-success">Concluída</p>}
          {state === "disabled" && (
            <p className="text-xs text-muted-foreground">Aguardando etapa anterior</p>
          )}
        </div>
        {!disabled && (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </button>
      {open && !disabled && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}
