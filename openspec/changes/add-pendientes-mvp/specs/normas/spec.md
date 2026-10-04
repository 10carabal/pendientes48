## ADDED Requirements

### Requirement: Catálogo de normas como datos
El sistema SHALL leer todo el contenido legal desde `normas.json`, empaquetado con la app.
Ningún componente MUST contener texto legal hardcodeado.

#### Scenario: Actualizar una norma
- WHEN cambia una norma o su explicación
- THEN basta con editar `normas.json` y su versión, sin tocar componentes

### Requirement: Norma visible en cada pendiente
El sistema SHALL mostrar en cada pendiente la tarjeta "¿Por qué tienes derecho?" con:
nombre de la norma, artículo, explicación en lenguaje sencillo, enlace a la fuente oficial
y la etiqueta "Verificado el DD/MM/AAAA".

#### Scenario: Abrir la fuente
- WHEN el usuario toca "Ver norma oficial"
- THEN se abre el enlace oficial en el navegador

#### Scenario: Sin conexión
- WHEN no hay conexión
- THEN la tarjeta se muestra completa y solo el enlace queda inactivo

### Requirement: Fundamento legal en documentos
Cada documento generado SHALL incluir una sección "Fundamento legal" con las normas marcadas
como aplicables a ese paso en `normas.json`.

#### Scenario: Queja ante la EPS
- WHEN se genera la queja del paso 1
- THEN el fundamento legal incluye las normas cuyo campo `aplicaA` contiene "queja-eps"

### Requirement: Aviso de no asesoría legal
El sistema SHALL mostrar el aviso "Esta app no es asesoría legal" en la pantalla de inicio,
en cada tarjeta de norma y en cada documento generado.

#### Scenario: Primera apertura
- WHEN el usuario abre la app por primera vez
- THEN ve el aviso y debe tocar "Entiendo" para continuar
