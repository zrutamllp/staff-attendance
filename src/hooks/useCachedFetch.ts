"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

interface UseCachedFetchOptions<T> {
  initialData?: T;
  enabled?: boolean;
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  { initialData, enabled = true }: UseCachedFetchOptions<T> = {}
) {
  const cacheRef = useRef(new Map<string, T>());
  const seededRef = useRef(false);
  const [data, setData] = useState<T | undefined>(() => {
    if (initialData !== undefined) {
      cacheRef.current.set(cacheKey, initialData);
      seededRef.current = true;
      return initialData;
    }
    return cacheRef.current.get(cacheKey);
  });
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetcher();
      cacheRef.current.set(cacheKey, result);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [cacheKey, fetcher]);

  useEffect(() => {
    if (!enabled) return;

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }

    if (initialData !== undefined && !seededRef.current) {
      cacheRef.current.set(cacheKey, initialData);
      seededRef.current = true;
      setData(initialData);
      return;
    }

    load();
  }, [cacheKey, enabled, initialData, load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    data,
    error,
    isRefreshing,
    isInitialLoading: data === undefined && isRefreshing,
    refresh,
    setData,
  };
}
