import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function DataTablePagination({ total, page, totalPages, pageSize, onPageChange }: Props) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 text-xs text-muted-foreground">
      <span>
        Página {page} de {totalPages} · {total} item{total > 1 ? "s" : ""} ({pageSize}/página)
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3 w-3" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Próxima <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
