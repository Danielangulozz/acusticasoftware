import * as THREE from 'three';

/**
 * Materiales y texturas 100 % procedurales (dibujadas con Canvas 2D):
 * no se usa ninguna fotografía ni textura de terceros.
 */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMock2DContext(sizeX, sizeY) {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createImageData: (w, h) => ({ data: new Uint8ClampedArray((w || sizeX) * (h || sizeY) * 4) }),
    getImageData: () => ({ data: new Uint8ClampedArray(sizeX * sizeY * 4) }),
    putImageData: noop,
  };
}

function canvas(size, sizeY = size) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = sizeY;
    const ctx = c.getContext?.('2d') || createMock2DContext(size, sizeY);
    return [c, ctx];
  }
  const mockCanvas = { width: size, height: sizeY };
  return [mockCanvas, createMock2DContext(size, sizeY)];
}

function texture(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ---------------------------------------------------------------- madera */

const WOODS = {
  oak: { base: '#d8b98f', dark: '#9a7347', light: '#ecd6b2' },
  walnut: { base: '#7a5236', dark: '#40281a', light: '#a37650' },
  birch: { base: '#e6d3b3', dark: '#bfa27a', light: '#f5ead6' },
  ash: { base: '#cdbb9d', dark: '#8f7b5c', light: '#e9dcc2' },
};

// La veta corre a lo largo del eje U de la textura y es continua en ese eje.
function woodCanvas(kind, seed, size = 1024) {
  const { base, dark, light } = WOODS[kind];
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  // Bandas tonales anchas
  for (let i = 0; i < 46; i++) {
    g.fillStyle = rgba(r() < 0.5 ? dark : light, 0.015 + r() * 0.04);
    g.fillRect(0, r() * size, size, 10 + r() * 90);
  }
  // Líneas de veta onduladas (frecuencias enteras → la textura se repite sin costura en U)
  for (let i = 0; i < 1100; i++) {
    const y0 = r() * size;
    const amp = 1 + r() * 7;
    const f1 = 1 + Math.floor(r() * 3);
    const f2 = 2 + Math.floor(r() * 5);
    const p1 = r() * 6.283;
    const p2 = r() * 6.283;
    g.strokeStyle = rgba(r() < 0.75 ? dark : light, 0.025 + r() * 0.075);
    g.lineWidth = 0.4 + r() * 1.0;
    g.beginPath();
    for (let x = 0; x <= size; x += 12) {
      const t = (x / size) * 6.283;
      const y = y0 + Math.sin(t * f1 + p1) * amp + Math.sin(t * f2 + p2) * amp * 0.25;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // Poros
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = rgba(dark, 0.03 + r() * 0.08);
    g.fillRect(r() * size, r() * size, 2 + r() * 12, 0.5 + r() * 0.9);
  }
  return c;
}

/* ------------------------------------------------------------------ tela */

function weaveCanvas(seed, size = 256) {
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, size, size);
  const step = 4;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const over = ((x + y) / step) % 2 === 0;
      const v = (over ? 228 : 210) + Math.floor((r() - 0.5) * 20);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, step, step);
    }
  }
  // Hilos irregulares
  for (let i = 0; i < 260; i++) {
    const v = 150 + Math.floor(r() * 100);
    g.fillStyle = `rgba(${v},${v},${v},0.12)`;
    if (r() < 0.5) g.fillRect(0, Math.floor(r() * size), size, 1);
    else g.fillRect(Math.floor(r() * size), 0, 1, size);
  }
  return c;
}

/* ------------------------------------------------------- ruido de pintura */

