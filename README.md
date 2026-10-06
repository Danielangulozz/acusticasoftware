# 🔊 POZOLE
### **P**ropagación de **O**ndas en **Z**onas y **O**ptimización de **L**ímites **E**spaciales

> **Simulador Profesional e Interactivo de Campo Sonoro y Acústica de Recintos**  
> Desarrollado para la asignatura **Acústica de Recintos 2026**.

---

## 👥 Integrantes del Equipo

- 👨‍💻 **Daniel Angulo**
- 👨‍💻 **Jeronimo Gomez**
- 👨‍💻 **Brandon Guerra**

---

## 📌 Visión General del Proyecto

**POZOLE** es una suite de ingeniería física e interfaz interactiva desarrollada en **React 18** y **Vite** con diseño minimalista inspirado en los estándares de Apple y Tesla. La herramienta permite simular, analizar y optimizar el comportamiento acústico de recintos cerrados en bandas de octava estándar (**125 Hz a 4000 Hz**) y en bajas frecuencias mediante **acústica ondulatoria y modos propios** (**20 Hz a 20 kHz** en bandas de 1/3 de octava ISO 266).

Implementa de forma matemática rigurosa los tres modelos clásicos de tiempo de reverberación ($RT_{60}$): **Sabine**, **Norris-Eyring** y **Millington-Sette**, considerando la disipación atmosférica del aire ($4mV$), directividad espacial de la fuente ($Q = 1, 2, 4, 8$), constante de sala ($R$), distancia crítica ($D_c$), nivel de presión sonora espacial ($L_p$), propagación en campo directo y reverberado, y ahora el análisis completo de modos propios de vibración, frecuencia de Schroeder, criterio de Bonello y proporciones óptimas de Bolt.

---

## 🚀 Características Principales

- 📐 **Geometría y Planta Libre Dinámica**: Editor 2D ortogonal y poligonal de planta libre, cálculo instantáneo de volumen ($V$), área de caras individuales ($S_i$), superficie total ($S$) y recorrido libre medio ($l = 4V/S$).
- 🎨 **Asignación Reactiva de Materiales**: Base de datos de materiales estándar (ISO 354) con coeficientes de absorción ($\alpha$) por octava, edición manual y duplicación rápida entre paredes.
- 🎛️ **Simulador de Fuente y Receptor**: Ajuste interactivo de nivel de potencia ($L_w$ en dB / Watts), directividad ($Q$), distancia ($r$), y switch de absorción atmosférica del aire ($m$).
- 🧊 **Visualizador 3D Interactivo**: Motor SVG ortográfico en perspectiva 3D con rotación orbital, zoom con cursor y halo visual de Distancia Crítica ($D_c$).
- 🌊 **Módulo 6: Acústica Ondulatoria y Modos Propios**:
  1. **Catálogo Modal Analítico**: Cálculo de modos axiales, tangenciales y oblicuos con número de onda $k$, frecuencia $f$, peso energético y clasificación por planos/ejes.
  2. **Histograma de 1/3 de Octava (ISO 266)**: Gráfica de barras apiladas por tipo de modo, tabla sincronizada Frecuencia / Repeticiones / Acumulado y corte de frecuencia de Schroeder ($f_s$).
  3. **Densidad Modal Continua (Ley de Weyl)**: Gráfica de $N(f)$ asintótico vs conteo discreto real y tasa instantánea $\frac{dN}{df}$ (modos/Hz).
  4. **Evaluación Automática del Criterio de Bonello (1981)**: Veredicto visual CUMPLE / NO CUMPLE, diagrama escalonado con bandas infractoras en rojo, y reporte de degeneraciones modales.
  5. **Visor de Campo de Presión Sonora 2D en Tiempo Real**: Canvas interactivo con colormap térmico Jet, animación de oscilación temporal $p(t)$, líneas nodales ($p=0$), cortes en planta (XY) y alzados (XZ, YZ), y sonda live con gráfica $p(t)$.
  6. **Cuadrícula de Medición In Situ y Distribución SPL**: Malla ortogonal con paso de 1.5 m, separación mínima a paredes $\ge 0.7\text{ m}$, 4 esquinas críticas, fuente central $S_0$, importación/exportación CSV y mapa de calor 2D por interpolación IDW.
  7. **Comparativa Multi-Fuente (Teórico vs REW vs FEM)**: Importación y emparejamiento fino de autofrecuencias de simulación FEM (COMSOL) y mediciones experimentales (REW) con cálculo de error absoluto y porcentual.
  8. **Calculadora y Diagrama $p-q$ de Bolt (1946)**: Dimensionamiento óptimo a partir de volumen objetivo para salas pequeñas ($1:1.404:1.863$) y grandes ($1:1.202:1.435$), polígono de la Zona A de Bolt con indicador de sala actual, y alerta de razones armónicas o enteras degeneradas.
