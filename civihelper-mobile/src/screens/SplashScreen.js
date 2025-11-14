// src/screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  InteractionManager,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme/token";

// Gradiente moderno violeta
const SPLASH_GRADIENT = ["#7C3AED", "#A855F7", "#C084FC"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const { loading, token, user } = useAuth();
  const redirected = useRef(false);
  const mounted = useRef(true);

  // Animaciones
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de entrada del logo
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de pulso continua
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de dots
    Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    // Barra de progreso
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!navigation || typeof navigation.replace !== "function") return;

    const task = InteractionManager.runAfterInteractions(() => {
      if (loading || redirected.current) return;
      const hasSession = Boolean(token) || Boolean(user);
      redirected.current = true;
      
      setTimeout(() => {
        if (!mounted.current) return;
        navigation.replace(hasSession ? "Home" : "Login");
      }, 2120);
    });

    return () => task?.cancel?.();
  }, [loading, token, user, navigation]);

  const spinValue = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dot1Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });

  const dot2Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 1, 0.3],
  });

  const dot3Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 0.3, 1],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const stateText = loading ? "Verificando sesión" : "Redirigiendo";

  return (
    <LinearGradient colors={SPLASH_GRADIENT} style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Platform.OS === "android" ? SPLASH_GRADIENT[0] : undefined}
      />

      {/* Fondo animado con círculos */}
      <View style={styles.backgroundShapes}>
        <Animated.View 
          style={[
            styles.circle,
            styles.circle1,
            {
              transform: [
                { scale: pulseAnim },
                { rotate: spinValue },
              ],
            },
          ]}
        />
        <Animated.View 
          style={[
            styles.circle,
            styles.circle2,
            {
              transform: [
                { scale: pulseAnim },
                { rotate: spinValue },
              ],
            },
          ]}
        />
      </View>

      {/* Logo principal con animación */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeIn,
            transform: [
              { scale: logoScale },
              { rotate: spinValue },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.15)"]}
          style={styles.logoCard}
        >
          {/* Icono central moderno */}
          <View style={styles.logoIconContainer}>
            <View style={styles.logoIconInner}>
              <Feather name="zap" size={40} color="#fff" />
            </View>
            
            {/* Dots decorativos animados */}
            <Animated.View 
              style={[
                styles.decorativeDot,
                styles.decorativeDot1,
                { opacity: dot1Opacity }
              ]}
            />
            <Animated.View 
              style={[
                styles.decorativeDot,
                styles.decorativeDot2,
                { opacity: dot2Opacity }
              ]}
            />
            <Animated.View 
              style={[
                styles.decorativeDot,
                styles.decorativeDot3,
                { opacity: dot3Opacity }
              ]}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Brand y tagline */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeIn,
            transform: [
              {
                translateY: fadeIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.brandContainer}>
          <Text style={styles.brand}>CiviHelper</Text>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>
        
        <Text style={styles.tagline}>Conectando servicios de tu comunidad</Text>
        
        {/* Características destacadas */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Feather name="check-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Rápido</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.feature}>
            <Feather name="check-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Seguro</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.feature}>
            <Feather name="check-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Confiable</Text>
          </View>
        </View>
      </Animated.View>

      {/* Loading indicator mejorado */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeIn,
          },
        ]}
      >
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBarFill,
                { width: progressWidth }
              ]}
            />
          </View>
        </View>

        {/* Spinner custom */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <View style={styles.spinnerRing} />
        </View>

        {/* Estado con dots animados */}
        <View style={styles.statusContainer}>
          <Text style={styles.loadingText}>{stateText}</Text>
          <View style={styles.animatedDots}>
            <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
          </View>
        </View>
      </Animated.View>

      {/* Footer con versión */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeIn,
          },
        ]}
      >
        <Text style={styles.footerText}>Versión 1.0.0</Text>
        <Text style={styles.footerCopyright}>© 2025 CiviHelper</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  // Background shapes
  backgroundShapes: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  circle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },

  circle2: {
    width: 250,
    height: 250,
    bottom: -80,
    left: -80,
  },

  // Logo
  logoContainer: {
    marginBottom: 40,
  },

  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    ...Platform.select({
      web: {
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        backdropFilter: "blur(10px)",
      },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 8,
      },
    }),
  },

  logoIconContainer: {
    position: "relative",
  },

  logoIconInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  decorativeDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },

  decorativeDot1: {
    top: -6,
    right: -6,
  },

  decorativeDot2: {
    bottom: -6,
    left: -6,
  },

  decorativeDot3: {
    top: -6,
    left: -6,
  },

  // Text
  textContainer: {
    alignItems: "center",
    marginBottom: 50,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  brand: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  betaBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  betaText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  tagline: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  featuresContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  featureText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "700",
  },

  featureDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    gap: 20,
    width: SCREEN_WIDTH * 0.7,
  },

  progressBarContainer: {
    width: "100%",
  },

  progressBarBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },

  spinnerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  spinnerRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  animatedDots: {
    flexDirection: "row",
    gap: 4,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    gap: 4,
  },

  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },

  footerCopyright: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "500",
  },
});