import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import RenderViewport from '../../render/RenderViewport';
import { defaultViewFor } from '../../render/scenes';

const WOODS = [
  ['oak', 'Roble'],
  ['walnut', 'Nogal'],
  ['birch', 'Abedul'],
];

/**
 * Render 3D del difusor que se está diseñando: se reconstruye con cada cambio de parámetros
 * (secuencia, profundidades, anchos y períodos reales). Se puede girar y descargar.
 */
export default function DiffuserRender({ design }) {
  const viewport = useRef(null);
  const [wood, setWood] = useState('oak');
  const [busy, setBusy] = useState(false);

  // Se espera un instante tras el último cambio para no reconstruir en cada paso del deslizador
  const [settled, setSettled] = useState(design);
  useEffect(() => {
    const t = setTimeout(() => setSettled(design), 220);
    return () => clearTimeout(t);
  }, [design]);

  const spec = useMemo(() => ({ kind: 'diffuser', design: settled, wood }), [settled, wood]);
  const home = useMemo(() => defaultViewFor({ kind: 'diffuser', design: settled }), [settled.type]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(home);
  useEffect(() => setView(home), [home]);

  if (!settled.validWidth) {
    return <p className="p-6 text-sm text-center text-[#86868b] dark:text-[#b0b3b8]">Ajusta la banda de frecuencias: con estos valores el ancho de ranura no es fabricable.</p>;
  }

  const download = async () => {
    setBusy(true);
    try {
      const blob = await viewport.current.renderFinal({ width: 1600, height: 1200, samples: 180 });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `difusor-${settled.type}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <RenderViewport ref={viewport} spec={spec} view={view} onViewChange={setView} previewMax={860} previewSamples={64} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        <div className="inline-flex p-1 rounded-xl bg-[#f5f5f7] dark:bg-surface2 text-xs font-semibold">
          {WOODS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setWood(id)}
              className={`px-2.5 py-1 rounded-lg transition ${wood === id ? 'bg-white dark:bg-[#3a3b3c] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b] dark:text-[#b0b3b8] hover:text-[#1d1d1f] dark:hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView(home)}
            className="inline-flex items-center gap-1.5 text-xs rounded-xl border border-black/[0.08] dark:border-white/10 text-[#1d1d1f] dark:text-[#e4e6eb] px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Vista inicial
          </button>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs rounded-xl bg-[#5833c7] hover:bg-[#4a2bb0] disabled:opacity-60 text-white font-semibold px-3 py-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> {busy ? 'Renderizando…' : 'Descargar PNG'}
          </button>
        </div>
      </div>
    </div>
  );
}
