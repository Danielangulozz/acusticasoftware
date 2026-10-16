# 📘 Documento de Contexto Técnico y Memoria de Cálculo: POZOLE
### *Propagación de Ondas en Zonas y Optimización de Límites Espaciales*
> **Software de Simulación Acústica de Recintos y Acústica Ondulatoria (2026)**  
> **Autores:** Daniel Angulo, Jeronimo Gomez, Brandon Guerra  
> **Tecnologías:** React 18, Vite, Tailwind CSS, Recharts, Canvas 2D API, Web Audio API, Vitest.

---

## 1. 🎯 ¿Qué hace la aplicación en general? (Visión del Sistema)

**POZOLE** es una suite de simulación física y diseño acústico profesional. Su objetivo es modelar, calcular y predecir con exactitud matemática el comportamiento del campo sonoro en recintos cerrados tanto en el régimen de **acústica geométrica / estadística** (mediante tiempos de reverberación $RT_{60}$, absorción equivalente, distancias críticas y distribución de energía en bandas de octava de 125 Hz a 4000 Hz) como en el régimen de **acústica ondulatoria** (modos propios de vibración, resonancias de baja frecuencia, criterio de Bonello, atenuación temporal y proporciones dimensionales óptimas de 20 Hz a 500+ Hz).

### Flujo Lógico de Datos de la Aplicación:

```
[ Geometría (Polígono 2D + Altura H) ]
                 │
                 ├──► Cálculo Geométrico (V, S, l, Áreas de caras, Centroide)
                 │
[ Asignación de Materiales α(f) ]
                 │
                 ├──► Absorción Equivalente A(f) y Coeficiente Medio ā(f)
                 │
[ Fuente Lw, Q, r + Aire ]
                 │
                 ├──► Tiempos de Reverberación RT60 (Sabine, Eyring, Millington)
                 ├──► Constante de Sala (R), Distancia Crítica (Dc) y Nivel SPL (Lp)
                 │
[ Módulo Ondulatorio ] ◄── Toma Dimensiones Lx, Ly, Lz y RT60
                 │
                 ├──► Frecuencia de Schroeder (fs)
                 ├──► Catálogo Modal (nx, ny, nz) -> Axiales, Tangenciales, Oblicuos
                 ├──► Histograma 1/3 Octava ISO 266 vs Ley de Weyl
                 ├──► Evaluación del Criterio de Bonello (Monotonía y Degeneración)
                 ├──► Respuesta Temporal Libre p(t) (Amortiguamiento delta, tau, audio)
                 ├──► Distribución Espacial de Presión 2D (Mapas térmicos y líneas nodales)
                 ├──► Proporciones de Bolt (Zona A, relaciones p-q)
                 └──► Malla In Situ, Interpolación IDW y Comparativa (Teórico vs REW vs FEM)
```

---

## 2. 📐 Lógica y Modelos de Geometría y Acústica Clásica

### 2.1. Geometría de Planta Libre y Polígono Extruido
La sala puede ser un prisma rectangular estándar o una planta arquitectónica irregular con $N$ vértices $(x_i, y_i)$ y altura $H$, con soporte de curvaturas en muros (*bulge*).

1. **Área de la base (Fórmula de Gauss / Shoelace):**
   $$S_{\text{suelo}} = \frac{1}{2} \left| \sum_{i=0}^{N-1} (x_i y_{i+1} - x_{i+1} y_i) \right| \quad [\text{m}^2]$$
2. **Volumen del recinto:**
   $$V = S_{\text{suelo}} \cdot H \quad [\text{m}^3]$$
3. **Áreas de paredes individuales ($S_{\text{pared}, i}$):**
   $$L_i = \sqrt{(x_{i+1}-x_i)^2 + (y_{i+1}-y_i)^2}, \qquad S_{\text{pared}, i} = L_i \cdot H$$
4. **Superficie total envolvente ($S$):**
   $$S = 2 \cdot S_{\text{suelo}} + \sum_{i=0}^{N-1} S_{\text{pared}, i} \quad [\text{m}^2]$$
