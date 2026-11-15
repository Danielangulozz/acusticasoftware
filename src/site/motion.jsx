import React, { useEffect, useRef, useState } from 'react';

/**
 * Animaciones de la página principal ligadas al scroll.
 * Todo respeta `prefers-reduced-motion`: con esa preferencia el contenido aparece ya en
 * su estado final y no hay desplazamientos.
 */

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Un único listener de scroll para toda la página; cada suscriptor se llama una vez por cuadro. */
const subscribers = new Set();
let ticking = false;
function schedule() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    subscribers.forEach((fn) => fn());
  });
}
export function onScrollFrame(fn) {
  if (subscribers.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  subscribers.add(fn);
  fn();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    }
  };
}

/** `true` desde la primera vez que el elemento entra en pantalla. */
export function useInView({ margin = '0px 0px -10% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, once]);
  return [ref, inView];
}

/**
 * Aparece al entrar en pantalla. `variant`: up (por defecto) · left · right · scale · blur.
 * Usa las propiedades CSS `translate` y `scale`, así no choca con los `transform` de hover.
 */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', children, ...rest }) {
  const [ref, shown] = useInView();
  return (
    <Tag ref={ref} data-variant={variant} className={`pz-reveal ${shown ? 'pz-reveal-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/** Texto que entra palabra por palabra (para titulares al cargar la página). */
export function Words({ text, start = 0, step = 70, className = '' }) {
  return text.split(' ').map((word, i) => (
    <React.Fragment key={`${word}-${i}`}>
      <span className={`pz-word ${className}`} style={{ animationDelay: `${start + i * step}ms` }}>
        {word}
      </span>{' '}
    </React.Fragment>
  ));
}

/** Número que cuenta desde `from` hasta `value` la primera vez que se ve. */
export function CountUp({ value, from = 0, decimals = 2, duration = 1500, className = '' }) {
  const [ref, inView] = useInView({ margin: '0px 0px -15% 0px' });
  const [shown, setShown] = useState(prefersReducedMotion() ? value : from);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) {
      if (inView) setShown(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, from, duration]);

  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals).replace('.', ',')}
    </span>
  );
}

/**
 * Desplaza su contenido a otra velocidad que el scroll. `speed` > 0 lo retrasa (parece más
 * lejano); < 0 lo adelanta. El avance va de −1 (entrando por abajo) a 1 (saliendo por arriba).
 */
export function Parallax({ speed = 0.12, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    return onScrollFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      el.style.translate = `0 ${(progress * speed * 100).toFixed(1)}px`;
    });
  }, [speed]);
  return (
    <div ref={ref} className={`will-change-transform ${className}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * Avance (0 – 1) de una sección mientras cruza la pantalla. Escribe la variable CSS
 * `--pz-progress` en el elemento y devuelve cuántos de `steps` pasos ya se alcanzaron.
 */
export function useScrollSteps(steps, { start = 0.78, end = 0.42 } = {}) {
  const ref = useRef(null);
  const [reached, setReached] = useState(prefersReducedMotion() ? steps : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      el?.style.setProperty('--pz-progress', '1');
      return undefined;
    }
    return onScrollFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const from = vh * start;
      const to = vh * end - rect.height;
      const p = Math.min(1, Math.max(0, (from - rect.top) / (from - to)));
      el.style.setProperty('--pz-progress', p.toFixed(3));
      setReached(Math.min(steps, Math.floor(p * steps + 0.35)));
    });
  }, [steps, start, end]);
  return [ref, reached];
}

/** Línea fina de progreso de lectura, pegada arriba. */
export function ScrollProgressBar() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    return onScrollFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.scale = `${max > 0 ? Math.min(1, window.scrollY / max) : 0} 1`;
    });
  }, []);
  return <div ref={ref} className="absolute left-0 right-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-brand via-brand to-accent" style={{ scale: '0 1' }} aria-hidden="true" />;
}
