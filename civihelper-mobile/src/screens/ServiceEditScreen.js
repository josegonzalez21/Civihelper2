// src/screens/ServiceEditScreen.js
import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { API_URL, getAuthToken } from "../services/api";
import Input from "../components/common/Input";
import PickerField from "../components/common/PickerField";
import ImageField from "../components/common/ImageField";
import AppLogo from "../components/common/AppLogo";

// Paleta Páginas Amarillas
const Colors = {
  primary: "#FFD100",
  primaryDark: "#F5C400",
  primaryLight: "#FFF8CC",
  purple: "#7C3AED",
  success: "#10B981",
  danger: "#EF4444",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E5E7EB",
  card: "#FFFFFF",
  bg: "#FAFAFA",
};

const makeShadow = () =>
  Platform.OS === "android"
    ? { elevation: 3 }
    : { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } };

export default function ServiceEditScreen({ route }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const serviceId = route?.params?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [city, setCity] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingService, setLoadingService] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch(`${API_URL}/categories`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.items || [];
      setCategories(list);
    } catch (err) {
      console.error("Error cargando categorías:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadService = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoadingService(true);
      const token = getAuthToken?.();
      const res = await fetch(`${API_URL}/services/${serviceId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo cargar el servicio");
      }

      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategoryId(String(data.categoryId || ""));
      setPriceFrom(data.priceFrom != null ? String(data.priceFrom) : "");
      setPriceTo(data.priceTo != null ? String(data.priceTo) : "");
      setCity(data.city || "");
      setCoverUrl(data.coverUrl || "");
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo cargar el servicio");
    } finally {
      setLoadingService(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadService();
    }, [loadService])
  );

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim() || !categoryId) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken?.();
      const body = {
        title: title.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        priceFrom: priceFrom ? Number(priceFrom) : null,
        priceTo: priceTo ? Number(priceTo) : null,
        city: city.trim() || null,
        coverUrl: coverUrl || null,
      };

      const res = await fetch(`${API_URL}/services/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo actualizar el servicio");
      }

      Alert.alert("¡Éxito!", "Servicio actualizado correctamente", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo actualizar el servicio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar servicio",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const token = getAuthToken?.();
              const res = await fetch(`${API_URL}/services/${serviceId}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });

              if (!res.ok) {
                throw new Error("No se pudo eliminar el servicio");
              }

              Alert.alert("Eliminado", "Servicio eliminado correctamente", [
                {
                  text: "OK",
                  onPress: () => navigation.navigate("MyServices"),
                },
              ]);
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("MyServices");
  };

  if (loadingService) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header con gradiente amarillo */}
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

          <AppLogo
            source={require("../assets/Logo3.png")}
            size={32}
            rounded
          />

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Eliminar servicio"
          >
            <Feather name="trash-2" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Editar Servicio</Text>
        <Text style={styles.subtitle}>
          Actualiza la información de tu servicio
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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

          <Text style={styles.hint}>
            Deja en blanco si prefieres "Precio a convenir"
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Imagen de portada</Text>
          <ImageField 
            value={coverUrl} 
            onChangeText={setCoverUrl}
          />
        </View>

        {/* Botón actualizar */}
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={[styles.btn, loading && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Feather name="save" size={20} color={Colors.text} />
              <Text style={styles.btnText}>Guardar Cambios</Text>
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
  deleteBtn: {
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: Colors.subtext,
    fontSize: 14,
  },
});