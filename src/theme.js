import { useEffect, useState } from 'react';

// Misma clave que usa la suite, así el tema se comparte entre el sitio y el simulador.
const KEY = 'pozole_theme';

export function initialDark() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === 'dark';
  } catch {
    /* almacenamiento no disponible */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [isDark, setIsDark] = useState(initialDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(KEY, isDark ? 'dark' : 'light');
    } catch {
      /* almacenamiento no disponible */
    }
  }, [isDark]);
  return [isDark, () => setIsDark((d) => !d)];
}
