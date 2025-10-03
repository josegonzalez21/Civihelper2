// src/screens/admin/AdminServices.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
import { adminListServices, adminDeleteService } from "../../services/api";

function formatPriceCL(value) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Number(value).toLocaleString("es-CL")}`;
  }
}

/* =========================
   Header (estilo similar al Login)
========================= */
function Header({ onCreate }) {
  const navigation = useNavigation();
  const canBack = navigation?.canGoBack?.() === true;
  const safeBack = () => {
    if (canBack) navigation.goBack();
    else navigation.navigate("AdminHome");
  };

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
          <Text style={s.brand} numberOfLines={1}>
            Panel Admin
          </Text>
          <Text style={s.subtitle} numberOfLines={1}>
            Servicios curados
          </Text>
        </View>

        <TouchableOpacity
          onPress={onCreate}
          style={[s.ctaBtn, shadows.xs]}
          accessibilityLabel="Crear servicio curado"
        >
          <Feather name="plus" size={18} color="#0F172A" />
          <Text style={s.ctaTxt}>Nuevo</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/* =========================
   Fila de Servicio (card estilo login)
========================= */
function ServiceRow({ item, onEdit, onDelete }) {
  return (
    <TouchableOpacity style={[s.card, shadows.md]} onPress={() => onEdit(item)} activeOpacity={0.9}>
      {item?.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={s.thumbImg} resizeMode="cover" />
      ) : (
        <View style={s.thumbFallback}>
          <Feather name="image" size={18} color="#fff" />
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.titleRow} numberOfLines={1}>
          {item.title || "Servicio"}
        </Text>
        <Text style={s.metaRow} numberOfLines={2}>
          {item?.serviceType?.name ? `${item.serviceType.name} · ` : ""}
          {item.city ? `${item.city} · ` : ""}
          {item.priceFrom != null ? `Desde ${formatPriceCL(item.priceFrom)}` : "Precio a convenir"}
        </Text>

        <View style={s.tagsRow}>
          <View style={s.badge}>
            <Feather name="star" size={12} color={Colors.coral} />
            <Text style={s.badgeText}>
              {item.ratingAvg != null ? Number(item.ratingAvg).toFixed(1) : "—"}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.actionsCol}>
        <TouchableOpacity onPress={() => onEdit(item)} style={[s.ghostBtn]} accessibilityLabel="Editar">
          <Feather name="edit-2" size={16} color={Colors.primary} />
          <Text style={[s.ghostTxt, { color: Colors.primary }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={[s.ghostBtn]} accessibilityLabel="Eliminar">
          <Feather name="trash-2" size={16} color={Colors.coral} />
          <Text style={[s.ghostTxt, { color: Colors.coral }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* =========================
   Pantalla
========================= */
export default function AdminServices() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await adminListServices(); // GET /api/admin/services
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) load();
    }, [load, loading])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onCreate = () => {
    try {
      // Si tienes pantalla específica para crear, usa: navigation.navigate("AdminServiceCreate")
      navigation.navigate("AdminCategories");
    } catch {
      Alert.alert(
        "Falta pantalla",
        "No existe la pantalla 'AdminCategories'. Regístrala en tu navigator o avísame y la generamos."
      );
    }
  };

  const onEdit = (item) => {
    try {
      navigation.navigate("AdminServiceEdit", { id: item.id });
    } catch {
      Alert.alert(
        "Falta pantalla",
        "No existe la pantalla 'AdminServiceEdit'. Regístrala en tu navigator o avísame y la generamos."
      );
    }
  };

  const onDelete = (item) => {
    Alert.alert(
      "Eliminar servicio",
      `¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteService(item.id);
              setItems((prev) => prev.filter((x) => x.id !== item.id));
            } catch (e) {
              Alert.alert("Error", e?.message || "No se pudo eliminar.");
            }
          },
        },
      ]
    );
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
        <Header onCreate={onCreate} />

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 8, color: Colors.sub }}>Cargando servicios…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <ServiceRow item={item} onEdit={onEdit} onDelete={onDelete} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={{ color: Colors.sub, marginBottom: 8 }}>
                  No hay servicios curados aún.
                </Text>
                <TouchableOpacity onPress={onCreate} style={[s.ctaOutline, shadows.xs]}>
                  <Feather name="plus-circle" size={16} color={Colors.primary} />
                  <Text style={s.ctaOutlineTxt}>Crear el primero</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* FAB estilo primario (coherente con Login) */}
        <TouchableOpacity style={s.fab} onPress={onCreate} accessibilityLabel="Crear servicio curado">
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </RoleGuard>
  );
}

/* =========================
   Estilos (alineados a Login)
========================= */
const s = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 12 }),
    paddingBottom: 16,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brand: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.92)", marginTop: 2, fontSize: 13 },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctaTxt: { color: "#0F172A", fontWeight: "800" },

  // Lista / Cards
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
  thumbImg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.08),
  },
  thumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: Colors.card,
    alignSelf: "flex-start",
  },
  badgeText: { fontWeight: "700", fontSize: 12, color: Colors.text },

  actionsCol: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ghostTxt: { fontWeight: "800", color: Colors.text, fontSize: 12 },

  // Error (coincide con lenguaje del Login)
  errorCard: {
    backgroundColor: Colors.withOpacity(Colors.coral, 0.12),
    borderColor: Colors.coral,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: { color: Colors.coral, fontWeight: "700" },
  retryBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: Colors.withOpacity(Colors.coral, 0.2),
  },
  retryText: { color: Colors.coral, fontWeight: "800" },

  // FAB primario
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg * 2,
    width: 56,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
