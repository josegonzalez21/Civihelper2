// src/screens/admin/AdminDashboard.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import RoleGuard from "../../components/RoleGuard";
import { useAuth } from "../../context/AuthContext";
import { fetchJSON } from "../../services/api";

// 👇 agrega tu logo aquí
import logo3 from "../../assets/Logo3.png";

/* =========================
   PALETA AMARILLA + ACENTOS
========================= */
const COLORS = {
  yellow: "#FFD100",
  yellowDark: "#F5C400",
  yellowLight: "#FFF6D6",
  purple: "#7C3AED",
  purpleLight: "#F3E8FF",
  teal: "#0EA5E9",
  tealLight: "#E0F2FE",
  green: "#10B981",
  greenLight: "#D1FAE5",
  orange: "#FB923C",
  orangeLight: "#FFEDD5",
  white: "#FFFFFF",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  danger: "#B91C1C",
  success: "#10B981",
  muted: "#94A3B8",
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
};
const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
};
const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
};

/** ===== Helpers ===== */
const extractItems = (resp) => {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.items)) return resp.items;
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.docs)) return resp.docs;
  if (Array.isArray(resp.payload)) return resp.payload;
  return [];
};

const normalizeMetrics = (m) => {
  if (!m) {
    return {
      users: 0,
      providers: 0,
      services: 0,
      bookingsToday: 0,
      pendingReports: 0,
      revenue30d: 0,
    };
  }
  const src = m.data || m || {};
  return {
    users: src.users ?? src.totalUsers ?? src.total_users ?? 0,
    providers: src.providers ?? src.totalProviders ?? src.total_providers ?? 0,
    services: src.services ?? src.totalServices ?? src.total_services ?? 0,
    bookingsToday:
      src.bookingsToday ??
      src.bookings_today ??
      src.bookings_today_count ??
      0,
    pendingReports:
      src.pendingReports ??
      src.reportsPending ??
      src.pending_reports ??
      0,
    revenue30d:
      src.revenue30d ?? src.revenue_last_30_days ?? src.revenue ?? 0,
  };
};

const getId = (item) =>
  item?.id ?? item?._id ?? item?.uuid ?? item?.uid ?? null;

