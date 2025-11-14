import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import RoleGuard from "../../components/RoleGuard";
import { useAuth } from "../../context/AuthContext";
import Colors, { spacing, radius, shadows } from "../../theme/color";
import { fetchJSON } from "../../services/api";

function Header() {
  const navigation = useNavigation();
  const canBack = navigation?.canGoBack?.() === true;
  const safeBack = () =>
    canBack ? navigation.goBack() : navigation.navigate("AdminHome");

  return (
    <View style={s.header}>
      <View style={s.headerTopRow}>
        {canBack ? (
          <TouchableOpacity
            style={s.backBtn}
            onPress={safeBack}
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerKicker}>PANEL ADMIN</Text>
          <Text style={s.headerTitle}>Configuración</Text>
          <Text style={s.headerSub}>Sistema y administración</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
    </View>
  );
}

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [siteTitle, setSiteTitle] = useState("Civihelper");
  const [emailSupport, setEmailSupport] = useState("soporte@civihelper.com");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTitleChange = useCallback((text) => {
    setSiteTitle(text);
    setHasChanges(true);
  }, []);

  const handleEmailChange = useCallback((text) => {
    setEmailSupport(text);
    setHasChanges(true);
  }, []);

  const handleMaintenanceToggle = useCallback((value) => {
    setMaintenance(value);
    setHasChanges(true);
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const saveSettings = async () => {
    if (!siteTitle.trim()) {
      Alert.alert("Validación", "El título del sitio no puede estar vacío.");
      return;
    }

    if (!validateEmail(emailSupport)) {
      Alert.alert("Validación", "Por favor ingresa un correo válido.");
      return;
    }

    try {
      setSaving(true);
      await fetchJSON("/admin/settings", {
        method: "POST",
        body: {
          siteTitle: siteTitle.trim(),
          emailSupport: emailSupport.trim(),
          maintenance,
        },
      });
      Alert.alert("Éxito", "Cambios guardados correctamente.");
      setHasChanges(false);
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "No se pudo guardar la configuración."
      );
      console.error("Save settings error:", error);
    } finally {
      setSaving(false);
    }
  };

  const refreshSystemStatus = async () => {
    try {
      setLoading(true);
      const res = await fetchJSON("/admin/system/status");
      const statusMessage = `
Versión: ${res.version || "N/A"}
Estado: ${res.status || "N/A"}
Uptime: ${res.uptime || "N/A"}
Memoria: ${res.memory || "N/A"}
BD: ${res.database || "N/A"}
      `.trim();
      Alert.alert("Estado del sistema", statusMessage);
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "No se pudo obtener el estado del sistema."
      );
      console.error("System status error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={s.safe}>
        <Header />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Ajustes Generales */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Feather
                name="settings"
                size={20}
                color="#111827"
                style={{ marginRight: 8 }}
              />
              <Text style={s.sectionTitle}>Ajustes generales</Text>
            </View>

            <View style={s.card}>
              <View style={s.field}>
                <Text style={s.label}>Título del sitio</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Civihelper"
                  placeholderTextColor="#9CA3AF"
                  value={siteTitle}
                  onChangeText={handleTitleChange}
                  maxLength={50}
                />
                <Text style={s.helper}>{siteTitle.length}/50</Text>
              </View>

              <View style={s.divider} />

              <View style={s.field}>
                <Text style={s.label}>Correo de soporte</Text>
                <TextInput
                  style={s.input}
                  placeholder="soporte@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={emailSupport}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  maxLength={100}
                />
                <Text style={s.helper}>
                  Se mostrará a los usuarios cuando pidan ayuda.
                </Text>
              </View>
            </View>
          </View>

          {/* Mantenimiento */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Feather
                name="alert-triangle"
                size={20}
                color="#B45309"
                style={{ marginRight: 8 }}
              />
              <Text style={s.sectionTitle}>Mantenimiento</Text>
            </View>
            <View style={s.card}>
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Modo mantenimiento</Text>
                  <Text style={s.helper}>
                    Los usuarios verán una pantalla temporal
                  </Text>
                </View>
                <Switch
                  value={maintenance}
                  onValueChange={handleMaintenanceToggle}
                  trackColor={{
                    false: "#E5E7EB",
                    true: "rgba(34,197,94,0.3)",
                  }}
                  thumbColor={maintenance ? "#22C55E" : "#9CA3AF"}
                />
              </View>
            </View>
          </View>

          {/* Botón guardar */}
          <TouchableOpacity
            style={[
              s.mainBtn,
              (saving || !hasChanges) && s.mainBtnDisabled,
            ]}
            onPress={saveSettings}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <ActivityIndicator color="#111827" size="small" />
            ) : (
              <>
                <Feather name="save" size={16} color="#111827" />
                <Text style={s.mainBtnTxt}>
                  {hasChanges ? "Guardar cambios" : "Sin cambios"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Estado del sistema */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Feather
                name="activity"
                size={20}
                color="#111827"
                style={{ marginRight: 8 }}
              />
              <Text style={s.sectionTitle}>Estado del sistema</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardText}>
                Consulta información actual del backend y servicios conectados.
              </Text>

              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={refreshSystemStatus}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#111827" size="small" />
                ) : (
                  <>
                    <Feather
                      name="refresh-cw"
                      size={16}
                      color="#111827"
                    />
                    <Text style={s.secondaryBtnTxt}>Actualizar estado</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Mi cuenta */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Feather
                name="user"
                size={20}
                color="#111827"
                style={{ marginRight: 8 }}
              />
              <Text style={s.sectionTitle}>Mi cuenta</Text>
            </View>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Nombre</Text>
                <Text style={s.infoValue}>
                  {user?.name || "Desconocido"}
                </Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Correo</Text>
                <Text style={s.infoValue}>
                  {user?.email || "No disponible"}
                </Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Rol</Text>
                <View style={s.rolePill}>
                  <Text style={s.rolePillTxt}>
                    {user?.role || "N/A"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.dangerBtn}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={16} color="#fff" />
                <Text style={s.dangerBtnTxt}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  /* HEADER AMARILLO */
  header: {
    backgroundColor: "#FFD100",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 16 }),
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadows.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerKicker: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSub: {
    color: "#111827",
    opacity: 0.85,
    fontSize: 13,
  },

  /* SECTIONS */
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  /* CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: spacing.md,
  },
  cardText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: spacing.md,
  },

  /* FORM */
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  helper: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: spacing.md,
  },

  /* SWITCH ROW */
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  /* MAIN BUTTON (amarillo) */
  mainBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD100",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },
  mainBtnDisabled: {
    opacity: 0.55,
  },
  mainBtnTxt: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
  },

  /* SECONDARY BUTTON */
  secondaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,209,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,209,0,0.5)",
    borderRadius: 12,
    paddingVertical: 10,
  },
  secondaryBtnTxt: {
    color: "#111827",
    fontWeight: "700",
  },

  /* INFO */
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    color: "#6B7280",
    fontSize: 13,
  },
  infoValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginLeft: 16,
  },
  rolePill: {
    backgroundColor: "rgba(17,24,39,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rolePillTxt: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },

  /* DANGER */
  dangerBtn: {
    marginTop: spacing.md,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerBtnTxt: {
    color: "#fff",
    fontWeight: "700",
  },
});
