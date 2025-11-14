// src/screens/admin/AdminServices.js
import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";
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
  TextInput,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
import {
  adminListServices,
  adminDeleteService,
} from "../../services/api";

// usa el mismo logo que tus otras pantallas
import logo3 from "../../assets/Logo3.png";

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

function Header({ onCreate }) {
  const navigation = useNavigation();
  const canBack = navigation?.canGoBack?.() === true;
  const safeBack = () => {
    if (canBack) navigation.goBack();
    else navigation.navigate("AdminHome");
  };

  return (
    <View style={s.header}>
      <View style={s.headerTop}>
        {canBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.headerIcon}
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}

        <TouchableOpacity
          onPress={onCreate}
          style={s.headerAction}
          accessibilityLabel="Crear servicio curado"
        >
          <Feather name="plus" size={18} color="#111827" />
          <Text style={s.headerActionTxt}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.headerInfo}>
        <View style={s.logoBox}>
          <Image source={logo3} style={s.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerKicker}>ADMINISTRACIÓN</Text>
          <Text style={s.headerTitle}>Servicios</Text>
          <Text style={s.headerSub}>
            Gestiona los servicios curados publicados en la plataforma.
          </Text>
        </View>
      </View>

      <View style={s.headerChips}>
        <View style={s.chip}>
          <Feather name="shield" size={13} color="#111827" />
          <Text style={s.chipTxt}>Solo admin</Text>
        </View>
        <View style={s.chip}>
          <Feather name="map-pin" size={13} color="#111827" />
          <Text style={s.chipTxt}>Filtra por ciudad</Text>
        </View>
      </View>
    </View>
  );
}

