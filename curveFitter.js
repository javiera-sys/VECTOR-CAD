// Ajuste de arcos y círculos sobre polilíneas ya vectorizadas (módulo NUEVO, no altera los algoritmos existentes).
// Convención: coordenadas de imagen (Y hacia abajo). Arco = centro, radio, a1 (ángulo del inicio), a2 (ángulo del fin)
// y dir (+1: el ángulo crece de a1 a a2; -1: decrece), igual que ctx.arc(cx,cy,r,a1,a2,dir<0).
window.CurveFitter = (function(){
  const TAU = Math.PI*2, D2R = Math.PI/180;
  const norm = a => ((a % TAU) + TAU) % TAU;

  // mixed: conservador (no confunde esquinas, chaflanes ni líneas cortas con curvas).
  // curves: más sensible (arcos más pequeños, flecha mínima menor y más desviación admitida).
  // dev = desviación radial máxima admitida (px) sobre TODO el trazo; el contorno pixelado de OpenCV ya trae ~±1 px.
  const CFG = {
    mixed:  {minPts:4, minSpan:25*D2R, minSag:2.0, minR:6, minLen:30, maxShare:0.55, maxStep:90*D2R, edgeSag:1.6, rms:0.55, dev:t=>Math.max(1.6, t*1.6)},
    curves: {minPts:5, minSpan:12*D2R, minSag:2.0, minR:4, minLen:20, maxShare:0.7, maxStep:90*D2R, edgeSag:2.5, rms:0.60, dev:t=>Math.max(2.2, t*2.2)},
  };

  // Muestrea la polilínea cada ~2 px (incluye los vértices): el ajuste se evalúa sobre el trazo completo,
  // de modo que un lado recto largo o una esquina nunca pasan por arco aunque sus vértices estén sobre la circunferencia.
  function dense(P, closed){
    const Q=[], n=P.length, m=closed?n:n-1;
    for (let i=0;i<m;i++){
      const a=P[i], b=P[(i+1)%n], k=Math.max(1, Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));
      for (let j=0;j<k;j++) Q.push([a[0]+(b[0]-a[0])*j/k, a[1]+(b[1]-a[1])*j/k]);
    }
    if (!closed) Q.push(P[n-1]);
    return Q;
  }

  // Avance angular monótono alrededor del centro (sin retrocesos ni saltos grandes).
  function walk(Q, cx, cy, r, dir, cfg, startAng){
    let prev=startAng, cum=0;
    for (let i=1;i<Q.length;i++){
      const ang=Math.atan2(Q[i][1]-cy, Q[i][0]-cx);
      const st = dir>0 ? norm(ang-prev) : norm(prev-ang);
      // paso angular acotado y flecha de cada tramo acotada: un lado recto largo nunca se toma por arco
      if (st>cfg.maxStep || r*(1-Math.cos(st/2))>cfg.edgeSag) return -1;
      cum+=st; prev=ang;
    }
    return cum;
  }

  // Refinamiento por mínimos cuadrados geométricos (Gauss-Newton) del círculo (cx,cy,r) sobre los puntos Q.
  function refine(Q, cx, cy, r){
    for (let it=0; it<8; it++){
      let a=0,b=0,c=0,d=0,e=0,f=0,g1=0,g2=0,g3=0;
      for (let i=0;i<Q.length;i+=1){
        const dx=Q[i][0]-cx, dy=Q[i][1]-cy, ro=Math.hypot(dx,dy); if (ro<1e-9) continue;
        const ux=-dx/ro, uy=-dy/ro, res=ro-r;            // fila del jacobiano: [ux, uy, -1]
        a+=ux*ux; b+=ux*uy; c+=-ux; d+=uy*uy; e+=-uy; f+=1; g1+=ux*res; g2+=uy*res; g3+=-res;
      }
      const sol=solve3([[a,b,c],[b,d,e],[c,e,f]],[-g1,-g2,-g3]); if (!sol) break;
      cx+=sol[0]; cy+=sol[1]; r+=sol[2];
      if (Math.abs(sol[0])+Math.abs(sol[1])+Math.abs(sol[2])<1e-6) break;
    }
    return {cx,cy,r};
  }

  // Arco ajustado a todo el trazo (mínimos cuadrados). Los extremos se proyectan sobre la circunferencia y,
  // en segment(), se mueven también los vértices compartidos con las entidades vecinas: la unión sigue siendo exacta.
  // Punto de partida: circunferencia por el primer vértice, un punto central y el último.
  //  (ver fitArc)
  // Arco que pasa EXACTAMENTE por el primer y el último vértice (las uniones con las entidades vecinas no se desplazan);
  // el centro se busca sobre la mediatriz minimizando el error radial de todo el trazo.
  function fitArc(P, cfg, dev){
    if (P.length<cfg.minPts) return null;
    const Q=P, n=P.length;   // se trabaja con los vértices (ya están sobre la curva real)
    const A=Q[0], C=Q[n-1], B=Q[n>>1];
    const cr=(B[0]-A[0])*(C[1]-B[1])-(B[1]-A[1])*(C[0]-B[0]);
    const dx=C[0]-A[0], dy=C[1]-A[1], L=Math.hypot(dx,dy);
    if (Math.abs(cr)<1e-6 || L<1e-9) return null;
    const dir=cr>0?1:-1;
    const mx=(A[0]+C[0])/2, my=(A[1]+C[1])/2, nx=-dy/L, ny=dx/L, h=L/2;
    const sa=A[0]*A[0]+A[1]*A[1], sb=B[0]*B[0]+B[1]*B[1], sc=C[0]*C[0]+C[1]*C[1];
    const Dd=2*(A[0]*(B[1]-C[1])+B[0]*(C[1]-A[1])+C[0]*(A[1]-B[1]));
    const ux=(sa*(B[1]-C[1])+sb*(C[1]-A[1])+sc*(A[1]-B[1]))/Dd;
    const uy=(sa*(C[0]-B[0])+sb*(A[0]-C[0])+sc*(B[0]-A[0]))/Dd;
    const t0=(ux-mx)*nx+(uy-my)*ny;
    // centro y radio se estiman con los VÉRTICES (están sobre la curva real); el muestreo denso Q solo valida el ajuste
    const cost=t=>{ const cx=mx+t*nx, cy=my+t*ny, r=Math.sqrt(h*h+t*t); let s=0;
      for (let i=1;i<P.length-1;i++){ const d=Math.hypot(P[i][0]-cx,P[i][1]-cy)-r; s+=d*d; } return s; };
    const R=Math.max(Math.abs(t0)*0.5,h);
    let lo=t0-R, hi=t0+R; const g=0.6180339887;
    let x1=hi-g*(hi-lo), x2=lo+g*(hi-lo), f1=cost(x1), f2=cost(x2);
    for (let k=0;k<30;k++){
      if (f1<f2){ hi=x2; x2=x1; f2=f1; x1=hi-g*(hi-lo); f1=cost(x1); }
      else      { lo=x1; x1=x2; f1=f2; x2=lo+g*(hi-lo); f2=cost(x2); }
    }
    const t=(lo+hi)/2;
    let cx=mx+t*nx, cy=my+t*ny, r=Math.sqrt(h*h+t*t);
    const F=refine(P,cx,cy,r);                          // ajuste libre sobre los vértices
    if (isFinite(F.r) && F.r>0 && F.r<1e6){ cx=F.cx; cy=F.cy; r=F.r; }
    let dm=0, ss=0;
    for (let i=1;i<n-1;i++){ const d=Math.abs(Math.hypot(Q[i][0]-cx,Q[i][1]-cy)-r); if (d>dm) dm=d; ss+=d*d; }
    if (dm>dev || Math.sqrt(ss/Math.max(1,n-2))>dev*cfg.rms) return null;
    // extremos proyectados sobre la circunferencia
    const pj=(p)=>{ const dx=p[0]-cx, dy=p[1]-cy, ro=Math.hypot(dx,dy)||1; return [cx+dx/ro*r, cy+dy/ro*r]; };
    const S=pj(A), E=pj(C);
    const a1=Math.atan2(S[1]-cy,S[0]-cx), a2=Math.atan2(E[1]-cy,E[0]-cx);
    const span=dir>0?norm(a2-a1):norm(a1-a2);
    const cum=walk(P.slice(0,1).concat(P.slice(1,-1),[[E[0],E[1]]]),cx,cy,r,dir,cfg,a1);
    if (cum<0 || Math.abs(cum-span)>0.05) return null;
    // El giro no debe concentrarse en un único vértice: un codo no es una curva (el ruido de pixelado puede invertir tramos sueltos).
    const nt=P.length-2;
    if (nt>=3){
      let sum=0, tmx=0;
      for (let i=1;i<P.length-1;i++){
        const u=Math.atan2(P[i][1]-P[i-1][1],P[i][0]-P[i-1][0]), v=Math.atan2(P[i+1][1]-P[i][1],P[i+1][0]-P[i][0]);
        const t=(norm(v-u+Math.PI)-Math.PI)*dir;
        const tt=Math.max(t,0); sum+=tt; if (tt>tmx) tmx=tt;
      }
      if (sum<=0 || tmx>cfg.maxShare*sum) return null;   // un solo vértice concentra el giro = codo
    }
    const sag=r*(1-Math.cos(Math.min(span,Math.PI)/2));
    // ok = geometría válida Y suficientemente curva/grande (ángulo, flecha, radio y longitud mínimos) para no confundir
    // líneas cortas, esquinas o ruido de pixelado con arcos
    return {cx,cy,r,a1,a2,dir,span,sx:S[0],sy:S[1],ex:E[0],ey:E[1], ok: span>=cfg.minSpan && sag>=cfg.minSag && r>=cfg.minR && r*span>=cfg.minLen};
  }

  function solve3(M,R){
    const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const d=det(M); if (Math.abs(d)<1e-9) return null;
    return [0,1,2].map(c=>det(M.map((row,i)=>row.map((v,j)=>j===c?R[i]:v)))/d);
  }

  // Polilínea cerrada que es una circunferencia completa (mínimos cuadrados, Kåsa, sobre el trazo muestreado).
  function fitCircle(P, cfg, dev){
    if (P.length<8) return null;
    const Q=P, n=P.length, m=P.length;
    let mx=0,my=0; for (const p of P){ mx+=p[0]; my+=p[1]; } mx/=m; my/=m;
    let sx=0,sy=0,sxx=0,syy=0,sxy=0,sz=0,sxz=0,syz=0;
    for (const p of P){ const x=p[0]-mx, y=p[1]-my, z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; sxz+=x*z; syz+=y*z; }
    const s=solve3([[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,m]],[-sxz,-syz,-sz]); if (!s) return null;
    const lx=-s[0]/2, ly=-s[1]/2, r2=lx*lx+ly*ly-s[2]; if (r2<=0) return null;
    let r=Math.sqrt(r2), cx=lx+mx, cy=ly+my;
    { const F=refine(P,cx,cy,r); if (isFinite(F.r) && F.r>0 && F.r<1e6){ cx=F.cx; cy=F.cy; r=F.r; } }
    if (r<cfg.minR || TAU*r<cfg.minLen) return null;   // círculos diminutos = ruido de pixelado, no se convierten
    let dm=0, ss=0;
    for (const p of Q){ const d=Math.abs(Math.hypot(p[0]-cx,p[1]-cy)-r); if (d>dm) dm=d; ss+=d*d; }
    if (dm>dev || Math.sqrt(ss/n)>dev*cfg.rms) return null;
    let area=0; for (let i=0;i<n;i++){ const q=Q[(i+1)%n]; area+=Q[i][0]*q[1]-q[0]*Q[i][1]; }
    const dir=area>0?1:-1;
    const cum=walk(P.concat([P[0]]),cx,cy,r,dir,cfg,Math.atan2(P[0][1]-cy,P[0][0]-cx));
    if (cum<0 || Math.abs(cum-TAU)>0.1) return null;
    return {cx,cy,r};
  }

  const turn = (a,b,c)=>{ const t=Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]); return Math.abs(norm(t+Math.PI)-Math.PI); };

  // Reparte la secuencia en tramos rectos y arcos: arco más largo posible desde cada punto; si no hay, avanza como recta.
  function segment(P, cfg, dev){
    const segs=[], n=P.length; let cur=null, s=0;
    while (s<n-1){
      let best=null, be=-1, fail=0;
      for (let e=s+cfg.minPts-1;e<n;e++){
        const f=fitArc(P.slice(s,e+1),cfg,dev);
        if (!f){ if (++fail>=2) break; continue; }
        fail=0; if (f.ok){ best=f; be=e; }
      }
      if (best){
        if (cur){ segs.push({k:'l',pts:cur}); cur=null; }
        const pts=P.slice(s,be+1);
        // el primer/último vértice son compartidos con los tramos vecinos: se desplazan a la circunferencia (mismo array)
        pts[0][0]=best.sx; pts[0][1]=best.sy; pts[pts.length-1][0]=best.ex; pts[pts.length-1][1]=best.ey;
        segs.push({k:'a',pts,f:best}); s=be;
      }
      else { if (!cur) cur=[P[s]]; cur.push(P[s+1]); s++; }
    }
    if (cur) segs.push({k:'l',pts:cur});
    return segs;
  }

  const same=(a,b)=>Math.abs(a[0]-b[0])<1e-9 && Math.abs(a[1]-b[1])<1e-9;

  // entities -> entities con 'arc' y 'circle'. opts: {mode:'mixed'|'curves', tol, angTol, merge}
  function convert(entities, opts){
    const cfg=CFG[opts.mode];
    if (!cfg) return {entities, arcos:0, circulos:0, removed:0};
    const dev=cfg.dev(opts.tol ?? 1), out=[]; let arcos=0, circulos=0;
    for (const e of entities){
      if (e.type!=='polyline' || e.points.length<3){ out.push(e); continue; }
      let pts=e.points, closed=!!e.closed;
      if (!closed && pts.length>3 && same(pts[0],pts[pts.length-1])){ pts=pts.slice(0,-1); closed=true; } // lazo de CENTERLINE
      if (closed){
        const c=fitCircle(pts,cfg,dev);
        if (c){ out.push({type:'circle',cx:c.cx,cy:c.cy,r:c.r,layer:e.layer}); circulos++; continue; }
      }
      let P=pts;
      if (closed){ // empezar en la esquina más marcada para no partir un arco por la mitad
        const n=P.length; let k=0, mt=-1;
        for (let i=0;i<n;i++){ const t=turn(P[(i-1+n)%n],P[i],P[(i+1)%n]); if (t>mt){ mt=t; k=i; } }
        P=P.slice(k).concat(P.slice(0,k+1));
      }
      let segs=segment(P,cfg,dev);
      if (closed && segs.length>1){
        // 2.ª pasada: reiniciar en una frontera entre tramos para que ningún arco quede partido por el punto de inicio
        const base=P.slice(0,-1), idx=segs[0].pts.length-1;
        P=base.slice(idx).concat(base.slice(0,idx+1));
        segs=segment(P,cfg,dev);
      }
      if (closed && segs.length>1 && segs[0].k==='a' && segs[segs.length-1].k==='a'){
        const J=segs[segs.length-1].pts.concat(segs[0].pts.slice(1)), f=fitArc(J,cfg,dev);
        if (f && f.ok){ segs[0]={k:'a',pts:J,f}; segs.pop(); }
      }
      if (!segs.some(s=>s.k==='a')){ out.push(e); continue; }
      for (const s of segs){
        if (s.k==='a'){ const f=s.f, A=s.pts[0], E=s.pts[s.pts.length-1]; // extremos = vértices compartidos (ya desplazados)
          out.push({type:'arc',cx:f.cx,cy:f.cy,r:f.r,a1:Math.atan2(A[1]-f.cy,A[0]-f.cx),a2:Math.atan2(E[1]-f.cy,E[0]-f.cx),
                    dir:f.dir,sx:A[0],sy:A[1],ex:E[0],ey:E[1],layer:e.layer}); arcos++; }
        else out.push({type:'polyline',points:s.pts,closed:false,layer:e.layer});
      }
    }
    // Unificar colineales solo en los tramos rectos (respeta el checkbox)
    let removed=0;
    if (opts.merge && window.GeometryCleaner){
      for (let i=0;i<out.length;i++){
        const e=out[i]; if (e.type!=='polyline') continue;
        const src = e.closed && e.points.length>2 ? e.points.concat([e.points[0]]) : e.points;
        let q = window.GeometryCleaner.mergeCollinear([src], opts.angTol ?? 3)[0];
        if (e.closed && q.length>3 && same(q[0],q[q.length-1])) q=q.slice(0,-1);
        removed += Math.max(0, e.points.length-q.length);
        out[i]={...e, points:q};
      }
    }
    return {entities:out, arcos, circulos, removed};
  }

  return { convert, fitArc, fitCircle };
})();
