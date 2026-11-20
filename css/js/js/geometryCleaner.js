// Simplificación y unificación de segmentos colineales
window.GeometryCleaner = (function(){

  function mergeCollinear(polylines, angTolDeg=3){
    const angTol = angTolDeg*Math.PI/180;
    // unir tramos consecutivos de la misma polilínea que sean casi rectos
    const out=[];
    for (const p of polylines){
      if (p.length<3){ out.push(p); continue; }
      const np=[p[0]];
      for (let i=1;i<p.length-1;i++){
        const a=np[np.length-1], b=p[i], c=p[i+1];
        const a1=Math.atan2(b[1]-a[1], b[0]-a[0]);
        const a2=Math.atan2(c[1]-b[1], c[0]-b[0]);
        let d=Math.abs(a1-a2);
        if (d>Math.PI) d=2*Math.PI-d;
        if (d>angTol) np.push(b);
      }
      np.push(p[p.length-1]);
      out.push(np);
    }
    return out;
  }

  return { mergeCollinear };
})();
