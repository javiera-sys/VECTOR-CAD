// Worker de vectorización (ejecuta el esqueletizado fuera del hilo principal)
importScripts('centerline.js');
self.onmessage = function(ev){
  const { task, payload } = ev.data;
  try {
    if (task==='centerline'){
      const polys = self.Centerline.run(payload.data, payload.w, payload.h, payload.params);
      self.postMessage({ok:true, polys});
    } else if (task==='ping'){
      self.postMessage({ok:true, pong:true});
    }
  } catch(err){
    self.postMessage({ok:false, error: err.message});
  }
};
