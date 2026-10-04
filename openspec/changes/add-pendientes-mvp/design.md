# Diseño: add-pendientes-mvp

## Decisiones (con su porqué)

| # | Decisión | Por qué | Trade-off aceptado |
|---|---|---|---|
| D1 | Android + PWA con el mismo código Ionic | Android da avisos confiables; la PWA se comparte por un link de WhatsApp sin instalar nada | En la PWA el aviso de vencimiento depende del calendario del usuario (`.ics`) |
| D2 | Sin backend, sin login | Datos de salud = datos sensibles (Ley 1581 de 2012); menos superficie legal y menos desarrollo | Si se borra la app o los datos del navegador, se pierden los pendientes (respaldo JSON en fase 2) |
| D3 | `idb-keyval` (IndexedDB) en ambas plataformas | Un solo camino de persistencia; guarda fotos como `Blob` sin el límite de ~5 MB de localStorage | IndexedDB en la PWA puede ser borrado por el navegador; se pide `navigator.storage.persist()` |
| D4 | PDF con `pdfmake` en el dispositivo | Funciona sin conexión; no hay servidor que reciba datos de salud | Diseño del PDF más limitado que HTML→PDF |
| D5 | Salidas: copiar (corto) + PDF (completo) + compartir. Sin Word | El usuario objetivo no edita `.docx` en el celular; el PDF no se desconfigura | Quien quiera editar lo hace en la vista previa de la app |
| D6 | Normas y plantillas como datos (`normas.json`, `plantillas.ts`) | El contenido legal cambia; se edita sin tocar componentes y se versiona | Hay que mantener la etiqueta "Verificado el" al día |
| D7 | El plazo cuenta desde la hora de reclamo, 48 horas corridas | La Resolución 1604 de 2013 define que las 48 h corren desde que el afiliado reclama | Si la hora registrada es incorrecta, el aviso también lo es; por eso es editable |
| D8 | La app no clasifica el riesgo del reclamo ante la Supersalud | La clasificación la hace la Supersalud; adivinarla sería dar asesoría legal | El paso 2 no muestra un plazo de respuesta |

## Estructura de carpetas

```
src/app/
  core/
    models/            # interfaces de dominio
    storage/           # repositorio sobre idb-keyval
    domain/            # lógica pura y testeable (plazos, plantillas, bitácora)
    platform/          # adaptadores: notificaciones, compartir, cámara, calendario
  features/
    inicio/            # lista de pendientes + botón "Me dejaron un pendiente"
    ventanilla/        # guía paso a paso
    pendiente-form/    # registro y edición
    pendiente-detalle/ # contador, tarjeta de norma, bitácora, escalera
    reclamo/           # vista previa, copiar, PDF, compartir
    pacientes/         # perfiles de paciente
  shared/
    norma-card/        # tarjeta "¿Por qué tienes derecho?"
src/assets/data/
  normas.json
```

## Modelo de datos

```ts
interface Paciente {
  id: string;
  nombre: string;
  tipoDocumento: 'CC' | 'CE' | 'TI' | 'PA' | 'PPT';
  numeroDocumento: string;
  eps: string;
  telefono: string;
  correo?: string;
  direccion: string;
}

interface Pendiente {
  id: string;
  pacienteId: string;
  gestion?: Gestion;                  // si alguien gestiona por el paciente
  medicamentos: string[];
  farmacia: string;                   // farmacia o gestor farmacéutico
  horaReclamo: string;                // ISO; inicia el plazo
  numeroComprobante?: string;
  fotoComprobanteKey?: string;        // clave del Blob en IndexedDB
  autorizoDomicilio: boolean;
  direccionEntrega: string;            // siempre obligatoria; se precarga desde el perfil
  entregadoEn?: string;               // ISO
  quejaEps?: { radicadaEn: string; radicado?: string; canal?: string };
  quejaSupersalud?: { radicadaEn: string; radicado?: string };
  recordatorioIcsEn?: string;         // ISO; última descarga del .ics (aviso de duplicado)
  bitacora: EventoBitacora[];
}

interface Gestion {                   // todos obligatorios cuando existe
  nombre: string;
  tipoDocumento: Paciente['tipoDocumento'];
  numeroDocumento: string;
  parentesco: string;                 // "hijo", "hija", "cuidador", etc.
}

type TipoEvento = 'creado' | 'vencido' | 'queja-eps' | 'queja-supersalud' | 'entregado' | 'nota';

interface EventoBitacora {
  en: string;                         // ISO
  tipo: TipoEvento;
  texto: string;
}

interface Norma {
  id: string;
  nombre: string;                     // "Decreto-Ley 019 de 2012"
  articulo?: string;                  // "Artículo 131"
  resumen: string;                    // lenguaje sencillo, redacción propia
  urlFuente: string;
  verificadoEl: string;               // "2026-10-04"
  aplicaA: Array<'ventanilla' | 'plazo' | 'queja-eps' | 'queja-supersalud' | 'red-alterna'>;
}
```

## Estado derivado (Signals)

El estado del pendiente NO se guarda; se calcula para evitar inconsistencias:

