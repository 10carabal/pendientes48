# Diseño: add-pendientes-mvp

## Decisiones (con su porqué)

| # | Decisión | Por qué | Trade-off aceptado |
|---|---|---|---|
| D1 | Android + PWA con el mismo código Ionic | Android da avisos confiables; la PWA se comparte por un link de WhatsApp sin instalar nada | En la PWA el aviso de vencimiento depende del calendario del usuario (`.ics`) |
| D2 | Sin backend, sin login | Datos de salud = datos sensibles (Ley 1581 de 2012); menos superficie legal y menos desarrollo | Si se borra la app o los datos del navegador, se pierden los pendientes (respaldo JSON en fase 2) |
| D3 | `idb-keyval` (IndexedDB) en ambas plataformas | Un solo camino de persistencia; guarda fotos como `Blob` sin el límite de ~5 MB de localStorage | IndexedDB en la PWA puede ser borrado por el navegador; se pide `navigator.storage.persist()` y, si se niega, la app sigue funcionando normalmente |
| D4 | PDF con `pdfmake` en el dispositivo | Funciona sin conexión; no hay servidor que reciba datos de salud | Diseño del PDF más limitado que HTML→PDF |
| D5 | Salidas: copiar (corto) + PDF (completo) + compartir. Sin Word | El usuario objetivo no edita `.docx` en el celular; el PDF no se desconfigura | Quien quiera editar lo hace en la vista previa de la app |
| D6 | El contenido legal vive en `normas.json`, en las plantillas aprobadas y, como constantes de texto fijo aprobado por Daniel, en `domain/` (`PIE_PDF` en `reclamo/plantillas-pdf.ts`, `AVISO_NO_ASESORIA` en `norma/aviso.ts`). Nunca hardcodeado en componentes: las pantallas inyectan esas constantes a `shared/` por input (ampliación de 2026-10-13) | El texto aprobado debe quedar literal; generarlo dinámicamente produciría frases sin revisión y el componente no debe decidir qué texto mostrar | Si cambia una norma hay que actualizar `normas.json` y, si la cita, la plantilla; un texto fijo se cambia en su constante y se aprueba |
| D7 | El plazo cuenta desde la hora de reclamo, 48 horas corridas. La hora es editable, no puede ser futura y se bloquea cuando hay una queja registrada | La Resolución 1604 de 2013 define que las 48 h corren desde que el afiliado reclama; bloquearla evita contradecir un documento ya radicado | Si se registró mal antes de radicar, hay que borrar el pendiente y crearlo de nuevo |
| D8 | La app no clasifica el riesgo del reclamo ante la Supersalud | La clasificación la hace la Supersalud; adivinarla sería dar asesoría legal | El paso 2 no muestra un plazo de respuesta |
| D9 | El estado y el evento "venció el plazo" se calculan; nunca se guardan | No dependen de que la app esté abierta al vencer y no pueden quedar inconsistentes | La bitácora de pantalla y la del PDF se arman con una función, no se leen tal cual |
| D10 | Sin pantalla de Ajustes en el MVP | Menos pantallas; las dos acciones que la necesitarían (ayuda de batería y borrar todo) caben en flujos existentes | La ayuda de batería se muestra una sola vez; se puede volver a abrir desde el aviso de permisos |
| D11 | Carpetas por concepto: `domain`, `data`, `platform`, `features` y `shared`, con dependencias en una sola dirección; `domain/` sin Angular, Ionic ni Capacitor | La guía de estilo de Angular pide organizar por concepto y no por tipo; un dominio puro se prueba sin `TestBed` y protege la lógica legal y de plazos de cambios de framework | Más carpetas que una estructura plana; la regla de dependencias se revisa en cada PR (sin herramienta automática en el MVP) |
| D12 | Alias de rutas en `tsconfig.json`: `@domain/*`, `@data/*`, `@platform/*`, `@shared/*` | Imports legibles y, en un PR, se ve de inmediato si una capa importa algo que no le corresponde | Ninguno relevante: lo resuelve el compilador; no requiere librerías |
| D13 | El service worker (`@angular/pwa`) se activa solo en la PWA: `enabled: !isDevMode() && !isNative()` | En Android los archivos ya vienen dentro del APK; un service worker ahí no aporta nada y puede servir archivos viejos en caché tras una actualización | La app Android no tiene caché del service worker (no la necesita: funciona sin conexión porque todo está en el APK) |
| D14 | Sistema de diseño propio "documento limpio" (minimalista, inspirado en la estética de herramientas tipo Notion, con valores propios) con tokens en `src/theme/` y patrones de Refactoring UI; mockup aprobado por Daniel el 2026-10-05 | Interfaz elegante y sencilla para adultos mayores; los tokens evitan decisiones visuales en cada pantalla y hacen revisable cada PR | Toda pantalla depende de la tarea 0.5; nada de colores, tamaños ni espaciados sueltos |
| D15 | Solo modo claro en el MVP; se quita `dark.system.css` | Cada par de colores necesita revisión de contraste; el modo oscuro duplicaría la verificación | Quien use el celular en modo oscuro verá la app en claro (modo oscuro en fase 2) |
| D16 | Un solo estilo de Ionic en todas las plataformas: `provideIonicAngular({ mode: 'ios' })` | Es el más plano y cercano al estilo buscado; una sola apariencia que verificar en Android, PWA y escritorio | En Android algunos controles no lucen "nativos" de Material |
| D17 | Identidad: ícono **B** (cápsula dentro del arco del plazo, trazo blanco sobre `#1F1E1C`) y splash **blanco** con el ícono en círculo; fuentes SVG en `assets/fuente/`, Android generado con `@capacitor/assets` y PWA en PNG propios (aprobado por Daniel el 2026-10-05) | La cápsula dice "medicamento" y el arco dice "plazo" a 48 px; el splash blanco no produce salto de color al abrir la app; sin cruz (emblema protegido y apariencia oficial) | Ícono provisional de autor (no de diseñador de marca); cambiarlo exige regenerar con el mismo comando |

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
    guia/                        # guía de estilo /guia, solo en desarrollo (D14)
  shared/                        # UI de presentación, sin lógica de negocio
    norma-card/                  # tarjeta "¿Por qué tienes derecho?"
    ayuda-avisos/                # hoja de ayuda de batería (Android)
    estado-chip/                 # etiqueta + color de cada estado
    aviso-legal/                 # línea fija al pie + modal de primera apertura
  app.ts · app.config.ts · app.routes.ts
