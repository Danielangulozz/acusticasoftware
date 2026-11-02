import { useEffect, useState } from 'react';

/**
 * Enrutador mínimo basado en History API (Vercel ya reescribe todo a index.html).
 *   /           → sitio de POZOLE ACUSTIC
 *   /suite      → simulador de recintos
 *   /difusores  → laboratorio de difusores
 */
const listeners = new Set();

export function navigate(path, { hash } = {}) {
  const targetUrl = path + (hash ? `#${hash}` : '');
  const currentUrl = window.location.pathname + window.location.hash;
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', targetUrl);
    listeners.forEach((fn) => fn(path));
    window.scrollTo({ top: 0 });
  } else if (currentUrl !== targetUrl) {
    window.history.pushState({}, '', targetUrl);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  if (hash) {
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }));
  }
}

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');
  useEffect(() => {
    const update = () => setPath(window.location.pathname.replace(/\/+$/, '') || '/');
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return path;
}

/** Props para un <a> que navega sin recargar la página. */
export function linkProps(path, hash) {
  return {
    href: path + (hash ? `#${hash}` : ''),
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(path, { hash });
    },
  };
}
