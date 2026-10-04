## ADDED Requirements

### Requirement: Perfil de paciente
El sistema SHALL permitir guardar uno o más perfiles de paciente (nombre, tipo y número de
documento, EPS, teléfono, correo, dirección) y reutilizarlos en cada pendiente y documento.

#### Scenario: Gestión para un familiar
- WHEN el usuario registra un pendiente para un paciente distinto a sí mismo
- THEN debe indicar nombre, tipo y número de documento y parentesco de quien gestiona
- AND los documentos se presentan en nombre de quien gestiona, en calidad de su parentesco con el paciente

#### Scenario: Datos de quien gestiona incompletos
- WHEN el usuario activa "Lo gestiono por otra persona" y deja vacío algún dato de quien gestiona
- THEN el formulario no permite guardar y señala el campo faltante

### Requirement: Registro de pendiente
El sistema SHALL registrar un pendiente con: paciente, medicamento(s), farmacia o gestor,
hora de reclamo, número de comprobante (opcional), foto del comprobante (opcional),
dirección autorizada y si autorizó entrega a domicilio.

#### Scenario: Hora de reclamo por defecto
- WHEN el usuario registra un pendiente
- THEN la hora de reclamo se precarga con la hora actual
- AND el usuario puede corregirla si el reclamo fue antes

#### Scenario: No autorizó domicilio
- WHEN el usuario indica que no autorizó la entrega a domicilio
- THEN el sistema muestra un aviso explicando que la entrega a domicilio depende de esa autorización
- AND permite registrar el pendiente igualmente
- AND la queja del paso 1 incluye la autorización por escrito ("Por medio de este escrito autorizo…")

### Requirement: Plazo de 48 horas
El sistema SHALL calcular el vencimiento como hora de reclamo + 48 horas y mostrar el tiempo restante.

#### Scenario: Pendiente vigente
- WHEN faltan horas para el vencimiento
- THEN la tarjeta del pendiente muestra "Faltan X h" y el estado "En plazo"

#### Scenario: Pendiente vencido
- WHEN la hora actual supera el vencimiento y el pendiente no está marcado como entregado
- THEN el estado cambia a "Vencido"
- AND se habilita el paso 1 de la escalera de reclamo

### Requirement: Aviso de vencimiento
El sistema SHALL avisar al usuario cuando un pendiente se vence.

#### Scenario: Android
- WHEN se registra un pendiente en Android
- THEN se programa una notificación local para la hora de vencimiento
- AND la notificación se cancela si el pendiente se marca como entregado antes

#### Scenario: PWA
- WHEN se registra un pendiente en la PWA
- THEN se ofrece el botón "Agregar recordatorio a mi calendario"
- AND el botón descarga un archivo `.ics` con un evento a la hora de vencimiento

### Requirement: Bitácora
El sistema SHALL registrar con fecha y hora cada evento del pendiente.

#### Scenario: Eventos automáticos y manuales
- WHEN el pendiente se crea, se vence, se escala o se marca como entregado
- THEN se agrega un evento automático a la bitácora
- AND el usuario puede agregar notas manuales (ej. "Llamé a la línea, dijeron que mañana")

### Requirement: Cierre del pendiente
El sistema SHALL permitir marcar un pendiente como entregado, registrando la fecha y hora de entrega.

#### Scenario: Entrega dentro del plazo
- WHEN el usuario marca "Ya me llegó" antes del vencimiento
- THEN el pendiente queda cerrado como "Entregado a tiempo"
- AND se cancela el aviso programado
