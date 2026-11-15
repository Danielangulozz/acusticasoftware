import { AIR_ABSORPTION_COEFFS } from '../../utils/acousticCalculations';
import { calculateModalDamping, modalDensityN, speedOfSoundFromTemperature } from '../../utils/modalCalculations';
import { alconsToSti, calculatePeutzAlcons } from '../../utils/intelligibilityUtils';
import { designFromConfig, loadDiffuserConfig } from '../diffusers/diffuserConfig';

/**
 * Fichas técnicas de POZOLE Suite: una por cada cálculo.
 *
 * Cada ficha dice qué se calcula, con qué fórmula, por qué esa y cuándo es válida, de dónde
 * sale y en qué módulo se usa. `check(ctx)` repite la cuenta paso a paso con los datos de la
 * sala abierta, escrita aquí de forma independiente, y la compara con el valor que entrega
 * el motor de cálculo: si no coinciden, la ficha lo dice.
 */

const f = (v, d = 2) => (Number.isFinite(v) ? Number(v).toFixed(d) : '—');
const clampAlpha = (a) => Math.min(0.9999, Math.max(0.0001, Number(a) || 0.05));

/** Reúne los datos de la sala que usan las comprobaciones. */
export function buildContext(p) {
  const band = p.selectedBand || 1000;
  const V = p.geometry?.volume ?? 0;
  const S = p.geometry?.totalSurfaceArea ?? 0;
  const abs = p.absorptionData?.[band] ?? {};
  const areas = p.geometry?.surfaceAreas ?? {};

  // Superficies con su material base y sus sub-elementos (puertas, ventanas, paneles)
  const surfaces = Object.keys(areas).map((id) => {
    const cfg = p.materials?.[id] ?? {};
    const subs = (Array.isArray(cfg.subElements) ? cfg.subElements : []).map((el) => ({ area: Number(el.area) || 0, coeffs: el.coefficients }));
    const subArea = subs.reduce((sum, el) => sum + el.area, 0);
    return { id, baseArea: Math.max(0, (areas[id] || 0) - subArea), cfg, subs };
  });
  const alphaOf = (surface, freq) => clampAlpha(surface.cfg?.coefficients?.[freq] ?? surface.cfg?.[freq]);
  const parts = (freq) =>
    surfaces.flatMap((s) => {
      const base = alphaOf(s, freq);
      return [{ area: s.baseArea, alpha: base }, ...s.subs.map((el) => ({ area: el.area, alpha: clampAlpha(el.coeffs?.[freq] ?? base) }))];
    });

  const dims = p.modalDimensions ?? {};
  return {
    band,
    V,
    S,
    H: p.geometry?.height ?? 0,
    floorArea: p.geometry?.floorArea ?? 0,
    A: abs.equivalentAbsorption ?? 0,
    alphaMean: abs.alphaMean ?? 0,
    m: p.includeAirAbsorption ? AIR_ABSORPTION_COEFFS[band] || 0 : 0,
    air: Boolean(p.includeAirAbsorption),
    parts,
    surfaceCount: surfaces.length,
    rt: p.reverberationData ?? {},
    field: p.soundFieldData ?? {},
    source: p.sourceReceiver ?? { lw: 90, directivity: 1, distance: 3 },
    roomType: p.roomType || 'speech',
    optimum: p.optimumRT ?? {},
    Lx: dims.Lx ?? 0,
    Ly: dims.Ly ?? 0,
    Lz: dims.Lz ?? 0,
    modalVolume: dims.volume || V || (dims.Lx ?? 0) * (dims.Ly ?? 0) * (dims.Lz ?? 0),
    c: p.modalSettings?.c ?? 343,
    tempC: p.modalSettings?.tempC ?? 20,
    t60: p.t60ForSchroeder ?? 1,
    schroeder: p.schroederData ?? {},
    modes: p.calculatedModes ?? [],
  };
}

const USE_LABELS = { speech: 'voz (aulas, conferencias)', music: 'música', studio: 'estudio / sala de control', multipurpose: 'uso múltiple' };

export const GROUPS = ['Geometría y absorción', 'Reverberación', 'Campo sonoro', 'Graves y modos propios', 'Inteligibilidad de la voz', 'Difusores', 'Constantes'];

