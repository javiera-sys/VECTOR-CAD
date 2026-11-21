[README.md](https://github.com/user-attachments/files/35201124/README.md)
# VECTOR-CAD
### Conversor inteligente de imágenes a geometría vectorial CAD

**VECTOR-CAD** es una herramienta de vectorización diseñada para convertir imágenes rasterizadas en geometría vectorial exportable a formato DXF, facilitando su posterior edición y utilización en programas de diseño asistido por computadora (CAD).

Su principal objetivo es transformar imágenes en trazos geométricos limpios, reduciendo líneas duplicadas, superpuestas o innecesarias que pueden generar problemas durante los procesos de edición, diseño y fabricación.

La aplicación integra diferentes métodos de vectorización, herramientas de procesamiento de imagen y sistemas de limpieza geométrica para obtener resultados más precisos y aprovechables.

---

## Características principales

### 1. Importación de imágenes
Permite cargar imágenes mediante el botón **Abrir imagen**, el selector del panel *Imagen* o arrastrándolas sobre el lienzo:

- JPG / JPEG
- PNG
- WEBP
- BMP

Las imágenes con transparencia se rellenan con fondo blanco. Los archivos que no son imagen se rechazan con un aviso en el registro.

### 2. Vectorización inteligente

Incluye tres métodos de procesamiento:

- **SMART:** analiza las características de la imagen y selecciona automáticamente un método de vectorización.
- **CENTERLINE:** genera líneas centrales a partir de los trazos, evitando representar cada línea mediante dos contornos paralelos cuando se busca una trayectoria única.
- **OUTLINE:** genera contornos vectoriales siguiendo los límites de las formas de la imagen.

### 3. Limpieza y eliminación de geometría duplicada

Uno de los objetivos principales de VECTOR-CAD es evitar la generación de geometría redundante.

Incluye herramientas para:

- Detectar segmentos duplicados.
- Eliminar líneas superpuestas o repetidas.
- Identificar geometrías coincidentes mediante tolerancias configurables.
- Unificar segmentos colineales.
- Reducir puntos consecutivos innecesarios.
- Simplificar polilíneas para obtener geometrías más limpias.

### 4. Procesamiento y ajuste de imágenes

Permite modificar diferentes parámetros antes de realizar la vectorización:

- Umbral de detección.
- Inversión de imagen.
- Contraste.
- Brillo.
- Desenfoque (blur).
- Eliminación de pequeñas áreas.

Los controles básicos (umbral e inversión) están a la vista; el resto está en **Opciones avanzadas** de cada sección.

### 5. Espacio de trabajo CAD (visualización)

Incluye un espacio de trabajo interactivo con fondo de rejilla técnica para revisar el resultado de la vectorización.

Funciones disponibles:

- Zoom de acercamiento y alejamiento (botones y rueda del ratón).
- **Ajustar** la vista al espacio de trabajo.
- Desplazamiento del lienzo (ratón; en pantallas táctiles, un dedo para desplazar y pellizco para zoom).
- Mostrar u ocultar la imagen original.
- Mostrar u ocultar los vectores.
- Visualización de nodos.
- Selector de color de los vectores.
- Deshacer y rehacer operaciones (hasta 50 pasos).

### 6. Auditoría geométrica

Incorpora herramientas para revisar la geometría procesada. El panel derecho se organiza en:

- **Estadísticas:** líneas, polilíneas, geometrías abiertas y cerradas.
- **Auditoría:** duplicados encontrados, duplicados eliminados, puntos colineales eliminados y estado de la geometría (LIMPIO / REVISAR). Se recalcula también al deshacer y rehacer.
- **Registro:** historial de operaciones con mensajes de color según su nivel (correcto, advertencia, error).

La acción **Auditar** solo revisa: no modifica la geometría, por lo que su campo «Eliminados» es siempre 0. Respeta la opción «Unificar colineales».

### 7. Exportación CAD

Permite exportar la geometría generada a formato **DXF**, compatible con aplicaciones CAD (validado con `ezdxf`).

Opciones de exportación:

- Milímetros (mm).
- Centímetros (cm).
- Pulgadas (in).
- Ajuste de escala. Se asume **1 px = 1 mm × Escala** y el resultado se convierte a la unidad elegida (p. ej. 100 px a escala 1 = 100 mm = 10 cm = 3.937 in).
- Configuración de precisión decimal.

El archivo DXF organiza la geometría en las capas `CONTORNOS`, `LINEAS_CENTRALES` y `GEOMETRIA_INTERIOR` (más la capa `0`), con la unidad declarada en `$INSUNITS`.

---

## Interfaz

| Zona | Contenido |
|---|---|
| **Barra superior** | Identidad VECTOR-CAD, estado del proyecto, Abrir imagen, Procesar, Limpiar, Auditar, Deshacer, Rehacer y Exportar DXF. Procesar (azul) y Exportar DXF (verde) destacan sobre las acciones secundarias. |
| **Panel izquierdo** | Cinco secciones desplegables: 1 Imagen, 2 Preprocesamiento, 3 Vectorización, 4 Limpieza de geometría, 5 Exportación. Los parámetros técnicos están en «Opciones avanzadas». Cada deslizador muestra su valor. |
| **Espacio de trabajo** | Lienzo Canvas con rejilla técnica y barra de herramientas compacta (Ajustar, zoom, Imagen / Vectores / Nodos, color). |
| **Panel derecho** | Estadísticas, Auditoría y Registro. |
| **Barra inferior** | Estado del procesamiento, dimensiones de la imagen, unidades / escala / decimales seleccionados y último mensaje del registro. Solo refleja el estado real de la aplicación. |

Tema oscuro grafito con azul técnico (acción principal), verde (éxito), amarillo (advertencias) y rojo (errores).

**Diseño responsivo:** en escritorio y portátil se prioriza el lienzo entre dos paneles laterales; en tabletas los paneles se estrechan; en teléfonos el lienzo va primero, los paneles quedan debajo con las secciones plegadas (salvo *Imagen*), y los botones secundarios muestran solo su icono.

---

## Parámetros (valores por defecto)

| Control | ID | Rango | Defecto |
|---|---|---|---|
| Umbral | `threshold` | 0–255 | 128 |
| Invertir | `invert` | sí/no | no |
| Contraste | `contrast` | 0–3 | 1 |
| Brillo | `brightness` | −100–100 | 0 |
| Blur | `blur` | 0–10 | 0 |
| Min área (px) | `minArea` | 0–500 | 20 |
| Modo | `mode` | smart / centerline / outline | smart |
| Simplificación (px) | `simplify` | 0–5 | 1.2 |
| Grosor máx. trazo (px) | `strokeMax` | 1–40 | 12 |
| Unificar colineales | `mergeCollinear` | sí/no | sí |
| Tolerancia (px) | `tol` | 0.1–5 | 1 |
| Ángulo tol. (°) | `angTol` | 0.5–10 | 3 |
| Unidades | `units` | mm / cm / in | mm |
| Escala | `scale` | ≥ 0.01 | 1 |
| Decimales | `decimals` | 0–6 | 3 |

---

## Tecnologías utilizadas

| Tecnología | Aplicación |
|---|---|
| HTML5 | Estructura de la interfaz |
| CSS3 | Diseño, tema y diseño responsivo |
| JavaScript | Procesamiento y lógica de la aplicación |
| OpenCV.js | Procesamiento y análisis de imágenes |
| Canvas API | Visualización y manipulación gráfica |
| Web Worker | Esqueletizado fuera del hilo principal |
| DXF ASCII | Generación de archivos CAD |

---

## Instalación y ejecución

VECTOR-CAD funciona directamente desde el navegador, sin necesidad de instalar un programa CAD adicional para realizar la vectorización.

### Opción 1. Descargar el repositorio

1. Descargar el repositorio desde GitHub.
2. Extraer los archivos.
3. Abrir el archivo `index.html` en un navegador compatible.
4. Esperar a que OpenCV.js termine de cargar.

### Opción 2. Clonar el repositorio

```bash
git clone https://github.com/javiera-sys/VECTOR-CAD.git
cd VECTOR-CAD
```

Abrir `index.html` en el navegador.

**Notas:**
- Se requiere conexión a Internet para cargar OpenCV.js desde su CDN, salvo que se configure una copia local de la biblioteca.
- Hay que **mantener las carpetas `css/` y `js/`**: `index.html` y el Web Worker usan rutas relativas a ellas.

---

## Estructura del proyecto

```text
VECTOR-CAD/
│
├── index.html
│
├── css/
│   └── styles.css
│
├── js/
│   ├── imageProcessor.js
│   ├── centerline.js
│   ├── outline.js
│   ├── smartVectorizer.js
│   ├── geometryCleaner.js
│   ├── duplicateDetector.js
│   ├── dxfExporter.js
│   ├── vectorize_worker.js
│   ├── vectorEditor.js
│   ├── qualityChecker.js
│   ├── app.js
│   └── ui.js
│
├── CAMBIOS.md
├── LICENSE
└── README.md
```

`js/ui.js` es la capa de presentación (valores de deslizadores, barra de estado, estado del proyecto, redimensionado del lienzo); no contiene lógica de vectorización.

---

## Flujo de trabajo

1. **Importar:** cargar una imagen desde el equipo o arrastrarla al lienzo.
2. **Preprocesar:** ajustar umbral, brillo, contraste y limpieza.
3. **Vectorizar:** seleccionar SMART, CENTERLINE u OUTLINE y pulsar **Procesar**.
4. **Limpiar:** eliminar geometrías duplicadas y unificar segmentos.
5. **Auditar:** revisar las estadísticas y la calidad de la geometría.
6. **Visualizar:** comprobar los trazos y realizar ajustes.
7. **Exportar:** generar el archivo DXF con las unidades y escala deseadas.

---

## Objetivo del proyecto

VECTOR-CAD busca simplificar la conversión de imágenes a geometría CAD, proporcionando una herramienta que permita obtener trazos más limpios, reducir operaciones manuales de corrección y facilitar la preparación de dibujos para procesos de diseño y fabricación.

Su desarrollo está enfocado especialmente en resolver uno de los problemas habituales de la vectorización automática: la generación de múltiples líneas sobre un mismo trazo, que incrementan innecesariamente la cantidad de geometría y dificultan su utilización posterior.

---

## Compatibilidad

- Navegadores modernos compatibles con JavaScript y Canvas.
- Archivos DXF compatibles con programas CAD.
- Procesamiento de imágenes rasterizadas.
- Escritorio, portátil, tableta y teléfono (con soporte táctil en el lienzo).

**Importante:** Actualmente, la exportación implementada es DXF. Los archivos DWG pueden obtenerse posteriormente mediante un programa CAD compatible con conversión DXF a DWG.

**Nota sobre CENTERLINE:** los trazos que forman un lazo cerrado se exportan como polilínea abierta con extremos coincidentes (no marcada como «cerrada»).

---

## Historial de correcciones

### Rediseño visual (esta versión)

- Nueva interfaz estilo software CAD: barra superior, paneles con secciones desplegables, espacio de trabajo con rejilla, panel de resultados y barra de estado.
- Diseño responsivo y soporte táctil (desplazar con un dedo, pellizcar para zoom).
- Registro con mensajes coloreados por nivel.
- Se conservaron todos los identificadores HTML, eventos, parámetros, rangos, valores por defecto, algoritmos, el sistema de deshacer/rehacer y la exportación DXF.

### Correcciones funcionales tras la auditoría y las pruebas

- **CENTERLINE ya no pierde figuras cerradas finas** (rectángulos, círculos, triángulos). La simplificación `rdp()` reducía los lazos cerrados a dos puntos idénticos y se descartaban al limpiar; ahora se dividen en el punto más lejano del inicio antes de simplificar. SMART, que no podía recuperarlas, también queda corregido.
- **Auditar respeta «Unificar colineales»** y su campo «Eliminados» ya no repite el de «Duplicados» (auditar no modifica la geometría).
- **El panel de Auditoría se actualiza al deshacer y rehacer.**

### Correcciones de versiones anteriores

- **«Procesar» ya no se cuelga.**
  - `waitOpenCV` resolvía una promesa con el objeto `cv` de OpenCV.js 4.x (un *thenable*), lo que dejaba la promesa pendiente para siempre. Ahora solo espera a `cv.Mat` y se usa `window.cv`.
  - El esqueletizado (Zhang-Suen) recorría toda la imagen en cada pasada y bloqueaba la página. Ahora solo reevalúa píxeles de borde (≈20× más rápido) y se ejecuta en un **Web Worker** (`js/vectorize_worker.js`). Si el navegador bloquea workers (abrir con `file://`), cae automáticamente al hilo principal.
  - SMART ya no esqueletiza dos veces ni esqueletiza imágenes densas que irán a OUTLINE.
- **Centerline:** el trazado de ramas perdía píxeles en uniones y fragmentaba las líneas diagonales en cientos de tramos. Ahora se recorre como grafo (cada tramo una sola vez) y se eliminan píxeles de esquina redundantes. Solo se podan espuelas cortas, ya no conectores.
- **Eliminación de duplicados:** al quitar un tramo repetido, la polilínea unía extremos no contiguos creando líneas falsas; ahora se parte en ese punto. Se conservan capa y estado *cerrado*. El control «Unificar colineales» funciona.
- **Preprocesado:** «Min área» usaba `contourArea`, que borraba líneas finas; ahora cuenta píxeles reales. Las imágenes PNG/WEBP con transparencia se rellenan con fondo blanco. Se eliminó el control «Gris», que no tenía efecto.
- **Exportación DXF:** las unidades cm/in multiplicaban en vez de dividir, la tabla de capas declaraba 3 en lugar de 4, faltaban la tabla `LTYPE` y los marcadores de subclase de `LWPOLYLINE`.
- **Interfaz:** al cargar una imagen nueva se limpia la geometría anterior, se puede volver a elegir el mismo archivo y se evita lanzar «Procesar» dos veces a la vez.

---

## Pruebas realizadas

Pruebas automatizadas de regresión con OpenCV.js real, un entorno de navegador simulado (jsdom) y validación de los DXF con `ezdxf`: **60 comprobaciones correctas, 0 fallos**.

Cubren: carga por selector y arrastre, rechazo de archivos no válidos, los tres modos de vectorización con cinco tipos de imagen (logotipo, dibujo lineal, figuras geométricas, detalles y trazo grueso), todos los botones, controles de visualización (imagen, vectores, nodos, color, zoom, ajustar, desplazar), deslizadores, inversión, «Unificar colineales», deshacer/rehacer, auditoría y exportación DXF en mm, cm y pulgadas (entidades, capas, `$INSUNITS`, escala e inversión de Y).

**No probado todavía** (requiere un entorno real): navegadores y teléfonos reales, el Web Worker (el entorno de pruebas no lo implementa), la descarga real del archivo y la apertura del DXF en un programa CAD como AutoCAD o LibreCAD.

---

## Licencia

Este proyecto está publicado bajo la licencia **Apache License 2.0**.

Consulta el archivo [LICENSE](LICENSE) para conocer los términos de uso, modificación y distribución.

---

**VECTOR-CAD — From Image to CAD Geometry.**
