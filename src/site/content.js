import { AudioWaveform, FileStack, Grid3x3, MessageSquareText, Mic2, Waves } from 'lucide-react';

/** Textos y datos de la página principal. */

export const SPACES_MARQUEE = ['Estudios de grabación', 'Home studios', 'Auditorios', 'Aulas', 'Salas de ensayo', 'Restaurantes', 'Oficinas abiertas', 'Templos', 'Home cinema', 'Salas de conferencias'];

export const HERO_HOTSPOTS = [
  { x: 24.5, y: 28, label: 'Difusor QRD', side: 'top' },
  { x: 44.5, y: 20, label: 'Trampa de graves', side: 'top' },
  { x: 62, y: 21.5, label: 'Nube absorbente', side: 'top' },
  { x: 75, y: 40, label: 'Panel de listones', side: 'right' },
];

export const SERVICES = [
  {
    icon: Mic2,
    title: 'Diagnóstico y medición in situ',
    idealFor: 'Salas construidas con exceso de reverberación, ruido o poca claridad',
    text: 'Medimos cómo suena hoy tu espacio (RT60, claridad C80/D50 y mapa de presión sonora) bajo norma ISO 3382 para saber exactamente qué corregir.',
    tags: ['ISO 3382', 'REW', 'Mapas SPL'],
    suiteHash: 'modes',
    suiteLabel: 'Ver panel in situ',
  },
  {
    icon: AudioWaveform,
    title: 'Tratamiento acústico y control de reverberación',
    idealFor: 'Estudios, restaurantes, oficinas y salas de ensayo',
    text: 'Calculamos cuántos metros cuadrados de paneles absorbentes y trampas de graves necesitas para llevar el tiempo de reverberación al punto ideal.',
    tags: ['Sabine', 'Eyring', 'Millington'],
    suiteHash: 'materials',
    suiteLabel: 'Simular materiales',
  },
  {
    icon: Grid3x3,
    title: 'Difusores acústicos a medida',
    idealFor: 'Salas de mezcla, control rooms, auditorios y cines',
    text: 'Diseñamos difusores QRD, PRD, MLS y policilíndricos para tu rango de frecuencias exacto, eliminando ecos sin apagar la vida de la sala.',
    tags: ['Schroeder', 'ISO 17497', 'Planos de corte'],
    feature: true,
    suiteHash: 'diffusers',
    suiteLabel: 'Diseñar difusor',
  },
  {
    icon: Waves,
    title: 'Control de graves y modos propios',
    idealFor: 'Cuartos pequeños, home studios y cabinas',
    text: 'Identificamos las frecuencias donde los graves retumban o se cancelan (frecuencia de Schroeder, criterio de Bonello y proporciones de Bolt).',
    tags: ['Modos (x,y,z)', 'Bonello', 'Bolt'],
    suiteHash: 'modes',
    suiteLabel: 'Analizar modos',
  },
  {
    icon: MessageSquareText,
    title: 'Claridad e inteligibilidad de la voz',
    idealFor: 'Aulas de clase, templos, auditorios y salas de juntas',
    text: 'Predecimos el porcentaje de pérdida de consonantes (%ALcons y STI) para garantizar que cada palabra se entienda desde la primera hasta la última fila.',
    tags: ['%ALcons', 'STI', 'ISO 9921'],
    suiteHash: 'intelligibility',
    suiteLabel: 'Evaluar voz',
  },
  {
    icon: FileStack,
    title: 'Simulación 3D e informe para obra',
    idealFor: 'Arquitectos, ingenieros e instituciones',
    text: 'Modelamos la geometría 2D/3D de tu recinto, comparamos el antes y después del tratamiento y entregamos memoria técnica lista para instalar.',
    tags: ['Modelo 3D', 'Informe PDF', 'CSV'],
    suiteHash: 'overview',
    suiteLabel: 'Ver vista 3D',
  },
];

