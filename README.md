[README.md](https://github.com/user-attachments/files/35189835/README.md)
# VECTOR-CAD
### Conversor inteligente de imágenes a geometría vectorial CAD

**VECTOR-CAD** es una herramienta de vectorización diseñada para convertir imágenes rasterizadas en geometría vectorial exportable a formato DXF, facilitando su posterior edición y utilización en programas de diseño asistido por computadora (CAD).

Su principal objetivo es transformar imágenes en trazos geométricos limpios, reduciendo líneas duplicadas, superpuestas o innecesarias que pueden generar problemas durante los procesos de edición, diseño y fabricación.

La aplicación integra diferentes métodos de vectorización, herramientas de procesamiento de imagen y sistemas de limpieza geométrica para obtener resultados más precisos y aprovechables.

---

## Características principales

### 1. Importación de imágenes
Permite cargar imágenes en diferentes formatos:

- JPG / JPEG
- PNG
- WEBP
- BMP

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

- Escala de grises.
- Contraste.
- Brillo.
- Umbral de detección.
- Desenfoque.
- Eliminación de pequeñas áreas.
- Inversión de imagen.

Estos controles permiten mejorar la detección de los trazos y reducir interferencias durante el procesamiento.

### 5. Visualización y edición

Incluye un espacio de trabajo interactivo para revisar el resultado de la vectorización.

Funciones disponibles:

- Zoom de acercamiento y alejamiento.
- Ajuste automático de visualización.
- Mostrar u ocultar la imagen original.
- Mostrar u ocultar los vectores.
- Visualización de nodos.
- Personalización del color de los vectores.
- Deshacer y rehacer operaciones.

### 6. Auditoría geométrica

Incorpora herramientas para revisar la geometría procesada y obtener estadísticas sobre los segmentos duplicados y las polilíneas unificadas.

### 7. Exportación CAD

Permite exportar la geometría generada a formato **DXF**, compatible con aplicaciones CAD (validado con `ezdxf`).

Opciones de exportación:

- Milímetros (mm).
- Centímetros (cm).
- Pulgadas (in).
- Ajuste de escala. Se asume **1 px = 1 mm × Escala** y el resultado se convierte a la unidad elegida (p. ej. 100 px a escala 1 = 100 mm = 10 cm = 3.937 in).
- Configuración de precisión decimal.

El archivo DXF organiza la geometría mediante capas, facilitando su identificación y manipulación posterior.

---

## Tecnologías utilizadas

| Tecnología | Aplicación |
|---|---|
| HTML5 | Estructura de la interfaz |
| CSS3 | Diseño y presentación visual |
| JavaScript | Procesamiento y lógica de la aplicación |
| OpenCV.js | Procesamiento y análisis de imágenes |
| Canvas API | Visualización y manipulación gráfica |
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
```

Entrar en la carpeta:

```bash
cd VECTOR-CAD
```

Abrir `index.html` en el navegador.

**Nota:** Se requiere conexión a Internet para cargar OpenCV.js desde su CDN, salvo que se configure una copia local de la biblioteca.

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
│   └── app.js
│
├── LICENSE
│
└── README.md
```

---

## Flujo de trabajo

1. **Importar:** cargar una imagen desde el equipo.
2. **Preprocesar:** ajustar brillo, contraste, umbral y limpieza.
3. **Vectorizar:** seleccionar SMART, CENTERLINE u OUTLINE.
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

**Importante:** Actualmente, la exportación implementada es DXF. Los archivos DWG pueden obtenerse posteriormente mediante un programa CAD compatible con conversión DXF a DWG.

---

## Correcciones importantes (versión actual)

- **«Procesar» ya no se cuelga.**
  - `waitOpenCV` resolvía una promesa con el objeto `cv` de OpenCV.js 4.x (un *thenable*), lo que dejaba la promesa pendiente para siempre. Ahora solo espera a `cv.Mat` y se usa `window.cv`.
  - El esqueletizado (Zhang-Suen) recorría toda la imagen en cada pasada y bloqueaba la página. Ahora solo reevalúa píxeles de borde (≈20× más rápido) y se ejecuta en un **Web Worker** (`js/vectorize_worker.js`). Si el navegador bloquea workers (abrir con `file://`), cae automáticamente al hilo principal.
  - SMART ya no esqueletiza dos veces ni esqueletiza imágenes densas que irán a OUTLINE.
- **Centerline:** el trazado de ramas perdía píxeles en uniones y fragmentaba las líneas diagonales en cientos de tramos. Ahora se recorre como grafo (cada tramo una sola vez) y se eliminan píxeles de esquina redundantes. Solo se podan espuelas cortas, ya no conectores.
- **Eliminación de duplicados:** al quitar un tramo repetido, la polilínea unía extremos no contiguos creando líneas falsas; ahora se parte en ese punto. Se conservan capa y estado *cerrado* (los contornos ya no pierden su último segmento y siguen como `GEOMETRIA_INTERIOR`/`CONTORNOS`). El control «Unificar colineales» ahora sí funciona.
- **Preprocesado:** «Min área» usaba `contourArea`, que borraba líneas finas; ahora cuenta píxeles reales. Las imágenes PNG/WEBP con transparencia se rellenan con fondo blanco (antes el fondo transparente se leía como negro). Se eliminó el control «Gris», que no tenía efecto.
- **Exportación DXF:** las unidades cm/in multiplicaban en vez de dividir, la tabla de capas declaraba 3 en lugar de 4, faltaban la tabla `LTYPE` y los marcadores de subclase de `LWPOLYLINE`.
- **Interfaz:** al cargar una imagen nueva se limpia la geometría anterior, se puede volver a elegir el mismo archivo, se evita lanzar «Procesar» dos veces a la vez y se corrigió la alineación de casillas y opciones del panel.

---

## Licencia

Este proyecto está publicado bajo la licencia **Apache License 2.0**.

Consulta el archivo [LICENSE](LICENSE) para conocer los términos de uso, modificación y distribución.

---

**VECTOR-CAD — From Image to CAD Geometry.**
