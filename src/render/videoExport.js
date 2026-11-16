import { tick } from './engine.js';

/**
 * Exportación de video del Estudio de renders, sin librerías externas.
 *
 * Camino principal: cada cuadro se dibuja sin prisa (con las pasadas que haga falta), se entrega
 * al codificador H.264 del navegador (WebCodecs) y se empaqueta en un MP4 con el pequeño
 * empaquetador de este archivo. Como el tiempo de cada cuadro lo fija el índice y no el reloj,
 * el video sale fluido aunque el equipo tarde en dibujar.
 *
 * Respaldo: si el navegador no tiene WebCodecs con H.264 se graba el lienzo con MediaRecorder
 * (MP4 o WebM, lo que admita), pausando la grabación mientras se dibuja cada cuadro.
 */

/* ------------------------------------------------------------------ MP4 (ISO BMFF) */

const u16 = (n) => [(n >>> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0));

function box(type, ...parts) {
  let size = 8;
  for (const p of parts) size += p.length;
  const out = new Uint8Array(size);
  out.set(u32(size), 0);
  out.set(ascii(type), 4);
  let offset = 8;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
const fullBox = (type, version, flags, ...parts) => box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...parts);

const MATRIX = [...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x10000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];
const PRIMARIES = { bt709: 1, bt470bg: 5, smpte170m: 6 };
const TRANSFER = { bt709: 1, smpte170m: 6, 'iec61966-2-1': 13 };
const COEFFS = { rgb: 0, bt709: 1, bt470bg: 5, smpte170m: 6 };

/**
 * Arma un MP4 con una pista de video H.264.
 * `samples`: [{ data: Uint8Array, key: boolean, timestamp: µs }] en orden de decodificación.
 * `avcC`: registro de configuración del decodificador (lo entrega el codificador).
 */
export function muxMp4({ samples, avcC, width, height, fps, colorSpace = null }) {
  const timescale = 90000;
  const delta = Math.round(timescale / fps);
  const count = samples.length;
  const duration = count * delta;

  // Si el codificador reordenó cuadros (cuadros B), cada muestra lleva su desfase de presentación
  const offsets = samples.map((s, i) => Math.round((s.timestamp * timescale) / 1e6) - i * delta);
  const shift = Math.max(0, -Math.min(0, ...offsets));
  const needsCtts = offsets.some((o) => o !== 0);

  const moov = (chunkOffset) => {
    const colr =
      colorSpace && PRIMARIES[colorSpace.primaries] && TRANSFER[colorSpace.transfer] && COEFFS[colorSpace.matrix] !== undefined
        ? box('colr', ascii('nclx'), u16(PRIMARIES[colorSpace.primaries]), u16(TRANSFER[colorSpace.transfer]), u16(COEFFS[colorSpace.matrix]), [colorSpace.fullRange ? 0x80 : 0])
        : new Uint8Array(0);
    const avc1 = box(
      'avc1',
      [0, 0, 0, 0, 0, 0],
      u16(1),
      u16(0),
      u16(0),
      new Uint8Array(12),
      u16(width),
      u16(height),
      u32(0x00480000),
      u32(0x00480000),
      u32(0),
      u16(1),
      new Uint8Array(32),
      u16(0x0018),
      u16(0xffff),
      box('avcC', avcC),
      colr
    );
    const keys = [];
    samples.forEach((s, i) => {
      if (s.key) keys.push(...u32(i + 1));
    });
    const sizes = new Uint8Array(count * 4);
    samples.forEach((s, i) => sizes.set(u32(s.data.length), i * 4));
    const ctts = new Uint8Array(needsCtts ? count * 8 : 0);
    if (needsCtts) offsets.forEach((o, i) => ctts.set([...u32(1), ...u32(o + shift)], i * 8));

    const stbl = box(
      'stbl',
      fullBox('stsd', 0, 0, u32(1), avc1),
      fullBox('stts', 0, 0, u32(1), u32(count), u32(delta)),
      needsCtts ? fullBox('ctts', 0, 0, u32(count), ctts) : new Uint8Array(0),
      fullBox('stss', 0, 0, u32(keys.length / 4), keys),
      fullBox('stsc', 0, 0, u32(1), u32(1), u32(count), u32(1)),
      fullBox('stsz', 0, 0, u32(0), u32(count), sizes),
      fullBox('stco', 0, 0, u32(1), u32(chunkOffset))
    );
    const minf = box(
      'minf',
      fullBox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)),
      box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1))),
      stbl
    );
    const mdia = box(
      'mdia',
      fullBox('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0)),
      fullBox('hdlr', 0, 0, u32(0), ascii('vide'), new Uint8Array(12), ascii('VideoHandler'), [0]),
      minf
    );
    const trak = box(
      'trak',
      fullBox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(duration), new Uint8Array(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16)),
      mdia
    );
    return box(
      'moov',
      fullBox('mvhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u32(0x00010000), u16(0x0100), u16(0), new Uint8Array(8), MATRIX, new Uint8Array(24), u32(2)),
      trak
    );
  };

  const ftyp = box('ftyp', ascii('isom'), u32(0x200), ascii('isom'), ascii('iso2'), ascii('avc1'), ascii('mp41'));
  const head = moov(0).length;
  const header = moov(ftyp.length + head + 8);
  let payload = 0;
  for (const s of samples) payload += s.data.length;
  const mdatHead = new Uint8Array([...u32(payload + 8), ...ascii('mdat')]);
  return new Blob([ftyp, header, mdatHead, ...samples.map((s) => s.data)], { type: 'video/mp4' });
}

