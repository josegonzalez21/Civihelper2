// src/screens/home/AdminHome.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import RoleGuard from "../../components/RoleGuard";
import { useAuth } from "../../context/AuthContext";

/* =========================
   PALETA DE COLORES - PÁGINAS AMARILLAS
========================= */
const COLORS = {
  yellow: "#FFD100",
  yellowDark: "#F5C400",
  yellowLight: "#FFF8CC",
  purple: "#7C3AED",
  purpleLight: "#A78BFA",
  white: "#FFFFFF",
  black: "#0A0A0A",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  shadow: "rgba(0,0,0,0.08)",
};

function SkeletonLoader({ width, height, style }) {
  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.gray200,
          borderRadius: 12,
          opacity,
        },
        style,
      ]}
    />
  );
}

function AlertBanner({ icon = "alert-circle", type = "warning", text, onPress, onDismiss }) {
  const typeConfig = {
    error: { bg: `${COLORS.error}15`, border: COLORS.error, icon: COLORS.error },
    success: { bg: `${COLORS.success}15`, border: COLORS.success, icon: COLORS.success },
    info: { bg: `${COLORS.info}15`, border: COLORS.info, icon: COLORS.info },
    warning: { bg: `${COLORS.warning}15`, border: COLORS.warning, icon: COLORS.warning },
  };
  const config = typeConfig[type] || typeConfig.warning;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.alertBanner, { backgroundColor: config.bg, borderColor: config.border }]}
    >
      <View style={s.alertContent}>
        <View style={[s.alertIconWrapper, { backgroundColor: COLORS.white }]}>
          <Feather name={icon} size={16} color={config.icon} />
        </View>
        <Text style={s.alertText} numberOfLines={2}>
          {text}
        </Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={12}>
          <Feather name="x" size={18} color={config.icon} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function QuickActionCard({ icon, label, onPress, badge, color = COLORS.yellow }) {
  return (
    <TouchableOpacity style={s.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.quickActionIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={24} color={COLORS.white} />
        {badge > 0 && (
          <View style={s.quickBadge}>
            <Text style={s.quickBadgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={s.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricCard({ icon, label, value, loading, onPress, trend, color = COLORS.yellow }) {
  const trendColor = trend > 0 ? COLORS.success : COLORS.error;
  return (
    <TouchableOpacity style={s.metricCard} activeOpacity={0.8} onPress={onPress}>
      <View style={s.metricHeader}>
        <View style={[s.metricIcon, { backgroundColor: color }]}>
          <Feather name={icon} size={20} color={COLORS.white} />
        </View>
        {typeof trend === "number" && (
          <View style={[s.trendBadge, { backgroundColor: `${trendColor}15` }]}>
            <Feather name={trend > 0 ? "trending-up" : "trending-down"} size={10} color={trendColor} />
            <Text style={[s.trendText, { color: trendColor }]}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={s.metricLabel}>{label}</Text>
      {loading ? (
        <SkeletonLoader width={60} height={22} style={{ marginTop: 6 }} />
      ) : (
        <Text style={s.metricValue}>
          {typeof value === "number" ? value.toLocaleString("es-CL") : value ?? "—"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, onSeeAll, icon }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleContainer}>
        {icon && (
          <View style={s.sectionIcon}>
            <Feather name={icon} size={20} color={COLORS.yellow} />
          </View>
        )}
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
          <View style={s.seeAllButton}>
            <Text style={s.seeAllText}>Ver todo</Text>
            <Feather name="arrow-right" size={14} color={COLORS.yellow} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActivityItem({ icon, title, description, time }) {
  return (
    <View style={s.activityItem}>
      <View style={s.activityIcon}>
        <Feather name={icon} size={16} color={COLORS.gray700} />
      </View>
      <View style={s.activityContent}>
        <Text style={s.activityTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!description && (
          <Text style={s.activityDesc} numberOfLines={1}>
            {description}
          </Text>
        )}
        {!!time && <Text style={s.activityTime}>{time}</Text>}
      </View>
    </View>
  );
}

export default function AdminHome() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const API_BASE = useMemo(
    () =>
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:4000",
    []
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [showModerationNotice, setShowModerationNotice] = useState(true);

  const [metrics, setMetrics] = useState({
    curatedServices: 0,
    serviceTypes: 0,
    rootAreas: 0,
    totalCategories: 0,
    promotionsActive: 0,
    moderationOpen: 0,
    totalUsers: 0,
    activeProviders: 0,
    pendingVerifications: 0,
    reportsOpen: 0,
  });

  const [trends, setTrends] = useState({
    servicesTrend: 0,
    usersTrend: 0,
    providersTrend: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/api/admin/services?limit=1`),
        fetch(`${API_BASE}/api/admin/service-types?limit=1000`),
        fetch(`${API_BASE}/api/categories/tree`),
        fetch(`${API_BASE}/api/promotions?status=ACTIVE&limit=1`),
        fetch(`${API_BASE}/api/admin/moderation/queue?limit=1`),
        fetch(`${API_BASE}/api/admin/users?limit=1`),
        fetch(`${API_BASE}/api/admin/providers?status=ACTIVE&limit=1`),
        fetch(`${API_BASE}/api/admin/verifications?status=PENDING&limit=1`),
        fetch(`${API_BASE}/api/admin/reports?status=OPEN&limit=1`),
        fetch(`${API_BASE}/api/admin/stats/trends`),
        fetch(`${API_BASE}/api/admin/activity/recent?limit=5`),
      ]);

      let curatedServices = 0;
      if (results[0].status === "fulfilled" && results[0].value.ok) {
        const j = await safeJson(results[0].value);
        curatedServices = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let serviceTypes = 0;
      if (results[1].status === "fulfilled" && results[1].value.ok) {
        const j = await safeJson(results[1].value);
        serviceTypes = Number(j.total ?? j.length ?? j.items?.length ?? 0) || 0;
      }

      let rootAreas = 0;
      let totalCategories = 0;
      if (results[2].status === "fulfilled" && results[2].value.ok) {
        const tree = await safeJson(results[2].value);
        const items = Array.isArray(tree) ? tree : tree.items || [];
        rootAreas = items.length;
        totalCategories = items.reduce(
          (acc, node) =>
            acc + 1 + (Array.isArray(node.children) ? node.children.length : 0),
          0
        );
      }

      let promotionsActive = 0;
      if (results[3].status === "fulfilled" && results[3].value.ok) {
        const j = await safeJson(results[3].value);
        promotionsActive = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let moderationOpen = 0;
      if (results[4].status === "fulfilled" && results[4].value.ok) {
        const j = await safeJson(results[4].value);
        moderationOpen = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let totalUsers = 0;
      if (results[5].status === "fulfilled" && results[5].value.ok) {
        const j = await safeJson(results[5].value);
        totalUsers = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let activeProviders = 0;
      if (results[6].status === "fulfilled" && results[6].value.ok) {
        const j = await safeJson(results[6].value);
        activeProviders = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let pendingVerifications = 0;
      if (results[7].status === "fulfilled" && results[7].value.ok) {
        const j = await safeJson(results[7].value);
        pendingVerifications = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      let reportsOpen = 0;
      if (results[8].status === "fulfilled" && results[8].value.ok) {
        const j = await safeJson(results[8].value);
        reportsOpen = Number(j.total ?? j.items?.length ?? 0) || 0;
      }

      if (results[9].status === "fulfilled" && results[9].value.ok) {
        const j = await safeJson(results[9].value);
        setTrends({
          servicesTrend: Number(j.servicesTrend) || 0,
          usersTrend: Number(j.usersTrend) || 0,
          providersTrend: Number(j.providersTrend) || 0,
        });
      }

      if (results[10].status === "fulfilled" && results[10].value.ok) {
        const j = await safeJson(results[10].value);
        setRecentActivity(Array.isArray(j.items) ? j.items : []);
      }

      setMetrics({
        curatedServices,
        serviceTypes,
        rootAreas,
        totalCategories,
        promotionsActive,
        moderationOpen,
        totalUsers,
        activeProviders,
        pendingVerifications,
        reportsOpen,
      });
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las métricas");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Admin";
  const avatarUrl = user?.avatarUrl;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  if (loading && !metrics.totalUsers) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.yellow} />
          <Text style={{ marginTop: 16, color: COLORS.gray500, fontWeight: "600" }}>
            Cargando panel...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        {/* Header amarillo */}
        <LinearGradient
          colors={[COLORS.yellow, COLORS.yellowDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <View style={s.logoContainer}>
                <Text style={s.logoText}>A</Text>
              </View>
              <View>
                <Text style={s.greetingText}>{getGreeting()}</Text>
                <Text style={s.userName}>{firstName} 👑</Text>
              </View>
            </View>

            <View style={s.headerRight}>
              <TouchableOpacity
                style={s.headerButton}
                onPress={() => navigation.navigate("AdminSettings")}
              >
                <Feather name="settings" size={20} color={COLORS.gray800} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.headerButton}
                onPress={() => navigation.navigate("Profile")}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
                ) : (
                  <Feather name="user" size={20} color={COLORS.gray800} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.headerSubtitle}>Panel de administración</Text>
        </LinearGradient>

        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.yellow}
              colors={[COLORS.yellow]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {err && (
            <AlertBanner
              icon="alert-circle"
              type="error"
              text={err}
              onPress={loadAll}
            />
          )}

          {metrics.moderationOpen > 0 && showModerationNotice && (
            <AlertBanner
              icon="alert-triangle"
              type="warning"
              text={`${metrics.moderationOpen} elemento${
                metrics.moderationOpen !== 1 ? "s" : ""
              } requiere${metrics.moderationOpen !== 1 ? "n" : ""} moderación`}
              onPress={() => navigation.navigate("AdminModeration")}
              onDismiss={() => setShowModerationNotice(false)}
            />
          )}

          {metrics.pendingVerifications > 0 && (
            <AlertBanner
              icon="shield"
              type="info"
              text={`${metrics.pendingVerifications} verificación${
                metrics.pendingVerifications !== 1 ? "es" : ""
              } pendiente${metrics.pendingVerifications !== 1 ? "s" : ""}`}
              onPress={() => navigation.navigate("AdminVerifications")}
            />
          )}

          {metrics.reportsOpen > 0 && (
            <AlertBanner
              icon="flag"
              type="error"
              text={`${metrics.reportsOpen} reporte${
                metrics.reportsOpen !== 1 ? "s" : ""
              } abierto${metrics.reportsOpen !== 1 ? "s" : ""}`}
              onPress={() => navigation.navigate("AdminModeration")}
            />
          )}

          {/* Acciones rápidas */}
          <View style={s.section}>
            <View style={s.quickActionsGrid}>
              <QuickActionCard
                icon="users"
                label="Usuarios"
                onPress={() => navigation.navigate("AdminUsers")}
                badge={0}
                color={COLORS.purple}
              />
              <QuickActionCard
                icon="user-check"
                label="Proveedores"
                onPress={() => navigation.navigate("AdminUsers")}
                badge={metrics.pendingVerifications}
                color={COLORS.yellow}
              />
              <QuickActionCard
                icon="shield"
                label="Moderación"
                onPress={() => navigation.navigate("AdminModeration")}
                badge={metrics.moderationOpen}
                color={COLORS.info}
              />
              <QuickActionCard
                icon="bar-chart-2"
                label="Analíticas"
                onPress={() => navigation.navigate("AdminAnalytics")}
                badge={0}
                color={COLORS.error}
              />
            </View>
          </View>

          {/* Métricas */}
          <View style={s.section}>
            <SectionHeader
              title="Estadísticas"
              icon="bar-chart"
              onSeeAll={() => navigation.navigate("AdminAnalytics")}
            />
            <View style={s.metricsGrid}>
              <MetricCard
                icon="users"
                label="Usuarios"
                value={metrics.totalUsers}
                loading={loading}
                onPress={() => navigation.navigate("AdminUsers")}
                trend={trends.usersTrend}
                color={COLORS.purple}
              />
              <MetricCard
                icon="user-check"
                label="Proveedores"
                value={metrics.activeProviders}
                loading={loading}
                onPress={() => navigation.navigate("AdminUsers")}
                trend={trends.providersTrend}
                color={COLORS.yellow}
              />
              <MetricCard
                icon="briefcase"
                label="Servicios"
                value={metrics.curatedServices}
                loading={loading}
                onPress={() => navigation.navigate("AdminServices")}
                trend={trends.servicesTrend}
                color={COLORS.info}
              />
              <MetricCard
                icon="layers"
                label="Tipos"
                value={metrics.serviceTypes}
                loading={loading}
                onPress={() => navigation.navigate("AdminServiceTypes")}
                color={COLORS.success}
              />
              <MetricCard
                icon="folder"
                label="Áreas"
                value={metrics.rootAreas}
                loading={loading}
                onPress={() => navigation.navigate("AdminCategories")}
                color={COLORS.purple}
              />
              <MetricCard
                icon="list"
                label="Categorías"
                value={metrics.totalCategories}
                loading={loading}
                onPress={() => navigation.navigate("AdminCategories")}
                color={COLORS.yellow}
              />
            </View>
          </View>

          {/* Actividad reciente */}
          {recentActivity.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Actividad reciente" icon="activity" />
              <View style={s.activityCard}>
                {recentActivity.map((item, idx) => (
                  <View key={idx}>
                    <ActivityItem
                      icon={item.icon || "activity"}
                      title={item.title}
                      description={item.description}
                      time={item.time}
                    />
                    {idx < recentActivity.length - 1 && (
                      <View style={s.activityDivider} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.yellow,
  },
  greetingText: {
    fontSize: 12,
    color: COLORS.gray800,
    fontWeight: "600",
    opacity: 0.8,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 14,
  },
  headerSubtitle: {
    marginTop: 8,
    color: COLORS.gray800,
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.95,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 18,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: `${COLORS.border}55`,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  quickBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  quickBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "700",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: `${COLORS.yellow}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    color: COLORS.yellowDark,
    fontWeight: "600",
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "47.5%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.border}55`,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metricLabel: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  alertIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.gray900,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.border}55`,
  },
  activityItem: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: `${COLORS.gray200}70`,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  activityDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 2,
  },
  activityDivider: {
    height: 1,
    backgroundColor: `${COLORS.border}55`,
  },
});
