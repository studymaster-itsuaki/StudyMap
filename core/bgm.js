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
  function write(key, value){ try { localStorage.setItem(key, value); } catch(e){} }
  function update(){
    document.querySelectorAll("[data-studymap-bgm]").forEach(button => {
      button.textContent = enabled ? "♪ BGM ON" + (status ? "（" + status + "）" : "") : "♪ BGM OFF";
      button.setAttribute("aria-pressed", String(enabled));
      button.title = status === "音源を確認" ? "assets/audio/bgm.mp3 が見つからないか、再生できません。" : "BGMの再生・停止";
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
  function pause(){
    enabled = false; ++attempt; savePosition(); audio.pause();
    write(KEY_ON, "off"); status = ""; update();
  }
  function toggle(){ if(enabled) pause(); else play(); }
  document.addEventListener("click", event => {
    if(event.target.closest?.("[data-studymap-bgm]")){ event.preventDefault(); toggle(); }
  });
  function resumeOnGesture(event){
    // The BGM button must only toggle once, on click (including touch-generated clicks).
    if(!event.target.closest?.("[data-studymap-bgm]")) resume();
  }
  // Capture gestures before a screen-specific handler can stop propagation.
  // iOS may require play() directly inside touchend to unlock audio.
  document.addEventListener("touchend", resumeOnGesture, {capture: true, passive: true});
  document.addEventListener("click", resumeOnGesture, true);
  document.addEventListener("keydown", resumeOnGesture, true);
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