5. **Recorrido libre medio ($l$) y cadencia de reflexiones:**
   $$l = \frac{4V}{S} \quad [\text{m}], \qquad \tau_{\text{refl}} = \frac{l}{c} \quad [\text{s}], \qquad N_{\text{refl/s}} = \frac{c}{l} \quad [\text{s}^{-1}]$$

---

### 2.2. Absorción Acústica Equivalente
Para cada una de las 6 bandas de octava normalizadas ($125, 250, 500, 1000, 2000, 4000\text{ Hz}$):

- **Absorción por superficie con sub-elementos (puertas, ventanas, resonadores):**
  $$A_{\text{superficie}} = (S_{\text{total}} - \sum S_{\text{sub}}) \cdot \alpha_{\text{base}} + \sum (S_{\text{sub}} \cdot \alpha_{\text{sub}})$$
- **Absorción equivalente total del recinto ($A$):**
  $$A(f) = \sum_{k=1}^{M} A_k(f) \quad [\text{m}^2 \text{ Sabine}]$$
- **Coeficiente medio de absorción ($\bar{\alpha}$):**
  $$\bar{\alpha}(f) = \frac{A(f)}{S} \quad [\text{adimensional}]$$

---

### 2.3. Modelos de Tiempo de Reverberación ($RT_{60}$)
El software implementa los tres modelos canónicos, con interruptor para habilitar/deshabilitar la **disipación viscosa y térmica del aire** ($4mV$), con coeficientes $m$ según **ISO 9613-1**:

| Banda (Hz) | 125 | 250 | 500 | 1000 | 2000 | 4000 |
|---|---|---|---|---|---|---|
| **$m$ ($m^{-1}$) a 20°C y 50% HR** | 0.0001 | 0.0003 | 0.0007 | 0.0015 | 0.0035 | 0.0100 |

1. **Fórmula de Sabine (1898)** (Válida para salas reflectantes donde $\bar{\alpha} < 0.2$):
   $$RT_{\text{Sabine}} = \frac{0.161 \cdot V}{A + 4mV} \quad [\text{s}]$$

2. **Fórmula de Norris-Eyring (1930)** (Válida para salas absorbentes con campo difuso):
   $$RT_{\text{Eyring}} = \frac{0.161 \cdot V}{-S \cdot \ln(1 - \bar{\alpha}) + 4mV} \quad [\text{s}]$$

3. **Fórmula de Millington-Sette (1932)** (Considera la no homogeneidad de los materiales):
   $$RT_{\text{Millington}} = \frac{0.161 \cdot V}{-\sum_{k=1}^{M} \left[ S_k \cdot \ln(1 - \alpha_k) \right] + 4mV} \quad [\text{s}]$$

---

### 2.4. Propagación Espacial y Campo Sonoro
1. **Conversión de Potencia Acústica:**
   $$W = W_0 \cdot 10^{\frac{L_w}{10}} = 10^{\frac{L_w - 120}{10}} \quad [\text{Watts}], \qquad (W_0 = 10^{-12}\text{ W})$$
2. **Constante de Sala ($R$):**
   $$R = \frac{A}{1 - \bar{\alpha}} \quad [\text{m}^2]$$
3. **Factor de Directividad de la Fuente ($Q$):**
   - $Q = 1$: Esférica (espacio libre $4\pi$)
   - $Q = 2$: Semiesférica (sobre el suelo o pared $2\pi$)
   - $Q = 4$: Cuarto de esfera (en arista $\pi$)
   - $Q = 8$: Octavo de esfera (en esquina $\pi/2$)
4. **Distancia Crítica ($D_c$)** (Distancia donde campo directo = campo reverberado):
   $$D_c = \sqrt{\frac{Q \cdot R}{16 \pi}} \approx 0.057 \cdot \sqrt{Q \cdot R} \quad [\text{m}]$$
5. **Nivel de Presión Sonora Total en el Receptor ($L_p(r)$):**
   $$L_p(r) = L_w + 10 \cdot \log_{10} \left( \frac{Q}{4\pi r^2} + \frac{4}{R} \right) - \Delta L_{\text{aire}}$$
   $$\Delta L_{\text{aire}} = 4.3429 \cdot m \cdot r \quad [\text{dB}]$$
