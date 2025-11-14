// src/services/apiClient.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'civihelper_token';

// Importar configuración
let ENV;
try {
  ENV = require('../config/env').default;
} catch (error) {
  console.warn('[apiClient] No se pudo cargar env.js, usando default');
  ENV = { apiUrl: 'http://192.168.1.4:4000' };
}

// Usar la configuración centralizada
const apiClient = axios.create({
  baseURL: ENV?.apiUrl || 'http://192.168.1.4:4000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('[apiClient] Inicializado con URL:', apiClient.defaults.baseURL);

// Interceptor para agregar el token JWT
apiClient.interceptors.request.use(
  async (config) => {
    try {
      let token = null;
      
      // Obtener token desde SecureStore o localStorage
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        token = localStorage.getItem(STORAGE_KEY);
      } else {
        token = await SecureStore.getItemAsync(STORAGE_KEY);
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[apiClient] Error obteniendo token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 (no autorizado) y no es un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Limpiar token
      try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          await SecureStore.deleteItemAsync(STORAGE_KEY);
        }
      } catch (err) {
        console.error('[apiClient] Error limpiando token:', err);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;