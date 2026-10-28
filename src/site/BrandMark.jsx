import React from 'react';

// Isotipo: un período de difusor QRD con p = 7 (s_n = n² mod 7 → 0 1 4 2 2 4 1).
const QRD7 = [0, 1, 4, 2, 2, 4, 1];

export function BrandMark({ size = 32, className = '' }) {
  const bar = 4;
  const gap = 2;
  const x0 = (40 - (QRD7.length * bar + (QRD7.length - 1) * gap)) / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pzMarkGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8767f9" />
          <stop offset="100%" stopColor="#f2b84b" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="#111118" stroke="rgba(255,255,255,0.12)" />
      {QRD7.map((s, i) => {
        const h = 6 + s * 5;
        return (
          <rect key={i} x={x0 + i * (bar + gap)} y={31 - h} width={bar} height={h} rx="1" fill="url(#pzMarkGrad)" />
        );
      })}
    </svg>
  );
}

export function BrandLockup({ size = 30, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className="leading-none">
        <span className="block font-display font-extrabold tracking-[0.08em] text-[15px] text-ink">POZOLE</span>
        <span className="block font-mono text-[9px] tracking-[0.42em] text-ink/50 mt-1">ACUSTIC</span>
      </span>
    </span>
  );
}

export default BrandMark;
