// src/screens/home/ClientHome.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Linking,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

/* =========================
   PALETA DE COLORES - Inspirada en Páginas Amarillas
========================= */
const COLORS = {
  // Amarillo característico
  yellow: "#FFD100",
  yellowDark: "#F5C400",
  yellowLight: "#FFF8CC",
  
  // Morado/Violeta para elementos premium
  purple: "#7C3AED",
  purpleLight: "#A78BFA",
  purpleDark: "#5B21B6",
  
  // Bases
  white: "#FFFFFF",
  black: "#0A0A0A",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  
  // Estados
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  
  // Funcionales
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  shadow: "rgba(0, 0, 0, 0.08)",
};

/* =========================
   SKELETON LOADER
========================= */
function SkeletonLoader({ width, height, style }) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.gray200,
          borderRadius: 12,
          opacity,
        },
        style,
      ]}
    />
  );
}

/* =========================
   URL RESOLVER
========================= */
function useUrlResolver({ API_BASE, CDN_BASE }) {
  return useCallback(
    (keyOrUrl) => {
      if (!keyOrUrl) return null;
      const v = String(keyOrUrl);
      if (/^https?:\/\//i.test(v)) return v;
      const clean = v.replace(/^\/+/, "");
      if (CDN_BASE) return `${CDN_BASE.replace(/\/+$/, "")}/${clean}`;
      const base = API_BASE.replace(/\/+$/, "");
      return `${base}/${clean}`;
    },
    [API_BASE, CDN_BASE]
  );
}

/* =========================
   COMPONENTE: QUICK ACTION CARD
========================= */
function QuickActionCard({ icon, label, onPress, badge, color = COLORS.yellow }) {
  return (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={24} color={COLORS.white} />
        {badge > 0 && (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/* =========================
   COMPONENTE: FEATURED SERVICE CARD
========================= */
function FeaturedServiceCard({ item, onPress, resolveFileUrl }) {
  const [imageError, setImageError] = useState(false);
  const coverKeyOrUrl = item?.coverThumbUrl || item?.coverUrl;
  const cover = resolveFileUrl(coverKeyOrUrl);

  return (
    <TouchableOpacity
      style={styles.featuredServiceCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.featuredImageContainer}>
        {cover && !imageError ? (
          <Image 
            source={{ uri: cover }} 
            style={styles.featuredImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.featuredImage, styles.imageFallback]}>
            <Feather name="image" size={32} color={COLORS.gray400} />
          </View>
        )}
        {item?.isNew && (
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>NUEVO</Text>
          </View>
        )}
        {item?.discount && (
          <View style={styles.discountTag}>
            <Text style={styles.discountTagText}>-{item.discount}%</Text>
          </View>
        )}
      </View>
      
      <View style={styles.featuredContent}>
        <Text numberOfLines={2} style={styles.featuredTitle}>
          {item?.title}
        </Text>
        
        {item?.rating && (
          <View style={styles.ratingContainer}>
            <Feather name="star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            {item?.reviewCount && (
              <Text style={styles.reviewText}>({item.reviewCount})</Text>
            )}
          </View>
        )}
        
        <View style={styles.featuredLocation}>
          <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
          <Text numberOfLines={1} style={styles.locationText}>
            {item?.city || item?.category?.name || "—"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* =========================
   COMPONENTE: BANNER CAROUSEL
========================= */
function BannerCarousel({ data = [], onPressItem, resolveFileUrl }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const scrollRef = useRef(null);

  const onMomentumScrollEnd = (e) => {
    const w = e.nativeEvent.layoutMeasurement.width || width;
    const x = e.nativeEvent.contentOffset.x || 0;
    const i = Math.round(x / w);
    setIndex(i);
  };

  useEffect(() => {
    if (!data.length) return;
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % data.length;
        scrollRef.current?.scrollTo({ x: next * (width - 48), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [data.length, width]);

  if (!data.length) return null;

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        snapToAlignment="center"
        decelerationRate="fast"
      >
        {data.map((item) => {
          const cover =
            resolveFileUrl(item?.imageUrl) ||
            resolveFileUrl(item?.imageKey) ||
            resolveFileUrl(item?.coverUrl) ||
            resolveFileUrl(item?.coverThumbUrl);

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => onPressItem?.(item)}
              style={[styles.bannerSlide, { width: width - 48 }]}
            >
              {cover && !imageErrors[item.id] ? (
                <Image 
                  source={{ uri: cover }} 
                  style={styles.bannerImage}
                  onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.yellowLight, COLORS.yellow]}
                  style={styles.bannerImage}
                >
                  <Feather name="image" size={48} color={COLORS.yellowDark} />
                </LinearGradient>
              )}
              
              {(item?.title || item?.description) && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.bannerOverlay}
                >
                  {item?.title && (
                    <Text numberOfLines={2} style={styles.bannerTitle}>
                      {item.title}
                    </Text>
                  )}
                  {item?.description && (
                    <Text numberOfLines={1} style={styles.bannerDescription}>
                      {item.description}
                    </Text>
                  )}
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {data.length > 1 && (
        <View style={styles.dotsContainer}>
          {data.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                i === index && styles.dotActive
              ]} 
            />
          ))}
        </View>
      )}
    </View>
  );
}

/* =========================
   COMPONENTE: CATEGORY CHIP
========================= */
function CategoryChip({ name, icon, onPress, featured }) {
  return (
    <TouchableOpacity
      style={[styles.categoryChip, featured && styles.categoryChipFeatured]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.categoryChipIcon,
        featured && styles.categoryChipIconFeatured
      ]}>
        <Feather 
          name={icon} 
          size={18} 
          color={featured ? COLORS.white : COLORS.yellow} 
        />
      </View>
      <Text style={[
        styles.categoryChipText,
        featured && styles.categoryChipTextFeatured
      ]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================
   COMPONENTE: SECTION HEADER
========================= */
function SectionHeader({ title, onSeeAll, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {icon && (
          <View style={styles.sectionIcon}>
            <Feather name={icon} size={20} color={COLORS.yellow} />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
          <View style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Ver todo</Text>
            <Feather name="arrow-right" size={14} color={COLORS.yellow} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* =========================
   COMPONENTE: INFO CARD
========================= */
function InfoCard({ icon, title, description, onPress, color = COLORS.yellow }) {
  return (
    <TouchableOpacity 
      style={styles.infoCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.infoCardIcon, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={24} color={color} />
      </View>
      <View style={styles.infoCardContent}>
        <Text style={styles.infoCardTitle}>{title}</Text>
        <Text style={styles.infoCardDescription}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={COLORS.gray400} />
    </TouchableOpacity>
  );
}

/* =========================
   PANTALLA PRINCIPAL
========================= */
export default function ClientHome() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const API_BASE = useMemo(
    () =>
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:4000",
    []
  );

  const CDN_BASE = useMemo(
    () =>
      process.env.EXPO_PUBLIC_CDN_BASE ||
      process.env.CDN_BASE_URL ||
      "",
    []
  );

  const resolveFileUrl = useUrlResolver({ API_BASE, CDN_BASE });

  // Estados
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    activeRequests: 0,
    nearbyProviders: 0,
  });

  // Cargar datos
  const loadPromos = useCallback(async () => {
    try {
      setLoadingPromos(true);
      const url = `${API_BASE}/api/promotions?status=ACTIVE&limit=50`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPromos(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setPromos([]);
    } finally {
      setLoadingPromos(false);
    }
  }, [API_BASE]);

  const loadFeatured = useCallback(async () => {
    try {
      setLoadingFeatured(true);
      const url = `${API_BASE}/api/featured?pageSize=10`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setFeatured(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setFeatured([]);
    } finally {
      setLoadingFeatured(false);
    }
  }, [API_BASE]);

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const url = `${API_BASE}/api/categories?popular=true&limit=8`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCategories(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [API_BASE]);

  const loadStats = useCallback(async () => {
    try {
      const url = `${API_BASE}/api/user/stats`;
      const res = await fetch(url, { 
        method: "GET",
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setStats({
          unreadMessages: json.unreadMessages || 0,
          activeRequests: json.activeRequests || 0,
          nearbyProviders: json.nearbyProviders || 0,
        });
      }
    } catch (e) {
      console.error("Error cargando stats:", e);
    }
  }, [API_BASE, user?.token]);

  useEffect(() => {
    loadPromos();
    loadFeatured();
    loadCategories();
    loadStats();
  }, [loadPromos, loadFeatured, loadCategories, loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadPromos(), loadFeatured(), loadCategories(), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPromos, loadFeatured, loadCategories, loadStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "Usuario";
  const avatarUrl = user?.avatarUrl;

  // Navegación
  const goProfile = () => navigation.navigate("Profile");
  const goSearch = () => navigation.navigate("Search");
  const goChat = () => navigation.navigate("Chat");
  const goMap = () => navigation.navigate("Map");
  const goNewRequest = () => navigation.navigate("NewRequest");
  const goSupport = () => navigation.navigate("Support");
  const goNotifications = () => navigation.navigate("Notifications");
  const goFavorites = () => navigation.navigate("Favorites");

  const openService = (svc) => navigation.navigate("Service", { id: svc?.id });
  const openCategory = (cat) => navigation.navigate("Category", { id: cat?.id });
  
  const openPromo = async (p) => {
    if (p?.serviceId) return navigation.navigate("Service", { id: p.serviceId });
    if (p?.categoryId) return navigation.navigate("Category", { id: p.categoryId });
    if (p?.linkUrl) {
      try {
        await Linking.openURL(p.linkUrl);
      } catch {}
    }
  };

  // Iconos de categorías
  const categoryIcons = {
    'Hogar': 'home',
    'Reparaciones': 'tool',
    'Limpieza': 'droplet',
    'Belleza': 'scissors',
    'Salud': 'heart',
    'Educación': 'book',
    'Tecnología': 'smartphone',
    'Transporte': 'truck',
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* Header Amarillo Característico */}
      <LinearGradient
        colors={[COLORS.yellow, COLORS.yellowDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={goNotifications}
            >
              <Feather name="bell" size={20} color={COLORS.gray800} />
              {stats.unreadMessages > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={goProfile}
            >
              {avatarUrl ? (
                <Image 
                  source={{ uri: resolveFileUrl(avatarUrl) }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Feather name="user" size={20} color={COLORS.gray800} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Buscador Principal */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={goSearch}
          activeOpacity={0.8}
        >
          <Feather name="search" size={20} color={COLORS.gray500} />
          <Text style={styles.searchPlaceholder}>
            ¿Qué servicio necesitas?
          </Text>
          <Feather name="sliders" size={18} color={COLORS.gray400} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.yellow}
            colors={[COLORS.yellow]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Accesos Rápidos */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="message-circle"
              label="Mensajes"
              onPress={goChat}
              badge={stats.unreadMessages}
              color={COLORS.purple}
            />
            <QuickActionCard
              icon="map"
              label="Cerca de ti"
              onPress={goMap}
              badge={stats.nearbyProviders}
              color={COLORS.yellow}
            />
            <QuickActionCard
              icon="send"
              label="Solicitar"
              onPress={goNewRequest}
              badge={stats.activeRequests}
              color={COLORS.info}
            />
            <QuickActionCard
              icon="heart"
              label="Favoritos"
              onPress={goFavorites}
              badge={0}
              color={COLORS.error}
            />
          </View>
        </View>

        {/* Banner Carousel */}
        {loadingPromos ? (
          <View style={styles.section}>
            <SkeletonLoader width="100%" height={180} />
          </View>
        ) : promos.length > 0 ? (
          <View style={styles.section}>
            <BannerCarousel 
              data={promos} 
              onPressItem={openPromo} 
              resolveFileUrl={resolveFileUrl} 
            />
          </View>
        ) : null}

        {/* Categorías Populares */}
        <View style={styles.section}>
          <SectionHeader 
            title="Categorías" 
            icon="grid"
            onSeeAll={goSearch}
          />
          
          {loadingCategories ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesRow}>
                {[1,2,3,4].map(i => (
                  <SkeletonLoader key={i} width={110} height={44} />
                ))}
              </View>
            </ScrollView>
          ) : categories.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {categories.map((cat, idx) => (
                <CategoryChip
                  key={cat.id}
                  name={cat.name}
                  icon={categoryIcons[cat.name] || 'grid'}
                  onPress={() => openCategory(cat)}
                  featured={idx === 0}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Servicios Destacados */}
        <View style={styles.section}>
          <SectionHeader 
            title="Servicios destacados" 
            icon="star"
            onSeeAll={goSearch}
          />

          {loadingFeatured ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
            >
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.featuredServiceCard}>
                  <SkeletonLoader width="100%" height={140} style={{ marginBottom: 12 }} />
                  <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width="60%" height={12} />
                </View>
              ))}
            </ScrollView>
          ) : featured.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color={COLORS.gray400} />
              <Text style={styles.emptyText}>No hay servicios destacados</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
            >
              {featured.map((item) => (
                <FeaturedServiceCard
                  key={item.id}
                  item={item}
                  onPress={() => openService(item)}
                  resolveFileUrl={resolveFileUrl}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Información Útil */}
        <View style={styles.section}>
          <SectionHeader title="Te puede interesar" icon="info" />
          
          <InfoCard
            icon="trending-up"
            title="Lo más buscado"
            description="Descubre los servicios más populares de la semana"
            onPress={goSearch}
            color={COLORS.purple}
          />
          
          <InfoCard
            icon="map-pin"
            title="Proveedores cercanos"
            description={
              stats.nearbyProviders > 0 
                ? `${stats.nearbyProviders} disponibles en tu zona`
                : 'Encuentra profesionales cerca de ti'
            }
            onPress={goMap}
            color={COLORS.yellow}
          />
          
          <InfoCard
            icon="life-buoy"
            title="¿Necesitas ayuda?"
            description="Nuestro equipo está listo para asistirte"
            onPress={goSupport}
            color={COLORS.info}
          />
        </View>

        {/* Espaciado final */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================
   ESTILOS
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header Amarillo
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.yellow,
  },

  greetingText: {
    fontSize: 12,
    color: COLORS.gray800,
    fontWeight: '600',
    opacity: 0.8,
  },

  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gray900,
  },

  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },

  // Buscador
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    }),
  },

  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray500,
    fontWeight: '500',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Secciones
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.yellow,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      },
    }),
  },

  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },

  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  quickBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  // Banner Carousel
  carouselWrapper: {
    position: 'relative',
  },

  bannerSlide: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },

  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 40,
  },

  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },

  bannerDescription: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gray300,
  },

  dotActive: {
    width: 20,
    backgroundColor: COLORS.yellow,
  },

  // Categories
  categoriesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },

  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  categoryChipFeatured: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellowDark,
  },

  categoryChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryChipIconFeatured: {
    backgroundColor: COLORS.white,
  },

  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  categoryChipTextFeatured: {
    color: COLORS.gray900,
  },

  // Featured Services
  featuredRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 4,
  },

  featuredServiceCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
    }),
  },

  featuredImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: COLORS.gray100,
  },

  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  newTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  newTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  discountTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  discountTagText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  featuredContent: {
    padding: 14,
  },

  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  reviewText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },

  featuredLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },

  // Info Cards
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      },
    }),
  },

  infoCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoCardContent: {
    flex: 1,
  },

  infoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },

  infoCardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
});