import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";

// 👇 ajusta la ruta si tu logo está en otro lado
import logo3 from "../../assets/Logo3.png";

// Placeholder API - reemplazar con llamadas reales
const API_BASE = "http://localhost:4000";

// color oscuro fijo para el header amarillo (no dependemos de Colors.text)
const DARK = "#0F172A";

const getStatusColor = (priority) => {
  if (priority === "CRITICAL") return Colors.coral;
  if (priority === "HIGH") return "#FB923C";
  if (priority === "MEDIUM") return Colors.primary;
  return Colors.sub;
};

const getStatusLabel = (priority) => {
  const labels = {
    CRITICAL: "Crítico",
    HIGH: "Alto",
    MEDIUM: "Medio",
    LOW: "Bajo",
  };
  return labels[priority] || priority;
};

/* ======================== HEADER ======================== */
function Header({ totalCount, unreadCount }) {
  const navigation = useNavigation();
  const showBack = navigation?.canGoBack?.() === true;
  const safeBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminHome");
  };

  return (
    <LinearGradient
      colors={["#FFD100", "#F5C400"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.header}
    >
      {/* Fila superior */}
      <View style={s.headerTopRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.backBtn}
            accessibilityLabel="Volver"
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={DARK} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Contenido */}
      <View style={s.headerContent}>
        {/* logo + textos */}
        <View style={s.headerRow}>
          <View style={s.logoWrap}>
            <Image source={logo3} style={s.logo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>PANEL ADMIN</Text>
            <Text style={s.title}>Moderación</Text>
            <Text style={s.sub}>
              Revisa y gestiona reportes de usuarios y servicios
            </Text>
          </View>
        </View>

        {/* Pastillas de stats */}
        <View style={s.statsRow}>
          <View style={s.statPill}>
            <Text style={s.statNumber}>{totalCount}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statPill}>
            <Text style={s.statNumber}>{unreadCount}</Text>
            <Text style={s.statLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={s.quickActionsRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminUsers")}
            style={[s.btn, s.btnLight]}
            activeOpacity={0.7}
          >
            <Feather name="users" size={16} color={DARK} />
            <Text style={s.btnLightTxt}>Usuarios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminServices")}
            style={[s.btn, s.btnLight]}
            activeOpacity={0.7}
          >
            <Feather name="briefcase" size={16} color={DARK} />
            <Text style={s.btnLightTxt}>Servicios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

/* ======================== SEARCH ======================== */
function SearchBar({ value, onChangeText, loading }) {
  return (
    <View style={s.searchContainer}>
      <Feather name="search" size={16} color={Colors.sub} />
      <TextInput
        style={s.searchInput}
        placeholder="Buscar por ID, usuario, servicio..."
        placeholderTextColor={Colors.sub}
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
        accessibilityLabel="Buscar reportes"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Feather name="x" size={16} color={Colors.sub} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ======================== ROW DE REPORTE ======================== */
function ReportRow({ item, onReview, onBlock, onResolve }) {
  const priorityColor = getStatusColor(item.priority);
  const typeIcon = item.type === "USER" ? "user" : "briefcase";
  const typeLabel = item.type === "USER" ? "Usuario" : "Servicio";

  return (
    <TouchableOpacity
      style={[s.card, shadows.md]}
      onPress={() => onReview(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Reporte: ${item.title}`}
    >
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.rowHeaderTop}>
            <View
              style={[
                s.badgeType,
                {
                  backgroundColor: Colors.withOpacity(priorityColor, 0.15),
                  borderColor: Colors.withOpacity(priorityColor, 0.2),
                },
              ]}
            >
              <Feather name={typeIcon} size={12} color={priorityColor} />
              <Text style={[s.badgeTypeTxt, { color: priorityColor }]}>
                {typeLabel}
              </Text>
            </View>
            <View style={[s.priorityBadge, { borderColor: priorityColor }]}>
              <View style={[s.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[s.priorityText, { color: priorityColor }]}>
                {getStatusLabel(item.priority)}
              </Text>
            </View>
          </View>

          <Text style={s.titleRow} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.reportId}>{item.id}</Text>
        </View>
      </View>

      {/* Reason */}
      <Text style={s.reason} numberOfLines={2}>
        {item.reason}
      </Text>

      {/* Meta info */}
      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Feather name="calendar" size={12} color={Colors.sub} />
          <Text style={s.metaText}>{item.date}</Text>
        </View>
        {item.reportCount > 1 && (
          <View style={s.metaItem}>
            <Feather name="alert-circle" size={12} color={Colors.coral} />
            <Text style={[s.metaText, { color: Colors.coral }]}>
              {item.reportCount} reportes
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actionsRow}>
        <TouchableOpacity
          onPress={() => onReview(item)}
          style={[s.aBtn, s.aBtnPrimary]}
        >
          <Feather name="eye" size={14} color={Colors.primary} />
          <Text style={s.aBtnPrimaryTxt}>Revisar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onResolve(item)}
          style={[s.aBtn, s.aBtnGhost]}
        >
          <Feather name="check" size={14} color={Colors.success} />
          <Text style={[s.aBtnGhostTxt, { color: Colors.success }]}>
            Resolver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onBlock(item)}
          style={[s.aBtn, s.aBtnDanger]}
        >
          <Feather name="lock" size={14} color="#fff" />
          <Text style={s.aBtnDangerTxt}>Bloquear</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* ======================== PANTALLA ======================== */
export default function AdminModeration() {
  const [allReports, setAllReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      // aquí iría fetch real
      setAllReports([
        {
          id: "RPT-001",
          type: "SERVICE",
          title: "Limpieza de alfombras - Casa Bella",
          reason: "Contenido engañoso: Precio publicado $50k pero cobra $80k",
          priority: "HIGH",
          date: "hace 2 horas",
          reportCount: 3,
        },
        {
          id: "RPT-002",
          type: "USER",
          title: "Usuario: juan.perez",
          reason: "Conducta inapropiada en mensajes con clientes",
          priority: "CRITICAL",
          date: "hace 30 min",
          reportCount: 1,
        },
        {
          id: "RPT-003",
          type: "SERVICE",
          title: "Reparación de tuberías - AquaFix",
          reason: "Servicio no entregado, cliente reporta estafa",
          priority: "CRITICAL",
          date: "ayer",
          reportCount: 2,
        },
        {
          id: "RPT-004",
          type: "USER",
          title: "Usuario: maria.garcia",
          reason: "Imágenes inapropiadas en perfil",
          priority: "MEDIUM",
          date: "hace 3 días",
          reportCount: 1,
        },
      ]);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar reportes");
      console.error("Load reports error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return allReports;
    const query = searchQuery.toLowerCase();
    return allReports.filter(
      (r) =>
        r.id.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query)
    );
  }, [allReports, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onReview = (item) => {
    const message =
      item.type === "SERVICE"
        ? `Revisar servicio: ${item.title}\n\nPrioridad: ${getStatusLabel(
            item.priority
          )}\nReportes: ${item.reportCount}`
        : `Revisar usuario: ${item.title}\n\nPrioridad: ${getStatusLabel(
            item.priority
          )}\nReportes: ${item.reportCount}`;

    Alert.alert("Detalles del reporte", message, [{ text: "OK" }]);
  };

  const onBlock = (item) => {
    Alert.alert(
      "Confirmar bloqueo",
      `¿Bloquear este ${
        item.type === "SERVICE" ? "servicio" : "usuario"
      }?\n\n${item.title}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(item.id);
              setAllReports((prev) =>
                prev.map((r) =>
                  r.id === item.id ? { ...r, status: "BLOCKED" } : r
                )
              );
              Alert.alert(
                "Éxito",
                `${
                  item.type === "SERVICE" ? "Servicio" : "Usuario"
                } bloqueado.`
              );
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo bloquear.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const onResolve = (item) => {
    Alert.alert(
      "Marcar como resuelto",
      `¿Resolver este reporte?\n\n${item.title}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resolver",
          onPress: async () => {
            try {
              setActionLoading(item.id);
              setAllReports((prev) => prev.filter((r) => r.id !== item.id));
              Alert.alert("Éxito", "Reporte marcado como resuelto.");
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo resolver.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const ListHeader = (
    <>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        loading={loading}
      />
      {err && (
        <View style={s.errorCard}>
          <View style={s.errorContent}>
            <Feather name="alert-circle" size={20} color={Colors.coral} />
            <Text style={s.errorText}>{err}</Text>
          </View>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const ListEmptyComponent = (
    <View style={s.empty}>
      <Feather
        name={searchQuery ? "search" : "shield"}
        size={44}
        color={Colors.sub}
        style={{ marginBottom: 12 }}
      />
      <Text style={s.emptyTitle}>
        {searchQuery ? "Sin resultados" : "No hay reportes pendientes"}
      </Text>
      <Text style={s.emptySub}>
        {searchQuery
          ? "Intenta con otro término de búsqueda"
          : "¡El sistema está funcionando correctamente! 🎉"}
      </Text>
      {searchQuery && (
        <TouchableOpacity onPress={() => setSearchQuery("")} style={s.clearBtn}>
          <Feather name="x" size={16} color={Colors.primary} />
          <Text style={s.clearBtnText}>Limpiar búsqueda</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const unreadCount = allReports.filter((r) => r.priority === "CRITICAL").length;

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <Header totalCount={allReports.length} unreadCount={unreadCount} />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>Cargando reportes…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={(x) => String(x.id)}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.xl,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <ReportRow
                item={item}
                onReview={onReview}
                onBlock={onBlock}
                onResolve={onResolve}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmptyComponent}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* ======================== STYLES ======================== */
const s = StyleSheet.create({
  /* HEADER */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 10, android: 16 }),
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 30,
    height: 30,
  },
  kicker: {
    color: DARK,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 2,
  },
  title: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "800",
  },
  sub: {
    color: DARK,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statPill: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
  },
  statNumber: {
    color: DARK,
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "rgba(15,23,42,0.55)",
    fontSize: 11,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnLight: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.xs,
  },
  btnLightTxt: {
    color: DARK,
    fontWeight: "800",
    fontSize: 13,
  },

  /* SEARCH */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },

  /* LOADING */
  loadingBox: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.sub,
    fontSize: 14,
    marginTop: 8,
  },

  /* CARD */
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  rowHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  badgeType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeTypeTxt: {
    fontWeight: "700",
    fontSize: 11,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: "auto",
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  priorityText: {
    fontWeight: "700",
    fontSize: 11,
  },
  titleRow: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 2,
  },
  reportId: {
    color: Colors.sub,
    fontSize: 11,
    fontStyle: "italic",
  },
  reason: {
    color: Colors.text,
    fontSize: 13,
    marginVertical: spacing.sm,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: Colors.sub,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  aBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  aBtnPrimary: {
    backgroundColor: Colors.withOpacity(Colors.primary, 0.12),
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  aBtnPrimaryTxt: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  aBtnGhost: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aBtnGhostTxt: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  aBtnDanger: {
    backgroundColor: Colors.coral,
  },
  aBtnDangerTxt: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  /* ERROR */
  errorCard: {
    backgroundColor: Colors.withOpacity(Colors.coral, 0.12),
    borderColor: Colors.coral,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.coral,
    fontWeight: "700",
    flex: 1,
    fontSize: 14,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: Colors.withOpacity(Colors.coral, 0.2),
  },
  retryText: {
    color: Colors.coral,
    fontWeight: "800",
    fontSize: 12,
  },

  /* EMPTY */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.sub,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.12),
  },
  clearBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});
