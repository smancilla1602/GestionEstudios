# Actualización propuesta — Estudio provisional con vigencia en **meses + días**

> Documento de diseño **previo a programar**. Sirve para confirmar que entendí el requerimiento
> antes de tocar código. Estado: **pendiente de aprobación**.

---

## 1. Qué entendí (en una frase)

En el registro de estudios de un empleado quiero un **estudio provisional**: se elige un **tipo de
estudio ya existente del catálogo** (Examen médico general, Audiometría, etc.), pero la vigencia
**no** se toma de la del catálogo: se captura a mano en **meses y días** (`1 mes y 10 días`,
`0 meses y 10 días`, `2 meses y 0 días`, …) y el vencimiento se calcula con **esa** duración.
Es decir: *mismo catálogo de estudios, vigencia personalizada y temporal*.

---

## 2. Ejemplos concretos de cálculo (los que definen la regla)

La vigencia provisional se aplica **primero en meses y luego en días**, sobre la fecha de
realización (días de calendario, no días hábiles):

| Fecha de realización | Provisional | Cálculo | Fecha de vencimiento |
| --- | --- | --- | --- |
| 01/03/2026 | 1 mes y 10 días | 01/03 → 01/04 → +10 días | **11/04/2026** |
| 01/03/2026 | 0 meses y 10 días | 01/03 → +10 días | **11/03/2026** |
| 01/03/2026 | 2 meses y 0 días | 01/03 → 01/05 | **01/05/2026** |
| 31/01/2026 | 1 mes y 1 día | 31/01 → 28/02 (fin de mes) → +1 día | **01/03/2026** |
| 15/03/2026 | 0 meses y 30 días | 15/03 → +30 días | **14/04/2026** |
| 15/03/2026 | 12 meses y 0 días | caso igual al catálogo | **15/03/2027** |

Notas:
- `31/01 + 1 mes = 28/02` porque se respeta el último día del mes (comportamiento que ya existe hoy
  en `sumarMeses`).
- Si se capturan **solo días**, los meses quedan en `0` y viceversa.
- La suma de días es **posterior** a la de meses: `1 mes y 10 días` **no** es `40 días`.

---

## 3. Alcance

### Dentro de esta actualización
1. Marcar un estudio como **provisional** al registrarlo o editarlo.
2. Capturar la vigencia provisional en **meses (0–120)** y **días (0–365)**.
3. Calcular `fecha_vencimiento` en el **backend** con esa vigencia (el renderer sólo hace vista previa).
4. Guardar en el registro la vigencia realmente aplicada, para poder editarlo después sin adivinar.
5. Mostrar la marca **Provisional** y la vigencia (`1 mes y 10 días`) en el expediente y en el historial.
6. Incluir una columna **Vigencia aplicada** en el Excel (`Provisional · 1 mes y 10 días` / `12 meses`).
7. Migrar la base existente **sin perder datos** (esquema `user_version` 1 → 2).

### Fuera de esta actualización (para no inflar el cambio)
- No se crean "tipos de estudio provisionales" en el catálogo (se reutilizan los existentes).
- No se agregan reglas nuevas al semáforo: un provisional es un estudio normal que vence cuando
  se le calculó.
- No hay renovación automática ni avisos/correos.
- No cambia el Login ni el empaquetado.

---

## 4. Cómo se vería en pantalla

### 4.1 Formulario "Registrar estudio" (`src/components/EstudioForm.jsx`)

```
┌ Empleado: Ana López Herrera  ·  EMP-001 ──────────────────────────────┐
└──────────────────────────────────────────────────────────────────────┘
 Tipo de estudio *
 [ Audiometría (12 meses)                                            ▾ ]

 ┌ ☑  Estudio provisional (vigencia personalizada) ─────────────────────┐
 │  Meses  [ 1 ]        Días  [ 10 ]                                    │
 │  Vigencia provisional: 1 mes y 10 días                               │
 │  Vence el 11/04/2026                                                 │
 └──────────────────────────────────────────────────────────────────────┘

 Fecha de realización *              Fecha de vencimiento (automática)
 [ 01/03/2026        ]               [ 11/04/2026        · Provisional ]

 Resultado *                         [ Apto                            ▾ ]
 Archivo del estudio (opcional)      [ Seleccionar archivo ]
 Observaciones                       [ … ]
 Motivo del provisional (opcional)   [ En espera de resultados de laboratorio ]
```

- Con la casilla **apagada** todo queda **exactamente como hoy**: vencimiento = vigencia del catálogo.
- Con la casilla **encendida**: se ocultan/ignoran las 12 meses del catálogo y mandan meses + días.
- Al activar, los valores por defecto son `meses = 0` y `días = 30` (editable).
- Si el registro guardado ya es provisional, al editarlo se abre la casilla marcada con sus valores.

