// Zhang-Suen + extracción de polilíneas centrales (sin dependencias)
window.Centerline = (function(){

  function zhangSuen(bin, w, h){
    const img = new Uint8Array(bin); // 0/255
    let changed = true;
    const idx = (x,y)=> y*w+x;
    let iter = 0;
    while (changed && iter < 200){
      changed = false;
      for (let pass=0; pass<2; pass++){
        const toRemove = [];
        for (let y=1; y<h-1; y++){
          for (let x=1; x<w-1; x++){
            const i = idx(x,y);
            if (img[i]===0) continue;
            const p2=img[idx(x,y-1)]?1:0, p3=img[idx(x+1,y-1)]?1:0,
                  p4=img[idx(x+1,y)]?1:0, p5=img[idx(x+1,y+1)]?1:0,
                  p6=img[idx(x,y+1)]?1:0, p7=img[idx(x-1,y+1)]?1:0,
                  p8=img[idx(x-1,y)]?1:0, p9=img[idx(x-1,y-1)]?1:0;
            const B = p2+p3+p4+p5+p6+p7+p8+p9;
            if (B<2 || B>6) continue;
            const A = (!p2&&p3)+(!p3&&p4)+(!p4&&p5)+(!p5&&p6)+
                      (!p6&&p7)+(!p7&&p8)+(!p8&&p9)+(!p9&&p2);
            if (A!==1) continue;
            if (pass===0){
              if (p2&&p4&&p6) continue;
              if (p4&&p6&&p8) continue;
            } else {
              if (p2&&p4&&p8) continue;
              if (p2&&p6&&p8) continue;
            }
            toRemove.push(i);
          }
        }
        if (toRemove.length){ changed = true; toRemove.forEach(i=> img[i]=0); }
      }
      iter++;
    }
    return img;
  }

  function neighbors(sk, w, h, x, y){
    const out=[];
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
      if (!dx && !dy) continue;
      const nx=x+dx, ny=y+dy;
      if (nx<0||ny<0||nx>=w||ny>=h) continue;
      if (sk[ny*w+nx]) out.push([nx,ny]);
    }
    return out;
  }

  // Extrae polilíneas a partir del esqueleto: recorre desde nodos de grado != 2
  function skeletonToPolylines(sk, w, h){
    const visited = new Uint8Array(w*h);
    const deg = new Uint8Array(w*h);
    const nodes = [];
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      if (!sk[y*w+x]) continue;
      const d = neighbors(sk,w,h,x,y).length;
      deg[y*w+x] = d;
      if (d!==2) nodes.push([x,y]);
    }
    const polylines = [];

    function walk(sx,sy){
      let cx=sx, cy=sy;
      const pts=[[cx,cy]];
      visited[cy*w+cx]=1;
      while (true){
        const nb = neighbors(sk,w,h,cx,cy).filter(([nx,ny])=> !visited[ny*w+nx]);
        if (nb.length===0) break;
        // preferir continuidad de dirección
        let next = nb[0];
        if (nb.length>1 && pts.length>=2){
          const [px,py]=pts[pts.length-2];
          const dx=cx-px, dy=cy-py;
          nb.sort((a,b)=>{
            const da=(a[0]-cx)*dx+(a[1]-cy)*dy;
            const db=(b[0]-cx)*dx+(b[1]-cy)*dy;
            return db-da;
          });
          next = nb[0];
        }
        cx=next[0]; cy=next[1];
        visited[cy*w+cx]=1;
        pts.push([cx,cy]);
        if (deg[cy*w+cx]!==2) break;
      }
      return pts;
    }

    // desde nodos
    for (const [x,y] of nodes){
      if (visited[y*w+x]) continue;
      // un nodo puede tener varias ramas
      let branchCount = 0;
      while (true){
        const nb = neighbors(sk,w,h,x,y).filter(([nx,ny])=> !visited[ny*w+nx]);
        if (nb.length===0) break;
        const pts = [[x,y]];
        visited[y*w+x]=1;
        let cx=x, cy=y;
        while (true){
          const nn = neighbors(sk,w,h,cx,cy).filter(([nx,ny])=> !visited[ny*w+nx]);
          if (nn.length===0) break;
          let next = nn[0];
          if (nn.length>1 && pts.length>=2){
            const [px,py]=pts[pts.length-2];
            const dx=cx-px, dy=cy-py;
            nn.sort((a,b)=> ((b[0]-cx)*dx+(b[1]-cy)*dy) - ((a[0]-cx)*dx+(a[1]-cy)*dy));
            next = nn[0];
          }
          cx=next[0]; cy=next[1];
          visited[cy*w+cx]=1;
          pts.push([cx,cy]);
          if (deg[cy*w+cx]!==2) break;
        }
        if (pts.length>1) polylines.push(pts);
        branchCount++;
        if (branchCount>8) break;
      }
    }

    // ciclos restantes
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      if (sk[y*w+x] && !visited[y*w+x]){
        const pts = walk(x,y);
        if (pts.length>2) polylines.push(pts);
      }
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

  function pruneShort(polylines, minLen){
    const out=[];
    for (const p of polylines){
      let len=0;
      for (let i=1;i<p.length;i++) len += Math.hypot(p[i][0]-p[i-1][0], p[i][1]-p[i-1][1]);
      if (len>=minLen) out.push(p);
    }
    return out;
  }

  function run(binData, w, h, params){
    const sk = zhangSuen(binData, w, h);
    let polys = skeletonToPolylines(sk, w, h);
    polys = pruneShort(polys, 4);
    const eps = params.simplify ?? 1.2;
    polys = polys.map(p=> rdp(p, eps));
    return polys.map(p=> p.map(([x,y])=>[x,y]));
  }

  return { run };
})();
