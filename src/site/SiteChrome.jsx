import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Compass, Menu, Moon, Sun, X } from 'lucide-react';
import { BrandLockup, BrandMark } from './BrandMark';
import { linkProps } from '../router';
import { BRAND } from './siteConfig';
import { ScrollProgressBar } from './motion';

// Menú agrupado: pocas entradas arriba y el detalle en desplegables, como un sitio de producto
const NAV = [
  {
    label: 'Servicios',
    items: [
      { label: 'Qué hacemos', note: 'Medición, simulación, diseño e instalación', hash: 'servicios' },
      { label: 'Tratamientos', note: 'Paneles, trampas de graves, nubes y difusores', hash: 'tratamientos' },
      { label: 'Espacios', note: 'Estudios, auditorios, aulas y restaurantes', hash: 'espacios' },
    ],
  },
  { label: 'Resultados', hash: 'antes-despues' },
  {
    label: 'Empresa',
    items: [
      { label: 'Cómo trabajamos', note: 'Del diagnóstico a la sala terminada', hash: 'proceso' },
      { label: 'Planes', note: 'Paquetes según el tamaño del proyecto', hash: 'planes' },
      { label: 'Equipo', note: 'Quiénes estamos detrás', hash: 'equipo' },
      { label: 'Contacto', note: 'Cuéntanos de tu espacio', hash: 'contacto' },
    ],
  },
  {
    label: 'Simulador',
    items: [
      { label: 'Abrir POZOLE Suite', note: 'Reverberación, modos, inteligibilidad y renders', path: '/suite' },
      { label: 'Calculadora rápida', note: 'Estima la reverberación de tu sala aquí mismo', hash: 'software' },
      { label: 'Diseño de difusores', note: 'QRD, PRD y MLS con planos de corte', path: '/suite', hash: 'diffusers' },
    ],
  },
];

const hrefOf = (item) => linkProps(item.path ?? '/', item.hash);

