import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Colors, { spacing, radius, shadows } from "../../theme/color";
import { useAuth } from "../../context/AuthContext";

// 👇 mismo logo que usaste en las otras pantallas
import logo3 from "../../assets/Logo3.png";

/** ===== Helpers ===== */
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const guessMime = (uri, fallback = "image/jpeg") => {
  const u = String(uri).toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".avif")) return "image/avif";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  return fallback;
};

const toYYYYMMDD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toISODateOrNull = (s) =>
  s && s.trim() ? new Date(`${s.trim()}T00:00:00`).toISOString() : null;

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const DARK = "#0F172A";

export default function AdminPromotionCreate() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const API_BASE = useMemo(
    () =>
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:4000",
    []
  );

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState("0");

  // Image state
  const [image, setImage] = useState(null);
  const [imageSize, setImageSize] = useState(null);

  // UI state
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [errors, setErrors] = useState({});

  // Validación en vivo
  useEffect(() => {
    const newErrors = {};

    if (title.trim() && title.trim().length < 3) {
      newErrors.title = "Mínimo 3 caracteres";
    }

    if (linkUrl.trim() && !isValidUrl(linkUrl)) {
      newErrors.linkUrl = "URL inválida";
    }

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      newErrors.dates = "La fecha de fin debe ser posterior";
    }

    setErrors(newErrors);
  }, [title, linkUrl, startsAt, endsAt]);

  /* ===================== IMAGE PICKER ===================== */
  const pickImage = useCallback(async () => {
    Alert.alert("Seleccionar imagen", "¿De dónde quieres obtenerla?", [
      { text: "Galería", onPress: pickFromGallery },
      { text: "Cámara", onPress: pickFromCamera },
      { text: "Cancelar", style: "cancel" },
    ]);
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
      selectionLimit: 1,
    });

    if (!res.canceled) {
      processImage(res.assets[0]);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });

    if (!res.canceled) {
      processImage(res.assets[0]);
    }
  };

  const processImage = async (asset) => {
    if (!asset?.uri) return;
    const mime = asset.mimeType || guessMime(asset.uri);

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      setImageSize(blob.size);

      if (blob.size > 8 * 1024 * 1024) {
        Alert.alert(
          "Imagen muy grande",
          "Máximo 8MB. Por favor, selecciona otra imagen."
        );
        return;
      }
    } catch (e) {
      console.warn("No se pudo calcular el tamaño:", e);
    }

    setImage({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mime,
    });
  };

  const removeImage = () => {
    Alert.alert("Eliminar imagen", "¿Quieres eliminar esta imagen?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          setImage(null);
          setImageSize(null);
        },
      },
    ]);
  };

  /* ===================== UPLOAD ===================== */
  const uploadToS3 = async () => {
    if (!image?.uri) throw new Error("Selecciona una imagen");
    const mime = image.mime || guessMime(image.uri);

    setUploadProgress(10);

    const promotionId = uuid();
    const signRes = await fetch(`${API_BASE}/api/uploads/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        kind: "promotion",
        ids: { promotionId },
        mime,
      }),
    });

    setUploadProgress(30);

    if (!signRes.ok) {
      const t = await signRes.text();
      throw new Error(`No se pudo firmar subida (${signRes.status}): ${t}`);
    }

    const { url, key, requiredHeaders, maxBytes } = await signRes.json();
    setUploadProgress(50);

    const blob = await (await fetch(image.uri)).blob();
    if (maxBytes && blob.size > maxBytes) {
      throw new Error(
        `Imagen supera el máximo (${formatFileSize(blob.size)} > ${formatFileSize(
          maxBytes
        )})`
      );
    }

    setUploadProgress(70);

    const putRes = await fetch(url, {
      method: "PUT",
      headers: { ...(requiredHeaders || {}) },
      body: blob,
    });

    setUploadProgress(90);

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      throw new Error(`Fallo en S3 (${putRes.status}): ${t}`);
    }

    setUploadProgress(100);
    return String(key);
  };

  /* ===================== CREATE ===================== */
  const createPromotion = async (imageKey) => {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      imageUrl: imageKey,
      linkUrl: linkUrl.trim() || null,
      serviceId: serviceId.trim() || null,
      categoryId: categoryId.trim() || null,
      isActive: !!isActive,
      priority: parseInt(priority) || 0,
      startsAt: toISODateOrNull(startsAt),
      endsAt: toISODateOrNull(endsAt),
    };

    const res = await fetch(`${API_BASE}/api/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`No se pudo crear (${res.status}): ${t}`);
    }

    return res.json();
  };

  /* ===================== SUBMIT ===================== */
  const onSubmit = async () => {
    try {
      if (!title.trim()) {
        Alert.alert("Falta título", "Ingresa un título para la promoción.");
        return;
      }
      if (title.trim().length < 3) {
        Alert.alert("Título corto", "Mínimo 3 caracteres.");
        return;
      }
      if (!image?.uri) {
        Alert.alert("Imagen requerida", "Selecciona una imagen para el banner.");
        return;
      }

      const targets = [linkUrl.trim(), serviceId.trim(), categoryId.trim()].filter(Boolean);
      if (targets.length > 1) {
        Alert.alert(
          "Destino inválido",
          "Usa solo uno: link externo, servicio o categoría."
        );
        return;
      }

      if (linkUrl.trim() && !isValidUrl(linkUrl)) {
        Alert.alert("URL inválida", "Por favor ingresa una URL válida.");
        return;
      }

      if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
        Alert.alert("Fechas inválidas", "La fecha de fin debe ser posterior.");
        return;
      }

      setBusy(true);
      setUploadProgress(0);

      const imageKey = await uploadToS3();
      await createPromotion(imageKey);

      Alert.alert("¡Éxito!", "Tu promoción se ha publicado.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error("Error:", e);
      Alert.alert("Error", e?.message || "No se pudo crear la promoción.");
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  };

  /* ===================== UTIL ===================== */
  const clearForm = () => {
    Alert.alert("Limpiar formulario", "¿Quieres vaciar todos los campos?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpiar",
        style: "destructive",
        onPress: () => {
          setTitle("");
          setDescription("");
          setLinkUrl("");
          setServiceId("");
          setCategoryId("");
          setStartsAt("");
          setEndsAt("");
          setIsActive(true);
          setPriority("0");
          setImage(null);
          setImageSize(null);
          setErrors({});
        },
      },
    ]);
  };

  const isFormValid = !busy && Object.keys(errors).length === 0 && !!title.trim();

  const canGoBack = navigation?.canGoBack?.() === true;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header amarillo tipo “páginas amarillas” */}
      <View style={s.yellowHeader}>
        <View style={s.yellowTopRow}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Feather name="arrow-left" size={20} color={DARK} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}

          <TouchableOpacity onPress={clearForm} style={s.clearButtonTop}>
            <Feather name="refresh-cw" size={16} color={DARK} />
          </TouchableOpacity>
        </View>

        <View style={s.headerInfoRow}>
          <View style={s.logoWrap}>
            <Image source={logo3} style={s.logo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerKicker}>PANEL ADMIN</Text>
            <Text style={s.headerTitle}>Nueva promoción</Text>
            <Text style={s.headerSub}>Sube un banner y define el destino</Text>
          </View>
        </View>

        <View style={s.headerPills}>
          <View style={s.pill}>
            <Feather name="image" size={14} color={DARK} />
            <Text style={s.pillText}>Banner 16:9</Text>
          </View>
          <View style={s.pill}>
            <Feather name="target" size={14} color={DARK} />
            <Text style={s.pillText}>1 destino máximo</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image picker */}
          <TouchableOpacity
            style={[s.card, s.imagePicker]}
            onPress={pickImage}
            activeOpacity={0.9}
          >
            {image?.uri ? (
              <>
                <Image source={{ uri: image.uri }} style={s.preview} />
                <TouchableOpacity style={s.removeImageBtn} onPress={removeImage}>
                  <Feather name="x" size={18} color="#fff" />
                </TouchableOpacity>
                {imageSize && (
                  <View style={s.imageSizeBadge}>
                    <Text style={s.imageSizeText}>{formatFileSize(imageSize)}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={s.imageIcon}>
                  <Feather name="image" size={20} color={Colors.primary} />
                </View>
                <Text style={s.imageText}>Seleccionar imagen</Text>
                <Text style={s.imageHint}>PNG • JPG • WEBP • Máx 8MB</Text>
                <Text style={s.imageHint2}>Ratio: 16:9 (recomendado)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={s.card}>
            {/* título */}
            <View>
              <Text style={s.label}>
                Título <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={[s.input, errors.title && s.inputError]}
                placeholder="Ej: ¡-20% en mantenciones!"
                placeholderTextColor={Colors.placeholder}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <View style={s.inputFooter}>
                {errors.title ? (
                  <Text style={s.errorText}>{errors.title}</Text>
                ) : (
                  <Text style={s.helperTextSm}>Será el texto principal del banner</Text>
                )}
                <Text style={s.charCount}>{title.length}/100</Text>
              </View>
            </View>

            {/* descripción */}
            <View>
              <Text style={s.label}>Descripción (opcional)</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Descripción detallada de la promoción..."
                placeholderTextColor={Colors.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[s.charCount, { marginHorizontal: spacing.md }]}>
                {description.length}/500
              </Text>
            </View>

            {/* link */}
            <View>
              <Text style={s.label}>Link externo (opcional)</Text>
              <TextInput
                style={[s.input, errors.linkUrl && s.inputError]}
                placeholder="https://tusitio.com/oferta"
                placeholderTextColor={Colors.placeholder}
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              {errors.linkUrl && <Text style={s.errorText}>{errors.linkUrl}</Text>}
            </View>

            {/* IDs */}
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={s.label}>Service ID (opcional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="id-del-servicio"
                  placeholderTextColor={Colors.placeholder}
                  value={serviceId}
                  onChangeText={setServiceId}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={s.label}>Category ID (opcional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="id-de-categoría"
                  placeholderTextColor={Colors.placeholder}
                  value={categoryId}
                  onChangeText={setCategoryId}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* prioridad */}
            <View>
              <Text style={s.label}>Prioridad (orden)</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                placeholderTextColor={Colors.placeholder}
                value={priority}
                onChangeText={setPriority}
                keyboardType="numeric"
              />
              <Text style={s.helperText}>Mayor número = más visibilidad</Text>
            </View>

            {/* Fechas */}
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={s.label}>Desde (opcional)</Text>
                <TouchableOpacity
                  style={[s.dateInput, errors.dates && s.inputError]}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.85}
                >
                  <Feather name="calendar" size={16} color={Colors.primary} />
                  <Text style={[s.dateText, !startsAt && { color: Colors.placeholder }]}>
                    {startsAt || "YYYY-MM-DD"}
                  </Text>
                  {!!startsAt && (
                    <TouchableOpacity onPress={() => setStartsAt("")} hitSlop={8}>
                      <Feather name="x" size={14} color={Colors.sub} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={s.label}>Hasta (opcional)</Text>
                <TouchableOpacity
                  style={[s.dateInput, errors.dates && s.inputError]}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.85}
                >
                  <Feather name="calendar" size={16} color={Colors.primary} />
                  <Text style={[s.dateText, !endsAt && { color: Colors.placeholder }]}>
                    {endsAt || "YYYY-MM-DD"}
                  </Text>
                  {!!endsAt && (
                    <TouchableOpacity onPress={() => setEndsAt("")} hitSlop={8}>
                      <Feather name="x" size={14} color={Colors.sub} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {errors.dates && <Text style={s.errorText}>{errors.dates}</Text>}

            {/* Switch */}
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Estado</Text>
                <Text style={s.helperText}>
                  {isActive ? "Visible en la app" : "Oculta para usuarios"}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: "#F2D47C", true: "#16A34A" }}
                thumbColor={isActive ? "#166534" : Colors.sub}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.button, !isFormValid && s.buttonDisabled]}
            onPress={onSubmit}
            disabled={!isFormValid}
            activeOpacity={0.8}
          >
            {busy ? (
              <View style={s.buttonBusy}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.buttonText}>
                  {uploadProgress > 0 ? `Subiendo ${uploadProgress}%` : "Procesando..."}
                </Text>
              </View>
            ) : (
              <>
                <Feather name="upload-cloud" size={16} color="#fff" />
                <Text style={s.buttonText}>Publicar promoción</Text>
              </>
            )}
          </TouchableOpacity>

          {busy && uploadProgress > 0 && (
            <View style={s.progressBarContainer}>
              <View style={[s.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        locale="es-ES"
        display={Platform.OS === "ios" ? "inline" : "calendar"}
        isDarkModeEnabled
        themeVariant="dark"
        textColor={Colors.text}
        onConfirm={(d) => {
          setStartsAt(toYYYYMMDD(d));
          setShowStartPicker(false);
        }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        locale="es-ES"
        display={Platform.OS === "ios" ? "inline" : "calendar"}
        isDarkModeEnabled
        themeVariant="dark"
        textColor={Colors.text}
        onConfirm={(d) => {
          setEndsAt(toYYYYMMDD(d));
          setShowEndPicker(false);
        }}
        onCancel={() => setShowEndPicker(false)}
      />
    </SafeAreaView>
  );
}

/** ===== Estilos ===== */
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF7C2", // fondo crema tipo páginas amarillas
  },
  yellowHeader: {
    backgroundColor: "#FFD100",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 16 }),
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadows.sm,
  },
  yellowTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  clearButtonTop: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  headerInfoRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 30,
    height: 30,
  },
  headerKicker: {
    color: DARK,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
  headerTitle: {
    color: DARK,
    fontSize: 22,
    fontWeight: "800",
  },
  headerSub: {
    color: DARK,
    opacity: 0.85,
    fontSize: 13,
  },
  headerPills: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.sm,
  },
  pill: {
    backgroundColor: "#FFF2B5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  pillText: {
    color: DARK,
    fontWeight: "700",
    fontSize: 12,
  },

  container: { padding: spacing.lg, paddingBottom: spacing.xxl },

  card: {
    backgroundColor: "#FFFDF6",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FFE38A",
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.xs,
  },

  imagePicker: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE38A",
    marginBottom: 8,
  },
  imageText: {
    color: DARK,
    fontWeight: "800",
    fontSize: 15,
  },
  imageHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  imageHint2: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 3,
    fontStyle: "italic",
  },
  preview: {
    width: "100%",
    height: "100%",
    borderRadius: radius.lg,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  imageSizeBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  imageSizeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  label: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    backgroundColor: "#FFFBE3",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: DARK,
    fontSize: 14,
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#F43F5E",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  helperTextSm: {
    color: "#6B7280",
    fontSize: 11,
  },
  errorText: {
    color: "#F43F5E",
    fontSize: 11,
    fontWeight: "600",
  },
  charCount: {
    color: "#6B7280",
    fontSize: 11,
    fontStyle: "italic",
  },

  textArea: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  helperText: {
    color: "#6B7280",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },

  dateInput: {
    backgroundColor: "#FFFBE3",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    color: DARK,
    fontSize: 14,
    flex: 1,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#FFE38A",
  },

  button: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: "#0F172A",
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  buttonBusy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  progressBarContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    height: 4,
    backgroundColor: "#FFE38A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0F172A",
  },
});
