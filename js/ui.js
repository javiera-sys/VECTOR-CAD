// Capa de interfaz (SOLO presentación). No contiene lógica de vectorización ni modifica datos:
// refleja en la barra de estado y en la barra superior lo que app.js ya muestra en #overlayMsg, #imgInfo y #log.
(function(){
  const $ = (id)=>document.getElementById(id);

  // Valor numérico junto a cada deslizador
  document.querySelectorAll('input[type=range]').forEach(r=>{
    const v = r.closest('label') && r.closest('label').querySelector('.v');
    if (!v) return;
    const upd = ()=>{ v.textContent = r.value; };
    r.addEventListener('input', upd); upd();
  });

  // Móvil: secciones plegadas salvo "Imagen" (evita paneles largos)
  if (window.matchMedia && matchMedia('(max-width:900px)').matches){
    document.querySelectorAll('.panel details.sec').forEach((d,i)=>{ if (i>0) d.open = false; });
  }

  // Barra de estado y estado del proyecto (derivados del estado real)
  const overlay = $('overlayMsg'), info = $('imgInfo'), logEl = $('log');
  function syncProc(){
    const txt = overlay.textContent || '';
    const busy = overlay.style.display === 'flex' && /…$/.test(txt);
    $('stProc').textContent = busy ? txt : 'Listo';
    $('stDot').classList.toggle('busy', busy);
    const loaded = !/^Sin imagen/.test(info.textContent);
    const p = $('projState');
    p.dataset.state = busy ? 'busy' : (loaded ? 'ready' : 'empty');
    $('projText').textContent = busy ? 'Procesando' : (loaded ? 'Imagen cargada' : 'Sin imagen');
    $('stDims').textContent = info.textContent;
  }
  const mo = {attributes:true, childList:true, characterData:true, subtree:true};
  new MutationObserver(syncProc).observe(overlay, mo);
  new MutationObserver(syncProc).observe(info, mo);
  new MutationObserver(()=>{ const l = logEl.lastElementChild; if (l) $('stOp').textContent = l.textContent; })
    .observe(logEl, {childList:true});
  syncProc();
  if (logEl.lastElementChild) $('stOp').textContent = logEl.lastElementChild.textContent;

  // Unidades / escala / decimales seleccionados
  function syncUnits(){
    $('stUnits').textContent = `Unidades: ${$('units').value} · Escala: ${$('scale').value} · Decimales: ${$('decimals').value}`;
  }
  ['units','scale','decimals'].forEach(id=>{ $(id).addEventListener('input', syncUnits); $(id).addEventListener('change', syncUnits); });
  syncUnits();

  // Resaltar el lienzo al arrastrar un archivo (la carga la sigue haciendo app.js)
  const wrap = $('canvasWrap');
  ['dragenter','dragover'].forEach(t=>wrap.addEventListener(t, ()=>wrap.classList.add('drag')));
  ['dragleave','drop'].forEach(t=>wrap.addEventListener(t, ()=>wrap.classList.remove('drag')));

  // El lienzo se redimensiona también cuando cambia su contenedor (paneles plegables, rotación de móvil)
  if (window.ResizeObserver && window.VectorEditor){
    let raf = 0;
    new ResizeObserver(()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(()=>window.VectorEditor.resize()); }).observe(wrap);
  }
})();

// Ventana de selección de modo de conversión (devuelve 'lines' | 'curves' | 'mixed', o null si se cancela)
window.GeoModeDialog = (function(){
  const modal = document.getElementById('geoModal');
  const radios = ()=>modal.querySelectorAll('input[name=geomode]');
  function ask(def){
    return new Promise(resolve=>{
      radios().forEach(r=>{ r.checked = (r.value===def); });
      modal.hidden = false;
      const sel = modal.querySelector('input[name=geomode]:checked'); if (sel) sel.focus();
      function done(v){
        modal.hidden = true;
        document.removeEventListener('keydown', onKey);
        modal.removeEventListener('click', onBackdrop);
        document.getElementById('geoOk').onclick = null; document.getElementById('geoCancel').onclick = null;
        resolve(v);
      }
      const chosen = ()=>{ const c = modal.querySelector('input[name=geomode]:checked'); return c ? c.value : null; };
      const onKey = e=>{ if (e.key==='Escape') done(null); else if (e.key==='Enter' && e.target.tagName!=='BUTTON') done(chosen()); };
      const onBackdrop = e=>{ if (e.target===modal) done(null); };
      document.addEventListener('keydown', onKey);
      modal.addEventListener('click', onBackdrop);
      document.getElementById('geoOk').onclick = ()=>done(chosen());
      document.getElementById('geoCancel').onclick = ()=>done(null);
    });
  }
  return { ask };
})();
