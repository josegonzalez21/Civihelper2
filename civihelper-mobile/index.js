/**
 * Punto de entrada principal de la aplicación
 * 
 * Este archivo debe ser el primero en ejecutarse y se encarga de:
 * - Inicializar dependencias críticas (gesture handler, screens)
 * - Configurar optimizaciones de rendimiento
 * - Validar variables de entorno en desarrollo
 * - Registrar el componente raíz de la aplicación
 * 
 * IMPORTANTE: La importación de react-native-gesture-handler debe ser
 * la primera línea del archivo para evitar crashes en navegación.
 */

// ============================================================================
// IMPORTS CRÍTICOS - NO MOVER DE POSICIÓN
// ============================================================================

/**
 * React Native Gesture Handler debe importarse PRIMERO
 * Este import configura el sistema de gestos nativo antes que cualquier
 * otro código se ejecute, evitando crashes en navegadores de React Navigation
 */
import "react-native-gesture-handler";

// ============================================================================
// DEPENDENCIAS DE EXPO Y REACT NATIVE
// ============================================================================

import { registerRootComponent } from "expo";
import { enableScreens } from "react-native-screens";

// ============================================================================
// CONFIGURACIÓN DE OPTIMIZACIONES
// ============================================================================

/**
 * Habilita el uso de screens nativos para navegación
 * 
 * Mejora significativamente el rendimiento de React Navigation al:
 * - Usar componentes nativos en lugar de Views JS
 * - Reducir el uso de memoria
 * - Mejorar las transiciones entre pantallas
 * - Optimizar el renderizado en pilas de navegación profundas
 * 
 * @see https://reactnavigation.org/docs/react-native-screens
 */
enableScreens(true);

// ============================================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ============================================================================

/**
 * Verifica y muestra las variables de entorno en modo desarrollo
 * 
 * Expo inyecta automáticamente las variables que empiezan con EXPO_PUBLIC_*
 * desde archivos .env en process.env. Esta validación ayuda a detectar
 * problemas de configuración tempranamente.
 * 
 * Ejemplos de uso:
 * - EXPO_PUBLIC_API_URL=https://api.ejemplo.com
 * - EXPO_PUBLIC_ENV=development
 * - EXPO_PUBLIC_FEATURE_FLAGS={"newUI":true}
 */
if (__DEV__) {
  // Configuración de logging para desarrollo
  const ENV_VARS = {
    API_URL: process?.env?.EXPO_PUBLIC_API_URL,
    ENVIRONMENT: process?.env?.EXPO_PUBLIC_ENV,
    APP_VERSION: process?.env?.EXPO_PUBLIC_APP_VERSION,
  };

  console.group("🔧 [ENV] Variables de Entorno");
  Object.entries(ENV_VARS).forEach(([key, value]) => {
    if (value !== undefined) {
      console.log(`  ${key}:`, value);
    }
  });
  console.groupEnd();

  // Advertencia si falta la URL de la API
  if (!ENV_VARS.API_URL) {
    console.warn(
      "⚠️ [ENV] EXPO_PUBLIC_API_URL no está definida. " +
      "Asegúrate de tener un archivo .env con esta variable."
    );
  }

  // Validación de protocolo HTTPS en producción
  if (ENV_VARS.ENVIRONMENT === "production" && ENV_VARS.API_URL) {
    if (!ENV_VARS.API_URL.startsWith("https://")) {
      console.error(
        "❌ [SEGURIDAD] La API_URL debe usar HTTPS en producción. " +
        `Actual: ${ENV_VARS.API_URL}`
      );
    }
  }
}

// ============================================================================
// IMPORT DEL COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Importa el componente raíz después de todas las configuraciones
 * Esto asegura que todas las optimizaciones y validaciones se ejecuten
 * antes de inicializar la aplicación
 */
import App from "./App";

// ============================================================================
// REGISTRO DE LA APLICACIÓN
// ============================================================================

/**
 * Registra el componente raíz con Expo
 * 
 * Esta función es el equivalente de Expo a AppRegistry.registerComponent
 * y funciona tanto en Expo Go como en builds nativos (EAS Build).
 * 
 * El registro debe ser la última operación del archivo para garantizar
 * que todas las configuraciones previas estén completas.
 * 
 * @see https://docs.expo.dev/versions/latest/sdk/register-root-component/
 */
registerRootComponent(App);

// ============================================================================
// NOTAS ADICIONALES
// ============================================================================

/**
 * Estructura de archivos .env recomendada:
 * 
 * .env.development:
 *   EXPO_PUBLIC_API_URL=http://localhost:3000
 *   EXPO_PUBLIC_ENV=development
 * 
 * .env.production:
 *   EXPO_PUBLIC_API_URL=https://api.tuapp.com
 *   EXPO_PUBLIC_ENV=production
 * 
 * Usa dotenv para cargarlas según el entorno:
 *   npm install dotenv
 *   npx expo start --dev-client
 */

/**
 * Para debugging adicional, considera agregar:
 * 
 * if (__DEV__) {
 *   // React DevTools
 *   require('react-devtools');
 *   
 *   // Configurar Reactotron (opcional)
 *   if (global.Reactotron) {
 *     console.tron = global.Reactotron;
 *   }
 * }
 */