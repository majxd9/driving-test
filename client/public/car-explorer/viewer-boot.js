(() => {
  window.__carViewerModelLoaded = false;

  const showFailure = (message, title = "تعذّر تشغيل عارض السيارة") => {
    const load = document.getElementById("load");
    const heading = document.getElementById("loadTitle");
    const body = document.getElementById("loadMessage");
    const status = document.getElementById("status");
    const retry = document.getElementById("retryLoad");
    if (heading) heading.textContent = title;
    if (body) body.textContent = message;
    if (status) status.textContent = "تعذّر التحميل";
    if (retry) retry.hidden = false;
    if (load) load.classList.remove("hidden");
  };

  window.__carViewerShowError = showFailure;
  const isLoaded = () => window.__carViewerModelLoaded === true;

  window.addEventListener("error", (event) => {
    if (isLoaded()) return;
    if (event.target instanceof HTMLScriptElement) {
      showFailure("تعذّر تحميل كود العرض المحلي. أعد المحاولة؛ وإذا استمرت المشكلة فسيظهر في سجل المتصفح تفاصيل أدق.");
      return;
    }
    if (event.message) {
      console.error("Car viewer runtime error:", event.message, event.error || "");
      showFailure("حدث خطأ أثناء تشغيل العرض ثلاثي الأبعاد. جرّب إعادة التحميل. إذا تكرر الخطأ، أرسل صورة الرسالة.");
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (isLoaded()) return;
    console.error("Car viewer promise error:", event.reason);
    showFailure("فشل أحد مكوّنات العرض أثناء التحميل. أعد المحاولة، وإذا تكرر الخطأ أرسل صورة الشاشة.");
  });

  const retry = document.getElementById("retryLoad");
  if (retry) retry.addEventListener("click", () => window.location.reload());

  window.setTimeout(() => {
    const heading = document.getElementById("loadTitle");
    if (!isLoaded() && heading && heading.textContent === "يتم تجهيز السيارة") {
      showFailure("استغرق تحميل السيارة وقتًا أطول من المعتاد. افحص الاتصال ثم اضغط «إعادة المحاولة».", "التحميل تأخر");
    }
  }, 75000);
})();