// src/screens/ServiceDetailScreen.js
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import RatingStars from "../components/common/RatingStars";
import PrimaryButton from "../components/common/PrimaryButton";
import { API_URL, uploadsSignGet } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Colors from "../theme/color";

const LOGIN_GRADIENT = ["#7C3AED", "#A855F7"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const shadow = {
  small: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  medium: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  large: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
    android: { elevation: 8 },
  }),
};

/* ---------- Helpers fuera del componente ---------- */
const firstTruthy = (...arr) => arr.find(Boolean);

const pickCoverCandidate = (s = {}) => {
  // Preferir campos “oficiales” primero (URL), luego arrays, y por último KEYS
  const rootUrl = firstTruthy(
    s.coverThumbUrl,
    s.coverUrl,
    s.coverURL,
    s.cover,
    s.imageUrl,
    s.imageURL
  );

  const objUrl = firstTruthy(
    s.cover?.thumbUrl,
    s.cover?.url,
    s.image?.url
  );

  const fromImagesU =
    Array.isArray(s.images) &&
    firstTruthy(...s.images.map((p) => p?.thumbUrl || p?.url || p));

  const fromServiceImagesU =
    Array.isArray(s.serviceImages) &&
    firstTruthy(...s.serviceImages.map((p) => p?.thumbUrl || p?.url || p));

  const fromPhotosU =
    Array.isArray(s.photos) &&
    firstTruthy(...s.photos.map((p) => p?.thumbUrl || p?.url || p));

  // KEYs (cuando guardaste la key S3)
  const rootKey = firstTruthy(s.coverKey, s.imageKey, s.key);
  const objKey = firstTruthy(s.cover?.key, s.image?.key);

  const fromImagesK =
    Array.isArray(s.images) &&
    firstTruthy(...s.images.map((p) => p?.key).filter(Boolean));

  const fromServiceImagesK =
    Array.isArray(s.serviceImages) &&
    firstTruthy(...s.serviceImages.map((p) => p?.key).filter(Boolean));

  const fromPhotosK =
    Array.isArray(s.photos) &&
    firstTruthy(...s.photos.map((p) => p?.key).filter(Boolean));

  return (
    rootUrl ||
    objUrl ||
    fromImagesU ||
    fromServiceImagesU ||
    fromPhotosU ||
    rootKey ||
    objKey ||
    fromImagesK ||
    fromServiceImagesK ||
    fromPhotosK ||
    null
  );
};

