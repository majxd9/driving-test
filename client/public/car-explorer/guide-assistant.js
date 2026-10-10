(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const root = $("guideAssistant"), toggle = $("guideAssistantToggle");
  const suggestion = $("guideAssistantSuggestion");
  if (!root || !toggle) return;
  try {
    const saved = sessionStorage.getItem("drv_session");
    const session = saved ? JSON.parse(saved) : null;
    if (session?.role !== "Student") return;
  } catch { return; }
  root.hidden = false;
  if (suggestion) suggestion.hidden = false;
  const hintTimer = window.setTimeout(() => { if (suggestion) suggestion.hidden = true; }, 4500);

  const pageText = "في مستكشف السيارة، اسحب المجسم لتدويره، وكبّر لرؤية التفاصيل، واختر قطعة لمعرفة اسمها ومكانها.";
  let speaking = false, dragging = null, suppressClick = false;

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

  function speakOnRobotClick() {
    if (speaking || window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel(); speaking = false; return;
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(pageText);
    utterance.lang = "ar-SA"; utterance.rate = .97;
    const voice = window.speechSynthesis.getVoices().find(item => /^ar([_-]|$)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { speaking = true; };
    utterance.onend = () => { speaking = false; };
    utterance.onerror = () => { speaking = false; };
    speaking = true;
    if (suggestion) suggestion.hidden = true;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

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
  document.addEventListener("pointerdown", event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("#guideAssistant, #guideAssistantSuggestion")) return;
    const dx0 = position.x + 46 - event.clientX, dy0 = position.y + 50 - event.clientY;
    const distance = Math.hypot(dx0, dy0);
    if (distance > 190) return;
    let dx = dx0, dy = dy0;
    if (distance < 1) { dx = 1; dy = -1; } else { dx /= distance; dy /= distance; }
    position = clamp({ x: position.x + dx * 46, y: position.y + dy * 46 });
    positionWidget(position);
    try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
  }, true);
  window.addEventListener("resize", () => { position = clamp(position); positionWidget(position); }, { passive: true });
  toggle.setAttribute("aria-expanded", "false");
  root.dataset.initialized = "true";
})();