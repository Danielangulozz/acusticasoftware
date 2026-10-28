import React, { useEffect, useRef } from 'react';

/**
 * Campo de interferencia de fuentes puntuales: p(x, t) = Σ cos(k r_i − ωt) / √r_i.
 * Se calcula a baja resolución y el navegador lo escala suavemente.
 * La fuente principal sigue al cursor; con prefers-reduced-motion se dibuja un solo cuadro.
 */
export default function WaveFieldCanvas({ className = '', dark = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let img = null;
    const scale = 5; // píxeles de pantalla por celda
    const sources = [
      { x: 0.72, y: 0.42, tx: 0.72, ty: 0.42, k: 0.30, a: 1 },
      { x: 0.88, y: 0.78, k: 0.30, a: 0.7 },
      { x: 0.55, y: 0.95, k: 0.30, a: 0.55 },
    ];

    // Paleta: fondo → morado de marca → ámbar en los máximos
    const stops = dark
      ? [
          [0, [8, 8, 12]],
          [0.5, [10, 9, 16]],
          [0.72, [88, 51, 199]],
          [0.93, [168, 120, 250]],
          [1, [242, 184, 75]],
        ]
      : [
          [0, [245, 245, 247]],
          [0.52, [245, 245, 247]],
          [0.76, [228, 221, 252]],
          [0.92, [196, 181, 253]],
          [1, [167, 139, 250]],
        ];
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let j = 0;
      while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const [t0, c0] = stops[j];
      const [t1, c1] = stops[j + 1];
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * u;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(2, Math.ceil(rect.width / scale));
      H = Math.max(2, Math.ceil(rect.height / scale));
      canvas.width = W;
      canvas.height = H;
      img = ctx.createImageData(W, H);
    };
    resize();

    const draw = (time) => {
      const t = time * 0.0032;
      const s0 = sources[0];
      s0.x += (s0.tx - s0.x) * 0.04;
      s0.y += (s0.ty - s0.y) * 0.04;
      const data = img.data;
      const pts = sources.map((s) => ({ x: s.x * W, y: s.y * H, k: s.k, a: s.a }));
      let idx = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let p = 0;
          for (const s of pts) {
            const dx = x - s.x;
            const dy = y - s.y;
            const r = Math.sqrt(dx * dx + dy * dy);
            p += (s.a * Math.cos(s.k * r - t)) / Math.sqrt(1 + r / 18);
          }
          // Atenuación hacia la izquierda para que el texto respire
          const fade = Math.min(1, Math.max(0, (x / W - 0.18) / 0.5));
          const v = Math.max(0, Math.min(255, Math.round((0.5 + p * 0.42 * fade) * 255)));
          data[idx++] = lut[v * 3];
          data[idx++] = lut[v * 3 + 1];
          data[idx++] = lut[v * 3 + 2];
          data[idx++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    let raf = 0;
    let visible = true;
    const loop = (time) => {
      if (visible) draw(time);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        sources[0].tx = x;
        sources[0].ty = y;
      }
    };

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    window.addEventListener('resize', resize);

    if (reduce) {
      draw(0);
    } else {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [dark]);

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: 'auto' }} aria-hidden="true" />;
}
