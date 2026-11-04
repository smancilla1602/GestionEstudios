# ROADMAP — Sistema de Estudios Médicos (RH)

Aplicación de escritorio **local (Windows .exe)** para que Recursos Humanos gestione los estudios
médicos de los empleados y dé seguimiento a su estado: **Vigente / Próximo a vencer / Bloqueado**.

> **Estado del proyecto:** Fases 1 a 5 completadas y verificadas. La Fase 6 (Login) queda
> preparada a nivel de base de datos + servicios IPC, con la interfaz pendiente. La Fase 7
> (empaquetado) ya genera el instalador NSIS en `release/` y la app empaquetada fue validada
> localmente; quedan pendientes el icono propio, la firma de código y la prueba en equipo limpio.
>
> **Alcance actualizado:** el **módulo Kiosco fue eliminado** por decisión del usuario. La
> aplicación está enfocada 100 % al control de estudios médicos desde RH; no se solicita número de
> empleado al entrar y no se valida acceso en planta.

| Dato | Valor |
| --- | --- |
| Stack | Electron 38 · React 19 · Vite 7 · Tailwind 3 · better-sqlite3 12 · SheetJS |
| Base de datos | `%APPDATA%\EstudiosMedicos\data\estudios.db` (WAL, FK activas) |
| Usuario inicial | `admin` / `Admin123!` (hash bcrypt, cambio pendiente en Fase 6) |
| Pruebas backend | 42/42 ✅ (`npm run verify`) |
| Prueba de interfaz | ✅ smoke test con capturas (`npm run smoke:ui`) |

---

## Entregables solicitados en este turno

- [x] `ROADMAP.md` inicial con estado del proyecto
- [x] Estructura de carpetas recomendada (ver sección final)
- [x] `package.json` completo con dependencias y configuración de `electron-builder`
- [x] Proceso principal (`electron/main.js`) + `preload.js` con IPC de `better-sqlite3` y DDL
      (incluida la tabla `usuarios`)
- [x] Servicio de generación de Excel (`.xlsx`) con pestañas General / Próximos a Vencer /
      Bloqueados-Vencidos
- [x] Dashboard React con botón **Exportar a Excel**, tarjetas de semáforo, buscador en tiempo real
      y filtros
- [x] Extras: CRUD completo, bandeja de pendientes de RH, adjuntos de estudios, datos demo,
      pruebas automatizadas y capturas de pantalla

---

## Fase 1 — Configuración inicial y estructura

- [x] `package.json` con scripts de desarrollo, build, verificación y empaquetado
- [x] React + Vite configurados (`vite.config.js`, `src/main.jsx`, `src/App.jsx`)
- [x] Tailwind CSS 3 + PostCSS + sistema de diseño (`.card`, `.btn-*`, `.input`, `.badge`)
- [x] Lucide Icons integrado
- [x] Electron `main.js` con ventana segura (`contextIsolation`, sin `nodeIntegration`)
- [x] `preload.js` con `contextBridge` (superficie mínima `window.api`)
- [x] CSP inyectada solo en producción (Vite plugin en `vite.config.js`)
- [x] `.gitignore` (incluye `dist/`, `release/`, `tmp/`, `node_modules/`)
- [x] `postinstall` que recompila `better-sqlite3` para el ABI de Electron
- [x] Bloqueo de instancia única y cierre ordenado de la base de datos
- [ ] Icono `.ico` propio de la aplicación e instalador
- [ ] Auto-actualización (no requerida)

## Fase 2 — Base de datos SQLite

- [x] DDL de `usuarios`, `empleados`, `tipos_estudio` y `estudios_medicos` con
      `CHECK`, `UNIQUE`, llaves foráneas `ON DELETE CASCADE/RESTRICT` e índices
- [x] Versionado del esquema con `PRAGMA user_version`
- [x] Conexión en `<userData>/data/estudios.db` con `journal_mode=WAL`, `synchronous=NORMAL`,
      `foreign_keys=ON`
