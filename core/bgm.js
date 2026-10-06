
(function(){
  const KEY_ON = "studymap_bgm_on";
  const KEY_POS = "studymap_bgm_pos";

  const script = document.currentScript;
  const audioUrl = script
    ? new URL("../assets/audio/bgm.mp3", script.src).href
    : "assets/audio/bgm.mp3";

  let enabled = false;
  try{
    enabled = localStorage.getItem(KEY_ON) === "on";
  }catch(e){}

  const audio = document.createElement("audio");
  audio.id = "studymapSharedBgm";
  audio.src = audioUrl;
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.24;
  document.body.appendChild(audio);

  function savedPosition(){
    try{
      const value = parseFloat(localStorage.getItem(KEY_POS) || "0");
      return Number.isFinite(value) ? value : 0;
    }catch(e){
      return 0;
    }
  }

  function savePosition(){
    try{
      localStorage.setItem(KEY_POS, String(audio.currentTime || 0));
    }catch(e){}
  }

  function updateButtons(){
    document.querySelectorAll("[data-studymap-bgm]").forEach(button => {
      button.textContent = enabled ? "♪ BGM ON" : "♪ BGM OFF";
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
    });
  }

  function restorePosition(){
    const position = savedPosition();
    if(audio.duration && Number.isFinite(audio.duration)){
      audio.currentTime = position % audio.duration;
    }else{
      audio.currentTime = position;
    }
  }

  async function play(){
    enabled = true;
    try{
      localStorage.setItem(KEY_ON, "on");
    }catch(e){}

    try{
      if(audio.readyState >= 1){
        restorePosition();
      }else{
        audio.addEventListener("loadedmetadata", restorePosition, {once:true});
      }
      await audio.play();
    }catch(e){
      // Autoplay may be blocked until the next user interaction.
    }
    updateButtons();
  }

  function pause(){
    savePosition();
    enabled = false;
    audio.pause();
    try{
      localStorage.setItem(KEY_ON, "off");
    }catch(e){}
    updateButtons();
  }

  function toggle(){
    if(enabled && !audio.paused){
      pause();
    }else{
      play();
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-studymap-bgm]");
    if(!button) return;
    event.preventDefault();
    toggle();
  });

  window.addEventListener("pagehide", savePosition);
  setInterval(() => {
    if(enabled && !audio.paused) savePosition();
  }, 1000);

  window.StudyMapBGM = {
    play,
    pause,
    toggle,
    isEnabled: () => enabled
  };

  updateButtons();

  if(enabled){
    play();
    document.addEventListener("pointerdown", () => {
      if(enabled && audio.paused) play();
    }, {once:true});
  }
})();
