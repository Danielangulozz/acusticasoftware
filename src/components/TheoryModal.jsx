import React from 'react';
import { X, BookOpen, Atom, Calculator, Layers, HelpCircle } from 'lucide-react';

/**
 * Modal de Formulario Físico y Teoría Acústica
 * Estilo Minimalista Apple / Tesla
 */
export default function TheoryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      
      <div className="bg-white border border-black/[0.08] rounded-3xl shadow-apple-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {/* Encabezado */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">
              Formulario Físico y Modelo Matemático (2026)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-slate-500 hover:text-black transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 sm:p-10 space-y-6 text-[#1d1d1f] text-xs sm:text-sm">
          
          {/* Sección 1: Geometría */}
          <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06]">
            <h4 className="font-bold text-[#0071e3] text-sm mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> 1. Geometría y Parámetros Estadísticos del Recinto
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  V = L · W · H [m³]
                </p>
                <p className="text-[#86868b] text-xs">Volumen ortogonal del recinto.</p>
              </div>
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  S = 2(LW + LH + WH) [m²]
                </p>
                <p className="text-[#86868b] text-xs">Superficie total de las 6 caras interiores.</p>
              </div>
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  l = 4V / S [m]
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Recorrido Libre Medio:</strong> Distancia media que viaja un frente de onda entre dos reflexiones en campo difuso (teorema de Cauchy).
                </p>
              </div>
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  τ = l / c [s] &nbsp;|&nbsp; n = (c · RT) / l
                </p>
                <p className="text-[#86868b] text-xs">
                  Tiempo entre impactos consecutivos y número total de reflexiones en el decaimiento de 60 dB (c = 343 m/s).
                </p>
              </div>
            </div>
          </div>

          {/* Sección 2: Reverberación */}
          <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06]">
            <h4 className="font-bold text-[#34c759] text-sm mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" /> 2. Absorción y Modelos de Reverberación (RT₆₀)
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-[#1d1d1f]">Absorción Equivalente y Coeficiente Medio:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs bg-white p-3 rounded-xl border border-black/[0.06]">
                  <div>A = ∑ (S_i · α_i) [m² Sabine]</div>
                  <div>ᾱ = A / S [adimensional, 0 a 1]</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <strong className="text-[#0071e3] block mb-1">Fórmula de Sabine (1898):</strong>
                  <p className="font-mono text-[#1d1d1f] mb-1.5 font-bold">RT = 0.161 · V / (A + 4mV)</p>
                  <p className="text-[#86868b] text-[11px]">
                    Basado en energía continua. Válido para salas reflectantes (ᾱ &lt; 0.25).
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <strong className="text-[#34c759] block mb-1">Fórmula de Norris-Eyring (1930):</strong>
                  <p className="font-mono text-[#1d1d1f] mb-1.5 font-bold">RT = 0.161 · V / [-S · ln(1 - ᾱ) + 4mV]</p>
                  <p className="text-[#86868b] text-[11px]">
                    Basado en pérdida por rebotes discretos. Si ᾱ → 1, RT → 0. Válido para ᾱ ≥ 0.25.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-black/[0.06]">
                  <strong className="text-[#ff9500] block mb-1">Millington-Sette (1932):</strong>
                  <p className="font-mono text-[#1d1d1f] mb-1.5 font-bold">RT = 0.161 · V / [-∑ S_i · ln(1 - α_i) + 4mV]</p>
                  <p className="text-[#86868b] text-[11px]">
                    Trata individualmente el coeficiente de cada superficie cuando los materiales son muy heterogéneos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Campo Sonoro */}
          <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06]">
            <h4 className="font-bold text-[#ff9500] text-sm mb-3 flex items-center gap-2">
              <Atom className="w-4 h-4" /> 3. Campo Sonoro, Propagación y Distancia Crítica
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  R = A / (1 - ᾱ) [m²]
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Constante de Sala (R):</strong> Mide la capacidad disipativa del recinto.
                </p>
              </div>

              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  Dc = 0.057 · √(Q · R) = √[(Q · R) / (16 · π)] [m]
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Distancia Crítica (Dc):</strong> Frontera donde la intensidad directa iguala a la intensidad reverberada (If = Ir).
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="font-mono text-[#1d1d1f] bg-white p-3 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  Lp(r) = Lw + 10 · log10[ Q / (4 · π · r²) + 4 / R ] - m_dB · r
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Ecuación Fundamental del Nivel de Presión Sonora Total:</strong> Superposición de campo directo (Q / 4πr²) y campo reverberado difuso (4 / R).
                </p>
              </div>
            </div>
          </div>

          {/* Sección 4: Acústica Ondulatoria y Modos Propios */}
          <div className="bg-[#fbfbfd] p-5 rounded-2xl border border-black/[0.06]">
            <h4 className="font-bold text-[#5833c7] text-sm mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 4. Acústica Ondulatoria, Modos Normales y Criterio de Bonello
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  f(nx, ny, nz) = (c / 2) · √[ (nx/Lx)² + (ny/Ly)² + (nz/Lz)² ] [Hz]
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Frecuencias Propias:</strong> Resonancias estacionarias en recintos ortogonales.
                </p>
              </div>

              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  k = (nx·π/Lx, ny·π/Ly, nz·π/Lz) &nbsp;|&nbsp; |k| = √(kx² + ky² + kz²)
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Vector de Onda (k):</strong> Componentes de propagación espacial en rad/m.
                </p>
              </div>

              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  fs ≈ 2000 · √(T60 / V) &nbsp;|&nbsp; fs_exact = √[c³ / (4·ln 10)] · √(T60 / V)
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Frecuencia de Schroeder:</strong> Límite entre el régimen modal discreto y el régimen estadístico difuso (~3 modos por ancho de banda modal).
                </p>
              </div>

              <div>
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  dN/df = (4πV / c³) · f² + (πS / 2c²) · f + L / (8c)
                </p>
                <p className="text-[#86868b] text-xs">
                  <strong>Densidad Modal de Weyl:</strong> Tasa de modos por Hertz. La expresión angular dN/dω = V·ω² / (2π²c³) es su equivalente en rad/s.
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="font-mono text-[#1d1d1f] bg-white p-2.5 rounded-xl border border-black/[0.06] mb-1 font-bold">
                  Criterio de Bonello (1981) &nbsp;|&nbsp; Proporciones de Bolt (1946: 1 : 1.404 : 1.863)
                </p>
                <p className="text-[#86868b] text-xs leading-relaxed">
                  <strong>Regla 1:</strong> Monotonía no decreciente en bandas de 1/3 de octava (N_i ≥ N_i-1).<br />
                  <strong>Regla 2:</strong> Dos modos pueden compartir frecuencia modal (degeneración) sólo si en dicha banda hay más de 5 modos (N_i &gt; 5).
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
