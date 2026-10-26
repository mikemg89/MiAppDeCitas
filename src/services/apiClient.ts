// src/services/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "./authTokenManager";
import { getRefreshToken, deleteRefreshToken } from "./secureStorage";

const apiClient = axios.create({
  // Usamos la variable de entorno que configuramos en el .env
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. INTERCEPTOR DE PETICIÓN (Añade el token)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Variables para manejar múltiples peticiones simultáneas que fallen por 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. INTERCEPTOR DE RESPUESTA (Maneja la expiración del token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si el error es 401 (No autorizado) y no hemos intentado reintentar aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya se está refrescando el token, encolamos esta petición
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error("No hay refresh token");
        }

        // LLAMADA AL BACKEND (Esto lo implementaremos cuando creemos Node.js)
        // Aquí el backend nos devolverá un nuevo Access Token
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          {
            refreshToken,
          },
        );

        const newAccessToken = response.data.accessToken;
        // Si el backend rota el refresh token, aquí lo guardaríamos de nuevo:
        // await saveRefreshToken(response.data.refreshToken);

        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Si el Refresh Token también expiró o es inválido, cerramos sesión
        clearAccessToken();
        await deleteRefreshToken();
        processQueue(refreshError, null);
        // Aquí a futuro redirigiremos al Login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
