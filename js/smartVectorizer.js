// Decide método según grosor y estructura
window.SmartVectorizer = (function(){
  // densidad barata (sin esqueletizar): permite descartar imágenes muy llenas antes del trabajo pesado
  function density(binData){
    let area=0;
    for (let i=0;i<binData.length;i++) if (binData[i]) area++;
    return binData.length ? area/binData.length : 0;
  }

  // polys: polilíneas de centerline ya calculadas (se reutilizan, no se vuelve a esqueletizar)
  function analyze(binData, polys){
    let area=0;
    for (let i=0;i<binData.length;i++) if (binData[i]) area++;
    let skLen=0;
    for (const p of polys){
      for (let i=1;i<p.length;i++) skLen += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]);
    }
    const avgThickness = skLen>0 ? area/skLen : 0;
    return { avgThickness, density: density(binData), area, skLen };
  }

  function decide(analysis, params){
    const t = analysis.avgThickness;
    if (analysis.area===0) return 'centerline';
    if (t <= (params.strokeMax||12) && analysis.density < 0.35) return 'centerline';
    if (analysis.density > 0.35) return 'outline';
    return 'outline';
  }

  return { density, analyze, decide };
})();
