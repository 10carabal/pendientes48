import { TestBed } from '@angular/core/testing';
import type { EstadoPendiente } from '@domain/pendiente/pendiente.model';
import { EstadoChip } from './estado-chip';

const ETIQUETAS: Record<EstadoPendiente, string> = {
  'en-plazo': 'En plazo',
  vencido: 'Vencido',
  'escalado-eps': 'Queja ante EPS',
  'escalado-supersalud': 'Queja ante Supersalud',
  'entregado-a-tiempo': 'Entregado a tiempo',
  'entregado-tarde': 'Entregado tarde',
};

describe('EstadoChip', () => {
  function crear(estado: EstadoPendiente) {
    const fixture = TestBed.createComponent(EstadoChip);
    fixture.componentRef.setInput('estado', estado);
    fixture.detectChanges();
    return fixture;
  }

  it('se crea', () => {
    expect(TestBed.createComponent(EstadoChip).componentInstance).toBeTruthy();
  });

  it('muestra la etiqueta y el color de los 6 estados', () => {
    const estados = Object.keys(ETIQUETAS) as EstadoPendiente[];
    expect(estados).toHaveLength(6);

    for (const estado of estados) {
      const fixture = crear(estado);
      const nodo: HTMLElement = fixture.nativeElement.querySelector('span');

      expect(nodo.textContent?.trim()).toBe(ETIQUETAS[estado]);
      expect(nodo.className).toContain('p48-etiqueta-estado');
      expect(nodo.className).toContain(`p48-etiqueta-estado--${estado}`);

      fixture.destroy();
    }
  });
});