6. **Relación Directo / Reverberado (DRR):**
   $$\text{DRR}(r) = 10 \cdot \log_{10}\left( \frac{Q \cdot R}{16 \pi r^2} \right) \quad [\text{dB}]$$

---

## 3. 🌊 ACÚSTICA ONDULATORIA Y MODOS DE VIBRACIÓN (MÓDULO CENTRAL)

Este es el núcleo más avanzado y especializado del programa. En recintos cerrados a baja frecuencia, la hipótesis de rayos rectilíneos de la acústica geométrica colapsa: las ondas sonoras se comportan como frentes de onda estacionarios que interfieren consigo mismos, creando **modos normales de vibración** (resonancias).

---

### 3.1. Ecuación de Onda y Autofrecuencias (Frecuencias Propias)
Partiendo de la ecuación de onda tridimensional para el potencial de velocidad y presión acústica con contornos rígidos ($\frac{\partial p}{\partial \vec{n}} = 0$ en las paredes):

$$\nabla^2 p - \frac{1}{c^2}\frac{\partial^2 p}{\partial t^2} = 0$$

La solución analítica de frecuencias propias para una cavidad ortogonal de dimensiones $L_x, L_y, L_z$ (o la caja delimitadora equivalente de una sala irregular) es:

$$f_{n_x, n_y, n_z} = \frac{c}{2} \sqrt{ \left(\frac{n_x}{L_x}\right)^2 + \left(\frac{n_y}{L_y}\right)^2 + \left(\frac{n_z}{L_z}\right)^2 } \quad [\text{Hz}]$$

Donde:
- $n_x, n_y, n_z \in \mathbb{N}_0$ son los números cuánticos / enteros modales ($0 \le n \le n_{\text{max}}$).
- Se excluye rigurosamente el modo estático trivial $(0, 0, 0)$ que corresponde a presión constante (0 Hz / componente DC).
- $c$ es la velocidad del sonido corregida por la temperatura del recinto:
  $$c(T) = 331.3 \cdot \sqrt{1 + \frac{T}{273.15}} \quad [\text{m/s}] \qquad (\approx 343.0\text{ m/s a } 20^\circ\text{C})$$

---

### 3.2. Clasificación Física y Peso Energético de los Modos

La aplicación clasifica cada autofrecuencia según la cantidad de índices modales no nulos:

| Tipo de Modo | Índices no nulos | Paredes que intervienen | Recorrido / Dirección | Peso relativo | Atenuación |
|---|---|---|---|---|---|
| **Axial** | **1 índice** ($n_x > 0$ o $n_y > 0$ o $n_z > 0$) | 2 paredes opuestas | 1D (a lo largo de un solo eje: X, Y o Z) | **1.0** (Máxima energía) | 0 dB (Referencia) |
| **Tangencial** | **2 índices** (ej. $n_x, n_y > 0; n_z = 0$) | 4 paredes | 2D (en planos XY, XZ o YZ) | **0.5** | -3 dB |
| **Oblicuo** | **3 índices** ($n_x, n_y, n_z > 0$) | Las 6 superficies | 3D (rebotes en todo el volumen) | **0.25** | -6 dB |

> **Importancia en la escucha:** Los modos **axiales** son los más destructivos y audibles porque sufren la mitad de impactos por segundo con las paredes que los tangenciales y la cuarta parte que los oblicuos. Por ende, disipan su energía más lentamente y colorean dramáticamente la respuesta en frecuencia de graves.

#### Vector de Onda Modal ($\vec{k}$):
Para cada modo se calcula su vector de propagación espacial y magnitud:
$$k_x = \frac{n_x \pi}{L_x}, \quad k_y = \frac{n_y \pi}{L_y}, \quad k_z = \frac{n_z \pi}{L_z} \quad [\text{rad/m}], \qquad k = \sqrt{k_x^2 + k_y^2 + k_z^2}$$

---

### 3.3. Frecuencia de Corte de Schroeder ($f_s$)

