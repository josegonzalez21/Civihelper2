// src/screens/map/MapMainScreen.js
// VERSIÓN SIMPLE - Funciona en Expo Go sin react-native-maps
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import * as Location from "expo-location";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function MapMainScreen() {
  const navigation = useNavigation();

  // Estado de ubicación
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyServices, setNearbyServices] = useState([]);

  // Solicitar permisos de ubicación al montar
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Cargar servicios cercanos cuando se obtiene la ubicación
  useEffect(() => {
    if (userLocation) {
      loadNearbyServices();
    }
  }, [userLocation]);

  /**
   * Solicita permisos de ubicación y obtiene la ubicación actual
   */
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a tu ubicación para mostrarte servicios cercanos.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Obtener ubicación actual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(userCoords);
      console.log("[MapMainScreen] Ubicación obtenida:", userCoords);
    } catch (error) {
      console.error("[MapMainScreen] Error obteniendo ubicación:", error);
      Alert.alert("Error", "No se pudo obtener tu ubicación actual.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga servicios cercanos (simulación)
   */
  const loadNearbyServices = async () => {
    try {
      console.log("[MapMainScreen] Cargando servicios cercanos...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setNearbyServices([
        {
          id: "1",
          title: "Plomería Express",
          category: "Plomería",
          distance: "0.5 km",
          rating: 4.8,
          reviews: 124,
          price: "$15.000",
          image: "https://via.placeholder.com/100x100/7c3aed/ffffff?text=P",
          available: true,
        },
        {
          id: "2",
          title: "Electricista Profesional",
          category: "Electricidad",
          distance: "1.2 km",
          rating: 4.9,
          reviews: 89,
          price: "$20.000",
          image: "https://via.placeholder.com/100x100/3b82f6/ffffff?text=E",
          available: true,
        },
        {
          id: "3",
          title: "Limpieza del Hogar",
          category: "Limpieza",
          distance: "2.1 km",
          rating: 4.7,
          reviews: 56,
          price: "$12.000",
          image: "https://via.placeholder.com/100x100/10b981/ffffff?text=L",
          available: true,
        },
        {
          id: "4",
          title: "Jardinería Profesional",
          category: "Jardinería",
          distance: "2.8 km",
          rating: 4.6,
          reviews: 43,
          price: "$18.000",
          image: "https://via.placeholder.com/100x100/22c55e/ffffff?text=J",
          available: false,
        },
      ]);
    } catch (error) {
      console.error("[MapMainScreen] Error cargando servicios:", error);
    }
  };

  /**
   * Busca servicios
   */
  const handleSearch = () => {
    console.log("[MapMainScreen] Buscando:", searchQuery);
    navigation.navigate("MapSearch", {
      query: searchQuery,
      region: userLocation,
    });
  };

  /**
   * Navega a los filtros del mapa
   */
  const handleFilters = () => {
    navigation.navigate("MapFilters");
  };

  /**
   * Renderiza un servicio cercano
   */
  const renderService = (service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.serviceCard}
      onPress={() => navigation.navigate("ServiceDetail", { serviceId: service.id })}
    >
      <Image source={{ uri: service.image }} style={styles.serviceImage} />

      <View style={styles.serviceContent}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {service.title}
          </Text>
          {!service.available && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableText}>No disp.</Text>
            </View>
          )}
        </View>

        <Text style={styles.serviceCategory}>{service.category}</Text>

        <View style={styles.serviceMeta}>
          <View style={styles.metaItem}>
            <FontAwesome name="map-marker" size={12} color="#374151" />
            <Text style={styles.metaText}>{service.distance}</Text>
          </View>

          <View style={styles.metaItem}>
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text style={styles.metaText}>
              {service.rating} ({service.reviews})
            </Text>
          </View>

          <Text style={styles.servicePrice}>{service.price}</Text>
        </View>
      </View>

      <FontAwesome name="chevron-right" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header con búsqueda */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
        >
          <FontAwesome name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <FontAwesome
            name="search"
            size={18}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar servicios..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilters}
          accessibilityLabel="Filtros"
        >
          <FontAwesome name="sliders" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Información de ubicación */}
          {userLocation && (
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <FontAwesome name="location-arrow" size={18} color="#C05621" />
                <Text style={styles.locationTitle}>Tu ubicación</Text>
              </View>
              <Text style={styles.locationCoords}>
                Lat: {userLocation.latitude.toFixed(4)}, Lon:{" "}
                {userLocation.longitude.toFixed(4)}
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={requestLocationPermission}
              >
                <FontAwesome name="refresh" size={14} color="#B45309" />
                <Text style={styles.refreshText}>Actualizar ubicación</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Servicios cercanos */}
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servicios cercanos</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MapList", { region: userLocation })
                }
              >
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            {nearbyServices.length > 0 ? (
              <View style={styles.servicesList}>
                {nearbyServices.map(renderService)}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <FontAwesome name="inbox" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  No hay servicios disponibles en esta área
                </Text>
              </View>
            )}
          </View>

          {/* Categorías rápidas */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {[
                { id: "1", name: "Plomería", icon: "wrench", color: "#F97316" },
                { id: "2", name: "Electricidad", icon: "bolt", color: "#0EA5E9" },
                { id: "3", name: "Limpieza", icon: "home", color: "#10B981" },
                { id: "4", name: "Jardinería", icon: "leaf", color: "#22C55E" },
                { id: "5", name: "Carpintería", icon: "cut", color: "#F59E0B" },
                { id: "6", name: "Pintura", icon: "paint-brush", color: "#EC4899" },
              ].map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => {
                    setSearchQuery(category.name);
                    handleSearch();
                  }}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color + "15" },
                    ]}
                  >
                    <FontAwesome
                      name={category.icon}
                      size={20}
                      color={category.color}
                    />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Botón de vista de lista flotante */}
      {!loading && nearbyServices.length > 0 && (
        <TouchableOpacity
          style={styles.listButton}
          onPress={() => navigation.navigate("MapList", { region: userLocation })}
          accessibilityLabel="Ver lista completa"
        >
          <FontAwesome name="list" size={18} color="#0F172A" />
          <Text style={styles.listButtonText}>Ver lista completa</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ===== Layout base ===== */
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4", // fondo tipo guía / páginas amarillas
  },

  /* ===== Header ===== */
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFD100",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.04)",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFE27A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.05)",
  },

  /* ===== Loading ===== */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#0F172A",
    fontSize: 15,
  },

  /* ===== Content ===== */
  content: {
    flex: 1,
  },

  /* ===== Ubicación ===== */
  locationCard: {
    margin: 16,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  locationCoords: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 10,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },

  /* ===== Servicios ===== */
  servicesSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceImage: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  serviceContent: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  unavailableBadge: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unavailableText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#B91C1C",
  },
  serviceCategory: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 6,
  },
  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#475569",
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
    marginLeft: "auto",
  },

  /* ===== Categorías ===== */
  categoriesSection: {
    paddingHorizontal: 16,
    marginBottom: 100,
  },
  categoriesScroll: {
    gap: 10,
    paddingVertical: 8,
  },
  categoryCard: {
    alignItems: "center",
    width: 90,
  },
  categoryIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
  },

  /* ===== Empty ===== */
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },

  /* ===== FAB ===== */
  listButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE27A",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  listButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
});