- [x] Semilla del catálogo de tipos de estudio (7 tipos con vigencia en meses)
- [x] Semilla del usuario `admin` con contraseña hasheada con **bcryptjs** (costo 10)
- [x] Repositorio de empleados (CRUD, validaciones, número único sin distinguir mayúsculas)
- [x] **Número de empleado autoincremental** (`EMP-001`, `EMP-002`, …): el formulario no solicita
      el número; se calcula el siguiente consecutivo y se asigna al guardar
- [x] Repositorio de estudios (alta, edición, baja) con **cálculo automático de vencimiento**
      en el backend (`fecha_realizacion + vigencia_meses`, con ajuste de fin de mes)
- [x] **Catálogo de tipos de estudio editable**: crear, renombrar, cambiar vigencia y eliminar
      (sólo si no tiene estudios), con recálculo opcional de vencimientos existentes
- [x] Validaciones: fechas futuras, resultados permitidos, campos obligatorios, números duplicados
- [x] Consultas agregadas empleado + estudios + semáforo (`db/consultas.js`)
- [x] CLI de soporte: `npm run seed` (admin) y `npm run seed:demo` (datos de demostración)
- [ ] Migraciones incrementales para esquemas v2+ (el mecanismo base ya existe)

## Fase 3 — IPC Bridge entre Electron y React

- [x] `ipcMain.handle` envuelto en `{ ok, data } | { ok, error }` (`ipc/helpers.js`)
- [x] Canales de aplicación: `app:info`, `excel:revelar`
- [x] Canales de empleados: listar, obtener, crear, siguiente número, actualizar, eliminar
- [x] Canales de estudios: tipos (listar, crear, actualizar, eliminar), listar por empleado,
      crear, actualizar, eliminar
- [x] ~~Canal de Kiosco~~ — descartado junto con el módulo (ver nota de alcance)
- [x] Canales de Excel: `excel:exportar` (diálogo nativo de guardado)
- [x] Canales de archivos: seleccionar/copiar adjunto, abrir archivo
- [x] Canales de autenticación preparados: `auth:login`, `auth:usuarios`
- [x] Manejo de errores en el renderer (`window.api` lanza `Error` con mensaje legible)

## Fase 4 — Componentes UI

- [x] Layout con barra lateral, indicador de SQLite local y versión
- [x] **Enfoque 100 % RH**: dashboard como pantalla inicial, sin captura de número de empleado
- [x] **Bandeja de trabajo de RH**: listas priorizadas de "Próximos a vencer" y "Vencidos y
      bloqueados" con acciones rápidas (ver expediente / registrar renovación)
- [x] **Dashboard**: tarjetas 🟢 Vigentes / 🟡 Próximos a vencer / 🔴 Bloqueados, total de
      empleados y filtros combinables (incluye filtro "Vencidos")
- [x] Buscador en tiempo real por nombre, número, departamento y puesto (sin acentos)
- [x] Tabla de empleados con estado del semáforo, resultado crítico y días para vencer
- [x] ~~**Kiosco de verificación**~~ — **descartado por decisión del usuario**: el objetivo es el
      control de estudios médicos desde RH, no la validación de acceso en planta. Se eliminó de la
      UI, del bridge IPC y de las pruebas automatizadas.
- [x] CRUD de empleados en modal (alta, edición, estado ACTIVO/INACTIVO, baja con confirmación)
- [x] Registro/edición de estudios con vigencia automática, resultado, observaciones y adjunto
      PDF/imagen copiado a `<userData>/documentos/<empleado>/`
- [x] Detalle del empleado con historial completo y acciones por estudio
- [x] **Panel "Tipos de estudio"**: pantalla dedicada con buscador, métricas del catálogo y
      edición de nombre/vigencia; alta y baja de tipos con protección de integridad
