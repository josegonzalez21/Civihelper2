// src/hooks/useImagePicker.js
import * as ImagePicker from "expo-image-picker";
export async function pickImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") throw new Error("Permiso de galería denegado");
  const res = await ImagePicker.launchImageLibraryAsync({ quality:0.8, allowsEditing:true });
  return res?.assets?.[0] ?? null;
}