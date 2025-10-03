import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Helper: abrir sesión OAuth con timeout
async function openAuthAsync(req) {
  const res = await req.promptAsync({ useProxy: true, showInRecents: true });
  if (res.type !== "success") throw new Error(res.type === "dismiss" ? "Operación cancelada" : "No se pudo autenticar");
  return res;
}

// GOOGLE
export async function signInWithGoogle() {
  const extra = Constants?.expoConfig?.extra ?? {};
  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };

  const redirectUri = AuthSession.makeRedirectUri({ scheme: Constants?.expoConfig?.scheme || "civihelper" });

  const request = new AuthSession.AuthRequest({
    clientId:
      Platform.select({
        ios: extra.googleIosClientId,
        android: extra.googleAndroidClientId,
        default: extra.googleWebClientId,
      }) || extra.googleWebClientId,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Code,
    extraParams: { access_type: "offline", prompt: "consent" }
  });

  await request.makeAuthUrlAsync(discovery);
  const res = await openAuthAsync(request);
  // Intercambia el "code" por tokens en tu backend para mayor seguridad (PKCE)
  return { provider: "google", params: res.params };
}

// FACEBOOK
export async function signInWithFacebook() {
  const extra = Constants?.expoConfig?.extra ?? {};
  const discovery = {
    authorizationEndpoint: "https://www.facebook.com/v13.0/dialog/oauth",
    tokenEndpoint: "https://graph.facebook.com/v13.0/oauth/access_token",
  };

  const redirectUri = AuthSession.makeRedirectUri({ scheme: Constants?.expoConfig?.scheme || "civihelper" });

  const request = new AuthSession.AuthRequest({
    clientId: extra.facebookAppId,
    redirectUri,
    scopes: ["public_profile", "email"],
    responseType: AuthSession.ResponseType.Code,
  });

  await request.makeAuthUrlAsync(discovery);
  const res = await openAuthAsync(request);
  // Igual que Google, cambia el "code" por token en tu backend
  return { provider: "facebook", params: res.params };
}

// APPLE (iOS)
export async function signInWithApple() {
  if (Platform.OS !== "ios") throw new Error("Apple Sign-In solo está disponible en iOS");
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  // Envíalo a tu backend para verificar el identityToken con Apple
  return { provider: "apple", credential };
}