La **Frecuencia de Schroeder** marca la frontera física absoluta entre dos comportamientos del recinto:
- **Por debajo de $f_s$ (Zona Modal / Ondulatoria):** Los modos están aislados en frecuencia. Hay picos y valles profundos de hasta 20 o 30 dB según la posición del oyente. El campo no es difuso.
- **Por encima de $f_s$ (Zona Estadística / Difusa):** Los modos se solapan intensamente (al menos 3 modos dentro del ancho de banda de cada uno). El sonido se modela estadísticamente con $RT_{60}$ de Sabine o Eyring.

La aplicación calcula dos variantes:
1. **Fórmula estándar empírica de Manfred Schroeder (1954):**
   $$f_{s,\text{aprox}} \approx 2000 \cdot \sqrt{\frac{T_{60}}{V}} \quad [\text{Hz}]$$
2. **Fórmula analítica exacta:**
   $$f_{s,\text{exact}} = \sqrt{\frac{c^3}{4 \ln(10)}} \cdot \sqrt{\frac{T_{60}}{V}} \quad [\text{Hz}]$$

*Nota:* El $T_{60}$ utilizado puede vincularse dinámicamente al promedio Sabine de 500-1000 Hz, al modelo Eyring o a un valor manual ingresado por el ingeniero.

---

### 3.4. Densidad Modal Acumulada y Derivada (Ley Asintótica de Weyl)

Para verificar si la sala distribuye sus resonancias de forma suave o agrupada, se evalúa la **Ley de Weyl extendida**:

1. **Número acumulado teórico de modos hasta una frecuencia $f$ ($N(f)$):**
   $$N(f) = \frac{4\pi}{3} V \left(\frac{f}{c}\right)^3 + \frac{\pi}{4} S \left(\frac{f}{c}\right)^2 + \frac{1}{8} L \left(\frac{f}{c}\right)$$
   *(Donde $L = 4(L_x + L_y + L_z)$ es la suma de las aristas del recinto).*

2. **Densidad modal instantánea (derivada $\frac{dN}{df}$, modos por Hertz):**
   $$\frac{dN}{df} = \frac{4\pi V}{c^3} f^2 + \frac{\pi S}{2c^2} f + \frac{L}{8c} \quad [\text{modos/Hz}]$$

La interfaz gráfica compara el conteo discreto real de modos vs. la curva continua de Weyl para revelar anomalías de espaciamiento.

---

### 3.5. Histograma en Bandas de 1/3 de Octava (ISO 266)

Los modos calculados se agrupan en las bandas normalizadas de 1/3 de octava desde 20 Hz hasta 500 Hz (o la banda superior seleccionada).

Para cada frecuencia central $f_c$, los límites de integración son:
$$f_{\text{low}} = \frac{f_c}{2^{1/6}} = f_c \cdot 0.8909, \qquad f_{\text{high}} = f_c \cdot 2^{1/6} = f_c \cdot 1.1225$$

El software desglosa el histograma en barras apiladas diferenciando cuántos modos de esa banda son **axiales**, **tangenciales** y **oblicuos**, e inserta una línea de referencia vertical en la frecuencia de Schroeder $f_s$.

---

### 3.6. Criterio de Bonello (1981) — Evaluación y Diagnóstico Automático

Oscar Bonello demostró que la calidad acústica de una sala pequeña no depende de tener pocas resonancias, sino de que el oído perciba una densidad acústica que crece progresivamente con la frecuencia sin agrupamientos bruscos.

La aplicación evalúa el criterio de Bonello **estrictamente hasta la Frecuencia de Schroeder ($f_s$)** mediante dos reglas automatizadas:

#### Regla 1: Monotonía No Decreciente
El número de modos en cada banda de 1/3 de octava sucesiva debe ser igual o mayor que en la banda anterior:
$$N_i \ge N_{i-1} \quad \forall i > 1$$
*Si una banda tiene menos modos que la previa, se genera una infracción tipo `monotonicity` y se ilumina en rojo.*

