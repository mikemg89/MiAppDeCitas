import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "miAppDeCitas_refreshToken";

/**
 * Guarda el Refresh Token de forma segura.
 * Usa el Keychain (iOS) / Keystore (Android) a través de expo-secure-store.
 */
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      // 'WHEN_UNLOCKED' asegura que el token solo sea accesible
      // cuando el dispositivo está desbloqueado.
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error("Error guardando el refresh token de forma segura:", error);
    throw error;
  }
}

/**
 * Recupera el Refresh Token almacenado de forma segura.
 * Devuelve null si no existe.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error leyendo el refresh token:", error);
    return null;
  }
}

/**
 * Elimina el Refresh Token (para el logout o al detectar un token inválido).
 */
export async function deleteRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error eliminando el refresh token:", error);
    throw error;
  }
}
