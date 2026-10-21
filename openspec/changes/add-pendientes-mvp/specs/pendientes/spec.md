## ADDED Requirements

### Requirement: Perfil de paciente
El sistema SHALL permitir guardar uno o más perfiles de paciente (nombre, tipo y número de
documento, EPS, teléfono, correo, dirección) y reutilizarlos en cada pendiente y documento.

#### Scenario: Crear y editar un perfil
- WHEN el usuario crea un perfil o edita uno existente
- THEN se guardan nombre, tipo y número de documento, EPS, teléfono, correo y dirección
- AND el perfil queda disponible para reutilizarlo en nuevos pendientes

#### Scenario: Elegir un perfil existente al registrar un pendiente
- WHEN el usuario selecciona un paciente ya guardado en el formulario del pendiente
- THEN los datos del perfil se cargan, incluida la dirección de entrega precargada
- AND el usuario puede corregir cualquier campo antes de guardar

#### Scenario: Perfil duplicado
- WHEN el usuario guarda un perfil con el mismo tipo y número de documento que uno existente
- THEN la app ofrece usar el perfil existente en lugar de crear otro

#### Scenario: Gestión para un familiar
- WHEN el usuario registra un pendiente para un paciente distinto a sí mismo
- THEN debe indicar nombre, tipo y número de documento y parentesco de quien gestiona
- AND los documentos se presentan en nombre de quien gestiona, en calidad de su parentesco con el paciente

#### Scenario: Datos de quien gestiona incompletos
- WHEN el usuario activa "Lo gestiono por otra persona" y deja vacío algún dato de quien gestiona
- THEN el formulario no permite guardar y señala el campo faltante

#### Scenario: Borrar todos mis datos
- WHEN el usuario toca "Borrar todos mis datos" al final de la pantalla de perfiles
- THEN la app pide doble confirmación
- AND al confirmar se borran perfiles, pendientes, fotos y bitácoras del dispositivo
- AND se cancelan todos los avisos programados

### Requirement: Registro de pendiente
El sistema SHALL registrar un pendiente con: paciente, medicamento(s), farmacia o gestor,
hora de reclamo, número de comprobante (opcional), foto del comprobante (opcional),
dirección de entrega (obligatoria, precargada desde el perfil del paciente)
y si autorizó entrega a domicilio.

#### Scenario: Hora de reclamo por defecto
- WHEN el usuario registra un pendiente
- THEN la hora de reclamo se precarga con la hora actual
- AND el usuario puede corregirla si el reclamo fue antes

#### Scenario: Hora de reclamo futura
- WHEN el usuario intenta guardar una hora de reclamo posterior a la hora actual
- THEN el formulario no permite guardar y señala el campo
- AND la validación la hace una función pura testeable

#### Scenario: Dirección de entrega obligatoria
- WHEN la dirección de entrega está vacía
- THEN el formulario no permite guardar y señala el campo

#### Scenario: No autorizó domicilio
- WHEN el usuario indica que no autorizó la entrega a domicilio
- THEN el sistema muestra un aviso explicando que la entrega a domicilio depende de esa autorización
- AND permite registrar el pendiente igualmente (la dirección de entrega es obligatoria en todos los casos)
- AND la queja del paso 1 incluye la autorización por escrito ("Por medio de este escrito autorizo…")

#### Scenario: Fallo al guardar
- WHEN la escritura en el almacenamiento local falla
- THEN se muestra "No se pudo guardar. Libera espacio e intenta de nuevo"
- AND el formulario conserva todo lo que el usuario escribió

### Requirement: Plazo de 48 horas
El sistema SHALL calcular el vencimiento como hora de reclamo + 48 horas y mostrar el tiempo restante.

#### Scenario: Pendiente vigente (1 h o más)
- WHEN faltan 1 hora o más para el vencimiento
- THEN la tarjeta del pendiente muestra "Faltan X h" (o "Faltan X h Y min" si quedan minutos)
  y el estado "En plazo"

#### Scenario: Menos de 1 hora
- WHEN faltan menos de 60 minutos para el vencimiento
- THEN la tarjeta muestra "Faltan X min" y el estado "En plazo"

