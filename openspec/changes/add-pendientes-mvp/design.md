# Diseño: add-pendientes-mvp

## Decisiones (con su porqué)

| # | Decisión | Por qué | Trade-off aceptado |
|---|---|---|---|
| D1 | Android + PWA con el mismo código Ionic | Android da avisos confiables; la PWA se comparte por un link de WhatsApp sin instalar nada | En la PWA el aviso de vencimiento depende del calendario del usuario (`.ics`) |
| D2 | Sin backend, sin login | Datos de salud = datos sensibles (Ley 1581 de 2012); menos superficie legal y menos desarrollo | Si se borra la app o los datos del navegador, se pierden los pendientes (respaldo JSON en fase 2) |
| D3 | `idb-keyval` (IndexedDB) en ambas plataformas | Un solo camino de persistencia; guarda fotos como `Blob` sin el límite de ~5 MB de localStorage | IndexedDB en la PWA puede ser borrado por el navegador; se pide `navigator.storage.persist()` y, si se niega, la app sigue funcionando normalmente |
| D4 | PDF con `pdfmake` en el dispositivo | Funciona sin conexión; no hay servidor que reciba datos de salud | Diseño del PDF más limitado que HTML→PDF |
| D5 | Salidas: copiar (corto) + PDF (completo) + compartir. Sin Word | El usuario objetivo no edita `.docx` en el celular; el PDF no se desconfigura | Quien quiera editar lo hace en la vista previa de la app |
| D6 | El contenido legal vive solo en dos archivos de datos: `normas.json` y las plantillas aprobadas (`plantillas.ts`). Nunca en componentes | El texto aprobado debe quedar literal; generarlo dinámicamente desde `normas.json` produciría frases sin revisión | Si cambia una norma hay que actualizar `normas.json` y, si la cita, la plantilla aprobada |
| D7 | El plazo cuenta desde la hora de reclamo, 48 horas corridas. La hora es editable, no puede ser futura y se bloquea cuando hay una queja registrada | La Resolución 1604 de 2013 define que las 48 h corren desde que el afiliado reclama; bloquearla evita contradecir un documento ya radicado | Si se registró mal antes de radicar, hay que borrar el pendiente y crearlo de nuevo |
| D8 | La app no clasifica el riesgo del reclamo ante la Supersalud | La clasificación la hace la Supersalud; adivinarla sería dar asesoría legal | El paso 2 no muestra un plazo de respuesta |
| D9 | El estado y el evento "venció el plazo" se calculan; nunca se guardan | No dependen de que la app esté abierta al vencer y no pueden quedar inconsistentes | La bitácora de pantalla y la del PDF se arman con una función, no se leen tal cual |
| D10 | Sin pantalla de Ajustes en el MVP | Menos pantallas; las dos acciones que la necesitarían (ayuda de batería y borrar todo) caben en flujos existentes | La ayuda de batería se muestra una sola vez; se puede volver a abrir desde el aviso de permisos |
| D11 | Carpetas por concepto en 4 capas (`domain`, `data`, `platform`, `features` + `shared`) con dependencias en una sola dirección; `domain/` sin Angular, Ionic ni Capacitor | La guía de estilo de Angular pide organizar por concepto y no por tipo; un dominio puro se prueba sin `TestBed` y protege la lógica legal y de plazos de cambios de framework | Más carpetas que una estructura plana; la regla de dependencias se revisa en cada PR (sin herramienta automática en el MVP) |
| D12 | Alias de rutas en `tsconfig.json`: `@domain/*`, `@data/*`, `@platform/*`, `@shared/*` | Imports legibles y, en un PR, se ve de inmediato si una capa importa algo que no le corresponde | Ninguno relevante: lo resuelve el compilador; no requiere librerías |

## Estructura de carpetas (D11)