### 4.2 Expediente del empleado (`src/components/EmpleadoDetalle.jsx`)

```
Estudio                    Realización   Vence             Resultado   Semáforo   Acciones
Audiometría  [Provisional]  01/03/2026   11/04/2026  🟡      Apto        Próx. a vencer   ✎ 🗑
Vigencia: 1 mes y 10 días               En 31 días
```

- Badge ámbar **Provisional** junto al nombre del estudio (en la tabla y en el historial).
- Línea secundaria `Vigencia: 1 mes y 10 días`.
- El semáforo sigue igual: el estudio provisional vence y cae en 🟡 / 🔴 como cualquier otro.

### 4.3 Excel (`electron/services/excel.js`)

Nueva columna **Vigencia aplicada** después de `Estudio`:

| Estudio | Vigencia aplicada | Fecha Realización | Fecha Vencimiento | … |
| --- | --- | --- | --- | --- |
| Audiometría | Provisional · 1 mes y 10 días | 01/03/2026 | 11/04/2026 | … |
| Examen médico general | 12 meses | 20/01/2026 | 20/01/2027 | … |

---

## 5. Modelo de datos (migración `user_version` 1 → 2)

Se agregan **4 columnas** a `estudios_medicos`. No se toca ninguna tabla existente ni se borran datos.

| Columna | Tipo | Para qué |
| --- | --- | --- |
| `es_provisional` | `INTEGER NOT NULL DEFAULT 0` (`0/1`) | Marca el registro como provisional |
| `vigencia_meses_aplicada` | `INTEGER NOT NULL DEFAULT 0` | Meses que realmente se usaron (catálogo o provisional) |
| `vigencia_dias_aplicada` | `INTEGER NOT NULL DEFAULT 0` | Días extra del provisional (0 en los de catálogo) |
| `provisional_motivo` | `TEXT` | Nota opcional: por qué es provisional |

¿Por qué guardar la vigencia aplicada en el registro?

- Al editar un provisional no hay que "adivinar" qué meses/días se capturaron: se leen del registro.
- El Excel y el expediente pueden mostrar `Vigencia: 1 mes y 10 días` sin recalcular nada.
- Permite distinguir `1 mes y 10 días` de `40 días` (que pueden caer en fechas distintas).

Nombres `vigencia_meses_aplicada` / `vigencia_dias_aplicada` **a propósito**: `tipos_estudio` ya
tiene `vigencia_meses` y los `SELECT` que hacen `JOIN` quedarían ambiguos con un nombre igual.

### 5.1 DDL final de la tabla (instalaciones nuevas)

```sql
CREATE TABLE IF NOT EXISTS estudios_medicos (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id             INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_estudio_id         INTEGER NOT NULL REFERENCES tipos_estudio(id) ON DELETE RESTRICT,
  fecha_realizacion       TEXT NOT NULL,
  fecha_vencimiento       TEXT NOT NULL,
  resultado               TEXT NOT NULL CHECK (resultado IN ('APTO', 'RESTRICCION', 'NO_APTO')),
  ruta_archivo            TEXT,
  observaciones           TEXT,
  es_provisional          INTEGER NOT NULL DEFAULT 0 CHECK (es_provisional IN (0, 1)),
  vigencia_meses_aplicada INTEGER NOT NULL DEFAULT 0 CHECK (vigencia_meses_aplicada BETWEEN 0 AND 120),
  vigencia_dias_aplicada  INTEGER NOT NULL DEFAULT 0 CHECK (vigencia_dias_aplicada BETWEEN 0 AND 365),
  provisional_motivo      TEXT,
  creado_en               TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

### 5.2 Migración (instalaciones que ya existen)

`CREATE TABLE IF NOT EXISTS` **no** agrega columnas a una tabla existente, por eso hay un paso de
migración idempotente en `electron/db/schema.js`:

```js
const VERSION_ESQUEMA = 2;

