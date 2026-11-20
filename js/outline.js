// Contornos con OpenCV.js, jerarquía y simplificación
window.Outline = (function(){
  function run(cv, binData, w, h, params){
    const mat = new cv.Mat(h, w, cv.CV_8UC1);
    mat.data.set(binData);
    const contours = new cv.MatVector();
    const hier = new cv.Mat();
    cv.findContours(mat, contours, hier, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    const eps = params.simplify ?? 1.2;
    const result = [];
    for (let i=0;i<contours.size();i++){
      const c = contours.get(i);
      if (cv.contourArea(c) < (params.minArea||0)){ c.delete(); continue; }
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, eps, true);
      const pts=[];
      for (let j=0;j<approx.rows;j++){
        pts.push([approx.data32S[j*2], approx.data32S[j*2+1]]);
      }
      // jerarquía: negativo => contorno interior
      const isHole = hier.data32S[i*4+3] >= 0;
      result.push({ points: pts, closed: true, hole: isHole });
      approx.delete(); c.delete();
    }
    contours.delete(); hier.delete(); mat.delete();
    return result;
  }
  return { run };
})();