```
src/app/
  domain/                        # TypeScript puro: sin Angular, Ionic ni Capacitor
    pendiente/
      pendiente.model.ts         # Pendiente, Queja, Gestion, eventos, EstadoPendiente
      plazo.ts                   # vencimiento, estado, textoContador, validarHoraReclamo
      bitacora.ts                # bitacoraVista, registrarQueja
    paciente/
      paciente.model.ts
    reclamo/
      plantillas.ts              # texto legal aprobado de plantillas.md, literal
      plantillas-pdf.ts          # definición del PDF para pdfmake
    norma/
      norma.model.ts
    calendario/
      ics.ts                     # genera el texto del .ics (UID fijo)
  data/                          # de dónde salen y adónde van los datos
    app-db.ts                    # envoltura de idb-keyval
    pacientes-store.ts
    pendientes-store.ts
    preferencias-store.ts
    normas-catalogo.ts           # lee normas.json; paraPaso(paso)
  platform/                      # único lugar que importa @capacitor/*
    plataforma.ts                # isNative()
    notificaciones.ts
    compartir.ts
    camara.ts
    calendario-descarga.ts       # descarga del .ics en la PWA
  features/                      # una carpeta por ruta; subcomponentes planos al lado
    inicio/                      # inicio.ts, pendiente-item.ts
    ventanilla/
    pendiente-form/
    pendiente-detalle/           # pendiente-detalle.ts, contador.ts, bitacora-lista.ts, escalera.ts
    reclamo/                     # reclamo.ts, vista-previa.ts
    pacientes/
  shared/                        # UI de presentación, sin lógica de negocio
    norma-card/                  # tarjeta "¿Por qué tienes derecho?"
    ayuda-avisos/                # hoja de ayuda de batería (Android)
    estado-chip/                 # etiqueta + color de cada estado
    aviso-legal/                 # línea fija al pie + modal de primera apertura
  app.ts · app.config.ts · app.routes.ts
src/assets/data/
  normas.json
```

Cada `.spec.ts` vive al lado de su archivo (ej. `plazo.spec.ts` junto a `plazo.ts`).

### Reglas de la estructura

1. **Por concepto, no por tipo.** No se crean carpetas `components/`, `services/` ni `models/`
   (guía de estilo de Angular). Cada modelo vive junto a la lógica que lo usa.
2. **Dependencias en una sola dirección:**
   ```
   features → shared, data, platform, domain
   shared   → domain (solo tipos)
   data     → domain
   platform → domain (solo tipos)
   domain   → nada (solo TypeScript y tipos de pdfmake)
   ```
3. **Solo `platform/` importa `@capacitor/*`.** Cada adaptador resuelve internamente el camino
   Android y el respaldo de la PWA; las pantallas nunca preguntan si están en nativo.
4. **Nombres de Angular 22:** sin sufijo de rol (`pendiente-detalle.ts` → `class PendienteDetalle`);
   los tipos llevan `.model.ts`. Ninguna pantalla se llama solo como un tipo (`Pendiente`).
5. **Imports entre capas con alias** (D12): `import { estado } from '@domain/pendiente/plazo'`.
   Dentro de la misma carpeta se usan rutas relativas.

## Modelo de datos

