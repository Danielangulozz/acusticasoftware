import React, { useEffect, useState } from 'react';

/**
 * Render conceptual generado por tools/render-lab (public/renders/<name>.webp, con canal alfa).
 * Con `themed`, el tema oscuro usa la versión nocturna (<name>-noche.webp) y el cambio de
 * tema hace un fundido: la segunda imagen solo se descarga la primera vez que se necesita.
 */
export default function Render({ name, alt, isDark = false, themed = false, eager = false, className = '', imgClassName = '' }) {
  const active = themed && isDark ? `${name}-noche` : name;
  const [seen, setSeen] = useState([active]);

  useEffect(() => {
    setSeen((prev) => (prev.includes(active) ? prev : [...prev, active]));
  }, [active]);

  // El contenedor debe estar posicionado para apilar las dos variantes; si quien lo usa ya
  // lo posiciona en absoluto, no se le añade `relative` (ambas clases chocarían).
  const positioned = /\b(absolute|fixed)\b/.test(className);

  return (
    <div className={`${positioned ? '' : 'relative'} ${className}`}>
      {seen.map((variant) => (
        <img
          key={variant}
          src={`/renders/${variant}.webp`}
          alt={variant === active ? alt : ''}
          aria-hidden={variant === active ? undefined : true}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          className={`${variant === seen[0] ? 'relative' : 'absolute inset-0'} w-full h-full object-contain select-none transition-opacity duration-700 ${
            variant === active ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ))}
    </div>
  );
}

export function RenderTag({ className = '' }) {
  return (
    <span className={`text-[12px] text-ink/70 ${className}`}>
      Render conceptual
    </span>
  );
}
