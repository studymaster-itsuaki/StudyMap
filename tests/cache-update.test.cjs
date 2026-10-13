const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=process.env.STUDYMAP_ROOT||path.resolve(__dirname,'..');
const base='https://example.test/StudyMap/';
function worker({offline=false,status=200,failInstall=false}={}){
 const handlers={},fetches=[],puts=[],matches=[],added=[],deleted=[];
 let skipped=false,claimed=false;
 const entries=new Map();
 class SWRequest extends Request{constructor(input,opts){super(typeof input==='string'?new URL(input,base):input,opts);}}
 const cache={addAll:async requests=>{added.push(...requests);if(failInstall)throw Error('install');},put:async(req,res)=>puts.push([req.url,await res.text()]),match:async req=>{const key=typeof req==='string'?req:req.url;matches.push(key);return entries.get(key);}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),{
  self:{location:new URL(base+'service-worker.js'),addEventListener:(n,fn)=>handlers[n]=fn,skipWaiting:async()=>{skipped=true;},clients:{claim:async()=>{claimed=true;}}},
  caches:{open:async name=>{assert.equal(name,'studymap-beta2.3-audio-v5');return cache;},match:()=>{throw Error('cross-cache lookup');},keys:async()=>['studymap-beta2.3-audio-v4','studymap-beta2.3-audio-v5','other-project'],delete:async name=>{deleted.push(name);return true;}},
  Request:SWRequest,Response,URL,fetch:async req=>{fetches.push(req);if(offline)throw Error('offline');return new Response('network',{status});}
 });
 return {handlers,fetches,puts,matches,added,deleted,entries,get skipped(){return skipped;},get claimed(){return claimed;},async life(n){let p;handlers[n]({waitUntil:q=>p=q});await p;},async get(route,mode='cors',headers={}){let result;const waits=[];const request=new Request(new URL(route,base),{headers});Object.defineProperty(request,'mode',{value:mode});handlers.fetch({request,respondWith:p=>result=p,waitUntil:p=>waits.push(p)});await Promise.all(waits);return result;}};
}
test('install bypasses stale HTTP cache; activation removes only obsolete app caches and claims clients',async()=>{const w=worker();await w.life('install');assert.ok(w.added.length>10);assert.ok(w.added.every(r=>r.cache==='reload'));assert.equal(w.skipped,true);await w.life('activate');assert.equal(w.claimed,true);assert.deepEqual(w.deleted,['studymap-beta2.3-audio-v4']);});
test('failed install cannot skipWaiting',async()=>{const w=worker({failInstall:true});await assert.rejects(w.life('install'));assert.equal(w.skipped,false);});
test('navigation and core JS revalidate; successful responses are cached',async()=>{const w=worker();await w.get('elementary/','navigate');await w.get('core/bgm.js');assert.deepEqual(w.fetches.map(r=>r.cache),['reload','reload']);assert.equal(w.puts.length,2);});
test('offline uses only exact current-version entry, never old caches or top HTML',async()=>{const w=worker({offline:true});w.entries.set(base,new Response('top'));w.entries.set(base+'elementary/',new Response('elementary'));assert.equal(await (await w.get('elementary/','navigate')).text(),'elementary');assert.equal((await w.get('junior/','navigate')).type,'error');assert.equal((await w.get('elementary/index.html','navigate')).type,'error');assert.equal((await w.get('elementary/?x=1','navigate')).type,'error');});
test('HTTP failure does not silently fall back or overwrite cache',async()=>{const w=worker({status:404});w.entries.set(base+'elementary/',new Response('cached'));assert.equal((await w.get('elementary/','navigate')).status,404);assert.equal(w.puts.length,0);assert.equal(w.matches.length,0);});
test('audio, range requests and other projects bypass SW',async()=>{const w=worker();assert.equal(await w.get('assets/audio/bgm.mp3'),undefined);assert.equal(await w.get('asset','cors',{range:'bytes=0-1'}),undefined);assert.equal(await w.get('/Other/index.html','navigate'),undefined);assert.equal(w.fetches.length,0);});
test('versioned scripts retain query through precache, network and offline fallback',async()=>{
 const route='core/bgm.js?v=bgm-final-20261013-2';
 const w=worker();await w.life('install');
 for(const script of [route,'core/bgm.css?v=20261013-2','core/pwa.js?v=20261013-2'])assert.ok(w.added.some(r=>r.url===base+script));
 await w.get(route);assert.equal(w.fetches[0].url,base+route);assert.equal(w.fetches[0].cache,'reload');assert.equal(w.puts[0][0],base+route);
 const off=worker({offline:true});off.entries.set(base+'core/bgm.js',new Response('old'));
 assert.equal((await off.get(route)).type,'error');
 off.entries.set(base+route,new Response('versioned'));assert.equal(await (await off.get(route)).text(),'versioned');
});
test('old HTML unversioned requests also bypass HTTP cache after new worker claims',async()=>{
 const w=worker();await w.life('activate');await w.get('','navigate');await w.get('core/bgm.js');
 assert.equal(w.claimed,true);assert.ok(w.fetches.every(r=>r.cache==='reload'));
});
test('all eight audio pages reference the same versioned assets without diagnostics',()=>{
 const pages=['index.html','elementary/index.html','junior/index.html','packages/japan/index.html','packages/japan/genre.html','packages/japan/play.html','packages/japan/specialty-learn.html','packages/japan/image-credits.html'];
 for(const file of pages){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const srcs=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>new URL(m[1],new URL(file,base)).href);
  const bgm=base+'core/bgm.js?v=bgm-final-20261013-2',diag=base+'core/bgm.css?v=20261013-2';
  assert.equal(srcs.filter(s=>/\/bgm\.js(?:\?|$)/.test(s)).length,1,file);
  assert.ok(srcs.includes(bgm),file);assert.doesNotMatch(html,/diagnostic|HTML cache-/i,file);
  assert.match(html,/core\/bgm\.css\?v=20261013-2/);
  assert.match(html,/data-studymap-bgm[^>]*aria-pressed="false"/);
  assert.ok(srcs.includes(base+'core/pwa.js?v=20261013-2'),file);
 }
});
test('PWA registration keeps stable worker URL and scope while bypassing update HTTP cache',async()=>{
 let load,call;
 vm.runInNewContext(fs.readFileSync(path.join(root,'core/pwa.js'),'utf8'),{
  document:{currentScript:{src:base+'core/pwa.js?v=20261013-2'},querySelector:()=>({})},location:{href:base,protocol:'https:'},URL,
  window:{addEventListener:(name,fn)=>{assert.equal(name,'load');load=fn;}},
  navigator:{serviceWorker:{register:(url,options)=>{call={url:String(url),...options};return Promise.resolve();}}},console
 });load();await Promise.resolve();assert.deepEqual(call,{url:base+'service-worker.js',scope:'/StudyMap/',updateViaCache:'none'});
});

test('production runtime has no BGM diagnostic hooks or worker probe',()=>{
 for(const file of ['core/bgm.js','service-worker.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/diagnostic|\bdiag\(|console\./i);
 assert.equal(fs.existsSync(path.join(root,'core/bgm-diagnostic.js')),false);
});
test('BGM state stylesheet revalidates and is precached with its exact query',async()=>{
 const w=worker();await w.life('install');await w.get('core/bgm.css?v=20261013-2');
 assert.equal(w.fetches[0].cache,'reload');
 assert.ok(w.added.some(r=>r.url===base+'core/bgm.css?v=20261013-2'));
});