export default function ServiceDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useAuth();

  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverSrc, setCoverSrc] = useState(null);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.replace("Home");
  };

  /* ---------- Resolver KEY/URL a URL mostrable ---------- */
  const resolveAnyToShowableUrl = useCallback(async (val) => {
    try {
      if (!val) { setCoverSrc(null); return; }
      const s = String(val);

      // Si ya es URL http(s)…
      if (/^https?:\/\//i.test(s)) {
        // Si es S3 directa, intentar obtener KEY para firmar (bucket privado)
        let maybeKey = null;
        try {
          const u = new URL(s);
          const isAWS = u.hostname.includes(".s3.") || u.hostname === "s3.amazonaws.com";
          if (isAWS) {
            const path = u.pathname.replace(/^\/+/, "");
            if (u.hostname.includes(".s3.") && !u.hostname.startsWith("s3.")) {
              // <bucket>.s3.<region>.amazonaws.com/<key>
              maybeKey = path;
            } else {
              // s3.<region>.amazonaws.com/<bucket>/<key> -> quitar bucket
              const parts = path.split("/");
              if (parts.length > 1) {
                parts.shift(); // quita bucket
                maybeKey = parts.join("/");
              }
            }
          }
        } catch {
          // Ignorar si no se puede parsear
        }

        if (maybeKey) {
          const signed = await uploadsSignGet({ key: maybeKey, expiresIn: 3600 });
          setCoverSrc(signed?.url || s);
        } else {
          setCoverSrc(s);
        }
        return;
      }

      // Es una KEY -> firmar GET
      const signed = await uploadsSignGet({ key: s, expiresIn: 3600 });
      setCoverSrc(signed?.url || null);
    } catch (e) {
      console.log("[DETAIL] resolveAnyToShowableUrl error:", e?.message);
      setCoverSrc(null);
    }
  }, []);

  /* ---------- Cargar servicio + portada ---------- */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/services/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo cargar el servicio");

      console.log("[DETAIL] servicio crudo:", JSON.stringify(data).slice(0, 1200));
      setSvc(data);

      const candidate = pickCoverCandidate(data);
      console.log("[DETAIL] candidata a portada:", candidate);
      await resolveAnyToShowableUrl(candidate);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      Alert.alert("Error", e?.message || "No se pudo cargar el servicio.", [{ text: "OK", onPress: goBack }]);
    } finally {
      setLoading(false);
    }
  }, [id, resolveAnyToShowableUrl]);

  useEffect(() => { if (id) load(); }, [id, load]);

  // Parallax header
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.min(value / 100, 1);
      headerOpacity.setValue(opacity);
    });
    return () => scrollY.removeListener(listener);
  }, [headerOpacity, scrollY]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={LOGIN_GRADIENT} style={styles.loadingHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel="Volver">
              <View style={styles.backButtonInner}><Feather name="arrow-left" size={22} color="#fff" /></View>
            </TouchableOpacity>
            <View style={styles.skeletonTitle} />
            <View style={styles.backButton} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Cargando servicio...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!svc) return null;

  const canReview = user?.role === "CLIENT" && user?.id !== svc?.userId;
  const isOwner = user?.id === svc?.userId;

  const contact = () => Alert.alert("Contacto", "Pronto podrás contactar al proveedor desde aquí.");
  const editService = () => navigation.navigate("ServiceEdit", { id });

  const priceText =
    svc?.priceFrom != null && !Number.isNaN(Number(svc.priceFrom))
      ? `$${Number(svc.priceFrom).toLocaleString()}`
      : "Precio a convenir";

  const rating = Number(svc?.ratingAvg ?? 0);
  const reviewCount = svc?._count?.reviews || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header fijo con efecto parallax */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient colors={LOGIN_GRADIENT} style={styles.floatingHeaderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel="Volver">
            <View style={styles.backButtonInner}><Feather name="arrow-left" size={22} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.floatingTitle} numberOfLines={1}>{svc.title}</Text>
          {isOwner && (
            <TouchableOpacity onPress={editService} style={styles.backButton} accessibilityLabel="Editar">
              <View style={styles.backButtonInner}><Feather name="edit-2" size={18} color="#fff" /></View>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Hero con gradiente */}
      <LinearGradient colors={LOGIN_GRADIENT} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityLabel="Volver">
            <View style={styles.backButtonInner}><Feather name="arrow-left" size={22} color="#fff" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isOwner && (
            <TouchableOpacity onPress={editService} style={styles.backButton} accessibilityLabel="Editar servicio">
              <View style={styles.backButtonInner}><Feather name="edit-2" size={18} color="#fff" /></View>
            </TouchableOpacity>
          )}
        </View>

        {/* Título + chips */}
        <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.heroTitle}>{svc.title}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingBadge}>
              <Feather name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.ratingText}>
              {reviewCount > 0 ? `${reviewCount} ${reviewCount === 1 ? "reseña" : "reseñas"}` : "Sin reseñas"}
            </Text>
          </View>
          <View style={styles.chipsContainer}>
            {svc.category?.name && (
              <View style={styles.chip}><Feather name="bookmark" size={14} color="#fff" /><Text style={styles.chipText}>{svc.category.name}</Text></View>
            )}
            {svc.city && (
              <View style={styles.chip}><Feather name="map-pin" size={14} color="#fff" /><Text style={styles.chipText}>{svc.city}</Text></View>
            )}
            <View style={[styles.chip, styles.priceChip]}><Feather name="dollar-sign" size={14} color="#fff" /><Text style={styles.chipText}>{priceText}</Text></View>
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Portada */}
        {coverSrc ? (
          <View style={styles.coverCard}>
            <Image source={{ uri: coverSrc }} style={styles.coverImage} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.coverCard, styles.coverPlaceholder]}>
            <Feather name="image" size={28} color={Colors.sub} />
            <Text style={styles.coverPlaceholderText}>Sin imagen de portada</Text>
          </View>
        )}

        {/* Proveedor */}
        {svc.user && (
          <Animated.View style={[styles.providerCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.providerHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={["#A855F7", "#7C3AED"]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(svc.user.name || "U")[0].toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.verifiedBadge}><Feather name="check" size={10} color="#fff" /></View>
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{svc.user.name || "Usuario"}</Text>
                <Text style={styles.providerRole}>Proveedor de servicios</Text>
              </View>
              <TouchableOpacity style={styles.messageButton}>
                <Feather name="message-circle" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Descripción */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}><Feather name="file-text" size={18} color={Colors.primary} /></View>
            <Text style={styles.sectionTitle}>Descripción del servicio</Text>
          </View>
          <View style={styles.descriptionCard}>
            <Text style={styles.description}>{svc.description}</Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}><Feather name="star" size={20} color="#FFD700" /></View>
            <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}><Feather name="message-square" size={20} color={Colors.primary} /></View>
            <Text style={styles.statValue}>{reviewCount}</Text>
            <Text style={styles.statLabel}>Reseñas</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}><Feather name="eye" size={20} color="#10B981" /></View>
            <Text style={styles.statValue}>{Math.floor(Math.random() * 100) + 50}</Text>
            <Text style={styles.statLabel}>Vistas</Text>
          </View>
        </Animated.View>

        {/* CTA */}
        {!isOwner && (
          <Animated.View style={[styles.ctaContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <PrimaryButton onPress={contact} style={styles.contactButton}>
              <Feather name="phone" size={20} color="#fff" style={{ marginRight: 10 }} />
              Contactar proveedor
            </PrimaryButton>
          </Animated.View>
        )}

        <View style={{ height: 20 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Loading
  loadingHero: { paddingHorizontal: 20, paddingTop: Platform.select({ ios: 8, android: 16 }), paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  skeletonTitle: { width: 150, height: 24, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 12 },
  loadingContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingCard: { alignItems: "center", gap: 16 },
  loadingText: { color: Colors.sub, fontSize: 15, fontWeight: "600" },

  // Floating Header
  floatingHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  floatingHeaderGradient: { paddingHorizontal: 20, paddingTop: Platform.select({ ios: 50, android: 16 }), paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, ...shadow.medium },
  floatingTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800" },

  // Hero
  hero: { paddingHorizontal: 20, paddingTop: Platform.select({ ios: 50, android: 16 }), paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, ...shadow.large },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backButtonInner: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  heroContent: { gap: 16 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 36, letterSpacing: 0.3 },

  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,215,0,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,215,0,0.3)" },
  ratingValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  ratingText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600" },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  priceChip: { backgroundColor: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.4)" },
  chipText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Content
  scrollContent: { padding: 20, gap: 16 },

  // Cover
  coverCard: { width: "100%", borderRadius: 16, overflow: "hidden", backgroundColor: Colors.card, ...shadow.medium },
  coverImage: { width: "100%", height: SCREEN_WIDTH * 0.55 },
  coverPlaceholder: { height: SCREEN_WIDTH * 0.55, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.withOpacity(Colors.palette.white, 0.1) },
  coverPlaceholderText: { color: Colors.sub, fontWeight: "600" },

  // Provider Card
  providerCard: { backgroundColor: Colors.withOpacity(Colors.palette.white, 0.05), borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.withOpacity(Colors.palette.white, 0.1), ...shadow.medium },
  providerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarContainer: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  verifiedBadge: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#10B981", borderWidth: 2, borderColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  providerInfo: { flex: 1 },
  providerName: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  providerRole: { color: Colors.sub, fontSize: 13, fontWeight: "600", marginTop: 2 },
  messageButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.withOpacity(Colors.primary, 0.15), borderWidth: 1, borderColor: Colors.withOpacity(Colors.primary, 0.3), alignItems: "center", justifyContent: "center" },

  // Sections
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIconBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.withOpacity(Colors.primary, 0.15), alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "900", flex: 1 },
  descriptionCard: { backgroundColor: Colors.withOpacity(Colors.palette.white, 0.05), borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.withOpacity(Colors.palette.white, 0.1) },
  description: { color: Colors.sub, fontSize: 15, lineHeight: 24, fontWeight: "500" },

  // Stats
  statsContainer: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.withOpacity(Colors.palette.white, 0.05), borderRadius: 16, padding: 16, alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.withOpacity(Colors.palette.white, 0.1), ...shadow.small },
  statIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.withOpacity(Colors.palette.white, 0.1), alignItems: "center", justifyContent: "center" },
  statValue: { color: Colors.text, fontSize: 20, fontWeight: "900" },
  statLabel: { color: Colors.sub, fontSize: 12, fontWeight: "600" },

  // CTA
  ctaContainer: { marginTop: 8 },
  contactButton: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
