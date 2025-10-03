// src/screens/home/ClientHome.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import Colors, { spacing, radius, shadows } from "../../theme/color";

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={[s.card, s.action]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={s.actionIcon}>
        <Feather name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ClientHome() {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        {/* Top bar: solo botón de perfil a la derecha */}
        <View style={s.topBar}>
          <View style={{ width: 38, height: 38 }} />
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={s.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Ir a mi perfil"
          >
            <Feather name="user" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Encabezado (sin “Inicio”) */}
        <View style={s.header}>
          <Text style={s.hello}>
            Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </Text>
          <Text style={s.subtitle}>¿Qué servicio necesitas hoy?</Text>
        </View>

        {/* Buscador “falso” que lleva a Search */}
        <TouchableOpacity
          style={s.search}
          onPress={() => navigation.navigate("Search")}
          activeOpacity={0.95}
          accessibilityLabel="Buscar categorías, servicios o proveedores"
        >
          <Feather name="search" size={18} color={Colors.primary300} />
          <Text style={s.searchText}>
            Buscar categorías, servicios o proveedores…
          </Text>
        </TouchableOpacity>

        {/* Acciones rápidas */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Accesos rápidos</Text>
          <View style={s.grid}>
            <QuickAction
              icon="compass"
              label="Explorar"
              onPress={() => navigation.navigate("Search")}
            />
            <QuickAction
              icon="heart"
              label="Favoritos"
              onPress={() => navigation.navigate("Favorites")}
            />
            <QuickAction
              icon="star"
              label="Mis reseñas"
              onPress={() => navigation.navigate("MyReviews")}
            />
            <QuickAction
              icon="settings"
              label="Ajustes"
              onPress={() => navigation.navigate("Settings")}
            />
          </View>
        </View>

        {/* Sugerencias */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sugerencias</Text>

          <TouchableOpacity
            style={[s.card, s.cardRow]}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.9}
          >
            <View style={s.cardIconWrap}>
              <Feather name="zap" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Servicios populares</Text>
              <Text style={s.cardDesc}>Descubre lo más solicitado esta semana.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.sub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.card, s.cardRow]}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.9}
          >
            <View style={s.cardIconWrap}>
              <Feather name="map-pin" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Cerca de ti</Text>
              <Text style={s.cardDesc}>Encuentra proveedores en tu zona.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.sub} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },

  // Top bar con solo el icono de perfil
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,     // borde sutil
    backgroundColor: Colors.card,   // glass
    alignItems: "center",
    justifyContent: "center",
    ...shadows.xs,
  },

  header: { marginBottom: spacing.md },
  hello: { fontSize: 22, fontWeight: "800", color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors.sub },

  // Search como "input" oscuro
  search: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.inputBg,       // rgba(10,10,25,0.85)
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderInput,       // rgba(255,255,255,0.08)
  },
  searchText: { color: Colors.placeholder, fontSize: 14, flex: 1 },

  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: spacing.sm },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },

  // Tarjeta base tipo "glass"
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.xs,
  },

  // QuickAction
  action: { width: "47.5%", paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.12),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionLabel: { fontSize: 14, fontWeight: "800", color: Colors.text },

  // Cards de sugerencia
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: spacing.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.12),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  cardDesc: { fontSize: 12, color: Colors.sub, marginTop: 2 },
});
