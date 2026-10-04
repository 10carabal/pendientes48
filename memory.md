# Memoria viva — Pendientes48

> **Cómo se mantiene:** documento vivo basado en [`proposal.md`](openspec/changes/add-pendientes-mvp/proposal.md).
> El agente que cierra una tarea, feature o cambio relevante lo actualiza como **último paso antes
> de su PR**, agregando solo decisiones, lecciones y pendientes con impacto futuro. No duplica el
> progreso (`tasks.md`), las decisiones de diseño (D1–D13 en `design.md`) ni las reglas (`AGENTS.md`).
>
> Última actualización: **2026-10-04** — cierre de la tarea 0.2.

## Por qué (resumen de `proposal.md`)
App Android + PWA para que el paciente colombiano dé seguimiento a un medicamento "pendiente"
de la farmacia: contador de 48 h desde la hora de reclamo, escalera de reclamo (EPS → Supersalud),
norma visible y documentos (copiar, PDF, compartir). Local-first, sin backend. Fuera de alcance
en la fase 2: tutela, OCR, login/sincronización, redacción con IA, ESLint.

## Estado
- **Bloque 0 en progreso:** 0.0 ✅ · 0.1 ✅ · 0.1.1 ✅ · 0.1.2 ✅ · **0.2 ✅** → siguiente **0.3**
  (dependencias: `idb-keyval`, `pdfmake`, plugins de Capacitor, `@ionic/pwa-elements`).
- Repo sano en `main`; PRs #1–#11 mergeados; una rama por tarea; **Daniel revisa y mergea**.
- Multiagente: Claude y MiMo trabajan en el mismo repo bajo las reglas de `AGENTS.md`.

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
- `npm warn allow-scripts` (esbuild, lmdb, msgpackr…) **no ha bloqueado nada real**; vigilar solo
  si un build falla por binario faltante.
- Tras cada merge: borrar ramas locales y remotas mergeadas (el remoto debe quedar con solo `main`).

## Pendientes conocidos (no bloqueantes)
- **Identidad visual:** íconos genéricos de Angular, warnings `purpose 'any maskable'`, screenshots
  del manifest y color provisional `#1e3a8a` → resolver cuando se defina el branding.
- **Hosting de la PWA** para compartirla por WhatsApp → decidir antes de la tarea 4.2.
- **ESLint:** fuera de alcance del MVP; las convenciones se revisan en cada PR (`proposal.md`).
- **Contenido legal intocable sin Daniel:** `plantillas.md` y `src/assets/data/normas.json`.

## Registro de actualizaciones
- **2026-10-04** — Creación del archivo. Cierre de **0.2** (Capacitor + PWA verificados en el
  Galaxy S22 y en Chrome); ramas limpias; decisiones de ejecución y lecciones de entorno registradas.
