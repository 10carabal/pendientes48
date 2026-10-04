# Change: add-pendientes-mvp

## Por qué
La entrega inoportuna de medicamentos es una de las causas principales de quejas ante la Supersalud
y de tutelas en salud. Cuando la farmacia deja un medicamento "pendiente", el paciente sale con un
papel y nadie le hace seguimiento. La ley ya le da 48 horas a la EPS para entregarlo a domicilio
(si el afiliado lo autoriza), pero casi nadie lo sabe ni sabe cómo reclamar.

## Qué cambia
- **Guía de ventanilla:** checklist para el momento en que la farmacia dice "quedó pendiente".
- **Registro de pendientes:** medicamento, farmacia, hora de reclamo, foto del comprobante,
  dirección autorizada y paciente (propio o un familiar).
- **Contador de 48 h:** calculado desde la hora de reclamo; aviso al vencer
  (notificación local en Android, archivo `.ics` en la PWA).
- **Bitácora:** cada evento del pendiente queda registrado con fecha y hora.
- **Escalera de reclamo:** paso 1 queja ante la EPS (+ información de red alterna);
  paso 2 queja ante la Supersalud.
- **Documentos:** texto corto para copiar, PDF completo con anexos y opción de compartir.
- **Norma visible:** tarjeta "¿Por qué tienes derecho?" en cada pendiente y sección
  "Fundamento legal" en cada documento, leídas desde `normas.json`.

## Fuera de alcance (fase 2)
- Tutela
- OCR del comprobante
- Directorio de canales por EPS
- Cuentas / login / sincronización
- Redacción con IA
- Exportación a Word (.docx)

## Impacto
- Capacidades nuevas: `ventanilla`, `pendientes`, `reclamos`, `normas`
- Plataformas: Android (Capacitor) y PWA
- Sin backend; todos los datos quedan en el dispositivo
