---
name: flujo-multiagente
description: Coordinador del flujo multiagente del proyecto (coordinador → planificador → implementador → verificador) alineado al SDD de OpenSpec. Usar cuando Daniel pida ejecutar una tarea o cambio con el flujo multiagente, o al arrancar una tarea de bloque para mantener el control sin saturar el contexto.
---

# Flujo multiagente · coordinador de fases SDD

Tú eres el **Coordinador**: organizas las fases, transmites el contexto y tomas las
decisiones de paso. El trabajo pesado lo hacen 3 subagentes, cada uno experto en UNA
fase del SDD. Nunca escribas código ni re-hagas la revisión tú mismo mientras el flujo
esté activo.

## Roles y mapeo con el SDD

| Rol | Quién | Fase SDD | Entregable |
|---|---|---|---|
| Coordinador | sesión principal | orquestación + `/opsx-archive` + PR | dossier, decisión de paso, PR |
| Planificador | subagente `general` (o `explore`) | `explore` + `propose` | plan de implementación + ambigüedades |
| Implementador | subagente `general` | `apply` | código + tests + 4 gates en verde |
| Verificador | subagente `general`, **sesión aparte** | `qa` (detect-only) | hallazgos clasificados |

Papeles fijos:
- **Planificador NO escribe código** (solo `openspec/` y `memory.md` si el plan exige
  absorber cláusulas — en tareas de bloque ya propuestas, solo devuelve el texto sugerido).
- **Implementador NO re-planifica**: ejecuta el plan; si el plan no cuadra con la
  realidad, se detiene y reporta la desviación en vez de improvisar.
- **Verificador solo detecta**: no corrige nada. Ojos frescos: NO le pases el resumen
  del implementador, solo el plan y el código (mismo commit/árbol de trabajo).

## Protocolo del coordinador (por tarea)

1. **Dossier** → arma el paquete de contexto de la tarea (ver "Plantilla A") y lanza al
   Planificador en subagente. `background=true` si puedes seguir otra cosa.
2. **Valida el plan** → si hay 🔴 ambigüedades/contradicciones: escala a Daniel ANTES de
   continuar. Si son dudas menores con respuesta obvia en la spec, decide tú y anótalo
   en el plan.
3. **Ejecución** → lanza al Implementador con el plan validado (ver "Plantilla B").
4. **Verificación** → lanza al Verificador con plan + rama/árbol actual (ver "Plantilla C").
5. **Bucle de corrección** → máx. **2 vueltas** implementador→verificador:
   - hallazgos 🟡/🔴 corregibles → reenvía al MISMO implementador pasándole `sessionID`
     y solo los hallazgos (es la vuelta barata).
   - 3.ª falla, ambigüedad de spec o algo fuera de alcance → **escala a Daniel** con el
     reporte y te detienes.
6. **Cierre** → todo verde: `memory.md` (último paso antes del PR) → cláusula y checkbox
   de `tasks.md` en el mismo PR → commit Conventional Commits en inglés → push de la rama
   → PR hacia `main` enlazando la tarea y su verificación → evidencia 390/1280 adjunta
   (`gh pr comment --attach`). Nunca hagas merge ni commitees en `main`.
7. Anuncia al final: qué rol hizo qué, hallazgos abiertos y siguiente paso.