```ts
interface Paciente {
  id: string;
  nombre: string;
  tipoDocumento: 'CC' | 'CE' | 'TI' | 'PA' | 'PPT';
  numeroDocumento: string;            // único junto con tipoDocumento
  eps: string;
  telefono: string;
  correo?: string;
  direccion: string;                  // se precarga como direccionEntrega
}

interface Pendiente {
  id: string;
  pacienteId: string;
  gestion?: Gestion;                  // si alguien gestiona por el paciente
  medicamentos: string[];
  farmacia: string;                   // farmacia o gestor farmacéutico
  horaReclamo: string;                // ISO; inicia el plazo; nunca futura
  numeroComprobante?: string;
  fotoComprobanteKey?: string;        // clave del Blob en IndexedDB
  autorizoDomicilio: boolean;
  direccionEntrega: string;           // siempre obligatoria
  entregadoEn?: string;               // ISO
  quejaEps?: Queja;                   // una sola; registrarla de nuevo la reemplaza
  quejaSupersalud?: Queja;            // una sola; registrarla de nuevo la reemplaza
  icsAgregadoEn?: string;             // ISO; para el aviso "Ya agregaste este recordatorio"
  bitacora: EventoGuardado[];
}

interface Queja {
  radicadaEn: string;                 // ISO
  radicado?: string;
}

interface Gestion {                   // todos obligatorios cuando existe
  nombre: string;
  tipoDocumento: Paciente['tipoDocumento'];
  numeroDocumento: string;
  parentesco: string;                 // "hijo", "hija", "cuidador", etc.
}

/** Eventos que SÍ se guardan en IndexedDB. */
type TipoEventoGuardado = 'creado' | 'queja-eps' | 'queja-supersalud' | 'entregado' | 'nota';

interface EventoGuardado {
  en: string;                         // ISO
  tipo: TipoEventoGuardado;
  texto: string;
}

/**
 * Solo para pantalla y PDF. 'vencido' NUNCA se guarda: lo inserta bitacoraVista()
 * a la hora de vencimiento (ver "Bitácora derivada").
 */
type TipoEventoVista = TipoEventoGuardado | 'vencido';

interface EventoVista {
  en: string;
  tipo: TipoEventoVista;
  texto: string;
}

interface Preferencias {              // clave única 'preferencias' en IndexedDB
  avisoLegalAceptado: boolean;
  ayudaAvisosVista: boolean;
}

interface Norma {
  id: string;
  nombre: string;                     // "Decreto-Ley 019 de 2012"
  articulo?: string;                  // "Artículo 131"
  resumen: string;                    // ver "Criterio de lenguaje sencillo"
  urlFuente: string;
  verificadoEl: string;               // "2026-10-04"
  aplicaA: Array<'ventanilla' | 'plazo' | 'queja-eps' | 'queja-supersalud' | 'red-alterna'>;
}
```

## Estado derivado (Signals)

```ts
type EstadoPendiente =
  | 'en-plazo' | 'vencido' | 'escalado-eps' | 'escalado-supersalud'
  | 'entregado-a-tiempo' | 'entregado-tarde';

// domain/pendiente/plazo.ts — funciones puras; reciben `ahora` para poder testearlas
export const PLAZO_HORAS = 48;
export function vencimiento(horaReclamo: string): Date;
export function estado(p: Pendiente, ahora: Date): EstadoPendiente;
export function textoContador(p: Pendiente, ahora: Date): string;
export function validarHoraReclamo(hora: string, ahora: Date): 'ok' | 'futura';
```

Reglas de `estado()`, en orden:
1. Si `entregadoEn` existe → `entregado-a-tiempo` si `entregadoEn <= vencimiento`, si no `entregado-tarde`.
2. Si `quejaSupersalud` existe → `escalado-supersalud`.
3. Si `quejaEps` existe → `escalado-eps`.
4. Si `ahora > vencimiento` → `vencido`.
5. Si no → `en-plazo`.

Reglas de `textoContador()` (solo cuando el pendiente no está entregado):
- Falta 1 h o más → `Faltan X h` (redondeo hacia abajo)
- Falta menos de 1 h → `Faltan X min`
- Vencido hace menos de 1 h → `Vencido hace X min`
- Vencido hace 1 h o más, pero menos de 48 h → `Vencido hace X h`
- Vencido hace 48 h o más → `Vencido hace X días`

En la UI, una signal `ahora` se actualiza cada minuto.

## Etiquetas y colores de estado

| Estado | Etiqueta | Color |
|---|---|---|
| `en-plazo` | En plazo | verde |
| `vencido` | Vencido | rojo |
| `escalado-eps` | Queja ante EPS | naranja |
| `escalado-supersalud` | Queja ante Supersalud | rojo oscuro |
| `entregado-a-tiempo` | Entregado a tiempo | verde oscuro |
| `entregado-tarde` | Entregado tarde | gris |

Accesibilidad: el color **nunca** va solo; siempre acompaña la etiqueta de texto, y todos los
colores pasan contraste (≥ 4.5:1 sobre fondo claro).

## Bitácora derivada

```ts
// domain/pendiente/bitacora.ts
export function bitacoraVista(p: Pendiente, ahora: Date): EventoVista[];
export function registrarQueja(p: Pendiente, paso: 'eps' | 'supersalud', q: Queja): Pendiente;
```