- [x] Avisos tipo toast, estados de carga y manejo de errores
- [x] `ErrorBoundary` para evitar pantallas en blanco
- [x] Mantenimiento del catálogo de tipos de estudio desde la UI
- [ ] Modo claro / ajustes de accesibilidad (opcional)
- [ ] Exportar/Respaldar la base de datos desde la UI (opcional)

## Fase 5 — Exportación a Excel

- [x] Servicio `electron/services/excel.js` con SheetJS
- [x] Pestaña **General**: una fila por estudio vigente (los empleados sin estudios también aparecen)
- [x] Pestañas **Próximos a Vencer** y **Bloqueados-Vencidos**
- [x] Pestaña extra **Resumen** con totales y fecha de generación
- [x] Columnas: Número Empleado, Nombre Completo, Departamento, Puesto, Estudio, Fecha Realización,
      Fecha Vencimiento, Días para Vencer, Estado del Semáforo, Resultado, Motivo/Observaciones
- [x] Anchos de columna y autofiltro por pestaña
- [x] Botón **Exportar a Excel** en el Dashboard con diálogo nativo y opción "Abrir carpeta"
- [x] Manejo de archivo bloqueado por Excel (`EBUSY`/`EPERM`)
- [x] Verificado releyendo el `.xlsx` generado en las pruebas automatizadas
- [ ] Exportar sólo el filtro visible (hoy exporta el universo completo)
- [ ] Colores por semáforo (requiere `xlsx-js-style` o migrar a `exceljs`)

## Fase 6 — Autenticación / Login (fase final)

- [x] Tabla `usuarios` + roles `ADMIN`, `RH`, `GUARDIA` (GUARDIA queda en el enum pero sin uso tras
      eliminar el Kiosco)
- [x] Hash bcrypt y usuario administrador por defecto
- [x] Servicio `auth.js` (login, listar, crear usuario) + canales IPC
- [ ] Pantalla de Login
- [ ] Interceptor de rutas / bloqueo de la app hasta autenticarse
- [ ] Autorización por rol (ADMIN/RH administran; sin módulo de guardia)
- [ ] Gestión de usuarios y cambio de contraseña
- [ ] Forzar cambio de la contraseña temporal `Admin123!` en el primer ingreso
- [ ] Cierre de sesión por inactividad

## Fase 7 — Empaquetado .exe

- [x] Config electron-builder: target NSIS x64, salida `release/`
- [x] `asarUnpack` de better-sqlite3 (módulo nativo)
- [x] `postinstall` / `npm run rebuild` para binarios nativos
- [x] Ejecutar `npm run dist` y generar `release\EstudiosMedicos Setup 1.0.0.exe`
- [x] Arranque validado de la app empaquetada: ventana, renderer desde `app.asar` y SQLite
      nativo creando `data\estudios.db`
- [ ] Instalar el `.exe` y probar alta/edición/exportación en esa instalación
- [ ] Icono y metadatos del instalador
- [ ] Firma de código (evita advertencias de SmartScreen)
- [ ] Prueba en equipo limpio sin Node instalado
- [ ] Verificar que la BD persiste en `%APPDATA%` tras actualizar

## Decisiones de diseño

1. **Último registro por tipo**: el semáforo evalúa únicamente el estudio capturado más
   recientemente de cada tipo (`creado_en DESC, id DESC`), no el de mayor `fecha_realizacion`. Así,
   cuando RH vuelve a registrar un estudio del mismo tipo, ese registro manda y el anterior queda
   como histórico; una renovación nunca queda presa de un estudio viejo.
2. **Sin estudios = BLOQUEADO**: criterio conservador; el expediente del empleado muestra el motivo
   "Sin estudios médicos registrados".
3. **NO_APTO bloquea** aunque la fecha esté vigente. **RESTRICCION no bloquea**, pero se muestra
   como advertencia.
4. **Límites del semáforo**: vence hoy o en ≤ 30 días → 🟡; vencido ayer o antes → 🔴; > 30 días y
   sin NO_APTO → 🟢.