export const PRODUCTS = [
  {
    id: 'absorbente',
    name: 'Paneles absorbentes',
    text: 'Controlan la reverberación y las primeras reflexiones. Núcleo mineral, bastidor de madera y tela acústica del color que elijas.',
    specs: ['α ≈ 0.95 en medios', '50 – 100 mm'],
  },
  {
    id: 'trampa',
    name: 'Trampas de graves',
    text: 'Van en las esquinas, donde más presión acumulan los modos propios. Emparejan la respuesta por debajo de 250 Hz.',
    specs: ['40 – 250 Hz', 'De piso a techo'],
  },
  {
    id: 'qrd',
    name: 'Difusor QRD',
    text: 'Ranuras de profundidad calculada con residuos cuadráticos: reparte la energía en un plano sin secar la sala.',
    specs: ['sₙ = n² mod p', 'Banda a medida'],
  },
  {
    id: 'skyline',
    name: 'Difusor skyline 2D',
    text: 'Bloques de madera con alturas QRD bidimensionales. Dispersa en horizontal y vertical: ideal para la pared trasera.',
    specs: ['(m² + n²) mod p', 'Roble o nogal'],
  },
  {
    id: 'policilindrico',
    name: 'Difusor policilíndrico',
    text: 'Superficies convexas que abren la imagen sonora y cubren una banda amplia con muy poca absorción.',
    specs: ['Radio < 5 m', 'Madera curvada'],
  },
  {
    id: 'listones',
    name: 'Panel de listones',
    text: 'Listones sobre fieltro absorbente: baja la reverberación en medios y deja un acabado cálido de madera.',
    specs: ['Listón + fieltro', 'Muro o techo'],
  },
  {
    id: 'nube',
    name: 'Nubes y bafles de techo',
    text: 'Absorción suspendida que trabaja por ambas caras. Trata el techo sin perder altura ni tapar instalaciones.',
    specs: ['Doble cara', 'Altura regulable'],
  },
];

export const SPACES = [
  {
    id: 'cine',
    tab: 'Cine en casa',
    render: 'cine',
    title: 'Diálogos claros y graves que se sienten, no que retumban.',
    text: 'Frente absorbente tras la pantalla, paneles y listones en los laterales y difusión hacia el fondo para que la sala envuelva sin generar eco flotante.',
    bullets: ['Control de primeras reflexiones laterales', 'Difusor QRD en la zona posterior', 'Tarima y butacas ubicadas fuera de los nodos modales'],
    targets: [['RT60 objetivo', '0.3 – 0.5 s'], ['Ruido de fondo', 'NC 20 – 25']],
  },
  {
    id: 'estudio',
    tab: 'Estudios y home studios',
    render: 'estudio-tratado',
    title: 'Una escucha en la que puedas confiar al mezclar.',
    text: 'Zona de mezcla simétrica con nube y paneles en las primeras reflexiones, trampas de graves en las esquinas y difusión detrás del punto de escucha.',
    bullets: ['Respuesta de graves pareja en el punto de mezcla', 'Imagen estéreo estable y sin coloraciones', 'Difusores calculados para tu banda de trabajo'],
    targets: [['RT60 objetivo', '0.2 – 0.3 s'], ['Criterio', 'ITU-R BS.1116']],
  },
  {
    id: 'juntas',
    tab: 'Oficinas, aulas y salas de juntas',
    render: 'juntas',
    title: 'Que cada palabra se entienda, también por videollamada.',
    text: 'Bafles suspendidos sobre la mesa, mosaicos de fieltro y listones que bajan la reverberación sin sacrificar el diseño interior.',
    bullets: ['Menos fatiga en reuniones largas', 'Mejor captación de micrófonos de conferencia', 'Tratamiento integrado a la identidad del espacio'],
    targets: [['RT60 objetivo', '0.4 – 0.6 s'], ['Inteligibilidad', '%ALcons < 7 %']],
  },
];