function speckleCanvas(seed, size = 256, contrast = 26) {
  const [c, g] = canvas(size);
  const r = rng(seed);
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 222 + Math.floor((r() - 0.5) * contrast);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------ piso de listones */

function planksCanvas(kind, seed, size = 2048) {
  const { base, dark, light } = WOODS[kind];
  const [c, g] = canvas(size);
  const r = rng(seed);
  const rows = 16; // listones a lo ancho de la textura
  const h = size / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * size * 0.5;
    while (x < size) {
      const w = size * (0.35 + r() * 0.3);
      const tone = r();
      g.fillStyle = base;
      g.fillRect(x, row * h, w, h);
      g.fillStyle = rgba(tone < 0.5 ? dark : light, 0.02 + r() * 0.09);
      g.fillRect(x, row * h, w, h);
      // veta
      for (let i = 0; i < 26; i++) {
        const y = row * h + r() * h;
        g.strokeStyle = rgba(dark, 0.03 + r() * 0.07);
        g.lineWidth = 0.6 + r() * 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + w * 0.3, y + (r() - 0.5) * 6, x + w * 0.6, y + (r() - 0.5) * 6, x + w, y + (r() - 0.5) * 4);
        g.stroke();
      }
      // junta
      g.fillStyle = rgba('#2a1c10', 0.28);
      g.fillRect(x + w - 1.5, row * h, 1.5, h);
      x += w;
    }
    g.fillStyle = rgba('#2a1c10', 0.26);
    g.fillRect(0, row * h, size, 1.5);
  }
  return c;
}

/* --------------------------------------------------- pantallas emisivas */

function dawCanvas(seed) {
  const [c, g] = canvas(1024, 512);
  const r = rng(seed);
  g.fillStyle = '#14131c';
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#1d1b29';
  g.fillRect(0, 0, 1024, 34);
  g.fillRect(0, 0, 130, 512);
  const colors = ['#8767f9', '#f2b84b', '#5fd0c5', '#e8718d', '#8767f9', '#f2b84b', '#7aa2f7'];
  for (let track = 0; track < 9; track++) {
    const y = 46 + track * 50;
    g.fillStyle = '#262336';
    g.fillRect(8, y + 6, 112, 30);
    let x = 140 + r() * 40;
    while (x < 990) {
      const w = 60 + r() * 220;
      const col = colors[track % colors.length];
      g.fillStyle = rgba(col, 0.9);
      g.fillRect(x, y, Math.min(w, 1000 - x), 40);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = x + 3; k < Math.min(x + w, 1000) - 3; k += 3) {
        const a = (0.2 + r() * 0.8) * 15;
        g.fillRect(k, y + 20 - a, 1.5, a * 2);
      }
      x += w + 6 + r() * 60;
    }
  }
  g.fillStyle = '#ffffff';
  g.fillRect(430, 34, 2, 478);
  return c;
}

function movieCanvas() {
  const [c, g] = canvas(1024, 512);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#2b1d5e');
  sky.addColorStop(0.45, '#c2577a');
  sky.addColorStop(0.62, '#f6b05c');
  sky.addColorStop(0.63, '#3a2552');
  sky.addColorStop(1, '#120c24');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  // sol
  const sun = g.createRadialGradient(512, 318, 4, 512, 318, 150);
  sun.addColorStop(0, 'rgba(255,244,214,1)');
  sun.addColorStop(0.25, 'rgba(255,205,130,0.85)');
  sun.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, 1024, 512);
  // montañas
  g.fillStyle = '#231640';
  g.beginPath();
  g.moveTo(0, 330);
  [[120, 270], [230, 315], [360, 250], [470, 322], [600, 280], [720, 318], [860, 255], [1024, 310]].forEach(([x, y]) => g.lineTo(x, y));
  g.lineTo(1024, 512);
  g.lineTo(0, 512);
  g.fill();
  return c;
}