5. **INACTIVO = BLOQUEADO** aunque tenga estudios vigentes.
6. **El backend es la fuente de verdad**: el renderer nunca calcula la fecha de vencimiento ni el
   estado; sólo hace una vista previa.
7. **Fechas ISO (`AAAA-MM-DD`) en SQLite** y formato `dd/mm/aaaa` en UI/Excel (sin problemas de zona
   horaria).
8. **Comparación sin mayúsculas** en `numero_empleado` y `usuario` (COLLATE NOCASE).
9. **Adjuntos copiados** a la carpeta de datos: la ruta del archivo original puede desaparecer.
10. **Seguridad**: `contextIsolation: true`, `nodeIntegration: false`, CSP en producción, navegación
    externa bloqueada.
11. **Dependencias**: React/Vite/Tailwind en `dependencies` (se empaquetan); better-sqlite3/bcryptjs/xlsx
    son dependencias de runtime del proceso main.
12. **Módulo Kiosco descartado**: no hay captura de número de empleado ni validación de acceso en
    planta; el objetivo es el control y seguimiento de estudios médicos desde RH.
13. **Estudio provisional**: se reutiliza el tipo de estudio del catálogo y la vigencia se captura en
    **meses + días** (`1 mes y 10 días`, `10 días`, …). El vencimiento se calcula primero en meses
    (respetando fin de mes) y luego en días; se guarda la vigencia aplicada
    (`es_provisional`, `vigencia_meses_aplicada`, `vigencia_dias_aplicada`) y el recálculo de
    "Tipos de estudio" **ignora** estos registros. El esquema pasó a `user_version = 2` con migración
    automática e idempotente al arrancar.

## Comandos

```bash
npm install            # instala y recompila better-sqlite3 para Electron
npm run dev            # Vite + Electron con recarga
npm run build          # compila el renderer a dist/
npm start              # build + Electron en modo producción local
npm run verify         # pruebas backend (semáforo, SQLite, CRUD, Excel, auth)
npm run smoke:ui       # prueba E2E de la interfaz + capturas en tmp/
npm run seed           # asegura el usuario admin
npm run seed:demo      # datos de demostración (solo si no hay empleados)
npm run dist           # instalador NSIS en release/
```

## Estructura de carpetas

```
Estudiosapp/
├─ electron/
│  ├─ main.js / preload.js
│  ├─ db/ (schema, database, seed, empleados, estudios, consultas)
│  ├─ services/ (semaforo, excel, auth)
│  ├─ ipc/ (index, helpers, app, empleados, estudios, excel, archivos, auth)
│  └─ utils/validaciones.js
├─ src/
│  ├─ components/ (Sidebar, StatCard, SemaforoBadge, PanelRevision, Modal, Toast,
│  │               EmpleadosTabla, EmpleadoForm, EstudioForm, EmpleadoDetalle,
│  │               TipoEstudioForm, GestionModales, ErrorBoundary)
│  ├─ pages/ (Dashboard, Empleados, TiposEstudio)
│  ├─ hooks/ (useEmpleados, useGestionEmpleados, useTiposEstudio)
│  ├─ lib/ (api, fechas, format)
│  ├─ App.jsx / main.jsx / index.css
├─ scripts/ (verify.js, smoke-ui.js, cli.js)
├─ dist/ (build del renderer)
├─ release/ (instalador, generado por electron-builder)
├─ index.html · vite.config.js · tailwind.config.js · postcss.config.mjs
├─ ROADMAP.md · README.md · package.json
```

## Siguiente paso recomendado

1. Ejecutar `npm run seed:demo` para revisar la app con datos de ejemplo (ya cargados en este equipo).
2. Ajustar nombres y vigencias desde el panel **Tipos de estudio** según la normativa interna.
3. Implementar la Fase 6 (Login de RH) antes de distribuir el `.exe`.
4. Generar el instalador con `npm run dist` y probarlo en un equipo limpio.
