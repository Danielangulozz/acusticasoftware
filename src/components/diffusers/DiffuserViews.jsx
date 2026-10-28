import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { surfaceElements } from '../../utils/diffuserCalculations';

/** Paleta según el tema de la suite (atributos SVG explícitos para que el SVG exportado conserve el color). */
export function diffuserPalette(isDark) {
  return isDark
    ? { purple: '#8767f9', amber: '#f2b84b', fin: '#d9d9e3', back: '#2b2b38', bg: '#121322', grid: 'rgba(255,255,255,0.08)', axis: 'rgba(255,255,255,0.25)', text: 'rgba(255,255,255,0.6)', flat: 'rgba(255,255,255,0.55)' }
    : { purple: '#5833c7', amber: '#d4890f', fin: '#3a3a48', back: '#c9c9d3', bg: '#fbfbfd', grid: 'rgba(0,0,0,0.08)', axis: 'rgba(0,0,0,0.25)', text: 'rgba(0,0,0,0.55)', flat: 'rgba(0,0,0,0.45)' };
}

/* ------------------------------------------------------------------------ */
/* Corte en sección (perfil 1D)                                             */
/* ------------------------------------------------------------------------ */

export const ProfileView = forwardRef(function ProfileView({ design, isDark, row = 0 }, ref) {
  const c = diffuserPalette(isDark);
  const els = useMemo(() => surfaceElements(design, { row }), [design, row]);
  const total = design.totalWidth;
  const D = design.maxDepth || 0.01;
  const back = Math.max(0.012, D * 0.08);
  const pad = total * 0.04;
  const vbW = total + pad * 2;
  const vbH = Math.max(D + back + pad * 3.2, total * 0.18);
  const x0 = -total / 2 - pad;
  const yTop = pad * 1.6;
  const sw = total / 600;
  const fontSize = vbW / 60;

  const isPoly = design.type === 'poly';
  const polyPath = isPoly ? els.map((e, i) => `${i ? 'L' : 'M'}${e.x} ${yTop + e.d}`).join(' ') : '';

  return (
    <svg ref={ref} viewBox={`${x0} 0 ${vbW} ${vbH}`} className="w-full h-auto block" role="img" aria-label="Corte en sección del difusor" xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y="0" width={vbW} height={vbH} fill={c.bg} />
      <rect x={-total / 2} y={yTop + D} width={total} height={back} fill={c.back} />

      {isPoly ? (
        <path d={`${polyPath} L${total / 2} ${yTop + D} L${-total / 2} ${yTop + D} Z`} fill={c.purple} fillOpacity="0.3" stroke={c.amber} strokeWidth={sw * 2} />
      ) : (
        els.map((e, i) =>
          e.well ? (
            <g key={i}>
              <rect x={e.x - e.w / 2} y={yTop + e.d} width={e.w} height={Math.max(0, D - e.d)} fill={c.purple} fillOpacity={0.25 + (0.5 * (D - e.d)) / D} />
              <line x1={e.x - e.w / 2} x2={e.x + e.w / 2} y1={yTop + e.d} y2={yTop + e.d} stroke={c.amber} strokeWidth={sw * 2} />
            </g>
          ) : (
            <rect key={i} x={e.x - e.w / 2} y={yTop} width={Math.max(e.w, sw * 1.5)} height={D} fill={c.fin} />
          )
        )
      )}

      {/* Cotas */}
      <g stroke={c.text} strokeWidth={sw}>
        <line x1={total / 2 + pad * 0.45} x2={total / 2 + pad * 0.45} y1={yTop} y2={yTop + D} />
        <line x1={total / 2 + pad * 0.25} x2={total / 2 + pad * 0.65} y1={yTop} y2={yTop} />
        <line x1={total / 2 + pad * 0.25} x2={total / 2 + pad * 0.65} y1={yTop + D} y2={yTop + D} />
        <line x1={-total / 2} x2={total / 2} y1={yTop * 0.45} y2={yTop * 0.45} />
        <line x1={-total / 2} x2={-total / 2} y1={yTop * 0.25} y2={yTop * 0.65} />
        <line x1={total / 2} x2={total / 2} y1={yTop * 0.25} y2={yTop * 0.65} />
      </g>
      <text x="0" y={yTop * 0.45 - fontSize * 0.4} textAnchor="middle" fill={c.text} fontSize={fontSize} fontFamily="JetBrains Mono, monospace">
        {(total * 100).toFixed(1)} cm
      </text>
      <text x={total / 2 + pad * 0.6} y={yTop + D + back + fontSize * 1.4} textAnchor="end" fill={c.text} fontSize={fontSize} fontFamily="JetBrains Mono, monospace">
        d máx {(D * 100).toFixed(1)} cm
      </text>
    </svg>
  );
});

