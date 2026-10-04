---
description: SDD · QA experto: evalúa la spec/plan del change antes de aplicarlo (solo detecta, no resuelve)
agent: plan
---

Revisa el plan actual de SDD como un QA muy profesional de este proyecto, antes de que continuemos. Esta revisión es **solo diagnóstico: detecta, no resuelve.**

**Alcance de lectura:** si `$ARGUMENTS` trae el nombre de un change o una ruta de artefacto, revisa ese; si no, el change activo en `openspec/changes/` (`proposal.md`, `design.md`, `specs/*/spec.md`, `tasks.md` y `plantillas.md` si existe) contrastado contra los documentos fuente del proyecto: `README.md` (propósito, usuario objetivo, stack, convenciones, herramientas de IA, restricciones no negociables, glosario), `openspec/config.yaml` (contexto y rules), `design.md` (decisiones, modelo de datos, estado derivado) y `src/assets/data/normas.json` cuando se traten normas.

**Lista los hallazgos en lista numerada, agrupados en estas categorías:**

1. **Ambigüedades restantes** — requisitos que no se pueden verificar: sin criterio "Hecho cuando" (la verificación de `tasks.md`), con palabras vagas ("rápido", "fácil", "usabilidad"), o que dependen de una decisión aún pendiente.
2. **Contradicciones entre requisitos** — internas del change, o entre `proposal.md`, `design.md`, los escenarios de las specs, `tasks.md`, `plantillas.md` y los documentos fuente (`README.md`, `config.yaml`).
3. **Casos límite no cubiertos** — de cada flujo: camino feliz, errores y borde. Específicos del dominio: registro del pendiente (hora de reclamo editada, campos vacíos, dirección sin autorizar domicilio), contador de 48 h (cambio de día y de mes, vencido vs. entregado, reloj del dispositivo alterado), escalera de reclamo (queja EPS sin radicado, queja Supersalud repetida), foto/PDF en modo avión, diferencias Android (notificación local) vs. PWA (`.ics`), pacientes duplicados, bitácora con eventos fuera de orden.
4. **Conflictos con las restricciones no negociables de `README.md`** — con foco en: local-first (sin backend, sin login, sin envío de datos a terceros; Ley 1581 de 2012), la app no es asesoría legal (aviso visible en app y documentos), el contenido legal vive solo en `normas.json` y `plantillas.md` (nunca hardcodeado en componentes), accesibilidad (texto base ≥ 18 px, botones grandes, una acción principal por pantalla), secretos fuera del repo, estado del pendiente derivado nunca guardado, archivos sin sufijo `.component`, lógica de dominio en funciones puras testeables.
5. **Alcance** — algo del change que esté en "Fuera de alcance (fase 2)" de `proposal.md` (tutela, OCR, directorio de canales por EPS, cuentas/login/sincronización, redacción con IA, exportación a Word) o fuera del MVP descrito en su sección "Qué cambia".
6. **Trazabilidad** — ¿cada requisito de las specs (`SHALL`/`MUST`) tiene su escenario `WHEN/THEN`? ¿cada escenario tiene su tarea en `tasks.md`? ¿cada tarea termina en una verificación concreta y declara 🅿️ si es paralelizable (rules de `config.yaml`)? ¿las tareas del Bloque 1 (dominio puro) tienen pruebas que cubran los casos límite detectados?

**Formato de cada hallazgo:**

```
N. [bloqueante|mayor|menor] <artefacto · sección> — <qué se detecta, en una línea>
```

**Reglas:**

- Solo detecta: no propongas soluciones ni corrijas nada. Daniel decide qué hallazgos se atienden.
- Cada hallazgo cita el artefacto donde se vio; nada sin evidencia.
- Si una categoría no tiene hallazgos, escribe "sin hallazgos" en ella; no inventes.
- Cierra con un conteo por severidad: bloqueantes / mayores / menores.
