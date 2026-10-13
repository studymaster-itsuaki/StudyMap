(() => {
  const script = document.currentScript;
  const root = script ? new URL("../", script.src) : new URL("./", location.href);
  if (!document.querySelector('link[rel="icon"]')) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = new URL("assets/icon-192.png", root).href;
    document.head.appendChild(icon);
  }
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("service-worker.js", root), {scope: root.pathname, updateViaCache: "none"})
      .catch(error => console.warn("StudyMap PWA registration failed", error));
  });
})();