#### Regla 2: Restricción de Degeneración Modal (Coincidencias en Frecuencia)
Dos o más modos están degenerados si sus frecuencias coinciden dentro de una tolerancia ajustable $\Delta f$ (típicamente $\le 0.5\text{ Hz}$):
$$|f_a - f_b| \le \text{tol}$$
Bonello estipula que una coincidencia de frecuencias es aceptable **únicamente si en esa banda de 1/3 de octava existen más de 5 modos**:
$$\text{Degeneración permitida solo si: } N_{\text{banda}} > 5$$
*Si dos modos coinciden en una banda con $\le 5$ modos, la energía acústica se duplica en esa frecuencia puntual, causando una resonancia intolerable (boominess).*

**Veredicto en la interfaz:**
- 🟢 **CUMPLE:** La distribución modal es suave y no coloreará la música ni la voz.
- 🔴 **FALLA:** Identifica las bandas exactas infractoras y enumera los grupos de modos degenerados.

---

### 3.7. Dinámica Temporal Libre: Amortiguamiento, Decaimiento y $p(t)$

Cuando una fuente se apaga súbitamente, cada modo normal decae libremente como un oscilador armónico subamortiguado.

#### Forma del Campo Espacial Estacionario:
$$\psi_n(x, y, z) = \cos\left(\frac{n_x \pi x}{L_x}\right) \cdot \cos\left(\frac{n_y \pi y}{L_y}\right) \cdot \cos\left(\frac{n_z \pi z}{L_z}\right)$$

#### Función de Presión Sonora en el Dominio del Tiempo ($p(t)$):
$$p_n(x, y, z, t) = P_0 \cdot \psi_n(x, y, z) \cdot e^{-\delta \cdot t} \cdot \cos(2\pi f_n t + \phi) \quad [\text{Pa}]$$

#### Parámetros Canónicos de Amortiguamiento Físico:
1. **Factor de amortiguamiento de amplitud ($\delta$):**
   $$\delta = \frac{3 \ln(10)}{T_{60}} \approx \frac{6.9078}{T_{60}} \quad [\text{s}^{-1}]$$
2. **Factor de amortiguamiento de energía ($\delta_E$):**
   $$\delta_E = 2\delta = \frac{6 \ln(10)}{T_{60}} \approx \frac{13.8155}{T_{60}} \quad [\text{s}^{-1}]$$
3. **Constante de tiempo de relajación ($\tau$, decaimiento a $1/e \approx 36.8\%$):**
   $$\tau = \frac{1}{\delta} \quad [\text{s}]$$
4. **Tiempo de vida media ($t_{1/2}$, caída al $50\%$ de presión):**
   $$t_{1/2} = \frac{\ln(2)}{\delta} = \tau \cdot \ln(2) \quad [\text{s}]$$
5. **Ancho de banda modal a -3 dB ($\Delta f$):**
   $$\Delta f = \frac{\delta}{\pi} \approx \frac{2.20}{T_{60}} \quad [\text{Hz}]$$
6. **Factor de Calidad Modal ($Q_{\text{modal}}$):**
   $$Q = \frac{\pi f_n}{\delta} = \frac{f_n}{\Delta f}$$

#### Superposición e Interferencia (Batimiento Acústico / Beats):
La aplicación permite activar la superposición lineal de dos o más modos simultáneos:
$$p_{\text{total}}(t) = \sum_{k} P_{0,k} \cdot \psi_k(x, y, z) \cdot e^{-\delta t} \cos(2\pi f_k t + \phi_k)$$
Si dos modos están próximos en frecuencia, la simulación genera la envolvente modulada con **frecuencia de batimiento**:
$$f_{\text{beat}} = |f_1 - f_2| \quad [\text{Hz}], \qquad T_{\text{beat}} = \frac{1}{|f_1 - f_2|} \quad [\text{s}]$$
*Incluye sintetizador con **Web Audio API** para escuchar el tono real y el decaimiento exponencial.*

---

### 3.8. Visualizador Espacial de Presión 2D (Líneas Nodales y Antinodos)

En la pestaña *Distribución Espacial 2D*, un motor de renderizado Canvas calcula a alta velocidad la distribución de presión en cortes ortogonales:
- **Plano XY (Planta):** Corte horizontal a una altura $Z$ dada (ej. altura del oyente 1.2 m).
- **Plano XZ (Alzado Longitudinal):** Corte lateral a una profundidad $Y$.
- **Plano YZ (Sección Transversal):** Corte frontal a una posición $X$.

