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

  // polylines: arrays de puntos. Devuelve polilíneas limpias + sources[i] = índice de la polilínea original
  // (para conservar capa y estado cerrado). Los tramos duplicados se eliminan y la polilínea se PARTE
  // en ese punto (antes se unían extremos no contiguos creando líneas falsas).
  function run(polylines, params){
    const tol = params.tol ?? 1;
    const doMerge = params.merge !== false;
    const seen = new Map();
    const kept = [], sources = [];
    let removed=0, pointsBefore=0, pointsAfter=0;

    polylines.forEach((p, idx)=>{
      const runs=[]; let cur=null;
      for (let i=1;i<p.length;i++){
        const s=[p[i-1],p[i]];
        const k = segKey(s[0],s[1],tol);
        let dup=false;
        if (seen.has(k)){
          const prev = seen.get(k);
          if (pointSegDist(s[0],prev[0],prev[1])<=tol && pointSegDist(s[1],prev[0],prev[1])<=tol) dup=true;
        }
        if (dup){ removed++; cur=null; continue; }
        seen.set(k,s);
        if (!cur){ cur=[s[0]]; runs.push(cur); }
        cur.push(s[1]);
      }
      for (const r of runs){
        const clean=[];
        for (const pt of r){
          if (!clean.length || Math.hypot(pt[0]-clean[clean.length-1][0], pt[1]-clean[clean.length-1][1])>tol*0.5)
            clean.push(pt);
        }
        if (clean.length>=2){ kept.push(clean); sources.push(idx); pointsBefore+=clean.length; }
      }
    });

    const out = doMerge ? window.GeometryCleaner.mergeCollinear(kept, params.angTol ?? 3) : kept;
    for (const p of out) pointsAfter += p.length;

    return {
      polylines: out,
      sources,
      stats: {
        segmentosDuplicadosEncontrados: removed,
        segmentosDuplicadosEliminados: removed,
        puntosColinealesEliminados: Math.max(0, pointsBefore-pointsAfter),
      }
    };
  }

  return { run };
})();
