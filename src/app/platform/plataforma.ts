import { Capacitor } from '@capacitor/core';

/** true en la app Android (Capacitor); false en la PWA y en el navegador. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
