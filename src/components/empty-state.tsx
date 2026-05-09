import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  cta,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <h3 className="font-display text-lg font-bold text-destructive">Algo deu ruim, perebada</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message ?? "Não foi possível carregar essas informações agora."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
          Tentar de novo
        </button>
      )}
    </div>
  );
}
