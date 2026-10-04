# Tareas: add-pendientes-mvp

Leyenda: 🅿️ = se puede trabajar en paralelo con otras tareas del mismo bloque (una por agente).
Cada tarea termina con su verificación. No pasar al siguiente bloque sin revisar el anterior.

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
- [ ] 0.1 Crear proyecto Ionic Angular standalone, zoneless, sin sufijo `.component`
  - Verificación: `ionic serve` muestra la pantalla de inicio vacía
- [ ] 0.2 Agregar Capacitor Android y PWA (`@angular/pwa`)
  - Verificación: corre en un celular Android y la PWA pasa la auditoría de instalación en Lighthouse
- [ ] 0.3 Instalar dependencias: `idb-keyval`, `pdfmake`, plugins de Capacitor del `README.md`, `@ionic/pwa-elements`
- [ ] 0.4 Crear `core/models` con las interfaces del `design.md`

## Bloque 1 — Dominio puro (🅿️ todas en paralelo, sin UI)
- [ ] 1.1 🅿️ `domain/plazo.ts` + `plazo.spec.ts` (vencimiento y reglas de `estado()`)
- [ ] 1.2 🅿️ `domain/bitacora.ts` (crear eventos automáticos) + pruebas
- [ ] 1.3 🅿️ `domain/ics.ts` (generar archivo `.ics`) + pruebas
- [ ] 1.4 🅿️ `domain/plantillas.ts` con el texto aprobado de `plantillas.md` + pruebas
  - ✅ Desbloqueada: plantillas aprobadas el 2026-10-04
  - Verificación: los 4 casos de prueba de `plantillas.md` pasan
- [ ] 1.5 🅿️ `assets/data/normas.json` + servicio `NormasService` con `paraPaso(paso)`
  - Verificación: cada URL abre la fuente oficial y `verificadoEl` está actualizado

## Bloque 2 — Plataforma y persistencia (🅿️ en paralelo)
- [ ] 2.1 🅿️ `core/storage`: repositorio de pacientes y pendientes sobre `idb-keyval`; fotos como `Blob`
- [ ] 2.2 🅿️ `platform/notificaciones`: programar, cancelar y reprogramar al iniciar (solo nativo)
- [ ] 2.3 🅿️ `platform/compartir`: copiar texto, compartir PDF, descarga como respaldo en la PWA
- [ ] 2.4 🅿️ `platform/camara`: tomar foto y reducirla a 1280 px, JPEG 0.7

## Bloque 3 — Pantallas (🅿️ en paralelo cuando 1 y 2 estén listos)
- [ ] 3.1 🅿️ `shared/norma-card`
- [ ] 3.2 🅿️ `features/pacientes` (crear y editar perfil)
- [ ] 3.3 🅿️ `features/ventanilla` (guía de 3 pasos + norma-card en el paso 2)
- [ ] 3.4 🅿️ `features/pendiente-form` (aviso si no autorizó domicilio)
- [ ] 3.5 `features/pendiente-detalle` (contador, norma-card, bitácora, escalera, "Ya me llegó")
  - Depende de: 3.1
- [ ] 3.6 `features/reclamo` (vista previa editable, copiar, PDF, compartir)
  - Depende de: 1.4, 2.3
- [ ] 3.7 `features/inicio` (lista con estado + aviso de no asesoría la primera vez)

## Bloque 4 — Verificación (la haces tú, en un celular real)
- [ ] 4.1 Flujo completo en Android: registrar → vence (horaReclamo editada a 47 h 59 min atrás) → notificación → queja EPS → queja Supersalud
- [ ] 4.2 Flujo completo en la PWA, incluido el `.ics` en el calendario del celular
- [ ] 4.3 Modo avión: guía, registro y PDF funcionan sin conexión
- [ ] 4.4 Prueba con un usuario real (tu mamá o alguien en la fila de un dispensario)
- [ ] 4.5 (Opcional) Agregar Playwright MCP para automatizar el flujo 4.2 en el navegador
- [ ] 4.6 `/opsx:archive` del change `add-pendientes-mvp`
