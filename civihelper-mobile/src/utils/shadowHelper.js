/**
 * Utilidad para generar sombras compatibles con múltiples plataformas
 * 
 * React Native Web ha deprecado las props individuales de sombra (shadowColor,
 * shadowOffset, etc.) en favor de la propiedad boxShadow estándar de CSS.
 * 
 * Esta utilidad proporciona una interfaz unificada para crear sombras que
 * funcionan correctamente en iOS, Android y Web.
 * 
 * @module utils/shadowHelper
 */

import { Platform } from "react-native";

/**
 * Genera estilos de sombra compatibles con todas las plataformas
 * 
 * @param {Object} options - Configuración de la sombra
 * @param {number} options.elevation - Elevación para Android (0-24)
 * @param {string} options.shadowColor - Color de la sombra (hex o rgba)
 * @param {number} options.shadowOpacity - Opacidad de la sombra iOS (0-1)
 * @param {number} options.shadowRadius - Radio de difuminado (blur)
 * @param {Object} options.shadowOffset - Desplazamiento de la sombra
 * @param {number} options.shadowOffset.width - Desplazamiento horizontal
 * @param {number} options.shadowOffset.height - Desplazamiento vertical
 * 
 * @returns {Object} Objeto de estilos compatible con la plataforma actual
 * 
 * @example
 * const styles = StyleSheet.create({
 *   card: {
 *     ...createShadow({
 *       elevation: 5,
 *       shadowColor: '#000',
 *       shadowOpacity: 0.25,
 *       shadowRadius: 10,
 *       shadowOffset: { width: 0, height: 4 },
 *     }),
 *   },
 * });
 */
