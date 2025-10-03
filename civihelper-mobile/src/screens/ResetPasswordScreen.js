import React, { useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { api } from "../services/api";

export default function ResetPasswordScreen({ route, navigation }) {
  const presetEmail = route?.params?.email ?? "";
  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordValid = useMemo(() => {
    // Política básica: 8+ caracteres (ajústalo si quieres ISO/OWASP más estricta)
    return newPassword.length >= 8;
  }, [newPassword]);

  const onSubmit = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return Alert.alert("Correo inválido", "Ingresa un correo válido.");
    if (!token || token.length < 16) return Alert.alert("Token inválido", "Verifica el token enviado.");
    if (!passwordValid) return Alert.alert("Contraseña débil", "Debe tener al menos 8 caracteres.");

    try {
      setLoading(true);
      await api.resetPassword({ email: e, token, newPassword });
      Alert.alert("Éxito", "Contraseña actualizada correctamente.", [
        { text: "Iniciar sesión", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#0c1117", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
        Restablecer contraseña
      </Text>

      <Text style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>Correo electrónico</Text>
      <TextInput
        placeholder="tu@correo.com"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: "#1f2937",
          marginBottom: 12,
        }}
      />

      <Text style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>Token</Text>
      <TextInput
        placeholder="Pega el token del enlace"
        placeholderTextColor="#64748b"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: "#1f2937",
          marginBottom: 12,
        }}
      />

      <Text style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>Nueva contraseña</Text>
      <TextInput
        placeholder="Mínimo 8 caracteres"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: "#1f2937",
          marginBottom: 16,
        }}
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={loading}
        style={{
          backgroundColor: "#22c55e",
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#0c1117" /> : (
          <Text style={{ color: "#0c1117", fontWeight: "700", fontSize: 16 }}>Actualizar contraseña</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 16 }}>
        <Text style={{ color: "#93c5fd", textAlign: "center" }}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
