// src/screens/home/AdminHome.js
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import RoleGuard from "../../components/RoleGuard";
import Colors, { spacing, radius, shadows } from "../../theme/color";
import {
  adminListServices,
  adminListServiceTypes,
  categoriesTree,
} from "../../services/api";

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

function MetricCard({ icon, label, value, loading }) {
  return (
    <View style={[s.card, s.metric]}>
      <View style={s.metricLeft}>
        <View style={s.metricIcon}>
          <Feather name={icon} size={16} color={Colors.primary} />
        </View>
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary300} />
      ) : (
        <Text style={s.metricValue}>{value}</Text>
      )}
    </View>
  );
}

export default function AdminHome() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    curatedServices: 0,
    serviceTypes: 0,
    rootAreas: 0,
    totalCategories: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [svcRes, typesRes, treeRes] = await Promise.allSettled([
          adminListServices(),       // GET /admin/services
          adminListServiceTypes(),   // GET /admin/service-types
          categoriesTree(),          // GET /categories/tree
        ]);

        const curatedServices =
          svcRes.status === "fulfilled" && Array.isArray(svcRes.value)
            ? svcRes.value.length
            : 0;

        const serviceTypes =
          typesRes.status === "fulfilled" && Array.isArray(typesRes.value)
            ? typesRes.value.length
            : 0;

        let rootAreas = 0;
        let totalCategories = 0;
        if (treeRes.status === "fulfilled" && Array.isArray(treeRes.value)) {
          const tree = treeRes.value;
          rootAreas = tree.length;
          totalCategories = tree.reduce((acc, node) => {
            const children = Array.isArray(node.children) ? node.children.length : 0;
            return acc + 1 + children; // root + hijos directos
          }, 0);
        }

        if (alive) {
          setMetrics({ curatedServices, serviceTypes, rootAreas, totalCategories });
        }
      } catch {
        if (alive) {
          setMetrics({ curatedServices: 0, serviceTypes: 0, rootAreas: 0, totalCategories: 0 });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <RoleGuard allow={["ADMIN"]}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.container}>
          {/* Header con gradiente violeta */}
          <LinearGradient
            colors={Colors.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <Text style={s.title}>Panel de administración</Text>
            <Text style={s.subtitle}>Resumen general y acciones rápidas</Text>
          </LinearGradient>

          {/* Métricas */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Métricas</Text>
            <View style={s.metricsGrid}>
              <MetricCard
                icon="grid"
                label="Servicios curados"
                value={metrics.curatedServices}
                loading={loading}
              />
              <MetricCard
                icon="layers"
                label="Tipos de servicio"
                value={metrics.serviceTypes}
                loading={loading}
              />
              <MetricCard
                icon="folder"
                label="Áreas (root)"
                value={metrics.rootAreas}
                loading={loading}
              />
              <MetricCard
                icon="list"
                label="Categorías totales"
                value={metrics.totalCategories}
                loading={loading}
              />
            </View>
          </View>

          {/* Accesos rápidos */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Accesos rápidos</Text>
            <View style={s.grid}>
              <QuickAction
                icon="users"
                label="Usuarios"
                onPress={() => navigation.navigate("AdminUsers")}
              />
              <QuickAction
                icon="grid"
                label="Categorías"
                onPress={() => navigation.navigate("AdminCategories")}
              />
              <QuickAction
                icon="briefcase"
                label="Servicios"
                onPress={() => navigation.navigate("AdminServices")}
              />
              <QuickAction
                icon="shield"
                label="Moderación"
                onPress={() => navigation.navigate("AdminModeration")}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Header con gradiente (usar Colors.gradients.hero)
  header: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.withOpacity(Colors.text, 0.06), // borde muy sutil sobre gradiente
    ...shadows.sm,
  },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 13, color: Colors.sub },

  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: spacing.sm,
  },

  // Card base “glass” (surface/glass + border/subtle)
  card: {
    backgroundColor: Colors.card,      // rgba(255,255,255,0.05)
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,        // rgba(255,255,255,0.10)
    ...shadows.xs,
  },

  // Métricas
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metric: {
    flexBasis: "47.5%",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.withOpacity(Colors.primary, 0.12), // tinte violeta
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: { fontSize: 13, color: Colors.sub, fontWeight: "700" },
  metricValue: { fontSize: 18, fontWeight: "800", color: Colors.text },

  // Acciones rápidas
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  action: {
    width: "47.5%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
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
});
