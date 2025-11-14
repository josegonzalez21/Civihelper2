import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
import {
  adminListUsers,
  adminToggleBlockUser,
  adminSetUserRole,
} from "../../services/api";

// 👇 agregamos el logo
import logo3 from "../../assets/Logo3.png";

const ROLE_LABEL = { ADMIN: "Admin", PROVIDER: "Proveedor", CLIENT: "Usuario" };
const ROLE_COLORS = {
  ADMIN: { bg: "#111827", text: "#fff" },
  PROVIDER: { bg: "#F97316", text: "#fff" },
  CLIENT: { bg: "#E5E7EB", text: "#111827" },
};

function Header() {
  const navigation = useNavigation();
  const canBack = navigation?.canGoBack?.() === true;
  const safeBack = () =>
    canBack ? navigation.goBack() : navigation.navigate("AdminHome");

  return (
    <View style={s.header}>
      <View style={s.headerTopRow}>
        {canBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.backBtn}
            accessibilityLabel="Volver"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <View style={s.headerContent}>
        <View style={s.headerRow}>
          <View style={s.logoWrap}>
            <Image source={logo3} style={s.logo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>PANEL ADMIN</Text>
            <Text style={s.title}>Usuarios</Text>
            <Text style={s.sub}>
              Gestiona roles, bloqueos y datos de las cuentas registradas.
            </Text>
          </View>
        </View>

        <View style={s.headerChips}>
          <View style={s.headerChip}>
            <Feather name="shield" size={13} color="#0F172A" />
            <Text style={s.headerChipText}>Control seguro</Text>
          </View>
          <View style={s.headerChip}>
            <Feather name="users" size={13} color="#0F172A" />
            <Text style={s.headerChipText}>Listado actualizado</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SearchBar({ value, onChangeText, loading }) {
  return (
    <View style={s.searchContainer}>
      <Feather name="search" size={16} color="#6B7280" />
      <TextInput
        style={s.searchInput}
        placeholder="Buscar por nombre o correo…"
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Feather name="x" size={16} color="#6B7280" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function UserRow({ item, onView, onToggleBlock, onPromote }) {
  const role = (item?.role || "CLIENT").toUpperCase();
  const isBlocked = !!item?.blocked;
  const roleColors = ROLE_COLORS[role] || ROLE_COLORS.CLIENT;

  return (
    <View style={s.userCard}>
      {/* Avatar */}
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {(item?.name?.[0] || item?.email?.[0] || "U").toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.userName} numberOfLines={1}>
          {item?.name || item?.email || "Usuario"}
        </Text>
        <Text style={s.userEmail} numberOfLines={1}>
          {item?.email ?? "—"}
        </Text>

        <View style={s.badgeRow}>
          <View
            style={[
              s.roleBadge,
              { backgroundColor: roleColors.bg, borderColor: roleColors.bg },
            ]}
          >
            <Feather
              name="shield"
              size={11}
              color={roleColors.text}
              style={{ marginRight: 2 }}
            />
            <Text style={[s.roleBadgeText, { color: roleColors.text }]}>
              {ROLE_LABEL[role] || role}
            </Text>
          </View>

          {isBlocked && (
            <View style={s.blockedBadge}>
              <Feather name="lock" size={11} color="#DC2626" />
              <Text style={s.blockedBadgeText}>Bloqueado</Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={s.actionsCol}>
        <TouchableOpacity onPress={() => onView(item)} style={s.actionBtn}>
          <Feather name="eye" size={16} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggleBlock(item)} style={s.actionBtn}>
          <Feather
            name={isBlocked ? "unlock" : "lock"}
            size={16}
            color={isBlocked ? "#22C55E" : "#DC2626"}
          />
        </TouchableOpacity>
        {role !== "ADMIN" && (
          <TouchableOpacity onPress={() => onPromote(item)} style={s.actionBtn}>
            <Feather name="arrow-up-circle" size={16} color="#0F172A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AdminUsers() {
  const [allItems, setAllItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await adminListUsers();
      setAllItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setAllItems([]);
      setErr(e?.message || "No se pudo cargar la lista.");
      console.error("Load users error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase();
    return allItems.filter(
      (u) =>
        (u?.name || "").toLowerCase().includes(q) ||
        (u?.email || "").toLowerCase().includes(q)
    );
  }, [allItems, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onView = (user) => {
    const createdAt = user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString("es-ES")
      : "—";
    const blockedStatus = user?.blocked ? "Sí (Bloqueado)" : "No";

    Alert.alert(
      "Detalles del Usuario",
      `Nombre: ${user?.name || "—"}\nEmail: ${user?.email || "—"}\nRol: ${
        user?.role || "—"
      }\nEstado: ${blockedStatus}\nRegistro: ${createdAt}`,
      [{ text: "Cerrar", style: "cancel" }]
    );
  };

  const onToggleBlock = (user) => {
    const blocked = !!user?.blocked;
    Alert.alert(
      blocked ? "Desbloquear usuario" : "Bloquear usuario",
      `¿${
        blocked ? "Desbloquear" : "Bloquear"
      } a ${user?.email || user?.name || "este usuario"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: blocked ? "Desbloquear" : "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(user.id);
              await adminToggleBlockUser(user.id, !blocked);
              await load();
              Alert.alert(
                "Éxito",
                `Usuario ${blocked ? "desbloqueado" : "bloqueado"} correctamente.`
              );
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo aplicar la acción.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const onPromote = (user) => {
    Alert.alert(
      "Promover a ADMIN",
      `¿Promover a ${user?.email || user?.name || "este usuario"} a administrador?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, promover",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(user.id);
              await adminSetUserRole(user.id, "ADMIN");
              await load();
              Alert.alert("Éxito", "Usuario promovido a administrador.");
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo promover al usuario.");
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
            <Feather name="alert-circle" size={20} color="#DC2626" />
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
        name={searchQuery ? "search" : "users"}
        size={44}
        color="#94A3B8"
        style={{ marginBottom: 10 }}
      />
      <Text style={s.emptyTitle}>
        {searchQuery ? "Sin resultados" : "No hay usuarios"}
      </Text>
      <Text style={s.emptySub}>
        {searchQuery
          ? "Prueba con otro nombre o correo"
          : "Cuando se registren usuarios aparecerán aquí."}
      </Text>
      {searchQuery ? (
        <TouchableOpacity onPress={() => setSearchQuery("")} style={s.clearBtn}>
          <Feather name="x" size={14} color="#0F172A" />
          <Text style={s.clearBtnText}>Limpiar búsqueda</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={s.safe}>
        <Header />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={s.loadingText}>Cargando usuarios…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(it, idx) => String(it?.id ?? idx)}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.xl,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <UserRow
                item={item}
                onView={onView}
                onToggleBlock={onToggleBlock}
                onPromote={onPromote}
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
            scrollIndicatorInsets={{ right: 1 }}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },

  /* ===== Header amarillo ===== */
  header: {
    backgroundColor: "#FFD100",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 16 }),
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadows.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  kicker: {
    color: "#0F172A",
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
  },
  sub: {
    color: "#0F172A",
    opacity: 0.8,
    fontSize: 13,
    lineHeight: 18,
  },
  headerChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  headerChip: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerChipText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ===== Search ===== */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.xs,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "500",
  },

  /* ===== User Card ===== */
  userCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    padding: 12,
    alignItems: "center",
    ...shadows.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  userName: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 15,
  },
  userEmail: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontWeight: "700",
    fontSize: 11,
  },
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderColor: "#DC2626",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  blockedBadgeText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  actionsCol: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF7C2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },

  /* ===== Error ===== */
  errorCard: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderColor: "#DC2626",
    borderWidth: 1,
    padding: 12,
    borderRadius: 16,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "700",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  /* ===== Empty ===== */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySub: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  clearBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFE48B",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  clearBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },

  /* ===== Loading ===== */
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
  },
});