- `bitacoraVista()` toma `p.bitacora` y, si `ahora > vencimiento` y el pendiente no se entregó antes
  del vencimiento, inserta `{ tipo: 'vencido', en: vencimiento, texto: 'Venció el plazo de 48 horas' }`.
  Devuelve todo ordenado por fecha. La pantalla y el PDF usan solo esta función.
- `registrarQueja()` reemplaza `quejaEps`/`quejaSupersalud` y **actualiza** el evento de ese tipo
  si ya existía, en lugar de agregar otro.

## Avisos

- **Android:** `LocalNotifications.schedule` a la hora de vencimiento, con un ID numérico
  derivado del ID del pendiente. Se cancela al entregar o borrar el pendiente y se reprograma al
  editar la hora. Al iniciar la app (`provideAppInitializer`) se reprograman todos los pendientes abiertos.
- **Permiso denegado:** el detalle del pendiente muestra un aviso con "Activar notificaciones"
  y "Agregar a mi calendario" (reutiliza el `.ics`).
- **Ayuda de batería:** la primera vez que se registra un pendiente en Android se abre
  `shared/ayuda-avisos` (enlace a dontkillmyapp.com) y se guarda `ayudaAvisosVista = true`.
- **PWA:** botón que genera un `.ics` (VEVENT armado a mano, sin librería) con
  `UID: pendiente-<id>@pendientes48`, `DTSTART` = vencimiento y `VALARM` a la misma hora.
  Si `icsAgregadoEn` existe, antes de descargar se muestra "Ya agregaste este recordatorio el…".
- `platform/plataforma.ts` (`isNative()`) decide el camino; solo lo usan los adaptadores de `platform/`, nunca las pantallas.

## Documentos

- `domain/reclamo/plantillas.ts` exporta funciones puras `(datos) => string` para el texto corto y
  `(datos) => PdfDocDefinition` para el PDF. El texto legal es literal y viene de `plantillas.md` aprobado.
- Fundamento legal del PDF: `normas.filter(n => n.aplicaA.includes(paso))`.
- El texto corto **no** incluye el aviso de no asesoría; el aviso va en la pantalla de copiar y en el pie del PDF.
- Si `autorizoDomicilio` es `false`, la vista previa muestra la nota
  "Este texto incluye tu autorización de entrega a domicilio".
- La foto del comprobante se reduce a máximo 1280 px de lado (JPEG 0.7) antes de guardarse.

## Criterio de lenguaje sencillo (`normas.json`)

Cada `resumen`: máximo 2 oraciones y 45 palabras, dirigido al usuario como "usted",
sin siglas salvo "EPS". Lo verifica una prueba unitaria.

## Pruebas mínimas

- `plazo.spec.ts`: vencimiento exacto, cambio de día y de mes, cada regla de `estado()`,
  cada rama de `textoContador()`, `validarHoraReclamo()` con hora futura.
- `bitacora.spec.ts`: `bitacoraVista()` con y sin vencimiento, entrega antes y después de vencer;
  `registrarQueja()` repetida no duplica eventos.
- `ics.spec.ts`: `DTSTART` correcto en UTC y `UID` estable para el mismo pendiente.
- `plantillas.spec.ts`: los 4 casos de `plantillas.md`.
- `normas-catalogo.spec.ts`: criterio de lenguaje sencillo para cada `resumen`.
- `pendientes-store.spec.ts` / `pacientes-store.spec.ts`: fallo de escritura devuelve error controlado; perfil duplicado detectado.

## Riesgos

- **Normas desactualizadas:** mitigado con `verificadoEl` visible y revisión periódica.
- **Batería en Android (Xiaomi/Samsung):** la notificación puede retrasarse. Mitigación:
  permiso de alarmas exactas + hoja `ayuda-avisos` + alternativa `.ics`.
- **Interpretación legal:** la app explica y cita; no concluye. Aviso de no asesoría fijo en inicio,
  en cada tarjeta de norma, en la pantalla de copiar y en el pie de cada PDF.
