(() => {
  const state = {startedAt:new Date().toISOString(), errors:[], requests:[], history:[]};
  window.__carExplorerDiagnostic = state;
  const add = (list, detail) => { list.push({at:Math.round(performance.now()),...detail}); if(list.length>40)list.shift(); };
  const oldError=console.error.bind(console);
  console.error=(...args)=>{add(state.errors,{kind:"console.error",message:args.map(x=>x instanceof Error?(x.stack||x.message):String(x)).join(" | ")});oldError(...args);};
  const oldWarn=console.warn.bind(console);
  console.warn=(...args)=>{add(state.errors,{kind:"console.warn",message:args.map(x=>String(x)).join(" | ")});oldWarn(...args);};
  window.addEventListener("error",e=>add(state.errors,{kind:"window/resource-error",message:e.message||"",file:e.filename||e.target?.src||e.target?.href||"",line:e.lineno||0,stack:e.error?.stack||""}),true);
  window.addEventListener("unhandledrejection",e=>add(state.errors,{kind:"unhandledrejection",message:e.reason?.message||String(e.reason),stack:e.reason?.stack||""}));
  const originalFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const url=typeof args[0]==="string"?args[0]:(args[0]?.url||String(args[0]));
    const started=performance.now();
    try {
      const response=await originalFetch(...args);
      if(/mclaren|challenger|three\.module|GLTFLoader|OrbitControls/i.test(url)){
        const d={url,status:response.status,ok:response.ok,type:response.headers.get("content-type"),encoding:response.headers.get("content-encoding"),length:response.headers.get("content-length"),ms:Math.round(performance.now()-started)};
        try{const b=new Uint8Array(await response.clone().arrayBuffer());d.bytes=b.length;d.magic=[...b.slice(0,8)].map(x=>x.toString(16).padStart(2,"0")).join(" ");d.ascii=String.fromCharCode(...b.slice(0,4));}catch(e){d.readError=String(e);}
        add(state.requests,d);
      }
      return response;
    }catch(e){add(state.requests,{url,error:e?.message||String(e)});throw e;}
  };
  const snapshot=()=>{
    const snap={at:Math.round(performance.now()),loaded:window.__carViewerModelLoaded===true,vehicle:document.getElementById("vehicleName")?.textContent,status:document.getElementById("status")?.textContent,loadTitle:document.getElementById("loadTitle")?.textContent,desc:document.getElementById("vehicleDescription")?.textContent};
    const last=state.history[state.history.length-1];if(!last||JSON.stringify(last)!==JSON.stringify(snap))state.history.push(snap);
  };
  setInterval(()=>{
    snapshot();
    let panel=document.getElementById("car-diagnostic-panel");if(!panel){panel=document.createElement("pre");panel.id="car-diagnostic-panel";document.body.append(panel);}
    panel.dir="ltr";panel.style.cssText="position:fixed;z-index:2147483647;left:6px;bottom:6px;max-width:96vw;max-height:42vh;overflow:auto;background:#090d13f5;color:#e6eef7;border:1px solid #eeb760;padding:9px;white-space:pre-wrap;font:10px/1.45 monospace;direction:ltr";
    panel.textContent=JSON.stringify({state:{loaded:window.__carViewerModelLoaded===true,vehicle:document.getElementById("vehicleName")?.textContent,status:document.getElementById("status")?.textContent},errors:state.errors,requests:state.requests,history:state.history.slice(-12)},null,2);
  },1000);
})();