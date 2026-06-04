# SurplusFood 🌿 — Manual de Desarrollador

**Setup local · Arquitectura · API · Configuración Android**
Universidad Distrital Francisco José de Caldas · v1.0 — 31/05/2026

---

## ⚠️ LEER ESTO PRIMERO

### El frontend usa EXPO ROUTER, no React Navigation

| Carpeta | Estado | Descripción |
|---|---|---|
| `frontend/app/` | ✅ **ACTIVO** | Expo-router — pantallas reales |
| `frontend/src/screens/` | ❌ **INACTIVO** | Legacy, no tocar |
| `frontend/src/navigation/AppNavigator.tsx` | ❌ **INACTIVO** | No se usa |

**Todo cambio de UI va en `frontend/app/` ÚNICAMENTE.**

### La app es MÓVIL, no web

- Layouts: columna única, scroll vertical, touch targets mínimo 48x48dp
- Mapas: `@rnmapbox/maps` — NO Leaflet, NO react-native-maps
- Probar en emulador Android Studio (Pixel 7) o celular físico

### Seguridad — variables de entorno

> ❌ NUNCA subir `.env`, `google-services.json` ni `firebase-adminsdk-*.json` al repo.
> Pedir todos los valores sensibles al equipo.
> Si se subieron tokens reales → rotarlos inmediatamente en Mapbox y Firebase.

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Arquitectura](#2-arquitectura)
3. [Requisitos previos](#3-requisitos-previos)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Setup backend](#5-setup-backend)
6. [Setup frontend](#6-setup-frontend)
7. [Configuración Android Studio](#7-configuración-android-studio)
8. [Endpoints API](#8-endpoints-api)
9. [Roles y flujo](#9-roles-y-flujo)
10. [Notificaciones push](#10-notificaciones-push)
11. [Usuarios de prueba](#11-usuarios-de-prueba)
12. [Bugs pendientes](#12-bugs-pendientes)
13. [Problemas conocidos](#13-problemas-conocidos)
14. [Flujo de trabajo en equipo](#14-flujo-de-trabajo-en-equipo)

---

## 1. Stack tecnológico

### Backend

| Tecnología | Uso |
|---|---|
| NestJS | Framework Node.js — estructura modular |
| Prisma | ORM — modelos, migraciones, seed |
| PostgreSQL 17 + PostGIS | BD con soporte geoespacial — radio 3km |
| JWT + bcrypt | Autenticación y hash de contraseñas |
| Firebase Admin SDK | Envío de notificaciones push |
| Swagger | `/api/docs` — documentación interactiva |

### Frontend

| Tecnología | Uso |
|---|---|
| React Native 0.85.3 + Expo 56 | Base de la app móvil |
| Expo Router | Navegación basada en archivos (`frontend/app/`) |
| @rnmapbox/maps | Mapas Mapbox con pins de surplus |
| expo-location | GPS del dispositivo |
| expo-notifications | Notificaciones push |
| axios | Cliente HTTP — instancia en `src/services/api.ts` |
| AsyncStorage | Persistencia de sesión (token JWT) |

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                  App Móvil (Expo)                    │
│  expo-router → frontend/app/*.tsx                    │
│  Mapbox → pins de surplus en tiempo real             │
│  Push Notifications ← Firebase                       │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────────────────────┐
│              Backend NestJS                          │
│  /api/auth     /api/surplus    /api/users            │
│  JWT Auth      PostGIS Geo     Matching Engine       │
│  Firebase Admin SDK → Push Notifications             │
└──────────────────┬──────────────────────────────────┘
                   │ Prisma ORM
┌──────────────────▼──────────────────────────────────┐
│         PostgreSQL 17 + PostGIS                      │
│  Surplus · Users · Migrations · Seed                 │
└─────────────────────────────────────────────────────┘
```

### Estructura de carpetas

```
SurplusFood/
├── backend/
│   ├── src/
│   │   ├── auth/           # AuthService, AuthController, JWT, DTOs
│   │   ├── surplus/        # SurplusService, SurplusController, estados
│   │   ├── matching/       # MatchingService — algoritmo de asignación
│   │   ├── notifications/  # NotificationsService — push con Firebase
│   │   ├── geo/            # GeoService — PostGIS, radio 3km U. Distrital
│   │   ├── users/          # UsersController, UsersService
│   │   └── prisma/         # PrismaService
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts
└── frontend/
    ├── app/                        # ✅ ACTIVO — expo-router (pantallas reales)
    │   ├── _layout.tsx             # Root layout, splash, notificaciones push
    │   ├── index.tsx               # Redirect según token
    │   ├── landing.tsx
    │   ├── login.tsx
    │   ├── register.tsx
    │   ├── home.tsx                # Mapa principal + lista surplus + modal detalle
    │   ├── assignment.tsx          # Aceptar/rechazar surplus asignado
    │   ├── dashboard.tsx           # Perfil + stats
    │   ├── history.tsx             # Historial del beneficiario
    │   └── publish-surplus.tsx     # Publicar surplus (solo DONOR)
    ├── src/
    │   ├── context/AuthContext.tsx     # token, role, user, login, logout
    │   ├── services/api.ts             # axios con baseURL y JWT header
    │   ├── services/auth.service.ts    # login/register helpers
    │   ├── services/pushNotifications.ts
    │   └── theme/colors.ts             # paleta verde/crema
    └── google-services.json            # Firebase Android (NO en repo)
```

---

## 3. Requisitos previos

- **Java 17 Temurin** — https://adoptium.net/temurin/releases/?version=17
  - ⚠️ Java 21 y 25 NO funcionan con el build actual
- **Node.js** 18+
- **PostgreSQL 17** + **PostGIS** (instalar PostGIS via Stack Builder)
- **Android Studio** con emulador Pixel 7 (ver sección 7)
- Proyecto en **ruta sin espacios** — ej: `D:\SurplusFood\`

---

## 4. Variables de entorno

### backend/.env

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/surplusfood
JWT_SECRET=<pedir al equipo>
```

También pedir al equipo: `surplusfood-firebase-adminsdk-*.json` → colocar en `backend/` (raíz).

### frontend/.env

```env
EXPO_PUBLIC_MAPBOX_TOKEN=<pedir al equipo>
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=<pedir al equipo>

EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api       # emulador Android
# EXPO_PUBLIC_API_URL=http://192.168.X.X:3000/api   # celular físico (ipconfig → IPv4 WiFi)

EAS_PROJECT_ID=<pedir al equipo>
```

También pedir al equipo: `google-services.json` → colocar en `frontend/` (raíz).

> Para celular físico: celular y PC en la misma red WiFi. Obtener IP con `ipconfig` → "Dirección IPv4" del WiFi.

---

## 5. Setup backend

```bash
cd D:\SurplusFood\backend

# 1. Crear backend/.env con los valores del equipo

# 2. Instalar dependencias
npm install

# 3. Crear base de datos (en pgAdmin o psql)
# CREATE DATABASE surplusfood;

# 4. Correr migraciones — SIEMPRE después de git pull
npx prisma migrate dev

# 5. Poblar con datos de prueba
npx prisma db seed

# 6. Iniciar servidor
npm run start:dev
# → API en http://localhost:3000/api
# → Swagger en http://localhost:3000/api/docs
```

> ⚠️ Correr `npx prisma migrate dev` después de **cada** `git pull`. Hay migraciones nuevas para el módulo de notificaciones.

---

## 6. Setup frontend

```bash
cd D:\SurplusFood\frontend

# 1. Crear frontend/.env y colocar google-services.json (pedir al equipo)

# 2. Instalar dependencias
npm install

# 3. Prender el emulador Android Studio primero (ver sección 7)

# 4. Compilar y lanzar
npx expo run:android
# Primera vez: 15-20 minutos (compila librerías nativas)
# Las siguientes son mucho más rápidas

# Si algo falla:
npx expo run:android --no-build-cache
```

---

## 7. Configuración Android Studio

### 7.1 SDK Manager — componentes requeridos

Tools → SDK Manager:

- **SDK Platforms:** Android 17 "CinnamonBun" (API 37)
- **SDK Tools:** NDK (Side by side), Android Emulator, AEHD

### 7.2 Crear emulador

Device Manager → `+` → Pixel 7 → Android 17 (CinnamonBun, x86_64) → Finish

### 7.3 Habilitar virtualización en BIOS (una sola vez)

| Procesador | Ruta | Opción |
|---|---|---|
| AMD | BIOS → Chipset | SVM Mode → Enabled → F10 |
| Intel | BIOS → Advanced | Intel Virtualization Technology → Enabled → F10 |

Luego en Android Studio: Device Manager → Install AEHD.

### 7.4 Gradle — configuración (ya aplicada en el repo)

| Config | Valor |
|---|---|
| Gradle version | 8.13 |
| Kotlin gradle plugin | 1.9.25 |
| Java | 17 (Temurin) |
| NDK | 27.1.12297006 |

Crear `frontend/android/local.properties` (no subir al repo):

```
sdk.dir=C\:\\Users\\TuUsuario\\AppData\\Local\\Android\\Sdk
```

### 7.5 Simular GPS

Con el emulador corriendo → `...` (Extended Controls) → Location → buscar "Bogota" → Set Location.

---

## 8. Endpoints API

### Autenticación

```
POST /api/auth/register    Body: { email, password, name, role }
POST /api/auth/login       Body: { email, password }
                           Response: { access_token, user: { id, name, email, role } }
```

### Usuarios

```
GET /api/users/me          Headers: Authorization: Bearer <token>
```

### Surplus

```
GET    /api/surplus                          Lista general (paginada)
GET    /api/surplus/nearby?lat&lon&radius    Surplus cercanos con distancia
GET    /api/surplus/my-assignment            Surplus asignado al usuario actual
GET    /api/surplus/my-history               Historial del usuario actual
GET    /api/surplus/:id                      Detalle de un surplus
POST   /api/surplus                          Crear surplus (DONOR)
PATCH  /api/surplus/:id                      Editar surplus (DONOR dueño)
DELETE /api/surplus/:id                      Eliminar surplus (DONOR dueño)
POST   /api/surplus/:id/match                Asignar a beneficiario (matching)
PATCH  /api/surplus/:id/accept               Aceptar asignación (BENEFICIARY) ← PATCH, no POST
POST   /api/surplus/:id/reject               Rechazar asignación (BENEFICIARY)
POST   /api/surplus/:id/pickup               Confirmar recogida (DONOR)
POST   /api/surplus/:id/expire               Expirar surplus (DONOR o ADMIN)
```

### Formato de errores

```json
{
  "success": false,
  "statusCode": 400,
  "error": ["mensaje de error"],
  "timestamp": "2026-05-31T...",
  "path": "/api/surplus/..."
}
```

> Leer siempre `response.data.error[0]` para el mensaje.

---

## 9. Roles y flujo

| Rol | Pantallas | Acciones |
|---|---|---|
| `DONOR` | Home, Publicar, Dashboard | Publicar surplus, confirmar pickup, expirar |
| `BENEFICIARY` | Home, Asignación, Historial, Dashboard | Ver mapa, aceptar/rechazar asignación, ver historial |
| `CHARITY` | Igual que BENEFICIARY | Diferenciación pendiente |
| `ADMIN` | Acceso completo | Todas las acciones |

### Flujo completo de un surplus

```
1. DONOR publica surplus → estado: PUBLISHED
2. Matching engine asigna → estado: ASSIGNED (con assignedUserId)
3. Beneficiario recibe push notification
4. Beneficiario abre app → ve banner → entra a /assignment
5. Beneficiario acepta → PATCH /surplus/:id/accept
6. Beneficiario va a recoger el alimento
7. DONOR confirma recogida → POST /surplus/:id/pickup → PICKED_UP
   ó el surplus expira → EXPIRED
```

---

## 10. Notificaciones push

**Servicio:** Firebase Admin SDK (backend) + Expo Push Notifications (frontend)

| Archivo | Descripción |
|---|---|
| `frontend/src/services/pushNotifications.ts` | Registro de token, configuración handler |
| `frontend/app/_layout.tsx` | Listeners foreground/background |
| `backend/src/notifications/notifications.service.ts` | Envío via Firebase Admin SDK |
| `frontend/google-services.json` | Credenciales Firebase Android (NO en repo) |
| `backend/surplusfood-firebase-adminsdk-*.json` | Credenciales Firebase Admin (NO en repo) |

**Flujo:**
1. Al hacer login, el frontend registra el dispositivo con `registerForPushNotifications()`
2. El token Expo Push se envía al backend y se guarda en la BD
3. El matching engine asigna un surplus → backend envía push via Firebase
4. El usuario toca la notificación → la app navega a `/assignment`

---

## 11. Usuarios de prueba

Correr `npx prisma db seed` en el backend para crear:

| Email | Contraseña | Rol |
|---|---|---|
| donor1@foodbridge.com | password123 | DONOR |
| donor2@foodbridge.com | password123 | DONOR |
| beneficiary1@foodbridge.com | password123 | BENEFICIARY |
| beneficiary2@foodbridge.com | password123 | BENEFICIARY |
| charity1@foodbridge.com | password123 | CHARITY |
| admin@foodbridge.com | password123 | ADMIN |

---

## 12. Bugs pendientes

### 🐛 Bug 1 — `accept()` no persiste en BD (CRÍTICO)

**Archivo:** `backend/src/surplus/surplus.service.ts`

El método `accept()` valida pero **no actualiza la BD**. Fix mínimo:

1. En `schema.prisma` → `model Surplus`: agregar `acceptedAt DateTime?`
2. En `accept()`:
```typescript
return this.prisma.surplus.update({
  where: { id },
  data: { acceptedAt: new Date() },
});
```
3. Correr `npx prisma migrate dev`

### 🐛 Bug 2 — Falta "Marcar como recogido" para BENEFICIARY

**Archivo:** `frontend/app/assignment.tsx`

El BENEFICIARY no puede confirmar el pickup desde su lado.

- Agregar botón en `assignment.tsx` cuando surplus está `ASSIGNED` y `acceptedAt != null`
- Evaluar abrir `POST /surplus/:id/pickup` también al BENEFICIARY asignado

---

## 13. Problemas conocidos

| Error | Causa | Solución |
|---|---|---|
| Build falla "ruta muy larga" | Espacios en ruta del proyecto | Mover a `D:\SurplusFood\` |
| `AEHD not installed` | Virtualización desactivada | Habilitar SVM/VT-x en BIOS → Install AEHD |
| Error 401 en la app | Backend no corriendo o seed faltante | `npm run start:dev` + `npx prisma db seed` |
| Mapa en blanco | Token Mapbox faltante o build viejo | Verificar `.env` + `--no-build-cache` |
| GPS no disponible | Emulador sin ubicación simulada | Extended Controls → Location → Bogota |
| `404 on /accept` | Llamando POST en vez de PATCH | Usar `api.patch()` |
| `accept()` no guarda nada | Bug en `surplus.service.ts` | Ver Bug 1, sección 12 |
| `ninja: manifest still dirty` | Ruta con espacios + CMake | Mover proyecto a ruta sin espacios |
| Primer build lento (15-20 min) | NDK compilando native libs | Normal — las siguientes son rápidas |

---

## 14. Flujo de trabajo en equipo

```bash
git pull origin develop        # siempre antes de empezar
git checkout -b feature/nombre-feature
# ... hacer cambios ...
npx prisma migrate dev         # si hay cambios en schema.prisma
# PR hacia develop con descripción de cambios y pantallas afectadas
```

---

**SurplusFood · Universidad Distrital Francisco José de Caldas · Bogotá 🌿**
