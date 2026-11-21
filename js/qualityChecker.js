// Informe de calidad y auditoría
window.QualityChecker = (function(){

  function report(entities){
    let lineas=0, polilineas=0, cerradas=0, abiertas=0, arcos=0, circulos=0;
    for (const e of entities){
      if (e.type==='line') lineas++;
      else if (e.type==='arc'){ arcos++; abiertas++; }
      else if (e.type==='circle'){ circulos++; cerradas++; }
      else if (e.type==='polyline'){
        polilineas++;
        if (e.closed) cerradas++; else abiertas++;
      }
    }
    return { lineas, polilineas, cerradas, abiertas, arcos, circulos };
  }

  // [CORRECCIÓN] opts.merge respeta el checkbox "Unificar colineales" (antes siempre activo).
  function audit(entities, opts){
    // auditoría rápida usando el detector
    const polys = entities.filter(e=>e.type==='polyline').map(e=>e.points);
    const r = window.DuplicateDetector.run(polys, {tol:0.5, angTol:1, merge: !opts || opts.merge !== false});
    return {
      duplicados: r.stats.segmentosDuplicadosEncontrados,
      eliminados: 0, // [CORRECCIÓN] auditar no modifica la geometría: no elimina nada (antes repetía "duplicados")
      unificados: r.stats.puntosColinealesEliminados,
      ok: r.stats.segmentosDuplicadosEncontrados===0,
    };
  }

  return { report, audit };
})();
