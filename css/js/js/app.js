// Orquestador principal
(function(){
  const $ = (id)=>document.getElementById(id);
  const log = (msg)=>{ const el=$('log'); el.textContent += msg+'\n'; el.scrollTop=el.scrollHeight; };

  let current = {
    imageCanvas:null, imageData:null,
    bin:null, w:0, h:0,
    entities:[],
    history:[], future:[],
  };

  function params(){
    return {
      contrast: parseFloat($('contrast').value),
      brightness: parseFloat($('brightness').value),
      threshold: parseInt($('threshold').value,10),
      blur: parseInt($('blur').value,10),
      minArea: parseInt($('minArea').value,10),
      invert: $('invert').checked,
      simplify: parseFloat($('simplify').value),
      strokeMax: parseInt($('strokeMax').value,10),
      tol: parseFloat($('tol').value),
      angTol: parseFloat($('angTol').value),
      mergeCollinear: $('mergeCollinear').checked,
    };
  }

  function pushHistory(){
    current.history.push(JSON.stringify(current.entities));
    if (current.history.length>50) current.history.shift();
    current.future.length=0;
  }

  function updateStats(){
    const r = window.QualityChecker.report(current.entities);
    $('stats').textContent =
      `Líneas: ${r.lineas}\nPolilíneas: ${r.polilineas}\nCerradas: ${r.cerradas}\nAbiertas: ${r.abiertas}`;
  }

  async function loadFile(file){
    try {
      const {canvas, imageData} = await window.ImageProcessor.loadImageToCanvas(file);
      current.imageCanvas = canvas;
      current.imageData = imageData;
      current.w = canvas.width; current.h = canvas.height;
      const img = new Image();
      img.src = canvas.toDataURL();
      await img.decode();
      window.VectorEditor.setImage(img, canvas.width, canvas.height);
      window.VectorEditor.resize();
      $('imgInfo').textContent = `${canvas.width} × ${canvas.height} px`;
      $('overlayMsg').style.display = 'none';
      log('Imagen cargada: '+file.name);
    } catch(e){ log('Error cargando imagen: '+e.message); }
  }

  async function process(){
    if (!current.imageData){ log('Sin imagen para procesar.'); return; }
    $('overlayMsg').style.display='flex';
    $('overlayMsg').textContent = 'Procesando…';
    await new Promise(r=>setTimeout(r,20));
    try {
      const cv = await window.ImageProcessor.waitOpenCV();
      const p = params();
      const bin = window.ImageProcessor.preprocess(cv, current.imageData, p);
      current.bin = bin; current.w = bin.width; current.h = bin.height;

      const mode = document.querySelector('input[name="mode"]:checked').value;
      let entities = [];

      if (mode==='centerline' || mode==='smart'){
        let useCL = (mode==='centerline');
        if (mode==='smart'){
          const a = window.SmartVectorizer.analyze(bin.data, bin.width, bin.height);
          useCL = window.SmartVectorizer.decide(a, p) === 'centerline';
          log(`SMART: grosor≈${a.avgThickness.toFixed(2)}px densidad=${a.density.toFixed(2)} → ${useCL?'CENTERLINE':'OUTLINE'}`);
        }
        if (useCL){
          const polys = window.Centerline.run(bin.data, bin.width, bin.height, p);
          entities = polys.map(pts=>({type:'polyline', points:pts, closed:false, layer:'LINEAS_CENTRALES'}));
        }
      }
      if (mode==='outline' || (mode==='smart' && entities.length===0)){
        const polys = window.Outline.run(cv, bin.data, bin.width, bin.height, p);
        entities = polys.map(o=>({
          type:'polyline', points:o.points, closed:o.closed,
          layer: o.hole? 'GEOMETRIA_INTERIOR':'CONTORNOS'
        }));
      }

      // limpieza de duplicados
      const clean = window.DuplicateDetector.run(
        entities.filter(e=>e.type==='polyline').map(e=>e.points),
        {tol:p.tol, angTol:p.angTol}
      );
      entities = clean.polylines.map(pts=>({
        type:'polyline', points:pts, closed:false,
        layer: entities[0]?.layer || 'LINEAS_CENTRALES'
      }));

      pushHistory();
      current.entities = entities;
      window.VectorEditor.setEntities(entities);
      updateStats();
      log(`Procesado: ${entities.length} polilíneas. Duplicados eliminados: ${clean.stats.segmentosDuplicadosEliminados}`);

      $('audit').textContent =
        `Duplicados encontrados: ${clean.stats.segmentosDuplicadosEncontrados}\n`+
        `Duplicados eliminados: ${clean.stats.segmentosDuplicadosEliminados}\n`+
        `Polilíneas unificadas: ${clean.stats.polilineasUnificadas}`;
    } catch(e){
      log('Error procesando: '+e.message);
    } finally {
      $('overlayMsg').style.display='none';
    }
  }

  function clean(){
    if (!current.entities.length){ log('Nada que limpiar.'); return; }
    pushHistory();
    const p = params();
    const polys = current.entities.filter(e=>e.type==='polyline').map(e=>e.points);
    const r = window.DuplicateDetector.run(polys, {tol:p.tol, angTol:p.angTol});
    current.entities = r.polylines.map(pts=>({type:'polyline', points:pts, closed:false, layer:'LINEAS_CENTRALES'}));
    window.VectorEditor.setEntities(current.entities);
    updateStats();
    log(`Limpieza: ${r.stats.segmentosDuplicadosEliminados} duplicados eliminados.`);
  }

  function audit(){
    if (!current.entities.length){ log('Sin geometría para auditar.'); return; }
    const a = window.QualityChecker.audit(current.entities);
    $('audit').textContent =
      `Duplicados: ${a.duplicados}\nEliminados: ${a.eliminados}\nUnificados: ${a.unificados}\n`+
      `Estado: ${a.ok?'LIMPIO':'REVISAR'}`;
    log('Auditoría ejecutada.');
  }

  function exportDXF(){
    if (!current.entities.length){ log('Sin geometría para exportar.'); return; }
    // auditoría previa obligatoria
    const a = window.QualityChecker.audit(current.entities);
    if (!a.ok){
      log('ADVERTENCIA: la auditoría detectó posibles duplicados. Ejecuta Limpiar antes de exportar.');
    }
    const content = window.DXFExporter.build(current.entities, {
      units: $('units').value,
      scale: parseFloat($('scale').value)||1,
      decimals: parseInt($('decimals').value,10)||3,
    });
    window.DXFExporter.download(content, 'imagetocad.dxf');
    log('DXF exportado.');
  }

  function undo(){
    if (!current.history.length) return;
    current.future.push(JSON.stringify(current.entities));
    current.entities = JSON.parse(current.history.pop());
    window.VectorEditor.setEntities(current.entities);
    updateStats();
  }
  function redo(){
    if (!current.future.length) return;
    current.history.push(JSON.stringify(current.entities));
    current.entities = JSON.parse(current.future.pop());
    window.VectorEditor.setEntities(current.entities);
    updateStats();
  }

  // ===== Bind UI =====
  $('fileInput').addEventListener('change', e=>{
    const f = e.target.files[0]; if (f) loadFile(f);
  });
  $('btnOpen').addEventListener('click', ()=> $('fileInput').click());
  $('btnProcess').addEventListener('click', process);
  $('btnClean').addEventListener('click', clean);
  $('btnAudit').addEventListener('click', audit);
  $('btnExport').addEventListener('click', exportDXF);
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  $('btnFit').addEventListener('click', ()=> window.VectorEditor.fit());
  $('btnZoomIn').addEventListener('click', ()=> window.VectorEditor.zoomBy(1.2));
  $('btnZoomOut').addEventListener('click', ()=> window.VectorEditor.zoomBy(1/1.2));
  $('showImage').addEventListener('change', e=> window.VectorEditor.setShowImage(e.target.checked));
  $('showVectors').addEventListener('change', e=> window.VectorEditor.setShowVectors(e.target.checked));
  $('showNodes').addEventListener('change', e=> window.VectorEditor.setShowNodes(e.target.checked));
  $('vecColor').addEventListener('input', e=> window.VectorEditor.setColor(e.target.value));

  // drag&drop
  const wrap = $('canvasWrap');
  wrap.addEventListener('dragover', e=>{ e.preventDefault(); });
  wrap.addEventListener('drop', e=>{
    e.preventDefault();
    const f = e.dataTransfer.files[0]; if (f) loadFile(f);
  });

  // init
  window.VectorEditor.resize();
  log('Listo. Carga una imagen para comenzar.');
})();
