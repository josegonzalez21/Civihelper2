// src/utils/setupErrorHandling.js
/* eslint-disable no-console */
import { Platform, Alert, LogBox } from "react-native";

/* ────────────────────────────────────────────────────────────────────────────
 * Carga opcional de Sentry (no es requerido)
 *  - Nativo: @sentry/react-native
 *  - Web:    @sentry/browser
 * Si no está instalado, seguimos sin romper.
 * ─────────────────────────────────────────────────────────────────────────── */
let Sentry = null;
try {
  // eslint-disable-next-line global-require
  Sentry = require("@sentry/react-native");
} catch {}
if (!Sentry && Platform.OS === "web") {
  try {
    // eslint-disable-next-line global-require
    Sentry = require("@sentry/browser");
  } catch {}
}

/* ────────────────────────────────────────────────────────────────────────────
 * Consola original + banderas anti-reentrancia
 * ─────────────────────────────────────────────────────────────────────────── */
const ORIG = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  log: console.log.bind(console),
};

let __installed = false;
let __tapConsole = false;
let __inReporter = false;   // evita recursión dentro del reporter
let __inConsoleTap = false; // evita recursión dentro del tap de consola

/* ────────────────────────────────────────────────────────────────────────────
 * Reporter y sanitizador configurables
 * ─────────────────────────────────────────────────────────────────────────── */
let __reporter = async (payload) => {
  // Reporter por defecto: usa SIEMPRE la consola original para evitar loops
  try {
    __inReporter = true;
    ORIG.error("[GlobalError]", payload);
  } finally {
    __inReporter = false;
  }
};
let __sanitizer = (payload) => payload;

export function setErrorReporter(fn) {
  if (typeof fn === "function") __reporter = fn;
}
export function setSanitizer(fn) {
  if (typeof fn === "function") __sanitizer = fn;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Utils
 * ─────────────────────────────────────────────────────────────────────────── */
const safeStringify = (v) => {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    try {
      // Reintento plano
      return String(v);
    } catch {
      return "[unserializable]";
    }
  }
};

function toPlainError(err) {
  if (!err) return { name: "Error", message: "Unknown error" };
  if (err instanceof Error) {
    return {
      name: err.name || "Error",
      message: err.message || String(err),
      stack: err.stack || undefined,
      code: err.code,
      status: err.status,
      data: err.data,
    };
  }
  try {
    return { name: "Error", message: typeof err === "string" ? err : JSON.stringify(err) };
  } catch {
    return { name: "Error", message: String(err) };
  }
}

function formatError(err) {
  const e = toPlainError(err);
  return `${e.message || e.name}${e.stack ? `\n${e.stack}` : ""}`;
}

