# MiAppDeCitas

App móvil de DateApp — Expo SDK 58 · React Native 0.88 · TypeScript.

> **Documentación del proyecto:** vive en el repo del backend →
> [mi-app-backend/docs](https://github.com/mikemg89/mi-app-backend/tree/main/docs)
> Empieza por [`00-mvp-sin-presupuesto.md`](https://github.com/mikemg89/mi-app-backend/blob/main/docs/00-mvp-sin-presupuesto.md).
> Este README solo cubre cómo correr la app y en qué estado está.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env      # apuntar EXPO_PUBLIC_API_URL al backend
npx expo start
```

| Variable | Ejemplo |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.20:3000` (tu IP local, no `localhost`, si pruebas en teléfono) |

> ⚠️ La variable **debe** incluir el prefijo `/api` cuando se conecte al backend actual, porque las
> rutas están montadas en `/api/auth/*`. Hoy el cliente construye las URLs sin ese prefijo
> (ver “Problemas conocidos”).

---

## Estado actual

Esqueleto + capa de red. **No hay pantallas todavía.**

| Pieza | Estado |
|---|---|
| `App.tsx` | Plantilla por defecto de Expo |
| `src/services/apiClient.ts` | Axios con interceptor de token y cola de refresh en 401 |
| `src/services/authTokenManager.ts` | Access token en memoria |
| `src/services/secureStorage.ts` | Refresh token en Keychain / Keystore |
| `src/screens`, `components`, `navigation`, `hooks`, `types`, `utils` | Vacías |
| Navegación | **No instalada** |
| Lint | **Sin configurar** |

---

## Problemas conocidos

| # | Problema | Impacto |
|---|---|---|
| 1 | `baseURL` sin `/api` y `.env` con el placeholder `https://api.tuapp.com` | Toda llamada da 404 o error de red |
| 2 | `apiClient` llama a `/auth/refresh`, que **no existe** en el backend | El interceptor de 401 siempre acaba cerrando sesión |
| 3 | Sin `expo-router` ni `@react-navigation/*` | No se puede navegar |
| 4 | Sin `timeout` en axios | Peticiones que se cuelgan para siempre en red móvil |
| 5 | Sin `eas.json` ni `bundleIdentifier` / `package` | `eas build` pedirá datos interactivamente |
| 6 | `npm run web` falla: faltan `react-dom` y `react-native-web` | Solo afecta desarrollo web |
| 7 | `AGENTS.md` exige Expo Router con rutas en `src/app/`, pero no está instalado ni existe esa carpeta | Contradicción a resolver antes de escribir pantallas |

---

## Decisión pendiente: navegación

`AGENTS.md` manda **Expo Router** (`src/app/`). La estructura actual (`src/screens`,
`src/navigation`) sugiere React Navigation. Hay que elegir una y alinear el resto:

```bash
# Opción A — Expo Router (recomendada, es la que documenta AGENTS.md)
npx expo install expo-router react-native-safe-area-context react-native-screens

# Opción B — React Navigation
npx expo install @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context
```

En cualquiera de las dos, el `main` de `package.json` cambia (`expo-router/entry` en el caso A).

---

## Verificación facial: implicación inmediata

Cualquier SDK de identidad (FaceTec, proveedores KYC, etc.) es **código nativo**:

- **No funciona en Expo Go.** Requiere *development build*:
  `npx expo run:android` o `eas build --profile development`.
- Requiere `app.json` con `scheme`, `ios.bundleIdentifier` y `android.package`.
- El plan y los criterios están en [`docs/03-spike-kyc.md`](https://github.com/mikemg89/mi-app-backend/blob/main/docs/03-spike-kyc.md).

No integres el SDK antes de cerrar la Fase 0 del roadmap.

---

## Comandos

```bash
npx expo start          # servidor de desarrollo
npx expo install <pkg>  # SIEMPRE esto en vez de npm install para paquetes nativos
npx tsc --noEmit        # typecheck
npx expo lint           # lint (la primera vez lo configura)
npx expo-doctor         # diagnóstico de dependencias
```