export function createShadow({
  elevation = 4,
  shadowColor = "#000",
  shadowOpacity = 0.3,
  shadowRadius = 4,
  shadowOffset = { width: 0, height: 2 },
} = {}) {
  if (Platform.OS === "web") {
    // Web: Usa boxShadow estándar de CSS
    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${hexToRgba(shadowColor, shadowOpacity)}`,
    };
  }

  if (Platform.OS === "android") {
    // Android: Usa elevation nativo
    return {
      elevation,
    };
  }

  // iOS: Usa propiedades shadow* nativas
  return {
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffset,
  };
}

/**
 * Convierte un color hex o rgb a rgba con opacidad
 * 
 * @param {string} color - Color en formato hex (#000) o rgb(0,0,0)
 * @param {number} opacity - Opacidad entre 0 y 1
 * @returns {string} Color en formato rgba
 * 
 * @private
 */
function hexToRgba(color, opacity) {
  // Si ya es rgba, reemplaza la opacidad
  if (color.startsWith("rgba")) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }

  // Si es rgb, convierte a rgba
  if (color.startsWith("rgb")) {
    return color.replace("rgb", "rgba").replace(")", `, ${opacity})`);
  }

  // Si es hex, convierte a rgba
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Presets de sombras comunes para mantener consistencia en la UI
 * 
 * @constant {Object} SHADOW_PRESETS
 * 
 * @example
 * import { SHADOW_PRESETS } from './utils/shadowHelper';
 * 
 * const styles = StyleSheet.create({
 *   card: {
 *     ...SHADOW_PRESETS.medium,
 *   },
 * });
 */
export const SHADOW_PRESETS = {
  /**
   * Sombra sutil para elementos cercanos al fondo
   */
  small: createShadow({
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  }),

  /**
   * Sombra estándar para tarjetas y contenedores
   */
  medium: createShadow({
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  }),

  /**
   * Sombra pronunciada para elementos flotantes
   */
  large: createShadow({
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  }),

  /**
   * Sombra dramática para modales y overlays
   */
  xlarge: createShadow({
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  }),

  /**
   * Sombra de botón presionado (más cercana)
   */
  pressed: createShadow({
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  }),
};

/**
 * Crea una sombra con color personalizado
 * 
 * @param {string} color - Color base de la sombra
 * @param {number} intensity - Intensidad (0-1, default: 0.5)
 * @returns {Object} Estilos de sombra
 * 
 * @example
 * // Sombra violeta para botones de marca
 * const purpleShadow = createColoredShadow('#7c3aed', 0.6);
 */
export function createColoredShadow(color = "#000", intensity = 0.5) {
  return createShadow({
    elevation: Math.round(intensity * 10),
    shadowColor: color,
    shadowOpacity: intensity,
    shadowRadius: Math.round(intensity * 16),
    shadowOffset: { width: 0, height: Math.round(intensity * 8) },
  });
}

/**
 * Genera sombra interna (solo Web)
 * 
 * @param {Object} options - Configuración de la sombra interna
 * @returns {Object} Estilos de sombra interna
 * 
 * @example
 * const innerShadow = createInnerShadow({
 *   shadowColor: '#000',
 *   shadowOpacity: 0.2,
 *   shadowRadius: 4,
 *   shadowOffset: { width: 0, height: 2 },
 * });
 */
export function createInnerShadow({
  shadowColor = "#000",
  shadowOpacity = 0.2,
  shadowRadius = 4,
  shadowOffset = { width: 0, height: 2 },
} = {}) {
  if (Platform.OS !== "web") {
    // Las sombras internas no son nativas en iOS/Android
    console.warn("Inner shadows are only supported on web platform");
    return {};
  }

  const rgba = hexToRgba(shadowColor, shadowOpacity);
  return {
    boxShadow: `inset ${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${rgba}`,
  };
}

/**
 * Combina múltiples sombras (solo Web)
 * 
 * @param {...Object} shadows - Array de configuraciones de sombra
 * @returns {Object} Estilos con múltiples sombras
 * 
 * @example
 * const combinedShadow = combineShadows(
 *   { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
 *   { shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
 * );
 */
export function combineShadows(...shadows) {
  if (Platform.OS !== "web") {
    // Retorna solo la primera sombra en plataformas nativas
    return createShadow(shadows[0]);
  }

  const boxShadows = shadows.map((shadow) => {
    const {
      shadowColor = "#000",
      shadowOpacity = 0.3,
      shadowRadius = 4,
      shadowOffset = { width: 0, height: 2 },
    } = shadow;

    const rgba = hexToRgba(shadowColor, shadowOpacity);
    return `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${rgba}`;
  });

  return {
    boxShadow: boxShadows.join(", "),
  };
}

/**
 * Migra estilos antiguos de sombra al nuevo formato
 * Esta función es útil durante la migración de código legacy
 * 
 * @param {Object} oldStyles - Estilos con props shadow* deprecadas
 * @returns {Object} Estilos actualizados compatibles con todas las plataformas
 * 
 * @example
 * // Antes (deprecado en Web):
 * const oldStyle = {
 *   shadowColor: '#000',
 *   shadowOpacity: 0.25,
 *   shadowRadius: 10,
 *   shadowOffset: { width: 0, height: 4 },
 *   elevation: 5,
 * };
 * 
 * // Después (compatible):
 * const newStyle = migrateShadowStyles(oldStyle);
 */
export function migrateShadowStyles(oldStyles) {
  const {
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffset,
    elevation,
    ...rest
  } = oldStyles;

  // Si no hay props de sombra, retorna los estilos sin cambios
  if (!shadowColor && !elevation) {
    return oldStyles;
  }

  return {
    ...rest,
    ...createShadow({
      elevation,
      shadowColor,
      shadowOpacity,
      shadowRadius,
      shadowOffset,
    }),
  };
}

/**
 * Ejemplo de uso completo
 * 
 * @example
 * import { StyleSheet } from 'react-native';
 * import { createShadow, SHADOW_PRESETS, createColoredShadow } from './utils/shadowHelper';
 * 
 * const styles = StyleSheet.create({
 *   // Usando preset
 *   card: {
 *     backgroundColor: '#fff',
 *     borderRadius: 12,
 *     padding: 16,
 *     ...SHADOW_PRESETS.medium,
 *   },
 * 
 *   // Sombra personalizada
 *   button: {
 *     backgroundColor: '#7c3aed',
 *     borderRadius: 8,
 *     ...createShadow({
 *       elevation: 6,
 *       shadowColor: '#7c3aed',
 *       shadowOpacity: 0.4,
 *       shadowRadius: 10,
 *       shadowOffset: { width: 0, height: 4 },
 *     }),
 *   },
 * 
 *   // Sombra coloreada rápida
 *   floatingButton: {
 *     ...createColoredShadow('#ff6b6b', 0.7),
 *   },
 * });
 */