function SearchBar({ value, onChangeText, loading }) {
  return (
    <View style={s.searchCard}>
      <Feather name="search" size={16} color="#4B5563" />
      <TextInput
        style={s.searchInput}
        placeholder="Buscar por nombre, tipo o ciudad..."
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Feather name="x" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ServiceRow({ item, onEdit, onDelete }) {
  const ratingColor =
    item?.ratingAvg >= 4.5
      ? Colors.success
      : item?.ratingAvg >= 3.5
      ? Colors.primary
      : Colors.coral;

  return (
    <TouchableOpacity
      style={s.serviceCard}
      onPress={() => onEdit(item)}
      activeOpacity={0.85}
    >
      {/* Imagen */}
      {item?.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={s.serviceImg} />
      ) : (
        <View style={s.serviceImgFallback}>
          <Feather name="image" size={20} color="#fff" />
        </View>
      )}

      {/* Info */}
      <View style={s.serviceInfo}>
        <Text style={s.serviceTitle} numberOfLines={1}>
          {item.title || "Servicio"}
        </Text>
        <Text style={s.serviceMeta} numberOfLines={2}>
          {item?.serviceType?.name ? `${item.serviceType.name} · ` : ""}
          {item.city || "Sin ciudad"}
        </Text>

        <View style={s.serviceRowBottom}>
          {item.priceFrom != null ? (
            <Text style={s.priceTag}>
              Desde {formatPriceCL(item.priceFrom)}
            </Text>
          ) : (
            <Text style={s.priceTagMuted}>Precio a convenir</Text>
          )}

          {item.ratingAvg != null && (
            <View style={[s.ratingChip, { borderColor: ratingColor }]}>
              <Feather name="star" size={11} color={ratingColor} />
              <Text style={[s.ratingTxt, { color: ratingColor }]}>
                {Number(item.ratingAvg).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={s.serviceActions}>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          style={s.serviceActionBtn}
        >
          <Feather name="edit-2" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          style={s.serviceActionBtn}
        >
          <Feather name="trash-2" size={16} color={Colors.coral} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminServices() {
  const navigation = useNavigation();

  const [allItems, setAllItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await adminListServices();
      setAllItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setAllItems([]);
      setErr(e?.message || "No se pudo cargar los servicios.");
      console.error("Load services error:", e);
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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const query = searchQuery.toLowerCase();
    return allItems.filter(
      (service) =>
        (service?.title || "").toLowerCase().includes(query) ||
        (service?.city || "").toLowerCase().includes(query) ||
        (service?.serviceType?.name || "").toLowerCase().includes(query)
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

  const onCreate = () => {
    try {
      navigation.navigate("AdminServiceCreate");
    } catch {
      Alert.alert(
        "Falta pantalla",
        "No existe la pantalla 'AdminServiceCreate'. Regístrala en tu navigator."
      );
    }
  };

  const onEdit = (item) => {
    try {
      navigation.navigate("AdminServiceEdit", { id: item.id });
    } catch {
      Alert.alert(
        "Falta pantalla",
        "No existe la pantalla 'AdminServiceEdit'. Regístrala en tu navigator."
      );
    }
  };

  const onDelete = (item) => {
    Alert.alert(
      "Eliminar servicio",
      `¿Eliminar "${item.title}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(item.id);
              await adminDeleteService(item.id);
              setAllItems((prev) => prev.filter((x) => x.id !== item.id));
              Alert.alert("Éxito", "Servicio eliminado correctamente.");
            } catch (e) {
              Alert.alert(
                "Error",
                e?.message || "No se pudo eliminar el servicio."
              );
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
          <View style={s.errorRow}>
            <Feather name="alert-circle" size={20} color="#DC2626" />
            <Text style={s.errorTxt}>{err}</Text>
          </View>
          <TouchableOpacity onPress={load} style={s.errorBtn}>
            <Text style={s.errorBtnTxt}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const ListEmptyComponent = (
    <View style={s.emptyBox}>
      <Feather
        name={searchQuery ? "search" : "briefcase"}
        size={48}
        color="#9CA3AF"
      />
      <Text style={s.emptyTitle}>
        {searchQuery ? "Sin resultados" : "No hay servicios curados"}
      </Text>
      <Text style={s.emptySub}>
        {searchQuery
          ? "Prueba con otro término o limpia la búsqueda."
          : "Crea un nuevo servicio para que aparezca aquí."}
      </Text>
      {searchQuery ? (
        <TouchableOpacity
          onPress={() => setSearchQuery("")}
          style={s.clearBtn}
        >
          <Feather name="x" size={15} color={Colors.primary} />
          <Text style={s.clearBtnTxt}>Limpiar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onCreate} style={s.emptyCta}>
          <Feather name="plus-circle" size={16} color="#111827" />
          <Text style={s.emptyCtaTxt}>Crear servicio</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={s.safe}>
        <Header onCreate={onCreate} />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingTxt}>Cargando servicios…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={s.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <ServiceRow
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
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

        <TouchableOpacity
          style={s.fab}
          onPress={onCreate}
          accessibilityLabel="Crear nuevo servicio"
        >
          <Feather name="plus" size={23} color="#111827" />
        </TouchableOpacity>
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  /* HEADER AMARILLO */
  header: {
    backgroundColor: "#FFD100",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 16 }),
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerActionTxt: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  headerKicker: {
    color: "#111827",
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSub: {
    color: "#111827",
    opacity: 0.75,
    fontSize: 13,
    marginTop: 2,
  },
  headerChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipTxt: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },

  /* SEARCH CARD */
  searchCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  /* LIST */
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 70,
  },

  /* SERVICE CARD */
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    gap: 12,
  },
  serviceImg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  serviceImgFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  serviceMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  serviceRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  priceTag: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  priceTagMuted: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 999,
  },
  ratingTxt: {
    fontSize: 11,
    fontWeight: "700",
  },
  serviceActions: {
    flexDirection: "column",
    gap: 6,
  },
  serviceActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  /* EMPTY / ERROR / LOADING */
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTxt: {
    marginTop: 10,
    color: "#6B7280",
  },

  errorCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "rgba(220,38,38,0.05)",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
  },
  errorRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorTxt: {
    color: "#B91C1C",
    flex: 1,
  },
  errorBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#B91C1C",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  errorBtnTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
  clearBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  clearBtnTxt: {
    color: Colors.primary,
    fontWeight: "700",
  },
  emptyCta: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FFD100",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.1)",
  },
  emptyCtaTxt: {
    color: "#111827",
    fontWeight: "700",
  },

  /* FAB */
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 4,
    width: 54,
    height: 54,
    backgroundColor: "#FFD100",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    ...(Platform.OS === "android" && { elevation: 6 }),
  },
});
