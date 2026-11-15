import React, { Suspense, lazy, useEffect } from 'react';
import { useRoute } from './router';
import LandingPage from './site/LandingPage';
import { BrandGlyph } from './site/BrandMark';

const SuiteApp = lazy(() => import('./App.jsx'));

const TITLES = {
  '/': 'POZOLE ACÚSTICA — Diseño acústico de recintos',
  '/suite': 'POZOLE Suite — Simulador de acústica de recintos',
};

// Pantalla de carga: el isotipo con el vapor (ondas de sonido) animado
function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas" role="status" aria-label="Cargando POZOLE Suite">
      <div className="flex flex-col items-center gap-4">
        <svg width="84" height="84" viewBox="4 3 32 32" aria-hidden="true">
          <BrandGlyph steamClassName="pz-steam" />
        </svg>
        <span className="font-mono text-[11px] tracking-[0.3em] text-ink/45">POZOLE SUITE</span>
      </div>
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
