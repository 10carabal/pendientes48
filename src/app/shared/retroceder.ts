import type { Location } from '@angular/common';
import type { Router } from '@angular/router';

/**
 * Retroceso dentro de la app (spec `navegacion` · "Retorno con el botón de
 * Android" y botón "Volver" compartido).
 *
 * - Con historia (el usuario ya navegó): `location.back()` recorre la **misma**
 *   historia que el botón del navegador, así que `<ion-router-outlet>` re-muestra
 *   la **misma** instancia de la pantalla (el constructor no corre de nuevo) y
 *   el borrador en memoria (`@data/borrador-store`) sigue intacto: volver al
 *   formulario o a la guía no pierde lo escrito.
 * - Sin historia (se abrió la app directo en esa pantalla, `history.length <= 1`):
 *   no hay adónde "atrás", así que se navega a la raíz para que la app nunca
 *   quede en un callejón.
 *
 * Es la única forma de retroceder que usan las pantallas: la app no duplica
 * esta lógica (ver `app.ts` para el botón físico/gesto de Android).
 */
export function retroceder(location: Location, router: Router): void {
  if (window.history.length <= 1) {
    void router.navigateByUrl('/').catch(() => undefined);
    return;
  }
  location.back();
}