#### Scenario: Pendiente vencido
- WHEN la hora actual supera el vencimiento y el pendiente no está marcado como entregado
- THEN el estado cambia a "Vencido"
- AND el contador muestra "Vencido hace X h" (o "Vencido hace X h Y min" si quedan minutos,
  "Vencido hace X min" si hace menos de 1 h, o "Vencido hace X días" si pasaron 48 h o más desde
  el vencimiento)
- AND se habilita el paso 1 de la escalera de reclamo

### Requirement: Aviso de vencimiento
El sistema SHALL avisar al usuario cuando un pendiente se vence.

#### Scenario: Android
- WHEN se registra un pendiente en Android
- THEN se programa una notificación local para la hora de vencimiento
- AND la notificación se cancela si el pendiente se marca como entregado antes

#### Scenario: Primera ayuda de avisos en Android
- WHEN el usuario registra su primer pendiente en Android
- THEN aparece la hoja "¿Cómo asegurar que te llegue el aviso?" con el enlace a dontkillmyapp.com

#### Scenario: Permiso de notificaciones denegado
- WHEN en Android el permiso de notificaciones está denegado
- THEN se muestra un aviso con dos opciones: "Activar notificaciones" o "Agregar a mi calendario"
- AND la opción de calendario descarga el mismo `.ics` de la PWA

#### Scenario: PWA
- WHEN se registra un pendiente en la PWA
- THEN se ofrece el botón "Agregar recordatorio a mi calendario"
- AND el botón descarga un archivo `.ics` con un evento a la hora de vencimiento

#### Scenario: Recordatorio ya agregado
- WHEN el usuario vuelve a tocar "Agregar recordatorio a mi calendario"
- THEN la app avisa "Ya agregaste este recordatorio el…" con la fecha de la descarga anterior
- AND el `.ics` lleva un UID fijo por pendiente (el duplicado depende del calendario que use el usuario)

#### Scenario: Reprogramación al abrir la app
- WHEN el usuario abre la app
- THEN se reprograman los avisos de todos los pendientes abiertos

### Requirement: Bitácora
El sistema SHALL registrar con fecha y hora cada evento del pendiente.

#### Scenario: Eventos automáticos y manuales
- WHEN el pendiente se crea, se escala o se marca como entregado
- THEN se agrega un evento automático a la bitácora con fecha y hora
- AND el usuario puede agregar notas manuales (ej. "Llamé a la línea, dijeron que mañana")

#### Scenario: Evento "Venció el plazo" derivado
- WHEN el vencimiento ya pasó y el pendiente no se entregó antes del vencimiento
- THEN el evento "Venció el plazo" aparece en la bitácora con la hora del vencimiento
- AND se calcula al consultar (igual que el estado), sin requerir que la app esté abierta a esa hora

#### Scenario: Registrar de nuevo una queja
- WHEN el usuario registra de nuevo una queja ya registrada
- THEN se reemplazan la fecha y el radicado del evento existente en la bitácora
- AND no se crea un evento nuevo

### Requirement: Cierre del pendiente
El sistema SHALL permitir marcar un pendiente como entregado, registrando la fecha y hora de entrega.

#### Scenario: Entrega dentro del plazo
- WHEN el usuario marca "Ya me llegó" antes del vencimiento
- THEN el pendiente queda cerrado como "Entregado a tiempo"
- AND se cancela el aviso programado

#### Scenario: Entrega fuera del plazo
- WHEN el usuario marca "Ya me llegó" después del vencimiento
- THEN el pendiente queda cerrado como "Entregado tarde"
- AND se conserva la bitácora completa

### Requirement: Edición y borrado del pendiente
El sistema SHALL permitir editar y borrar un pendiente registrado.

#### Scenario: Editar un pendiente
- WHEN el usuario edita un pendiente
- THEN los cambios se guardan y el aviso de vencimiento se reprograma
- AND si ya hay una queja registrada, la hora de reclamo queda bloqueada
  para no contradecir un documento ya radicado

#### Scenario: Borrar un pendiente
- WHEN el usuario pide borrar un pendiente
- THEN la app pide confirmación
- AND al confirmar se cancela el aviso programado, se elimina la foto del comprobante y se borra el pendiente
