(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const root = $("guideAssistant");
  const toggle = $("guideAssistantToggle");
  const panel = $("guideAssistantPanel");
  const close = $("guideAssistantClose");
  const title = $("guideAssistantTitle");
  const message = $("guideAssistantText");
  const status = $("guideAssistantStatus");
  const stopButton = $("guideAssistantStop");
  if (!root || !toggle || !panel || !title || !message || !status) return;

  // The standalone document must not show the student-only helper for anonymous users or admins.
  try {
    const saved = sessionStorage.getItem("drv_session");
    const session = saved ? JSON.parse(saved) : null;
    if (session?.role !== "Student") return;
  } catch { return; }
  root.hidden = false;

  const topics = {
    welcome: { title: "ابدأ الجولة", text: "أهلاً بك في رخصتي. اختر السيارة من أعلى صفحة الاستعراض، أو استخدم هذا المساعد لمعرفة طريقة التحكم." },
    training: { title: "التدريب والإشارات", text: "من صفحات رخصتي يمكنك مراجعة قواعد السير والإشارات والميكانيك، ثم تجربة أحد نماذج الاختبار." },
    rotate: { title: "تدوير السيارة", text: "اسحب على مساحة السيارة لتدويرها ورؤية الجوانب المختلفة. على الهاتف استخدم إصبعاً واحداً للتدوير." },
    zoom: { title: "التقريب والتحكم", text: "استخدم زري التكبير والتصغير أسفل المجسم، أو عجلة الفأرة على الكمبيوتر. اضغط إعادة ضبط للعودة إلى زاوية البداية." },
    parts: { title: "الأجزاء الرئيسية", text: "اختر الهيكل أو المحرك أو المقصورة أو الإضاءة أو العجلات من القائمة. عند اختيار قطعة ستظهر محددة على المجسم." },
    quality: { title: "جودة العرض", text: "إذا كان الجهاز بطيئاً، اختر الجودة الاقتصادية. استخدم المتوسطة للتوازن، والعالية عندما يكون الجهاز قادراً على تشغيل التفاصيل بسلاسة." }
  };

  let speechToken = 0;
  let activeTopic = "welcome";
  let drag = null;
  let suppressClick = false;
  const clamp = (point) => ({
    x: Math.max(8, Math.min(Math.max(8, window.innerWidth - 100), point.x)),
    y: Math.max(8, Math.min(Math.max(8, window.innerHeight - 112), point.y))
  });

  function positionWidget(point) {
    root.style.left = point.x + "px";
    root.style.top = point.y + "px";
    root.style.bottom = "auto";
    const width = Math.min(348, window.innerWidth - 22);
    const height = Math.min(500, window.innerHeight * .68);
    panel.style.left = Math.max(11, Math.min(point.x - width + 92, window.innerWidth - width - 11)) + "px";
    panel.style.top = Math.max(11, Math.min(point.y - height - 10, window.innerHeight - height - 11)) + "px";
    panel.style.bottom = "auto";
  }

  let position = { x: 20, y: window.innerHeight - 112 };
  try {
    const saved = localStorage.getItem("rukhsati-floating-robot-position");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) position = { x: parsed.x, y: parsed.y };
    }
  } catch {}
  position = clamp(position);
  positionWidget(position);

  function stopSpeech(announce = true) {
    speechToken += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (stopButton) stopButton.disabled = true;
    if (announce) status.textContent = "تم إيقاف الصوت.";
  }
  function showTopic(id) {
    const topic = topics[id];
    if (!topic) return;
    activeTopic = id;
    title.textContent = topic.title;
    message.textContent = topic.text;
    root.querySelectorAll("[data-guide-topic]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.guideTopic === id));
    });
  }
  function playTopic(id) {
    const topic = topics[id];
    if (!topic) return;
    showTopic(id);
    stopSpeech(false);
    const request = ++speechToken;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      status.textContent = "الصوت غير متاح هنا؛ يمكنك قراءة الشرح الظاهر.";
      return;
    }
    const utterance = new SpeechSynthesisUtterance(topic.text);
    utterance.lang = "ar-SA";
    utterance.rate = .96;
    const voice = window.speechSynthesis.getVoices().find((item) => /^ar([_-]|$)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (request === speechToken) status.textContent = "يعمل صوت الجهاز مؤقتاً، بانتظار الصوت المخصّص للمساعد.";
    };
    utterance.onend = () => {
      if (request === speechToken) { stopButton.disabled = true; status.textContent = "انتهى الشرح الصوتي."; }
    };
    utterance.onerror = () => {
      if (request === speechToken) { stopButton.disabled = true; status.textContent = "تعذّر تشغيل الصوت؛ يمكنك قراءة الشرح الظاهر."; }
    };
    stopButton.disabled = false;
    status.textContent = "جارٍ تشغيل الشرح الصوتي…";
    window.speechSynthesis.speak(utterance);
  }
  function setOpen(open) {
    root.open = open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) showTopic(activeTopic);
    else stopSpeech(false);
  }

  toggle.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, moved: false };
    try { toggle.setPointerCapture(event.pointerId); } catch {}
  });
  toggle.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    position = clamp({ x: drag.x + dx, y: drag.y + dy });
    positionWidget(position);
  });
  const finishDrag = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    if (moved) {
      suppressClick = true;
      try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
      window.setTimeout(() => { suppressClick = false; }, 280);
    }
    try { if (toggle.hasPointerCapture(event.pointerId)) toggle.releasePointerCapture(event.pointerId); } catch {}
  };
  toggle.addEventListener("pointerup", finishDrag);
  toggle.addEventListener("pointercancel", finishDrag);
  toggle.addEventListener("click", (event) => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  });
  root.addEventListener("toggle", () => {
    toggle.setAttribute("aria-expanded", String(root.open));
    if (root.open) { showTopic(activeTopic); status.textContent = "اختر موضوعاً للاستماع إلى الشرح."; }
    else stopSpeech(false);
  });
  close?.addEventListener("click", () => setOpen(false));
  root.querySelectorAll("[data-guide-topic]").forEach((button) => {
    button.addEventListener("click", () => playTopic(button.dataset.guideTopic));
  });
  stopButton?.addEventListener("click", () => stopSpeech(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.open) setOpen(false);
    const delta = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] }[event.key];
    if (delta && document.activeElement === toggle) {
      event.preventDefault();
      position = clamp({ x: position.x + delta[0] * (event.shiftKey ? 2 : 1), y: position.y + delta[1] * (event.shiftKey ? 2 : 1) });
      positionWidget(position);
      try { localStorage.setItem("rukhsati-floating-robot-position", JSON.stringify(position)); } catch {}
    }
  });
  window.addEventListener("resize", () => {
    position = clamp(position);
    positionWidget(position);
  }, { passive: true });
  toggle.setAttribute("aria-expanded", String(root.open));
  root.dataset.initialized = "true";
})();