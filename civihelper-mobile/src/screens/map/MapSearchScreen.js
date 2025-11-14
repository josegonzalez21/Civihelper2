// src/screens/map/MapSearchScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function MapSearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { query: initialQuery = "", region } = route.params || {};

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([
    "Plomería",
    "Electricista",
    "Limpieza profunda",
  ]);
  const [popularSearches] = useState([
    { id: "1", term: "Plomería de emergencia", icon: "wrench" },
    { id: "2", term: "Electricista certificado", icon: "bolt" },
    { id: "3", term: "Limpieza del hogar", icon: "home" },
    { id: "4", term: "Jardinería", icon: "leaf" },
    { id: "5", term: "Carpintería", icon: "cut" },
    { id: "6", term: "Pintura", icon: "paint-brush" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (query) => {
    if (!query.trim()) return;

    if (!recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
    }

    setLoading(true);
    try {
      console.log("[MapSearchScreen] Buscando:", query, "en región:", region);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockResults = [
        {
          id: "1",
          title: "Plomería Express",
          category: "Plomería",
          distance: 0.5,
          rating: 4.8,
          reviews: 124,
          price: 15000,
          available: true,
        },
        {
          id: "2",
          title: "Electricista Profesional",
          category: "Electricidad",
          distance: 1.2,
          rating: 4.9,
          reviews: 89,
          price: 20000,
          available: true,
        },
        {
          id: "3",
          title: "Plomería 24/7",
          category: "Plomería",
          distance: 1.8,
          rating: 4.7,
          reviews: 65,
          price: 18000,
          available: true,
        },
      ];

      const filtered = mockResults.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      );

      setResults(filtered);
    } catch (error) {
      console.error("[MapSearchScreen] Error buscando:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (term) => {
    setSearchQuery(term);
    handleSearch(term);
  };

  const removeRecentSearch = (term) => {
    setRecentSearches((prev) => prev.filter((item) => item !== term));
  };

  const renderResult = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate("ServiceDetail", { serviceId: item.id })}
    >
      <View style={styles.resultIcon}>
        <FontAwesome name="briefcase" size={20} color="#B45309" />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultCategory}>{item.category}</Text>
        <View style={styles.resultMeta}>
          <View style={styles.metaItem}>
            <FontAwesome name="map-marker" size={12} color="#94A3B8" />
            <Text style={styles.resultDistance}>{item.distance} km</Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text style={styles.resultRating}>
              {item.rating} ({item.reviews})
            </Text>
          </View>
          <Text style={styles.resultPrice}>
            ${item.price.toLocaleString("es-CL")}
          </Text>
        </View>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const renderRecentSearches = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Búsquedas recientes</Text>
      {recentSearches.map((term, index) => (
        <View key={index} style={styles.recentItem}>
          <TouchableOpacity
            style={styles.recentItemButton}
            onPress={() => handleSuggestionPress(term)}
          >
            <FontAwesome name="clock-o" size={16} color="#94A3B8" />
            <Text style={styles.recentText}>{term}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeRecentSearch(term)}
          >
            <FontAwesome name="times" size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderPopularSearches = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Búsquedas populares</Text>
      <View style={styles.popularGrid}>
        {popularSearches.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.popularChip}
            onPress={() => handleSuggestionPress(item.term)}
          >
            <FontAwesome name={item.icon} size={14} color="#B45309" />
            <Text style={styles.popularText}>{item.term}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Búsqueda</Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <FontAwesome
          name="search"
          size={16}
          color="#94A3B8"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar servicios..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch(searchQuery)}
          returnKeyType="search"
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <FontAwesome name="times-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B45309" />
          <Text style={styles.loadingText}>Buscando servicios...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.results}
          ListHeaderComponent={() => (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {results.length} resultado
                {results.length !== 1 ? "s" : ""} encontrado
                {results.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {searchQuery ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="search" size={58} color="#CBD5E1" />
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
              <Text style={styles.emptySubtext}>
                Intenta con otros términos de búsqueda
              </Text>
            </View>
          ) : (
            <>
              {recentSearches.length > 0 && renderRecentSearches()}
              {renderPopularSearches()}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* ===== Layout base ===== */
  container: {
    flex: 1,
    backgroundColor: "#FFFDF4", // fondo claro tipo guía
  },

  /* ===== Header ===== */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
    backgroundColor: "#FFD100",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.04)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  /* ===== Search bar ===== */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    marginHorizontal: 16,
    marginVertical: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },

  /* ===== Content ===== */
  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  /* ===== Recent searches ===== */
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.03)",
  },
  recentItemButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentText: {
    fontSize: 14,
    color: "#0F172A",
  },
  removeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ===== Popular searches ===== */
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  popularChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(180,83,9,0.16)",
  },
  popularText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* ===== Results ===== */
  results: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resultsHeader: {
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  resultIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF3D6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  resultCategory: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultDistance: {
    fontSize: 11,
    color: "#64748B",
  },
  resultRating: {
    fontSize: 11,
    color: "#64748B",
  },
  resultPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },

  /* ===== Loading / Empty ===== */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});
