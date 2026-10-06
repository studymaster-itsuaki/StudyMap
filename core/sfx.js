
(function(){
  const KEY="studymap_sfx_on";
  let enabled=true;
  try{const v=localStorage.getItem(KEY);if(v!==null)enabled=v==="on"}catch(e){}
  let ctx;
  function tone(freq,start,dur,type="sine",gain=.06){
    if(!enabled)return;
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    if(!ctx)ctx=new C();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,ctx.currentTime+start);
    g.gain.linearRampToValueAtTime(gain,ctx.currentTime+start+.01);
    g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+start+dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime+start);o.stop(ctx.currentTime+start+dur+.03);
  }
  const api={
    correct(){tone(660,0,.14);tone(880,.12,.2)},
    wrong(){tone(260,0,.18,"triangle",.05);tone(210,.16,.2,"triangle",.04)},
    clear(){tone(523,0,.15);tone(659,.12,.15);tone(784,.24,.28)},
    toggle(){enabled=!enabled;try{localStorage.setItem(KEY,enabled?"on":"off")}catch(e){};update()},
    isEnabled(){return enabled}
  };
  function update(){
    document.querySelectorAll("[data-studymap-sfx]").forEach(b=>{
      b.textContent=enabled?"🔊 効果音 ON":"🔇 効果音 OFF";
    });
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-studymap-sfx]");
    if(b){e.preventDefault();api.toggle()}
  });
  window.StudyMapSFX=api;update();
})();
