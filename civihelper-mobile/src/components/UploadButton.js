// src/components/UploadButton.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageWithPresign } from "../services/upload";

export default function UploadButton({ onUploaded }) {
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permiso requerido", "Autoriza acceso a tu galería para subir imágenes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setBusy(true);
      const { key } = await uploadImageWithPresign(asset.uri, asset.mimeType || "image/jpeg");
      setBusy(false);

      onUploaded?.({ key });
      Alert.alert("Listo", "Imagen subida con éxito.");
    } catch (e) {
      setBusy(false);
      Alert.alert("Error al subir", e.message || String(e));
    }
  };

  return (
    <TouchableOpacity onPress={pickAndUpload} disabled={busy} style={{ padding: 12, borderRadius: 12, backgroundColor: "#111827" }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        {busy ? <ActivityIndicator /> : <Text style={{ color: "white", fontWeight: "600" }}>Subir imagen</Text>}
      </View>
    </TouchableOpacity>
  );
}
