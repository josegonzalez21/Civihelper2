// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, me, setAuthToken, clearAuthToken } from "../services/api";

const TOKEN_KEY = "civihelper_token";
const isWeb = Platform.OS === "web";

// --- storage cross-platform (SecureStore nativo, localStorage web) ---
async function storageSet(key, value) {
  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value, { keychainService: "civihelper" });
  }
}
async function storageGet(key) {
  if (isWeb && typeof localStorage !== "undefined") {
    return localStorage.getItem(key) ?? null;
  }
  return (await SecureStore.getItemAsync(key, { keychainService: "civihelper" })) ?? null;
}
async function storageDel(key) {
  if (isWeb && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key, { keychainService: "civihelper" });
  }
}

// --- Context ---
export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  signIn: async (_email, _password) => {},
  signUp: async (_payload) => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión al iniciar la app
  useEffect(() => {
    (async () => {
      try {
        const t = await storageGet(TOKEN_KEY);
        if (t) {
          setToken(t);
          setAuthToken(t); // inyecta Authorization en requests
          try {
            const profile = await me();
            setUser(profile?.user ?? profile ?? null);
          } catch {
            // token inválido: limpiamos
            await storageDel(TOKEN_KEY);
            clearAuthToken();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email, password) => {
    // api.login viene de services/api (export const api = { login, register, ... })
    const data = await api.login(String(email).trim().toLowerCase(), String(password));
    if (data?.token) {
      await storageSet(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user ?? null);
    }
    return data;
  };

  const signUp = async ({ name, email, password, role = "CLIENT" }) => {
    const data = await api.register(
      String(name).trim(),
      String(email).trim().toLowerCase(),
      String(password),
      role
    );
    if (data?.token) {
      await storageSet(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user ?? null);
    }
    return data;
  };

  const signOut = async () => {
    await storageDel(TOKEN_KEY);
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    const profile = await me(); // requiere Authorization ya seteado
    const normalized = profile?.user ?? profile ?? null;
    setUser(normalized);
    return normalized;
  };

  const value = useMemo(
    () => ({ user, token, loading, signIn, signUp, signOut, refresh }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook de conveniencia
export const useAuth = () => useContext(AuthContext);
