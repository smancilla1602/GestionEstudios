# Sistema de Estudios Médicos y Control de Acceso

Aplicación de escritorio **local para Windows** que administra los estudios médicos de los
empleados y calcula el estado de cada uno (🟢 vigente / 🟡 próximo a vencer / 🔴 bloqueado) para
el seguimiento de Recursos Humanos. Los datos viven en SQLite dentro del equipo; no se envía nada
a internet.

## Flujo de trabajo (Recursos Humanos)

La aplicación está enfocada al **control de estudios médicos desde RH**. Al abrirse entra
directamente al **Dashboard**: no se pide número de empleado ni contraseña.

| Pantalla | Qué hace |
| --- | --- |
| **Dashboard** | Bandeja de pendientes (próximos a vencer y vencidos/bloqueados), tarjetas de estado, buscador en tiempo real, tabla completa y exportación a Excel |
| **Empleados** | Alta/edición de empleados (el **número se asigna solo**: el formulario no lo pide) y registro/edición de estudios con adjuntos |
| **Tipos de estudio** | Catálogo editable: crear tipos, cambiar nombre y vigencia en meses, eliminar los que no tengan estudios y recalcular vencimientos existentes |

> **Módulo Kiosco eliminado:** no se utiliza para validar accesos en planta. El objetivo es llevar
> el expediente y las vigencias desde RH, sin pedir códigos de trabajador.
>
> **Login pendiente (Fase 6 del ROADMAP):** la tabla `usuarios`, el hash bcrypt y los servicios de
> autenticación ya existen, pero la pantalla de Login aún no está habilitada. Por eso hoy la app
> abre sin credenciales.

### Qué muestra el Dashboard

1. **Bandeja de trabajo de RH** (sección superior):
   - **Próximos a vencer**: empleados con estudios que vencen en ≤ 30 días, ordenados por urgencia.
   - **Vencidos y bloqueados**: vencidos primero, luego sin estudios, inactivos y No aptos.
   - Cada renglón abre el expediente o permite registrar la renovación en un clic.
2. **Tarjetas de estado**: total, vigentes, próximos a vencer y bloqueados (funcionan como filtros).
3. **Buscador en tiempo real** por nombre, número, departamento o puesto.
4. **Tabla completa** con estudios vigentes, próximo vencimiento y resultado crítico.
5. **Acciones**: nuevo empleado, editar, eliminar, registrar/editar estudios y **Exportar a Excel**.

### Semáforo de acceso

| Estado | Regla |
| --- | --- |
| 🔴 BLOQUEADO | Estudio vigente con resultado `NO_APTO`, estudio vencido, empleado `INACTIVO` o sin estudios registrados |
| 🟡 PRÓXIMO A VENCER | No bloqueado y algún estudio vence entre hoy y los próximos 30 días |
| 🟢 VIGENTE | No bloqueado y ningún estudio vence en los próximos 30 días |

Decisiones relevantes:

- Se evalúa **el estudio más reciente de cada tipo** (una renovación no queda presa de un estudio viejo).
- `RESTRICCION` no bloquea el acceso, pero se muestra como advertencia.
- **Sin estudios = bloqueado** (criterio conservador de seguridad).
- El vencimiento se calcula en el backend con la vigencia del tipo de estudio, nunca en el navegador.
- El **número de empleado es autoincremental** (`EMP-001`, `EMP-002`, …): el formulario de alta no
  lo pide, se calcula y asigna solo al guardar. En la edición únicamente se muestra como referencia.
- El panel **Tipos de estudio** permite cambiar nombre y vigencia; al cambiar la vigencia se puede
  optar por recalcular (o conservar) las fechas de vencimiento de los estudios ya registrados.

## Requisitos

- Windows 10/11 (x64)
- Node.js **22.12+** (probado con 22.22.2) y npm
- Para empaquetar: conexión a internet la primera vez (electron-builder descarga NSIS)

## Instalación y ejecución

```powershell
cd c:\Estudiosapp
npm install          # instala todo y compila better-sqlite3 para Electron
npm run dev          # desarrollo con recarga (Vite + Electron)
npm start            # build de producción + Electron (más fiel al instalador)
```

`npm run dev` abre DevTools en una ventana aparte. `Ctrl + C` cierra ambos procesos.

### Datos de demostración

```powershell
npm run seed:demo
```

