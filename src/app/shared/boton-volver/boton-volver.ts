import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { retroceder } from '../retroceder';

/**
 * Botón "Volver" visible (spec `navegacion` · "Retorno visible"): retorno
 * explícito en `/pacientes` y `/ventanilla`, las dos pantallas que no tenían
 * forma de volver (tarea 5.2, decisión D3).
 *
 * Sin inputs ni outputs: el retroceso es siempre "a la pantalla anterior dentro
 * de la app" (`shared/retroceder.ts`). Es secundario para no competir con el
 * botón principal de cada pantalla (un sólido por pantalla).
 */
@Component({
  selector: 'app-boton-volver',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boton-volver.html',
  styleUrl: './boton-volver.scss',
})
export class BotonVolver {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  volver(): void {
    retroceder(this.location, this.router);
  }
}
