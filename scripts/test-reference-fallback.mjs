// Test the exact inline reference-data loader with simulated network failures.
// Uses a sandboxed VM and mock fetch: no browser, no production network.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const first=html.indexOf('const REFERENCE_BASELINE=');
const last=html.indexOf('\nconst KEY=',first);
assert(first>0&&last>first,'Inline fallback is missing');
const slice=html.slice(first,last);
const exec=slice.slice(0,slice.indexOf('const REFERENCE_DATA=await loadReferenceData();'));
const manifest=JSON.parse(readFileSync('data/manifest.json','utf8'));
const files=Object.fromEntries(['tax','us','world'].map(k=>[manifest[k].path,JSON.parse(readFileSync(manifest[k].path,'utf8'))]));
async function scenario(name,network,previousCache,expect){
 const saved=new Map();
 if(previousCache)saved.set('salary-flow-reference-last-good-v1',JSON.stringify(previousCache));
 const context={
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
  console:{warn:()=>{}},
  AbortController,
  setTimeout,
  clearTimeout,
  fetch:async p=>{
   if(network==='all-down')throw Error('Network offline');
   if(p==='./data/manifest.json')return{ok:true,json:async()=>manifest};
   const name=p.replace(/^\.\//,'');
   if(network===name)throw Error('Broken file: '+name);
   if(network==='corrupt-world'&&name===manifest.world.path)return{ok:true,json:async()=>({schema:1,values:{}})};
   assert(files[name],'Unexpected remote path: '+p);
   return{ok:true,json:async()=>files[name]};
  }
 };
 vm.createContext(context);
 vm.runInContext(exec+';globalThis.runLoader=loadReferenceData;globalThis.sources=REFERENCE_SOURCES;',context);
 const actual=await context.runLoader();
 assert.deepEqual(JSON.parse(JSON.stringify(actual.years)),expect.years,name+' years mismatch');
 assert.deepEqual(JSON.parse(JSON.stringify(context.sources)),expect.sources,name+' source mismatch');
 assert(actual.tax.single.br.length===6&&actual.us.US.length===4&&actual.world.KR.points.length===6,name+' data incomplete');
 console.log('PASS '+name);
}
const baseline={years:{tax:2026,us:2026,usIncome:2025,world:2024},sources:{tax:'default',us:'default',world:'default'}};
await scenario('all-json-and-manifest-down','all-down',null,baseline);
await scenario('all-current-json-available',null,null,{years:baseline.years,sources:{tax:'live',us:'live',world:'live'}});
await scenario('world-json-broken','corrupt-world',null,{years:baseline.years,sources:{tax:'live',us:'live',world:'default'}});
await scenario('world-json-fails-but-cached-good',manifest.world.path,{world:files[manifest.world.path]},{years:baseline.years,sources:{tax:'live',us:'live',world:'cached'}});
await scenario('offline-but-saved-good','all-down',{tax:files[manifest.tax.path],us:files[manifest.us.path],world:files[manifest.world.path]},{years:baseline.years,sources:{tax:'cached',us:'cached',world:'cached'}});
