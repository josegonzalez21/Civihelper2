// src/screens/provider/ProviderServices.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';

const ProviderServices = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive, draft

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [])
  );

  const loadServices = async () => {
    try {
      setLoading(true);
      // Reemplaza con tu API real
      const mockServices = [
        {
          id: '1',
          title: 'Reparación de Plomería',
          category: 'mantenimiento',
          description: 'Reparación rápida y confiable de problemas de plomería residencial',
          image: 'https://via.placeholder.com/200',
          price: 50000,
          duration: '1-2 horas',
          status: 'active', // active, inactive, draft
          rating: 4.8,
          reviews: 24,
          bookings: 45,
          activeBookings: 3,
          views: 156,
          responseTime: '< 1 hora',
          cancellationRate: 2,
        },
        {
          id: '2',
          title: 'Limpieza General',
          category: 'limpieza',
          description: 'Limpieza profunda y desinfección completa de viviendas',
          image: 'https://via.placeholder.com/200',
          price: 35000,
          duration: '2-3 horas',
          status: 'active',
          rating: 4.9,
          reviews: 38,
          bookings: 67,
          activeBookings: 2,
          views: 234,
          responseTime: '< 30 min',
          cancellationRate: 1.2,
        },
        {
          id: '3',
          title: 'Instalación de Tuberías',
          category: 'mantenimiento',
          description: 'Instalación profesional de sistemas sanitarios completos',
          image: 'https://via.placeholder.com/200',
          price: 120000,
          duration: '4-6 horas',
          status: 'active',
          rating: 4.7,
          reviews: 15,
          bookings: 18,
          activeBookings: 1,
          views: 89,
          responseTime: '< 2 horas',
          cancellationRate: 0,
        },
        {
          id: '4',
          title: 'Clases de Inglés Online',
          category: 'educacion',
          description: 'Clases personalizadas de inglés para todos los niveles',
          image: 'https://via.placeholder.com/200',
          price: 25000,
          duration: '1 hora',
          status: 'inactive',
          rating: 4.6,
          reviews: 12,
          bookings: 28,
          activeBookings: 0,
          views: 142,
          responseTime: '< 1 hora',
          cancellationRate: 3.5,
        },
        {
          id: '5',
          title: 'Mantenimiento Preventivo',
          category: 'mantenimiento',
          description: 'Revisión y mantenimiento preventivo de sistemas',
          image: 'https://via.placeholder.com/200',
          price: 30000,
          duration: '1-1.5 horas',
          status: 'draft',
          rating: null,
          reviews: 0,
          bookings: 0,
          activeBookings: 0,
          views: 0,
          responseTime: '-',
          cancellationRate: 0,
        },
      ];
      setServices(mockServices);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices().then(() => setRefreshing(false));
  }, []);

  const handleToggleStatus = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activar' : 'Desactivar'} servicio`,
      `¿Deseas ${newStatus === 'active' ? 'activar' : 'desactivar'} este servicio?`,
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const updatedServices = services.map((s) =>
              s.id === serviceId ? { ...s, status: newStatus } : s
            );
            setServices(updatedServices);
            Alert.alert('Éxito', `Servicio ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
          },
        },
      ]
    );
  };

  const handleDeleteService = (serviceId) => {
    Alert.alert(
      'Eliminar servicio',
      '¿Estás seguro que deseas eliminar este servicio? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: () => {
            setServices(services.filter((s) => s.id !== serviceId));
            Alert.alert('Éxito', 'Servicio eliminado');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const filteredServices = services.filter((service) => {
    if (filterStatus === 'all') return true;
    return service.status === filterStatus;
  });

  const getStatusColor = (status) => {
    const statusMap = {
      active: Colors.success,
      inactive: Colors.warning,
      draft: Colors.sub,
    };
    return statusMap[status] || Colors.text;
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      active: 'Activo',
      inactive: 'Inactivo',
      draft: 'Borrador',
    };
    return labelMap[status] || status;
  };

  const renderServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceEdit', { serviceId: item.id })}
      activeOpacity={0.7}
    >
      {/* Imagen y Estado */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.cardContent}>
        {/* Título y descripción */}
        <Text style={styles.serviceTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Información del servicio */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Feather name="clock" size={12} color={Colors.primary} />
            <Text style={styles.infoText}>{item.duration}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Feather name="dollar-sign" size={12} color={Colors.primary} />
            <Text style={styles.infoText}>
              ${item.price.toLocaleString('es-CL')}
            </Text>
          </View>
        </View>

        {/* Estadísticas */}
        {item.status !== 'draft' && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Feather name="eye" size={13} color={Colors.sub} />
              <Text style={styles.statValue}>{item.views}</Text>
              <Text style={styles.statLabel}>Vistas</Text>
            </View>
            <View style={styles.statBox}>
              <Feather name="check-circle" size={13} color={Colors.sub} />
              <Text style={styles.statValue}>{item.bookings}</Text>
              <Text style={styles.statLabel}>Reservas</Text>
            </View>
            <View style={styles.statBox}>
              <Feather name="star" size={13} color={Colors.warning} fill={Colors.warning} />
              <Text style={styles.statValue}>
                {item.rating ? item.rating.toFixed(1) : '-'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statBox}>
              <Feather name="activity" size={13} color={Colors.sub} />
              <Text style={styles.statValue}>{item.activeBookings}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>
          </View>
        )}

        {/* Detalles adicionales */}
        {item.status !== 'draft' && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tiempo respuesta:</Text>
              <Text style={styles.detailValue}>{item.responseTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cancelaciones:</Text>
              <Text style={styles.detailValue}>{item.cancellationRate}%</Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnEdit]}
            onPress={() => navigation.navigate('ServiceEdit', { serviceId: item.id })}
          >
            <Feather name="edit-2" size={14} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              item.status === 'active'
                ? styles.actionBtnInactive
                : styles.actionBtnActive,
            ]}
            onPress={() => handleToggleStatus(item.id)}
          >
            <Feather
              name={item.status === 'active' ? 'power' : 'play-circle'}
              size={14}
              color={
                item.status === 'active' ? Colors.warning : Colors.success
              }
            />
            <Text
              style={[
                styles.actionBtnText,
                {
                  color:
                    item.status === 'active' ? Colors.warning : Colors.success,
                },
              ]}
            >
              {item.status === 'active' ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelete]}
            onPress={() => handleDeleteService(item.id)}
          >
            <Feather name="trash-2" size={14} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="briefcase" size={48} color={Colors.sub} />
      <Text style={styles.emptyTitle}>Sin servicios</Text>
      <Text style={styles.emptyText}>
        {filterStatus === 'all'
          ? 'No tienes servicios creados aún'
          : `No tienes servicios ${filterStatus === 'active' ? 'activos' : filterStatus === 'inactive' ? 'inactivos' : 'en borrador'}.`}
      </Text>
      <TouchableOpacity
        style={styles.createServiceBtn}
        onPress={() => navigation.navigate('ServiceCreate')}
      >
        <Feather name="plus" size={16} color={Colors.card} />
        <Text style={styles.createServiceBtnText}>Crear Servicio</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Servicios</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('ServiceCreate')}
        >
          <Feather name="plus" size={20} color={Colors.card} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'active', 'inactive', 'draft'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterBtn,
              filterStatus === status && styles.filterBtnActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filterStatus === status && styles.filterBtnTextActive,
              ]}
            >
              {status === 'all'
                ? 'Todos'
                : status === 'active'
                ? 'Activos'
                : status === 'inactive'
                ? 'Inactivos'
                : 'Borradores'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de servicios */}
      <FlatList
        data={filteredServices}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        scrollEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  filterContainer: {
    paddingBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sub,
  },
  filterBtnTextActive: {
    color: Colors.card,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  serviceCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: Colors.card,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing.lg,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 12,
    color: Colors.sub,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  infoDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.sub,
    marginTop: 2,
  },
  detailsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.sub,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtnEdit: {
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.primary + '10',
  },
  actionBtnActive: {
    borderColor: Colors.success + '50',
    backgroundColor: Colors.success + '10',
  },
  actionBtnInactive: {
    borderColor: Colors.warning + '50',
    backgroundColor: Colors.warning + '10',
  },
  actionBtnDelete: {
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '10',
    paddingHorizontal: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.sub,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: radius.lg,
  },
  createServiceBtnText: {
    color: Colors.card,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ProviderServices