export function SiteNav({ isDark, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // menú móvil
  const [menu, setMenu] = useState(null); // desplegable de escritorio abierto
  const navRef = useRef(null);
  const closeTimer = useRef(0);
  const hoverAt = useRef(0);

  useEffect(() => {
    // Sobre la portada el menú es transparente; al bajar (pasada casi toda la foto) toma fondo
    const onScroll = () => setScrolled(window.scrollY > Math.max(40, window.innerHeight * 0.72));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenu(null);
    const onDown = (e) => !navRef.current?.contains(e.target) && setMenu(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [menu]);

  const overHero = !scrolled && !open;
  const tone = overHero ? 'text-white' : 'text-ink';
  const soft = overHero ? 'hover:bg-white/15' : 'hover:bg-ink/[0.07]';
  const pressed = overHero ? 'bg-white/20' : 'bg-ink/[0.09]';
  const circle = overHero
    ? 'bg-white/10 border-white/15 hover:bg-white/20 text-white'
    : 'bg-ink/[0.05] border-ink/10 hover:bg-ink/[0.1] text-ink';

  const enter = (label) => {
    window.clearTimeout(closeTimer.current);
    hoverAt.current = Date.now();
    setMenu(label);
  };
  const leave = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(null), 160);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${overHero ? 'bg-gradient-to-b from-black/45 to-transparent' : 'bg-canvas/85 backdrop-blur-xl border-b border-ink/[0.08]'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center gap-8">
        <a {...linkProps('/')} className={`shrink-0 inline-flex items-center gap-3 ${tone}`} aria-label={`${BRAND.full}, inicio`}>
          <BrandMark size={28} />
          <span className="text-[17px] font-semibold tracking-[0.34em] leading-none">{BRAND.name}</span>
          <span className={`hidden sm:inline text-[10px] font-medium tracking-[0.34em] leading-none ${overHero ? 'text-white/60' : 'text-ink/65'}`}>
            {BRAND.suffix}
          </span>
        </a>

        <nav ref={navRef} className={`hidden lg:flex items-center gap-1 text-[15px] font-medium ${tone}`} aria-label="Principal">
          {NAV.map((group) =>
            group.items ? (
              <div key={group.label} className="relative" onMouseEnter={() => enter(group.label)} onMouseLeave={leave}>
                <button
                  type="button"
                  // Con mouse el desplegable ya se abrió al pasar por encima: ese primer clic no lo cierra
                  onClick={() => setMenu((m) => (m === group.label && Date.now() - hoverAt.current > 450 ? null : group.label))}
                  aria-expanded={menu === group.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${menu === group.label ? pressed : soft}`}
                >
                  {group.label}
                  <ChevronDown className={`w-4 h-4 opacity-80 transition-transform ${menu === group.label ? 'rotate-180' : ''}`} />
                </button>
                {menu === group.label && (
                  <div className="absolute left-0 top-full pt-2 w-[330px]">
                    <div className="rounded-xl border border-white/10 bg-[#121218]/95 backdrop-blur-xl p-2 shadow-2xl shadow-black/40">
                      {group.items.map((item) => (
                        <a
                          key={item.label}
                          {...hrefOf(item)}
                          onClickCapture={() => setMenu(null)}
                          className="block rounded-lg px-3.5 py-2.5 hover:bg-white/[0.08] transition-colors"
                        >
                          <span className="block text-[14px] font-medium text-white">{item.label}</span>
                          <span className="block text-[12.5px] text-white/55 mt-0.5">{item.note}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a key={group.label} {...hrefOf(group)} className={`px-3 py-2 rounded-md transition-colors ${soft}`}>
                {group.label}
              </a>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <a
            {...linkProps('/', 'contacto')}
            className={`hidden md:inline-flex items-center gap-1.5 text-[14px] font-medium rounded-full px-4 py-2 transition-all duration-300 bg-brand text-white hover:bg-brand/90 ${overHero ? 'opacity-0 pointer-events-none translate-y-1' : 'opacity-100'
              }`}
            tabIndex={overHero ? -1 : 0}
          >
            Cotizar
            <ArrowUpRight className="w-4 h-4" />
          </a>
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`w-10 h-10 grid place-items-center rounded-full border transition-colors ${circle}`}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          )}
          <a
            {...linkProps('/suite')}
            className={`hidden sm:grid w-10 h-10 place-items-center rounded-full border transition-colors ${circle}`}
            aria-label="Abrir el simulador POZOLE Suite"
            title="Abrir el simulador"
          >
            <Compass className="w-[18px] h-[18px]" />
          </a>
          <button
            type="button"
            className={`lg:hidden w-10 h-10 grid place-items-center rounded-full border transition-colors ${circle}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <ScrollProgressBar />

      {open && (
        <nav className="lg:hidden border-t border-ink/[0.07] bg-canvas/95 backdrop-blur-xl px-4 sm:px-6 pb-6 pt-2 max-h-[calc(100svh-72px)] overflow-y-auto" aria-label="Menú">
          {NAV.map((group) => (
            <div key={group.label} className="py-3 border-b border-ink/[0.06]">
              {group.items ? (
                <>
                  <div className="text-[13px] font-medium text-brand pb-1">{group.label}</div>
                  {group.items.map((item) => (
                    <a key={item.label} {...hrefOf(item)} onClickCapture={() => setOpen(false)} className="block py-2 text-[16px] text-ink/85">
                      {item.label}
                    </a>
                  ))}
                </>
              ) : (
                <a {...hrefOf(group)} onClickCapture={() => setOpen(false)} className="block py-1 text-[16px] text-ink/85">
                  {group.label}
                </a>
              )}
            </div>
          ))}
          <a
            {...linkProps('/', 'contacto')}
            onClickCapture={() => setOpen(false)}
            className="mt-5 flex justify-center items-center gap-1.5 rounded-full bg-brand text-white font-medium text-[15px] py-3"
          >
            Cotizar proyecto
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="pz-scope-brand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5 space-y-4">
          <BrandLockup size={34} />
          <p className="text-sm text-ink/70 max-w-sm leading-relaxed">
            Ingeniería acústica de recintos: medimos, simulamos y diseñamos tratamiento para que cada espacio suene como debe.
          </p>
        </div>
        <FooterCol title="Empresa" links={[['Servicios', '/', 'servicios'], ['Tratamientos', '/', 'tratamientos'], ['Planes', '/', 'planes'], ['Equipo', '/', 'equipo'], ['Contacto', '/', 'contacto']]} />
        <FooterCol title="Herramientas" links={[['POZOLE Suite', '/suite'], ['Diseño de difusores', '/suite', 'diffusers'], ['Calculadora de RT60', '/', 'software']]} />
        <div className="md:col-span-3 space-y-3">
          <div className="text-sm font-medium text-ink">Normativa de referencia</div>
          <p className="text-sm text-ink/70 leading-relaxed">ISO 3382 · ISO 354 · ISO 17497 · AES-4id · ISO 9921</p>
        </div>
      </div>
      <div className="border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink/70">
          <span>Creado por Daniel Angulo</span>
          <span>© 2026 POZOLE ACÚSTICA · TODOS LOS DERECHOS RESERVADOS</span>
          <span>Renders e imágenes por POZOLE ACÚSTICA</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="md:col-span-2 space-y-3">
      <div className="text-sm font-medium text-ink">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, path, hash]) => (
          <li key={label}>
            <a {...linkProps(path, hash)} className="text-ink/70 hover:text-ink transition-colors">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Rótulo de sección: texto normal en el color de la marca (sin numeración, mayúsculas ni espaciado)
const sentenceCase = (text) => (typeof text === 'string' ? text.charAt(0) + text.slice(1).toLowerCase() : text);

export function Eyebrow({ children }) {
  return <div className="text-[15px] font-medium text-brand">{sentenceCase(children)}</div>;
}
