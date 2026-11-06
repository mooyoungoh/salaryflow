// Fail closed when the detailed WID table is absent or incomplete.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path='data/income-world-wid-percentiles-2024.json';
const data=JSON.parse(readFileSync(path,'utf8'));
const legacy=JSON.parse(readFileSync('data/income-world-2024.json','utf8'));
assert.equal(data.schema,1);
assert.equal(data.incomeYear,2024);
assert.equal(data.variable,'tptinc992j');
assert.equal(data.priceVariable,'inyixx999i');
assert.equal(data.source,'https://wid.world/data/');
assert.deepEqual(Object.keys(data.values).sort(),Object.keys(legacy.values).sort());
for(const [code,entry] of Object.entries(data.values)){
 const p=entry.points;
 assert(Array.isArray(p)&&p.length>=6,code+' insufficient WID thresholds');
 assert(p.every(([q,v],i)=>Number.isInteger(q)&&q>=1&&q<=99&&Number.isInteger(v)&&v>0&&(i===0||(q>p[i-1][0]&&v>=p[i-1][1]))),code+' invalid order');
 for(const q of [50,90,95,99])assert(p.some(row=>row[0]===q),code+' missing P'+q);
}
console.log('PASS: official detailed WID threshold series for all 9 countries');
