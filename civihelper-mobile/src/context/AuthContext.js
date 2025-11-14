// src/context/AuthContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEYS = {
  token: "civihelper_token", // Cambio: debe coincidir con LoginScreen
  user: "civihelper_user",   // Cambio: debe coincidir con LoginScreen
};

const AuthContext = createContext({
  loading: true,
  token: null,
  user: null,
  isAuthenticated: false,
  login: async (_token, _user) => {},
  logout: async () => {},
  signOut: async () => {},       // alias por compatibilidad
  setUser: () => {},
  setToken: () => {},
  refreshFromStorage: async () => {},
  refresh: async () => {},       // alias para compatibilidad con código antiguo
});

function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const refreshFromStorage = useCallback(async () => {
    try {
      console.log("[AuthContext] Cargando datos desde storage...");
      
      let savedToken = null;
      let savedUser = null;

      // Soporte para web y móvil
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        savedToken = localStorage.getItem(STORAGE_KEYS.token);
        savedUser = localStorage.getItem(STORAGE_KEYS.user);
      } else {
        [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.token),
          SecureStore.getItemAsync(STORAGE_KEYS.user),
        ]);
      }

      if (savedToken) {
        console.log("[AuthContext] Token encontrado");
        setToken(savedToken);
      } else {
        console.log("[AuthContext] No se encontró token");
      }

      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log("[AuthContext] Usuario cargado:", parsedUser?.email || "sin email");
          setUser(parsedUser);
        } catch (err) {
          console.error("[AuthContext] Error parseando usuario:", err);
          setUser(null);
        }
      }
    } catch (err) {
      console.error("[AuthContext] Error en refreshFromStorage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  const login = useCallback(async (nextToken, nextUser) => {
    console.log("[AuthContext] login() llamado", {
      hasToken: !!nextToken,
      hasUser: !!nextUser,
    });

    setToken(nextToken ?? null);
    setUser(nextUser ?? null);

    try {
      // Soporte para web y móvil
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        if (nextToken) {
          localStorage.setItem(STORAGE_KEYS.token, nextToken);
        } else {
          localStorage.removeItem(STORAGE_KEYS.token);
        }
        
        if (nextUser) {
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
        } else {
          localStorage.removeItem(STORAGE_KEYS.user);
        }
      } else {
        await Promise.all([
          nextToken 
            ? SecureStore.setItemAsync(STORAGE_KEYS.token, nextToken)
            : SecureStore.deleteItemAsync(STORAGE_KEYS.token),
          nextUser
            ? SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(nextUser))
            : SecureStore.deleteItemAsync(STORAGE_KEYS.user),
        ]);
      }

      console.log("[AuthContext] Sesión guardada exitosamente");
    } catch (err) {
      console.error("[AuthContext] Error guardando sesión:", err);
      throw err;
    }
  }, []);

  const _clearStorage = useCallback(async () => {
    console.log("[AuthContext] Limpiando storage...");
    
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
      } else {
        await Promise.all([
          SecureStore.deleteItemAsync(STORAGE_KEYS.token).catch(() => {}),
          SecureStore.deleteItemAsync(STORAGE_KEYS.user).catch(() => {}),
        ]);
      }
      console.log("[AuthContext] Storage limpiado");
    } catch (err) {
      console.error("[AuthContext] Error limpiando storage:", err);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthContext] logout() llamado");
    setToken(null);
    setUser(null);
    await _clearStorage();
  }, [_clearStorage]);

  // Alias para no romper pantallas que llamen signOut()
  const signOut = logout;

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      isAuthenticated: !!token,
      login,
      logout,
      signOut,
      setUser,
      setToken,
      refreshFromStorage,
      refresh: refreshFromStorage, // Alias para compatibilidad con código antiguo
    }),
    [loading, token, user, login, logout, signOut, refreshFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

export { AuthProvider, useAuth, AuthContext };
export default AuthProvider;