- 📄 **Informes Técnicos y Exportación Unificada**:
  - Generación de **Informe Técnico Imprimible / PDF** formal con integrantes, firmas de revisión y sección completa de análisis modal.
  - Exportación de datos de cálculo a archivos **Excel / CSV** (separador `;` o `,`, UTF-8 BOM) con bloques modales integrados.

---

## 📐 Modelos Matemáticos Implementados

### 1. Geometría y Absorción Equivalente
- **Volumen del recinto**: $V = L \cdot W \cdot H \quad [\text{m}^3]$
- **Superficie total**: $S = 2(LW + LH + WH) \quad [\text{m}^2]$
- **Absorción equivalente por banda**: $A(f) = \sum_{i=1}^{N} (S_i \cdot \alpha_i(f)) \quad [\text{m}^2 \text{ Sabine}]$
- **Coeficiente de absorción medio**: $\bar{\alpha}(f) = \frac{A(f)}{S} \quad [\text{adimensional}]$

### 2. Tiempos de Reverberación ($RT_{60}$)
- **Modelo de Sabine (1898)**:
  $$RT_{\text{Sabine}} = \frac{0.161 \cdot V}{A + 4mV}$$
- **Modelo de Norris-Eyring (1930)**:
  $$RT_{\text{Eyring}} = \frac{0.161 \cdot V}{-S \cdot \ln(1 - \bar{\alpha}) + 4mV}$$
- **Modelo de Millington-Sette (1932)**:
  $$RT_{\text{Millington}} = \frac{0.161 \cdot V}{-\sum_{i=1}^{N} [S_i \cdot \ln(1 - \alpha_i)] + 4mV}$$

### 3. Propagación Espacial y Campo Sonoro
- **Constante de Sala ($R$)**:
  $$R = \frac{A}{1 - \bar{\alpha}} \quad [\text{m}^2]$$
- **Distancia Crítica ($D_c$)**:
  $$D_c = 0.057 \cdot \sqrt{Q \cdot R} \quad [\text{m}]$$
- **Nivel de Presión Sonora Total ($L_p$)**:
  $$L_p(r) = L_w + 10 \cdot \log_{10} \left( \frac{Q}{4\pi r^2} + \frac{4}{R} \right) - \Delta L_{\text{aire}}$$
- **Relación Directo / Reverberado (DRR)**:
  $$\text{DRR} = 10 \cdot \log_{10} \left( \frac{Q \cdot R}{16\pi r^2} \right) \quad [\text{dB}]$$

### 4. Acústica Ondulatoria y Modos Propios (Módulo 6)
- **Frecuencias Propias ($f_{nx,ny,nz}$)**:
  $$f = \frac{c}{2} \sqrt{ \left(\frac{n_x}{L_x}\right)^2 + \left(\frac{n_y}{L_y}\right)^2 + \left(\frac{n_z}{L_z}\right)^2 } \quad [\text{Hz}]$$
- **Frecuencia de Schroeder ($f_s$)**:
  $$f_{s,\text{aprox}} \approx 2000 \sqrt{\frac{T_{60}}{V}}, \qquad f_{s,\text{exact}} = \sqrt{\frac{c^3}{4\ln 10}} \sqrt{\frac{T_{60}}{V}} \quad [\text{Hz}]$$
- **Densidad Modal Acumulada de Weyl ($N(f)$) y Derivada ($dN/df$)**:
  $$N(f) = \frac{4\pi}{3} V \left(\frac{f}{c}\right)^3 + \frac{\pi}{4} S \left(\frac{f}{c}\right)^2 + \frac{1}{8} L \left(\frac{f}{c}\right)$$
  $$\frac{dN}{df} = \frac{4\pi V}{c^3} f^2 + \frac{\pi S}{2c^2} f + \frac{L}{8c} \quad [\text{modos/Hz}]$$
- **Criterio de Bonello (1981)**:
  - *Regla 1 (Monotonía no decreciente)*: El número de modos en bandas de 1/3 de octava debe ser $N_i \ge N_{i-1}$.
  - *Regla 2 (Degeneración)*: Frecuencias coincidentes solo se admiten si la banda contiene más de 5 modos ($N_i > 5$).
