(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const root = $("guideAssistant"), toggle = $("guideAssistantToggle");
  const panel = $("guideAssistantPanel"), close = $("guideAssistantClose");
  const title = $("guideAssistantTitle"), message = $("guideAssistantText");
  const status = $("guideAssistantStatus"), stopButton = $("guideAssistantStop");
  const speakButton = $("guideAssistantSpeak"), suggestion = $("guideAssistantSuggestion");
  if (!root || !toggle || !panel || !title || !message || !status) return;
  try {
    const saved = sessionStorage.getItem("drv_session");
    const session = saved ? JSON.parse(saved) : null;
    if (session?.role !== "Student") return;
  } catch { return; }
  root.hidden = false;
  if (suggestion) suggestion.hidden = false;

  const pageTopic = {
    title: "استعراض السيارة ثلاثية الأبعاد",
    text: "اسحب داخل مساحة العرض لتدوير السيارة، واستخدم التكبير لرؤية التفاصيل. اختر جزءاً رئيسياً من القائمة لمعرفة مكانه."
  };
  let speechToken = 0, dragging = null, suppressClick = false;
  const clamp = (p) => ({
    x: Math.max(8, Math.min(Math.max(8, window.innerWidth - 100), p.x)),
    y: Math.max(8, Math.min(Math.max(8, window.innerHeight - 112), p.y))
  });
  function positionWidget(point) {
    root.style.left = point.x + "px"; root.style.top = point.y + "px"; root.style.bottom = "auto";
    const width = Math.min(348, window.innerWidth - 22), height = Math.min(255, window.innerHeight * .48);
    panel.style.left = Math.max(11, Math.min(point.x - width + 92, window.innerWidth - width - 11)) + "px";
    panel.style.top = Math.max(11, Math.min(point.y - height - 10, window.innerHeight - height - 11)) + "px";
    panel.style.bottom = "auto";
    if (suggestion) {
      const bubbleWidth = Math.min(248, window.innerWidth - 22);
      const left = point.x + 100 + bubbleWidth + 10 <= window.innerWidth ? point.x + 110 : Math.max(11, point.x - bubbleWidth - 10);
      suggestion.style.left = left + "px";
      suggestion.style.top = Math.max(11, Math.min(point.y + 8, window.innerHeight - 90)) + "px";
      suggestion.style.width = bubbleWidth + "px";
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

  function stopSpeech(announce = true) {
    speechToken++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (stopButton) stopButton.disabled = true;
    if (speakButton) speakButton.textContent = "اسمع الشرح";
    if (announce) status.textContent = "تم إيقاف الصوت.";
  }
  function showTopic() { title.textContent = pageTopic.title; message.textContent = pageTopic.text; }
  function playTopic() {
    if (window.speechSynthesis?.speaking) { stopSpeech(true); return; }
    stopSpeech(false);
    const request = ++speechToken;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      status.textContent = "الصوت غير متاح هنا؛ يمكنك قراءة الشرح الظاهر."; return;
    }
    const utterance = new SpeechSynthesisUtterance(pageTopic.text);
    utterance.lang = "ar-SA"; utterance.rate = .96;
    const voice = window.speechSynthesis.getVoices().find(item => /^ar([_-]|$)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (request !== speechToken) return;
      status.textContent = "يعمل صوت الجهاز مؤقتاً إلى أن يتم إعداد صوت المساعد المخصّص.";
      if (speakButton) speakButton.textContent = "إيقاف الصوت";
      if (stopButton) stopButton.disabled = false;
    };
    utterance.onend = () => {
      if (request !== speechToken) return;
      if (stopButton) stopButton.disabled = true;
      if (speakButton) speakButton.textContent = "اسمع الشرح";
      status.textContent = "انتهى الشرح الصوتي.";
    };
    utterance.onerror = () => {
      if (request !== speechToken) return;
      if (stopButton) stopButton.disabled = true;
      if (speakButton) speakButton.textContent = "اسمع الشرح";
      status.textContent = "تعذّر تشغيل الصوت؛ يمكنك قراءة الرسالة.";
    };
    if (speakButton) speakButton.textContent = "إيقاف الصوت";
    if (stopButton) stopButton.disabled = false;
    status.textContent = "جارٍ تشغيل الشرح الصوتي…";
    window.speechSynthesis.speak(utterance);
  }
  function setOpen(open) {
    root.open = open; toggle.setAttribute("aria-expanded", String(open));
    if (suggestion) suggestion.hidden = open;
    if (open) showTopic(); else stopSpeech(false);
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
    }, 420);
    dragging = item;
    try { target.setPointerCapture(id); } catch {}
  });
  toggle.addEventListener("pointermove", event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.startX, dy = event.clientY - dragging.startY;
    if (!dragging.dragging) {
      if (Math.hypot(dx, dy) > 8) { clearTimeout(dragging.timer); dragging.moved = true; }
      return;
    }
    position = clamp({ x: dragging.x + dx, y: dragging.y + dy });
    positionWidget(position); event.preventDefault();
  });
  const finishDrag = event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const current = dragging; dragging = null; clearTimeout(current.timer);
    if (current.moved) {
      suppressClick = true;
      try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
      window.setTimeout(() => { suppressClick = false; }, 300);
    }
    try { if (toggle.hasPointerCapture(event.pointerId)) toggle.releasePointerCapture(event.pointerId); } catch {}
  };
  toggle.addEventListener("pointerup", finishDrag); toggle.addEventListener("pointercancel", finishDrag);
  toggle.addEventListener("click", event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  });
  root.addEventListener("toggle", () => {
    toggle.setAttribute("aria-expanded", String(root.open));
    if (suggestion) suggestion.hidden = root.open;
    if (root.open) { showTopic(); status.textContent = "اضغط «اسمع الشرح» للحصول على إرشادات هذه الصفحة."; }
    else stopSpeech(false);
  });
  suggestion?.addEventListener("click", () => setOpen(true));
  $("guideAssistantSuggestionClose")?.addEventListener("click", event => {
    event.stopPropagation(); if (suggestion) suggestion.hidden = true;
  });
  close?.addEventListener("click", () => setOpen(false));
  speakButton?.addEventListener("click", playTopic);
  stopButton?.addEventListener("click", () => stopSpeech(true));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && root.open) setOpen(false);
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
    let dx = position.x + 46 - event.clientX, dy = position.y + 50 - event.clientY;
    const length = Math.hypot(dx, dy);
    if (length < 1) { dx = 1; dy = -1; } else { dx /= length; dy /= length; }
    position = clamp({ x: position.x + dx * 58, y: position.y + dy * 58 });
    positionWidget(position);
    try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
  }, true);
  window.addEventListener("resize", () => { position = clamp(position); positionWidget(position); }, { passive: true });
  toggle.setAttribute("aria-expanded", String(root.open)); showTopic(); root.dataset.initialized = "true";
})();