(() => {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const script = document.currentScript;
  const root = script ? new URL("../", script.src) : new URL("./", location.href);
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("service-worker.js", root), {scope: root.pathname})
      .catch(error => console.warn("StudyMap PWA registration failed", error));
  });
})();