- **Criterio de Proporciones Dimensionales de Bolt (1946)**:
  - Sala pequeña: $1 : 1.404 : 1.863$
  - Sala grande: $1 : 1.202 : 1.435$
  - Validación en espacio normalizado $(p, q)$ respecto a la Zona A de contorno óptimo.

---

## 🧪 Ejecución de Tests Unitarios

El proyecto cuenta con una suite completa de pruebas unitarias automatizadas con **Vitest**:

```bash
# Ejecutar suite de pruebas unitarias
npm test
```

---

## 🛠️ Arquitectura de Archivos del Proyecto

```text
acusticasoftware/
├── public/
│   └── soundwave.svg
├── src/
│   ├── components/
│   │   ├── modes/                   # Submódulos de Acústica Ondulatoria
│   │   │   ├── ModesModule.jsx      # Contenedor maestro con pestañas y controles
│   │   │   ├── ModesTable.jsx       # Catálogo ordenable/filtrable de modos propios
│   │   │   ├── ModesHistogram.jsx   # Histograma 1/3 octava ISO 266 + corte Schroeder
│   │   │   ├── ModalDensityChart.jsx# Curva continua N(f) y dN/df (Ley de Weyl)
│   │   │   ├── BonelloAnalysis.jsx  # Diagrama de escalera y veredicto de Bonello
│   │   │   ├── PressureFieldViewer.jsx # Visor 2D Canvas de presión p(t) y nodos
│   │   │   ├── MeasurementPanel.jsx # Malla in situ, SVG interactivo e interpolación IDW
│   │   │   ├── ModesComparison.jsx  # Contraste analítico vs experimental vs REW vs FEM
│   │   │   └── BoltProportions.jsx  # Calculadora y diagrama p-q de Bolt (Zona A)
│   │   ├── AcousticCharts.jsx       # Gráficas RT vs Freq y Lp vs Distancia
│   │   ├── AcousticResults.jsx      # Tablas y tarjetas KPI por bandas
│   │   ├── ExportModal.jsx          # Exportación Excel/CSV unificada
│   │   ├── Header.jsx               # Encabezado principal con marca POZOLE
│   │   ├── OverviewDashboard.jsx    # Dashboard resumen ejecutivo y 4 KPIs modales
│   │   ├── PozoleLogo.jsx           # Componente del logo estilizado SVG
│   │   ├── ReportModal.jsx          # Informe técnico imprimible / PDF formal
│   │   ├── RoomDimensions.jsx       # Editor de planta libre y geometrías
│   │   ├── RoomVisualizer.jsx       # Visualizador 3D interactivo con zoom
│   │   ├── Sidebar.jsx              # Navegación lateral de módulos
│   │   ├── SourceReceiver.jsx       # Parámetros de fuente sonora y receptor
│   │   ├── SurfaceMaterials.jsx     # Asignación de materiales y α por banda
│   │   ├── TheoryModal.jsx          # Formulario físico e hidrología acústica
│   │   └── WelcomeHero.jsx          # Pantalla de bienvenida interactiva
│   ├── utils/
│   │   ├── __tests__/               # Tests unitarios con Vitest
│   │   │   ├── modalCalculations.test.js
│   │   │   ├── measurementUtils.test.js
│   │   │   └── proportions.test.js
│   │   ├── acousticCalculations.js  # Motor físico clásico (RT60, Lp, Dc)
│   │   ├── modalCalculations.js     # Motor físico ondulatorio, modos y Bonello
│   │   ├── measurementUtils.js      # Malla in situ, CSV/TXT parsing y matching
│   │   ├── proportions.js           # Relaciones de aspecto y Zona A de Bolt
│   │   ├── csvUtils.js              # Utilidad compartida de descarga/lectura CSV
│   │   ├── defaultMaterials.js      # Base de datos de materiales ISO 354
│   │   └── roomPresets.js           # Escenarios típicos predefinidos
│   ├── App.jsx                      # Componente raíz con estado global
│   ├── main.jsx                     # Punto de entrada de React
│   └── index.css                    # Estilos Tailwind y utilidades
├── index.html                       # Documento principal HTML5
├── package.json                     # Dependencias y scripts Vite / Vitest
├── tailwind.config.js               # Configuración de Tailwind CSS
└── vite.config.js                   # Configuración del bundler Vite
```
