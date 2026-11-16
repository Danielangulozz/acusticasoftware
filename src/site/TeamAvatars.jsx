import React from 'react';

/**
 * Avatares ilustrados del equipo (dibujo propio, sin fotos). Cada uno es un SVG de 200×200 con
 * la cabeza agrupada en `.pz-avatar-head`, que se mueve un poco al pasar el mouse por la tarjeta.
 */

const INK = '#1f1a17';

function Shell({ children, title }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label={title}>
      {children}
    </svg>
  );
}

/**
 * Mano que saluda: queda escondida bajo el borde inferior del dibujo y, al pasar el mouse por la
 * tarjeta, sube y se mueve de lado a lado (animación en index.css, clase .pz-avatar-wave).
 */
function Wave({ skin, sleeve, thin = false }) {
  const shade = 'rgb(0 0 0 / 0.12)';
  return (
    <g className="pz-avatar-wave">
      <rect x={thin ? 151 : 147} y="166" width={thin ? 18 : 26} height="44" rx="9" fill={sleeve} />
      <rect x={thin ? 153 : 151} y="134" width={thin ? 14 : 18} height="40" rx="7" fill={skin} />
      <rect x="146" y="110" width="28" height="30" rx="11" fill={skin} />
      {[[147, 98], [153.5, 92], [160, 93], [166.5, 99]].map(([x, y]) => (
        <rect key={x} x={x} y={y} width="6.5" height="26" rx="3.25" fill={skin} />
      ))}
      <path d="M151 132 L140.5 118" fill="none" stroke={skin} strokeWidth="7" strokeLinecap="round" />
      <path d="M150 128 Q160 133 170 128" fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/* Daniel: peinado con copete, sonrisa segura, audífonos al cuello y un destello */
export function DanielAvatar() {
  const skin = '#e8b48c';
  return (
    <Shell title="Avatar ilustrado de Daniel">
      <path d="M38 200 C42 160 68 144 100 144 C132 144 158 160 162 200Z" fill="#5833c7" />
      <path d="M86 144 L100 166 L114 144Z" fill="#f4efe7" />
      {/* Audífonos al cuello: la diadema pasa por detrás del cuello y las copas descansan a los lados */}
      <path d="M76 150 C76 128 124 128 124 150" fill="none" stroke="#26252b" strokeWidth="5" strokeLinecap="round" />
      <rect x="87" y="118" width="26" height="30" rx="10" fill={skin} />
      <ellipse cx="76" cy="152" rx="9" ry="11.5" transform="rotate(-18 76 152)" fill="#26252b" />
      <ellipse cx="124" cy="152" rx="9" ry="11.5" transform="rotate(18 124 152)" fill="#26252b" />
      <ellipse cx="78.5" cy="151.5" rx="4.5" ry="7" transform="rotate(-18 78.5 151.5)" fill="#8767f9" />
      <ellipse cx="121.5" cy="151.5" rx="4.5" ry="7" transform="rotate(18 121.5 151.5)" fill="#8767f9" />
      <Wave skin={skin} sleeve="#5833c7" />
      <g className="pz-avatar-head">
        <circle cx="63" cy="96" r="9" fill={skin} />
        <circle cx="137" cy="96" r="9" fill={skin} />
        <ellipse cx="100" cy="92" rx="37" ry="42" fill={skin} />
        {/* Sombra de barba */}
        <path d="M70 108 C76 128 90 134 100 134 C110 134 124 128 130 108 C122 122 112 127 100 127 C88 127 78 122 70 108Z" fill={INK} opacity="0.07" />
        {/* Peinado de lado con volumen */}
        <path d="M62 94 C56 60 74 38 100 36 C128 34 146 54 139 94 C136 80 132 72 126 66 C110 72 88 72 72 64 C66 72 63 82 62 94Z" fill="#2a1d17" />
        <path d="M64 70 C66 40 100 22 130 34 C146 40 150 56 144 66 C136 56 122 50 106 52 C90 54 78 62 64 70Z" fill="#2a1d17" />
        <path d="M84 44 C100 34 124 34 138 46" fill="none" stroke="#4a3528" strokeWidth="3" strokeLinecap="round" />
        <path d="M78 56 C92 48 110 46 126 50" fill="none" stroke="#4a3528" strokeWidth="2.5" strokeLinecap="round" />
        {/* Cejas, ojos (guiño) y sonrisa */}
        <path d="M78 82 L94 80" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M106 80 L122 82" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="86" cy="95" rx="4.5" ry="5" fill={INK} />
        <circle cx="87.5" cy="93.5" r="1.4" fill="#fff" />
        <path d="M108 95 Q114 90 120 95" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M86 111 Q100 125 114 111 Q100 117 86 111Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M99 99 Q96 106 101 107" fill="none" stroke="#c48a64" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Destello */}
      <path className="pz-avatar-spark" d="M160 46 L164 56 L174 60 L164 64 L160 74 L156 64 L146 60 L156 56Z" fill="#f2b84b" />
    </Shell>
  );
}

/* Jerónimo: gafas redondas, pelo corto y suéter ámbar */
export function JeronimoAvatar() {
  const skin = '#d49c76';
  return (
    <Shell title="Avatar ilustrado de Jerónimo">
      <path d="M40 200 C44 162 70 146 100 146 C130 146 156 162 160 200Z" fill="#e0a33f" />
      <path d="M80 148 C88 160 112 160 120 148" fill="none" stroke="#b9792b" strokeWidth="6" strokeLinecap="round" />
      <rect x="87" y="120" width="26" height="28" rx="10" fill={skin} />
      <Wave skin={skin} sleeve="#e0a33f" />
      <g className="pz-avatar-head">
        <circle cx="62" cy="96" r="9" fill={skin} />
        <circle cx="138" cy="96" r="9" fill={skin} />
        <ellipse cx="100" cy="93" rx="38" ry="40" fill={skin} />
        <path d="M62 88 C60 54 82 44 100 44 C120 44 141 54 138 88 C131 71 118 64 100 64 C82 64 70 71 62 88Z" fill="#3b2a20" />
        <path d="M78 54 C90 46 112 46 124 54" fill="none" stroke="#56402f" strokeWidth="3" strokeLinecap="round" />
        {/* Gafas */}
        <circle cx="84" cy="96" r="13" fill="#ffffff" fillOpacity="0.28" stroke={INK} strokeWidth="3.5" />
        <circle cx="116" cy="96" r="13" fill="#ffffff" fillOpacity="0.28" stroke={INK} strokeWidth="3.5" />
        <path d="M97 95 Q100 92 103 95" fill="none" stroke={INK} strokeWidth="3" />
        <path d="M71 94 L63 91" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M129 94 L137 91" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="84" cy="97" r="3.6" fill={INK} />
        <circle cx="116" cy="97" r="3.6" fill={INK} />
        <path d="M76 77 L92 76" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M108 76 L124 77" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M99 103 Q96 110 101 111" fill="none" stroke="#b07c58" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M89 117 Q100 125 111 117" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </Shell>
  );
}

/* Brandon: cara larga y flaca, cuello largo, pelo despeinado y sonrisa de dientón */
export function BrandonAvatar() {
  const skin = '#f0c4a0';
  return (
    <Shell title="Avatar ilustrado de Brandon">
      <path d="M60 200 C63 170 80 156 100 156 C120 156 137 170 140 200Z" fill="#b9a8f5" />
      <rect x="92" y="124" width="16" height="36" rx="7" fill={skin} />
      <Wave skin={skin} sleeve="#b9a8f5" thin />
      <g className="pz-avatar-head">
        <ellipse cx="70" cy="90" rx="10" ry="12" fill={skin} />
        <ellipse cx="130" cy="90" rx="10" ry="12" fill={skin} />
        <ellipse cx="100" cy="86" rx="29" ry="47" fill={skin} />
        {/* Pelo despeinado */}
        <path d="M70 72 L72 44 L82 58 L86 32 L98 52 L106 28 L112 52 L124 34 L124 58 L134 50 L130 72 C120 58 82 56 70 72Z" fill="#4a3426" />
        {/* Cejas levantadas y ojos disparejos */}
        <path d="M82 74 Q89 68 96 73" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M105 71 Q112 65 119 71" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="89" cy="86" r="5" fill="#fff" />
        <circle cx="112" cy="85" r="6.5" fill="#fff" />
        <circle cx="90" cy="87" r="2.6" fill={INK} />
        <circle cx="111" cy="86" r="3.2" fill={INK} />
        <ellipse cx="101" cy="102" rx="6" ry="8" fill="#e3a982" />
        {/* Sonrisa con diente */}
        <path d="M84 116 Q100 132 116 114" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <rect x="96" y="119" width="8" height="8" rx="1.5" fill="#fff" stroke={INK} strokeWidth="2" />
      </g>
    </Shell>
  );
}

export const AVATARS = { daniel: DanielAvatar, jeronimo: JeronimoAvatar, brandon: BrandonAvatar };