export const FICHAS = [
  /* ------------------------------------------------ Geometría y absorción */
  {
    id: 'geometria',
    group: 'Geometría y absorción',
    title: 'Volumen, superficie y recorrido libre medio',
    what: 'El tamaño acústico de la sala: cuánto aire contiene, cuánta superficie lo rodea y qué distancia recorre el sonido, en promedio, entre un rebote y el siguiente.',
    formulas: ['V = S_{p} \\cdot H', 'S = 2\\,S_{p} + P \\cdot H', '\\ell = \\frac{4V}{S}'],
    vars: [['S_{p}', 'Área de la planta (polígono dibujado)', 'm²'], ['P', 'Perímetro de la planta', 'm'], ['H', 'Altura', 'm'], ['\\ell', 'Recorrido libre medio', 'm']],
    why: 'Todo lo demás depende de V y S: el tiempo de reverberación crece con el volumen y baja con la superficie absorbente. El recorrido libre medio es la base de la teoría estadística: una sala es «difusa» cuando el sonido rebota muchas veces antes de apagarse.',
    valid: 'La planta puede tener cualquier forma (se calcula como polígono, con paredes curvas incluidas), pero se asume techo plano y paredes verticales.',
    ref: 'Geometría de prismas rectos. Recorrido libre medio: Kuttruff, Room Acoustics, cap. 5.',
    uses: [['geometry', 'Geometría']],
    check: (x) => ({
      steps: [`V = ${f(x.floorArea)} \\cdot ${f(x.H)} = ${f(x.floorArea * x.H)}\\ \\text{m³}`, `\\ell = \\frac{4 \\cdot ${f(x.V)}}{${f(x.S)}} = ${f((4 * x.V) / x.S)}\\ \\text{m}`],
      label: 'Volumen',
      manual: x.floorArea * x.H,
      engine: x.V,
      unit: 'm³',
    }),
  },
  {
    id: 'absorcion',
    group: 'Geometría y absorción',
    title: 'Absorción equivalente y coeficiente medio',
    what: 'Cuántos metros cuadrados de «ventana abierta» equivalen a todos los materiales de la sala juntos, y qué fracción del sonido absorbe la sala en promedio.',
    formulas: ['A = \\sum_{i} S_i\\,\\alpha_i', '\\bar{\\alpha} = \\frac{A}{S}'],
    vars: [['S_i', 'Área de cada superficie o elemento (puerta, ventana, panel)', 'm²'], ['\\alpha_i', 'Coeficiente de absorción del material en la banda', '—'], ['A', 'Absorción equivalente', 'm² Sabine'], ['\\bar{\\alpha}', 'Coeficiente medio de absorción', '—']],
    why: 'Es la forma estándar de sumar materiales distintos: cada uno aporta según su área y su coeficiente. Se calcula por banda de octava (125 Hz – 4 kHz) porque ningún material absorbe igual en graves que en agudos.',
    valid: 'Los coeficientes α provienen de ensayos en cámara reverberante (ISO 354) y son valores de catálogo: el material instalado puede comportarse algo distinto según montaje y cámara de aire.',
    ref: 'W. C. Sabine (1900). ISO 354: medición de la absorción acústica en cámara reverberante.',
    uses: [['materials', 'Materiales'], ['results', 'Reverberación']],
    check: (x) => {
      const manual = x.parts(x.band).reduce((sum, p) => sum + p.area * p.alpha, 0);
      return {
        steps: [`A = \\sum_{i} S_i\\,\\alpha_i = ${f(manual)}\\ \\text{m²}\\quad(${x.surfaceCount}\\ \\text{superficies})`, `\\bar{\\alpha} = \\frac{${f(manual)}}{${f(x.S)}} = ${f(manual / x.S, 3)}`],
        label: `Absorción equivalente a ${x.band} Hz`,
        manual,
        engine: x.A,
        unit: 'm²',
      };
    },
  },

  /* --------------------------------------------------------- Reverberación */
  {
    id: 'sabine',
    group: 'Reverberación',
    title: 'Tiempo de reverberación — Sabine',
    what: 'Cuántos segundos tarda el sonido en caer 60 dB después de que la fuente se calla.',
    formulas: ['T_{60} = \\frac{0.161\\,V}{A + 4mV}'],
    vars: [['V', 'Volumen de la sala', 'm³'], ['A', 'Absorción equivalente', 'm² Sabine'], ['m', 'Coeficiente de atenuación del aire en la banda', 'm⁻¹'], ['0.161', 'Constante 24·ln(10)/c con c ≈ 343 m/s', 's/m']],
    why: 'Es la fórmula clásica y la que piden las normas de medición. Funciona muy bien en salas vivas, donde la absorción es baja y está repartida de forma pareja.',
    valid: 'Confiable cuando ᾱ < 0,2 aproximadamente. Con mucha absorción sobreestima el tiempo (nunca predice T = 0 aunque todo fuera absorbente): en ese caso se prefiere Eyring.',
    ref: 'W. C. Sabine, Collected Papers on Acoustics (1900). ISO 3382-2. Atenuación del aire: ISO 9613-1.',
    uses: [['results', 'Reverberación'], ['charts', 'Gráficas']],
    check: (x) => {
      const manual = (0.161 * x.V) / (x.A + 4 * x.m * x.V);
      return {
        steps: [`T_{60} = \\frac{0.161 \\cdot ${f(x.V)}}{${f(x.A)} + 4 \\cdot ${x.m} \\cdot ${f(x.V)}} = ${f(manual, 3)}\\ \\text{s}`],
        label: `RT60 Sabine a ${x.band} Hz`,
        manual,
        engine: x.rt[x.band]?.sabine,
        unit: 's',
        digits: 3,
      };
    },
  },
  {
    id: 'eyring',
    group: 'Reverberación',
    title: 'Tiempo de reverberación — Norris-Eyring',
    what: 'El mismo tiempo de reverberación, pero contando que en cada rebote se pierde una fracción ᾱ de la energía que queda.',
    formulas: ['T_{60} = \\frac{0.161\\,V}{-S\\,\\ln(1 - \\bar{\\alpha}) + 4mV}'],
    vars: [['S', 'Superficie total de la sala', 'm²'], ['\\bar{\\alpha}', 'Coeficiente medio de absorción', '—']],
    why: 'Corrige el defecto de Sabine en salas absorbentes: si ᾱ tiende a 1 el tiempo tiende a cero, como debe ser. Es la fórmula adecuada para estudios y salas tratadas, y coincide con Sabine cuando la absorción es baja.',
    valid: 'Supone que la absorción está repartida de forma uniforme. Si hay superficies muy absorbentes junto a otras muy reflectantes, Millington-Sette describe mejor la sala.',
    ref: 'C. F. Eyring, «Reverberation time in dead rooms», J. Acoust. Soc. Am. 1 (1930). R. F. Norris (1932).',
    uses: [['results', 'Reverberación'], ['charts', 'Gráficas']],
    check: (x) => {
      const manual = (0.161 * x.V) / (-x.S * Math.log(1 - clampAlpha(x.alphaMean)) + 4 * x.m * x.V);
      return {
        steps: [`T_{60} = \\frac{0.161 \\cdot ${f(x.V)}}{-${f(x.S)} \\cdot \\ln(1 - ${f(x.alphaMean, 3)}) + 4 \\cdot ${x.m} \\cdot ${f(x.V)}} = ${f(manual, 3)}\\ \\text{s}`],
        label: `RT60 Eyring a ${x.band} Hz`,
        manual,
        engine: x.rt[x.band]?.eyring,
        unit: 's',
        digits: 3,
      };
    },
  },
  {
    id: 'millington',
    group: 'Reverberación',
    title: 'Tiempo de reverberación — Millington-Sette',
    what: 'Tiempo de reverberación en el que cada material aporta según su propio coeficiente, en lugar de usar el promedio de la sala.',
    formulas: ['T_{60} = \\frac{0.161\\,V}{-\\sum_{i} S_i\\,\\ln(1 - \\alpha_i) + 4mV}'],
    vars: [['S_i', 'Área de cada superficie o elemento', 'm²'], ['\\alpha_i', 'Coeficiente de absorción de ese elemento', '—']],
    why: 'Cuando los materiales son muy desiguales (un techo absorbente sobre paredes de concreto), promediar esconde la realidad. Esta fórmula pondera cada superficie por separado.',
    valid: 'Se vuelve inestable si algún material tiene α muy cercano a 1, porque ln(1 − α) crece sin límite: por eso el motor acota α a 0,9999.',
    ref: 'G. Millington, J. Acoust. Soc. Am. 4 (1932). W. J. Sette, J. Acoust. Soc. Am. 4 (1933).',
    uses: [['results', 'Reverberación'], ['charts', 'Gráficas']],
    check: (x) => {
      const term = x.parts(x.band).reduce((sum, p) => sum + (p.area > 0 ? -p.area * Math.log(1 - p.alpha) : 0), 0);
      const manual = (0.161 * x.V) / (term + 4 * x.m * x.V);
      return {
        steps: [`-\\sum_{i} S_i\\,\\ln(1 - \\alpha_i) = ${f(term)}\\ \\text{m²}`, `T_{60} = \\frac{0.161 \\cdot ${f(x.V)}}{${f(term)} + 4 \\cdot ${x.m} \\cdot ${f(x.V)}} = ${f(manual, 3)}\\ \\text{s}`],
        label: `RT60 Millington a ${x.band} Hz`,
        manual,
        engine: x.rt[x.band]?.millington,
        unit: 's',
        digits: 3,
      };
    },
  },
  {
    id: 'rt-optimo',
    group: 'Reverberación',
    title: 'Tiempo de reverberación recomendado',
    what: 'El valor al que conviene llevar la sala según para qué se usa y qué tan grande es. Es la referencia contra la que la suite dice «cumple» o «no cumple».',
    formulas: [
      '\\text{Voz:}\\quad T_{op} = 0.32\\,\\log V - 0.17',
      '\\text{Música:}\\quad T_{op} = 0.55\\,\\log V - 0.10',
      '\\text{Uso múltiple:}\\quad T_{op} = 0.45\\,\\log V - 0.05',
      '\\text{Estudio:}\\quad T_{op} = 0.25 \\left( \\frac{V}{100} \\right)^{1/3}',
    ],
    vars: [['V', 'Volumen de la sala', 'm³'], ['T_{op}', 'Tiempo de reverberación recomendado en medios', 's']],
    why: 'No existe un único tiempo «bueno»: la voz necesita salas más secas que la música, y las salas grandes admiten más reverberación. Las curvas crecen con el logaritmo del volumen; la de estudio es la de salas de escucha crítica.',
    valid: 'Son valores de diseño para medios (500 Hz – 1 kHz), con una tolerancia de ±8 % a ±20 % según el uso y un mínimo por tipo de sala. No sustituyen el criterio del proyecto ni la normativa local.',
    ref: 'Curvas de referencia en función del volumen (tradición de Knudsen y Beranek). Estudio: ITU-R BS.1116 y EBU Tech 3276.',
    uses: [['overview', 'Resumen'], ['results', 'Reverberación']],
    check: (x) => {
      const logV = Math.log10(Math.max(10, x.V));
      const table = {
        speech: [Math.max(0.4, 0.32 * logV - 0.17), `0.32 \\cdot \\log(${f(x.V)}) - 0.17`],
        music: [Math.max(0.8, 0.55 * logV - 0.1), `0.55 \\cdot \\log(${f(x.V)}) - 0.10`],
        studio: [Math.max(0.2, 0.25 * Math.cbrt(Math.max(10, x.V) / 100)), `0.25 \\left( \\frac{${f(x.V)}}{100} \\right)^{1/3}`],
        multipurpose: [Math.max(0.5, 0.45 * logV - 0.05), `0.45 \\cdot \\log(${f(x.V)}) - 0.05`],
      };
      const [manual, tex] = table[x.roomType] ?? table.multipurpose;
      return {
        steps: [`T_{op} = ${tex} = ${f(manual)}\\ \\text{s}`],
        label: `Recomendado para ${USE_LABELS[x.roomType] ?? USE_LABELS.multipurpose}`,
        manual,
        engine: x.optimum.optimal,
        unit: 's',
        tolerance: 0.006,
      };
    },
  },

  /* ---------------------------------------------------------- Campo sonoro */
  {
    id: 'constante-sala',
    group: 'Campo sonoro',
    title: 'Constante de sala',
    what: 'Una medida de cuánta energía «se queda» en la sala como campo reverberado. A mayor R, sala más seca.',
    formulas: ['R = \\frac{A}{1 - \\bar{\\alpha}}'],
    vars: [['A', 'Absorción equivalente', 'm²'], ['\\bar{\\alpha}', 'Coeficiente medio de absorción', '—'], ['R', 'Constante de sala', 'm²']],
    why: 'El campo reverberado lo forma la energía que sobrevive al primer rebote; por eso se divide entre (1 − ᾱ). Es el dato que conecta los materiales con el nivel sonoro que escucha el oyente.',
    valid: 'Válida bajo la hipótesis de campo difuso. En salas muy pequeñas o muy absorbentes el campo deja de ser difuso y R solo es orientativa.',
    ref: 'L. L. Beranek, Acoustics (1954), cap. 10.',
    uses: [['source', 'Fuente y oyente'], ['results', 'Reverberación']],
    check: (x) => {
      const manual = x.A / (1 - clampAlpha(x.alphaMean));
      return {
        steps: [`R = \\frac{${f(x.A)}}{1 - ${f(x.alphaMean, 3)}} = ${f(manual)}\\ \\text{m²}`],
        label: `Constante de sala a ${x.band} Hz`,
        manual,
        engine: x.field[x.band]?.roomConstant,
        unit: 'm²',
      };
    },
  },
  {
    id: 'distancia-critica',
    group: 'Campo sonoro',
    title: 'Distancia crítica',
    what: 'La distancia a la fuente en la que el sonido directo y el reverberado tienen el mismo nivel. Más cerca manda la fuente; más lejos manda la sala.',
    formulas: ['D_c = \\sqrt{\\frac{Q\\,R}{16\\pi}} \\approx 0.141\\sqrt{Q\\,R}'],
    vars: [['Q', 'Factor de directividad de la fuente', '—'], ['R', 'Constante de sala', 'm²'], ['D_c', 'Distancia crítica', 'm']],
    why: 'Sale de igualar el campo directo, Q/(4πr²), con el reverberado, 4/R. Sirve para ubicar oyentes y micrófonos: para entender la voz conviene estar dentro de la distancia crítica o cerca de ella.',
    valid: 'Supone campo difuso y fuente puntual. La forma equivalente con volumen y tiempo es Dc ≈ 0,057·√(Q·V/T60).',
    ref: 'L. L. Beranek, Acoustics (1954). H. Kuttruff, Room Acoustics, cap. 5.',
    uses: [['source', 'Fuente y oyente'], ['results', 'Reverberación']],
    check: (x) => {
      const Q = Math.max(1, x.source.directivity || 1);
      const R = x.field[x.band]?.roomConstant ?? 0;
      const manual = Math.sqrt((Q * R) / (16 * Math.PI));
      return {
        steps: [`D_c = \\sqrt{\\frac{${Q} \\cdot ${f(R)}}{16\\pi}} = ${f(manual)}\\ \\text{m}`],
        label: `Distancia crítica a ${x.band} Hz`,
        manual,
        engine: x.field[x.band]?.criticalDistance,
        unit: 'm',
      };
    },
  },
  {
    id: 'nivel-presion',
    group: 'Campo sonoro',
    title: 'Nivel de presión sonora en el oyente',
    what: 'Cuántos decibelios llegan al oyente, sumando el sonido que viene directo de la fuente y el que aporta la sala.',
    formulas: ['L_p = L_w + 10\\,\\log\\left( \\frac{Q}{4\\pi r^2} + \\frac{4}{R} \\right) - 4.34\\,m\\,r'],
    vars: [['L_w', 'Nivel de potencia acústica de la fuente', 'dB'], ['Q', 'Directividad', '—'], ['r', 'Distancia fuente–oyente', 'm'], ['R', 'Constante de sala', 'm²'], ['m', 'Atenuación del aire', 'm⁻¹']],
    why: 'El primer término dentro del logaritmo es el campo directo (cae 6 dB cada vez que se duplica la distancia); el segundo, el reverberado (constante en toda la sala). El último resta lo que el aire absorbe en el trayecto.',
    valid: 'Régimen estacionario, fuente puntual y campo difuso. No incluye reflexiones tempranas individuales ni el efecto de obstáculos.',
    ref: 'L. L. Beranek, Acoustics (1954). Atenuación atmosférica: ISO 9613-1.',
    uses: [['source', 'Fuente y oyente'], ['charts', 'Gráficas']],
    check: (x) => {
      const Q = Math.max(1, x.source.directivity || 1);
      const r = Math.max(0.1, x.source.distance || 1);
      const R = x.field[x.band]?.roomConstant ?? 1;
      const Lw = x.source.lw || 90;
      const manual = Math.max(0, Lw + 10 * Math.log10(Q / (4 * Math.PI * r * r) + 4 / R) - 4.342945 * x.m * r);
      return {
        steps: [`L_p = ${f(Lw, 1)} + 10\\,\\log\\left( \\frac{${Q}}{4\\pi \\cdot ${f(r)}^2} + \\frac{4}{${f(R)}} \\right) - 4.34 \\cdot ${x.m} \\cdot ${f(r)} = ${f(manual, 1)}\\ \\text{dB}`],
        label: `Nivel en el oyente a ${x.band} Hz`,
        manual,
        engine: x.field[x.band]?.lpTotalWithAir,
        unit: 'dB',
        digits: 1,
      };
    },
  },

  /* -------------------------------------------------- Graves y modos propios */
  {
    id: 'modos',
    group: 'Graves y modos propios',
    title: 'Frecuencias de los modos propios',
    what: 'Las frecuencias graves en las que la sala resuena por sus propias medidas: donde una nota retumba o desaparece según dónde te pares.',
    formulas: ['f_{n_x n_y n_z} = \\frac{c}{2}\\sqrt{\\left( \\frac{n_x}{L_x} \\right)^2 + \\left( \\frac{n_y}{L_y} \\right)^2 + \\left( \\frac{n_z}{L_z} \\right)^2}'],
    vars: [['n_x, n_y, n_z', 'Índices del modo (0, 1, 2…): cuántas medias ondas caben en cada dimensión', '—'], ['L_x, L_y, L_z', 'Largo, ancho y alto de la sala', 'm'], ['c', 'Velocidad del sonido', 'm/s']],
    why: 'Entre paredes paralelas solo «caben» las ondas cuya media longitud es un divisor exacto de la distancia. Con un índice distinto de cero el modo es axial (el más fuerte), con dos es tangencial y con tres, oblicuo.',
    valid: 'Exacta para salas rectangulares de paredes rígidas. Para otras plantas la suite usa el rectángulo equivalente, así que las frecuencias son una aproximación.',
    ref: 'Lord Rayleigh, The Theory of Sound (1877). P. M. Morse y R. H. Bolt, «Sound waves in rooms», Rev. Mod. Phys. 16 (1944).',
    uses: [['modes', 'Graves y modos propios']],
    check: (x) => {
      const manual = x.c / (2 * x.Lx);
      const mode = x.modes.find((m) => m.nx === 1 && m.ny === 0 && m.nz === 0);
      return {
        steps: [`f_{100} = \\frac{${f(x.c, 1)}}{2 \\cdot ${f(x.Lx)}} = ${f(manual)}\\ \\text{Hz}`],
        label: 'Primer modo axial (1, 0, 0)',
        manual,
        engine: mode?.frequency,
        unit: 'Hz',
        tolerance: 0.011,
      };
    },
  },
  {
    id: 'schroeder',
    group: 'Graves y modos propios',
    title: 'Frecuencia de Schroeder',
    what: 'La frontera entre dos mundos: por debajo mandan los modos sueltos (acústica ondulatoria); por encima, tantos modos se superponen que la sala se puede tratar con estadística.',
    formulas: ['f_s \\approx 2000\\sqrt{\\frac{T_{60}}{V}}'],
    vars: [['T_{60}', 'Tiempo de reverberación en medios', 's'], ['V', 'Volumen', 'm³'], ['f_s', 'Frecuencia de Schroeder', 'Hz']],
    why: 'Indica hasta qué frecuencia hay que preocuparse por modos individuales y dónde dejan de valer Sabine y compañía. En salas pequeñas es alta: por eso los cuartos chicos tienen problemas de graves.',
    valid: 'Es un criterio de transición (solapamiento de unos tres modos por ancho de banda), no un corte abrupto. La forma exacta es fs = √(c³/(4 ln 10))·√(T60/V).',
    ref: 'M. R. Schroeder, J. Acoust. Soc. Am. 34 (1962); M. R. Schroeder, J. Acoust. Soc. Am. 99 (1996).',
    uses: [['modes', 'Graves y modos propios']],
    check: (x) => {
      const manual = 2000 * Math.sqrt(x.t60 / x.modalVolume);
      return {
        steps: [`f_s = 2000\\sqrt{\\frac{${f(x.t60, 3)}}{${f(x.modalVolume)}}} = ${f(manual, 1)}\\ \\text{Hz}`],
        label: 'Frecuencia de Schroeder',
        manual,
        engine: x.schroeder.fsApprox,
        unit: 'Hz',
        digits: 1,
        tolerance: 0.06,
      };
    },
  },
  {
    id: 'densidad-modal',
    group: 'Graves y modos propios',
    title: 'Número de modos hasta una frecuencia (Weyl)',
    what: 'Cuántos modos propios tiene la sala por debajo de una frecuencia dada, sin tener que contarlos uno por uno.',
    formulas: ['N(f) = \\frac{4\\pi}{3}V\\left( \\frac{f}{c} \\right)^3 + \\frac{\\pi}{4}S\\left( \\frac{f}{c} \\right)^2 + \\frac{L}{8}\\left( \\frac{f}{c} \\right)'],
    vars: [['V', 'Volumen', 'm³'], ['S', 'Superficie total', 'm²'], ['L', 'Suma de las longitudes de las 12 aristas', 'm'], ['N', 'Número de modos por debajo de f', '—']],
    why: 'Los modos se amontonan con el cubo de la frecuencia: pocos y separados en graves, muchísimos en agudos. La suite compara esta curva con el conteo real para mostrar dónde la sala deja de «tener huecos».',
    valid: 'Es una expresión asintótica: muy buena en frecuencias altas y aproximada cuando hay pocos modos.',
    ref: 'H. Weyl (1911). P. M. Morse y K. U. Ingard, Theoretical Acoustics, cap. 9.',
    uses: [['modes', 'Graves y modos propios']],
    check: (x) => {
      const V = x.Lx * x.Ly * x.Lz;
      const S = 2 * (x.Lx * x.Ly + x.Lx * x.Lz + x.Ly * x.Lz);
      const L = 4 * (x.Lx + x.Ly + x.Lz);
      const fr = x.schroeder.fsApprox || 100;
      const k = fr / x.c;
      const manual = ((4 * Math.PI) / 3) * V * k ** 3 + (Math.PI / 4) * S * k ** 2 + (L / 8) * k;
      return {
        steps: [`N(${f(fr, 1)}) = \\frac{4\\pi}{3} \\cdot ${f(V)} \\cdot ${f(k, 4)}^3 + \\frac{\\pi}{4} \\cdot ${f(S)} \\cdot ${f(k, 4)}^2 + \\frac{${f(L)}}{8} \\cdot ${f(k, 4)} = ${f(manual)}`],
        label: `Modos por debajo de ${f(fr, 1)} Hz`,
        manual,
        engine: modalDensityN(fr, V, S, L, x.c),
        unit: 'modos',
        tolerance: 0.006,
      };
    },
  },
  {
    id: 'bonello',
    group: 'Graves y modos propios',
    title: 'Criterio de Bonello',
    what: 'Una prueba para saber si los modos graves están bien repartidos o si se amontonan en unas pocas notas.',
    formulas: ['N_{i+1} \\ge N_i'],
    vars: [['N_i', 'Número de modos en la banda i de tercio de octava', '—']],
    why: 'El oído integra en bandas de aproximadamente un tercio de octava. Si al subir de banda el número de modos nunca baja, y no coinciden dos modos en la misma frecuencia salvo que la banda tenga cinco o más, la respuesta en graves resulta pareja.',
    valid: 'Se evalúa hasta la frecuencia de Schroeder y solo tiene sentido en salas pequeñas. Es condición de buen reparto, no garantía de buena acústica.',
    ref: 'O. J. Bonello, «A new criterion for the distribution of normal room modes», J. Audio Eng. Soc. 29 (1981).',
    uses: [['modes', 'Graves y modos propios']],
    check: null,
  },
  {
    id: 'amortiguamiento',
    group: 'Graves y modos propios',
    title: 'Decaimiento de un modo',
    what: 'Qué tan rápido se apaga una resonancia cuando cesa el sonido, y qué tan «ancha» es en frecuencia.',
    formulas: ['\\delta = \\frac{3\\,\\ln 10}{T_{60}}', '\\tau = \\frac{1}{\\delta}', '\\Delta f = \\frac{\\delta}{\\pi} \\approx \\frac{2.2}{T_{60}}'],
    vars: [['\\delta', 'Constante de amortiguamiento de la presión', 's⁻¹'], ['\\tau', 'Tiempo en caer a 1/e', 's'], ['\\Delta f', 'Ancho de banda del modo a −3 dB', 'Hz']],
    why: 'Un modo decae como e^(−δt). Si el tiempo de reverberación es largo, δ es pequeño: el modo suena mucho rato y su pico es angosto, justo lo que se percibe como una nota que retumba.',
    valid: 'Decaimiento exponencial simple, con el mismo T60 para todos los modos.',
    ref: 'H. Kuttruff, Room Acoustics, cap. 3.',
    uses: [['modes', 'Graves y modos propios']],
    check: (x) => {
      const manual = (3 * Math.LN10) / Math.max(0.01, x.t60);
      return {
        steps: [`\\delta = \\frac{3 \\cdot 2.3026}{${f(x.t60, 3)}} = ${f(manual, 3)}\\ \\text{s⁻¹}`],
        label: 'Amortiguamiento modal',
        manual,
        engine: calculateModalDamping(x.t60).delta,
        unit: 's⁻¹',
        digits: 3,
      };
    },
  },

  /* -------------------------------------------------- Inteligibilidad de voz */
  {
    id: 'alcons',
    group: 'Inteligibilidad de la voz',
    title: 'Pérdida de articulación de consonantes (%ALcons)',
    what: 'Qué porcentaje de consonantes se pierde en el camino entre quien habla y quien escucha. Cuanto más bajo, mejor se entiende.',
    formulas: [
      '\\%AL_{cons} = \\frac{200\\,d^2\\,T_{60}^2}{V\\,Q} + a \\qquad \\text{si } d \\le 3.16\\,D_c',
      '\\%AL_{cons} = 9\\,T_{60} + a \\qquad \\text{si } d > 3.16\\,D_c',
    ],
    vars: [['d', 'Distancia entre hablante y oyente', 'm'], ['T_{60}', 'Tiempo de reverberación a 2 kHz', 's'], ['V', 'Volumen', 'm³'], ['Q', 'Directividad de la fuente', '—'], ['a', 'Corrección por el oyente (1,5 % para uno atento)', '%']],
    why: 'Las consonantes cargan casi toda la información del habla y son las primeras que tapa la reverberación. Cerca de la fuente la pérdida crece con el cuadrado de la distancia; lejos se estanca en un valor que solo depende de la sala.',
    valid: 'Modelo empírico para voz sin refuerzo, sin ruido de fondo apreciable. Referencia: menos de 7 % es muy bueno; más de 15 % es insuficiente.',
    ref: 'V. M. A. Peutz, «Articulation loss of consonants as a criterion for speech transmission in a room», J. Audio Eng. Soc. 19 (1971).',
    uses: [['intelligibility', 'Inteligibilidad']],
    check: (x) => {
      const d = Math.max(0.1, x.source.distance || 1);
      const Q = Math.max(1, x.source.directivity || 1);
      const T = Math.max(0.05, x.rt[2000]?.sabine ?? 1);
      const R = x.field[2000]?.roomConstant ?? 1;
      const dLim = 3.16 * Math.sqrt((Q * R) / (16 * Math.PI));
      const near = d <= dLim;
      const manual = Math.min(100, Math.max(1.5, near ? (200 * d * d * T * T) / (x.V * Q) + 1.5 : 9 * T + 1.5));
      return {
        steps: [
          `3.16\\,D_c = ${f(dLim)}\\ \\text{m} \\quad \\to \\quad d = ${f(d)}\\ \\text{m}\\ ${near ? '\\le' : '>'}\\ ${f(dLim)}\\ \\text{m}`,
          near ? `\\%AL_{cons} = \\frac{200 \\cdot ${f(d)}^2 \\cdot ${f(T, 3)}^2}{${f(x.V)} \\cdot ${Q}} + 1.5 = ${f(manual)}\\ \\%` : `\\%AL_{cons} = 9 \\cdot ${f(T, 3)} + 1.5 = ${f(manual)}\\ \\%`,
        ],
        label: '%ALcons en la posición del oyente',
        manual,
        engine: calculatePeutzAlcons(d, T, x.V, Q, 1.5, R).alcons,
        unit: '%',
        tolerance: 0.011,
      };
    },
  },
  {
    id: 'sti',
    group: 'Inteligibilidad de la voz',
    title: 'Índice de transmisión del habla (STI)',
    what: 'La misma inteligibilidad expresada en la escala de 0 a 1 que usan las normas: 0,6 o más es buena; 0,75 o más, excelente.',
    formulas: ['STI = 0.9482 - 0.1845\\,\\ln(\\%AL_{cons})'],
    vars: [['\\%AL_{cons}', 'Pérdida de articulación de consonantes', '%'], ['STI', 'Índice de transmisión del habla', '0 – 1']],
    why: 'Permite comparar el resultado de Peutz con los requisitos que suelen pedirse en STI (megafonía, aulas, evacuación) sin tener que medir la función de transferencia de modulación.',
    valid: 'Es una correlación empírica entre dos indicadores, no una medición de STI. Para certificar se debe medir según IEC 60268-16.',
    ref: 'Relación empírica de Farrell Becker. STI: IEC 60268-16. Escala de calidad: ISO 9921.',
    uses: [['intelligibility', 'Inteligibilidad']],
    check: (x) => {
      const d = Math.max(0.1, x.source.distance || 1);
      const Q = Math.max(1, x.source.directivity || 1);
      const al = calculatePeutzAlcons(d, x.rt[2000]?.sabine ?? 1, x.V, Q, 1.5, x.field[2000]?.roomConstant ?? 1).alcons;
      const manual = Math.max(0, Math.min(1, 0.9482 - 0.1845 * Math.log(Math.max(0.5, al))));
      return {
        steps: [`STI = 0.9482 - 0.1845 \\cdot \\ln(${f(al)}) = ${f(manual)}`],
        label: 'STI estimado',
        manual,
        engine: alconsToSti(al),
        unit: '',
        tolerance: 0.006,
      };
    },
  },

  /* ---------------------------------------------------------------- Difusores */
  {
    id: 'difusores',
    group: 'Difusores',
    title: 'Dimensionado de difusores de Schroeder (QRD y PRD)',
    what: 'Las medidas de fabricación de un difusor: cuántas ranuras lleva, qué ancho tiene cada una y qué profundidad le corresponde.',
    formulas: [
      'W = \\frac{c}{2 f_{max}} - T',
      'p \\ge 2n\\,\\frac{f_{max}}{f_0} \\quad (p \\text{ primo})',
      's_n = n^2 \\bmod p \\quad \\text{(QRD)} \\qquad s_n = g^n \\bmod p \\quad \\text{(PRD)}',
      'd_n = s_n\\,\\frac{\\lambda_0}{2p}',
    ],
    vars: [['f_0, f_{max}', 'Frecuencia de diseño y frecuencia máxima', 'Hz'], ['T', 'Espesor de las aletas separadoras', 'm'], ['p', 'Número primo de ranuras por período', '—'], ['s_n', 'Secuencia numérica (residuo cuadrático o raíz primitiva)', '—'], ['d_n', 'Profundidad de la ranura n', 'm'], ['\\lambda_0', 'Longitud de onda en la frecuencia de diseño', 'm']],
    why: 'Las profundidades siguen una secuencia de teoría de números cuya transformada de Fourier es plana: por eso la energía se reparte por igual en todas las direcciones. El ancho W limita la frecuencia más alta y la profundidad máxima, la más baja.',
    valid: 'El difusor trabaja entre f₀ y f_max (ranuras más estrechas que media longitud de onda). Ranuras muy angostas añaden absorción no deseada.',
    ref: 'M. R. Schroeder, J. Acoust. Soc. Am. 57 (1975) y 65 (1979). T. J. Cox y P. D’Antonio, Acoustic Absorbers and Diffusers.',
    uses: [['diffusers', 'Diseño de difusores']],
    check: () => {
      const cfg = loadDiffuserConfig();
      const d = designFromConfig(cfg);
      if (d.type === 'poly') {
        const manual = d.radius - Math.sqrt(d.radius ** 2 - (d.chord / 2) ** 2);
        return {
          steps: [`h = R - \\sqrt{R^2 - (c/2)^2} = ${f(d.radius)} - \\sqrt{${f(d.radius)}^2 - ${f(d.chord / 2)}^2} = ${f(manual * 100, 1)}\\ \\text{cm}`],
          label: 'Flecha del policilindro de tu diseño',
          manual: manual * 100,
          engine: d.sagitta * 100,
          unit: 'cm',
          digits: 1,
        };
      }
      if (d.type === 'mls') {
        const manual = d.c / d.f0 / 2 - d.T;
        return {
          steps: [`W = \\frac{\\lambda_0}{2} - T = \\frac{${f(d.c, 0)}}{2 \\cdot ${f(d.f0, 0)}} - ${f(d.T, 3)} = ${f(manual * 100, 1)}\\ \\text{cm}`],
          label: 'Ancho de tramo del MLS de tu diseño',
          manual: manual * 100,
          engine: d.W * 100,
          unit: 'cm',
          digits: 1,
        };
      }
      const manual = d.c / (2 * d.fMax) - d.T;
      return {
        steps: [`W = \\frac{${f(d.c, 0)}}{2 \\cdot ${f(d.fMax, 0)}} - ${f(d.T, 3)} = ${f(manual * 100, 2)}\\ \\text{cm}`, `\\frac{\\lambda_0}{2p} = \\frac{${f(d.c, 0)}}{2 \\cdot ${d.p} \\cdot ${f(d.f0, 0)}} = ${f((d.c / (2 * d.p * d.f0)) * 100, 2)}\\ \\text{cm}`],
        label: 'Ancho de ranura de tu último diseño',
        manual: manual * 100,
        engine: d.W * 100,
        unit: 'cm',
      };
    },
  },
  {
    id: 'difusion',
    group: 'Difusores',
    title: 'Respuesta polar y coeficientes de difusión',
    what: 'Hacia dónde manda el sonido un difusor y qué tan parejo lo reparte, en un número de 0 (todo en una dirección) a 1 (igual en todas).',
    formulas: [
      'p(\\theta) \\propto \\sum_{e} R_e\\,w_e\\,\\frac{\\sin(k w_e u/2)}{k w_e u/2}\\,e^{j k x_e u}, \\qquad u = \\sin\\theta + \\sin\\psi',
      'd = \\frac{\\left( \\sum_{i} I_i \\right)^2 - \\sum_{i} I_i^2}{(n - 1)\\sum_{i} I_i^2}',
      'd_n = \\frac{d - d_{ref}}{1 - d_{ref}}',
      's = 1 - \\left| \\frac{1}{N}\\sum_{n} e^{-2jk d_n} \\right|^2',
    ],
    vars: [['R_e = e^{-2jkd_e}', 'Reflexión de cada ranura (ida y vuelta por su fondo)', '—'], ['w_e, x_e', 'Ancho y posición de cada ranura', 'm'], ['\\theta, \\psi', 'Ángulos de recepción y de incidencia', '°'], ['I_i', 'Intensidad en el receptor i (37 receptores de −90° a 90°)', '—'], ['d_{ref}', 'Difusión de una placa plana del mismo tamaño', '—']],
    why: 'La primera expresión es el modelo de campo lejano (Fraunhofer): cada ranura refleja con el desfase de su profundidad. Con esa respuesta polar se calcula el coeficiente de difusión de la norma y se normaliza frente a una superficie plana, para no premiar el simple efecto de borde.',
    valid: 'Aproximación de campo lejano: fiable en la banda de diseño y solo orientativa en baja frecuencia. No reemplaza la medición según ISO 17497.',
    ref: 'AES-4id-2001 e ISO 17497-2 (difusión). ISO 17497-1 (dispersión). Cox y D’Antonio, Acoustic Absorbers and Diffusers.',
    uses: [['diffusers', 'Diseño de difusores']],
    check: null,
  },

  /* ---------------------------------------------------------------- Constantes */
  {
    id: 'velocidad-sonido',
    group: 'Constantes',
    title: 'Velocidad del sonido en el aire',
    what: 'A qué velocidad viaja el sonido según la temperatura de la sala.',
    formulas: ['c = 331.3\\sqrt{1 + \\frac{t}{273.15}}'],
    vars: [['t', 'Temperatura del aire', '°C'], ['c', 'Velocidad del sonido', 'm/s']],
    why: 'Las frecuencias de los modos y las longitudes de onda de un difusor dependen de c. A 20 °C vale unos 343 m/s y sube cerca de 0,6 m/s por cada grado.',
    valid: 'Aire seco tratado como gas ideal; la humedad lo cambia menos del 0,5 %.',
    ref: 'Ley de los gases ideales. ISO 9613-1.',
    uses: [['modes', 'Graves y modos propios'], ['diffusers', 'Diseño de difusores']],
    check: (x) => {
      const manual = 331.3 * Math.sqrt(1 + x.tempC / 273.15);
      return {
        steps: [`c = 331.3\\sqrt{1 + \\frac{${f(x.tempC, 1)}}{273.15}} = ${f(manual)}\\ \\text{m/s}`],
        label: `Velocidad del sonido a ${f(x.tempC, 1)} °C`,
        manual,
        engine: speedOfSoundFromTemperature(x.tempC),
        unit: 'm/s',
        tolerance: 0.006,
      };
    },
  },
];

/** Ejecuta la comprobación de una ficha y dice si coincide con el motor. */
export function runCheck(ficha, ctx) {
  if (!ficha.check) return null;
  try {
    const r = ficha.check(ctx);
    const ok = Number.isFinite(r.manual) && Number.isFinite(r.engine) && Math.abs(r.manual - r.engine) <= (r.tolerance ?? Math.max(0.002, Math.abs(r.engine) * 0.002));
    return { ...r, ok };
  } catch (err) {
    return { steps: [], label: 'No se pudo comprobar con los datos actuales', manual: NaN, engine: NaN, unit: '', ok: false, error: err.message };
  }
}
