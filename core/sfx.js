(function(){
  const KEY = "studymap_sfx_on", LEGACY = "tdfk6_sound";
  function read(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  let enabled = (read(KEY) ?? read(LEGACY)) !== "off";
  let ctx, output;
  const active = new Set();
  function context(){
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return null;
    if(!ctx){ ctx = new C(); output = ctx.createGain(); output.connect(ctx.destination); }
    return ctx;
  }
  function oscillator(context){
    const node = context.createOscillator(); active.add(node);
    node.onended = () => { active.delete(node); node.disconnect(); };
    return node;
  }
  function update(){
    document.querySelectorAll("[data-studymap-sfx]").forEach(button => {
      button.textContent = enabled ? "🔊 効果音 ON" : "🔇 効果音 OFF";
      button.setAttribute("aria-pressed", String(enabled));
    });
  }
  function silence(){
    for(const node of active){ try { node.stop(); } catch(e){} }
    active.clear();
  }
  function setEnabled(value){
    enabled = value;
    if(!enabled) silence();
    try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch(e){}
    update();
  }
  function unlock(){
    if(!enabled) return;
    try { const c = context(); if(c && c.state !== "running") c.resume().catch(() => {}); } catch(e){}
  }
function beep(type) {
  if (!enabled) return;
  try {
    const ctx = context();
    if (!ctx) return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(output);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    if (type === "ok") {
      const o1 = oscillator(ctx);
      const o2 = oscillator(ctx);
      o1.type = "sine"; o2.type = "sine";
      o1.frequency.setValueAtTime(660, now);
      o2.frequency.setValueAtTime(880, now + 0.08);
      o1.connect(gain); o2.connect(gain);
      o1.start(now); o1.stop(now + 0.12);
      o2.start(now + 0.08); o2.stop(now + 0.24);
    } else if (type === "ng") {
      const o = oscillator(ctx);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.22);
      o.connect(gain);
      o.start(now); o.stop(now + 0.24);
    } else if (type === "finish") {
      [523,659,784,1046].forEach((freq, i) => {
        const o = oscillator(ctx);
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, now + i*0.09);
        g.gain.setValueAtTime(0.0001, now + i*0.09);
        g.gain.exponentialRampToValueAtTime(0.13, now + i*0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i*0.09 + 0.18);
        o.connect(g); g.connect(output);
        o.start(now + i*0.09); o.stop(now + i*0.09 + 0.2);
      });
    }
  } catch (e) {}
}

  document.addEventListener("click", event => {
    if(event.target.closest?.("[data-studymap-sfx]")){
      event.preventDefault(); setEnabled(!enabled);
    }
    unlock();
  });
  document.addEventListener("keydown", unlock);
  window.addEventListener("pagehide", silence);
  function sync(){ enabled = (read(KEY) ?? read(LEGACY)) !== "off"; if(!enabled) silence(); update(); }
  window.addEventListener("pageshow", sync);
  window.addEventListener("storage", event => { if(event.key === KEY || event.key === null) sync(); });
  window.StudyMapSFX = {
    correct: () => beep("ok"), wrong: () => beep("ng"), clear: () => beep("finish"),
    toggle: () => { setEnabled(!enabled); unlock(); }, isEnabled: () => enabled
  };
  update();
})();