/* ------------------------------------------------------------------- codificación */

const H264_PROFILES = ['avc1.640028', 'avc1.4d0028', 'avc1.420028'];

/** Configuración H.264 que acepta el navegador para ese tamaño, o null. */
export async function pickH264Config({ width, height, fps, bitrate }) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
  for (const codec of H264_PROFILES) {
    const config = { codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } };
    try {
      // eslint-disable-next-line no-await-in-loop
      const { supported } = await VideoEncoder.isConfigSupported(config);
      if (supported) return config;
    } catch {
      /* se prueba el siguiente perfil */
    }
  }
  return null;
}

const bytesOf = (data) => (data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Codifica `frames` cuadros del lienzo. `renderFrame(i)` debe dejar dibujado el cuadro i.
 * Devuelve { blob, ext, method }. Si `signal` se aborta, devuelve null.
 */
export async function encodeVideo({ canvas, width, height, fps = 30, frames, bitrate = 8e6, renderFrame, onProgress = null, signal = null }) {
  const config = await pickH264Config({ width, height, fps, bitrate });
  if (config) return encodeWithWebCodecs({ canvas, config, width, height, fps, frames, renderFrame, onProgress, signal });
  if (typeof MediaRecorder !== 'undefined' && canvas.captureStream) {
    return recordWithMediaRecorder({ canvas, fps, frames, bitrate, renderFrame, onProgress, signal });
  }
  throw new Error('Este navegador no permite exportar video.');
}

async function encodeWithWebCodecs({ canvas, config, width, height, fps, frames, renderFrame, onProgress, signal }) {
  const samples = [];
  let avcC = null;
  let colorSpace = null;
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, key: chunk.type === 'key', timestamp: chunk.timestamp });
      const dc = meta?.decoderConfig;
      if (dc?.description && !avcC) avcC = bytesOf(dc.description).slice();
      if (dc?.colorSpace && !colorSpace) colorSpace = dc.colorSpace;
    },
    error: (err) => {
      failure = err;
    },
  });
  encoder.configure(config);
  const frameDuration = 1e6 / fps;
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted || failure) break;
      // eslint-disable-next-line no-await-in-loop
      await renderFrame(i);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDuration), duration: Math.round(frameDuration) });
      encoder.encode(frame, { keyFrame: i % Math.max(1, Math.round(fps * 2)) === 0 });
      frame.close();
      if (onProgress) onProgress((i + 1) / frames);
      // No se adelanta al codificador
      while (encoder.encodeQueueSize > 3 && !failure) {
        // eslint-disable-next-line no-await-in-loop
        await tick();
      }
      // eslint-disable-next-line no-await-in-loop
      await tick();
    }
    if (failure) throw failure;
    if (signal?.aborted) return null;
    await encoder.flush();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  if (!avcC || samples.length === 0) throw new Error('El codificador no devolvió video.');
  return { blob: muxMp4({ samples, avcC, width, height, fps, colorSpace }), ext: 'mp4', method: 'webcodecs' };
}

async function recordWithMediaRecorder({ canvas, fps, frames, bitrate, renderFrame, onProgress, signal }) {
  const mimeType = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) throw new Error('Este navegador no permite grabar video del lienzo.');
  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start();
  recorder.pause();
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) break;
    // eslint-disable-next-line no-await-in-loop
    await renderFrame(i);
    recorder.resume();
    track.requestFrame?.();
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000 / fps);
    recorder.pause();
    if (onProgress) onProgress((i + 1) / frames);
  }
  recorder.stop();
  await stopped;
  track.stop();
  if (signal?.aborted) return null;
  const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), ext, method: 'mediarecorder' };
}
