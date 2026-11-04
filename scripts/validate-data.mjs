// Public snapshot structural checks and regression guardrails. Run: node scripts/validate-data.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const mf=load('data/manifest.json');
assert.equal(mf.schema,1);
const types=['tax','us','world'];
for(const type of types){
 assert(mf[type]&&/^data\/[a-z0-9-]+\.json$/.test(mf[type].path), 'Bad manifest path: '+type);
 assert(Number.isInteger(mf[type].year),'Bad dataset year: '+type);
}
const tax=load(mf.tax.path),us=load(mf.us.path),wid=load(mf.world.path);
const rising=(a,n)=>Array.isArray(a)&&a.length===n&&a.every((v,i)=>Number.isFinite(v)&&v>0&&(i===0||v>a[i-1]));
assert.equal(tax.schema,1);
assert.equal(tax.taxYear,mf.tax.year);
assert.deepEqual(Object.keys(tax.values).sort(),['hoh','mfj','mfs','single']);
for(const [k,v] of Object.entries(tax.values)){
 assert(Number.isFinite(v.ded)&&v.ded>=0,'Invalid deduction: '+k);
 assert(rising(v.br,6),'Invalid bracket thresholds: '+k);
}
assert.equal(us.schema,1);
assert.equal(us.editionYear,mf.us.year);
assert.equal(us.incomeYear,mf.us.incomeYear);
assert.equal(Object.keys(us.values).length,52,'Expected 50 states, DC and US');
for(const [code,v] of Object.entries(us.values))assert(rising(v,4),'Invalid US percentile thresholds: '+code);
assert.equal(wid.schema,1);
assert.equal(wid.incomeYear,mf.world.year);
assert.equal(Object.keys(wid.values).length,9);
for(const [code,v] of Object.entries(wid.values)){
 assert(v.name&&v.ko&&/^[A-Z]{3}$/.test(v.currency),'Invalid country metadata: '+code);
 assert(rising(v.points,6),'Invalid WID percentile thresholds: '+code);
}
const federal=(taxable,limits)=>{
 const rates=[.10,.12,.22,.24,.32,.35,.37];
 let result=0,prev=0;
 for(let i=0;i<rates.length;i++){
  const upper=i<limits.length?limits[i]:Infinity;
  result+=Math.max(0,Math.min(taxable,upper)-prev)*rates[i];
  prev=upper;
  if(taxable<=upper)break;
 }
 return result;
};
assert.equal(federal(0,tax.values.single.br),0);
assert.equal(federal(12400,tax.values.single.br),1240);
assert.equal(federal(12401,tax.values.single.br),1240.12);
assert.equal(federal(50400,tax.values.single.br),5800);
if(mf.tax.year===2026)assert.equal(tax.values.single.ded,16100,'2026 tax baseline mismatch');
if(mf.us.year===2026)assert.equal(us.values.US[1],55584,'2026 US median baseline mismatch');
if(mf.world.year===2024)assert.equal(wid.values.KR.points[1],33572879,'2024 KR median baseline mismatch');
console.log('PASS: JSON structure, manifest references and 2026/2024 regression samples');
