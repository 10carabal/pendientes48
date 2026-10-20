# Reglas para agentes de IA — Pendientes48

Contexto del proyecto: `README.md` y `openspec/config.yaml`. Trabajo spec-driven con OpenSpec
(`/opsx-explore`, `/opsx-propose`, `/opsx-qa`, `/opsx-apply`, `/opsx-archive`).
Herramientas: OpenCode usa `opencode.json`; `.mcp.json` se conserva para compatibilidad con Claude Code.

## Flujo multiagente (skill `flujo-multiagente`, comando `/flujo`)
- Para tareas de bloque, el **coordinador** (sesión principal) despacha 3 subagentes expertos en
  una fase del SDD: **Planificador** (`explore`/`propose`: plan + ambigüedades, nunca escribe
  código), **Implementador** (`apply`: código + tests + 4 gates en verde) y **Verificador**
  (`qa`, solo detecta: sesión nueva y ojos frescos, nunca recibe el relato del implementador).
- Cada rol recibe solo su dossier (cláusula de `tasks.md` + escenarios de spec + plan + reglas
  duras) y devuelve un resumen estructurado. Las correcciones van al mismo implementador
  (`sessionID`), máx. 2 vueltas; después se escala a Daniel.
- El cierre lo hace el coordinador: `memory.md` → cláusula y checkbox de `tasks.md` → commit →
  push → PR con evidencia 390/1280. Plantillas de prompt y gates en
  `.opencode/skills/flujo-multiagente/SKILL.md`.

## Arquitectura (ver `design.md`, sección "Estructura de carpetas")
- Carpetas por concepto, no por tipo: no crees `components/`, `services/` ni `models/`.
- Dependencias en una sola dirección: `features` → `shared`, `data`, `platform`, `domain`;
  `data` → `domain`; `shared` y `platform` → `domain` (solo tipos); `domain` → nada.
- `domain/` es TypeScript puro: nunca importa Angular, Ionic ni Capacitor.
- Solo `platform/` importa `@capacitor/*`; las pantallas no preguntan si están en nativo.
- Entre capas usa los alias `@domain/*`, `@data/*`, `@platform/*`, `@shared/*`; dentro de la misma carpeta, rutas relativas. La raíz (`app.ts`, `app.config.ts`, `app.routes.ts`) es la composición: importa `features/` con ruta relativa y cualquier otra capa con su alias y una feature nunca importa de otra (lo compartido va a `shared/`).
- Cada `.spec.ts` va al lado de su archivo.

## Sistema de diseño (ver `design.md`, sección "Sistema de diseño")
- Solo tokens `--p48-*` y clases de `src/theme/patrones.scss`: nunca colores, tamaños ni espaciados sueltos.
- Ningún texto por debajo de 18 px; un solo botón principal (sólido) por pantalla; el color nunca va solo.
- Toda pantalla nueva se revisa a 390 px y a 1280 px y sus componentes compartidos se agregan a `/guia`.

## Git
- Nunca hagas commit ni push directo a `main`.
- Una rama por tarea: `feat/<n.° tarea>-<nombre>` (ej. `feat/1.1-plazo`); sin número: `chore/<nombre>` o `docs/<nombre>`.
- Commits con Conventional Commits en inglés.
- Al terminar una tarea: push de la rama y pull request hacia `main`. En la descripción del PR,
  enlaza la tarea de `tasks.md` y explica cómo se cumplió su verificación.
- Marca el checkbox de la tarea en `tasks.md` dentro del mismo PR.
- Nunca hagas merge: Daniel revisa y aprueba cada PR.

## Memoria viva (`memory.md`)
- `memory.md` (raíz) es la memoria del proceso, basada en `proposal.md`: decisiones de ejecución,
  lecciones del entorno y pendientes conocidos.
- Al terminar una tarea, feature o cambio relevante, **actualízalo como último paso antes del PR**;
  solo información con impacto futuro. No dupliques `tasks.md` (progreso), `design.md` (D1–D17)
  ni contenido legal.

## Contenido legal
- No modifiques el texto de `plantillas.md` ni `src/assets/data/normas.json` sin aprobación explícita de Daniel.
- Ningún componente contiene texto legal hardcodeado: el texto se lee de esos dos archivos o de
  las constantes aprobadas en `domain/` (`PIE_PDF`, `AVISO_NO_ASESORIA`), que las pantallas
  inyectan a los componentes por input (D6, ampliación de 2026-10-13).

## Datos y secretos
- Local-first: sin backend, sin login, sin analítica ni envío de datos a terceros.
- Nunca escribas tokens en archivos del repo; usa variables de entorno (`{env:...}`). `.env` nunca se sube.

## Cuándo detenerte y preguntar
- Una spec es ambigua o contradice otra.
- Necesitas una dependencia que no está en el stack del `README.md`.
- Una tarea exige tocar contenido legal o algo marcado como fuera de alcance en `proposal.md`.