/* ------------------------------------------------------------------------ */
/* Vista isométrica 3D (cajas extruidas, algoritmo del pintor)              */
/* ------------------------------------------------------------------------ */

function buildBoxes(design) {
  const D = design.maxDepth;
  const boxes = [];
  if (design.type === 'qrd2d') {
    const pitch = design.W + design.T;
    const grid = design.depths2D;
    const p = grid.length;
    for (let pm = 0; pm < design.periods; pm++)
      for (let pn = 0; pn < design.periods; pn++)
        for (let m = 0; m < p; m++)
          for (let n = 0; n < p; n++) {
            const x = (pn * p + n) * pitch;
            const y = (pm * p + m) * pitch;
            boxes.push({ x0: x + design.T / 2, x1: x + pitch - design.T / 2, y0: y + design.T / 2, y1: y + pitch - design.T / 2, h: D - grid[m][n] + D * 0.04 });
          }
    return boxes;
  }
  const L = design.totalDepth || 0.6;
  const els = surfaceElements(design);
  const minX = Math.min(...els.map((e) => e.x - e.w / 2));
  els.forEach((e) => {
    const x0 = e.x - e.w / 2 - minX;
    const h = design.type === 'poly' ? D - e.d + D * 0.05 : e.well ? D - e.d + D * 0.04 : D + D * 0.04;
    boxes.push({ x0, x1: x0 + e.w, y0: 0, y1: L, h, fin: !e.well && design.type !== 'poly' });
  });
  return boxes;
}

