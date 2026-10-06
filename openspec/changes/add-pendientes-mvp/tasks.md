# Tareas: add-pendientes-mvp

Leyenda: 🅿️ = se puede trabajar en paralelo con otras tareas del mismo bloque (una por agente).
Cada tarea termina con su verificación. No pasar al siguiente bloque sin revisar el anterior.
Una rama de Git por tarea (ver `README.md`).

## Bloque 0 — Base (secuencial, la haces tú)
- [x] 0.0 Repositorio y herramientas de IA
  - [x] 0.0.1 Verificar requisitos: Node LTS, Git, GitHub CLI (`gh`), Claude Code
    - Nota: agente OpenCode en lugar de Claude Code (mismo rol); Node v24.17.0, Git 2.54.0, gh 2.102.0
  - [x] 0.0.2 Repositorio local: descomprimir, `git init -b main`, primer commit con las specs
  - [x] 0.0.3 Repositorio en GitHub: `gh repo create` privado y primer push
  - [x] 0.0.4 GitHub MCP: token fine-grained solo para `pendientes48` + servidor remoto en alcance local
    - Nota: OAuth con DCR no lo soporta el servidor de GitHub; se usó PAT con `oauth: false` (secretos en entorno vía `{env:...}`, nunca en el repo)
  - [x] 0.0.5 OpenSpec: `openspec init` (conserva `specs/`, `changes/` y `config.yaml`)
  - [x] 0.0.6 Angular Agent Skills: `npx skills add https://github.com/angular/skills`
  - [x] 0.0.7 Verificar MCPs con `/mcp` y commit `chore: configurar herramientas de IA`
    - Commit `chore: configure AI tooling` en rama `chore/0.0-ai-tooling`, PR #1 mergeado a `main`
  - Verificación: `/mcp` muestra angular-cli, context7 y github conectados; el agente responde
    `get_best_practices`, encuentra en Context7 la doc de `@capacitor/local-notifications` y lista
    los issues del repo con GitHub MCP
    - ✅ 2026-10-04: `get_best_practices` ✓ · Context7 resolvió `/ionic-team/capacitor-plugins` ✓ · GitHub `get_me` = 10carabal ✓
- [x] 0.1 Crear proyecto Ionic Angular standalone, zoneless, sin sufijo `.component`
  - Nota: `ng new` + `ng add` en lugar de `ionic start`; `src/assets` servido desde `angular.json`
  - Verificación: `ionic serve` muestra la pantalla de inicio vacía
- [x] 0.1.1 Estructura de carpetas por concepto y alias de rutas (`design.md` D11 y D12)
  - Nota: sin código nuevo; cambian rutas en `design.md` y `tasks.md`, reglas en `AGENTS.md`,
    resumen en `config.yaml` y alias en `tsconfig.json`
  - Verificación: `openspec validate --strict` pasa; `ng build` y `ng test` pasan con los alias configurados
- [x] 0.1.2 Corregir ambigüedades de D11/D12 (conteo de capas e imports entre features)
  - Nota: sin código nuevo; D11 y regla 5 en `design.md`, espejo en `AGENTS.md`, `README.md`
    y `config.yaml`
  - Verificación: `openspec validate --strict` pasa y la regla (feature→feature prohibido,
    raíz→features relativo, sin "4 capas") queda igual en `design.md`, `AGENTS.md`, `README.md`
    y `config.yaml`
- [x] 0.2 Agregar Capacitor Android y PWA (`@angular/pwa`)
  - Nota: appId `com.theoceweb.pendientes48`; service worker solo en la PWA (`isNative()`, D13);
    `platform/plataforma.ts` adelantado desde la 2.2; la raíz puede importar capas con alias
    (regla 5 de `design.md`); Lighthouse ya no tiene auditoría PWA
  - Verificación: la app abre en un celular Android con `npx cap run android`; en Chrome,
    DevTools → Application → Manifest sin errores de instalabilidad y service worker activo
- [x] 0.3 Instalar dependencias: `idb-keyval`, `pdfmake`, plugins de Capacitor del `README.md`, `@ionic/pwa-elements`
  - Nota: `@types/pdfmake` añadido como devDependency (pdfmake 0.3.11 no trae tipos y `domain/`
    los necesita; aprobado por Daniel, `README.md` sincronizado). Las 3 moderadas de `uuid` en
    `@capacitor/cli` quedan documentadas en `memory.md` sin acción
  - Verificación: `npm ls` lista todas sin errores y `npx cap sync android` termina sin errores