function chartCanvas() {
  const [c, g] = canvas(1024, 576);
  g.fillStyle = '#f7f7fb';
  g.fillRect(0, 0, 1024, 576);
  g.fillStyle = '#1d1d1f';
  g.fillRect(70, 70, 360, 26);
  g.fillStyle = '#b9b9c6';
  g.fillRect(70, 116, 240, 14);
  const bars = [0.9, 0.75, 0.6, 0.48, 0.42, 0.38];
  bars.forEach((v, i) => {
    g.fillStyle = i % 2 ? '#f2b84b' : '#6d4be0';
    g.fillRect(90 + i * 150, 500 - v * 300, 96, v * 300);
  });
  g.fillStyle = '#d9d9e3';
  g.fillRect(70, 500, 900, 3);
  return c;
}

function lectureCanvas() {
  const [c, g] = canvas(1024, 576);
  g.fillStyle = '#f8fafc';
  g.fillRect(0, 0, 1024, 576);
  // Encabezado académico
  g.fillStyle = '#5833c7';
  g.fillRect(0, 0, 1024, 68);
  g.fillStyle = '#ffffff';
  g.fillRect(48, 24, 340, 20);
  // Ecuación Sabine / gráfica RT60 simulada
  g.fillStyle = '#1e293b';
  g.fillRect(56, 110, 420, 22);
  g.fillStyle = '#64748b';
  g.fillRect(56, 150, 360, 14);
  g.fillRect(56, 178, 390, 14);
  // Caja de fórmula destacada
  g.fillStyle = '#ede9fe';
  g.fillRect(56, 230, 410, 96);
  g.strokeStyle = '#7c3aed';
  g.lineWidth = 4;
  g.strokeRect(56, 230, 410, 96);
  // Curva de decaimiento en el lado derecho
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 3;
  g.strokeRect(520, 110, 440, 380);
  g.strokeStyle = '#5833c7';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(550, 150);
  g.bezierCurveTo(650, 240, 740, 390, 930, 450);
  g.stroke();
  g.strokeStyle = '#10b981';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(550, 220);
  g.bezierCurveTo(660, 340, 760, 430, 930, 460);
  g.stroke();
  return c;
}

/* ------------------------------------------- ladrillo, concreto y baldosa */

function brickCanvas(seed, { painted = false } = {}) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = painted ? '#dcd9d2' : '#cfc8be';
  g.fillRect(0, 0, size, size);
  const rows = 12;
  const cols = 6;
  const rowH = size / rows;
  const colW = size / cols;
  const mortar = painted ? 2.5 : 4;
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (colW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const y = row * rowH;
      if (painted) {
        const v = 236 + Math.floor((r() - 0.5) * 14);
        g.fillStyle = `rgb(${v},${v - 2},${v - 5})`;
      } else {
        const dr = Math.floor((r() - 0.5) * 34);
        const dg = Math.floor((r() - 0.5) * 20);
        const db = Math.floor((r() - 0.5) * 16);
        g.fillStyle = `rgb(${182 + dr},${94 + dg},${72 + db})`;
      }
      g.fillRect(x + mortar * 0.5, y + mortar * 0.5, colW - mortar, rowH - mortar);
    }
  }
  return c;
}

function concreteCanvas(seed) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#b4b7bc';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 140; i++) {
    const v = 160 + Math.floor(r() * 45);
    g.fillStyle = `rgba(${v},${v + 1},${v + 3},0.08)`;
    g.beginPath();
    g.arc(r() * size, r() * size, 12 + r() * 55, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 2800; i++) {
    const v = 110 + Math.floor(r() * 110);
    g.fillStyle = `rgba(${v},${v},${v},0.16)`;
    g.fillRect(r() * size, r() * size, 1.5 + r() * 2.5, 1.5 + r() * 2.5);
  }
  return c;
}

function ceramicTileCanvas(seed) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#b8bcc4';
  g.fillRect(0, 0, size, size);
  const cells = 4;
  const step = size / cells;
  const gap = 3;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const v = 232 + Math.floor((r() - 0.5) * 12);
      g.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      g.fillRect(x * step + gap, y * step + gap, step - gap * 2, step - gap * 2);
      // Veta sutil diagonal
      g.strokeStyle = 'rgba(160,166,178,0.18)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x * step + r() * step * 0.4, y * step + step * 0.2);
      g.lineTo(x * step + step * 0.8, y * step + step * 0.8);
      g.stroke();
    }
  }
  return c;
}

