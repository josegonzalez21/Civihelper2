// src/components/common/ImageField.js
import React, { useState } from "react";
import {
  Image,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { pickImage } from "../hooks/useImagePicker";
import { uploadImageWithPresign } from "../../services/upload";

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
    ? { elevation: 2 }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      };

export default function ImageField({ label, value, onChangeText }) {
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    try {
      setUploading(true);

      // Seleccionar imagen de la galería
      const image = await pickImage();
      if (!image) {
        setUploading(false);
        return;
      }

      // Subir imagen al servidor
      const { key } = await uploadImageWithPresign(
        image.uri,
        image.type || "image/jpeg"
      );

      // Construir URL pública (ajusta según tu configuración)
      const publicUrl = `https://tu-bucket.s3.amazonaws.com/${key}`;
      
      // O si tu backend devuelve la URL completa:
      // onChangeText(key); // si guardas solo la key
      onChangeText(publicUrl); // si guardas la URL completa

      Alert.alert("¡Éxito!", "Imagen subida correctamente");
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudo subir la imagen. Intenta de nuevo."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Quitar imagen",
      "¿Estás seguro de quitar esta imagen?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => onChangeText(null),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {value ? (
        <View style={styles.imageContainer}>
          {/* Imagen seleccionada */}
          <Image
            source={{ uri: typeof value === "string" ? value : value.uri }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Overlay con acciones */}
          <View style={styles.overlay}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.changeBtnStyle]}
              onPress={handlePick}
              disabled={uploading}
            >
              <Feather name="edit-2" size={16} color={Colors.text} />
              <Text style={styles.actionBtnText}>Cambiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.removeBtnStyle]}
              onPress={handleRemove}
              disabled={uploading}
            >
              <Feather name="trash-2" size={16} color={Colors.danger} />
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>
                Quitar
              </Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Subiendo imagen...</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.placeholder}
          onPress={handlePick}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.placeholderText}>Subiendo imagen...</Text>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Feather name="image" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.placeholderTitle}>Seleccionar imagen</Text>
              <Text style={styles.placeholderSubtitle}>
                Toca para elegir una foto de tu galería
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.bg,
    borderWidth: 2,
    borderColor: Colors.primary,
    ...makeShadow(),
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.bg,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeBtnStyle: {
    backgroundColor: Colors.primary,
  },
  removeBtnStyle: {
    backgroundColor: Colors.card,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  placeholder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.border,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 8,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: Colors.subtext,
    textAlign: "center",
    maxWidth: 200,
  },
});