const COLUMNAS_NUEVAS = [
  { nombre: 'es_provisional', ddl: 'INTEGER NOT NULL DEFAULT 0 CHECK (es_provisional IN (0, 1))' },
  { nombre: 'vigencia_meses_aplicada', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { nombre: 'vigencia_dias_aplicada', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { nombre: 'provisional_motivo', ddl: 'TEXT' }
];

function migrarEsquema(db, versionActual) {
  const existentes = new Set(db.pragma('table_info(estudios_medicos)').map((c) => c.name));
  const faltantes = COLUMNAS_NUEVAS.filter((columna) => !existentes.has(columna.nombre));
  if (faltantes.length === 0) return;

  const migrar = db.transaction(() => {
    for (const columna of faltantes) {
      db.exec(`ALTER TABLE estudios_medicos ADD COLUMN ${columna.nombre} ${columna.ddl}`);
    }
    // Relleno de los registros históricos: la vigencia que tenían era la del catálogo.
    db.prepare(
      `UPDATE estudios_medicos
          SET vigencia_meses_aplicada = COALESCE(
                (SELECT te.vigencia_meses FROM tipos_estudio te
                  WHERE te.id = estudios_medicos.tipo_estudio_id), 0)
        WHERE es_provisional = 0
          AND vigencia_meses_aplicada = 0
          AND vigencia_dias_aplicada = 0`
    ).run();
  });
  migrar();
}
```

`aplicarEsquema(db)` queda así: ejecuta el DDL, llama a `migrarEsquema(db, versionActual)` y
actualiza `user_version = 2`. **Los `fecha_vencimiento` existentes no se modifican.**

> Nota técnica: el `CHECK` dentro de `ALTER TABLE ... ADD COLUMN` **ya fue probado** con el
> better-sqlite3 que usa la app y funciona (ver sección 15). Si en el futuro se subiera de versión
> de SQLite y dejara de aceptarse, basta quitar ese `CHECK` del `ALTER`: la validación real ya está
> en el repositorio (`normalizarDatos`) y en el `CREATE TABLE` de las instalaciones nuevas.

---

## 6. Reglas de negocio (las que implementaré)

1. **El provisional reutiliza el catálogo**: se elige un `tipo_estudio_id` existente; no se crea nada nuevo en `tipos_estudio`.
2. `es_provisional = 1` exige **meses + días > 0**. Si ambos son `0` → error.
3. Rango: `meses` 0–120, `días` 0–365 (los límites se definen en una constante `LIMITES_PROVISIONAL`).
4. `fecha_vencimiento = sumarDias(sumarMeses(fecha_realizacion, meses), dias)`.
5. Un estudio **no provisional** sigue guardando `vigencia_meses_aplicada = tipo.vigencia_meses` y
   `vigencia_dias_aplicada = 0` (así el Excel y la UI tienen un valor uniforme).
6. **Recalcular vencimientos desde "Tipos de estudio" ignora los provisionales** (`WHERE ... AND es_provisional = 0`). Su vigencia es intencional y no debe heredarse del catálogo.
7. El semáforo **no cambia**: provisional vencido → 🔴 BLOQUEADO; provisional a ≤ 30 días → 🟡; con `NO_APTO` → 🔴.
8. `resultado` sigue siendo obligatorio (`APTO` / `RESTRICCION` / `NO_APTO`) y aplica igual.
9. Un provisional **es el estudio más reciente de su tipo** entendido como el **último registrado**
   (`creado_en DESC, id DESC`), por lo que sustituye al estudio de catálogo del mismo tipo en la
   evaluación del semáforo aunque su `fecha_realizacion` sea anterior. Es lo esperado: la renovación
   recién capturada "manda" hasta que venza o se registre otro.
10. Borrar el tipo de estudio sigue bloqueado si tiene estudios (incluidos los provisionales).
11. `provisional_motivo` es opcional (máx. 200 caracteres) y se muestra en el expediente.

---

## 7. Archivos que se tocan (y qué cambia en cada uno)

| Archivo | Cambio |
| --- | --- |
| `electron/db/schema.js` | `VERSION_ESQUEMA = 2`, columnas nuevas en el DDL y `migrarEsquema()` |
| `electron/services/semaforo.js` | `sumarDias()`, `calcularVencimiento()`, `describirVigencia()`, `LIMITES_PROVISIONAL` |
| `electron/db/estudios.js` | `SQL_ESTUDIO` con las columnas nuevas, `normalizarDatos()` con la vigencia provisional, `INSERT/UPDATE` y el recálculo del catálogo que ignora provisionales |
| `electron/db/consultas.js` | `SQL_HISTORIA` con las columnas nuevas (el Dashboard y el Excel las necesitan) |
| `electron/services/excel.js` | Columna **Vigencia aplicada** + `vigenciaDeEstudio()` |
| `src/lib/fechas.js` | `sumarDias()` y `describirVigencia()` para la vista previa |
| `src/components/EstudioForm.jsx` | Casilla **Estudio provisional**, campos meses/días, vista previa y motivo |
| `src/components/EmpleadoDetalle.jsx` | Badge **Provisional**, línea de vigencia en tabla e historial, motivo |
| `src/pages/TiposEstudio.jsx` | (Sólo texto) aclarar que el recálculo **no** altera los provisionales |
| `scripts/verify.js` | 7 pruebas nuevas: cálculo, validaciones, migración, recálculo y Excel |
| `README.md` / `ROADMAP.md` | Documentar la función dentro del flujo de RH |

**No se toca:** `electron/ipc/estudios.js`, `electron/preload.js`, `src/lib/api.js` ni
`src/hooks/useGestionEmpleados.js` → el contrato IPC actual (`estudios:crear` / `estudios:actualizar`
con un objeto `datos`) ya sirve: los campos nuevos viajan dentro del mismo payload.

---

## 8. Código propuesto (fragmentos clave)

### 8.1 `electron/services/semaforo.js` — cálculo

```js
const LIMITES_PROVISIONAL = { meses: 120, dias: 365 };

/** Suma días de calendario a una fecha ISO. */
function sumarDias(fechaISO, dias) {
  if (!esFechaISO(fechaISO)) throw new Error(`Fecha inválida: ${fechaISO}`);
  const cantidad = Number(dias);
  if (!Number.isInteger(cantidad)) {
    throw new Error('Los días de vigencia deben ser un número entero');
  }
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + cantidad);
  return fecha.toISOString().slice(0, 10);
}

/** Vencimiento de un estudio provisional: primero meses (fin de mes) y luego días. */
function calcularVencimiento(fechaRealizacion, { meses = 0, dias = 0 } = {}) {
  return sumarDias(sumarMeses(fechaRealizacion, Number(meses) || 0), Number(dias) || 0);
}

/** "1 mes y 10 días", "10 días", "12 meses", "sin vigencia". */
function describirVigencia(meses = 0, dias = 0) {
  const m = Number(meses) || 0;
  const d = Number(dias) || 0;
  const partes = [];
  if (m > 0) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  if (d > 0) partes.push(`${d} ${d === 1 ? 'día' : 'días'}`);
  return partes.length > 0 ? partes.join(' y ') : 'sin vigencia';
}

module.exports = {
  /* …lo actual…, más: */
  LIMITES_PROVISIONAL,
  sumarDias,
  calcularVencimiento,
  describirVigencia
};
```

> `evaluarEstudio` no necesita cambios: el registro ya trae `es_provisional`,
> `vigencia_meses_aplicada` y `vigencia_dias_aplicada` porque vienen en el `SELECT`.

### 8.2 `electron/db/estudios.js` — validación y persistencia

```js
const {
  RESULTADOS, hoyISO, sumarMeses, calcularVencimiento, LIMITES_PROVISIONAL
} = require('../services/semaforo');

const SQL_ESTUDIO = `
  SELECT em.id, em.empleado_id, em.tipo_estudio_id, em.fecha_realizacion, em.fecha_vencimiento,
         em.resultado, em.ruta_archivo, em.observaciones, em.creado_en,
         em.es_provisional, em.vigencia_meses_aplicada, em.vigencia_dias_aplicada,
         em.provisional_motivo,
         te.nombre AS tipo_estudio, te.vigencia_meses
  FROM estudios_medicos em
  JOIN tipos_estudio te ON te.id = em.tipo_estudio_id
`;

function normalizarDatos(datos = {}, empleadoId) {
  const tipoEstudioId = entero(datos.tipo_estudio_id, 'Tipo de estudio');
  const tipo = obtenerTipoEstudio(tipoEstudioId);
  if (!tipo) throw new Error('El tipo de estudio seleccionado no existe');

  const fechaRealizacion = fechaISO(datos.fecha_realizacion, 'Fecha de realización');
  if (fechaRealizacion > hoyISO()) {
    throw new Error('La fecha de realización no puede ser futura');
  }

  const esProvisional =
    datos.es_provisional === true || datos.es_provisional === 1 || datos.es_provisional === '1';

  let meses = tipo.vigencia_meses;
  let dias = 0;
  let fechaVencimiento = sumarMeses(fechaRealizacion, meses);

  if (esProvisional) {
    meses =
      datos.vigencia_meses === '' || datos.vigencia_meses == null
        ? 0
        : entero(datos.vigencia_meses, 'Meses de la vigencia provisional', {
            min: 0,
            max: LIMITES_PROVISIONAL.meses
          });

    dias =
      datos.vigencia_dias === '' || datos.vigencia_dias == null
        ? 0
        : entero(datos.vigencia_dias, 'Días de la vigencia provisional', {
            min: 0,
            max: LIMITES_PROVISIONAL.dias
          });

    if (meses === 0 && dias === 0) {
      throw new Error('Indique la vigencia provisional: al menos 1 día (en meses o en días)');
    }

    fechaVencimiento = calcularVencimiento(fechaRealizacion, { meses, dias });
  }

  return {
    empleado_id: empleadoId,
    tipo_estudio_id: tipo.id,
    fecha_realizacion: fechaRealizacion,
    fecha_vencimiento: fechaVencimiento,
    resultado: unoDe(datos.resultado, RESULTADOS, 'Resultado'),
    ruta_archivo: rutaArchivo(datos.ruta_archivo),
    observaciones:
      texto(datos.observaciones, 'Observaciones', { requerido: false, max: 1000 }) || null,
    es_provisional: esProvisional ? 1 : 0,
    vigencia_meses_aplicada: meses,
    vigencia_dias_aplicada: dias,
    provisional_motivo:
      (esProvisional
        ? texto(datos.provisional_motivo, 'Motivo del estudio provisional', {
            requerido: false,
            max: 200
          })
        : '') || null,
    vigencia_meses: tipo.vigencia_meses
  };
}
```

El `INSERT` y el `UPDATE` sólo agregan las columnas nuevas; el resto queda igual:

```sql
INSERT INTO estudios_medicos
  (empleado_id, tipo_estudio_id, fecha_realizacion, fecha_vencimiento, resultado, ruta_archivo,
   observaciones, es_provisional, vigencia_meses_aplicada, vigencia_dias_aplicada, provisional_motivo)
VALUES
  (@empleado_id, @tipo_estudio_id, @fecha_realizacion, @fecha_vencimiento, @resultado, @ruta_archivo,
   @observaciones, @es_provisional, @vigencia_meses_aplicada, @vigencia_dias_aplicada, @provisional_motivo)
```

**Recálculo desde el catálogo** (lo que evita que se pisen los provisionales, en `actualizarTipoEstudio`):

```js
const estudios = db
  .prepare(
    `SELECT id, fecha_realizacion FROM estudios_medicos
      WHERE tipo_estudio_id = ? AND es_provisional = 0`
  )
  .all(tipoId);

const actualizarFecha = db.prepare(
  'UPDATE estudios_medicos SET fecha_vencimiento = ?, vigencia_meses_aplicada = ? WHERE id = ?'
);

for (const estudio of estudios) {
  actualizarFecha.run(
    sumarMeses(estudio.fecha_realizacion, limpio.vigencia_meses),
    limpio.vigencia_meses,
    estudio.id
  );
}
```

### 8.3 `src/components/EstudioForm.jsx` — estado, vista previa y payload

```js
function estadoInicial(estudio) {
  return {
    tipo_estudio_id: estudio?.tipo_estudio_id ? String(estudio.tipo_estudio_id) : '',
    fecha_realizacion: estudio?.fecha_realizacion ?? hoyISO(),
    resultado: estudio?.resultado ?? 'APTO',
    ruta_archivo: estudio?.ruta_archivo ?? null,
    observaciones: estudio?.observaciones ?? '',
    es_provisional: Boolean(estudio?.es_provisional),
    vigencia_meses: String(estudio?.vigencia_meses_aplicada ?? 0),
    vigencia_dias: String(estudio?.vigencia_dias_aplicada ?? 30),
    provisional_motivo: estudio?.provisional_motivo ?? ''
  };
}

const vencimiento = useMemo(() => {
  if (!tipoSeleccionado || !formulario.fecha_realizacion) return '';
  if (formulario.es_provisional) {
    return calcularVencimiento(formulario.fecha_realizacion, {
      meses: Number(formulario.vigencia_meses) || 0,
      dias: Number(formulario.vigencia_dias) || 0
    });
  }
  return sumarMeses(formulario.fecha_realizacion, tipoSeleccionado.vigencia_meses);
}, [tipoSeleccionado, formulario]);
```

En `manejarEnvio` se agregan al payload `es_provisional`, `vigencia_meses`, `vigencia_dias` y
`provisional_motivo`. La vista previa es **sólo informativa**: la fecha definitiva la calcula el backend.

Detalle de UI (usando las clases existentes `.card`, `.input`, `.label`, `.badge`):

```jsx
<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-3">
  <input
    type="checkbox"
    className="mt-0.5 h-4 w-4 accent-emerald-500"
    checked={formulario.es_provisional}
    onChange={(evento) => actualizar('es_provisional', evento.target.checked)}
  />
  <span className="min-w-0">
    <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
      Estudio provisional
      <span className="badge border-amber-500/25 bg-amber-500/10 text-amber-300">Vigencia manual</span>
    </span>
    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
      Usa el tipo de estudio del catálogo, pero la vigencia se captura en meses y días
      (ej. 1 mes y 10 días, o sólo 10 días).
    </span>
  </span>
</label>

{formulario.es_provisional ? (
  <div className="grid gap-4 sm:grid-cols-2">
    {/* Meses: <input type="number" min=0 max=120 step=1 className="input" /> */}
    {/* Días:   <input type="number" min=0 max=365 step=1 className="input" /> */}
    {/* Resumen: describirVigencia(...) + formatearFecha(vencimiento) */}
  </div>
) : null}
```

Cuando la casilla está apagada, el bloque "Fecha de vencimiento (automática)" sigue mostrando
`{tipoSeleccionado.vigencia_meses} meses`, exactamente como hoy.

### 8.4 `electron/services/excel.js` — columna nueva

```js
const COLUMNAS = [
  /* … */
  { key: 'tipo_estudio', label: 'Estudio', width: 28 },
  { key: 'vigencia', label: 'Vigencia aplicada', width: 26 },
  /* …resto igual… */
];

function vigenciaDeEstudio(estudio) {
  if (!estudio) return '';
  const etiqueta = describirVigencia(
    estudio.vigencia_meses_aplicada,
    estudio.vigencia_dias_aplicada
  );
  return estudio.es_provisional ? `Provisional · ${etiqueta}` : etiqueta;
}
```

`filaDeEstudio()` devuelve `vigencia: vigenciaDeEstudio(estudio)`.

### 8.5 `src/lib/fechas.js` — vista previa

```js
export function sumarDias(fechaISO, dias) { /* misma aritmética UTC que el backend */ }

export function calcularVencimiento(fechaISO, { meses = 0, dias = 0 } = {}) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return '';
  return sumarDias(sumarMeses(fechaISO, Number(meses) || 0), Number(dias) || 0);
}