/* ------------------------------------------- fondos escénicos de presentación */

function backdropCanvas(kind = 'landscape') {
  const W = 1024;
  const H = 768;
  const [c, g] = canvas(W, H);
  const r = rng(kind === 'city' ? 77 : kind === 'sunset' ? 33 : 19);

  if (kind === 'studio') {
    const bg = g.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.5, W * 0.72);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(0.55, '#e2e8f0');
    bg.addColorStop(1, '#94a3b8');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    return c;
  }

  if (kind === 'sunset') {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(0.32, '#6d28d9');
    sky.addColorStop(0.56, '#db2777');
    sky.addColorStop(0.72, '#f59e0b');
    sky.addColorStop(0.75, '#1e1b2e');
    sky.addColorStop(1, '#0f172a');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    const sun = g.createRadialGradient(W * 0.52, H * 0.68, 10, W * 0.52, H * 0.68, 220);
    sun.addColorStop(0, 'rgba(255,251,235,0.95)');
    sun.addColorStop(0.35, 'rgba(251,191,36,0.55)');
    sun.addColorStop(1, 'rgba(245,158,11,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H);

    // Cordillera en contraluz
    g.fillStyle = '#2e1065';
    g.beginPath();
    g.moveTo(0, H * 0.75);
    [[140, 0.64], [290, 0.70], [460, 0.61], [630, 0.71], [810, 0.63], [1024, 0.72]].forEach(([x, yf]) => g.lineTo(x, H * yf));
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    return c;
  }

  if (kind === 'city') {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.45, '#1e293b');
    sky.addColorStop(0.68, '#334155');
    sky.addColorStop(0.72, '#475569');
    sky.addColorStop(1, '#090d16');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    // Resplandor urbano en el horizonte
    const glow = g.createLinearGradient(0, H * 0.5, 0, H * 0.78);
    glow.addColorStop(0, 'rgba(139,92,246,0)');
    glow.addColorStop(0.7, 'rgba(245,158,11,0.22)');
    glow.addColorStop(1, 'rgba(56,189,248,0.08)');
    g.fillStyle = glow;
    g.fillRect(0, H * 0.5, W, H * 0.3);

    // Silueta de edificios (2 capas)
    const horizonY = H * 0.74;
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < W) {
        const bw = 28 + Math.floor(r() * 54);
        const bh = (layer === 0 ? 70 : 45) + Math.floor(r() * (layer === 0 ? 170 : 120));
        const by = horizonY - bh;
        g.fillStyle = layer === 0 ? '#1e293b' : '#0f172a';
        g.fillRect(x, by, bw - 2, bh + 30);

        // Ventanas iluminadas
        for (let wy = by + 8; wy < horizonY - 8; wy += 9) {
          for (let wx = x + 5; wx < x + bw - 8; wx += 7) {
            if (r() < (layer === 0 ? 0.25 : 0.42)) {
              g.fillStyle = r() < 0.7 ? 'rgba(253,230,138,0.65)' : 'rgba(186,230,253,0.55)';
              g.fillRect(wx, wy, 4, 5);
            }
          }
        }
        x += bw;
      }
    }
    g.fillStyle = '#0b0f19';
    g.fillRect(0, horizonY, W, H - horizonY);
    return c;
  }

  // Por defecto: 'landscape' (Paisaje Natural / Montañas y Bosque)
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#60a5fa');
  sky.addColorStop(0.42, '#bae6fd');
  sky.addColorStop(0.66, '#fef3c7');
  sky.addColorStop(0.68, '#86efac');
  sky.addColorStop(1, '#15803d');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Nubes suaves
  for (let i = 0; i < 14; i++) {
    const cx = r() * W;
    const cy = H * (0.12 + r() * 0.32);
    const rad = 40 + r() * 90;
    const cl = g.createRadialGradient(cx, cy, 5, cx, cy, rad);
    cl.addColorStop(0, 'rgba(255,255,255,0.75)');
    cl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cl;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  // Montañas lejanas
  g.fillStyle = '#64748b';
  g.beginPath();
  g.moveTo(0, H * 0.68);
  [[110, 0.48], [240, 0.59], [390, 0.44], [540, 0.58], [690, 0.46], [850, 0.56], [1024, 0.49]].forEach(([x, yf]) => g.lineTo(x, H * yf));
  g.lineTo(W, H * 0.70);
  g.lineTo(0, H * 0.70);
  g.fill();

  // Colinas verdes cercanas
  const hills = g.createLinearGradient(0, H * 0.56, 0, H);
  hills.addColorStop(0, '#4d7c0f');
  hills.addColorStop(0.4, '#3f6212');
  hills.addColorStop(1, '#14532d');
  g.fillStyle = hills;
  g.beginPath();
  g.moveTo(0, H * 0.66);
  g.bezierCurveTo(W * 0.28, H * 0.56, W * 0.65, H * 0.72, W, H * 0.62);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();
  return c;
}

