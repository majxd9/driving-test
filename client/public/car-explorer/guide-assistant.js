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
  const audio = $("guideAssistantAudio");
  const apiBase = (document.querySelector('meta[name="api-base-url"]')?.content ||
    "https://driving-test-evd0.onrender.com").trim().replace(/\/+$/, "");

  if (!root || !toggle || !panel || !title || !message || !status || !audio) return;

  const topics = {
    welcome: { title: "ابدأ الجولة", text: "أهلاً بك في استوديو السيارات ثلاثي الأبعاد. اختر السيارة من أعلى الصفحة، ثم اختر موضوعاً من هذا المساعد للتعرّف على أدوات العرض.", key: "car-guide-welcome" },
    rotate: { title: "تدوير السيارة", text: "اسحب على مساحة السيارة لتدويرها ورؤية الجوانب المختلفة. على الهاتف استخدم إصبعاً واحداً للتدوير.", key: "car-guide-rotate" },
    zoom: { title: "التقريب والتحكم", text: "استخدم زري التكبير والتصغير أسفل المجسم، أو عجلة الفأرة على الكمبيوتر. اضغط إعادة ضبط للعودة إلى زاوية البداية.", key: "car-guide-zoom" },
    parts: { title: "الأجزاء الرئيسية", text: "اختر الهيكل أو المحرك أو المقصورة أو الإضاءة أو العجلات من القائمة. عند اختيار قطعة ستظهر محددة على المجسم، ويمكنك تحريكها بأزرار الاتجاهات.", key: "car-guide-parts" },
    quality: { title: "جودة العرض", text: "اختر الجودة الاقتصادية عند بطء الجهاز أو الاتصال، والمتوسطة للتوازن، والعالية عندما يكون الجهاز قادراً على تشغيل التفاصيل بسلاسة.", key: "car-guide-quality" }
  };

  let token = 0;
  let fallbackToken = -1;
  let activeTopic = null;
  const setStatus = (text) => { status.textContent = text; };

  function stopSpeech(update = true) {
    token++;
    activeTopic = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (stopButton) stopButton.disabled = true;
    if (update) setStatus("تم إيقاف الصوت.");
  }

  function speakOnDevice(topic, requestToken) {
    if (requestToken !== token || fallbackToken === requestToken) return;
    fallbackToken = requestToken;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      if (stopButton) stopButton.disabled = true;
      setStatus("الصوت غير متاح على هذا المتصفح حالياً. يمكنك قراءة الشرح أعلاه.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(topic.text);
    utterance.lang = "ar-SA";
    utterance.rate = 0.96;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => /^ar([_-]|$)/i.test(item.lang)) ||
      voices.find((item) => item.lang.toLowerCase().startsWith("ar"));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (requestToken === token) setStatus("ملف الصوت المولّد غير متاح؛ يعمل صوت الجهاز الآن.");
    };
    utterance.onend = () => {
      if (requestToken !== token) return;
      activeTopic = null;
      if (stopButton) stopButton.disabled = true;
      setStatus("انتهى الشرح الصوتي.");
    };
    utterance.onerror = () => {
      if (requestToken !== token) return;
      activeTopic = null;
      if (stopButton) stopButton.disabled = true;
      setStatus("تعذّر تشغيل الصوت. يمكنك قراءة الشرح أعلاه.");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function playTopic(topic) {
    const requestToken = ++token;
    activeTopic = topic;
    fallbackToken = -1;
    if (stopButton) stopButton.disabled = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    setStatus("جارٍ تشغيل الشرح الصوتي…");
    audio.onerror = () => speakOnDevice(topic, requestToken);
    audio.onplaying = () => {
      if (requestToken === token) setStatus("يعمل الصوت المولّد بالذكاء الاصطناعي.");
    };
    audio.onended = () => {
      if (requestToken !== token) return;
      activeTopic = null;
      if (stopButton) stopButton.disabled = true;
      setStatus("انتهى الشرح الصوتي.");
    };

    audio.src = apiBase + "/api/questions/audio-prompt/" + encodeURIComponent(topic.key) + "?v=20261010";
    audio.load();
    const playing = audio.play();
    if (playing && typeof playing.catch === "function") playing.catch(() => speakOnDevice(topic, requestToken));
  }

  function showTopic(id, shouldPlay = true) {
    const topic = topics[id];
    if (!topic) return;
    title.textContent = topic.title;
    message.textContent = topic.text;
    root.querySelectorAll("[data-guide-topic]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.guideTopic === id));
    });
    if (shouldPlay) playTopic(topic);
    else {
      stopSpeech(false);
      setStatus("اختر «استمع» لتشغيل الشرح الصوتي.");
    }
  }

  // Native <details>/<summary> opens the help panel even if this script fails to load.
  root.addEventListener("toggle", () => {
    const open = root.open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!activeTopic) showTopic("welcome", false);
    } else {
      stopSpeech(false);
    }
  });

  function setOpen(open) {
    root.open = open;
    toggle.setAttribute("aria-expanded", String(open));
    if (!open) stopSpeech(false);
  }

  if (close) close.addEventListener("click", () => setOpen(false));
  root.querySelectorAll("[data-guide-topic]").forEach((button) => {
    button.addEventListener("click", () => showTopic(button.dataset.guideTopic));
  });
  if (stopButton) stopButton.addEventListener("click", () => stopSpeech(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.open) setOpen(false);
  });

  toggle.setAttribute("aria-expanded", String(root.open));
  root.dataset.initialized = "true";
})();