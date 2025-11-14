// src/screens/provider/ProviderEarnings.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Colors, { spacing, radius, shadows } from '../../theme/color';

const ProviderEarnings = ({ navigation }) => {
  const [earningsData, setEarningsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('month'); // week, month, year
  const [transactionFilter, setTransactionFilter] = useState('all'); // all, completed, pending, withdrawn

  useFocusEffect(
    useCallback(() => {
      loadEarningsData();
    }, [])
  );

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      // Reemplaza con tu API real
      const mockEarningsData = {
        totalEarnings: 1250000,
        availableBalance: 450000,
        pendingBalance: 300000,
        monthlyEarnings: 280000,
        servicesCompleted: 32,
        averageRating: 4.8,
        conversionRate: 85,
        periodData: {
          week: [
            { day: 'Lun', amount: 35000 },
            { day: 'Mar', amount: 42000 },
            { day: 'Mié', amount: 38000 },
            { day: 'Jue', amount: 50000 },
            { day: 'Vie', amount: 55000 },
            { day: 'Sáb', amount: 62000 },
            { day: 'Dom', amount: 28000 },
          ],
          month: [
            { week: 'Sem 1', amount: 170000 },
            { week: 'Sem 2', amount: 185000 },
            { week: 'Sem 3', amount: 165000 },
            { week: 'Sem 4', amount: 180000 },
          ],
          year: [
            { month: 'Ene', amount: 250000 },
            { month: 'Feb', amount: 280000 },
            { month: 'Mar', amount: 310000 },
            { month: 'Abr', amount: 265000 },
            { month: 'May', amount: 295000 },
            { month: 'Jun', amount: 340000 },
            { month: 'Jul', amount: 385000 },
            { month: 'Ago', amount: 360000 },
            { month: 'Sep', amount: 320000 },
            { month: 'Oct', amount: 280000 },
          ],
        },
      };

      const mockTransactions = [
        {
          id: '1',
          type: 'completed', // completed, pending, withdrawn
          description: 'Pago por Reparación de Plomería',
          amount: 50000,
          date: '2025-10-18',
          time: '14:30',
          status: 'completed',
          bookingId: 'B001',
        },
        {
          id: '2',
          type: 'completed',
          description: 'Pago por Limpieza General',
          amount: 35000,
          date: '2025-10-17',
          time: '10:00',
          status: 'completed',
          bookingId: 'B002',
        },
        {
          id: '3',
          type: 'pending',
          description: 'Pago pendiente - Clases de Inglés',
          amount: 25000,
          date: '2025-10-25',
          time: '18:00',
          status: 'pending',
          bookingId: 'B003',
        },
        {
          id: '4',
          type: 'withdrawn',
          description: 'Retiro a cuenta bancaria',
          amount: -100000,
          date: '2025-10-15',
          time: '09:45',
          status: 'completed',
          bankAccount: '****1234',
        },
        {
          id: '5',
          type: 'completed',
          description: 'Pago por Reparación Eléctrica',
          amount: 45000,
          date: '2025-10-14',
          time: '16:20',
          status: 'completed',
          bookingId: 'B004',
        },
        {
          id: '6',
          type: 'pending',
          description: 'Pago pendiente - Diseño Gráfico',
          amount: 55000,
          date: '2025-10-28',
          time: '11:00',
          status: 'pending',
          bookingId: 'B005',
        },
      ];

      setEarningsData(mockEarningsData);
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error al cargar datos de ganancias:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEarningsData().then(() => setRefreshing(false));
  }, []);

  const getTransactionIcon = (type) => {
    const iconMap = {
      completed: 'check-circle',
      pending: 'clock',
      withdrawn: 'arrow-up-right',
    };
    return iconMap[type] || 'circle';
  };

  const getTransactionColor = (type) => {
    const colorMap = {
      completed: Colors.success,
      pending: Colors.warning,
      withdrawn: Colors.error,
    };
    return colorMap[type] || Colors.text;
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (transactionFilter === 'all') return true;
    return transaction.type === transactionFilter;
  });

  const renderEarningsCard = () => (
    <View style={styles.earningsCard}>
      <View style={styles.cardContent}>
        <View style={styles.earningItem}>
          <View style={styles.earningLabel}>
            <Feather name="wallet" size={16} color={Colors.success} />
            <Text style={styles.earningLabelText}>Saldo Disponible</Text>
          </View>
          <Text style={styles.earningAmount}>
            ${earningsData.availableBalance.toLocaleString('es-CL')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.earningItem}>
          <View style={styles.earningLabel}>
            <Feather name="clock" size={16} color={Colors.warning} />
            <Text style={styles.earningLabelText}>Saldo Pendiente</Text>
          </View>
          <Text style={[styles.earningAmount, { color: Colors.warning }]}>
            ${earningsData.pendingBalance.toLocaleString('es-CL')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.earningItem}>
          <View style={styles.earningLabel}>
            <Feather name="trending-up" size={16} color={Colors.primary} />
            <Text style={styles.earningLabelText}>Total Ganado</Text>
          </View>
          <Text style={[styles.earningAmount, { color: Colors.primary }]}>
            ${earningsData.totalEarnings.toLocaleString('es-CL')}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.withdrawBtn}>
        <Feather name="arrow-up" size={16} color={Colors.card} />
        <Text style={styles.withdrawBtnText}>Retirar Fondos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsGrid}>
      <View style={[styles.statBox, styles.statBoxBorder]}>
        <Feather name="activity" size={18} color={Colors.primary} />
        <Text style={styles.statValue}>{earningsData.servicesCompleted}</Text>
        <Text style={styles.statLabel}>Servicios</Text>
      </View>

      <View style={styles.statBox}>
        <Feather name="star" size={18} color={Colors.warning} fill={Colors.warning} />
        <Text style={styles.statValue}>{earningsData.averageRating}</Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>

      <View style={[styles.statBox, styles.statBoxBorder]}>
        <Feather name="percent" size={18} color={Colors.success} />
        <Text style={styles.statValue}>{earningsData.conversionRate}%</Text>
        <Text style={styles.statLabel}>Conversión</Text>
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <Text style={styles.sectionLabel}>Período:</Text>
      <View style={styles.periodButtons}>
        {[
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mes' },
          { value: 'year', label: 'Año' },
        ].map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodBtn,
              periodFilter === period.value && styles.periodBtnActive,
            ]}
            onPress={() => setPeriodFilter(period.value)}
          >
            <Text
              style={[
                styles.periodBtnText,
                periodFilter === period.value && styles.periodBtnTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderChartData = () => {
    const data = earningsData.periodData[periodFilter];
    const maxAmount = Math.max(...data.map((d) => d.amount));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(item.amount / maxAmount) * 100}%`,
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {item.day || item.week || item.month}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTransactionCard = ({ item }) => (
    <TouchableOpacity style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: getTransactionColor(item.type) + '15' },
          ]}
        >
          <Feather
            name={getTransactionIcon(item.type)}
            size={16}
            color={getTransactionColor(item.type)}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {item.date} • {item.time}
          </Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.amount < 0 ? Colors.error : Colors.success },
          ]}
        >
          {item.amount < 0 ? '-' : '+'} ${Math.abs(item.amount).toLocaleString('es-CL')}
        </Text>
        <Text
          style={[
            styles.transactionStatus,
            { color: getTransactionColor(item.type) },
          ]}
        >
          {item.type === 'completed'
            ? 'Completado'
            : item.type === 'pending'
            ? 'Pendiente'
            : 'Retirado'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTransactionFilters = () => (
    <View style={styles.filterContainer}>
      {['all', 'completed', 'pending', 'withdrawn'].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterBtn,
            transactionFilter === filter && styles.filterBtnActive,
          ]}
          onPress={() => setTransactionFilter(filter)}
        >
          <Text
            style={[
              styles.filterBtnText,
              transactionFilter === filter && styles.filterBtnTextActive,
            ]}
          >
            {filter === 'all'
              ? 'Todas'
              : filter === 'completed'
              ? 'Completadas'
              : filter === 'pending'
              ? 'Pendientes'
              : 'Retirados'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!earningsData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No se pudieron cargar los datos</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Ganancias</Text>
      </View>

      {/* Tarjeta de Ganancias */}
      {renderEarningsCard()}

      {/* Estadísticas */}
      {renderStatsCard()}

      {/* Gráfico */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ganancias</Text>
        {renderPeriodSelector()}
        {renderChartData()}
      </View>

      {/* Transacciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
        {renderTransactionFilters()}
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.transactionsList}
        />
      </View>
    </ScrollView>
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
  earningsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...shadows.lg,
  },
  cardContent: {
    padding: spacing.lg,
  },
  earningItem: {
    marginBottom: spacing.md,
  },
  earningLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  earningLabelText: {
    fontSize: 12,
    color: Colors.sub,
    fontWeight: '500',
  },
  earningAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: spacing.md,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 0,
  },
  withdrawBtnText: {
    color: Colors.card,
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.sm,
  },
  statBoxBorder: {
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.sub,
    marginTop: 4,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sub,
    marginBottom: spacing.sm,
  },
  periodContainer: {
    marginBottom: spacing.lg,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sub,
  },
  periodBtnTextActive: {
    color: Colors.card,
  },
  chartContainer: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
    marginBottom: spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    gap: spacing.sm,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barLabel: {
    marginTop: spacing.sm,
    fontSize: 10,
    color: Colors.sub,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    fontSize: 11,
    fontWeight: '600',
    color: Colors.sub,
  },
  filterBtnTextActive: {
    color: Colors.card,
  },
  transactionsList: {
    marginTop: spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadows.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: Colors.sub,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});

export default ProviderEarnings;