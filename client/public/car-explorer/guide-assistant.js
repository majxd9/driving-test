(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const root = $("guideAssistant"), toggle = $("guideAssistantToggle");
  const suggestion = $("guideAssistantSuggestion");
  const caption = toggle?.querySelector(".guide-robot-caption");
  if (!root || !toggle) return;
  try {
    const saved = sessionStorage.getItem("drv_session");
    const session = saved ? JSON.parse(saved) : null;
    if (session?.role === "Admin" || session?.role === "admin") return;
  } catch { /* A missing session is not an admin session. */ }
  root.hidden = false;
  if (suggestion) suggestion.hidden = false;
  window.setTimeout(() => { if (suggestion) suggestion.hidden = true; }, 4500);

  const pageText = "اسحب السيارة لتدويرها، وكبّر لرؤية التفاصيل، واختر قطعة لمعرفة اسمها ومكانها.";
  let speaking = false, activeAudio = null, dragging = null, suppressClick = false;

  function setSpeaking(value) {
    speaking = value;
    if (caption) caption.textContent = value ? "عم يحكي" : "زيب";
    toggle.setAttribute("aria-label", value ? "زيب يتحدث. اضغط لإيقاف الصوت." : "زيب، اضغط لسماع شرح الصفحة أو اضغط مطولاً لتحريكه.");
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const audio = activeAudio;
    activeAudio = null;
    if (audio) {
      audio.onended = null; audio.onerror = null; audio.onplay = null;
      audio.pause(); audio.removeAttribute("src"); audio.load();
    }
    setSpeaking(false);
  }

  const clamp = p => ({
    x: Math.max(8, Math.min(Math.max(8, window.innerWidth - 100), p.x)),
    y: Math.max(8, Math.min(Math.max(8, window.innerHeight - 112), p.y))
  });
  function positionWidget(point) {
    root.style.left = point.x + "px"; root.style.top = point.y + "px"; root.style.bottom = "auto";
    if (suggestion) {
      const width = Math.min(248, window.innerWidth - 22);
      const left = point.x + 100 + width + 10 <= window.innerWidth ? point.x + 110 : Math.max(11, point.x - width - 10);
      suggestion.style.left = left + "px";
      suggestion.style.top = Math.max(11, Math.min(point.y + 8, window.innerHeight - 90)) + "px";
      suggestion.style.width = width + "px";
    }
  }
  let position = { x: 20, y: window.innerHeight - 112 };
  try {
    const saved = localStorage.getItem("rukhsati-floating-robot-position");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) position = { x: parsed.x, y: parsed.y };
    }
  } catch {}
  position = clamp(position); positionWidget(position);

  function speakWithDeviceVoice() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(pageText);
    utterance.lang = "ar-SA"; utterance.rate = .97; utterance.pitch = 1;
    const voice = window.speechSynthesis.getVoices().find(item => /^ar([_-]|$)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function speakOnRobotClick() {
    if (speaking || activeAudio || ("speechSynthesis" in window && window.speechSynthesis.speaking)) {
      stopSpeech();
      return;
    }
    const apiBase = document.querySelector("meta[name=\"api-base-url\"]")?.content || "";
    if (!apiBase) { speakWithDeviceVoice(); return; }
    const audio = new Audio(apiBase.replace(/\/+$/, "") + "/api/questions/audio-prompt/site-assistant-car");
    audio.preload = "auto";
    activeAudio = audio;
    setSpeaking(true);
    let usedFallback = false;
    const fallback = () => {
      if (usedFallback || activeAudio !== audio) return;
      usedFallback = true;
      audio.onended = null; audio.onerror = null; audio.onplay = null;
      audio.pause(); audio.removeAttribute("src"); audio.load();
      activeAudio = null;
      setSpeaking(false);
      speakWithDeviceVoice();
    };
    audio.onplay = () => { if (activeAudio === audio) setSpeaking(true); };
    audio.onended = () => { if (activeAudio === audio) { activeAudio = null; setSpeaking(false); } };
    audio.onerror = fallback;
    void audio.play().catch(fallback);
  }

  window.addEventListener("pagehide", stopSpeech, { once: true });
  toggle.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const id = event.pointerId, target = toggle;
    const item = { id, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, moved: false, dragging: false, timer: 0 };
    item.timer = window.setTimeout(() => {
      if (dragging !== item) return;
      item.dragging = true; item.moved = true;
      if (suggestion) suggestion.hidden = true;
      try { target.setPointerCapture(id); } catch {}
    }, 450);
    dragging = item;
    try { target.setPointerCapture(id); } catch {}
  });
  toggle.addEventListener("pointermove", event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.startX, dy = event.clientY - dragging.startY;
    if (!dragging.dragging) {
      if (Math.hypot(dx, dy) > 12) { clearTimeout(dragging.timer); dragging.moved = true; }
      return;
    }
    position = clamp({ x: dragging.x + dx, y: dragging.y + dy });
    positionWidget(position); event.preventDefault();
  });
  const finishDrag = event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const item = dragging; dragging = null; clearTimeout(item.timer);
    if (item.moved) {
      suppressClick = true;
      try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
      window.setTimeout(() => { suppressClick = false; }, 320);
    }
    try { if (toggle.hasPointerCapture(event.pointerId)) toggle.releasePointerCapture(event.pointerId); } catch {}
  };
  toggle.addEventListener("pointerup", finishDrag);
  toggle.addEventListener("pointercancel", finishDrag);
  toggle.addEventListener("click", event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; return; }
    speakOnRobotClick();
  });
  document.addEventListener("keydown", event => {
    const delta = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] }[event.key];
    if (delta && document.activeElement === toggle) {
      event.preventDefault();
      position = clamp({ x: position.x + delta[0] * (event.shiftKey ? 2 : 1), y: position.y + delta[1] * (event.shiftKey ? 2 : 1) });
      positionWidget(position);
      try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
    }
  });
  window.addEventListener("resize", () => { position = clamp(position); positionWidget(position); }, { passive: true });
  if (caption) caption.textContent = "زيب";
  root.dataset.initialized = "true";
})();