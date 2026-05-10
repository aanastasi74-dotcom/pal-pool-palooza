import { useEffect, useMemo, useState } from "react";

export function usePaginatedList<T>(
  items: T[],
  predicate: (item: T, query: string) => boolean,
  pageSize = 20,
) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => items.filter((it) => predicate(it, query.toLowerCase())),
    [items, query, predicate],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, items.length]);

  const start = (safePage - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    totalPages,
    slice,
    total: filtered.length,
    pageSize,
  };
}