export function describirVigencia(meses = 0, dias = 0) { /* mismo texto que el backend */ }
```

---

## 9. Validaciones y mensajes (backend = fuente de verdad)

| Caso | Mensaje devuelto a la UI |
| --- | --- |
| Provisional con meses y días en 0 | `Indique la vigencia provisional: al menos 1 día (en meses o en días)` |
| Meses fuera de rango o con decimales | `El campo "Meses de la vigencia provisional" debe ser un número entero válido` |
| Días fuera de rango | `El campo "Días de la vigencia provisional" debe ser un número entero válido` |
| Tipo de estudio inexistente | `El tipo de estudio seleccionado no existe` *(ya existe)* |
| Fecha de realización futura | `La fecha de realización no puede ser futura` *(ya existe)* |
| Motivo con más de 200 caracteres | `El campo "Motivo del estudio provisional" no puede superar 200 caracteres` |

El formulario además pone `min`/`max`/`step` en los `input` para evitar la mayoría de estos errores
antes de enviar, pero **el backend vuelve a validar todo**.

---

## 10. Casos límite que ya consideré

1. **Renovar un estudio de catálogo con uno provisional del mismo tipo**: el provisional queda como el
   más reciente del tipo. Si el provisional vence, el empleado pasa a 🔴 aunque el estudio anterior
   siga vigente. Es consistente con la regla "sólo se evalúa el último estudio por tipo" que ya existe.
2. **Editar un estudio de catálogo y convertirlo en provisional**: se recalcula el vencimiento y se
   guardan los meses/días capturados. Al revés (provisional → catálogo) se vuelve a la vigencia del tipo.
3. **Cambiar la vigencia del tipo en "Tipos de estudio" + recalcular**: los provisionales **no** se tocan;
   sí se recalculan los estudios normales de ese tipo.
4. **Provisional con `NO_APTO`**: bloquea de inmediato (regla actual).
5. **Provisional ya vencido**: 🔴 BLOQUEADO con el motivo "vencido el dd/mm/aaaa".
6. **Provisional de 1 mes y 10 días vs. 40 días**: pueden dar fechas distintas; por eso se guarda
   `meses` y `días` por separado en lugar de un total de días.
7. **Fin de mes / año bisiesto**: `sumarMeses('2026-01-31', 1) = 2026-02-28`, luego `+1 día = 2026-03-01`.
8. **Borrar el tipo de estudio**: sigue bloqueado si tiene cualquier estudio (provisional incluido).
9. **Borrar el empleado**: cascada actual, sin cambios.
10. **Instalaciones existentes**: la migración agrega columnas con `DEFAULT 0`; los registros históricos
    quedan `es_provisional = 0` y con su vigencia del catálogo rellenada. Cero pérdida de datos.
11. **Doble validación fecha/vencimiento**: si el renderer manda una `fecha_vencimiento` distinta, se ignora.
12. **Zona horaria**: todas las fechas siguen en ISO y aritmética UTC, como hoy.

---

## 11. Pruebas que se agregarán a `scripts/verify.js`

Hoy hay **30/30 pruebas**; con esto quedarían **37/37**.

```js
prueba('sumarDias suma días de calendario', () => {
  assert.equal(semaforo.sumarDias('2026-03-01', 10), '2026-03-11');
  assert.equal(semaforo.sumarDias('2026-12-31', 1), '2027-01-01');
});

