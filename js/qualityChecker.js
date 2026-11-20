// Informe de calidad y auditoría
window.QualityChecker = (function(){

  function report(entities){
    let lineas=0, polilineas=0, cerradas=0, abiertas=0;
    for (const e of entities){
      if (e.type==='line') lineas++;
      else if (e.type==='polyline'){
        polilineas++;
        if (e.closed) cerradas++; else abiertas++;
      }
    }
    return { lineas, polilineas, cerradas, abiertas };
  }

  function audit(entities){
    // auditoría rápida usando el detector
    const polys = entities.filter(e=>e.type==='polyline').map(e=>e.points);
    const r = window.DuplicateDetector.run(polys, {tol:0.5, angTol:1});
    return {
      duplicados: r.stats.segmentosDuplicadosEncontrados,
      eliminados: r.stats.segmentosDuplicadosEliminados,
      unificados: r.stats.puntosColinealesEliminados,
      ok: r.stats.segmentosDuplicadosEncontrados===0,
    };
  }

  return { report, audit };
})();
