# Pendientes48

> Tu medicamento en 48 horas, con la ley de tu lado.

Este README es la referencia para personas. El contexto que leen los agentes de IA está en
`openspec/config.yaml` (resumen de este archivo). Si cambias uno, actualiza el otro.

## Propósito
Ayudar a pacientes colombianos (o a quien hace el trámite por ellos) cuando la farmacia de la EPS
no entrega un medicamento completo y queda "pendiente". La app:
1. Guía al paciente en la ventanilla para que su derecho quede activado.
2. Cuenta las 48 horas legales desde la hora del reclamo.
3. Si se vencen, genera la queja con la norma como soporte visible (EPS → Supersalud).

## Usuario objetivo
- Pacientes crónicos y adultos mayores, muchas veces con baja alfabetización digital.
- Familiares que gestionan los trámites de otra persona.

## Stack
- Ionic (última versión estable) + Angular (standalone, Signals, zoneless) + Capacitor
- Plataformas: Android (Capacitor) y PWA (mismo código)
- Persistencia: IndexedDB vía `idb-keyval` (un solo camino para Android y web)
- PDF: `pdfmake` (generado en el dispositivo) + `@types/pdfmake` (tipos para `domain/`)
- Plugins: `@capacitor/local-notifications`, `@capacitor/camera` + `@ionic/pwa-elements`,
  `@capacitor/clipboard`, `@capacitor/share`, `@capacitor/filesystem`
- Pruebas: unitarias en servicios de dominio (plazos, plantillas)

## Convenciones
- Archivos sin sufijo `.component` (convención Angular 22)
- Componentes standalone, Signals para estado, zoneless change detection
- `provideAppInitializer()` para inicialización asíncrona
- Carpetas por concepto: `domain/` (TypeScript puro), `data/`, `platform/` (único que usa
  Capacitor), `features/` y `shared/`; imports entre capas con alias `@domain/*`, `@data/*`,
  `@platform/*`, `@shared/*`; una feature nunca importa de otra (lo compartido va a `shared/`).
  Detalle y reglas en `design.md` (D11 y D12)
- Decisiones de arquitectura documentadas en `design.md` en el momento en que se toman

## Herramientas de IA (solo fuentes oficiales o verificadas)
| Herramienta | Publicador | Uso en este proyecto |
|---|---|---|
| OpenSpec CLI (`@fission-ai/openspec`) | Fission-AI (MIT) | Flujo spec-driven: `/opsx:propose`, `/opsx:apply`, `/opsx:archive` |
| Angular Agent Skills (`angular/skills`) | Equipo de Angular (Google) | Guía de código Angular actualizada: Signals, testing, accesibilidad |
| Angular CLI MCP (`ng mcp`) | Equipo de Angular (Google) | Mejores prácticas por versión, búsqueda en angular.dev; arranca en `--read-only` |
| Context7 MCP (`@upstash/context7-mcp`) | Upstash | Documentación actual de Ionic, Capacitor, pdfmake e idb-keyval |
| GitHub MCP (remoto) | GitHub | Pull requests e issues del repositorio; configurado en alcance local, nunca en `.mcp.json` |
| Playwright MCP (`@playwright/mcp`) | Microsoft | Opcional, solo en el bloque 4 para probar flujos de la PWA |

Regla: si una guía de una herramienta contradice este README o `openspec/config.yaml`, mandan estos archivos.

## Flujo de trabajo con Git
- `main` siempre estable; una rama por tarea: `feat/<n.°-tarea>-<nombre>` (ej. `feat/1.1-plazo`)
- Para tareas sin número (setup, documentación, tooling): `chore/<nombre>` o `docs/<nombre>`
  (ej. `docs/opsx-qa-command`)
- Commits con Conventional Commits en ingles: `feat: calculate expiration of 48 h`
- Al terminar una tarea: push de la rama → pull request → revisión → merge a `main`
- Secretos (tokens, `.env`) nunca se suben; `.env.example` sí

## Restricciones (no negociables)
- **Local-first:** sin backend, sin login, sin envío de datos a terceros. Los datos de salud
  son datos sensibles (Ley 1581 de 2012).
- **No es asesoría legal:** aviso visible en la app y en cada PDF; también en la pantalla
  donde se copia el texto corto.
- **Normas como datos:** el contenido legal vive en `normas.json` y `plantillas`, nunca
  hardcodeado en componentes.
- **Accesibilidad:** texto base ≥ 18px, botones grandes, una acción principal por pantalla.

## Glosario de dominio
- **Pendiente:** medicamento que la farmacia no entregó completo al momento del reclamo.
- **Hora de reclamo:** momento en que el afiliado reclama en la farmacia; inicia el plazo de 48 h.
- **Comprobante de pendiente:** papel/registro que entrega la farmacia con lo que quedó debiendo.
- **Gestor farmacéutico:** operador que dispensa medicamentos por cuenta de la EPS.
- **Red alterna:** otros gestores o IPS donde se puede reclamar si no se cumple el plazo.
- **PQRD:** Peticiones, Quejas, Reclamos y Denuncias.
- **Escalera de reclamo:** paso 1 queja ante la EPS; paso 2 queja ante la Supersalud.