src/assets/data/
  normas.json
assets/                          # identidad (D17): PNG fuente para @capacitor/assets
  fuente/                        # SVG editables del ícono y del splash
public/icons/                    # íconos de la PWA (48, 180, 192, 512)
src/theme/                       # sistema de diseño (D14): fuera de las capas de src/app
  tokens.css                     # variables --p48-*
  variables.css                  # mapeo de los tokens a las variables de Ionic
  patrones.scss                  # clases de los 7 patrones (botones, acento, ícono, superficie…)
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
   Dentro de la misma carpeta se usan rutas relativas. Los archivos raíz (`app.ts`,
   `app.config.ts`, `app.routes.ts`) son la composición de la app: importan `features/`
   con ruta relativa (`./features/inicio/inicio`) y cualquier otra capa con su alias
   (ej. `app.config.ts` usa `@platform/plataforma`). Una feature jamás importa
   de otra feature; si dos pantallas comparten UI va a `shared/`, y si comparten lógica
   a `domain/` o `data/`.

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

Valores del mockup aprobado (D14). Fondo suave + texto oscuro **del mismo tono** (nunca gris sobre color).

| Estado | Etiqueta | Color | Fondo | Texto |
|---|---|---|---|---|
| `en-plazo` | En plazo | azul | `#E8EFFD` | `#1E3A8A` |
| `vencido` | Vencido | rojo | `#FDECEC` | `#9B1C1C` |
| `escalado-eps` | Queja ante EPS | naranja | `#FDF0E3` | `#8A4210` |
| `escalado-supersalud` | Queja ante Supersalud | naranja | `#FDF0E3` | `#8A4210` |
| `entregado-a-tiempo` | Entregado a tiempo | verde | `#E7F5EC` | `#1F6B3A` |
| `entregado-tarde` | Entregado tarde | gris | `#EFEEEB` | `#4A4945` |

Accesibilidad: el color **nunca** va solo; siempre acompaña la etiqueta de texto, y cada par
fondo/texto cumple ≥ 4.5:1. Los dos estados de queja comparten color porque significan lo mismo
para el usuario ("ya reclamé"); la etiqueta dice ante quién.

## Sistema de diseño (D14–D16)

