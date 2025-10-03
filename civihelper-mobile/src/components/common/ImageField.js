// src/components/common/ImageField.js
import { Image, TouchableOpacity, View, Text } from "react-native";
import { pickImage } from "../../hooks/useImagePicker";
export default function ImageField({ label, value, onChange }){
  async function handlePick(){ const img = await pickImage(); if (img) onChange(img); }
  return (
    <View style={{ marginBottom: 16 }}>
      <Text>{label}</Text>
      {value ? (
        <TouchableOpacity onPress={handlePick}><Image source={{uri:value.uri || value}} style={{ height:120, borderRadius:12 }} /></TouchableOpacity>
      ) : (
        <PrimaryButton onPress={handlePick}>Seleccionar imagen</PrimaryButton>
      )}
      {!!value && <Text onPress={()=>onChange(null)}>Quitar</Text>}
    </View>
  );
}
