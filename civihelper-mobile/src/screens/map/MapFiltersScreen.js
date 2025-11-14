// src/screens/map/MapFiltersScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Slider from "@react-native-community/slider";

export default function MapFiltersScreen() {
  const navigation = useNavigation();

  const [distance, setDistance] = useState(5); // km
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 100000]);

  const categories = [
    { id: "1", name: "Plomería", icon: "wrench" },
    { id: "2", name: "Electricidad", icon: "bolt" },
    { id: "3", name: "Limpieza", icon: "home" },
    { id: "4", name: "Jardinería", icon: "leaf" },
    { id: "5", name: "Carpintería", icon: "cut" },
    { id: "6", name: "Pintura", icon: "paint-brush" },
  ];

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApplyFilters = () => {
    const filters = {
      distance,
      categories: selectedCategories,
      minRating,
      priceRange,
    };
    console.log("[MapFiltersScreen] Filtros aplicados:", filters);
    // TODO: Pasar filtros al screen anterior
    navigation.goBack();
  };

  const handleResetFilters = () => {
    setDistance(5);
    setSelectedCategories([]);
    setMinRating(0);
    setPriceRange([0, 100000]);
  };

  return (
    <View style={styles.container}>
      {/* Header amarillo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="times" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filtros</Text>
        <TouchableOpacity onPress={handleResetFilters}>
          <Text style={styles.resetText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Distancia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distancia máxima</Text>
          <Text style={styles.sectionSubtitle}>
            Define hasta dónde buscar proveedores cerca de ti
          </Text>
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceValue}>{distance} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={distance}
              onValueChange={setDistance}
              minimumTrackTintColor="#F49A1A"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#F49A1A"
            />
            <View style={styles.distanceLabels}>
              <Text style={styles.distanceLabel}>1 km</Text>
              <Text style={styles.distanceLabel}>50 km</Text>
            </View>
          </View>
        </View>

        {/* Categorías */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <Text style={styles.sectionSubtitle}>
            {selectedCategories.length > 0
              ? `${selectedCategories.length} seleccionada${selectedCategories.length > 1 ? "s" : ""}`
              : "Selecciona una o más categorías"}
          </Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <FontAwesome
                    name={category.icon}
                    size={18}
                    color={isSelected ? "#0F172A" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Calificación mínima */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calificación mínima</Text>
          <Text style={styles.sectionSubtitle}>
            {minRating > 0
              ? `Mostrar servicios con ${minRating}+ estrellas`
              : "Sin filtro de calificación"}
          </Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  minRating >= rating && styles.ratingButtonSelected,
                ]}
                onPress={() => setMinRating(minRating === rating ? 0 : rating)}
              >
                <FontAwesome
                  name={minRating >= rating ? "star" : "star-o"}
                  size={20}
                  color={minRating >= rating ? "#F59E0B" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.ratingText,
                    minRating >= rating && styles.ratingTextSelected,
                  ]}
                >
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rango de precio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rango de precio</Text>
          <Text style={styles.sectionSubtitle}>
            Precio por servicio (CLP)
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              ${priceRange[0].toLocaleString("es-CL")} - $
              {priceRange[1].toLocaleString("es-CL")}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100000}
              step={5000}
              value={priceRange[0]}
              onValueChange={(value) => setPriceRange([value, priceRange[1]])}
              minimumTrackTintColor="#F49A1A"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#F49A1A"
            />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100000}
              step={5000}
              value={priceRange[1]}
              onValueChange={(value) => setPriceRange([priceRange[0], value])}
              minimumTrackTintColor="#F49A1A"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#F49A1A"
            />
          </View>
        </View>

        {/* Resumen de filtros */}
        {(selectedCategories.length > 0 || minRating > 0 || distance !== 5) && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Resumen de filtros</Text>
            <View style={styles.summaryList}>
              {distance !== 5 && (
                <View style={styles.summaryItem}>
                  <FontAwesome name="map-marker" size={14} color="#0F172A" />
                  <Text style={styles.summaryText}>Hasta {distance} km</Text>
                </View>
              )}
              {selectedCategories.length > 0 && (
                <View style={styles.summaryItem}>
                  <FontAwesome name="tag" size={14} color="#0F172A" />
                  <Text style={styles.summaryText}>
                    {selectedCategories.length} categoría
                    {selectedCategories.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {minRating > 0 && (
                <View style={styles.summaryItem}>
                  <FontAwesome name="star" size={14} color="#F59E0B" />
                  <Text style={styles.summaryText}>
                    Mínimo {minRating} estrellas
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Botón aplicar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyFilters}
        >
          <FontAwesome name="check" size={16} color="#fff" />
          <Text style={styles.applyButtonText}>Aplicar filtros</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ===== base ===== */
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 52 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#FFD100",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  content: {
    flex: 1,
  },

  /* ===== sections ===== */
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },

  /* ===== distance ===== */
  distanceContainer: {
    alignItems: "center",
  },
  distanceValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#F49A1A",
    marginBottom: 10,
  },
  slider: {
    width: "100%",
    height: 38,
  },
  distanceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  distanceLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },

  /* ===== categories ===== */
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8DA",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(244,155,26,0.15)",
  },
  categoryChipSelected: {
    backgroundColor: "#FFD100",
    borderColor: "#F49A1A",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryTextSelected: {
    color: "#0F172A",
  },

  /* ===== rating ===== */
  ratingContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  ratingButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#FFF8DA",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  ratingButtonSelected: {
    backgroundColor: "#FFE597",
    borderColor: "#F49A1A",
  },
  ratingText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  ratingTextSelected: {
    color: "#0F172A",
  },

  /* ===== price ===== */
  priceContainer: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  /* ===== summary ===== */
  summarySection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(244,155,26,0.25)",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 13,
    color: "#0F172A",
  },

  /* ===== footer ===== */
  footer: {
    padding: 16,
    backgroundColor: "#FFFDF4",
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.03)",
  },
  applyButton: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