prueba('calcularVencimiento aplica meses y luego días', () => {
  assert.equal(semaforo.calcularVencimiento('2026-03-01', { meses: 1, dias: 10 }), '2026-04-11');
  assert.equal(semaforo.calcularVencimiento('2026-03-01', { meses: 0, dias: 10 }), '2026-03-11');
  assert.equal(semaforo.calcularVencimiento('2026-01-31', { meses: 1, dias: 1 }), '2026-03-01');
});

prueba('describirVigencia arma el texto en español', () => {
  assert.equal(semaforo.describirVigencia(1, 10), '1 mes y 10 días');
  assert.equal(semaforo.describirVigencia(0, 10), '10 días');
  assert.equal(semaforo.describirVigencia(12, 0), '12 meses');
});
```

```js
prueba('Estudio provisional de 1 mes y 10 días calcula su vencimiento', () => {
  const tipo = estudiosRepo.listarTiposEstudio()[0];
  const provisional = estudiosRepo.crearEstudio({
    empleado_id: empleadoId,
    tipo_estudio_id: tipo.id,
    fecha_realizacion: '2026-03-01',
    resultado: 'APTO',
    es_provisional: true,
    vigencia_meses: 1,
    vigencia_dias: 10
  });
  assert.equal(provisional.fecha_vencimiento, '2026-04-11');
  assert.equal(provisional.es_provisional, 1);
  assert.equal(provisional.vigencia_meses_aplicada, 1);
  assert.equal(provisional.vigencia_dias_aplicada, 10);
});

