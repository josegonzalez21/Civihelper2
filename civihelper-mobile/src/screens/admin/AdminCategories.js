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
   PALETA AMARILLA
========================= */
const COLORS = {
  yellow: "#FFD100",
  yellowDark: "#F5C400",
  yellowLight: "#FFF8CC",
  purple: "#7C3AED",
  white: "#FFFFFF",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  danger: "#B91C1C",
  info: "#3B82F6",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray50: "#F9FAFB",
  shadow: "rgba(0,0,0,0.08)",
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};

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
    else navigation.navigate("AdminHome");
  };

  const showBack = navigation?.canGoBack?.() === true;

  return (
    <LinearGradient
      colors={[COLORS.yellow, COLORS.yellowDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.header}
    >
      <View style={s.headerTopRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={safeBack}
            style={s.backBtn}
            accessibilityLabel="Volver"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.headerContent}>
        <Text style={s.kicker}>Panel admin</Text>
        <Text style={s.title}>Áreas & Derivados</Text>
        <Text style={s.sub}>
          Crea y organiza las categorías raíz y sus subcategorías. Puedes asignar sector e imágenes.
        </Text>

        <TouchableOpacity
          onPress={onCreateArea}
          style={s.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Crear área"
        >
          <Feather name="plus" size={18} color={COLORS.text} />
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
            <View style={s.miniIconPlaceholder}>
              <Feather name="image" size={14} color={COLORS.yellowDark} />
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
            <Feather name="plus-circle" size={18} color={COLORS.yellowDark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={s.iconBtn}
            accessibilityLabel="Editar área"
          >
            <Feather name="edit-2" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={s.iconBtnDanger}
            accessibilityLabel="Desactivar área"
          >
            <Feather name="trash-2" size={18} color={COLORS.white} />
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
                <Feather name="tag" size={12} color={COLORS.textSecondary} />
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
                  <Feather name="edit-2" size={14} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(c)}
                  style={[s.childIcon, s.childIconDanger]}
                  accessibilityLabel="Desactivar sub-área"
                >
                  <Feather name="x" size={14} color={COLORS.white} />
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
   Modal
========================= */
function CategoryModal({
  visible,
  mode,
  initial = {},
  onCancel,
  onSubmit,
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
            placeholderTextColor={COLORS.textSecondary}
            style={s.modalInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <Text style={[s.modalTitle, { marginTop: spacing.sm }]}>Sector</Text>
          <View style={s.chipsRow}>
            {SECTORS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSector(opt)}
                style={[
                  s.chipSel,
                  sector === opt && { backgroundColor: `${COLORS.yellow}18`, borderColor: COLORS.yellowDark },
                ]}
              >
                <Text
                  style={[
                    s.chipSelTxt,
                    sector === opt && { color: COLORS.text, fontWeight: "800" },
                  ]}
                >
                  {sectorLabel[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.uploadRow}>
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
    mode: "create_area",
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
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <Header onCreateArea={handleCreateArea} />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.yellowDark} />
            <Text style={s.muted}>Cargando árbol…</Text>
          </View>
        ) : (
          <FlatList
            data={tree}
            keyExtractor={(x) => String(x.id)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.yellowDark]} />}
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
            <ActivityIndicator color={COLORS.white} />
          </View>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* =========================
   Estilos
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
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: { flexDirection: "column", gap: spacing.sm },
  kicker: { color: "#4B5563", fontSize: 11, letterSpacing: 0.3, fontWeight: "600" },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  sub: { color: "#1F2937", marginTop: 2, opacity: 0.85 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  primaryBtnTxt: { color: COLORS.text, fontWeight: "800" },

  loadingBox: { padding: spacing.lg, alignItems: "center", gap: 8 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  cardSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
  },
  iconBtn: {
    backgroundColor: COLORS.gray50,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBtnAccent: {
    backgroundColor: `${COLORS.yellow}25`,
    borderColor: `${COLORS.yellowDark}40`,
  },
  iconBtnDanger: {
    backgroundColor: COLORS.danger,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    ...shadows.sm,
    maxWidth: "100%",
  },
  childTxt: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 1,
    maxWidth: 220,
  },
  childIcon: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  childIconDanger: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  childIconImg: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: `${COLORS.yellow}15`,
  },

  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  miniIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${COLORS.yellow}15`,
    alignItems: "center",
    justifyContent: "center",
  },

  muted: { color: COLORS.textSecondary },

  empty: { alignItems: "center", padding: spacing.lg },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.25)",
  },

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
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadows.md,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  modalInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chipSel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
  },
  chipSelTxt: { color: COLORS.text, fontWeight: "700", fontSize: 12 },

  uploadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.md,
  },

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
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnGhostTxt: { color: COLORS.text, fontWeight: "700" },
  btnPrimary: { backgroundColor: COLORS.yellowDark },
  btnPrimaryTxt: { color: COLORS.text, fontWeight: "800" },
});
