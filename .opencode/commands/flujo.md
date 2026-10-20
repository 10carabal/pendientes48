---
description: Flujo multiagente · coordinador → planificador → implementador → verificador (expertos por fase del SDD)
---

Ejecuta el flujo multiagente para `$ARGUMENTS` (si está vacío, usa la tarea en curso o
pregunta cuál del change activo).

Carga la skill `flujo-multiagente` y sigue su protocolo como Coordinador:

1. Arma el dossier de la tarea y lanza al **Planificador** (subagente).
2. Valida el plan; escala a Daniel las 🔴 ambigüedades antes de continuar.
3. Lanza al **Implementador** con el plan validado (misma sesión para correcciones vía `sessionID`).
4. Lanza al **Verificador** en sesión nueva, detect-only, contra plan + spec + gates.
5. Bucle máx. 2 vueltas; luego escala a Daniel.
6. Cierre: `memory.md` → `tasks.md` (cláusula + checkbox) → commit → push → PR con evidencia.

Nunca commitees en `main` ni hagas merge. Los gates y reglas duras están en la skill.
