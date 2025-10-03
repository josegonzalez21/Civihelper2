// src/components/RoleGuard.js
import React from "react";
import { View, Text } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function RoleGuard({ allow = [], children, fallback = null }) {
  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();

  const ok = allow.length === 0 || allow.includes(role);
  if (!ok) {
    return (
      fallback ?? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text>No tienes permiso para ver esta pantalla.</Text>
        </View>
      )
    );
  }
  return <>{children}</>;
}
