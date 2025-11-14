// src/screens/ProviderStatsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { API_URL, API_BASE, getAuthToken } from "../services/api";
import PrimaryButton from "../components/common/PrimaryButton";
import EmptyState from "../components/common/EmptyState";

// 🎨 Tema CiviHelper (violeta oscuro + glass)
import Colors, { spacing, radius } from "../theme/color";

const LOGIN_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];

/** Sombras modernas sin `shadow*` deprecado */
const iosShadowMap = {
  xs: "0px 1px 2px rgba(0,0,0,0.12)",
  sm: "0px 2px 6px rgba(0,0,0,0.14)",
  md: "0px 4px 12px rgba(0,0,0,0.16)",
  lg: "0px 8px 24px rgba(0,0,0,0.18)",
};
const makeShadow = (level = "sm") =>
  Platform.OS === "android"
    ? { elevation: level === "xs" ? 1 : level === "sm" ? 3 : level === "md" ? 5 : 8 }
    : { boxShadow: iosShadowMap[level] || iosShadowMap.sm };

export default function ProviderStatsScreen({ navigation }) {
  const { user } = useAuth();
  const uid = user?.id;

  const [items, setItems] = useState(null); // null => primera carga
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Rate-limit lock (429)
  const [lockUntil, setLockUntil] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const locked = Date.now() < lockUntil;

  // Aviso HTTPS en prod
  useEffect(() => {
    const isProd = !__DEV__;
    if (isProd && typeof API_BASE === "string" && !API_BASE.startsWith("https://")) {
      console.warn("En producción, usa HTTPS para la API:", API_BASE);
    }
  }, []);

  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setCountdown(sec);
      if (sec <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  const applyRateLimitLock = (ms) => {
    const wait = Math.max(5_000, Math.min(ms, 5 * 60_000));
    setLockUntil(Date.now() + wait);
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setErrorMsg("No hay usuario autenticado.");
      setLoading(false);
      return;
    }
    if (locked) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const token = getAuthToken?.();
      const url = `${API_URL}/services?userId=${encodeURIComponent(
        uid
      )}&page=1&pageSize=100&order=desc&sort=createdAt`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // 429 -> bloquea con Retry-After
      if (res.status === 429) {
        const ra = res.headers.get("retry-after");
        const wait = ra ? parseInt(ra, 10) * 1000 : 60_000;
        applyRateLimitLock(wait);
        setItems([]);
        setErrorMsg(`Demasiadas solicitudes. Intenta en ${Math.ceil(wait / 1000)} s.`);
        return;
      }

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        setItems([]);
        setErrorMsg(data?.message || "No se pudieron cargar tus servicios.");
        return;
      }

      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
    } catch {
      setItems([]);
      setErrorMsg("No se pudieron cargar tus servicios.");
    } finally {
      setLoading(false);
    }
  }, [uid, locked]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  /* ---------- Estadísticas derivadas ---------- */
  const computed = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const count = list.length;

    const avgRating = count
      ? list.reduce((a, s) => a + Number(s.ratingAvg ?? 0), 0) / count
      : 0;

    const totalReviews = list.reduce((a, s) => a + (s._count?.reviews ?? 0), 0);

    const withPrice = list.filter((s) => s.priceFrom != null);
    const avgPriceFrom =
      withPrice.length > 0
        ? withPrice.reduce((a, s) => a + Number(s.priceFrom), 0) / withPrice.length
        : 0;

    const noReviews = list.filter((s) => (s._count?.reviews ?? 0) === 0).length;

    // Top 3 por rating + respaldo por cantidad de reseñas
    const top = [...list]
      .sort((a, b) => {
        const ra = Number(a.ratingAvg ?? 0);
        const rb = Number(b.ratingAvg ?? 0);
        if (rb !== ra) return rb - ra;
        const ca = a._count?.reviews ?? 0;
        const cb = b._count?.reviews ?? 0;
        return cb - ca;
      })
      .slice(0, 3);

    // Breakdown por categoría
    const byCatMap = new Map();
    for (const s of list) {
      const key = s?.category?.name || "Sin categoría";
      byCatMap.set(key, (byCatMap.get(key) || 0) + 1);
    }
    const byCategory = Array.from(byCatMap.entries()).map(([name, qty]) => ({
      name,
      qty,
    }));

    return {
      count,
      avgRating,
      totalReviews,
      avgPriceFrom,
      noReviews,
      top,
      byCategory,
    };
  }, [items]);

  /* ---------- Carga inicial ---------- */
  if (items === null || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <LinearGradient
          colors={LOGIN_GRADIENT}
          style={[s.hero, { paddingBottom: spacing(2) }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.heroTop}>
            <TouchableOpacity
              onPress={goBack}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.title}>Estadísticas</Text>
            <View style={{ width: 36 }} />
          </View>
          <Text style={s.sub}>Resumen de tus servicios</Text>
        </LinearGradient>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ color: Colors.sub, marginTop: 8 }}>
            {locked
              ? `Bloqueado temporalmente… ${countdown ?? Math.ceil(
                  (lockUntil - Date.now()) / 1000
                )} s`
              : "Calculando estadísticas…"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- UI principal ---------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={LOGIN_GRADIENT}
        style={s.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.heroTop}>
          <TouchableOpacity
            onPress={goBack}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Estadísticas</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.sub}>Resumen de tus servicios</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5), paddingBottom: spacing(3) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avisos */}
        {!!errorMsg && (
          <View
            style={[
              s.card,
              {
                backgroundColor: Colors.withOpacity(Colors.danger, 0.12),
                borderColor: Colors.withOpacity(Colors.danger, 0.9),
              },
            ]}
          >
            <Text style={{ color: Colors.danger, fontWeight: "800", marginBottom: 4 }}>
              Aviso
            </Text>
            <Text style={{ color: Colors.danger }}>{errorMsg}</Text>
          </View>
        )}
        {locked && (
          <View
            style={[
              s.card,
              {
                backgroundColor: Colors.withOpacity(Colors.warn, 0.12),
                borderColor: Colors.withOpacity(Colors.warn, 0.9),
              },
            ]}
          >
            <Text style={{ color: Colors.warn, fontWeight: "800", marginBottom: 4 }}>
              Bloqueado temporalmente
            </Text>
            <Text style={{ color: Colors.warn }}>
              Intenta en {countdown ?? Math.ceil((lockUntil - Date.now()) / 1000)} s.
            </Text>
          </View>
        )}

        {/* Vacío */}
        {Array.isArray(items) && items.length === 0 ? (
          <>
            <EmptyState
              title="Aún no tienes servicios"
              subtitle="Crea tu primer servicio y empieza a recibir clientes."
              actionLabel="Crear servicio"
              onAction={() => navigation.navigate("ServiceCreate")}
              style={{ paddingHorizontal: 0 }}
            />
            <PrimaryButton style={{ marginTop: 4 }} onPress={() => navigation.navigate("MyServices")} small>
              Ir a Mis servicios
            </PrimaryButton>
          </>
        ) : (
          <>
            {/* KPIs */}
            <KpiRow
              items={[
                { label: "Publicados", value: String(computed.count) },
                { label: "Rating promedio", value: computed.avgRating.toFixed(1) },
              ]}
            />
            <KpiRow
              items={[
                { label: "Total reseñas", value: String(computed.totalReviews) },
                {
                  label: "Prom. “precio desde”",
                  value: computed.avgPriceFrom > 0 ? `$${Math.round(computed.avgPriceFrom)}` : "—",
                },
              ]}
            />
            <KpiRow
              items={[
                { label: "Sin reseñas", value: String(computed.noReviews) },
                { label: "Categorías", value: String(computed.byCategory.length) },
              ]}
            />

            {/* Breakdown por categoría */}
            <Section title="Por categoría">
              {computed.byCategory.length ? (
                <View style={s.chipsWrap} accessibilityRole="list">
                  {computed.byCategory.map((c) => (
                    <Chip key={c.name} label={`${c.name} · ${c.qty}`} />
                  ))}
                </View>
              ) : (
                <Text style={s.muted}>Sin categorías registradas.</Text>
              )}
            </Section>

            {/* Destacados */}
            <Section title="Destacados">
              {computed.top.length ? (
                <View style={{ gap: spacing(1) }}>
                  {computed.top.map((sv) => (
                    <ServiceRow
                      key={sv.id}
                      title={sv.title}
                      subtitle={sv.category?.name || "—"}
                      right={`${Number(sv.ratingAvg ?? 0).toFixed(1)}★ · ${sv._count?.reviews ?? 0}`}
                      onPress={() => navigation.navigate("ServiceDetail", { id: sv.id })}
                      onEdit={() => navigation.navigate("ServiceEdit", { id: sv.id })}
                    />
                  ))}
                </View>
              ) : (
                <Text style={s.muted}>No hay servicios destacados aún.</Text>
              )}
            </Section>

            {/* Acciones */}
            <PrimaryButton onPress={() => navigation.navigate("MyServices")}>
              Ir a Mis servicios
            </PrimaryButton>
            <PrimaryButton
              onPress={() => navigation.navigate("ServiceCreate")}
              style={{ marginTop: spacing(1) }}
              variant="secondary"
            >
              Crear servicio
            </PrimaryButton>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Componentes UI ---------- */

function KpiRow({ items }) {
  return (
    <View style={s.kpiRow}>
      {items.map((it, idx) => (
        <View key={idx} style={s.kpiCard} accessibilityRole="text">
          <Text style={s.kpiLabel}>{it.label}</Text>
          <Text style={s.kpiValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.card}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ gap: spacing(1) }}>{children}</View>
    </View>
  );
}

function Chip({ label }) {
  return (
    <View style={s.chip} accessibilityRole="text">
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

function ServiceRow({ title, subtitle, right, onPress, onEdit }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={s.serviceRow}
      accessibilityRole="button"
      accessibilityLabel={`Abrir servicio ${title}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.srvTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.srvSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={s.srvRight}>{right}</Text>
      <TouchableOpacity onPress={onEdit} style={s.editBtn} accessibilityLabel="Editar">
        <Feather name="edit-2" size={16} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/* ---------- Estilos (glass/dark) ---------- */

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing(2),
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: spacing(2),
    borderBottomLeftRadius: radius(2.5),
    borderBottomRightRadius: radius(2.5),
    ...makeShadow("lg"),
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(0.75),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius(1.25),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)" },

  // Card base (glass)
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius(2),
    padding: spacing(1.75),
    borderWidth: 1,
    borderColor: Colors.border,
    ...makeShadow("md"),
  },

  // KPIs
  kpiRow: { flexDirection: "row", gap: spacing(1) },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: radius(2),
    padding: spacing(1.5),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    ...makeShadow("xs"),
  },
  kpiLabel: { color: Colors.sub, fontWeight: "700" },
  kpiValue: { color: Colors.text, fontWeight: "900", fontSize: 18, marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginBottom: spacing(0.75) },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1) },
  chip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.75),
    backgroundColor: Colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { color: Colors.text, fontWeight: "700", fontSize: 12 },

  // Lista destacados
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  srvTitle: { color: Colors.text, fontWeight: "800" },
  srvSub: { color: Colors.sub, marginTop: 2 },
  srvRight: { color: Colors.sub, fontWeight: "800", marginLeft: "auto", marginRight: spacing(1) },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radius(1),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },

  muted: { color: Colors.sub },
});
