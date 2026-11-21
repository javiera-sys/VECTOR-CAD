// Orquestador principal
(function(){
  const $ = (id)=>document.getElementById(id);
  // [REDISEÑO] log(): mismas llamadas y mensajes; ahora cada línea es un <div> con nivel (error/aviso/ok) para colorearla.
  const log = (msg)=>{
    const el=$('log'), d=document.createElement('div'); d.textContent=msg;
    if (/^error/i.test(msg)) d.className='l-err';
    else if (/^(advertencia|worker no|archivo no|sin |nada )/i.test(msg)) d.className='l-warn';
    else if (/^(procesado|limpieza|dxf exportado|imagen cargada|auditor)/i.test(msg)) d.className='l-ok';
    el.appendChild(d); el.scrollTop=el.scrollHeight;
  };

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
      current.entities = []; current.bin = null; current.history.length = 0; current.future.length = 0;
      window.VectorEditor.setEntities([]); updateStats();
      $('audit').textContent = 'Sin auditoría ejecutada.';
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

  // Esqueletizado en Web Worker; si no está disponible (p. ej. abierto con file://) cae al hilo principal.
  let workerBroken = false;
  function runCenterline(bin, p){
    return new Promise((resolve,reject)=>{
      const sync = ()=> setTimeout(()=>{
        try { resolve(window.Centerline.run(bin.data, bin.width, bin.height, {simplify:p.simplify})); }
        catch(e){ reject(e); }
      }, 30);
      if (workerBroken || !window.Worker) return sync();
      let w;
      try { w = new Worker('js/vectorize_worker.js'); }
      catch(e){ workerBroken = true; log('Worker no disponible, usando hilo principal.'); return sync(); }
      w.onmessage = ev=>{ w.terminate(); ev.data.ok ? resolve(ev.data.polys) : reject(new Error(ev.data.error)); };
      w.onerror = ()=>{ w.terminate(); workerBroken = true; log('Worker no disponible (¿abierto con file://?), usando hilo principal.'); sync(); };
      w.postMessage({task:'centerline', payload:{data:bin.data, w:bin.width, h:bin.height, params:{simplify:p.simplify}}});
    });
  }

  // Limpia duplicados conservando capa y estado "cerrado" de cada entidad original.
  function cleanEntities(entities, p){
    const polys = entities.filter(e=>e.type==='polyline');
    // los polígonos cerrados se pasan con el punto inicial repetido para no perder el último segmento
    const input = polys.map(e=> e.closed && e.points.length>2 ? e.points.concat([e.points[0]]) : e.points);
    const r = window.DuplicateDetector.run(input, {tol:p.tol, angTol:p.angTol, merge:p.mergeCollinear});
    const out = r.polylines.map((pts,i)=>{
      const src = polys[r.sources[i]];
      let closed = false;
      if (src.closed && pts.length>3){
        const f=pts[0], l=pts[pts.length-1];
        if (Math.hypot(f[0]-l[0], f[1]-l[1]) <= Math.max(1e-6, p.tol*0.5)){ closed = true; pts = pts.slice(0,-1); }
      }
      return {type:'polyline', points:pts, closed, layer: src.layer || 'LINEAS_CENTRALES'};
    });
    return {entities: out, stats: r.stats};
  }

  const setMsg = (t)=>{ $('overlayMsg').style.display='flex'; $('overlayMsg').textContent=t; };
  let busy = false;

  async function process(){
    if (!current.imageData){ log('Sin imagen para procesar.'); return; }
    if (busy) return;
    busy = true;
    setMsg('Procesando…');
    await new Promise(r=>setTimeout(r,20));
    try {
      setMsg('Esperando OpenCV…');
      await window.ImageProcessor.waitOpenCV();
      const cv = window.cv;
      const p = params();
      setMsg('Preprocesando imagen…');
      await new Promise(r=>setTimeout(r,0));
      const bin = window.ImageProcessor.preprocess(cv, current.imageData, p);
      current.bin = bin; current.w = bin.width; current.h = bin.height;

      const mode = document.querySelector('input[name="mode"]:checked').value;
      let entities = [];
      let useCL = (mode==='centerline');
      let polys = null;

      if (mode==='smart'){
        const dens = window.SmartVectorizer.density(bin.data);
        if (dens > 0.35){
          useCL = false;
          log(`SMART: densidad=${dens.toFixed(2)} → OUTLINE`);
        } else {
          setMsg('Analizando trazos…');
          polys = await runCenterline(bin, p);
          const a = window.SmartVectorizer.analyze(bin.data, polys);
          useCL = window.SmartVectorizer.decide(a, p) === 'centerline';
          log(`SMART: grosor≈${a.avgThickness.toFixed(2)}px densidad=${a.density.toFixed(2)} → ${useCL?'CENTERLINE':'OUTLINE'}`);
        }
      } else if (useCL){
        setMsg('Calculando líneas centrales…');
        polys = await runCenterline(bin, p);
      }

      if (useCL && polys){
        entities = polys.map(pts=>({type:'polyline', points:pts, closed:false, layer:'LINEAS_CENTRALES'}));
      }
      if (mode==='outline' || (mode==='smart' && entities.length===0)){
        setMsg('Extrayendo contornos…');
        await new Promise(r=>setTimeout(r,0));
        const o = window.Outline.run(cv, bin.data, bin.width, bin.height, p);
        entities = o.map(c=>({
          type:'polyline', points:c.points, closed:c.closed,
          layer: c.hole? 'GEOMETRIA_INTERIOR':'CONTORNOS'
        }));
      }

      setMsg('Limpiando duplicados…');
      await new Promise(r=>setTimeout(r,0));
      const res = cleanEntities(entities, p);
      entities = res.entities;

      pushHistory();
      current.entities = entities;
      window.VectorEditor.setEntities(entities);
      updateStats();
      log(`Procesado: ${entities.length} polilíneas. Duplicados eliminados: ${res.stats.segmentosDuplicadosEliminados}`);
      showAudit(res.stats);
    } catch(e){
      log('Error procesando: '+e.message);
    } finally {
      $('overlayMsg').style.display='none';
      busy = false;
    }
  }

  function showAudit(st){
    $('audit').textContent =
      `Duplicados encontrados: ${st.segmentosDuplicadosEncontrados}\n`+
      `Duplicados eliminados: ${st.segmentosDuplicadosEliminados}\n`+
      `Puntos colineales eliminados: ${st.puntosColinealesEliminados}`;
  }

  function clean(){
    if (!current.entities.length){ log('Nada que limpiar.'); return; }
    pushHistory();
    const res = cleanEntities(current.entities, params());
    current.entities = res.entities;
    window.VectorEditor.setEntities(current.entities);
    updateStats();
    showAudit(res.stats);
    log(`Limpieza: ${res.stats.segmentosDuplicadosEliminados} duplicados eliminados.`);
  }

  // [CORRECCIÓN] renderAudit(): el panel de Auditoría se recalcula también al deshacer/rehacer.
  function renderAudit(){
    if (!current.entities.length){ $('audit').textContent = 'Sin auditoría ejecutada.'; return false; }
    const a = window.QualityChecker.audit(current.entities, {merge: params().mergeCollinear});
    $('audit').textContent =
      `Duplicados: ${a.duplicados}\nEliminados: ${a.eliminados}\nPuntos colineales: ${a.unificados}\n`+
      `Estado: ${a.ok?'LIMPIO':'REVISAR'}`;
    return true;
  }
  function audit(){
    if (!current.entities.length){ log('Sin geometría para auditar.'); return; }
    renderAudit();
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
    updateStats(); renderAudit();
  }
  function redo(){
    if (!current.future.length) return;
    current.history.push(JSON.stringify(current.entities));
    current.entities = JSON.parse(current.future.pop());
    window.VectorEditor.setEntities(current.entities);
    updateStats(); renderAudit();
  }

  // ===== Bind UI =====
  $('fileInput').addEventListener('change', e=>{
    const f = e.target.files[0]; if (f) loadFile(f);
    e.target.value = ''; // permite volver a elegir el mismo archivo
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
    const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) loadFile(f); else if (f) log('Archivo no compatible: '+f.name);
  });

  // init
  window.VectorEditor.resize();
  log('Listo. Carga una imagen para comenzar.');
})();