prueba('Estudio provisional sólo en días calcula su vencimiento', () => {
  // 10 días desde el 01/03/2026 -> 11/03/2026
});

prueba('Rechaza estudio provisional sin meses ni días', () => {
  const tipo = estudiosRepo.listarTiposEstudio()[0];
  assert.throws(
    () =>
      estudiosRepo.crearEstudio({
        empleado_id: empleadoId,
        tipo_estudio_id: tipo.id,
        fecha_realizacion: '2026-03-01',
        resultado: 'APTO',
        es_provisional: true,
        vigencia_meses: 0,
        vigencia_dias: 0
      }),
    /al menos 1 día/
  );
});

prueba('Cambiar la vigencia del catálogo no altera los estudios provisionales', () => {
  // tipo con un estudio normal y uno provisional:
  // recalcular_vencimientos = true => el normal cambia, el provisional conserva su fecha
});

prueba('El Excel incluye la vigencia aplicada y marca los provisionales', () => {
  const { libro } = construirLibro(obtenerEmpleadosConEstado());
  const filas = XLSX.utils.sheet_to_json(libro.Sheets.General, { header: 1 });
  assert.ok(filas[0].includes('Vigencia aplicada'));
  assert.ok(filas.some((fila) => String(fila).includes('Provisional · 1 mes y 10 días')));
});

