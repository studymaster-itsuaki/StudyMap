const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=process.env.STUDYMAP_ROOT||path.resolve(__dirname,'..');
const base='https://example.test/StudyMap/';
function worker({offline=false,status=200,failInstall=false}={}){
 const handlers={},fetches=[],puts=[],matches=[],added=[];
 let skipped=false,claimed=false;
 const entries=new Map();
 class SWRequest extends Request{constructor(input,opts){super(typeof input==='string'?new URL(input,base):input,opts);}}
 const cache={addAll:async requests=>{added.push(...requests);if(failInstall)throw Error('install');},put:async(req,res)=>puts.push([req.url,await res.text()]),match:async req=>{const key=typeof req==='string'?req:req.url;matches.push(key);return entries.get(key);}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),{
  self:{location:new URL(base+'service-worker.js'),addEventListener:(n,fn)=>handlers[n]=fn,skipWaiting:async()=>{skipped=true;},clients:{claim:async()=>{claimed=true;}}},
  caches:{open:async name=>{assert.equal(name,'studymap-beta2.3-audio-v3');return cache;},match:()=>{throw Error('cross-cache lookup');},delete:()=>{throw Error('evidence deleted');}},
  Request:SWRequest,Response,URL,fetch:async req=>{fetches.push(req);if(offline)throw Error('offline');return new Response('network',{status});}
 });
 return {handlers,fetches,puts,matches,added,entries,get skipped(){return skipped;},get claimed(){return claimed;},async life(n){let p;handlers[n]({waitUntil:q=>p=q});await p;},async get(route,mode='cors',headers={}){let result;const waits=[];const request=new Request(new URL(route,base),{headers});Object.defineProperty(request,'mode',{value:mode});handlers.fetch({request,respondWith:p=>result=p,waitUntil:p=>waits.push(p)});await Promise.all(waits);return result;}};
}
test('install bypasses stale HTTP cache; activation preserves evidence and claims clients',async()=>{const w=worker();await w.life('install');assert.ok(w.added.length>10);assert.ok(w.added.every(r=>r.cache==='reload'));assert.equal(w.skipped,true);await w.life('activate');assert.equal(w.claimed,true);});
test('failed install cannot skipWaiting',async()=>{const w=worker({failInstall:true});await assert.rejects(w.life('install'));assert.equal(w.skipped,false);});
test('navigation and core JS revalidate; successful responses are cached',async()=>{const w=worker();await w.get('elementary/','navigate');await w.get('core/bgm.js');assert.deepEqual(w.fetches.map(r=>r.cache),['no-cache','no-cache']);assert.equal(w.puts.length,2);});
test('offline uses only exact current-version entry, never old caches or top HTML',async()=>{const w=worker({offline:true});w.entries.set(base,new Response('top'));w.entries.set(base+'elementary/',new Response('elementary'));assert.equal(await (await w.get('elementary/','navigate')).text(),'elementary');assert.equal((await w.get('junior/','navigate')).type,'error');assert.equal((await w.get('elementary/index.html','navigate')).type,'error');assert.equal((await w.get('elementary/?x=1','navigate')).type,'error');});
test('HTTP failure does not silently fall back or overwrite cache',async()=>{const w=worker({status:404});w.entries.set(base+'elementary/',new Response('cached'));assert.equal((await w.get('elementary/','navigate')).status,404);assert.equal(w.puts.length,0);assert.equal(w.matches.length,0);});
test('audio, range requests and other projects bypass SW',async()=>{const w=worker();assert.equal(await w.get('assets/audio/bgm.mp3'),undefined);assert.equal(await w.get('asset','cors',{range:'bytes=0-1'}),undefined);assert.equal(await w.get('/Other/index.html','navigate'),undefined);assert.equal(w.fetches.length,0);});
test('identity response exposes new worker and cache',()=>{const w=worker();let reply;w.handlers.message({data:{type:'STUDYMAP_BGM_DIAGNOSTIC'},ports:[{postMessage:d=>reply=d}]});assert.equal(reply.version,'sw-diag-20261012-2');assert.equal(reply.cache,'studymap-beta2.3-audio-v3');});
function diagnostic(){
 const events={},timers=[],channels=[],output={textContent:''};
 const old={scriptURL:base+'service-worker.js',postMessage(){}},fresh={...old};
 const sw={controller:old,addEventListener:(n,f)=>events[n]=f};
 const window={addEventListener:(n,f)=>events[n]=f};
 vm.runInNewContext(fs.readFileSync(path.join(root,'core/bgm-diagnostic.js'),'utf8'),{
 window,document:{querySelector:()=>output,addEventListener:(n,f)=>events['doc:'+n]=f,getElementById:()=>({addEventListener(){}})},navigator:{serviceWorker:sw},location:{href:base},matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null},Date,
 MessageChannel:class{constructor(){this.port1={close(){}};this.port2={};channels.push(this);}},setTimeout:fn=>{timers.push(fn);return timers.length-1;},clearTimeout:id=>{timers[id]=()=>{};}
 });return{events,timers,channels,output,sw,fresh};
}
test('old probe timeout cannot overwrite new controller response',()=>{const d=diagnostic();const staleTimeout=d.timers[0];d.sw.controller=d.fresh;d.events.controllerchange();d.channels[1].port1.onmessage({data:{version:'new',cache:'new-cache'}});staleTimeout();assert.match(d.output.textContent,/version=new/);assert.doesNotMatch(d.output.textContent,/版応答なし/);});
test('late reply from previous controller is ignored',()=>{const d=diagnostic();d.sw.controller=d.fresh;d.events.controllerchange();d.channels[1].port1.onmessage({data:{version:'new',cache:'new-cache'}});d.channels[0].port1.onmessage({data:{version:'old',cache:'old-cache'}});assert.match(d.output.textContent,/version=new/);});
test('script load and resource failure are distinguishable',()=>{const d=diagnostic();const target={tagName:'SCRIPT',src:base+'core/bgm.js'};d.events['doc:load']({target});assert.match(d.output.textContent,/読込完了/);d.events.error({target});assert.match(d.output.textContent,/読込失敗/);});
