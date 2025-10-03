// src/components/hooks/useHomeData.js
import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { parseRetryAfter } from "../../utils/format";

const STALE_MS = 60_000;

// Normaliza posibles formas de respuesta: {items:[]}, [] o {}
function pickItems(data, fallback = []) {
  if (!data) return fallback;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return fallback;
}

export default function useHomeData() {
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: null,
    errorInfo: null,
    categories: [],
    featured: [],
    newest: [],
    lastLoadedAt: 0,
  });

  const load = useCallback(async (opts = { soft: false }) => {
    setState((s) => ({
      ...s,
      loading: !opts.soft,
      refreshing: !!opts.soft,
      error: null,
      errorInfo: null,
    }));

    try {
      // Pedidos con etiquetas para diagnóstico
      const reqs = [
        { key: "categories", path: "/categories", p: api.get("/categories", { tag: "HOME_CATEGORIES" }) },
        {
          key: "featured",
          path: "/featured",
          p: api.get("/featured", { params: { page: 1, pageSize: 8 }, tag: "HOME_FEATURED" }),
        },
        {
          key: "newest",
          path: "/services",
          p: api.get("/services", {
            params: { page: 1, pageSize: 12, sortBy: "createdAt", order: "desc" },
            tag: "HOME_NEWEST",
          }),
        },
      ];

      const results = await Promise.allSettled(reqs.map((r) => r.p));

      const mapByKey = (key) => {
        const idx = reqs.findIndex((r) => r.key === key);
        return results[idx];
      };

      const cats = mapByKey("categories");
      const feat = mapByKey("featured");
      const fresh = mapByKey("newest");

      // Construye info de error (con qué request falló)
      const failures = results
        .map((r, i) =>
          r.status === "rejected"
            ? {
                key: reqs[i].key,
                path: reqs[i].path,
                status: r.reason?.status,
                message: r.reason?.message,
                data: r.reason?.data,
              }
            : null
        )
        .filter(Boolean);

      const errorInfo = failures.length ? { failures } : null;
      if (errorInfo) console.log("Home error info:", JSON.stringify(errorInfo, null, 2));

      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: failures.length ? new Error("fetch-failed") : null,
        errorInfo,
        categories: cats.status === "fulfilled" ? pickItems(cats.value, s.categories) : s.categories,
        featured: feat.status === "fulfilled" ? pickItems(feat.value, s.featured) : s.featured,
        newest: fresh.status === "fulfilled" ? pickItems(fresh.value, s.newest) : s.newest,
        lastLoadedAt: Date.now(),
      }));
    } catch (e) {
      const retryHeader = e?.response?.headers?.["retry-after"];
      const waitMs = parseRetryAfter(retryHeader) ?? 0;

      const info = {
        message: e?.message,
        status: e?.status || e?.response?.status,
        retryAfterMs: waitMs,
      };
      console.log("Home error (catch):", JSON.stringify(info, null, 2));

      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: e,
        errorInfo: info,
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load({ soft: true }), [load]);
  const shouldRefetch = Date.now() - state.lastLoadedAt > STALE_MS;

  return { ...state, refresh, reload: load, shouldRefetch };
}