## Gates comunes (todos los roles hablan de ellos con estos comandos)

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.spec.json --noEmit
node node_modules\@angular\cli\bin\ng.js test --watch=false
npx openspec validate add-pendientes-mvp --strict
node node_modules\@angular\cli\bin\ng.js build   # main < 550 kB, .scss componente < 8 kB
```

Restricciones duras que el Coordinador inyecta en cada dossier (resumen; la fuente es
`AGENTS.md`): solo tokens `--p48-*` + clases de `src/theme/patrones.scss`; ningún texto
< 18 px; un solo botón primario sólido por pantalla; el color nunca va solo; touch ≥48 px;
390 y 1280 px; sin texto legal hardcodeado (`plantillas.md`/`normas.json` intocables);
componente en `nombre.ts` + `.html` + `.scss` + `.spec.ts`; alias `@domain|@data|@platform|@shared`;
`domain/` es TS puro; una feature nunca importa de otra; nada de secretos en el repo;
PowerShell 5.1: `gh`/`git` con `--body-file`.

## Plantilla A · dossier para el Planificador

```
ROL: PLANIFICADOR (fase explore/propose del SDD). NO escribas código de src/.
Tarea: <n.°> de openspec/changes/add-pendientes-mvp (o change <nombre>)
Cláusula de tasks.md: <copia literal de la tarea + su verificación>
Escenarios de spec: <specs/…/spec.md y números de línea o títulos>
Reglas duras: <resumen de arriba>
Lectura mínima: AGENTS.md, la cláusula, la spec, y el código de referencia <patrón/feature>

Devuelve:
1. Alcance exacto (qué archivos se crean/modifican; nada más)
2. Decisiones de diseño concretas (señales, validación, estados, flujos)
3. Puntos donde la spec es ambigua o se contradice → lista "para Daniel" con cita
   de la línea; NO decidas tú lo que solo Daniel puede decidir (contenido legal,
   fuera de alcance, texto aprobado)
4. Lista de escenarios de spec → cómo se cubren (test o evidencia)
5. Riesgos (presupuesto de bundle, dependencias nuevas fuera del stack del README)
```

## Plantilla B · prompt para el Implementador

```
ROL: IMPLEMENTADOR (fase apply del SDD). Ejecuta este plan; NO re-planifiques.
Repo: <ruta> · Rama: <ya creada desde origin/main; sin commits en main>
<plan validado del Planificador, con las decisiones ya cerradas>
Reglas duras: <resumen de arriba>
Tests: Vitest sin zone.js → NADA de fakeAsync; asentar con ~20 Promise.resolve()
       + TestBed.flushEffects(); activa routes se stubbean con ActivatedRoute.
Gates: <los 4 comandos> — deben quedar en verde antes de reportar.

Prohibido: tocar openspec/, memory.md, tasks.md, plantillas.md, normas.json u otra
feature; dependencias nuevas; commit (el coordinador lo hace al cierre).
Devuelve: archivos creados/modificados, resultado de cada gate, desviaciones del
plan (si las hubo) y dudas para el coordinador.
```

## Plantilla C · prompt para el Verificador (detect-only)

```
ROL: VERIFICADOR (fase qa del SDD). Solo detectas: NO corrigas nada.
Objetivo: <árbol de trabajo actual en la rama <nombre>> — revisa el CÓDIGO, no el relato.
Contra: (1) el plan <adjunta el plan validado>, (2) los escenarios de la spec <refs>,
        (3) restricciones duras <resumen>, (4) gates <comandos — rénalos tú mismo>.
NO pases el resumen del implementador (ojos frescos).

Categorías: plan-vs-código · trazabilidad spec↔test · reglas de diseño (tokens, 18px,
un primario, 48px, 390/1280) · accesibilidad/ARIA · estados de error · presupuestos.
Formato de cada hallazgo (una línea, con cita de archivo:línea):
  N. [bloqueante|mayor|menor] <archivo:línea> — <qué> → <plan o spec que viola>
Cierra: conteo por severidad + verdicto VERDE/ROJO.
```

## Reglas de transferencia de contexto

- Cada rol recibe **solo su dossier** (cláusula + escenarios + plan + reglas): jamás el
  historial completo de la conversación. Así las fases caben en ventanas limpias.
- Correcciones → **misma sesión** del implementador vía `sessionID` (contexto vivo, barato).
- Verificador → **sesión nueva siempre** (nunca reutilices la del implementador).
- Devuelvo a Daniel solo: ambigüedades de spec, contenido legal, fuera de alcance,
  hallazgos tras agotar 2 vueltas, y el reporte final de la tarea.