Referencia visual: mockup aprobado (lienzo privado de Daniel, "Pendientes48 — Mockup sistema de
diseño": Inicio y Detalle en celular y en escritorio, más el tablero de tokens).

### Principios
- **Minimalismo por resta:** menos colores, bordes y decoración; nunca texto más pequeño ni más claro.
- Fondo blanco, texto casi negro, un solo color de enlace. El color aparece solo cuando comunica
  (estados, alertas, acción principal).
- Tipografía del sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`):
  ninguna fuente externa (cargarla de Google contactaría a un tercero, contra la regla local-first).
- Íconos de línea (Ionicons, ya incluidos en Ionic), pocos y siempre con texto o `aria-label`.

### Tokens (`src/theme/tokens.css`, prefijo `--p48-`)

| Token | Valor | Uso |
|---|---|---|
| `--p48-fondo` | `#FFFFFF` | Fondo de pantalla |
| `--p48-superficie` | `#F6F5F3` | Agrupar contenido (en lugar de bordes) |
| `--p48-texto` | `#1F1E1C` | Texto principal |
| `--p48-texto-secundario` | `#5F5E5A` | Texto secundario (6,5:1) |
| `--p48-borde-campo` | `#8F8D88` | Borde de campos de formulario (3,3:1) |
| `--p48-enlace` | `#1D4ED8` | Enlaces y botones terciarios |
| `--p48-accion` | `#1F1E1C` | Botón principal (texto blanco) |
| `--p48-destructivo` | `#9B1C1C` | Botón terciario destructivo |
| Estados | tabla anterior | Etiquetas, alertas e íconos de estado |
| Acentos | norma `#3B6FE0` · alerta `#C53030` · permiso `#C2650F` · aviso `#C9C7C2` | Barras de acento |
| Tipografía | 24 / 20 / 18 px; peso 600 en títulos; interlineado 1,5 | Ningún texto de la app por debajo de 18 px |
| Espaciado | 4 · 8 · 12 · 16 · 24 · 32 px | Márgenes y separaciones |
| Esquinas | 12 px superficies y botones · 10 px campos · 999 px etiquetas | — |
| Área táctil | mínimo 48 × 48 px; botones principal y secundario de 56 px | — |
| Sombra flotante | `0 4px 8px -2px rgba(31,30,28,.22), 0 2px 4px -2px rgba(31,30,28,.14)` | Solo superficies flotantes |
| Diálogos | modal 440 px · hoja 560 px · scrim `color-mix(--p48-texto 40%, transparent)` | Ancho máximo de cajas modales y fondo atenuado bajo un diálogo (añadidos en 3.1) |

### Patrones (de Refactoring UI, "7 Practical Tips for Cheating at Design")
1. **Jerarquía con peso y color, no con tamaño:** lo secundario cambia de tono, no de tamaño.
2. **Texto del mismo tono sobre fondos de color:** nunca gris sobre color.
3. **Sombra desplazada hacia abajo:** solo en superficies flotantes (botón principal flotante, hojas, modales).
4. **Menos bordes:** separar con espacio y `--p48-superficie`; el único borde es el de los campos.
5. **Ícono pequeño dentro de un círculo:** el ícono se queda en 18–20 px; el círculo (36–44 px) le da presencia.
6. **Barra de acento lateral (4 px):** tarjeta de la norma, alerta de vencimiento, aviso de permiso y aviso legal.
7. **Tres niveles de botón:** principal sólido (**uno por pantalla**), secundario con contorno,
   terciario como enlace (también el destructivo; el rojo sólido solo dentro de la confirmación).

### Adaptación por tamaño
- **Celular (PWA y Android):** una columna; el botón principal flota al pie con la sombra del patrón 3.
- **Escritorio (PWA):** contenido centrado con ancho máximo (Inicio 760 px, Detalle 1080 px); el
  botón principal sube junto al título (Inicio) o a la columna lateral (Detalle).
- **Detalle en escritorio:** dos columnas que se apilan solas al faltar espacio (`flex-wrap`):
  principal (estado, alerta, pasos, bitácora) y lateral (acciones, tarjeta de la norma).

### Principios de experiencia
- Una tarea por pantalla, con un título que diga qué se hace ahí.
- Lenguaje sencillo, sin siglas salvo "EPS".
- Pantallas vacías que explican qué hacer.
- Confirmación solo antes de acciones destructivas; para lo demás, un aviso breve ("Guardado").

### Guía de estilo
`features/guia/` en la ruta `/guia`, registrada **solo en desarrollo** (`isDevMode()`). Muestra
tokens y patrones a 390 px y a 1280 px; desde la 3.1 incluye también los componentes de `shared/`.

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
