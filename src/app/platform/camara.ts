import { Camera, CameraErrorCode, MediaTypeSelection, type MediaResult } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { isNative } from './plataforma';

/** Lado máximo y calidad del JPEG (`design.md` · "Documentos"). */
const LADO_MAXIMO = 1280;
const CALIDAD_JPEG = 0.7;

/** `quality: 100`: la compresión la hace `aJpegReducido`, una sola vez. */
const OPCIONES = { quality: 100, correctOrientation: true };

/**
 * Foto del comprobante (`spec ventanilla` · "Tome una foto del comprobante";
 * `tasks.md` 2.4): abre la cámara y devuelve un `Blob` listo para el store de
 * `data/` (que guarda las fotos como `Blob`), reducido a ≤1280 px de lado en
 * JPEG 0.7. Si el permiso de cámara está denegado —o Android lo rechaza al
 * abrir—, en vez de fallar ofrece la galería (verificación de la 2.4).
 */
export async function tomarFoto(): Promise<Blob> {
  if (isNative() && !(await permisoCamaraConcedido())) return elegirFoto();
  try {
    return await aFotoProcesada(await Camera.takePhoto(OPCIONES));
  } catch (e) {
    if (!esPermisoDenegado(e)) throw e;
    return elegirFoto();
  }
}

/** Elige una foto existente de la galería; también sale reducida (≤1280 px, 0.7). */
export async function elegirFoto(): Promise<Blob> {
  const { results } = await Camera.chooseFromGallery({
    ...OPCIONES,
    mediaType: MediaTypeSelection.Photo,
    allowMultipleSelection: false,
  });
  const foto = results[0];
  if (!foto) throw new Error('No se eligió ninguna foto');
  return aFotoProcesada(foto);
}

/** Consulta el permiso de cámara y lo pide si está en 'prompt' (solo Android). */
async function permisoCamaraConcedido(): Promise<boolean> {
  let { camera } = await Camera.checkPermissions();
  if (camera === 'prompt' || camera === 'prompt-with-rationale') {
    ({ camera } = await Camera.requestPermissions({ permissions: ['camera'] }));
  }
  return camera === 'granted';
}

/** Permiso de cámara rechazado: por código del plugin (Android) o `NotAllowedError` (web). */
function esPermisoDenegado(e: unknown): boolean {
  const error = e as { code?: string; name?: string } | null;
  return error?.code === CameraErrorCode.CameraPermissionDenied || error?.name === 'NotAllowedError';
}

/** Baja el resultado del plugin a `Blob` (nativo: lectura directa; web: `fetch`). */
async function aFotoProcesada(foto: MediaResult): Promise<Blob> {
  let original: Blob;
  if (foto.uri) {
    const { data } = await Filesystem.readFile({ path: foto.uri });
    original = typeof data === 'string' ? aBlobBase64(data) : data;
  } else if (foto.webPath) {
    original = await (await fetch(foto.webPath)).blob();
  } else {
    throw new Error('La foto no tiene ruta legible');
  }
  return aJpegReducido(original);
}

/**
 * Reduce la foto a un lado máximo de 1280 px (conservando la proporción) y la
 * re-codifica como JPEG 0.7: así la salida es uniforme aunque la galería
 * entregue PNG o el navegador no aplique la `quality` nativa (solo Android/iOS).
 */
export async function aJpegReducido(origen: Blob): Promise<Blob> {
  const url = URL.createObjectURL(origen);
  try {
    const imagen = await cargarImagen(url);
    const { ancho, alto } = escalaPara(imagen.naturalWidth, imagen.naturalHeight, LADO_MAXIMO);
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new Error('No hay canvas para procesar la foto');
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob(
        (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo comprimir la foto'))),
        'image/jpeg',
        CALIDAD_JPEG,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Dimensiones finales: sin cambios si ya cabe en el lado máximo; si no, a escala. */
export function escalaPara(
  ancho: number,
  alto: number,
  maximo: number,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= maximo) return { ancho, alto };
  const factor = maximo / mayor;
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) };
}

/** Carga la imagen del blob para medirla antes de redibujarla en el canvas. */
function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error('No se pudo leer la foto'));
    imagen.src = url;
  });
}

/** base64 → `Blob` (así se lee la foto en Android vía `Filesystem`). */
function aBlobBase64(base64: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes]);
}
