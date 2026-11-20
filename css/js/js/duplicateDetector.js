// Detección y eliminación de duplicados con tolerancia
window.DuplicateDetector = (function(){

  function segKey(a,b,tol){
    const q = (v)=> Math.round(v/tol);
    const [x1,y1]=a, [x2,y2]=b;
    // ordenar extremos para clave no direccional
    const k1=`${q(x1)},${q(y1)}`, k2=`${q(x2)},${q(y2)}`;
    return k1<k2 ? k1+'|'+k2 : k2+'|'+k1;
  }

  function pointSegDist(p,a,b){
    const [px,py]=p, [x1,y1]=a, [x2,y2]=b;
    const dx=x2-x1, dy=y2-y1;
    const L2=dx*dx+dy*dy || 1e-9;
    let t=((px-x1)*dx+(py-y1)*dy)/L2;
    t=Math.max(0,Math.min(1,t));
    const cx=x1+t*dx, cy=y1+t*dy;
    return Math.hypot(px-cx, py-cy);
  }

  function run(polylines, params){
    const tol = params.tol ?? 1;
    const seen = new Map();
    const kept = [];
    let removed=0, merged=0;

    for (const p of polylines){
      // dividir en segmentos
      const segs=[];
      for (let i=1;i<p.length;i++) segs.push([p[i-1],p[i]]);
      const newSegs=[];
      for (const s of segs){
        const k = segKey(s[0],s[1],tol);
        if (seen.has(k)){
          const prev = seen.get(k);
          // verificar realmente cercanía
          if (pointSegDist(s[0],prev[0],prev[1])<=tol &&
              pointSegDist(s[1],prev[0],prev[1])<=tol){
            removed++;
            continue;
          }
        }
        seen.set(k,s);
        newSegs.push(s);
      }
      if (newSegs.length===0) continue;
      // reconstruir polilínea
      const np=[newSegs[0][0]];
      for (const s of newSegs) np.push(s[1]);
      // deduplicar puntos consecutivos
      const clean=[];
      for (const pt of np){
        if (!clean.length || Math.hypot(pt[0]-clean[clean.length-1][0], pt[1]-clean[clean.length-1][1])>tol*0.5)
          clean.push(pt);
      }
      if (clean.length>=2) kept.push(clean);
    }

    // fusionar colineales
    const before = kept.length;
    const mergedPolys = window.GeometryCleaner.mergeCollinear(kept, params.angTol ?? 3);
    merged = before - mergedPolys.length;

    return {
      polylines: mergedPolys,
      stats: {
        segmentosDuplicadosEncontrados: removed,
        segmentosDuplicadosEliminados: removed,
        polilineasUnificadas: Math.max(0, merged),
      }
    };
  }

  return { run };
})();
