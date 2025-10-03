// src/index.js (o index.js en la raíz del proyecto)
// Debe ser el primer import:
import "react-native-gesture-handler";

import { registerRootComponent } from "expo";
import { enableScreens } from "react-native-screens";

// Activa screens nativas para mejor perf en navegación
enableScreens(true);

// Expo inyecta las envs en process.env.* si usas .env con EXPO_PUBLIC_*
// (No hay que hacer nada extra; esto solo ayuda a debug)
if (__DEV__) {
  const api = process?.env?.EXPO_PUBLIC_API_URL;
  // eslint-disable-next-line no-console
  console.log("[ENV] EXPO_PUBLIC_API_URL:", api);
}

import App from "./App";

// Registra la app (Expo Go o build nativo)
registerRootComponent(App);