prueba('La migración deja las columnas nuevas y user_version = 2', () => {
  const columnas = getDb().pragma('table_info(estudios_medicos)').map((c) => c.name);
  assert.ok(columnas.includes('es_provisional'));
  assert.equal(getDb().pragma('user_version', { simple: true }), 2);
});
```

Además se ajustará `npm run smoke:ui` si hace falta para abrir el formulario y capturar la pantalla
con la casilla marcada (opcional, no bloqueante).

---

## 12. Plan de implementación (orden de trabajo)

| # | Paso | Resultado verificable |
| --- | --- | --- |
| 1 | Migración en `schema.js` (`user_version` 2) | `npm run verify` sigue 30/30 y `user_version = 2` |
| 2 | `sumarDias` / `calcularVencimiento` / `describirVigencia` en `semaforo.js` | Pruebas de fechas en verde |
| 3 | `normalizarDatos` + `SQL_ESTUDIO` + `INSERT/UPDATE` en `estudios.js` | Crear/editar provisional desde `verify` |
| 4 | `WHERE es_provisional = 0` en el recálculo del catálogo | Prueba de no-regresión del recálculo |
| 5 | Columnas nuevas en `consultas.js` (`SQL_HISTORIA`) | El expediente devuelve los campos |
| 6 | `src/lib/fechas.js` + `EstudioForm.jsx` | Vista previa `1 mes y 10 días → vence 11/04/2026` |
| 7 | `EmpleadoDetalle.jsx` (badge + vigencia + motivo) | Expediente muestra el estudio provisional |
| 8 | `excel.js` (columna **Vigencia aplicada**) | Excel con la columna y el prefijo `Provisional ·` |
| 9 | Pruebas nuevas en `verify.js` | **37/37 OK** |
| 10 | `npm run build`, `npm run verify`, `npm run smoke:ui` | Build y UI sin errores |
| 11 | Actualizar `README.md` y `ROADMAP.md` | Documentación alineada |

Sin pasos destructivos: **no se borra ni se reinicia** ninguna base de datos.

---

## 13. Preguntas para confirmar (con el valor que tomaría por defecto)

1. **¿"Provisional" se marca con una casilla dentro del mismo formulario de estudio?**
   *Por defecto sí*: un solo formulario, casilla "Estudio provisional".
2. **¿Valores por defecto al activarla?** *Por defecto* `0 meses y 30 días` (ajustable a `15 días` o lo que digas).
3. **¿Límites?** *Por defecto* meses `0–120` y días `0–365`.
4. **¿Se captura un motivo del provisional?** *Por defecto sí, opcional* (máx. 200 caracteres).
5. **¿El recálculo de "Tipos de estudio" debe respetar los provisionales?** *Por defecto sí* (no se tocan).
6. **¿Distintivo también en el Dashboard / bandeja de pendientes?**
   *Por defecto* sólo en el expediente y en el Excel, para no ensuciar la bandeja.
7. **¿Los provisionales cuentan distinto en las tarjetas de resumen?** *Por defecto no*: se evalúan igual.

Si alguna respuesta cambia, se ajusta este documento y después se implementa.

---

## 14. Criterios de aceptación (cómo sabremos que quedó bien)

- [ ] Puedo registrar un estudio eligiendo un tipo existente y marcándolo como **provisional**.
- [ ] `1 mes y 10 días` desde el 01/03/2026 vence el **11/04/2026**; `sólo 10 días` vence el **11/03/2026**.
- [ ] No se puede guardar un provisional con `0 meses y 0 días` (mensaje claro en el formulario).
- [ ] Al editar el estudio, la casilla vuelve marcada con los mismos meses y días.
- [ ] El expediente muestra el badge **Provisional** y `Vigencia: 1 mes y 10 días`.
- [ ] El semáforo reacciona igual que con cualquier estudio (🟡 a ≤ 30 días, 🔴 al vencer o con `NO_APTO`).
- [ ] Cambiar la vigencia de un tipo **no** modifica los estudios provisionales.
- [ ] El Excel trae la columna **Vigencia aplicada** con `Provisional · 1 mes y 10 días`.
- [ ] Base existente: migra a `user_version = 2` **sin perder registros** y sin cambiar fechas.
- [ ] `npm run verify` → **37/37 OK**; `npm run build` y `npm run smoke:ui` sin errores.

---

## 15. Validación técnica ya realizada (antes de tocar la app)

Para no proponer algo que luego falle, ejecuté un script temporal con **Electron 38 +
better-sqlite3 12** (el mismo binario nativo que usa la app) que reprodujo la migración y la
aritmética de fechas. Resultados:

| Comprobación | Resultado |
| --- | --- |
| `1 mes y 10 días` desde `2026-03-01` | `2026-04-11` ✅ |
| `0 meses y 10 días` desde `2026-03-01` | `2026-03-11` ✅ |
| `2 meses y 0 días` desde `2026-03-01` | `2026-05-01` ✅ |
| `1 mes y 1 día` desde `2026-01-31` | `2026-03-01` ✅ (fin de mes respetado) |
| `0 meses y 30 días` desde `2026-03-15` | `2026-04-14` ✅ |
| `12 meses y 0 días` desde `2026-03-15` | `2027-03-15` ✅ |
| `ALTER TABLE ... ADD COLUMN ... CHECK` en SQLite | ✅ aceptado (rechaza `es_provisional = 2`) |
| Relleno de registros históricos (`vigencia_meses_aplicada`) | ✅ 1 registro actualizado, `fecha_vencimiento` intacta |
| Segunda ejecución de la migración | ✅ idempotente, no duplica ni altera nada |
| Inserción de un provisional (`1` mes, `10` días, motivo) | ✅ guardado correcto con `2026-04-11` |

El script temporal se eliminó: **no se modificó ningún archivo de la aplicación**, sólo se creó este
documento. Cuando apruebes el diseño, implemento los pasos de la sección 12.