#### Mapa Térmico Jet:
La amplitud oscila entre $[-1, 1]$ y se mapea mediante el colormap Jet:
- 🔴 **Rojo intenso:** Antinodo de presión positiva máxima ($p = +1$).
- 🔵 **Azul intenso:** Antinodo de presión negativa máxima ($p = -1$).
- 🟢 **Verde:** Líneas nodales donde la presión acústica es nula ($p = 0$). *En estos puntos una persona ubicada no escuchará esa nota musical en absoluto*.

El visor cuenta con **animación temporal viva $p(t)$**, cámara lenta (slow-motion) y sonda interactiva con coordenadas en metros y nivel instantáneo.

---

### 3.9. Proporciones Dimensionales y Diagrama de Bolt (1946)

Para evitar la aglomeración de modos axiales y tangenciales, las dimensiones del recinto deben evitar razones armónicas o enteras (ej. evitar cubos $1:1:1$ o salas dobles $1:2:2$).

1. **Normalización respecto a la menor dimensión (altura $H = 1$):**
   $$p = \frac{W}{H}, \qquad q = \frac{L}{H} \qquad (1 \le p \le q)$$
2. **Zona A de Bolt:**
   Polígono en el espacio $(p, q)$ determinado experimental y analíticamente por Richard H. Bolt en 1946 como la zona que garantiza un espaciamiento modal homogéneo.
3. **Algoritmo de Detección:**
   Implementa un algoritmo de **Ray-Casting (Point-in-Polygon)** para determinar si la sala actual está dentro o fuera de la Zona A.
4. **Calculadora Inversa a partir de Volumen:**
   Permite fijar un volumen deseado $V$ y calcula automáticamente las dimensiones óptimas $H, W, L$ según las proporciones canónicas:
   - **Sala Pequeña (Bolt):** $1 : 1.404 : 1.863$
   - **Sala Grande (Bolt):** $1 : 1.202 : 1.435$
   - **Sepmeyer B:** $1 : 1.30 : 1.60$
   - **Louden 1:** $1 : 1.40 : 1.90$
   $$H = \sqrt[3]{\frac{V}{w \cdot l}}, \qquad W = w \cdot H, \qquad L = l \cdot H$$

---

### 3.10. Malla In Situ, Interpolación IDW y Contraste (REW / FEM / Teórico)

1. **Malla de Medición según Normativas:**
   - Cuadrícula uniforme con paso $s = 1.5\text{ m}$.
   - Margen perimetral a paredes $\ge 0.7\text{ m}$ (para salir del campo reactivo de proximidad).
   - Inclusión automática de las 4 esquinas críticas (donde todos los modos axiales tienen antinodos de máxima presión sonora, 80-88 dB).
   - Ubicación de la fuente acústica $S_0$ al centro geométrico.
2. **Interpolación Espacial 2D por IDW (Inverse Distance Weighting):**
   Reconstruye el mapa continuo de presión sonora a partir de puntos discretos de medición:
   $$\hat{p}(x, y) = \frac{\sum_{i=1}^{K} w_i \cdot p_i}{\sum_{i=1}^{K} w_i}, \qquad w_i = \frac{1}{d((x,y), (x_i, y_i))^2}$$
3. **Emparejamiento Modal (Matching):**
   Permite importar archivos CSV o texto pegado desde simulaciones por elementos finitos (COMSOL FEM) o mediciones con micrófono (Room EQ Wizard - REW) y busca la autofrecuencia teórica más cercana calculando:
   $$\text{Error Absoluto} = |f_{\text{medido}} - f_{\text{teórico}}| \quad [\text{Hz}]$$
   $$\text{Error Porcentual} = \frac{|f_{\text{medido}} - f_{\text{teórico}}|}{f_{\text{teórico}}} \cdot 100\%$$

---

## 4. 📊 Resumen de Variables y Unidades del Sistema