/** ===== Metric Card ===== */
function MetricCard({ title, value, icon, onPress, color = "yellow" }) {
  const palette =
    {
      yellow: {
        bg: COLORS.yellowLight,
        iconBg: "rgba(255, 209, 0, 0.28)",
        iconColor: COLORS.text,
      },
      purple: {
        bg: COLORS.purpleLight,
        iconBg: "rgba(124, 58, 237, 0.16)",
        iconColor: COLORS.purple,
      },
      teal: {
        bg: COLORS.tealLight,
        iconBg: "rgba(14, 165, 233, 0.16)",
        iconColor: COLORS.teal,
      },
      green: {
        bg: COLORS.greenLight,
        iconBg: "rgba(16, 185, 129, 0.18)",
        iconColor: COLORS.green,
      },
    }[color] ||
    {
      bg: COLORS.white,
      iconBg: COLORS.yellowLight,
      iconColor: COLORS.text,
    };

  return (
    <TouchableOpacity
      style={[s.metricCard, { backgroundColor: palette.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.metricIcon, { backgroundColor: palette.iconBg }]}>
        <Feather name={icon} size={20} color={palette.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.metricLabel}>{title}</Text>
        <Text style={s.metricValue}>{String(value)}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

/** ===== User Row ===== */
function UserRow({ item, onPress }) {
  return (
    <TouchableOpacity style={s.userRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.userAvatar}>
        <Text style={s.userAvatarText}>
          {(item.name?.[0] || item.email?.[0] || "U").toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.userName} numberOfLines={1}>
          {item.name || item.fullName || "Sin nombre"}
        </Text>
        <Text style={s.userEmail} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={s.userRoleBadge}>
          <Text style={s.userRoleText}>{item.role || "Usuario"}</Text>
        </View>
      </View>

      <Feather name="arrow-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

/** ===== Report Row ===== */
function ReportRow({ item, onPress }) {
  return (
    <TouchableOpacity
      style={s.reportRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.reportIcon}>
        <Feather
          name={item.type === "USER" ? "user-x" : "alert-triangle"}
          size={16}
          color={COLORS.danger}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.reportType}>
          {item.targetType || item.type || "Reporte"}
        </Text>
        <Text style={s.reportReason} numberOfLines={2}>
          {item.reason || item.message || "—"}
        </Text>
        <Text style={s.reportDate}>
          {new Date(
            item.createdAt || item.created_at || Date.now()
          ).toLocaleDateString("es-ES")}
        </Text>
      </View>

      <Feather name="arrow-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

/** ===== Quick Action Card ===== */
function QuickActionCard({
  title,
  description,
  icon,
  onPress,
  tone = "yellow",
}) {
  const bgMap = {
    yellow: COLORS.yellowLight,
    purple: COLORS.purpleLight,
    teal: COLORS.tealLight,
    orange: COLORS.orangeLight,
  };
  const iconMap = {
    yellow: COLORS.yellowDark,
    purple: COLORS.purple,
    teal: COLORS.teal,
    orange: COLORS.orange,
  };

  return (
    <TouchableOpacity
      style={[s.actionCard, { backgroundColor: bgMap[tone] || COLORS.white }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.actionIcon, { backgroundColor: "rgba(255,255,255,0.6)" }]}>
        <Feather name={icon} size={22} color={iconMap[tone] || COLORS.text} />
      </View>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

/** ===== Main Screen ===== */
export default function AdminDashboard() {
  const nav = useNavigation();
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState({
    users: 0,
    providers: 0,
    services: 0,
    bookingsToday: 0,
    pendingReports: 0,
    revenue30d: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const isAdmin = user?.role === "ADMIN";

  const loadAll = useCallback(async () => {
    try {
      setError(null);

      const [mResp, uResp, rResp] = await Promise.allSettled([
        fetchJSON("/admin/metrics"),
        fetchJSON("/admin/users?limit=10&sort=createdAt:desc"),
        fetchJSON(
          "/admin/reports?status=PENDING&limit=10&sort=createdAt:desc"
        ),
      ]);

      if (mResp.status === "fulfilled") {
        setMetrics(normalizeMetrics(mResp.value));
      }

      if (uResp.status === "fulfilled") {
        setRecentUsers(extractItems(uResp.value));
      }

      if (rResp.status === "fulfilled") {
        setReports(extractItems(rResp.value));
      }
    } catch (e) {
      setError(e?.message || "Error cargando el dashboard");
      console.error("Load dashboard error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) loadAll();
    }, [loadAll, loading])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return recentUsers;
    const q = search.toLowerCase();
    return recentUsers.filter(
      (u) =>
        (u?.name || u?.fullName || "").toLowerCase().includes(q) ||
        (u?.email || "").toLowerCase().includes(q) ||
        (u?.role || "").toLowerCase().includes(q)
    );
  }, [recentUsers, search]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={s.deniedContainer}>
          <Feather
            name="lock"
            size={48}
            color={COLORS.muted}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={s.deniedTitle}>Acceso denegado</Text>
          <Text style={s.deniedSub}>
            Necesitas permisos de administrador para ver este contenido
          </Text>
          <TouchableOpacity
            style={[s.button, s.buttonDanger]}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={s.buttonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.yellowDark} />
          <Text style={{ marginTop: 12, color: COLORS.muted, fontSize: 14 }}>
            Cargando dashboard…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={s.loadingContainer}>
          <Feather
            name="alert-circle"
            size={40}
            color={COLORS.danger}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={{ color: COLORS.text, marginBottom: 8, fontSize: 14 }}>
            {error}
          </Text>
          <TouchableOpacity
            style={[s.button, s.buttonPrimary]}
            onPress={loadAll}
            activeOpacity={0.8}
          >
            <Text style={s.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.yellowDark}
              colors={[COLORS.yellowDark]}
            />
          }
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header actualizado con logo y nombre */}
          <LinearGradient
            colors={[COLORS.yellow, COLORS.yellowDark, "#FDE68A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={s.headerRow}>
              <Image source={logo3} style={s.logo} />
              <View>
                <Text style={s.headerGreeting}>Bienvenido de vuelta 👋</Text>
                <Text style={s.headerName}>{user?.name || "Admin"}</Text>
              </View>
            </View>
            <Text style={s.headerSub}>
              Estado general del sistema y accesos rápidos
            </Text>
          </LinearGradient>

          {/* Métricas */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Métricas principales</Text>
            <MetricCard
              title="Usuarios"
              value={metrics.users}
              icon="users"
              color="yellow"
              onPress={() => nav.navigate("AdminUsers")}
            />
            <MetricCard
              title="Proveedores"
              value={metrics.providers}
              icon="user-check"
              color="purple"
              onPress={() => nav.navigate("AdminUsers")}
            />
            <MetricCard
              title="Servicios"
              value={metrics.services}
              icon="briefcase"
              color="teal"
              onPress={() => nav.navigate("AdminServices")}
            />
            <MetricCard
              title="Reservas (hoy)"
              value={metrics.bookingsToday}
              icon="calendar"
              color="green"
              onPress={() => Alert.alert("Reservas", "Navegación pendiente")}
            />
            <MetricCard
              title="Reportes pendientes"
              value={metrics.pendingReports}
              icon="flag"
              color="purple"
              onPress={() => nav.navigate("AdminModeration")}
            />
            <MetricCard
              title="Ingresos (30 días)"
              value={`$${Number(metrics.revenue30d).toLocaleString("es-CL")}`}
              icon="trending-up"
              color="yellow"
              onPress={() => Alert.alert("Ingresos", "Navegación pendiente")}
            />
          </View>

          {/* Usuarios recientes */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Usuarios recientes</Text>
              <TouchableOpacity
                onPress={() => nav.navigate("AdminUsers")}
                activeOpacity={0.7}
              >
                <Text style={s.sectionLink}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            <View style={s.searchBox}>
              <Feather name="search" size={16} color={COLORS.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar usuario..."
                placeholderTextColor={COLORS.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={16} color={COLORS.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {filteredUsers.length === 0 ? (
              <View style={s.emptyState}>
                <Feather
                  name="users"
                  size={32}
                  color={COLORS.muted}
                  style={{ marginBottom: 8 }}
                />
                <Text style={s.emptyTitle}>
                  {search ? "Sin resultados" : "No hay usuarios"}
                </Text>
              </View>
            ) : (
              <View style={s.itemsList}>
                {filteredUsers.map((u, idx) => (
                  <View key={getId(u) || idx}>
                    <UserRow
                      item={u}
                      onPress={() =>
                        Alert.alert(
                          "Usuario",
                          `${u.name || u.email}\nRol: ${u.role}`
                        )
                      }
                    />
                    {idx < filteredUsers.length - 1 && (
                      <View style={s.divider} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Reportes pendientes */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Reportes pendientes</Text>
              <TouchableOpacity
                onPress={() => nav.navigate("AdminModeration")}
                activeOpacity={0.7}
              >
                <Text style={s.sectionLink}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            {reports.length === 0 ? (
              <View
                style={[s.emptyState, { backgroundColor: COLORS.greenLight }]}
              >
                <Feather
                  name="check-circle"
                  size={32}
                  color={COLORS.success}
                  style={{ marginBottom: 8 }}
                />
                <Text style={s.emptyTitle}>Sin reportes pendientes</Text>
                <Text style={s.emptySub}>¡Todo limpio por ahora! 🎉</Text>
              </View>
            ) : (
              <View style={[s.itemsList, { backgroundColor: "#FFF" }]}>
                {reports.slice(0, 5).map((r, idx) => (
                  <View key={getId(r) || idx}>
                    <ReportRow
                      item={r}
                      onPress={() =>
                        Alert.alert(
                          "Reporte",
                          `${r.reason || "Sin descripción"}`
                        )
                      }
                    />
                    {idx < Math.min(5, reports.length) - 1 && (
                      <View style={s.divider} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Acciones rápidas */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Acciones rápidas</Text>
            <View style={s.actionsGrid}>
              <QuickActionCard
                title="Nueva categoría"
                description="Organiza servicios"
                icon="folder-plus"
                tone="yellow"
                onPress={() => nav.navigate("AdminCategories")}
              />
              <QuickActionCard
                title="Nueva promoción"
                description="Lanza campañas"
                icon="gift"
                tone="purple"
                onPress={() => nav.navigate("AdminPromotionCreate")}
              />
              <QuickActionCard
                title="Moderación"
                description="Revisar reportes"
                icon="shield"
                tone="teal"
                onPress={() => nav.navigate("AdminModeration")}
              />
              <QuickActionCard
                title="Configuración"
                description="Ajustes del sistema"
                icon="settings"
                tone="orange"
                onPress={() => nav.navigate("AdminSettings")}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  headerGreeting: {
    fontSize: 13,
    color: "#1F2937",
    opacity: 0.85,
    marginBottom: 2,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.7,
    marginTop: 4,
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.yellowDark,
  },

  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.025)",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 3,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },

  itemsList: {
    backgroundColor: COLORS.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: COLORS.yellowDark,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  userRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 209, 0, 0.23)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  },

  reportRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(185, 28, 28, 0.09)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  reportType: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.danger,
    marginBottom: 2,
  },
  reportReason: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  reportDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.02)",
    padding: spacing.md,
    alignItems: "flex-start",
    gap: 6,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: COLORS.yellowDark,
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
