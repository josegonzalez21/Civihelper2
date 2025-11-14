// src/screens/admin/AdminPromotions.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { request } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Colors, { spacing, radius, shadows } from "../../theme/color";
import RoleGuard from "../../components/RoleGuard";

// 👇 mismo logo que estás usando en las otras pantallas
import logo3 from "../../assets/Logo3.png";

const DARK = "#111827";

export default function AdminPromotions() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState(null);

  const loadPromos = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await request(
        "/admin/promotions?limit=20&sort=createdAt:desc",
        { tag: "ADMIN_PROMOS" }
      );
      setPromos(data?.items ?? data ?? []);
    } catch (e) {
      setError(e?.message || "Error al cargar promociones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const createPromo = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Debe ingresar un título");
      return;
    }

    try {
      setCreating(true);
      const newPromo = await request("/admin/promotions", {
        method: "POST",
        body: { title: title.trim(), description: desc.trim() },
        tag: "CREATE_PROMO",
      });
      setPromos((p) => [newPromo, ...p]);
      setTitle("");
      setDesc("");
      Alert.alert("Éxito", "Promoción creada correctamente");
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo crear la promoción");
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminHome");
  };

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={styles.safe}>
        {/* Header amarillo */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={goBack}
              style={styles.backBtn}
              accessibilityLabel="Volver"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="arrow-left" size={20} color={DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <View style={styles.logoWrap}>
                <Image source={logo3} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>PANEL ADMIN</Text>
                <Text style={styles.title}>Promociones</Text>
                <Text style={styles.sub}>
                  Crea, revisa y administra las promociones activas del sistema.
                </Text>
              </View>
            </View>

            {/* mini stats / chip */}
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Feather name="zap" size={14} color={DARK} />
                <Text style={styles.chipTxt}>
                  {promos.length} promoción{promos.length === 1 ? "" : "es"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.muted, { marginTop: spacing.sm }]}>
              Cargando promociones…
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Card para crear promoción */}
            <View style={[styles.card, { marginBottom: spacing.md }]}>
              <View style={styles.cardHeader}>
                <Feather name="plus-circle" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Nueva promoción rápida</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Título de la promoción"
                placeholderTextColor={Colors.placeholder}
                value={title}
                onChangeText={setTitle}
                editable={!creating}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción (opcional)"
                placeholderTextColor={Colors.placeholder}
                value={desc}
                onChangeText={setDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!creating}
              />

              <TouchableOpacity
                onPress={createPromo}
                disabled={creating || !title.trim()}
                style={{ marginTop: spacing.sm }}
              >
                <View
                  style={[
                    styles.primaryBtn,
                    (creating || !title.trim()) && { opacity: 0.5 },
                  ]}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Crear promoción</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("AdminPromotionCreate")}
                style={styles.secondaryLink}
              >
                <Feather name="image" size={14} color={Colors.primary} />
                <Text style={styles.secondaryLinkTxt}>
                  Crear promoción con banner
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lista de promociones */}
            <Text style={styles.sectionTitle}>Promociones activas</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadPromos} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : promos.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="inbox" size={48} color={Colors.muted} />
                <Text style={styles.emptyText}>
                  No hay promociones disponibles
                </Text>
              </View>
            ) : (
              promos.map((promo) => (
                <View key={promo.id} style={[styles.card, styles.promoCard]}>
                  <View style={styles.promoHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoTitle}>{promo.title}</Text>
                      {promo.description ? (
                        <Text style={styles.promoDesc} numberOfLines={2}>
                          {promo.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.promoBadge}>
                      <Feather name="zap" size={14} color={Colors.primary} />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("AdminPromotionDetail", {
                        id: promo.id,
                      })
                    }
                    style={styles.viewDetailBtn}
                  >
                    <Text style={styles.viewDetailText}>Ver detalle</Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF7C2", // fondo crema tipo páginas amarillas
  },

  /* ===== Header ===== */
  header: {
    backgroundColor: "#FFD100",
    padding: spacing.lg,
    paddingTop: Platform.select({ ios: 12, android: 16 }),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    ...shadows.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  headerContent: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  kicker: {
    color: "#111827",
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  sub: {
    color: "#111827",
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipTxt: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },

  /* ===== Loading ===== */
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },

  /* ===== Cards ===== */
  card: {
    backgroundColor: "#FFFDF6",
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FFE38A",
    ...shadows.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  input: {
    height: 48,
    backgroundColor: "#FFFBE3",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  textArea: {
    height: 90,
    paddingTop: spacing.sm,
  },

  primaryBtn: {
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: "#0F172A", // botón oscuro para contraste
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  secondaryLinkTxt: {
    color: Colors.primary,
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: spacing.md,
  },

  errorBox: {
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "#FFFDF6",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: Colors.error,
    borderRadius: radius.sm,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },

  emptyBox: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyText: {
    color: Colors.muted,
    marginTop: spacing.md,
    fontSize: 15,
  },

  promoCard: {
    marginBottom: spacing.sm,
  },
  promoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 14,
    color: Colors.sub,
  },
  promoBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(252,211,77,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#FFE38A",
  },
  viewDetailText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  muted: {
    color: Colors.sub,
  },
});