const backdropCache = new Map();
export function getBackdropTexture(kind = 'landscape') {
  if (!backdropCache.has(kind)) {
    const tex = texture(backdropCanvas(kind), { srgb: false, repeat: false });
    backdropCache.set(kind, tex);
  }
  return backdropCache.get(kind);
}

/* ------------------------------------------------ texturas del entorno exterior */

/** Dibuja `draw(x, y)` y sus copias al otro lado de los bordes, para que la textura repita sin costuras. */
function tiled(size, x, y, reach, draw) {
  for (const ox of [0, x < reach ? size : x > size - reach ? -size : null]) {
    if (ox === null) continue;
    for (const oy of [0, y < reach ? size : y > size - reach ? -size : null]) {
      if (oy === null) continue;
      draw(x + ox, y + oy);
    }
  }
}

function grassCanvas(seed) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#6c9650';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 110; i++) {
    const rad = 18 + r() * 60;
    g.fillStyle = r() > 0.5 ? 'rgba(152,190,98,0.10)' : 'rgba(48,92,42,0.11)';
    tiled(size, r() * size, r() * size, rad, (x, y) => {
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.lineWidth = 1;
  for (let i = 0; i < 6000; i++) {
    const v = r();
    g.strokeStyle = v > 0.62 ? 'rgba(176,208,116,0.34)' : v > 0.28 ? 'rgba(56,104,48,0.34)' : 'rgba(112,150,72,0.3)';
    const dx = (r() - 0.5) * 5;
    const dy = 2 + r() * 6;
    tiled(size, r() * size, r() * size, 8, (x, y) => {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y - dy);
      g.stroke();
    });
  }
  return c;
}

function pavementCanvas(seed) {
  const size = 512;
  const [c, g] = canvas(size);
  const r = rng(seed);
  g.fillStyle = '#8f9197';
  g.fillRect(0, 0, size, size);
  const cells = 4;
  const step = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const v = 176 + Math.floor((r() - 0.5) * 22);
      g.fillStyle = `rgb(${v},${v},${v + 3})`;
      g.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);
    }
  }
  for (let i = 0; i < 2600; i++) {
    const v = 120 + Math.floor(r() * 100);
    g.fillStyle = `rgba(${v},${v},${v},0.14)`;
    g.fillRect(r() * size, r() * size, 1.5 + r() * 2, 1.5 + r() * 2);
  }
  return c;
}

