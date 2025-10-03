// src/screens/admin/AdminUsers.js
import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
import {
  adminListUsers,
  adminToggleBlockUser,
  adminSetUserRole,
} from "../../services/api";

const ROLE_LABEL = { ADMIN: "Admin", PROVIDER: "Proveedor", CLIENT: "Usuario" };

function Header() {
  const navigation = useNavigation();
  const canBack = navigation?.canGoBack?.() === true;
  const safeBack = () => (canBack ? navigation.goBack() : navigation.navigate("AdminHome"));

  return (
    <LinearGradient
      colors={Colors.gradients?.hero || [Colors.primary, "#111827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.hero}
    >
      <View style={s.heroTop}>
        {canBack ? (
          <TouchableOpacity style={s.iconBtn} onPress={safeBack} accessibilityLabel="Volver">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}

        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <Text style={s.brand} numberOfLines={1}>Panel Admin</Text>
          <Text style={s.subtitle} numberOfLines={1}>Usuarios</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>
    </LinearGradient>
  );
}

function UserRow({ item, onView, onToggleBlock, onPromote }) {
  const role = (item?.role || "CLIENT").toUpperCase();
  const isBlocked = !!item?.blocked;

  return (
    <View style={[s.card, shadows.md]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.titleRow} numberOfLines={1}>{item?.name || item?.email || "Usuario"}</Text>
        <Text style={s.metaRow} numberOfLines={1}>{item?.email ?? "—"}</Text>

        <View style={s.tagsRow}>
          <View style={s.badge}>
            <Feather name="shield" size={12} color={Colors.primary} />
            <Text style={s.badgeText}>{ROLE_LABEL[role] || role}</Text>
          </View>
          {isBlocked && (
            <View style={[s.badge, { borderColor: Colors.error }]}>
              <Feather name="slash" size={12} color={Colors.error} />
              <Text style={[s.badgeText, { color: Colors.error }]}>Bloqueado</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.actionsCol}>
        <TouchableOpacity onPress={() => onView(item)} style={s.ghostBtn} accessibilityLabel="Ver">
          <Feather name="eye" size={16} color={Colors.text} />
          <Text style={s.ghostTxt}>Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleBlock(item)}
          style={s.ghostBtn}
          accessibilityLabel={isBlocked ? "Desbloquear" : "Bloquear"}
        >
          <Feather name="slash" size={16} color={isBlocked ? Colors.success : Colors.error} />
          <Text style={[s.ghostTxt, { color: isBlocked ? Colors.success : Colors.error }]}>
            {isBlocked ? "Desbloquear" : "Bloquear"}
          </Text>
        </TouchableOpacity>
        {role !== "ADMIN" && (
          <TouchableOpacity onPress={() => onPromote(item)} style={s.ghostBtn} accessibilityLabel="Promover a Admin">
            <Feather name="arrow-up-circle" size={16} color={Colors.primary} />
            <Text style={[s.ghostTxt, { color: Colors.primary }]}>Promover</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await adminListUsers(); // usa fallback a /users si /admin/users no existe
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const onView = (user) => {
    Alert.alert("Usuario", `Email: ${user?.email ?? "—"}\nRol: ${user?.role ?? "—"}`);
  };

  const onToggleBlock = async (user) => {
    const blocked = !!user?.blocked;
    const title = blocked ? "Desbloquear usuario" : "Bloquear usuario";
    Alert.alert(title, user?.email || user?.name || "Usuario", [
      { text: "Cancelar", style: "cancel" },
      {
        text: blocked ? "Desbloquear" : "Bloquear",
        style: "destructive",
        onPress: async () => {
          try {
            await adminToggleBlockUser(user.id, !blocked);
            await load();
          } catch (e) {
            Alert.alert("Error", e?.message || "No se pudo aplicar la acción.");
          }
        },
      },
    ]);
  };

  const onPromote = async (user) => {
    Alert.alert("Promover a ADMIN", user?.email || user?.name || "Usuario", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Promover",
        onPress: async () => {
          try {
            await adminSetUserRole(user.id, "ADMIN");
            await load();
          } catch (e) {
            Alert.alert("Error", e?.message || "No se pudo promover.");
          }
        },
      },
    ]);
  };

  const ListHeader = err ? (
    <View style={s.errorCard}>
      <Text style={s.errorText}>⚠️ {err}</Text>
      <TouchableOpacity onPress={load} style={s.retryBtn}>
        <Text style={s.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <Header />

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={{ marginTop: 8, color: Colors.sub }}>Cargando usuarios…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it, idx) => String(it?.id ?? idx)}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <UserRow
                item={item}
                onView={onView}
                onToggleBlock={onToggleBlock}
                onPromote={onPromote}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={{ color: Colors.sub, marginBottom: 8 }}>
                  No hay usuarios disponibles.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  // Header / hero
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 12, default: 12 }),
    paddingBottom: 16,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  subtitle: { color: Colors.sub, marginTop: 2, fontSize: 13 },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.withOpacity(Colors.text, 0.40),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.withOpacity(Colors.primary, 0.08),
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },

  // Card estilo glass
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
  },

  titleRow: { color: Colors.text, fontWeight: "800" },
  metaRow: { color: Colors.sub, marginTop: 2, fontSize: 12 },

  tagsRow: { flexDirection: "row", gap: 8, marginTop: 8 },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.10),
    alignSelf: "flex-start",
  },
  badgeText: { fontWeight: "700", fontSize: 12, color: Colors.text },

  actionsCol: { alignItems: "flex-end", gap: 6, marginLeft: 8 },

  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostTxt: { fontWeight: "800", color: Colors.text, fontSize: 12 },

  // Errores
  errorCard: {
    backgroundColor: Colors.withOpacity(Colors.error, 0.12),
    borderColor: Colors.error,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: { color: Colors.error, fontWeight: "700" },
  retryBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: Colors.withOpacity(Colors.error, 0.20),
  },
  retryText: { color: Colors.error, fontWeight: "800" },
});


