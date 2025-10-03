// src/screens/ServiceCreateScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, StyleSheet, TextInput, Alert, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, FlatList, Platform, Pressable,
  KeyboardAvoidingView, Linking, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import PrimaryButton from "../components/common/PrimaryButton";
import { API_URL, getAuthToken } from "../services/api";

// ✅ Tema unificado (mismo del login / detalle)
import Colors, { spacing, radius, shadows } from "../theme/color";

const LOGIN_GRADIENT = Colors?.gradients?.login || ["#7C3AED", "#A855F7"];
const GLASS_BG     = Colors.withOpacity(Colors.palette.white, 0.05);
const GLASS_BORDER = Colors.withOpacity(Colors.palette.white, 0.10);

/* ---------- Permisos: galería con alerta guiada ---------- */
async function ensureGalleryPermission() {
  const { status, granted, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (granted || status === "granted") return true;

  return new Promise((resolve) => {
    Alert.alert(
      "Permiso requerido",
      "Necesitamos acceso a tu galería para seleccionar una imagen del servicio.",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        {
          text: canAskAgain ? "Intentar de nuevo" : "Abrir ajustes",
          onPress: async () => {
            if (canAskAgain) {
              const again = await ImagePicker.requestMediaLibraryPermissionsAsync();
              resolve(again.granted === true || again.status === "granted");
            } else {
              try { await Linking.openSettings(); } catch {}
              resolve(false);
            }
          },
        },
      ],
    );
  });
}

