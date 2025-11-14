// src/screens/provider/ProviderProfile.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';
import { useAuth } from '../../context/AuthContext';

const ProviderProfile = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [preferences, setPreferences] = useState({
    notifications: true,
    newsletter: false,
    autoAccept: false,
  });

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
        name: user?.name || 'Juan García Pérez',
        email: user?.email || 'juan.garcia@example.com',
        phone: '+56 9 1234 5678',
        avatar: 'https://via.placeholder.com/120',
        coverImage: 'https://via.placeholder.com/400x120',
        bio: 'Profesional en reparaciones de plomería con 8 años de experiencia. Servicio rápido y confiable.',
        location: 'Santiago, Región Metropolitana',
        joinDate: '2023-01-15',
        verified: true,
        verificationBadges: ['email', 'phone', 'identity'],
        stats: {
          totalRating: 4.8,
          totalReviews: 127,
          servicesCompleted: 356,
          responseTime: '< 1 hora',
          cancelRate: 2.1,
          repeatClients: 45,
        },
        services: [
          { id: '1', title: 'Reparación de Plomería', active: true },
          { id: '2', title: 'Instalaciones Sanitarias', active: true },
          { id: '3', title: 'Mantenimiento Preventivo', active: false },
        ],
        certifications: [
          { id: '1', name: 'Certificado de Plomería Profesional', issuer: 'SENCE' },
          { id: '2', name: 'Primeros Auxilios', issuer: 'Cruz Roja' },
        ],
        bankAccount: {
          bank: 'Banco Santander',
          accountType: 'Cuenta Corriente',
          lastDigits: '1234',
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
            console.log('Cuenta eliminada');
            logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Header del Perfil */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: profileData.coverImage }} style={styles.coverImage} />

        <View style={styles.profileContent}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Feather name="camera" size={14} color={Colors.card} />
            </TouchableOpacity>
            <View style={[styles.onlineIndicator, isOnline && styles.onlineIndicatorActive]} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{profileData.name}</Text>
              {profileData.verified && (
                <Feather name="check-circle" size={18} color={Colors.success} fill={Colors.success} />
              )}
            </View>
            <Text style={styles.location}>{profileData.location}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.stats.totalRating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.stats.servicesCompleted}</Text>
                <Text style={styles.statLabel}>Completados</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.stats.repeatClients}</Text>
                <Text style={styles.statLabel}>Clientes Fijos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Estado en línea */}
        <View style={styles.onlineToggle}>
          <Feather name="wifi" size={16} color={Colors.primary} />
          <Text style={styles.onlineToggleText}>
            {isOnline ? 'En línea' : 'Fuera de línea'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: Colors.sub, true: Colors.success }}
            thumbColor={isOnline ? Colors.card : Colors.sub}
          />
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de ti</Text>
        <View style={styles.bioCard}>
          <Text style={styles.bioText}>{profileData.bio}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editBioBtn}
          >
            <Feather name="edit-2" size={14} color={Colors.primary} />
            <Text style={styles.editBioBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Información de Contacto */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Contacto</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Feather name="mail" size={16} color={Colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profileData.email}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Feather name="chevron-right" size={18} color={Colors.sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Feather name="phone" size={16} color={Colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{profileData.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Feather name="chevron-right" size={18} color={Colors.sub} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Servicios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis Servicios</Text>
        <View style={styles.servicesCard}>
          {profileData.services.map((service, index) => (
            <View key={service.id}>
              <View style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.title}</Text>
                  <View
                    style={[
                      styles.serviceStatus,
                      {
                        backgroundColor: service.active ? Colors.success + '15' : Colors.warning + '15',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: service.active ? Colors.success : Colors.warning },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: service.active ? Colors.success : Colors.warning },
                      ]}
                    >
                      {service.active ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <Feather name="edit-2" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {index < profileData.services.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.addServiceBtn}>
          <Feather name="plus" size={16} color={Colors.primary} />
          <Text style={styles.addServiceBtnText}>Agregar Servicio</Text>
        </TouchableOpacity>
      </View>

      {/* Certificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Certificaciones</Text>
        <View style={styles.certificationsCard}>
          {profileData.certifications.map((cert, index) => (
            <View key={cert.id}>
              <View style={styles.certItem}>
                <View style={styles.certIcon}>
                  <Feather name="award" size={16} color={Colors.primary} />
                </View>
                <View style={styles.certContent}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>{cert.issuer}</Text>
                </View>
              </View>
              {index < profileData.certifications.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.addCertBtn}>
          <Feather name="plus" size={16} color={Colors.primary} />
          <Text style={styles.addCertBtnText}>Agregar Certificación</Text>
        </TouchableOpacity>
      </View>

      {/* Información Bancaria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Bancaria</Text>
        <View style={styles.bankCard}>
          <View style={styles.bankItem}>
            <Feather name="credit-card" size={20} color={Colors.primary} />
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{profileData.bankAccount.bank}</Text>
              <Text style={styles.bankDetails}>
                {profileData.bankAccount.accountType} •••• {profileData.bankAccount.lastDigits}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('EditBankInfo')}>
            <Feather name="edit-2" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferencias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.preferencesCard}>
          {[
            { key: 'notifications', label: 'Notificaciones', desc: 'Recibe alertas de nuevas reservas' },
            { key: 'newsletter', label: 'Boletín', desc: 'Recibe tips y ofertas especiales' },
            { key: 'autoAccept', label: 'Aceptación Automática', desc: 'Aceptar reservas automáticamente' },
          ].map((pref, index) => (
            <View key={pref.key}>
              <View style={styles.preferenceItem}>
                <View>
                  <Text style={styles.preferenceName}>{pref.label}</Text>
                  <Text style={styles.preferenceDesc}>{pref.desc}</Text>
                </View>
                <Switch
                  value={preferences[pref.key]}
                  onValueChange={() => togglePreference(pref.key)}
                  trackColor={{ false: Colors.sub, true: Colors.primary }}
                  thumbColor={Colors.card}
                />
              </View>
              {index < 2 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Opciones */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Feather name="settings" size={16} color={Colors.primary} />
          <Text style={styles.optionBtnText}>Configuración</Text>
          <Feather name="chevron-right" size={16} color={Colors.sub} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => navigation.navigate('Help')}
        >
          <Feather name="help-circle" size={16} color={Colors.primary} />
          <Text style={styles.optionBtnText}>Ayuda y Soporte</Text>
          <Feather name="chevron-right" size={16} color={Colors.sub} />
        </TouchableOpacity>
      </View>

      {/* Acciones Destructivas */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.error} />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={16} color={Colors.error} />
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
    backgroundColor: Colors.bg,
  },
  profileHeader: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  coverImage: {
    width: '100%',
    height: 120,
  },
  profileContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: -spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginTop: -spacing.xl,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.bg,
    backgroundColor: Colors.bg,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  onlineIndicatorActive: {
    backgroundColor: Colors.success,
  },
  profileInfo: {
    paddingBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  location: {
    fontSize: 13,
    color: Colors.sub,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: Colors.bg,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.sub,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Colors.primary + '10',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  onlineToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: spacing.md,
  },
  bioCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bioText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  editBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: Colors.primary + '15',
  },
  editBioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.sub,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  servicesCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.md,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: spacing.sm,
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  addServiceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  certificationsCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.md,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certContent: {
    flex: 1,
  },
  certName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  certIssuer: {
    fontSize: 11,
    color: Colors.sub,
  },
  addCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  addCertBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  bankDetails: {
    fontSize: 11,
    color: Colors.sub,
  },
  preferencesCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  preferenceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  preferenceDesc: {
    fontSize: 11,
    color: Colors.sub,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  logoutBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error + '50',
    backgroundColor: Colors.error + '05',
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    fontSize: 12,
    color: Colors.sub,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});

export default ProviderProfile;