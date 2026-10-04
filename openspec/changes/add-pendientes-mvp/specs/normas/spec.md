## ADDED Requirements

### Requirement: Catálogo de normas como datos
El sistema SHALL leer todo el contenido legal desde dos archivos de datos empaquetados con la
app: `normas.json` y las plantillas aprobadas (`plantillas.md` / `plantillas.ts`).
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

#### Scenario: Criterio de lenguaje sencillo
- WHEN se escribe o revisa el campo `resumen` de una norma
- THEN como máximo tiene 2 oraciones y 45 palabras
- AND se dirige al usuario como "usted"
- AND no usa siglas salvo "EPS"
- AND una prueba unitaria verifica estos límites

### Requirement: Fundamento legal en documentos
Cada documento generado SHALL incluir una sección "Fundamento legal" con las normas marcadas
como aplicables a ese paso en `normas.json`.

#### Scenario: Queja ante la EPS
- WHEN se genera la queja del paso 1
- THEN el fundamento legal incluye las normas cuyo campo `aplicaA` contiene "queja-eps"

### Requirement: Aviso de no asesoría legal
El sistema SHALL mostrar el aviso "Esta app no es asesoría legal" en la pantalla de inicio,
en cada tarjeta de norma y en cada documento generado (PDF y pantalla de copiar).

#### Scenario: Primera apertura
- WHEN el usuario abre la app por primera vez
- THEN ve el aviso y debe tocar "Entiendo" para continuar

#### Scenario: Después de aceptar
- WHEN el usuario toca "Entiendo"
- THEN el aviso queda como una línea fija al pie de la pantalla de inicio
- AND permanece siempre visible mientras el usuario está en la pantalla de inicio
