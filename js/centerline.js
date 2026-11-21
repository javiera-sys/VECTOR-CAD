// Zhang-Suen + extracción de polilíneas centrales (sin dependencias)
(typeof window!=='undefined' ? window : self).Centerline = (function(){

  // Zhang-Suen optimizado: solo reevalúa píxeles de borde (candidatos) en cada pasada,
  // en lugar de recorrer toda la imagen. Mismo resultado, mucho más rápido.
  function zhangSuen(bin, w, h){
    const N = w*h;
    const img = new Uint8Array(N);
    for (let i=0;i<N;i++) img[i] = bin[i] ? 1 : 0;
    const off = [-w-1,-w,-w+1,1,w+1,w,w-1,-1]; // 8 vecinos en sentido horario
    let cand = [];
    for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++){
      const i=y*w+x;
      if (!img[i]) continue;
      for (let k=0;k<8;k++) if (!img[i+off[k]]){ cand.push(i); break; }
    }
    const mark = new Uint8Array(N);

    function pass(list, p){
      const rem = [];
      for (const i of list){
        if (!img[i]) continue;
        const x=i%w, y=(i-x)/w;
        if (x<1||y<1||x>=w-1||y>=h-1) continue;
        const p2=img[i-w], p3=img[i-w+1], p4=img[i+1], p5=img[i+w+1],
              p6=img[i+w], p7=img[i+w-1], p8=img[i-1], p9=img[i-w-1];
        const B = p2+p3+p4+p5+p6+p7+p8+p9;
        if (B<2 || B>6) continue;
        const A = (!p2&&p3)+(!p3&&p4)+(!p4&&p5)+(!p5&&p6)+
                  (!p6&&p7)+(!p7&&p8)+(!p8&&p9)+(!p9&&p2);
        if (A!==1) continue;
        if (p===0){ if (p2&&p4&&p6) continue; if (p4&&p6&&p8) continue; }
        else      { if (p2&&p4&&p8) continue; if (p2&&p6&&p8) continue; }
        rem.push(i);
      }
      if (!rem.length) return {n:0, list};
      for (const i of rem) img[i]=0;
      // nuevos candidatos: los que siguen vivos + vecinos de lo removido
      const next=[];
      for (const i of list) if (img[i] && !mark[i]){ mark[i]=1; next.push(i); }
      for (const i of rem) for (let k=0;k<8;k++){
        const j=i+off[k];
        if (j>=0 && j<N && img[j] && !mark[j]){ mark[j]=1; next.push(j); }
      }
      for (const j of next) mark[j]=0;
      return {n:rem.length, list:next};
    }

    let guard = 0;
    while (cand.length && guard++ < 5000){
      const r0 = pass(cand,0); cand = r0.list;
      const r1 = pass(cand,1); cand = r1.list;
      if (r0.n + r1.n === 0) break;
    }
    return img;
  }

  // Quita píxeles "de esquina" redundantes (puntos simples) para que las líneas diagonales
  // no se partan en cientos de tramos de 1-2 px. Preserva la conectividad 8.
  function thinCorners(sk, w, h){
    const D=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
    for (let it=0; it<2; it++){
      let ch=0;
      for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++){
        const i=y*w+x;
        if (!sk[i]) continue;
        const nb=[];
        for (const [dx,dy] of D) if (sk[i+dy*w+dx]) nb.push([dx,dy]);
        if (nb.length<2) continue;
        // componentes entre vecinos con adyacencia física 8
        const seen=new Array(nb.length).fill(false);
        let comps=0;
        for (let a=0;a<nb.length;a++){
          if (seen[a]) continue;
          comps++; const st=[a]; seen[a]=true;
          while (st.length){
            const c=st.pop();
            for (let b=0;b<nb.length;b++){
              if (!seen[b] && Math.abs(nb[b][0]-nb[c][0])<=1 && Math.abs(nb[b][1]-nb[c][1])<=1){ seen[b]=true; st.push(b); }
            }
          }
        }
        if (comps===1){ sk[i]=0; ch++; }
      }
      if (!ch) break;
    }
    return sk;
  }

  // Extrae polilíneas del esqueleto como grafo: los nodos son píxeles con grado != 2
  // y cada arista (tramo entre nodos) se recorre exactamente una vez.
  function skeletonToPolylines(sk, w, h){
    const N = w*h;
    const nbrs = (i)=>{
      const x=i%w, y=(i-x)/w, out=[];
      for (let dy=-1; dy<=1; dy++){
        const ny=y+dy; if (ny<0||ny>=h) continue;
        for (let dx=-1; dx<=1; dx++){
          if (!dx && !dy) continue;
          const nx=x+dx; if (nx<0||nx>=w) continue;
          const j=ny*w+nx; if (sk[j]) out.push(j);
        }
      }
      return out;
    };
    const adj = new Map(); // solo píxeles del esqueleto
    const nodes = [];
    for (let i=0;i<N;i++){
      if (!sk[i]) continue;
      const n = nbrs(i); adj.set(i,n);
      if (n.length!==2) nodes.push(i);
    }
    const usedEdge = new Set();
    const ek = (a,b)=> a<b ? a*N+b : b*N+a;
    const onPath = new Uint8Array(N);
    const polylines = [];
    const toPt = (i)=>[i%w, (i-(i%w))/w];

    function trace(start, first){
      const path=[start, first];
      usedEdge.add(ek(start,first));
      onPath[start]=1; onPath[first]=1;
      let prev=start, cur=first;
      while (adj.get(cur).length===2){
        const n = adj.get(cur);
        const nx = n[0]===prev ? n[1] : n[0];
        const k = ek(cur,nx);
        if (usedEdge.has(k)) break;
        usedEdge.add(k);
        path.push(nx); onPath[nx]=1;
        prev=cur; cur=nx;
        if (cur===start) break;
      }
      return path;
    }

    for (const s of nodes){
      for (const n of adj.get(s)){
        if (usedEdge.has(ek(s,n))) continue;
        polylines.push(trace(s,n).map(toPt));
      }
    }
    // ciclos puros (sin nodos), p. ej. círculos
    for (const [i,n] of adj){
      if (onPath[i] || n.length!==2) continue;
      const path = trace(i, n[0]);
      polylines.push(path.map(toPt));
    }
    return polylines;
  }

  function rdp(points, eps){
    if (points.length<3) return points;
    let dmax=0, idx=0;
    const [x1,y1]=points[0], [x2,y2]=points[points.length-1];
    const dx=x2-x1, dy=y2-y1;
    const den = Math.hypot(dx,dy) || 1e-9;
    for (let i=1;i<points.length-1;i++){
      const [px,py]=points[i];
      const d = Math.abs(dy*px - dx*py + x2*y1 - y2*x1)/den;
      if (d>dmax){ dmax=d; idx=i; }
    }
    if (dmax>eps){
      const left = rdp(points.slice(0,idx+1), eps);
      const right = rdp(points.slice(idx), eps);
      return left.slice(0,-1).concat(right);
    }
    return [points[0], points[points.length-1]];
  }

  // Elimina solo espuelas cortas (extremo libre) y motas aisladas; conserva conectores cortos entre nodos.
  function pruneShort(polylines, minLen){
    const cnt = new Map();
    const key = (p)=> p[0]+','+p[1];
    for (const p of polylines){
      for (const e of [p[0], p[p.length-1]]) cnt.set(key(e), (cnt.get(key(e))||0)+1);
    }
    const out=[];
    for (const p of polylines){
      let len=0;
      for (let i=1;i<p.length;i++) len += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]);
      const free = cnt.get(key(p[0]))===1 || cnt.get(key(p[p.length-1]))===1;
      if (len>=minLen || !free) out.push(p);
    }
    return out;
  }

  function run(binData, w, h, params){
    const sk = thinCorners(zhangSuen(binData, w, h), w, h);
    let polys = skeletonToPolylines(sk, w, h);
    polys = pruneShort(polys, 4);
    const eps = params.simplify ?? 1.2;
    // [CORRECCIÓN] Lazos cerrados (primer punto = último): rdp() los reducía a 2 puntos idénticos y se perdían.
    // Se dividen en el punto más lejano del inicio y se simplifica cada mitad.
    polys = polys.map(p=>{
      const a=p[0], b=p[p.length-1];
      if (p.length>3 && a[0]===b[0] && a[1]===b[1]){
        let idx=1, dm=-1;
        for (let i=1;i<p.length-1;i++){ const d=Math.hypot(p[i][0]-a[0], p[i][1]-a[1]); if (d>dm){ dm=d; idx=i; } }
        return rdp(p.slice(0,idx+1), eps).slice(0,-1).concat(rdp(p.slice(idx), eps));
      }
      return rdp(p, eps);
    });
    return polys.map(p=> p.map(([x,y])=>[x,y]));
  }

  return { run };
})();
