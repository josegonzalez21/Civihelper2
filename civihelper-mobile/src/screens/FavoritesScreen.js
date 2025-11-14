/**
 * Pantalla de favoritos del usuario - Diseño moderno
 * 
 * Características:
 * - Diseño de cards moderno con animaciones
 * - Sistema de tabs para filtrar por categoría
 * - Búsqueda en tiempo real
 * - Grid/List toggle view
 * - Acciones rápidas (chat, eliminar, compartir)
 * - Pull to refresh
 * - Estados vacíos atractivos
 * 
 * @module screens/FavoritesScreen
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

/* =========================
   CONSTANTES
========================= */

const Colors = {
  primary: "#7c3aed",
  secondary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#ffffff",
  textSecondary: "#9ca3af",
  bg: "#0f0f23",
  card: "#1a1a2e",
  cardHover: "#242438",
  border: "#2d2d44",
};

const CATEGORIES = [
  { id: "all", name: "Todos", icon: "star" },
  { id: "plumbing", name: "Plomería", icon: "wrench" },
  { id: "electric", name: "Electricidad", icon: "bolt" },
  { id: "cleaning", name: "Limpieza", icon: "home" },
  { id: "garden", name: "Jardinería", icon: "leaf" },
  { id: "carpentry", name: "Carpintería", icon: "cut" },
  { id: "painting", name: "Pintura", icon: "paint-brush" },
];

/* =========================
   COMPONENTE PRINCIPAL
========================= */

