// src/screens/admin/AdminCategories.js
import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";
import {
  categoriesTree,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminCreateCategoryMultipart,
  adminUpdateCategoryMultipart,
} from "../../services/api";

/* =========================
   Constantes UI
========================= */
const SECTORS = ["PUBLIC", "PRIVATE", "NGO", "EDUCATION", "HEALTH", "OTHER"];

const sectorLabel = {
  PUBLIC: "Público",
  PRIVATE: "Privado",
  NGO: "ONG",
  EDUCATION: "Educación",
  HEALTH: "Salud",
  OTHER: "Otro",
};

/* =========================
   Header (atrás seguro + CTA crear)
========================= */
function Header({ onCreateArea }) {
  const navigation = useNavigation();

  const safeBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminHome"); // si entraste por la tab, vuelve al panel
  };

  const showBack = navigation?.canGoBack?.() === true;

  return (
    <LinearGradient
      colors={Colors.gradients?.hero || [Colors.primary, "#111827"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.header}
    >
      {/* Fila superior: botón volver (condicional) */}
      <View style={s.headerTopRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.backBtn}
            accessibilityLabel="Volver"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Contenido: título, subtítulo y botón crear */}
      <View style={s.headerContent}>
        <Text style={s.kicker}>Panel admin</Text>
        <Text style={s.title}>Áreas & Derivados</Text>
        <Text style={s.sub}>
          Estructura el catálogo por áreas (root) y sub-áreas. Puedes asignar sector e imágenes.
        </Text>

        <TouchableOpacity
          onPress={onCreateArea}
          style={s.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Crear área"
        >
          <Feather name="plus" size={18} color="#0F172A" />
          <Text style={s.primaryBtnTxt}>Nueva Área</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/* =========================
   Item (Área con derivados)
========================= */
function ItemRow({ item, onAddChild, onEdit, onDelete }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {item.iconUrl ? (
            <Image source={{ uri: item.iconUrl }} style={s.miniIcon} resizeMode="cover" />
          ) : (
            <View
              style={[
                s.miniIcon,
                {
                  backgroundColor: Colors.withOpacity(Colors.primary, 0.12),
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Feather name="image" size={14} color={Colors.primary} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {item.sector ? (
              <Text style={s.cardSub} numberOfLines={1}>
                {sectorLabel[item.sector] || item.sector}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.rowActions}>
          <TouchableOpacity
            onPress={() => onAddChild(item)}
            style={[s.iconBtn, s.iconBtnAccent]}
            accessibilityLabel="Agregar derivado"
          >
            <Feather name="plus-circle" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={s.iconBtn}
            accessibilityLabel="Editar área"
          >
            <Feather name="edit-2" size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={s.iconBtnDanger}
            accessibilityLabel="Desactivar área"
          >
            <Feather name="trash-2" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {(item.children || []).length > 0 ? (
        <View style={s.childrenWrap}>
          {item.children.map((c) => (
            <View key={c.id} style={s.childPill}>
              {c.iconUrl ? (
                <Image source={{ uri: c.iconUrl }} style={s.childIconImg} />
              ) : (
                <Feather name="tag" size={12} color={Colors.sub} />
              )}
              <Text style={s.childTxt} numberOfLines={1}>
                {c.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <TouchableOpacity
                  onPress={() => onEdit(c)}
                  style={s.childIcon}
                  accessibilityLabel="Editar sub-área"
                >
                  <Feather name="edit-2" size={14} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(c)}
                  style={[s.childIcon, s.childIconDanger]}
                  accessibilityLabel="Desactivar sub-área"
                >
                  <Feather name="x" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.muted}>Sin derivados aún</Text>
      )}
    </View>
  );
}

/* =========================
   Modal avanzado (nombre + sector + imágenes)
========================= */
function CategoryModal({
  visible,
  mode, // "create_area" | "create_child" | "edit"
  initial = {}, // { name, sector, iconUrl, coverUrl }
  onCancel,
  onSubmit, // ({ name, sector, iconFile, coverFile }) => void
}) {
  const [name, setName] = useState(initial?.name || "");
  const [sector, setSector] = useState(initial?.sector || "OTHER");
  const [iconFile, setIconFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  useEffect(() => {
    if (visible) {
      setName(initial?.name || "");
      setSector(initial?.sector || "OTHER");
      setIconFile(null);
      setCoverFile(null);
    }
  }, [visible, initial]);

  async function pick(kind) {
    // FIX: usar MediaTypeOptions.Images
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName || `${kind}.jpg`,
      type: asset.mimeType || "image/jpeg",
    };
    if (kind === "icon") setIconFile(file);
    if (kind === "cover") setCoverFile(file);
  }

  const submit = () => {
    const v = (name || "").trim();
    if (!v) return;
    onSubmit?.({ name: v, sector, iconFile, coverFile });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={s.modalBackdrop}
      >
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>
            {mode === "edit"
              ? "Editar categoría"
              : mode === "create_child"
              ? "Nuevo derivado"
              : "Nueva Área (root)"}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre"
            placeholderTextColor={Colors.sub}
            style={s.modalInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {/* Selector de sector */}
          <Text style={[s.modalTitle, { marginTop: spacing.sm }]}>Sector</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {SECTORS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSector(opt)}
                style={[
                  s.chipSel,
                  sector === opt && { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
                ]}
              >
                <Text
                  style={[
                    s.chipSelTxt,
                    sector === opt && { color: Colors.primary, fontWeight: "800" },
                  ]}
                >
                  {sectorLabel[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subida de imágenes */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: spacing.md }}>
            <TouchableOpacity onPress={() => pick("icon")} style={[s.btn, s.btnGhost]}>
              <Text style={s.btnGhostTxt}>{iconFile ? "Icono listo ✓" : "Subir icono"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pick("cover")} style={[s.btn, s.btnGhost]}>
              <Text style={s.btnGhostTxt}>{coverFile ? "Portada lista ✓" : "Subir portada"}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.modalRow}>
            <TouchableOpacity onPress={onCancel} style={[s.btn, s.btnGhost]}>
              <Text style={s.btnGhostTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} style={[s.btn, s.btnPrimary]}>
              <Text style={s.btnPrimaryTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* =========================
   Pantalla
========================= */
export default function AdminCategories() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState({
    visible: false,
    mode: "create_area", // "create_area" | "create_child" | "edit"
    initial: {},
    onSubmit: null,
  });

  const openModal = (cfg) => setModal({ visible: true, ...cfg });
  const closeModal = () => setModal((m) => ({ ...m, visible: false }));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoriesTree();
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo cargar el árbol de categorías.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCreateArea = useCallback(() => {
    openModal({
      mode: "create_area",
      initial: { sector: "OTHER" },
      onSubmit: async ({ name, sector, iconFile, coverFile }) => {
        closeModal();
        try {
          setBusy(true);
          if (iconFile || coverFile) {
            await adminCreateCategoryMultipart({ name, sector, iconFile, coverFile });
          } else {
            await adminCreateCategory({ name, sector });
          }
          await load();
        } catch (e) {
          console.error(e);
          Alert.alert("Error", e?.message || "No se pudo crear el área.");
        } finally {
          setBusy(false);
        }
      },
    });
  }, [load]);

  const handleAddChild = useCallback(
    (parent) => {
      openModal({
        mode: "create_child",
        initial: { sector: "OTHER" },
        onSubmit: async ({ name, sector, iconFile, coverFile }) => {
          closeModal();
          try {
            setBusy(true);
            if (iconFile || coverFile) {
              await adminCreateCategoryMultipart({
                name,
                parentId: parent.id,
                sector,
                iconFile,
                coverFile,
              });
            } else {
              await adminCreateCategory({ name, parentId: parent.id, sector });
            }
            await load();
          } catch (e) {
            console.error(e);
            Alert.alert("Error", e?.message || "No se pudo crear el derivado.");
          } finally {
            setBusy(false);
          }
        },
      });
    },
    [load]
  );

  const handleEdit = useCallback(
    (cat) => {
      openModal({
        mode: "edit",
        initial: {
          name: cat.name,
          sector: cat.sector,
          iconUrl: cat.iconUrl,
          coverUrl: cat.coverUrl,
        },
        onSubmit: async ({ name, sector, iconFile, coverFile }) => {
          try {
            setBusy(true);
            if (iconFile || coverFile) {
              await adminUpdateCategoryMultipart(cat.id, { name, sector, iconFile, coverFile });
            } else {
              await adminUpdateCategory(cat.id, { name, sector });
            }
            closeModal();
            await load();
          } catch (e) {
            console.error(e);
            Alert.alert("Error", e?.message || "No se pudo editar la categoría.");
            closeModal();
          } finally {
            setBusy(false);
          }
        },
      });
    },
    [load]
  );

  const handleDelete = useCallback(
    async (cat) => {
      Alert.alert(
        "Desactivar categoría",
        `¿Seguro que quieres desactivar "${cat.name}"? (soft-delete)`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Desactivar",
            style: "destructive",
            onPress: async () => {
              try {
                setBusy(true);
                await adminDeleteCategory(cat.id);
                await load();
              } catch (e) {
                console.error(e);
                Alert.alert("Error", e?.message || "No se pudo desactivar la categoría.");
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    },
    [load]
  );

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <Header onCreateArea={handleCreateArea} />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator />
            <Text style={s.muted}>Cargando árbol…</Text>
          </View>
        ) : (
          <FlatList
            data={tree}
            keyExtractor={(x) => String(x.id)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <ItemRow
                item={item}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.muted}>Aún no has creado Áreas.</Text>
              </View>
            }
          />
        )}

        <CategoryModal
          visible={modal.visible}
          mode={modal.mode}
          initial={modal.initial}
          onCancel={closeModal}
          onSubmit={modal.onSubmit}
        />

        {busy && (
          <View style={s.busyOverlay}>
            <ActivityIndicator />
          </View>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* =========================
   Estilos (alineados al proyecto y márgenes seguros)
========================= */
const s = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingTop: Platform.select({ ios: 10, android: 16 }),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  headerContent: { flexDirection: "column", gap: spacing.sm },
  kicker: { color: "#DBEAFE", fontSize: 11, letterSpacing: 1 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: 2 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: spacing.md,
    alignSelf: "flex-start",
    ...shadows.sm,
  },
  primaryBtnTxt: { color: "#0F172A", fontWeight: "800" },

  loadingBox: { padding: spacing.lg, alignItems: "center", gap: 8 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  cardSub: { color: Colors.sub, fontSize: 12, marginTop: 2 },

  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
  },
  iconBtn: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconBtnAccent: {
    backgroundColor: "#EEF2FF",
    borderColor: "#E0E7FF",
  },
  iconBtnDanger: {
    backgroundColor: "#B91C1C",
    padding: 8,
    borderRadius: 999,
  },

  childrenWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  childPill: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    ...shadows.xs,
    maxWidth: "100%",
  },
  childTxt: { color: Colors.text, fontWeight: "700", fontSize: 12, flexShrink: 1, maxWidth: 220 },
  childIcon: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
  },
  childIconDanger: {
    backgroundColor: "#B91C1C",
    borderColor: "#B91C1C",
  },
  childIconImg: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.08),
  },

  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },

  muted: { color: Colors.sub },

  empty: { alignItems: "center", padding: spacing.lg },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.25)",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  modalInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    backgroundColor: "#fff",
  },
  chipSel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.card,
  },
  chipSelTxt: { color: Colors.text, fontWeight: "700", fontSize: 12 },

  modalRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnGhost: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnGhostTxt: { color: Colors.text, fontWeight: "700" },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryTxt: { color: "#fff", fontWeight: "800" },
});
