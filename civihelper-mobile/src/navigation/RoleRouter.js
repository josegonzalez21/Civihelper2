// src/navigation/RoleRouter.js
import React, { useMemo } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import Colors, { spacing } from "../theme/color";

// Tabs por rol
import AdminTabs from "./tabs/AdminTabs";
import ProviderTabs from "./tabs/ProviderTabs";
import ClientTabs from "./tabs/ClientTabs";

/** Normaliza rol */
function normalizeRole(rawRole) {
  const r = (rawRole || "").toUpperCase().trim();
  const roleMap = {
    USER: "CLIENT",
    CUSTOMER: "CLIENT",
    ADMIN: "ADMIN",
    ADMINISTRATOR: "ADMIN",
    PROVIDER: "PROVIDER",
    VENDOR: "PROVIDER",
    SELLER: "PROVIDER",
    CLIENT: "CLIENT",
  };
  return roleMap[r] || "CLIENT";
}

// Mapeo de componentes de tabs por rol
const TABS_BY_ROLE = {
  ADMIN: AdminTabs,
  PROVIDER: ProviderTabs,
  CLIENT: ClientTabs,
};

export default function RoleRouter() {
  const { user, loading } = useAuth();

  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const TabsComponent = useMemo(() => TABS_BY_ROLE[role] || ClientTabs, [role]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={32} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Sin sesión activa</Text>
          <Text style={styles.errorText}>
            No se pudo cargar la información del usuario.
          </Text>
        </View>
      </View>
    );
  }

  if (!TABS_BY_ROLE[role]) {
    console.warn(`Rol no reconocido: ${role}. Usando CLIENT por defecto.`);
  }

  if (__DEV__) {
    console.log(`[RoleRouter] Usuario: ${user?.name}, Rol: ${role}`);
  }

  return <TabsComponent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: spacing.xl * 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      web: { boxShadow: "0px 4px 12px rgba(0,0,0,0.1)" },
    }),
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: spacing.xl * 2,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      web: { boxShadow: "0px 4px 12px rgba(0,0,0,0.1)" },
    }),
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: Colors.sub,
    textAlign: "center",
    lineHeight: 20,
  },
});
