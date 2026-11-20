// Preprocesado de imagen con OpenCV.js
window.ImageProcessor = (function(){
  function waitOpenCV(timeoutMs=15000){
    return new Promise((resolve,reject)=>{
      const start = Date.now();
      (function check(){
        if (window.cv && cv.Mat) return resolve(cv);
        if (Date.now()-start>timeoutMs) return reject(new Error('OpenCV.js no disponible'));
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
        c.getContext('2d').drawImage(img,0,0);
        resolve({canvas:c, imageData: c.getContext('2d').getImageData(0,0,c.width,c.height)});
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

    // eliminar manchas pequeñas
    if (params.minArea>0){
      const contours = new cv.MatVector();
      const hier = new cv.Mat();
      cv.findContours(bin, contours, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      for (let i=0;i<contours.size();i++){
        const c = contours.get(i);
        if (cv.contourArea(c) < params.minArea){
          cv.drawContours(bin, contours, i, new cv.Scalar(0), -1);
        }
        c.delete();
      }
      contours.delete(); hier.delete();
    }

    const result = { width: bin.cols, height: bin.rows, data: new Uint8Array(bin.data) };
    src.delete(); gray.delete(); out.delete(); bin.delete();
    return result;
  }

  return { waitOpenCV, loadImageToCanvas, preprocess };
})();
