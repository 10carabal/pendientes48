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
- [ ] 0.2 Agregar Capacitor Android y PWA (`@angular/pwa`)
  - Verificación: corre en un celular Android y la PWA pasa la auditoría de instalación en Lighthouse
- [ ] 0.3 Instalar dependencias: `idb-keyval`, `pdfmake`, plugins de Capacitor del `README.md`, `@ionic/pwa-elements`
  - Verificación: `npm ls` lista todas sin errores y `npx cap sync android` termina sin errores
- [ ] 0.4 Crear los modelos del `design.md` dentro de su concepto en `domain/` (`pendiente.model.ts`, `paciente.model.ts`, `norma.model.ts`; incluye `icsAgregadoEn`)
  - Verificación: `ng build` compila sin errores con los modelos importados en un archivo de prueba

## Bloque 1 — Dominio puro (🅿️ todas en paralelo, sin UI)
- [ ] 1.1 🅿️ `domain/pendiente/plazo.ts`: `vencimiento`, `estado`, `textoContador`, `validarHoraReclamo` + `plazo.spec.ts`
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
- [ ] 2.2 🅿️ `platform/notificaciones.ts` (y `platform/plataforma.ts`): programar, cancelar, reprogramar al iniciar y consultar permiso (solo nativo)
  - Verificación: en Android, un pendiente con vencimiento a 2 min dispara la notificación; al
    marcarlo entregado antes, no llega; tras cerrar y abrir la app, el aviso sigue programado
- [ ] 2.3 🅿️ `platform/compartir.ts` y `platform/calendario-descarga.ts`: copiar texto, compartir PDF, descarga como respaldo en la PWA
  - Verificación: en Android el menú de compartir muestra WhatsApp con el PDF adjunto; en un
    navegador de escritorio el PDF se descarga
- [ ] 2.4 🅿️ `platform/camara.ts`: tomar foto o elegir de la galería; reducir a 1280 px, JPEG 0.7;
  manejar permiso denegado
  - Verificación: foto tomada y foto de galería quedan de 1280 px o menos; con permiso de cámara
    denegado se ofrece la galería sin error

## Bloque 3 — Pantallas (🅿️ en paralelo cuando 1 y 2 estén listos)
- [ ] 3.1 🅿️ `shared/norma-card` (incluye "Verificado el" y el aviso de no asesoría), `shared/ayuda-avisos`, `shared/estado-chip` y `shared/aviso-legal`
  - Verificación: la tarjeta muestra los 5 elementos de la spec `normas` más el aviso de no
    asesoría y, sin conexión, solo el enlace queda inactivo; `estado-chip` muestra la etiqueta y el
    color de los 6 estados; `aviso-legal` muestra la línea fija y el modal de primera apertura
- [ ] 3.2 🅿️ `features/pacientes`: crear, editar, aviso de duplicado y "Borrar todos mis datos" con doble confirmación
  - Verificación: un duplicado ofrece "Usar el perfil existente"; tras borrar todo, la app vuelve a la primera apertura
- [ ] 3.3 🅿️ `features/ventanilla`: guía de 3 pasos, norma-card en el paso 2, alternativas del paso 3
  - Verificación: en modo avión la guía se ve completa; con cámara denegada se puede llegar al registro
- [ ] 3.4 🅿️ `features/pendiente-form`: registro y edición; dirección obligatoria precargada;
  validación de hora futura; hora bloqueada si hay queja; aviso si no autorizó domicilio;
  mensaje de fallo al guardar; hoja `ayuda-avisos` la primera vez en Android
  - Verificación: no se puede guardar con hora futura ni sin dirección; con una queja registrada
    la hora aparece bloqueada; la hoja de ayuda sale solo en el primer registro
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
    manual de texto base de 18 px o más, una acción principal por pantalla y estados con etiqueta de texto
- [ ] 4.5 Prueba con un usuario real (tu mamá o alguien en la fila de un dispensario)
  - Verificación: la persona registra un pendiente y genera una queja sin ayuda; anotar dónde dudó
- [ ] 4.6 (Opcional) Agregar Playwright MCP para automatizar el flujo 4.2 en el navegador
  - Verificación: el flujo 4.2 corre de principio a fin sin intervención
- [ ] 4.7 `/opsx:archive` del change `add-pendientes-mvp`
  - Verificación: las specs quedan en `openspec/specs/` y el change en el archivo
