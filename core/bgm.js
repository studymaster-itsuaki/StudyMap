(function(){
  const KEY_ON = "studymap_bgm_on", KEY_POS = "studymap_bgm_pos";
  const audio = document.createElement("audio");
  audio.id = "studymapSharedBgm";
  audio.src = new URL("../assets/audio/bgm.mp3", document.currentScript.src).href;
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.24;
  audio.setAttribute("playsinline", "");
  document.body.appendChild(audio);
  let enabled = read(KEY_ON) === "on", status = "", attempt = 0;
  function read(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  function write(key, value){
    try { localStorage.setItem(key, value); } catch(e){}
  }
  function update(){
    document.querySelectorAll("[data-studymap-bgm]").forEach(button => {
      button.textContent = enabled ? "♪ BGM ON" : "× BGM OFF";
      button.setAttribute("aria-label", enabled ? "BGM ON：オフにする" : "BGM OFF：オンにする");
      button.setAttribute("aria-pressed", String(enabled));
      button.title = status === "音源を確認" ? "assets/audio/bgm.mp3 が見つからないか、再生できません。" : enabled ? (status ? "BGMはONです。画面をタップすると再生を再試行します。" : "BGMをオフにする") : "BGMをオンにする";
    });
  }
  function savePosition(){
    if(audio.readyState >= 1) write(KEY_POS, String(audio.currentTime || 0));
  }
  audio.addEventListener("loadedmetadata", () => {
    const position = Number(read(KEY_POS));
    if(Number.isFinite(position) && position >= 0){
      try { audio.currentTime = Number.isFinite(audio.duration) && audio.duration > 0 ? position % audio.duration : position; } catch(e){}
    }
  });
  audio.addEventListener("error", () => { if(enabled){ status = "音源を確認"; update(); } });
  async function resume(){
    if(!enabled || !audio.paused) return;
    const token = ++attempt;
    status = "再生待ち"; update();
    try {
      await audio.play();
      if(token !== attempt) return;
      status = "";
    } catch(error){
      if(token !== attempt) return;
      status = audio.error ? "音源を確認" : "タップで再生";
    }
    update();
  }
  // Persist user intent independently of playback success or browser policy.
  function play(){ enabled = true; write(KEY_ON, "on"); update(); return resume(); }
  // Playback suspension is not a change to the user's saved preference.
  function pause(){
    ++attempt; savePosition(); audio.pause();
    status = enabled ? "タップで再生" : ""; update();
  }
  function disableFromButton(){
    enabled = false;
    pause();
    write(KEY_ON, "off");
  }
  // Compatibility API controls playback; only a trusted button click saves OFF.
  function toggle(){ if(enabled && !audio.paused) pause(); else play(); }
  document.addEventListener("click", event => {
    if(event.target.closest?.("[data-studymap-bgm]")){
      event.preventDefault();
      if(!event.isTrusted) return;
      if(enabled) disableFromButton(); else play();
    }
  });
  function resumeOnGesture(event){
    if(!event.isTrusted || !enabled || !audio.paused) return;
    // Touch/pen activation is established on release, not pointerdown/touchstart.
    if(event.type === "pointerdown" && event.pointerType !== "mouse") return;
    // Do not briefly resume on the press/release preceding an explicit OFF click.
    const path = event.composedPath?.() || [event.target];
    if(path.some(node => node?.closest?.("[data-studymap-bgm]"))) return;
    // Keep play() synchronous with the gesture; never defer it or consume the event.
    resume();
  }
  // Window capture runs before document/target handlers, even if they stop propagation.
  // Keep all listeners: a rejected gesture must not consume the next recovery chance.
  // touchend/click remain fallbacks for WebKit; pointerup covers touch/pen controls.
  for(const type of ["pointerdown", "pointerup", "touchend", "click", "keydown"]){
    window.addEventListener(type, resumeOnGesture, {capture: true, passive: true});
  }
  window.addEventListener("pagehide", () => { savePosition(); ++attempt; audio.pause(); });
  window.addEventListener("pageshow", () => {
    enabled = read(KEY_ON) === "on"; update(); if(enabled) resume(); else audio.pause();
  });
  window.addEventListener("storage", event => {
    if(event.key !== KEY_ON && event.key !== null) return;
    enabled = read(KEY_ON) === "on";
    if(enabled) resume(); else { ++attempt; audio.pause(); status = ""; }
    update();
  });
  setInterval(() => { if(enabled && !audio.paused) savePosition(); }, 1000);
  window.StudyMapBGM = {play, pause, toggle, isEnabled: () => enabled};
  update(); if(enabled) resume();
})();
