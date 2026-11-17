import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Ruler, Square } from 'lucide-react';

/**
 * Medidas rápidas — la forma más corta de describir una sala: escribir largo, ancho y alto.
 * El editor de planta de abajo queda para las formas que no son un rectángulo.
 */

const LIMITS = { length: [1, 80], width: [1, 80], height: [2, 30] };
const FIELDS = [
  ['length', 'Largo'],
  ['width', 'Ancho'],
  ['height', 'Alto'],
];

/** Caja envolvente de la planta y si esa planta es exactamente un rectángulo alineado a los ejes. */
function describe(vertices = []) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const onCorner = (v) => (Math.abs(v.x - x0) < 1e-6 || Math.abs(v.x - x1) < 1e-6) && (Math.abs(v.y - y0) < 1e-6 || Math.abs(v.y - y1) < 1e-6);
  return { x0, y0, length: x1 - x0, width: y1 - y0, isRect: vertices.length === 4 && vertices.every(onCorner) };
}

const round = (v) => Math.round(v * 100) / 100;

export default function QuickDimensions({ roomPolygon, onChangePolygon, geometry, onOpenRenders }) {
  const shape = describe(roomPolygon.vertices);
  const curved = Object.values(roomPolygon.curvatures || {}).some((c) => Math.abs(Number(c) || 0) > 1e-6);
  const simple = shape.isRect && !curved;
  const current = { length: round(shape.length), width: round(shape.width), height: round(roomPolygon.height) };
  const [draft, setDraft] = useState(current);

  // Si la planta cambia desde el editor, las casillas se ponen al día
  useEffect(() => {
    setDraft(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.length, current.width, current.height]);

  const valid = (key, value) => Number.isFinite(value) && value >= LIMITS[key][0] && value <= LIMITS[key][1];
  const allValid = FIELDS.every(([key]) => valid(key, Number(draft[key])));

  const apply = (next) => {
    const { length, width, height } = next;
    onChangePolygon({
      vertices: [
        { x: shape.x0, y: shape.y0 },
        { x: shape.x0 + length, y: shape.y0 },
        { x: shape.x0 + length, y: shape.y0 + width },
        { x: shape.x0, y: shape.y0 + width },
      ],
      height,
      curvatures: {},
    });
  };

  const change = (key, raw) => {
    const next = { ...draft, [key]: raw };
    setDraft(next);
    const numbers = { length: Number(next.length), width: Number(next.width), height: Number(next.height) };
    // En una sala rectangular cada cambio válido se aplica al instante
    if (simple && FIELDS.every(([k]) => valid(k, numbers[k]))) apply(numbers);
  };

  return (
    <div className="bg-white dark:bg-surface rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-5 sm:p-6 shadow-apple-sm transition-colors">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div className="space-y-3 min-w-0">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1d1d1f] dark:text-white">
              <Ruler className="w-4 h-4 text-[#5833c7] dark:text-[#a78bfa]" />
              Medidas rápidas
            </h3>
            <p className="text-xs text-[#86868b] dark:text-[#b0b3b8] mt-0.5">
              {simple ? 'Escribe las medidas de tu sala y listo. Si tiene otra forma, dibújala en el editor de abajo.' : 'Tu planta no es un rectángulo: estas son sus medidas máximas. Edítala en el plano de abajo, o cámbiala por un rectángulo.'}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            {FIELDS.map(([key, label], i) => (
              <React.Fragment key={key}>
                {i > 0 && <span className="pb-2.5 text-[#86868b] dark:text-[#8a8d91] font-mono">×</span>}
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-[#86868b] dark:text-[#b0b3b8]">{label}</span>
                  <span className="relative block">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={LIMITS[key][0]}
                      max={LIMITS[key][1]}
                      step="0.1"
                      value={draft[key]}
                      onChange={(e) => change(key, e.target.value)}
                      aria-invalid={!valid(key, Number(draft[key]))}
                      className={`apple-input w-28 pl-3 pr-8 py-2 text-base font-mono font-semibold ${valid(key, Number(draft[key])) ? '' : 'border-rose-400 dark:border-rose-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#86868b] dark:text-[#8a8d91] pointer-events-none">m</span>
                  </span>
                </label>
              </React.Fragment>
            ))}
            {!simple && (
              <button
                type="button"
                disabled={!allValid}
                onClick={() => apply({ length: Number(draft.length), width: Number(draft.width), height: Number(draft.height) })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#5833c7]/30 text-[#5833c7] dark:text-[#c4b5fd] text-xs font-bold hover:bg-[#5833c7]/10 disabled:opacity-40 transition"
              >
                <Square className="w-3.5 h-3.5" /> Usar un rectángulo con estas medidas
              </button>
            )}
          </div>
          {!allValid && <p className="text-[11px] text-rose-600 dark:text-rose-400">Usa valores entre {LIMITS.length[0]} y {LIMITS.length[1]} m para la planta, y entre {LIMITS.height[0]} y {LIMITS.height[1]} m para la altura.</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {[
            ['Volumen', `${geometry.volume.toFixed(1)} m³`],
            ['Área de piso', `${(geometry.floorArea ?? 0).toFixed(1)} m²`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#fbfbfd] dark:bg-surface2 border border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-[#b0b3b8]">{label}</div>
              <div className="font-mono text-sm font-bold text-[#1d1d1f] dark:text-white mt-0.5">{value}</div>
            </div>
          ))}
          {onOpenRenders && (
            <button
              type="button"
              onClick={onOpenRenders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#5833c7]/10 dark:bg-[#5833c7]/20 text-[#5833c7] dark:text-[#c4b5fd] text-xs font-bold hover:bg-[#5833c7]/20 transition"
              title="Abre el Estudio de renders; allí puedes usar estas mismas medidas"
            >
              <ImageIcon className="w-4 h-4" /> Verla en un render
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
