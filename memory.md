# Memoria viva — Pendientes48

> **Cómo se mantiene:** documento vivo basado en [`proposal.md`](openspec/changes/add-pendientes-mvp/proposal.md).
> El agente que cierra una tarea, feature o cambio relevante lo actualiza como **último paso antes
> de su PR**, agregando solo decisiones, lecciones y pendientes con impacto futuro. No duplica el
> progreso (`tasks.md`), las decisiones de diseño (D1–D17 en `design.md`) ni las reglas (`AGENTS.md`).
>
> Última actualización: **2026-10-14** — cierre de 3.7 (pantalla `inicio`);
> bloque 3 en marcha (PRs #31–#32 mergeados, `main = 7306b71`).

## Por qué (resumen de `proposal.md`)
App Android + PWA para que el paciente colombiano dé seguimiento a un medicamento "pendiente"
de la farmacia: contador de 48 h desde la hora de reclamo, escalera de reclamo (EPS → Supersalud),
norma visible y documentos (copiar, PDF, compartir). Local-first, sin backend. Fuera de alcance
en la fase 2: tutela, OCR, login/sincronización, redacción con IA, ESLint.

## Estado
- **Bloque 0 completo:** 0.0 ✅ · 0.1 ✅ · 0.1.1 ✅ · 0.1.2 ✅ · 0.2 ✅ · 0.3 ✅ · 0.4 ✅ · 0.5 ✅
  (`/guia` aprobado por Daniel, 2026-10-06) · 0.6 ✅ (Galaxy S22 y Chrome).
- **Bloque 1 (dominio puro) implementado:** 1.1 ✅ · 1.2 ✅ · 1.3 ✅ (PRs #20–#22 apilados + #23 de
  integración) · 1.4 ✅ (PR #24) · 1.5 ✅ (PR #25).
- **Bloque 2 (plataforma y persistencia) completo:** 2.1 ✅ (PR #26) · 2.2 ✅ (PR #27, smoke real
  en el S22) · 2.3 ✅ (PR #29, smoke Android + escritorio) · 2.4 ✅ (PR #30, flujos A/B/C en el S22).
- **Bloque 3 (pantallas) en marcha:** orden 3.1 → 3.2 → 3.7 → 3.3 → 3.4 → 3.5 → 3.6, más **3.8
  (introducción de la app, aprobada por Daniel el 2026-10-14)**; 3.1 ✅ (PR #31) · 3.2 ✅ (PR #32) ·
  3.7 listo (pantalla `inicio`) → sale su PR (#33).
- Repo sano en `main` (`7306b71`); PRs #1–#32 mergeados; una rama por tarea; **Daniel revisa y
  mergea**.
- Multiagente: Claude y MiMo trabajan en el mismo repo bajo las reglas de `AGENTS.md`.
- Tareas de instalación pura (como 0.3): **no** requieren flujo `/opsx:*`; solo ejecución +
  su verificación + PR (decisión de Daniel, 2026-10-04).

## Proceso (reglas de Daniel)
- **Al finalizar cada fase/tarea:** lanzar la revisión QA (`/opsx-qa`, solo diagnóstico: detecta,
  no resuelve) para que verifique si se logró el objetivo de la verificación de `tasks.md`;
  pasarle los hallazgos a Daniel **antes de abrir el PR**.
- **Componentes siempre en tres archivos separados, sin importar el tamaño:**
  `nombre.ts` (clase con `templateUrl`/`styleUrl`) + `nombre.html` (plantilla) +
  `nombre.scss` (estilos). Nunca `template:` ni `styles:` inline. Escalabilidad/mantenibilidad.

## Decisiones de ejecución (tomadas durante el proceso, fuera de `design.md`/`tasks.md`)

| Decisión | Por qué |
|---|---|
| `ng new` + `ng add @ionic/angular` desde carpeta temporal en vez de `ionic start` | preservar `README.md`/`.gitignore` y controlar el scaffold (tarea 0.1) |
| `src/assets` servido desde `angular.json` | no mover `normas.json` (referencias de specs/config intactas) |
| appId Android `com.theoceweb.pendientes48` | **inmutable** tras publicar en Google Play; definido en 0.2 |
| Carpeta `android/` commiteada | recomendación oficial de Capacitor: proyecto nativo versionado |
| Service worker **solo en la PWA** (D13) con `isNative()` | el APK no necesita caché de red y evita servir assets viejos; adelantó `platform/plataforma.ts` (tarea 2.2) |
| Verificación de 0.2 sin Lighthouse | Lighthouse **eliminó la categoría PWA** → se verificó con DevTools → Application (aceptado por Daniel en PR #11) |
| La raíz `app.*` importa cualquier capa con alias (regla 5 ampliada, PR #11) | `app.config.ts` debe usar `@platform/plataforma` para registrar el SW |
| `@types/pdfmake` añadido al stack (0.3; aprobado por Daniel, README sincronizado) | `pdfmake@0.3.11` no trae `.d.ts` y `domain/` necesita sus tipos (`design.md`) |
| Specs de modelos con `@ts-expect-error` + `tsc -p tsconfig.spec.json --noEmit` en la verificación (0.4, pedido por Daniel) | los modelos son solo tipos: sin esto nada comprobaría que el compilador rechaza datos inválidos (los tipos no validan en runtime) |
| Ramas encadenadas + PRs apilados para 1.2–1.4; 1.5 nace de `main` (decisión de Daniel, 2026-10-06) | 1.2–1.4 importan `vencimiento()` de 1.1: apilar evita esperar cada merge; 1.5 no depende del stack |
| `resolveJsonModule` en `tsconfig.json` para importar `normas.json` (1.5) | `paraPaso()` queda síncrono y testeable con el catálogo empaquetado; un `fetch` obligaría a async y a inyección de Angular |
| En specs, `vi.mock` solo de **paquetes** (`@capacitor/core`, `idb-keyval`…) y el código relativo real se deja correr (2.2/2.3) | `ng test` rechaza `vi.mock` de imports relativos; mockear `@capacitor/core` permite conmutar `isNative()` sin tocar `./plataforma` |
| Smoke en dispositivo: `server.url` **temporal** (no commitear) + `adb reverse tcp:4200` + `window.__p48` temporal en `app.config.ts` (2.2/2.3) | el S22 estaba en datos móviles (no en la Wi-Fi), el dev server no sirve `/src/*` sueltos y el adaptador aún no está en el bundle; todo se revierte antes del commit |
| El `.ics` en Android se guarda en `Directory.Documents` con `Filesystem` (2.3) | el WebView ignora `<a download>` (Capacitor no instala DownloadListener, verificado en su fuente): la descarga con `<a>` queda solo para la PWA |
| Smoke de "permiso denegado": `<uses-permission android:name="android.permission.CAMERA"/>` **temporal** en `AndroidManifest.xml`, revertido antes del commit (igual que `__p48`) | ni la app ni `@capacitor/camera` declaran `CAMERA`: sin declarar, `checkPermissions` responde `granted` y `pm revoke` se niega → sin este build temporal no se puede ejercitar el fallback en dispositivo (2.4) |
| El aviso "Esta app no es asesoría legal" es constante en `domain/norma/aviso.ts` y las pantallas lo pasan a `shared/` por input (decisión de Daniel, 2026-10-13) | la regla prohíbe contenido legal hardcodeado en componentes y `shared → domain` es solo tipos; mismo patrón que `PIE_PDF` en `plantillas-pdf.ts` |
| `isolate: true` en el target `test` de `angular.json` (builder `@angular/build:unit-test`) | el default es `false` ("alineado con Karma"): todos los specs comparten contexto y dos `vi.mock('idb-keyval')` con fábricas distintas se pisan → flakiness ~50% en specs de `data/` al añadir los specs de 3.1 (2026-10-13) |
| Trampa de foco propia en `shared/foco-dialogo.ts` para los diálogos, sin `@angular/cdk/a11y` | el CDK no está en el stack del README y no se agregan dependencias en esta fase; la función pura cubre `aviso-legal` y `ayuda-avisos` y la reutilizan las pantallas nuevas (QA mayor M2 de 3.1, 2026-10-13) |
| `cancelarTodos()` en el adaptador (`getPending()` + `cancel()`), invocado **antes** de `borrarTodo()` | hallazgo mayor 12 (opción B de Daniel): la pantalla no debe conocer los IDs de notificación y el orden evita avisos huérfanos; si el borrado falla tras cancelar, la reprogramación al iniciar (pendiente de 2.2) los restaura (3.2, 2026-10-14) |
| Botón principal flotante al pie en celular (`fixed` + `--p48-sombra-flotante`, `z-index` bajo los diálogos) y junto al título en escritorio, con corte `@media (min-width: 768px)` | design.md "Adaptación por tamaño" (decisión de Daniel sobre la QA de 3.2, 2026-10-14); `@media` no admite custom properties → el 768 px es constante de maquetación con comentario, **falta que Daniel confirme el número** |
| Introducción de la app en el **estado vacío de Inicio** + hoja "¿Cómo funciona?" (enlace terciario persistente en la cabecera), como tarea 3.8 tras merge de 3.7 | evita un segundo bloqueo tras el aviso legal (onboarding descartado), ayuda en el momento exacto en que el usuario no tiene nada que hacer y no duplica la guía de 3.3 (decisión de Daniel, 2026-10-14) |

## Lecciones del entorno
- **`npm ci` siempre** después de un merge que toque `package-lock.json`; sin eso fallan `ng build`,
  `ng test` y `cap sync` por dependencias locales viejas.
- **`ng serve` no sirve el service worker**: para verificar la PWA → `ng build` + `npx http-server
  dist/pendientes48/browser -p 8080` (localhost cuenta como contexto seguro).
- **Gradle / `cap run android`** necesita `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk` (o
  `android/local.properties`); el SDK y Android Studio ya están instalados en esta máquina.
  APK debug resultante: `android\app\build\outputs\apk\debug\app-debug.apk`.
- **Pruebas en dispositivo:** Galaxy S22 con depuración USB; instalar con `adb install -r <apk>` y
  abrir con `am start -n com.theoceweb.pendientes48/.MainActivity`. El celular y el cable no son
  suficientes: si `adb devices` sale vacío, falta "Depuración USB" + modo MTP.
- **Un ícono o asset viejo en la PWA casi siempre es caché** del service worker de una build
  anterior: DevTools → Application → Service Workers → Unregister + **Clear site data** (o probar
  en incógnito) antes de concluir que el build falló (así pasó con el favicon de Angular en la 0.6).
- **El splash dura menos de 1 s:** para capturarlo, correr `am start` y `screencap` en la **misma
  sesión `adb`** (`adb shell 'am start …; screencap …'`) y revisar los tamaños de los PNG; la
  pantalla del celular debe quedar encendida si no, las capturas salen de la pantalla de carga.
- **`cap sync` detecta los plugins** instalados y registra los 5 en `android/*.gradle` (archivos
  trackeados: commitear esos cambios junto con `package.json`).
- `npm warn allow-scripts` (esbuild, lmdb, msgpackr…) **no ha bloqueado nada real**; vigilar solo
  si un build falla por binario faltante.
- Tras cada merge: borrar ramas locales y remotas mergeadas (el remoto debe quedar con solo `main`).
- **Regenerar ícono o splash:** editar el SVG en `assets/fuente/`, convertirlo a PNG en `assets/` (se
  usó `sharp`, que llega con `@capacitor/assets`) y correr `npx capacitor-assets generate --android
  --iconBackgroundColor '#1F1E1C' --splashBackgroundColor '#FFFFFF' --splashBackgroundColorDark
  '#FFFFFF'`. **No usar `--pwa`:** escribe los íconos fuera de `public/`, los declara PNG siendo
  WebP y combina `purpose: "any maskable"`; los íconos de la PWA se generan aparte en `public/icons/`.
- **`capacitor-assets` reformatea `AndroidManifest.xml`** sin cambios reales: restaurarlo con
  `git checkout` antes del commit para no meter ruido.
- **`http-server --proxy <él mismo>` entra en loop infinito** (miles de `GET /ruta` anidados): no
  sirve como fallback SPA. Para probar rutas deep-link del build de producción usar
  `ng serve --configuration production` (compila con `isDevMode()` en false, igual que el dist);
  su aviso de presupuesto (raw 554,64 kB > 550) no es el canónico — el gate es `ng build`
  (508,87 kB, limpio).
- **`openspec validate` exige el ítem:** `npx openspec validate <nombre-del-cambio> --strict`;
  sin nombre falla con "Nothing to validate".

- **PRs apilados (stack):** GitHub los mergea contra su **rama base**, no contra `main`. Si la base
  es otra rama (ej. #21 sobre `feat/1.1-plazo`), el contenido queda ahí y `main` no lo recibe → hay
  que abrir un PR de integración rama→`main` (pasó con #21/#22 → #23). El estado real se ve con
  `git log origin/main` + `gh pr list --state all`: todos los PRs dicen MERGED aunque `main` no
  tenga el contenido.
- **Specs que imprimen fechas:** construir los instantes con `new Date(año, mes, día, hora, min)`
  (hora local) y formatear con getters locales: el texto sale idéntico en cualquier zona horaria
  (así `plantillas.spec.ts` prueba "5 de octubre de 2026 a las 3:15 p. m." sin depender de la TZ).
- **`funcionpublica.gov.co` bloquea al `webfetch`** (transport error) pero el enlace sí abre:
  verificar con `Invoke-WebRequest … -UseBasicParsing` (devolvió 200 en la revisión de URLs de
  `normas.json`, 2026-10-06).
- **`vi.mock` con rutas relativas no funciona** en `ng test` ("Please use Angular TestBed…"); los
  mocks de **paquetes** sí. Patrón que funciona: `vi.hoisted` + `vi.mock('@capacitor/core')` y
  dejar que el módulo relativo real (`./plataforma`) delegue en el mock (2.2/2.3).
- **`npx ng test`/`ng serve` puede quedarse colgado tras imprimir su resultado** (el comando no
  devolvía el prompt): invocar directo `node node_modules\@angular\cli\bin\ng.js test
  --watch=false` (y `node node_modules\typescript\bin\tsc …`) devuelve limpio (2.3, 2026-10-07).
- **El puente de Android entrega las fechas del plugin en formato `Date.toString()`** ("Tue Oct 06
  17:43:26 GMT-05:00 2026"), no ISO: normalizar en el adaptador (lo hizo `avisosPendientes()`, con
  prueba); aplica a todo adaptador que lea fechas nativas (2.2).
- **WebView debugging está activo en los builds debug de Capacitor:** `adb forward tcp:9222
  localabstract:webview_devtools_remote_<pid>` → `http://127.0.0.1:9222/json` → CDP
  (`Runtime.evaluate` con `awaitPromise`) para llamar adaptadores por consola; no exige cambios en
  `MainActivity` (2.2/2.3).
- **Vite reoptimiza dependencias nuevas y recarga la página** la primera vez que se importan: una
  evaluación CDP que fuerce ese primer import expira; repetir (o precargar) tras la recarga (2.3).
- **Túnel USB al dev server:** `adb reverse tcp:4200 tcp:4200` + `server.url: http://127.0.0.1:4200`
  funciona aunque el celular esté en datos; con IP por Wi-Fi falla si el teléfono no está en la
  misma red (el primer intento de smoke de 2.2 falló por esto).
- **Angular en dev no sirve archivos `/src/*` sueltos** (404): solo bundles; para probar un
  adaptador aún no referenciado por la app, exponerlo temporalmente en `window` desde
  `app.config.ts` y revertir antes del commit (2.3).
- **`@capacitor/camera` no declara `android.permission.CAMERA`** (solo `<queries>` de intents): la
  foto se delega en la app de cámara del sistema y, sin el permiso declarado, `checkPermissions`
  responde **`granted`** → nunca hay diálogo y `pm revoke` se niega. Para verificar el caso
  "denegado → galería" hay que hacer un build temporal con el permiso (fila de decisiones) (2.4).
- **`pm revoke` mata el proceso de la app** (Android lo fuerza al revocar un permiso en vivo):
  mueren el WebView y el forward de CDP y la tarea queda cerrada; relanzar con `am start` y
  reconectar CDP antes de continuar (2.4).
- **La app puede morir mientras la cámara externa está encima** (tormenta de LMK con poca RAM):
  la promesa del plugin se pierde con el proceso y la medición CDP devuelve "proceso reiniciado"
  → verificar `pidof` antes de medir y reintentar; el resultado nunca llega solo (2.4).
- **Nunca coordenadas a ciegas: `uiautomator dump` → nodo exacto → tap.** En el S22 el obturador
  es `desc='Take picture' [408,1809][672,2073]`, el review de la foto vive en la app
  (`OK [540,2028][1008,2196]`, `Retry [72,2028][540,2196]`) y el `Done` del picker queda en
  `[833,2082][930,2142]`; un tap fijo a `(540,1880)` quedó ~60 px fuera y dejó el review trabado
  hasta que alguien tocó la pantalla (2.4).
- **Los `.Value` de un regex son cadenas:** `($g1 + $g2)/2` **concatena** en vez de sumar y produjo
  un tap en `(358416, 10311080)` (bounds inválidos); convertir cada grupo con `[int]` antes de
  operar y validar que el centro caiga dentro de la pantalla antes de tocar (2.4).
- **`adb shell cat` estropea las comillas tipográficas:** el `’` de "Don’t allow" llega mangled y
  cualquier regex que lo incluya falla en silencio → matchear solo palabras ASCII (`allow`) o tocar
  por bounds ya leídos del dump (2.4).
- **`uiautomator dump` falla con "could not get idle state"** si hay un video pesado de fondo
  (streaming en pantalla completa): pedirle al dueño del teléfono una ventana libre y comprobar
  `topResumedActivity` antes de cada paso — además de no interferir con su uso (2.4).
- **Google Photo Picker:** los tiles salen con `clickable=false` (funciona el tap en el centro de
  sus bounds), `Done` solo aparece tras seleccionar y el contador muestra "1 photos" (2.4).
- **`cdp.js` acepta el timeout como 4.º argumento:** procesar la foto de galería puede superar los
  30 s; medir con 60 s y tratar "colgado" como fallo, no como resultado (2.4).
- **`svc power stayon true` escribe `settings global stay_on_while_plugged_in`**: para restaurar,
  `settings delete global stay_on_while_plugged_in` y `settings put system screen_off_timeout
  60000` (los smokes largos suben ambos) (2.4).
- **`cap sync` reescribe `android/app/capacitor.build.gradle` y `android/capacitor.settings.gradle`
  solo por fin de línea** (el diff tras normalizar está vacío): `git checkout --` de esos dos
  antes del commit para no ensuciar el PR (2.4).
- **`@angular/build:unit-test` corre SIN aislamiento por defecto** (`isolate: false`, "alineado con
  la experiencia Karma/Jasmine"): todos los archivos comparten un contexto JS y el `vi.mock` de un
  paquete con dos fábricas (p. ej. `idb-keyval` en `app-db.spec` y `pendientes-store.spec`) resuelve
  con la fábrica del primero en ejecutar → `mockRejectedValueOnce` "no aplica" y los datos de un
  archivo aparecen en otro, con fallo aleatorio. Añadir specs re-particiona el bundle de pruebas y
  hace visible un leak que antes no salía: los "fallos mágicos" en specs intactos suelen venir de
  ahí, no del código modificado. Fix: `"isolate": true` en `angular.json` → 2 corridas de 140/140
  verdes (3.1, 2026-10-13).
- **`main` puede crecer por runtime compartido de Angular** (máquina de `computed`/señales
  `UNSET/COMPUTING/ERRORED`, sanitizador `SafeValue`, tabla de propiedades DOM, `NgControlFlow`)
  hoisted al chunk de entrada al usar inputs de señal y estilos encapsulados: verificar que no sea
  código de la app buscando marcadores propios ("Ver norma oficial", etc.) en el JS de `main`
  (3.1: +6,36 kB, cero datos/plantillas legales en `main`, sin duplicación en chunks lazy).
- **`git stash push -u` puede abortar a mitad en Windows** (permiso denegado al borrar un archivo):
  queda el stash guardado y el árbol a medias; el `pop` restaura los no-rastreados pero aborta
  sobre cambios rastreados. Recuperación: verificar `git status` + presencia de archivos →
  `git checkout -- <rastreados>` → borrar restantes no rastreados → `git stash pop` → recién ahí
  `git stash drop` (3.1, 2026-10-13).
- **Chrome headless con `--user-data-dir` repetido se adhiere al singleton y no escribe el
  screenshot**: un perfil de usuario por ejecución (o matar Chrome antes). Para capturar
  modales/hojas: CDP con `Page.captureScreenshot` tras pulsar el botón por su texto
  (`p48-shot.js`); la página larga de la guía cabe con `--window-size=390,8000` (3.1).
- **Nunca `Get-Process node | Stop-Process` sin filtro**: mató el propio harness y reinició el
  servidor en medio de la fase 3.1.
- **`fakeAsync`/`tick` no existen en este proyecto** (corre sin zone.js: `zone-testing.js is needed…`)
  y `whenStable` resuelve **antes** de que las cadenas de promesas del constructor se asienten →
  pantalla "Cargando…" eterno en specs. Patrón: helper `asentar()` que hace `await Promise.resolve()`
  en bucle (~20 vueltas) + `TestBed.flushEffects()` (3.2, 2026-10-14).
- **Sembrar datos reales para capturas:** CDP `Runtime.evaluate` con `awaitPromise` abriendo
  IndexedDB con el mismo esquema que `idb-keyval` (DB `pendientes48`, store `datos`) y `put` de
  fixtures → la pantalla se fotografía con listas, diálogos de duplicado y confirmaciones sin tocar
  la app (script `p48-pacientes.js`, 3.2).
- **La "línea fija al pie" del aviso legal se logra con `position: sticky; bottom: 0` + fondo
  `--p48-fondo`** dentro del contenido con scroll: `fixed` la saca del flujo y deja un hueco al
  final; sticky la mantiene visible durante el scroll (spec: "permanece siempre visible") y en su
  posición natural al llegar al final (3.7, 2026-10-14).
- **Los scripts de captura CDP se reutilizan por pantalla** (`p48-pacientes.js` → `p48-inicio.js`:
  sembrar + click por texto + shots). Ojo: `scrollIntoView` sobre el elemento sticky **no hace
  scroll** si ya está visible → la captura "al pie" salió idéntica a la de scroll y se descarta del
  PR (3.7, 2026-10-14).

## Pendientes conocidos (no bloqueantes)
- **Identidad visual:** sistema de diseño (D14–D16) e ícono/splash (D17) resueltos; solo quedan las
  capturas de pantalla del manifiesto (`screenshots`), que se agregan cuando existan pantallas reales.
- **Hosting de la PWA** para compartirla por WhatsApp → decidir antes de la tarea 4.2.
- **`uuid` (3 moderadas en `npm audit`):** dentro de `@capacitor/cli` → `xcode`; es solo la CLI de
  desarrollo, nunca llega a usuarios. El fix de npm rebajaría la CLI a 8.4.3 (peor) → **sin acción**,
  vigilar releases de Capacitor (decisión de Daniel, 2026-10-04).
- **ESLint:** fuera de alcance del MVP; las convenciones se revisan en cada PR (`proposal.md`).
- **Contenido legal intocable sin Daniel:** `plantillas.md` y `src/assets/data/normas.json`.
- **Cableado "reprogramar al iniciar" (quedó de la 2.2):** falta el `provideAppInitializer` que
  llame `reprogramarAvisos()` con los pendientes abiertos de `listarPendientes()` — ya se puede
  (2.1 + 2.2 mergeados); va como `chore/` aparte para no ensuciar el PR de 2.3. También cubre el
  borde de 3.2: si "Borrar todos mis datos" cancela los avisos y el vaciado falla, la reprogramación
  al abrir los restaura.
- **Prueba en dispositivo de `cancelarTodos()` (3.2):** en la PWA es no-op y los tests van con el
  plugin mockeado; la cancelación real sobre `LocalNotifications` queda pendiente de ensayo en el
  S22 cuando la pantalla de perfiles se pruebe en Android.
- **Inicio incompleto a propósito (3.7):** sin botón principal (design.md lo da junto al título →
  llega con 3.4 cuando exista la ruta del formulario; así no queda un botón muerto), tarjetas sin
  navegar al detalle (3.5 agrega el enlace) y orden de la lista = orden de claves de IndexedDB (la
  spec no define orden; candidato a ordenar por vencimiento).
- **Tarea 3.8 (introducción de la app):** copy de producto por aprobar con Daniel antes de su PR;
  el enlace a la guía de 3.3 se agrega en la tarea 3.3 (regla: sin rutas aún inexistentes).

## Registro de actualizaciones
- **2026-10-14** — **3.7** (`features/inicio/`): pantalla de inicio con lista de pendientes
  (contador `textoContador` + chip de estado con `computed filas` y reloj `ahora` cada minuto),
  estado vacío que explica qué ver ahí, enlace "Ver perfiles" a `/pacientes` (prometido en la QA de
  3.2) y aviso legal modal en la primera apertura → línea fija al pie con `position: sticky` (spec:
  "permanece siempre visible"). Si la lectura falla, la preferencia se asume no aceptada (el aviso
  legal jamás se salta en silencio) y la lista muestra `role="alert"`; si persistir el "Entiendo"
  falla, la próxima apertura vuelve a mostrar el modal. Sin botón principal todavía (llega con 3.4).
  QA: **1 mayor de trazabilidad** (el enlace a perfiles no estaba en el texto de `tasks.md` →
  absorbido con precedente 2.2/3.2) resuelto antes del PR, 0 menores. Evidencia: 7 capturas
  390/1280, 1 descartada por duplicada. Pruebas: **167/167** (+6); `tsc`, `openspec --strict` y
  `ng build` (518,51 kB) en 0.

- **2026-10-14** — **3.2** (`features/pacientes/`): pantalla de perfiles con crear/editar (7 campos,
  correo opcional), aviso de duplicado con "Usar el perfil existente" / "Seguir editando", y
  "Borrar todos mis datos" con doble confirmación que **cancela todos los avisos programados**
  (`platform/notificaciones.cancelarTodos()` — hallazgo mayor 12 absorbido en el texto de
  `tasks.md`, precedente 2.2), vacía el almacén completo (perfiles, pendientes, fotos y
  preferencias → primera apertura) y navega a inicio. Botón principal flotante al pie en celular y
  junto al título en escritorio (design.md "Adaptación por tamaño"; decisión de Daniel sobre la QA).
  QA de cierre en dos pasadas: la primera dictaminó "corregir antes del PR" (1 mayor de trazabilidad
  + 5 menores) y la segunda verificó **0 mayores/menores**; mensajes no bloqueantes anotados en el
  PR (breakpoint 768 px, error crudo del plugin, aviso doble en un borde, teclado vs. botón fijo,
  enlace a `/pacientes` que llega con 3.7). Pruebas: **161/161** (+14 vs. `main`); `tsc`,
  `openspec --strict` y `ng build` (518,51 kB) en 0. Evidencia: 7 capturas 390/1280 con perfiles
  sembrados por CDP.

- **2026-10-13** — **3.1** (`shared/`): `estado-chip` (etiqueta + color de los 6 estados),
  `norma-card` (los 5 elementos de la spec + aviso; sin conexión solo el enlace queda inactivo),
  `aviso-legal` (línea fija al pie + modal de primera apertura con "Entiendo") y `ayuda-avisos`
  (hoja de batería con enlace a dontkillmyapp.com). El texto del aviso vive en
  `domain/norma/aviso.ts` (decisión de Daniel) y las pantallas lo pasan por input. `/guia` muestra
  los 4 componentes; evidencia 390/1280 + modal/hoja. Regla nueva de Daniel aplicada: componentes
  siempre en `.ts`+`.html`+`.scss` (los 7 del proyecto separados, incluidos `app`, `inicio` y
  `guia`). **QA de cierre de fase** (0 bloqueantes; 3 mayores aprobados por Daniel y resueltos en
  el mismo PR): (1) `design.md` D6 + `AGENTS.md` + `README.md` sincronizados con la constante
  `AVISO_NO_ASESORIA` — el contenido legal también puede vivir como constante aprobada en
  `domain/`; (2) gestión de foco en los dos diálogos: entrada al abrir, trampa de Tab con
  `shared/foco-dialogo.ts` (función propia, sin CDK), Escape cierra solo la hoja y el foco vuelve
  al disparador; (3) tokens `--p48-ancho-modal` (440 px), `--p48-ancho-hoja` (560 px) y
  `--p48-scrim` en `tokens.css` (el `z-index` queda como constante de capa con comentario).
  Menores resueltos: fixture local en el spec de `norma-card`, `fechaLegible` con ISO que trae
  hora, guarda SSR alineada y `aria-labelledby` del diálogo. Pruebas: **147/147** (2 corridas
  estables con `isolate: true`); `tsc`/`openspec --strict`/`ng build` (518,29 kB) en 0.

- **2026-10-08** — **2.4** (`platform/camara.ts`): `tomarFoto()` consulta/pide el permiso solo en
  nativo (`isNative()`) y, si está denegado, va directo a `elegirFoto()`; si el plugin lanza
  `CameraPermissionDenied` (o `NotAllowedError` en web) cae a la galería, y si el usuario cancela
  **propaga** el error. La foto se lee con `Filesystem.readFile(uri)` (nativo) o `fetch(webPath)`
  (web) y se reduce **una sola vez** a ≤1280 px JPEG 0.7 en canvas (`aJpegReducido`, exportada y
  testeada). 11 pruebas nuevas → **129/129 en el árbol rebased sobre `main`**, con `tsc`,
  `openspec validate --strict` y `ng build` (508,87 kB) en 0. Smoke en el S22 con `__p48` +
  manifest temporal de `CAMERA` (ambos revertidos): **A** cámara `960×1280 jpeg`, **B** galería
  `1280×720 jpeg`, **C** denegado → diálogo "Don’t allow" → picker **sin error** → `1280×720`.
  Después: build limpio reinstalado, `pm clear`, `screen_off_timeout`/`stay_on` restaurados, sin
  forwards ni residuos en sdcard. Lecciones nuevas arriba (permiso `CAMERA` ausente, `pm revoke`
  mata el proceso, LMK con la cámara externa, bounds con `[int]`, comillas de `adb`, picker).

- **2026-10-08** — **Bloque 2 en marcha**: 2.1 (`data/app-db.ts` + stores de pacientes, pendientes y
  preferencias sobre `idb-keyval`; fotos como `Blob`; perfil duplicado; `borrarTodo()`; errores de
  escritura envueltos en `ErrorDeEscritura` con el texto literal de la spec) y 2.2
  (`platform/notificaciones.ts`: programar/cancelar/reprogramar/consultar permiso, ID numérico
  int32 del pendiente, vencidos no se reprograman, PWA no-op) → **PRs #26 y #27 mergeados**.
  Smoke real de 2.2 en el S22: aviso "Ya pasaron las 48 horas" a los 2 min confirmado por Daniel,
  cancelación sin aviso, persistencia tras matar el proceso y reprogramación al editar la hora
  (hallazgo 11), más el fix de fechas ISO. 2.3 (`platform/compartir.ts` + `calendario-descarga.ts`:
  copiar texto; compartir PDF nativo con `files: [file://]` y PWA con Web Share o descarga como
  respaldo; `.ics` RFC 5545 a mano con escapado y plegado de 75 octetos) compilando con
  **117/117 tests**, `tsc`/`ng build`/`openspec validate` en 0; faltan el smoke (S22 + Chrome
  headless) y su PR. 2.4 (cámara) pendiente. Lecciones nuevas arriba (vi.mock, npx→node, WebView sin
  `<a download>`, adb reverse, fechas del puente).

- **2026-10-06** — **Bloque 1 (dominio puro) completo**: 1.1 `domain/pendiente/plazo.ts`
  (`vencimiento`, `estado` con sus 5 reglas, `textoContador` con sus 5 ramas,
  `validarHoraReclamo`); 1.2 `bitacora.ts` (`bitacoraVista` con el evento derivado `vencido` y
  `registrarQueja` sin duplicar eventos); 1.3 `calendario/ics.ts` (VEVENT a mano, `UID` fijo,
  `DTSTART` en UTC, escapado RFC 5545); 1.4 `reclamo/plantillas.ts` + `plantillas-pdf.ts` (los 4
  casos de `plantillas.md`; texto corto sin el aviso de no asesoría, PDF con pie en todas las
  hojas y fundamento legal filtrado por paso); 1.5 `data/normas-catalogo.ts` (`paraPaso()` con
  import estático vía `resolveJsonModule`). Verificación por rama: 42/42–65/65 tests, `tsc`,
  `ng build` y `openspec validate --strict` en 0; las 3 URLs de `normas.json` abren y
  `verificadoEl` = 2026-10-04. PRs: #20–#22 apilados, #23 integración, #24 (1.4), #25 (1.5).

- **2026-10-05** — **0.5** (sistema de diseño): `src/theme/tokens.css` (tokens `--p48-*`),
  `variables.css` (mapea a Ionic y quita `dark.system.css`, D15), `patrones.scss` (7 patrones),
  `styles.scss` (base 18 px, interlineado 1,5), `provideIonicAngular({ mode: 'ios' })` (D16) y
  `features/guia/` dev-only en `/guia` con wildcard `{ path: '**', redirectTo: '' }` → en
  producción `/guia` redirige a inicio. Presupuesto inicial subido a 550 kB (documentado en el
  PR): `ng build` queda en 508,87 kB. Verificación: Lighthouse a11y **100/100**, 22/22 pares de
  contraste, 15/15 tests; queda ⏳ la aprobación visual de Daniel (390 y 1280 px).
- **2026-10-05** — **QA del change** (`/opsx-qa`, previo al merge de #17): 0 bloqueantes,
  3 mayores, 13 menores. Decisión de Daniel: los **3 mayores** quedan como notas de trazabilidad
  en `tasks.md` (2.2 reprogramar al editar, 3.2 cancelar todos los avisos, 3.4 precarga de hora);
  los menores solo quedan registrados en la descripción del PR de `docs/qa-trazabilidad`.
- **2026-10-05** — **0.4** (modelos de `domain/`): `pendiente.model.ts` (incl. `icsAgregadoEn` y
  `EstadoPendiente`), `paciente.model.ts`, `norma.model.ts`; `Gestion` reutiliza
  `Paciente['tipoDocumento']` vía alias `@domain/*`. Specs con fixtures happy y unhappy path
  (`@ts-expect-error`); verificación ampliada con `tsc --noEmit`. `Preferencias` queda pendiente
  para su store (2.1).
- **2026-10-05** — **Verificación de 0.6** (PR #15): en el Galaxy S22, ícono nuevo en el launcher
  y splash blanco con ícono en círculo (capturado con `adb`); en Chrome, manifiesto sin advertencias
  e iconos `any`/`maskable` verificados por HTTP. El favicon de Angular que aún aparecía era la
  caché del SW de la 0.2 → resuelto con Clear site data (quedó como lección).
- **2026-10-05** — **0.6** (ícono B y splash blanco): fuentes SVG, Android con `@capacitor/assets`,
  PWA en PNG propios con `any`/`maskable` separados (resuelve la advertencia pendiente desde la 0.2),
  favicon de Angular reemplazado y `theme-color` a blanco (movido desde la 0.5).
- **2026-10-05** — Sistema de diseño aprobado por Daniel sobre un mockup (celular + PWA en
  escritorio); se agrega la tarea **0.5** y D14–D16. La tabla de colores de estado se alineó al
  mockup (antes: en plazo verde y Supersalud rojo oscuro, poco distinguibles de otros estados).
- **2026-10-04** — **0.3** (dependencias): `idb-keyval`, `pdfmake` + `@types/pdfmake`, 5 plugins de
  Capacitor y `@ionic/pwa-elements`; `npm ls` y `cap sync` verificados; plugins registrados en
  `android/*.gradle`. Vulnerabilidad `uuid` documentada sin acción.
- **2026-10-04** — Creación del archivo. Cierre de **0.2** (Capacitor + PWA verificados en el
  Galaxy S22 y en Chrome); ramas limpias; decisiones de ejecución y lecciones de entorno registradas.