export function IsoView({ design, isDark }) {
  const c = diffuserPalette(isDark);
  const { polys, vb } = useMemo(() => {
    const boxes = buildBoxes(design);
    const C = Math.cos(Math.PI / 6);
    const S = Math.sin(Math.PI / 6);
    const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
    const D = design.maxDepth;
    const out = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const track = (pts) => pts.forEach(([a, b]) => {
      minX = Math.min(minX, a); maxX = Math.max(maxX, a);
      minY = Math.min(minY, b); maxY = Math.max(maxY, b);
    });

    [...boxes].sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0) || a.x0 - b.x0).forEach((b) => {
      const t = Math.min(1, Math.max(0, b.h / (D * 1.05)));
      const top = [P(b.x0, b.y0, b.h), P(b.x1, b.y0, b.h), P(b.x1, b.y1, b.h), P(b.x0, b.y1, b.h)];
      const right = [P(b.x1, b.y0, 0), P(b.x1, b.y1, 0), P(b.x1, b.y1, b.h), P(b.x1, b.y0, b.h)];
      const front = [P(b.x0, b.y1, 0), P(b.x1, b.y1, 0), P(b.x1, b.y1, b.h), P(b.x0, b.y1, b.h)];
      track(top); track(right); track(front);
      const topColor = b.fin ? (isDark ? '#e4e4ee' : '#d8d8e2') : mix(c.purple, c.amber, t);
      out.push({ pts: right, fill: shade(topColor, 0.55) });
      out.push({ pts: front, fill: shade(topColor, 0.72) });
      out.push({ pts: top, fill: topColor });
    });
    const padX = (maxX - minX) * 0.04;
    const padY = (maxY - minY) * 0.06;
    return { polys: out, vb: `${minX - padX} ${minY - padY} ${maxX - minX + 2 * padX} ${maxY - minY + 2 * padY}` };
  }, [design, isDark, c.purple, c.amber]);

  return (
    <svg viewBox={vb} className="w-full h-auto max-h-[420px] block" role="img" aria-label="Vista isométrica del difusor">
      {polys.map((p, i) => (
        <polygon key={i} points={p.pts.map((q) => q.join(',')).join(' ')} fill={p.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.0015" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function shade(rgb, k) {
  const nums = rgb.startsWith('#') ? hexToRgb(rgb) : rgb.match(/\d+/g).map(Number);
  return `rgb(${nums.map((v) => Math.round(v * k)).join(',')})`;
}

/* ------------------------------------------------------------------------ */
/* Diagrama polar (semicírculo, dB normalizados)                            */
/* ------------------------------------------------------------------------ */

export function PolarPlot({ angles, diffuser, flat, isDark, range = 30, incidence = 0 }) {
  const c = diffuserPalette(isDark);
  const R = 150;
  const cx = 170;
  const cy = 170;
  const max = Math.max(...diffuser, ...flat, 1e-12);
  const toPath = (vals) =>
    vals
      .map((I, i) => {
        const db = 10 * Math.log10(Math.max(I / max, 1e-12));
        const r = R * Math.max(0, 1 + db / range);
        const th = (angles[i] * Math.PI) / 180;
        return `${i ? 'L' : 'M'}${(cx + r * Math.sin(th)).toFixed(2)} ${(cy - r * Math.cos(th)).toFixed(2)}`;
      })
      .join(' ');
  const inc = (incidence * Math.PI) / 180;

  return (
    <svg viewBox="0 0 340 196" className="w-full h-auto block" role="img" aria-label="Respuesta polar del difusor frente a superficie plana">
      {[0, 10, 20].filter((d) => d < range).map((d) => {
        const r = R * (1 - d / range);
        return (
          <g key={d}>
            <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={c.grid} />
            <text x={cx + 3} y={cy - r + 10} fill={c.text} fontSize="8" fontFamily="JetBrains Mono">−{d} dB</text>
          </g>
        );
      })}
      {[-90, -60, -30, 0, 30, 60, 90].map((a) => {
        const t = (a * Math.PI) / 180;
        return (
          <g key={a}>
            <line x1={cx} y1={cy} x2={cx + R * Math.sin(t)} y2={cy - R * Math.cos(t)} stroke={c.grid} />
            <text x={cx + (R + 10) * Math.sin(t)} y={cy - (R + 10) * Math.cos(t) + 3} textAnchor="middle" fill={c.text} fontSize="8" fontFamily="JetBrains Mono">{a}°</text>
          </g>
        );
      })}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={c.axis} />
      <line x1={cx + R * 0.95 * Math.sin(inc)} y1={cy - R * 0.95 * Math.cos(inc)} x2={cx} y2={cy} stroke={c.axis} strokeDasharray="2 3" />
      <path d={toPath(flat)} fill="none" stroke={c.flat} strokeWidth="1.2" strokeDasharray="3 3" />
      <path d={toPath(diffuser)} fill={`${c.amber}22`} stroke={c.amber} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------------ */
/* Mapa hemisférico (QRD 2D)                                                */
/* ------------------------------------------------------------------------ */

export function HemisphereMap({ map, isDark }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !map) return;
    const stops = isDark
      ? [[0, [18, 19, 34]], [0.45, [60, 35, 140]], [0.75, [135, 103, 249]], [1, [242, 184, 75]]]
      : [[0, [245, 245, 250]], [0.45, [196, 181, 253]], [0.75, [88, 51, 199]], [1, [212, 137, 15]]];
    const n = map.length;
    canvas.width = n;
    canvas.height = n;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(n, n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = map[i][j];
        const k = (i * n + j) * 4;
        if (v === null) continue;
        const db = Math.max(0, 1 + (10 * Math.log10(Math.max(v, 1e-6))) / 30);
        const [r, g, b] = ramp(stops, db);
        img.data[k] = r;
        img.data[k + 1] = g;
        img.data[k + 2] = b;
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }, [map, isDark]);
  return <canvas ref={ref} className="w-full aspect-square rounded-full" aria-label="Mapa hemisférico de energía dispersada" />;
}

function ramp(stops, t) {
  let j = 0;
  while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
  const [t0, c0] = stops[j];
  const [t1, c1] = stops[j + 1];
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return c0.map((v, i) => Math.round(v + (c1[i] - v) * u));
}
