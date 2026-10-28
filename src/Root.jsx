import React, { Suspense, lazy, useEffect } from 'react';
import { useRoute } from './router';
import LandingPage from './site/LandingPage';

const SuiteApp = lazy(() => import('./App.jsx'));

const TITLES = {
  '/': 'POZOLE ACOUSTIC — Diseño acústico de recintos',
  '/suite': 'POZOLE Suite — Simulador de acústica de recintos',
};

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas text-ink/50 font-mono text-xs tracking-widest">
      CARGANDO…
    </div>
  );
}

export default function Root() {
  const path = useRoute();
  // /difusores se mantiene como atajo: abre la suite directamente en el módulo de difusores
  const isSuite = path === '/suite' || path === '/difusores';

  useEffect(() => {
    document.title = TITLES[isSuite ? '/suite' : '/'];
  }, [isSuite]);

  return (
    <Suspense fallback={<Loading />}>
      {isSuite ? <SuiteApp initialSection={path === '/difusores' ? 'diffusers' : undefined} /> : <LandingPage />}
    </Suspense>
  );
}
