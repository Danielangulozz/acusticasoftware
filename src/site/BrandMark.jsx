import React from 'react';
import { BRAND } from './siteConfig';

/**
 * Isotipo de POZOLE ACÚSTICA: una cazuela de pozole (caldo rojo y granos de maíz) cuyo
 * vapor sube como barras de sonido. Las alturas no son al azar: son el perfil de un
 * difusor QRD con p = 7 (sₙ = n² mod 7 → 0 1 4 2 2 4 1), el producto insignia de la casa.
 */
const QRD7 = [0, 1, 4, 2, 2, 4, 1];
const BAR = 2.2;
const GAP = 1;
const BASE_Y = 19.4;

export function BrandGlyph({ steamClassName = '' }) {
  return (
    <>
      <defs>
        <linearGradient id="pzBowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7cc6d" />
          <stop offset="1" stopColor="#d6842a" />
        </linearGradient>
        <linearGradient id="pzWave" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#8767f9" />
          <stop offset="1" stopColor="#cfc0ff" />
        </linearGradient>
      </defs>
      {/* Vapor = barras con el perfil QRD */}
      {QRD7.map((s, i) => {
        const h = 2.6 + s * 3.05;
        return (
          <rect
            key={i}
            className={steamClassName}
            style={steamClassName ? { animationDelay: `${i * 90}ms` } : undefined}
            x={9.3 + i * (BAR + GAP)}
            y={BASE_Y - h}
            width={BAR}
            height={h}
            rx="1.1"
            fill="url(#pzWave)"
          />
        );
      })}
      {/* Cazuela */}
      <path d="M8.5 22.5 H31.5 C31.5 29.2 26.6 33.2 20 33.2 C13.4 33.2 8.5 29.2 8.5 22.5 Z" fill="url(#pzBowl)" />
      {/* Caldo y granos de maíz */}
      <ellipse cx="20" cy="22.5" rx="11.5" ry="2.15" fill="#8f2f24" />
      <circle cx="15.8" cy="22.35" r="1.05" fill="#fff1d0" />
      <circle cx="20.2" cy="22.95" r="1.05" fill="#fff1d0" />
      <circle cx="24.3" cy="22.3" r="1.05" fill="#fff1d0" />
    </>
  );
}

export function BrandMark({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="#111118" stroke="rgba(255,255,255,0.12)" />
      <BrandGlyph />
    </svg>
  );
}

export function BrandLockup({ size = 30, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className="leading-none">
        <span className="block font-display font-extrabold tracking-[0.08em] text-[15px] text-ink">{BRAND.name}</span>
        <span className="block font-mono text-[9px] tracking-[0.34em] text-ink/50 mt-1">{BRAND.suffix}</span>
      </span>
    </span>
  );
}

export default BrandMark;
