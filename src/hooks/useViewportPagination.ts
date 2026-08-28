"use client";

import { useEffect, useMemo, useState } from "react";

function getPageSize(): number {
  if (typeof window === "undefined") return 8;
  return window.matchMedia("(min-width: 768px)").matches ? 8 : 5;
}

export function useViewportPagination<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(getPageSize);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPageSize(mq.matches ? 8 : 5);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [items.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginatedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    paginatedItems,
    page: safePage,
    totalPages,
    pageSize,
    totalItems: items.length,
    hasPrev: safePage > 0,
    hasNext: safePage < totalPages - 1,
    prev: () => setPage((p) => Math.max(0, p - 1)),
    next: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
  };
}
