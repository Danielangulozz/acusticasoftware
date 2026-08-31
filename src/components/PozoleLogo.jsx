import React from 'react';

/**
 * PozoleLogo Component
 * Representación del tazón acústico y ondas de propagación sonora
 */
export const PozoleLogo = ({ size = 64, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Fondo estilizado con gradiente */}
    <defs>
      <linearGradient id="pozoleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>

    {/* Marco del recinto acústico / Cuadrícula isométrica de fondo */}
    <rect x="25" y="25" width="150" height="150" rx="28" fill="#0f172a" stroke="#334155" strokeWidth="3" />
    
    {/* Líneas de reflexión / Malla de sala */}
    <path d="M25 60 L175 60" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />
    <path d="M25 140 L175 140" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />
    <path d="M60 25 L60 175" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />
    <path d="M140 25 L140 175" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />

    {/* Ondas sonoras / Campo Reverberado (simulando vapor de Pozole) */}
    <path
      d="M80 75 C 80 55, 120 55, 120 35"
      stroke="url(#pozoleGrad)"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M60 85 C 60 65, 95 65, 95 45"
      stroke="url(#pozoleGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M105 85 C 105 65, 140 65, 140 45"
      stroke="url(#pozoleGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.7"
    />

    {/* Tazón Acústico / Fuente puntual en el centro */}
    {/* Base del tazón */}
    <path
      d="M50 100 C 50 145, 150 145, 150 100 Z"
      fill="url(#bowlGrad)"
      stroke="url(#pozoleGrad)"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    
    {/* Borde superior del tazón / Boca de la sala */}
    <ellipse cx="100" cy="100" rx="50" ry="14" fill="#1e293b" stroke="url(#pozoleGrad)" strokeWidth="3.5" />
    
    {/* Fuente puntual omnidireccional (Grano de maíz / Transductor) */}
    <circle cx="100" cy="100" r="6" fill="#38bdf8" />
    <circle cx="100" cy="100" r="16" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
    
    {/* Ondas de choque laterales */}
    <path d="M40 95 A 65 65 0 0 1 40 115" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <path d="M160 95 A 65 65 0 0 0 160 115" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

    {/* Base de soporte del tazón */}
    <path d="M85 140 L115 140" stroke="url(#pozoleGrad)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default PozoleLogo;
