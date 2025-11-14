// src/screens/client/ClientServices.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';

const ClientServices = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [savedServices, setSavedServices] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [])
  );

  const loadServices = async () => {
    try {
      setLoading(true);
      const mockServices = [
        {
          id: '1',
          title: 'Reparación de Plomería',
          category: 'mantenimiento',
          provider: {
            id: 'p1',
            name: 'Juan García',
            avatar: 'https://via.placeholder.com/48',
            rating: 4.8,
            reviews: 24,
          },
          price: 50000,
          description: 'Reparación rápida y confiable de problemas de plomería',
          image: 'https://via.placeholder.com/200',
          rating: 4.8,
          reviews: 24,
          duration: '1-2 horas',
        },
        {
          id: '2',
          title: 'Limpieza Profunda',
          category: 'limpieza',
          provider: {
            id: 'p2',
            name: 'María López',
            avatar: 'https://via.placeholder.com/48',
            rating: 4.9,
            reviews: 38,
          },
          price: 35000,
          description: 'Limpieza profunda y desinfección de tu hogar',
          image: 'https://via.placeholder.com/200',
          rating: 4.9,
          reviews: 38,
          duration: '2-3 horas',
        },
        {
          id: '3',
          title: 'Clases de Inglés Online',
          category: 'educacion',
          provider: {
            id: 'p3',
            name: 'Carlos Pérez',
            avatar: 'https://via.placeholder.com/48',
            rating: 4.7,
            reviews: 15,
          },
          price: 25000,
          description: 'Clases personalizadas de inglés para todos los niveles',
          image: 'https://via.placeholder.com/200',
          rating: 4.7,
          reviews: 15,
          duration: '1 hora',
        },
        {
          id: '4',
          title: 'Reparación Eléctrica',
          category: 'mantenimiento',
          provider: {
            id: 'p4',
            name: 'Roberto Silva',
            avatar: 'https://via.placeholder.com/48',
            rating: 4.6,
            reviews: 19,
          },
          price: 45000,
          description: 'Soluciones eléctricas seguras y eficientes',
          image: 'https://via.placeholder.com/200',
          rating: 4.6,
          reviews: 19,
          duration: '1-2 horas',
        },
        {
          id: '5',
          title: 'Diseño Gráfico',
          category: 'diseño',
          provider: {
            id: 'p5',
            name: 'Ana Martínez',
            avatar: 'https://via.placeholder.com/48',
            rating: 4.9,
            reviews: 32,
          },
          price: 55000,
          description: 'Diseños creativos y modernos para tu marca',
          image: 'https://via.placeholder.com/200',
          rating: 4.9,
          reviews: 32,
          duration: 'Variable',
        },
      ];
      setServices(mockServices);
      setSavedServices([]);
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

  const handleSaveService = (serviceId) => {
    setSavedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const categories = [
    { id: 'all', label: 'Todos', icon: 'grid' },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
    { id: 'limpieza', label: 'Limpieza', icon: 'droplet' },
    { id: 'educacion', label: 'Educación', icon: 'book' },
    { id: 'diseño', label: 'Diseño', icon: 'palette' },
  ];

  const filteredAndSortedServices = services
    .filter((service) => {
      const matchesCategory =
        filterCategory === 'all' || service.category === filterCategory;
      const matchesSearch =
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.provider.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return 0;
      }
    });

  const renderServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
      activeOpacity={0.7}
    >
      {/* Imagen del servicio */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <TouchableOpacity
          style={[
            styles.saveBtn,
            savedServices.includes(item.id) && styles.saveBtnActive,
          ]}
          onPress={() => handleSaveService(item.id)}
        >
          <Feather
            name="heart"
            size={18}
            color={savedServices.includes(item.id) ? Colors.error : Colors.card}
            fill={savedServices.includes(item.id) ? Colors.error : 'transparent'}
          />
        </TouchableOpacity>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
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

        {/* Información del proveedor */}
        <View style={styles.providerInfo}>
          <View style={styles.providerAvatar}>
            {item.provider.avatar ? (
              <Image source={{ uri: item.provider.avatar }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={16} color={Colors.primary} />
            )}
          </View>
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>{item.provider.name}</Text>
            <View style={styles.ratingContainer}>
              <Feather
                name="star"
                size={12}
                color={Colors.warning}
                fill={Colors.warning}
              />
              <Text style={styles.ratingText}>
                {item.provider.rating} ({item.provider.reviews})
              </Text>
            </View>
          </View>
        </View>

        {/* Duración y Precio */}
        <View style={styles.footerInfo}>
          <View style={styles.durationBadge}>
            <Feather name="clock" size={12} color={Colors.primary} />
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
          <Text style={styles.price}>${item.price.toLocaleString('es-CL')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.categoryBtn,
            filterCategory === cat.id && styles.categoryBtnActive,
          ]}
          onPress={() => setFilterCategory(cat.id)}
        >
          <Feather
            name={cat.icon}
            size={16}
            color={filterCategory === cat.id ? Colors.card : Colors.sub}
          />
          <Text
            style={[
              styles.categoryBtnText,
              filterCategory === cat.id && styles.categoryBtnTextActive,
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSortMenu = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Ordenar por:</Text>
      <View style={styles.sortOptions}>
        {[
          { value: 'recent', label: 'Reciente' },
          { value: 'price-asc', label: 'Menor precio' },
          { value: 'price-desc', label: 'Mayor precio' },
          { value: 'rating', label: 'Mejor calificado' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.sortBtn, sortBy === option.value && styles.sortBtnActive]}
            onPress={() => setSortBy(option.value)}
          >
            <Text
              style={[
                styles.sortBtnText,
                sortBy === option.value && styles.sortBtnTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color={Colors.sub} />
      <Text style={styles.emptyTitle}>Sin resultados</Text>
      <Text style={styles.emptyText}>
        No encontramos servicios que coincidan con tu búsqueda
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
        <Text style={styles.headerTitle}>Servicios Disponibles</Text>
      </View>

      {/* Categorías */}
      {renderCategoryFilter()}

      {/* Ordenar */}
      {renderSortMenu()}

      {/* Lista de servicios */}
      <FlatList
        data={filteredAndSortedServices}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        numColumns={1}
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
  categoriesContainer: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sub,
  },
  categoryBtnTextActive: {
    color: Colors.card,
  },
  sortContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sub,
    marginBottom: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.sub,
  },
  sortBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  saveBtnActive: {
    backgroundColor: Colors.error + '20',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.card,
    textTransform: 'capitalize',
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
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 12,
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
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: Colors.primary + '15',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primary,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
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

export default ClientServices;