// Preprocesado de imagen con OpenCV.js
window.ImageProcessor = (function(){
  // OpenCV.js 4.x expone `cv` como objeto "thenable": resolver una promesa con él se cuelga para siempre.
  // Por eso solo se espera a que cv.Mat exista y los demás módulos usan window.cv directamente.
  function waitOpenCV(timeoutMs=60000){
    return new Promise((resolve,reject)=>{
      const start = Date.now();
      (function check(){
        if (window.cv && window.cv.Mat) return resolve(true);
        if (Date.now()-start>timeoutMs) return reject(new Error('OpenCV.js no disponible (revisa tu conexión a Internet)'));
        setTimeout(check,100);
      })();
    });
  }

  function loadImageToCanvas(file){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = ()=>{
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0,0,c.width,c.height); // PNG/WEBP transparentes: fondo blanco (no negro)
        g.drawImage(img,0,0);
        URL.revokeObjectURL(img.src);
        resolve({canvas:c, imageData: g.getImageData(0,0,c.width,c.height)});
      };
      img.onerror = ()=>reject(new Error('No se pudo cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  function preprocess(cv, imageData, params){
    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // contraste / brillo
    const out = new cv.Mat();
    const alpha = params.contrast, beta = params.brightness;
    gray.convertTo(out, -1, alpha, beta);

    if (params.blur>0){
      const k = params.blur*2+1;
      cv.GaussianBlur(out, out, new cv.Size(k,k), 0,0, cv.BORDER_DEFAULT);
    }

    // binarizar: trazo negro sobre fondo blanco => invertir para que trazo sea 1
    const bin = new cv.Mat();
    cv.threshold(out, bin, params.threshold, 255, cv.THRESH_BINARY_INV);

    if (params.invert){
      cv.bitwise_not(bin, bin);
    }

    // eliminar manchas pequeñas por NÚMERO DE PÍXELES (contourArea daba ~0 en líneas finas y las borraba)
    if (params.minArea>0){
      const labels = new cv.Mat(), stats = new cv.Mat(), cent = new cv.Mat();
      const n = cv.connectedComponentsWithStats(bin, labels, stats, cent, 8);
      const keep = new Uint8Array(n);
      for (let i=1;i<n;i++) keep[i] = stats.data32S[i*5+4] >= params.minArea ? 1 : 0;
      const L = labels.data32S, B = bin.data;
      for (let i=0;i<L.length;i++) if (L[i]>0 && !keep[L[i]]) B[i]=0;
      labels.delete(); stats.delete(); cent.delete();
    }

    const result = { width: bin.cols, height: bin.rows, data: new Uint8Array(bin.data) };
    src.delete(); gray.delete(); out.delete(); bin.delete();
    return result;
  }

  return { waitOpenCV, loadImageToCanvas, preprocess };
})();
