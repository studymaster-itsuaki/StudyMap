(function(){
  const VERSION = "bgm-gesture-20261013-1";
  function diag(event, data){ try { window.StudyMapBGMDiagnostic?.record(event, data); } catch(e){} }
  diag("BGM JS起動", {version: VERSION});
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
  function write(key, value, source){
    let failure = null;
    try { localStorage.setItem(key, value); } catch(e){ failure = e; }
    if(key === KEY_ON){
      let back;
      try { back = localStorage.getItem(key); } catch(e){ back = "読込ERROR: " + e.name; }
      diag("設定書込み", {write: {value, source, stack: new Error("BGM preference write").stack, result: failure ? "失敗: " + failure.name : "成功", readBack: back}});
    }
  }
  function update(){
    diag("状態", {enabled});
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
  audio.addEventListener("playing", () => diag("audio playing", {playback: "playing"}));
  audio.addEventListener("pause", () => diag("audio pause", {playback: "paused"}));
  audio.addEventListener("error", () => diag("audio error", {playback: "error", error: "MediaError " + audio.error?.code}));
  async function resume(){
    if(!enabled || !audio.paused) return;
    const token = ++attempt;
    status = "再生待ち"; update();
    try {
      diag("audio.play 呼出し");
      await audio.play();
      diag("audio.play 成功" + (token !== attempt ? "（取消済み）" : ""), token === attempt ? {playback: audio.paused ? "paused" : "playing"} : {});
      if(token !== attempt) return;
      status = "";
    } catch(error){
      diag("audio.play 失敗" + (token !== attempt ? "（取消済み）" : ""), { ...(token === attempt ? {playback: audio.paused ? (error.name === "NotAllowedError" ? "blocked" : "error") : "playing"} : {}), error: error.name + ": " + String(error.message || "").slice(0, 160)});
      if(token !== attempt) return;
      status = audio.error ? "音源を確認" : "タップで再生";
    }
    update();
  }
  // Persist user intent independently of playback success or browser policy.
  function play(){ diag("ON操作"); enabled = true; write(KEY_ON, "on", "play"); update(); return resume(); }
  // Playback suspension is not a change to the user's saved preference.
  function pause(source = "api.pause"){
    diag("再生停止", {lastControl: {source, stack: new Error("BGM pause").stack}});
    ++attempt; savePosition(); audio.pause();
    diag("停止操作完了", {playback: "paused"});
    status = enabled ? "タップで再生" : ""; update();
  }
  function disableFromButton(event){
    diag("OFF操作", {lastControl: {source: "bgm-button.click", type: event.type, trusted: event.isTrusted}});
    enabled = false;
    pause("bgm-button.click");
    write(KEY_ON, "off", "bgm-button.click");
  }
  // Compatibility API controls playback; only a trusted button click saves OFF.
  function toggle(){ if(enabled && !audio.paused) pause("api.toggle"); else play(); }
  document.addEventListener("click", event => {
    if(event.target.closest?.("[data-studymap-bgm]")){
      event.preventDefault();
      diag("BGMボタンclick", {lastButton: {type: event.type, trusted: event.isTrusted, enabled, paused: audio.paused}});
      if(!event.isTrusted) return;
      if(enabled) disableFromButton(event); else play();
    }
  });
  function resumeOnGesture(event){
    if(!event.isTrusted || !enabled || !audio.paused) return;
    // Touch/pen activation is established on release, not pointerdown/touchstart.
    if(event.type === "pointerdown" && event.pointerType !== "mouse") return;
    // Do not briefly resume on the press/release preceding an explicit OFF click.
    const path = event.composedPath?.() || [event.target];
    if(path.some(node => node?.closest?.("[data-studymap-bgm]"))) return;
    diag("通常操作による再試行: " + event.type);
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
  diag("BGM初期化", {enabled, playback: "paused"});
  update(); if(enabled) resume();
})();
