import { Lock } from "lucide-react";

export function CopaArquivadaBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>Copa 2026 arquivada — somente leitura.</span>
    </div>
  );
}