- [x] 0.4 Crear los modelos del `design.md` dentro de su concepto en `domain/` (`pendiente.model.ts`, `paciente.model.ts`, `norma.model.ts`; incluye `icsAgregadoEn`)
  - Nota: `Gestion.tipoDocumento` reutiliza `Paciente['tipoDocumento']` con alias `@domain/*`;
    `Preferencias` queda para la tarea que cree `data/preferencias-store.ts`; specs con fixtures
    happy y **unhappy path** con `@ts-expect-error` (pedido por Daniel)
  - Verificación: `ng build` compila sin errores con los modelos importados en un archivo de
    prueba; `npx tsc -p tsconfig.spec.json --noEmit` pasa (un unhappy path queda sin cubrir si el
    modelo relaja sus requisitos)
- [x] 0.5 Sistema de diseño (`design.md` D14–D16 y sección "Sistema de diseño")
  - Independiente de los bloques 1 y 2: puede hacerse en paralelo; el bloque 3 depende de ella
  - `src/theme/tokens.css` con los tokens `--p48-*`; `variables.css` los mapea a Ionic y quita el
    import de `dark.system.css` (D15); `provideIonicAngular({ mode: 'ios' })` (D16)
  - `styles.scss`: tipografía del sistema, base de 18 px e interlineado 1,5
  - `src/theme/patrones.scss`: los 7 patrones (3 niveles de botón, barra de acento, ícono en círculo,
    superficie, etiquetas de estado, campo con borde, sombra flotante)
  - `features/guia/` en `/guia`, registrada solo en desarrollo, con todos los tokens y patrones
  - Verificación: Daniel aprueba `/guia` a 390 px y a 1280 px contra el mockup; Lighthouse ≥ 90 en
    accesibilidad sobre `/guia`; cada par texto/fondo cumple 4,5:1 (bordes de campo 3:1); en un
    build de producción `/guia` no existe (redirige a inicio)
  - Resultados (2026-10-05): Lighthouse accesibilidad sobre `/guia` = **100/100**; 22/22 pares de
    contraste ≥ 4,5:1 y borde de campo 3,32:1; `ng build` limpio (inicial 508,87 kB < presupuesto
    de 550 kB), `ng test` 15/15 y `tsc --noEmit` sin errores; con `ng serve --configuration
    production`, `/guia` redirige a inicio y no renderiza la guía
  - ⏳ Pendiente de Daniel antes del merge: aprobar `/guia` a 390 px y a 1280 px contra el mockup
- [x] 0.6 Ícono y splash (`design.md` D17)
  - Fuentes SVG en `assets/fuente/` → PNG en `assets/` (`icon-only`, `icon-foreground`,
    `icon-background`, `splash`, `splash-dark` = blanco por D15)
  - Android con `@capacitor/assets` (devDependency aprobada por Daniel): íconos adaptables y splash;
    `windowSplashScreenBackground` blanco en `styles.xml` para Android 12+
  - PWA a mano (la herramienta escribe fuera de `public/` y combina `purpose`): `public/icons/` en
    48, 180, 192 y 512; manifiesto con `any` y `maskable` por separado; favicon y `apple-touch-icon`
    en `index.html`; `theme-color`, `theme_color` y `background_color` a `#FFFFFF` (movido desde la 0.5)
  - Verificación: `ng build`, `ng test` y `cap sync` sin errores; el ícono se ve en el Galaxy S22 en
    la pantalla de inicio y en el splash (fondo blanco, ícono en círculo); la PWA instalada en Chrome
    muestra el ícono y DevTools → Application → Manifest sin advertencias de íconos
    - ⏳ Pendiente de Daniel antes del merge: revisión en el Galaxy S22 y en Chrome

## Bloque 1 — Dominio puro (🅿️ todas en paralelo, sin UI)
- [x] 1.1 🅿️ `domain/pendiente/plazo.ts`: `vencimiento`, `estado`, `textoContador`, `validarHoraReclamo` + `plazo.spec.ts`
  - Verificación: pruebas pasan para vencimiento con cambio de día y de mes, las 5 reglas de
    `estado()`, las 5 ramas de `textoContador()` y la hora futura rechazada
