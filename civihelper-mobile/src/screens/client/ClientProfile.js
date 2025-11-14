// src/screens/client/ClientProfile.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';
import { useAuth } from '../../context/AuthContext';

// Helper para formatear fecha
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-CL', options);
};

export default function ClientProfile({ navigation }) {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingField, setEditingField] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // Reemplaza con tu API real
      const mockData = {
        id: user?.id || '1',
        name: user?.name || 'Juan Pérez',
        email: user?.email || 'juan.perez@example.com',
        phone: '+56 9 1234 5678',
        address: 'Av. Principal 123, Santiago, Chile',
        joinDate: '2024-01-15',
        avatar: 'https://via.placeholder.com/120',
        stats: {
          completedBookings: 12,
          totalSpent: 450000,
          averageRating: 4.8,
          reviews: 8,
        },
        preferences: {
          notifications: true,
          newsletter: false,
          darkMode: true,
        },
      };
      setProfileData(mockData);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData().then(() => setRefreshing(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
      {
        text: 'Cerrar sesión',
        onPress: () => {
          logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
        style: 'destructive',
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: () => {
            // Llamar a API para eliminar cuenta
            console.log('Cuenta eliminada');
            logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F172A"
        />
      }
    >
      {/* Header amarillo con logo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/Logo3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <Text style={styles.headerSubtitle}>Datos de tu cuenta</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
        >
          <Feather name="x" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Header del Perfil */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profileData.avatar ? (
            <Image
              source={{ uri: profileData.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Feather name="user" size={48} color="#B45309" />
            </View>
          )}
          <TouchableOpacity
            style={styles.editAvatarBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Feather name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{profileData.name}</Text>
        <Text style={styles.userEmail}>{profileData.email}</Text>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Feather name="edit-2" size={14} color="#0F172A" />
          <Text style={styles.editProfileBtnText}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profileData.stats.completedBookings}</Text>
          <Text style={styles.statLabel}>Reservas</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <Text style={styles.statNumber}>
            ${(profileData.stats.totalSpent / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statLabel}>Gastado</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.ratingBadge}>
            <Feather name="star" size={14} color="#F97316" />
            <Text style={styles.statNumber}>{profileData.stats.averageRating}</Text>
          </View>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Información Personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Feather name="phone" size={16} color="#B45309" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{profileData.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Feather name="map-pin" size={16} color="#B45309" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {profileData.address}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Feather name="calendar" size={16} color="#B45309" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Miembro desde</Text>
              <Text style={styles.infoValue}>{formatDate(profileData.joinDate)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        
        <View style={styles.preferencesCard}>
          <View style={styles.preferenceItem}>
            <View>
              <Text style={styles.preferenceName}>Notificaciones</Text>
              <Text style={styles.preferenceDesc}>Recibe alertas de reservas</Text>
            </View>
            <TouchableOpacity style={styles.toggle}>
              <View
                style={[
                  styles.toggleThumb,
                  profileData.preferences.notifications && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.preferenceItem}>
            <View>
              <Text style={styles.preferenceName}>Boletín</Text>
              <Text style={styles.preferenceDesc}>Recibe ofertas especiales</Text>
            </View>
            <TouchableOpacity style={styles.toggle}>
              <View
                style={[
                  styles.toggleThumb,
                  profileData.preferences.newsletter && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Opciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Opciones</Text>
        
        <View style={styles.optionsCard}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(180,83,9,0.12)' }]}>
              <Feather name="settings" size={16} color="#B45309" />
            </View>
            <Text style={styles.optionText}>Configuración</Text>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('Help')}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(180,83,9,0.12)' }]}>
              <Feather name="help-circle" size={16} color="#B45309" />
            </View>
            <Text style={styles.optionText}>Ayuda y Soporte</Text>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(180,83,9,0.12)' }]}>
              <Feather name="lock" size={16} color="#B45309" />
            </View>
            <Text style={styles.optionText}>Privacidad y Términos</Text>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Acciones Destructivas */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={16} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
        >
          <Feather name="trash-2" size={16} color="#DC2626" />
          <Text style={styles.deleteBtnText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>

      {/* Versión */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Versión 1.0.0</Text>
      </View>
    </ScrollView>
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
    width: 38,
    height: 38,
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
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 3,
    borderColor: '#FFF7C2',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFDF4',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF7C2',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.03)',
  },
  editProfileBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,239,153,0.60)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  statItemBorder: {
    borderWidth: 1.5,
    borderColor: '#FFD100',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249,224,134,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF7C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.14)',
  },
  preferencesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249,224,134,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  preferenceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  preferenceDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: '#0F172A',
    alignSelf: 'flex-end',
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249,224,134,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(220,38,38,0.7)',
    backgroundColor: 'rgba(220,38,38,0.05)',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(220,38,38,0.4)',
    backgroundColor: 'rgba(220,38,38,0.03)',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
});
