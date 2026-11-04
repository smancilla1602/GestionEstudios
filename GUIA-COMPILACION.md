# Guía de compilación — generar el `.exe`

Tutorial de **comandos** para empaquetar la aplicación en Windows y obtener el instalador y la
versión portable. Todos los comandos se ejecutan en **PowerShell** desde `c:\Estudiosapp`.

> Los datos **no** se empaquetan: la base vive en `%APPDATA%\EstudiosMedicos\` y se conserva entre
> instalaciones y actualizaciones.

---

## 1. Requisitos

| Requisito | Detalle |
| --- | --- |
| Windows | 10/11 x64 |
| Node.js | **22.12 o superior** (probado con 22.22.2) |
| npm | incluido con Node.js |
| Internet | **solo la primera vez** (electron-builder descarga NSIS y winCodeSign) |
| Permisos | **no** hace falta ejecutar como administrador (el instalador es por usuario) |

Comprobar versiones:

```powershell
node -v
npm -v
```

---

## 2. Preparación (solo la primera vez)

```powershell
cd c:\Estudiosapp
npm install
```

`npm install` instala dependencias y **recompila `better-sqlite3`** para el ABI de Electron
(script `postinstall`). Sin ese paso el `.exe` falla al abrir la base de datos.

Si ya tenías el proyecto instalado y solo cambiaste de versión de Electron:

```powershell
npm run rebuild
```

---

## 3. Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila el renderer React a `dist/` (no genera `.exe`) |
| `npm run verify` | Pruebas del backend con Electron (semáforo, SQLite, CRUD, Excel, auth) |
| `npm run smoke:ui` | Prueba E2E de la interfaz + capturas en `tmp/` (hace `build` antes) |
| `npm start` | Build + abre la app localmente (simula el comportamiento del instalador) |
| `npm run dist` | **Genera el instalador NSIS** en `release/` (hace `build` antes) |
| `npm run dist:dir` | Genera **solo** `release\win-unpacked\EstudiosMedicos.exe` (más rápido, sin instalador) |
| `npm run rebuild` | Recompila `better-sqlite3` para Electron |
| `npm run seed` | Garantiza el usuario `admin` |
| `npm run seed:demo` | Carga datos de demostración si la base está vacía |

---

## 4. Generar el `.exe` paso a paso

```powershell
cd c:\Estudiosapp

# 1) Pruebas del backend (recomendado antes de empaquetar)
npm run verify

# 2) Empaquetado completo: build del renderer + instalador NSIS + carpeta portable
npm run dist
```

Al terminar debe aparecer `building ... exit code 0` y los archivos en `release/`.

### Variante rápida (solo portable, sin instalador)

```powershell
cd c:\Estudiosapp
npm run dist:dir
```

### Variante manual (equivale a `npm run dist`)

```powershell
cd c:\Estudiosapp
npm run build
npx electron-builder --win nsis --x64
```

### Solo la carpeta portable

```powershell
cd c:\Estudiosapp
npm run build
npx electron-builder --win --dir --x64
```

---

## 5. Dónde quedan los archivos generados

| Archivo | Para qué sirve |
| --- | --- |
| `release\EstudiosMedicos Setup 1.0.0.exe` | **Instalador NSIS x64** (elige carpeta, accesos directos) |
| `release\win-unpacked\EstudiosMedicos.exe` | **Versión portable** para probar sin instalar |
| `release\*.blockmap`, `release\latest.yml` | Metadatos de actualización (no se usan hoy) |
| `dist\` | Renderer compilado que se empaqueta dentro del `.exe` |

Ver los archivos generados:

```powershell
dir c:\Estudiosapp\release
```

Ver la fecha y el tamaño del instalador:

```powershell
Get-Item 'c:\Estudiosapp\release\EstudiosMedicos Setup 1.0.0.exe' |
  Select-Object Name, Length, LastWriteTime
