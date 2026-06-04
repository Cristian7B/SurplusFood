# SurplusFood 🌿

**Plataforma móvil de redistribución de alimentos en Bogotá.**
Conecta cafeterías y restaurantes que tienen excedentes de comida con beneficiarios que los necesitan, dentro de un radio de 3 km alrededor de la Universidad Distrital Francisco José de Caldas.

---
**[Manual de Usuario](./ManualUsuario.md)** | **[Manual de Desarrolladores](./ManualDev.md)**

## Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Tecnologías](#tecnologías)
3. [Arquitectura](#arquitectura)
4. [Roles y flujos](#roles-y-flujos)
5. [Setup backend](#setup-backend)
6. [Setup frontend](#setup-frontend)
7. [Setup Android Studio](#setup-android-studio)
8. [Variables de entorno](#variables-de-entorno)
9. [Endpoints API](#endpoints-api)
10. [Notificaciones push](#notificaciones-push)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Usuarios de prueba](#usuarios-de-prueba)
13. [Problemas conocidos](#problemas-conocidos)
14. [Contribuir](#contribuir)

---

## Descripción general

SurplusFood permite que:
- **Donantes** (restaurantes, cafeterías, panaderías) publiquen surplus de alimentos con ubicación, horario de recogida y foto.
- **Beneficiarios** (estudiantes, comunidades) vean el surplus disponible en un mapa en tiempo real y sean asignados automáticamente por un algoritmo de matching.
- El sistema notifica push al beneficiario cuando tiene una asignación pendiente.
- El donante confirma la recogida cuando el beneficiario se presenta.

El radio operacional está limitado a **3 km desde la Universidad Distrital** (lat: 4.6351, lon: -74.0703).

---

## Tecnologías

### Backend
- **NestJS** — framework Node.js
- **Prisma** — ORM
- **PostgreSQL 17** + **PostGIS** — base de datos con soporte geoespacial
- **JWT** — autenticación
- **bcrypt** — hash de contraseñas
- **Firebase Admin SDK** — envío de notificaciones push
- **Swagger** — documentación API en `/api/docs`

### Frontend
- **React Native** 0.85.3 + **Expo** 56
- **Expo Router** — navegación basada en archivos (`frontend/app/`)
- **@rnmapbox/maps** — mapas Mapbox
- **expo-location** — GPS del dispositivo
- **expo-notifications** — notificaciones push
- **axios** — cliente HTTP
- **AsyncStorage** — persistencia de sesión

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                  App Móvil (Expo)                    │
│  expo-router → frontend/app/*.tsx                    │
│  Mapbox → pins de surplus en tiempo real             │
│  Push Notifications → Firebase                       │
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

---

## Roles y flujos

### Roles

| Rol | Descripción |
|---|---|
| `DONOR` | Publica surplus, confirma recogida |
| `BENEFICIARY` | Recibe asignaciones, recoge alimentos |
| `CHARITY` | Similar a BENEFICIARY (fundaciones verificadas) |
| `ADMIN` | Acceso completo |

### Flujo completo de un surplus

```
1. DONOR publica surplus → estado: PUBLISHED
2. Matching engine asigna → estado: ASSIGNED (con assignedUserId)
3. Beneficiario recibe push notification
4. Beneficiario abre app → ve banner → entra a /assignment
5. Beneficiario acepta → PATCH /surplus/:id/accept
6. Beneficiario va a recoger el alimento
7. DONOR confirma recogida → POST /surplus/:id/pickup → estado: PICKED_UP
   ó el surplus expira → estado: EXPIRED
```

---

## Setup backend

### Requisitos
- Node.js 18+
- PostgreSQL 17 + PostGIS (instalar PostGIS via Stack Builder)
- Java 17 (solo para el build del frontend)

### Pasos

```bash
cd SurplusFood/backend

# 1. Crear .env (ver sección Variables de entorno)

# 2. Instalar dependencias
npm install

# 3. Crear base de datos
# En pgAdmin o psql: CREATE DATABASE surplusfood;

# 4. Correr migraciones
npx prisma migrate dev

# 5. Poblar con datos de prueba
npx prisma db seed

# 6. Iniciar servidor
npm run start:dev
# → API en http://localhost:3000/api
# → Swagger en http://localhost:3000/api/docs
```

> **Importante:** Correr `npx prisma migrate dev` después de cada `git pull`. Puede haber nuevas migraciones.

---

## Setup frontend

### Requisitos
- Node.js 18+
- Java 17 (Temurin) — https://adoptium.net/temurin/releases/?version=17
- Android Studio con emulador Pixel 7 (ver sección Android Studio)
- El proyecto debe estar en una **ruta sin espacios** — ej: `D:\SurplusFood\`

### Pasos

```bash
cd SurplusFood/frontend

# 1. Crear .env (ver sección Variables de entorno — pedir valores al equipo)

# 2. Poner archivos de Firebase (pedir al equipo — no están en el repo):
# - google-services.json → en SurplusFood/frontend/ (raíz del frontend)

# 3. Instalar dependencias
npm install

# 4. Iniciar (emulador debe estar prendido primero)
npx expo run:android
```

> **Primera compilación:** puede tardar 15-20 minutos. Las siguientes son más rápidas.
> **Si algo falla:** `npx expo run:android --no-build-cache`

---

## Setup Android Studio

### 1. Instalación inicial

Descargar Android Studio desde https://developer.android.com/studio

### 2. SDK Manager — instalar componentes necesarios

Tools → SDK Manager:

**SDK Platforms:** Android 17 "CinnamonBun" (API 37)

**SDK Tools:** NDK (Side by side), Android Emulator, AEHD

### 3. Crear emulador

Device Manager → `+` → Pixel 7 → Android 17 (CinnamonBun, x86_64) → Finish

### 4. Habilitar virtualización en BIOS (una sola vez)

**AMD:** BIOS → Chipset → **SVM Mode** → Enabled → F10

**Intel:** BIOS → Advanced → **Intel Virtualization Technology** → Enabled → F10

Luego: Device Manager → Install AEHD

### 5. Simular GPS

Con el emulador corriendo → `...` (Extended Controls) → Location → buscar "Bogota" → Set Location

### 6. Configurar local.properties

Crear `SurplusFood/frontend/android/local.properties` (no subir al repo):
```
sdk.dir=C\:\\Users\\TuUsuario\\AppData\\Local\\Android\\Sdk
```

---

## Variables de entorno

> ⚠️ Nunca subir los archivos `.env` al repositorio. Pedir los valores reales al equipo.

### backend/.env

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/surplusfood
JWT_SECRET=<pedir al equipo>
```

### frontend/.env

```env
EXPO_PUBLIC_MAPBOX_TOKEN=<pedir al equipo>
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=<pedir al equipo>

EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api       # Emulador Android
# EXPO_PUBLIC_API_URL=http://192.168.X.X:3000/api   # Celular físico (misma WiFi)

EAS_PROJECT_ID=<pedir al equipo>
```

> **Para celular físico:** obtener IP con `ipconfig` → "Dirección IPv4" del WiFi. El celular y el PC deben estar en la misma red.

---

## Endpoints API

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

## Notificaciones push

### Flujo

1. Al hacer login, el frontend registra el dispositivo con `registerForPushNotifications()`
2. El token Expo Push se envía al backend y se guarda en la BD
3. El matching engine asigna un surplus → backend envía push via Firebase
4. El usuario toca la notificación → la app navega a `/assignment`

### Archivos clave

| Archivo | Descripción |
|---|---|
| `frontend/src/services/pushNotifications.ts` | Registro de token, configuración handler |
| `frontend/app/_layout.tsx` | Listeners de notificaciones foreground/background |
| `backend/src/notifications/notifications.service.ts` | Envío via Firebase Admin SDK |
| `frontend/google-services.json` | Credenciales Firebase Android (no en repo — pedir al equipo) |
| `backend/surplusfood-firebase-adminsdk-*.json` | Credenciales Firebase Admin (no en repo — pedir al equipo) |

---

## Estructura del proyecto

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
    │   ├── context/
    │   │   └── AuthContext.tsx     # token, role, user, login, logout
    │   ├── services/
    │   │   ├── api.ts              # axios instance con baseURL y JWT header
    │   │   ├── auth.service.ts     # login/register helpers
    │   │   └── pushNotifications.ts
    │   └── theme/
    │       └── colors.ts           # paleta verde/crema
    └── google-services.json        # Firebase Android (no en repo)
```

---

## Usuarios de prueba

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

## Problemas conocidos

| Error | Causa | Solución |
|---|---|---|
| Build falla "ruta muy larga" | Espacios en ruta del proyecto | Mover a `D:\SurplusFood\` |
| `AEHD not installed` | Virtualización desactivada | Habilitar SVM/VT-x en BIOS |
| Error 401 en la app | Backend no corriendo o seed no ejecutado | `npm run start:dev` + `npx prisma db seed` |
| Mapa en blanco | Token Mapbox faltante o build viejo | Verificar `.env` + `--no-build-cache` |
| GPS no disponible | Emulador sin ubicación simulada | Extended Controls → Location → Bogota |
| `404 on /accept` | Llamando POST en vez de PATCH | Usar `api.patch()` |
| Primer build lento (15-20 min) | NDK compilando native libs | Normal — las siguientes son rápidas |

---

## Contribuir

1. `git pull origin develop` antes de empezar
2. Crear rama: `git checkout -b feature/nombre-feature`
3. `npx prisma migrate dev` si hay cambios en el schema
4. PR hacia `develop` con descripción de cambios y pantallas afectadas

---

**SurplusFood · Universidad Distrital Francisco José de Caldas · Bogotá 🌿**
