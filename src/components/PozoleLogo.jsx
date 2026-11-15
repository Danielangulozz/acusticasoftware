import React from 'react';
import { BrandMark } from '../site/BrandMark';

/**
 * PozoleLogo — isotipo de POZOLE ACÚSTICA (cazuela de pozole con ondas de sonido).
 * Se mantiene este componente para no tocar los módulos de la suite que ya lo usan.
 */
export const PozoleLogo = ({ size = 64, className = '' }) => <BrandMark size={size} className={className} />;

export default PozoleLogo;
