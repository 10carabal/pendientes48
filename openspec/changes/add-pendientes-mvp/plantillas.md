# Plantillas de reclamo

Estado: **Paso 1 ✅ aprobado** · **Paso 2 ✅ aprobado** (2026-10-04)

Variables entre `{{ }}`. Las indicaciones entre `[ ]` son condiciones que resuelve la función
de plantilla; no aparecen en el texto final. El texto fijo no se edita en la app.

> Recomendación: pide a un abogado o a un consultorio jurídico universitario que revise esta
> redacción antes de publicar. No cambia el desarrollo, pero sí la confianza del producto.

## Reglas comunes a todas las plantillas

- **Hechos en forma impersonal** ("se reclamó", "se autorizó"): sirven igual si presenta la
  queja el paciente o alguien que gestiona por él. Solo la introducción cambia.
- **Singular/plural** según la cantidad de medicamentos: "el medicamento X" / "los medicamentos X, Y".
- **Documento:** se escribe "con {{tipo}} n.° {{número}}" (sin "identificado(a)").
- **Fechas** en formato largo: "4 de octubre de 2026"; horas en formato 12 h: "3:15 p. m."
- **Campos opcionales** (comprobante, correo, radicado): si están vacíos, su frase o paréntesis desaparece completo.
- **Dirección:** `{{direccionEntrega}}` es obligatoria en todos los casos (autorizó o no); el
  texto final nunca queda con la dirección vacía. Cuando el usuario no autorizó en la farmacia,
  la vista previa de la app muestra la nota "Este texto incluye tu autorización de entrega a
  domicilio".

## Introducciones

La introducción se arma como `{{presentante}}, presento queja {{objeto}} por no entrega de medicamento pendiente.`

**`{{presentante}}` — si presenta el paciente**
```
Yo, {{pacienteNombre}}, con {{tipoDocumento}} n.° {{numeroDocumento}}, afiliado a {{eps}}
```

**`{{presentante}}` — si alguien gestiona por el paciente**
```
Yo, {{gestion.nombre}}, con {{gestion.tipoDocumento}} n.° {{gestion.numeroDocumento}}, en calidad de {{gestion.parentesco}} de {{pacienteNombre}} ({{tipoDocumento}} n.° {{numeroDocumento}}, afiliado a {{eps}})
```

**`{{objeto}}`**
- Paso 1: vacío → "presento queja por no entrega…"
- Paso 2: `contra {{eps}}` → "presento queja contra {{eps}} por no entrega…"

---

## Paso 1 — Queja ante la EPS ✅

```
Señores {{eps}}:

{{introduccion}}

Hechos:
1. El {{fechaReclamo}} a las {{horaReclamo}} se reclamó en {{farmacia}} {{articuloMedicamentos}} {{medicamentos}}, ordenado por el médico tratante.
2. La farmacia no realizó la entrega completa y quedó pendiente[ si hay comprobante: (comprobante n.° {{numeroComprobante}})].
3. [Si autorizó en la farmacia] Se autorizó la entrega a domicilio en {{direccionEntrega}}.
   [Si no autorizó] Por medio de este escrito autorizo la entrega a domicilio en {{direccionEntrega}}.
4. El plazo de 48 horas venció el {{fechaVencimiento}} a las {{horaVencimiento}} y a la fecha no se ha recibido el medicamento.

Con fundamento en el artículo 131 del Decreto-Ley 019 de 2012, la Resolución 1604 de 2013 y la Circular Externa 017 de 2026 del Ministerio de Salud y Protección Social, solicito:
1. La entrega inmediata del medicamento en la dirección indicada o, en su defecto, la indicación de un punto de la red alterna de dispensación donde pueda reclamarlo.
2. Indicar el número de radicado de esta queja y responder por escrito.

Contacto: {{telefono}}[ si hay correo: – {{correo}}]
```

---

## Paso 2 — Queja ante la Supersalud ✅

Requiere que el pendiente tenga `quejaEps` registrada.

```
Señores Superintendencia Nacional de Salud:

{{introduccion}}

Hechos:
1. El {{fechaReclamo}} a las {{horaReclamo}} se reclamó en {{farmacia}} {{articuloMedicamentos}} {{medicamentos}}, ordenado por el médico tratante.
2. La farmacia no realizó la entrega completa y quedó pendiente[ si hay comprobante: (comprobante n.° {{numeroComprobante}})].
3. [Si autorizó en la farmacia] Se autorizó la entrega a domicilio en {{direccionEntrega}}.
   [Si no autorizó] En la queja presentada ante {{eps}} se autorizó por escrito la entrega a domicilio en {{direccionEntrega}}.
4. El plazo de 48 horas venció el {{fechaVencimiento}} a las {{horaVencimiento}}.
5. El {{fechaQuejaEps}} se presentó queja ante {{eps}}[ si hay radicado: con radicado n.° {{radicadoEps}}] y a la fecha no se ha recibido el medicamento.

Con fundamento en el artículo 131 del Decreto-Ley 019 de 2012, la Resolución 1604 de 2013 y la Circular Externa 017 de 2026 del Ministerio de Salud y Protección Social, solicito:
1. Ordenar a {{eps}} la entrega inmediata del medicamento en la dirección indicada.
2. Indicar el número de radicado de esta queja.

Contacto: {{telefono}}[ si hay correo: – {{correo}}]
```

**Decisión registrada:** el hecho 5 no menciona si la EPS respondió. La app no registra esa
respuesta en el MVP y el hecho relevante es que el medicamento no llegó.

---

## Estructura del PDF (ambos pasos)

1. **Encabezado:** ciudad y fecha de generación; destinatario (EPS o Superintendencia Nacional de Salud).
2. **Asunto:** "Queja por no entrega de medicamento pendiente".
3. **Datos del paciente** (y de quien gestiona, si aplica: nombre, documento y parentesco).
4. **Introducción y hechos:** mismo contenido del texto corto, con los hechos numerados.
5. **Solicitud.**
6. **Fundamento legal:** una entrada por norma aplicable, con nombre, artículo y resumen desde `normas.json`.
7. **Anexo 1 — Bitácora:** tabla fecha/hora + evento.
8. **Anexo 2 — Foto del comprobante** (si existe).
9. **Pie de página en todas las hojas:** "Documento generado con Pendientes48. No constituye asesoría legal."
10. **Espacio para firma** de quien presenta la queja.

## Casos de prueba mínimos para `plantillas.spec.ts`

| # | Paso | Presenta | Autorizó en farmacia | Comprobante | Radicado EPS | Medicamentos |
|---|---|---|---|---|---|---|
| 1 | 1 | Paciente | Sí | Sí | — | 1 |
| 2 | 1 | Gestor | No | No | — | 2 |
| 3 | 2 | Paciente | No | Sí | Sí | 1 |
| 4 | 2 | Gestor | Sí | No | No | 3 |
