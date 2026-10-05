import { Component } from '@angular/core';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Guía de estilo (/guia): muestra todos los tokens --p48-* y los 7 patrones.
 * Registrada solo en desarrollo (ver app.routes.ts); en producción no existe.
 */
@Component({
  selector: 'app-guia',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Guía de estilo</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- ion-content ya es el landmark main: aquí no va otro <main>. -->
      <div class="guia">
        <h1>Guía de estilo</h1>
        <p class="guia-parrafo">
          Todos los valores visuales viven en <code>src/theme/tokens.css</code> (tokens
          <code>--p48-*</code>) y en <code>src/theme/patrones.scss</code> (los 7 patrones).
          Esta ruta existe solo en desarrollo.
        </p>

        <section class="guia-seccion">
          <h2>Tipografía</h2>
          <p class="guia-parrafo">
            Fuente del sistema, sin fuentes externas. Tres tamaños, nada por debajo de 18 px,
            interlineado 1,5 y peso 600 en títulos.
          </p>
          <p class="guia-muestra guia-muestra--titulo">Título · --p48-tam-titulo (24 px)</p>
          <p class="guia-muestra guia-muestra--subtitulo">Subtítulo · --p48-tam-subtitulo (20 px)</p>
          <p class="guia-muestra">Texto base · --p48-tam-base (18 px)</p>
        </section>

        <section class="guia-seccion">
          <h2>Color</h2>
          <h3>Superficies y texto</h3>
          <ul class="guia-lista">
            @for (c of colores; track c.token) {
              <li class="guia-fila">
                <span class="guia-muestra-color" [style.background]="c.valor"></span>
                <span><code>{{ c.token }}</code> — {{ c.uso }}</span>
              </li>
            }
          </ul>

          <h3>Estados</h3>
          <p class="guia-parrafo">
            Fondo suave + texto oscuro del mismo tono. Los dos estados de queja comparten tono
            porque significan lo mismo; la etiqueta dice ante quién.
          </p>
          <ul class="guia-lista">
            @for (e of estados; track e.clave) {
              <li class="guia-fila">
                <span class="guia-muestra-color" [style.background]="e.fondo"></span>
                <span class="guia-muestra-color" [style.background]="e.texto"></span>
                <span>
                  <strong>{{ e.etiqueta }}</strong> —
                  <code>--p48-estado-{{ e.clave }}-fondo / -texto</code>
                </span>
              </li>
            }
          </ul>

          <h3>Acentos (barra lateral de 4 px)</h3>
          <ul class="guia-lista">
            @for (a of acentos; track a.token) {
              <li class="guia-fila">
                <span class="guia-muestra-color guia-muestra-color--barra" [style.background]="a.valor"></span>
                <span><code>{{ a.token }}</code> — {{ a.uso }}</span>
              </li>
            }
          </ul>
        </section>

        <section class="guia-seccion">
          <h2>Espaciado</h2>
          <ul class="guia-lista">
            @for (e of espacios; track e.token) {
              <li class="guia-fila">
                <span class="guia-barra-espacio" [style.width]="e.valor"></span>
                <span><code>{{ e.token }}</code> — {{ e.px }}</span>
              </li>
            }
          </ul>
        </section>

        <section class="guia-seccion">
          <h2>Esquinas</h2>
          <ul class="guia-lista">
            @for (r of radios; track r.token) {
              <li class="guia-fila">
                <span class="guia-muestra-radio" [style.border-radius]="r.valor"></span>
                <span><code>{{ r.token }}</code> — {{ r.px }} · {{ r.uso }}</span>
              </li>
            }
          </ul>
        </section>

        <section class="guia-seccion">
          <h2>Área táctil</h2>
          <ul class="guia-lista">
            <li class="guia-fila">
              <span class="guia-muestra-tactil"></span>
              <span><code>--p48-tam-tactil</code> — mínimo 48 × 48 px en todo lo que se toca</span>
            </li>
            <li class="guia-fila">
              <span class="guia-muestra-boton"></span>
              <span><code>--p48-tam-boton</code> — 56 px de alto en principal y secundario</span>
            </li>
          </ul>
        </section>

        <section class="guia-seccion">
          <h2>Patrones</h2>

          <h3>1 · Tres niveles de botón</h3>
          <p class="guia-parrafo">
            Principal sólido: <strong>uno por pantalla</strong>. Secundario con contorno.
            Terciario como enlace (el destructivo también es terciario).
          </p>
          <div class="guia-fila">
            <button type="button" class="p48-boton-principal">Principal</button>
            <button type="button" class="p48-boton-secundario">Secundario</button>
            <button type="button" class="p48-boton-terciario">Terciario</button>
            <button type="button" class="p48-boton-terciario p48-boton-terciario--destructivo">
              Destructivo
            </button>
          </div>
          <div class="p48-superficie guia-confirmacion">
            <p class="guia-parrafo">Único lugar con rojo sólido: una confirmación.</p>
            <div class="guia-fila">
              <button type="button" class="p48-boton-principal p48-boton-principal--destructivo">
                Borrar
              </button>
              <button type="button" class="p48-boton-secundario">Cancelar</button>
            </div>
          </div>

          <h3>2 · Barra de acento lateral</h3>
          <ul class="guia-lista">
            @for (b of barras; track b.nombre) {
              <li [class]="'guia-tarjeta-acento p48-barra-acento' + b.modificador">
                <strong>{{ b.nombre }}</strong> — {{ b.uso }}
              </li>
            }
          </ul>

          <h3>3 · Ícono en círculo</h3>
          <div class="guia-fila">
            <span class="p48-icono-circulo">
              <ion-icon name="checkmark-circle" aria-hidden="true" />
            </span>
            <span class="guia-parrafo">
              Ícono de línea de 18–20 px dentro de un círculo de 36–44 px, siempre con texto o
              aria-label.
            </span>
          </div>

          <h3>4 · Superficie</h3>
          <div class="p48-superficie">
            <p class="guia-parrafo">
              Agrupar con fondo <code>--p48-superficie</code> y espacio; sin bordes.
            </p>
          </div>

          <h3>5 · Etiquetas de estado</h3>
          <div class="guia-fila">
            @for (e of estados; track e.clave) {
              <span [class]="'p48-etiqueta-estado p48-etiqueta-estado--' + e.clave">
                {{ e.etiqueta }}
              </span>
            }
          </div>
          <p class="guia-parrafo">El color nunca va solo: la etiqueta de texto siempre acompaña.</p>

          <h3>6 · Campo con borde</h3>
          <label class="guia-parrafo" for="guia-campo">Campo de ejemplo</label>
          <input id="guia-campo" class="p48-campo" type="text" />

          <h3>7 · Sombra flotante</h3>
          <div class="p48-superficie p48-sombra-flotante">
            <p class="guia-parrafo">
              Solo superficies flotantes: botón principal al pie, hojas y modales.
            </p>
          </div>
        </section>

        <section class="guia-seccion">
          <h2>Reglas</h2>
          <ul class="guia-parrafo guia-reglas">
            <li>Un solo botón principal sólido por pantalla.</li>
            <li>Ningún texto por debajo de 18 px.</li>
            <li>El color nunca va solo: siempre con etiqueta de texto.</li>
            <li>Todo texto cumple 4,5:1 de contraste; los bordes de campo, 3:1.</li>
            <li>Área táctil mínima de 48 × 48 px.</li>
          </ul>
        </section>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .guia {
        display: flex;
        flex-direction: column;
        gap: var(--p48-espacio-6);
        max-width: var(--p48-ancho-inicio);
        margin: 0 auto;
        padding: var(--p48-espacio-5) var(--p48-espacio-4) var(--p48-espacio-6);
      }

      .guia h1 {
        font-size: var(--p48-tam-titulo);
        margin: 0;
      }

      .guia h2 {
        font-size: var(--p48-tam-subtitulo);
        margin: 0;
      }

      .guia h3 {
        font-size: var(--p48-tam-base);
        margin: 0;
      }

      .guia-seccion {
        display: flex;
        flex-direction: column;
        gap: var(--p48-espacio-3);
      }

      .guia-parrafo {
        margin: 0;
      }

      .guia-lista {
        display: flex;
        flex-direction: column;
        gap: var(--p48-espacio-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .guia-fila {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--p48-espacio-3);
      }

      .guia-muestra-color {
        flex: none;
        width: var(--p48-espacio-6);
        height: var(--p48-espacio-6);
        border: 1px solid var(--p48-borde-campo);
        border-radius: var(--p48-radio-campo);
      }

      .guia-muestra-color--barra {
        width: var(--p48-ancho-acento);
      }

      .guia-barra-espacio {
        flex: none;
        height: var(--p48-espacio-2);
        border-radius: var(--p48-radio-etiqueta);
        background: var(--p48-acento-norma);
      }

      .guia-muestra-radio {
        flex: none;
        width: var(--p48-espacio-6);
        height: var(--p48-espacio-6);
        background: var(--p48-superficie);
        border: 1px solid var(--p48-borde-campo);
      }

      .guia-muestra-tactil {
        flex: none;
        width: var(--p48-tam-tactil);
        height: var(--p48-tam-tactil);
        background: var(--p48-superficie);
        border: 1px solid var(--p48-borde-campo);
        border-radius: var(--p48-radio-campo);
      }

      .guia-muestra-boton {
        flex: none;
        width: var(--p48-espacio-6);
        height: var(--p48-tam-boton);
        background: var(--p48-superficie);
        border: 1px solid var(--p48-borde-campo);
        border-radius: var(--p48-radio-superficie);
      }

      .guia-tarjeta-acento {
        background: var(--p48-superficie);
        border-radius: var(--p48-radio-superficie);
        padding: var(--p48-espacio-3) var(--p48-espacio-4);
      }

      .guia-confirmacion {
        display: flex;
        flex-direction: column;
        gap: var(--p48-espacio-3);
      }

      .guia-reglas {
        display: flex;
        flex-direction: column;
        gap: var(--p48-espacio-2);
        padding-left: var(--p48-espacio-5);
      }
    `,
  ],
})
export class Guia {
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
    { token: '--p48-destructivo', valor: 'var(--p48-destructivo)', uso: 'Botón destructivo' },
  ];

  readonly estados = [
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
