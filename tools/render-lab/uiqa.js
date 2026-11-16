/**
 * Revisión del Estudio de renders en el navegador (solo desarrollo).
 *
 *   const q = await import('/tools/render-lab/uiqa.js');
 *   await q.settle();            // avanza cuadros hasta que la cámara llegue y la imagen se afine
 *   await q.saveCanvas('x.jpg'); // guarda el lienzo en node_modules/.cache/pozole-qa/
 *
 * El panel del navegador integrado limita requestAnimationFrame a ~1 cuadro por segundo; aquí los
 * cuadros se avanzan a mano para que la revisión no dependa de eso.
 */
export function viewport() {
  return window.__pozoleViewport;
}

export async function settle({ frames = 80, dt = 1 / 30 } = {}) {
  const v = viewport();
  for (let i = 0; i < frames; i++) {
    v.runFrame(dt);
    // eslint-disable-next-line no-await-in-loop
    if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

export async function saveCanvas(name) {
  const c = document.querySelector('canvas');
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const res = await fetch(`/__render-lab/save?dir=qa&name=${name}`, { method: 'POST', body: blob });
  return (await res.json()).file;
}

export const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
