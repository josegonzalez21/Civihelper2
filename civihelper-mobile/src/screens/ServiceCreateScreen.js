// src/screens/ServiceCreateScreen.js
import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import Input from "../components/common/Input";
import PickerField from "../components/common/PickerField";
import AppLogo from "../components/common/AppLogo";
import * as ImagePicker from "expo-image-picker";
import {
  API_BASE,
  API_URL,
  getAuthToken,
  request,
  s3UploadAndGetKey,
  uploadsSignGet,
} from "../services/api";

// 🎨 Paleta estilo Páginas Amarillas
const Colors = {
  primary: "#FFD100",
  primaryDark: "#F5C400",
  primaryLight: "#0F172A",
  purple: "#7C3AED",
  success: "#10B981",
  text: "#0F172A",
  subtext: "#030303ff",
  border: "#E5E7EB",
  card: "#FFFFFF",
  bg: "#FAFAFA",
};

const makeShadow = () =>
  Platform.OS === "android"
    ? { elevation: 3 }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      };

const isDigits = (v) => /^[0-9]+$/.test(String(v));
const toId = (v) => (isDigits(v) ? Number(v) : String(v));

export default function ServiceCreateScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [city, setCity] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [tempCoverKey, setTempCoverKey] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // 🧠 Debug inicial: conexión con backend y firma S3
  useEffect(() => {
    (async () => {
      try {
        console.log("[ENV] API_BASE:", API_BASE);
        console.log("[ENV] API_URL :", API_URL);
        console.log("[ENV] TOKEN?  :", getAuthToken());

        try {
          const r = await fetch(`${API_BASE}/healthz`);
          const t = await r.text();
          console.log("[HEALTHZ]", r.status, t);
        } catch (e) {
          console.log("[HEALTHZ ERROR]", e);
        }

        try {
          const data = await request("/uploads/sign", {
            method: "POST",
            body: { kind: "temp", mime: "image/png" },
            tag: "S3_SIGN_PUT",
          });
          console.log("[SIGN OK]", data);
        } catch (e) {
          console.log("[SIGN ERROR]", e?.status, e?.message, e?.data?.snippet);
        }
      } catch (e) {
        console.log("[DEBUG BOOT ERROR]", e);
      }
    })();
  }, []);

  // 📦 Cargar categorías
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await request("/categories", {
        method: "GET",
        query: { limit: 100 },
        tag: "CATEGORIES",
      });

      const raw = Array.isArray(data)
        ? data
        : data?.items || data?.data || data?.results || data?.categories || [];

      const normalized = (raw || [])
        .map((c) => {
          const id = c?.id ?? c?._id ?? c?.uuid ?? c?.value ?? null;
          const name = c?.name ?? c?.title ?? c?.label ?? "";
          return id ? { id, name: String(name || "").trim() } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, "es"));

      setCategories(normalized);
    } catch (err) {
      console.error("Error cargando categorías:", err);
      Alert.alert(
        "Categorías",
        "No se pudieron cargar las categorías.\n" + (err?.message || "")
      );
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 📸 Subir imagen a S3
 async function pickAndUploadCover() {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm?.status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitas dar permiso a tu galería.");
      return;
    }

    const mediaTypesCompat =
      (ImagePicker?.MediaType && ImagePicker.MediaType.Images) ||
       ImagePicker?.MediaTypeOptions?.Images ||  undefined; // último recurso

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypesCompat,   // ← usa el que exista en tu versión
      quality: 0.9,
      selectionLimit: 1,              // lo ignoran versiones viejas; no pasa nada
    });

    if (r.canceled) return;

    const a = r.assets?.[0];
    const mime =
      a?.mimeType ||
      (String(a?.uri || "").toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg");

    // 1) Subir a S3 como "temp"
    const { key } = await s3UploadAndGetKey({
      kind: "temp",
      ids: {},
      mime,
      file: { uri: a.uri, name: a.fileName || "cover", type: mime },
    });

    setTempCoverKey?.(key);
    setCoverUrl?.(key);

    // 2) URL temporal para previsualizar
    const signed = await uploadsSignGet({ key });
    setCoverPreview?.(signed?.url || null);

  } catch (e) {
    console.error("[pickAndUploadCover]", e);
    Alert.alert("Subida S3", e?.message || "No se pudo subir la imagen");
  }
}


  const canSubmit = useMemo(() => {
    return title.trim() && description.trim() && String(categoryId).length > 0;
  }, [title, description, categoryId]);

  // 🚀 Crear servicio
  const handleCreate = async () => {
    if (!canSubmit) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken?.();

      const body = {
        title: title.trim(),
        description: description.trim(),
        categoryId: toId(categoryId),
        priceFrom: priceFrom ? Number(priceFrom) : null,
        priceTo: priceTo ? Number(priceTo) : null,
        city: city.trim() || null,
        coverKey: coverUrl || null, // se envía la key de S3
      };

      const res = await fetch(`${API_URL}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo crear el servicio");

      Alert.alert("¡Éxito!", "Servicio creado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo crear el servicio");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("MyServices");
  };

  // 🖼️ Render
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <AppLogo source={require("../assets/Logo3.png")} size={32} rounded />

          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.title}>Crear Servicio</Text>
        <Text style={styles.subtitle}>Completa la información de tu servicio</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Información básica */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Información básica</Text>

          <Input
            label="Título del servicio *"
            placeholder="Ej: Plomería profesional"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Input
            label="Descripción *"
            placeholder="Describe tu servicio..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          <PickerField
            label="Categoría *"
            value={categoryId}
            onValueChange={setCategoryId}
            items={categories.map((c) => ({
              label: c.name,
              value: String(c.id),
            }))}
            loading={loadingCategories}
          />

          <Input
            label="Ciudad"
            placeholder="Ej: Santiago"
            value={city}
            onChangeText={setCity}
            maxLength={50}
          />
        </View>

        {/* Precio */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Precio</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Desde"
                placeholder="0"
                value={priceFrom}
                onChangeText={setPriceFrom}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Input
                label="Hasta"
                placeholder="0"
                value={priceTo}
                onChangeText={setPriceTo}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.hint}>Deja en blanco si prefieres "Precio a convenir"</Text>
        </View>

        {/* Imagen de portada */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Imagen de portada</Text>

          <TouchableOpacity
            onPress={pickAndUploadCover}
            style={[styles.btn, { marginBottom: 12 }]}
          >
            <Feather name="upload" size={20} color={Colors.text} />
            <Text style={styles.btnText}>Subir imagen (S3)</Text>
          </TouchableOpacity>

          {coverPreview ? (
            <Image
              source={{ uri: coverPreview }}
              style={{ width: "100%", height: 180, borderRadius: 12 }}
            />
          ) : (
            <Text style={styles.hint}>Aún no seleccionas imagen.</Text>
          )}
        </View>

        {/* Botón crear */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading || !canSubmit}
          style={[styles.btn, (loading || !canSubmit) && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Feather name="check" size={20} color={Colors.text} />
              <Text style={styles.btnText}>Crear Servicio</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...makeShadow(),
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    ...makeShadow(),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    fontSize: 12,
    color: Colors.subtext,
    fontStyle: "italic",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    ...makeShadow(),
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
});
