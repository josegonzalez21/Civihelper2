// src/screens/map/MapListScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function MapListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { region } = route.params || {};

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("distance"); // distance, rating, price

  useEffect(() => {
    loadServices();
  }, [region]);

  useEffect(() => {
    if (services.length > 0) {
      sortServices(sortBy);
    }
  }, [sortBy]);

  /**
   * Carga los servicios cercanos
   */
  const loadServices = async () => {
    setLoading(true);
    try {
      console.log("[MapListScreen] Cargando servicios para región:", region);

      // Simulación de datos
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockServices = [
        {
          id: "1",
          title: "Plomería Express",
          category: "Plomería",
          distance: 0.5,
          rating: 4.8,
          reviews: 124,
          price: 15000,
          image: "https://via.placeholder.com/300x200/7c3aed/ffffff?text=Plomeria",
          available: true,
          description: "Reparaciones de emergencia 24/7",
        },
        {
          id: "2",
          title: "Electricista Profesional",
          category: "Electricidad",
          distance: 1.2,
          rating: 4.9,
          reviews: 89,
          price: 20000,
          image: "https://via.placeholder.com/300x200/3b82f6/ffffff?text=Electricidad",
          available: true,
          description: "Instalaciones y mantenimiento",
        },
        {
          id: "3",
          title: "Limpieza del Hogar",
          category: "Limpieza",
          distance: 2.1,
          rating: 4.7,
          reviews: 56,
          price: 12000,
          image: "https://via.placeholder.com/300x200/10b981/ffffff?text=Limpieza",
          available: false,
          description: "Servicio de limpieza profunda",
        },
        {
          id: "4",
          title: "Jardinería Premium",
          category: "Jardinería",
          distance: 2.8,
          rating: 4.6,
          reviews: 43,
          price: 18000,
          image: "https://via.placeholder.com/300x200/22c55e/ffffff?text=Jardineria",
          available: true,
          description: "Mantenimiento de jardines",
        },
        {
          id: "5",
          title: "Carpintería Artesanal",
          category: "Carpintería",
          distance: 3.5,
          rating: 4.9,
          reviews: 71,
          price: 25000,
          image: "https://via.placeholder.com/300x200/f59e0b/ffffff?text=Carpinteria",
          available: true,
          description: "Muebles a medida",
        },
        {
          id: "6",
          title: "Pintura y Decoración",
          category: "Pintura",
          distance: 4.2,
          rating: 4.5,
          reviews: 38,
          price: 16000,
          image: "https://via.placeholder.com/300x200/ec4899/ffffff?text=Pintura",
          available: true,
          description: "Pintura interior y exterior",
        },
      ];

      setServices(mockServices);
    } catch (error) {
      console.error("[MapListScreen] Error cargando servicios:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ordena los servicios según el criterio seleccionado
   */
  const sortServices = (criteria) => {
    const sorted = [...services].sort((a, b) => {
      switch (criteria) {
        case "distance":
          return a.distance - b.distance;
        case "rating":
          return b.rating - a.rating;
        case "price":
          return a.price - b.price;
        default:
          return 0;
      }
    });
    setServices(sorted);
  };

  /**
   * Renderiza cada servicio
   */
  const renderService = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => navigation.navigate("ServiceDetail", { serviceId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.image }} style={styles.serviceImage} />
        {!item.available && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>No disponible</Text>
          </View>
        )}
      </View>

      <View style={styles.serviceContent}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.servicePrice}>
            ${item.price.toLocaleString("es-CL")}
          </Text>
        </View>

        <Text style={styles.serviceCategory}>{item.category}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.serviceMeta}>
          <View style={styles.metaItem}>
            <FontAwesome name="map-marker" size={14} color="#0F172A" />
            <Text style={styles.metaText}>{item.distance} km</Text>
          </View>

          <View style={styles.metaItem}>
            <FontAwesome name="star" size={14} color="#F59E0B" />
            <Text style={styles.metaText}>
              {item.rating} ({item.reviews})
            </Text>
          </View>

          {item.available && (
            <View style={[styles.metaItem, styles.availableBadge]}>
              <FontAwesome name="check-circle" size={14} color="#0F172A" />
              <Text style={styles.availableText}>Disponible</Text>
            </View>
          )}
        </View>
      </View>

      <FontAwesome name="chevron-right" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  /**
   * Renderiza los botones de ordenamiento
   */
  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Ordenar por</Text>
      <View style={styles.sortButtons}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === "distance" && styles.sortButtonActive]}
          onPress={() => setSortBy("distance")}
        >
          <FontAwesome
            name="map-marker"
            size={14}
            color={sortBy === "distance" ? "#0F172A" : "#6B7280"}
          />
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "distance" && styles.sortButtonTextActive,
            ]}
          >
            Distancia
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === "rating" && styles.sortButtonActive]}
          onPress={() => setSortBy("rating")}
        >
          <FontAwesome
            name="star"
            size={14}
            color={sortBy === "rating" ? "#0F172A" : "#6B7280"}
          />
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "rating" && styles.sortButtonTextActive,
            ]}
          >
            Calificación
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === "price" && styles.sortButtonActive]}
          onPress={() => setSortBy("price")}
        >
          <FontAwesome
            name="dollar"
            size={14}
            color={sortBy === "price" ? "#0F172A" : "#6B7280"}
          />
          <Text
            style={[
              styles.sortButtonText,
              sortBy === "price" && styles.sortButtonTextActive,
            ]}
          >
            Precio
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header amarillo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Servicios cercanos</Text>
          {!loading && (
            <Text style={styles.headerSubtitle}>
              {services.length} servicio
              {services.length !== 1 ? "s" : ""} encontrado
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => navigation.navigate("MapFilters")}
        >
          <FontAwesome name="sliders" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Lista de servicios */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F49A1A" />
          <Text style={styles.loadingText}>Cargando servicios...</Text>
        </View>
      ) : services.length > 0 ? (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderSortButtons}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome name="inbox" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            No hay servicios disponibles en esta área
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
            <FontAwesome name="refresh" size={14} color="#fff" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ===== base ===== */
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },

  /* ===== header ===== */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 18,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#FFD100",
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(15,23,42,0.7)",
    marginTop: 2,
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ===== sort ===== */
  sortContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  sortButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8DA",
    borderRadius: 999,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(244,154,26,0.08)",
  },
  sortButtonActive: {
    backgroundColor: "#FFD100",
    borderColor: "#F49A1A",
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  sortButtonTextActive: {
    color: "#0F172A",
  },

  /* ===== list ===== */
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },

  /* ===== card ===== */
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    alignItems: "center",
  },
  imageWrap: {
    position: "relative",
  },
  serviceImage: {
    width: 95,
    height: 95,
    borderRadius: 14,
    backgroundColor: "#FFF8DA",
  },
  unavailableBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unavailableText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  serviceContent: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 6,
  },
  serviceMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#0F172A",
  },
  availableBadge: {
    backgroundColor: "#FFF8DA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  availableText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* ===== states ===== */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
