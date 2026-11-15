import { describe, it, expect } from 'vitest';
import { texToMathML } from '../Tex';

const body = (tex) => texToMathML(tex).replace(/^<math[^>]*>/, '').replace(/<\/math>$/, '');

describe('texToMathML', () => {
  it('fracciones, subíndices y números decimales', () => {
    expect(body('T_{60} = \\frac{0.161 V}{A}')).toBe(
      '<mrow><msub><mi>T</mi><mrow><mn>60</mn></mrow></msub><mo>=</mo><mfrac><mrow><mn>0.161</mn><mi>V</mi></mrow><mrow><mi>A</mi></mrow></mfrac></mrow>'
    );
  });

  it('raíces, griegas y barra de promedio', () => {
    expect(body('\\sqrt{\\bar{\\alpha}}')).toBe('<mrow><msqrt><mrow><mover><mrow><mi>α</mi></mrow><mo stretchy="false">¯</mo></mover></mrow></msqrt></mrow>');
  });

  it('sumatorias con límites y funciones', () => {
    const out = body('\\sum_{i=1}^{n} S_i \\ln(1 - \\alpha_i)');
    expect(out).toContain('<munderover><mo>∑</mo>');
    expect(out).toContain('<mi mathvariant="normal">ln</mi>');
    expect(out).toContain('<mo>−</mo>');
  });

  it('escapa caracteres de marcado y admite texto', () => {
    expect(body('a < b')).toContain('<mo>&lt;</mo>');
    expect(body('\\text{si } d \\le D')).toContain('<mtext>si </mtext>');
  });

  it('espacios, mod y comandos desconocidos', () => {
    expect(body('a\\,b')).toBe('<mrow><mi>a</mi><mspace width="0.17em"/><mi>b</mi></mrow>');
    expect(body('n^2 \\bmod p')).toContain('<mi mathvariant="normal">mod</mi>');
    expect(body('\\ell')).toContain('ℓ');
    expect(body('\\noexiste')).toContain('<merror>');
  });

  it('modo en línea', () => {
    expect(texToMathML('x', false)).toContain('display="inline"');
  });
});
