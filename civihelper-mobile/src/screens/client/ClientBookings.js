// src/screens/client/ClientBookings.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
// dejo el import original por si lo usas en otras pantallas
import Colors, { spacing, radius, shadows } from '../../theme/color';

const ClientBookings = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed, cancelled

  // Cargar reservas al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const loadBookings = async () => {
    try {
      setLoading(true);
      // Reemplaza con tu API real
      const mockData = [
        {
          id: '1',
          serviceTitle: 'Reparación de Plomería',
          providerName: 'Juan García',
          providerImage: 'https://via.placeholder.com/50',
          scheduledDate: '2025-10-25',
          scheduledTime: '14:30',
          status: 'pending', // pending, completed, cancelled
          price: 50000,
          location: 'Av. Principal 123, Santiago',
          rating: null,
        },
        {
          id: '2',
          serviceTitle: 'Limpieza General',
          providerName: 'María López',
          providerImage: 'https://via.placeholder.com/50',
          scheduledDate: '2025-10-20',
          scheduledTime: '10:00',
          status: 'completed',
          price: 35000,
          location: 'Calle Secundaria 456',
          rating: 4.5,
        },
        {
          id: '3',
          serviceTitle: 'Clases de Inglés',
          providerName: 'Carlos Pérez',
          providerImage: 'https://via.placeholder.com/50',
          scheduledDate: '2025-10-22',
          scheduledTime: '18:00',
          status: 'cancelled',
          price: 25000,
          location: 'Online',
          rating: null,
        },
      ];
      setBookings(mockData);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings().then(() => setRefreshing(false));
  }, []);

  const getStatusColor = (status) => {
    const statusMap = {
      pending: '#B45309',     // dorado tostado
      completed: '#0F766E',   // verde
      cancelled: '#DC2626',   // rojo
    };
    return statusMap[status] || '#0F172A';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      pending: 'Pendiente',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labelMap[status] || status;
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      pending: 'clock',
      completed: 'check-circle',
      cancelled: 'x-circle',
    };
    return iconMap[status] || 'circle';
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      activeOpacity={0.7}
    >
      {/* Header con estado */}
      <View style={styles.cardHeader}>
        <Text style={styles.serviceTitle} numberOfLines={1}>
          {item.serviceTitle}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '1A' },
          ]}
        >
          <Feather
            name={getStatusIcon(item.status)}
            size={12}
            color={getStatusColor(item.status)}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Proveedor */}
      <View style={styles.providerInfo}>
        <View style={styles.providerAvatar}>
          <Feather name="user" size={20} color="#B45309" />
        </View>
        <View style={styles.providerDetails}>
          <Text style={styles.providerName}>{item.providerName}</Text>
          <Text style={styles.location} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>

      {/* Fecha y hora */}
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeItem}>
          <Feather name="calendar" size={14} color="#94A3B8" />
          <Text style={styles.dateTimeText}>{item.scheduledDate}</Text>
        </View>
        <View style={styles.dateTimeItem}>
          <Feather name="clock" size={14} color="#94A3B8" />
          <Text style={styles.dateTimeText}>{item.scheduledTime}</Text>
        </View>
      </View>

      {/* Footer con precio y acciones */}
      <View style={styles.cardFooter}>
        <Text style={styles.price}>
          ${item.price.toLocaleString('es-CL')}
        </Text>
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCancel]}>
                <Feather name="x" size={16} color="#DC2626" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]}>
                <Feather name="check" size={16} color="#0F766E" />
              </TouchableOpacity>
            </>
          )}
          {item.status === 'completed' && item.rating === null && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => navigation.navigate('ReviewCreate', { bookingId: item.id })}
            >
              <Feather name="star" size={16} color="#0F172A" />
            </TouchableOpacity>
          )}
          {item.status === 'completed' && item.rating !== null && (
            <View style={styles.ratingContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Feather
                    key={i}
                    name="star"
                    size={14}
                    color={i < Math.floor(item.rating) ? '#F97316' : '#CBD5F5'}
                />
              ))}
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color="#94A3B8" />
      <Text style={styles.emptyTitle}>Sin reservas</Text>
      <Text style={styles.emptyText}>
        {filter === 'all'
          ? 'Aún no tienes reservas. ¡Comienza explorando servicios!'
          : `No tienes reservas ${
              filter === 'pending'
                ? 'pendientes'
                : filter === 'completed'
                ? 'completadas'
                : 'canceladas'
            }.`}
      </Text>
      {filter !== 'all' && (
        <TouchableOpacity
          style={styles.filterResetBtn}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.filterResetText}>Ver todas las reservas</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/Logo3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Mis Reservas</Text>
            <Text style={styles.headerSubtitle}>Historial y estados</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
        >
          <Feather name="x" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'completed', 'cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterBtn,
              filter === status && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === status && styles.filterBtnTextActive,
              ]}
            >
              {status === 'all'
                ? 'Todas'
                : status === 'pending'
                ? 'Pendientes'
                : status === 'completed'
                ? 'Completadas'
                : 'Canceladas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de reservas */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F172A"
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
    backgroundColor: '#FFFDF4',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    backgroundColor: '#FFD100',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#475569',
  },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.12)',
  },
  filterBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 0, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#FFE875',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.16)',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBtnCancel: {
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220,38,38,0.09)',
  },
  actionBtnSuccess: {
    borderColor: '#0F766E',
    backgroundColor: 'rgba(15,118,110,0.08)',
  },
  actionBtnPrimary: {
    borderColor: '#FFD100',
    backgroundColor: '#FFF7C2',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  filterResetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  filterResetText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ClientBookings;
