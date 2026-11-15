import React, { useMemo } from 'react';

/**
 * Fórmulas matemáticas sin dependencias: convierte un subconjunto de TeX a MathML, que los
 * navegadores actuales dibujan de forma nativa.
 *
 * Admite: números, letras, griegas (\alpha…), \frac{a}{b}, \sqrt{a}, \bar{a}, subíndices y
 * superíndices (_ y ^, con llaves o un solo símbolo), \sum con límites, funciones (\ln, \log…),
 * \text{…}, \left( … \right) y los operadores habituales (\cdot, \le, \approx, \pm…).
 */

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
  pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', psi: 'ψ', Psi: 'Ψ', omega: 'ω', infty: '∞', ell: 'ℓ',
};
const OPERATORS = {
  cdot: '·', times: '×', le: '≤', ge: '≥', approx: '≈', pm: '±', to: '→', neq: '≠', sum: '∑', in: '∈', propto: '∝',
  '%': '%', '{': '{', '}': '}',
};
// Espacios: se dibujan con <mspace> para que no arrastren la separación propia de un operador
const SPACES = { ',': '0.17em', ';': '0.28em', ' ': '0.33em', quad: '1em', qquad: '2em' };
const FUNCTIONS = new Set(['ln', 'log', 'sin', 'cos', 'exp', 'max', 'min', 'mod', 'lim']);

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function texToMathML(source, display = true) {
  const src = String(source);
  let i = 0;

  const skipSpaces = () => {
    while (src[i] === ' ' || src[i] === '\n') i++;
  };

  function parseRow(stop) {
    let out = '';
    for (;;) {
      skipSpaces();
      if (i >= src.length || src[i] === stop) break;
      out += parseTerm();
    }
    return `<mrow>${out}</mrow>`;
  }

  function parseGroup() {
    i++; // {
    const row = parseRow('}');
    i++; // }
    return row;
  }

  function parseArgument() {
    skipSpaces();
    return src[i] === '{' ? parseGroup() : parseAtom();
  }

  function rawGroup() {
    skipSpaces();
    if (src[i] !== '{') return '';
    const end = src.indexOf('}', i);
    const text = src.slice(i + 1, end);
    i = end + 1;
    return text;
  }

  function parseAtom() {
    skipSpaces();
    const c = src[i];
    if (c === undefined) return '';
    if (c === '{') return parseGroup();
    if (c === '\\') {
      i++;
      let name = '';
      if (/[a-zA-Z]/.test(src[i] ?? '')) {
        while (/[a-zA-Z]/.test(src[i] ?? '')) name += src[i++];
      } else {
        name = src[i++];
      }
      if (SPACES[name]) return `<mspace width="${SPACES[name]}"/>`;
      if (name === 'bmod') return '<mspace width="0.28em"/><mi mathvariant="normal">mod</mi><mspace width="0.28em"/>';
      if (name === 'frac') return `<mfrac>${parseArgument()}${parseArgument()}</mfrac>`;
      if (name === 'sqrt') return `<msqrt>${parseArgument()}</msqrt>`;
      if (name === 'bar') return `<mover>${parseArgument()}<mo stretchy="false">¯</mo></mover>`;
      if (name === 'text' || name === 'mathrm') return `<mtext>${escapeXml(rawGroup())}</mtext>`;
      if (name === 'left' || name === 'right') {
        const fence = src[i++];
        return fence === '.' ? '' : `<mo>${escapeXml(fence)}</mo>`;
      }
      if (GREEK[name]) return `<mi>${GREEK[name]}</mi>`;
      if (OPERATORS[name]) return `<mo>${escapeXml(OPERATORS[name])}</mo>`;
      if (FUNCTIONS.has(name)) return `<mi mathvariant="normal">${name}</mi><mo>⁡</mo>`;
      return `<merror><mtext>\\${escapeXml(name)}</mtext></merror>`;
    }
    if (/[0-9]/.test(c)) {
      let num = '';
      while (/[0-9]/.test(src[i] ?? '') || ((src[i] === '.' || src[i] === ',') && /[0-9]/.test(src[i + 1] ?? ''))) num += src[i++];
      return `<mn>${num}</mn>`;
    }
    i++;
    if (/[a-zA-Z]/.test(c)) return `<mi>${c}</mi>`;
    if (c === '-') return '<mo>−</mo>';
    if (c === "'") return '<mo>′</mo>';
    return `<mo>${escapeXml(c)}</mo>`;
  }

  function parseTerm() {
    const base = parseAtom();
    let sub = null;
    let sup = null;
    for (;;) {
      skipSpaces();
      if (src[i] === '_') {
        i++;
        sub = parseArgument();
      } else if (src[i] === '^') {
        i++;
        sup = parseArgument();
      } else break;
    }
    const big = base.includes('∑');
    if (sub && sup) return big ? `<munderover>${base}${sub}${sup}</munderover>` : `<msubsup>${base}${sub}${sup}</msubsup>`;
    if (sub) return big ? `<munder>${base}${sub}</munder>` : `<msub>${base}${sub}</msub>`;
    if (sup) return `<msup>${base}${sup}</msup>`;
    return base;
  }

  const body = parseRow(undefined);
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display ? 'block' : 'inline'}">${body}</math>`;
}

/** <Tex>T = \frac{0.161 V}{A}</Tex> · con `inline` va dentro de una línea de texto. */
export default function Tex({ children, inline = false, className = '' }) {
  const html = useMemo(() => texToMathML(children, !inline), [children, inline]);
  return <span className={`pz-tex ${inline ? '' : 'block overflow-x-auto py-1'} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
