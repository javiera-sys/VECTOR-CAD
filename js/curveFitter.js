// Conversión de polilíneas a líneas + arcos + círculos (módulo NUEVO; no altera los algoritmos de vectorización).
// Método: 1) se remuestrea el contorno cada ~2 px; 2) se detectan ESQUINAS (giro > umbral con ventana de 8 px) y se corta ahí;
// 3) en cada tramo suave se suaviza el ruido de pixelado y se decide, de principio a fin, entre RECTA y ARCO eligiendo en cada paso
// el que cubre más trazo; 4) los extremos de los arcos se proyectan sobre su circunferencia y el vértice compartido se desplaza
// (mismo objeto) para que la unión con la entidad vecina siga siendo exacta.
// Coordenadas de imagen (Y hacia abajo). Arco: centro, radio, a1/a2 (ángulos del inicio/fin) y dir (+1: el ángulo crece de a1 a a2),
// igual que ctx.arc(cx,cy,r,a1,a2,dir<0).
window.CurveFitter = (function(){
  const TAU = Math.PI*2, D2R = Math.PI/180;
  const norm = a => ((a % TAU) + TAU) % TAU;
  const DS = 2, WIN = 8;                      // paso de remuestreo y ventana de esquinas (px)

  // mixed: conservador (las deformaciones pequeñas siguen siendo rectas). curves: convierte todo lo que tenga curvatura.
  // lineTol = desviación máxima (px) para que un tramo siga siendo recta; dev/relDev = error radial máximo de un arco
  // (absoluto, y relativo al radio: un aro de 480 px puede variar ±2 px).
  const CFG = {
    mixed:  {corner:35*D2R, lineTol:1.2, dev:t=>Math.max(1.5,t*1.5), relDev:0.006, minSpan:6*D2R, minSag:1.3, minLen:24, minR:6, edgeSag:2.0},
    curves: {corner:40*D2R, lineTol:0.8, dev:t=>Math.max(1.8,t*1.8), relDev:0.010, minSpan:4*D2R,  minSag:0.9, minLen:10, minR:3, edgeSag:3.0},
  };

  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const same=(a,b)=>Math.abs(a[0]-b[0])<1e-9 && Math.abs(a[1]-b[1])<1e-9;

  function solve3(M,R){
    const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const d=det(M); if (Math.abs(d)<1e-12) return null;
    return [0,1,2].map(c=>det(M.map((row,i)=>row.map((v,j)=>j===c?R[i]:v)))/d);
  }
  // Mínimos cuadrados geométricos (Gauss-Newton) del círculo sobre los puntos.
  function refine(Q, cx, cy, r){
    for (let it=0; it<10; it++){
      let a=0,b=0,c=0,d=0,e=0,f=0,g1=0,g2=0,g3=0;
      for (let i=0;i<Q.length;i++){
        const dx=Q[i][0]-cx, dy=Q[i][1]-cy, ro=Math.hypot(dx,dy); if (ro<1e-9) continue;
        const ux=-dx/ro, uy=-dy/ro, res=ro-r;
        a+=ux*ux; b+=ux*uy; c-=ux; d+=uy*uy; e-=uy; f+=1; g1+=ux*res; g2+=uy*res; g3-=res;
      }
      const s=solve3([[a,b,c],[b,d,e],[c,e,f]],[-g1,-g2,-g3]); if (!s) break;
      cx+=s[0]; cy+=s[1]; r+=s[2];
      if (Math.abs(s[0])+Math.abs(s[1])+Math.abs(s[2])<1e-6) break;
    }
    return {cx,cy,r};
  }
  function circum(A,B,C){
    const sa=A[0]*A[0]+A[1]*A[1], sb=B[0]*B[0]+B[1]*B[1], sc=C[0]*C[0]+C[1]*C[1];
    const D=2*(A[0]*(B[1]-C[1])+B[0]*(C[1]-A[1])+C[0]*(A[1]-B[1])); if (Math.abs(D)<1e-9) return null;
    const cx=(sa*(B[1]-C[1])+sb*(C[1]-A[1])+sc*(A[1]-B[1]))/D, cy=(sa*(C[0]-B[0])+sb*(A[0]-C[0])+sc*(B[0]-A[0]))/D;
    return {cx,cy,r:Math.hypot(A[0]-cx,A[1]-cy)};
  }
  const sub = (Q,k)=>{ if (Q.length<=k) return Q; const o=[], st=Q.length/k; for (let i=0;i<k;i++) o.push(Q[Math.floor(i*st)]); o.push(Q[Q.length-1]); return o; };

  // ¿La secuencia Q es un arco? Devuelve el círculo ajustado o null. Valida error radial, avance angular monótono y sentido único.
  function tryArc(Q, cfg, dev){
    const m=Q.length; if (m<5) return null;
    const A=Q[0], C=Q[m-1], B=Q[m>>1];
    const cr=(B[0]-A[0])*(C[1]-B[1])-(B[1]-A[1])*(C[0]-B[0]); if (Math.abs(cr)<1e-6) return null;
    const dir=cr>0?1:-1, c0=circum(A,B,C); if (!c0 || c0.r>1e5) return null;
    const V=Q.filter(p=>p.o), F=refine(sub(V.length>=4?V:Q,80),c0.cx,c0.cy,c0.r); if (!isFinite(F.r) || F.r<=0 || F.r>1e5) return null;   // radio con los vértices originales (están sobre la curva)
    const {cx,cy,r}=F, devE=Math.max(dev,cfg.relDev*r);
    let dm=0, ss=0; for (let i=0;i<m;i++){ const d=Math.abs(Math.hypot(Q[i][0]-cx,Q[i][1]-cy)-r); if (d>dm) dm=d; ss+=d*d; }
    if (dm>devE || Math.sqrt(ss/m)>devE*0.6) return null;
    let prev=Math.atan2(A[1]-cy,A[0]-cx), cum=0;
    for (let i=1;i<m;i++){
      const ang=Math.atan2(Q[i][1]-cy,Q[i][0]-cx), st=dir>0?norm(ang-prev):norm(prev-ang);
      if (st>50*D2R) return null; cum+=st; prev=ang;
    }
    // Un arco no puede contener un tramo recto largo (p. ej. el lado de un rectángulo redondeado con sus filetes):
    // se comprueba el 60 % inicial y el 60 % final.
    if (m*DS>=40){
      const straight=(i0,i1)=>{ const P0=Q[i0], P1=Q[i1], L=dist(P0,P1); if (L<40) return false;
        for (let i=i0+1;i<i1;i++) if (Math.abs((P1[0]-P0[0])*(P0[1]-Q[i][1])-(P0[0]-Q[i][0])*(P1[1]-P0[1]))/L>cfg.lineTol*0.5) return false; return true; };
      const k=Math.floor((m-1)*0.6); if (straight(0,k) || straight(m-1-k,m-1)) return null;
    }
    const span=cum, sag=r*(1-Math.cos(Math.min(span,Math.PI)/2));
    // Flecha de cada tramo original: L²/(8r) debe ser pequeña. Un lado recto largo (o un chaflán entre dos esquinas)
    // dentro de un arco la excede; las cuerdas de una curva suave no.
    { let prevV=null;
      for (const p of Q){ if (!p.o) continue; if (prevV && dist(prevV,p)**2/(8*r)>cfg.edgeSag) return null; prevV=p; }
      if (prevV && prevV!==Q[m-1] && dist(prevV,Q[m-1])**2/(8*r)>cfg.edgeSag) return null; }
    return {cx,cy,r,dir,span,sag,ok: span>=cfg.minSpan && sag>=cfg.minSag && r>=cfg.minR && r*span>=cfg.minLen};
  }

  // Círculo completo (polilínea cerrada): Kåsa + refinamiento; todo el trazo remuestreado debe estar sobre la circunferencia.
  function fitCircle(Q, cfg, dev){
    const n=Q.length; if (n<12) return null;
    let mx=0,my=0; for (const p of Q){ mx+=p[0]; my+=p[1]; } mx/=n; my/=n;
    let sx=0,sy=0,sxx=0,syy=0,sxy=0,sz=0,sxz=0,syz=0;
    for (const p of Q){ const x=p[0]-mx, y=p[1]-my, z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; sxz+=x*z; syz+=y*z; }
    const s=solve3([[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]],[-sxz,-syz,-sz]); if (!s) return null;
    const lx=-s[0]/2, ly=-s[1]/2, r2=lx*lx+ly*ly-s[2]; if (r2<=0) return null;
    const F=refine(sub(Q,120),lx+mx,ly+my,Math.sqrt(r2)); const {cx,cy,r}=F;
    if (!isFinite(r) || r<cfg.minR || TAU*r<cfg.minLen) return null;
    const devE=Math.max(dev,cfg.relDev*r); let dm=0, ss=0;
    for (const p of Q){ const d=Math.abs(Math.hypot(p[0]-cx,p[1]-cy)-r); if (d>dm) dm=d; ss+=d*d; }
    if (dm>devE || Math.sqrt(ss/n)>devE*0.6) return null;
    let area=0; for (let i=0;i<n;i++){ const q=Q[(i+1)%n]; area+=Q[i][0]*q[1]-q[0]*Q[i][1]; }
    const dir=area>0?1:-1; let prev=Math.atan2(Q[0][1]-cy,Q[0][0]-cx), cum=0;
    for (let i=1;i<=n;i++){ const p=Q[i%n], a=Math.atan2(p[1]-cy,p[0]-cx), st=dir>0?norm(a-prev):norm(prev-a); if (st>50*D2R) return null; cum+=st; prev=a; }
    return Math.abs(cum-TAU)<0.15 ? {cx,cy,r} : null;
  }

  // Esquinas sobre los vértices originales: giro entre las direcciones medidas a ≥ WIN px antes y después.
  function cornerFlags(P, closed, ang){
    const n=P.length, c=new Array(n).fill(false), at=i=>P[((i%n)+n)%n];
    for (let i=0;i<n;i++){
      if (!closed && (i===0 || i===n-1)) continue;
      let a=i-1, k=0; while (k<n && dist(P[i],at(a))<WIN && (closed || a>0)){ a--; k++; }
      let b=i+1; k=0; while (k<n && dist(P[i],at(b))<WIN && (closed || b<n-1)){ b++; k++; }
      const A=at(a), B=at(b); if (same(A,P[i]) || same(B,P[i])) continue;
      const u=Math.atan2(P[i][1]-A[1],P[i][0]-A[0]), v=Math.atan2(B[1]-P[i][1],B[0]-P[i][0]);
      c[i]=Math.abs(norm(v-u+Math.PI)-Math.PI)>ang;
    }
    return c;
  }

  // Remuestreo cada ~DS px conservando todos los vértices originales. flag[j]=true si Q[j] es esquina.
  function resample(P, closed, cor){
    const n=P.length, Q=[], F=[], m=closed?n:n-1;
    for (let i=0;i<m;i++){
      const a=P[i], b=P[(i+1)%n], k=Math.max(1,Math.ceil(dist(a,b)/DS));
      for (let j=0;j<k;j++){ const q=j?[a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k]:[a[0],a[1]]; if (!j) q.o=1; Q.push(q); F.push(j===0&&cor[i]); }
    }
    if (!closed){ Q.push([P[n-1][0],P[n-1][1]]); F.push(false); }
    return {Q,F};
  }

  function smooth(Q){            // [1,2,1]/4 ×2: quita el ruido de pixelado; los extremos (esquinas/uniones) no se mueven
    for (let it=0; it<2; it++){
      const o=Q.map(p=>[p[0],p[1]]);
      for (let i=1;i<Q.length-1;i++){ Q[i][0]=(o[i-1][0]+2*o[i][0]+o[i+1][0])/4; Q[i][1]=(o[i-1][1]+2*o[i][1]+o[i+1][1])/4; }
    }
  }

  function lineEnd(Q, s, tol){   // último índice e tal que todos los puntos s..e están a ≤ tol de la cuerda s–e
    let best=s+1;
    for (let e=s+2;e<Q.length;e++){
      const A=Q[s], B=Q[e], L=dist(A,B); let ok=L>1e-9;
      for (let i=s+1;ok && i<e;i++) if (Math.abs((B[0]-A[0])*(A[1]-Q[i][1])-(A[0]-Q[i][0])*(B[1]-A[1]))/L>tol) ok=false;
      if (ok) best=e; else if (e-best>3) break;
    }
    return best;
  }

  function arcEnd(Q, s, cfg, dev){   // arco válido más largo que empieza en s (búsqueda exponencial + bisección)
    const n=Q.length; let lo=-1, lof=null, step=8, e=Math.min(s+8,n-1);
    while (e<=n-1){
      const f=tryArc(Q.slice(s,e+1),cfg,dev);
      if (!f) break; lo=e; lof=f; if (e===n-1) break; step*=2; e=Math.min(e+step,n-1);
    }
    if (lo<0){ // no vale ni a 8 puntos: probar tramos más cortos
      for (let k=5;k<8 && s+k<n;k++){ const f=tryArc(Q.slice(s,s+k+1),cfg,dev); if (f){ lo=s+k; lof=f; } }
      if (lo<0) return null;
    }
    let hi=Math.min(e,n-1);
    if (hi>lo){ let a=lo, b=hi; while (b-a>1){ const mid=(a+b)>>1, f=tryArc(Q.slice(s,mid+1),cfg,dev); if (f){ a=mid; lof=f; } else b=mid; } lo=a; }
    return lof && lof.ok ? {e:lo,f:lof} : null;
  }

  // Recorte: se ajusta la parte central del arco y se descartan los extremos que se separan de esa circunferencia
  // (suelen ser tramos rectos tangentes absorbidos); después se reajusta con los puntos que quedan.
  function trimArc(Q, s, e, f, cfg, dev){
    const m=e-s+1, a=s+Math.floor(m*0.15), b=e-Math.floor(m*0.15);
    if (b-a<4) return {s,e,f};
    const c0=circum(Q[a],Q[(a+b)>>1],Q[b]); if (!c0 || c0.r>1e5) return {s,e,f};
    const F=refine(sub(Q.slice(a,b+1),60),c0.cx,c0.cy,c0.r); if (!isFinite(F.r) || F.r<=0) return {s,e,f};
    const tight=Math.max(0.6, 0.45*Math.max(dev,cfg.relDev*F.r)), d=i=>Math.abs(Math.hypot(Q[i][0]-F.cx,Q[i][1]-F.cy)-F.r);
    let s2=s, e2=e; while (s2<a && d(s2)>tight) s2++; while (e2>b && d(e2)>tight) e2--;
    if (s2===s && e2===e) return {s,e,f};
    const f2=tryArc(Q.slice(s2,e2+1),cfg,dev);
    return f2 && f2.ok ? {s:s2,e:e2,f:f2} : {s,e,f};
  }

  // Un tramo suave (sin esquinas): recta o arco, siempre el que cubre más trazo desde el punto actual.
  function fitPiece(Q, cfg, dev){
    smooth(Q);
    const n=Q.length, cum=[0]; for (let i=1;i<n;i++) cum.push(cum[i-1]+dist(Q[i-1],Q[i]));
    const segs=[]; let s=0;
    while (s<n-1){
      const eL=lineEnd(Q,s,cfg.lineTol), A=arcEnd(Q,s,cfg,dev);
      const lenL=cum[eL]-cum[s], lenA=A?cum[A.e]-cum[s]:0;
      if (A && (lenA>lenL*1.15+4 || (A.e===n-1 && A.e>eL))){   // el arco cubre más, o cubre todo lo que queda y la recta no
        const T=trimArc(Q,s,A.e,A.f,cfg,dev), f=T.f;
        if (T.s>s) segs.push({k:'l',a:Q[s],b:Q[T.s]});                 // la parte recta absorbida se queda como línea
        s=T.s; A.e=T.e;
        const pj=p=>{ const dx=p[0]-f.cx, dy=p[1]-f.cy, ro=Math.hypot(dx,dy)||1; return [f.cx+dx/ro*f.r, f.cy+dy/ro*f.r]; };
        const S=pj(Q[s]), E=pj(Q[A.e]); Q[s][0]=S[0]; Q[s][1]=S[1]; Q[A.e][0]=E[0]; Q[A.e][1]=E[1];  // vértices compartidos
        segs.push({k:'a',a:Q[s],b:Q[A.e],f}); s=A.e;
      } else { segs.push({k:'l',a:Q[s],b:Q[eL]}); s=eL; }
    }
    return segs;
  }

  function convertOne(e, cfg, dev){
    let pts=e.points, closed=!!e.closed;
    if (!closed && pts.length>3 && same(pts[0],pts[pts.length-1])){ pts=pts.slice(0,-1); closed=true; }   // lazo de CENTERLINE
    const cor=cornerFlags(pts,closed,cfg.corner);
    const {Q,F}=resample(pts,closed,cor);
    if (closed){ const c=fitCircle(Q,cfg,dev); if (c) return [{type:'circle',cx:c.cx,cy:c.cy,r:c.r,layer:e.layer}]; }
    // secuencia abierta con esquinas como anclas
    let seq=Q, flg=F;
    if (closed){
      let k=F.indexOf(true);
      if (k<0){ // lazo suave: empezar en el punto de mayor giro
        let mt=-1; k=0; const n=Q.length;
        for (let i=0;i<n;i++){ const a=Q[(i-3+n)%n], b=Q[i], c=Q[(i+3)%n]; const t=Math.abs(norm(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI)-Math.PI); if (t>mt){ mt=t; k=i; } }
      }
      seq=Q.slice(k).concat(Q.slice(0,k)); flg=F.slice(k).concat(F.slice(0,k)); seq.push(seq[0]); flg.push(true);
    }
    const segs=[]; let s=0;
    for (let i=1;i<seq.length;i++){
      if (flg[i] || i===seq.length-1){ if (i>s) segs.push(...fitPiece(seq.slice(s,i+1),cfg,dev)); s=i; }
    }
    if (!segs.some(x=>x.k==='a')) return null;                         // sin curvas: se deja la entidad original
    const out=[]; let cur=null;
    const flush=()=>{ if (cur && cur.length>1) out.push({type:'polyline',points:cur.map(p=>[p[0],p[1]]),closed:false,layer:e.layer}); cur=null; };
    for (const g of segs){
      if (g.k==='l'){ if (cur && cur[cur.length-1]===g.a) cur.push(g.b); else { flush(); cur=[g.a,g.b]; } }
      else { flush(); const f=g.f;
        out.push({type:'arc',cx:f.cx,cy:f.cy,r:f.r,a1:Math.atan2(g.a[1]-f.cy,g.a[0]-f.cx),a2:Math.atan2(g.b[1]-f.cy,g.b[0]-f.cx),
                  dir:f.dir,sx:g.a[0],sy:g.a[1],ex:g.b[0],ey:g.b[1],layer:e.layer}); }
    }
    flush(); return out;
  }

  // entities -> entities con 'arc' y 'circle'. opts: {mode:'mixed'|'curves', tol, angTol, merge}
  function convert(entities, opts){
    const cfg=CFG[opts.mode];
    if (!cfg) return {entities, arcos:0, circulos:0, removed:0};
    const dev=cfg.dev(opts.tol ?? 1), out=[]; let arcos=0, circulos=0;
    for (const e of entities){
      if (e.type!=='polyline' || e.points.length<3){ out.push(e); continue; }
      const r=convertOne(e,cfg,dev);
      if (!r){ out.push(e); continue; }
      for (const x of r){ out.push(x); if (x.type==='arc') arcos++; else if (x.type==='circle') circulos++; }
    }
    let removed=0;                                                       // unificar colineales solo en tramos rectos
    if (opts.merge && window.GeometryCleaner){
      for (let i=0;i<out.length;i++){
        const e=out[i]; if (e.type!=='polyline') continue;
        const src=e.closed && e.points.length>2 ? e.points.concat([e.points[0]]) : e.points;
        let q=window.GeometryCleaner.mergeCollinear([src], opts.angTol ?? 3)[0];
        if (e.closed && q.length>3 && same(q[0],q[q.length-1])) q=q.slice(0,-1);
        removed+=Math.max(0,e.points.length-q.length); out[i]={...e,points:q};
      }
    }
    return {entities:out, arcos, circulos, removed};
  }

  return { convert, CFG, _t:{tryArc,lineEnd,arcEnd,resample,cornerFlags,smooth} };
})();
