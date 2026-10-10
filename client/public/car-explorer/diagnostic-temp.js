(() => {
  const timer = window.setInterval(() => {
    if (typeof window.__carViewerDebug !== "function") return;
    let state;
    try { state = window.__carViewerDebug(); } catch (error) { state = {error: String(error)}; }
    if (!state.loaded) return;
    let output = document.getElementById("car-preview-diagnostic");
    if (!output) {
      output = document.createElement("pre");
      output.id = "car-preview-diagnostic";
      output.dir = "ltr";
      output.style.cssText = "position:fixed;z-index:2147483647;left:4px;bottom:4px;max-width:48vw;max-height:38vh;overflow:auto;background:#090d13f5;color:#e6eef7;border:1px solid #eeb760;padding:6px;white-space:pre-wrap;font:9px/1.4 monospace";
      document.body.append(output);
    }
    output.textContent = JSON.stringify(state);
    window.clearInterval(timer);
  }, 500);
})();