export const PROCESS = [
  { n: '01', title: 'Escuchar tu necesidad', text: 'Conversamos sobre el uso de tu sala (música, voz, mezcla o restaurante), sus medidas y el resultado que buscas.', deliverable: 'Definición de metas acústicas' },
  { n: '02', title: 'Medir el espacio', text: 'Levantamos la geometría real y capturamos respuestas al impulso con micrófono de medición en distintos puntos.', deliverable: 'Diagnóstico acústico base' },
  { n: '03', title: 'Simular en POZOLE Suite', text: 'Modelamos la reverberación, los modos graves y la inteligibilidad para probar soluciones antes de fabricar.', deliverable: 'Simulación antes vs. después' },
  { n: '04', title: 'Diseñar el tratamiento', text: 'Especificamos materiales absorbentes, trampas y difusores a medida con ubicación exacta y lista de corte.', deliverable: 'Planos y guía de instalación' },
  { n: '05', title: 'Verificar resultados', text: 'Tras instalar el tratamiento, volvemos a medir para comprobar que la sala cumple con el objetivo diseñado.', deliverable: 'Informe técnico final' },
];

export const PLANS = [
  {
    name: 'Diagnóstico',
    tagline: 'Para saber qué le pasa a tu sala.',
    items: ['Visita y medición in situ (RT60, respuesta en frecuencia)', 'Modelo de la sala en POZOLE Suite', 'Informe con hallazgos y prioridades'],
  },
  {
    name: 'Diseño acústico',
    tagline: 'Para dejarlo resuelto en planos.',
    featured: true,
    items: ['Todo lo del diagnóstico', 'Simulación del antes y el después', 'Selección y ubicación de cada tratamiento', 'Difusores calculados a medida con lista de corte', 'Planos y guía de instalación'],
  },
  {
    name: 'Llave en mano',
    tagline: 'Para no preocuparte por nada.',
    items: ['Todo lo del diseño acústico', 'Fabricación e instalación del tratamiento', 'Medición de verificación', 'Informe técnico final'],
  },
];

export const FAQ = [
  {
    q: '¿Aislar y acondicionar es lo mismo?',
    a: 'No. Aislar evita que el sonido entre o salga del recinto (masa, hermeticidad, desacople). Acondicionar mejora cómo suena por dentro con absorción y difusión. Nuestro foco es el acondicionamiento; si además necesitas aislamiento, lo evaluamos en el diagnóstico.',
  },
  {
    q: '¿No basta con pegar espuma en las paredes?',
    a: 'Casi nunca. La espuma delgada absorbe agudos y deja intactos los graves: la sala queda opaca y a la vez retumbante. Un buen diseño combina absorción de banda ancha, trampas de graves y difusión en las cantidades que pide el cálculo.',
  },
  {
    q: '¿Cuánto tratamiento necesita mi sala?',
    a: 'Depende de su volumen, de los materiales que ya tiene y del uso. Lo calculamos (Sabine, Norris-Eyring y Millington-Sette) para llevar el tiempo de reverberación al valor recomendado. Puedes hacer una primera estimación con la calculadora de esta página.',
  },
  {
    q: '¿Para qué sirve un difusor si ya tengo absorbentes?',
    a: 'El absorbente quita energía; el difusor la reparte. Usar solo absorción deja la sala seca y sin vida. La difusión elimina ecos y focalizaciones conservando la sensación de espacio.',
  },
  {
    q: '¿Puedo usar el simulador sin contratarlos?',
    a: 'Sí. POZOLE Suite es de uso libre: puedes dibujar tu sala, asignar materiales, revisar modos propios, inteligibilidad y diseñar tus propios difusores.',
  },
  {
    q: '¿Cómo sé que el tratamiento funcionó?',
    a: 'Medimos antes y después con el mismo método y comparamos contra la simulación. El informe final muestra las dos mediciones y el objetivo de diseño.',
  },
];
