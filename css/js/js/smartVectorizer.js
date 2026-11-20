// Decide método según grosor y estructura
window.SmartVectorizer = (function(){
  function analyze(binData, w, h){
    // grosor medio aproximado: área / longitud esqueleto
    let area=0;
    for (let i=0;i<binData.length;i++) if (binData[i]) area++;
    const sk = window.Centerline.run(binData, w, h, {simplify:1});
    let skLen=0;
    for (const p of sk){
      for (let i=1;i<p.length;i++) skLen += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]);
    }
    const avgThickness = skLen>0 ? area/skLen : 0;
    const density = area/(w*h);
    return { avgThickness, density, area, skLen };
  }

  function decide(analysis, params){
    const t = analysis.avgThickness;
    if (analysis.area===0) return 'centerline';
    if (t <= (params.strokeMax||12) && analysis.density < 0.35) return 'centerline';
    if (analysis.density > 0.35) return 'outline';
    return 'centerline';
  }

  return { analyze, decide };
})();