/** Fachada de edificio lejano: retícula de ventanas. Con `lit` solo quedan las ventanas encendidas (para la noche). */
function facadeCanvas(seed, lit = false) {
  const w = 256;
  const h = 512;
  const [c, g] = canvas(w, h);
  const r = rng(seed);
  g.fillStyle = lit ? '#000000' : '#c9cbd1';
  g.fillRect(0, 0, w, h);
  const cols = 4;
  const rows = 8;
  const cw = w / cols;
  const ch = h / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = r() > 0.58;
      if (lit) {
        if (!on) continue;
        g.fillStyle = r() > 0.4 ? '#ffd9a0' : '#cfe1ff';
      } else {
        const v = 70 + Math.floor(r() * 40);
        g.fillStyle = `rgb(${v},${v + 18},${v + 44})`;
      }
      g.fillRect(x * cw + cw * 0.16, y * ch + ch * 0.2, cw * 0.68, ch * 0.56);
    }
  }
  return c;
}

/** Mancha radial para la sombra de contacto de árboles y arbustos. */
function blobCanvas() {
  const size = 128;
  const [c, g] = canvas(size);
  const grad = g.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/* ---------------------------------------------------------- biblioteca */

let shared = null;
/** Biblioteca única: las texturas procedurales se dibujan una vez y se reutilizan entre escenas. */
export function getMaterials() {
  if (!shared) shared = createMaterials();
  return shared;
}

export function createMaterials() {
  const cache = new Map();
  const memo = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };

  const weave = memo('weave', () => texture(weaveCanvas(11), { srgb: false }));
  const speckle = memo('speckle', () => texture(speckleCanvas(5), { srgb: false }));

  const lib = {
    /** Madera con veta. `variant` cambia la semilla para que las piezas no sean idénticas. */
    wood(kind = 'oak', variant = 0, { roughness = 0.58, tint = 0xffffff } = {}) {
      return memo(`wood:${kind}:${variant}:${roughness}:${tint}`, () => {
        const map = memo(`woodmap:${kind}:${variant % 4}`, () => texture(woodCanvas(kind, 100 + (variant % 4) * 17)));
        return new THREE.MeshStandardMaterial({ map, color: tint, roughness, metalness: 0 });
      });
    },
    planks(kind = 'oak') {
      return memo(`planks:${kind}`, () => {
        const map = texture(planksCanvas(kind, 41));
        return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0 });
      });
    },
    fabric(color, { bump = 0.35 } = {}) {
      return memo(`fabric:${color}:${bump}`, () => {
        const map = weave.clone();
        map.repeat.set(1, 1);
        return new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale: bump, roughness: 1, metalness: 0 });
      });
    },
    paint(color, { roughness = 0.92 } = {}) {
      return memo(`paint:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, bumpMap: speckle, bumpScale: 0.08 }));
    },
    plastic(color, { roughness = 0.45 } = {}) {
      return memo(`plastic:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
    },
    metal(color = 0x2b2b30, { roughness = 0.38 } = {}) {
      return memo(`metal:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 1 }));
    },
    glow(color, intensity = 2) {
      return memo(`glow:${color}:${intensity}`, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 }));
    },
    screen(kind = 'daw', intensity = 1) {
      return memo(`screen:${kind}:${intensity}`, () => {
        const c =
          kind === 'movie'
            ? movieCanvas()
            : kind === 'chart'
              ? chartCanvas()
              : kind === 'lecture'
                ? lectureCanvas()
                : dawCanvas(3);
        const map = texture(c, { repeat: false });
        return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: intensity, roughness: 0.95 });
      });
    },
    leaf(color = 0x4f8a57) {
      return memo(`leaf:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, side: THREE.DoubleSide }));
    },
    brick({ painted = false, tint = 0xffffff } = {}) {
      return memo(`brick:${painted}:${tint}`, () => {
        const map = memo(`brickmap:${painted}`, () => texture(brickCanvas(painted ? 29 : 13, { painted })));
        return new THREE.MeshStandardMaterial({ map, color: tint, roughness: painted ? 0.85 : 0.92, metalness: 0, bumpMap: map, bumpScale: 0.14 });
      });
    },
    concrete(color = 0xcfd3d9, { roughness = 0.82 } = {}) {
      return memo(`concrete:${color}:${roughness}`, () => {
        const map = memo('concretemap', () => texture(concreteCanvas(47)));
        return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0, bumpMap: map, bumpScale: 0.09 });
      });
    },
    ceramicTiles(color = 0xffffff, { roughness = 0.22 } = {}) {
      return memo(`ceramic:${color}:${roughness}`, () => {
        const map = memo('ceramicmap', () => texture(ceramicTileCanvas(61)));
        return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.08 });
      });
    },
    glass(color = 0x93c5fd, { opacity = 0.36, roughness = 0.08 } = {}) {
      // Vidrio claro: deja ver el exterior con un velo leve y algo de reflejo
      return memo(`glass:${color}:${opacity}:${roughness}`, () =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.6),
          transparent: true,
          opacity: opacity * 0.42,
          roughness,
          metalness: 0.05,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
    },

    /* --- entorno exterior --- */
    grass(tint = 0xffffff) {
      return memo(`grass:${tint}`, () => {
        const map = memo('grassmap', () => texture(grassCanvas(71)));
        return new THREE.MeshStandardMaterial({ map, color: tint, roughness: 1, metalness: 0, vertexColors: true });
      });
    },
    pavement(tint = 0xffffff) {
      return memo(`pavement:${tint}`, () => {
        const map = memo('pavementmap', () => texture(pavementCanvas(83)));
        return new THREE.MeshStandardMaterial({ map, color: tint, roughness: 0.9, metalness: 0, vertexColors: true });
      });
    },
    /** Follaje mate de árboles y arbustos, al estilo de una maqueta de arquitectura. */
    foliage(color = 0x5f9a54) {
      return memo(`foliage:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }));
    },
    /** Edificio lejano con ventanas; de noche se encienden algunas. */
    facade(variant = 0, { tint = 0xffffff, night = false } = {}) {
      return memo(`facade:${variant}:${tint}:${night}`, () => {
        const map = memo(`facademap:${variant % 3}`, () => texture(facadeCanvas(200 + (variant % 3) * 31)));
        const emissiveMap = night ? memo(`facadelit:${variant % 3}`, () => texture(facadeCanvas(200 + (variant % 3) * 31, true))) : null;
        return new THREE.MeshStandardMaterial({
          map,
          color: tint,
          roughness: 0.7,
          metalness: 0.05,
          emissive: night ? 0xffffff : 0x000000,
          emissiveMap,
          emissiveIntensity: night ? 1.6 : 0,
        });
      });
    },
    blobShadow(opacity = 0.34) {
      return memo(`blob:${opacity}`, () => {
        const map = memo('blobmap', () => texture(blobCanvas(), { repeat: false }));
        return new THREE.MeshBasicMaterial({ map, color: 0x000000, transparent: true, opacity, depthWrite: false, toneMapped: false });
      });
    },
  };
  return lib;
}

/**
 * Reasigna las UV de una geometría tipo caja por proyección planar según la normal dominante,
 * con escala en metros, para que la veta tenga el mismo tamaño en cualquier pieza.
 * `grain` es el eje del mundo local por el que corre la veta.
 */
export function projectUV(geometry, { grain = 'y', along = 1.6, across = 0.55, offset = [0, 0] } = {}) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const axes = ['x', 'y', 'z'];
  const g = axes.indexOf(grain);
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const dom = n.indexOf(Math.max(...n));
    let u;
    let v;
    if (dom === g) {
      // testa de la pieza: se usan los otros dos ejes
      const [a, b] = [0, 1, 2].filter((k) => k !== g);
      u = p[a] / across;
      v = p[b] / across;
    } else {
      const other = [0, 1, 2].find((k) => k !== g && k !== dom);
      u = p[g] / along;
      v = p[other] / across;
    }
    uv[i * 2] = u + offset[0];
    uv[i * 2 + 1] = v + offset[1];
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
