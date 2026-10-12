// Temporary observation only: no BGM preference, playback, or cache mutations.
(function(){
  const output = document.querySelector('[data-bgm-diagnostic-output]');
  if(!output) return;
  const state = {version:'未確認（未読込・旧版・起動失敗の可能性）', enabled:undefined, playback:'未確認', error:'なし', write:null};
  const logs = [];
  let sw = '確認中';
  let cancelProbe = () => {};
  let scriptStatus = '読込待ち';
  function raw(){
    try { const value = localStorage.getItem('studymap_bgm_on'); return value === null ? '未設定' : JSON.stringify(value); }
    catch(e){ return '読込ERROR: ' + e.name; }
  }
  function render(){
    output.textContent = [
      '診断JS起動済み: diag-20261012-2',
      'URL: ' + location.href,
      '表示: ' + ((navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? 'PWA standalone' : '通常タブ（Safari等）'),
      'BGM JS: ' + state.version,
      'BGM読込: ' + scriptStatus + ' / API=' + Boolean(window.StudyMapBGM),
      '解釈した設定: ' + (state.enabled === undefined ? '未確認' : state.enabled ? 'ON' : 'OFF'),
      '保存生値: ' + raw(),
      '直近書込み（このページ）: ' + (state.write ? JSON.stringify(state.write) : '未実施'),
      '再生: ' + state.playback,
      '直近play/音源例外: ' + state.error,
      '制御SW: ' + sw,
      '時系列（このページ・直近10件）:', ...logs
    ].join('\n');
  }
  function record(event, data){
    Object.assign(state, data || {});
    if(event !== '状態') logs.push(new Date().toLocaleTimeString('ja-JP', {hour12:false}) + ' ' + event);
    while(logs.length > 10) logs.shift();
    render();
  }
  window.StudyMapBGMDiagnostic = {record};
  for(const name of ['pageshow','pagehide']) window.addEventListener(name, e => record(name + ' persisted=' + e.persisted));
  document.addEventListener('visibilitychange', () => record('visibilitychange ' + document.visibilityState));
  window.addEventListener('storage', e => { if(e.key === 'studymap_bgm_on' || e.key === null) record('storage通知'); });
  // Resource errors do not bubble; capture also observes the following BGM script.
  window.addEventListener('error', e => {
    if(e.target?.tagName === 'SCRIPT' && /\/bgm\.js(?:[?#]|$)/.test(e.target.src)){
      scriptStatus = '読込失敗: ' + e.target.src;
      record('BGM script error');
    } else if(e.filename && /\/bgm\.js(?:[?#]|$)/.test(e.filename)){
      record('BGM実行例外', {error: String(e.message).slice(0, 160)});
    }
  }, true);
  document.addEventListener('load', e => {
    if(e.target?.tagName === 'SCRIPT' && /\/bgm\.js(?:[?#]|$)/.test(e.target.src)){
      scriptStatus = '読込完了: ' + e.target.src;
      record('BGM script load');
    }
  }, true);
  async function probe(){
    cancelProbe();
    if(!('serviceWorker' in navigator)){ sw = '非対応'; render(); return; }
    const controller = navigator.serviceWorker.controller;
    if(!controller){ sw = '制御なし'; render(); return; }
    const url = controller.scriptURL;
    sw = url + ' / 応答待ち'; render();
    const channel = new MessageChannel();
    let active = true;
    cancelProbe = () => { active = false; clearTimeout(timer); channel.port1.close(); };
    const timer = setTimeout(() => { if(!active) return; active = false; sw = url + ' / 版応答なし（旧版等・断定不可）'; channel.port1.close(); render(); }, 2000);
    channel.port1.onmessage = e => {
      if(!active || navigator.serviceWorker.controller !== controller) return;
      cancelProbe();
      sw = url + ' / version=' + e.data.version + ' / cache=' + e.data.cache;
      record('SW版応答');
    };
    try { controller.postMessage({type:'STUDYMAP_BGM_DIAGNOSTIC'}, [channel.port2]); }
    catch(e){ cancelProbe(); sw = url + ' / ERROR ' + e.name; render(); }
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => {record('SW controllerchange'); probe();});
  document.getElementById('studymap-bgm-diagnostic').addEventListener('toggle', render);
  record('診断JS初期化');
  probe();
})();
