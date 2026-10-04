## ADDED Requirements

### Requirement: Escalera de reclamo
El sistema SHALL ofrecer dos pasos de reclamo para un pendiente vencido:
paso 1 queja ante la EPS, paso 2 queja ante la Supersalud.

#### Scenario: Paso 1 disponible
- WHEN un pendiente está vencido
- THEN se muestra el paso 1 con:
  - la opción de generar la queja ante la EPS
  - información sobre la red alterna de dispensación (desde `normas.json`)

#### Scenario: Paso 2 disponible
- WHEN el usuario registra que radicó la queja ante la EPS (con fecha y, si la tiene, número de radicado)
- THEN se habilita el paso 2 con el mensaje "Si la EPS no responde o no entrega, puedes quejarte ante la Supersalud"
- AND el sistema NO asigna una clasificación de riesgo ni promete un plazo de respuesta de la Supersalud

#### Scenario: Paso 1 completado
- WHEN el usuario registró la queja ante la EPS
- THEN la escalera se muestra como un stepper donde el paso 1 queda visible como "Completado",
  con su fecha y radicado
- AND su documento se puede volver a generar

### Requirement: Generación de texto corto
El sistema SHALL generar, para cada paso, una versión corta en texto plano para pegar en formularios web.

#### Scenario: Copiar
- WHEN el usuario toca "Copiar texto"
- THEN el texto corto se copia al portapapeles sin formato
- AND se muestra la confirmación "Texto copiado"

#### Scenario: Aviso de no asesoría en la pantalla de copiar
- WHEN el usuario está en la pantalla del texto corto
- THEN el aviso "Esta app no es asesoría legal" se muestra en la pantalla, junto al botón "Copiar texto"
- AND el texto copiado NO incluye el aviso (es la queja del usuario, se pega en un formulario)

### Requirement: Generación de PDF
El sistema SHALL generar un PDF con: datos del paciente (y de quien gestiona, si aplica),
hechos, solicitud, sección "Fundamento legal", bitácora y foto del comprobante como anexos,
y el aviso "Este documento no constituye asesoría legal".

#### Scenario: PDF sin conexión
- WHEN el usuario toca "Generar PDF" sin conexión
- THEN el PDF se genera en el dispositivo

### Requirement: Compartir
El sistema SHALL permitir compartir el PDF con las apps del dispositivo (WhatsApp, correo, etc.).

#### Scenario: Android
- WHEN el usuario toca "Compartir"
- THEN se abre el menú nativo de compartir con el PDF adjunto

#### Scenario: PWA sin soporte de compartir archivos
- WHEN el navegador no soporta compartir archivos
- THEN el PDF se descarga

### Requirement: Edición antes de generar
El sistema SHALL permitir revisar y editar los campos variables antes de generar el texto o el PDF.

#### Scenario: Corregir un dato
- WHEN el usuario cambia un dato en la vista previa
- THEN el texto corto y el PDF reflejan el cambio
- AND el texto legal de la plantilla no es editable

#### Scenario: Nota de autorización en la vista previa
- WHEN la queja del paso 1 se genera porque el usuario NO autorizó el domicilio en la farmacia
  (el texto incluye "Por medio de este escrito autorizo…")
- THEN la vista previa muestra la nota "Este texto incluye tu autorización de entrega a domicilio"
- AND la nota no aparece cuando el usuario sí autorizó en la farmacia