export default function ServiceCreateScreen({ navigation }) {
  const [cats, setCats] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsError, setCatsError] = useState("");
  const [catsOpen, setCatsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [city, setCity] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [image, setImage] = useState(null); // { uri, name, type }

  const valid = useMemo(() => {
    const vTitle = title.trim().length >= 3;
    const vDesc  = description.trim().length >= 20;
    const vCat   = !!categoryId;
    const vPrice = priceFrom === "" || (!isNaN(Number(priceFrom)) && Number(priceFrom) >= 0);
    return vTitle && vDesc && vCat && vPrice;
  }, [title, description, categoryId, priceFrom]);

  const loadCats = useCallback(async () => {
    try {
      setCatsLoading(true);
      setCatsError("");
      const token = getAuthToken?.() || null;
      const res = await fetch(`${API_URL}/categories`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudieron cargar categorías");
      setCats(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setCats([]);
      setCatsError(e?.message || "No se pudieron cargar categorías");
    } finally {
      setCatsLoading(false);
    }
  }, []);

  useEffect(() => { loadCats(); }, [loadCats]);

  const openCatsModal = () => {
    if ((!cats || cats.length === 0) && !catsLoading) loadCats();
    setCatsOpen(true);
  };
  const closeCatsModal = () => setCatsOpen(false);

  const chooseCat = (id) => {
    setCategoryId(id);
    closeCatsModal();
  };

  /* ---------- Seleccionar imagen ---------- */
  const pickImage = async () => {
    const allowed = await ensureGalleryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ImagePicker.MediaType?.IMAGE,
      allowsEditing: true,
      quality: 0.85,
      exif: false,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const fileName =
      asset.fileName ||
      `service_${Date.now()}.${(asset.uri.split(".").pop() || "jpg").toLowerCase()}`;
    const mime =
      asset.mimeType ||
      (fileName.endsWith(".png")
        ? "image/png"
        : fileName.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg");

    setImage({ uri: asset.uri, name: fileName, type: mime });
  };

  const removeImage = () => setImage(null);

  /* ---------- Submit ---------- */
  const submit = async () => {
    if (!valid || saving) return;
    try {
      setSaving(true);
      const body = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        city: city.trim() || null,
        priceFrom: priceFrom === "" ? null : Number(priceFrom),
      };
      const token = getAuthToken?.() || null;

      // 1) Crear servicio
      const res = await fetch(`${API_URL}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo crear el servicio");

      const newId = data?.id;
      if (!newId) {
        Alert.alert("Atención", "Servicio creado, pero no se recibió un ID.");
        navigation.replace("ServiceDetail", { id: data?.id });
        return;
      }

      // 2) Subir imagen (si existe) con varios endpoints comunes
      if (image?.uri) {
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const postForm = async (url, fieldName) => {
          const fd = new FormData();
          fd.append(fieldName, { uri: image.uri, name: image.name, type: image.type });
          const r = await fetch(url, { method: "POST", headers: { ...authHeaders }, body: fd });
          const j = await r.json().catch(() => ({}));
          return { ok: r.ok, status: r.status, data: j };
        };

        let ok = false;
        let uploadedUrl = null;

        // a) /api/services/:id/image  (field: image)
        const r1 = await postForm(`${API_URL}/services/${newId}/image`, "image");
        if (r1.ok) ok = true;

        // b) /api/services/:id/cover (field: image)
        if (!ok && r1.status === 404) {
          const r2 = await postForm(`${API_URL}/services/${newId}/cover`, "image");
          if (r2.ok) ok = true;
        }

        // c) /api/uploads (field: file) + PUT coverUrl
        if (!ok) {
          const r3 = await postForm(`${API_URL}/uploads`, "file");
          if (r3.ok) {
            uploadedUrl = r3.data?.url || r3.data?.path || r3.data?.location || null;
            ok = true;
            if (uploadedUrl) {
              await fetch(`${API_URL}/services/${newId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ coverUrl: uploadedUrl }),
              }).catch(() => {});
            }
          }
        }

        // d) /api/upload
        if (!ok) {
          const r4 = await postForm(`${API_URL}/upload`, "file");
          if (r4.ok) {
            uploadedUrl = r4.data?.url || r4.data?.path || r4.data?.location || null;
            ok = true;
            if (uploadedUrl) {
              await fetch(`${API_URL}/services/${newId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ coverUrl: uploadedUrl }),
              }).catch(() => {});
            }
          }
        }

        if (!ok) {
          console.warn("⚠️ No se pudo subir imagen. Revisa endpoints de carga en el backend.");
        }
      }

      Alert.alert("Listo", "Servicio creado con éxito");
      navigation.replace("ServiceDetail", { id: newId });
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo crear el servicio");
    } finally {
      setSaving(false);
    }
  };

  const renderCatItem = ({ item }) => {
    const active = item.id === categoryId;
    return (
      <TouchableOpacity
        style={[styles.catItem, active && styles.catItemActive]}
        onPress={() => chooseCat(item.id)}
        accessibilityRole="button"
      >
        <Text style={[styles.catItemText, active && styles.catItemTextActive]}>{item.name}</Text>
        {active ? <Feather name="check" size={18} color={Colors.primary} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header con gradiente violeta, coherente con Login */}
      <LinearGradient colors={LOGIN_GRADIENT} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} accessibilityLabel="Volver" style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Crear servicio</Text>
        <Text style={styles.sub}>Describe tu servicio para que te encuentren</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5), paddingBottom: spacing(3) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Título */}
            <Text style={styles.label}>Título</Text>
            <View style={[styles.inputWrap, title.length > 0 && title.trim().length < 3 && styles.inputError]}>
              <Feather name="type" size={18} color={Colors.sub} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Plomería a domicilio"
                placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
                returnKeyType="next"
              />
            </View>
            {title.length > 0 && title.trim().length < 3 && <Text style={styles.err}>Mínimo 3 caracteres.</Text>}

            {/* Categoría */}
            <Text style={[styles.label, { marginTop: spacing(1.5) }]}>Categoría</Text>
            <TouchableOpacity style={styles.selectWrap} onPress={openCatsModal}>
              <Feather name="grid" size={18} color={Colors.sub} style={styles.inputIcon} />
              <Text style={[styles.selectText, { color: categoryId ? Colors.text : Colors.withOpacity(Colors.text, 0.45) }]}>
                {categoryId ? cats.find((c) => c.id === categoryId)?.name || "Seleccionada" : "Selecciona una categoría"}
              </Text>
              <Feather name="chevron-down" size={18} color={Colors.withOpacity(Colors.text, 0.45)} />
            </TouchableOpacity>
            {!categoryId && <Text style={styles.hint}>Requerido para publicar.</Text>}

            {/* Ciudad */}
            <Text style={[styles.label, { marginTop: spacing(1.5) }]}>Ciudad (opcional)</Text>
            <View style={styles.inputWrap}>
              <Feather name="map-pin" size={18} color={Colors.sub} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={city}
                onChangeText={setCity}
                placeholder="Ej: Santiago"
                placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
                returnKeyType="next"
              />
            </View>

            {/* Precio */}
            <Text style={[styles.label, { marginTop: spacing(1.5) }]}>Precio desde (opcional)</Text>
            <View
              style={[
                styles.inputWrap,
                priceFrom !== "" && (isNaN(Number(priceFrom)) || Number(priceFrom) < 0) && styles.inputError,
              ]}
            >
              <Feather name="dollar-sign" size={18} color={Colors.sub} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={priceFrom}
                onChangeText={setPriceFrom}
                placeholder="Ej: 25000"
                placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                inputMode="numeric"
              />
            </View>
            {priceFrom !== "" && (isNaN(Number(priceFrom)) || Number(priceFrom) < 0) && (
              <Text style={styles.err}>Debe ser número mayor o igual a 0.</Text>
            )}

            {/* Descripción */}
            <Text style={[styles.label, { marginTop: spacing(1.5) }]}>Descripción</Text>
            <View
              style={[
                styles.textareaWrap,
                description.length > 0 && description.trim().length < 20 && styles.inputError,
              ]}
            >
              <Feather name="file-text" size={18} color={Colors.sub} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { height: 120, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe tu servicio, experiencia, herramientas, etc."
                placeholderTextColor={Colors.withOpacity(Colors.text, 0.45)}
                multiline
              />
            </View>
            {description.length > 0 && description.trim().length < 20 && (
              <Text style={styles.err}>Mínimo 20 caracteres.</Text>
            )}

            {/* Imagen */}
            <Text style={[styles.label, { marginTop: spacing(1.5) }]}>Imagen del servicio (opcional)</Text>
            {image ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <View style={{ flexDirection: "row", gap: spacing(1) }}>
                  <TouchableOpacity onPress={removeImage} style={styles.secondaryBtn}>
                    <Feather name="trash-2" size={16} color={Colors.danger} />
                    <Text style={[styles.secondaryBtnText, { color: Colors.danger }]}>Quitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickImage} style={styles.secondaryBtn}>
                    <Feather name="image" size={16} color={Colors.primary} />
                    <Text style={[styles.secondaryBtnText, { color: Colors.primary }]}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={pickImage} style={styles.pickBtn}>
                <Feather name="image" size={18} color={Colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: Colors.primary }]}>Seleccionar imagen</Text>
              </TouchableOpacity>
            )}

            <PrimaryButton onPress={submit} disabled={!valid || saving} loading={saving} style={{ marginTop: spacing(2) }}>
              Publicar
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal categorías */}
      <Modal visible={catsOpen} transparent animationType="fade" onRequestClose={closeCatsModal} statusBarTranslucent>
        <Pressable style={styles.modalBackdrop} onPress={closeCatsModal} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecciona categoría</Text>
            <TouchableOpacity onPress={closeCatsModal} style={styles.closeBtn} accessibilityLabel="Cerrar">
              <Feather name="x" size={18} color={Colors.sub} />
            </TouchableOpacity>
          </View>

          {catsLoading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator />
              <Text style={styles.modalHint}>Cargando…</Text>
            </View>
          ) : catsError ? (
            <View style={styles.modalCenter}>
              <Text style={[styles.modalHint, { color: Colors.danger }]}>{catsError}</Text>
              <TouchableOpacity onPress={loadCats} style={styles.retryBtn}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : cats.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={styles.modalHint}>No hay categorías disponibles.</Text>
              <TouchableOpacity onPress={loadCats} style={styles.retryBtn}>
                <Text style={styles.retryText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={cats}
              keyExtractor={(it) => String(it.id)}
              renderItem={renderCatItem}
              contentContainerStyle={{ paddingVertical: spacing(0.75) }}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Header */
  hero: {
    paddingTop: spacing(2),
    paddingBottom: spacing(2.5),
    paddingHorizontal: spacing(2),
    borderBottomLeftRadius: radius(2.75),
    borderBottomRightRadius: radius(2.75),
    ...shadows.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius(1.25),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: spacing(1),
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: spacing(0.75) },

  /* Card glass */
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: radius(2),
    padding: spacing(1.75),
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
      web: { backdropFilter: "blur(12px) saturate(120%)" },
    }),
  },

  /* Form */
  label: { color: Colors.text, fontSize: 13, marginBottom: spacing(0.75), fontWeight: "700" },

  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius(1.5),
    paddingHorizontal: spacing(1.25),
    backgroundColor: Colors.card,
    alignItems: "center",
    flexDirection: "row",
  },
  textareaWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius(1.5),
    paddingHorizontal: spacing(1.25),
    paddingTop: spacing(1),
    backgroundColor: Colors.card,
    alignItems: "flex-start",
    flexDirection: "row",
  },
  inputIcon: { marginRight: spacing(1) },
  inputField: {
    flex: 1,
    color: Colors.text,
    paddingVertical: Platform.OS === "ios" ? spacing(1.25) : spacing(0.75),
  },
  inputError: { borderColor: Colors.danger },

  selectWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius(1.5),
    paddingHorizontal: spacing(1.25),
    backgroundColor: Colors.card,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectText: { flex: 1, marginLeft: spacing(1) },

  hint: { color: Colors.sub, fontSize: 12, marginTop: spacing(0.5) },
  err: { color: Colors.danger, marginTop: spacing(0.75), fontSize: 12 },

  imagePreviewWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius(1.5),
    padding: spacing(1),
    backgroundColor: Colors.card,
    ...shadows.sm,
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: radius(1),
    marginBottom: spacing(1),
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.75),
    paddingVertical: spacing(0.75),
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
    paddingHorizontal: spacing(1),
    paddingVertical: Platform.OS === "ios" ? spacing(0.75) : spacing(0.6),
    borderRadius: radius(1),
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  secondaryBtnText: { fontWeight: "700" },

  /* Modal */
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  modalSheet: {
    position: "absolute",
    left: spacing(1.5),
    right: spacing(1.5),
    top: "18%",
    borderRadius: radius(2),
    backgroundColor: Colors.card,
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    padding: spacing(1.5),
    ...shadows.lg,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing(1) },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius(1),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  modalCenter: { alignItems: "center", paddingVertical: spacing(2), gap: spacing(1) },
  modalHint: { color: Colors.sub, fontSize: 13 },
  retryBtn: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: Platform.OS === "ios" ? spacing(0.75) : spacing(0.6),
    borderRadius: radius(1),
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  retryText: { color: Colors.primary, fontWeight: "800" },

  catItem: {
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  catItemActive: {
    backgroundColor: Colors.withOpacity(Colors.primary, 0.08),
  },
  catItemText: { color: Colors.text, fontWeight: "600" },
  catItemTextActive: { color: Colors.primary },
});
