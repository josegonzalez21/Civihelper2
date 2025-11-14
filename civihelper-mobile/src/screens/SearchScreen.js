// src/screens/SearchScreen.js
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_URL, getAuthToken } from "../services/api";
import ServiceCard from "../components/common/ServiceCard";
import EmptyState from "../components/common/EmptyState";
import AppLogo from "../components/common/AppLogo";
import useDebounce from "../components/hooks/useDebounce";

// Paleta Páginas Amarillas
const Colors = {
  primary: "#FFD100",
  primaryDark: "#F5C400",
  primaryLight: "#FFF8CC",
  purple: "#7C3AED",
  success: "#10B981",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E5E7EB",
  card: "#FFFFFF",
  bg: "#FAFAFA",
};

const makeShadow = () =>
  Platform.OS === "android"
    ? { elevation: 2 }
    : { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } };

const RECENT_SEARCHES_KEY = "@civihelper:recent_searches";

export default function SearchScreen() {
  const navigation = useNavigation();
  const searchInputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    // Cargar búsquedas recientes (podrías usar AsyncStorage)
    // Por ahora solo un placeholder
    setRecentSearches([]);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery) => {
    try {
      setLoading(true);
      const token = getAuthToken?.();

      const params = new URLSearchParams({
        search: searchQuery,
        page: "1",
        pageSize: "20",
      });

      const res = await fetch(`${API_URL}/services?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.items || [];
      setResults(list);
    } catch (err) {
      console.error("Error en búsqueda:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("Home");
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    searchInputRef.current?.focus();
  };

  const handleRecentSearch = (text) => {
    setQuery(text);
    performSearch(text);
  };

  const renderRecentSearches = () => {
    if (query.trim() || results.length > 0) return null;

    return (
      <View style={styles.recentContainer}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Búsquedas recientes</Text>
          {recentSearches.length > 0 && (
            <TouchableOpacity onPress={() => setRecentSearches([])}>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentSearches.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Feather name="search" size={40} color={Colors.border} />
            <Text style={styles.emptyRecentText}>
              Busca servicios por nombre, categoría o ciudad
            </Text>
          </View>
        ) : (
          recentSearches.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.recentItem}
              onPress={() => handleRecentSearch(item)}
            >
              <Feather name="clock" size={16} color={Colors.subtext} />
              <Text style={styles.recentItemText}>{item}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderResults = () => {
    if (!query.trim()) return null;

    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <EmptyState
          title="Sin resultados"
          subtitle={`No encontramos servicios para "${query}"`}
          style={{ paddingHorizontal: 16, marginTop: 40 }}
        />
      );
    }

    return (
      <FlatList
        data={results}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <ServiceCard
            item={item}
            onPress={(s) => navigation.navigate("ServiceDetail", { id: s.id })}
          />
        )}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header con gradiente amarillo */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <AppLogo
            source={require("../assets/Logo3.png")}
            size={32}
            rounded
          />

          <View style={{ width: 36 }} />
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.subtext} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Buscar servicios..."
            placeholderTextColor={Colors.subtext}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Feather name="x-circle" size={18} color={Colors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {query.trim() && (
          <Text style={styles.resultCount}>
            {loading
              ? "Buscando..."
              : `${results.length} resultado${results.length !== 1 ? "s" : ""}`}
          </Text>
        )}
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {renderRecentSearches()}
        {renderResults()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 10, default: 10 }),
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...makeShadow(),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    ...makeShadow(),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  resultCount: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.text,
    opacity: 0.7,
    fontWeight: "600",
  },
  recentContainer: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  emptyRecent: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyRecentText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.subtext,
    textAlign: "center",
    maxWidth: 250,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.subtext,
  },
});