// src/screens/provider/ProviderHome.js
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
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import AppLogo from "../../components/common/AppLogo";

/* =========================
   PALETA AMARILLA (igual que Client)
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

/* =========================
   Skeleton
========================= */
function SkeletonLoader({ width, height, style }) {
  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
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

/* =========================
   Notice / Alert para proveedor
========================= */
function Notice({ icon = "info", type = "info", text, onPress, onDismiss }) {
  const typeMap = {
    info: { bg: `${COLORS.info}10`, border: COLORS.info, color: COLORS.info },
    success: {
      bg: `${COLORS.success}10`,
      border: COLORS.success,
      color: COLORS.success,
    },
    warning: {
      bg: `${COLORS.warning}10`,
      border: COLORS.warning,
      color: COLORS.warning,
    },
    error: { bg: `${COLORS.error}10`, border: COLORS.error, color: COLORS.error },
  };
  const cfg = typeMap[type] || typeMap.info;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        ps.notice,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <View style={ps.noticeContent}>
        <Feather name={icon} size={18} color={cfg.color} />
        <Text style={[ps.noticeText, { color: cfg.color }]}>{text}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Feather name="x" size={16} color={cfg.color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* =========================
   Tarjetas
========================= */
function QuickAction({ icon, label, onPress, color = COLORS.yellow, badge }) {
  return (
    <TouchableOpacity style={ps.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[ps.quickActionIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={22} color={COLORS.white} />
        {badge > 0 && (
          <View style={ps.quickBadge}>
            <Text style={ps.quickBadgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={ps.quickActionLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricCard({ icon, label, value, loading, color = COLORS.yellow, suffix = "" }) {
  return (
    <View style={ps.metricCard}>
      <View style={ps.metricTop}>
        <View style={[ps.metricIcon, { backgroundColor: color }]}>
          <Feather name={icon} size={20} color={COLORS.white} />
        </View>
      </View>
      <Text style={ps.metricLabel}>{label}</Text>
      {loading ? (
        <SkeletonLoader width={70} height={28} style={{ marginTop: 6 }} />
      ) : (
        <Text style={ps.metricValue}>
          {value}
          {suffix && <Text style={ps.metricSuffix}>{suffix}</Text>}
        </Text>
      )}
    </View>
  );
}

function AppointmentCard({ item, onPress }) {
  const status = item?.status || "PENDING";
  const statusColor =
    status === "CONFIRMED"
      ? COLORS.success
      : status === "CANCELLED"
      ? COLORS.error
      : COLORS.warning;

  return (
    <TouchableOpacity style={ps.appointmentCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[ps.appointmentIconWrap, { backgroundColor: `${statusColor}12` }]}>
        <Feather name="calendar" size={20} color={statusColor} />
      </View>
      <View style={ps.appointmentContent}>
        <Text style={ps.appointmentTitle} numberOfLines={1}>
          {item?.servicioNombre ?? item?.serviceName ?? "Servicio"}
        </Text>
        <View style={ps.appointmentMetaRow}>
          <View style={ps.appointmentMetaItem}>
            <Feather name="clock" size={11} color={COLORS.textSecondary} />
            <Text style={ps.appointmentMeta}>
              {item?.fechaTexto ?? item?.date ?? "Por confirmar"}
            </Text>
          </View>
        </View>
        <View style={ps.appointmentMetaRow}>
          <View style={ps.appointmentMetaItem}>
            <Feather name="user" size={11} color={COLORS.textSecondary} />
            <Text style={ps.appointmentMeta}>
              {item?.clienteNombre ?? item?.clientName ?? "Cliente"}
            </Text>
          </View>
          <View style={[ps.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[ps.statusText, { color: statusColor }]}>
              {status === "CONFIRMED"
                ? "Confirmada"
                : status === "CANCELLED"
                ? "Cancelada"
                : "Pendiente"}
            </Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={COLORS.gray400} />
    </TouchableOpacity>
  );
}

export default function ProviderHome() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const [metrics, setMetrics] = useState({
    ingresosHoy: 0,
    ingresosMes: 0,
    citasHoy: 0,
    citasSemana: 0,
    serviciosActivos: 0,
    ratingPromedio: 0,
    totalReviews: 0,
    pendingRequests: 0,
  });

  const [proximas, setProximas] = useState([]);
  const [stats, setStats] = useState({
    completionRate: 0,
    responseTime: 0,
    cancellationRate: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, aRes, sRes] = await Promise.allSettled([
        api.get?.("/provider/metrics"),
        api.get?.("/provider/agenda?limit=5"),
        api.get?.("/provider/stats"),
      ]);

      if (mRes.status === "fulfilled" && mRes.value?.data) {
        const d = mRes.value.data;
        setMetrics({
          ingresosHoy: d.ingresosHoy ?? 0,
          ingresosMes: d.ingresosMes ?? 0,
          citasHoy: d.citasHoy ?? 0,
          citasSemana: d.citasSemana ?? 0,
          serviciosActivos: d.serviciosActivos ?? 0,
          ratingPromedio: d.ratingPromedio ?? 0,
          totalReviews: d.totalReviews ?? 0,
          pendingRequests: d.pendingRequests ?? 0,
        });
      }

      if (aRes.status === "fulfilled" && aRes.value?.data) {
        const arr = Array.isArray(aRes.value.data)
          ? aRes.value.data
          : Array.isArray(aRes.value.data?.items)
          ? aRes.value.data.items
          : [];
        setProximas(arr);
      }

      if (sRes.status === "fulfilled" && sRes.value?.data) {
        const d = sRes.value.data;
        setStats({
          completionRate: d.completionRate ?? 0,
          responseTime: d.responseTime ?? 0,
          cancellationRate: d.cancellationRate ?? 0,
        });
      }
    } catch (e) {
      console.error("Error cargando datos proveedor:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Proveedor";
  const avatarUrl = user?.avatarUrl;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  // Navegaciones
  const goProfile = () => navigation.navigate("Profile");
  const goMyServices = () => navigation.navigate("MyServices");
  const goServiceCreate = () => navigation.navigate("ServiceCreate");
  const goProviderStats = () => navigation.navigate("ProviderStats");
  const goSettings = () => navigation.navigate("Settings");
  const goAgenda = () => navigation.navigate("ProviderAgenda");
  const goRequests = () => navigation.navigate("ProviderRequests");
  const goReviews = () => navigation.navigate("ProviderReviews");
  const goEarnings = () => navigation.navigate("ProviderEarnings");
  const goNotifications = () => navigation.navigate("Notifications");

  return (
    <SafeAreaView style={ps.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />
      
      {/* HEADER AMARILLO CON LOGO */}
      <LinearGradient
        colors={[COLORS.yellow, COLORS.yellowDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ps.header}
      >
        <View style={ps.headerTop}>
          <View style={ps.headerLeft}>
            {/* Logo CiviHelper */}
            <AppLogo 
              source={require('../../assets/Logo3.png')} 
              size={44} 
              rounded={true}
            />
            <View>
              <Text style={ps.greetingText}>{getGreeting()}</Text>
              <Text style={ps.userName}>{firstName}</Text>
            </View>
          </View>

          <View style={ps.headerRight}>
            <TouchableOpacity style={ps.headerButton} onPress={goNotifications}>
              <Feather name="bell" size={20} color={COLORS.gray800} />
              {metrics.pendingRequests > 0 && (
                <View style={ps.notificationBadge}>
                  <Text style={ps.notificationBadgeText}>
                    {metrics.pendingRequests > 9 ? '9+' : metrics.pendingRequests}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={ps.headerButton} onPress={goProfile}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={ps.avatarImage} />
              ) : (
                <Feather name="user" size={20} color={COLORS.gray800} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Badge de rol */}
        <View style={ps.roleBadge}>
          <Feather name="briefcase" size={12} color={COLORS.purple} />
          <Text style={ps.roleBadgeText}>Panel de Proveedor</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={ps.scroll}
        contentContainerStyle={ps.scrollContent}
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
        {/* Avisos importantes */}
        <View style={ps.noticesSection}>
          {showWelcome && (
            <Notice
              icon="smile"
              type="info"
              text="¡Bienvenido! Gestiona tus servicios, citas y solicitudes desde aquí."
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          {metrics.pendingRequests > 0 && (
            <Notice
              icon="inbox"
              type="warning"
              text={`Tienes ${metrics.pendingRequests} solicitud${
                metrics.pendingRequests !== 1 ? "es" : ""
              } pendiente${metrics.pendingRequests !== 1 ? "s" : ""}`}
              onPress={goRequests}
            />
          )}

          {metrics.citasHoy > 0 && (
            <Notice
              icon="calendar"
              type="success"
              text={`Tienes ${metrics.citasHoy} cita${
                metrics.citasHoy !== 1 ? "s" : ""
              } programada${metrics.citasHoy !== 1 ? "s" : ""} para hoy`}
              onPress={goAgenda}
            />
          )}
        </View>

        {/* Resumen principal */}
        <View style={ps.section}>
          <View style={ps.sectionHeader}>
            <View style={ps.sectionTitleContainer}>
              <View style={ps.sectionIcon}>
                <Feather name="activity" size={18} color={COLORS.yellow} />
              </View>
              <Text style={ps.sectionTitle}>Resumen de hoy</Text>
            </View>
            <TouchableOpacity onPress={goProviderStats} hitSlop={8}>
              <View style={ps.seeAllButton}>
                <Text style={ps.linkText}>Ver más</Text>
                <Feather name="arrow-right" size={14} color={COLORS.yellow} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={ps.metricsGrid}>
            <MetricCard
              icon="dollar-sign"
              label="Ingresos hoy"
              value={`$${Number(metrics.ingresosHoy).toLocaleString("es-CL")}`}
              loading={loading}
              color={COLORS.success}
            />
            <MetricCard
              icon="calendar"
              label="Citas hoy"
              value={metrics.citasHoy}
              loading={loading}
              color={COLORS.yellow}
            />
            <MetricCard
              icon="briefcase"
              label="Servicios"
              value={metrics.serviciosActivos}
              loading={loading}
              color={COLORS.info}
            />
            <MetricCard
              icon="star"
              label="Rating"
              value={Number(metrics.ratingPromedio).toFixed(1)}
              loading={loading}
              color={COLORS.purple}
              suffix="/5"
            />
          </View>
        </View>

        {/* Estadísticas del mes */}
        <View style={ps.section}>
          <View style={ps.sectionHeader}>
            <View style={ps.sectionTitleContainer}>
              <View style={ps.sectionIcon}>
                <Feather name="trending-up" size={18} color={COLORS.yellow} />
              </View>
              <Text style={ps.sectionTitle}>Este mes</Text>
            </View>
          </View>
          <View style={ps.statsRow}>
            <View style={ps.statCard}>
              <View style={[ps.statIcon, { backgroundColor: `${COLORS.success}14` }]}>
                <Feather name="dollar-sign" size={18} color={COLORS.success} />
              </View>
              <View style={ps.statContent}>
                <Text style={ps.statLabel}>Ingresos totales</Text>
                <Text style={ps.statValue}>
                  ${Number(metrics.ingresosMes).toLocaleString("es-CL")}
                </Text>
              </View>
            </View>
            <View style={ps.statCard}>
              <View style={[ps.statIcon, { backgroundColor: `${COLORS.info}14` }]}>
                <Feather name="check-circle" size={18} color={COLORS.info} />
              </View>
              <View style={ps.statContent}>
                <Text style={ps.statLabel}>Citas semana</Text>
                <Text style={ps.statValue}>{metrics.citasSemana}</Text>
              </View>
            </View>
          </View>

          <View style={ps.statsRow}>
            <View style={ps.statCard}>
              <View style={[ps.statIcon, { backgroundColor: `${COLORS.warning}14` }]}>
                <Feather name="message-circle" size={18} color={COLORS.warning} />
              </View>
              <View style={ps.statContent}>
                <Text style={ps.statLabel}>Total reseñas</Text>
                <Text style={ps.statValue}>{metrics.totalReviews}</Text>
              </View>
            </View>
            <View style={ps.statCard}>
              <View style={[ps.statIcon, { backgroundColor: `${COLORS.purple}14` }]}>
                <Feather name="target" size={18} color={COLORS.purple} />
              </View>
              <View style={ps.statContent}>
                <Text style={ps.statLabel}>Completadas</Text>
                <Text style={ps.statValue}>{stats.completionRate}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Accesos rápidos */}
        <View style={ps.section}>
          <View style={ps.sectionHeader}>
            <View style={ps.sectionTitleContainer}>
              <View style={ps.sectionIcon}>
                <Feather name="grid" size={18} color={COLORS.yellow} />
              </View>
              <Text style={ps.sectionTitle}>Accesos rápidos</Text>
            </View>
          </View>
          <View style={ps.actionsGrid}>
            <QuickAction 
              icon="briefcase" 
              label="Mis servicios" 
              onPress={goMyServices} 
              color={COLORS.yellow} 
            />
            <QuickAction 
              icon="plus-circle" 
              label="Crear servicio" 
              onPress={goServiceCreate} 
              color={COLORS.success} 
            />
            <QuickAction 
              icon="calendar" 
              label="Agenda" 
              onPress={goAgenda} 
              badge={metrics.citasHoy} 
              color={COLORS.info} 
            />
            <QuickAction
              icon="inbox"
              label="Solicitudes"
              onPress={goRequests}
              badge={metrics.pendingRequests}
              color={COLORS.warning}
            />
            <QuickAction 
              icon="star" 
              label="Reseñas" 
              onPress={goReviews} 
              color={COLORS.purple} 
            />
            <QuickAction 
              icon="dollar-sign" 
              label="Ingresos" 
              onPress={goEarnings} 
              color={COLORS.success} 
            />
            <QuickAction 
              icon="bar-chart-2" 
              label="Estadísticas" 
              onPress={goProviderStats} 
              color={COLORS.info} 
            />
            <QuickAction 
              icon="settings" 
              label="Ajustes" 
              onPress={goSettings} 
              color={COLORS.gray500} 
            />
          </View>
        </View>

        {/* Próximas citas */}
        <View style={ps.section}>
          <View style={ps.sectionHeader}>
            <View style={ps.sectionTitleContainer}>
              <View style={ps.sectionIcon}>
                <Feather name="clock" size={18} color={COLORS.yellow} />
              </View>
              <Text style={ps.sectionTitle}>Próximas citas</Text>
            </View>
            <TouchableOpacity onPress={goAgenda} hitSlop={8}>
              <View style={ps.seeAllButton}>
                <Text style={ps.linkText}>Ver todas</Text>
                <Feather name="arrow-right" size={14} color={COLORS.yellow} />
              </View>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={ps.loadingContainer}>
              <ActivityIndicator color={COLORS.yellow} size="large" />
              <Text style={ps.loadingText}>Cargando agenda...</Text>
            </View>
          ) : proximas?.length > 0 ? (
            <View style={ps.appointmentsList}>
              {proximas.slice(0, 3).map((item, idx) => (
                <AppointmentCard 
                  key={item?.id ?? `appt-${idx}`} 
                  item={item} 
                  onPress={() => goAgenda()} 
                />
              ))}
            </View>
          ) : (
            <TouchableOpacity style={ps.emptyCard} onPress={goAgenda} activeOpacity={0.8}>
              <View style={ps.emptyIconWrap}>
                <Feather name="calendar" size={40} color={COLORS.yellow} />
              </View>
              <Text style={ps.emptyTitle}>Sin citas próximas</Text>
              <Text style={ps.emptyDesc}>
                Revisa tu disponibilidad para recibir más reservas
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tips profesionales */}
        <View style={ps.section}>
          <View style={ps.sectionHeader}>
            <View style={ps.sectionTitleContainer}>
              <View style={ps.sectionIcon}>
                <Feather name="lightbulb" size={18} color={COLORS.yellow} />
              </View>
              <Text style={ps.sectionTitle}>Consejos profesionales</Text>
            </View>
          </View>

          <TouchableOpacity style={ps.tipCard} activeOpacity={0.9}>
            <View style={[ps.tipIcon, { backgroundColor: `${COLORS.info}15` }]}>
              <Feather name="trending-up" size={20} color={COLORS.info} />
            </View>
            <View style={ps.tipContent}>
              <Text style={ps.tipTitle}>Aumenta tu visibilidad</Text>
              <Text style={ps.tipDesc}>
                Completa tu perfil al 100% y sube fotos de calidad de tus trabajos anteriores para generar confianza.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={ps.tipCard} activeOpacity={0.9}>
            <View style={[ps.tipIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <Feather name="clock" size={20} color={COLORS.success} />
            </View>
            <View style={ps.tipContent}>
              <Text style={ps.tipTitle}>Responde rápido</Text>
              <Text style={ps.tipDesc}>
                Las respuestas en menos de 1 hora aumentan hasta un 70% tus probabilidades de conseguir el trabajo.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={ps.tipCard} activeOpacity={0.9}>
            <View style={[ps.tipIcon, { backgroundColor: `${COLORS.purple}15` }]}>
              <Feather name="star" size={20} color={COLORS.purple} />
            </View>
            <View style={ps.tipContent}>
              <Text style={ps.tipTitle}>Consigue reseñas positivas</Text>
              <Text style={ps.tipDesc}>
                Ofrece un servicio excelente y pide a tus clientes satisfechos que te dejen una reseña.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 16,
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
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
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.purple,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  noticesSection: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.yellowLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.yellow,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
  },
  metricSuffix: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "23%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionIcon: {
    width: 44,
    height: 44,
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
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  quickBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "800",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 14,
  },
  loadingContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  appointmentsList: {
    gap: 10,
  },
  appointmentCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appointmentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  appointmentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  appointmentMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  appointmentMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.yellowLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.yellow,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  tipCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontWeight: "500",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noticeContent: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flex: 1,
  },
  noticeText: {
    fontSize: 13,
    flex: 1,
    flexWrap: "wrap",
    fontWeight: "600",
    lineHeight: 18,
  },
});