```

Abrir la carpeta `release` en el Explorador:

```powershell
explorer c:\Estudiosapp\release
```

---

## 6. Probar el `.exe`

**Instalador**

```powershell
& 'c:\Estudiosapp\release\EstudiosMedicos Setup 1.0.0.exe'
```

Sigue el asistente (carpeta de instalación y accesos directos). Si Windows SmartScreen advierte
porque el ejecutable **no está firmado**, elige **Más información → Ejecutar de todas formas**.

**Portable (recomendado para probar rápido)**

```powershell
& 'c:\Estudiosapp\release\win-unpacked\EstudiosMedicos.exe'
```

**Qué verificar dentro de la app**

1. Abre el Dashboard y las tarjetas de estado.
2. Crea un empleado: el número se asigna solo (`EMP-00X`).
3. Abre **Tipos de estudio** y revisa el catálogo.
4. Registra un estudio normal y uno **provisional** (1 mes y 10 días) y revisa el vencimiento.
5. Exporta a Excel y confirma la columna **Vigencia aplicada**.

**Cerrar la app antes de recompilar** (si el `.exe` está abierto, el empaquetado puede fallar con
"file is locked"):

```powershell
Stop-Process -Name EstudiosMedicos -ErrorAction SilentlyContinue
```

---

## 7. Cambiar la versión y el icono

**Versión** — edita `version` en `package.json` (por ejemplo `1.0.0` → `1.0.1`) y vuelve a compilar:

```powershell
cd c:\Estudiosapp
npm run dist
```

El instalador se generará como `release\EstudiosMedicos Setup 1.0.1.exe`.

**Icono** — electron-builder lo toma de `buildResources` (`build/` según `package.json`):

```powershell
cd c:\Estudiosapp
New-Item -ItemType Directory -Force build | Out-Null
# coloca tu icono en c:\Estudiosapp\build\icon.ico (256x256, formato .ico)
dir c:\Estudiosapp\build
npm run dist
```

---

## 8. Problemas comunes y cómo resolverlos

| Síntoma | Causa | Solución (comando) |
| --- | --- | --- |
| `better-sqlite3 ... NODE_MODULE_VERSION` al abrir el `.exe` | El módulo nativo se compiló para Node y no para Electron | `npm run rebuild` y volver a `npm run dist` |
| `Cannot find module 'better-sqlite3'` | Faltan dependencias | `npm install` |
| `EPERM: operation not permitted, rename ... release\win-unpacked` | La app está abierta o el antivirus tiene el archivo tomado | `Stop-Process -Name EstudiosMedicos -ErrorAction SilentlyContinue` y borrar `release` |
| `Cannot create symbolic link` durante el empaquetado | Windows sin permisos para enlaces simbólicos | Activar **Modo para desarrolladores** en Windows o ejecutar esa vez PowerShell **como administrador** |
| Falla la descarga de NSIS / winCodeSign | Sin internet o proxy | Conectarse a internet y repetir; la caché queda en `%LOCALAPPDATA%\electron-builder\Cache` |
| Pantalla en blanco al abrir el `.exe` | Falta el build del renderer | `npm run build` y luego `npm run dist` |
| `vite build` falla con un error de sintaxis | Error en `src/` | `npm run build` para ver el archivo y la línea |
| El instalador no refleja los cambios | Se ejecutó una versión anterior | Volver a `npm run dist` y probar `release\win-unpacked\EstudiosMedicos.exe` |

Recompilación “desde cero” (no borra datos):

```powershell
cd c:\Estudiosapp
Stop-Process -Name EstudiosMedicos -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'c:\Estudiosapp\release' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'c:\Estudiosapp\dist' -Recurse -Force -ErrorAction SilentlyContinue
npm run build
npm run dist
```

> Antes de un borrado recursivo, confirma la ruta:
> `Test-Path 'c:\Estudiosapp\release'`

---

## 9. Checklist antes de entregar el `.exe`

```powershell
cd c:\Estudiosapp
node -v            # 22.12 o superior
npm run verify     # pruebas del backend en verde
npm run smoke:ui   # interfaz + capturas en tmp\
npm run dist       # genera release\
dir c:\Estudiosapp\release
```

- [ ] `npm run verify` sin fallos.
- [ ] `npm run smoke:ui` sin fallos (capturas en `tmp\`).
- [ ] `npm run dist` termina con **código 0**.
- [ ] Existe `release\EstudiosMedicos Setup <version>.exe`.
- [ ] La versión portable abre y guarda datos en `%APPDATA%\EstudiosMedicos`.
- [ ] Se probó alta de empleado, tipos de estudio, estudio normal y estudio provisional.
- [ ] La exportación a Excel trae la columna **Vigencia aplicada**.

---

## 10. Notas útiles

**Datos del usuario (no se empaquetan)**

| Ruta | Contenido |
| --- | --- |
| `%APPDATA%\EstudiosMedicos\data\estudios.db` | Base SQLite (WAL) |
| `%APPDATA%\EstudiosMedicos\documentos\<id empleado>\` | Adjuntos copiados |

```powershell
# Respaldo (con la app cerrada)
Copy-Item "$env:APPDATA\EstudiosMedicos" "$env:USERPROFILE\Desktop\Respaldo-EstudiosMedicos" -Recurse

# Reinicio total: OJO, borra empleados, estudios y adjuntos
Remove-Item -LiteralPath "$env:APPDATA\EstudiosMedicos" -Recurse -Force
```

**Migración automática:** al abrir la versión nueva sobre una base existente, el esquema se
actualiza solo (`user_version` 1 → 2) y **no se pierde ningún registro**. No hay que ejecutar
ningún comando extra.

**Firma de código:** pendiente. Sin firma, Windows SmartScreen mostrará la advertencia al instalar;
se acepta con **Más información → Ejecutar de todas formas**.

**Qué entregar:** únicamente `release\EstudiosMedicos Setup <version>.exe` (o la carpeta
`release\win-unpacked` para uso portable). No distribuyas la carpeta del proyecto ni `node_modules`.
