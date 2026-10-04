## ADDED Requirements

### Requirement: Guía de ventanilla
El sistema SHALL mostrar una guía de pasos para el momento en que la farmacia informa que un
medicamento queda pendiente, accesible desde la pantalla principal con un solo toque.

#### Scenario: El usuario está en la farmacia
- WHEN el usuario toca "Me dejaron un pendiente"
- THEN se muestra la guía con estos pasos, en orden:
  1. Pida el comprobante del pendiente con fecha y hora.
  2. Autorice la entrega a domicilio y dé su dirección.
  3. Tome una foto del comprobante.
- AND al final se ofrece el botón "Registrar este pendiente"

#### Scenario: Paso de autorización a domicilio
- WHEN el usuario ve el paso 2
- THEN se muestra la norma que lo respalda (desde `normas.json`) con su explicación en lenguaje sencillo
- AND se explica que la entrega a domicilio aplica si el afiliado la autoriza

#### Scenario: Paso de la foto con tres salidas
- WHEN el usuario ve el paso 3
- THEN puede tomar una foto, elegir una de la galería o elegir "anote el número del comprobante"
- AND cualquiera de las tres opciones permite continuar con la guía
  (la foto es opcional, así que ninguna es bloqueante)

### Requirement: Guía sin conexión
La guía SHALL funcionar sin conexión a internet.

#### Scenario: Farmacia sin señal
- WHEN el dispositivo no tiene conexión
- THEN la guía y la tarjeta de la norma se muestran completas
