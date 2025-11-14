// src/screens/ChatScreen.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import socketService from "../services/socketService";
import apiClient from "../services/apiClient";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";

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
  bg: "#FAFAFA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  shadow: "rgba(0, 0, 0, 0.08)",
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);
  const { user } = useAuth();

  const {
    conversationId: initialConversationId,
    providerId,
    providerName = "Proveedor",
    providerImage,
    serviceId,
  } = route.params || {};

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const typingTimeoutRef = useRef(null);
  
  useEffect(() => {
    initializeChat();
    
    return () => {
      if (conversationId) {
        socketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    const unsubNewMessage = socketService.on("chat:newMessage", (message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    const unsubTyping = socketService.on("chat:userTyping", (data) => {
      setOtherUserTyping(data.isTyping);
    });

    return () => {
      unsubNewMessage();
      unsubTyping();
    };
  }, [conversationId]);

  const initializeChat = async () => {
    try {
      setLoading(true);

      if (!socketService.isConnected()) {
        await socketService.connect();
      }

      if (!conversationId && providerId) {
        const response = await apiClient.post("/api/chat/conversations", {
          providerId,
          serviceId,
        });
        setConversationId(response.data.conversation.id);
        return;
      }

      if (!conversationId) {
        throw new Error("No se pudo inicializar la conversación");
      }

      await socketService.joinConversation(conversationId);
      await loadMessages();
    } catch (error) {
      console.error("[ChatScreen] Error inicializando:", error);
      Alert.alert(
        "Error",
        "No se pudo cargar el chat. Por favor, intenta nuevamente.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await apiClient.get(
        `/api/chat/conversations/${conversationId}/messages?limit=50`
      );
      setMessages(response.data.messages);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error("[ChatScreen] Error cargando mensajes:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    sendTypingStatus(false);

    try {
      await socketService.sendMessage(conversationId, messageText);
    } catch (error) {
      console.error("[ChatScreen] Error enviando mensaje:", error);
      Alert.alert("Error", "No se pudo enviar el mensaje");
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const sendTypingStatus = useCallback((typing) => {
    if (!conversationId) return;

    setIsTyping(typing);
    socketService.sendTypingStatus(conversationId, typing);

    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 3000);
    }
  }, [conversationId]);

  const handleInputChange = (text) => {
    setInputText(text);

    if (text.trim() && !isTyping) {
      sendTypingStatus(true);
    } else if (!text.trim() && isTyping) {
      sendTypingStatus(false);
    }
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, "HH:mm")}`;
    } else if (differenceInDays(new Date(), date) < 7) {
      return format(date, "EEEE HH:mm", { locale: es });
    } else {
      return format(date, "dd/MM/yyyy HH:mm");
    }
  };

  const renderDateSeparator = (date) => {
    const messageDate = new Date(date);
    let dateText;

    if (isToday(messageDate)) {
      dateText = "Hoy";
    } else if (isYesterday(messageDate)) {
      dateText = "Ayer";
    } else {
      dateText = format(messageDate, "dd 'de' MMMM, yyyy", { locale: es });
    }

    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateSeparatorLine} />
        <View style={styles.dateSeparatorBadge}>
          <Text style={styles.dateSeparatorText}>{dateText}</Text>
        </View>
        <View style={styles.dateSeparatorLine} />
      </View>
    );
  };

  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);

    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const renderMessage = ({ item, index }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
    const isOwn = item.sender?.id === route.params?.currentUserId;

    return (
      <View>
        {showDateSeparator && renderDateSeparator(item.createdAt)}
        
        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
          ]}
        >
          {!isOwn && item.sender?.avatarUrl && (
            <Image 
              source={{ uri: item.sender.avatarUrl }} 
              style={styles.avatar} 
            />
          )}

          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
            ]}
          >
            {!isOwn && (
              <Text style={styles.senderName}>{item.sender?.name}</Text>
            )}
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}
            >
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
                ]}
              >
                {formatMessageDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.yellow, COLORS.yellowDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Feather name="arrow-left" size={22} color={COLORS.gray900} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerInfo}
        onPress={() => {
          if (providerId) {
            navigation.navigate("Profile", { userId: providerId });
          }
        }}
      >
        {providerImage ? (
          <Image source={{ uri: providerImage }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Feather name="user" size={20} color={COLORS.gray700} />
          </View>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerName}>{providerName}</Text>
          {otherUserTyping && (
            <Text style={styles.typingText}>Escribiendo...</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          console.log("[ChatScreen] Opciones");
        }}
      >
        <Feather name="more-vertical" size={20} color={COLORS.gray900} />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.yellow} />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {renderHeader()}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              console.log("[ChatScreen] Adjuntar archivo");
            }}
          >
            <Feather name="paperclip" size={20} color={COLORS.gray500} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.gray500}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Feather name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  backButton: {
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
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.gray700,
    fontStyle: "italic",
    fontWeight: "600",
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateSeparatorBadge: {
    backgroundColor: COLORS.yellowLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.yellow,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: COLORS.gray800,
    fontWeight: "800",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  messageContainerOwn: {
    justifyContent: "flex-end",
  },
  messageContainerOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  messageBubbleOwn: {
    backgroundColor: COLORS.yellow,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.purple,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: COLORS.gray900,
    fontWeight: "600",
  },
  messageTextOther: {
    color: COLORS.text,
    fontWeight: "500",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  messageTimeOwn: {
    color: COLORS.gray700,
  },
  messageTimeOther: {
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontWeight: "500",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.yellow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
});