import { useMaintenanceMode } from "@/hooks/use-maintenance";
import { AlertTriangle } from "lucide-react";

export function MaintenanceBanner() {
  const { readOnly } = useMaintenanceMode();
  if (!readOnly) return null;
  return (
    <div className="border-b border-yellow-500/40 bg-yellow-500/15 px-4 py-2 text-center text-xs font-semibold text-yellow-900 dark:text-yellow-200">
      <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
      Bolão em modo somente leitura — atualizando a perebada. Volta já.
    </div>
  );
}
