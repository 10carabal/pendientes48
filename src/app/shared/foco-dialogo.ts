/**
 * Trampa de foco para diálogos (WCAG 2.4.3 y 2.1.2): mientras el diálogo está
 * abierto, Tab y Shift+Tab ciclan solo dentro de él. Se conecta como
 * `(keydown)` en la raíz del diálogo; sin dependencias ni CDK. La usan los dos
 * diálogos compartidos (`aviso-legal` y `ayuda-avisos`) por importación relativa.
 */
export function atraparFoco(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const dialogo = event.currentTarget as HTMLElement;
  const focables = dialogo.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focables.length === 0) return;

  const primero = focables[0];
  const ultimo = focables[focables.length - 1];
  const activo = document.activeElement;

  if (event.shiftKey && (activo === primero || !dialogo.contains(activo))) {
    ultimo.focus();
    event.preventDefault();
  } else if (!event.shiftKey && (activo === ultimo || !dialogo.contains(activo))) {
    primero.focus();
    event.preventDefault();
  }
}
