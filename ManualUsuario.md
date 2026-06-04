# Manual de Usuario — SurplusFood 🌿

**Versión:** 1.0 | **Plataforma:** Android

---

## ¿Qué es SurplusFood?

SurplusFood es una aplicación móvil que conecta a restaurantes, cafeterías y panaderías de Bogotá que tienen alimentos sobrantes (surplus) con personas o fundaciones que los necesitan. Todo ocurre dentro de un radio de **3 km alrededor de la Universidad Distrital**.

---

## Primeros pasos

### Crear una cuenta

1. Abre la app — verás la pantalla de bienvenida
2. Toca **"Crear cuenta"**
3. Elige tu tipo de cuenta:
   - **Soy donante** — si eres un restaurante, cafetería o negocio de alimentos
   - **Soy beneficiario** — si eres una persona u organización que quiere recibir alimentos
4. Llena tus datos: nombre, correo y contraseña (mínimo 6 caracteres)
5. Toca **"Crear cuenta"** — serás llevado directamente al mapa

### Iniciar sesión

1. En la pantalla de bienvenida, toca **"Iniciar sesión"**
2. Ingresa tu correo y contraseña
3. Toca **"Iniciar sesión"**

---

## Para Donantes 🏪

### Publicar un surplus

1. En el mapa principal, toca el botón **"+ Publicar"** (esquina superior derecha)
2. Completa el formulario:
   - **Foto:** toca el área de foto para seleccionar una imagen del alimento
   - **Descripción:** describe el alimento (ej: "Arroz con pollo, 10 porciones")
   - **Cantidad (kg):** peso aproximado del surplus
   - **Hora de cierre:** hasta qué hora está disponible para recoger
   - **Ubicación:** se captura automáticamente con el GPS — asegúrate de tener el permiso de ubicación activado
3. Toca **"Publicar surplus"**

> **Reglas importantes:**
> - El surplus debe ser recogido el mismo día que se publica (Bogotá, hora local)
> - La hora de inicio de recogida debe ser dentro de las próximas 4 horas
> - La ventana de recogida debe ser de mínimo 30 minutos y máximo 3 horas
> - La ubicación debe estar dentro de los 3 km alrededor de la Universidad Distrital

### Ver tus publicaciones

En el mapa verás tus surplus publicados como marcadores. Toca cualquier marcador para ver el detalle.

### Confirmar una recogida

Cuando un beneficiario va a recoger el alimento:

1. El surplus aparecerá en estado **"Asignado"** (marcador amarillo)
2. Toca el marcador → modal de detalle → toca **"Confirmar recogida"**
3. El surplus pasará a estado **"Recogido"** ✅

> Solo puedes confirmar la recogida dentro de la ventana horaria establecida.

### Expirar un surplus

Si ya no tienes el alimento disponible:

1. Toca el marcador del surplus en el mapa
2. En el modal de detalle → toca **"Marcar como expirado"**
3. Confirma la acción

---

## Para Beneficiarios 🎓

### Ver surplus disponibles

Al abrir la app, el mapa mostrará todos los surplus disponibles cerca de ti como marcadores de colores:

- 🟢 **Verde** — disponible
- 🟡 **Amarillo** — asignado (en proceso)

Toca cualquier marcador para ver los detalles: tipo de alimento, cantidad, horario de recogida y tiempo restante.

### Cambiar entre mapa y lista

En la parte superior del mapa, toca los botones:
- **🗺️ Mapa** — vista de mapa con marcadores
- **📋 Lista** — vista de lista con todos los surplus ordenados por distancia

### Cómo funciona la asignación

No necesitas "reclamar" un surplus manualmente. El sistema tiene un **algoritmo de matching** que te asigna automáticamente el surplus más apropiado según tu ubicación y disponibilidad.

Cuando el algoritmo te asigne un surplus:
1. Recibirás una **notificación push** en tu celular
2. Aparecerá un **banner verde** en la pantalla principal: "¡Tienes un surplus asignado!"
3. Tienes **15 minutos** para responder

### Aceptar o rechazar una asignación

Cuando tengas una asignación pendiente:

1. Toca el banner verde **"¡Tienes un surplus asignado!"** (o la notificación)
2. Verás los detalles: qué alimento es, cuándo y dónde recogerlo, y quién dona
3. Toca **"✅ Aceptar y recoger"** para confirmar que irás a buscar el alimento
4. Toca **"✕ Rechazar"** si no puedes ir

> **¡Importante!** Rechazar baja tu puntaje de confiabilidad. Si acumulas 3 no-shows serás excluido del algoritmo de matching por 48 horas.

### Ver tu historial

Toca el ícono 📋 en la esquina superior derecha del mapa para ver tu historial de surplus recibidos.

---

## Perfil y estadísticas 👤

Toca el ícono 👤 en la esquina superior derecha para abrir tu perfil (Dashboard).

### Puntaje de confiabilidad (beneficiarios)

Tu puntaje va de 0% a 100%. Sube cuando recoges surplus exitosamente. Baja cuando rechazas o no te presentas.

| Puntaje | Estado |
|---|---|
| 80% - 100% | Excelente — tienes prioridad en el algoritmo |
| 50% - 79% | Regular |
| 0% - 49% | Bajo — menor prioridad |

### No-shows

Un "no-show" ocurre cuando tienes un surplus asignado y no te presentas a recogerlo o lo rechazas. Si llegas a **3 no-shows** serás excluido del matching por 48 horas.

---

## Notificaciones

Para recibir notificaciones cuando te asignen un surplus, asegúrate de:

1. Permitir notificaciones cuando la app lo solicite
2. Tener conexión a internet

Si tocas la notificación mientras la app está cerrada, la app abrirá directamente en la pantalla de tu asignación.

---

## Permisos requeridos

| Permiso | Para qué se usa |
|---|---|
| **Ubicación** | Mostrar surplus cercanos y calcular distancias |
| **Notificaciones** | Alertarte cuando te asignen un surplus |
| **Galería / Cámara** | Subir foto del alimento (solo donantes) |

---

## Preguntas frecuentes

**¿Por qué no veo surplus en el mapa?**
El mapa solo muestra surplus dentro de los 3 km alrededor de la Universidad Distrital. Si no hay surplus publicados en ese momento, el mapa aparecerá vacío.

**¿Puedo publicar surplus desde cualquier lugar de Bogotá?**
No. La ubicación de recogida del surplus debe estar dentro del radio de 3 km de la Universidad Distrital.

**¿Qué pasa si no puedo ir a recoger el surplus que acepté?**
Entra a la pantalla de asignación y rechaza el surplus. Tu puntaje bajará pero es mejor que un no-show. Comunícate con el donante si es posible.

**¿Cuánto tiempo tengo para recoger el alimento?**
Depende de la ventana horaria que definió el donante. Puedes ver la hora de inicio y fin en los detalles del surplus.

**¿La app funciona sin internet?**
No. La app requiere conexión a internet para mostrar el mapa, cargar surplus y recibir notificaciones.

**¿Cómo sé dónde exactamente está el punto de recogida?**
El mapa muestra la ubicación del surplus con un marcador. El donante define la dirección exacta cuando publica.

---

## Soporte

Si tienes problemas con la app, contacta al equipo de SurplusFood a través de los canales del proyecto.

---

**SurplusFood · Bogotá 🌿 · Reduciendo el desperdicio, alimentando la comunidad**
