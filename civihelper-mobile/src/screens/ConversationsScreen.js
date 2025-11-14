// src/screens/ConversationsScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import apiClient from "../services/apiClient";
import socketService from "../services/socketService";
import { useAuth } from "../context/AuthContext";
import { format, isToday, isYesterday } from "date-fns";
import AppLogo from "../components/common/AppLogo";

/* =========================
   PALETA DE COLORES - Páginas Amarillas
========================= */
const COLORS = {
  yellow: "#FFD100",
  yellowDark: "#F5C400",
  yellowLight: "#FFF8CC",
  purple: "#7C3AED",
  purpleLight: "#A78BFA",
  white: "#FFFFFF",
  black: "#0A0A0A",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  success: "#10B981",
  error: "#EF4444",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  shadow: "rgba(0, 0, 0, 0.08)",
};

export default function ConversationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      connectSocket();

      return () => {
        // Cleanup si es necesario
      };
    }, [])
  );

  const connectSocket = async () => {
    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }

      const unsubscribe = socketService.on("chat:notification", (data) => {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === data.conversationId
              ? {
                  ...conv,
                  lastMessageAt: data.message.createdAt,
                  lastMessageText: data.message.content,
                  unreadCount: (conv.unreadCount || 0) + 1,
                }
              : conv
          )
        );
      });

      return unsubscribe;
    } catch (error) {
      console.error("[Conversations] Error conectando socket:", error);
    }
  };

  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await apiClient.get("/api/chat/conversations");
      setConversations(response.data.conversations);
    } catch (error) {
      console.error("[Conversations] Error cargando conversaciones:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatLastMessageDate = (date) => {
    if (!date) return "";

    const messageDate = new Date(date);

    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm");
    } else if (isYesterday(messageDate)) {
      return "Ayer";
    } else {
      return format(messageDate, "dd/MM/yy");
    }
  };

  const openConversation = (conversation) => {
    navigation.navigate("Chat", {
      conversationId: conversation.id,
      providerId: conversation.otherUser.id,
      providerName: conversation.otherUser.name,
      providerImage: conversation.otherUser.avatarUrl,
      serviceId: conversation.service?.id,
      currentUserId: user?.id,
    });
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openConversation(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {item.otherUser.avatarUrl ? (
          <Image 
            source={{ uri: item.otherUser.avatarUrl }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={24} color={COLORS.gray500} />
          </View>
        )}

        {/* Contenido */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, hasUnread && styles.userNameUnread]}>
              {item.otherUser.name}
            </Text>
            <Text style={styles.timestamp}>
              {formatLastMessageDate(item.lastMessageAt)}
            </Text>
          </View>

          {item.service && (
            <View style={styles.serviceTag}>
              <Feather name="briefcase" size={10} color={COLORS.yellow} />
              <Text style={styles.serviceLabel}>{item.service.title}</Text>
            </View>
          )}

          <View style={styles.lastMessageContainer}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {item.lastMessageText || "Sin mensajes"}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Feather name="message-circle" size={48} color={COLORS.yellow} />
      </View>
      <Text style={styles.emptyTitle}>No hay conversaciones</Text>
      <Text style={styles.emptyText}>
        Cuando contactes a un proveedor, tus chats aparecerán aquí
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />
        <LinearGradient
          colors={[COLORS.yellow, COLORS.yellowDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <AppLogo 
                source={require('../assets/Logo3.png')} 
                size={44} 
                rounded={true}
              />
              <Text style={styles.headerTitle}>Mensajes</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.yellow} />
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />
      
      {/* Header Amarillo */}
      <LinearGradient
        colors={[COLORS.yellow, COLORS.yellowDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <AppLogo 
              source={require('../assets/Logo3.png')} 
              size={44} 
              rounded={true}
            />
            <Text style={styles.headerTitle}>Mensajes</Text>
          </View>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => loadConversations(true)}
          >
            <Feather name="refresh-cw" size={18} color={COLORS.gray900} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Lista de conversaciones */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          conversations.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadConversations(true)}
            tintColor={COLORS.yellow}
            colors={[COLORS.yellow]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyListContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      },
    }),
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.yellowLight,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.yellowLight,
  },
  conversationContent: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  userNameUnread: {
    fontWeight: "800",
    color: COLORS.gray900,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.yellowLight,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  serviceLabel: {
    fontSize: 11,
    color: COLORS.gray800,
    fontWeight: "700",
  },
  lastMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: "500",
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: "700",
  },
  unreadBadge: {
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.yellow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unreadCount: {
    color: COLORS.gray900,
    fontSize: 11,
    fontWeight: "800",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.yellowLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.yellow,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
});