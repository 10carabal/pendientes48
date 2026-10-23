## ADDED Requirements

### Requirement: Retorno visible
Toda pantalla que no es la raíz de la app SHALL mostrar un botón "Volver" visible que regresa a
la pantalla anterior dentro de la app.

#### Scenario: Pantallas sin retorno visible
- WHEN el usuario abre la pantalla de perfiles (`/pacientes`) o la guía de ventanilla (`/ventanilla`)
- THEN se muestra un botón "Volver" visible
- AND al tocarlo regresa a la pantalla anterior sin perder los datos ya guardados

### Requirement: Retroceso con el botón de Android
La app SHALL manejar el retroceso del sistema (botón físico o gesto de Android) con
`Platform.backButton` de `@ionic/angular`, sin dependencias nuevas.

#### Scenario: Dentro de la app
- WHEN el usuario usa el retroceso del sistema en una pantalla que no es la raíz
- THEN la app retrocede a la pantalla anterior dentro de la app

#### Scenario: En la raíz de la app
- WHEN el usuario usa el retroceso del sistema estando en la raíz de la app
- THEN se abre el diálogo de confirmación "¿Salir de la app?"
  con el botón sólido "Salir" y el botón secundario "Cancelar"
- AND "Salir" cierra la aplicación y "Cancelar" lo devuelve a la raíz sin salir
