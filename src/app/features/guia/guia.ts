import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { NORMAS } from '@data/normas-catalogo';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { EstadoPendiente } from '@domain/pendiente/pendiente.model';
import { AvisoLegal } from '@shared/aviso-legal/aviso-legal';
import { AyudaAvisos } from '@shared/ayuda-avisos/ayuda-avisos';
import { BotonVolver } from '@shared/boton-volver/boton-volver';
import { ComoFunciona } from '@shared/como-funciona/como-funciona';
import { EstadoChip } from '@shared/estado-chip/estado-chip';
import { NormaCard } from '@shared/norma-card/norma-card';
import { SalidaApp } from '@shared/salida-app/salida-app';

/**
 * Guía de estilo (/guia): muestra todos los tokens --p48-* y los 7 patrones.
 * Registrada solo en desarrollo (ver app.routes.ts); en producción no existe.
 */
@Component({
  selector: 'app-guia',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    EstadoChip,
    NormaCard,
    AvisoLegal,
    AyudaAvisos,
    BotonVolver,
    ComoFunciona,
    SalidaApp,
  ],
  templateUrl: './guia.html',
  styleUrl: './guia.scss',
})
export class Guia {
  private readonly router = inject(Router);

  readonly avisoLegal = AVISO_NO_ASESORIA;
  readonly normaMuestra = NORMAS[0];
  readonly avisoModal = signal(false);
  readonly ayudaVisible = signal(false);
  readonly comoFuncionaHoja = signal(false);
  /** Demo de `SalidaApp`: en la galería solo cierra (el cierre real vive en `app.ts`). */
  readonly salidaDemo = signal(false);

  /**
   * El enlace del pie de la hoja navega de verdad a la guía (3.3): en la
   * galería el componente emite sin navegar, así que el enlace no queda muerto.
   */
  irAGuia(): void {
    void this.router.navigateByUrl('/ventanilla').catch(() => undefined);
  }

  readonly colores = [
    { token: '--p48-fondo', valor: 'var(--p48-fondo)', uso: 'Fondo de pantalla' },
    {
      token: '--p48-superficie',
      valor: 'var(--p48-superficie)',
      uso: 'Agrupar contenido, en lugar de bordes',
    },
    { token: '--p48-texto', valor: 'var(--p48-texto)', uso: 'Texto principal' },
    {
      token: '--p48-texto-secundario',
      valor: 'var(--p48-texto-secundario)',
      uso: 'Texto secundario (6,5:1)',
    },
    { token: '--p48-borde-campo', valor: 'var(--p48-borde-campo)', uso: 'Borde de campos (3,3:1)' },
    { token: '--p48-enlace', valor: 'var(--p48-enlace)', uso: 'Enlaces y botones terciarios' },
    { token: '--p48-accion', valor: 'var(--p48-accion)', uso: 'Botón principal, texto blanco' },
    {
      token: '--p48-destructivo',
      valor: 'var(--p48-destructivo)',
      uso: 'Botón destructivo',
    },
    {
      token: '--p48-scrim',
      valor: 'var(--p48-scrim)',
      uso: 'Fondo atenuado bajo diálogos',
    },
  ];

  readonly estados: ReadonlyArray<{
    clave: EstadoPendiente;
    etiqueta: string;
    fondo: string;
    texto: string;
  }> = [
    {
      clave: 'en-plazo',
      etiqueta: 'En plazo',
      fondo: 'var(--p48-estado-en-plazo-fondo)',
      texto: 'var(--p48-estado-en-plazo-texto)',
    },
    {
      clave: 'vencido',
      etiqueta: 'Vencido',
      fondo: 'var(--p48-estado-vencido-fondo)',
      texto: 'var(--p48-estado-vencido-texto)',
    },
    {
      clave: 'escalado-eps',
      etiqueta: 'Queja ante EPS',
      fondo: 'var(--p48-estado-escalado-eps-fondo)',
      texto: 'var(--p48-estado-escalado-eps-texto)',
    },
    {
      clave: 'escalado-supersalud',
      etiqueta: 'Queja ante Supersalud',
      fondo: 'var(--p48-estado-escalado-supersalud-fondo)',
      texto: 'var(--p48-estado-escalado-supersalud-texto)',
    },
    {
      clave: 'entregado-a-tiempo',
      etiqueta: 'Entregado a tiempo',
      fondo: 'var(--p48-estado-entregado-a-tiempo-fondo)',
      texto: 'var(--p48-estado-entregado-a-tiempo-texto)',
    },
    {
      clave: 'entregado-tarde',
      etiqueta: 'Entregado tarde',
      fondo: 'var(--p48-estado-entregado-tarde-fondo)',
      texto: 'var(--p48-estado-entregado-tarde-texto)',
    },
  ];

  readonly acentos = [
    { token: '--p48-acento-norma', valor: 'var(--p48-acento-norma)', uso: 'Tarjeta de la norma' },
    {
      token: '--p48-acento-alerta',
      valor: 'var(--p48-acento-alerta)',
      uso: 'Alerta de vencimiento',
    },
    { token: '--p48-acento-permiso', valor: 'var(--p48-acento-permiso)', uso: 'Aviso de permiso' },
    { token: '--p48-acento-aviso', valor: 'var(--p48-acento-aviso)', uso: 'Aviso legal' },
  ];

  readonly espacios = [
    { token: '--p48-espacio-1', valor: 'var(--p48-espacio-1)', px: '4 px' },
    { token: '--p48-espacio-2', valor: 'var(--p48-espacio-2)', px: '8 px' },
    { token: '--p48-espacio-3', valor: 'var(--p48-espacio-3)', px: '12 px' },
    { token: '--p48-espacio-4', valor: 'var(--p48-espacio-4)', px: '16 px' },
    { token: '--p48-espacio-5', valor: 'var(--p48-espacio-5)', px: '24 px' },
    { token: '--p48-espacio-6', valor: 'var(--p48-espacio-6)', px: '32 px' },
  ];

  readonly radios = [
    {
      token: '--p48-radio-superficie',
      valor: 'var(--p48-radio-superficie)',
      px: '12 px',
      uso: 'superficies y botones',
    },
    { token: '--p48-radio-campo', valor: 'var(--p48-radio-campo)', px: '10 px', uso: 'campos' },
    {
      token: '--p48-radio-etiqueta',
      valor: 'var(--p48-radio-etiqueta)',
      px: '999 px',
      uso: 'etiquetas',
    },
  ];

  readonly barras = [
    { nombre: 'norma', modificador: '', uso: 'tarjeta de la norma' },
    { nombre: 'alerta', modificador: ' p48-barra-acento--alerta', uso: 'alerta de vencimiento' },
    { nombre: 'permiso', modificador: ' p48-barra-acento--permiso', uso: 'aviso de permiso' },
    { nombre: 'aviso', modificador: ' p48-barra-acento--aviso', uso: 'aviso legal' },
  ];
}