| N° | Empleado | Estado esperado |
| --- | --- | --- |
| EMP-001 | Ana López Herrera | 🟡 Acceso permitido, vence en 10 días |
| EMP-002 | Carlos Méndez Rivas | 🔴 Bloqueado, estudio vencido hace 30 días |
| EMP-003 | María Ruiz Salas | 🔴 Bloqueado por resultado No apto |
| EMP-004 | José Pérez Núñez | 🟢 Acceso permitido, todo vigente |
| EMP-005 | Lucía Gómez Ortiz | 🔴 Bloqueado, sin estudios |
| EMP-006 | Pedro Ramírez Cano | 🔴 Bloqueado, empleado inactivo |

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Vite en `127.0.0.1:5173` + Electron con recarga |
| `npm run build` | Compila el renderer React a `dist/` |
| `npm start` | Build + Electron leyendo `dist/` |
| `npm run verify` | Pruebas del backend con Electron (semáforo, SQLite, CRUD, Excel, auth) |
| `npm run smoke:ui` | Prueba E2E de la interfaz + capturas en `tmp/` |
| `npm run seed` | Garantiza el usuario administrador |
| `npm run seed:demo` | Carga empleados/estudios demo si la base está vacía |
| `npm run rebuild` | Recompila `better-sqlite3` para Electron |
| `npm run dist` | Genera el instalador NSIS en `release/` |

## Estructura

```
electron/
  main.js / preload.js          Proceso principal y bridge seguro (window.api)
  db/                           schema (DDL), conexión, seed, repositorios y consultas
  services/                     semaforo.js, excel.js, auth.js
  ipc/                          handlers por dominio + envoltorio {ok, data} / {ok, error}
  utils/validaciones.js
src/
  pages/                        Dashboard, Empleados, TiposEstudio
  components/                   PanelRevision, EmpleadosTabla, formularios (incluye
                                TipoEstudioForm), modales y UI
  hooks/                        useEmpleados, useGestionEmpleados, useTiposEstudio
  lib/                          api, fechas, format (etiquetas y colores)
scripts/                        verify.js, smoke-ui.js, cli.js
```

## Datos, respaldo y reinicio

- Base de datos: `%APPDATA%\EstudiosMedicos\data\estudios.db` (WAL)
- Adjuntos: `%APPDATA%\EstudiosMedicos\documentos\<id empleado>\`
- Respaldo: copiar la carpeta `EstudiosMedicos` con la aplicación cerrada.
- Reinicio total: cerrar la app y borrar `%APPDATA%\EstudiosMedicos`.

## Exportación a Excel

El botón **Exportar a Excel** abre el diálogo nativo y genera:

- `General` — una fila por estudio vigente (los empleados sin estudios también aparecen).
- `Próximos a Vencer` — empleados en 🟡.
- `Bloqueados-Vencidos` — empleados en 🔴 con el motivo.
- `Resumen` — totales y fecha de generación.

Columnas: Número Empleado, Nombre Completo, Departamento, Puesto, Estudio, Fecha Realización,
Fecha Vencimiento, Días para Vencer, Estado del Semáforo, Resultado, Motivo/Observaciones.

## Verificación

```powershell
npm run verify      # backend: reglas, DDL, CRUD, cascada, consultas, Excel, bcrypt
npm run smoke:ui    # Electron + build real: dashboard, detalle, filtros y capturas
```

Estado actual: **30/30 pruebas backend OK** y **smoke test de UI OK** (incluye el número
automático y el panel de tipos de estudio).

## Empaquetado y prueba del .exe

```powershell
cd c:\Estudiosapp
npm run dist
```

Genera:

| Archivo | Para qué sirve |
| --- | --- |
| `release\EstudiosMedicos Setup 1.0.0.exe` | Instalador NSIS x64 (elegir carpeta, accesos directos) |
| `release\win-unpacked\EstudiosMedicos.exe` | Versión portable para probar sin instalar |

**Cómo probarlo**

1. Ejecuta `release\EstudiosMedicos Setup 1.0.0.exe` y sigue el asistente (o abre directamente
   `release\win-unpacked\EstudiosMedicos.exe` para una prueba rápida).
2. Windows SmartScreen puede advertir porque el ejecutable aún no está firmado: elige
   **Más información → Ejecutar de todas formas**.
3. Verifica: alta de empleado sin capturar número (se asigna `EMP-00X`), panel **Tipos de
   estudio**, registro de un estudio y exportación a Excel.
4. Los datos se guardan en `%APPDATA%\EstudiosMedicos\data\estudios.db`, separados de la carpeta
   del programa, por lo que se conservan al reinstalar o actualizar.

> Validación realizada: `npm run dist` terminó con código 0 y la app empaquetada arrancó
> correctamente cargando el renderer desde `app.asar` y creando la base SQLite con el módulo
> nativo `better-sqlite3`. Pendiente: icono propio, firma de código y prueba en un equipo limpio.

## Seguridad

- `contextIsolation: true`, `nodeIntegration: false`, preload con superficie mínima.
- CSP en producción y navegación externa bloqueada.
- Contraseñas con **bcryptjs** (costo 10). El usuario inicial `admin` / `Admin123!` debe cambiarse
  al habilitar el Login.
- Toda la información permanece en el equipo local.

Ver `ROADMAP.md` para el estado detallado por fases y lo que queda pendiente.
