// src/config/env.js

// Configuración directa sin dependencias de Constants
const API_URL = 'http://192.168.1.4:4000';

const ENV = {
  dev: {
    apiUrl: API_URL,
    wsUrl: API_URL,
  },
  staging: {
    apiUrl: 'https://staging-api.civihelper.com',
    wsUrl: 'https://staging-api.civihelper.com',
  },
  prod: {
    apiUrl: 'https://api.civihelper.com',
    wsUrl: 'https://api.civihelper.com',
  },
};

// Usar siempre dev en desarrollo
const config = __DEV__ ? ENV.dev : ENV.prod;

// Log para debugging
console.log('[ENV] Configuración cargada:', config);

export default config;