// Visualizador con zoom, pan y dibujo
window.VectorEditor = (function(){
  let state = {
    zoom:1, tx:0, ty:0,
    image:null, imageW:0, imageH:0,
    entities:[],
    color:'#00e0ff',
    showImage:true, showVectors:true, showNodes:false,
  };

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');

  function resize(){
    const wrap = document.getElementById('canvasWrap');
    canvas.width = wrap.clientWidth * devicePixelRatio;
    canvas.height = wrap.clientHeight * devicePixelRatio;
    canvas.style.width = wrap.clientWidth+'px';
    canvas.style.height = wrap.clientHeight+'px';
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    draw();
  }

  function fit(){
    if (!state.image) return;
    const wrap = document.getElementById('canvasWrap');
    const zx = wrap.clientWidth / state.imageW;
    const zy = wrap.clientHeight / state.imageH;
    state.zoom = Math.min(zx,zy)*0.95;
    state.tx = (wrap.clientWidth - state.imageW*state.zoom)/2;
    state.ty = (wrap.clientHeight - state.imageH*state.zoom)/2;
    draw();
  }

  function draw(){
    const w = canvas.width/devicePixelRatio, h = canvas.height/devicePixelRatio;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(0,0,w,h);
    ctx.save();
    ctx.translate(state.tx, state.ty);
    ctx.scale(state.zoom, state.zoom);

    if (state.showImage && state.image){
      ctx.globalAlpha = state.showVectors ? 0.35 : 1;
      ctx.drawImage(state.image, 0,0, state.imageW, state.imageH);
      ctx.globalAlpha = 1;
    }

    if (state.showVectors && state.entities.length){
      ctx.strokeStyle = state.color;
      ctx.lineWidth = 1/state.zoom;
      for (const e of state.entities){
        if (e.type==='polyline'){
          ctx.beginPath();
          const p = e.points;
          if (!p.length) continue;
          ctx.moveTo(p[0][0], p[0][1]);
          for (let i=1;i<p.length;i++) ctx.lineTo(p[i][0], p[i][1]);
          if (e.closed) ctx.closePath();
          ctx.stroke();
        } else if (e.type==='line'){
          ctx.beginPath();
          ctx.moveTo(e.a[0], e.a[1]);
          ctx.lineTo(e.b[0], e.b[1]);
          ctx.stroke();
        }
      }
      if (state.showNodes){
        ctx.fillStyle = '#ff4d4d';
        const r = 2/state.zoom;
        for (const e of state.entities){
          const pts = e.type==='polyline'? e.points : [e.a,e.b];
          for (const [x,y] of pts){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
        }
      }
    }
    ctx.restore();
  }

  function setImage(img, w, h){ state.image=img; state.imageW=w; state.imageH=h; fit(); }
  function setEntities(e){ state.entities=e; draw(); }
  function getEntities(){ return state.entities; }
  function setColor(c){ state.color=c; draw(); }
  function setShowImage(v){ state.showImage=v; draw(); }
  function setShowVectors(v){ state.showVectors=v; draw(); }
  function setShowNodes(v){ state.showNodes=v; draw(); }
  function zoomBy(f, cx, cy){
    const w = canvas.width/devicePixelRatio, h = canvas.height/devicePixelRatio;
    cx = cx ?? w/2; cy = cy ?? h/2;
    const newZ = Math.max(0.05, Math.min(20, state.zoom*f));
    const k = newZ/state.zoom;
    state.tx = cx - (cx - state.tx)*k;
    state.ty = cy - (cy - state.ty)*k;
    state.zoom = newZ;
    draw();
  }
  function pan(dx,dy){ state.tx+=dx; state.ty+=dy; draw(); }

  // eventos pan
  let dragging=false, last=null;
  canvas.addEventListener('mousedown', e=>{ dragging=true; last={x:e.clientX,y:e.clientY}; });
  window.addEventListener('mouseup', ()=> dragging=false);
  canvas.addEventListener('mousemove', e=>{
    if (!dragging) return;
    const dx=e.clientX-last.x, dy=e.clientY-last.y;
    last={x:e.clientX,y:e.clientY};
    pan(dx,dy);
  });
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomBy(e.deltaY<0?1.1:0.9, e.clientX-rect.left, e.clientY-rect.top);
  }, {passive:false});

  window.addEventListener('resize', resize);

  return {
    resize, fit, draw, setImage, setEntities, getEntities,
    setColor, setShowImage, setShowVectors, setShowNodes, zoomBy
  };
})();