- [ ] 1.2 🅿️ `domain/pendiente/bitacora.ts`: `bitacoraVista`, `registrarQueja` + `bitacora.spec.ts`
  - Verificación: pruebas pasan para vencimiento calculado (con y sin entrega previa) y para
    queja registrada dos veces sin duplicar eventos
- [ ] 1.3 🅿️ `domain/calendario/ics.ts` (generar archivo `.ics`) + `ics.spec.ts`
  - Verificación: pruebas pasan para `DTSTART` en UTC y `UID` idéntico en dos generaciones del mismo pendiente
- [ ] 1.4 🅿️ `domain/reclamo/plantillas.ts` y `plantillas-pdf.ts` con el texto aprobado de `plantillas.md` + `plantillas.spec.ts`
  - ✅ Desbloqueada: plantillas aprobadas el 2026-10-04
  - Verificación: los 4 casos de prueba de `plantillas.md` pasan y el texto corto no contiene el aviso de no asesoría
- [ ] 1.5 🅿️ `assets/data/normas.json` + `data/normas-catalogo.ts` con `paraPaso(paso)` + `normas-catalogo.spec.ts`
  - Verificación: la prueba del criterio de lenguaje sencillo pasa; cada URL abre la fuente oficial
    y `verificadoEl` está actualizado

## Bloque 2 — Plataforma y persistencia (🅿️ en paralelo)
- [ ] 2.1 🅿️ `data/`: `app-db.ts` y stores de pacientes, pendientes y preferencias sobre `idb-keyval`;
  fotos como `Blob`; detección de perfil duplicado; `borrarTodo()`; errores de escritura controlados
  - Verificación: las pruebas de los stores pasan para guardar/leer, perfil duplicado, fallo de escritura
    simulado y `borrarTodo()` dejando IndexedDB vacío
- [ ] 2.2 🅿️ `platform/notificaciones.ts` (usa `platform/plataforma.ts`, creado en la 0.2): programar, cancelar, reprogramar al iniciar y consultar permiso (solo nativo)
  - Verificación: en Android, un pendiente con vencimiento a 2 min dispara la notificación; al
    marcarlo entregado antes, no llega; tras cerrar y abrir la app, el aviso sigue programado
  - Nota (QA): `design.md · Avisos` y el escenario "Editar un pendiente" de la spec `pendientes`
    exigen **reprogramar el aviso al editar la hora** (no solo al iniciar) — añadirlo a la tarea y
    a su verificación (hallazgo mayor 11)
- [ ] 2.3 🅿️ `platform/compartir.ts` y `platform/calendario-descarga.ts`: copiar texto, compartir PDF, descarga como respaldo en la PWA
  - Verificación: en Android el menú de compartir muestra WhatsApp con el PDF adjunto; en un
    navegador de escritorio el PDF se descarga
- [ ] 2.4 🅿️ `platform/camara.ts`: tomar foto o elegir de la galería; reducir a 1280 px, JPEG 0.7;
  manejar permiso denegado
  - Verificación: foto tomada y foto de galería quedan de 1280 px o menos; con permiso de cámara
    denegado se ofrece la galería sin error

## Bloque 3 — Pantallas (🅿️ en paralelo cuando 0.5, 1 y 2 estén listos)
Regla para todo el bloque: solo tokens y patrones del sistema de diseño (sin colores, tamaños ni
espaciados sueltos), y cada pantalla se verifica a 390 px y a 1280 px contra el mockup aprobado.
- [ ] 3.1 🅿️ `shared/norma-card` (incluye "Verificado el" y el aviso de no asesoría), `shared/ayuda-avisos`, `shared/estado-chip` y `shared/aviso-legal`
  - Verificación: la tarjeta muestra los 5 elementos de la spec `normas` más el aviso de no
    asesoría y, sin conexión, solo el enlace queda inactivo; `estado-chip` muestra la etiqueta y el
    color de los 6 estados; `aviso-legal` muestra la línea fija y el modal de primera apertura;
    los cuatro componentes aparecen en `/guia`
