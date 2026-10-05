# Memoria viva — Pendientes48

> **Cómo se mantiene:** documento vivo basado en [`proposal.md`](openspec/changes/add-pendientes-mvp/proposal.md).
> El agente que cierra una tarea, feature o cambio relevante lo actualiza como **último paso antes
> de su PR**, agregando solo decisiones, lecciones y pendientes con impacto futuro. No duplica el
> progreso (`tasks.md`), las decisiones de diseño (D1–D17 en `design.md`) ni las reglas (`AGENTS.md`).
>
> Última actualización: **2026-10-05** — verificación de la 0.6 en el Galaxy S22 y en Chrome (PWA).

## Por qué (resumen de `proposal.md`)
App Android + PWA para que el paciente colombiano dé seguimiento a un medicamento "pendiente"
de la farmacia: contador de 48 h desde la hora de reclamo, escalera de reclamo (EPS → Supersalud),
norma visible y documentos (copiar, PDF, compartir). Local-first, sin backend. Fuera de alcance
en la fase 2: tutela, OCR, login/sincronización, redacción con IA, ESLint.

## Estado
- **Bloque 0 en progreso:** 0.0 ✅ · 0.1 ✅ · 0.1.1 ✅ · 0.1.2 ✅ · 0.2 ✅ · 0.3 ✅ · **0.6 ✅**
  (verificada en el Galaxy S22 y en Chrome) → siguen **0.4** (modelos en `domain/`) y **0.5**
  (sistema de diseño).
- Repo sano en `main`; PRs #1–#15 mergeados; una rama por tarea; **Daniel revisa y mergea**.
- Multiagente: Claude y MiMo trabajan en el mismo repo bajo las reglas de `AGENTS.md`.
- Tareas de instalación pura (como 0.3): **no** requieren flujo `/opsx:*`; solo ejecución +
  su verificación + PR (decisión de Daniel, 2026-10-04).

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

## Pendientes conocidos (no bloqueantes)
- **Identidad visual:** sistema de diseño (D14–D16) e ícono/splash (D17) resueltos; solo quedan las
  capturas de pantalla del manifiesto (`screenshots`), que se agregan cuando existan pantallas reales.
- **Hosting de la PWA** para compartirla por WhatsApp → decidir antes de la tarea 4.2.
- **`uuid` (3 moderadas en `npm audit`):** dentro de `@capacitor/cli` → `xcode`; es solo la CLI de
  desarrollo, nunca llega a usuarios. El fix de npm rebajaría la CLI a 8.4.3 (peor) → **sin acción**,
  vigilar releases de Capacitor (decisión de Daniel, 2026-10-04).
- **ESLint:** fuera de alcance del MVP; las convenciones se revisan en cada PR (`proposal.md`).
- **Contenido legal intocable sin Daniel:** `plantillas.md` y `src/assets/data/normas.json`.

## Registro de actualizaciones
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
