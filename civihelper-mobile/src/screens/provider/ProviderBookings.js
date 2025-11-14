// src/screens/provider/ProviderBookings.js
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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';

const ProviderBookings = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled

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
          clientName: 'Pedro Gómez',
          clientAvatar: 'https://via.placeholder.com/50',
          clientRating: 4.5,
          scheduledDate: '2025-10-25',
          scheduledTime: '14:30',
          status: 'pending', // pending, confirmed, completed, cancelled
          price: 50000,
          location: 'Av. Principal 123, Santiago',
          duration: '1-2 horas',
          clientPhone: '+56 9 1234 5678',
          description: 'Reparación de tubería en cocina',
        },
        {
          id: '2',
          serviceTitle: 'Limpieza General',
          clientName: 'Ana Martínez',
          clientAvatar: 'https://via.placeholder.com/50',
          clientRating: 4.8,
          scheduledDate: '2025-10-20',
          scheduledTime: '10:00',
          status: 'completed',
          price: 35000,
          location: 'Calle Secundaria 456',
          duration: '2-3 horas',
          clientPhone: '+56 9 9876 5432',
          description: 'Limpieza profunda del departamento',
        },
        {
          id: '3',
          serviceTitle: 'Clases de Inglés',
          clientName: 'Luis Chen',
          clientAvatar: 'https://via.placeholder.com/50',
          clientRating: 4.2,
          scheduledDate: '2025-10-28',
          scheduledTime: '18:00',
          status: 'confirmed',
          price: 25000,
          location: 'Online',
          duration: '1 hora',
          clientPhone: '+56 9 5555 6666',
          description: 'Clase de inglés básico',
        },
        {
          id: '4',
          serviceTitle: 'Reparación de Plomería',
          clientName: 'Rosa López',
          clientAvatar: 'https://via.placeholder.com/50',
          clientRating: 3.9,
          scheduledDate: '2025-10-22',
          scheduledTime: '09:00',
          status: 'cancelled',
          price: 50000,
          location: 'Av. Secundaria 789',
          duration: '1-2 horas',
          clientPhone: '+56 9 3333 4444',
          description: 'Reparación de ducha',
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
      pending: Colors.warning,
      confirmed: Colors.success,
      completed: Colors.primary,
      cancelled: Colors.error,
    };
    return statusMap[status] || Colors.text;
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labelMap[status] || status;
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      pending: 'clock',
      confirmed: 'check-circle',
      completed: 'check-circle-2',
      cancelled: 'x-circle',
    };
    return iconMap[status] || 'circle';
  };

  const handleConfirmBooking = (bookingId) => {
    Alert.alert('Confirmar reserva', '¿Deseas confirmar esta reserva?', [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => {
          // Llamar API para confirmar
          console.log('Reserva confirmada:', bookingId);
          Alert.alert('Éxito', 'Reserva confirmada correctamente');
        },
      },
    ]);
  };

  const handleCompleteBooking = (bookingId) => {
    Alert.alert('Marcar como completada', '¿Deseas marcar esta reserva como completada?', [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
      {
        text: 'Completar',
        onPress: () => {
          console.log('Reserva completada:', bookingId);
          Alert.alert('Éxito', 'Reserva marcada como completada');
        },
      },
    ]);
  };

  const handleCancelBooking = (bookingId) => {
    Alert.alert(
      'Cancelar reserva',
      '¿Estás seguro que deseas cancelar esta reserva?',
      [
        { text: 'No', onPress: () => {}, style: 'cancel' },
        {
          text: 'Sí, cancelar',
          onPress: () => {
            console.log('Reserva cancelada:', bookingId);
            Alert.alert('Cancelada', 'Reserva cancelada correctamente');
          },
          style: 'destructive',
        },
      ]
    );
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
        <View style={styles.headerLeft}>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.serviceTitle}
          </Text>
          <Text style={styles.scheduledDate}>{item.scheduledDate} • {item.scheduledTime}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Feather
            name={getStatusIcon(item.status)}
            size={12}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Cliente */}
      <View style={styles.clientInfo}>
        <Image
          source={{ uri: item.clientAvatar }}
          style={styles.clientAvatar}
        />
        <View style={styles.clientDetails}>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <View style={styles.ratingContainer}>
            <Feather name="star" size={12} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.ratingText}>{item.clientRating} rating</Text>
            <Text style={styles.separator}>•</Text>
            <Feather name="phone" size={12} color={Colors.sub} />
            <Text style={styles.phoneText}>{item.clientPhone}</Text>
          </View>
        </View>
      </View>

      {/* Información de la reserva */}
      <View style={styles.bookingDetails}>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={14} color={Colors.primary} />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="clock" size={14} color={Colors.primary} />
          <Text style={styles.detailText}>{item.duration}</Text>
        </View>
      </View>

      {/* Descripción */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>Descripción:</Text>
        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.description}
        </Text>
      </View>

      {/* Footer con precio y acciones */}
      <View style={styles.cardFooter}>
        <Text style={styles.price}>
          ${item.price.toLocaleString('es-CL')}
        </Text>
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnReject]}
                onPress={() => handleCancelBooking(item.id)}
              >
                <Feather name="x" size={16} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAccept]}
                onPress={() => handleConfirmBooking(item.id)}
              >
                <Feather name="check" size={16} color={Colors.success} />
              </TouchableOpacity>
            </>
          )}
          {item.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnComplete]}
              onPress={() => handleCompleteBooking(item.id)}
            >
              <Feather name="check-circle" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Completar</Text>
            </TouchableOpacity>
          )}
          {item.status === 'completed' && (
            <View style={styles.completedBadge}>
              <Feather name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.completedText}>Completada</Text>
            </View>
          )}
          {item.status === 'cancelled' && (
            <View style={styles.cancelledBadge}>
              <Feather name="x-circle" size={16} color={Colors.error} />
              <Text style={styles.cancelledText}>Cancelada</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color={Colors.sub} />
      <Text style={styles.emptyTitle}>Sin reservas</Text>
      <Text style={styles.emptyText}>
        {filter === 'all'
          ? 'No tienes reservas pendientes en este momento'
          : `No tienes reservas ${filter === 'pending' ? 'pendientes' : filter === 'confirmed' ? 'confirmadas' : filter === 'completed' ? 'completadas' : 'canceladas'}.`}
      </Text>
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
        <Text style={styles.headerTitle}>Mis Reservas</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
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
                : status === 'confirmed'
                ? 'Confirmadas'
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
    gap: spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  scheduledDate: {
    fontSize: 12,
    color: Colors.sub,
  },
  statusBadge: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.sub,
  },
  separator: {
    color: Colors.sub,
    marginHorizontal: 4,
  },
  phoneText: {
    fontSize: 11,
    color: Colors.sub,
  },
  bookingDetails: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 12,
    color: Colors.sub,
    flex: 1,
  },
  descriptionContainer: {
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.sub,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBtnReject: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  actionBtnAccept: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  actionBtnComplete: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: Colors.success + '10',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: Colors.error + '10',
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 300,
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
  },
});

export default ProviderBookings;