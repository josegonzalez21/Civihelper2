// src/navigation/RoleRouter.js
import React, { useMemo } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "../context/AuthContext";

// Tabs por rol (créalos según el plan Opción A)
import AdminTabs from "./AdminTabs";
import ProviderTabs from "./ProviderTabs";
import ClientTabs from "./ClientTabs";

// Normaliza el rol que viene del backend / compatibilidad con "USER"
function normalizeRole(rawRole) {
  const r = (rawRole || "").toUpperCase();
  if (r === "USER") return "CLIENT";
  if (r === "ADMIN" || r === "PROVIDER" || r === "CLIENT") return r;
  return "CLIENT";
}

const TABS_BY_ROLE = {
  ADMIN: AdminTabs,
  PROVIDER: ProviderTabs,
  CLIENT: ClientTabs,
};

export default function RoleRouter() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  // Obtiene el componente de Tabs según el rol (default: CLIENT)
  const TabsComponent = useMemo(
    () => TABS_BY_ROLE[role] || ClientTabs,
    [role]
  );

  // Guard simple si aún no hay user (no debería ocurrir viniendo de AppNavigator, pero por si acaso)
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Cargando…</Text>
      </View>
    );
  }

  return <TabsComponent />;
}
