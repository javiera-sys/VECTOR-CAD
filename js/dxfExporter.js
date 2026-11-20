// Exportador DXF ASCII mínimo (LWPOLYLINE) compatible con AutoCAD
window.DXFExporter = (function(){

  function unitFactor(units){
    if (units==='cm') return 10;   // 1 unidad CAD = 10 mm
    if (units==='in') return 25.4; // 1 unidad CAD = 25.4 mm
    return 1;
  }

  function writeHeader(scale, units, decimals){
    const f = unitFactor(units);
    const insUnits = units==='mm'?4 : units==='cm'?5 : units==='in'?1 : 4;
    return [
      '0','SECTION','2','HEADER',
      '9','$ACADVER','1','AC1015',
      '9','$INSUNITS','70',String(insUnits),
      '0','ENDSEC',
      '0','SECTION','2','TABLES',
      '0','TABLE','2','LAYER','70','3',
      ...layerDef('0'),
      ...layerDef('CONTORNOS'),
      ...layerDef('LINEAS_CENTRALES'),
      ...layerDef('GEOMETRIA_INTERIOR'),
      '0','ENDTAB','0','ENDSEC',
      '0','SECTION','2','ENTITIES',
    ];
  }

  function layerDef(name){
    return ['0','LAYER','2',name,'70','0','62','7','6','CONTINUOUS'];
  }

  function num(v, dec){
    return Number(v).toFixed(dec);
  }

  function lwpolyline(points, layer, closed, scale, dec){
    if (points.length<2) return [];
    const out=['0','LWPOLYLINE','8',layer,'90',String(points.length),'70',closed?'1':'0'];
    for (const [x,y] of points){
      out.push('10', num(x*scale, dec));
      out.push('20', num(-y*scale, dec)); // invertir Y para CAD
    }
    return out;
  }

  function build(entities, opts){
    const scale = (opts.scale||1) * unitFactor(opts.units);
    const dec = opts.decimals ?? 3;
    const lines = writeHeader(opts.scale, opts.units, dec);

    for (const e of entities){
      if (e.type==='polyline'){
        const layer = e.layer || 'LINEAS_CENTRALES';
        const closed = !!e.closed;
        lines.push(...lwpolyline(e.points, layer, closed, scale, dec));
      } else if (e.type==='line'){
        const layer = e.layer || 'LINEAS_CENTRALES';
        lines.push('0','LINE','8',layer,
          '10',num(e.a[0]*scale,dec),'20',num(-e.a[1]*scale,dec),'30','0',
          '11',num(e.b[0]*scale,dec),'21',num(-e.b[1]*scale,dec),'31','0');
      }
    }

    lines.push('0','ENDSEC','0','EOF');
    return lines.join('\n');
  }

  function download(content, filename='output.dxf'){
    const blob = new Blob([content], {type:'application/dxf'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  return { build, download };
})();