function buildMessageFromArgs(args) {
  try {
    return args.map((a) => (a instanceof Error ? formatError(a) : safeStringify(a))).join(" ");
  } catch {
    return args.map(String).join(" ");
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Report
 * ─────────────────────────────────────────────────────────────────────────── */
async function report(kind, err, extra = {}) {
  // Evita self-report en el tap de consola
  if (kind === "console-error" && __inConsoleTap) return;

  const payload = __sanitizer({
    kind, // "exception" | "unhandledrejection" | "console-error" | "fetch" | "warning"
    error: toPlainError(err),
    extra: {
      app: {
        platform: Platform.OS,
        version: globalThis?.__APP_VERSION__ || "unknown",
        channel: globalThis?.__APP_CHANNEL__ || (__DEV__ ? "dev" : "prod"),
      },
      ...extra,
    },
    ts: Date.now(),
  });

  try {
    await __reporter(payload);
  } catch (e) {
    ORIG.warn("[setupErrorHandling] Reporter failed:", e);
  }

  // Sentry (opcional)
  if (Sentry) {
    try {
      if (err instanceof Error && Sentry.captureException) {
        Sentry.captureException(err, { extra });
      } else if (Sentry.captureMessage) {
        Sentry.captureMessage(formatError(err), "error");
      }
    } catch (e) {
      ORIG.warn("[setupErrorHandling] Sentry failed:", e);
    }
  }
}

function devAlert(title, message) {
  if (Platform.OS !== "web" && __DEV__) {
    try {
      Alert.alert(title, message);
    } catch {}
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Instalación de handlers globales (idempotente)
 * options:
 *  - showAlerts (bool)               : Alert en dev nativo (default true en dev nativo)
 *  - enableNetworkInterceptor (bool) : envolver fetch (default __DEV__)
 *  - ignoreLogBox (string[])         : patrones a ignorar
 *  - fetchExcludeDomains (string[])  : dominios excluidos (ej: localhost)
 *  - tapConsole (bool)               : reportar console.error/warn (default true)
 * ─────────────────────────────────────────────────────────────────────────── */
export function installGlobalErrorHandlers(options = {}) {
  if (__installed) {
    if (__DEV__) ORIG.log("[setupErrorHandling] Ya estaba instalado; skip.");
    return;
  }

  const {
    showAlerts = Platform.OS !== "web" && __DEV__,
    enableNetworkInterceptor = __DEV__,
    ignoreLogBox = [
      "Non-serializable values were found in the navigation state",
      "shadow* style props are deprecated",
      "props.pointerEvents is deprecated",
    ],
    fetchExcludeDomains = ["localhost", "10.0.2.2", "192.168.", "127.0.0.1"],
    tapConsole = true,
  } = options;

  // 0) LogBox
  try {
    if (ignoreLogBox?.length) LogBox.ignoreLogs(ignoreLogBox);
  } catch {}

  // 1) RN nativo: excepciones no capturadas
  try {
    if (global.ErrorUtils?.setGlobalHandler) {
      const prev = global.ErrorUtils?.getGlobalHandler?.();
      global.ErrorUtils.setGlobalHandler((err, isFatal) => {
        report("exception", err, { isFatal });
        if (showAlerts && isFatal) devAlert("Error fatal", String(err?.message || err));
        if (typeof prev === "function") {
          try {
            prev(err, isFatal);
          } catch {}
        }
      });
    }
  } catch (e) {
    ORIG.warn("[setupErrorHandling] ErrorUtils handler failed:", e);
  }

  // 2) Web: onerror / unhandledrejection
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      window.addEventListener("error", (event) => {
        const err = event?.error || new Error(event?.message || "Script error");
        report("exception", err, {
          filename: event?.filename,
          lineno: event?.lineno,
          colno: event?.colno,
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event?.reason instanceof Error ? event.reason : new Error(formatError(event?.reason));
        report("unhandledrejection", reason);
      });
    } catch (e) {
      ORIG.warn("[setupErrorHandling] Web handlers failed:", e);
    }
  } else {
    // 3) RN: unhandled promise rejections (best-effort)
    try {
      const handler = (event) => {
        const reason = event?.reason instanceof Error ? event.reason : new Error(formatError(event?.reason));
        report("unhandledrejection", reason);
        if (showAlerts) devAlert("Promesa no manejada", String(reason?.message || reason));
      };
      if (typeof globalThis.addEventListener === "function") {
        globalThis.addEventListener("unhandledrejection", handler);
      } else {
        globalThis.onunhandledrejection = handler;
      }
    } catch {}
  }

  // 4) Tap de consola (idempotente y sin loops)
  if (tapConsole && !__tapConsole) {
    try {
      __tapConsole = true;

      console.error = (...args) => {
        // Si estamos dentro del reporter, no reportar de nuevo
        if (__inReporter) return ORIG.error(...args);

        ORIG.error(...args);

        if (__inConsoleTap) return;
        try {
          __inConsoleTap = true;
          const err = args?.find((a) => a instanceof Error) || new Error(buildMessageFromArgs(args));
          report("console-error", err, { raw: args.map((a) => safeStringify(a)) });
        } finally {
          __inConsoleTap = false;
        }
      };

      console.warn = (...args) => {
        ORIG.warn(...args);
        try {
          if (Sentry?.captureMessage) {
            Sentry.captureMessage(buildMessageFromArgs(args), "warning");
          }
        } catch {}
      };
    } catch {}
  }

  // 5) Interceptor de fetch (opcional)
  if (enableNetworkInterceptor && typeof globalThis.fetch === "function") {
    try {
      const originalFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (...args) => {
        const req = args[0];
        const url = typeof req === "string" ? req : req?.url;
        const isExcluded = fetchExcludeDomains.some((d) => url?.includes(d));
        try {
          const res = await originalFetch(...args);
          if (!res.ok && !isExcluded) {
            const err = new Error(`HTTP ${res.status} ${res.statusText || ""}`.trim());
            err.response = { url: res.url, status: res.status, statusText: res.statusText };
            report("fetch", err, { url: res.url, status: res.status, statusText: res.statusText });
          }
          return res;
        } catch (err) {
          if (!isExcluded) report("fetch", err, { request: url || "<unknown>" });
          throw err;
        }
      };
    } catch (e) {
      ORIG.warn("[setupErrorHandling] fetch interceptor failed:", e);
    }
  }

  __installed = true;
  if (__DEV__) ORIG.log("[setupErrorHandling] Handlers instalados. Platform:", Platform.OS);
}

export default installGlobalErrorHandlers;
