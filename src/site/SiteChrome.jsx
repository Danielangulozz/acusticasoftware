import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';
import { BrandLockup } from './BrandMark';
import { linkProps } from '../router';

const NAV = [
  { label: 'Servicios', path: '/', hash: 'servicios' },
  { label: 'Proceso', path: '/', hash: 'proceso' },
  { label: 'Difusores', path: '/suite', hash: 'difusores' },
  { label: 'Software', path: '/', hash: 'software' },
  { label: 'Equipo', path: '/', hash: 'equipo' },
];

export function SiteNav({ current = '/', isDark, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || open ? 'bg-canvas/80 backdrop-blur-xl border-b border-ink/[0.07]' : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a {...linkProps('/')} className="shrink-0" aria-label="POZOLE ACUSTIC, inicio">
          <BrandLockup />
        </a>

        <nav className="hidden md:flex items-center gap-1 text-[13px]">
          {NAV.map((item) => {
            const active = !item.hash && current === item.path;
            return (
              <a
                key={item.label}
                {...linkProps(item.path, item.hash)}
                className={`px-3 py-2 rounded-full transition-colors ${
                  active ? 'text-ink bg-ink/[0.08]' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <a {...linkProps('/suite')} className="text-[13px] text-ink/60 hover:text-ink px-3 py-2 transition-colors">
            Abrir simulador
          </a>
          <a
            {...linkProps('/', 'contacto')}
            className="group inline-flex items-center gap-1.5 text-[13px] font-semibold bg-ink text-canvas rounded-full pl-4 pr-3 py-2 hover:bg-accent transition-colors"
          >
            Cotizar proyecto
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="md:hidden flex items-center gap-1 -mr-2">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <button
            className="p-2 text-ink/80"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-ink/[0.07] px-4 pb-5 pt-2 flex flex-col">
          {[...NAV, { label: 'Abrir simulador', path: '/suite' }, { label: 'Cotizar proyecto', path: '/', hash: 'contacto' }].map((item) => (
            <a
              key={item.label}
              {...linkProps(item.path, item.hash)}
              onClickCapture={() => setOpen(false)}
              className="py-3 text-[15px] text-ink/80 border-b border-ink/[0.05] last:border-0"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function ThemeToggle({ isDark, onToggle }) {
  if (!onToggle) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-2 rounded-full text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/[0.07] bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5 space-y-4">
          <BrandLockup size={34} />
          <p className="text-sm text-ink/50 max-w-sm leading-relaxed">
            Ingeniería acústica de recintos: medimos, simulamos y diseñamos tratamiento para que cada espacio suene como debe.
          </p>
        </div>
        <FooterCol title="Empresa" links={[['Servicios', '/', 'servicios'], ['Proceso', '/', 'proceso'], ['Equipo', '/', 'equipo'], ['Contacto', '/', 'contacto']]} />
        <FooterCol title="Herramientas" links={[['Diseño de difusores', '/suite', 'difusores'], ['POZOLE Suite', '/suite']]} />
        <div className="md:col-span-3 space-y-3">
          <div className="font-mono text-[10px] tracking-[0.2em] text-ink/40">NORMATIVA DE REFERENCIA</div>
          <div className="flex flex-wrap gap-1.5">
            {['ISO 3382', 'ISO 354', 'ISO 17497', 'AES-4id', 'ISO 9921'].map((s) => (
              <span key={s} className="font-mono text-[11px] text-ink/60 border border-ink/10 rounded-full px-2.5 py-1">{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-ink/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-ink/35">
          <span>© {new Date().getFullYear()} POZOLE ACUSTIC</span>
          <span className="font-mono">Acústica de Recintos · 2026</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="md:col-span-2 space-y-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-ink/40">{title.toUpperCase()}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, path, hash]) => (
          <li key={label}>
            <a {...linkProps(path, hash)} className="text-ink/65 hover:text-ink transition-colors">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Aparece suavemente al entrar en el viewport. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`pz-reveal ${shown ? 'pz-reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ index, children }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-ink/45">
      {index && <span className="text-accent">{index}</span>}
      <span className="h-px w-8 bg-ink/20" />
      <span>{children}</span>
    </div>
  );
}
