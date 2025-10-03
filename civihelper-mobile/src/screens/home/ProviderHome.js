// src/screens/home/ProviderHome.js
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.actionIcon}>
        <Feather name={icon} size={20} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricCard({ icon, label, value, loading }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricLeft}>
        <View style={styles.metricIcon}>
          <Feather name={icon} size={18} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.metricValue}>{value}</Text>
      )}
    </View>
  );
}

export default function ProviderHome() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    ingresosHoy: 0,
    citasHoy: 0,
    serviciosActivos: 0,
    ratingPromedio: 0,
  });
  const [proximas, setProximas] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Ajusta estos endpoints a los que tengas disponibles en tu backend
        // Si no existen aún, el try/catch evita romper la pantalla y deja placeholders.
        const [mRes, aRes] = await Promise.allSettled([
          api.get?.("/provider/metrics"),
          api.get?.("/provider/agenda?limit=5"),
        ]);

        if (isMounted) {
          if (mRes.status === "fulfilled" && mRes.value?.data) {
            const d = mRes.value.data;
            setMetrics({
              ingresosHoy: d.ingresosHoy ?? 0,
              citasHoy: d.citasHoy ?? 0,
              serviciosActivos: d.serviciosActivos ?? 0,
              ratingPromedio: d.ratingPromedio ?? 0,
            });
          }
          if (aRes.status === "fulfilled" && aRes.value?.data) {
            setProximas(Array.isArray(aRes.value.data) ? aRes.value.data : []);
          }
        }
      } catch (_e) {
        // noop: placeholders se mantienen
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </Text>
          <Text style={styles.subtitle}>Este es tu resumen como proveedor</Text>
        </View>

        {/* Métricas principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas de hoy</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="dollar-sign"
              label="Ingresos"
              value={`$${Number(metrics.ingresosHoy).toLocaleString("es-CL")}`}
              loading={loading}
            />
            <MetricCard
              icon="calendar"
              label="Citas"
              value={metrics.citasHoy}
              loading={loading}
            />
            <MetricCard
              icon="tool"
              label="Servicios activos"
              value={metrics.serviciosActivos}
              loading={loading}
            />
            <MetricCard
              icon="star"
              label="Rating"
              value={Number(metrics.ratingPromedio).toFixed(1)}
              loading={loading}
            />
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={styles.grid}>
            <QuickAction
              icon="tool"
              label="Mis servicios"
              onPress={() => navigation.navigate("MyServices")}
            />
            <QuickAction
              icon="plus-circle"
              label="Crear servicio"
              onPress={() => navigation.navigate("ServiceCreate")}
            />
            <QuickAction
              icon="bar-chart-2"
              label="Métricas"
              onPress={() => navigation.navigate("ProviderStats")}
            />
            <QuickAction
              icon="settings"
              label="Ajustes"
              onPress={() => navigation.navigate("Settings")}
            />
          </View>
        </View>

        {/* Próximas citas (placeholder si no hay endpoint) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximas citas</Text>

          {loading ? (
            <View style={styles.card}>
              <ActivityIndicator />
              <Text style={[styles.cardDesc, { marginLeft: 12 }]}>
                Cargando agenda…
              </Text>
            </View>
          ) : proximas?.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={proximas}
              keyExtractor={(item, idx) => `${item.id ?? "appt"}-${idx}`}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentIconWrap}>
                    <Feather name="clock" size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appointmentTitle}>
                      {item?.servicioNombre ?? "Servicio"}
                    </Text>
                    <Text style={styles.appointmentMeta}>
                      {item?.fechaTexto ?? item?.fecha ?? "Fecha por confirmar"}
                    </Text>
                    <Text style={styles.appointmentMeta}>
                      Cliente: {item?.clienteNombre ?? "—"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} />
                </View>
              )}
            />
          ) : (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("ProviderStats")}
            >
              <View style={styles.cardIconWrap}>
                <Feather name="calendar" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Sin citas próximas</Text>
                <Text style={styles.cardDesc}>
                  Revisa tu agenda y disponibilidad.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const RADIUS = 16;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metric: {
    flexBasis: "47.5%",
    backgroundColor: "#f7f7f9",
    borderRadius: RADIUS,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#eceef2",
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  action: {
    width: "47.5%",
    backgroundColor: "#f7f7f9",
    borderRadius: RADIUS,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eceef2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f7f7f9",
    borderRadius: RADIUS,
    padding: 14,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eceef2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  appointmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f7f7f9",
    borderRadius: RADIUS,
    padding: 14,
  },
  appointmentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eceef2",
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  appointmentMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