- [ ] 3.2 🅿️ `features/pacientes`: crear, editar, aviso de duplicado y "Borrar todos mis datos" con doble confirmación
  - Verificación: un duplicado ofrece "Usar el perfil existente"; tras borrar todo, la app vuelve a la primera apertura
  - Nota (QA): el escenario "Borrar todos mis datos" exige además **cancelar todos los avisos
    programados** — incluirlo en texto y verificación (hallazgo mayor 12)
- [ ] 3.3 🅿️ `features/ventanilla`: guía de 3 pasos, norma-card en el paso 2, alternativas del paso 3
  - Verificación: en modo avión la guía se ve completa; con cámara denegada se puede llegar al registro
- [ ] 3.4 🅿️ `features/pendiente-form`: registro y edición; dirección obligatoria precargada;
  validación de hora futura; hora bloqueada si hay queja; aviso si no autorizó domicilio;
  mensaje de fallo al guardar; hoja `ayuda-avisos` la primera vez en Android
  - Verificación: no se puede guardar con hora futura ni sin dirección; con una queja registrada
    la hora aparece bloqueada; la hoja de ayuda sale solo en el primer registro
  - Nota (QA): falta el escenario "Hora de reclamo por defecto" (la hora se precarga con la hora
    actual) — incluirlo en texto y verificación (hallazgo mayor 10)
- [ ] 3.5 `features/pendiente-detalle`: contador, estado con etiqueta y color, norma-card, bitácora
  (`bitacoraVista`) con notas manuales, escalera tipo stepper, "Ya me llegó", aviso de permiso
  denegado, botón `.ics` con "Ya agregaste este recordatorio el…", y "Borrar" con confirmación
  - Depende de: 3.1, 1.1, 1.2, 1.3
  - Verificación: un pendiente vencido con la app cerrada muestra "Venció el plazo" en la bitácora;
    el paso 1 sigue visible como "Completado" tras registrar la queja; el segundo toque al `.ics`
    muestra el aviso; al borrar, desaparece de inicio, su aviso se cancela y la foto se elimina
- [ ] 3.6 `features/reclamo`: vista previa editable, nota de autorización incluida, copiar con aviso
  en pantalla, PDF, compartir
  - Depende de: 1.4, 2.3
  - Verificación: el texto copiado coincide con la plantilla aprobada y no trae el aviso; la nota de
    autorización aparece solo si no autorizó en la farmacia; el PDF trae fundamento legal, bitácora y pie
- [ ] 3.7 `features/inicio`: lista con estado (etiqueta + color), aviso legal en la primera apertura
  y luego como línea fija al pie
  - Verificación: la primera vez exige "Entiendo"; después el aviso queda visible al pie en cada apertura

## Bloque 4 — Verificación (la haces tú, en un celular real)
- [ ] 4.1 Flujo completo en Android: registrar → vence (horaReclamo editada a 47 h 59 min atrás) → notificación → queja EPS → queja Supersalud
  - Verificación: cada paso queda en la bitácora y el PDF del paso 2 cita la queja ante la EPS
- [ ] 4.2 Flujo completo en la PWA, incluido el `.ics` en el calendario del celular
  - Verificación: el evento aparece en el calendario a la hora de vencimiento
- [ ] 4.3 Modo avión: guía, registro y PDF funcionan sin conexión
  - Verificación: los tres se completan sin errores con el modo avión activo
- [ ] 4.4 Accesibilidad
  - Verificación: Lighthouse con 90 o más en accesibilidad en inicio, detalle y reclamo; revisión
    manual de texto base de 18 px o más, una acción principal por pantalla, estados con etiqueta de texto,
    contraste de 4,5:1 en todo el texto y área táctil de 48 px en todo lo que se toca
- [ ] 4.5 Prueba con un usuario real (tu mamá o alguien en la fila de un dispensario)
  - Verificación: la persona registra un pendiente y genera una queja sin ayuda; anotar dónde dudó
- [ ] 4.6 (Opcional) Agregar Playwright MCP para automatizar el flujo 4.2 en el navegador
  - Verificación: el flujo 4.2 corre de principio a fin sin intervención
- [ ] 4.7 `/opsx:archive` del change `add-pendientes-mvp`
  - Verificación: las specs quedan en `openspec/specs/` y el change en el archivo
