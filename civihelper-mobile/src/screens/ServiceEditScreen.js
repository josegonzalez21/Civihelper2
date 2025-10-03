// src/screens/ServiceEditScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import PrimaryButton from "../components/common/PrimaryButton";
import { API_URL, getAuthToken } from "../services/api";

/* ===== Paleta CiviHelper (oscuro + glass) ===== */
const UI = {
  // texto
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.80)",
  muted: "rgba(255,255,255,0.70)",
  helper: "rgba(255,255,255,0.55)",

  // marca
  primary: "#7C3AED",   // 600
  primary500: "#A855F7",

  // semánticos
  success: "#10B981",
  error: "#EF4444",

  // superficies
  bg: "#0B0A1A",
  card: "rgba(255,255,255,0.05)",          // glass
  input: "rgba(10,10,25,0.85)",            // surface/input
  border: "rgba(255,255,255,0.10)",        // border/subtle
  borderInput: "rgba(255,255,255,0.08)",   // border/input
};

export default function ServiceEditScreen({ navigation, route }) {
  const { id } = route.params || {};

  const [cats, setCats] = useState([]);
  const [openCats, setOpenCats] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [city, setCity] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const valid = useMemo(() => {
    const vTitle = title.trim().length >= 3;
    const vDesc = description.trim().length >= 20;
    const vCat = !!categoryId;
    const vPrice = priceFrom === "" || (!isNaN(Number(priceFrom)) && Number(priceFrom) >= 0);
    return vTitle && vDesc && vCat && vPrice;
  }, [title, description, categoryId, priceFrom]);

  const loadCats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const data = await res.json();
      setCats(Array.isArray(data) ? data : []);
    } catch {
      setCats([]);
    }
  }, []);

  const loadSvc = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/services/${id}`);
      const s = await res.json();
      setTitle(s.title || "");
      setCategoryId(s.categoryId || null);
      setCity(s.city || "");
      setPriceFrom(s.priceFrom != null ? String(s.priceFrom) : "");
      setDescription(s.description || "");
    } catch {
      Alert.alert("Error", "No se pudo cargar el servicio.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadSvc(); }, [loadSvc]);

  const submit = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      const token = getAuthToken?.();
      const body = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        city: city.trim() || null,
        priceFrom: priceFrom === "" ? null : Number(priceFrom),
      };
      const res = await fetch(`${API_URL}/services/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar el servicio");
      Alert.alert("Guardado", "Cambios aplicados.");
      navigation.replace("ServiceDetail", { id });
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    Alert.alert("Eliminar", "¿Eliminar este servicio?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const token = getAuthToken?.();
            const res = await fetch(`${API_URL}/services/${id}`, {
              method: "DELETE",
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.message || "No se pudo eliminar");
            }
            Alert.alert("Listo", "Servicio eliminado");
            navigation.replace("MyServices");
          } catch (e) {
            Alert.alert("Error", e?.message || "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={UI.primary500} />
        <Text style={{ color: UI.sub, marginTop: 8 }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.bg }}>
      {/* Header con gradiente violeta */}
      <LinearGradient
        colors={[UI.primary, UI.primary500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Volver">
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Editar servicio</Text>
          <View style={styles.iconBtn} />{/* spacer */}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Título */}
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título"
            placeholderTextColor={UI.helper}
          />
          {title.length > 0 && title.trim().length < 3 && (
            <Text style={styles.err}>Mínimo 3 caracteres.</Text>
          )}

          {/* Categoría */}
          <Text style={[styles.label, { marginTop: 12 }]}>Categoría</Text>
          <TouchableOpacity style={styles.select} onPress={() => setOpenCats((s) => !s)}>
            <Text style={{ color: categoryId ? UI.text : UI.helper }}>
              {categoryId
                ? cats.find((c) => c.id === categoryId)?.name || "Seleccionada"
                : "Selecciona una categoría"}
            </Text>
            <Feather name={openCats ? "chevron-up" : "chevron-down"} size={18} color={UI.muted} />
          </TouchableOpacity>

          {openCats && (
            <View style={styles.dropdown}>
              {cats.map((c, idx) => (
                <TouchableOpacity
                  key={c.id || String(idx)}
                  style={[styles.option, idx < cats.length - 1 && styles.optionDivider]}
                  onPress={() => {
                    setCategoryId(c.id);
                    setOpenCats(false);
                  }}
                >
                  <Text style={{ color: UI.text }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Ciudad */}
          <Text style={[styles.label, { marginTop: 12 }]}>Ciudad (opcional)</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ciudad"
            placeholderTextColor={UI.helper}
          />

          {/* Precio */}
          <Text style={[styles.label, { marginTop: 12 }]}>Precio desde (opcional)</Text>
          <TextInput
            style={styles.input}
            value={priceFrom}
            onChangeText={setPriceFrom}
            placeholder="25000"
            placeholderTextColor={UI.helper}
            keyboardType="numeric"
          />
          {priceFrom !== "" && (isNaN(Number(priceFrom)) || Number(priceFrom) < 0) && (
            <Text style={styles.err}>Debe ser número mayor o igual a 0.</Text>
          )}

          {/* Descripción */}
          <Text style={[styles.label, { marginTop: 12 }]}>Descripción</Text>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: "top", paddingTop: 12 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe tu servicio"
            placeholderTextColor={UI.helper}
            multiline
          />
          {description.length > 0 && description.trim().length < 20 && (
            <Text style={styles.err}>Mínimo 20 caracteres.</Text>
          )}

          {/* Acciones */}
          <PrimaryButton onPress={submit} disabled={!valid} loading={saving} style={{ marginTop: 12 }}>
            Guardar cambios
          </PrimaryButton>

          <TouchableOpacity onPress={remove} style={{ marginTop: 12, alignSelf: "center" }}>
            <Text style={{ color: UI.error, fontWeight: "800" }}>Eliminar servicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 10, android: 12, default: 12 }),
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },

  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
    borderColor: UI.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
      web: { backdropFilter: "blur(10px)" },
    }),
  },

  label: { color: UI.sub, fontSize: 13, marginBottom: 6, fontWeight: "700" },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.borderInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: UI.input,
    color: UI.text,
  },

  select: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.borderInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: UI.input,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: UI.borderInput,
    borderRadius: 12,
    backgroundColor: UI.input,
    overflow: "hidden",
  },
  option: { padding: 12 },
  optionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: UI.borderInput },

  err: { color: UI.error, marginTop: 6, fontSize: 12 },
});