| Símbolo | Significado Físico | Unidad SI | Origen / Módulo |
|---|---|---|---|
| $L, W, H$ | Largo, Ancho, Alto de la sala | $\text{m}$ | Geometría |
| $V$ | Volumen interior total | $\text{m}^3$ | Shoelace / Extrusión |
| $S$ | Superficie total envolvente | $\text{m}^2$ | Suma de áreas de caras |
| $l$ | Recorrido libre medio | $\text{m}$ | $4V/S$ |
| $\alpha(f)$ | Coeficiente de absorción del material | Adimensional ($0 - 1$) | Base ISO 354 |
| $A(f)$ | Absorción acústica equivalente | $\text{m}^2\text{ Sabine}$ | $\sum S_i \alpha_i$ |
| $\bar{\alpha}(f)$ | Coeficiente medio de absorción | Adimensional ($0 - 1$) | $A / S$ |
| $RT_{60}$ | Tiempo de reverberación (60 dB de caída) | $\text{s}$ | Sabine / Eyring / Millington |
| $m$ | Atenuación atmosférica del aire | $\text{m}^{-1}$ | ISO 9613-1 |
| $Q$ | Factor de directividad espacial de la fuente | Adimensional ($1, 2, 4, 8$) | Fuente Sonora |
| $R$ | Constante de sala | $\text{m}^2$ | $A / (1 - \bar{\alpha})$ |
| $D_c$ | Distancia crítica | $\text{m}$ | $0.057\sqrt{QR}$ |
| $L_w$ | Nivel de potencia acústica | $\text{dB re } 10^{-12}\text{ W}$ | Fuente Sonora |
| $L_p$ | Nivel de presión sonora total | $\text{dB re } 2\times 10^{-5}\text{ Pa}$ | Campo Directo + Reverberado |
| $c$ | Velocidad del sonido | $\text{m/s}$ | $331.3\sqrt{1+T/273.15}$ |
| $n_x, n_y, n_z$ | Índices modales (cuánticos de onda) | Enteros $\ge 0$ | Acústica Ondulatoria |
| $f_s$ | Frecuencia de corte de Schroeder | $\text{Hz}$ | $2000\sqrt{T_{60}/V}$ |
| $N(f)$ | Conteo acumulado de modos de Weyl | Modos | Ecuación de Weyl |
| $\delta$ | Amortiguamiento modal de amplitud | $\text{s}^{-1}$ | $3\ln(10)/T_{60}$ |
| $\tau$ | Constante de tiempo modal ($1/e$) | $\text{s}$ | $1/\delta$ |
| $\Delta f$ | Ancho de banda modal a -3 dB | $\text{Hz}$ | $\delta / \pi \approx 2.20 / T_{60}$ |
| $p(t)$ | Presión instantánea oscilante | $\text{Pa}$ | $P_0 \psi e^{-\delta t} \cos(2\pi f t)$ |

---

## 5. 💡 Cómo pasarle este contexto a otra persona o IA

Si necesitas que un docente, un colega o una IA comprenda el proyecto rápidamente, puedes resumir así:
> *"El software es una suite de acústica integral llamada **POZOLE**. Toma la geometría arquitectónica en 2D (con soporte de curvas), calcula el volumen y superficies por Gauss, y le asocia coeficientes de absorción por octava a cada pared. Con eso calcula $RT_{60}$ por Sabine, Eyring y Millington incluyendo absorción del aire ($4mV$), y determina la constante de sala $R$, la distancia crítica $D_c$ y el nivel $L_p(r)$. En bajas frecuencias, desacopla la acústica estadística y pasa al **Módulo Ondulatorio**: extrae la caja delimitadora, calcula todos los modos propios axiales, tangenciales y oblicuos con la ecuación analítica de autofrecuencias, evalúa la frecuencia de Schroeder $f_s$, evalúa automáticamente el **Criterio de Bonello (1981)** verificando monotonía en bandas de 1/3 de octava y penalizando modos degenerados en bandas con $\le 5$ modos, modela la atenuación temporal libre $p(t)$ con factor $\delta = 3\ln(10)/T_{60}$ y síntesis de audio, mapea el campo de presión 2D con un colormap Jet y líneas nodales, y valida las dimensiones con el polígono de la **Zona A de Bolt (1946)**."*
