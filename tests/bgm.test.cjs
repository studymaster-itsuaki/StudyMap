const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
// DOM/media simulation: no browser or iPhone hardware is exercised here.
const root=process.env.STUDYMAP_ROOT || path.resolve(__dirname, '..');
const source=fs.readFileSync(path.join(root,'core/bgm.js'),'utf8');
const ON='studymap_bgm_on', POS='studymap_bgm_pos';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function page(store=new Map(), rejection=null){
  const listeners=new Map(), windowListeners=new Map(), mediaListeners=new Map();
  const add=(map)=>(name,fn,options)=>map.set(name,[...(map.get(name)||[]),{fn,options}]);
  const button={textContent:'',setAttribute(k,v){this[k]=v;}};
  const audio={paused:true,readyState:0,currentTime:0,duration:120,error:null,calls:0,
    setAttribute(){},addEventListener:add(mediaListeners),
    play(){this.calls++;if(rejection)return Promise.reject(Object.assign(new Error(),{name:rejection}));this.paused=false;return Promise.resolve();},
    pause(){this.paused=true;}};
  const window={addEventListener:add(windowListeners)};
  const document={currentScript:{src:'https://test/core/bgm.js'},createElement:()=>audio,body:{appendChild(){}},querySelectorAll:()=>[button],addEventListener:add(listeners)};
  vm.runInNewContext(source,{document,window,URL,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},setInterval(){}});
  return {store,audio,button,api:window.StudyMapBGM,allow(){rejection=null;},
    event(name,bgm=false,captureOnly=false){for(const {fn,options} of listeners.get(name)||[])if(!captureOnly||options===true||options?.capture)fn({target:{closest:()=>bgm?button:null},preventDefault(){}});},
    life(name){for(const {fn} of windowListeners.get(name)||[])fn({});},
    metadata(){audio.readyState=1;for(const {fn} of mediaListeners.get('loadedmetadata')||[])fn();}};
}
test('PC: ON survives navigation and reload; position resumes; OFF persists',async()=>{
 const store=new Map([['studymap_sfx_on','off'],['tdfk5_correct','12']]);
 let p=page(store); p.event('click',true); await flush(); assert.equal(p.audio.paused,false);
 p.metadata();p.audio.currentTime=37;p.life('pagehide');
 p=page(store);p.metadata();p.life('pageshow');await flush();
 assert.equal(p.api.isEnabled(),true);assert.equal(p.audio.currentTime,37);assert.equal(p.audio.paused,false);
 p=page(store);p.metadata();await flush();assert.equal(p.button['aria-pressed'],'true');
 p.event('click',true);assert.equal(store.get(ON),'off');assert.equal(p.audio.paused,true);
 p.event('touchend');p.event('click');assert.equal(p.audio.paused,true);
 p=page(store);await flush();assert.equal(p.api.isEnabled(),false);assert.equal(p.audio.calls,0);
 assert.equal(store.get('studymap_sfx_on'),'off');assert.equal(store.get('tdfk5_correct'),'12');
});
for(const gesture of ['touchend','click','keydown'])test(`mobile policy: rejection keeps ON; capture ${gesture} resumes at saved position`,async()=>{
 const p=page(new Map([[ON,'on'],[POS,'42']]),'NotAllowedError');p.life('pageshow');await flush();
 assert.equal(p.store.get(ON),'on');assert.equal(p.button['aria-pressed'],'true');assert.match(p.button.textContent,/ON.*タップ/);
 p.allow();p.event(gesture,false,true);p.metadata();await flush();
 assert.equal(p.audio.paused,false);assert.equal(p.audio.currentTime,42);assert.equal(p.button.textContent,'♪ BGM ON');
});
test('touch + synthetic click on BGM toggles only once, including while waiting',async()=>{
 const p=page(new Map([[ON,'on']]),'NotAllowedError');await flush();
 const calls=p.audio.calls;p.event('touchend',true);assert.equal(p.audio.calls,calls);
 p.event('click',true);await flush();assert.equal(p.store.get(ON),'off');assert.equal(p.button['aria-pressed'],'false');
 p.allow();p.event('touchend',true);p.event('click',true);await flush();assert.equal(p.store.get(ON),'on');assert.equal(p.audio.paused,false);
});
test('AbortError remains waiting and retries on next tap',async()=>{
 const p=page(new Map([[ON,'on']]),'AbortError');await flush();assert.match(p.button.textContent,/タップで再生/);
 p.allow();p.event('touchend');await flush();assert.equal(p.audio.paused,false);
});
test('late rejected play cannot overwrite explicit OFF; back/forward restores ON',async()=>{
 const p=page(new Map([[ON,'on']]),'NotAllowedError');p.event('click',true);await flush();assert.equal(p.button.textContent,'♪ BGM OFF');
 p.allow();p.event('click',true);await flush();p.metadata();p.audio.currentTime=53;p.life('pagehide');p.life('pageshow');await flush();assert.equal(p.api.isEnabled(),true);assert.equal(p.audio.paused,false);assert.equal(p.audio.currentTime,53);
});