export default function FavoritesScreen({ navigation }) {
  // Estados
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchInputRef = useRef(null);

  /**
   * Carga inicial de favoritos
   */
  useEffect(() => {
    loadFavorites();
  }, []);

  /**
   * Filtrado en tiempo real
   */
  useEffect(() => {
    filterFavorites();
  }, [searchQuery, selectedCategory, favorites]);

  /**
   * Carga los favoritos desde la API
   */
  const loadFavorites = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // TODO: Integrar con tu API
      console.log("[FavoritesScreen] Cargando favoritos...");

      // Simulación de datos
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockFavorites = [
        {
          id: "1",
          title: "Plomería Express 24/7",
          description: "Reparaciones de emergencia en el hogar",
          category: "plumbing",
          categoryName: "Plomería",
          price: 15000,
          rating: 4.8,
          reviews: 124,
          image: "https://via.placeholder.com/400x300/7c3aed/ffffff?text=Plomeria",
          provider: {
            id: "p1",
            name: "Juan Pérez",
            image: "https://via.placeholder.com/100x100/3b82f6/ffffff?text=JP",
          },
          distance: "0.5 km",
          available: true,
          verified: true,
        },
        {
          id: "2",
          title: "Electricista Profesional",
          description: "Instalaciones eléctricas certificadas",
          category: "electric",
          categoryName: "Electricidad",
          price: 20000,
          rating: 4.9,
          reviews: 89,
          image: "https://via.placeholder.com/400x300/3b82f6/ffffff?text=Electricidad",
          provider: {
            id: "p2",
            name: "María González",
            image: "https://via.placeholder.com/100x100/10b981/ffffff?text=MG",
          },
          distance: "1.2 km",
          available: true,
          verified: true,
        },
        {
          id: "3",
          title: "Limpieza del Hogar Premium",
          description: "Servicio de limpieza profunda",
          category: "cleaning",
          categoryName: "Limpieza",
          price: 12000,
          rating: 4.7,
          reviews: 56,
          image: "https://via.placeholder.com/400x300/10b981/ffffff?text=Limpieza",
          provider: {
            id: "p3",
            name: "Clean Pro",
            image: "https://via.placeholder.com/100x100/f59e0b/ffffff?text=CP",
          },
          distance: "2.1 km",
          available: false,
          verified: true,
        },
        {
          id: "4",
          title: "Jardinería Profesional",
          description: "Diseño y mantenimiento de jardines",
          category: "garden",
          categoryName: "Jardinería",
          price: 18000,
          rating: 4.6,
          reviews: 43,
          image: "https://via.placeholder.com/400x300/22c55e/ffffff?text=Jardineria",
          provider: {
            id: "p4",
            name: "Green Gardens",
            image: "https://via.placeholder.com/100x100/22c55e/ffffff?text=GG",
          },
          distance: "2.8 km",
          available: true,
          verified: false,
        },
        {
          id: "5",
          title: "Carpintería Artesanal",
          description: "Muebles a medida y reparaciones",
          category: "carpentry",
          categoryName: "Carpintería",
          price: 25000,
          rating: 4.9,
          reviews: 71,
          image: "https://via.placeholder.com/400x300/f59e0b/ffffff?text=Carpinteria",
          provider: {
            id: "p5",
            name: "Wood Masters",
            image: "https://via.placeholder.com/100x100/f59e0b/ffffff?text=WM",
          },
          distance: "3.5 km",
          available: true,
          verified: true,
        },
        {
          id: "6",
          title: "Pintura y Decoración",
          description: "Pintura interior y exterior",
          category: "painting",
          categoryName: "Pintura",
          price: 16000,
          rating: 4.5,
          reviews: 38,
          image: "https://via.placeholder.com/400x300/ec4899/ffffff?text=Pintura",
          provider: {
            id: "p6",
            name: "Color Pro",
            image: "https://via.placeholder.com/100x100/ec4899/ffffff?text=CP",
          },
          distance: "4.2 km",
          available: true,
          verified: true,
        },
      ];

      setFavorites(mockFavorites);
    } catch (error) {
      console.error("[FavoritesScreen] Error cargando favoritos:", error);
      Alert.alert("Error", "No se pudieron cargar los favoritos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Filtra los favoritos según búsqueda y categoría
   */
  const filterFavorites = () => {
    let filtered = favorites;

    // Filtrar por categoría
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.categoryName.toLowerCase().includes(query)
      );
    }

    setFilteredFavorites(filtered);
  };

  /**
   * Elimina un favorito
   */
  const handleRemoveFavorite = useCallback((item) => {
    Alert.alert(
      "Eliminar favorito",
      `¿Quieres eliminar "${item.title}" de tus favoritos?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Integrar con API
              console.log("[FavoritesScreen] Eliminando:", item.id);

              setFavorites((prev) => prev.filter((fav) => fav.id !== item.id));
              
              // Mostrar confirmación
              Alert.alert("Éxito", "Favorito eliminado correctamente");
            } catch (error) {
              console.error("[FavoritesScreen] Error:", error);
              Alert.alert("Error", "No se pudo eliminar el favorito");
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Navega al chat con el proveedor
   */
  const handleChatPress = useCallback(
    (item) => {
      navigation.navigate("Chat", {
        providerId: item.provider.id,
        providerName: item.provider.name,
        providerImage: item.provider.image,
        serviceId: item.id,
      });
    },
    [navigation]
  );

  /**
   * Navega al detalle del servicio
   */
  const handleServicePress = useCallback(
    (item) => {
      navigation.navigate("ServiceDetail", { id: item.id });
    },
    [navigation]
  );

  /**
   * Comparte un favorito
   */
  const handleShare = useCallback((item) => {
    // TODO: Implementar Share API
    console.log("[FavoritesScreen] Compartir:", item.id);
    Alert.alert("Compartir", `Compartiendo: ${item.title}`);
  }, []);

  /* =========================
     COMPONENTES DE UI
  ========================= */

  /**
   * Header con título y acciones
   */
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mis Favoritos</Text>
          <View style={styles.favoritesBadge}>
            <FontAwesome name="heart" size={12} color={Colors.danger} />
            <Text style={styles.favoritesBadgeText}>{favorites.length}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            <FontAwesome
              name={viewMode === "grid" ? "list" : "th"}
              size={18}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color={Colors.textSecondary} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Buscar en favoritos..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <FontAwesome name="times-circle" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categorías tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryTab,
              selectedCategory === cat.id && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <FontAwesome
              name={cat.icon}
              size={16}
              color={selectedCategory === cat.id ? Colors.text : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat.id && styles.categoryTabTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  /**
   * Renderiza una card en modo grid
   */
  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => handleServicePress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.gridCardImage} />

      {/* Badge de verificado */}
      {item.verified && (
        <View style={styles.verifiedBadge}>
          <FontAwesome name="check-circle" size={14} color={Colors.success} />
        </View>
      )}

      {/* Badge de disponibilidad */}
      {!item.available && (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableText}>No disponible</Text>
        </View>
      )}

      {/* Contenido */}
      <View style={styles.gridCardContent}>
        <Text style={styles.gridCardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.gridCardMeta}>
          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={12} color={Colors.warning} />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewsText}>({item.reviews})</Text>
          </View>
        </View>

        <View style={styles.gridCardFooter}>
          <View>
            <Text style={styles.priceLabel}>Desde</Text>
            <Text style={styles.priceText}>${item.price.toLocaleString("es-CL")}</Text>
          </View>

          <View style={styles.gridCardActions}>
            <TouchableOpacity
              style={styles.gridActionButton}
              onPress={() => handleChatPress(item)}
            >
              <FontAwesome name="comment" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridActionButton}
              onPress={() => handleRemoveFavorite(item)}
            >
              <FontAwesome name="heart" size={16} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Renderiza una card en modo lista
   */
  const renderListItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => handleServicePress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.listCardImage} />

      {/* Contenido */}
      <View style={styles.listCardContent}>
        <View style={styles.listCardHeader}>
          <Text style={styles.listCardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.verified && (
            <FontAwesome name="check-circle" size={14} color={Colors.success} />
          )}
        </View>

        <Text style={styles.listCardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.listCardMeta}>
          <View style={styles.metaItem}>
            <FontAwesome name="star" size={12} color={Colors.warning} />
            <Text style={styles.metaText}>{item.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="map-marker" size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="tag" size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.categoryName}</Text>
          </View>
        </View>

        <View style={styles.listCardFooter}>
          <Text style={styles.listPriceText}>${item.price.toLocaleString("es-CL")}</Text>

          <View style={styles.listCardActions}>
            <TouchableOpacity
              style={styles.listActionButton}
              onPress={() => handleChatPress(item)}
            >
              <FontAwesome name="comment" size={14} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listActionButton}
              onPress={() => handleShare(item)}
            >
              <FontAwesome name="share" size={14} color={Colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listActionButton}
              onPress={() => handleRemoveFavorite(item)}
            >
              <FontAwesome name="heart" size={14} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Estado vacío
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.emptyIconContainer}
      >
        <FontAwesome name="heart-o" size={48} color={Colors.text} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {searchQuery || selectedCategory !== "all"
          ? "No se encontraron favoritos"
          : "Aún no tienes favoritos"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory !== "all"
          ? "Intenta con otros términos de búsqueda"
          : "Explora servicios y guárdalos aquí tocando el ícono de corazón"}
      </Text>
      {!searchQuery && selectedCategory === "all" && (
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate("Search")}
        >
          <Text style={styles.exploreButtonText}>Explorar Servicios</Text>
          <FontAwesome name="arrow-right" size={14} color={Colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );

  /* =========================
     RENDERIZADO PRINCIPAL
  ========================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando favoritos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredFavorites}
        renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          filteredFavorites.length === 0 && styles.listContentEmpty,
        ]}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : null}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFavorites(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* =========================
   ESTILOS
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  favoritesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  favoritesBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  categoriesContainer: {
    marginHorizontal: -16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    color: Colors.text,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  gridRow: {
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  gridCardImage: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.border,
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unavailableText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
  },
  gridCardContent: {
    padding: 12,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  gridCardMeta: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  reviewsText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  gridCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  gridCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  gridActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    padding: 12,
    gap: 12,
  },
  listCardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  listCardContent: {
    flex: 1,
  },
  listCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  listCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  listCardDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  listCardMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  listCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listPriceText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  listCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  listActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
});