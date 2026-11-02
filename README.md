# INNOVATION NFC E.S.F. — Sistema de Gestión de Personal

Réplica del diseño **HR Management Dashboard** de Dribbble ([#25121521](https://dribbble.com/shots/25121521-HR-Management-Dashboard-Design)) con estética **Warm Minimalist / Creamy Premium**: fondos crema, acento amarillo mostaza, tarjetas bento y bordes muy redondeados.

## 📁 Estructura

```
hr-dashboard/
├── index.html              # Login + simulador NFC
├── dashboard.html          # Shell de gestión (sidebar, topbar, router hash)
├── areas.html              # Simulador NFC: control de acceso por zonas
├── asistencia.html         # Simulador NFC: marcaciones de jornada
├── start.sh                # Servidor local (python3 http.server 8765)
├── README.md
├── css/
│   ├── styles.css          # Entry point (@import)
│   ├── variables.css       # Design tokens
│   ├── reset.css           # Reset + base
│   ├── components.css      # Botones, inputs, badges, alerts
│   ├── login.css           # Login y modales
│   ├── dashboard.css       # Shell, sidebar, Panel, módulos
│   └── theme-carbon.css    # Tema global carbón
├── js/
│   ├── nfc-reader.js       # Seed v3 (octubre 2026), 50 empleados, 8 zonas, auditoría, reuniones, tickets, tarjetas, config
│   ├── session.js          # Sesión local (token, usuario, inactividad 15 min)
│   ├── login.js            # Solo 7 reales + ticket de soporte
│   ├── ui.js               # Helpers compartidos
│   ├── theme.js            # Tema global persistido (claro / carbón)
│   ├── chart-theme.js      # Tema de gráficos y ejes carbón
│   ├── dashboard.js        # Router, RBAC, menú dinámico por rol
│   └── modules/
│       ├── panel.js        # Panel funcional (perfil, semana, marcas, reuniones, contratos, accesos)
│       ├── personal.js     # Personal RRHH (tabla, filtros y ficha)
│       ├── horarios.js     # Horarios RRHH (filtros, gráficos y CSV)
│       ├── perfiles.js     # Ficha 360, justificaciones y alta
│       ├── reportes.js     # Constructor, PNG 4x y CSV
│       ├── calendario.js   # Calendario mensual, CRUD de reuniones e invitaciones
│       ├── tickets.js      # Bandeja funcional: filtros, detalle y gestión (Dueño)
│       ├── tarjetas.js     # Inventario, asignación, bloqueo y permisos NFC
│       └── configuracion.js # Tema, cuenta, seguridad, entorno y soporte
├── _legacy/                # Archivos antiguos que ya no se cargan
└── assets/
    ├── images/
    └── icons/
```

## 🚀 Ejecutar

```bash
cd hr-dashboard
./start.sh          # http://localhost:8765
# o directamente:
python3 -m http.server 8765
```

> **Modo `file://`:** el login y las páginas de acceso/asistencia funcionan abriendo
> `index.html` directamente. Como cada archivo `file://` tiene su propio
> `localStorage`, el login pasa el usuario al dashboard por URL
> (`dashboard.html?user=...`). Para probar el flujo completo con sesión
> persistente, usa el servidor local (`http://localhost:8765`).

## 🔐 Acceso al dashboard (solo 7 cuentas reales)

El login valida **usuario + email + contraseña exactos** contra la base local de
50 empleados de `js/nfc-reader.js`. **Solo las 7 cuentas con `esReal === true` pueden entrar al dashboard.** Los 43 restantes son datos para tablas y simulador.

| Usuario | Email | Contraseña | Rol dashboard | Área |
|---------|-------|------------|---------------|------|
| `achavezh` | `achavezh@innovation.nfc.esf` | `huaman123` | `dueno` | Dirección |
| `jalarconr` | `jalarconr@innovation.nfc.esf` | `riquelme123` | `jefe` | Gerencia |
| `apenap` | `apenap@innovation.nfc.esf` | `palomino123` | `jefe` | Gerencia |
| `acristobalm` | `acristobalm@innovation.nfc.esf` | `manuel123` | `jefe` | Gerencia |
| `zbordav` | `zbordav@innovation.nfc.esf` | `velazque123` | `rrhh` | RR.HH. |
| `jmamaniq` | `jmamaniq@innovation.nfc.esf` | `quispe123` | `rrhh` | RR.HH. |
| `acassusop` | `acassusop@innovation.nfc.esf` | `perez123` | `rrhh` | RR.HH. |

## ✨ Vistas

### Login (`index.html`)
- Split screen: formulario crema + visual cálido con tarjetas flotantes
- Calendario semanal en español (zona horaria `America/Lima`)
- Inputs tipo pill, botón **Iniciar Sesión** amarillo y toggle de contraseña
- Botones **Áreas de acceso** y **Asistencia** (simulador NFC)
- Modales flotantes de **Contactar a soporte** (crea ticket para el Dueño) y **Créditos del proyecto**

### Dashboard (`dashboard.html`) — **Bloque 0**
- **Sidebar** fijo (drawer en móvil < 980px) con menú dinámico por rol
- **Topbar** con buscador contextual, reloj en vivo, notificaciones y menú de usuario
- **Router por hash**: `#/panel`, `#/personal`, `#/horarios`, `#/perfiles`, `#/reportes`, `#/calendario`, `#/tickets`, `#/tarjetas`, `#/configuracion`
- **Guard de roles**: redirige a Panel si el usuario no tiene permiso
- **Buscador contextual**: filtra el módulo activo (Personal, Horarios, Perfiles, Reportes, Calendario, Tickets y Tarjetas). En Panel/Configuración se deshabilita con aviso claro.
- **Badge** “Octubre 2026” y fecha de corte **30/10/2026**
- **Módulos por rol:**
  - Jefatura: Panel, Personal (lectura), Horarios (lectura), Reportes, Calendario, Configuración
  - RR.HH.: Panel, Personal, Horarios, Perfiles, Reportes, Calendario (solo lectura), Configuración
  - Dueño: todos + Tickets, Tarjetas NFC
- **Panel funcional**: perfil con iniciales/rol, jornada semanal (48h objetivo), % asistencia mes, últimas marcaciones, reuniones próximas con enlace al calendario y contratos por vencer
- Sesión con timeout 15 min de inactividad real (mouse, teclado, scroll, toque)

### Tickets (`#/tickets`) — **Bloque 7**
- Bandeja de soporte exclusiva del **Dueño**.
- Tickets del login y de Configuración con KPIs de abiertos, en proceso, resueltos y total.
- Buscador por ticket, nombre, asunto o correo y filtros combinables por estado, origen y prioridad.
- Detalle completo con mensaje, datos del solicitante y línea de actividad.
- Cambio de estado y prioridad, respuesta/nota interna e historial de cambios.
- Acción rápida **Marcar resuelto**.
- Contador de tickets abiertos sincronizado con la campana del topbar.

### Reportes y PPTX (`#/reportes`) — **Bloque 9**
- Exportación **PNG 4x** por página y de todas las páginas.
- Exportación **PPTX** con una diapositiva por página.
- Gráficos **nativos de PowerPoint** (línea con marcadores, barras y dona), tablas nativas y KPIs/insights como formas.
- Título, descripción, periodo/corte, autor y paginación en cada diapositiva.
- El archivo `.pptx` se descarga localmente y se abre en PowerPoint/LibreOffice.

### Tarjetas NFC (`#/tarjetas`) — **Bloque 7**
- Inventario completo de las **50 tarjetas** con UID, serie, empleado, zonas, estado y fecha de asignación.
- Búsqueda por tarjeta, UID, serie o empleado y filtros por estado, área y asignación.
- **Asignar o reasignar** una tarjeta a cualquier empleado con permisos de zona por defecto.
- **Bloquear/desbloquear** con confirmación y registro en el historial.
- Permisos de zona editables por tarjeta; se aplican en el simulador NFC.
- Una tarjeta bloqueada o sin asignar rechaza accesos y marcaciones.
- Historial de cambios por tarjeta y actualización en caliente del simulador.

### Configuración (`#/configuracion`)
- Tema global **Claro crema / Carbón**; se aplica al instante a todo el proyecto y queda guardado en `nfc_config.tema`.
- **Datos de contacto editables:** teléfono, dirección y distrito; nombre, correo y rol visibles.
- **Seguridad:** cambio de contraseña con validación de la clave actual, confirmación y mínimo de 8 caracteres; cierre de sesión directo.
- **Empresa y periodo (solo Dueño):** empresa, periodo, fecha de corte, jornada semanal y preferencia de notificaciones del topbar.
- Formulario de **soporte técnico** que crea un ticket con origen `configuracion` para la bandeja del Dueño.
- El tema carbón cubre shell, login, tablas, modales, tarjetas, KPIs, gráficos y Reportes.

### Calendario (`#/calendario`) — **Bloque 6**
- Vista mensual de lunes a domingo, con navegación entre meses y botón **Mes del corte**.
- Día de corte resaltado y leyenda de estados: programada, finalizada y cancelada.
- **Dueño y Jefatura:** crear, editar y eliminar reuniones con título, descripción, fecha, horario, lugar, estado y roles invitados.
- **RR.HH.:** solo lectura; puede consultar la agenda y el detalle, pero no crear ni modificar.
- Las reuniones aparecen en el **Panel** de los roles invitados y en la campana del topbar.
- Validaciones de título, fecha, lugar, horario y al menos un rol invitado.
- Diseño claro/carbón y layout responsive.

### Áreas de acceso (`areas.html`) — *Simulador NFC*
- 8 zonas canónicas: Almacén, Comedor, Cuarto de Limpieza, Data Center, Oficina Jefatura, Oficina RR.HH., Oficina Soporte, Salas Comunes
- **Escanear tarjeta NFC** siempre abre su modal, haya o no hardware
- **Seleccionar empleado manualmente** abre lista de 50 con scroll interno
- Comedor y Salas Comunes permiten a los 50; las demás validan `rolNFC`

### Asistencia (`asistencia.html`) — *Simulador NFC*
- 4 marcaciones: Entrada, Salida almuerzo, Retorno almuerzo, Salida final
- Mismo flujo de modales que Áreas
- Registra la marcación en `localStorage` y muestra el resultado

## 🌱 Datos simulados (Seed v3 — Octubre 2026)

`js/nfc-reader.js` genera un seed histórico completo para **octubre 2026** (27 días laborables, sin domingos).

- **50 empleados** con DNI, fecha de nacimiento, teléfono, contacto de emergencia, contrato (tipo, inicio, fin, estado), documentos simulados (DNI + contrato), áreas supervisadas (jefatura)
- **8 zonas** con roles permitidos
- **~4,600 marcas de asistencia** (entrada ±20 min, tardanza después de 07:40, 4 marcas/día, 15% ausencias, 2% marcas de prueba `valida: false`)
- **~3,100 accesos a zonas** (comedor 1-3/día, otras zonas según rol)
- **~220 auditorías de accesos** (15-20% denegados por `sin_permiso`)
- **6 reuniones** (algunas posteriores al 30/10)
- **4 tickets** (2 origen login + 2 origen configuración)
- **50 tarjetas NFC** (3 bloqueadas, rechazan acceso en simulador)
- **Configuración**: empresa, periodo `2026-10`, fecha corte `2026-10-30`, jornada 48h/semana y tema global (`claro` por defecto, `carbon` opcional)
- Seed versionado (`SEED_VERSION = 3`); al subir la versión se regenera
- Datos en `localStorage`: `nfc_empleados_db`, `nfc_zonas_db`, `nfc_asistencia_jornada`, `nfc_accesos_zonas`, `nfc_auditoria_accesos`, `nfc_reuniones`, `nfc_tickets`, `nfc_tarjetas`, `nfc_config`, `nfc_seed_version`

## 📌 Estado actual

| Bloque | Estado | Fecha |
|---|---|---|
| **Bloque 0 — Base compartida** | **Completado** | 2026-11-01 |
| **Bloque 1 — Panel RRHH** | **Completado** | 2026-11-02 |
| **Bloque 2 — Personal RRHH** | **Completado** | 2026-11-02 |
| **Bloque 3 — Horarios RRHH** | **Completado** | 2026-11-02 |
| **Bloque 4 — Perfiles RRHH** | **Completado** | 2026-11-02 |
| **Bloque 5 — Reportes (PNG+CSV) + tema global** | **Completado** | 2026-11-02 |
| **Bloque 6 — Jefatura: Calendario** | **Completado** | 2026-11-02 |
| **Bloque 6b — Auditoría de Jefatura** | **Completado** | 2026-11-02 |
| **Bloque 7 — Dueño: Tickets, Tarjetas NFC y Configuración** | **Completado** | 2026-11-02 |
| **Bloque 8 — Cierre** | **Completado** | 2026-11-02 |
| **Bloque 9 — PPTX con gráficos nativos** | **Completado** | 2026-11-02 |

- **Bloque 0 completado:** login solo 7 reales, sidebar + router + RBAC, seed v3 octubre 2026, Panel funcional, placeholders de 9 módulos, ticket de soporte del login llega al Dueño.
- **Bloque 1 completado:** Panel con 6 gráficos Chart.js (jornada semanal, asistencia diaria, tardanzas por área, estado contratos, tardanzas por día), KPIs, marcaciones, reuniones, contratos por vencer.
- **Bloque 2 completado:** Personal con tabla 50, filtros combinables (búsqueda, área, cargo, estado), vencimientos 15/30/60/90d, gráficos plantilla/área y contratos/estado, ficha modal 360, modo lectura Jefatura.
- **Bloque 3 completado:** Horarios con tabla mensual oct 2026 (4 marcas/día), KPIs (asistencia, tardanzas, ausencias, prom. entrada), 6 gráficos Chart.js (tardanzas por área/cargo/día, top 10, estados, línea asistencia), filtros combinables, toggle incluir pruebas, export CSV.
- **Bloque 4 completado:** Perfiles con ficha 360 por pestañas, datos personales/contrato/documentos, cumpleaños, justificaciones de faltas y alta de personal con tarjeta NFC simulada.
- **Bloque 5 completado:** Reportes con constructor de 19 widgets, 5 plantillas, vista previa 16:9 escalable, modo Ampliar, tablas de 12 filas, insights sin cortes, PNG 3840×2160 y CSV por tabla + Power BI.
- **Tema global:** Claro crema / Carbón desde Configuración, persistido en `nfc_config.tema`; Reportes usa el tema global.
- **Buscador contextual:** cada módulo expone su propia búsqueda; los módulos sin lista muestran “Sin búsqueda aquí”.
- **Bloque 6 — Calendario completado:** vista mensual, día de corte, CRUD de reuniones para Dueño/Jefatura, lectura para RR.HH., invitaciones por rol, integración con Panel y notificaciones del topbar.
- **Auditoría de Jefatura completada:** plantilla de Reportes con KPIs, dona, tabla de zona/empleado/fecha/hora/resultado y CSV, verificada para Jefatura.
- **Bloque 7 completado:** Tickets (bandeja, prioridades, respuestas, historial y campana), Tarjetas NFC (inventario, asignación, bloqueo y permisos de zona) y Configuración (contacto, seguridad, entorno y soporte).
- **Bloque 8 completado:** buscador contextual real, revisión responsive/desktop-móvil sin desbordes, notificaciones, regresión completa y documentación/capturas de cierre.
- **Bloque 9 completado:** exportación PPTX con gráficos nativos, marcadores visibles, tablas reales y una diapositiva por página.

- Tests de regresión del simulador (`test.js`) y del dashboard (`panel`, `personal`, `horarios`, `perfiles`, `reportes`, `configuración`, `calendario`, `tickets`, `tarjetas` y `buscador`) pasan.
- **Cloudflare/KV pendiente:** el proyecto funciona solo en local por ahora.
- Web NFC requiere Chromium/Android y HTTPS o `localhost`. En escritorio sin lector se usa la lista manual.

## 🛠️ Stack

HTML5 + CSS3 (Grid, Flexbox, Custom Properties) + JavaScript ES6
(scripts clásicos para que login y páginas funcionen también desde `file://`).
Sin frameworks ni dependencias de build. Librerías vendorizadas en `vendor/`: Chart.js y PptxGenJS.

---

**Réplica educativa del diseño de Dribbble #25121521.**