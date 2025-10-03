// src/hooks/usePaginatedList.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * usePaginatedList
 * Maneja listas paginadas con dos modos:
 *  - "page": usa page + pageSize/limit
 *  - "cursor": usa cursor/nextCursor (o el campo que definas)
 *
 * Requiere un `fetcher` que devuelva la data cruda del backend.
 * Puedes mapear la respuesta con `getItems`, `getNext`, `getHasMore`.
 *
 * Ejemplo de fetcher (con tu api.fetchJson):
 *   const fetcher = ({ page, pageSize, params }) =>
 *     api.fetchJson("/services", { query: { page, limit: pageSize, ...params }});
 */
export default function usePaginatedList({
  // Función que realiza la solicitud. Debe aceptar { page, pageSize, cursor, params, signal }
  fetcher,
  mode = "page", // "page" | "cursor"
  pageSize = 20,
  initialPage = 1,
  initialCursor = null,

  // Mapeadores de respuesta
  getItems = (res) => res?.items ?? res ?? [],
  getNext = (res) => {
    // Para "page": devolver (page + 1) o null si no hay más
    // Para "cursor": devolver res.nextCursor || null
    return null;
  },
  getHasMore = (res, currentItems) => {
    // Si no defines hasMore, intentará inferirlo: items.length >= pageSize
    const items = getItems(res);
    return Array.isArray(items) ? items.length >= pageSize : false;
  },

  // Estado inicial adicional (filtros/búsqueda, etc.)
  initialParams = {},

  // Dedupe
  keyExtractor = (item) => item?.id ?? JSON.stringify(item),
  dedupe = true,

  // Auto-carga inicial
  autoload = true,
}) {
  // Estado
  const [items, setItems] = useState([]);
  const [params, setParamsState] = useState(initialParams);
  const [page, setPage] = useState(initialPage);
  const [cursor, setCursor] = useState(initialCursor);

  const [loading, setLoading] = useState(autoload);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Control de concurrencia
  const reqIdRef = useRef(0);
  const abortRef = useRef(null);

  const resetState = useCallback(() => {
    setItems([]);
    setError(null);
    setHasMore(true);
    setPage(initialPage);
    setCursor(initialCursor);
  }, [initialCursor, initialPage]);

  const setParams = useCallback((patch) => {
    setParamsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const replaceParams = useCallback((next) => {
    setParamsState({ ...next });
  }, []);

  // Dedupe helper
  const mergeItems = useCallback(
    (prevItems, newItems) => {
      if (!dedupe) return [...prevItems, ...newItems];
      const map = new Map();
      const push = (arr) => {
        for (const it of arr) {
          map.set(keyExtractor(it), it);
        }
      };
      push(prevItems);
      push(newItems);
      return Array.from(map.values());
    },
    [dedupe, keyExtractor]
  );

  const cancelOngoing = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const runFetch = useCallback(
    async ({ kind }) => {
      // kind: "initial" | "refresh" | "more"
      cancelOngoing();
      const myReqId = ++reqIdRef.current;
      const ac = new AbortController();
      abortRef.current = ac;

      if (kind === "initial") setLoading(true);
      if (kind === "refresh") setRefreshing(true);
      if (kind === "more") setLoadingMore(true);

      setError(null);

      try {
        const args =
          mode === "page"
            ? { page, pageSize, params, signal: ac.signal }
            : { cursor, pageSize, params, signal: ac.signal };

        const res = await fetcher(args);

        // Ignora si llegó otra respuesta más nueva
        if (reqIdRef.current !== myReqId) return;

        const newItems = getItems(res) || [];
        const nextValue = getNext(res);
        const more = getHasMore(res, items);

        if (kind === "initial" || kind === "refresh") {
          setItems(newItems);
        } else {
          setItems((prev) => mergeItems(prev, newItems));
        }

        setHasMore(!!more || (!!nextValue && newItems.length > 0));

        if (mode === "page") {
          // Si getNext devuelve un número, úsalo; si no, incrementa si hay más
          if (typeof nextValue === "number") {
            setPage(nextValue);
          } else if (more) {
            setPage((p) => p + 1);
          }
        } else {
          // cursor
          setCursor(nextValue ?? null);
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Error al cargar datos");
      } finally {
        if (reqIdRef.current === myReqId) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          abortRef.current = null;
        }
      }
    },
    [
      cancelOngoing,
      cursor,
      fetcher,
      getHasMore,
      getItems,
      getNext,
      items,
      mode,
      page,
      pageSize,
      params,
      mergeItems,
    ]
  );

  const refresh = useCallback(() => {
    // Reinicia paginación y vuelve a traer
    if (mode === "page") setPage(initialPage);
    else setCursor(initialCursor);
    runFetch({ kind: "refresh" });
  }, [initialCursor, initialPage, mode, runFetch]);

  const loadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore || error) return;
    runFetch({ kind: "more" });
  }, [error, hasMore, loading, loadingMore, refreshing, runFetch]);

  const reload = useCallback(() => {
    resetState();
    runFetch({ kind: "initial" });
  }, [resetState, runFetch]);

  // Efecto inicial y cuando cambien params
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);
  useEffect(() => {
    if (!autoload) return;
    resetState();
    runFetch({ kind: "initial" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoload, paramsKey, mode, pageSize]);

  // Limpieza en unmount
  useEffect(() => cancelOngoing, [cancelOngoing]);

  // Helpers para manipular items localmente
  const upsertItem = useCallback(
    (item) => {
      setItems((prev) => {
        const k = keyExtractor(item);
        const idx = prev.findIndex((it) => keyExtractor(it) === k);
        if (idx >= 0) {
          const clone = prev.slice();
          clone[idx] = { ...prev[idx], ...item };
          return clone;
        }
        return [item, ...prev];
      });
    },
    [keyExtractor]
  );

  const removeItem = useCallback(
    (predicateOrKey) => {
      setItems((prev) => {
        if (typeof predicateOrKey === "function") {
          return prev.filter((it) => !predicateOrKey(it));
        }
        return prev.filter((it) => keyExtractor(it) !== predicateOrKey);
      });
    },
    [keyExtractor]
  );

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,

    // Paginación interna (útil para debug)
    page,
    cursor,

    // Acciones
    loadMore,
    refresh,
    reload,
    setParams,      // patch { ... }
    replaceParams,  // reemplaza por completo
    upsertItem,
    removeItem,
  };
}
