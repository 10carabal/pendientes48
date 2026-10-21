import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { Escalera, type RegistroQueja } from './escalera';

/** Hace cuánto (en horas) ocurrió algo, en ISO. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(49), // vencido hace 1 h
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [],
    ...sobrescribe,
  };
}

function crear(p: Pendiente): ComponentFixture<Escalera> {
  const fixture = TestBed.createComponent(Escalera);
  fixture.componentRef.setInput('pendiente', p);
  fixture.componentRef.setInput('ahora', new Date());
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function escribir(el: HTMLElement, etiqueta: string, valor: string): void {
  const etiquetaEl = [...el.querySelectorAll('label')].find((l) =>
    l.textContent?.includes(etiqueta),
  );
  const campo = etiquetaEl?.querySelector('input') as HTMLInputElement | null;
  expect(campo, `campo "${etiqueta}"`).toBeTruthy();
  campo!.value = valor;
  campo!.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Escalera', () => {
  it('en plazo se oculta y explica cuándo se habilita', () => {
    const el = crear(pendiente({ horaReclamo: hace(46.5) })).nativeElement as HTMLElement;

    expect(el.querySelector('.escalera-pasos')).toBeNull();
    expect(el.textContent).toContain('La escalera de reclamo se habilita cuando venzan las 48 horas');
  });

  it('un pendiente entregado también deja la escalera oculta', () => {
    const el = crear(pendiente({ entregadoEn: hace(2) })).nativeElement as HTMLElement;

    expect(el.querySelector('.escalera-pasos')).toBeNull();
    expect(el.textContent).toContain('La escalera de reclamo se habilita');
  });

  it('vencido: paso 1 con la norma de red alterna y paso 2 deshabilitado', () => {
    const el = crear(pendiente()).nativeElement as HTMLElement;

    expect(el.textContent).toContain('Queja ante la EPS');
    expect(boton(el, 'Registrar queja ante la EPS')).toBeTruthy();
    // Red alterna desde normas.json, con el aviso de no asesoría por input (D6).
    expect(el.textContent).toContain('Circular Externa 017 de 2026 del Ministerio de Salud');
    expect(el.querySelector('.norma-aviso')?.textContent?.trim()).toBe(AVISO_NO_ASESORIA);

    // Literal aprobado del paso 2 inactivo (el gris nunca va solo).
    expect(el.textContent).toContain('Se habilita cuando registre la queja ante la EPS');
    expect(el.textContent).not.toContain('Si la EPS no responde');
    expect([...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Registrar queja ante la Supersalud')).toBe(false);
  });

  it('con la queja de la EPS: paso 1 "Completado" con fecha y radicado, y paso 2 habilitado', () => {
    const el = crear(
      pendiente({
        quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' },
        bitacora: [{ en: hace(2), tipo: 'queja-eps', texto: 'Queja ante la EPS (radicado n.° PQR-123)' }],
      }),
    ).nativeElement as HTMLElement;

    expect(el.textContent).toContain('Completado');
    expect(el.textContent).toContain('radicado n.° PQR-123');
    expect(boton(el, 'Corregir queja ante la EPS')).toBeTruthy();
    // Literal aprobado del paso 2 habilitado.
    expect(el.textContent).toContain('Si la EPS no responde o no entrega, puedes quejarte ante la Supersalud');
    expect(boton(el, 'Registrar queja ante la Supersalud')).toBeTruthy();
  });

  it('registra la queja de un paso con la fecha de hoy y el radicado escrito', () => {
    const fixture = crear(pendiente());
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: RegistroQueja[] = [];
    fixture.componentInstance.registrar.subscribe((r) => emitidos.push(r));

    boton(el, 'Registrar queja ante la EPS').click();
    fixture.detectChanges();
    TestBed.flushEffects(); // el foco entra al campo apenas se abre el diálogo

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.textContent).toContain('Registrar queja ante la EPS');
    const fecha = [...el.querySelectorAll('input')].find((i) => i.type === 'date');
    expect(fecha?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/); // hoy por defecto
    expect(document.activeElement).toBe(fecha); // el foco entra al campo

    escribir(el, 'Número de radicado', 'PQR-9');
    fixture.detectChanges();
    boton(el, 'Guardar').click();
    fixture.detectChanges();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].paso).toBe(1);
    expect(emitidos[0].radicado).toBe('PQR-9');
    // La fecha de hoy se guarda con la hora actual; nunca queda vacía.
    expect(Math.abs(Date.now() - Date.parse(emitidos[0].radicadaEn))).toBeLessThan(60_000);
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('una fecha que no es la de hoy se guarda a inicio de ese día', () => {
    const fixture = crear(pendiente());
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: RegistroQueja[] = [];
    fixture.componentInstance.registrar.subscribe((r) => emitidos.push(r));

    boton(el, 'Registrar queja ante la EPS').click();
    fixture.detectChanges();
    escribir(el, 'Fecha en que radicó la queja', '2026-10-01');
    fixture.detectChanges();
    boton(el, 'Guardar').click();

    expect(emitidos[0].radicadaEn).toBe(new Date('2026-10-01T00:00:00').toISOString());
  });

  it('el paso 2 se registra desde su diálogo y Escape lo cierra', () => {
    const fixture = crear(
      pendiente({ quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' } }),
    );
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: RegistroQueja[] = [];
    fixture.componentInstance.registrar.subscribe((r) => emitidos.push(r));

    boton(el, 'Registrar queja ante la Supersalud').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain(
      'Registrar queja ante la Supersalud',
    );

    escribir(el, 'Número de radicado', 'SUP-7');
    fixture.detectChanges();
    boton(el, 'Guardar').click();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ paso: 2, radicado: 'SUP-7' });
    expect(emitidos[0].radicadaEn).toBeTruthy(); // hoy con hora actual

    // Y el diálogo se puede cerrar con Escape sin registrar nada.
    boton(el, 'Registrar queja ante la Supersalud').click();
    fixture.detectChanges();
    el.querySelector('[role="dialog"]')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(emitidos).toHaveLength(1);
  });

  it('registrar de nuevo una queja precarga la fecha y el radicado anteriores', () => {
    const fixture = crear(pendiente({ quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' } }));
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Corregir queja ante la EPS').click();
    fixture.detectChanges();

    const radicado = [...el.querySelectorAll('input')].find((i) => i.type === 'text');
    expect(radicado?.value).toBe('PQR-123');
    // La fecha precargada es la del día local de la queja guardada.
    const anterior = new Date(hace(2));
    const dos = (n: number): string => String(n).padStart(2, '0');
    const fecha = [...el.querySelectorAll('input')].find((i) => i.type === 'date');
    expect(fecha?.value).toBe(
      `${anterior.getFullYear()}-${dos(anterior.getMonth() + 1)}-${dos(anterior.getDate())}`,
    );
  });

  it('el paso 3 se bloquea sin queja y habilita (emitiendo 1) con la queja registrada', () => {
    // Sin queja: el paso existe con la red alterna, pero no se puede generar.
    const sinQueja = crear(pendiente()).nativeElement as HTMLElement;
    expect(
      [...sinQueja.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Generar queja ante la EPS',
      ),
    ).toBe(true);
    expect(boton(sinQueja, 'Generar queja ante la EPS').disabled).toBe(true);
    expect(sinQueja.textContent).toContain('Circular Externa 017 de 2026 del Ministerio de Salud');

    const fixture = crear(pendiente({ quejaEps: { radicadaEn: hace(2), radicado: 'PQR-1' } }));
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: number[] = [];
    fixture.componentInstance.generar.subscribe((p) => emitidos.push(p));

    expect(boton(el, 'Generar queja ante la EPS').disabled).toBe(false);
    boton(el, 'Generar queja ante la EPS').click();
    expect(emitidos).toEqual([1]);
  });

  it('una queja de la EPS con plazoVigenteEps en false (fecha futura) se anuncia y bloquea el paso 3', () => {
    // `plazoVigenteEps` lo aporta la pantalla con `esFechaPasada`; acá se baja explícitamente.
    const futura = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const fixture = TestBed.createComponent(Escalera);
    fixture.componentRef.setInput('pendiente', pendiente({ quejaEps: { radicadaEn: futura } }));
    fixture.componentRef.setInput('ahora', new Date());
    fixture.componentRef.setInput('plazoVigenteEps', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.escalera-aviso')?.textContent).toContain(
      'Tu queja ante la EPS es para el',
    );
    expect(boton(el, 'Generar queja ante la EPS').disabled).toBe(true);
    // Con la queja ya registrada no se vuelve a pedir que la registre.
    expect(el.textContent).not.toContain('Se habilita cuando registre la queja ante la EPS');
  });

  it('el paso 4 solo aparece con la queja de la Supersalud y emite su paso', () => {
    const sinQueja2 = crear(
      pendiente({ quejaEps: { radicadaEn: hace(2) } }),
    ).nativeElement as HTMLElement;
    expect(
      [...sinQueja2.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Generar queja ante la Supersalud',
      ),
    ).toBe(false);

    const fixture = crear(
      pendiente({
        quejaEps: { radicadaEn: hace(2) },
        quejaSupersalud: { radicadaEn: hace(1), radicado: 'SUP-9' },
      }),
    );
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: number[] = [];
    fixture.componentInstance.generar.subscribe((p) => emitidos.push(p));

    boton(el, 'Generar queja ante la Supersalud').click();
    expect(emitidos).toEqual([2]);
  });

  it('el paso 4 se bloquea con la fecha futura de SU queja, sin tocar el paso 3', () => {
    const fixture = TestBed.createComponent(Escalera);
    fixture.componentRef.setInput(
      'pendiente',
      pendiente({
        quejaEps: { radicadaEn: hace(2) },
        quejaSupersalud: { radicadaEn: hace(1), radicado: 'SUP-9' },
      }),
    );
    fixture.componentRef.setInput('ahora', new Date());
    // Solo la fecha de la Supersalud es futura: la de la EPS sigue en orden.
    fixture.componentRef.setInput('plazoVigenteSupersalud', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    const el: HTMLElement = fixture.nativeElement;
    const emitidos: number[] = [];
    fixture.componentInstance.generar.subscribe((p) => emitidos.push(p));

    expect(boton(el, 'Generar queja ante la EPS').disabled).toBe(false);
    expect(boton(el, 'Generar queja ante la Supersalud').disabled).toBe(true);
    boton(el, 'Generar queja ante la Supersalud').click();
    expect(emitidos).toEqual([]);
    // La región viva anuncia SOLO la queja fuera de temporada.
    const aviso = el.querySelector('.escalera-aviso')?.textContent ?? '';
    expect(aviso).toContain('Tu queja ante la Supersalud es para el');
    expect(aviso).not.toContain('ante la EPS');
  });

  it('con las dos quejas fuera de temporada se anuncian sus dos fechas', () => {
    const futura = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const fixture = TestBed.createComponent(Escalera);
    fixture.componentRef.setInput(
      'pendiente',
      pendiente({ quejaEps: { radicadaEn: futura }, quejaSupersalud: { radicadaEn: futura } }),
    );
    fixture.componentRef.setInput('ahora', new Date());
    fixture.componentRef.setInput('plazoVigenteEps', false);
    fixture.componentRef.setInput('plazoVigenteSupersalud', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    const aviso = fixture.nativeElement.querySelector('.escalera-aviso')?.textContent ?? '';

    expect(aviso).toContain('Tu queja ante la EPS es para el');
    expect(aviso).toContain('la de la Supersalud para el');
  });
});
