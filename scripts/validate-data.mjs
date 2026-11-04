// Validate published income/tax snapshots without third-party packages.
// Run: node scripts/validate-data.mjs
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=(path)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const tax=load('data/tax-2026.json');
const us=load('data/income-us-2026.json');
const wid=load('data/income-world-2024.json');
const rising=(arr,n)=>Array.isArray(arr)&&arr.length===n&&arr.every((v,i)=>Number.isFinite(v)&&v>0&&(i===0||v>arr[i-1]));
assert.equal(tax.schema,1);
assert.equal(tax.taxYear,2026);
assert.deepEqual(Object.keys(tax.values).sort(),['hoh','mfj','mfs','single']);
for(const [k,v] of Object.entries(tax.values)){
 assert(Number.isFinite(v.ded)&&v.ded>=0,'Invalid deduction: '+k);
 assert(rising(v.br,6),'Invalid bracket thresholds: '+k);
}
assert.equal(us.schema,1);
assert.equal(us.editionYear,2026);
assert.equal(us.incomeYear,2025);
assert.equal(Object.keys(us.values).length,52,'Expected 50 states, DC and US');
for(const [code,v] of Object.entries(us.values))assert(rising(v,4),'Invalid US percentile thresholds: '+code);
assert.equal(wid.schema,1);
assert.equal(wid.incomeYear,2024);
assert.equal(Object.keys(wid.values).length,9);
for(const [code,v] of Object.entries(wid.values)){
 assert(v.name&&v.ko&&/^[A-Z]{3}$/.test(v.currency),'Invalid country metadata: '+code);
 assert(rising(v.points,6),'Invalid WID percentile thresholds: '+code);
}
console.log('Reference datasets validated: tax '+tax.taxYear+', US '+us.editionYear+', WID '+wid.incomeYear);