```ts
type EstadoPendiente =
  | 'en-plazo' | 'vencido' | 'escalado-eps' | 'escalado-supersalud'
  | 'entregado-a-tiempo' | 'entregado-tarde';

// domain/plazo.ts — función pura, recibe `ahora` para poder testearla
export const PLAZO_HORAS = 48;
export function vencimiento(horaReclamo: string): Date { /* + 48 h */ }
export function estado(p: Pendiente, ahora: Date): EstadoPendiente { /* reglas */ }
```

Reglas de `estado()`, en orden:
1. Si `entregadoEn` existe → `entregado-a-tiempo` si `entregadoEn <= vencimiento`, si no `entregado-tarde`.
2. Si `quejaSupersalud` existe → `escalado-supersalud`.
3. Si `quejaEps` existe → `escalado-eps`.
4. Si `ahora > vencimiento` → `vencido`.
5. Si no → `en-plazo`.

En la UI, una signal `ahora` se actualiza cada minuto para refrescar el contador.

### Etiquetas y colores de estado

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

### Bitácora derivada

El evento "Venció el plazo" se calcula igual que `estado()`: se muestra en la bitácora (en
pantalla y en el PDF) si `ahora > vencimiento` y el pendiente no se entregó antes del
vencimiento. No se guarda como evento; no necesita que la app esté abierta a la hora exacta.

### Edición y borrado

- **Editar:** se reprograma el aviso. Si ya hay una queja registrada (`quejaEps` o
  `quejaSupersalud`), la hora de reclamo queda bloqueada para no contradecir un documento
  ya radicado ⚖️.
- **Borrar:** pide confirmación, cancela la notificación y elimina la foto del Blob.
- **Perfiles:** únicos por (`tipoDocumento`, `numeroDocumento`); si se repiten, la app ofrece
  usar el existente.
- **Borrado total:** botón "Borrar todos mis datos" (doble confirmación) reutiliza el borrado
  individual y cancela todos los avisos.

## Avisos

- **Android:** `LocalNotifications.schedule` a la hora de vencimiento, con un ID numérico
  derivado del ID del pendiente. Se cancela al marcar como entregado o al borrar el pendiente.
  Se reprograman todos los pendientes abiertos al iniciar la app (`provideAppInitializer`).
  - Primera vez que se registra un pendiente: hoja de ayuda "¿Cómo asegurar que te llegue el
    aviso?" con el enlace a dontkillmyapp.com (una sola vez, sin pantalla de ajustes).
  - Si el permiso de notificaciones está denegado: aviso con las opciones "Activar
    notificaciones" o "Agregar a mi calendario" (reutiliza el `.ics` de la PWA).
- **PWA:** botón que genera un `.ics` (texto VEVENT armado a mano, sin librería) con
  `DTSTART` = vencimiento, una alarma (`VALARM`) a la misma hora y un **UID fijo por
  pendiente**. Si ya se descargó antes, la app avisa "Ya agregaste este recordatorio el…"
  usando `recordatorioIcsEn`; no se promete que todos los calendarios eliminen el duplicado.
- `PlatformService.isNative()` decide qué camino mostrar.

## Documentos

- `domain/plantillas.ts` exporta funciones puras `(datos) => string` para el texto corto y
  `(datos) => PdfDocDefinition` para el PDF. El texto legal es constante; solo se interpolan datos.
- El borrador de redacción está en `plantillas.md` y debe revisarse antes de implementarse.
- Fundamento legal: `normas.filter(n => n.aplicaA.includes(paso))`.
- La foto del comprobante se reduce a máximo 1280 px de lado (JPEG 0.7) antes de guardarse
  para que el PDF no pese demasiado.

## Pruebas mínimas

- `plazo.spec.ts`: vencimiento exacto, cambio de día y de mes, cada regla de `estado()`,
  hora de reclamo futura rechazada y formatos del contador (h / min / días).
- `bitacora.spec.ts`: queja repetida reemplaza fecha y radicado sin duplicar eventos.
- `ics.spec.ts`: el archivo generado contiene `DTSTART` correcto en UTC y un UID fijo por pendiente.
- `plantillas.spec.ts`: interpolación con y sin "quien gestiona", con y sin número de comprobante.
- `storage.spec.ts`: fallo de escritura muestra el mensaje y el formulario conserva lo escrito.
- `normas.spec.ts`: cada `resumen` cumple el criterio (≤ 2 oraciones, ≤ 45 palabras,
  "usted", solo sigla "EPS").

## Riesgos

- **Normas desactualizadas:** mitigado con `verificadoEl` visible y revisión periódica.
- **Batería en Android (Xiaomi/Samsung):** la notificación puede retrasarse. Mitigación:
  pedir permiso de alarmas exactas y mostrar la hoja de ayuda con dontkillmyapp.com la primera
  vez que se registra un pendiente (ver "Avisos"; no hay pantalla de ajustes).
- **Escritura local fallida (almacén lleno):** se muestra "No se pudo guardar. Libera espacio
  e intenta de nuevo" y el formulario conserva lo escrito. Si se niega `storage.persist()`,
  la app sigue funcionando normalmente.
- **Interpretación legal:** la app explica y cita; no concluye. Aviso de no asesoría en todas las salidas.
