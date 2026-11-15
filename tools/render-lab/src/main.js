import { RenderEngine, tick } from '../../../src/render/engine.js';
import { SITE_SHOTS, cameraFor } from '../../../src/render/scenes.js';

/**
 * Generador por lotes de las imágenes del sitio (public/renders).
 * Para crear renders propios con opciones usa el «Estudio de renders» dentro de POZOLE Suite;
 * esta página solo regenera las tomas fijas de la página principal.
 *
 * Uso manual:   abre /tools/render-lab/index.html con `npm run dev`, marca las tomas y pulsa «Renderizar».
 * Uso por URL:  ?shots=estudio-tratado,producto-qrd&quality=final&save=1&qa=1&auto=1
 *   quality  draft | final          save  1 → public/renders/<id>.webp
 *   qa       1 → vista previa JPG en node_modules/.cache/pozole-qa/ (sobre fondo `matte`)
 */

const QUALITY = {
  draft: { scale: 0.5, samples: 40, shadowSize: 1024 },
  final: { scale: 1, samples: 220, shadowSize: 2048 },
};

const SHOTS = Object.fromEntries(SITE_SHOTS.map((s) => [s.id, s]));
const params = new URLSearchParams(location.search);
const state = (window.__lab = { status: 'idle', current: null, progress: 0, done: [], errors: [] });

const $ = (id) => document.getElementById(id);
const canvas = $('view');
const engine = new RenderEngine(canvas);

const list = $('shots');
SITE_SHOTS.forEach((shot) => {
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox" value="${shot.id}" checked> <span>${shot.title}</span> <code>${shot.id}</code>`;
  list.appendChild(label);
});

const log = (msg) => {
  $('log').textContent += `${msg}\n`;
  $('log').scrollTop = 1e9;
};

async function save(dir, name, blob) {
  const res = await fetch(`/__render-lab/save?dir=${dir}&name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`No se pudo guardar ${name} (${res.status})`);
  return res.json();
}

// Vista previa reducida y aplanada sobre un color, para revisar sin canal alfa
async function preview(width, matte, maxWidth) {
  engine.present(matte);
  const scale = Math.min(1, maxWidth / width);
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, c.width, c.height);
  return new Promise((done) => c.toBlob(done, 'image/jpeg', 0.88));
}

async function run(ids, { quality, saveFinal, qa, matte, qaWidth }) {
  if (state.status === 'rendering') return; // una sola tanda a la vez
  state.status = 'rendering';
  $('go').disabled = true;
  state.done = [];
  state.errors = [];
  const q = QUALITY[quality];
  for (const id of ids) {
    const shot = SHOTS[id];
    if (!shot) {
      state.errors.push(`Toma desconocida: ${id}`);
      continue;
    }
    state.current = id;
    const t0 = performance.now();
    try {
      const width = Math.round(shot.width * q.scale);
      const height = Math.round(shot.height * q.scale);
      const built = shot.build();
      engine.setSize(width, height, q.shadowSize);
      engine.load(built);
      engine.setCamera(cameraFor(built, built.view, width / height));
      while (engine.samples < q.samples) {
        engine.step(Math.min(6, q.samples - engine.samples));
        state.progress = engine.samples / q.samples;
        $('status').textContent = `${shot.title} · ${Math.round(state.progress * 100)} %`;
        await tick();
      }
      const entry = { id, width, height, samples: engine.samples };
      if (saveFinal) {
        engine.present(null);
        entry.saved = await save('renders', `${id}.webp`, await engine.toBlob('image/webp', 0.9));
      }
      if (qa) entry.qa = await save('qa', `${id}${matte === '#08080c' ? '-dark' : ''}.jpg`, await preview(width, matte, qaWidth));
      engine.present(matte);
      entry.ms = Math.round(performance.now() - t0);
      state.done.push(entry);
      log(`✓ ${id} · ${width}×${height} · ${engine.samples} pasadas · ${(entry.ms / 1000).toFixed(1)} s`);
    } catch (err) {
      state.errors.push(`${id}: ${err.message}`);
      log(`✗ ${id}: ${err.stack || err.message}`);
    }
  }
  state.current = null;
  state.status = 'done';
  $('go').disabled = false;
  $('status').textContent = `Listo · ${state.done.length} toma(s)`;
  document.title = `LISTO ${state.done.length}/${ids.length}`;
}

$('go').addEventListener('click', () => {
  const ids = [...list.querySelectorAll('input:checked')].map((i) => i.value);
  run(ids, { quality: $('quality').value, saveFinal: $('save').checked, qa: false, matte: $('matte').value, qaWidth: 1200 });
});

if (params.get('auto') === '1') {
  run((params.get('shots') || '').split(',').filter(Boolean), {
    quality: params.get('quality') || 'draft',
    saveFinal: params.get('save') === '1',
    qa: params.get('qa') === '1',
    matte: params.get('matte') || '#f5f5f7',
    qaWidth: Number(params.get('qaw') || 1100),
  });
}
