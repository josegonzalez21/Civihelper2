// src/components/home/HeaderHero.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AppLogo from "../common/AppLogo";

export default function HeaderHero({ user, onPressProfile }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppLogo source={require("../../assets/Logo3.png")} size={32} rounded />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.hi}>Hola{user?.firstName ? `, ${user.firstName}` : ""} 👋</Text>
          <Text style={styles.subtitle}>¿Qué servicio necesitas hoy?</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onPressProfile} style={styles.profileBtn} accessibilityRole="button">
        <Text style={styles.profileText}>Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  left: { flexDirection: "row", alignItems: "center" },
  hi: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#52616b" },
  profileBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#0ea5e9" },
  profileText: { color: "white", fontWeight: "700" },
});
